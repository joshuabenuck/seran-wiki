class Neighboorhood extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        this.neighbors = new Set()
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
        let flag = document.createElement("img")
        flag.setAttribute("src", `http://${site}/favicon.png`)
        flag.setAttribute("title", site)
        this.shadowRoot.appendChild(flag)
        this.neighbors.add(site)
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