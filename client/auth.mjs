export class Auth extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        let shadow = this.attachShadow({ mode: "open" })
        let css = `
            :host {
            }

            dialog {
                position: absolute;
                left: 0;
                bottom: 30;
                margin: 0;
            }

            span {
                cursor: default;
                user-select: none;
                display: inline-block;
            }

            .failed {
                transform: rotate(15deg);
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

        this.dialog = document.createElement("dialog")
        this.dialog.setAttribute("style", "z-index: 1000;")
        this.dialog.addEventListener("close", () => {
            let input = this.dialog.querySelector("input")
            let password = input.value
            input.value = ""
            this.login(password)
        })
        this.dialog.addEventListener("focusout", () => this.dialog.removeAttribute("open"))

        let form = document.createElement("form")
        form.setAttribute("method", "dialog")
        form.setAttribute("style", "margin: 0;")
        this.dialog.appendChild(form)

        let prompt = document.createElement("div")
        prompt.textContent = "Enter password: "
        form.appendChild(prompt)

        let input = document.createElement("input")
        input.setAttribute("type", "password")
        form.appendChild(input)

        shadow.appendChild(this.dialog)
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
            this.showLoginDialog()
        }
    }

    showLoginDialog() {
        this.dialog.setAttribute("open", "")
        this.dialog.querySelector("input").focus()
    }

    login(password) {
        this.icon.classList.remove("failed")
        fetch("/login", {headers:{Authorization:"Basic " + btoa(password)}}).then((res) => {
            if (res.status != 200) {
                console.log("Unable to login", res)
                this.icon.classList.add("failed")
                return
            }
            this.loggedIn = true
            location.reload()
        })
    }

    logout() {
        fetch("/logout").then((res) => {
            this.loggedIn = false
            location.reload()
        })
    }
}
customElements.define("wiki-auth", Auth)