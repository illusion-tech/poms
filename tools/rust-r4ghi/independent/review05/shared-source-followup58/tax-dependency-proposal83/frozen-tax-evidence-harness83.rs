// Appended only to the isolated exact-helper harness; not a product test.
#[test]
fn frozen_actual_tax_evidence83_filesystem_only() {
    use sha2::{Digest, Sha256};
    use std::fs;
    let hash = |bytes: &[u8]| Sha256::digest(bytes).iter().map(|b| format!("{b:02x}")).collect::<String>();
    let folder = "/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business11/main01";
    let bytes = fs::read(format!("{folder}/003079-ef40-complete.json")).expect("immutable completion");
    assert_eq!(hash(&bytes), "360ff7f813c05dae0ef2f21d2351c7c4bc9130e377428605868dc07ca67c6eac");
    let complete: Value = serde_json::from_slice(&bytes).expect("completion JSON");
    let after = &complete["finalSuccess"]["after"];
    let bytes = fs::read(after["file"].as_str().expect("snapshot path")).expect("immutable snapshot");
    assert_eq!(hash(&bytes), after["rawBytesSha256"].as_str().expect("snapshot raw hash"));
    let snapshot: Value = serde_json::from_slice(&bytes).expect("snapshot JSON");
    let rows = |table: &str| {
        let meta = &snapshot["databases"]["poms_r4ghi_rust"]["tables"][table];
        let bytes = fs::read(meta["file"].as_str().expect("table path")).expect("immutable table rows");
        assert_eq!(hash(&bytes), meta["rawBytesSha256"].as_str().expect("row file hash"));
        std::str::from_utf8(&bytes).expect("UTF8 rows").lines().filter(|s| !s.is_empty()).map(|line| {
            let row: Value = serde_json::from_str(line).expect("row envelope");
            serde_json::from_str::<Value>(row["raw"].as_str().expect("raw row")).expect("real PG row JSON")
        }).collect::<Vec<_>>()
    };
    let taxes = rows("accounting_tax_treatment_snapshot");
    let evidence = rows("cost_governance_evidence");
    let mut count = 0;
    for tax in taxes.iter().filter(|t| t["status"] == "active" && t["governance_schema_version"] == 1) {
        let e = evidence.iter().find(|e| e["id"] == tax["governance_evidence_id"]).expect("actual F evidence");
        let refs = tax_dependency_sources(tax, e).expect("real frozen F assessment binding");
        assert!(!refs.is_empty());
        count += 1;
    }
    assert_eq!(count, 1);
    println!("FS-only actual003079 activeTax/evidence binding: {count}; API134 historical shape; no HTTP/SQL/current acceptance");
}
