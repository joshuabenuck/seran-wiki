const { args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";

let wikiRoot = join(Deno.dir("home"), ".wiki")
function dirFromSite(siteName) {
    if (siteName.indexOf(":") != -1) {
        siteName = siteName.substring(0, siteName.indexOf(":"))
    }
    return join(wikiRoot, siteName)
}

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
    if (system.requestedSite.indexOf("static.") != -1 &&
        req.url == "/welcome-visitors.json") {
            site.serveJson(req, site.welcomePage("[[DenoWiki]]", "[[About static]]"))
            return
    }
    if (req.url == "/about-static.json") {
        site.serveJson(req, aboutStatic(site))
        return
    }
    let root = dirFromSite(system.requestedSite)
    if (req.url == "/favicon.png" && await exists(join(root, "status", "favicon.png"))) {
        site.serveFile(req, "image/png", join(root, "status", "favicon.png"))
        return
    }
    let match = req.url.match(/^\/([a-z0-9-]+).json$/)
    if (!match) {
        site.serve(req, site, system)
        return
    }
    let page = match[1]
    let fullPath = join(root, "pages", page)
    if (await exists(fullPath)) {
        site.serveFile(req, "application/json", fullPath)
        return
    }
    site.serve404(req)
}

let _siteMap = {}
export function siteMap() {
    return _siteMap
}

export async function init(opts) {
    const {siteName, system} = opts
    // Uncomment to register all existing wikis
    return
    if (siteName.indexOf("static.localhost") == -1) {
        return
    }
    let port = ""
    let portIndex = siteName.indexOf(":")
    if (portIndex != -1) {
        port = siteName.substring(portIndex)
    }
    for (let dir of await Deno.readDir(wikiRoot)) {
        if (dir.isFile() ||
            dir.name == "assets" ||
            dir.name == "pages" ||
            dir.name == "recycle" ||
            dir.name == "status") {
            continue
        }
        let targetHost = `${dir.name}${port}`
        if (system.metaSites.hasOwnProperty(targetHost)) {
            console.log("static: Conflict - not registering", targetHost)
            continue
        }
        // TODO: DRY this logic or keep the duplication?
        // Or move this registration into index.ts?
        system.metaSites[targetHost] = system.metaSites[siteName];
        system.siteMaps[targetHost] = [];
        console.log("static: Registered", targetHost)
        // TODO: Uncomment when sitemap support is added
        // system.siteMaps[targetHost] = siteMap(targetHost);
        
    }
}