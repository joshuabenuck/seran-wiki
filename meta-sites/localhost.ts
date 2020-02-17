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
            console.log(metaPagePath.name)
            await import(`../meta-pages/${metaPagePath.name}`)
        }
    }

    async serve(req: ServerRequest) {
        // These are meta-pages from the meta-pages folder
        if (window["metaPages"][req.url]) {
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