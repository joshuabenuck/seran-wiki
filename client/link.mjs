const REPLACE = 0
const APPEND = 1
const INSERT = 2

export class Link extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)

        this.anchor = document.createElement("a")
        let href = this.getAttribute("href")
        // Convert absolute links to sites in the neighborhood to remote wiki links
        if (href) {
            console.log("url", href)
            let url = new URL(href)
            let origin = url.origin.replace("http://", "")
            // This is going to need some more work
            if (this.wiki.neighborhood.has(origin) && url.pathname.match(/^\/view\/[a-z0-9-]+$/)) {
                this.setAttribute("site", origin)
                this.setAttribute("slug", url.pathname.replace("/view/", ""))
                this.removeAttribute("href")
                this.removeAttribute("target")
            }
            else {
                this.anchor.setAttribute("href", href)
                this.anchor.setAttribute("target", this.getAttribute("target"))
            }
        }

        this.mode = REPLACE
        this.addEventListener("mousemove", this._updateMode)
        this.addEventListener("click", this.click)

        let slot = document.createElement("slot")
        this.anchor.appendChild(slot)
        shadow.appendChild(this.anchor)
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
        if (!this.inited) {
            return;
        }
        if (attrName == "mode") {
            this.modeToURL(newValue)
        }
    }

    static get observedAttributes() {
        return ["mode"]
    }

    async click(event) {
        if (this.getAttribute("href")) {
            return
        }
        if (location.href != this.anchor.href) {
            console.log("URLs differ, pushing state")
            window.history.pushState({}, "", this.anchor.href)
        }
        let page = null
        if (this.mode == REPLACE) {
            this.lineup.closeAllAfter(this.page)
            page = this.lineup.lastPage
        }
        if (this.mode == APPEND) {
            page = this.lineup.lastPage
        }
        if (this.mode == INSERT) {
            page = this.page
        }
        page.loadPageAfter(this.getAttribute("site"), this.getAttribute("slug"))
        event.preventDefault()
    }

    set mode(mode) {
        this.setAttribute("mode", mode)
    }

    get mode() {
        return this.getAttribute("mode")
    }

    modeToURL(mode) {
        if (mode == REPLACE) {
            this._updateAnchor(this.page.URL)
            return
        }
        if (mode == APPEND) {
            this._updateAnchor(this.wiki.URL)
            return
        }
        if (mode == INSERT) {
            this._updateAnchor(this.page.URL, this.page.remainderURL)
            return
        }
        console.log(`WARN: Unsupported mode ${this.mode}`)
        return null;
    }

    _updateAnchor(url, remainder) {
        if (this.getAttribute("href")) {
            return
        }
        let site = this.getAttribute("site")
        let slug = this.getAttribute("slug")
        if (site) {
            slug = `${site};${slug}`
        }
        url.searchParams.append("page", slug)
        this.anchor.setAttribute("href", url.toString())
    }

    _updateMode(event) {
        if (event.shiftKey) {
            this.mode = APPEND
            return
        }
        if (event.ctrlKey) {
            this.mode = INSERT
            return
        }
        this.mode = REPLACE
    }

    get page() {
        return this._findParent("WIKI-PAGE")
    }

    get lineup() {
        return this._findParent("WIKI-LINEUP")
    }

    _findParent(name) {
        let parent = this.parentElement
        while(parent) {
            if (parent.nodeName == name) {
                return parent
            }
            if (!parent.parentElement && parent.light) {
                parent = parent.light
                continue
            }
            parent = parent.parentElement
        }
        console.log(`WARN: Unable to find ${name} for`, this)
        return null
    }

    get wiki() {
        return this.lineup.wiki
    }
}
customElements.define("wiki-link", Link)