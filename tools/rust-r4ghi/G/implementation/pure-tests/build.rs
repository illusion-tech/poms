use std::{env, fs, path::PathBuf};
fn main() {
    let manifest = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let root = manifest.ancestors().nth(5).unwrap();
    let scalar = root.join("apps/poms-api-rust/src/project_operating_common/scalars.rs");
    let facts = root.join("apps/poms-api-rust/src/project_operating/facts.rs");
    println!("cargo:rerun-if-changed={}", scalar.display());
    println!("cargo:rerun-if-changed={}", facts.display());
    let text = format!(
        r#"
#[path={scalar:?}] mod scalars;
mod project_operating_common {{ pub mod model {{ pub use crate::scalars::OperatingMoneyCents; }} }}
mod project_operating {{
    pub mod store {{ pub fn conflict(code:&'static str)->crate::contract_support::Error {{ crate::contract_support::Error::Conflict(code.into()) }} }}
    #[path={facts:?}] pub mod facts;
}}
"#,
        scalar = scalar.to_string_lossy(),
        facts = facts.to_string_lossy()
    );
    fs::write(
        PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("actual_sources.rs"),
        text,
    )
    .unwrap();
}
