export async function sites() {
    let sites = []
    for (let site of Object.keys(window["metaSites"])) {
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