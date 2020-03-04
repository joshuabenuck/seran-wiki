export class Roster extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
                display: block;
                background-color: #eee;
                padding: 15px;
            }
            img {
                width: 16px;
                height: 16px;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        let p = document.createElement("p")
        console.log(this, this.children, this.childNodes)
        if (this.childNodes.length > 0) {
            let rosterContent = this.childNodes[0].nodeValue
            for (let line of rosterContent.split("\n")) {
                let flag = document.createElement("img")
                flag.setAttribute("src", `http://${line}/favicon.png`)
                flag.setAttribute("title", line)
                p.appendChild(flag)
            }
        }
        shadow.appendChild(p)
    }

    render(json) {
        console.log("Rendering roster", json)
        let text = document.createTextNode(json.text)
        this.appendChild(text)
    }
}
registerPlugin("roster", Roster);