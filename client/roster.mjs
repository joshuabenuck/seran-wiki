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
                padding-right: 4px;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        console.log(this, this.children, this.childNodes)
        if (this.childNodes.length > 0) {
            let rosterContent = this.childNodes[0].nodeValue
            for (let line of rosterContent.split("\n")) {
                if (line.includes('.')) {
                    let flag = document.createElement("img")
                    flag.setAttribute("src", `http://${line}/favicon.png`)
                    flag.setAttribute("title", line)
                    shadow.appendChild(flag)
                } else {
                    let txt = document.createTextNode(line)
                    if (line.match(/\S/)) {
                        shadow.appendChild(txt)
                        let br = document.createElement('br')
                        shadow.appendChild(br)
                    }
                }

            }
        }
    }

    set json(json) {
        console.log("Rendering roster", json)
        let text = document.createTextNode(json.text)
        this.appendChild(text)
    }

    get json() {
        return {
            text: this.textContent
        }
    }
}
registerPlugin("roster", Roster);