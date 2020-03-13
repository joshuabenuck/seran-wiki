class Reference extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
                display: block;
            }
            img {
                width: 16px;
                height: 16px;
                margin-right: 6px;
                margin-bottom: -3px;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        let p = document.createElement("p")
        // Hack to allow wiki-link to find its page and lineup
        p.light = this
        let link = document.createElement("wiki-link")
        let site = this.getAttribute("site")
        let slug = this.getAttribute("slug")
        let title = this.getAttribute("title")
        let text = this.getAttribute("text")
        let flag = document.createElement("img")
        flag.setAttribute("src", `http://${site}/favicon.png`)
        p.appendChild(flag)
        link.setAttribute("site", site)
        link.setAttribute("slug", slug)
        function asTitle(slug) {
            return slug.replace(/-/g, ' ')
        }
        link.appendChild(document.createTextNode(title))
        p.appendChild(link)
        let desc = document.createElement('span')
        desc.innerHTML = ` - ${renderLinks(text, site)}`
        p.appendChild(desc)
        shadow.appendChild(p)
        let wiki = document.getElementsByTagName("wiki-wiki")[0]
        wiki.neighborhood.add(site)
    }

    render(json) {
        this.setAttribute("site", json.site)
        this.setAttribute("slug", json.slug)
        this.setAttribute("title", json.title)
        this.setAttribute("text", json.text)
    }
}
registerPlugin("reference", Reference);
