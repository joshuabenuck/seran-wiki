class Page extends HTMLElement {
    connectedCallback() {
        if (this.inited) return
        this.inited = true
        this.addEventListener("click", this.activate)
        let shadow = this.attachShadow({ mode: 'open' })
        let css = `
            :host(.plugin)>.paper {
                box-shadow: inset 0px 0px 40px 0px rgba(0, 220, 0, .5);
            }

            :host(.local)>.paper {
                box-shadow: inset 0px 0px 40px 0px rgba(220, 180, 0, .7);
            }

            :host(.remote)>.paper {
                box-shadow: inset 0px 0px 40px 0px rgba(0, 180, 220, .5);
            }

            :host(.recycler)>.paper {
                box-shadow: inset 0px 0px 40px 0px rgba(220, 0, 0, .5)
            }

            :host(.ghost) {
                opacity: 0.6;
                border-color: #eef2fe;
            }

            .paper {
                padding: 30px;
                overflow-y: auto;
                overflow-x: hidden;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;
                position: absolute;
            }
            .flag {
                margin-right: 6px;
                margin-bottom: -6px;
            }

            :host(.drop-target-left) {
                border-left: 1px solid blue;
            }

            :host(.drop-target-right) {
                border-right: 1px solid blue;
            }
        `
        let style = document.createElement("style")
        style.innerHTML = css
        shadow.appendChild(style)

        this.setAttribute("draggable", true)
        this.addEventListener("dragstart", this.dragStart)
        this.addEventListener("dragenter", this.dragEnter)
        this.addEventListener("dragover", this.dragOver)
        this.addEventListener("dragleave", this.dragLeave)
        this.addEventListener("dragend", this.dragEnd)
        this.addEventListener("drop", this.drop)

        let site = this.getAttribute("site")
        if (site) {
            this.classList.add("remote")
        }

        let title = this.getAttribute("title")
        if (!title) {
            title = "empty"
        }

        // TODO: Style if remote or ghost or local
        let paper = document.createElement("div")
        paper.className = "paper"
        shadow.appendChild(paper)

        this.twins = document.createElement("wiki-twins")
        this.twins.light = this
        paper.appendChild(this.twins)

        // TODO: Put header into its own web component
        // <wiki-header title="" flag="" url=""/>
        let header = document.createElement("div")
        this.h1 = document.createElement("h1")
        this.h1.title = title

        let span = document.createElement("span")

        let prefix = ""
        if (site) {
            // TODO: Descend into madness by detecting http vs https
            prefix = `http://${site}`
        }
        let flagLink = document.createElement("a")
        flagLink.setAttribute("href", `${prefix}/view/${this.slug}`)
        flagLink.setAttribute("target", "")

        let flag = document.createElement("img")
        flag.classList.add("flag")
        flag.setAttribute("src", `${prefix}/favicon.png`)

        flagLink.appendChild(flag)
        span.appendChild(flagLink)
        this.titleText = document.createTextNode(title)
        span.appendChild(this.titleText)
        this.h1.appendChild(span)
        header.appendChild(this.h1)
        paper.appendChild(header)

        let slot = document.createElement("slot")
        paper.appendChild(slot)
    }

    dragStart(event) {
        event.dataTransfer.setData("pageIndex", this.parentElement.pageIndex(this))
    }

    dragEnter(event) {
        event.dataTransfer.dropEffect = "move"
        return false
    }

    dragOver(event) {
        if (event.pageX < this.offsetLeft + (this.offsetWidth / 2)) {
            this.classList.add("drop-target-left")
            this.classList.remove("drop-target-right")
        }
        else {
            this.classList.remove("drop-target-left")
            this.classList.add("drop-target-right")
        }
        event.preventDefault()
    }

    dragLeave(event) {
        this.classList.remove("drop-target-left")
        this.classList.remove("drop-target-right")
    }

    dragEnd(event) {
        if (event.pageY < 0 && this.parentElement.pages.length > 1) {
            let wiki = this.lineup.wiki
            this.remove()
            wiki.updateURL()
        }
    }

    drop(event) {
        this.classList.remove("drag-target")
        let pageIndex = event.dataTransfer.getData("pageIndex")
        let page = this.parentElement.pages[pageIndex]
        if (this.classList.contains("drop-target-left")) {
            this.addPageBefore(page)
        }
        else {
            this.addPageAfter(page)
        }
        this.classList.remove("drop-target-left")
        this.classList.remove("drop-target-right")
    }

    addPageBefore(page) {
        this.lineup.addPageBefore(page, this)
    }

    addPageAfter(page) {
        let pageIndex = this.lineup.pageIndex(this)
        if (this.lineup.pages.length == pageIndex) {
            this.lineup.addPageBefore(page, null)
        }
        else {
            this.lineup.addPageBefore(page, this.lineup.pages[pageIndex + 1])
        }
    }

    disconnectedCallback() { }

    attributeChangedCallback(attrName, oldValue, newValue) {
        if (!this.inited) {
            return;
        }
        if (attrName == "title") {
            this.h1.title = newValue
            this.titleText.textContent = newValue
        }
    }

    static get observedAttributes() {
        return ["title"]
    }

    get title() {
        return this.getAttribute("title")
    }

    set title(t) {
        this.setAttribute("title", t)
    }

    get site() {
        return this.getAttribute("site")
    }

    get slug() {
        return this.getAttribute("slug")
    }

    get lineup() {
        return this.parentElement
    }

    get fullSlug() {
        let site = this.site
        let slug = this.slug
        if (site != undefined && site != location.origin) {
            slug = `${site};${slug}`
        }
        return slug
    }

    get URL() {
        return this.lineup.URLTo(this)
    }

    addParagraph(text) {
        let paragraph = document.createElement("wiki-paragraph")
        paragraph.textContent = text
        this.appendChild(paragraph)
    }

    addReference(site, slug, title, text) {
        let ref = document.createElement("wiki-reference")
        ref.setAttribute("site", site)
        ref.setAttribute("slug", slug)
        ref.setAttribute("title", title)
        ref.setAttribute("text", text)
        // or...
        // ref.render({ site, slug, title, text})
        this.appendChild(ref)
    }

    addProcessStep(legend, href) {
        let processStep = document.createElement("wiki-process-step")
        processStep.json = { legend, href }
        this.appendChild(processStep)
    }

    activate() {
        if (this.classList.contains("active")) {
            return;
        }
        this.scrollIntoView()
        document.querySelectorAll(".active").forEach((a) => a.classList.remove("active"))
        this.classList.add("active")
        this.lineup.focus()
    }

    ghost() {
        this.classList.add("ghost")
    }

    get items() {
        return [...this.childNodes].filter((e) => e.nodeName.indexOf("WIKI-") == 0)
    }

    async followCollabLink(site, slug) {
        let wiki = document.querySelector("wiki-wiki")
        let sites = new Set([site, ...wiki.neighborhood.neighbors])
        for (let site of sites) {
            let url = `/${slug}.json`
            if (site) {
                url = `http://${site}` + url
            }
            try {
                let json = await fetch(url).then((r) => r.json()).then((j) => this.json = j)
                if (site) {
                    this.setAttribute("site", site)
                }
                return json
            }
            catch (e) {
                console.log("collab link", site, slug, e)
            }
        }
    }

    async load(site, slug, fallbacks) {
        this.setAttribute("slug", slug)
        // Title is slug until json is loaded
        this.setAttribute("title", slug)
        // Synchronously setup base page attrs
        // Let caller decide whether to wait for rendering
        return await this.followCollabLink(site, slug, fallbacks)
    }

    async loadPageAfter(site, slug, fallbacks) {
        let page = new Page()
        await page.load(site, slug, fallbacks)
        this.addPageAfter(page)
    }

    set json(json) {
        if (json.dynamic) {
            this.setAttribute("dynamic", true)
        }
        this.title = json.title
        for (let item of json.story) {
            let plugin = window.plugins[item.type]
            if (plugin) {
                let element = new plugin()
                element.json = item
                this.appendChild(element)
            }
            else {
                this.addParagraph(`Unknown type: ${item.type}`)
            }
        }
        this.journal = []
        if (json.journal) {
            this.journal = json.journal
            let wiki = document.querySelector("wiki-wiki")
            this.journal.filter((i) => i.type == "fork" && i.site).forEach((i) => wiki.neighborhood.add(i.site))
        }
    }

    get json() {
        let content = {
            title: this.title,
            story: this.items.map((i) => i.json),
            journal: this.journal
        }
        return json
    }
}
customElements.define("wiki-page", Page);