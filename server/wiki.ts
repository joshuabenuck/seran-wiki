const { args, stat, open } = Deno;
import { ServerRequest } from "std/http/server.ts";
import { readFileStr, exists, readJson, writeJson } from "std/fs/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";

let metaPages = {
  "/system/site-index.json": serveSiteIndex,
  "/system/sitemap.json": serveSiteMap,
  "/system/plugins.json": servePlugins,
  "/denowiki.json": serveMetaAboutUs,
  "/login": login,
  "/logout": logout
};

export async function enableLogin(req, system) {
    let fullPath = join(system.root, req.host, "status", "owner.json")
    if (!await exists(fullPath)) {
      fullPath = join(system.root, system.hosts[req.host], "status", "owner.json")
      if (!await exists(fullPath)) {
        console.log(`Unable to retrieve password from: ${fullPath}`)
        return
      }
    }
    console.log(`Looking for password in: ${fullPath}`)
    let contents = await readFileStr(fullPath)
    let json = JSON.parse(contents)
    if (json.friend && json.friend.secret) {
      system.passwords[req.site] = json.friend.secret
    }
}

function authHeaderToPassword(header) {
  let parts = header.trim().split(" ")
  if (parts[0] != "Basic") {
    console.log("Missing Basic")
    return null
  }
  return atob(parts[1])
}

export function authenticated(req) {
  let obj = cookie(req.headers.get("cookie"))
  return !!obj["wiki-session"]
}

function login(req, system) {
  let pw = system.passwords[req.site]
  let headers = baseHeaders()
  const failure = {
    status: 401,
    body: JSON.stringify({success: false}),
    headers
  };
  if (!pw) {
    console.log(`ERROR: '${req.site}' does not have a password set.`)
    req.respond(failure);
    return
  }
  let obj = cookie(req.headers.get("cookie"))
  let auth = req.headers.get("Authorization")
  if (!auth) {
    console.log("ERROR: No Authorization header found.")
    req.respond(failure);
    return
  }
  let providedPassword = authHeaderToPassword(auth)
  if (pw != providedPassword) {
    console.log("ERROR: Passwords do not match.")
    req.respond(failure);
    return
  }
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

function logout(req, system) {
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
  if (data && data.story) {
    if (data.dynamic == undefined) {
      data.dynamic = true;
    }
    if (!req.authenticated) {
      if (data.sensitive) {
        data = page(data.title, [paragraph("Login required to view")])
      } else {
        data.story = data.story.filter((i) => !i.sensitive)
      }
    }
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

export function serveSiteMap(req, system) {
  serveJson(req, system.siteMaps[req.site]);
}

export function servePlugins(req, system) {
  serveJson(req, system.plugins[req.site]);
}

export function serveMetaAboutUs(req, system) {
  serveJson(req, page("DenoWiki", [
    paragraph(`Site: ${req.site}`),
    paragraph(`Meta-Pages: TODO - Add info about the site's meta-pages`),
    paragraph(`Source: TODO - Add link to meta-site's source`),
    item("paragraph", {text: `Password: ${system.passwords[req.site]}`, sensitive: true})
  ]));
}

export function serve404(req) {
  console.log(`Unable to handle request: ${req.url}`);
  req.respond({
    status: 404,
    body: `Unable to handle request: ${req.url}`
  });
}

export async function serve(req, system) {
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
    let data = await metaPage(req, system);
    serveJson(req, data);
    return
  }
  // TODO: Extract into its own function
  if (req.url.indexOf("/system/save") == 0) {
    if (req.url.method != "POST") {
      // Different status code?
      serve404(req)
      return
    }
    if (!req.authenticated) {
      // TODO: Should be a different status code
      serve404(req)
      return
    }
    let url = new URL(req.url)
    let fullSlug = url.searchParams.get("page")
    let slug = fullSlug
    let siteName = new URL(req.url).origin
    let colonIndex = fullSlug.indexOf(":")
    if (colonIndex != -1) {
      siteName = fullSlug.substring(0, colonIndex)
      slug = fullSlug.substring(colonIndex + 1)
    }
    // ick... Really need to encapsulate this logic somewhere
    // the amount of code duplication here is a concern
    let host = system.siteHosts[siteName];
    let siteRoot = join(system.root, host)
    if (!await exists(siteRoot)) {
      siteRoot = join(system.root, system.hosts[host])
    }
    // try to load existing page, if not found - create it
    let pagePath = join(siteRoot, "pages", slug)
    if (!await exists(pagePath)) {
      // TODO: Handle initial page creation
      serveJson(req, {success: true})
      return
    }
  }
  if (req.url.indexOf("/index.html") == 0) {
    serveFile(req, "text/html", "./client/index.html");
    return
  }
  if (req.url.match(/^\/client\/.*\.mjs$/)) {
    let filePath = `.${req.url}`;
    serveFile(req, "text/javascript", filePath);
    return
  }
  let favicon = join(req.siteRoot, "status", "favicon.png")
  if (req.url == "/favicon.png" && await exists(favicon)) {
      serveFile(req, "image/png", favicon)
      return
  }
  if (req.url.match(/^\/.*\.png$/)) {
    serveFile(req, "image/png", join("./client", req.url));
    return
  }
  let match = req.url.match(/^\/([a-z0-9-]+).json$/)
  if (match) {
    let page = match[1]
    let fullPath = join(req.siteRoot, "pages", page);
    if (await exists(fullPath)) {
      serveFile(req, "application/json", fullPath);
      return
    }
  }
  serve404(req);
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
    // console.log(JSON.stringify(page,null,2))
    metaPages[`/${asSlug(title)}.json`] = async (req, _system) => {serveJson(req, page)}
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
