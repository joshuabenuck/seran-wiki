const { exit, args, stat, permissions, readDir } = Deno;
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

async function processArgs() {
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
  convertToArray("domain", params);
  if (!await exists(params.root)) {
    console.log(`Creating: ${params.root}`)
    await Deno.mkdir(params.root)
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

  return { params, intf, port, bind }
}

let { params, intf, port, bind } = await processArgs()
const s = serve(`${intf}:${bind}`);

let system = new System(params.domain, port, params.root, params.secret);
system.importMetaSites(params)

console.log("listening on port ", bind);
for await (const r of s) {
  try {
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
      await req.respond(res);
    }
    if (metaSite) {
      req.site = metaSite;
      req.authenticated = wiki.authenticated(req)
      if (!await metaSite.serve(req)) {
        await wiki.serve(req, system);
      }
      continue;
    }

    if (await wiki.serveNotInService(req, system, params["allow-disclosure"])) {
      continue;
    }

    // if not a request for a user visible page in a missing site, return a 404
    console.log(
      "unknown site, unable to handle request:",
      requestedSite,
      req.url
    );
    await wiki.serve404(req);
  } catch (error) {
    console.error(error);
  }
}
