const { args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists, writeJson } from "std/fs/mod.ts";
import { BufReader } from "std/io/bufio.ts";
import * as wiki from "seran/wiki.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";

function aboutStatic() {
    return wiki.page("About Static", [
        wiki.paragraph("This meta-site serves pages from existing wikis."),
        wiki.paragraph("In order to use it, register the meta-site with the name of an existing wiki"),
        wiki.paragraph("For example:"),
        wiki.paragraph("./denowiki.sh --meta-site=static.localhost.ts@fed.wiki.org"),
        wiki.paragraph("This will serve the wiki pages from ~/.wiki/fed.wiki.org/pages/"),
        wiki.paragraph("For this example to work:"),
        wiki.paragraph("* The name fed.wiki.org must resolve to the host running denowiki."),
        wiki.paragraph("* ~/.wiki/fed.wiki.org/pages/ must exist.")
    ])
}

export async function serve(req, system) {
    if (req.site.indexOf("static.") != -1 &&
        req.url == "/welcome-visitors.json") {
            wiki.serveJson(req, wiki.welcomePage("[[DenoWiki]]", "[[About static]]"))
            return
    }
    if (req.url == "/about-static.json") {
        wiki.serveJson(req, aboutStatic())
        return
    }
    wiki.serve(req, system)
}

let _siteMap = {}
export function siteMap() {
    return _siteMap
}

export async function init({req, system}) {
    if (req.site.indexOf("static.") == -1) {
        console.log(system.root, system.hosts[req.host])
        let path = join(system.root, req.host)
        let fallback_path = join(system.root, system.hosts[req.host])
        if (!await exists(path) && !await exists(fallback_path)) {
            console.log(`Creating directory for '${req.host}`)
            console.log("Enter secret for site: ")
            let reader = new BufReader(Deno.stdin)
            let secret = await reader.readString("\n")
            Deno.mkdir(path)
            Deno.mkdir(join(path, "status"))
            await writeJson(join(path, "status", "owner.json"), {name: "Deno Wiki", friend: { secret }})
            Deno.mkdir(join(path, "pages"))
            await writeJson(join(path, "pages", "welcome-visitors"), wiki.welcomePage(null, null))
        }
        wiki.enableLogin(req, system)
        return
    }
    // Uncomment to register all existing wikis
    return
    for (let dir of await Deno.readdir(system.root)) {
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