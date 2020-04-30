#!/bin/sh

deno -c tsconfig.json --importmap=import_map.json --unstable --allow-net --allow-read --allow-write --allow-env --allow-run ./server/seran.ts $*
