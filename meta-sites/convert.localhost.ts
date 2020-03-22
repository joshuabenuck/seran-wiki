import * as wiki from "seran/wiki.ts";
import { Request } from "seran/wiki.ts";

let conversions = {
  "inches-to-millimeters": (inches) => inches * 25.4,
  "millimeters-to-inches": (millimeters) => millimeters / 25.4
};

export async function serve(req: Request, system) {
  if (req.url == "/welcome-visitors.json") {
    wiki.serveJson(
      req,
      wiki.welcomePage("[[DenoWiki]]", "[[Inches to Millimeters]]")
    );
  } else if (req.url.match(/\/.*-to-.*\.json/)) {
    let conversion = req.url.replace(".json", "").replace("/", "");
    let [src, dst] = conversion.split("-to-");
    let formula = conversions[conversion];
    if (!formula) {
      wiki.serveJson(
        req,
        wiki.page(
          "Unknown",
          [ wiki.paragraph(`This site is unable to convert '${src}' to '${dst}'`) ]
        )
      );
      return;
    }
    src = src.charAt(0).toUpperCase() + src.substring(1);
    dst = dst.charAt(0).toUpperCase() + dst.substring(1);
    wiki.serveJson(
      req,
      wiki.page(
        `${src} to ${dst}`,
        [wiki.paragraph(`${src}: 1`), wiki.paragraph(`${dst}: ${formula(1)}`)]
      )
    );
  } else {
    wiki.serve(req, system);
  }
}
