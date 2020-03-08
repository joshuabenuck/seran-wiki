let t0 = Date.now()
let action = Deno.args[0]||'state'
let url = `http://scrape.localtest.me:8000/button?action=${action}`
console.log(action, '⇒', await fetch(url).then(r=>r.json()), Date.now()-t0, 'ms')