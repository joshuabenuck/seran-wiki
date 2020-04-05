class Neighboorhood extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        this.neighbors = new Set()
        this.siteMaps = {}
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
                display: block;
                overflow: hidden;
            }

            img {
                padding-left: 2px;
                padding-bottom: 2px;
                width: 16px;
                height: 16px;
                display: inline-block;
                float: right;
            }

            a {
                display: inline-block;
                float: right;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        let link = document.createElement("a")
        link.setAttribute("href", "javascript:wiki.showNeighborhood()")
        link.appendChild(document.createTextNode(">>"))
        shadow.appendChild(link)
        this.add(location.origin.replace("http://", ""))
    }

    async add(site) {
        if (this.neighbors.has(site)) return
        await this.fetchSiteMap(site)
        this.neighbors.add(site)

        // No need to show the local site in the neighborhood
        // (Still need it in the neighborhood for twin computation)
        if (site == location.origin.replace("http://", "")) return
        let flag = document.createElement("img")
        flag.setAttribute("src", `http://${site}/favicon.png`)
        flag.setAttribute("title", site)
        this.shadowRoot.appendChild(flag)
        for (let page of document.querySelector("wiki-wiki").lineup.pages) {
            page.twins.displayTwins()
        }
    }

    async fetchSiteMap(site) {
        // TODO: Spinning animation / tilting
        // site map is empty until loaded
        this.siteMaps[site] = []
        let resp = await fetch(`http://${site}/system/sitemap.json`)
        let json = await resp.json()
        this.siteMaps[site] = json
    }

    has(site) {
        for (let neighbor of this.neighbors) {
            if (site == neighbor) {
                return true
            }
        }
        return false
    }

    copiesOf(slug) {
        let copiesOf = []
        for (let neighbor of this.neighbors) {
            let pages = this.siteMaps[neighbor]
            if (!pages) continue
            for (let page of pages) {
                if (page.slug == slug) {
                    copiesOf.push(Object.assign({site: neighbor}, page))
                }
            }
        }
        return copiesOf
    }
}
customElements.define("wiki-neighborhood", Neighboorhood)