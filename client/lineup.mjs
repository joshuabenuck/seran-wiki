class Lineup extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        this.setAttribute("tabindex", -1)
        this.addEventListener("keydown", (ev) => {
            let active = document.querySelector(".active")
            if (!active) {
                active = this.pages[this.pages.length - 1]
            }
            let index = [...this.pages].indexOf(active)
            let max = this.pages.length - 1
            let min = 0
            if (ev.key == "ArrowLeft") {
                if (index > min) {
                    this.pages[index - 1].activate()
                }
            }
            if (ev.key == "ArrowRight") {
                if (index < max) {
                    this.pages[index + 1].activate()
                }
            }
        })
    }

    get pages() {
        return this.getElementsByTagName("wiki-page")
    }

    addPageBefore(page, refPage) {
        this.insertBefore(page, refPage)
        this.parentElement.updateURL()
    }

    newPage(slug, title, site) {
        // TODO: DRY this code with Page.load?
        let page = document.createElement("wiki-page")
        if (site) {
            page.setAttribute("site", site)
        }
        page.setAttribute("slug", slug)
        page.setAttribute("title", title)
        this.appendChild(page)
        return page
    }

    get lastPage() {
        return this.pages[this.pages.length - 1]
    }

    closeAllAfter(page) {
        let index = this.pageIndex(page)
        if (page == -1) {
            console.log("ERROR: Unable to find page to remove;", page)
            return
        }
        while (index < this.pages.length - 1) {
            console.log(this.pages.length, this.pageIndex(page))
            this.pages[this.pages.length - 1].remove()
        }
    }

    closePageByIndex(index) {
        this.pages[index].remove()
    }

    pageIndex(targetPage) {
        let index = 0
        for (let page of this.pages) {
            if (page == targetPage) {
                return index
            }
            index += 1
        }
        return -1
    }

    get wiki() {
        return this.parentElement
    }

    get sites() {
        let sites = new Set()
        for (let page of this.pages) {
            let site = page.site
            if (!site) {
                site = location.origin
            }
            sites.add(site)
        }
        return sites
    }

    URLTo(page) {
        let url = this.wiki.baseURL
        let pageIndex = this.pageIndex(page);
        [...this.wiki.pages].slice(0, pageIndex + 1).forEach((p) => url.searchParams.append("page", p.fullSlug))
        return url
    }
}
customElements.define("wiki-lineup", Lineup);