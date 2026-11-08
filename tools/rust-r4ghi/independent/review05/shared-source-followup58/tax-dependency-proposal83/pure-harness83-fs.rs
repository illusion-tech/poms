// Exact proposed pure helpers/tests and exact current hash/id/date adapters.
// This harness has no DB/HTTP and does not compile the async production adapter.
use serde_json::Value;
use std::collections::BTreeSet;
use uuid::Uuid;
use contract_support::Error;
mod contract_support {
 use serde_json::Value;
 use sha2::{Digest,Sha256};
 #[derive(Debug)]
 pub enum Error { Internal, CodedConflict {code: &'static str,message:String} }
pub fn canonical_hash(value: &Value) -> Result<String, Error> {
    fn ordered(value: &Value) -> Value {
        match value {
            Value::Object(map) => {
                let mut fields = map.iter().collect::<Vec<_>>();
                fields.sort_by(|a, b| a.0.cmp(b.0));
                Value::Object(
                    fields
                        .into_iter()
                        .map(|(k, v)| (k.clone(), ordered(v)))
                        .collect(),
                )
            }
            Value::Array(values) => Value::Array(values.iter().map(ordered).collect()),
            other => other.clone(),
        }
    }
    let bytes = serde_json::to_vec(&ordered(value)).map_err(|_| Error::Internal)?;
    Ok(Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}
}
mod store {use crate::{Error,Value,Uuid};
pub(crate) fn id(row: &Value, key: &str) -> Result<Uuid, Error> {
    row[key]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(Error::Internal)
}
pub(crate) fn conflict(code: &'static str) -> Error {
    Error::CodedConflict {
        code,
        message: code.replace('_', " "),
    }
}

}
mod sources {use crate::{Error,Value,store};use chrono::{DateTime,NaiveDate};
pub(crate) fn business_day(value: &Value) -> Result<NaiveDate, Error> {
    let s = value
        .as_str()
        .ok_or_else(|| store::conflict("operating_source_business_date_missing"))?;
    if s.len() == 10 {
        return NaiveDate::parse_from_str(s, "%Y-%m-%d")
            .map_err(|_| store::conflict("operating_source_business_date_invalid"));
    }
    Ok(DateTime::parse_from_rfc3339(s)
        .map_err(|_| store::conflict("operating_source_business_date_invalid"))?
        .with_timezone(&chrono_tz::Asia::Hong_Kong)
        .date_naive())
}

}
#[derive(Clone)]
struct Impact {
    id: Uuid,
    project: Option<Uuid>,
    day: Option<chrono::NaiveDate>,
    producer: bool,
}
// Tax evidence is immutable F producer output, not a caller-supplied cost
// list. Bind its metadata references back to its hashed original assessment.
fn tax_dependency_sources(tax: &Value, evidence: &Value) -> Result<Vec<Value>, Error> {
    if tax["governance_schema_version"] != 1
        || tax["status"] != "active"
        || evidence["schema_version"] != 1
        || evidence["id"] != tax["governance_evidence_id"]
        || evidence["target_type"] != "AccountingTaxTreatmentSnapshot"
        || evidence["target_id"] != tax["id"]
        || evidence["project_id"] != tax["project_id"]
        || !evidence["frozen_payload"].is_object()
        || evidence["payload_hash"]
            != crate::contract_support::canonical_hash(&evidence["frozen_payload"])?
        || evidence["source_references"]
            != evidence["frozen_payload"]["assessment"]["sourceReferences"]
    {
        return Err(store::conflict("operating_tax_dependency_evidence_changed"));
    }
    let references = evidence["source_references"]
        .as_array()
        .filter(|refs| !refs.is_empty())
        .ok_or_else(|| store::conflict("operating_tax_dependency_evidence_changed"))?;
    let mut sources = Vec::new();
    for reference in references {
        match reference["kind"].as_str() {
            Some("source") => sources.push(reference.clone()),
            Some("manual") => {}
            _ => return Err(store::conflict("operating_tax_dependency_evidence_changed")),
        }
    }
    Ok(sources)
}

fn append_dependency_cost(
    cost: &Value,
    ids: &mut BTreeSet<Uuid>,
    impacts: &mut Vec<Impact>,
) -> Result<(), Error> {
    let id = store::id(cost, "id")?;
    ids.insert(id);
    impacts.push(Impact {
        id,
        project: Some(store::id(cost, "project_id")?),
        day: Some(sources::business_day(&cost["occurred_on"])?),
        producer: true,
    });
    Ok(())
}

fn append_batch_impacts(
    rows: &[Value],
    ids: &mut BTreeSet<Uuid>,
    impacts: &mut Vec<Impact>,
) -> Result<(), Error> {
    for row in rows {
        let day = Some(sources::business_day(&row["businessDate"])?);
        for (id_key, p_key) in [("resultId", "projectId"), ("costId", "costProjectId")] {
            let id = store::id(row, id_key)?;
            ids.insert(id);
            impacts.push(Impact {
                id,
                project: Some(store::id(row, p_key)?),
                day,
                producer: true,
            });
        }
        ids.insert(store::id(row, "basisId")?);
    }
    Ok(())
}

#[cfg(test)]
mod tax_dependency83_tests {
    use super::*;
    use serde_json::json;

    fn uid(n: u128) -> Uuid {
        Uuid::from_u128(n)
    }

    fn evidence_pair(references: Value) -> (Value, Value) {
        let payload = json!({"assessment":{"sourceReferences":references},"actorId":uid(90)});
        let tax = json!({"id":uid(1),"project_id":uid(10),"status":"active","governance_schema_version":1,"governance_evidence_id":uid(2),"tax_impact_pending_amount":"130.00"});
        let evidence = json!({"id":uid(2),"project_id":uid(10),"target_type":"AccountingTaxTreatmentSnapshot","target_id":uid(1),"schema_version":1,"business_date":"2026-11-08","source_references":references,"frozen_payload":payload,"payload_hash":crate::contract_support::canonical_hash(&payload).expect("fixture hash")});
        (tax, evidence)
    }

    #[test]
    fn tax_dependency83_reads_the_sealed_cost_relation_without_rebinding_its_version() {
        let (tax, evidence) = evidence_pair(
            json!([{"kind":"source","sourceType":"project-actual-cost-record","sourceId":uid(20),"sourceVersion":2,"businessDate":"2026-11-08"}]),
        );
        let original = (tax.clone(), evidence.clone());
        let selected = tax_dependency_sources(&tax, &evidence).expect("real relation");
        assert_eq!(selected.len(), 1);
        assert_eq!(selected[0]["sourceId"], uid(20).to_string());
        assert_eq!(selected[0]["sourceVersion"], 2);
        // G uses this ID only for dependency discovery. A later consumption
        // version remains the responsibility of the unchanged F assertions.
        let mut ids = BTreeSet::from([uid(1)]);
        let mut impacts = vec![];
        append_dependency_cost(
            &json!({"id":uid(20),"project_id":uid(10),"occurred_on":"2026-11-08","row_version":3}),
            &mut ids,
            &mut impacts,
        )
        .expect("actual current cost row");
        assert!(ids.contains(&uid(20)));
        assert_eq!(impacts[0].project, Some(uid(10)));
        assert_eq!((tax, evidence), original);
    }

    #[test]
    fn tax_dependency83_cost_seed_reaches_the_complete_cross_project_transitive_batch() {
        let mut ids = BTreeSet::from([uid(1)]);
        let mut impacts = vec![];
        append_dependency_cost(
            &json!({"id":uid(20),"project_id":uid(10),"occurred_on":"2026-11-08"}),
            &mut ids,
            &mut impacts,
        )
        .expect("tax source cost");
        let rows = vec![
            json!({"resultId":uid(40),"projectId":uid(10),"basisId":uid(30),"costId":uid(20),"costProjectId":uid(10),"businessDate":"2026-11-08"}),
            json!({"resultId":uid(41),"projectId":uid(11),"basisId":uid(30),"costId":uid(20),"costProjectId":uid(10),"businessDate":"2026-11-08"}),
            json!({"resultId":uid(40),"projectId":uid(10),"basisId":uid(30),"costId":uid(21),"costProjectId":uid(12),"businessDate":"2026-11-07"}),
            json!({"resultId":uid(42),"projectId":uid(13),"basisId":uid(31),"costId":uid(21),"costProjectId":uid(12),"businessDate":"2026-11-07"}),
            json!({"resultId":uid(99),"projectId":uid(99),"basisId":uid(98),"costId":uid(97),"costProjectId":uid(99),"businessDate":"2026-11-01"}),
        ];
        // Rows returned by the unchanged real join are added as a complete
        // batch; its next query uses the expanded cost/basis/result ID set.
        loop {
            let before = ids.len();
            let joined = rows
                .iter()
                .filter(|r| {
                    ["costId", "basisId", "resultId"]
                        .iter()
                        .any(|k| ids.contains(&store::id(r, k).expect("actual join id")))
                })
                .cloned()
                .collect::<Vec<_>>();
            append_batch_impacts(&joined, &mut ids, &mut impacts).expect("whole batch rows");
            if ids.len() == before {
                break;
            }
        }
        let projects = impacts
            .iter()
            .filter_map(|i| i.project)
            .collect::<BTreeSet<_>>();
        assert_eq!(
            projects,
            BTreeSet::from([uid(10), uid(11), uid(12), uid(13)])
        );
        assert!(ids.contains(&uid(42)));
        assert!(!ids.contains(&uid(99)));
        assert!(impacts.iter().any(|i| i.project == Some(uid(11))
            && i.day == chrono::NaiveDate::from_ymd_opt(2026, 11, 8)
            && i.producer));
    }

    #[test]
    fn tax_dependency83_rejects_mutated_hash_target_project_schema_and_current_marker() {
        let refs = json!([{"kind":"source","sourceType":"expense-record","sourceId":uid(20),"sourceVersion":2,"businessDate":"2026-11-08"}]);
        for field in ["payload_hash", "target_id", "project_id", "schema_version"] {
            let (tax, mut evidence) = evidence_pair(refs.clone());
            evidence[field] = if field == "schema_version" {
                json!(0)
            } else {
                json!("changed")
            };
            assert!(tax_dependency_sources(&tax, &evidence).is_err(), "{field}");
        }
        let (mut tax, evidence) = evidence_pair(refs);
        tax["status"] = json!("superseded");
        assert!(tax_dependency_sources(&tax, &evidence).is_err());
    }

    #[test]
    fn tax_dependency83_unhashed_metadata_cannot_substitute_a_foreign_cost_relation() {
        let (tax, mut evidence) = evidence_pair(
            json!([{"kind":"source","sourceType":"project-actual-cost-record","sourceId":uid(20),"sourceVersion":2,"businessDate":"2026-11-08"}]),
        );
        evidence["source_references"][0]["sourceId"] = json!(uid(999));
        assert!(tax_dependency_sources(&tax, &evidence).is_err());
    }

    #[test]
    fn tax_dependency83_manual_assessment_does_not_guess_project_wide_costs() {
        let (tax, evidence) = evidence_pair(
            json!([{"kind":"manual","businessDate":"2026-11-08","reason":"actual manual assessment","evidenceSummary":"pending review","attachmentIds":[]}]),
        );
        assert!(
            tax_dependency_sources(&tax, &evidence)
                .expect("qualified manual evidence")
                .is_empty()
        );
    }
}
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
