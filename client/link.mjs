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
        this.replaceMode()
        this.addEventListener("mousemove", this._updateMode)
        this.addEventListener("click", this.click)

        let slot = document.createElement("slot")
        this.anchor.appendChild(slot)
        shadow.appendChild(this.anchor)
    }

    click(event) {
        window.location.href = this.anchor.href
        event.preventDefault()
    }

    appendMode() {
        this._updateAnchor(this.wiki.URL)
    }

    replaceMode() {
        this._updateAnchor(this.page.URL)
    }

    _updateAnchor(url) {
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
            this.appendMode()
            return
        }
        this.replaceMode()
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