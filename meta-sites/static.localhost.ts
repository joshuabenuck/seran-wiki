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

export async function serve(req, site, system) {
    let root = dirFromSite(system.requestedSite)
    if (req.url == "/favicon.png" && exists(join(root, "status", "favicon.png"))) {
        site.serveFile(req, "image/png", join(root, "status", "favicon.png"))
        return
    }
    let match = req.url.match(/^\/([a-z0-9-]+).json$/)
    if (!match) {
        site.serve(req)
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

export async function init(siteName, system) {
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