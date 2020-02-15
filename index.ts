const { ErrorKind, DenoError, args, stat, readDir, open, exit } = Deno;
import { serve } from "https://deno.land/std@v0.30.0/http/server.ts";
import { main } from "./journalck.ts"
import { WikiClient } from "./client.ts"
const s = serve({ port: 8000 });
console.log("http://localhost:8000/", s);

for await (const req of s) {
  let client = new WikiClient(req);
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

    client.serveJson(data)
  }
  else if (req.url == "/system/site-index.json") {
    client.serveSiteIndex()
  }
  else if (req.url == "/system/sitemap.json") {
    let data = [
      { slug: '-', title: '/', date: new Date(), synopsis: 'Root' }
    ]

    client.serveJson(data)
  }
  else if (req.url.match("/sites.json")) {
    let path = "c:/users/joshu/.wiki"
    let fileInfo = await stat(path)
    if (!fileInfo.isDirectory()) {
      console.log(`path ${path} is not a directory.`);
      continue;
    }

    let files = []
    for (let file of await Deno.readDir(path)) {
      if (file.name == "assets" ||
        file.name == "pages" ||
        file.name == "recycle" ||
        file.name == "status") {
        continue;
      }
      files.push(
        {
          type: "reference",
          id: "3f96ad3b1c040452",
          site: file.name,
          slug: "welcome-visitors",
          title: file.name,
          text: ""
        }
      )
    }
    let data = {
      title: path,
      story: files,
    }

    client.serveJson(data)
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
