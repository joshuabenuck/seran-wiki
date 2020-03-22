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
  }
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

  return await Deno.readDir(path);
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
  let metaSite = system.metaSites[requestedSite];
  if (metaSite) {
    req.site = metaSite;
    req.authenticated = wiki.authenticated(req)
    if (!metaSite.serve(req)) {
      wiki.serve(req, system);
    }
    continue;
  }
  console.log(
    "unknown site, unable to handle request:",
    requestedSite,
    req.url
  );
  wiki.serve404(req);
}
