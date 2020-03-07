echo; echo we start running full speed
deno --allow-net scrapetest.js start; sleep 2
deno --allow-net scrapetest.js state; sleep 2
deno --allow-net scrapetest.js state; sleep 2
deno --allow-net scrapetest.js state; sleep 2
deno --allow-net scrapetest.js state; sleep 2
deno --allow-net scrapetest.js state; sleep 2

echo; echo we stop status full stop
deno --allow-net scrapetest.js stop;  sleep 2
deno --allow-net scrapetest.js state; sleep 2
deno --allow-net scrapetest.js state; sleep 2
deno --allow-net scrapetest.js state; sleep 2
deno --allow-net scrapetest.js state; sleep 2
deno --allow-net scrapetest.js state; sleep 2

echo; echo we single step for ten steps
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
deno --allow-net scrapetest.js step; sleep 2
