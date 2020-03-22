const { exit, args, stat, permissions } = Deno;
import { exists, readFileStr } from "std/fs/mod.ts";
import { parse } from "std/flags/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";
import { serve, ServerRequest } from "std/http/server.ts";
import * as wiki from "seran/wiki.ts";
import { System } from "seran/system.ts";

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
  },
  boolean: "allow-disclosure"
});

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

  return await Deno.readdir(path);
}

let system = new System(params.root, params.port);

for (let metaSitePath of params["meta-site"]) {
  await system.importMetaSite(metaSitePath, null);
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
    await system.importMetaSite(fullPath, host);
  }
}

system.checkEtcHosts()

console.log("listening on port ", port);
for await (const r of s) {
  let req = r as wiki.Request
  let requestedSite = req.headers.get("host");
  let metaSite = system.metaSites[requestedSite];
  if (req.url == "/" && metaSite) {
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
    req.site = metaSite;
    req.authenticated = wiki.authenticated(req)
    if (!metaSite.serve(req)) {
      wiki.serve(req, system);
    }
    continue;
  }
  if (req.url == "/not-in-service.json") {
    let items = [
      wiki.paragraph("You have reach a site that has been disconnected or is no longer in service."),
      wiki.paragraph("If you feel you have reached this page in error, please check the server configuration and try again."),
      wiki.paragraph("The most common cause for this during development is for there to be a mismatch between the hostname the server is listening on and the hostname you attempted to access."),
    ]
    if (params["allow-disclosure"]) {
      let sites = Object.values(system.metaSites);
      if (sites.length == 0) {
        items.push(wiki.paragraph("WARNING: There are no registered meta-sites."))
        items.push(wiki.paragraph("Did you forget to start the server with --meta-site or --meta-sites-dir?"))
      }
      else {
        items.push(wiki.paragraph("These are the registered sites:"))
        for (let site of sites) {
          items.push(wiki.paragraph(site.targetSite))
        }
      }
    }
    wiki.serveJson(req, wiki.page("Not in Service", items))
    continue
  }
  // minimum routes needed to display a default error page
  // creating a meta-site just for this purpose
  // would likely be better, but this works for now
  if (req.url == "/index.html?page=not-in-service") {
    wiki.serveFile(req, "text/html", "./client/index.html");
    continue
  }
  if (req.url == "/" ||
      req.url.indexOf("/index.html") == 0) {
      req.url = "/view/not-in-service"
      wiki.serve(req, system)
  }
  if (req.url.match(/^\/client\/.*\.mjs$/) ||
      req.url.match(/^\/.*\.png$/)) {
    wiki.serve(req, system)
    continue
  }

  // if not a request for a user visible page in a missing site, return a 404
  console.log(
    "unknown site, unable to handle request:",
    requestedSite,
    req.url
  );
  wiki.serve404(req);
}
