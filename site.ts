const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { ServerRequest } from "https://deno.land/std@v0.30.0/http/server.ts";

export class Site {
    metaPages = {
        "/system/site-index.json": this.serveSiteIndex,
        "/system/sitemap.json": this.serveSiteMap,
    }

    baseHeaders() {
        let headers = new Headers()
        headers.set("access-control-allow-origin", "*");
        headers.set(
            "access-control-allow-headers",
            "Origin, X-Requested-With, Content-Type, Accept, Range"
        )
        return headers
    }

    serveContents(req, contentType, contents, length) {
        let headers = this.baseHeaders()
        headers.set("content-length", length);
        req.headers.set("content-type", contentType);

        const res = {
            status: 200,
            body: contents,
            headers
        };
        req.respond(res)
    }

    async serveFile(req, contentType, filePath) {
        const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)])
        this.serveContents(req, contentType, file, fileInfo.len.toString())
    }

    serveJson(req, data) {
        let headers = this.baseHeaders()
        req.respond({
            status: 200,
            body: JSON.stringify(data, null, 2),
            headers
        });

    }

    serveSiteIndex(req) {
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

        this.serveJson(req, data)
    }

    serveSiteMap(req) {

    }

    async serve(req: ServerRequest) {
        let metaPage = this.metaPages[req.url]
        if (metaPage) {
            let data = await metaPage()
            this.serveJson(req, data)
        }
        // TODO: Make safe for multi-tenant use
        else if (req.url.match(/^\/.*\.png$/)) {
            let filePath = `.${req.url}`
            this.serveFile(req, "image/png", filePath)
        }
        else {
            console.log(`Unable to handle request: ${req.url}`)
            req.respond({
                status: 404,
                body: `Unable to handle request: ${req.url}`
            });
        }
    }
}