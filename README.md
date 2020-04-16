# seran-wiki
Experiment to create a Deno based implementation of Federated Wiki.

## Install

Get the prerequsites (derive from the official [instructions](https://deno.land/x/install/))
```
export DENO_INSTALL=/usr/local
curl -fsSL https://deno.land/x/install/install.sh | sh -s v0.41.0
```
Ensure /usr/local/bin is on your path.

or
```
iwr https://deno.land/x/install/install.ps1 -useb -outf install.ps1; .\install.ps1 v0.41.0
```
then
```
git clone git@github.com:joshuabenuck/seran-wiki.git
```
Build and run from denowiki directory
```
./seran-wiki.sh ./meta-sites
```
or
```
.\seran-wiki.cmd .\meta-sites
```

Navigate to http://outposts.localtest.me:8000/ or http://outposts.localtest.me:8000/index.html to view with a remote client or the bundled client, respectively.

## Meta-Sites

The vast majority of useful meta-sites will not be stored within this repo. This section lists interesting meta-sites to try out. If you have a meta-site you want added to the list, please mention it in the Federated Wiki riot chat room.

### Prog21
This is a collection of meta-sites centered around an archive copy of a blog.

A site with a history of experiments performed to better understand the contents of the archived posts. (Cannot run from a URL, must checkout from source)

```
git checkout https://github.com/joshuabenuck/seran-prog21
cd seran-wiki
./seran-wiki.sh ../seran-prog21/meta-sites/analysis21.ts`
```

Go to http://analysis21.localtest.me:8000/index.html

### Federation Scraper
Run this to create your own scrape of the federation.

`./seran-wiki.sh http://raw.githubusercontent.com/WardCunningham/seran-scrape/master/scrape.ts`

Go to http://scrape.localtest.me:8000/index.html

### Region
Experiment in parsing and displaying data from Ward's full federation scraper.

`./seran-wiki.sh ./meta-sites/region.ts`

Go to http://region.localtest.me:8000/index.html

### Outposts
This meta-site will eventually hold the core management functionality for configuring the seran-wiki server itself. Right now it contains miscellany.

`./seran-wiki.sh ./meta-sites/outposts.ts`

Go to http://outposts.localtest.me:8000/index.html

## Usage

The command line in the `Install` section will register and run all bundled meta-sites.

`./seran-wiki.[sh|cmd] [--domain=<>] [--allow-disclosure] <file|directory|URL> ...`

  * **--domain**: Only have the server answer to URLs for this domain. May be specified more than once. Default is a wildcard.
  * **--allow-disclosure**: Display the registered domains and meta-sites on the default error page. If this is not specified, the server will not disclose which domains or meta-sites are registered to avoid revealing too much about the server stetup.
  * <**file**>: If the file is a TypeScript file, load the associated meta-site. If a JSON file, load it as a config file.
  * <**directory**>: Load all TypeScript files in the directory as meta-sites.
  * <**URL**>: Load the URL as a meta-site.

If a file or directory does not exist, server startup will fail.

Paths to meta-sites can be for local files or they can be urls to remote modules. Imports within the meta-site are resolved relative to their origin. This means local files will load other local files and remote modules will load other remote files.

## Creation of Meta-Sites

New meta-sites are simple to create.

Meta-sites are modules. Adding exports with well-known names enables certain functionality.

* `handler: wiki.Handler`: The `Handler` class provides many helper methods for registering routes for pages, plugins, or more complex regex patterns.
* `metaPages: {}`: An object literal with a mapping of URLs to functions in the form `fn(req: Request, system: System): void`. If there is an exact match of the URL, the associated function will be called to service the request.
* `serve(req: Request, system: System): boolean`: This function is called whenever a request for the meta-site is received. The `system` parameter provides system state metadata such as the list of registered sites and the list of sitemaps.
* `siteMap: () => {}`: Gives the meta-site a sitemap which is useful if it participates in the larger federation. The function should return a sitemap in the form of `{ 'a-slug': { title: 'a page title', synopsis: 'the text of the first item on the page' } }`. This will be cached when the meta-site is registered.

It is permissible for a meta-site to export more than one request routing export. If implementing your own `serve` method, be sure to return true if and only if the request was handled. Otherwise, the server will appear to hang and the request will timeout.

Meta-sites may be hosted on any web accessible address. They need not be bundled with the denowiki install.

## Creation of Plugins

Plugins extend the web components that can be rendered by seran-wiki's client. They are created by calling `registerPlugin(pluginName, ComponentClass)`. As an example, the `paragraph` plugin is registered via `registerPlugin('paragraph', Paragraph)`.

The web component that gets registered is always prefixed with `wiki-` (e.g. `wiki-plugin`).

Plugins are nothing more than web components that follow a few conventions. The always have a `render(json)` object that gets called when they need to be rendered. It is recommended that an init flag be used to guard against the `connectedCallback` being called more than once for an item.

Most plugins will want to set a `:host` style of `display: block`. It is recommended that plugins use the shadow dom to encapsulate their styling and dom.

Configuration of their content should be via attributes and / or slots. Slots are best used when multi-line content is needed.

Attributes should be mirrored as properties. Setting an attribute after item (plugin) instantiation should result in the visual display of the item being updated. To do this, `observedAttributes` must be defined along with an `attributeChangedCallback`. The property setters should call `setAttribute` and the property getters should call `getAttribute`, otherwise you risk creating an infinite loop when attributes or properties are changed.

Examples of existing plugins are in the `client` folder. Look for `paragraph`, `roster`, and `reference`. See `page` for an example of the `attributeChangedCallback` and an `observedAttributes` implementation.

For a plugin to be loaded, the meta-site that uses it should export a `plugins` array containing the URL of the plugin. If the plugin is hosted on the same site as the meta-site, the URL need not be fully qualified. All plugin URLs that start with `/` will have the origin of the meta-site prepended to the URL before sending it to the client.