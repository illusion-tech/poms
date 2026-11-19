use super::*;
use serde_json::json;

fn id(n: u128) -> Uuid {
    Uuid::from_u128(n)
}

fn fixture() -> (Catalog, Uuid, Value, OperatingBusinessWindow) {
    let project = id(1);
    let mut catalog = Catalog::default();
    catalog.rows.insert(
        Table::Contract,
        vec![json!({
            "id":id(2),"project_id":project,"created_at":"2026-10-01T00:00:00Z",
            "signed_at":"2026-10-02T00:00:00Z","row_version":1
        })],
    );
    add_package(&mut catalog, project, 3, None);
    let reference = sources::reference(Table::Estimate, &catalog.all(Table::Estimate)[0]).unwrap();
    let draft = json!({"originalCostRef":reference,"currentCostRef":reference,
        "approvedTransitions":[],"handoverBasisRef":null,"handoverRebaselineRef":null});
    let window = OperatingBusinessWindow {
        business_cutoff: "2026-10-31".parse().unwrap(),
        knowledge_cutoff: DateTime::parse_from_rfc3339("2026-11-08T00:00:00Z")
            .unwrap()
            .with_timezone(&Utc),
        source_window_start: None,
        source_window_end: Some("2026-10-31".parse().unwrap()),
        period_key: Some("2026-10".into()),
        business_timezone: "Asia/Hong_Kong".into(),
    };
    (catalog, project, draft, window)
}

fn add_package(catalog: &mut Catalog, project: Uuid, n: u128, parent: Option<Uuid>) {
    let estimate = json!({"id":id(n),"project_id":project,"version":1,"row_version":1,
        "supersedes_id":parent,"created_at":"2026-10-01T00:00:00Z","effective_at":"2026-10-03T00:00:00Z"});
    let preparation = json!({"id":id(n+10),"project_id":project,"contract_id":id(2),
        "source_cost_package_id":id(n),"source_facts":{"cost":{"id":id(n),"version":1}},
        "status":"activated","activated_snapshot_id":id(n+20),"payload_hash":"exact-terms",
        "version":1,"row_version":1,"created_at":"2026-10-03T00:00:00Z","activated_at":"2026-10-05T00:00:00Z"});
    let term = json!({"id":id(n+20),"contract_id":id(2),"source_preparation_id":id(n+10),
        "source_amendment_id":null,"snapshot_status":"active","payload_hash":"exact-terms",
        "version":1,"row_version":1,"created_at":"2026-10-05T00:00:00Z","effective_at":"2026-10-05T00:00:00Z"});
    let binding = json!({"approval_record_id":id(n+30),"preparation_id":id(n+10),
        "preparation_version":1,"contract_id":id(2),"contract_amendment_id":null,
        "payload_hash":"exact-terms","created_at":"2026-10-04T00:00:00Z"});
    let approval = json!({"id":id(n+30),"row_version":1,"approval_type":"contract-review",
        "target_object_id":id(2),"current_status":"approved","created_at":"2026-10-04T00:00:00Z",
        "decided_at":"2026-10-04T01:00:00Z"});
    for (table, row) in [
        (Table::Estimate, estimate),
        (Table::Preparation, preparation),
        (Table::Term, term),
        (Table::ReviewBinding, binding),
        (Table::Approval, approval),
    ] {
        catalog.rows.entry(table).or_default().push(row);
    }
}

fn rejected(result: Result<(), Error>) {
    assert!(matches!(
        result,
        Err(Error::CodedConflict {
            code: "period_baseline_reconciliation_required",
            ..
        })
    ));
}

fn refresh_estimate(catalog: &Catalog, draft: &mut Value) {
    let reference = sources::reference(Table::Estimate, &catalog.all(Table::Estimate)[0]).unwrap();
    draft["originalCostRef"] = reference.clone();
    draft["currentCostRef"] = reference;
}

#[test]
fn real_historical_adoption_allows_later_knowledge_and_g_capture() {
    let (catalog, project, draft, window) = fixture();
    assert!(assert_adoption(&catalog, project, &draft, &window).is_ok());
}

#[test]
fn future_effective_estimate_is_not_turned_into_past_budget() {
    let (mut catalog, project, mut draft, window) = fixture();
    catalog.rows.get_mut(&Table::Estimate).unwrap()[0]["effective_at"] =
        json!("2026-11-01T00:00:00+08:00");
    refresh_estimate(&catalog, &mut draft);
    rejected(assert_adoption(&catalog, project, &draft, &window));
}

#[test]
fn missing_or_invalid_source_time_is_not_implicitly_known() {
    for value in [Value::Null, json!("not-a-time")] {
        let (mut catalog, project, mut draft, window) = fixture();
        catalog.rows.get_mut(&Table::Estimate).unwrap()[0]["created_at"] = value;
        refresh_estimate(&catalog, &mut draft);
        rejected(assert_adoption(&catalog, project, &draft, &window));
    }
}

#[test]
fn knowledge_cutoff_rejects_a_not_yet_known_source() {
    let (mut catalog, project, mut draft, window) = fixture();
    catalog.rows.get_mut(&Table::Estimate).unwrap()[0]["created_at"] =
        json!("2026-11-09T00:00:00Z");
    refresh_estimate(&catalog, &mut draft);
    rejected(assert_adoption(&catalog, project, &draft, &window));
}

#[test]
fn activated_terms_after_business_cutoff_do_not_prove_old_adoption() {
    let (mut catalog, project, draft, window) = fixture();
    catalog.rows.get_mut(&Table::Term).unwrap()[0]["effective_at"] = json!("2026-11-01T00:00:00Z");
    rejected(assert_adoption(&catalog, project, &draft, &window));
}

#[test]
fn preparation_activation_and_approval_decision_must_be_historical() {
    for (table, field) in [
        (Table::Preparation, "activated_at"),
        (Table::Approval, "decided_at"),
    ] {
        let (mut catalog, project, draft, window) = fixture();
        catalog.rows.get_mut(&table).unwrap()[0][field] = json!("2026-11-01T00:00:00Z");
        rejected(assert_adoption(&catalog, project, &draft, &window));
    }
}

#[test]
fn activation_link_and_exact_payload_approval_are_both_required() {
    for (table, field) in [
        (Table::Preparation, "activated_snapshot_id"),
        (Table::ReviewBinding, "payload_hash"),
    ] {
        let (mut catalog, project, draft, window) = fixture();
        catalog.rows.get_mut(&table).unwrap()[0][field] = json!("wrong");
        rejected(assert_adoption(&catalog, project, &draft, &window));
    }
}

#[test]
fn immutable_reference_hash_cannot_be_relabelled() {
    let (catalog, project, mut draft, window) = fixture();
    draft["currentCostRef"]["payloadHash"] = json!("f".repeat(64));
    rejected(assert_adoption(&catalog, project, &draft, &window));
}

#[test]
fn unrelated_project_or_contract_is_not_an_adoption_proof() {
    for table in [Table::Contract, Table::Preparation] {
        let (mut catalog, project, draft, window) = fixture();
        catalog.rows.get_mut(&table).unwrap()[0]["project_id"] = json!(id(999));
        rejected(assert_adoption(&catalog, project, &draft, &window));
    }
}

#[test]
fn hong_kong_day_is_used_at_the_period_boundary() {
    let (mut catalog, project, mut draft, window) = fixture();
    catalog.rows.get_mut(&Table::Estimate).unwrap()[0]["effective_at"] =
        json!("2026-10-31T15:59:59.999999Z");
    refresh_estimate(&catalog, &mut draft);
    assert!(assert_adoption(&catalog, project, &draft, &window).is_ok());
    catalog.rows.get_mut(&Table::Estimate).unwrap()[0]["effective_at"] =
        json!("2026-10-31T16:00:00Z");
    refresh_estimate(&catalog, &mut draft);
    rejected(assert_adoption(&catalog, project, &draft, &window));
}

fn with_successor() -> (Catalog, Uuid, Value, OperatingBusinessWindow) {
    let (mut catalog, project, mut draft, window) = fixture();
    add_package(&mut catalog, project, 50, Some(id(3)));
    let after = sources::reference(Table::Estimate, &catalog.all(Table::Estimate)[1]).unwrap();
    let approvals = [Table::Term, Table::Preparation, Table::ReviewBinding]
        .map(|table| sources::reference(table, &catalog.all(table)[1]).unwrap());
    draft["approvedTransitions"] = json!([{"beforeCostRef":draft["originalCostRef"],
        "afterCostRef":after,"approvalSourceRefs":approvals}]);
    draft["currentCostRef"] = after;
    (catalog, project, draft, window)
}

#[test]
fn exact_historical_successor_chain_is_accepted_without_recalculating_amounts() {
    let (catalog, project, draft, window) = with_successor();
    let unchanged = draft.clone();
    assert!(assert_adoption(&catalog, project, &draft, &window).is_ok());
    assert_eq!(draft, unchanged);
}

#[test]
fn future_successor_is_rejected_without_selecting_the_original_instead() {
    let (mut catalog, project, mut draft, window) = with_successor();
    catalog.rows.get_mut(&Table::Estimate).unwrap()[1]["effective_at"] =
        json!("2026-11-01T00:00:00Z");
    let after = sources::reference(Table::Estimate, &catalog.all(Table::Estimate)[1]).unwrap();
    draft["currentCostRef"] = after.clone();
    draft["approvedTransitions"][0]["afterCostRef"] = after;
    let unchanged = draft.clone();
    rejected(assert_adoption(&catalog, project, &draft, &window));
    assert_eq!(draft, unchanged);
}

#[test]
fn successor_cannot_borrow_another_adoption_binding() {
    let (catalog, project, mut draft, window) = with_successor();
    draft["approvedTransitions"][0]["approvalSourceRefs"] = json!([
        sources::reference(Table::Term, &catalog.all(Table::Term)[0]).unwrap(),
        sources::reference(Table::Preparation, &catalog.all(Table::Preparation)[0]).unwrap(),
        sources::reference(Table::ReviewBinding, &catalog.all(Table::ReviewBinding)[0]).unwrap()
    ]);
    rejected(assert_adoption(&catalog, project, &draft, &window));
}

#[test]
fn future_handover_basis_cannot_supply_historical_business_facts() {
    let (mut catalog, project, mut draft, window) = fixture();
    let row = json!({"id":id(500),"project_id":project,"row_version":1,"generated_at":"2026-11-01T00:00:00Z"});
    draft["handoverBasisRef"] = sources::reference(Table::HandoverBasis, &row).unwrap();
    catalog.rows.insert(Table::HandoverBasis, vec![row]);
    rejected(assert_adoption(&catalog, project, &draft, &window));
}
