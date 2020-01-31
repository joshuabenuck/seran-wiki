const { ErrorKind, DenoError, args, stat, readDir, open, exit } = Deno;
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
const s = serve({ port: 8000 });
console.log("http://localhost:8000/");
for await (const req of s) {
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
        let headers = new Headers();
        headers.set("access-control-allow-origin", "*");
        headers.set(
            "access-control-allow-headers",
            "Origin, X-Requested-With, Content-Type, Accept, Range"
        );
        req.respond({
            status: 200,
            body: JSON.stringify(data, null, 2),
            headers
        });

    }
    else if (req.url.indexOf("/favicon.png") == 0) {
        let filePath = "./favicon.png"
        const [file, fileInfo] = await Promise.all([open(filePath), stat(filePath)]);
        const headers = new Headers();
        headers.set("content-length", fileInfo.len.toString());
        headers.set("content-type", "image/png");

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
