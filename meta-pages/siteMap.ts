function siteMap() {
    return [
        { slug: '-', title: '/', date: new Date(), synopsis: 'Root' }
    ]
}

window["metaPages"]["/system/sitemap.json"] = siteMap
