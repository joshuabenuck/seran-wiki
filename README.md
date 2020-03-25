# seran-wiki
Experiment to create a Deno based implementation of Federated Wiki.

## Install

Get the prerequsites (derive from the official [instructions](https://deno.land/x/install/))
```
export DENO_INSTALL=/usr/local
curl -fsSL https://deno.land/x/install/install.sh | sh -s v0.36.0
```
Ensure /usr/local/bin is on your path.

or
```
iwr https://deno.land/x/install/install.ps1 -useb -outf install.ps1; .\install.ps1 v0.36.0
```
then
```
git clone git@github.com:joshuabenuck/seran-wiki.git
```
Build and run from denowiki directory
```
./seran-wiki.sh --meta-sites-dir=./meta-sites
```
or
```
.\seran-wiki.cmd --meta-sites-dir=.\meta-sites
```

Navigate to http://localtest.me:8000/ or http://localtest.me:8000/index.html to view with a remote client or the bundled client, respectively.

## Meta-Sites

This is the functionality the bundled meta-sites offer:
* du.localhost: Displays wiki pages with information about the files on disk starting with the root directory. Do not run this on a publicly facing wiki! It will allow anyone to browse the contents of the server's disk.
* localhost: Demonstrates how to write meta-pages.
* region.localhost: Experiment in parsing and displaying data from Ward's full federation scraper.

## Usage

The command line in the `Install` section will register and run all bundled meta-sites.

To only run a specific set of meta-sites use `--meta-site=<path to meta-site>`. This can be specified more than once to run multiple meta-sites.

By default, the hostname requested must exactly match the filename of the meta-site code (minus the extension). To override this use the form `--meta-site=<path to meta-site>@<alternate hostname>`.

For example, to have `du.localhost.ts` answer to `du.localtest.me`, `--meta-site=./meta-sites/du.localhost.ts@du.localtest.me`.

Paths to meta-sites can be for local files or they can be urls to remote modules. Imports within the meta-site are resolved relative to their origin. This means local files will load other local files and remote modules will load other remote files.

## Creation of Meta-Sites

New meta-sites are simple to create. All that is needed is a module that:
* Exports an implementation of `serve(req, site, system)`. The function is called whenever a request for the meta-site is received. The `site` parameter provides access to commonly used helper functions useful when servicing requests. The `system` parameter provides system state metadata such as the list of registered sites and the list of sitemaps.
* For the meta-site to have a non-empty sitemap, it must export `siteMap()`. The function should return a sitemap in the form of `{ 'a-slug': { title: 'a page title', synopsis: 'the text of the first item on the page' } }`. This will be cached when the meta-site is registered.

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