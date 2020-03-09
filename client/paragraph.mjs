export class Paragraph extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
                display: block;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        let p = document.createElement("p")
        let slot = document.createElement("slot")
        p.appendChild(slot)
        shadow.appendChild(p)

        let site = this.page.getAttribute("site")
        this.innerHTML = renderLinks(this.innerHTML, site)
        if (!this.page.dynamic) {
            this.setAttribute("editable", true)
        }
    }

    get page() {
        return this.parentElement
    }

    render(json) {
        this.textContent = json.text
    }

    bind() {

    }

    // export to toString or serialize?
    export() {
        return {
            type: "paragraph",
            id: "abc123",
            text: this.text
        }
    }
}
registerPlugin("paragraph", Paragraph);