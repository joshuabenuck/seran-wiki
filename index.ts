const { ErrorKind, DenoError, args, stat, readDir, open, exit } = Deno;
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
const s = serve({ port: 8000 });
console.log("http://localhost:8000/", s);

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
        req.respond({ status: 404, body: "Hello Someone Else\n" });

    }
}
