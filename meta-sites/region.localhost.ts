const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { readFileStr } from 'https://deno.land/std@v0.30.0/fs/mod.ts';

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

let sites = new Set()
export async function init() {
    let files = await readDir("./data/wiki.dbbs.co")
    for (let file of files) {
        console.log(file.name)
        let contents = await readFileStr("./data/wiki.dbbs.co/" + file.name)
        let localSites = JSON.parse(contents)
        localSites.forEach((s) => sites.add(s))
    }
}