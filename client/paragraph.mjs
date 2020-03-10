export class Paragraph extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
                display: block;
            }

            textarea {
                width: 100%;
                font-size: inherit;
                min-height: 150px;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        this.p = document.createElement("p")
        let slot = document.createElement("slot")
        this.p.appendChild(slot)
        shadow.appendChild(this.p)

        let site = this.page.getAttribute("site")
        this.innerHTML = renderLinks(this.innerHTML, site)
        if (!this.page.dynamic) {
            this.addEventListener("dblclick", this.edit)
            this.addEventListener("click", (e) => e.stopPropagation())
            this.editor = document.createElement("textarea")
            this.editor.style.display = "none"
            shadow.appendChild(this.editor)
            this.setAttribute("editable", true)
        }
    }

    edit(event) {
        // already editing
        if (this.editor.style.display == "") {
            return
        }
        this.p.style.display = "none"
        this.editor.style.display = ""
        this.editor.value = this.textContent
        console.log("edit", event, this.editor)
        this.editor.focus()
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