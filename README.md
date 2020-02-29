# denowiki
Experiment to create a Deno based implementation of Federated Wiki

## Install

Get the prerequsites
```
brew install deno
git clone git@github.com:joshuabenuck/denowiki.git
```
Build and run from denowiki directory
```
deno -c tsconfig.json --allow-net --allow-read --allow-env index.ts --meta-sites-dir=./meta-sites

## Meta-Sites

This is the functionality the bundled meta-sites offer:
* du.localhost: Displays wiki pages with information about the files on disk starting with the root directory. Do not run this on a publicly facing wiki! It will allow anyone to browse the contents of the server's disk.
* localhost: Demonstrates how to write meta-pages.
* region.localhost: Experiment in parsing and displaying data from Ward's full federation scraper.

## Usage

The command line in the `Install` section will register and run all bundled meta-sites.

To only run a specific set of meta-sites use `--meta-site=<path to meta-site>`. This can be specified more than once to run multiple meta-sites.

By default, the hostname requested must exactly match the filename of the meta-site code (minus the extension). To override this use the form `--meta-site=<path to meta-site>@<alternate hostname>.

For example, to have `du.localhost.ts` answer to `du.rog`, `--meta-site=./meta-sites/du.localhost.ts@du.rog`.

Paths to meta-sites can be for local files or they can be urls to remote modules. Imports within the meta-site are resolved relative to their origin. This means local files will load other local files and remote modules will load other remote files.

## Creation of Meta-Sites

New meta-sites are simple to create. All that is needed is a module that:
* Exports an implementation of `serve(req, site, system)`. The function is called whenever a request for the meta-site is received. The `site` parameter provides access to commonly used helper functions useful when servicing requests. The `system` parameter provides system state metadata such as the list of registered sites and the list of sitemaps.
* For the meta-site to have a non-empty sitemap, it must export `siteMap()`. The function should return a sitemap in the form of `{ 'a-slug': { title: 'a page title', synopsis: 'the text of the first item on the page' } }`. This will be cached when the meta-site is registered.

Meta-sites may be hosted on any web accessible address. They need not be bundled with the denowiki install.