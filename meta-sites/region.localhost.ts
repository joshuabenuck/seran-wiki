const { stat } = Deno;
import { readFileStr, exists } from "https://deno.land/std@v0.35.0/fs/mod.ts";

export let metaPages = {};

function route(url, fn) {
  metaPages[url] = fn;
}

route("/welcome-visitors.json", async (req, site, _system) => {
  site.serveJson(req, site.welcomePage("[[DenoWiki]]", "[[Region]]"));
});

route("/region.json", async (req, site, _system) => {
  site.serveJson(req, site.page("Region", [
    site.paragraph("List of [[Sites]]"),
    site.paragraph("Region crawling [[Config]]"),
    site.paragraph("[[One Degree]]"),
    site.paragraph("[[Two Degrees]]"),
    site.paragraph("[[Three Degrees]]"),
    site.roster([...(await oneDegreeAway(rootSite)).values()].join("\n"))
  ]));
});

route("/one-degree.json", async (req, site, _system) => {
  site.serveJson(req, site.page("One Degree", [
    site.roster([...(await oneDegreeAway(rootSite)).values()].join("\n"))
  ]));
});

route("/two-degrees.json", async (req, site, _system) => {
  site.serveJson(req, site.page("Two Degrees", [
    site.roster([...(await twoDegreesAway(rootSite)).values()].join("\n"))
  ]));
});

route("/three-degrees.json", async (req, site, _system) => {
  site.serveJson(req, site.page("Three Degrees", [
    site.roster([...(await threeDegreesAway(rootSite)).values()].join("\n"))
  ]));
});

let rootSite = "wiki.dbbs.co";
route("/config.json", (req, site, _system) => {
  site.serveJson(req, site.page("Config", [
    site.paragraph(`Root Site: ${rootSite}`),
    site.paragraph(`Number of Crawled Sites: ${sites.size}`)
  ]));
});

route("/sites.json", (req, site, _system) => {
  let paras = [];
  for (let s of sites) {
    paras.push(site.paragraph(s));
  }
  site.serveJson(req, site.page("Sites", paras));
});

async function readDir(path) {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readDir(path);
}

async function referencedSites(siteName) {
  let sites = new Set();
  let siteDir = `./data/${siteName}`;
  if (!await exists(siteDir)) {
    console.log(`WARN: Site ${siteDir} doesn't exist`);
    return sites;
  }
  let files = await readDir(siteDir);
  for (let file of files) {
    let filename = `${siteDir}/${file.name}`;
    if (!await exists(filename)) {
      console.log(`WARN: ${filename} doesn't exist`);
      continue;
    }
    let contents = await readFileStr(filename);
    let localSites = JSON.parse(contents);
    localSites.forEach((s) => sites.add(s));
  }
  return sites;
}

async function oneDegreeAway(siteName) {
  let sites = new Set();
  (await referencedSites(siteName)).forEach((s) => sites.add(s));
  return sites;
}

async function anotherDegreeAway(someDegree) {
  let anotherDegree = new Set();
  for (let site of someDegree) {
    anotherDegree.add(site);
    (await oneDegreeAway(site)).forEach((s) => anotherDegree.add(s));
  }
  return anotherDegree;
}

async function twoDegreesAway(siteName) {
  let oneDegree = await oneDegreeAway(siteName);
  return anotherDegreeAway(oneDegree);
}

async function threeDegreesAway(siteName) {
  let twoDegrees = await twoDegreesAway(siteName);
  return anotherDegreeAway(twoDegrees);
}

let dataUrl =
  "http://ward.asia.wiki.org/assets/pages/search-over-the-horizon/data.tgz";
let sites = new Set();
export async function init() {
  // TODO: Complete auto-download of data.tgz
  // if (!await exists("./data")) {
  //     console.log("Downloading data.tgz")
  //     let resp = await fetch(dataUrl)
  //     await writeFile("./data.tgz", new Uint8Array(await resp.arrayBuffer()))
  //     return
  // }
  oneDegreeAway(rootSite);
  // (await referencedSites(rootSite)).forEach((s) => sites.add(s))
}
