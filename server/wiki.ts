const { args, stat, open } = Deno;
import { ServerRequest } from "std/http/server.ts";
import { readFileStr, exists, readJson, writeJson } from "std/fs/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";
import { System, MetaSite } from "./system.ts";

import * as welcome from "./welcome.ts";
export const ABOUT_US_ID = welcome.ABOUT_US_ID
export const DO_AND_SHARE_ID = welcome.DO_AND_SHARE_ID
export const welcomePage = welcome.welcomePage

export interface Request extends ServerRequest {
  site: MetaSite;
  authenticated: boolean;
}

let metaPages = {
  "/system/site-index.json": serveSiteIndex,
  "/system/sitemap.json": serveSiteMap,
  "/system/plugins.json": servePlugins,
  "/denowiki.json": serveMetaAboutUs,
  "/login": login,
  "/logout": logout
};

export async function enableLogin(site: MetaSite, system: System) {
  site.secret = system.secret
}

function authHeaderToPassword(header) {
  let parts = header.trim().split(" ")
  if (parts[0] != "Basic") {
    console.log("Missing Basic")
    return null
  }
  return atob(parts[1])
}

export function authenticated(req: Request) {
  let obj = cookie(req.headers.get("cookie"))
  return !!obj["wiki-session"]
}

function login(req: Request, system: System) {
  let secret = req.site.secret
  let headers = baseHeaders()
  const failure = {
    status: 401,
    body: JSON.stringify({success: false}),
    headers
  };
  if (!secret) {
    console.log(`ERROR: '${req.site.name}' does not have a secret set.`)
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
  if (secret != providedPassword) {
    console.log("ERROR: Provided password does not match site secret.")
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

function logout(req: Request, system: System) {
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

export function serveContents(req: Request, contentType, contents, length) {
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

export async function serveFile(req: Request, contentType, filePath) {
  const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)]);
  serveContents(req, contentType, file, fileInfo.len.toString());
}

export function serveJson(req: Request, data) {
  let headers = baseHeaders();
  if (data && data.story) {
    if (data.dynamic == undefined) {
      data.dynamic = true;
    }
    if (!req.authenticated) {
      if (data.protected) {
        data = page(data.title, [paragraph("Login required to view")])
      } else {
        data.story = data.story.filter((i) => !i.protected)
      }
    }
  }
  req.respond({
    status: 200,
    body: JSON.stringify(data, null, 2),
    headers
  });
}

export function serveSiteIndex(req: Request) {
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

export function serveSiteMap(req: Request, system: System) {
  serveJson(req, req.site.siteMap);
}

export function servePlugins(req: Request, system: System) {
  // Make relative imports relative to target site, if needed
  let plugins = req.site.plugins.map((p) => {
    return (p.indexOf("/") == 0) ? "http://" + req.headers.get("host") + p : p
  });
  serveJson(req, plugins);
}

export function serveMetaAboutUs(req: Request, system: System) {
  serveJson(req, page("DenoWiki", [
    paragraph(`Site: ${req.site.name}`),
    paragraph(`Meta-Pages: TODO - Add info about the site's meta-pages`),
    paragraph(`Source: TODO - Add link to meta-site's source`),
    item("paragraph", {text: `Secret: ${req.site.secret}`, protected: true})
  ]));
}

export function serve404(req: Request) {
  console.log(`Unable to handle request: ${req.url}`);
  req.respond({
    status: 404,
    body: `Unable to handle request: ${req.url}`
  });
}

export async function serve(req: Request, system: System) {
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
    if (req.method != "POST") {
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
    // try to load existing page, if not found - create it
    let pagePath = join(req.site.root, "pages", slug)
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
  // workaround to allow this to be called outside of the context of a meta-site
  if (req.site) {
    let favicon = join(req.site.root, "status", "favicon.png")
    if (req.url == "/favicon.png" && await exists(favicon)) {
        serveFile(req, "image/png", favicon)
        return
    }
  }
  if (req.url.match(/^\/.*\.png$/)) {
    serveFile(req, "image/png", join("./client", req.url));
    return
  }
  let match = req.url.match(/^\/([a-z0-9-]+).json$/)
  if (match) {
    let page = match[1]
    let fullPath = join(req.site.root, "pages", page);
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

interface Page {
  title: string;
  story: Item[];
  protected?: boolean;
}

export function page(title: string, items: Item[]): Page {
  return {
    title,
    story: items
  };
}

interface Item {
  id: string;
  type: string;
  [key: string]: any;
}

export function item(type: string, props: Object): Item {
  let item = {
    type,
    id: itemId()
  };
  for (let prop of Object.keys(props)) {
    item[prop] = props[prop];
  }
  return item;
}

interface Paragraph extends Item {
  text: string;
}

export function paragraph(text: string): Paragraph {
  return item("paragraph", { text }) as Paragraph;
}

interface Reference extends Item {
  site: string;
  slug: string;
  title: string;
  text: string;
}

export function reference(site, slug, title, text): Reference {
  return item("reference", { site, slug, title, text }) as Reference;
}

interface Roster extends Item {
  text: string;
}

export function roster(roster: string): Roster {
  return item("roster", { text: roster }) as Roster;
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
