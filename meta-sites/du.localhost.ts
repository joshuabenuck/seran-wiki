const { stat } = Deno;
import { ServerRequest } from "https://deno.land/std@v0.35.0/http/server.ts";
import { encode,
  decode } from "https://deno.land/std@v0.35.0/encoding/base32.ts";

async function readDir(path) {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readDir(path);
}

function b32path(path) {
  return encode(new TextEncoder().encode(path)).replace(/=/g, "");
}

export function siteMap() {
  return [
    {
      "welcome-visitors": {
        title: "Welcome Visitors",
        synopsis: "..."
      }
    }
  ];
}

export async function serve(req: ServerRequest, site, system) {
  console.log("du", req.url);
  if (req.url == "/welcome-visitors.json") {
    site.serveJson(
      req,
      site.page(
        "Welcome Visitors",
        [site.paragraph(`[[${b32path("/")}]] - /`)]
      )
    );
  } else if (req.url.match("/^[a-z0-9]+.json")) {
    let parts = req.url.split(".json");
    let base32path = parts[0].substring(1, parts[0].length);
    let multipleOf = Math.ceil(base32path.length / 8);
    let targetLength = multipleOf * 8;
    base32path = base32path.padEnd(targetLength, "=");
    console.log("base32path", base32path);
    let path = new TextDecoder().decode(decode(base32path.toUpperCase()));
    console.log("path", path);

    let files = [];
    for (let file of await readDir(path)) {
      let fullPath = [path, file.name].join("/").replace("//", "/");
      files.push(
        site.paragraph(`[[${b32path(fullPath)}]] ${fullPath} - ${file.len}`)
      );
    }

    let data = site.page(path, files);

    site.serveJson(req, data);
  } else {
    site.serve(req, site, system);
  }
}
