export class Auth extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
            }

            span {
                cursor: default;
                user-select: none;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)
        this.icon = document.createElement("span")
        shadow.appendChild(this.icon)
        this.loggedIn = false
        this.update()
        this.addEventListener("click", this.loginOrLogout)
    }

    update() {
        if (this.loggedIn) {
            this.icon.textContent = "\u{1f511}"
            return
        }
        this.icon.textContent = "\u{1f512}"
    }

    loginOrLogout() {
        if (this.loggedIn) {
            this.logout()
        }
        else {
            this.login()
        }
        this.update()
    }

    login() {
        this.loggedIn = true
        this.update()
    }

    logout() {
        this.loggedIn = false
        this.update()
    }
}
customElements.define("wiki-auth", Auth)