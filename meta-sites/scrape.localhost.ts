const { args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists } from "std/fs/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";
import { delay } from "std/util/async.ts"

export let metaPages = {};

function route(url, fn) {
  metaPages[url] = fn;
}

route("/welcome-visitors.json", async (req, site, _system) => {
  site.serveJson(req, site.welcomePage("[[DenoWiki]]", "[[Region Scraper]]"));
});

route("/region-scraper.json", async (req, site, _system) => {
  site.serveJson(req, site.page("Region Scraper", [
    site.paragraph(
      `Here we supervise the ongoing scrape of the wiki federation.
      We invision this as three nested loops where inner loops run
      dozens or hundreds of times for each outer loop.`
    ),
    site.item("process-step", { legend: "A legend", href: "/single-step", }),
  ]));
});

let c0 = c1 = c2 = 0;
let l0 = l1 = l2 = 5;

async function* run() {
  for (c0 = 0, c0<l0, c0++) {
    yield `outer loop step ${c0} of ${l0}`
    for (c1 = 0, c1<l1, c1++) {
      yield `middle loop step ${c1} of ${l1}`
      for (c2 = 0, c2<l2, c2++) {
        yield `inner loop step ${c2} of ${l2}`
        await delay(100);
      }
      await delay(1000);
    }
    await delay(10000)
  }
}

let generator = run();
route("/single-step", async (req, site, _system) => {
  let result = await generator.next();
  console.log("single step", result);
  let headers = site.baseHeaders();
  req.respond({
    status: 200,
    body: result.value,
    headers
  });
});

route("/index.html", async (req, site, _system) => {
  let filePath = "./index.html";
  site.serveFile(req, "text/html", filePath);
});

// S C R A P E

type site = string;
type slug = string;
type todo = { site: site; slug?: slug };

let queue: todo[] = [];
let doing: site[] = [];
let done: site[] = [];

let clock = setInterval(work, 1000);

// Note: the current implementation performs an initial scrape.
// Remove any previous scrape data before uncommenting the following.
// Future revisions will incrementatlly update the data.

// Deno.mkdir('data')
// scrape(['sites.asis.wiki.org'])

function scrape(sites: site[]) {
  for (let maybe of sites) {
    if (!doing.includes(maybe) && !done.includes(maybe)) {
      queue.push({ site: maybe });
      doing.push(maybe);
    }
  }
}

async function work() {
  if (queue.length) {
    let job = queue.shift();
    if (job.slug) {
      doslug(job.site, job.slug);
    } else {
      dosite(job.site);
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

// E A C H   S I T E

async function dosite(site: site) {
  let url = `http://${site}/system/sitemap.json`;
  try {
    let sitemap = await fetch(url).then(res => res.json());
    if (sitemap.length == 0) throw "empty sitemap";
    await Deno.mkdir(`data/${site}`); // new site
    for (let info of sitemap) {
      await update(info.slug, info.date);
    }
  } catch (e) {
    console.log("site trouble", site, e);
  }
  done.push(site);
  doing.splice(doing.indexOf(site), 1);

  async function update(slug: slug, date) {
    try {
      let stat = await Deno.lstat(`data/${site}/${slug}.json`);
      if (date > stat.modified * 1000) {
        queue.push({ site, slug }); // revised page
        await sleep(300);
      }
    } catch (e) {
      queue.push({ site, slug }); // new page
      await sleep(300);
    }
  }
}

// E A C H   S L U G

async function doslug(site: site, slug: slug) {
  let url = `http://${site}/${slug}.json`;
  try {
    let page = await fetch(url).then(res => res.json());
    let sites: site[] = [];
    for (let item of page.story || []) {
      if (item.site && !sites.includes(item.site)) {
        sites.push(item.site);
      }
    }
    for (let action of page.journal || []) {
      if (action.site && !sites.includes(action.site)) {
        sites.push(action.site);
      }
    }
    await save(site, slug, sites);
    scrape(sites);
  } catch (e) {
    console.log("slug trouble", site, slug, e);
  }

  async function save(site: site, slug: slug, sites: site[]) {
    let json = JSON.stringify(sites, null, 2);
    let text = new TextEncoder().encode(json);
    await Deno.writeFile(`data/${site}/${slug}.json`, text);
  }
}
