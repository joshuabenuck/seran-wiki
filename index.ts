const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { parse } from "https://deno.land/std/flags/mod.ts";
import { isAbsolute, join, basename } from "https://deno.land/std/path/posix.ts";
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
import { main } from "./journalck.ts"
import { WikiClient } from "./client.ts"

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

window["metaPages"] = {}

window["metaSites"] = {}
async function importMetaSite(path) {
  console.log(path)
  let metaSite = await import(path)
  let name = basename(path.replace(/\.[tj]s$/, ""))
  let exports = Object.keys(metaSite)
  if (exports.length > 1) {
    console.log(`Warning: Only registering first export of ${path}`)
  }
  else if (exports.length == 0) {
    console.log(`Warning: Unable to register meta-site for ${path}`)
    return
  }
  let site = new metaSite[exports[0]]()
  if (site.init) {
    await site.init()
  }
  window["metaSites"][`${name}:${port}`] = site
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
  let site = window["metaSites"][req.headers.get("host")]
  if (site) {
    site.serve(req)
    continue
  }
}
