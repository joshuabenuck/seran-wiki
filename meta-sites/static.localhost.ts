const { args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";

function aboutStatic(site) {
    return site.page("About Static", [
        site.paragraph("This meta-site serves pages from existing wikis."),
        site.paragraph("In order to use it, register the meta-site with the name of an existing wiki"),
        site.paragraph("For example:"),
        site.paragraph("./denowiki.sh --meta-site=static.localhost.ts@fed.wiki.org"),
        site.paragraph("This will serve the wiki pages from ~/.wiki/fed.wiki.org/pages/"),
        site.paragraph("For this example to work:"),
        site.paragraph("* The name fed.wiki.org must resolve to the host running denowiki."),
        site.paragraph("* ~/.wiki/fed.wiki.org/pages/ must exist.")
    ])
}

export async function serve(req, site, system) {
    if (req.site.indexOf("static.") != -1 &&
        req.url == "/welcome-visitors.json") {
            site.serveJson(req, site.welcomePage("[[DenoWiki]]", "[[About static]]"))
            return
    }
    if (req.url == "/about-static.json") {
        site.serveJson(req, aboutStatic(site))
        return
    }
    site.serve(req, site, system)
}

let _siteMap = {}
export function siteMap() {
    return _siteMap
}

export async function init({req, system, site}) {
    if (req.site.indexOf("static.") == -1) {
        site.enableLogin(req, system)
        return
    }
    // Uncomment to register all existing wikis
    return
    for (let dir of await Deno.readDir(system.root)) {
        if (dir.isFile() ||
            dir.name == "assets" ||
            dir.name == "pages" ||
            dir.name == "recycle" ||
            dir.name == "status") {
            continue
        }
        let targetSite = `${dir.name}${system.port}`
        if (system.metaSites.hasOwnProperty(targetSite)) {
            console.log("static: Conflict - not registering", targetSite)
            continue
        }
        // TODO: DRY this logic or keep the duplication?
        // Or move this registration into index.ts?
        system.metaSites[targetSite] = system.metaSites[req.site];
        system.siteMaps[targetSite] = [];
        console.log("static: Registered", targetSite)
        // TODO: Uncomment when sitemap support is added
        // system.siteMaps[targetSite] = siteMap(targetSite);
        
    }
}