const { args, stat, open } = Deno;
import { ServerRequest } from "std/http/server.ts";

let metaPages = {
  "/system/site-index.json": serveSiteIndex,
  "/system/sitemap.json": serveSiteMap,
  "/system/plugins.json": servePlugins,
  "/denowiki.json": serveMetaAboutUs,
  "/login": login,
  "/logout": logout
};

function login(req, site, system) {
  console.log("login")
  let headers = baseHeaders()
  let obj = cookie(req.headers.get("cookie"))
  let session = obj["wiki-session"]
  if (!session) {
    session = itemId()
    console.log("Generating session id:", session)
    headers.set("Set-Cookie", `wiki-session=${session}`)
  }
  const res = {
    status: 200,
    body: JSON.stringify({success: true}),
    headers
  };
  req.respond(res);
}

function logout(req, site, system) {
  console.log("logout")
  let headers = baseHeaders()
  headers.set("Set-Cookie", `wiki-session=logout; expires=${new Date()}`)
  const res = {
    status: 200,
    body: "OK",
    headers
  };
  req.respond(res);
}

export function cookie(data) {
  if (!data) {
    return {}
  }
  return data.split(';').map(p => p.split('='))
    .reduce((obj, p) => {
      obj[decodeURIComponent(p[0].trim())] = decodeURIComponent(p[1].trim());
      return obj;
    }, {});
}

export function baseHeaders() {
  let headers = new Headers();
  headers.set("access-control-allow-origin", "*");
  headers.set(
    "access-control-allow-headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range"
  );
  // let cookieStr = Object.keys(obj).map((k) => `${k}=${obj[k]}`).join(";")
  return headers;
}

export function serveContents(req, contentType, contents, length) {
  let headers = baseHeaders();
  headers.set("content-length", length);
  headers.set("content-type", contentType);

  const res = {
    status: 200,
    body: contents,
    headers
  };
  req.respond(res);
}

export async function serveFile(req, contentType, filePath) {
  const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)]);
  serveContents(req, contentType, file, fileInfo.len.toString());
}

export function serveJson(req, data) {
  let headers = baseHeaders();
  if (data && data.dynamic == undefined) {
    data.dynamic = true;
  }
  req.respond({
    status: 200,
    body: JSON.stringify(data, null, 2),
    headers
  });
}

export function serveSiteIndex(req) {
  let data = {
    "index": { "_tree": {}, "_prefix": "" },
    "documentCount": 0,
    "nextId": 0,
    "documentIds": {},
    "fieldIds": { "title": 0, "content": 1 },
    "fieldLength": {},
    "averageFieldLength": {},
    "storedFields": {}
  };

  serveJson(req, data);
}

export function serveSiteMap(req, site, system) {
  serveJson(req, system.siteMaps[system.requestedSite]);
}

export function servePlugins(req, site, system) {
  serveJson(req, system.plugins[system.requestedSite]);
}

export function serveMetaAboutUs(req, site, system) {
  serveJson(req, page("DenoWiki", [
    paragraph(`Site: ${system.requestedSite}`),
    paragraph(`Meta-Pages: TODO - Add info about the site's meta-pages`),
    paragraph(`Source: TODO - Add link to meta-site's source`)
  ]));
}

export function serve404(req) {
  console.log(`Unable to handle request: ${req.url}`);
  req.respond({
    status: 404,
    body: `Unable to handle request: ${req.url}`
  });
}

export async function serve(req: ServerRequest, site, system) {
  let nodeStyle = req.url.match(/^\/view\/([a-z0-9-]+)$/)
  if (nodeStyle) {
    let headers = baseHeaders()
    headers.set("Refresh", `0; url=/index.html?page=${nodeStyle[1]}`)
    req.respond({
      status: 200,
      body: `<html><body>Redirecting to: <a href="/index.html?page=${nodeStyle[1]}">new style url</a>.</body></html>`,
      headers
    });
    return
  }
  let metaPage = metaPages[req.url];
  if (metaPage) {
    let data = await metaPage(req, site, system);
    serveJson(req, data);
  } // TODO: Make safe for multi-tenant use
  else if (req.url.indexOf("/index.html") == 0) {
    serveFile(req, "text/html", "./index.html");
  } else if (req.url.match(/^\/client\/.*\.mjs$/)) {
    let filePath = `.${req.url}`;
    serveFile(req, "text/javascript", filePath);
  } else if (req.url.match(/^\/.*\.png$/)) {
    let filePath = `.${req.url}`;
    serveFile(req, "image/png", filePath);
  } else {
    serve404(req);
  }
}

export function pages(metaText) {

  function asSlug(title) {
    return title.replace(/\s/g, "-").replace(/[^A-Za-z0-9-]/g, "").toLowerCase();
  }

  function parse(sep, text, fn) {
    let v = text.split(sep)
    for(let i = 1; i<v.length; i+=2)
      fn(v[i], v[i+1])
  }

  parse(/\n([A-Z][A-Za-z ]*)/g, metaText, (title, body) => {
    let page = {title,story:[]}
    parse(/(\n\n\s*)/g, body, (blank, text) => {
      let id = itemId()
      let m = text.match(/([a-z-]+):/)
      if (m) {
        let expr = `({${text.replace(/([a-z-]+):/,'')}})`
        let args = eval(expr)
        page.story.push(Object.assign({type:m[1],id},args))
      } else {
        page.story.push({type:'paragraph',text,id})
      }
    })
    console.log(JSON.stringify(page,null,2))
    metaPages[`/${asSlug(title)}.json`] = async (req, site, _system) => {site.serveJson(req, page)}
  })

}

export function page(title, items) {
  return {
    title,
    story: items
  };
}

export function item(type, props) {
  let item = {
    type,
    id: itemId()
  };
  for (let prop of Object.keys(props)) {
    item[prop] = props[prop];
  }
  return item;
}

export function paragraph(text) {
  return item("paragraph", { text });
}

export function reference(site, slug, title, text) {
  return item("reference", { site, slug, title, text });
}

export function roster(roster) {
  return item("roster", { text: roster });
}

export let DO_AND_SHARE_ID = "05e2fa92643677ca";
export let ABOUT_US_ID = "63ad2e58eecdd9e5";

export function welcomePage(aboutUs, doAndShare) {
  return {
    "title": "Welcome Visitors",
    "story": [
      {
        "text":
          "Welcome to this [http://fed.wiki.org/view/federated-wiki Federated Wiki] site. From this page you can find who we are and what we do. New sites provide this information and then claim the site as their own. You will need your own site to participate.",
        "id": "7b56f22a4b9ee974",
        "type": "paragraph"
      },
      {
        "type": "paragraph",
        "id": "821827c99b90cfd1",
        "text": "Pages about us."
      },
      {
        "type": "paragraph",
        "id": ABOUT_US_ID,
        "prompt":
          "Link to a page about yourself here. Type your name enclosed in double square brackets. Then press Command/ALT-S to save.\n\nMake all pages here yours alone with the login below.",
        "text": aboutUs
      },
      {
        "type": "paragraph",
        "id": "2bbd646ff3f44b51",
        "text": "Pages where we do and share."
      },
      {
        "type": "paragraph",
        "id": DO_AND_SHARE_ID,
        "prompt":
          "Create pages about things you do on this wiki. Type a descriptive name of something you will be writing about. Enclose it in square brackets. Then press Command/ALT-S to save.",
        "text": doAndShare
      },
      {
        "type": "paragraph",
        "id": "ee416d431ebf4fb4",
        "text":
          "You can edit your copy of these pages. Press [+] to add more writing spaces. Read [http://fed.wiki.org/view/how-to-wiki How to Wiki] for more ideas. Follow [[Recent Changes]] here and nearby."
      }
    ]
  };
}

function randomByte() {
  return (((1 + Math.random()) * 0x100) | 0).toString(16).substring(1);
}

function randomBytes(n) {
  let bytes = [];
  for (let _i of [...Array(n).keys()]) {
    bytes.push(randomByte());
  }
  return bytes.join("");
}

export function itemId() {
  return randomBytes(8);
}
