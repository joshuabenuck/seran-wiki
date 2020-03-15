const { stat } = Deno;
import { ServerRequest } from "std/http/server.ts";

export let plugins = ["/client/wander.mjs"]

async function readDir(path) {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readDir(path);
}

let metaPages = {};

// since constructors cannot be async and readDir is async, use an init method
export async function init({req, site, system}) {
  site.enableLogin(req, system)
  for (let metaPagePath of await readDir("./meta-pages")) {
    let metaPage = await import(`../meta-pages/${metaPagePath.name}`);
    let exports = Object.keys(metaPage);
    if (exports.length > 1) {
      console.log(
        `Warning: Only registering first export of ${metaPagePath.name}`
      );
    } else if (exports.length == 0) {
      console.log(
        `Warning: Unable to register meta-page for ${metaPagePath.name}`
      );
      continue;
    }
    metaPages[`/${metaPagePath.name.replace(/\.[tj]s$/, "")}.json`] = metaPage
      [exports[0]];
  }
}

export async function serve(req: ServerRequest, site, system) {
  if (req.url == "/welcome-visitors.json") {
    site.serveJson(
      req,
      site.welcomePage("[[DenoWiki]]", "[[Wander]], [[Deno Sites]]")
    );
  } // These are meta-pages from the meta-pages folder
  else if (req.url == "/wander.json") {
    site.serveJson(
      req,
      site.page("Wander", [site.item("turtle-wander", {})])
    );
  } else if (metaPages[req.url]) {
    console.log("calling:", metaPages[req.url]);
    let data = await metaPages[req.url](req, site, system);
    site.serveJson(req, data);
  } // This will serve system urls
  else {
    site.serve(req, site, system);
  }
}
