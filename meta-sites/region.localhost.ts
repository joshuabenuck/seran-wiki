const { stat } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import * as wiki from "seran/wiki.ts";

export let metaPages = {};

function route(url, fn) {
  metaPages[url] = fn;
}

route("/welcome-visitors.json", async (req, _system) => {
  wiki.serveJson(req, wiki.welcomePage("[[DenoWiki]]", "[[Region]]"));
});

route("/region.json", async (req, _system) => {
  wiki.serveJson(req, wiki.page("Region", [
    wiki.paragraph("List of [[Sites]]"),
    wiki.paragraph("Region crawling [[Config]]"),
    wiki.paragraph("[[One Degree]]"),
    wiki.paragraph("[[Two Degrees]]"),
    wiki.paragraph("[[Three Degrees]]"),
    wiki.roster([...(await oneDegreeAway(rootSite)).values()].join("\n"))
  ]));
});

route("/one-degree.json", async (req, _system) => {
  wiki.serveJson(req, wiki.page("One Degree", [
    wiki.roster([...(await oneDegreeAway(rootSite)).values()].join("\n"))
  ]));
});

route("/two-degrees.json", async (req, _system) => {
  wiki.serveJson(req, wiki.page("Two Degrees", [
    wiki.roster([...(await twoDegreesAway(rootSite)).values()].join("\n"))
  ]));
});

route("/three-degrees.json", async (req, _system) => {
  wiki.serveJson(req, wiki.page("Three Degrees", [
    wiki.roster([...(await threeDegreesAway(rootSite)).values()].join("\n"))
  ]));
});

let rootSite = "wiki.dbbs.co";
route("/config.json", (req, _system) => {
  wiki.serveJson(req, wiki.page("Config", [
    wiki.paragraph(`Root Site: ${rootSite}`),
    wiki.paragraph(`Number of Crawled Sites: ${sites.size}`)
  ]));
});

route("/sites.json", (req, _system) => {
  let paras = [];
  for (let s of sites) {
    paras.push(wiki.paragraph(s));
  }
  wiki.serveJson(req, wiki.page("Sites", paras));
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
