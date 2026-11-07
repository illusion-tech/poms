//! Actual B/C/D/E/F source graph. This module collects facts, never policy.
use super::store::{self, Table};
use crate::{
    approval_common::CommonSession,
    contract_support::{Error, canonical_hash},
};
use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

pub(crate) const COLLECTION_VERSION: &str = "r4g-complete-source-v1";

#[derive(Default, Clone)]
pub(crate) struct Catalog {
    pub rows: BTreeMap<Table, Vec<Value>>,
}

pub(crate) async fn lock_full_source_set(
    session: &mut CommonSession<'_, '_>,
    projects: &[Uuid],
) -> Result<(), Error> {
    let mut projects = projects.to_vec();
    projects.sort();
    projects.dedup();
    let mut families = BTreeSet::new();
    for project in &projects {
        for rate in store::rows(session.connection, Table::Rate, *project, false).await? {
            families.insert(if rate["rate_scope_type"] == "person" {
                format!("person:{}", store::text(&rate, "person_id")?)
            } else {
                format!("role:{}", store::text(&rate, "role_code")?)
            });
        }
        for cost in store::rows(session.connection, Table::Cost, *project, false).await? {
            if let Some(person) = cost["labor_person_id"].as_str() {
                families.insert(format!("person:{person}"));
            }
        }
    }
    for table in [
        Table::HandoverBasis,
        Table::Handover,
        Table::Rebaseline,
        Table::Head,
        Table::Baseline,
        Table::BaselineSource,
        Table::Contract,
        Table::Term,
        Table::Preparation,
        Table::ReviewBinding,
        Table::Approval,
        Table::Commercial,
        Table::Estimate,
        Table::Receipt,
        Table::ReceiptBasis,
        Table::Rate,
        Table::Payable,
        Table::Payment,
        Table::Invoice,
        Table::Expense,
        Table::ProjectStage,
        Table::AllocationBasis,
        Table::AllocationResult,
        Table::AllocationSource,
        Table::Cost,
        Table::Evidence,
        Table::Stage,
        Table::Tax,
        Table::Attachment,
        Table::AttachmentLink,
        Table::Decision,
        Table::DecisionHead,
        Table::Context,
        Table::Snapshot,
        Table::Period,
        Table::Restatement,
    ] {
        if table == Table::Rate {
            for family in &families {
                sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
                    .bind(format!("poms:cost-rate:{family}"))
                    .execute(&mut *session.connection)
                    .await?;
            }
        }
        // All projects of a family are locked before advancing its rank.
        store::lock_family_rows(session.connection, table, &projects).await?;
    }
    Ok(())
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

/// Root has acquired the complete sorted project set and authorization-family
/// locks before entering this adapter. Source families are then acquired once.
pub(crate) async fn load(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    locked: bool,
) -> Result<Catalog, Error> {
    let tables = [
        Table::HandoverBasis,
        Table::Handover,
        Table::Rebaseline,
        Table::Head,
        Table::Baseline,
        Table::BaselineSource,
        Table::Contract,
        Table::Term,
        Table::Preparation,
        Table::ReviewBinding,
        Table::Approval,
        Table::Commercial,
        Table::Estimate,
        Table::Receipt,
        Table::ReceiptBasis,
        Table::Rate,
        Table::Payable,
        Table::Payment,
        Table::Invoice,
        Table::Expense,
        Table::ProjectStage,
        Table::AllocationBasis,
        Table::AllocationResult,
        Table::AllocationSource,
        Table::Cost,
        Table::Evidence,
        Table::Stage,
        Table::Tax,
        Table::Attachment,
        Table::AttachmentLink,
        Table::Decision,
        Table::DecisionHead,
        Table::Context,
        Table::Snapshot,
        Table::Period,
        Table::Restatement,
    ];
    let mut catalog = Catalog::default();
    if locked {
        // E rate publication uses these same family advisory keys. Discover all
        // families first, rather than acquiring an earlier rank per cost later.
        let rates = store::rows(session.connection, Table::Rate, project, false).await?;
        let costs = store::rows(session.connection, Table::Cost, project, false).await?;
        let mut keys = BTreeSet::new();
        for r in rates {
            let family = if r["rate_scope_type"] == "person" {
                format!("person:{}", store::text(&r, "person_id")?)
            } else {
                format!("role:{}", store::text(&r, "role_code")?)
            };
            keys.insert(family);
        }
        for r in costs {
            if let Some(person) = r["labor_person_id"].as_str() {
                keys.insert(format!("person:{person}"));
            }
        }
        // Family locks are taken after the head/receipt rank, directly before
        // the rates themselves in the loop below.
        for table in tables {
            if table == Table::Rate {
                for key in &keys {
                    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
                        .bind(format!("poms:cost-rate:{key}"))
                        .execute(&mut *session.connection)
                        .await?;
                }
            }
            catalog.rows.insert(
                table,
                store::rows(session.connection, table, project, true).await?,
            );
        }
    } else {
        for table in tables {
            catalog.rows.insert(
                table,
                store::rows(session.connection, table, project, false).await?,
            );
        }
    }
    Ok(catalog)
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

pub(crate) fn source_type(table: Table) -> &'static str {
    match table {
        Table::Payable => "payable-record",
        Table::Payment => "payment-record",
        Table::Invoice => "invoice-record",
        Table::Expense => "expense-record",
        Table::Rate => "labor",
        _ => "",
    }
}

/// Payload hashes bind a registered factual whitelist. Transport timestamps,
/// mutable descriptions and a SELECT-* representation are not hash authority.
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

pub(crate) fn known_at(row: &Value, cutoff: DateTime<Utc>) -> bool {
    ["created_at", "captured_at", "generated_at"]
        .iter()
        .find_map(|key| {
            row[*key]
                .as_str()
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        })
        .is_none_or(|v| v <= cutoff)
}

pub(crate) fn assert_expected(reference: &Value, expected: &Value) -> Result<(), Error> {
    if reference["id"] != expected["id"]
        || reference["rowVersion"] != expected["expectedVersion"]
        || reference["payloadHash"] != expected["payloadHash"]
        || expected
            .get("kind")
            .is_some_and(|k| k != &reference["kind"])
    {
        return Err(store::conflict("operating_source_changed"));
    }
    Ok(())
}

pub async fn source_reference_with_session(
    session: &mut CommonSession<'_, '_>,
    source_kind: &str,
    id: Uuid,
) -> Result<crate::project_operating_common::model::SourceRef, Error> {
    let table = match source_kind {
        "ProjectActualCostRecord" => Table::Cost,
        "ProjectStageRecord" => Table::ProjectStage,
        "Attachment" => Table::Attachment,
        "ProjectCostInclusionDecision" => Table::Decision,
        "CostStageAttributionSnapshot" => Table::Stage,
        "AccountingTaxTreatmentSnapshot" => Table::Tax,
        "CostGovernanceEvidence" => Table::Evidence,
        "SharedCostAllocationBasis" => Table::AllocationBasis,
        "SharedCostAllocationResult" => Table::AllocationResult,
        "ProjectTechnicalCostPackage" => Table::Estimate,
        "ProjectHandover" => Table::Handover,
        "ProjectHandoverBasisSnapshot" => Table::HandoverBasis,
        "ContractHandoverRebaselineRecord" => Table::Rebaseline,
        "CommercialReleaseBaseline" => Table::Commercial,
        "ContractTermSnapshot" => Table::Term,
        "ReceiptRecord" => Table::Receipt,
        "ReceiptAccountingBasis" => Table::ReceiptBasis,
        "InternalCostRateVersion" => Table::Rate,
        "PaymentRecord" => Table::Payment,
        "PayableRecord" => Table::Payable,
        "InvoiceRecord" => Table::Invoice,
        "ExpenseRecord" => Table::Expense,
        _ => {
            return Err(Error::BadRequest(
                "Unsupported operating reference kind".into(),
            ));
        }
    };
    let row = store::row(session.connection, table, id, false).await?;
    serde_json::from_value(reference(table, &row)?).map_err(|_| Error::Internal)
}

pub fn project_stage_factual_payload(row: &Value) -> Value {
    factual_payload(Table::ProjectStage, row)
}
pub fn project_stage_reference(
    row: &Value,
) -> Result<crate::project_operating_common::model::SourceRef, Error> {
    serde_json::from_value(reference(Table::ProjectStage, row)?).map_err(|_| Error::Internal)
}

/// A narrow F stage transition proof. It never relaxes E's economic source
/// comparison, and cannot admit status, confirmation, money or source changes.
pub fn validate_stage_only_cost_transition(before: &Value, after: &Value) -> Result<(), Error> {
    if store::id(before, "id")? != store::id(after, "id")?
        || store::version(before)?.checked_add(1) != Some(store::version(after)?)
    {
        return Err(store::conflict("operating_stage_transition_invalid"));
    }
    let permitted = [
        "row_version",
        "execution_stage_code",
        "stage_derived_from_type",
        "stage_derived_from_id",
        "stage_derived_at",
        "stage_locked_at",
        "updated_at",
        "updated_by",
    ];
    let a = before.as_object().ok_or(Error::Internal)?;
    let b = after.as_object().ok_or(Error::Internal)?;
    let keys = a.keys().chain(b.keys()).collect::<BTreeSet<_>>();
    if keys
        .into_iter()
        .any(|key| !permitted.contains(&key.as_str()) && a.get(key) != b.get(key))
    {
        return Err(store::conflict(
            "operating_stage_transition_changed_economic_fact",
        ));
    }
    if after["stage_derived_from_type"] != "CostStageAttributionSnapshot"
        || after["stage_derived_from_id"]
            .as_str()
            .and_then(|s| Uuid::parse_str(s).ok())
            .is_none()
        || after["execution_stage_code"]
            .as_str()
            .is_none_or(|s| s.trim().is_empty())
        || after["stage_locked_at"].is_null()
    {
        return Err(store::conflict(
            "operating_stage_transition_evidence_missing",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod transition_tests {
    use super::*;
    #[test]
    fn stage_transition_rejects_money_and_confirmation_changes() {
        let before = json!({"id":"00000000-0000-4000-8000-000000000001","row_version":3,"record_status":"included","is_included_in_project_cost":true,"amount_excluding_tax":"100.00","confirmed_at":"2026-10-01T00:00:00Z","execution_stage_code":"execution"});
        let mut after = before.clone();
        after["row_version"] = json!(4);
        after["execution_stage_code"] = json!("acceptance");
        after["stage_derived_from_type"] = json!("CostStageAttributionSnapshot");
        after["stage_derived_from_id"] = json!("00000000-0000-4000-8000-000000000002");
        after["stage_locked_at"] = json!("2026-11-06T00:00:00Z");
        assert!(validate_stage_only_cost_transition(&before, &after).is_ok());
        after["amount_excluding_tax"] = json!("101.00");
        assert!(validate_stage_only_cost_transition(&before, &after).is_err());
        after["amount_excluding_tax"] = json!("100.00");
        after["record_status"] = json!("confirmed");
        assert!(validate_stage_only_cost_transition(&before, &after).is_err());
    }
}
