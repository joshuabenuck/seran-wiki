const { ErrorKind, DenoError, args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists } from 'https://deno.land/std@v0.30.0/fs/mod.ts';
import { isAbsolute, join, basename } from "https://deno.land/std/path/posix.ts";

export let metaPages = {}

function route(url, fn) {
    metaPages[url] = fn
}

route("/welcome-visitors.json", async (req, site, _system) => {
    site.serveJson(req,
        site.page("Welcome Visitors", [
            site.paragraph("Here we supervise the ongoing scrape of the wiki federation."),
            site.paragraph("<button>start</button>")
        ])
    )
})



// S C R A P E

type site = string
type slug = string
type todo = {site:site, slug?:slug}

let queue:todo[] = []
let doing:site[] = []
let done: site[] = []

let clock = setInterval(work,1000)

// Note: the current implementation performs an initial scrape.
// Remove any previous scrape data before uncommenting the following.
// Future revisions will incrementatlly update the data.

// Deno.mkdir('data')
// scrape(['sites.asis.wiki.org'])

function scrape(sites:site[]) {
  for (let maybe of sites) {
    if (!doing.includes(maybe) && !done.includes(maybe)) {
      queue.push({site:maybe})
      doing.push(maybe)
    }
  }
}

async function work() {
  if(queue.length) {
    let job = queue.shift()
    if(job.slug)
      doslug(job.site, job.slug)
    else
      dosite(job.site)
  }
}

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}


// E A C H   S I T E

async function dosite(site:site) {
  let url = `http://${site}/system/sitemap.json`
  try {
    let sitemap = await fetch(url).then(res=>res.json())
    if (sitemap.length == 0) throw 'empty sitemap'
    await Deno.mkdir(`data/${site}`) // new site
    for (let info of sitemap) {
      await update(info.slug, info.date)
    }
  } catch (e) {
    console.log('site trouble', site, e)
  }
  done.push(site)
  doing.splice(doing.indexOf(site),1)

  async function update(slug:slug, date) {
    try {
      let stat = await Deno.lstat(`data/${site}/${slug}.json`)
      if(date > stat.modified*1000) {
        queue.push({site,slug}) // revised page
        await sleep(300)
      }
    } catch (e) {
      queue.push({site,slug}) // new page
      await sleep(300)
    }
  }
}


// E A C H   S L U G

async function doslug(site:site, slug:slug) {
  let url = `http://${site}/${slug}.json`
  try {
    let page = await fetch(url).then(res=>res.json())
    let sites:site[] = []
    for (let item of page.story||[]) {
      if(item.site && !sites.includes(item.site)) {
        sites.push(item.site)
      }
    }
    for (let action of page.journal||[]) {
      if(action.site && !sites.includes(action.site)) {
        sites.push(action.site)
      }
    }
    await save(site, slug, sites)
    scrape(sites)

  } catch (e) {
    console.log('slug trouble', site, slug, e)
  }

  async function save(site:site, slug:slug, sites:site[]) {
    let json = JSON.stringify(sites, null, 2)
    let text = new TextEncoder().encode(json)
    await Deno.writeFile(`data/${site}/${slug}.json`, text);
  }
}
