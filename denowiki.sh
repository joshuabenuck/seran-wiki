#!/bin/sh

deno -c tsconfig.json --importmap=import_map.json --allow-net --allow-read --allow-write --allow-env index.ts $*
