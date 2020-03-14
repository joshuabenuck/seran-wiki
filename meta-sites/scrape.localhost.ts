
import { delay } from "std/util/async.ts";
import { ProcessStep } from "../step.ts";

export let plugins = [ "/client/process-step.mjs" ]
export let metaPages = {};

export async function init(opts) { opts.site.pages(`

Welcome Visitors

  Welcome to this [[DenoWiki]] Federated Wiki site.
  From this page you can find who we are and what we do.
  New sites provide this information and then claim the site as their own.
  You will need your own site to participate.

  Pages about us.

  [[Ward Cunningham]]

  Pages where we do and share.

  [[Federation Scraper]]


Federation Scraper

  Here we supervise the ongoing scrape of the wiki federation.
  We invision this as cooperating loops where sitemap fetches lead
  to page fetches and these lead to more sitemap fetches.

  See [[Stepping the Async Scrape]]

  While developing this technology we focus first on a nested loop.
  We have several versions of this where we explore different instrumentation strategies.

  [[Mock Computation]]

  [[Start or Stop the Scrape]]

Mock Computation

  Here we start, stop and step a triple nested loop that counts iterations
  until five of each, for 5 * 5 * 5 total iterations have completed.
  See also [[Triple Controls]] of the same loop

  process-step:
    legend: "Simple Nested Loop",
    href: "/simple"

Start or Stop the Scrape

  An inital scrape can take the better part of a day.
  Press 'start' to begin.
  Shift-'start' to do one site or slug at a time.

  We fetch sitemaps for one site and then discover more.

  process-step:
    legend: "Process Next Site",
    href: "/nextsite"

  We fetch page json to index and inspect for more sites.

  process-step:
    legend: "Process Next Page",
    href: "/nextslug"
`
)}


// S I M P L E   M O C K   C O M P U T A T I O N

let c0 = 1, c1 = 1, c2 = 1;
let l0 = 5, l1 = 5, l2 = 5;

function counters (where) {
  return `${where} at ${c0} ${c1} ${c2}`
}

let simple = new ProcessStep('simple', false, run1).control(metaPages)

async function run1() {
  let t0 = Date.now()
  for (c0 = 1; c0 < l0; c0++) {
    await simple.step(counters('outer'))
    await delay(100);
    for (c1 = 1; c1 < l1; c1++) {
      await simple.step(counters('middle'))
      await delay(100);
      for (c2 = 1; c2 < l2; c2++) {
        await simple.step(counters('inner'))
        await delay(100);
      }
    }
  }
  return (Date.now()-t0)/1000
}


// S C R A P E

type site = string;
type slug = string;
type todo = { site: site; slug?: slug };

let siteq: todo[] = [];
let slugq: todo[] = [];

let doing: site[] = [];
let done: site[] = [];

let nextsite = new ProcessStep('nextsite', false, siteloop).control(metaPages)
let nextslug = new ProcessStep('nextslug', false, slugloop).control(metaPages)


// Note: the current implementation performs an initial scrape.
// Remove any previous scrape data before uncommenting the following.
// Future revisions will incrementatlly update the data.

Deno.mkdir('data')
scrape(['sites.asia.wiki.org'])

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}


// E A C H   S I T E

function scrape(sites: site[]) {
  for (let maybe of sites) {
    if (!doing.includes(maybe) && !done.includes(maybe)) {
      siteq.push({ site: maybe });
      doing.push(maybe);
    }
  }
}

async function siteloop() {
  let count = 0
  while (true) {
    if (siteq.length) {
      let job = siteq.shift();
      await nextsite.step(`#${count++} ${job.site}`)
      dosite(job.site);
    }
    await sleep(1000)
  }
}

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
        slugq.push({ site, slug }); // revised page
        await sleep(300);
      }
    } catch (e) {
      slugq.push({ site, slug }); // new page
      await sleep(300);
    }
  }
}

// E A C H   S L U G

async function slugloop() {
  let count = 0
  while (true) {
    if (slugq.length) {
      let job = slugq.shift();
      await nextslug.step(`#${count++} ${job.slug}`)
      doslug(job.site, job.slug);
    }
    await sleep(1000)
  }
}

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
