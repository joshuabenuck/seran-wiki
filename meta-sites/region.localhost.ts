const { ErrorKind, DenoError, args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists } from 'https://deno.land/std@v0.30.0/fs/mod.ts';
import { isAbsolute, join, basename } from "https://deno.land/std/path/posix.ts";

export let metaPages = {}

function route(url, fn) {
    metaPages[url] = fn
}

route("/welcome-visitors.json", (req, site, _system) => {
    site.serveJson(req,
        site.page("Welcome Visitors", [
            site.paragraph("Data goes here: [[Sites]]"),
            site.roster([...sites.values()].join('\n'))
        ])
    )
})

let rootSite = "wiki.dbbs.co"
route("/config.json", (req, site, _system) => {
    site.serveJson(req,
        site.page("Config", [
            site.paragraph(`Root Site: ${rootSite}`)
        ])
    )
})

route("/sites.json", (req, site, _system) => {
    let paras = []
    for (let s of sites) {
        paras.push(site.paragraph(s))
    }
    site.serveJson(req,
        site.page("Sites", paras)
    )
})

async function readDir(path) {
    let fileInfo = await stat(path)
    if (!fileInfo.isDirectory()) {
        console.log(`path ${path} is not a directory.`);
        return [];
    }

    return await Deno.readDir(path);
}

let dataUrl = "http://ward.asia.wiki.org/assets/pages/search-over-the-horizon/data.tgz"
let sites = new Set()
export async function init() {
    // TODO: Complete auto-download of data.tgz
    // if (!await exists("./data")) {
    //     console.log("Downloading data.tgz")
    //     let resp = await fetch(dataUrl)
    //     await writeFile("./data.tgz", new Uint8Array(await resp.arrayBuffer()))
    //     return
    // }
    let rootSiteDir = `./data/${rootSite}`
    let files = await readDir(rootSiteDir)
    for (let file of files) {
        let contents = await readFileStr(`${rootSiteDir}/${file.name}`)
        let localSites = JSON.parse(contents)
        localSites.forEach((s) => sites.add(s))
    }
}