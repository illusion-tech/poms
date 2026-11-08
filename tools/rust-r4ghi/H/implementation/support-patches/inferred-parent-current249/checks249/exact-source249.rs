#![allow(dead_code)]
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub(crate) enum Table {
    HandoverBasis,
    Handover,
    Rebaseline,
    Head,
    Baseline,
    BaselineSource,
    Contract,
    Term,
    Preparation,
    ReviewBinding,
    Approval,
    Commercial,
    Estimate,
    Receipt,
    ReceiptBasis,
    Rate,
    Payable,
    Payment,
    Invoice,
    Expense,
    ProjectStage,
    Attachment,
    AttachmentLink,
    AllocationBasis,
    AllocationResult,
    AllocationSource,
    Cost,
    Evidence,
    Stage,
    Tax,
    Decision,
    DecisionHead,
    Context,
    Snapshot,
    Period,
    Restatement,
    CostMember,
    SourceMember,
}

mod sources {
    use super::*;
    #[derive(Default, Clone)]
    pub(crate) struct Catalog {
        pub rows: BTreeMap<Table, Vec<Value>>,
    }

    impl Catalog {
        pub(crate) fn all(&self, table: Table) -> &[Value] {
            self.rows.get(&table).map(Vec::as_slice).unwrap_or(&[])
        }
        pub(crate) fn find(&self, table: Table, id: Uuid) -> Option<&Value> {
            self.all(table).iter().find(|r| r["id"] == id.to_string())
        }
    }
}
// Automatic Stage roots represent a currently usable Cost. Historical Stage
// rows remain available to explicit correction roots and impact discovery.
const INFERRED_CURRENT_COST_STATUSES: &[&str] = &["registered", "confirmed", "included"];

fn inferred_late_source_is_current(reference: &Value, catalog: &sources::Catalog) -> bool {
    let Some(id) = reference["id"]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
    else {
        return false;
    };
    let (table, field, allowed) = match reference["kind"].as_str() {
        Some("ProjectActualCostRecord") => {
            (Table::Cost, "record_status", INFERRED_CURRENT_COST_STATUSES)
        }
        Some("ContractTermSnapshot") => (Table::Term, "snapshot_status", &["active"][..]),
        Some("Contract") => (Table::Contract, "status", &["active"][..]),
        Some("ReceiptRecord") => (
            Table::Receipt,
            "status",
            &["pending-confirmation", "confirmed"][..],
        ),
        Some("SharedCostAllocationBasis") => {
            (Table::AllocationBasis, "status", &["active", "pending"][..])
        }
        Some("SharedCostAllocationResult") => (
            Table::AllocationResult,
            "status",
            &["active", "pending"][..],
        ),
        Some("CostStageAttributionSnapshot") => {
            let Some(stage) = catalog.find(Table::Stage, id) else {
                return false;
            };
            // The caller loads the complete source catalog. An absent/invalid
            // parent cannot authorize an automatically inferred correction.
            let parent = stage["cost_record_id"]
                .as_str()
                .and_then(|s| Uuid::parse_str(s).ok())
                .and_then(|cost_id| catalog.find(Table::Cost, cost_id));
            return stage["status"] == "active"
                && parent
                    .and_then(|cost| cost["record_status"].as_str())
                    .is_some_and(|status| INFERRED_CURRENT_COST_STATUSES.contains(&status));
        }
        // Tax assessments also permit manual/non-Cost evidence. Their existing
        // active/pending rule is independent of Stage's parent qualification.
        Some("AccountingTaxTreatmentSnapshot") => {
            (Table::Tax, "status", &["active", "pending"][..])
        }
        Some("OperatingBaselinePackage") => {
            return catalog
                .find(Table::Baseline, id)
                .is_some_and(|r| r["is_current"] == true);
        }
        Some("ReceiptAccountingBasis") => return true,
        _ => return false,
    };
    catalog
        .find(table, id)
        .and_then(|row| row[field].as_str())
        .is_some_and(|status| allowed.contains(&status))
}

#[cfg(test)]
mod inferred_parent_current249_tests {
    use super::*;
    use serde_json::json;

    fn uid(n: u128) -> String {
        Uuid::from_u128(n).to_string()
    }

    fn reference(kind: &str, n: u128) -> Value {
        json!({"kind":kind,"id":uid(n),"rowVersion":1,"payloadHash":"unchanged"})
    }

    fn catalog(parent_status: Option<&str>, stage_status: &str) -> sources::Catalog {
        let mut out = sources::Catalog::default();
        out.rows.insert(
            Table::Stage,
            vec![json!({
                "id":uid(1),"cost_record_id":uid(2),"status":stage_status,"row_version":1
            })],
        );
        if let Some(status) = parent_status {
            out.rows.insert(
                Table::Cost,
                vec![json!({
                    "id":uid(2),"record_status":status,"row_version":3
                })],
            );
        }
        out
    }

    #[test]
    fn genuine_late_stage_with_current_parent_remains_inferable() {
        for status in ["registered", "confirmed", "included"] {
            let catalog = catalog(Some(status), "active");
            let original = catalog.rows.clone();
            assert!(
                inferred_late_source_is_current(
                    &reference("CostStageAttributionSnapshot", 1),
                    &catalog
                ),
                "{status}"
            );
            assert!(
                inferred_late_source_is_current(&reference("ProjectActualCostRecord", 2), &catalog),
                "Stage and Cost share the current status rule: {status}"
            );
            assert_eq!(catalog.rows, original);
        }
    }

    #[test]
    fn active_historical_stage_cannot_reactivate_replaced_or_retired_cost() {
        for status in [
            "replaced",
            "voided",
            "superseded",
            "retired",
            "draft",
            "excluded",
        ] {
            let catalog = catalog(Some(status), "active");
            let original = catalog.rows.clone();
            assert!(
                !inferred_late_source_is_current(
                    &reference("CostStageAttributionSnapshot", 1),
                    &catalog
                ),
                "{status}"
            );
            assert!(
                !inferred_late_source_is_current(
                    &reference("ProjectActualCostRecord", 2),
                    &catalog
                ),
                "{status}"
            );
            // Qualification changes no historical producer row/version/status.
            assert_eq!(catalog.rows, original);
        }
    }

    #[test]
    fn stage_requires_its_exact_present_parent_and_known_current_status() {
        let stage_ref = reference("CostStageAttributionSnapshot", 1);
        let mut missing = catalog(None, "active");
        assert!(!inferred_late_source_is_current(&stage_ref, &missing));
        missing.rows.insert(
            Table::Cost,
            vec![json!({
                "id":uid(99),"record_status":"included"
            })],
        );
        assert!(!inferred_late_source_is_current(&stage_ref, &missing));
        for invalid in [Value::Null, json!("not-a-uuid"), json!(999)] {
            let mut catalog = catalog(Some("included"), "active");
            catalog.rows.get_mut(&Table::Stage).expect("stage")[0]["cost_record_id"] = invalid;
            assert!(!inferred_late_source_is_current(&stage_ref, &catalog));
        }
        let mut unknown = catalog(Some("included"), "active");
        unknown.rows.get_mut(&Table::Cost).expect("cost")[0]["record_status"] = Value::Null;
        assert!(!inferred_late_source_is_current(&stage_ref, &unknown));
        unknown.rows.remove(&Table::Stage);
        assert!(!inferred_late_source_is_current(&stage_ref, &unknown));
    }

    #[test]
    fn nonactive_stage_is_not_revived_by_a_current_cost() {
        for status in ["pending", "superseded", "retired", ""] {
            assert!(
                !inferred_late_source_is_current(
                    &reference("CostStageAttributionSnapshot", 1),
                    &catalog(Some("included"), status)
                ),
                "{status}"
            );
        }
    }

    #[test]
    fn manual_or_current_tax_assessments_keep_the_independent_existing_rule() {
        for status in ["active", "pending"] {
            let mut catalog = catalog(Some("replaced"), "active");
            catalog.rows.insert(
                Table::Tax,
                vec![
                    json!({"id":uid(3),"status":status,"governance_evidence_id":uid(30)}),
                    json!({"id":uid(4),"status":status,"cost_record_id":uid(2)}),
                ],
            );
            assert!(
                inferred_late_source_is_current(
                    &reference("AccountingTaxTreatmentSnapshot", 3),
                    &catalog
                ),
                "manual assessment has no Cost parent: {status}"
            );
            assert!(
                inferred_late_source_is_current(
                    &reference("AccountingTaxTreatmentSnapshot", 4),
                    &catalog
                ),
                "no new Tax-parent business rule: {status}"
            );
        }
        let mut catalog = sources::Catalog::default();
        catalog
            .rows
            .insert(Table::Tax, vec![json!({"id":uid(3),"status":"superseded"})]);
        assert!(!inferred_late_source_is_current(
            &reference("AccountingTaxTreatmentSnapshot", 3),
            &catalog
        ));
    }

    #[test]
    fn current_tax_candidates_do_not_gain_an_obsolete_stage_seed() {
        let mut catalog = catalog(Some("replaced"), "active");
        catalog.rows.insert(
            Table::Tax,
            vec![
                json!({"id":uid(3),"status":"active"}),
                json!({"id":uid(4),"status":"active"}),
            ],
        );
        let refs = [
            reference("CostStageAttributionSnapshot", 1),
            reference("AccountingTaxTreatmentSnapshot", 3),
            reference("AccountingTaxTreatmentSnapshot", 4),
        ];
        let selected = refs
            .iter()
            .filter(|r| inferred_late_source_is_current(r, &catalog))
            .map(|r| r["id"].as_str().expect("id").to_owned())
            .collect::<BTreeSet<_>>();
        assert_eq!(selected, BTreeSet::from([uid(3), uid(4)]));
        // This is automatic-root qualification only, not target graph pruning.
        // The unchanged impact_graph still traverses history for explicit roots.
    }
}
