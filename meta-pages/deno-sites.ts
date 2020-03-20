import * as wiki from "seran/wiki.ts";

export async function sites(req, system) {
  let sites = [];
  for (let metaSite of Object.keys(system.metaSites)) {
    sites.push(
      wiki.reference(
        metaSite,
        "welcome-visitors",
        "Welcome Visitors",
        await doAndShare(metaSite)
      )
    );
  }
  return wiki.page("Deno Sites", sites);
}

async function doAndShare(metaSite) {
  try {
    let response = await fetch(`http://${metaSite}/welcome-visitors.json`);
    let page = await response.json();
    for (let item of page.story) {
      if (item.id == wiki.DO_AND_SHARE_ID) {
        return item.text;
      }
    }
  } catch (e) {
    // Note: Fetch seems unable to resolve du.localhost or region.localhost
    console.log(`${metaSite}: Unable to get 'do and share' entry`, e);
  }
  // TODO: Call each meta page to get its title or use the slug
  // Figure out how to work around meta pages with long load times
  // if (metaSite.metaPages) {
  //     return Object.keys(metaSite.metaPages).map((p) => `[[${p}]]`).join(", ")
  // }
  return "Dynamic meta-site";
}
