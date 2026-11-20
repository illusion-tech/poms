use super::*;

// Final's source-based counterexamples. All facts below are synthetic pure
// tests in the002 author revision; none are inserted into Root's databases.
fn amended_adoption002(c: &mut Catalog, p: Uuid) {
    budget273(c, p, 20, 2, Some(10), "150.00", "2026-10-08T00:00:00Z");
    adopted273(c, p, 20, 2, 200, "2026-10-10T00:00:00Z");
    c.rows
        .get_mut(&Table::Contract)
        .unwrap()
        .retain(|r| r["id"] != uid273(200).to_string());
    let prep = &mut c.rows.get_mut(&Table::Preparation).unwrap()[1];
    prep["contract_id"] = json!(uid273(100));
    prep["version"] = json!(2);
    prep["contract_amendment_id"] = json!(uid273(920));
    let term = &mut c.rows.get_mut(&Table::Term).unwrap()[1];
    term["contract_id"] = json!(uid273(100));
    term["version"] = json!(2);
    term["source_amendment_id"] = json!(uid273(920));
    let binding = &mut c.rows.get_mut(&Table::ReviewBinding).unwrap()[1];
    binding["contract_id"] = json!(uid273(100));
    binding["preparation_version"] = json!(2);
    binding["contract_amendment_id"] = json!(uid273(920));
    c.rows.get_mut(&Table::Approval).unwrap()[1]["target_object_id"] = json!(uid273(100));
}
fn inherited_rebaseline002() -> (Catalog, Uuid, OperatingBusinessWindow) {
    let (mut c, p, w) = fixture273();
    amended_adoption002(&mut c, p);
    handover273_fixture(&mut c, p, 500, 10, 100, "2026-10-06T00:00:00Z", None);
    handover273_fixture(&mut c, p, 600, 20, 200, "2026-10-18T00:00:00Z", Some(500));
    handover273_fixture(&mut c, p, 800, 20, 200, "2026-10-19T00:00:00Z", Some(600));
    for (i, anchor) in [(0, 102), (1, 202), (2, 202)] {
        c.rows.get_mut(&Table::Handover).unwrap()[i]["effective_handover_baseline_snapshot_id"] =
            json!(uid273(anchor));
        let payload = &mut c.rows.get_mut(&Table::HandoverBasis).unwrap()[i]["source_payload"];
        payload["members"][0]["contractId"] = json!(uid273(100));
        let payload = payload.clone();
        c.rows.get_mut(&Table::HandoverBasis).unwrap()[i]["payload_hash"] =
            json!(canonical_hash(&payload).unwrap());
    }
    c.rows.get_mut(&Table::Handover).unwrap()[1]["confirmed_at"] = Value::Null;
    c.rows.get_mut(&Table::Handover).unwrap()[1]["handover_rebaseline_record_id"] =
        json!(uid273(700));
    c.rows.get_mut(&Table::Handover).unwrap()[2]["confirmed_at"] = json!("2026-10-20T00:00:00Z");
    c.rows.get_mut(&Table::Handover).unwrap()[2]["version"] = json!(3);
    c.rows.get_mut(&Table::HandoverBasis).unwrap()[2]["version"] = json!(3);
    c.rows.get_mut(&Table::Handover).unwrap()[2]["handover_rebaseline_record_id"] =
        json!(uid273(700));
    c.rows.entry(Table::Rebaseline).or_default().push(json!({"id":uid273(700),"project_id":p,"row_version":1,"producer_version":1,"status":"effective","source_handover_id":uid273(500),"replacement_handover_id":uid273(600),"basis_before_id":uid273(501),"basis_after_id":uid273(601),"effective_baseline_after_id":uid273(202),"contract_amendment_id":uid273(920),"handled_at":"2026-10-18T00:00:00Z","created_at":"2026-10-18T00:00:00Z","supersedes_id":null}));
    (c, p, w)
}
#[test]
fn regression002_real_draft_refresh_keeps_original_rebaseline_anchor() {
    let (c, p, w) = inherited_rebaseline002();
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.proof.handover_ref.unwrap().id, uid273(800));
    assert_eq!(s.proof.handover_basis_ref.unwrap().id, uid273(801));
    assert_eq!(s.proof.handover_rebaseline_ref.unwrap().id, uid273(700));
    assert_eq!(s.current.decimal_string(), "150.00");
}
#[test]
fn regression002_handover_creation_cannot_follow_confirmation() {
    let (mut c, p, w) = fixture273();
    handover273_fixture(&mut c, p, 500, 10, 100, "2026-10-06T00:00:00Z", None);
    c.rows.get_mut(&Table::Handover).unwrap()[0]["created_at"] = json!("2026-11-05T00:00:00Z");
    assert!(select(&c, p, &w).is_err());
}
#[test]
fn regression002_rebaseline_creation_cannot_follow_handling() {
    let (mut c, p, w) = inherited_rebaseline002();
    // Use the direct anchor as terminal so this case isolates the clock guard
    // rather than the independent inherited-anchor false rejection.
    c.rows.get_mut(&Table::Handover).unwrap().pop();
    c.rows.get_mut(&Table::HandoverBasis).unwrap().pop();
    c.rows.get_mut(&Table::Handover).unwrap()[1]["confirmed_at"] = json!("2026-10-20T00:00:00Z");
    c.rows.get_mut(&Table::Rebaseline).unwrap()[0]["created_at"] = json!("2026-11-05T00:00:00Z");
    assert!(select(&c, p, &w).is_err());
}

#[test]
fn regression002_missing_foreign_or_cyclic_rebaseline_supersedes_is_rejected() {
    let (c, p, w) = inherited_rebaseline002();
    let mut missing = c.clone();
    missing.rows.get_mut(&Table::Rebaseline).unwrap()[0]["supersedes_id"] = json!(uid273(999));
    assert!(select(&missing, p, &w).is_err());
    let mut cycle = c.clone();
    cycle.rows.get_mut(&Table::Rebaseline).unwrap()[0]["supersedes_id"] = json!(uid273(700));
    cycle.rows.get_mut(&Table::Handover).unwrap()[0]["handover_rebaseline_record_id"] =
        json!(uid273(700));
    assert!(select(&cycle, p, &w).is_err());
    let mut foreign = c;
    let mut parent = foreign.all(Table::Rebaseline)[0].clone();
    parent["id"] = json!(uid273(999));
    parent["project_id"] = json!(uid273(9999));
    foreign.rows.get_mut(&Table::Rebaseline).unwrap()[0]["supersedes_id"] = json!(uid273(999));
    foreign.rows.get_mut(&Table::Handover).unwrap()[0]["handover_rebaseline_record_id"] =
        json!(uid273(999));
    foreign
        .rows
        .get_mut(&Table::Rebaseline)
        .unwrap()
        .push(parent);
    assert!(select(&foreign, p, &w).is_err());
}

#[test]
fn regression002_inherited_record_cannot_be_dropped_or_retargeted() {
    let (mut c, p, w) = inherited_rebaseline002();
    let original = c.all(Table::Rebaseline)[0].clone();
    let selected = select(&c, p, &w).unwrap();
    assert_eq!(c.all(Table::Rebaseline)[0], original);
    assert_eq!(
        selected
            .proof
            .handover_lineage
            .as_ref()
            .unwrap()
            .handover_links
            .len(),
        3
    );
    assert_eq!(
        selected
            .proof
            .handover_lineage
            .as_ref()
            .unwrap()
            .rebaseline_links
            .len(),
        1
    );
    c.rows.get_mut(&Table::Handover).unwrap()[2]["handover_rebaseline_record_id"] = Value::Null;
    assert!(select(&c, p, &w).is_err());
    c.rows.get_mut(&Table::Handover).unwrap()[2]["handover_rebaseline_record_id"] =
        json!(uid273(700));
    c.rows.get_mut(&Table::Rebaseline).unwrap()[0]["basis_after_id"] = json!(uid273(801));
    assert!(select(&c, p, &w).is_err());
}

#[test]
fn regression002_ordinary_confirmed_refresh_does_not_invent_a_rebaseline() {
    let (mut c, p, w) = fixture273();
    handover273_fixture(&mut c, p, 500, 10, 100, "2026-10-06T00:00:00Z", None);
    handover273_fixture(&mut c, p, 600, 10, 100, "2026-10-08T00:00:00Z", Some(500));
    c.rows.get_mut(&Table::Handover).unwrap()[1]["source_payload_hash"] = json!("d".repeat(64));
    c.rows.get_mut(&Table::HandoverBasis).unwrap()[1]["source_hash"] = json!("d".repeat(64));
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.proof.handover_ref.unwrap().id, uid273(600));
    assert!(s.proof.handover_rebaseline_ref.is_none());
    assert!(
        s.proof
            .handover_lineage
            .unwrap()
            .rebaseline_links
            .is_empty()
    );
}

#[test]
fn regression002_two_real_rebaselines_with_intermediate_refresh_form_one_chain() {
    let (mut c, p, w) = inherited_rebaseline002();
    budget273(&mut c, p, 30, 3, Some(20), "180.00", "2026-10-21T00:00:00Z");
    adopted273(&mut c, p, 30, 3, 300, "2026-10-22T00:00:00Z");
    c.rows
        .get_mut(&Table::Contract)
        .unwrap()
        .retain(|r| r["id"] != uid273(300).to_string());
    let prep = &mut c.rows.get_mut(&Table::Preparation).unwrap()[2];
    prep["contract_id"] = json!(uid273(100));
    prep["version"] = json!(3);
    let term = &mut c.rows.get_mut(&Table::Term).unwrap()[2];
    term["contract_id"] = json!(uid273(100));
    term["version"] = json!(3);
    term["source_amendment_id"] = json!(uid273(930));
    let binding = &mut c.rows.get_mut(&Table::ReviewBinding).unwrap()[2];
    binding["contract_id"] = json!(uid273(100));
    binding["preparation_version"] = json!(3);
    binding["contract_amendment_id"] = json!(uid273(930));
    c.rows.get_mut(&Table::Approval).unwrap()[2]["target_object_id"] = json!(uid273(100));
    handover273_fixture(&mut c, p, 1000, 30, 300, "2026-10-24T00:00:00Z", Some(800));
    c.rows.get_mut(&Table::Handover).unwrap()[3]["version"] = json!(4);
    c.rows.get_mut(&Table::HandoverBasis).unwrap()[3]["version"] = json!(4);
    c.rows.get_mut(&Table::Handover).unwrap()[3]["handover_rebaseline_record_id"] =
        json!(uid273(1100));
    c.rows.get_mut(&Table::Handover).unwrap()[3]["confirmed_at"] = json!("2026-10-25T00:00:00Z");
    c.rows.get_mut(&Table::Rebaseline).unwrap()[0]["status"] = json!("superseded");
    c.rows.get_mut(&Table::Rebaseline).unwrap()[0]["row_version"] = json!(2);
    c.rows.get_mut(&Table::Rebaseline).unwrap().push(json!({"id":uid273(1100),"project_id":p,"row_version":1,"producer_version":1,"status":"effective","source_handover_id":uid273(800),"replacement_handover_id":uid273(1000),"contract_amendment_id":uid273(930),"basis_before_id":uid273(801),"basis_after_id":uid273(1001),"effective_baseline_after_id":uid273(302),"handled_at":"2026-10-24T00:00:00Z","created_at":"2026-10-24T00:00:00Z","supersedes_id":uid273(700)}));
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.current.decimal_string(), "180.00");
    assert_eq!(s.handover.decimal_string(), "180.00");
    assert_eq!(
        s.proof
            .handover_lineage
            .as_ref()
            .unwrap()
            .rebaseline_links
            .len(),
        2
    );
    assert_eq!(
        s.proof
            .handover_lineage
            .as_ref()
            .unwrap()
            .handover_links
            .len(),
        4
    );
    c.rows.get_mut(&Table::Rebaseline).unwrap()[0]["handled_at"] = json!("2026-10-26T00:00:00Z");
    assert!(select(&c, p, &w).is_err());
}

fn frozen_budget_source002(
    c: &mut Catalog,
    p: Uuid,
    w: &OperatingBusinessWindow,
    as_effective: bool,
) {
    let mut captured = c.clone();
    if as_effective {
        let r = &mut captured.rows.get_mut(&Table::Estimate).unwrap()[0];
        r["status"] = json!("effective");
        r["is_current"] = json!(true);
        r["row_version"] = json!(1);
    }
    let draft = select(&captured, p, w)
        .unwrap()
        .draft(uid273(5000), p)
        .unwrap();
    let payload = serde_json::to_value(&draft).unwrap();
    let original = c.find(Table::Estimate, draft.original_cost_ref.id).unwrap()["version"].clone();
    let current = c.find(Table::Estimate, draft.current_cost_ref.id).unwrap()["version"].clone();
    c.rows.entry(Table::BaselineSource).or_default().push(json!({"id":draft.id,"project_id":p,"producer_version":1,"row_version":1,"original_cost_package_id":draft.original_cost_ref.id,"original_cost_package_version":original,"current_cost_package_id":draft.current_cost_ref.id,"current_cost_package_version":current,"currency":draft.currency,"approved_transitions":payload["approvedTransitions"],"source_hash":draft.source_hash,"payload_hash":draft.payload_hash,"frozen_payload":payload,"captured_at":"2026-11-05T00:00:00Z"}));
}

#[test]
fn regression002_saved_g_economics_allow_only_verified_single_supersede() {
    let (mut c, p, w) = fixture273();
    frozen_budget_source002(&mut c, p, &w, true);
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.proof.frozen_economic_witnesses.len(), 1);
    let witness = &s.proof.frozen_economic_witnesses[0];
    assert_eq!(
        witness.comparison_mode,
        "verified-single-supersede-lifecycle"
    );
    assert_eq!(witness.recorded_cost_row_version, 1);
    assert_eq!(witness.observed_cost_ref.row_version, 2);
    assert_eq!(witness.baseline_source_ref.kind, "OperatingBaselineSource");
    c.rows.get_mut(&Table::Estimate).unwrap()[0]["row_version"] = json!(3);
    assert!(select(&c, p, &w).is_err());
}

#[test]
fn regression002_existing_frozen_net_currency_and_tax_gross_conflicts_block() {
    let (mut c, p, w) = fixture273();
    frozen_budget_source002(&mut c, p, &w, false);
    assert_eq!(
        select(&c, p, &w).unwrap().proof.frozen_economic_witnesses[0].comparison_mode,
        "exact-observed-ref"
    );
    for mode in 0..3 {
        let mut changed = c.clone();
        let r = &mut changed.rows.get_mut(&Table::Estimate).unwrap()[0];
        match mode {
            0 => {
                r["total_estimated_amount_excluding_tax"] = json!("101.00");
                r["total_estimated_amount_including_tax"] = json!("101.00");
            }
            1 => r["currency_code"] = json!("USD"),
            _ => {
                r["total_tax_cost_amount"] = json!("10.00");
                r["total_estimated_amount_including_tax"] = json!("110.00");
            }
        }
        assert!(select(&changed, p, &w).is_err(), "conflict mode {mode}");
    }
}

#[test]
fn regression002_no_g_package_is_not_a_missing_historical_budget() {
    let (c, p, w) = fixture273();
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.current.decimal_string(), "100.00");
    assert!(s.proof.frozen_economic_witnesses.is_empty());
}

#[test]
fn synthetic273_absent_internal_proof_preserves_old_frozen_json_and_hash() {
    let (catalog, project, window) = fixture273();
    let mut draft = select(&catalog, project, &window)
        .unwrap()
        .draft(uid273(999), project)
        .unwrap();
    draft.historical_period_selection = None;
    let original = serde_json::to_value(&draft).unwrap();
    assert!(original.get("historicalPeriodSelection").is_none());
    let old_hash = canonical_hash(&original).unwrap();
    let reread: OperatingBaselineSourceDraft = serde_json::from_value(original.clone()).unwrap();
    let after = serde_json::to_value(reread).unwrap();
    assert_eq!(after, original);
    assert_eq!(canonical_hash(&after).unwrap(), old_hash);
}

//273 fixtures below are explicitly synthetic unit facts, not PG/HTTP history.
fn uid273(n: u128) -> Uuid {
    Uuid::from_u128(n)
}
fn fixture273() -> (Catalog, Uuid, OperatingBusinessWindow) {
    let project = uid273(1);
    let window = OperatingBusinessWindow {
        business_cutoff: chrono::NaiveDate::from_ymd_opt(2026, 11, 1).unwrap(),
        knowledge_cutoff: "2026-11-09T10:00:00Z".parse().unwrap(),
        source_window_start: None,
        source_window_end: Some(chrono::NaiveDate::from_ymd_opt(2026, 11, 1).unwrap()),
        period_key: Some("2026-W44".into()),
        business_timezone: "Asia/Hong_Kong".into(),
    };
    let mut catalog = Catalog::default();
    budget273(
        &mut catalog,
        project,
        10,
        1,
        None,
        "100.00",
        "2026-10-01T00:00:00Z",
    );
    adopted273(&mut catalog, project, 10, 1, 100, "2026-10-05T00:00:00Z");
    (catalog, project, window)
}
fn budget273(
    c: &mut Catalog,
    project: Uuid,
    n: u128,
    version: i32,
    parent: Option<u128>,
    amount: &str,
    at: &str,
) {
    c.rows.entry(Table::Estimate).or_default().push(json!({"id":uid273(n),"project_id":project,"version":version,"row_version":2,"status":"superseded","is_current":false,"supersedes_id":parent.map(uid273),"currency_code":"CNY","total_estimated_amount_excluding_tax":amount,"total_tax_cost_amount":"0.00","total_estimated_amount_including_tax":amount,"effective_at":at,"created_at":at}));
}
fn adopted273(c: &mut Catalog, project: Uuid, cost: u128, version: i32, n: u128, at: &str) {
    let (contract, prep, term, approval) = (uid273(n), uid273(n + 1), uid273(n + 2), uid273(n + 3));
    c.rows.entry(Table::Contract).or_default().push(json!({"id":contract,"project_id":project,"row_version":1,"status":"active","created_at":at,"signed_at":at}));
    c.rows.entry(Table::Preparation).or_default().push(json!({"id":prep,"project_id":project,"contract_id":contract,"version":1,"row_version":2,"status":"activated","is_current":false,"source_cost_package_id":uid273(cost),"source_facts":{"cost":{"id":uid273(cost),"version":version,"rowVersion":1}},"activated_snapshot_id":term,"payload_hash":"b".repeat(64),"created_at":at,"activated_at":at}));
    c.rows.entry(Table::Term).or_default().push(json!({"id":term,"contract_id":contract,"version":1,"row_version":2,"snapshot_status":"superseded","source_preparation_id":prep,"source_amendment_id":null,"payload_hash":"b".repeat(64),"created_at":at,"effective_at":at}));
    c.rows.entry(Table::ReviewBinding).or_default().push(json!({"id":approval,"approval_record_id":approval,"preparation_id":prep,"preparation_version":1,"row_version":1,"contract_id":contract,"contract_amendment_id":null,"payload_hash":"b".repeat(64),"created_at":at}));
    c.rows.entry(Table::Approval).or_default().push(json!({"id":approval,"row_version":1,"current_status":"approved","target_object_id":contract,"approval_type":"contract-review","created_at":at,"decided_at":at}));
}

fn handover273_fixture(
    c: &mut Catalog,
    project: Uuid,
    n: u128,
    budget: u128,
    adoption: u128,
    at: &str,
    parent: Option<u128>,
) {
    let payload = json!({"projectId":project,"members":[{"contractId":c.find(Table::Term,uid273(adoption+2)).unwrap()["contract_id"],"snapshotId":uid273(adoption+2),"preparationId":uid273(adoption+1),"reviewApprovalId":uid273(adoption+3),"sourceFacts":{"cost":{"id":uid273(budget),"version":c.find(Table::Estimate,uid273(budget)).unwrap()["version"],"rowVersion":1}}}]});
    c.rows.entry(Table::HandoverBasis).or_default().push(json!({"id":uid273(n+1),"project_id":project,"row_version":1,"version":if parent.is_some(){2}else{1},"supersedes_id":parent.map(|p|uid273(p+1)),"status":"superseded","generated_at":at,"source_hash":"c".repeat(64),"payload_hash":canonical_hash(&payload).unwrap(),"source_payload":payload}));
    c.rows.entry(Table::Handover).or_default().push(json!({"id":uid273(n),"project_id":project,"row_version":2,"version":if parent.is_some(){2}else{1},"supersedes_id":parent.map(uid273),"status":"superseded","producer_version":1,"basis_snapshot_id":uid273(n+1),"effective_handover_baseline_snapshot_id":uid273(adoption+2),"confirmation_record_id":uid273(n+2),"created_at":at,"confirmed_at":at,"source_payload_hash":"c".repeat(64),"handover_rebaseline_record_id":null}));
}

fn execution273_fixture(c: &mut Catalog, project: Uuid, handover: u128, at: &str) {
    let payload = json!({"schemaVersion":1,"projectId":project,"fromStage":"handover","toStage":"execution","sourceHandoverId":uid273(handover),"commissionRoleAssignmentId":uid273(900)});
    c.rows.entry(Table::ProjectStage).or_default().push(json!({"id":uid273(901),"project_id":project,"sequence_no":2,"producer_version":1,"event_type":"stage-entered","from_stage":"handover","to_stage":"execution","source_handover_id":uid273(handover),"source_role_assignment_id":uid273(900),"entered_at":at,"created_at":at,"source_payload_hash":canonical_hash(&payload).unwrap(),"source_payload":payload}));
}

#[test]
fn synthetic273_execution_changes_use_real_adoption_time_not_earlier_budget_release() {
    let (mut c, p, w) = fixture273();
    handover273_fixture(&mut c, p, 500, 10, 100, "2026-10-06T00:00:00Z", None);
    execution273_fixture(&mut c, p, 500, "2026-10-07T00:00:00Z");
    budget273(&mut c, p, 20, 2, Some(10), "150.00", "2026-10-02T00:00:00Z");
    adopted273(&mut c, p, 20, 2, 200, "2026-10-10T00:00:00Z");
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.current.decimal_string(), "150.00");
    assert_eq!(s.handover.decimal_string(), "100.00");
    assert_eq!(s.execution.decimal_string(), "50.00");
    assert_eq!(s.proof.handover_ref.as_ref().unwrap().id, uid273(500));
    assert!(s.proof.handover_rebaseline_ref.is_none());
    assert_eq!(
        s.proof.execution_stage_ref.as_ref().unwrap().id,
        uid273(901)
    );
}

#[test]
fn synthetic273_execution_witness_must_match_payload_and_exact_project() {
    let (mut c, p, w) = fixture273();
    handover273_fixture(&mut c, p, 500, 10, 100, "2026-10-06T00:00:00Z", None);
    execution273_fixture(&mut c, p, 500, "2026-10-07T00:00:00Z");
    c.rows.get_mut(&Table::ProjectStage).unwrap()[0]["source_role_assignment_id"] =
        json!(uid273(999));
    assert!(select(&c, p, &w).is_err());
    c.rows.get_mut(&Table::ProjectStage).unwrap()[0]["project_id"] = json!(uid273(2));
    assert!(
        select(&c, p, &w)
            .unwrap()
            .proof
            .execution_stage_ref
            .is_none()
    );
}

#[test]
fn synthetic273_handover_cannot_borrow_a_budget_adopted_only_after_its_basis() {
    let (mut c, p, w) = fixture273();
    handover273_fixture(&mut c, p, 500, 10, 100, "2026-10-04T00:00:00Z", None);
    assert!(select(&c, p, &w).is_err());
}

#[test]
fn synthetic273_future_handover_and_rebaseline_cannot_replace_period_handover() {
    let (mut c, p, w) = fixture273();
    handover273_fixture(&mut c, p, 500, 10, 100, "2026-10-06T00:00:00Z", None);
    handover273_fixture(&mut c, p, 600, 10, 100, "2026-11-05T00:00:00Z", Some(500));
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.proof.handover_ref.unwrap().id, uid273(500));
    assert!(s.proof.handover_rebaseline_ref.is_none());
}

#[test]
fn synthetic273_actual_rebaseline_has_exact_before_after_and_historical_status() {
    let (mut c, p, w) = fixture273();
    handover273_fixture(&mut c, p, 500, 10, 100, "2026-10-06T00:00:00Z", None);
    amended_adoption002(&mut c, p);
    handover273_fixture(&mut c, p, 600, 20, 200, "2026-10-18T00:00:00Z", Some(500));
    assert!(select(&c, p, &w).is_err());
    c.rows.get_mut(&Table::Handover).unwrap()[1]["confirmed_at"] = json!("2026-10-20T00:00:00Z");
    c.rows.get_mut(&Table::Handover).unwrap()[1]["handover_rebaseline_record_id"] =
        json!(uid273(700));
    c.rows.entry(Table::Rebaseline).or_default().push(json!({"id":uid273(700),"project_id":p,"row_version":2,"producer_version":1,"status":"superseded","source_handover_id":uid273(500),"replacement_handover_id":uid273(600),"contract_amendment_id":uid273(920),"effective_baseline_after_id":uid273(202),"supersedes_id":null,"basis_before_id":uid273(501),"basis_after_id":uid273(601),"handled_at":"2026-10-19T00:00:00Z","created_at":"2026-10-19T00:00:00Z"}));
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.handover.decimal_string(), "150.00");
    assert_eq!(s.proof.handover_rebaseline_ref.unwrap().id, uid273(700));
    c.rows.get_mut(&Table::Rebaseline).unwrap()[0]["basis_before_id"] = json!(uid273(999));
    assert!(select(&c, p, &w).is_err());
}

#[test]
fn synthetic273_approval_after_activation_is_not_an_old_adoption() {
    let (mut c, p, w) = fixture273();
    c.rows.get_mut(&Table::Approval).unwrap()[0]["decided_at"] = json!("2026-11-06T00:00:00Z");
    assert!(select(&c, p, &w).is_err());
}

#[test]
fn synthetic273_unproved_revocation_blocks_without_reconstructing_old_status() {
    let (mut c, p, w) = fixture273();
    c.rows.get_mut(&Table::Contract).unwrap()[0]["status"] = json!("void");
    assert!(select(&c, p, &w).is_err());
}

#[test]
fn regression002_recording_time_is_not_the_cost_or_term_business_effective_time() {
    let (mut c, p, w) = fixture273();
    c.rows.get_mut(&Table::Estimate).unwrap()[0]["created_at"] = json!("2026-10-01T00:00:00.001Z");
    c.rows.get_mut(&Table::Term).unwrap()[0]["created_at"] = json!("2026-10-05T00:00:00.001Z");
    assert_eq!(
        select(&c, p, &w).unwrap().current.decimal_string(),
        "100.00"
    );
    c.rows.get_mut(&Table::Term).unwrap()[0]["created_at"] = json!("2026-11-10T00:00:00Z");
    assert!(select(&c, p, &w).is_err());
}

#[test]
fn synthetic273_hong_kong_period_boundary_excludes_next_business_day() {
    let (mut c, p, w) = fixture273();
    budget273(&mut c, p, 20, 2, Some(10), "150.00", "2026-11-01T15:59:59Z");
    adopted273(&mut c, p, 20, 2, 200, "2026-11-01T16:00:00Z");
    assert_eq!(
        select(&c, p, &w).unwrap().proof.selected_cost_ref.id,
        uid273(10)
    );
}

#[test]
fn synthetic273_late_capture_has_no_fake_g_identity_and_preserves_real_old_lifecycle() {
    let (c, p, w) = fixture273();
    let selected = select(&c, p, &w).unwrap();
    assert!(c.all(Table::Baseline).is_empty());
    assert_eq!(selected.proof.selected_cost_ref.id, uid273(10));
    assert_eq!(selected.proof.selected_cost_ref.row_version, 2);
    assert_eq!(
        selected.proof.observed_adoptions[0].recorded_cost_row_version,
        1
    );
    let view = serde_json::to_value(selected.public_selection().unwrap()).unwrap();
    assert!(view.get("id").is_none());
    assert!(view.get("baselinePackageRef").is_none());
    assert_eq!(view["publicationMode"], "new-period-package");
    let draft = selected.draft(uid273(999), p).unwrap();
    assert_eq!(
        draft.current_effective_baseline_cost.decimal_string(),
        "100.00"
    );
    assert!(draft.historical_period_selection.is_some());
}
#[test]
fn synthetic273_unique_successor_and_many_contracts_same_budget_are_not_ambiguous() {
    let (mut c, p, w) = fixture273();
    budget273(&mut c, p, 20, 2, Some(10), "125.50", "2026-10-10T00:00:00Z");
    adopted273(&mut c, p, 20, 2, 200, "2026-10-12T00:00:00Z");
    adopted273(&mut c, p, 20, 2, 300, "2026-10-13T00:00:00Z");
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.proof.selected_cost_ref.id, uid273(20));
    assert_eq!(s.transitions.len(), 1);
    assert_eq!(s.current.decimal_string(), "125.50");
    assert_eq!(s.changes.decimal_string(), "25.50");
}
#[test]
fn synthetic273_future_current_budget_and_future_fork_do_not_displace_past_choice() {
    let (mut c, p, w) = fixture273();
    for (n, parent) in [(20, 10), (30, 10)] {
        budget273(
            &mut c,
            p,
            n,
            n as i32,
            Some(parent),
            "150.00",
            "2026-11-05T00:00:00Z",
        );
        adopted273(&mut c, p, n, n as i32, n * 100, "2026-11-06T00:00:00Z");
    }
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.proof.selected_cost_ref.id, uid273(10));
    assert!(s.transitions.is_empty());
    assert_eq!(s.proof.excluded_adoption_candidates.len(), 2);
    assert!(
        s.proof
            .excluded_adoption_candidates
            .iter()
            .all(|candidate| candidate.reason_code == "term-effective-after-period")
    );
}

#[test]
fn synthetic273_preparation_hash_cas_binds_activation_time_omitted_by_legacy_row_hash() {
    let (mut c, p, w) = fixture273();
    let intent = OperatingPreparationIntent::PeriodClose {
        period_key: w.period_key.clone().unwrap(),
    };
    let project = json!({"id":p,"row_version":3});
    let row_before = sources::reference(Table::Preparation, &c.all(Table::Preparation)[0]).unwrap();
    let first = super::super::preparation::input_hash(p, &intent, &w, &project, &c, &[]).unwrap();
    let mut later = w.clone();
    later.knowledge_cutoff = "2026-11-10T00:00:00Z".parse().unwrap();
    assert_eq!(
        first,
        super::super::preparation::input_hash(p, &intent, &later, &project, &c, &[]).unwrap()
    );
    c.rows.get_mut(&Table::Preparation).unwrap()[0]["activated_at"] = json!("2026-10-05T00:00:01Z");
    assert_eq!(
        sources::reference(Table::Preparation, &c.all(Table::Preparation)[0]).unwrap(),
        row_before
    );
    assert_ne!(
        first,
        super::super::preparation::input_hash(p, &intent, &w, &project, &c, &[]).unwrap()
    );
}
#[test]
fn synthetic273_current_fork_blocks_without_date_or_uuid_tiebreak() {
    let (mut c, p, w) = fixture273();
    for (n, at) in [(20, "2026-10-10T00:00:00Z"), (30, "2026-10-11T00:00:00Z")] {
        budget273(&mut c, p, n, n as i32, Some(10), "150.00", at);
        adopted273(&mut c, p, n, n as i32, n * 100, at);
    }
    assert!(select(&c, p, &w).is_err());
}
#[test]
fn synthetic273_unadopted_middle_version_is_path_only_not_an_extra_change() {
    let (mut c, p, w) = fixture273();
    budget273(&mut c, p, 20, 2, Some(10), "110.00", "2026-10-10T00:00:00Z");
    budget273(&mut c, p, 30, 3, Some(20), "140.00", "2026-10-11T00:00:00Z");
    adopted273(&mut c, p, 30, 3, 200, "2026-10-12T00:00:00Z");
    let s = select(&c, p, &w).unwrap();
    assert_eq!(s.transitions.len(), 1);
    assert_eq!(s.proof.chain_segments[0].technical_path_refs.len(), 3);
    assert_eq!(s.changes.decimal_string(), "40.00");
}
#[test]
fn synthetic273_broken_parent_and_cycle_fail_closed() {
    let (mut c, p, w) = fixture273();
    c.rows.get_mut(&Table::Estimate).unwrap()[0]["supersedes_id"] = json!(uid273(999));
    assert!(select(&c, p, &w).is_err());
    c.rows.get_mut(&Table::Estimate).unwrap()[0]["supersedes_id"] = json!(uid273(10));
    assert!(select(&c, p, &w).is_err());
}
#[test]
fn synthetic273_missing_decision_or_unknown_revocation_does_not_fall_back() {
    let (mut c, p, w) = fixture273();
    c.rows.get_mut(&Table::Approval).unwrap()[0]["current_status"] = json!("cancelled");
    assert!(select(&c, p, &w).is_err());
    c.rows.get_mut(&Table::Approval).unwrap()[0]["current_status"] = json!("approved");
    c.rows.get_mut(&Table::Approval).unwrap()[0]["decided_at"] = Value::Null;
    assert!(select(&c, p, &w).is_err());
}
#[test]
fn synthetic273_selection_hash_ignores_observation_clock_but_binds_true_source_dates() {
    let (mut c, p, w) = fixture273();
    let mut later = w.clone();
    later.knowledge_cutoff = "2026-11-10T10:00:00Z".parse().unwrap();
    assert_eq!(
        select(&c, p, &w).unwrap().proof.selection_hash,
        select(&c, p, &later).unwrap().proof.selection_hash
    );
    let hash = select(&c, p, &w).unwrap().proof.selection_hash;
    c.rows.get_mut(&Table::Approval).unwrap()[0]["decided_at"] = json!("2026-10-04T23:59:59Z");
    c.rows.get_mut(&Table::Approval).unwrap()[0]["created_at"] = json!("2026-10-04T23:59:58Z");
    assert_ne!(select(&c, p, &w).unwrap().proof.selection_hash, hash);
}
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
