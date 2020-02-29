const { ErrorKind, DenoError, args, stat, open, exit, writeFile } = Deno;
import { readFileStr, exists } from 'https://deno.land/std@v0.30.0/fs/mod.ts';
import { isAbsolute, join, basename } from "https://deno.land/std/path/posix.ts";

export let metaPages = {}

function route(url, fn) {
    metaPages[url] = fn
}

route("/welcome-visitors.json", async (req, site, _system) => {
    site.serveJson(req,
        site.page("Welcome Visitors", [
            site.paragraph("Here we supervise the ongoing scrape of the wiki federation."),
            site.paragraph("<button>start</button>")
        ])
    )
})