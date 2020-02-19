const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { Site } from "../site.ts"
import { ServerRequest } from "https://deno.land/std@v0.30.0/http/server.ts";

async function readDir(path) {
    let fileInfo = await stat(path)
    if (!fileInfo.isDirectory()) {
        console.log(`path ${path} is not a directory.`);
        return [];
    }

    return await Deno.readDir(path);
}

class Localhost extends Site {
    // since constructors cannot be async and readDir is async, use an init method
    async init() {
        for (let metaPagePath of await readDir("./meta-pages")) {
            let metaPage = await import(`../meta-pages/${metaPagePath.name}`)
            let exports = Object.keys(metaPage)
            if (exports.length > 1) {
                console.log(`Warning: Only registering first export of ${metaPagePath.name}`)
            }
            else if (exports.length == 0) {
                console.log(`Warning: Unable to register meta-page for ${metaPagePath.name}`)
                continue
            }
            this.metaPages[`/${metaPagePath.name.replace(/\.[tj]s$/, "")}.json`] = metaPage[exports[0]]
        }
    }

    async serve(req: ServerRequest) {
        if (req.url == "/welcome-visitors.json") {
            this.serveJson(req, {
                title: "Welcome Visitors",
                story: [
                    {
                        type: "paragraph",
                        text: "[[hello]]",
                        id: "ab35d"
                    }
                ],
            })
        }
        // These are meta-pages from the meta-pages folder
        else if (window["metaPages"][req.url]) {
            console.log("calling:", window["metaPages"][req.url])
            let data = await window["metaPages"][req.url]()
            this.serveJson(req, data)
        }
        else if (req.url.indexOf("/index.html") == 0) {
            let filePath = "./index.html"
            this.serveFile(req, "text/html", filePath)
        }
        // This will serve system urls and class local meta-pages
        else {
            super.serve(req)
        }
    }
}

let site = new Localhost()
await site.init()
window["metaSites"]["localhost:8000"] = site