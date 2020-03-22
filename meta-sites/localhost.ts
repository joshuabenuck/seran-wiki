const { stat } = Deno;
import * as wiki from "seran/wiki.ts";
import { Request } from "seran/wiki.ts";
import { System, MetaSite } from "seran/system.ts";

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
export async function init({site, system}: {site: MetaSite, system: System}) {
  wiki.enableLogin(site, system)
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

export async function serve(req: Request, system: System) {
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
    let count = 0
    for (let site of Object.values(system.metaSites)) {
      if (site.password) {
        count += 1
        items.push(wiki.paragraph(`${site.targetSite}: ${site.password}`))
      }
    }
    if (count == 0) {
      items.push(wiki.paragraph("None"))
    }
    let page = wiki.page("Admin", items)
    page.sensitive = true
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