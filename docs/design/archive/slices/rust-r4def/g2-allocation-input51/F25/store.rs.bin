use crate::{
    approval_common::CommonSession,
    contract_support::{self, Error},
};
use chrono::{DateTime, SecondsFormat, Utc};
use serde_json::{Value, json};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row};
use std::collections::BTreeSet;
use uuid::Uuid;

#[derive(Clone, Copy)]
pub(super) enum Table {
    Cost,
    Basis,
    Result,
    Stage,
    Tax,
    Evidence,
    Source,
}
impl Table {
    pub(super) fn name(self) -> &'static str {
        match self {
            Self::Cost => "project_actual_cost_record",
            Self::Basis => "shared_cost_allocation_basis",
            Self::Result => "shared_cost_allocation_result",
            Self::Stage => "cost_stage_attribution_snapshot",
            Self::Tax => "accounting_tax_treatment_snapshot",
            Self::Evidence => "cost_governance_evidence",
            Self::Source => "shared_cost_allocation_source_snapshot",
        }
    }
    fn selected(self) -> String {
        let money: &[&str] = match self {
            Self::Cost => &[
                "amount_excluding_tax",
                "tax_cost_amount",
                "amount_including_tax",
                "internal_cost_rate",
                "labor_amount",
                "actual_hours",
                "actual_person_days",
            ],
            Self::Basis => &[
                "source_amount_excluding_tax",
                "source_tax_cost_amount",
                "source_amount_including_tax",
                "measurement_amount",
            ],
            Self::Result => &[
                "allocated_amount",
                "allocation_ratio",
                "allocation_weight",
                "allocated_amount_excluding_tax",
                "allocated_tax_cost_amount",
                "allocated_amount_including_tax",
            ],
            Self::Tax => &["tax_impact_amount", "tax_impact_pending_amount"],
            Self::Source => &[
                "amount_excluding_tax",
                "tax_cost_amount",
                "amount_including_tax",
            ],
            _ => &[],
        };
        if money.is_empty() {
            return "to_jsonb(t)".into();
        }
        format!(
            "to_jsonb(t)||jsonb_build_object({})",
            money
                .iter()
                .map(|n| format!("'{n}',t.{n}::text"))
                .collect::<Vec<_>>()
                .join(",")
        )
    }
}

pub(super) async fn row(
    connection: &mut PgConnection,
    table: Table,
    id: Uuid,
    lock: bool,
) -> Result<Value, Error> {
    let sql = format!(
        "SELECT {} AS data FROM poms.{} t WHERE id=$1{}",
        table.selected(),
        table.name(),
        if lock { " FOR UPDATE" } else { "" }
    );
    QueryBuilder::<Postgres>::new(sql)
        .build()
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(|r| r.try_get("data"))
        .transpose()?
        .ok_or_else(|| Error::NotFound("Requested cost governance resource not found".into()))
}

pub(super) async fn children(
    connection: &mut PgConnection,
    table: Table,
    id: Uuid,
    lock: bool,
) -> Result<Vec<Value>, Error> {
    let (column, order) = match table {
        Table::Result => ("basis_id", "status ASC,created_at ASC,id ASC"),
        Table::Stage => (
            "cost_record_id",
            "handled_at DESC NULLS LAST,created_at DESC,id DESC",
        ),
        Table::Tax => (
            "project_id",
            "confirmed_at DESC NULLS LAST,created_at DESC,id DESC",
        ),
        Table::Source => ("basis_id", "cost_record_id ASC"),
        _ => return Err(Error::Internal),
    };
    let order = if lock {
        if matches!(table, Table::Source) {
            "cost_record_id ASC"
        } else {
            "id ASC"
        }
    } else {
        order
    };
    let sql = format!(
        "SELECT {} AS data FROM poms.{} t WHERE {column}=$1 ORDER BY {order}{}",
        table.selected(),
        table.name(),
        if lock { " FOR UPDATE" } else { "" }
    );
    let rows = QueryBuilder::<Postgres>::new(sql)
        .build()
        .bind(id)
        .fetch_all(connection)
        .await?;
    rows.into_iter()
        .map(|r| r.try_get("data").map_err(Error::from))
        .collect()
}

pub(super) async fn insert(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    value: &Value,
) -> Result<(), Error> {
    let fields = value.as_object().ok_or(Error::Internal)?;
    // Column names come only from server-owned record constructors below, never
    // from a body/object spread. The extra check makes that boundary explicit.
    let columns = fields
        .keys()
        .map(|s| {
            if s.is_empty() || !s.bytes().all(|c| c.is_ascii_lowercase() || c == b'_') {
                return Err(Error::Internal);
            }
            Ok(format!("\"{s}\""))
        })
        .collect::<Result<Vec<_>, _>>()?
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
    if let Some(id) = value.get("id").and_then(Value::as_str) {
        session.state.trace.inserted(table.name(), id);
    } else if matches!(table, Table::Source) {
        session.state.trace.inserted(
            table.name(),
            &format!(
                "{}:{}",
                text(value, "basis_id")?,
                text(value, "cost_record_id")?
            ),
        );
    }
    Ok(())
}

pub(super) async fn supersede(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    value: &Value,
    actor: Uuid,
) -> Result<(), Error> {
    if !matches!(
        table,
        Table::Basis | Table::Result | Table::Stage | Table::Tax
    ) {
        return Err(Error::Internal);
    }
    version(value)?
        .checked_add(1)
        .ok_or_else(|| Error::Conflict("Governance version capacity is exhausted".into()))?;
    let sql = format!(
        "UPDATE poms.{} SET status='superseded',row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3 AND status='active' AND row_version=$4",
        table.name()
    );
    let n = QueryBuilder::<Postgres>::new(sql)
        .build()
        .bind(crate::auth::model::clock_now())
        .bind(actor)
        .bind(id(value, "id")?)
        .bind(version(value)?)
        .execute(&mut *session.connection)
        .await?
        .rows_affected();
    if n != 1 {
        return Err(Error::Conflict(
            "Cost governance current version changed".into(),
        ));
    }
    Ok(())
}

pub(super) async fn locks(
    connection: &mut PgConnection,
    projects: impl IntoIterator<Item = Uuid>,
) -> Result<(), Error> {
    let projects = projects.into_iter().collect::<BTreeSet<_>>();
    for id in projects {
        contract_support::lock_project(connection, id).await?;
    }
    Ok(())
}

pub(super) async fn cost_projects(
    connection: &mut PgConnection,
    costs: &[Uuid],
) -> Result<Vec<Uuid>, Error> {
    let mut result = Vec::new();
    for cost in costs {
        let r = row(connection, Table::Cost, *cost, false).await?;
        result.push(id(&r, "project_id")?);
    }
    Ok(result)
}

pub(super) async fn occupied(connection: &mut PgConnection, id: Uuid) -> Result<bool, Error> {
    Ok(sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM poms.shared_cost_allocation_source_snapshot WHERE cost_record_id=$1 AND is_current)").bind(id).fetch_one(connection).await?)
}

pub(super) async fn evidence(
    connection: &mut PgConnection,
    value: &Value,
) -> Result<Option<Value>, Error> {
    match optional_id(value, "governance_evidence_id")? {
        Some(id) => {
            let evidence = row(connection, Table::Evidence, id, false).await?;
            let (kind, project) = if value.get("source_cost_scope_key").is_some() {
                ("SharedCostAllocationBasis", None)
            } else if value.get("basis_id").is_some() {
                (
                    "SharedCostAllocationResult",
                    Some(self::id(value, "project_id")?),
                )
            } else if value.get("cost_record_id").is_some() {
                let cost = row(
                    connection,
                    Table::Cost,
                    self::id(value, "cost_record_id")?,
                    false,
                )
                .await?;
                (
                    "CostStageAttributionSnapshot",
                    Some(self::id(&cost, "project_id")?),
                )
            } else if value.get("tax_treatment_type").is_some() {
                (
                    "AccountingTaxTreatmentSnapshot",
                    Some(self::id(value, "project_id")?),
                )
            } else {
                return Err(Error::Internal);
            };
            if evidence["target_type"] != kind
                || self::id(&evidence, "target_id")? != self::id(value, "id")?
                || optional_id(&evidence, "project_id")? != project
                || evidence["payload_hash"]
                    != contract_support::canonical_hash(&evidence["frozen_payload"])?
            {
                return Err(Error::Conflict(
                    "Governance evidence integrity requires review".into(),
                ));
            }
            Ok(Some(evidence))
        }
        None => Ok(None),
    }
}

pub(super) fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, Error> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| Error::BadRequest(format!("{key} is required")))
}
pub(super) fn optional_text(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_owned)
}
pub(super) fn id(value: &Value, key: &str) -> Result<Uuid, Error> {
    Uuid::parse_str(text(value, key)?)
        .map_err(|_| Error::BadRequest("Invalid resource identity".into()))
}
pub(super) fn optional_id(value: &Value, key: &str) -> Result<Option<Uuid>, Error> {
    match value.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(_) => id(value, key).map(Some),
    }
}
pub(super) fn version(value: &Value) -> Result<i32, Error> {
    value
        .get("row_version")
        .and_then(Value::as_i64)
        .and_then(|v| i32::try_from(v).ok())
        .filter(|v| *v > 0)
        .ok_or(Error::Internal)
}
pub(super) fn active(value: &Value) -> Result<(), Error> {
    if value.get("status").and_then(Value::as_str) != Some("active") {
        return Err(Error::Conflict(
            "Only an active current governance fact can be changed".into(),
        ));
    }
    Ok(())
}
pub(super) fn certify(value: &Value) -> &'static str {
    if value
        .get("governance_schema_version")
        .and_then(Value::as_i64)
        == Some(1)
    {
        "verified"
    } else {
        "legacy-unverified"
    }
}
pub(super) fn timestamp(value: &Value, key: &str) -> Result<Value, Error> {
    match value.get(key) {
        None | Some(Value::Null) => Ok(Value::Null),
        Some(v) => {
            let s = v.as_str().ok_or(Error::Internal)?;
            let d = DateTime::parse_from_rfc3339(s).map_err(|_| Error::Internal)?;
            Ok(json!(
                d.with_timezone(&Utc)
                    .to_rfc3339_opts(SecondsFormat::Millis, true)
            ))
        }
    }
}
pub(super) fn now() -> String {
    crate::auth::model::clock_now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub(super) fn command(id: Uuid, target: &str) -> Value {
    json!({"targetId":id,"targetType":target,"resultStatus":"success","businessStatusAfter":"active","approvalRecordId":null,"confirmationRecordId":null,"todoItemIds":[]})
}
