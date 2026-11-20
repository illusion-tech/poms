use std::{env, fs, path::PathBuf};

fn main() {
    let root = PathBuf::from("E:/projects/worktrees/poms-r3hijk-next28/poms");
    let common = root.join("apps/poms-api-rust/src/project_operating_common");
    let support = root.join("apps/poms-api-rust/src/contract_support/mod.rs");
    let support_source = fs::read_to_string(&support).expect("actual Root canonical source");
    let start = support_source.find("pub fn canonical_hash(").expect("actual canonical function");
    let end = support_source[start..].find("pub fn require_uuid(").expect("next actual function") + start;
    let out = PathBuf::from(env::var_os("OUT_DIR").expect("build output"));
    fs::write(out.join("actual_canonical.rs"), &support_source[start..end]).expect("verbatim test-only canonical function excerpt");
    let source = format!(r#"
mod project_operating_common {{
    #[path={scalar:?}] pub mod scalars;
    // Test-only serialized carrier. This validates hashing, not typed model/DB.
    pub mod model {{ pub type OperatingSourceContext = serde_json::Value; }}
    #[path={schema:?}] pub mod schema;
    #[path={hash:?}] pub mod hash;
}}
"#,
        scalar=common.join("scalars.rs").to_string_lossy(),
        schema=common.join("schema.rs").to_string_lossy(),
        hash=common.join("hash.rs").to_string_lossy(),
    );
    fs::write(out.join("actual_sources.rs"), source).expect("actual source imports");
    for name in ["scalars.rs", "schema.rs", "hash.rs"] {
        println!("cargo:rerun-if-changed={}", common.join(name).display());
    }
    println!("cargo:rerun-if-changed={}", support.display());
}
