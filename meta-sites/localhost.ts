const { stat } = Deno;
import { ServerRequest } from "std/http/server.ts";
import * as wiki from "seran/wiki.ts";

export let plugins = ["/client/wander.mjs"]

async function readDir(path) {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readdir(path);
}

let metaPages = {};

// since constructors cannot be async and readDir is async, use an init method
export async function init({req, system}) {
  wiki.enableLogin(req, system)
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

export async function serve(req: ServerRequest, system) {
  if (req.url == "/welcome-visitors.json") {
    wiki.serveJson(
      req,
      wiki.welcomePage("[[DenoWiki]]", "[[Admin]], [[Wander]], [[Deno Sites]]")
    );
  } else if (req.url == "/admin.json") {
    let items = [wiki.paragraph("Active meta-sites:")]
    for (let siteName of Object.keys(system.metaSites)) {
      items.push(wiki.paragraph(`[http://${siteName}/view/welcome-visitors ${siteName}]`))
    }
    items.push(wiki.paragraph("Sites with passwords:"))
    if (Object.keys(system.passwords).length == 0) {
      items.push(wiki.paragraph("None"))
    }
    for (let siteName of Object.keys(system.passwords)) {
      items.push(wiki.paragraph(`${siteName}: ${system.passwords[siteName]}`))
    }
    let page = wiki.page("Admin", items)
    page["sensitive"] = true
    wiki.serveJson(
      req,
      page
    );
  } else if (req.url == "/wander.json") {
    wiki.serveJson(
      req,
      wiki.page("Wander", [wiki.item("turtle-wander", {})])
    );
  } else if (metaPages[req.url]) {
    // These are meta-pages from the meta-pages folder
    console.log("calling:", metaPages[req.url]);
    let data = await metaPages[req.url](req, system);
    wiki.serveJson(req, data);
  } // This will serve system urls
  else {
    wiki.serve(req, system);
  }
}