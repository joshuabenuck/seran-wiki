export async function sites(req, site, system) {
    let sites = []
    for (let metaSite of Object.keys(system.metaSites)) {
        sites.push(site.reference(metaSite, "welcome-visitors", "Welcome Visitors", await doAndShare(metaSite, site)))
    }
    return site.page("Deno Sites", sites)
}

async function doAndShare(metaSite, site) {
    try {
        let response = await fetch(`http://${metaSite}/welcome-visitors.json`)
        let page = await response.json()
        for (let item of page.story) {
            if (item.id == site.DO_AND_SHARE_ID) {
                return item.text
            }
        }
    }
    catch (e) {
        // Note: Fetch seems unable to resolve du.localhost or region.localhost
        console.log(`${metaSite}: Unable to get 'do and share' entry`, e)
    }
    // TODO: Call each meta page to get its title or use the slug
    // Figure out how to work around meta pages with long load times
    // if (metaSite.metaPages) {
    //     return Object.keys(metaSite.metaPages).map((p) => `[[${p}]]`).join(", ")
    // }
    return "Dynamic meta-site"
}