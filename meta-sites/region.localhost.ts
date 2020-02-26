const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { readFileStr } from 'https://deno.land/std@v0.30.0/fs/mod.ts';


export function serve(req, site, system) {
    if (req.url == "/welcome-visitors.json") {
        site.serveJson(req, 
            site.page("Welcome Visitors", [
                site.paragraph("Data goes here: [[Sites]]"),
                { type: "roster", id: "abc", text: "Sites:\n\n" + [...sites.values()].join('\n') }
            ])
        )
    }
    else if (req.url == "/sites.json") {
        let paras = []
        for (let s of sites) {
            paras.push(site.paragraph(s))
        }
        site.serveJson(req, 
            site.page("Sites", paras)
        )
    }
    else {
        site.serve(req, site, system)
    }
}

async function readDir(path) {
  let fileInfo = await stat(path)
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readDir(path);
}

let sites = new Set()
async function init() {
    let files = await readDir("./data/wiki.dbbs.co")
    for (let file of files) {
        console.log(file.name)
        let contents = await readFileStr("./data/wiki.dbbs.co/" + file.name)
        let localSites = JSON.parse(contents)
        localSites.forEach((s) => sites.add(s))
    }
}

init()