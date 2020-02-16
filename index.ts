const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
import { main } from "./journalck.ts"
import { WikiClient } from "./client.ts"
const s = serve({ port: 8000 });
console.log("http://localhost:8000/", s);

async function readDir(path) {
  let fileInfo = await stat(path)
  if (!fileInfo.isDirectory()) {
    console.log(`path ${path} is not a directory.`);
    return [];
  }

  return await Deno.readDir(path);
}

window["metaPages"] = {}
for (let metaPagePath of await readDir("./meta-pages")) {
  console.log(metaPagePath.name)
  await import(`./meta-pages/${metaPagePath.name}`)
}

for await (const req of s) {
  let client = new WikiClient(req);
  console.log(req.url)
  if (window["metaPages"][req.url]) {
    console.log("calling:", window["metaPages"][req.url])
    let data = await window["metaPages"][req.url]()
    client.serveJson(data)
  }
  else if (req.url.match("/[a-z-]+.json")) {
    let parts = req.url.split(".json")
    let path = parts[0].substring(1, parts[0].length).replace("-", "/")

    let files = []
    for (let file of await readDir(path)) {
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

    client.serveJson(data)
  }
  else if (req.url.match(/^\/.*\.png$/)) {
    let filePath = `.${req.url}`
    client.serveFile("image/png", filePath, req);
  }
  else if (req.url.indexOf("/index.html") == 0) {
    let filePath = "./index.html"
    client.serveFile("text/html", filePath, req);
  }
  else {
    req.respond({
      status: 200,
      body: "Hello Someone Else\n"
    });
  }
}
