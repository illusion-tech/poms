// Isolated filesystem/catalog replay only; no SQL, HTTP, or product runtime.
#[test]
fn frozen_actual_foreign_expense84_reconstructs_the_missing_catalog_parent() {
    use std::{fs,collections::BTreeMap};
    use sha2::{Digest,Sha256};
    let hash=|b:&[u8]|Sha256::digest(b).iter().map(|x|format!("{x:02x}")).collect::<String>();
    let folder="/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01";
    let ledger=fs::read(format!("{folder}/006225-ledger.json")).expect("immutable ledger");
    assert_eq!(hash(&ledger),"46f166b813d409e679759ccfbb63175c8a266a0c7c6dedfff2f511d38395e7f7");
    let ledger:Value=serde_json::from_slice(&ledger).expect("ledger JSON");
    let pin=&ledger["before"];let bytes=fs::read(pin["file"].as_str().expect("before path")).expect("before snapshot");assert_eq!(hash(&bytes),pin["rawBytesSha256"].as_str().expect("before hash"));let before:Value=serde_json::from_slice(&bytes).expect("before JSON");
    let rows=|table:&str|{
        let meta=&before["databases"]["poms_r4ghi_rust"]["tables"][table];let bytes=fs::read(meta["file"].as_str().expect("table path")).expect("table rows");assert_eq!(hash(&bytes),meta["rawBytesSha256"].as_str().expect("table hash"));
        std::str::from_utf8(&bytes).expect("UTF8").lines().filter(|l|!l.is_empty()).map(|line|{
            let envelope:Value=serde_json::from_str(line).expect("envelope");let raw=envelope["raw"].as_str().expect("raw PG row");let mut value:Value=serde_json::from_str(raw).expect("row");
            // Reproduce the existing Expense SQL decimal-text selection with
            // original RawValue lexemes; never float-to-string its amounts.
            if table=="expense_record" {let fields:BTreeMap<String,Box<serde_json::value::RawValue>>=serde_json::from_str(raw).expect("original numeric lexemes");for k in ["amount_excluding_tax","tax_amount","amount_including_tax"]{if let Some(v)=fields.get(k){value[k]=Value::String(v.get().to_owned());}}}
            value
        }).collect::<Vec<_>>()
    };
    let main=Uuid::parse_str("51d60c76-6de2-432a-8714-10e3ed3234f3").expect("actual main");
    let result=rows("shared_cost_allocation_result").into_iter().find(|r|r["id"]=="aee83f0a-4ae1-4add-9dc3-8a25526ef7c5").expect("actual requested share");assert_eq!(result["project_id"],main.to_string());
    let slot=rows("shared_cost_allocation_source_snapshot").into_iter().find(|s|s["basis_id"]==result["basis_id"]).expect("actual source slot");let cost=rows("project_actual_cost_record").into_iter().find(|c|c["id"]==slot["cost_record_id"]).expect("actual cost");assert_eq!(cost["source_type"],"expense-record");
    let expenses=rows("expense_record");let parent=expenses.iter().find(|e|e["id"]==cost["source_id"]).expect("physical confirmed Expense");assert_eq!(parent["status"],"confirmed");assert_eq!(parent["row_version"],2);assert_ne!(parent["project_id"],main.to_string());
    let mut catalog=Catalog::default();catalog.rows.insert(Table::Expense,expenses.iter().filter(|e|locally_registered_upstream(e,main)).cloned().collect());assert!(cost_source_ref(&catalog,&cost).is_err(),"Original local-only catalog reproduces the failed path");
    catalog.rows.get_mut(&Table::Expense).expect("Expense family").push(parent.clone());let reference=cost_source_ref(&catalog,&cost).expect("exact linked parent resolves identity");assert_eq!(reference["kind"],"ExpenseRecord");assert_eq!(reference["id"],parent["id"]);assert_eq!(reference["rowVersion"],2);assert!(!locally_registered_upstream(parent,main));
    println!("FS-only actual006224 catalog omission reproduced; exact foreign Expense identity/version resolves without SQL/fake source/local projection. Not current HTTP acceptance.");
}
