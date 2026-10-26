//! One-way typed export from verified local official ICU TOML. No network API.
use icu_collator::provider::{CollationJamoV1, CollationRootV1};
use icu_provider::prelude::*;
use icu_provider_source::{CollationRootHan, SourceDataProvider};
use std::{error::Error, path::Path};

fn output(path: &Path, bytes: &[u8], check: bool) -> Result<(), Box<dyn Error>> {
    if check {
        if std::fs::read(path)? != bytes {
            return Err("generated opaque payload differs".into());
        }
    } else {
        std::fs::write(path, bytes)?;
    }
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let arguments = std::env::args().skip(1).collect::<Vec<_>>();
    let check = match arguments.as_slice() {
        [] => false,
        [flag] if flag == "--check" => true,
        _ => return Err("only --check is supported".into()),
    };
    let directory = Path::new(env!("CARGO_MANIFEST_DIR")).join("../collation");
    let provider = SourceDataProvider::new_custom()
        .with_icuexport(&directory.join("source"))?
        .with_collation_root_han(CollationRootHan::Unihan);
    let root: DataResponse<CollationRootV1> = provider.load(DataRequest::default())?;
    let jamo: DataResponse<CollationJamoV1> = provider.load(DataRequest::default())?;
    output(
        &directory.join("root.json"),
        &serde_json::to_vec(root.payload.get())?,
        check,
    )?;
    output(
        &directory.join("jamo.json"),
        &serde_json::to_vec(jamo.payload.get())?,
        check,
    )?;
    println!("Root/Jamo opaque payloads match fixed local official data");
    Ok(())
}
