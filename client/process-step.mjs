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
        let href = this.getAttribute("href")
        let site = this.parentElement.getAttribute("site")
        // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/shiftKey
        this.button.addEventListener("click", (e) => this.click(href, site, e.shiftKey))
        p.appendChild(this.button)
        let remoteState = {}
        try {
            let result = await fetch(`${href}?action=state`)
            if (result.status == 404) {
                throw new Error(`Missing route: ${href}`)
            }
            remoteState = await result.json()
            console.log(remoteState)
            this.state = remoteState.running ? "stop" : "start"
        } catch (e) {
            console.log(e)
            this.state = "error"
            this.button.disabled = true
            remoteState.status = e
        }

        this.statusElement = document.createElement("div")
        this.statusElement.appendChild(document.createTextNode(""))
        p.append(this.statusElement)
        this.status = remoteState.status
        shadow.appendChild(p)
    }

    get json() {
        return {
            href: this.getAttribute("href"),
            text: this.textContent
        }
    }

    set json(json) {
        this.setAttribute("href", json.href)
        this.appendChild(document.createTextNode(json.text))
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

    async click(href, site, shift) {
        console.log(href)
        // TODO: Future expansion possibility
        if (site && href.indexOf("http:") != -1) {
            href = `http://${site}/${href}`
        }
        let action = "state"
        if (this.state == "start") {
            action = shift ? "step" : "start"
        }
        if (this.state == "stop") {
            action = "stop"
        }
        this.button.disabled = true
        this.state = "waiting"
        let response = await fetch(`${href}?action=${action}`).then(res=>res.json())
        this.button.disabled = false
        this.state = response.running ? 'stop' : 'start'
        this.status = response.status
        console.log(this, response)
    }
}
registerPlugin("process-step", ProcessStep)
