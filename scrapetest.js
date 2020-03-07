let t0 = Date.now()
let r = await fetch(`http://scrape.localtest.me:8000/button?action=${Deno.args[0]||'state'}`).then(r=>r.json())
console.log(r,Date.now()-t0, 'ms')