const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { Site } from "../site.ts"
import { ServerRequest } from "https://deno.land/std@v0.30.0/http/server.ts";
import { encode, decode } from "https://deno.land/std/encoding/base32.ts";

async function readDir(path) {
    let fileInfo = await stat(path)
    if (!fileInfo.isDirectory()) {
        console.log(`path ${path} is not a directory.`);
        return [];
    }

    return await Deno.readDir(path);
}

class DuSite extends Site {
    b32path(path) {
        return encode(new TextEncoder().encode(path)).replace(/=/g, "")
    }

    async serve(req: ServerRequest) {
        console.log("du", req.url)
        let metaPage = this.metaPages[req.url]
        if (req.url == "/welcome-visitors.json") {
            this.serveJson(req, {
                title: "Welcome Visitors",
                story: [
                    {
                        type: "paragraph",
                        text: `[[${this.b32path("/")}]] - /`,
                        id: "ab35d"
                    }
                ],
            })
        }
        else if (metaPage) {
            this.serveJson(req, await metaPage())
        }
        else if (req.url.match("/[a-z0-9]+.json")) {
            let parts = req.url.split(".json")
            let base32path = parts[0].substring(1, parts[0].length)
            let multipleOf = Math.ceil(base32path.length / 8)
            let targetLength = multipleOf * 8
            base32path = base32path.padEnd(targetLength, "=")
            console.log("base32path", base32path)
            let path = new TextDecoder().decode(decode(base32path.toUpperCase()))
            console.log("path", path)

            let files = []
            for (let file of await readDir(path)) {
                let fullPath = [path, file.name].join("/").replace("//", "/")
                files.push(
                    {
                        type: "paragraph",
                        text: `[[${this.b32path(fullPath)}]] ${fullPath} - ${file.len}`,
                        id: "ab35d"
                    }
                )
            }

            let data = {
                title: path,
                story: files,
            }

            this.serveJson(req, data)
        }
        else {
            super.serve(req)
        }
    }
}

window["metaSites"]["du.localhost:8000"] = new DuSite()