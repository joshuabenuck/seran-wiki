export async function sites(req, site, system) {
    let sites = []
    for (let metaSite of Object.keys(system.metaSites)) {
        sites.push(site.reference(metaSite, "welcome-visitors", "Welcome Visitors", metaSite))
    }
    return site.page("Deno Sites", sites)
}