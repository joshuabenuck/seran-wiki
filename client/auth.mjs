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

    _cookie(data) {
        if (!data) {
            return {}
        }
        return data.split(';').map(p => p.split('='))
            .reduce((obj, p) => {
                obj[decodeURIComponent(p[0].trim())] = decodeURIComponent(p[1].trim());
                return obj;
            }, {});
    }

    update() {
        this.cookie = this._cookie(document.cookie)
        this.loggedIn = this.cookie["wiki-session"] ? true : false;
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
        fetch("/login").then((res) => {
            this.loggedIn = true
            this.update()
        })
    }

    logout() {
        fetch("/logout").then((res) => {
            this.loggedIn = false
            this.update()
        })
    }
}
customElements.define("wiki-auth", Auth)