export class Code extends HTMLElement {
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
        this.pre = document.createElement("pre")
        this.pre.light = this
        shadow.appendChild(this.pre)

        let slot = document.createElement("slot")
        this.pre.appendChild(slot)
    }

    set json(json) {
        this.textContent = json.text
    }
}

registerPlugin("code", Code)