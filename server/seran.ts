const { exit, args, stat, permissions } = Deno;
import { exists, readJson } from "std/fs/mod.ts";
import { parse } from "std/flags/mod.ts";
import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";
import { serve, ServerRequest } from "std/http/server.ts";
import * as wiki from "seran/wiki.ts";
import { System } from "seran/system.ts";

function convertToArray(param, params) {
  if (!Array.isArray(params[param])) {
    params[param] = [params[param]];
  }
}

let params = parse(args, {
  default: {
    port: '8000',
    "external-client": "dev.wiki.randombits.xyz",
    root: join(Deno.dir("home"), ".seran"),
    domain: "*",
    secret: null
  },
  boolean: "allow-disclosure"
});

let intf = "0.0.0.0";
let port = params.port;
let bind = params.port;

let x = params.port.toString().split(':')
if (x[1]) {
  port = x[0]
  bind = x[1]
}
let allInterfaces = await permissions.query({ name: "net" });
if (allInterfaces.state != "granted") {
  let localhostInterface = await permissions.query(
    { name: "net", url: "http://127.0.0.1" }
  );
  if (localhostInterface.state != "granted") {
    console.log(
      "ERROR: Unsupported network permissions. Use --allow-net or --allow-net=127.0.0.1."
    );
    exit(1);
  }
  intf = "127.0.0.1";
}
const s = serve(`${intf}:${bind}`);

convertToArray("domain", params);

async function readdir(path): Promise<AsyncIterable<Deno.DirEntry>> {
  let fileInfo = await stat(path);
  if (!fileInfo.isDirectory) {
    console.log(`path ${path} is not a directory.`);
    return;
  }

  return Deno.readdir(path);
}

if (!await exists(params.root)) {
  console.log(`Creating: ${params.root}`)
  await Deno.mkdir(params.root)
}
let system = new System(params.domain, port, params.root, params.secret);

let configFile = null
for (let entry of params._) {
  entry = entry.toString()
  try {
    let url = new URL(entry);
    await system.importMetaSite(entry);
    continue;
  } catch (e) {
    // ignore exception
  }
  if (!await exists(entry)) {
    console.log(`FATAL: ${entry} is not a file, directory, or URL.`);
    exit(1);
  }
  let info = await stat(entry);
  if (info.isFile) {
    if (entry.match(/.*\.json$/)) {
      configFile = entry;
      continue;
    }
    await system.importMetaSite(entry);
  } else if (info.isDirectory) {
    for await (let metaSitePath of await readdir(entry)) {
      let fullPath = join(entry, metaSitePath.name);
      if (!isAbsolute(fullPath)) {
        fullPath = "./" + fullPath;
      }
      await system.importMetaSite(fullPath);
      continue;
    }
  }
}
if (Object.keys(system.metaSites).length == 0) {
  if (!configFile) {
    configFile = join(params.root, "seran-config.json")
  }
  console.log(`Looking for config: ${configFile}`)
  if (await exists(configFile)) {
    let config = await readJson(configFile)
    console.log("Parsing config.", config)
    system.processConfig(config)
  }
}


system.checkEtcHosts()

console.log("listening on port ", bind);
for await (const r of s) {
  let req = r as wiki.Request
  let requestedSite = req.headers.get("host");
  let metaSite = system.metaSiteFor(requestedSite);
  if (req.url == "/" && metaSite) {
    let headers = new Headers();
    headers.set(
      "Location",
      `http://${params["external-client"]}/${requestedSite}/welcome-visitors`
    );
    const res = {
      status: 302,
      headers
    };
    req.respond(res);
  }
  if (metaSite) {
    req.site = metaSite;
    req.authenticated = wiki.authenticated(req)
    if (!await metaSite.serve(req)) {
      wiki.serve(req, system);
    }
    continue;
  }
  if (req.url == "/not-in-service.json") {
    let items = [
      wiki.paragraph("You have reach a site that has been disconnected or is no longer in service."),
      wiki.paragraph("If you feel you have reached this page in error, please check the server configuration and try again."),
      wiki.paragraph("The most common cause for this during development is for there to be a mismatch between the hostname the server is listening on and the hostname you attempted to access."),
    ]
    if (params["allow-disclosure"]) {
      let sites = Object.values(system.metaSites);
      if (sites.length == 0) {
        items.push(wiki.paragraph("WARNING: There are no registered meta-sites."))
        items.push(wiki.paragraph("Did you forget to start the server with --meta-site or --meta-sites-dir?"))
      }
      else {
        items.push(wiki.paragraph("Registered domains:"))
        for (let domain of system.domains) {
          items.push(wiki.paragraph(domain))
        }
        items.push(wiki.paragraph("Registered sites:"))
        for (let site of sites) {
          items.push(wiki.paragraph(site.name))
        }
      }
    }
    wiki.serveJson(req, wiki.page("Not in Service", items))
    continue
  }
  // minimum routes needed to display a default error page
  // creating a meta-site just for this purpose
  // would likely be better, but this works for now
  if (req.url == "/index.html?page=not-in-service") {
    wiki.serveFile(req, "text/html", "./client/index.html");
    continue
  }
  if (req.url == "/" ||
      req.url.indexOf("/index.html") == 0) {
      req.url = "/view/not-in-service"
      wiki.serve(req, system)
  }
  if (req.url.match(/^\/client\/.*\.mjs$/) ||
      req.url.match(/^\/.*\.png$/)) {
    wiki.serve(req, system)
    continue
  }

  // if not a request for a user visible page in a missing site, return a 404
  console.log(
    "unknown site, unable to handle request:",
    requestedSite,
    req.url
  );
  wiki.serve404(req);
}
