class Wiki extends HTMLElement {
    constructor() {
        super()
        window.wiki = this
    }

    connectedCallback() {
        this.setAttribute("tabindex", -1)
        this.addEventListener("keyup", this.handleShortcut)

        let dialog = document.createElement("dialog")
        dialog.setAttribute("style", "z-index: 1000;")
        dialog.addEventListener("close", this.open)

        let form = document.createElement("form")
        form.setAttribute("method", "dialog")
        form.setAttribute("style", "margin: 0;")
        dialog.appendChild(form)

        let input = document.createElement("input")
        input.setAttribute("type", "text")
        form.appendChild(input)

        this.appendChild(dialog)
    }

    handleShortcut(event) {
        if (event.altKey && event.key == "o") {
            console.log("open dialog")
            let dialog = this.getElementsByTagName("dialog")[0]
            dialog.setAttribute("open", "")
            let input = dialog.getElementsByTagName("input")[0]
            event.preventDefault()
            input.focus()
        }
    }

    open(event) {
        console.log("opening:", this)
        let input = this.getElementsByTagName("input")[0]
        let path = input.value
        let site = location.origin
        let slug = path
        if (path.indexOf(";") != -1) {
            [site, slug] = path.split(";")
        }
        console.log("opening:", site, slug)
        this.parentElement.loadRemotePage(site, slug)
    }

    get lineup() {
        return this.getElementsByTagName("wiki-lineup")[0]
    }

    get pages() {
        return this.lineup.pages
    }

    get neighborhood() {
        return this.getElementsByTagName("footer")[0].getElementsByTagName("wiki-neighborhood")[0]
    }

    async loadPage(slug) {
        let res = fetch(`/${slug}.json`)
        let page = await this.renderPage(res, slug)
    }

    async loadRemotePage(site, slug) {
        let res = fetch(`http://${site}/${slug}.json`)
        let page = await this.renderPage(res, slug, site)
    }

    async renderPage(res, slug, site) {
        let page = this.lineup.newPage(slug, slug, site)
        page.activate()
        res = await res
        let json = await res.json()
        page.render(json)
        return page
    }

    showNeighborhood() {
        // Should all pages created with newPage be ghosted?
        let page = this.lineup.newPage("Neighborhood")
        page.ghost()
        for (let neighbor of this.neighborhood.neighbors) {
            page.addReference(neighbor, "welcome-visitors", "Welcome Visitors", neighbor)
        }
        page.activate()
    }

    get baseURL() {
        return new URL(window.location.origin + "/index.html")
    }

    get URL() {
        let url = this.baseURL;
        [...this.lineup.pages].forEach((p) => url.searchParams.append("page", p.fullSlug))
        return url
    }

    updateURL() {
        history.pushState({}, "", this.URL.toString())
    }
}
customElements.define("wiki-wiki", Wiki);