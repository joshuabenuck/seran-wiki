const { ErrorKind, DenoError, args, stat, readDir, open, exit } = Deno;
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
const s = serve({ port: 8000 });
console.log("http://localhost:8000/", s);

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
    else if (req.url.match("/[a-z-]+.json")) {
        let parts = req.url.split(".json")
        let path = parts[0].substring(1, parts[0].length).replace("-", "/")
        let fileInfo = stat(path)

        let data = {
            title: path,
            story: [
                {
                    type: "code",
                    text: JSON.stringify(fileInfo, null, 2),
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
    else if (req.url.match(/^\/.*\.png$/)) {
        let filePath = `.${req.url}`
        const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)]);
        headers.set("content-length", fileInfo.len.toString());
        headers.set("content-type", "image/png");

        const res = {
            status: 200,
            body: file,
            headers
        };
        req.respond(res);
    }
    else if (req.url.indexOf("/index.html") == 0) {
        let filePath = "./index.html"
        const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)]);
        headers.set("content-length", fileInfo.len.toString());
        headers.set("content-type", "text/html");

        const res = {
            status: 200,
            body: file,
            headers
        };
        req.respond(res);
    }
    else {
        req.respond({ status: 404, body: "Hello Someone Else\n" });

    }
}
