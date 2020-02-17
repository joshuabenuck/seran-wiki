const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
import { main } from "./journalck.ts"
import { WikiClient } from "./client.ts"
const s = serve({ port: 8000 });

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
  await import(`./meta-sites/${metaSitePath.name}`)
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
