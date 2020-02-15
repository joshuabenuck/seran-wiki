import { serve, ServerRequest } from "https://deno.land/std@v0.30.0/http/server.ts";
export class WikiClient {
    req: ServerRequest

    constructor(req: ServerRequest) {
        this.req = req;
        this.req.headers.set("access-control-allow-origin", "*");
        this.req.headers.set(
            "access-control-allow-headers",
            "Origin, X-Requested-With, Content-Type, Accept, Range"
        );
    }

    serveContents(contentType, contents, length, req) {
        this.req.headers.set("content-length", length);
        this.req.headers.set("content-type", contentType);

        const res = {
            status: 200,
            body: contents,
            headers: this.req.headers
        };
        this.req.respond(res);
    }

    async serveFile(contentType, filePath, req) {
        const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)]);
        this.serveContents(contentType, file, fileInfo.len.toString(), req);
    }

    serveJson(data) {
        this.req.respond({
            status: 200,
            body: JSON.stringify(data, null, 2),
            headers: this.req.headers
        });

    }

    serveSiteIndex() {
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

        this.serveJson(data)
    }
}