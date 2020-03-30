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
        for (let neighbor of this.neighborhood.neighbors) {
            for (let page of this.neighborhood.siteMaps[neighbor]) {
                if (page.slug == this.page.slug) {
                    if (this.page.site && this.page.site == neighbor) continue
                    let img = document.createElement("img")
                    img.setAttribute("src", `http://${neighbor}/favicon.png`)
                    img.setAttribute("title", neighbor)
                    img.addEventListener("click", () => this.wiki.loadRemotePage(neighbor, page.slug))
                    this.p.appendChild(img)
                }
            }
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

registerPlugin("twins", Twins)
