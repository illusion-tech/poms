//! SQL adapters for G. All rows are read/written on the caller's connection.
//! Monetary SQL values are selected as decimal text before JSON decoding.
use crate::{approval_common::CommonSession, contract_support::Error};
use serde_json::{Value, json};
use sqlx::{PgConnection, Postgres, QueryBuilder};
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

impl Table {
    pub(crate) fn name(self) -> &'static str {
        match self {
            Self::HandoverBasis => "project_handover_basis_snapshot",
            Self::Handover => "project_handover",
            Self::Rebaseline => "contract_handover_rebaseline_record",
            Self::Head => "project_operating_head",
            Self::Baseline => "operating_baseline_package",
            Self::BaselineSource => "operating_baseline_source",
            Self::Contract => "contract",
            Self::Term => "contract_term_snapshot",
            Self::Preparation => "contract_term_preparation",
            Self::ReviewBinding => "contract_review_binding",
            Self::Approval => "approval_record",
            Self::Commercial => "commercial_release_baseline",
            Self::Estimate => "project_technical_cost_package",
            Self::Receipt => "receipt_record",
            Self::ReceiptBasis => "receipt_accounting_basis",
            Self::Rate => "internal_cost_rate_version",
            Self::Payable => "payable_record",
            Self::Payment => "payment_record",
            Self::Invoice => "invoice_record",
            Self::Expense => "expense_record",
            Self::ProjectStage => "project_stage_record",
            Self::Attachment => "attachment",
            Self::AttachmentLink => "attachment_link",
            Self::AllocationBasis => "shared_cost_allocation_basis",
            Self::AllocationResult => "shared_cost_allocation_result",
            Self::AllocationSource => "shared_cost_allocation_source_snapshot",
            Self::Cost => "project_actual_cost_record",
            Self::Evidence => "cost_governance_evidence",
            Self::Stage => "cost_stage_attribution_snapshot",
            Self::Tax => "accounting_tax_treatment_snapshot",
            Self::Decision => "project_cost_inclusion_decision",
            Self::DecisionHead => "project_cost_inclusion_head",
            Self::Context => "operating_source_context",
            Self::Snapshot => "project_operating_snapshot",
            Self::Period => "period_closing_snapshot",
            Self::Restatement => "operating_restatement_record",
            Self::CostMember => "operating_snapshot_cost_member",
            Self::SourceMember => "operating_source_member",
        }
    }
    fn decimals(self) -> &'static [&'static str] {
        match self {
            Self::Baseline => &[
                "original_baseline_cost",
                "handover_baseline_cost",
                "execution_change_package_total",
                "change_package_total",
                "current_effective_baseline_cost",
            ],
            Self::Contract => &["signed_amount"],
            Self::Term | Self::Preparation | Self::Commercial => &[
                "amount_tax_inclusive",
                "amount_tax_exclusive",
                "tax_rate",
                "down_payment_rate",
                "retention_rate",
            ],
            Self::Estimate => &[
                "total_estimated_amount_excluding_tax",
                "total_tax_cost_amount",
                "total_estimated_amount_including_tax",
            ],
            Self::Receipt => &["receipt_amount"],
            Self::ReceiptBasis => &[
                "cash_gross",
                "amount_excluding_tax",
                "tax_amount",
                "tax_rate",
            ],
            Self::Rate => &["rate_value"],
            Self::Payable | Self::Payment | Self::Expense => {
                &["amount_excluding_tax", "tax_amount", "amount_including_tax"]
            }
            Self::Invoice => &["invoice_amount"],
            Self::AllocationBasis => &[
                "source_amount_excluding_tax",
                "source_tax_cost_amount",
                "source_amount_including_tax",
                "measurement_amount",
            ],
            Self::AllocationResult => &[
                "allocated_amount",
                "allocation_ratio",
                "allocation_weight",
                "allocated_amount_excluding_tax",
                "allocated_tax_cost_amount",
                "allocated_amount_including_tax",
            ],
            Self::AllocationSource => &[
                "amount_excluding_tax",
                "tax_cost_amount",
                "amount_including_tax",
            ],
            Self::Cost => &[
                "amount_excluding_tax",
                "tax_cost_amount",
                "amount_including_tax",
                "internal_cost_rate",
                "labor_amount",
                "actual_hours",
                "actual_person_days",
            ],
            Self::Tax => &["tax_impact_amount", "tax_impact_pending_amount"],
            Self::Snapshot | Self::Period => &[
                "effective_contract_total",
                "receivable_confirmed_total",
                "included_cost_total",
                "original_baseline_cost",
                "current_effective_baseline_cost",
                "gross_margin_amount",
                "gross_margin_rate",
                "tax_impact_pending_amount",
            ],
            _ => &[],
        }
    }
    fn selected(self) -> String {
        if self.decimals().is_empty() {
            return "to_jsonb(t)".into();
        }
        format!(
            "to_jsonb(t)||jsonb_build_object({})",
            self.decimals()
                .iter()
                .map(|f| format!("'{f}',t.{f}::text"))
                .collect::<Vec<_>>()
                .join(",")
        )
    }
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

pub(crate) async fn rows(
    c: &mut PgConnection,
    table: Table,
    project: Uuid,
    locked: bool,
) -> Result<Vec<Value>, Error> {
    let order = match table {
        Table::ReviewBinding => "t.approval_record_id",
        Table::Head => "t.project_id",
        Table::DecisionHead => "t.unit_key",
        Table::AllocationSource => "t.basis_id,t.cost_record_id",
        _ => "t.id",
    };
    let sql = format!(
        "SELECT {} FROM poms.{} t WHERE ({}) ORDER BY {order}{}",
        table.selected(),
        table.name(),
        table.project_predicate()?,
        if locked { " FOR UPDATE OF t" } else { "" }
    );
    Ok(QueryBuilder::<Postgres>::new(sql)
        .build_query_scalar()
        .bind(project)
        .fetch_all(c)
        .await?)
}

pub(crate) async fn row(
    c: &mut PgConnection,
    table: Table,
    id: Uuid,
    locked: bool,
) -> Result<Value, Error> {
    let sql = format!(
        "SELECT {} FROM poms.{} t WHERE t.id=$1{}",
        table.selected(),
        table.name(),
        if locked { " FOR UPDATE OF t" } else { "" }
    );
    QueryBuilder::<Postgres>::new(sql)
        .build_query_scalar()
        .bind(id)
        .fetch_optional(c)
        .await?
        .ok_or_else(|| Error::NotFound("Operating source not found".into()))
}

pub(crate) async fn lock_family_rows(
    c: &mut PgConnection,
    table: Table,
    projects: &[Uuid],
) -> Result<(), Error> {
    let mut rows_to_lock = Vec::new();
    for project in projects {
        rows_to_lock.extend(rows(c, table, *project, false).await?);
    }
    let key = |r: &Value| match table {
        Table::Head => r["project_id"].to_string(),
        Table::DecisionHead => format!("{}:{}", r["project_id"], r["unit_key"]),
        Table::ReviewBinding => r["approval_record_id"].to_string(),
        Table::AllocationSource => format!("{}:{}", r["basis_id"], r["cost_record_id"]),
        _ => r["id"].to_string(),
    };
    rows_to_lock.sort_by_key(&key);
    rows_to_lock.dedup_by(|a, b| key(a) == key(b));
    for row in rows_to_lock {
        match table {
            Table::Head => {
                sqlx::query(
                    "SELECT 1 FROM poms.project_operating_head WHERE project_id=$1 FOR UPDATE",
                )
                .bind(id(&row, "project_id")?)
                .execute(&mut *c)
                .await?;
            }
            Table::DecisionHead => {
                sqlx::query("SELECT 1 FROM poms.project_cost_inclusion_head WHERE project_id=$1 AND unit_key=$2 FOR UPDATE").bind(id(&row,"project_id")?).bind(text(&row,"unit_key")?).execute(&mut *c).await?;
            }
            Table::ReviewBinding => {
                sqlx::query("SELECT 1 FROM poms.contract_review_binding WHERE approval_record_id=$1 FOR UPDATE").bind(id(&row,"approval_record_id")?).execute(&mut *c).await?;
            }
            Table::AllocationSource => {
                sqlx::query("SELECT 1 FROM poms.shared_cost_allocation_source_snapshot WHERE basis_id=$1 AND cost_record_id=$2 FOR UPDATE").bind(id(&row,"basis_id")?).bind(id(&row,"cost_record_id")?).execute(&mut *c).await?;
            }
            _ => {
                let sql = format!("SELECT 1 FROM poms.{} WHERE id=$1 FOR UPDATE", table.name());
                QueryBuilder::<Postgres>::new(sql)
                    .build()
                    .bind(id(&row, "id")?)
                    .execute(&mut *c)
                    .await?;
            }
        }
    }
    Ok(())
}

pub(crate) async fn project(c: &mut PgConnection, id: Uuid) -> Result<Value, Error> {
    sqlx::query_scalar("SELECT to_jsonb(t) FROM poms.project t WHERE id=$1")
        .bind(id)
        .fetch_optional(c)
        .await?
        .ok_or_else(|| Error::NotFound("Project not found".into()))
}

pub(crate) async fn insert(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    value: &Value,
) -> Result<(), Error> {
    if !matches!(
        table,
        Table::Baseline
            | Table::BaselineSource
            | Table::Decision
            | Table::Context
            | Table::Snapshot
            | Table::Period
            | Table::Restatement
            | Table::CostMember
            | Table::SourceMember
    ) {
        return Err(Error::Internal);
    }
    let fields = value.as_object().ok_or(Error::Internal)?;
    if fields
        .keys()
        .any(|k| k.is_empty() || !k.bytes().all(|b| b.is_ascii_lowercase() || b == b'_'))
    {
        return Err(Error::Internal);
    }
    let columns = fields
        .keys()
        .map(|k| format!("\"{k}\""))
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "INSERT INTO poms.{} ({columns}) SELECT {columns} FROM jsonb_populate_record(NULL::poms.{},$1::jsonb)",
        table.name(),
        table.name()
    );
    QueryBuilder::<Postgres>::new(sql)
        .build()
        .bind(value)
        .execute(&mut *session.connection)
        .await?;
    let identity = value
        .get("id")
        .map(Value::to_string)
        .unwrap_or_else(|| format!("{}:{}", value["snapshot_id"], value["unit_key"]));
    session.state.trace.inserted(table.name(), &identity);
    Ok(())
}

pub(crate) async fn advance_head(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    expected: i32,
    baseline: Uuid,
    snapshot: Option<Uuid>,
    actor: Uuid,
) -> Result<i32, Error> {
    let next = expected
        .checked_add(1)
        .ok_or_else(|| Error::Conflict("Operating head version exhausted".into()))?;
    let n = if expected == 0 {
        sqlx::query("INSERT INTO poms.project_operating_head(project_id,baseline_package_id,current_snapshot_id,row_version,updated_by) VALUES($1,$2,$3,1,$4) ON CONFLICT(project_id) DO NOTHING").bind(project).bind(baseline).bind(snapshot).bind(actor).execute(&mut *session.connection).await?.rows_affected()
    } else {
        sqlx::query("UPDATE poms.project_operating_head SET baseline_package_id=$2,current_snapshot_id=CASE WHEN $3::uuid IS NULL THEN current_snapshot_id ELSE $3 END,row_version=row_version+1,updated_at=now(),updated_by=$4 WHERE project_id=$1 AND row_version=$5").bind(project).bind(baseline).bind(snapshot).bind(actor).bind(expected).execute(&mut *session.connection).await?.rows_affected()
    };
    if n != 1 {
        return Err(Error::Conflict("Operating head changed".into()));
    }
    Ok(next)
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
pub(crate) fn text<'a>(row: &'a Value, key: &str) -> Result<&'a str, Error> {
    row[key].as_str().ok_or(Error::Internal)
}
pub(crate) fn conflict(code: &'static str) -> Error {
    Error::CodedConflict {
        code,
        message: code.replace('_', " "),
    }
}

pub(crate) async fn semantic_current_baseline(
    c: &mut PgConnection,
    project: Uuid,
    locked: bool,
) -> Result<Option<Value>, Error> {
    let mut current = rows(c, Table::Baseline, project, locked)
        .await?
        .into_iter()
        .filter(|r| r["is_current"] == true)
        .collect::<Vec<_>>();
    if current.len() > 1 {
        return Err(conflict("operating_baseline_current_ambiguous"));
    }
    if current.first().is_some_and(|r| r["producer_version"] != 1) {
        return Err(conflict("legacy_operating_baseline_admission_required"));
    }
    Ok(current.pop())
}

pub(crate) async fn assert_period_absent(
    c: &mut PgConnection,
    project: Uuid,
    key: &str,
    locked: bool,
) -> Result<(), Error> {
    for row in rows(c, Table::Period, project, locked).await? {
        if row["period_key"] == key && row["status"] == "active" {
            return Err(conflict(if row["producer_version"] == 1 {
                "period_snapshot_exists"
            } else {
                "legacy_period_reconciliation_required"
            }));
        }
    }
    Ok(())
}

pub(crate) async fn source_member(
    session: &mut CommonSession<'_, '_>,
    context: Uuid,
    reference: &Value,
    payload: &Value,
) -> Result<(), Error> {
    let key = format!(
        "{}:{}:{}",
        reference["kind"].as_str().ok_or(Error::Internal)?,
        reference["id"].as_str().ok_or(Error::Internal)?,
        reference["payloadHash"].as_str().ok_or(Error::Internal)?
    );
    insert(session,Table::SourceMember,&json!({"context_id":context,"member_key":key,"source_kind":reference["kind"],"source_id":reference["id"],"source_row_version":reference["rowVersion"],"source_payload_hash":reference["payloadHash"],"captured_payload":payload})).await
}
