class Wiki extends HTMLElement {
    constructor() {
        super()
        window.wiki = this
        this.pluginsLoadedFor = new Set()
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
            let dialog = this.querySelector("dialog")
            dialog.setAttribute("open", "")
            let input = dialog.querySelector("input")
            event.preventDefault()
            input.focus()
        }
    }

    open(event) {
        console.log("opening:", this)
        let input = this.querySelector("input")
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
        return this.querySelector("wiki-lineup")
    }

    get pages() {
        return this.lineup.pages
    }

    get neighborhood() {
        return this.querySelector("wiki-neighborhood")
    }

    async loadPlugins(origin) {
        if (!origin) {
            origin = location.origin
        }
        else {
            origin = "http://" + origin
        }
        if (!this.pluginsLoadedFor.has(origin)) {
            this.pluginsLoadedFor.add(origin)
            try {
                let content = await fetch(`${origin}/system/plugins.json`)
                let plugins = await content.json()
                for (let plugin of plugins) {
                    console.log("Loading plugin:", plugin)
                    let module = await import(plugin)
                }
            }
            catch (e) {
                console.log("Unable to load plugins for:", origin, e)
            }
        }
    }

    async loadPage(slug) {
        return this.loadRemotePage(undefined, slug)
    }

    async loadRemotePage(site, slug) {
        await this.loadPlugins(site)
        let page = document.createElement("wiki-page")
        await page.load(site, slug)
        this.lineup.appendChild(page)
        page.activate()
    }

    showNeighborhood() {
        // Should all pages created with newPage be ghosted?
        let page = this.lineup.newPage("neighborhood", "Neighborhood")
        page.ghost()
        for (let neighbor of this.neighborhood.neighbors) {
            page.addReference(neighbor, "welcome-visitors", "Welcome Visitors", neighbor)
        }
        page.activate()
    }

    get origin() {
        return window.location.origin.replace("http://", "")
    }

    get baseURL() {
        return new URL(`http://${this.origin}/index.html`)
    }

    get URL() {
        let url = this.baseURL;
        [...this.lineup.pages].forEach((p) => url.searchParams.append("page", p.fullSlug))
        return url
    }

    updateURL() {
        history.pushState({}, "", this.URL.toString())
    }

    get authenticated() {
        return this.querySelector("wiki-auth").loggedIn
    }
}
customElements.define("wiki-wiki", Wiki);