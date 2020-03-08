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

        let slug = this.getAttribute("page")

        let anchor = document.createElement("a")
        anchor.setAttribute("href", `/index.html?page=${slug}`)
        anchor.appendChild(document.createTextNode(text))
    }

    get page() {
        let parent = this.parentElement
        while(parent) {
            if (parent.nodeType == "WIKI-PAGE") {
                return parent
            }
            parent = parent.parentElement
        }
        return null
    }

    get lineup() {
        let parent = this.parentElement
        while(parent) {
            if (parent.nodeType == "WIKI-LINEUP") {
                return parent
            }
            parent = parent.parentElement
        }
        return null
    }

    get wiki() {
        return this.lineup.wiki()
    }
}
customElements.define("wiki-link", Link)