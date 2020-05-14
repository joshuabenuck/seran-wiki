import * as wiki from "seran/wiki.ts";
import { Request } from "seran/wiki.ts";

export let handler = new wiki.Handler()

let conversions = {
  "inches-to-millimeters": (inches) => inches * 25.4,
  "millimeters-to-inches": (millimeters) => millimeters / 25.4
};

handler.page(wiki.welcomePage("[[DenoWiki]]", "[[Inches to Millimeters]]"))
handler.route(".*-to-.*\.json", async (req) => {
  let conversion = req.url.replace(".json", "").replace("/", "");
  let [src, dst] = conversion.split("-to-");
  let formula = conversions[conversion];
  if (!formula) {
    await wiki.serveJson(
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
  await wiki.serveJson(
    req,
    wiki.page(
      `${src} to ${dst}`,
      [wiki.paragraph(`${src}: 1`), wiki.paragraph(`${dst}: ${formula(1)}`)]
    )
  );
  return true
});
