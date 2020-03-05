const { args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";
import { delay } from "std/util/async.ts";

export let metaPages = {};

function route(url, fn) {
  metaPages[url] = fn;
}

route("/welcome-visitors.json", async (req, site, _system) => {
  site.serveJson(req, site.welcomePage("[[DenoWiki]]", "[[Papers]]"));
});

function asSlug(name) {
    return name.replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase()
}

let papers = [];
let papersByTag = {};
async function populatePapers() {
  if (!await exists("./papers")) {
    console.log(
      "WARN: papers meta-site missing file (./papers) needed to operate."
    );
  }
  let contents = await readFileStr("./papers");
  for (let line of await contents.split("\n")) {
    if (line.trim().length == 0) {
      continue;
    }
    let parts = line.split(";");
    let paper = parts[0].trim();
    papers.push({
      name: paper,
      url: parts[1].trim(),
      tags: parts[2].split(",").map((t) => t.trim())
    });
    route(
      `/${asSlug(paper)}.json`,
      (req, site, system) => servePaper(paper, req, site, system)
    );
  }
  for (let paper of papers) {
    for (let tag of paper.tags) {
      if (!papersByTag.hasOwnProperty(tag)) {
        papersByTag[tag] = [];
        route(
          `/${asSlug(tag)}.json`,
          (req, site, system) => serveTag(tag, req, site, system)
        );
      }
      papersByTag[tag].push(paper);
    }
  }
}

function serveTag(tag, req, site, system) {
  site.serveJson(req, site.page(tag, []));
}

function servePaper(paper, req, site, system) {
  site.serveJson(req, site.page(paper, []));
}

route("/papers.json", async (req, site, _system) => {
  let paras = [];
  for (let paper of papers) {
    paras.push(site.paragraph(`[[${paper.name}]]`));
  }
  paras.push(site.paragraph("Tags:"));
  for (let tag of Object.keys(papersByTag)) {
    paras.push(site.paragraph(`[[${tag}]]`));
  }
  site.serveJson(req, site.page("Papers", paras));
});

export async function init() {
  populatePapers();
}
