FROM hayd/alpine-deno:0.36.0

EXPOSE 8000

WORKDIR /seran-wiki

# Prefer not to run as root.
USER deno

# Cache the dependencies as a layer (this is re-run only when deps.ts is modified).
# Ideally this will download and compile _all_ external files used in main.ts.
# COPY deps.ts /seran-wiki
# RUN deno fetch deps.ts

# These steps will be re-run upon each file change in your working directory:
ADD . /seran-wiki
# Compile the main seran-wiki so that it doesn't need to be compiled each startup/entry.
# RUN deno fetch main.ts

# These are passed as deno arguments when run with docker:
ENTRYPOINT ["deno", "-c", "tsconfig.json", "--importmap=import_map.json", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "./server/seran.ts", "--allow-disclosure"]