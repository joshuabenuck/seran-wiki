export class Twins extends HTMLElement {
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
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        this.p = document.createElement("p")
        this.p.light = this
        shadow.appendChild(this.p)

        // TODO: Rerun / update twins when the neighborhood changes
        this.displayTwins()
    }

    displayTwins() {
        while(this.p.firstChild) {
            this.p.firstChild.remove()
        }
        for (let twin of this.neighborhood.copiesOf(this.page.slug)) {
            if (this.page.site && this.page.site == twin.site) continue
            let img = document.createElement("img")
            img.setAttribute("src", `http://${twin.site}/favicon.png`)
            img.setAttribute("title", twin.site)
            img.addEventListener("click", () => this.wiki.loadRemotePage(twin.site, this.page.slug))
            this.p.appendChild(img)
        }
    }

    get wiki() {
        return document.querySelector("wiki-wiki")
    }

    get page() {
        return this.light
    }

    get neighborhood() {
        return document.querySelector("wiki-neighborhood")
    }
}

customElements.define("wiki-twins", Twins)
