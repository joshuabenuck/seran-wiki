import { ServerRequest } from "std/http/server.ts";

let conversions = {
  "inches-to-millimeters": (inches) => inches * 25.4,
  "millimeters-to-inches": (millimeters) => millimeters / 25.4
};

export async function serve(req: ServerRequest, site, system) {
  if (req.url == "/welcome-visitors.json") {
    site.serveJson(
      req,
      site.welcomePage("[[DenoWiki]]", "[[Inches to Millimeters]]")
    );
  } else if (req.url.match(/\/.*-to-.*\.json/)) {
    let conversion = req.url.replace(".json", "").replace("/", "");
    let [src, dst] = conversion.split("-to-");
    let formula = conversions[conversion];
    if (!formula) {
      site.serveJson(
        req,
        site.page(
          "Unknown",
          site.paragraph(`This site is unable to convert '${src}' to '${dst}'`)
        )
      );
      return;
    }
    src = src.charAt(0).toUpperCase() + src.substring(1);
    dst = dst.charAt(0).toUpperCase() + dst.substring(1);
    site.serveJson(
      req,
      site.page(
        `${src} to ${dst}`,
        [site.paragraph(`${src}: 1`), site.paragraph(`${dst}: ${formula(1)}`)]
      )
    );
  } else {
    site.serve(req, site, system);
  }
}
