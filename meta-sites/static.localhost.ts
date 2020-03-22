const { args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists, writeJson } from "std/fs/mod.ts";
import { BufReader } from "std/io/bufio.ts";
import * as wiki from "seran/wiki.ts";
import { Request } from "seran/wiki.ts";
import { System, MetaSite } from "seran/system.ts";
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
        wiki.paragraph("./seran-wiki.sh --meta-site=static.localhost.ts@fed.wiki.org"),
        wiki.paragraph("This will serve the wiki pages from ~/.wiki/fed.wiki.org/pages/"),
        wiki.paragraph("For this example to work:"),
        wiki.paragraph("* The name fed.wiki.org must resolve to the host running seran-wiki."),
        wiki.paragraph("* ~/.wiki/fed.wiki.org/pages/ must exist.")
    ])
}

export async function serve(req: Request, system: System) {
    if (req.site.host.indexOf("static.") != -1 &&
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

export async function init({site, system}: {site: MetaSite, system: System}) {
    if (site.host.indexOf("static.") == -1) {
        let path = join(system.root, site.host)
        let fallback_path = join(system.root, site.defaultHost)
        if (!await exists(path) && !await exists(fallback_path)) {
            console.log(`Creating directory for '${site.host}`)
            console.log("Enter secret for site: ")
            let reader = new BufReader(Deno.stdin)
            let secret = await reader.readString("\n")
            Deno.mkdir(path)
            Deno.mkdir(join(path, "status"))
            await writeJson(join(path, "status", "owner.json"), {name: "Deno Wiki", friend: { secret }})
            Deno.mkdir(join(path, "pages"))
            await writeJson(join(path, "pages", "welcome-visitors"), wiki.welcomePage(null, null))
            // site.root in this case would have used the default host path
            // reset it to the one we just created
            // TODO: Need System to handle the creation of the directory
            // probably should allow meta-sites to specify if they want file backing
            site.root = path
        }
        wiki.enableLogin(site, system)
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
        // TODO: Fix this! Broke when cleaning up MetaSite object
        // Need a way to alias an existing site to another name.
        // system.metaSites[targetSite] = system.metaSites[site];
        // system.metaSites[targetSite] = [];
        // console.log("static: Registered", targetSite)
        // TODO: Uncomment when sitemap support is added
        // system.siteMaps[targetSite] = siteMap(targetSite);
        
    }
}