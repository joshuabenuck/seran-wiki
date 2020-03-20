const { args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import * as wiki from "seran/wiki.ts";
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

route("/welcome-visitors.json", async (req, _system) => {
  wiki.serveJson(req, wiki.welcomePage("[[DenoWiki]]", "[[Papers]]"));
});

function asSlug(name) {
  return name.replace(/\s/g, "-").replace(/[^A-Za-z0-9-]/g, "").toLowerCase();
}

let papers = [];
let papersByTag = {};
async function populatePapers() {
  if (!await exists("./papers")) {
    console.log(
      "WARN: papers meta-site missing file (./papers) needed to operate."
    );
    return;
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
      (req, system) => servePaper(paper, req, system)
    );
  }
  for (let paper of papers) {
    for (let tag of paper.tags) {
      if (!papersByTag.hasOwnProperty(tag)) {
        papersByTag[tag] = [];
        route(
          `/${asSlug(tag)}.json`,
          (req, system) => serveTag(tag, req, system)
        );
      }
      papersByTag[tag].push(paper);
    }
  }
}

function serveTag(tag, req, system) {
  wiki.serveJson(
    req,
    wiki.page(tag, papersByTag[tag].map((p) => wiki.paragraph(`[[${p.name}]]`)))
  );
}

function servePaper(p, req, system) {
  for (let paper of papers) {
    if (paper.name != p) continue;
    wiki.serveJson(req, wiki.page(paper.name, [
      wiki.paragraph(`${paper.name} [${paper.url} ref]`),
      wiki.paragraph(`Tags:`)
    ].concat(
      paper.tags.map((t) => wiki.paragraph(`[[${t}]]`))
    )));
    break;
  }
}

route("/papers.json", async (req, _system) => {
  let paras = [];
  for (let paper of papers) {
    paras.push(wiki.paragraph(`[[${paper.name}]]`));
  }
  paras.push(wiki.paragraph("Tags:"));
  for (let tag of Object.keys(papersByTag)) {
    paras.push(wiki.paragraph(`[[${tag}]]`));
  }
  wiki.serveJson(req, wiki.page("Papers", paras));
});

export async function init() {
  populatePapers();
}