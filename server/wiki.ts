const { args, stat, open, close } = Deno;
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
  "/seranwiki.json": serveMetaAboutUs,
  "/login": login,
  "/logout": logout
};

/**
 * Helper to handle common types of routes needed by meta-sites
 */
export class Handler {
  routes: { [key: string]: (r: Request, s: System) => void };

  constructor() {
    this.routes = {}
  }

  /**
   * Register a route that will serve the given page.
   * @param page Either a page object or a function that produces one
   */
  page(page) {
    this.route(`/${asSlug(page.title)}.json`, async (req: Request, system: System) => {
      let story = page.story
      if (page.story.call) {
        story = await page.story(req, system)
      }
      story = story.map((i) => {
        if (typeof i == typeof "") {
          return paragraph(i)
        }
        return i
      })
      await serveJson(req, Object.assign({}, page, { story }));
      return true;
    });
  }

  /**
   * Register a route that will serve a page with the given items
   * @param title The title of the page
   * @param items The list of items to be in the story of the page
   * @param extraProps Extra properties to add to the page object
   */
  items(title: string, items, extraProps = {}) {
    this.page(Object.assign({ title, story: items }, extraProps))
  }

  /**
   * Register a route that will serve the source for plugins contained
   * within the meta-site.
   * @param root This should be the value of `import.meta.url`
   * @param subdir The subdirectory of the meta-site containing the source of the plugins
   */
  plugins(root, subdir) {
    this.route("^/[^/.]+\.mjs", async (req) => {
      serveResource(req, root, `/${subdir}/${req.url}`)
      return true
    })
  }

  /**
   * Generic route registration method
   * @param pattern A regex of the pattern for the route
   * @param callback What to do when a request matches the pattern
   */
  route(pattern, callback) {
    this.routes[pattern] = callback
  }

  /**
   * Helper function to look up matching route callbacks
   * @param url The url to match against the registered routes
   * @returns The function to call to service the url
   */
  match(url): (r: Request, s: System) => void {
    for (let pattern of Object.keys(this.routes)) {
      if (url.match(pattern)) {
        return this.routes[pattern]
      }
    }
    return null
  }

  /**
   * Serve a request using the registered routes
   * @param req The request to service
   * @param system Meta data about the system configuration
   */
  async serve(req: Request, system: System) {
    let match = this.match(req.url)
    if (!match) {
      return false;
    }
    return await match(req, system)
  }
}

export async function enableLogin(site: MetaSite, system: System) {
  site.secret = system.secret
}

function authHeaderToPassword(header) {
  let parts = header.trim().split(" ")
  if (parts[0] != "Basic") {
    console.warn("Missing Basic")
    return null
  }
  return atob(parts[1])
}

export function authenticated(req: Request) {
  let obj = cookie(req.headers.get("cookie"))
  return !!obj["wiki-session"]
}

async function login(req: Request, system: System) {
  let secret = req.site.secret
  let headers = baseHeaders()
  const failure = {
    status: 401,
    body: JSON.stringify({ success: false }),
    headers
  };
  if (!secret) {
    console.error(`ERROR: '${req.site.name}' does not have a secret set.`)
    await req.respond(failure);
    return
  }
  let obj = cookie(req.headers.get("cookie"))
  let auth = req.headers.get("Authorization")
  if (!auth) {
    console.error("ERROR: No Authorization header found.")
    await req.respond(failure);
    return
  }
  let providedPassword = authHeaderToPassword(auth)
  if (secret != providedPassword) {
    console.warn("ERROR: Provided password does not match site secret.")
    await req.respond(failure);
    return
  }
  let session = obj["wiki-session"]
  if (!session) {
    session = itemId()
    console.debug("Generating session id:", session)
    headers.set("Set-Cookie", `wiki-session=${session}`)
  }
  const res = {
    status: 200,
    body: JSON.stringify({ success: true }),
    headers
  };
  await req.respond(res);
}

async function logout(req: Request, system: System) {
  let headers = baseHeaders()
  headers.set("Set-Cookie", `wiki-session=logout; expires=${new Date()}`)
  const res = {
    status: 200,
    body: "OK",
    headers
  };
  await req.respond(res);
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

export async function serveContents(req: Request, contentType, contents, length) {
  let headers = baseHeaders();
  headers.set("content-length", length);
  headers.set("content-type", contentType);

  const res = {
    status: 200,
    body: contents,
    headers
  };
  await req.respond(res);
}

export async function serveFile(req: Request, contentType, filePath) {
  if (!await exists(filePath)) {
    console.error(`ERROR: Unable to serve ${filePath}`)
    await serve404(req)
    return
  }
  const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)]);
  console.debug("serveFile", filePath, fileInfo.size.toString());
  await serveContents(req, contentType, file, fileInfo.size.toString());
  close(file.rid);
}

export function mimeTypeFor(url) {
  let filetypes = {
    "mjs": "text/javascript",
    "js": "text/javascript",
    "css": "text/css"
  }
  let ext = url.split(".")[1]
  let filetype = filetypes[ext]
  if (!filetype) {
    console.warn("Unknown filetype:", ext, url)
    Deno.exit(1)
  }
  return filetype
}

export function localPathForUrl(url) {
  url = url.substring("file://".length)
  // workaround to avoid leading slash on windows paths
  if (url.indexOf(":") != -1) {
    url = url.substring(1)
  }
  return url
}

// TODO: Needs some work
// assumes that base is two levels away from the root of the project
// and that resource is relative to the root of the project
// This fits a model where the meta-site is in meta-sites
// And the desired resource is in the root or a peer to meta-sites
// A more robust implementation would detct this or provide a means
// to specify where the root of the project is
export async function serveResource(req: Request, base, resource) {
  let segments = base.split("/")
  let url = [...segments.slice(0, -2), resource.substring(1)].join("/")
  if (url.startsWith("file://")) {
    let path = localPathForUrl(url)
    await serveFile(req, mimeTypeFor(path), path)
    return
  }
  let contents = await (await fetch(url)).text()
  console.debug("serveResource", url, contents.length)
  await serveContents(req, mimeTypeFor(url), contents, contents.length)
}

export async function serveJson(req: Request, data) {
  let headers = baseHeaders();
  headers.set("content-type", "application/json");
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
    if (!data.journal) {
      let date = new Date().getTime()
      data.journal = []
      data.journal.push({
        type: "create",
        item: {
          title: data.title,
          story: data.story,
        },
        date
      })
    }
  }
  await req.respond({
    status: 200,
    body: JSON.stringify(data, null, 2),
    headers
  });
}

export async function serveSiteIndex(req: Request) {
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

  await serveJson(req, data);
}

export async function serveSiteMap(req: Request, system: System) {
  await serveJson(req, req.site.siteMap);
}

export async function servePlugins(req: Request, system: System) {
  // Make relative imports relative to target site, if needed
  let plugins = req.site.plugins.map((p) => {
    return (p.indexOf("/") == 0) ? "http://" + req.headers.get("host") + p : p
  });
  await serveJson(req, plugins);
}

export async function serveMetaAboutUs(req: Request, system: System) {
  await serveJson(req, page("SeranWiki", [
    paragraph(`Site: ${req.site.name}`),
    paragraph(`Meta-Pages: TODO - Add info about the site's meta-pages`),
    paragraph(`Source: TODO - Add link to meta-site's source`),
    item("paragraph", { text: `Secret: ${req.site.secret}`, protected: true })
  ]));
}

export async function serve404(req: Request) {
  console.warn(`Unable to handle request: ${req.url}`);
  await req.respond({
    status: 404,
    body: `Unable to handle request: ${req.url}`
  });
}

export async function serve(req: Request, system: System) {
  let nodeStyle = req.url.match(/^\/view\/([a-z0-9-]+)$/)
  if (nodeStyle) {
    let headers = baseHeaders()
    headers.set("Refresh", `0; url=/index.html?page=${nodeStyle[1]}`)
    await req.respond({
      status: 200,
      body: `<html><body>Redirecting to: <a href="/index.html?page=${nodeStyle[1]}">new style url</a>.</body></html>`,
      headers
    });
    return
  }
  let metaPage = metaPages[req.url];
  if (metaPage) {
    let data = await metaPage(req, system);
    await serveJson(req, data);
    return
  }
  // TODO: Extract into its own function
  if (req.url.indexOf("/system/save") == 0) {
    if (req.method != "POST") {
      // Different status code?
      await serve404(req)
      return
    }
    if (!req.authenticated) {
      // TODO: Should be a different status code
      await serve404(req)
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
      await serveJson(req, { success: true })
      return
    }
  }
  if (req.url.indexOf("/index.html") == 0) {
    await serveFile(req, "text/html", "./client/index.html");
    return
  }
  if (req.url.match(/^\/client\/.*\.mjs$/)) {
    let filePath = `.${req.url}`;
    await serveFile(req, "text/javascript", filePath);
    return
  }
  // workaround to allow this to be called outside of the context of a meta-site
  if (req.site) {
    let favicon = join(req.site.root, "status", "favicon.png")
    if (req.url == "/favicon.png" && await exists(favicon)) {
      await serveFile(req, "image/png", favicon)
      return
    }
  }
  if (req.url.match(/^\/.*\.png$/)) {
    await serveFile(req, "image/png", join("./client", req.url));
    return
  }
  let match = req.url.match(/^\/([a-z0-9-]+).json$/)
  if (match) {
    let page = match[1]
    let fullPath = join(req.site.root, "pages", page);
    if (await exists(fullPath)) {
      await serveFile(req, "application/json", fullPath);
      return
    }
  }
  await serve404(req);
}

export async function serveNotInService(req: Request, system: System, allowDisclosure: boolean) {
  if (req.url == "/not-in-service.json") {
    let items = [
      paragraph("You have reach a site that has been disconnected or is no longer in service."),
      paragraph("If you feel you have reached this page in error, please check the server configuration and try again."),
      paragraph("The most common cause for this during development is for there to be a mismatch between the hostname the server is listening on and the hostname you attempted to access."),
    ]
    if (allowDisclosure) {
      let sites = Object.values(system.metaSites);
      if (sites.length == 0) {
        items.push(paragraph("WARNING: There are no registered meta-sites."))
        items.push(paragraph("Did you forget to start the server with --meta-site or --meta-sites-dir?"))
      }
      else {
        items.push(paragraph("Registered domains:"))
        for (let domain of system.domains) {
          items.push(paragraph(domain))
        }
        items.push(paragraph("Registered sites:"))
        for (let site of sites) {
          items.push(paragraph(site.name))
        }
      }
    }
    await serveJson(req, page("Not in Service", items))
    return true
  }
  // minimum routes needed to display a default error page
  // creating a meta-site just for this purpose
  // would likely be better, but this works for now
  if (req.url == "/index.html?page=not-in-service") {
    await serveFile(req, "text/html", "./client/index.html");
    return true
  }
  if (req.url == "/" ||
    req.url.indexOf("/index.html") == 0) {
    req.url = "/view/not-in-service"
    await serve(req, system)
    return true
  }
  if (req.url.match(/^\/client\/.*\.mjs$/) ||
    req.url.match(/^\/.*\.png$/)) {
    await serve(req, system)
    return true
  }
  return false
}

export function asSlug(title) {
  return title.replace(/\s/g, "-").replace(/[^A-Za-z0-9-]/g, "").toLowerCase();
}

export function pages(metaText, mp) {

  function parse(sep, text, fn) {
    let v = text.split(sep)
    for (let i = 1; i < v.length; i += 2)
      fn(v[i], v[i + 1])
  }

  parse(/\n([A-Z].*)/g, metaText, (title, body) => {
    let page = { title, story: [] }
    parse(/(\n\n\s*)/g, body, (blank, text) => {
      let id = itemId()
      let m = text.match(/^ *([a-z-]+):/)
      if (m) {
        let expr = `({${text.replace(/([a-z-]+):/, '')}})`
        let args = eval(expr)
        page.story.push(Object.assign({ type: m[1], id }, args))
      } else {
        page.story.push({ type: 'paragraph', text, id })
      }
    });
    // console.log(JSON.stringify(page,null,2))
    (mp || metaPages)[`/${asSlug(title)}.json`] = async (req, _system) => { await serveJson(req, page) }
  })

}

export interface Page {
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

export function pagefold(text: string) {
  return item("pagefold", { text });
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
