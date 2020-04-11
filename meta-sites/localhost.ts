const { stat } = Deno;
import * as wiki from "seran/wiki.ts";
import { Request } from "seran/wiki.ts";
import { System, MetaSite } from "seran/system.ts";
import { readFileStr, exists, readJson, writeJson } from "std/fs/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";

let metaPages = {};

export async function init({site, system}: {site: MetaSite, system: System}) {
  wiki.enableLogin(site, system)
}

export async function sites(req, system) {
  let sites = [];
  for (let metaSite of system.metaSitesInDomain(req)) {
    sites.push(
      wiki.reference(
        metaSite,
        "welcome-visitors",
        "Welcome Visitors",
        await doAndShare(metaSite)
      )
    );
  }
  return sites;
}

async function doAndShare(metaSite) {
  try {
    let response = await fetch(`http://${metaSite}/welcome-visitors.json`);
    let page = await response.json();
    for (let item of page.story) {
      if (item.id == wiki.DO_AND_SHARE_ID) {
        return item.text;
      }
    }
  } catch (e) {
    // Note: Fetch seems unable to resolve du.localhost or region.localhost
    console.log(`${metaSite}: Unable to get 'do and share' entry`, e);
  }
  // TODO: Call each meta page to get its title or use the slug
  // Figure out how to work around meta pages with long load times
  // if (metaSite.metaPages) {
  //     return Object.keys(metaSite.metaPages).map((p) => `[[${p}]]`).join(", ")
  // }
  return "Dynamic meta-site";
}

export let handler = new wiki.Handler()

handler.page(wiki.welcomePage("[[DenoWiki]]", "[[Admin]], [[Deno Sites]]"))
handler.items("Admin", async (req: Request, system: System) => {
  let items = []
  items.push(wiki.paragraph("Active meta-sites:"))
  for (let siteName of system.metaSitesInDomain(req)) {
    items.push(wiki.paragraph(`[http://${siteName}/view/welcome-visitors ${siteName}]`))
  }
  items.push(wiki.paragraph("Sites with passwords:"))
  let count = 0
  for (let site of Object.values(system.metaSites)) {
    if (site.secret) {
      count += 1
      items.push(wiki.paragraph(`${site.name}: ${site.secret}`))
    }
  }
  if (count == 0) {
    items.push(wiki.paragraph("None"))
  }
  items.push(wiki.item("cm", {}))
  return items
}, { protected: true })

handler.items("Deno Sites", sites)

async function serve(req: Request, system: System) {
  if (req.url.indexOf("/cm") == 0) {
    let filetypes = {
      "js": "text/javascript",
      "css": "text/css"
    }
    let ext = req.url.split(".")[1]
    let filetype = filetypes[ext]
    if (!filetype) {
      console.log("Unknown filetype:", ext, req.url)
      Deno.exit(1)
    }
    wiki.serveFile(req, filetype, join("./client", req.url))
    return true
  }
}