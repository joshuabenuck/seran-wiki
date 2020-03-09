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
  site.serveJson(req, site.welcomePage("[[DenoWiki]]", "[[Region Scraper]]"));
});

route("/region-scraper.json", async (req, site, _system) => {
  site.serveJson(req, site.page("Region Scraper", [
    site.paragraph(
      `Here we supervise the ongoing scrape of the wiki federation.
      We invision this as cooperating loops where sitemap fetches lead
      to page fetches and these lead to more sitemap fetches.`
    ),
    site.paragraph(
      `See [[Stepping the Async Scrape]]`
    ),
    site.paragraph(
      `While developing this technology we focus first on a nested loop.
      We have several versions of this where we explore different instrumentation strategies.`
    ),
    site.paragraph(
      `[[Mock Computation]]`
    ),
    site.paragraph(
      `[[Triple Controls]]`
    ),
  ]));
});

route("/mock-computation.json", async (req, site, _system) => {
  site.serveJson(req, site.page("Mock Computation", [
    site.paragraph(
      `Here we start, stop and step a triple nested loop that counts iterations
      until five of each, for 5 * 5 * 5 total iterations have completed.
      See also [[Triple Controls]] of the same loop`
    ),
    site.item("process-step", { legend: "Simple Nested Loop", href: "/simple" })
  ]));
});

route("/triple-controls.json", async (req, site, _system) => {
  site.serveJson(req, site.page("Triple Controls", [
    site.paragraph(
      `Here we start, stop and step with distinct controls for each nesting level.`
    ),
    site.item("process-step", { legend: "Outer Nested Loop", href: "/outer" }),
    site.item("process-step", { legend: "Middle Nested Loop", href: "/middle" }),
    site.item("process-step", { legend: "Inner Nested Loop", href: "/inner" })
  ]));
});


// S I M P L E   M O C K   C O M P U T A T I O N

let c0 = 1, c1 = 1, c2 = 1;
let l0 = 5, l1 = 5, l2 = 5;

function counters (where) {
  return `${where} at ${c0} ${c1} ${c2}`
}

let simple = instrument('simple', false)
control(simple, run1)

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


// T R I P P L E   M O C K   C O M P U T A T I O N

let outer = instrument('outer', false)
let middle = instrument('middle', true)
let inner = instrument('inner', true)
control(outer, run3)
control(middle, run3)
control(inner, run3)

async function run3() {
  let t0 = Date.now()
  for (c0 = 1; c0 < l0; c0++) {
    await outer.step(counters('outer'))
    await delay(100);
    for (c1 = 1; c1 < l1; c1++) {
      await middle.step(counters('middle'))
      await delay(100);
      for (c2 = 1; c2 < l2; c2++) {
        await inner.step(counters('inner'))
        await delay(100);
      }
    }
  }
  return (Date.now()-t0)/1000
}


// I N S T R U M E N T A T I O N

function instrument (name, startrunning) {

  let status = 'beginning';
  let running = startrunning;
  let waiting = null;
  let resume = null;
  let item = {name, running, status, waiting, resume, step}


  // async function sleep(ms) {
  //   return new Promise(resolve => {
  //     setTimeout(resolve, ms);
  //   });
  // }

  async function step(now) {
    item.status = now
    console.log(name, now)
    if (!item.running) {
      return item.waiting = new Promise(resolve => {
        item.resume = resolve
      })
    } else {
      return null
    }
  }

  return item
}


// R E M O T E   C O N T R O L

function control(item, run) {

  route(`/${item.name}?action=start`, button);
  route(`/${item.name}?action=stop`, button);
  route(`/${item.name}?action=step`, button);
  route(`/${item.name}?action=state`, button);

  async function button(req, site, _system) {
    let headers = site.baseHeaders();

    if (req.url.indexOf("start") != -1) {
      console.log('start')
      if (!item.running && !item.waiting) {
        item.running = true
        console.log('run',run)
        run().then((dt) => {
          console.log('done', dt)
          item.running=false;
          item.status=`complete in ${dt} seconds`
        });
      } else if (item.waiting) {
        item.waiting = null;
        item.running = true
        console.log('resume')
        item.resume()
      }
    }

    if (req.url.indexOf("step") != -1) {
      console.log('step')
      if (item.running) {
        item.running = false;
      } else if (item.waiting) {
        item.waiting = null;
        await sleep(30)
        item.resume()
      }
    }

    if (req.url.indexOf("stop") != -1) {
      console.log('stop')
      if (item.running) {
        item.running = false;
      }
    }

    site.serveJson(req, {
      running: item.running,
      waiting: !!item.waiting,
      status: item.status
    });
  }
}


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
