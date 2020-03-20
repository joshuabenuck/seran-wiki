import {
  isAbsolute,
  join,
  basename
} from "std/path/posix.ts";

export class System {
  metaSites: {};
  siteMaps: {};
  plugins: {};
  passwords: {};
  siteHosts: {};
  hosts: {};
  root: string;
  port: number;

  constructor(root: string, port: number) {
    this.metaSites = {};
    this.siteMaps = {};
    this.plugins = {};
    this.passwords = {};
    this.siteHosts = {};
    this.hosts = {};
    this.root = root;
    this.port = port;
  }

  hostnameFrom(path) {
    return basename(path.replace(/\.[tj]s$/, ""));
  }

  async importMetaSite(path, host) {
    let name = undefined;
    if (host && path.indexOf("localhost") != -1) {
      let orig = this.hostnameFrom(path);
      name = orig.replace("localhost", host);
      this.hosts[name] = orig
    }
    if (path.indexOf("@") != -1) {
      let parts = path.split("@");
      path = parts[0];
      name = parts[1];
      this.hosts[name] = this.hostnameFrom(path);
    }
    // TODO: Test if a path or a url. If path, resolve relative to root of project
    if (path.indexOf("http") == -1) {
      path = "../" + path
    }
    let metaSite = await import(path);
    if (!name) {
      name = basename(path.replace(/\.[tj]s$/, ""));
      this.hosts[name] = name
    }
    console.log(`Registering ${path} as ${name}`);
    let targetSite = `${name}:${this.port}`;
    this.siteHosts[targetSite] = name;
    if (metaSite.init) {
      await metaSite.init({req: {site: targetSite, host: name}, system: this});
    }
    this.metaSites[targetSite] = metaSite;
    this.siteMaps[targetSite] = [];
    if (metaSite.siteMap) {
      this.siteMaps[targetSite] = metaSite.siteMap(targetSite);
    }
    if (metaSite.plugins) {
      this.plugins[targetSite] = metaSite.plugins.map((p) => {
      return (p.indexOf("/") == 0) ? "http://" + targetSite + p : p
      });
    }
  }
}

