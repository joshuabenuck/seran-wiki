class ProcessStep extends HTMLElement {
    async connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
                display: block;
                background-color: #eee;
                padding: 5px;
                text-align: center
            }
            button {
                margin: 10px;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)

        let p = document.createElement("p")
        let slot = document.createElement("slot")
        let legend = document.createElement("div")
        legend.appendChild(slot)
        p.appendChild(legend)

        this.button = document.createElement("button")
        // TODO: Read url from properties
        this.remoteState = await fetch("/button?action=state").then((r) => r.json())
        this.state = this.remoteState.running ? "stop" : "start"
        let site = this.parentElement.getAttribute("site")
        this.button.addEventListener("click", (_e) => this.click(this.getAttribute("href"), site))
        p.appendChild(this.button)

        this.statusElement = document.createElement("div")
        this.statusElement.appendChild(document.createTextNode(""))
        p.append(this.statusElement)
        this.status = this.remoteState.status
        shadow.appendChild(p)
    }

    render(json) {
        this.setAttribute("href", json.href)
        this.appendChild(document.createTextNode(json.legend))
    }

    get state() {
        return this.button.textContent
    }

    set state(s) {
        while (this.button.firstChild) {
            this.button.removeChild(this.button.firstChild)
        }
        this.button.appendChild(document.createTextNode(s))
    }

    get status() {
        return this.getAttibute("status")
    }

    set status(s) {
        this.setAttribute("status", s)
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
        if (attrName == "status") {
            while (this.statusElement.firstChild) {
                this.statusElement.removeChild(this.statusElement.firstChild)
            }
            this.statusElement.appendChild(document.createTextNode(newValue))
        }
    }

    static get observedAttributes() {
        return ["status"]
    }

    async click(href, site) {
        console.log(href)
        // TODO: Future expansion possibility
        if (site && href.indexOf("http:") != -1) {
            href = `http://${site}/${href}`
        }
        let action = "state"
        if (this.state == "start") {
            action = "start"
        }
        this.button.disabled = true
        this.state = "waiting"
        let response = await fetch(`${href}?action=${action}`)
        let status = await response.text()
        this.button.disabled = false
        this.state = "step"
        this.status = status
        console.log(this, status)
    }
}
registerPlugin("process-step", ProcessStep)