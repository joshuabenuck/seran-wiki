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
        this.add("fed.wiki.org")
    }

    add(site) {
        if (this.neighbors.has(site)) return
        this.fetchSiteMap(site)
        this.neighbors.add(site)

        // No need to show the local site in the neighborhood
        // (Still need it in the neighborhood for twin computation)
        if (site == location.origin.replace("http://", "")) return
        let flag = document.createElement("img")
        flag.setAttribute("src", `http://${site}/favicon.png`)
        flag.setAttribute("title", site)
        this.shadowRoot.appendChild(flag)
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
}
customElements.define("wiki-neighborhood", Neighboorhood)