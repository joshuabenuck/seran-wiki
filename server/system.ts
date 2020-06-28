import {
  isAbsolute,
  join,
  basename,
  normalize
} from "std/path/posix.ts";
import { exists, readFileStr } from "std/fs/mod.ts";

export class MetaSite {
  // easy access to system wide settings or calls
  system: System;
  // the path of the import used
  path: string;
  // where on disk static pages are stored
  root: string;
  // just the meta-site name
  name: string;
  // non-default port number, if any
  port: string;
  // if set, login is enabled for the site
  secret: string | null;
  // array of non-default plugins to load
  plugins: string[];
  // exports from the meta-site script
  exports: { [key: string]: any };
  // cached sitemap
  // TODO: Use stronger type here
  siteMap: Object[];

  constructor(system: System, path: string) {
    // use consistent slashes as not all Deno method handle them being mixed
    path = path.replace(/\\/g, "/")
    this.system = system
    this.port = system.port
    // handle remap of individual meta-site
    if (path.indexOf("@") != -1) {
      let parts = path.split("@");
      path = parts[0];
      this.name = parts[1];
    }
    // TODO: Test if a path or a url. If path, resolve relative to root of project
    if (path.indexOf("http") == -1) {
      path = join("../", path)
    }
    this.path = path;
    if (!this.name) {
      this.name = this.nameFrom(path)
    }
    // needed to allow localhost to be also mapped to seran
    this.root = join(this.system.root, this.name)
  }

  async init() {
    if (!await exists(this.root)) {
      console.log(`Creating: ${this.root}`)
      await Deno.mkdir(this.root)
    }
    // TODO: Print canonical path here...
    console.log(`Registering ${normalize(this.path)} as ${this.name}`);
    this.exports = await import(this.path);
    if (this.exports.init) {
      await this.exports.init({ site: this, system: this.system });
    }
    this.siteMap = [];
    if (this.exports.siteMap) {
      this.siteMap = this.exports.siteMap(this.name);
    }
    this.plugins = [];
    if (this.exports.plugins) {
      this.plugins = this.exports.plugins
    }
  }

  nameFrom(path: string) {
    return basename(path.replace(/\.[tj]s$/, ""));
  }

  async serve(req) {
    if (this.exports.handler &&
      await this.exports.handler.serve(req, this.system)) {
      return true;
    }
    return false;
  }
}

export class System {
  metaSites: { [key: string]: MetaSite };
  domains: string[];
  port: string;
  root: string;
  secret: string;

  constructor(domains: string[], port: string, root: string, secret: string) {
    this.metaSites = {};
    this.domains = domains;
    this.port = port;
    this.root = root;
    if (!secret) {
      secret = Deno.env.get("SERAN_SECRET")
      if (!secret) {
        console.log("INFO: Login not enabled. Neither --secret parameter nor SERAN_SECRET env var are set.")
      }
    }
    this.secret = secret;
  }

  async importMetaSites(params: any) {
    for (let entry of params._) {
      entry = entry.toString()
      try {
        let url = new URL(entry);
        await this.importMetaSite(entry);
        continue;
      } catch (e) {
        // ignore exception
      }
      if (!await exists(entry)) {
        console.log(`FATAL: ${entry} is not a file, directory, or URL.`);
        Deno.exit(1);
      }
      let info = await Deno.stat(entry);
      if (info.isFile) {
        await this.importMetaSite(entry);
      } else if (info.isDirectory) {
        for await (let metaSitePath of Deno.readDir(entry)) {
          console.log("readDir1", metaSitePath.name);
          let fullPath = join(entry, metaSitePath.name);
          if (!isAbsolute(fullPath)) {
            fullPath = "./" + fullPath;
          }
          await this.importMetaSite(fullPath);
          continue;
        }
      }
    }
  }

  async importMetaSite(path: string) {
    let metaSite = new MetaSite(this, path);
    await metaSite.init();
    this.metaSites[metaSite.name] = metaSite;
  }

  metaSiteFor(host) {
    let matches = Object.values(this.metaSites).filter((s) => host.indexOf(s.name) == 0)
    matches = matches.filter((s) => this.domains.some((d) => d == "*" || host.match(`.*${d}`)))
    if (matches.length == 0) return;
    // TODO: Verify this sort does what we want.
    matches = matches.sort((a, b) => a.name.length - b.name.length)
    return matches[0];
  }

  metaSitesInDomain(req) {
    let domain = req.headers.get("host")
    let sites = Object.keys(this.metaSites).filter((s) => !s.match(/localhost/))
    if (!domain.match(/^localhost.*/)) {
      // strip off meta-site name
      domain = domain.substring(req.site.name.length + 1)
    }
    if (domain.match(/.*localhost.*/)) {
      // filter out seran entry if on localhost
      sites = sites.filter((s) => !s.match(/seran/))
    }
    // append domain to all non-localhost sites
    sites = sites.map((s) => `${s}.${domain}`)
    return sites
  }
}

