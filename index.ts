const { exit, args, stat, permissions } = Deno;
import { exists, readFileStr } from "std/fs/mod.ts";
import { parse } from "std/flags/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";
import { serve, ServerRequest } from "std/http/server.ts";
import { main } from "./journalck.ts";
import { WikiClient } from "./client.ts";
import * as site from "./site.ts";

function convertToArray(param, params) {
  if (!Array.isArray(params[param])) {
    params[param] = [params[param]];
  }
}

let params = parse(args, {
  default: {
    port: 8000,
    "meta-site": [],
    "meta-sites-dir": [],
    "external-client": "dev.wiki.randombits.xyz",
    "root": join(Deno.dir("home"), ".wiki")
  }
});
console.log(params);

let intf = "0.0.0.0";
let port = params.port;
let allInterfaces = await permissions.query({ name: "net" });
if (allInterfaces.state != "granted") {
  let localhostInterface = await permissions.query(
    { name: "net", url: "http://127.0.0.1" }
  );
  if (localhostInterface.state != "granted") {
    console.log(
      "ERROR: Unsupported network permissions. Use --allow-net or --allow-net=127.0.0.1."
    );
    exit(1);
  }
  intf = "127.0.0.1";
}
const s = serve(`${intf}:${port}`);

convertToArray("meta-site", params);
convertToArray("meta-sites-dir", params);

async function readDir(path) {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readDir(path);
}

interface System {
  metaSites: {};
  siteMaps: {};
  plugins: {};
  passwords: {};
  siteHosts: {};
  hosts: {};
  root: string;
  port: number;
}

let system: System = {
  metaSites: {},
  siteMaps: {},
  plugins: {},
  passwords: {},
  siteHosts: {},
  hosts: {},
  root: params.root,
  port: params.port
};

async function importMetaSite(path, host) {
  let name = undefined;
  if (host && path.indexOf("localhost") != -1) {
    let orig = basename(path.replace(/\.[tj]s$/, ""));
    name = orig.replace("localhost", host);
    system.hosts[name] = orig
  }
  if (path.indexOf("@") != -1) {
    let parts = path.split("@");
    path = parts[0];
    name = parts[1];
    system.hosts[basename(path.replace(/\.[tj]s$/, ""))] = name
  }
  let metaSite = await import(path);
  if (!name) {
    name = basename(path.replace(/\.[tj]s$/, ""));
    system.hosts[name] = name
  }
  console.log(`Registering ${path} as ${name}`);
  let targetSite = `${name}:${port}`;
  system.siteHosts[targetSite] = name;
  if (metaSite.init) {
    // Some sites will init their sitemap here
    // Others will do lengthy init processing
    // To wait or not to wait?
    metaSite.init({req: {site: targetSite, host: name}, system, site});
  }
  system.metaSites[targetSite] = metaSite;
  system.siteMaps[targetSite] = [];
  if (metaSite.siteMap) {
    system.siteMaps[targetSite] = metaSite.siteMap(targetSite);
  }
  if (metaSite.plugins) {
    system.plugins[targetSite] = metaSite.plugins;
  }
}
for (let metaSitePath of params["meta-site"]) {
  await importMetaSite(metaSitePath, null);
}
for (let metaSitesDir of params["meta-sites-dir"]) {
  let host = null;
  if (metaSitesDir.indexOf("@") != -1) {
    let parts = metaSitesDir.split("@");
    metaSitesDir = parts[0];
    host = parts[1];
  }
  for (let metaSitePath of await readDir(metaSitesDir)) {
    let fullPath = join(metaSitesDir, metaSitePath.name);
    if (!isAbsolute(fullPath)) {
      fullPath = "./" + fullPath;
    }
    await importMetaSite(fullPath, host);
  }
}

let etcHosts = null;
if (await exists("/etc/hosts")) {
  etcHosts = "/etc/hosts";
}
if (await exists("/Windows/System32/drivers/etc/hosts")) {
  etcHosts = "/Windows/System32/drivers/etc/hosts";
}
if (etcHosts) {
  let metaSites = Object.keys(system.metaSites);
  let hosts = (await readFileStr(etcHosts)).split("\n");
  for (let host of hosts) {
    if (host.indexOf("127.0.0.1") == -1) {
      continue;
    }
    host = host.replace("127.0.0.1", "").trim();
    metaSites = metaSites.filter((s) => {
      let metaSite = s.split(":")[0];
      if (metaSite == host || metaSite.indexOf("localhost") == -1) {
        return false;
      }
      return true;
    });
  }
  metaSites.map((s) =>
    console.log(`WARN: missing /etc/hosts entry for ${s}.`)
  );
}

interface EnhancedRequest extends ServerRequest {
  [key: string]: any
}
console.log("listening on port ", port);
for await (const r of s) {
  let req = r as EnhancedRequest
  let requestedSite = req.headers.get("host");
  let metaSite = system.metaSites[requestedSite];
  if (req.url == "/") {
    let headers = new Headers();
    headers.set(
      "Location",
      `http://${params["external-client"]}/${requestedSite}/welcome-visitors`
    );
    const res = {
      status: 302,
      headers
    };
    req.respond(res);
  }
  if (metaSite) {
    req.site = requestedSite;
    req.host = system.siteHosts[requestedSite];
    req.siteRoot = join(system.root, req.host)
    if (!await exists(req.siteRoot)) {
      req.siteRoot = join(system.root, system.hosts[req.host])
    }
    req.authenticated = site.authenticated(req)
    if (metaSite.serve) {
      console.log("meta-site:", requestedSite, req.url);
      metaSite.serve(req, site, system);
    }
    if (metaSite.metaPages) {
      console.log("meta-page:", requestedSite, req.url);
      let metaPage = metaSite.metaPages[req.url];
      if (metaPage) {
        metaPage(req, site, system);
      } else {
        site.serve(req, site, system);
      }
    }
    continue;
  }
  console.log(
    "unknown site, unable to handle request:",
    requestedSite,
    req.url
  );
  site.serve404(req);
}
