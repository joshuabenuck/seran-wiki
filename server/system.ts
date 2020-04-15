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
    // TODO: Print canonical path here...
    console.log(`Registering ${normalize(this.path)} as ${this.name}`);
    this.exports = await import(this.path);
    if (this.exports.init) {
      await this.exports.init({site: this, system: this.system});
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

  serve(req) {
    if (this.exports.serve) {
      console.log("meta-site:", req.site.name, req.url);
      if (this.exports.serve(req, this.system)) {
        return true;
      }
    }
    if (this.exports.handler &&
      this.exports.handler.serve(req, this.system)) {
        return true;
    } else if (this.exports.metaPages) {
      console.log("meta-page:", req.site.name, req.url);
      let metaPage = this.exports.metaPages[req.url];
      if (metaPage) {
        metaPage(req, this.system);
        return true;
      }
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
      secret = Deno.env().SERAN_SECRET
      if (!secret) {
        console.log("INFO: Login not enabled. Neither --secret parameter nor SERAN_SECRET env var are set.")
      }
    }
    this.secret = secret;
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

  async processConfig(config) {
    /* Pseudo-json example
    // Equivalent of an @domain for a meta-sites-dir
    root-domains: []
    meta-sites: {
      // Must specific each meta-site to register
      static.localhost.ts: {
        subdomains: [],
        hostnames: [],
        // possible meta-site specific config?
        register-all: true,
        enabled-wikis: []
      }
      // Additional parameters are not required
      localhost.ts: {}
    }
    */
    let domains = config["root-domains"]
    if (!domains) {
      domains = []
    }
    let sites = config["meta-sites"]
    if (!sites) {
      sites = []
    }
    // TODO: Rework once host agnostic refactoring is complete.
    // for (let site of Object.keys(sites)) {
    //   // register meta-site specific subdomains of root domains
    //   let subdomains = sites[site].subdomains
    //   if (subdomains) {
    //     for (let subdomain of subdomains) {
    //       for (let domain of domains) {
    //         await this.importMetaSite(`${site}@${subdomain}`, domain)
    //       }
    //     }
    //   }
    //   // register meta-site specific hostname mappiings
    //   let hostnames = sites[site].hostnames
    //   if (hostnames) {
    //     for (let hostname of hostnames) {
    //       await this.importMetaSite(`${site}@${hostname}`, null)
    //     }
    //   }
    // }
    // // register meta-sites for each specified root domain
    // for (let domain of domains) {
    //   for (let site of Object.keys(sites)) {
    //     // should meta-sites with local mappings be skipped?
    //     await this.importMetaSite(site, domain)
    //   }
    // }
  }

  async checkEtcHosts() {
    let etcHosts = null;
    if (await exists("/etc/hosts")) {
      etcHosts = "/etc/hosts";
    }
    if (await exists("/Windows/System32/drivers/etc/hosts")) {
      etcHosts = "/Windows/System32/drivers/etc/hosts";
    }
    if (etcHosts) {
      let metaSites = Object.values(this.metaSites).map((s) => s.name);
      let hosts = (await readFileStr(etcHosts)).split("\n");
      for (let host of hosts) {
        if (host.indexOf("127.0.0.1") == -1) {
          continue;
        }
        host = host.replace("127.0.0.1", "").trim();
        metaSites = metaSites.filter((metaSite) => {
          if (metaSite + ".localhost" == host) {
            return false;
          }
          return true;
        });
      }
      if (metaSites.length > 0) {
        console.log(`WARN: missing /etc/hosts entries for ${metaSites.join(", ")}.`)
      }
    }
  }
}

