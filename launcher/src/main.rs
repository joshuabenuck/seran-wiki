use anyhow::Result;
use clap::{App, Arg, SubCommand};
use dirs::home_dir;
use git2;
use log::debug;
use std::env;
use std::fs;
use std::io::copy;
use std::iter::Iterator;
#[cfg(target_family = "unix")]
#[cfg(feature = "rust-perms")]
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::process::Command;
use tokio::runtime::Runtime;
use url::Url;

// Approaches explored:
// * Using PermisssionsExt to change deno exe permissions
//   vs shelling out to chmod
// * Rewriting import paths in import_map.json
//   vs using git to download a copy of seran-wiki
//   vs pulling down a zip from a releases folder

// DENO_DIR conflict with system installed version?

// install script
// deno
trait CachedFile {
    fn name();
    fn path();
    fn download();
    fn contents();
    fn exists();
    fn run();
}

async fn download_binary(url: &Url, dest_file: &PathBuf) -> Result<()> {
    println!("Downloading: {}", url);
    let resp = reqwest::get(url.as_str())
        .await
        .expect("Unable to retrieve image from url");
    assert!(resp.status().is_success());
    let bytes = resp.bytes().await?;
    copy(&mut bytes.as_ref(), &mut fs::File::create(dest_file)?)?;
    Ok(())
}

fn unzip(zip_file: &PathBuf, dest_dir: &PathBuf) -> Result<PathBuf> {
    // Zip extration taken from example in zip crate.
    let file = fs::File::open(&zip_file).unwrap();

    let mut archive = zip::ZipArchive::new(file).unwrap();
    let root = archive.by_index(0)?.sanitized_name();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).unwrap();
        let outpath = dest_dir.join(file.sanitized_name());

        if (&*file.name()).ends_with('/') {
            if outpath.exists() {
                println!("Skipping extraction.");
                break;
            }
            debug!(
                "File {} extracted to \"{}\"",
                i,
                outpath.as_path().display()
            );
            fs::create_dir_all(&outpath).unwrap();
        } else {
            debug!(
                "File {} extracted to \"{}\" ({} bytes)",
                i,
                outpath.as_path().display(),
                file.size()
            );
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(&p).unwrap();
                }
            }
            let mut outfile = fs::File::create(&outpath).unwrap();
            copy(&mut file, &mut outfile).unwrap();
        }
    }
    Ok(root)
}

struct Deno {
    args: Vec<String>,
    bin_dir: PathBuf,
    target: String,
}

impl Deno {
    fn new(bin_dir: PathBuf) -> Result<Deno> {
        let deno = Deno {
            args: Vec::new(),
            bin_dir,
            #[cfg(target_os = "linux")]
            target: "x86_64-unknown-linux-gnu".to_string(),
            #[cfg(target_os = "macos")]
            target: "x86_64-apple-darwin".to_string(),
            #[cfg(target_os = "windows")]
            target: "x86_64-pc-windows-msvc".to_string(),
        };
        println!("~/.seran: {}", deno.bin_dir.display());
        if !deno.bin_dir.exists() {
            println!("Creating ~/.seran");
            fs::create_dir_all(&deno.bin_dir)?;
        }
        Ok(deno)
    }

    fn arg(&mut self, arg: String, value: Option<String>) {
        self.args.push(arg);
        if value.is_some() {
            self.args.push(value.unwrap());
        }
    }

    fn deno_zip(&self) -> PathBuf {
        self.bin_dir.join("deno.zip")
    }

    fn deno_path(&self) -> PathBuf {
        let exe = if cfg!(target_os = "windows") {
            "deno.exe"
        } else {
            "deno"
        };
        self.bin_dir.join(exe)
    }

    fn exists(&self) -> bool {
        self.deno_path().exists()
    }

    #[cfg(target_family = "unix")]
    fn set_executable(&self, path: &PathBuf) -> Result<()> {
        println!("Changing permissions");
        if cfg!(feature = "rust-perms") {
            let mut perms = fs::metadata(&path)?.permissions();
            // Needed to make the compiler happy
            #[cfg(feature = "rust-perms")]
            perms.set_mode(0o755);
        } else {
            let _status = Command::new("chmod")
                .args(&["+x", path.to_str().unwrap()])
                .status()
                .expect("Unable to execute deno");
        }
        Ok(())
    }

    async fn download(&self) -> Result<()> {
        let version = "v1.0.5";
        download_binary(
            &Url::parse(&format!(
                "https://github.com/denoland/deno/releases/download/{}/deno-{}.zip",
                version, self.target
            ))
            .unwrap(),
            &self.deno_zip(),
        )
        .await?;
        unzip(&self.deno_zip(), &self.bin_dir)?;
        println!("path: {}", &self.deno_path().display());
        #[cfg(target_family = "unix")]
        self.set_executable(&self.deno_path())?;
        // match self.set_executable(&self.deno_zip()) {
        //     Ok(value) => return Ok(value),
        //     Err(err) => return Err(err)
        // }
        Ok(())
    }

    fn version(&self) -> Option<String> {
        if !self.exists() {
            return None;
        }
        let output = Command::new(&self.deno_path())
            .args(&["--version"])
            .output()
            .expect("Unable to execute deno");
        let versions = String::from_utf8(output.stdout).expect("Unable to convert");
        // Example output:
        // deno 1.0.5
        // v8 8.4.300
        // typescript 3.9.2
        // TODO: Convert to regex match with capture?
        let deno_version = versions
            .split("\n")
            .next()
            .unwrap_or("deno unknown")
            .split(" ")
            .skip(1)
            .next()
            .unwrap();
        Some(deno_version.to_owned())
    }

    fn run(&self, extra_args: Vec<String>) -> Result<()> {
        let mut args = self.args.to_vec();
        args.extend(extra_args.into_iter());
        let status = Command::new(&self.deno_path())
            .args(&args)
            .current_dir(env::current_dir()?)
            .status()
            .expect("Unable to execute deno");
        println!("Deno exited with: {}", status);
        Ok(())
    }
}

struct Seran {
    deno: Deno,
    bin: PathBuf,
    src: PathBuf,
    tsconfig: PathBuf,
    importmap: PathBuf,
}

impl Seran {
    fn new(deno: Deno, bin: PathBuf) -> Seran {
        let src = bin.join("src");
        let tsconfig = if cfg!(feature = "rewrite-urls") {
            bin.join("tsconfig.json")
        } else {
            src.join("tsconfig.json")
        };
        let importmap = if cfg!(feature = "rewrite-urls") {
            bin.join("import_map.json")
        } else {
            src.join("import_map.json")
        };
        Seran {
            deno,
            bin,
            src,
            tsconfig,
            importmap,
        }
    }

    fn run<I>(&self, sites: I) -> Result<()>
    where
        I: Iterator<Item = String>,
    {
        let seran_path = if cfg!(feature = "rewrite-urls") {
            "https://raw.githubusercontent.com/joshuabenuck/seran-wiki/master/server/seran.ts"
                .to_owned()
        } else {
            format!("{}/server/seran.ts", self.src.to_str().unwrap())
        };
        let mut args = vec![
            "run".to_owned(),
            "--unstable".to_owned(),
            "--allow-env".to_owned(),
            "--allow-read".to_owned(),
            "--allow-net".to_owned(),
            "-c".to_owned(),
            self.tsconfig.to_str().unwrap().to_owned(),
            "--importmap".to_owned(),
            self.importmap.to_str().unwrap().to_owned(),
            seran_path,
        ];
        args.extend(sites);
        println!("{:?}", args);
        self.deno
            .run(args.into_iter().map(|s| s.to_string()).collect())?;
        Ok(())
    }

    async fn download(&self) -> Result<()> {
        if cfg!(feature = "rewrite-urls") {
            println!("Rewriting urls");
            let base_url = "https://raw.githubusercontent.com/joshuabenuck/seran-wiki/master";
            let tsconfig_url = format!("{}/tsconfig.json", base_url);
            download_binary(&Url::parse(&tsconfig_url)?, &self.bin.join("tsconfig.json")).await?;
            let importmap_url = format!("{}/import_map.json", base_url);
            let importmap_path = &self.bin.join("import_map.json");
            download_binary(&Url::parse(&importmap_url)?, &importmap_path).await?;
            let importmap = fs::read_to_string(&importmap_path)?;
            let importmap = importmap.replace("./server/", &format!("{}/server/", &base_url));
            fs::write(importmap_path, importmap)?;
        } else {
            if self.src.exists() {
                let _status = Command::new("git")
                    .args(&["pull"])
                    .current_dir(&self.src)
                    .status()
                    .expect("Unable to update seran wiki");
                //     let repo = git2::Repository::open(&self.src)?;
                //     let commit = repo.head()?.peel(git2::ObjectType::Commit)?;
                //     // repo.rebase(None, None, None, None)?;
                //     repo.merge(
                //         &commit,
                //         &repo.find_reference("FETCH_HEAD")?.peel_to_commit()?,
                //         Some(&git2::MergeOptions::new()),
                //     );
                return Ok(());
            }
            println!("Cloning repo");
            let url = "https://github.com/joshuabenuck/seran-wiki";
            let _repo = git2::Repository::clone(url, &self.src)?;
        }
        Ok(())
    }
}

fn main() {
    let matches = App::new("seran")
        .arg(
            Arg::with_name("allow-read")
                .long("allow-read")
                .use_delimiter(true)
                .require_equals(true)
                .takes_value(true)
                .min_values(0),
        )
        .arg(
            Arg::with_name("allow-write")
                .long("allow-write")
                .use_delimiter(true)
                .require_equals(true)
                .takes_value(true)
                .min_values(0),
        )
        .arg(
            Arg::with_name("allow-net")
                .long("allow-net")
                .use_delimiter(true)
                .require_equals(true)
                .takes_value(true)
                .min_values(0),
        )
        .arg(
            Arg::with_name("log-level")
                .long("log-level")
                .short("L")
                .takes_value(true),
        )
        .subcommand(SubCommand::with_name("run").arg(Arg::with_name("meta-site").multiple(true)))
        .get_matches();

    let deno_args = vec!["allow-read", "allow-net", "allow-write", "-L"];
    let bin = home_dir()
        .expect("Unable to determine home directory.")
        .join(".seran")
        .join("bin");
    let mut deno = Deno::new(bin.clone()).unwrap();
    let mut version = deno.version();
    let mut runtime = Runtime::new().expect("Unable to create Tokio runtime");
    if version.is_none() {
        runtime.block_on(deno.download()).unwrap();
        version = deno.version();
    }
    println!("{}", version.unwrap());
    // Pass along all deno specific args to deno
    for arg in deno_args {
        if matches.occurrences_of(arg) > 0 {
            println!("{} is present", arg);
            let values = matches.values_of(arg);
            for value in values.unwrap() {
                deno.arg(
                    arg.to_string(),
                    // TODO: Map to do this conversion?
                    match value == "" {
                        true => None,
                        false => Some(value.to_string()),
                    },
                );
            }
        }
    }

    // let seran_src = if matches.is_present("src") {
    //     matches.value_of("src").unwrap().to_owned()
    // } else {
    //     // env::var("SERAN_SRC").expect("Must specify --src or set SERAN_SRC env var!")
    //     match env::var("SERAN_SRC") {
    //         Ok(value) => value,
    //         Err(_) => panic!("Must specifc --src or set SERAN_SRC env var!"),
    //     }
    // };
    let seran = Seran::new(deno, bin);
    runtime.block_on(seran.download()).unwrap();
    if let Some(matches) = matches.subcommand_matches("run") {
        let sites = matches.values_of("meta-site");
        let sites = sites.expect("No meta-sites specified!");
        match seran.run(sites.into_iter().map(|s| s.to_owned())) {
            Ok(_) => (),
            Err(err) => panic!(err),
        };
    } else {
        println!("No command specified!");
    }
}
