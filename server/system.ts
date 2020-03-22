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
  // our host:port
  targetSite: string;
  // just the host
  host: string;
  // non-default port number, if any
  port: number;
  // default hostname if not remapped
  defaultHost: string;
  // if set, login is enabled for the site
  password: string | null;
  // array of non-default plugins to load
  plugins: string[];
  // exports from the meta-site script
  exports: { [key: string]: any };
  // cached sitemap
  // TODO: Use stronger type here
  siteMap: Object[];

  // TODO: rename host
  constructor(system, path, host) {
    this.system = system
    this.port = system.port
    if (host && path.indexOf("localhost") != -1) {
      this.defaultHost = this.hostnameFrom(path);
      this.host = this.defaultHost.replace("localhost", host);
    }
    // handle remap of individual meta-site
    if (path.indexOf("@") != -1) {
      let parts = path.split("@");
      path = parts[0];
      this.host = parts[1];
      this.defaultHost = this.hostnameFrom(path);
    }
    // TODO: Test if a path or a url. If path, resolve relative to root of project
    if (path.indexOf("http") == -1) {
      path = join("../", path)
    }
    this.path = path;
    // if not remapped, host and defaultHost are the same
    if (!this.host) {
      this.host = basename(path.replace(/\.[tj]s$/, ""));
      this.defaultHost = this.host;
    }
    // TODO: Print canonical path here...
    console.log(`Registering ${normalize(path)} as ${this.host}`);
    this.targetSite = `${this.host}:${this.port}`;
  }

  async init() {
    // set the root, fall back to default host to allow usage whether mapped or not
    this.root = join(this.system.root, this.host)
    if (!await exists(this.root)) {
      this.root = join(this.system.root, this.defaultHost)
    }
    this.exports = await import(this.path);
    if (this.exports.init) {
      await this.exports.init({site: this, system: this.system});
    }
    this.siteMap = [];
    if (this.exports.siteMap) {
      this.siteMap = this.exports.siteMap(this.targetSite);
    }
    this.plugins = [];
    if (this.exports.plugins) {
      // Make relative imports relative to target site, if needed
      this.plugins = this.exports.plugins.map((p) => {
        return (p.indexOf("/") == 0) ? "http://" + this.targetSite + p : p
      });
    }
  }

  hostnameFrom(path) {
    return basename(path.replace(/\.[tj]s$/, ""));
  }

  serve(req) {
    if (this.exports.serve) {
      console.log("meta-site:", req.site.host, req.url);
      this.exports.serve(req, this.system);
    }
    if (this.exports.metaPages) {
      console.log("meta-page:", req.site.host, req.url);
      let metaPage = this.exports.metaPages[req.url];
      if (metaPage) {
        metaPage(req, this.system);
      } else {
        return false;
      }
    }
    return true;
  }
}

export class System {
  metaSites: { [key: string]: MetaSite };
  root: string;
  port: number;

  constructor(root: string, port: number) {
    this.metaSites = {};
    this.root = root;
    this.port = port;
  }

  async importMetaSite(path, host) {
    let metaSite = new MetaSite(this, path, host);
    await metaSite.init();
    this.metaSites[metaSite.targetSite] = metaSite;
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
      let metaSites = Object.values(this.metaSites).map((s) => s.host);
      let hosts = (await readFileStr(etcHosts)).split("\n");
      for (let host of hosts) {
        if (host.indexOf("127.0.0.1") == -1) {
          continue;
        }
        host = host.replace("127.0.0.1", "").trim();
        metaSites = metaSites.filter((metaSite) => {
          if (metaSite == host || metaSite.indexOf("localhost") == -1) {
            return false;
          }
          return true;
        });
      }
      metaSites.map((s) =>
        console.log(`WARN: missing /etc/hosts entry for ${s}.`)
      );
    }
  }
}

