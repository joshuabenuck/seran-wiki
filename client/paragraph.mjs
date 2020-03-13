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
        this.p.light = this
        let slot = document.createElement("slot")
        this.renderLinks()
        shadow.appendChild(this.p)

        if (this.page.getAttribute("dynamic") != "true") {
            this.addEventListener("dblclick", this.edit)
            this.addEventListener("click", (e) => e.stopPropagation())
            this.editor = document.createElement("textarea")
            this.editor.style.display = "none"
            this.editor.addEventListener("keydown", (e) => this.keyhandler(e))
            shadow.appendChild(this.editor)
            this.setAttribute("editable", true)
        }
    }

    renderLinks() {
        let site = this.page.getAttribute("site")
        this.p.innerHTML = renderLinks(this.textContent, site)
    }

    showEditor() {
        this.p.style.display = "none"
        this.editor.style.display = ""
        this.editor.value = this.textContent
    }

    hideEditor() {
        this.p.style.display = ""
        this.editor.style.display = "none"
        this.textContent = this.editor.value
        this.renderLinks()
    }

    keyhandler(event) {
        if (event.key == "Escape" || (event.ctrlKey && event.key == "s")) {
            this.hideEditor()
            event.preventDefault()
        }
        else if (event.key == "Enter") {
            let prefix = this.editor.value.substring(0, this.editor.selectionStart)
            let suffix = this.editor.value.substring(this.editor.selectionEnd)
            // Remove empty editor
            if (prefix == suffix && suffix == "") {
                this.remove()
                event.preventDefault()
                return
            }
            // Insert new editor before
            if (prefix == "") {
                this.editor.value = suffix
                this.hideEditor()
                let para = document.createElement("wiki-paragraph")
                para.textContent = prefix
                this.insertAdjacentElement("beforebegin", para)
                para.showEditor()
                para.editor.setSelectionRange(0, 0)
                para.editor.focus()
                event.preventDefault()
                return
            }
            // Insert new editor after
            this.editor.value = prefix
            this.hideEditor()
            let para = document.createElement("wiki-paragraph")
            para.textContent = suffix
            this.insertAdjacentElement("afterend", para)
            para.showEditor()
            para.editor.setSelectionRange(0, 0)
            para.editor.focus()
            event.preventDefault()
        }
        else if (event.key == "Backspace") {
            let prefix = this.editor.value.substring(0, this.editor.selectionStart)
            if (prefix == "") {
                let suffix = this.editor.value.substring(this.editor.selectionEnd)
                let prev = this.previousSibling
                let index = prev.textContent.length
                prev.textContent += suffix
                prev.showEditor()
                prev.editor.setSelectionRange(index, index)
                prev.editor.focus()
                this.remove()
                event.preventDefault()
            }
        }
    }

    edit(event) {
        // already editing
        if (this.editor.style.display == "") {
            return
        }
        this.showEditor()
        this.editor.setSelectionRange(this.editor.value.length, this.editor.value.length)
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