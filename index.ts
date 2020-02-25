const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { parse } from "https://deno.land/std/flags/mod.ts";
import { isAbsolute, join, basename } from "https://deno.land/std/path/posix.ts";
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
import { main } from "./journalck.ts"
import { WikiClient } from "./client.ts"
import * as site from "./site.ts"

function convertToArray(param, params) {
  if (!params[param]) {
    params[param] = []
  }

  if (!Array.isArray(params[param])) {
    params[param] = [params[param]]
  }
}

let params = parse(args)
console.log(params)

let port = 8000
if (params.port) {
  port = params.port
}
const s = serve({ port });

convertToArray("meta-site", params)
convertToArray("meta-sites-dir", params)

async function readDir(path) {
  let fileInfo = await stat(path)
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readDir(path);
}

interface System {
  metaSites: {}
  siteMaps: {}
  requestedSite: string
}

let system: System = {
  metaSites: {},
  siteMaps: {},
  requestedSite: undefined
}

async function importMetaSite(path) {
  console.log(path)
  let name = undefined
  if (path.indexOf("@") != -1) {
    let parts = path.split("@")
    path = parts[0]
    name = parts[1]
  }
  let metaSite = await import(path)
  if (!name) {
    name = basename(path.replace(/\.[tj]s$/, ""))
  }
  if (metaSite.init) {
    await metaSite.init()
  }
  let targetHost = `${name}:${port}`
  system.metaSites[targetHost] = metaSite
  system.siteMaps[targetHost] = []
  if (metaSite.siteMap) {
    system.siteMaps[targetHost] = metaSite.siteMap()
  }
}
for (let metaSitePath of params["meta-site"]) {
  await importMetaSite(metaSitePath)
}
for (let metaSitesDir of params["meta-sites-dir"]) {
  for (let metaSitePath of await readDir(metaSitesDir)) {
    let fullPath = join(metaSitesDir, metaSitePath.name)
    if (!isAbsolute(fullPath)) {
      fullPath = "./" + fullPath
    }
    await importMetaSite(fullPath)
  }
}

for await (const req of s) {
  if (req.url == "/") {
    let headers = new Headers()
    headers.set("Location", "http://dev.wiki.randombits.xyz/localhost:8000/deno-sites")
    const res = {
      status: 302,
      headers
    };
    req.respond(res)
  }
  let requestedSite = req.headers.get("host")
  let metaSite = system.metaSites[requestedSite]
  if (metaSite) {
    system.requestedSite = requestedSite
    metaSite.serve(req, site, system)
    continue
  }
  site.serve404(req)
}
