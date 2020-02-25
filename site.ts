const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { ServerRequest } from "https://deno.land/std@v0.30.0/http/server.ts";

let metaPages = {
    "/system/site-index.json": serveSiteIndex,
    "/system/sitemap.json": serveSiteMap,
}

export function baseHeaders() {
    let headers = new Headers()
    headers.set("access-control-allow-origin", "*");
    headers.set(
        "access-control-allow-headers",
        "Origin, X-Requested-With, Content-Type, Accept, Range"
    )
    return headers
}

export function serveContents(req, contentType, contents, length) {
    let headers = baseHeaders()
    headers.set("content-length", length);
    req.headers.set("content-type", contentType);

    const res = {
        status: 200,
        body: contents,
        headers
    };
    req.respond(res)
}

export async function serveFile(req, contentType, filePath) {
    const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)])
    serveContents(req, contentType, file, fileInfo.len.toString())
}

export function serveJson(req, data) {
    let headers = baseHeaders()
    req.respond({
        status: 200,
        body: JSON.stringify(data, null, 2),
        headers
    });
}

export function serveSiteIndex(req) {
    let data = {
        "index":
            { "_tree": {}, "_prefix": "" },
        "documentCount": 0,
        "nextId": 0,
        "documentIds": {},
        "fieldIds":
            { "title": 0, "content": 1 },
        "fieldLength": {},
        "averageFieldLength": {},
        "storedFields": {}
    }

    serveJson(req, data)
}

export function serveSiteMap(req, site, system, pages) {
    let headers = baseHeaders()
    if (!pages) {
        pages = []
    }
    let siteMap = [
    ]
    for (let page of Object.keys(pages)) {
        let synopsis = ''
        let title = ''
        if (!pages[page].title) {
            let contents = pages[page](req, site, system)
            title = contents.title
            if (contents.story && contents.story.length != 0 && contents.story[0].text) {
                synopsis = contents.story[0].text
            }
        }
        else {
            synopsis = pages[page].synopsis
            title = pages[page].title
        }
        siteMap.push(
            { slug: page, title: title, date: new Date(), synopsis }
        )
    }
    console.log('sitemap', siteMap)
    req.respond({
        status: 200,
        body: JSON.stringify(siteMap, null, 2),
        headers
    });
}

export function serve404(req) {
    console.log(`Unable to handle request: ${req.url}`)
    req.respond({
        status: 404,
        body: `Unable to handle request: ${req.url}`
    });
}

export async function serve(req: ServerRequest, site, system) {
    let metaPage = metaPages[req.url]
    if (metaPage) {
        let data = await metaPage(req, site, system)
        serveJson(req, data)
    }
    // TODO: Make safe for multi-tenant use
    else if (req.url.match(/^\/.*\.png$/)) {
        let filePath = `.${req.url}`
        serveFile(req, "image/png", filePath)
    }
    else {
        serve404(req)
    }
}

export function page(title, items) {
    return {
        title,
        story: items
    }
}

export function item(type, props) {
    let item = {
        type,
        id: "ab35d"
    }
    for (let prop of Object.keys(props)) {
        item[prop] = props[prop]
    }
    return item
}

export function paragraph(text) {
    return item("paragraph", { text })
}

export function reference(site, slug, title, text) {
    return item("reference", { site, slug, title, text })
}