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
        let link = document.createElement("a")
        let site = this.getAttribute("site")
        let slug = this.getAttribute("slug")
        let title = this.getAttribute("title")
        let text = this.getAttribute("text")
        let flag = document.createElement("img")
        flag.setAttribute("src", `http://${site}/favicon.png`)
        p.appendChild(flag)
        link.setAttribute("href", `javascript:wiki.loadRemotePage("${site}", "${slug}")`)
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
