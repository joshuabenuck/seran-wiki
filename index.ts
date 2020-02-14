const { ErrorKind, DenoError, args, stat, readDir, open, exit } = Deno;
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
const s = serve({ port: 8000 });
console.log("http://localhost:8000/", s);

function params () {

    function hashed(hash, assign) {
        let op=assign.split(/=/)
        if (op[1]) hash[op[0]]=op[1]
        return hash
    }

    let query = window.location.href.split(/\?/)[1]||''
    let args = query.split(/&/)
    return args.reduce(hashed,{})
}

async function main() {
  //let p = params()
  let site = 'found.ward.bay.wiki.org' // || p.site
  //sitelink.innerHTML = `<a href="http://${site}" target=_blank>${site}</a>`
  let res = await fetch(`http://${site}/system/sitemap.json`)
  let map = await res.json()
  scan(site, map)
}
let times = []
function dump() {
  for (let time of times) {
    console.log(time)
  }
  times = []
}
setInterval(dump, 1000)
main()

async function scan (site, map) {
  // output.innerHTML = '<pre>' + JSON.stringify(map, null, 2)
    map.map(info =>`
      <li><a href="http://${site}/${info.slug}.html" target=_blank>${info.title}</a>
      <span id=${info.slug}></span> </li>`)
    .join("\n")
  map.map(async info => {
    let start = Date.now()
    try {
      let res = await fetch(`http://${site}/${info.slug}.json`)
      let page = await res.json()
      //console.log(page.title)
      let end = Date.now()
      times.push({slug: info.slug, start, end, diff: end - start})
    }
    catch(e) {
      times.push({slug: info.slug, start, error: true})
      //console.log("exc", e)
    }
  })
    //.then(page=>check(site, info.slug, page)))
}

function check (site, slug, page) {
  /*let trouble = nulls() || chron() || rev()
  document.getElementById(slug).innerHTML = !trouble ? '✓' : `<b><font color=red>${trouble}</font></b>`


  function nulls() {
    for (let item of page.story) {
      if (!item || !item.type) return 'nulls'
    }
    return null
  }

  function chron() {
    let date = nulls
    for (let action of page.journal) {
      if (date && action.date && date>action.date) {
        return 'chronology'
      }
      date = action.date
    }
    return null
  }

  function rev() {
    let revPage = {title: page.title, story: []};
    for (let action of page.journal||[]) {
      apply(revPage, action||{});
    }
    let ok = JSON.stringify(page.story) != JSON.stringify(revPage.story)
    if (!ok) console.log('revision', {page, revPage})
    return ok  ? 'revision' : null
    }
    */
}


/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// This module interprets journal actions in order to update
// a story or even regenerate a complete story from some or
// all of a journal.

function apply (page, action) {

  let index;
  /*const order = () => Array.from(page.story||[]).map((item) => (item != null ? item.id : undefined));

  const add = function(after, item) {
    const index = order().indexOf(after) + 1;
    return page.story.splice(index, 0, item);
  };

  const remove = function() {
    let index;
    if ((index = order().indexOf(action.id)) !== -1) {
      return page.story.splice(index,1);
    }
  };

  if (!page.story) { page.story = []; }

  switch (action.type) {
    case 'create':
      if (action.item != null) {
        if (action.item.title != null) { page.title = action.item.title; }
        if (action.item.story != null) { page.story = action.item.story.slice(); }
      }
      break;
    case 'add':
      add(action.after, action.item);
      break;
    case 'edit':
      if ((index = order().indexOf(action.id)) !== -1) {
        page.story.splice(index,1,action.item);
      } else {
        page.story.push(action.item);
      }
      break;
    case 'move':
      // construct relative addresses from absolute order
      index = action.order.indexOf(action.id);
      var after = action.order[index-1];
      var item = page.story[order().indexOf(action.id)];
      remove();
      add(after, item);
      break;
    case 'remove':
      remove();
      break;
  }

  if (!page.journal) { page.journal = []; }
  return page.journal.push(action);
  */
};

// const create = function(revIndex, data) {
//   revIndex = +revIndex;
//   const revJournal = data.journal.slice(0, +revIndex + 1 || undefined);
//   const revPage = {title: data.title, story: []};
//   for (let action of Array.from(revJournal)) {
//     apply(revPage, action||{});
//   }
//   return revPage;
// };

function base_headers() {
    let headers = new Headers();
    headers.set("access-control-allow-origin", "*");
    headers.set(
        "access-control-allow-headers",
        "Origin, X-Requested-With, Content-Type, Accept, Range"
    );
    return headers;
}

function serveContents(contentType, contents, length, req) {
    let headers = base_headers();
    headers.set("content-length", length);
    headers.set("content-type", contentType);

    const res = {
        status: 200,
        body: contents,
        headers
    };
    req.respond(res);
}

async function serveFile(contentType, filePath, req) {
    const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)]);
    serveContents(contentType, file, fileInfo.len.toString(), req);
}

for await (const req of s) {
    let headers = new Headers();
    headers.set("access-control-allow-origin", "*");
    headers.set(
        "access-control-allow-headers",
        "Origin, X-Requested-With, Content-Type, Accept, Range"
    );
    console.log(req.url)
    if (req.url.indexOf("/hello") == 0) {
        let data = {
            title: "Welcome Visitors",
            story: [
                {
                    type: "paragraph",
                    text: "Hello World!",
                    id: "ab35d" 
                }
            ]
        }
        req.respond({
            status: 200,
            body: JSON.stringify(data, null, 2),
            headers
        });

    }
    else if (req.url == "/system/site-index.json") {
        let data = {
            "index":
                {"_tree":{},"_prefix":""},
                "documentCount":0,
                "nextId":0,
                "documentIds":{},
                "fieldIds":
                    {"title":0,"content":1},
                "fieldLength":{},
                "averageFieldLength":{},
                "storedFields":{}
            }
        req.respond({
            status: 200,
            body: JSON.stringify(data, null, 2),
            headers
        });
    }
    else if (req.url == "/system/sitemap.json") {
        let data = [
            { slug: '-', title: '/', date: new Date(), synopsis: 'Root' }
        ]
        req.respond({
            status: 200,
            body: JSON.stringify(data, null, 2),
            headers
        });
    }
    else if (req.url.match("/[a-z-]+.json")) {
        let parts = req.url.split(".json")
        let path = parts[0].substring(1, parts[0].length).replace("-", "/")
        let fileInfo = await stat(path)
        if (!fileInfo.isDirectory()) {
            console.log(`path ${path} is not a directory.`);
            continue;
        }

        let files = []
        for (let file of await Deno.readDir(path)) {
            files.push(
                {
                    type: "paragraph",
                    text: `[[-${file.name}]] ${file.len}`,
                    id: "ab35d" 
                }
            )
        }

        let data = {
            title: path,
            story: files,
        }
        req.respond({
            status: 200,
            body: JSON.stringify(data, null, 2),
            headers
        });

    }
    else if (req.url.match(/^\/.*\.png$/)) {
        let filePath = `.${req.url}`
        serveFile("image/png", filePath, req);
    }
    else if (req.url.indexOf("/index.html") == 0) {
        let filePath = "./index.html"
        serveFile("text/html", filePath, req);
    }
    else {

        req.respond({
            status: 200,
            body: "Hello Someone Else\n"
        });

    }
}
