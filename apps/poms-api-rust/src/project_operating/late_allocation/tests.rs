use super::*;

fn uid(n: u128) -> Value {
    json!(Uuid::from_u128(n))
}
fn money(n: i128, scale: u32) -> Value {
    let base = 10_i128.pow(scale);
    json!(format!(
        "{}.{:0width$}",
        n / base,
        n % base,
        width = scale as usize
    ))
}
fn now() -> DateTime<Utc> {
    instant(&json!("2026-11-10T00:00:00Z")).unwrap()
}
fn cutoff() -> NaiveDate {
    NaiveDate::from_ymd_opt(2026, 11, 8).unwrap()
}
fn insert(c: &mut Catalog, t: Table, v: Value) {
    c.rows.entry(t).or_default().push(v);
}
fn proof(
    c: &mut Catalog,
    target: &Value,
    kind: &str,
    id: u128,
    payload: Value,
    time: &str,
    project: Value,
) {
    insert(
        c,
        Table::Evidence,
        json!({"id":uid(id),"target_type":kind,"target_id":target["id"],"project_id":project,
        "schema_version":1,"evidence_kind":"source-facts","frozen_payload":payload,"payload_hash":canonical_hash(&payload).unwrap(),
        "reason":"Actual governed allocation","actor_id":uid(90),"request_id":format!("fixture-{id}"),"created_at":time}),
    );
}
fn fixture(replacement: bool) -> (Catalog, Value) {
    let mut c = Catalog::default();
    for (n, net, tax, day) in [(1, 10, 1, "2026-10-01"), (2, 1, 0, "2026-11-08")] {
        let original = json!({"id":uid(n+50),"row_version":1});
        insert(
            &mut c,
            Table::Cost,
            json!({"id":uid(n),"project_id":uid(10),"row_version":1,"record_status":"confirmed",
            "source_type":"expense-record","source_id":uid(n+50),"currency":"CNY","occurred_on":day,
            "source_basis":{"sourceRowVersion":1,"sourcePayload":original},
            "amount_excluding_tax":money(net,2),"tax_cost_amount":money(tax,2),"amount_including_tax":money(net+tax,2),
            "created_at":"2026-11-08T00:00:00Z","updated_at":"2026-11-08T00:00:00Z"}),
        );
    }
    batch(&mut c, 100, None, "2026-11-09T00:00:00Z", [1, 1]);
    if replacement {
        for table in [Table::AllocationBasis, Table::AllocationResult] {
            for row in c.rows.get_mut(&table).unwrap() {
                row["status"] = json!("superseded");
                row["row_version"] = json!(2);
                row["updated_at"] = json!("2026-11-09T01:00:00Z");
            }
        }
        for s in c.rows.get_mut(&Table::AllocationSource).unwrap() {
            s["is_current"] = json!(false);
        }
        batch(&mut c, 200, Some(100), "2026-11-09T01:00:00Z", [2, 1]);
    }
    let id = if replacement { 201 } else { 101 };
    let r = c
        .find(Table::AllocationResult, Uuid::from_u128(id))
        .unwrap()
        .clone();
    (c, r)
}
fn batch(c: &mut Catalog, id: u128, previous: Option<u128>, time: &str, weights: [i128; 2]) {
    let mut frozen = Vec::new();
    for cost in c.all(Table::Cost).to_vec() {
        let original = &cost["source_basis"]["sourcePayload"];
        let hash = canonical_hash(original).unwrap();
        let source = json!({"sourceType":cost["source_type"],"sourceId":cost["source_id"],"sourceRowVersion":1,
            "sourcePayload":original,
            "currency":"CNY","occurredOn":cost["occurred_on"],"amountExcludingTax":cost["amount_excluding_tax"],
            "taxCostAmount":cost["tax_cost_amount"],"amountIncludingTax":cost["amount_including_tax"],
            "governanceVersionProof":{"costRecordId":cost["id"],"sourceType":cost["source_type"],"sourceId":cost["source_id"],
                "capturedVersion":1,"capturedPayloadHash":hash,"previousCertifiedVersion":1,"previousPayloadHash":hash,
                "currentVersion":1,"currentPayloadHash":hash,"sourcePayload":original,"reason":"unchanged"}});
        let payload = json!({"cost":cost,"source":source});
        insert(
            c,
            Table::AllocationSource,
            json!({"basis_id":uid(id),"cost_record_id":cost["id"],"cost_row_version":1,
            "source_type":cost["source_type"],"source_id":cost["source_id"],"source_row_version":1,"currency":"CNY",
            "amount_excluding_tax":cost["amount_excluding_tax"],"tax_cost_amount":cost["tax_cost_amount"],"amount_including_tax":cost["amount_including_tax"],
            "source_payload":payload,"source_payload_hash":canonical_hash(&payload).unwrap(),"is_current":true,"created_at":time}),
        );
        frozen.push(payload);
    }
    use sha2::{Digest, Sha256};
    let ids = [
        Uuid::from_u128(1).to_string(),
        Uuid::from_u128(2).to_string(),
    ]
    .join("|");
    let scope_hash = Sha256::digest(ids.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();
    let basis = json!({"id":uid(id),"row_version":1,"status":"active","governance_schema_version":1,"currency":"CNY",
        "allocation_algorithm":"largest-remainder-cents-v1","replacement_operation_id":uid(id+50),"replacement_reason":previous.map(|_|"Actual correction"),
        "supersedes_id":previous.map(Uuid::from_u128),"governance_evidence_id":uid(id+10),"created_at":time,"updated_at":time,"effective_at":time,"created_by":uid(90),
        "measurement_basis":"including-tax","source_amount_excluding_tax":"0.11","source_tax_cost_amount":"0.01","source_amount_including_tax":"0.12","measurement_amount":"0.12",
        "source_cost_scope_key":format!("cost-scope:{scope_hash}")});
    let items = json!([{"projectId":uid(10),"allocationWeight":money(weights[0],6)},{"projectId":uid(20),"allocationWeight":money(weights[1],6)}]);
    let policy = json!({"id":"selected-measurement-first","version":2,"measurementBasis":"including-tax",
        "grossComponents":"gross-cap-net-tax-complement","tieBreak":"project-uuid-bytes-ascending","secondaryQuota":"bounded-largest-deficit"});
    let transitions = frozen
        .iter()
        .map(|s| s["source"]["governanceVersionProof"].clone())
        .collect::<Vec<_>>();
    let payload = json!({"sources":frozen,"sourceVersionTransitions":transitions,"measurementBasis":"including-tax","totals":["0.11","0.01","0.12"],"currency":"CNY",
        "projectShares":items,"algorithm":"largest-remainder-cents-v1","predecessorBasisId":basis["supersedes_id"],"allocationPolicy":policy});
    proof(
        c,
        &basis,
        "SharedCostAllocationBasis",
        id + 10,
        payload,
        time,
        Value::Null,
    );
    insert(c, Table::AllocationBasis, basis);
    let shares = [
        AllocationShare {
            project: *Uuid::from_u128(10).as_bytes(),
            weight: weights[0],
        },
        AllocationShare {
            project: *Uuid::from_u128(20).as_bytes(),
            weight: weights[1],
        },
    ];
    for (i, a) in allocate_source_layers([Some(11), Some(1), Some(12)], &shares, 2)
        .unwrap()
        .iter()
        .enumerate()
    {
        let result = json!({"id":uid(id+i as u128+1),"basis_id":uid(id),"project_id":json!(Uuid::from_bytes(a.project)),"row_version":1,"status":"active","governance_schema_version":1,
            "currency":"CNY","replacement_operation_id":uid(id+50),"supersedes_id":previous.map(|p|Uuid::from_u128(p+i as u128+1)),"governance_evidence_id":uid(id+20+i as u128),
            "created_at":time,"updated_at":time,"effective_at":time,"created_by":uid(90),"allocation_weight":money(weights[i],6),
            "allocated_amount_excluding_tax":a.layers[0].map(|n|money(n,2)),"allocated_tax_cost_amount":a.layers[1].map(|n|money(n,2)),"allocated_amount_including_tax":a.layers[2].map(|n|money(n,2)),
            "allocated_amount":money(a.amount,2),"allocation_ratio":money(a.ratio,6),"residual_minor_units":a.residual});
        let payload = json!({"basisId":uid(id),"basisEvidenceId":uid(id+10),"allocation":items[i],"allocationPolicy":policy,"sourceVersionTransitions":transitions,
            "layers":a.layers.map(|v|v.map(|n|money(n,2))),"amount":money(a.amount,2),"ratio":money(a.ratio,6),"residualMinorUnits":a.residual,"predecessorResultId":result["supersedes_id"]});
        proof(
            c,
            &result,
            "SharedCostAllocationResult",
            id + 20 + i as u128,
            payload,
            time,
            result["project_id"].clone(),
        );
        insert(c, Table::AllocationResult, result);
    }
}
fn eligible(c: &Catalog, r: &Value) -> Trace {
    match qualify(c, r, cutoff(), now()).unwrap() {
        Qualification::Eligible(t) => t,
        _ => panic!("unexpected future"),
    }
}
fn mutate(c: &mut Catalog, t: Table, id: u128, f: impl FnOnce(&mut Value)) {
    f(c.rows
        .get_mut(&t)
        .unwrap()
        .iter_mut()
        .find(|r| r["id"] == uid(id))
        .unwrap());
}
#[test]
fn late_initial_create_is_real_root_and_cumulative() {
    let (c, r) = fixture(false);
    let t = eligible(&c, &r);
    assert!(
        t.references
            .iter()
            .any(|r| r["kind"] == "ProjectActualCostRecord" && r["id"] == uid(1))
    );
    assert_eq!(r["effective_at"], "2026-11-09T00:00:00Z");
}
#[test]
fn actual_late_whole_replacement_chain_qualifies() {
    let (c, r) = fixture(true);
    let t = eligible(&c, &r);
    assert!(t.references.iter().any(|r| r["id"] == uid(100)));
    assert!(t.references.iter().any(|r| r["id"] == uid(202)));
}
#[test]
fn missing_peer_share_rejects_whole_batch() {
    let (mut c, r) = fixture(false);
    c.rows.get_mut(&Table::AllocationResult).unwrap().pop();
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}
#[test]
fn missing_parent_rejects() {
    let (mut c, r) = fixture(true);
    c.rows.get_mut(&Table::AllocationBasis).unwrap().remove(0);
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}
#[test]
fn missing_evidence_rejects() {
    let (mut c, r) = fixture(false);
    c.rows.get_mut(&Table::Evidence).unwrap().remove(0);
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}
#[test]
fn evidence_hash_corruption_rejects() {
    let (mut c, r) = fixture(false);
    mutate(&mut c, Table::Evidence, 110, |e| {
        e["frozen_payload"]["currency"] = json!("USD")
    });
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}
#[test]
fn changed_current_source_version_rejects() {
    let (mut c, r) = fixture(false);
    mutate(&mut c, Table::Cost, 1, |e| e["row_version"] = json!(2));
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}
#[test]
fn actual_knowledge_time_is_enforced() {
    let (c, r) = fixture(false);
    assert!(
        qualify(
            &c,
            &r,
            cutoff(),
            instant(&json!("2026-11-08T00:00:00Z")).unwrap()
        )
        .is_err()
    );
}
#[test]
fn wrong_peer_amount_or_tax_conservation_rejects() {
    let (mut c, r) = fixture(false);
    mutate(&mut c, Table::AllocationResult, 102, |e| {
        e["allocated_amount_including_tax"] = json!("0.05")
    });
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}
#[test]
fn false_initial_predecessor_rejects() {
    let (mut c, r) = fixture(false);
    mutate(&mut c, Table::AllocationResult, 102, |e| {
        e["supersedes_id"] = uid(999)
    });
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}
#[test]
fn basis_cycle_rejects() {
    let (mut c, r) = fixture(true);
    mutate(&mut c, Table::AllocationBasis, 100, |e| {
        e["supersedes_id"] = uid(200)
    });
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}

fn actual_source_day(c: &mut Catalog, id: u128, day: &str) {
    mutate(c, Table::Cost, id, |r| r["occurred_on"] = json!(day));
    for s in c.rows.get_mut(&Table::AllocationSource).unwrap() {
        if s["cost_record_id"] == uid(id) {
            s["source_payload"]["cost"]["occurred_on"] = json!(day);
            s["source_payload"]["source"]["occurredOn"] = json!(day);
            s["source_payload_hash"] = json!(canonical_hash(&s["source_payload"]).unwrap());
        }
    }
    let snapshots = c.all(Table::AllocationSource).to_vec();
    for e in c.rows.get_mut(&Table::Evidence).unwrap() {
        if e["target_type"] == "SharedCostAllocationBasis" {
            e["frozen_payload"]["sources"] = json!(
                snapshots
                    .iter()
                    .filter(|s| s["basis_id"] == e["target_id"])
                    .map(|s| s["source_payload"].clone())
                    .collect::<Vec<_>>()
            );
            e["payload_hash"] = json!(canonical_hash(&e["frozen_payload"]).unwrap());
        }
    }
}
#[test]
fn one_true_future_source_excludes_complete_batch() {
    let (mut c, r) = fixture(false);
    actual_source_day(&mut c, 2, "2026-11-09");
    assert!(matches!(
        qualify(&c, &r, cutoff(), now()).unwrap(),
        Qualification::FutureBusiness
    ));
    assert_eq!(c.all(Table::AllocationSource).len(), 2);
}
#[test]
fn future_source_in_replacement_is_not_trimmed() {
    let (mut c, r) = fixture(true);
    actual_source_day(&mut c, 2, "2026-11-09");
    assert!(matches!(
        qualify(&c, &r, cutoff(), now()).unwrap(),
        Qualification::FutureBusiness
    ));
}
#[test]
fn evidence_written_after_shared_batch_clock_is_lawful() {
    let (mut c, r) = fixture(false);
    mutate(&mut c, Table::Evidence, 120, |e| {
        e["created_at"] = json!("2026-11-09T00:00:00.001Z")
    });
    eligible(&c, &r);
}
#[test]
fn final_collection_uses_actual_postwrite_knowledge() {
    let (mut c, mut r) = fixture(false);
    mutate(&mut c, Table::AllocationResult, 101, |e| {
        e["updated_at"] = json!("2026-11-09T02:00:00Z");
        e["row_version"] = json!(2);
    });
    r["updated_at"] = json!("2026-11-09T02:00:00Z");
    r["row_version"] = json!(2);
    assert!(
        qualify(
            &c,
            &r,
            cutoff(),
            instant(&json!("2026-11-09T01:59:59Z")).unwrap()
        )
        .is_err()
    );
    eligible(&c, &r);
}
#[test]
fn traced_peer_and_ancestor_refs_are_opaque_not_financial_rows() {
    let (c, r) = fixture(true);
    let t = eligible(&c, &r);
    assert!(t.references.iter().any(|p| p["id"] == uid(202)));
    for reference in t.references {
        assert_eq!(reference.as_object().unwrap().len(), 4);
        assert!(reference["payloadHash"].is_string());
    }
}
#[test]
fn self_consistent_source_hash_does_not_authorize_economic_drift() {
    let (c, _) = fixture(false);
    let mut captured = c.all(Table::AllocationSource)[0]["source_payload"].clone();
    captured["source"]["sourcePayload"]["illicit_price_change"] = json!("99.00");
    let current = captured["source"]["sourcePayload"].clone();
    captured["source"]["governanceVersionProof"]["sourcePayload"] = current.clone();
    captured["source"]["governanceVersionProof"]["currentPayloadHash"] =
        json!(canonical_hash(&current).unwrap());
    captured["source"]["governanceVersionProof"]["previousPayloadHash"] =
        json!(canonical_hash(&current).unwrap());
    assert!(source_proof(&captured).is_err());
}
#[test]
fn current_unknown_rounding_policy_is_not_a_legacy_escape() {
    let (mut c, r) = fixture(false);
    mutate(&mut c, Table::Evidence, 110, |e| {
        e["frozen_payload"]["allocationPolicy"]["version"] = json!(99);
        e["payload_hash"] = json!(canonical_hash(&e["frozen_payload"]).unwrap());
    });
    assert!(qualify(&c, &r, cutoff(), now()).is_err());
}

fn window() -> OperatingBusinessWindow {
    OperatingBusinessWindow {
        business_cutoff: cutoff(),
        knowledge_cutoff: now(),
        source_window_start: None,
        source_window_end: Some(cutoff()),
        period_key: Some("2026-W45".into()),
        business_timezone: "Asia/Hong_Kong".into(),
    }
}
#[test]
fn input_hash_evidence_is_stable_across_the_read_clock() {
    let (c, _) = fixture(true);
    let first = window();
    let mut later = window();
    later.knowledge_cutoff = instant(&json!("2026-11-11T00:00:00Z")).unwrap();
    assert_eq!(
        input_evidence(&c, Uuid::from_u128(10), &first).unwrap(),
        input_evidence(&c, Uuid::from_u128(10), &later).unwrap()
    );
    assert!(first.source_window_start.is_none());
}
#[test]
fn evidence_time_change_invalidates_the_preparation_input() {
    let (mut c, r) = fixture(false);
    let before = input_evidence(&c, Uuid::from_u128(10), &window()).unwrap();
    mutate(&mut c, Table::Evidence, 120, |e| {
        e["created_at"] = json!("2026-11-09T00:00:00.001Z")
    });
    eligible(&c, &r);
    assert_ne!(
        before,
        input_evidence(&c, Uuid::from_u128(10), &window()).unwrap()
    );
}
#[test]
fn first_close_does_not_borrow_restatement_classification_authority() {
    assert_eq!(
        Timing::for_capture("period-end", true, &window()),
        Timing::FirstPeriod(now())
    );
    assert_eq!(
        Timing::for_capture("restated", false, &window()),
        Timing::Restatement
    );
    assert_eq!(
        Timing::for_capture("realtime", false, &window()),
        Timing::Realtime
    );
    assert_ne!(Timing::FirstPeriod(now()), Timing::Restatement);
}

#[test]
fn both_real_public_period_intents_use_the_same_preparation_and_locked_timing() {
    use crate::project_operating_common::model::CreateProjectOperatingSnapshotRequestSnapshotMode;
    let period = OperatingPreparationIntent::PeriodClose {
        period_key: "2026-W45".into(),
    };
    let generic = OperatingPreparationIntent::SnapshotCreate {
        mode: CreateProjectOperatingSnapshotRequestSnapshotMode::PeriodEnd,
        period_key: Some("2026-W45".into()),
    };
    let (c, r) = fixture(true);
    for intent in [period, generic] {
        assert!(super::super::preparation::is_first_period(&intent));
        let actual = Timing::for_intent(&intent, &window());
        assert_eq!(actual, Timing::for_capture("period-end", true, &window()));
        let Timing::FirstPeriod(knowledge) = actual else {
            panic!("first-close intent became realtime");
        };
        assert!(matches!(
            qualify(&c, &r, cutoff(), knowledge).unwrap(),
            Qualification::Eligible(_)
        ));
        assert_ne!(actual, Timing::Restatement);
    }
}

#[test]
fn actual_realtime_and_restatement_intents_keep_their_original_authority() {
    use crate::project_operating_common::model::{
        CreateOperatingRestatementRequestScope, CreateProjectOperatingSnapshotRequestSnapshotMode,
    };
    let realtime = OperatingPreparationIntent::SnapshotCreate {
        mode: CreateProjectOperatingSnapshotRequestSnapshotMode::Realtime,
        period_key: None,
    };
    assert!(!super::super::preparation::is_first_period(&realtime));
    assert_eq!(Timing::for_intent(&realtime, &window()), Timing::Realtime);
    assert_eq!(
        Timing::for_intent(&OperatingPreparationIntent::BaselineActivation, &window()),
        Timing::Realtime
    );
    let reference=serde_json::from_value(json!({"kind":"ProjectOperatingSnapshot","id":uid(1),"expectedVersion":1,"payloadHash":"a".repeat(64)})).unwrap();
    let restatement = OperatingPreparationIntent::Restatement {
        scope: CreateOperatingRestatementRequestScope::Live,
        restates_snapshot: reference,
        period_end_snapshot: None,
        correction_source_refs: vec![],
    };
    assert!(!super::super::preparation::is_first_period(&restatement));
    assert_eq!(
        Timing::for_intent(&restatement, &window()),
        Timing::Restatement
    );
}
