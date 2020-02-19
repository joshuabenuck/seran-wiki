const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
import { main } from "./journalck.ts"
import { WikiClient } from "./client.ts"
let port = 8000
const s = serve({ port });

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
for (let metaSitePath of await readDir("./meta-sites")) {
  console.log(metaSitePath.name)
  let metaSite = await import(`./meta-sites/${metaSitePath.name}`)
  let name = metaSitePath.name.replace(/\.[tj]s$/, "")
  let exports = Object.keys(metaSite)
  if (exports.length > 1) {
      console.log(`Warning: Only registering first export of ${metaSitePath.name}`)
  }
  else if (exports.length == 0) {
      console.log(`Warning: Unable to register meta-site for ${metaSitePath.name}`)
      continue
  }
  let site = new metaSite[exports[0]]()
  if (site.init) {
    await site.init()
  }
  window["metaSites"][`${name}:${port}`] = site
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
