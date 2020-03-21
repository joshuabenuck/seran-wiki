echo; echo inquire as to intial state
deno --allow-net scrapetest.js state; sleep 1

echo; echo start running full speed
deno --allow-net scrapetest.js start; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1

echo; echo stop then status five times
deno --allow-net scrapetest.js stop;  sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1

echo; echo run again maybe to completion
deno --allow-net scrapetest.js start; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1
deno --allow-net scrapetest.js state; sleep 1

echo; echo start then stop five times
deno --allow-net scrapetest.js start; sleep 1
deno --allow-net scrapetest.js stop; sleep 1
deno --allow-net scrapetest.js start; sleep 1
deno --allow-net scrapetest.js stop; sleep 1
deno --allow-net scrapetest.js start; sleep 1
deno --allow-net scrapetest.js stop; sleep 1
deno --allow-net scrapetest.js start; sleep 1
deno --allow-net scrapetest.js stop; sleep 1
deno --allow-net scrapetest.js start; sleep 1
deno --allow-net scrapetest.js stop; sleep 1

echo; echo single step for ten steps
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
deno --allow-net scrapetest.js step; sleep 1
