let css = `
    body {
        background: #eeeeee url("/crosses.png");
        overflow: hidden;
        padding: 0;
        margin: 0;
        font-family: "Helvetica Neue", Verdana, helvetica, Arial, Sans;
        line-height: 1.3;
        color: #333333;
    }

    wiki-wiki {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    footer {
        border-top: 1px solid #3d3c43;
        box-shadow: inset 0px 0px 7px rgba(0, 0, 0, 0.8);
        background: #eeeeee url("noise.png");
        flex-basis: 20px;
        padding: 10px;
        font-size: 80%;
        color: #ccdcd2;
    }

    wiki-neighborhood:hover {
        border-top: 1px solid #3d3c43;
        box-shadow: inset 0px 0px 7px rgba(0, 0, 0, 0.8);
        background: #eeeeee url("noise.png");
        flex-basis: 20px;
        padding: 10px;
        font-size: 80%;
        color: #ccdcd2;
        max-height: 500px;
        position: absolute;
        right: 10;
        bottom: 10;
    }

    wiki-neighborhood {
        width: 200px;
        max-height: 16px;
        float: right;
    }

    wiki-lineup {
        flex: 1;
        display: flex;
        flex-direction: row;
        overflow: scroll;
        scrollbar-width: none;
    }

    wiki-lineup::-webkit-scrollbar {
        display: none;
    }

    wiki-page {
        flex: 0 0 480px;
        background-color: white;
        margin: 8px;
        box-shadow: 2px 1px 4px rgba(0, 0, 0, 0.2);
        position: relative;
    }

    wiki-page.active {
        box-shadow: 2px 1px 24px rgba(0, 0, 0, 0.4);
        z-index: 10;
    }
`

let style = document.createElement("style")
style.innerHTML = css
document.querySelector("head").appendChild(style)

function asSlug(name) {
    return name.replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase()
}

function renderLinks(html, site) {
    html = html.replace(/\[\[(.*?)\]\]/g, (_full, match) => {
        if (site) {
            // return `<a href='javascript:wiki.loadRemotePage("${site}", "${asSlug(match)}");wiki.updateURL()'>${match}</a>`
            return `<wiki-link site="${site}" slug="${asSlug(match)}">${match}</wiki-link>`
        }
        // return `<a href='javascript:wiki.loadPage("${asSlug(match)}");wiki.updateURL()'>${match}</a>`
        return `<wiki-link slug="${asSlug(match)}">${match}</wiki-link>`
    })
    return html.replace(/\[([^+]*)\]/g, (_full, match) => {
        let url = match.substring(0, match.indexOf(" "))
        try {
            new URL(url)
        } catch(e) {
            return _full
        }
        let text = match.substring(match.indexOf(" "))
        return `<wiki-link href='${url}' target="_blank">${text}</wiki-link>`
    })
}
window.renderLinks = renderLinks

window.plugins = {}
function registerPlugin(name, cls) {
    window.plugins[name] = cls
    customElements.define(`wiki-${name}`, cls);
}
window.registerPlugin = registerPlugin

async function load(url) {
    let script = document.createElement("script")
    script.setAttribute("type", "module")
    script.setAttribute("src", url)
    // PromiseUtil.promisify
    let promise = new Promise((res, rej) => {
        script.onload = () => {
            res()
        }
    })
    document.querySelector("head").appendChild(script)
    return promise
}

async function resources(list) {
    let ret = Promise.resolve()
    for(let script of list) {
        ret = await load(new URL(script, import.meta.url).toString())
    }
    return ret
}

resources([
    //<!-- Plugins -->
    "/client/code.mjs",
    "/client/pagefold.mjs",
    "/client/paragraph.mjs",
    "/client/reference.mjs",
    "/client/roster.mjs",

    //<!-- Wiki APIs / Custom Elements -->
    "/client/auth.mjs",
    "/client/neighborhood.mjs",
    "/client/link.mjs",
    "/client/twins.mjs",
    "/client/page.mjs",
    "/client/lineup.mjs",
    "/client/wiki.mjs"
]).then(() => {
    let wiki = document.createElement("wiki-wiki")
    let lineup = document.createElement("wiki-lineup")
    let footer = document.createElement("footer")
    let auth = document.createElement("wiki-auth")
    let neighborhood = document.createElement("wiki-neighborhood")

    wiki.appendChild(lineup)
    wiki.appendChild(footer)
    footer.appendChild(auth)
    footer.appendChild(neighborhood)

    document.querySelector("body").appendChild(wiki)
    document.addEventListener("readystatechange", (e) => {
        if (event.target.readyState != "complete") {
            return
        }
        let wiki = document.querySelector("wiki-wiki")
        async function loadPages() {
            if (document.URL.indexOf("?") == -1) {
                console.log("loading default page")
                wiki.loadPage("welcome-visitors")
            }
            for (let [name, value] of new URL(document.URL).searchParams.entries()) {
                if (name != "page") {
                    continue;
                }
                if (value.indexOf(";") != -1) {
                    let [site, slug] = value.split(";")
                    await wiki.loadRemotePage(site, slug)
                    continue;
                }
                await wiki.loadPage(value)
            }
        }
        loadPages()
        window.onpopstate = (event) => {
            console.log("pop!", event, window.location, window.URL);
            [...wiki.lineup.pages].forEach((p) => p.remove())
            loadPages()
        }
    })
})
