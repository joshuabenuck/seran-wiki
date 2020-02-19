const { ErrorKind, DenoError, args, stat, open, exit } = Deno;
// TODO: Do we allow meta pages to import common routines?
async function readDir(path) {
    let fileInfo = await stat(path)
    if (!fileInfo.isDirectory()) {
        console.log(`path ${path} is not a directory.`);
        return [];
    }

    return await Deno.readDir(path);
}

export async function sites() {
    let path = `${Deno.dir("home")}/.wiki`
    let files = []
    for (let file of await readDir(path)) {
        if (file.name == "assets" ||
            file.name == "pages" ||
            file.name == "recycle" ||
            file.name == "status") {
            continue;
        }
        files.push(
            {
                type: "reference",
                id: "3f96ad3b1c040452",
                site: `${file.name}:3000`,
                slug: "welcome-visitors",
                title: "Welcome Visitors",
                text: file.name
            }
        )
    }
    let data = {
        title: path,
        story: files,
    }
    console.log("returning data:", data)
    return data
}