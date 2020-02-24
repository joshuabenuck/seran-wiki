export async function sites(_site, system) {
    let sites = []
    for (let site of Object.keys(system.metaSites)) {
        sites.push(
            {
                type: "reference",
                id: "3f96ad3b1c040452",
                site: `${site}`,
                slug: "welcome-visitors",
                title: "Welcome Visitors",
                text: site
            }
        )
    }
    let data = {
        title: "Deno Sites",
        story: sites,
    }
    return data
}