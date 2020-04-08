export class PageFold extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
                display: block;
                height: 10px;
                border-top: 2px solid lightgray;
                margin-top: 24px;
                text-align: center;
                position: relative;
                clear: both;
            }

            span {
                position: relative;
                top: -.8em;
                background: white;
                display: inline-block; 
                color: gray;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        let span = document.createElement("span")
        span.light = this
        shadow.appendChild(span)
        let slot = document.createElement("slot")
        span.appendChild(slot)
    }

    set json(json) {
        // Avoid use of innerHTML by using unicode escape for non-breaking space
        this.textContent = `\u00a0 ${json.text} \u00a0`
    }
}
registerPlugin("pagefold", PageFold)