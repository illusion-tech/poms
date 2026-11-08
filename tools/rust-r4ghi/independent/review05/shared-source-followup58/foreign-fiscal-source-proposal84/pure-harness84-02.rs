// Isolated exact pure candidate predicates/local guard plus exact existing
// identity/hash/catalog/reference adapters; no async SQL/HTTP adapter compiled.
use serde_json::{Value,json};use uuid::Uuid;use crate::contract_support::Error;
mod contract_support {use serde_json::Value;use sha2::{Sha256,Digest};#[derive(Debug)]pub enum Error {Internal,CodedConflict{code:&'static str,message:String}}
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
impl Table {
fn project_predicate(self) -> Result<&'static str, Error> {
        Ok(match self {
            Self::Term | Self::Preparation => {
                "t.contract_id IN (SELECT id FROM poms.contract WHERE project_id=$1)"
            }
            Self::ReviewBinding => {
                "t.contract_id IN (SELECT id FROM poms.contract WHERE project_id=$1)"
            }
            Self::Approval => {
                "t.id IN (SELECT approval_record_id FROM poms.contract_review_binding WHERE contract_id IN (SELECT id FROM poms.contract WHERE project_id=$1))"
            }
            Self::ReceiptBasis => "t.project_id=$1",
            Self::Payable => {
                "t.project_id=$1 OR t.id::text IN (SELECT c.source_id FROM poms.project_actual_cost_record c WHERE c.source_type='payable-record' AND c.id IN (SELECT s.cost_record_id FROM poms.shared_cost_allocation_source_snapshot s JOIN poms.shared_cost_allocation_result r ON r.basis_id=s.basis_id WHERE r.project_id=$1))"
            }
            Self::Payment => {
                "t.project_id=$1 OR t.id::text IN (SELECT c.source_id FROM poms.project_actual_cost_record c WHERE c.source_type='payment-record' AND c.id IN (SELECT s.cost_record_id FROM poms.shared_cost_allocation_source_snapshot s JOIN poms.shared_cost_allocation_result r ON r.basis_id=s.basis_id WHERE r.project_id=$1))"
            }
            Self::Invoice => {
                "t.project_id=$1 OR t.id::text IN (SELECT c.source_id FROM poms.project_actual_cost_record c WHERE c.source_type='invoice-record' AND c.id IN (SELECT s.cost_record_id FROM poms.shared_cost_allocation_source_snapshot s JOIN poms.shared_cost_allocation_result r ON r.basis_id=s.basis_id WHERE r.project_id=$1))"
            }
            Self::Expense => {
                "t.project_id=$1 OR t.id::text IN (SELECT c.source_id FROM poms.project_actual_cost_record c WHERE c.source_type='expense-record' AND c.id IN (SELECT s.cost_record_id FROM poms.shared_cost_allocation_source_snapshot s JOIN poms.shared_cost_allocation_result r ON r.basis_id=s.basis_id WHERE r.project_id=$1))"
            }

            Self::AllocationBasis => {
                "t.id IN (SELECT basis_id FROM poms.shared_cost_allocation_result WHERE project_id=$1) OR t.id IN (SELECT s.basis_id FROM poms.shared_cost_allocation_source_snapshot s JOIN poms.project_actual_cost_record c ON c.id=s.cost_record_id WHERE c.project_id=$1)"
            }
            Self::AllocationSource => {
                "t.basis_id IN (SELECT basis_id FROM poms.shared_cost_allocation_result WHERE project_id=$1) OR t.cost_record_id IN (SELECT id FROM poms.project_actual_cost_record WHERE project_id=$1)"
            }
            Self::Stage => {
                "t.cost_record_id IN (SELECT id FROM poms.project_actual_cost_record WHERE project_id=$1 OR id IN (SELECT cost_record_id FROM poms.shared_cost_allocation_source_snapshot WHERE basis_id IN (SELECT basis_id FROM poms.shared_cost_allocation_result WHERE project_id=$1)))"
            }
            Self::ProjectStage => {
                "t.project_id=$1 OR t.project_id IN (SELECT c.project_id FROM poms.project_actual_cost_record c JOIN poms.shared_cost_allocation_source_snapshot s ON s.cost_record_id=c.id JOIN poms.shared_cost_allocation_result r ON r.basis_id=s.basis_id WHERE r.project_id=$1)"
            }
            Self::Attachment => {
                "t.id IN (SELECT l.attachment_id FROM poms.attachment_link l WHERE (l.target_type='project' AND l.target_id=$1) OR (l.target_type='contract' AND l.target_id IN (SELECT id FROM poms.contract WHERE project_id=$1))) OR t.id::text IN (SELECT p.value->>'attachmentId' FROM poms.project_actual_cost_record c CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(c.source_basis->'attachmentRefs')='array' THEN c.source_basis->'attachmentRefs' ELSE '[]'::jsonb END) p(value) WHERE c.id IN (SELECT s.cost_record_id FROM poms.shared_cost_allocation_source_snapshot s JOIN poms.shared_cost_allocation_result r ON r.basis_id=s.basis_id WHERE r.project_id=$1))"
            }
            Self::AttachmentLink => {
                "(t.target_type='project' AND t.target_id=$1) OR (t.target_type='contract' AND t.target_id IN (SELECT id FROM poms.contract WHERE project_id=$1))"
            }
            Self::Evidence => {
                "t.project_id=$1 OR t.id IN (SELECT governance_evidence_id FROM poms.cost_stage_attribution_snapshot WHERE cost_record_id IN (SELECT cost_record_id FROM poms.shared_cost_allocation_source_snapshot WHERE basis_id IN (SELECT basis_id FROM poms.shared_cost_allocation_result WHERE project_id=$1))) OR t.id IN (SELECT governance_evidence_id FROM poms.shared_cost_allocation_basis WHERE id IN (SELECT basis_id FROM poms.shared_cost_allocation_result WHERE project_id=$1) OR id IN (SELECT s.basis_id FROM poms.shared_cost_allocation_source_snapshot s JOIN poms.project_actual_cost_record c ON c.id=s.cost_record_id WHERE c.project_id=$1))"
            }
            Self::Rate => {
                "EXISTS(SELECT 1 FROM poms.project_actual_cost_record c WHERE c.source_type='labor' AND (c.project_id=$1 OR c.id IN (SELECT cost_record_id FROM poms.shared_cost_allocation_source_snapshot WHERE basis_id IN (SELECT basis_id FROM poms.shared_cost_allocation_result WHERE project_id=$1))) AND (t.id::text=c.source_id OR (((t.rate_scope_type='person' AND t.person_id=c.labor_person_id) OR (t.rate_scope_type='role' AND t.role_code=c.labor_role)) AND t.effective_from<=c.labor_period_end AND (t.effective_to IS NULL OR t.effective_to>=c.labor_period_start))))"
            }
            Self::Cost => {
                "t.project_id=$1 OR t.id IN (SELECT cost_record_id FROM poms.shared_cost_allocation_source_snapshot WHERE basis_id IN (SELECT basis_id FROM poms.shared_cost_allocation_result WHERE project_id=$1))"
            }
            Self::CostMember | Self::SourceMember => return Err(Error::Internal),
            _ => "t.project_id=$1",
        })
    }
}
pub(crate) fn id(row: &Value, key: &str) -> Result<Uuid, Error> {
    row[key]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(Error::Internal)
}
pub(crate) fn version(row: &Value) -> Result<i32, Error> {
    row["row_version"]
        .as_i64()
        .and_then(|v| i32::try_from(v).ok())
        .filter(|v| *v > 0)
        .ok_or(Error::Internal)
}
pub(crate) fn conflict(code: &'static str) -> Error {
    Error::CodedConflict {
        code,
        message: code.replace('_', " "),
    }
}
#[cfg(test)]
mod foreign_fiscal_predicate84_tests {
    use super::*;

    #[test]
    fn foreign_fiscal_predicate84_requires_the_actual_share_cost_source_identity() {
        for (table, source_type) in [
            (Table::Expense, "expense-record"),
            (Table::Invoice, "invoice-record"),
            (Table::Payment, "payment-record"),
            (Table::Payable, "payable-record"),
        ] {
            let predicate = table
                .project_predicate()
                .expect("closed fiscal parent predicate");
            assert!(predicate.starts_with("t.project_id=$1 OR t.id::text IN (SELECT c.source_id"));
            assert!(predicate.contains(&format!("c.source_type='{source_type}'")));
            assert!(predicate.contains("c.id IN (SELECT s.cost_record_id FROM poms.shared_cost_allocation_source_snapshot s JOIN poms.shared_cost_allocation_result r ON r.basis_id=s.basis_id WHERE r.project_id=$1)"));
            assert!(
                !predicate.contains("OR t.project_id IN"),
                "Import only exact referenced parents, never every fiscal record of the source project"
            );
        }
    }
}
}
use store::Table;
mod sources {use crate::{Value,Uuid,Error};use serde_json::json;use crate::store::{self,Table};use crate::contract_support::canonical_hash;use std::collections::BTreeMap;
#[derive(Default, Clone)]
pub(crate) struct Catalog {
    pub rows: BTreeMap<Table, Vec<Value>>,
}
impl Catalog {
    pub(crate) fn merge(&mut self, other: &Catalog) {
        for (table, rows) in &other.rows {
            let current = self.rows.entry(*table).or_default();
            current.extend(rows.iter().cloned());
            current.sort_by_key(Value::to_string);
            current.dedup();
        }
    }
    pub(crate) fn all(&self, table: Table) -> &[Value] {
        self.rows.get(&table).map(Vec::as_slice).unwrap_or(&[])
    }
    pub(crate) fn find(&self, table: Table, id: Uuid) -> Option<&Value> {
        self.all(table).iter().find(|r| r["id"] == id.to_string())
    }
    pub(crate) fn by(&self, table: Table, key: &str, value: &Value) -> Option<&Value> {
        self.all(table).iter().find(|r| &r[key] == value)
    }
    pub(crate) fn members(&self) -> Result<Vec<(Value, Value)>, Error> {
        let mut out = Vec::new();
        for (table, rows) in &self.rows {
            if matches!(
                table,
                Table::Head
                    | Table::AttachmentLink
                    | Table::DecisionHead
                    | Table::Context
                    | Table::Snapshot
                    | Table::Period
                    | Table::Restatement
            ) {
                continue;
            }
            for row in rows {
                out.push((reference(*table, row)?, factual_payload(*table, row)));
            }
        }
        out.sort_by_key(|(r, _)| {
            format!(
                "{}:{}:{}:{}",
                r["kind"], r["id"], r["rowVersion"], r["payloadHash"]
            )
        });
        out.dedup_by(|a, b| a.0 == b.0);
        Ok(out)
    }
}
pub(crate) fn kind(table: Table) -> &'static str {
    match table {
        Table::HandoverBasis => "ProjectHandoverBasisSnapshot",
        Table::Handover => "ProjectHandover",
        Table::Rebaseline => "ContractHandoverRebaselineRecord",
        Table::Baseline => "OperatingBaselinePackage",
        Table::BaselineSource => "OperatingBaselineSource",
        Table::Contract => "Contract",
        Table::Term => "ContractTermSnapshot",
        Table::Preparation => "ContractTermPreparation",
        Table::ReviewBinding => "ContractReviewBinding",
        Table::Approval => "ApprovalRecord",
        Table::Commercial => "CommercialReleaseBaseline",
        Table::Estimate => "ProjectTechnicalCostPackage",
        Table::Receipt => "ReceiptRecord",
        Table::ReceiptBasis => "ReceiptAccountingBasis",
        Table::Rate => "InternalCostRateVersion",
        Table::Payable => "PayableRecord",
        Table::Payment => "PaymentRecord",
        Table::Invoice => "InvoiceRecord",
        Table::Expense => "ExpenseRecord",
        Table::ProjectStage => "ProjectStageRecord",
        Table::Attachment => "Attachment",
        Table::AllocationBasis => "SharedCostAllocationBasis",
        Table::AllocationResult => "SharedCostAllocationResult",
        Table::AllocationSource => "SharedCostAllocationSourceSnapshot",
        Table::Cost => "ProjectActualCostRecord",
        Table::Evidence => "CostGovernanceEvidence",
        Table::Stage => "CostStageAttributionSnapshot",
        Table::Tax => "AccountingTaxTreatmentSnapshot",
        Table::Decision => "ProjectCostInclusionDecision",
        Table::Context => "OperatingSourceContext",
        Table::Snapshot => "ProjectOperatingSnapshot",
        Table::Period => "PeriodClosingSnapshot",
        Table::Restatement => "OperatingRestatementRecord",
        _ => "internal-head",
    }
}
pub(crate) fn factual_payload(table: Table, row: &Value) -> Value {
    let fields: &[&str] = match table {
        Table::Contract => &[
            "id",
            "project_id",
            "status",
            "currency_code",
            "signed_amount",
            "signed_at",
            "current_snapshot_id",
            "row_version",
        ],
        Table::Term | Table::Preparation => &[
            "id",
            "contract_id",
            "version",
            "row_version",
            "snapshot_status",
            "status",
            "source_preparation_id",
            "source_readiness_id",
            "source_baseline_id",
            "source_amendment_id",
            "payload_hash",
            "source_facts",
            "activated_snapshot_id",
            "amount_tax_inclusive",
            "amount_tax_exclusive",
            "tax_rate",
            "currency_code",
            "effective_at",
            "source_diff_result_id",
        ],
        Table::Estimate => &[
            "id",
            "project_id",
            "version",
            "row_version",
            "supersedes_id",
            "status",
            "currency_code",
            "total_estimated_amount_excluding_tax",
            "total_tax_cost_amount",
            "total_estimated_amount_including_tax",
            "effective_at",
            "allow_next_stage",
            "blocker_count",
            "tax_review_status",
        ],
        Table::ProjectStage => &[
            "id",
            "project_id",
            "sequence_no",
            "event_type",
            "from_stage",
            "to_stage",
            "previous_stage_record_id",
            "source_handover_id",
            "source_role_assignment_id",
            "source_completion_record_id",
            "summary_snapshot_id",
            "project_row_version_before",
            "project_row_version_after",
            "entered_at",
            "entered_by",
            "reason",
            "source_payload",
            "source_payload_hash",
            "producer_version",
        ],
        Table::Attachment => &[
            "id",
            "row_version",
            "version_no",
            "version_group_id",
            "checksum_sha256",
            "security_level",
            "status",
            "deleted_at",
        ],
        Table::Rate => &[
            "id",
            "row_version",
            "version",
            "rate_key",
            "rate_scope_type",
            "person_id",
            "role_code",
            "currency",
            "rate_value",
            "rate_unit",
            "effective_from",
            "effective_to",
            "status",
            "published_at",
            "published_by",
            "supersedes_id",
        ],
        Table::Commercial => &[
            "id",
            "project_id",
            "row_version",
            "version",
            "status",
            "is_current",
            "currency_code",
            "amount_tax_inclusive",
            "amount_tax_exclusive",
            "tax_rate",
            "source_facts",
            "source_package_id",
            "source_package_version",
            "approval_record_id",
            "effective_at",
        ],
        Table::Handover => &[
            "id",
            "project_id",
            "row_version",
            "version",
            "producer_version",
            "status",
            "is_current",
            "basis_snapshot_id",
            "confirmation_record_id",
            "execution_owner_user_id",
            "finance_confirmation_required",
            "source_payload_hash",
            "confirmed_at",
            "confirmed_by",
            "supersedes_id",
            "handover_rebaseline_record_id",
        ],
        Table::Rebaseline => &[
            "id",
            "project_id",
            "row_version",
            "status",
            "producer_version",
            "contract_amendment_id",
            "basis_before_id",
            "basis_after_id",
            "effective_operating_baseline_after_id",
            "effective_baseline_after_id",
            "source_handover_id",
            "replacement_handover_id",
            "supersedes_id",
            "handled_at",
            "handled_by",
        ],
        Table::Cost => &[
            "id",
            "project_id",
            "row_version",
            "cost_type",
            "source_type",
            "source_id",
            "currency",
            "amount_excluding_tax",
            "tax_cost_amount",
            "amount_including_tax",
            "occurred_on",
            "record_status",
            "basis_origin",
            "source_basis",
            "source_row_version",
            "source_payload_hash",
            "supersedes_record_id",
            "is_included_in_project_cost",
            "confirmed_at",
            "confirmed_by",
            "included_at",
            "included_by",
            "execution_stage_code",
            "stage_derived_from_type",
            "stage_derived_from_id",
            "stage_derived_at",
            "stage_locked_at",
            "rate_version_id",
            "calculation_basis",
            "labor_period_start",
            "labor_period_end",
            "labor_person_id",
            "labor_role",
        ],
        Table::Receipt => &[
            "id",
            "project_id",
            "contract_id",
            "row_version",
            "status",
            "receipt_amount",
            "receipt_date",
            "confirmed_at",
            "confirmed_by",
        ],
        Table::ReceiptBasis => &[
            "id",
            "receipt_id",
            "project_id",
            "contract_id",
            "row_version",
            "producer_version",
            "receipt_row_version",
            "term_snapshot_id",
            "term_snapshot_version",
            "term_snapshot_row_version",
            "term_payload_hash",
            "currency",
            "currency_source_kind",
            "currency_source_id",
            "currency_source_version",
            "currency_source_hash",
            "cash_gross",
            "amount_excluding_tax",
            "tax_amount",
            "tax_rate",
            "capture_mode",
            "selection_policy",
            "rounding_policy",
            "evidence_refs",
            "payload_hash",
        ],
        Table::Payable | Table::Payment | Table::Invoice | Table::Expense => &[
            "id",
            "project_id",
            "contract_id",
            "row_version",
            "status",
            "currency",
            "amount_excluding_tax",
            "tax_amount",
            "amount_including_tax",
            "invoice_amount",
            "invoice_type",
            "payable_record_id",
            "source_type",
            "source_id",
            "expense_date",
            "payment_date",
            "invoice_date",
            "due_date",
            "confirmed_at",
            "confirmed_by",
            "source_basis",
            "basis_origin",
        ],
        Table::AllocationSource => &[
            "basis_id",
            "cost_record_id",
            "cost_row_version",
            "source_type",
            "source_id",
            "source_row_version",
            "currency",
            "amount_excluding_tax",
            "tax_cost_amount",
            "amount_including_tax",
            "source_payload",
            "source_payload_hash",
            "is_current",
        ],
        Table::AllocationBasis | Table::AllocationResult => &[
            "id",
            "project_id",
            "basis_id",
            "row_version",
            "status",
            "supersedes_id",
            "effective_at",
            "currency",
            "source_cost_scope_key",
            "measurement_basis",
            "source_amount_excluding_tax",
            "source_tax_cost_amount",
            "source_amount_including_tax",
            "measurement_amount",
            "allocation_algorithm",
            "allocation_ratio",
            "allocation_weight",
            "allocated_amount",
            "allocated_amount_excluding_tax",
            "allocated_tax_cost_amount",
            "allocated_amount_including_tax",
            "residual_minor_units",
            "governance_evidence_id",
            "governance_schema_version",
            "replacement_operation_id",
            "is_included_in_project_cost",
            "included_at",
            "included_by",
        ],
        Table::Stage | Table::Tax => &[
            "id",
            "project_id",
            "cost_record_id",
            "row_version",
            "status",
            "supersedes_id",
            "attributed_stage",
            "attribution_mode",
            "evidence_business_date",
            "governance_evidence_id",
            "governance_schema_version",
            "handled_at",
            "handled_by",
            "confirmed_at",
            "confirmed_by",
            "currency",
            "deductibility_status",
            "tax_pending_flag",
            "tax_impact_amount",
            "tax_impact_pending_amount",
            "tax_treatment_type",
        ],
        Table::ReviewBinding => &[
            "approval_record_id",
            "contract_id",
            "preparation_id",
            "preparation_version",
            "contract_amendment_id",
            "payload_hash",
        ],
        Table::Approval => &[
            "id",
            "row_version",
            "current_status",
            "approval_type",
            "target_object_type",
            "target_object_id",
            "approved_at",
        ],
        Table::Evidence => &[
            "id",
            "project_id",
            "schema_version",
            "target_type",
            "target_id",
            "evidence_kind",
            "business_date",
            "source_references",
            "payload_hash",
            "frozen_payload",
            "reason",
            "actor_id",
        ],
        Table::Decision => &[
            "id",
            "project_id",
            "unit_key",
            "row_version",
            "source_row_version",
            "decision",
            "recognition_role",
            "cost_record_id",
            "allocation_result_id",
            "primary_cost_id",
            "reason_code",
            "reason_text",
            "supporting_source_refs",
            "evidence_refs",
            "payload_hash",
            "supersedes_id",
            "decided_at",
            "decided_by",
        ],
        _ => &[
            "id",
            "project_id",
            "row_version",
            "version",
            "status",
            "is_current",
            "producer_version",
            "source_hash",
            "payload_hash",
            "source_payload",
            "frozen_payload",
            "source_context_id",
            "original_baseline_cost",
            "handover_baseline_cost",
            "execution_change_package_total",
            "change_package_total",
            "current_effective_baseline_cost",
            "currency",
            "baseline_selection_source",
            "period_key",
            "root_snapshot_id",
            "period_end_snapshot_id",
            "supersedes_id",
        ],
    };
    let mut out = serde_json::Map::new();
    for key in fields {
        if let Some(value) = row.get(*key) {
            out.insert((*key).into(), value.clone());
        }
    }
    Value::Object(out)
}
pub(crate) fn reference(table: Table, row: &Value) -> Result<Value, Error> {
    let id = match table {
        Table::ReviewBinding => store::id(row, "approval_record_id")?,
        Table::AllocationSource => store::id(row, "cost_record_id")?,
        _ => store::id(row, "id")?,
    };
    let version = match table {
        Table::ReviewBinding => row["preparation_version"]
            .as_i64()
            .and_then(|n| i32::try_from(n).ok())
            .filter(|v| *v > 0)
            .ok_or(Error::Internal)?,
        Table::AllocationSource => row["cost_row_version"]
            .as_i64()
            .and_then(|n| i32::try_from(n).ok())
            .filter(|v| *v > 0)
            .ok_or(Error::Internal)?,
        Table::Evidence => 1,
        Table::ProjectStage => row["sequence_no"]
            .as_i64()
            .and_then(|n| i32::try_from(n).ok())
            .filter(|n| *n > 0)
            .ok_or(Error::Internal)?,
        _ => store::version(row)?,
    };
    Ok(
        json!({"kind":kind(table),"id":id,"rowVersion":version,"payloadHash":canonical_hash(&factual_payload(table,row))?}),
    )
}
}
use sources::Catalog;
fn locally_registered_upstream(row: &Value, project: Uuid) -> bool {
    row["project_id"] == project.to_string()
}
fn cost_source_ref(catalog: &Catalog, cost: &Value) -> Result<Value, Error> {
    let table = match cost["source_type"].as_str() {
        Some("labor") => Table::Rate,
        Some("payment-record") => Table::Payment,
        Some("payable-record") => Table::Payable,
        Some("expense-record") => Table::Expense,
        Some("invoice-record") => Table::Invoice,
        _ => return Err(store::conflict("operating_cost_source_unknown")),
    };
    let row = catalog
        .by(table, "id", &cost["source_id"])
        .or_else(|| catalog.find(table, store::id(cost, "source_id").ok()?))
        .ok_or_else(|| store::conflict("operating_cost_source_missing"))?;
    sources::reference(table, row)
}
#[cfg(test)]
mod foreign_fiscal_source84_tests {
    use super::*;

    #[test]
    fn foreign_fiscal_source84_exact_imported_parent_resolves_all_nonlabor_cost_kinds() {
        for (source_type, table, kind) in [
            ("expense-record", Table::Expense, "ExpenseRecord"),
            ("invoice-record", Table::Invoice, "InvoiceRecord"),
            ("payment-record", Table::Payment, "PaymentRecord"),
            ("payable-record", Table::Payable, "PayableRecord"),
        ] {
            let parent_id = Uuid::from_u128(20);
            let cost = json!({"source_type":source_type,"source_id":parent_id,"project_id":Uuid::from_u128(11)});
            let mut catalog = Catalog::default();
            catalog.rows.insert(table, vec![json!({"id":Uuid::from_u128(21),"row_version":2,"project_id":Uuid::from_u128(10)})]);
            assert!(
                cost_source_ref(&catalog, &cost).is_err(),
                "An unrelated local record cannot satisfy the foreign source ID"
            );
            catalog
                .rows
                .get_mut(&table)
                .expect("fixture table")
                .push(json!({"id":parent_id,"row_version":2,"project_id":Uuid::from_u128(11)}));
            let source = cost_source_ref(&catalog, &cost).expect("exact imported parent");
            assert_eq!(source["kind"], kind);
            assert_eq!(source["id"], parent_id.to_string());
            assert_eq!(source["rowVersion"], 2);
        }
    }

    #[test]
    fn foreign_fiscal_source84_imported_parent_is_never_an_own_unmapped_fact() {
        let project = Uuid::from_u128(10);
        let foreign = json!({"id":Uuid::from_u128(20),"project_id":Uuid::from_u128(11),"status":"confirmed","amount_including_tax":"1130.00"});
        let own = json!({"id":Uuid::from_u128(21),"project_id":project,"status":"confirmed","amount_including_tax":"1130.00"});
        assert!(!locally_registered_upstream(&foreign, project));
        assert!(
            locally_registered_upstream(&own, project),
            "Real own-project unmapped facts must retain their blocking/projection path"
        );
        assert!(!locally_registered_upstream(
            &json!({"project_id":null}),
            project
        ));
    }
}
