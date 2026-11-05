//! All SQL borrows the outer transaction; decimal columns are explicitly text.
use crate::contract_support::Error;
use serde_json::Value;
use sqlx::{PgConnection, Postgres, QueryBuilder, Row};
use uuid::Uuid;

#[derive(Clone, Copy)]
pub enum Table {
    Cost,
    Expense,
    Rate,
    Payment,
    Invoice,
    Payable,
}
impl Table {
    fn name(self) -> &'static str {
        match self {
            Self::Cost => "project_actual_cost_record",
            Self::Expense => "expense_record",
            Self::Rate => "internal_cost_rate_version",
            Self::Payment => "payment_record",
            Self::Invoice => "invoice_record",
            Self::Payable => "payable_record",
        }
    }
    fn decimal(self) -> &'static [&'static str] {
        match self {
            Self::Cost => &[
                "amount_excluding_tax",
                "tax_cost_amount",
                "amount_including_tax",
                "actual_hours",
                "actual_person_days",
                "internal_cost_rate",
                "labor_amount",
            ],
            Self::Expense | Self::Payment | Self::Payable => {
                &["amount_excluding_tax", "tax_amount", "amount_including_tax"]
            }
            Self::Rate => &["rate_value"],
            Self::Invoice => &["invoice_amount"],
        }
    }
    fn select(self) -> String {
        let fields = self
            .decimal()
            .iter()
            .map(|f| format!("'{f}',t.{f}::text"))
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "SELECT to_jsonb(t) || jsonb_build_object({fields}) FROM poms.{} t",
            self.name()
        )
    }
}
pub async fn row(c: &mut PgConnection, t: Table, id: Uuid, lock: bool) -> Result<Value, Error> {
    let sql = format!(
        "{} WHERE t.id=$1{}",
        t.select(),
        if lock { " FOR UPDATE" } else { "" }
    );
    let mut query = QueryBuilder::<Postgres>::new(sql);
    query
        .build_query_scalar()
        .bind(id)
        .fetch_optional(c)
        .await?
        .ok_or_else(|| Error::NotFound("Business record not found".into()))
}
pub async fn list(
    c: &mut PgConnection,
    t: Table,
    project: Uuid,
    filters: &Value,
) -> Result<Vec<Value>, Error> {
    let sql = match t {
        Table::Cost => format!(
            "{} WHERE t.project_id=$1 AND ($2::text IS NULL OR t.cost_type=$2) AND ($3::text IS NULL OR t.record_status=$3) AND ($4::text IS NULL OR t.source_type=$4) ORDER BY occurred_on DESC,created_at DESC,id",
            t.select()
        ),
        Table::Expense => format!(
            "{} WHERE t.project_id=$1 ORDER BY expense_date DESC,created_at DESC,id",
            t.select()
        ),
        _ => return Err(Error::Internal),
    };
    let mut query = QueryBuilder::<Postgres>::new(sql);
    let q = query.build_query_scalar().bind(project);
    Ok(if matches!(t, Table::Cost) {
        q.bind(filters["costType"].as_str())
            .bind(filters["recordStatus"].as_str())
            .bind(filters["sourceType"].as_str())
            .fetch_all(c)
            .await?
    } else {
        q.fetch_all(c).await?
    })
}
fn columns(row: &Value) -> Result<Vec<String>, Error> {
    let map = row.as_object().ok_or(Error::Internal)?;
    let keys = map.keys().cloned().collect::<Vec<_>>();
    if keys
        .iter()
        .any(|s| s.is_empty() || !s.bytes().all(|b| b.is_ascii_lowercase() || b == b'_'))
    {
        return Err(Error::Internal);
    }
    Ok(keys)
}
pub async fn insert(c: &mut PgConnection, t: Table, value: &Value) -> Result<(), Error> {
    if !matches!(t, Table::Cost | Table::Expense | Table::Rate) {
        return Err(Error::Internal);
    }
    let keys = columns(value)?;
    let cols = keys
        .iter()
        .map(|s| format!("\"{s}\""))
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "INSERT INTO poms.{} ({cols}) SELECT {cols} FROM jsonb_populate_record(NULL::poms.{},$1::jsonb)",
        t.name(),
        t.name()
    );
    let mut query = QueryBuilder::<Postgres>::new(sql);
    query.build().bind(value).execute(c).await?;
    Ok(())
}
pub async fn update(
    c: &mut PgConnection,
    t: Table,
    value: &Value,
    expected: i32,
    keys: &[&str],
) -> Result<(), Error> {
    if !matches!(t, Table::Cost | Table::Expense | Table::Rate)
        || keys
            .iter()
            .any(|s| !s.bytes().all(|b| b.is_ascii_lowercase() || b == b'_'))
    {
        return Err(Error::Internal);
    }
    let cols = keys
        .iter()
        .map(|s| format!("\"{s}\""))
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "UPDATE poms.{} SET ({cols})=(SELECT {cols} FROM jsonb_populate_record(NULL::poms.{},$1::jsonb)) WHERE id=$2 AND row_version=$3",
        t.name(),
        t.name()
    );
    let id = value["id"]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or(Error::Internal)?;
    let mut query = QueryBuilder::<Postgres>::new(sql);
    if query
        .build()
        .bind(value)
        .bind(id)
        .bind(expected)
        .execute(c)
        .await?
        .rows_affected()
        != 1
    {
        return Err(Error::Conflict("Business record version changed".into()));
    }
    Ok(())
}
pub async fn current_mapping(
    c: &mut PgConnection,
    kind: &str,
    id: Uuid,
) -> Result<Option<Uuid>, Error> {
    let rows=sqlx::query("SELECT id,source_id FROM poms.project_actual_cost_record WHERE source_type=$1 AND record_status IN ('registered','confirmed','included') ORDER BY id").bind(kind).fetch_all(c).await?;
    for row in rows {
        let source: Option<String> = row.try_get("source_id")?;
        if source.as_deref().and_then(|s| Uuid::parse_str(s).ok()) == Some(id) {
            return Ok(Some(row.try_get("id")?));
        }
    }
    Ok(None)
}
pub async fn successor(c: &mut PgConnection, id: Uuid) -> Result<Option<Uuid>, Error> {
    Ok(sqlx::query_scalar("SELECT id FROM poms.project_actual_cost_record WHERE supersedes_record_id=$1 ORDER BY id LIMIT 1").bind(id).fetch_optional(c).await?)
}
pub async fn allocated(c: &mut PgConnection, id: Uuid) -> Result<bool, Error> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.shared_cost_allocation_source_snapshot WHERE cost_record_id=$1 AND is_current)").bind(id).fetch_one(c).await?)
}
pub async fn frozen_stage(c: &mut PgConnection, id: Uuid) -> Result<bool, Error> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.cost_stage_attribution_snapshot WHERE cost_record_id=$1 AND status='active' AND locked_by_snapshot_id IS NOT NULL)").bind(id).fetch_one(c).await?)
}
pub async fn family_locks(c: &mut PgConnection, mut keys: Vec<String>) -> Result<(), Error> {
    keys.sort();
    keys.dedup();
    for key in keys {
        sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
            .bind(format!("poms:cost-rate:{key}"))
            .execute(&mut *c)
            .await?;
    }
    Ok(())
}
pub async fn current_rate(c: &mut PgConnection, key: &str) -> Result<Option<Value>, Error> {
    let sql = format!(
        "{} WHERE t.rate_key=$1 AND t.is_current FOR UPDATE",
        Table::Rate.select()
    );
    let mut query = QueryBuilder::<Postgres>::new(sql);
    Ok(query
        .build_query_scalar()
        .bind(key)
        .fetch_optional(c)
        .await?)
}
pub async fn personal_rates(
    c: &mut PgConnection,
    person: Uuid,
    start: &str,
    end: &str,
) -> Result<Vec<Value>, Error> {
    let sql = format!(
        "{} WHERE t.rate_scope_type='person' AND t.person_id=$1 AND t.status IN ('active','superseded') AND t.effective_from <= $3::date AND (t.effective_to IS NULL OR t.effective_to >= $2::date) ORDER BY effective_from,id FOR SHARE",
        Table::Rate.select()
    );
    let mut query = QueryBuilder::<Postgres>::new(sql);
    Ok(query
        .build_query_scalar()
        .bind(person)
        .bind(start)
        .bind(end)
        .fetch_all(c)
        .await?)
}
pub async fn rate_overlap(
    c: &mut PgConnection,
    key: &str,
    start: &str,
    end: Option<&str>,
    except: Option<Uuid>,
) -> Result<bool, Error> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.internal_cost_rate_version WHERE rate_key=$1 AND status IN ('active','superseded') AND ($4::uuid IS NULL OR id<>$4) AND daterange(effective_from,effective_to,'[]') && daterange($2::date,$3::date,'[]'))").bind(key).bind(start).bind(end).bind(except).fetch_one(c).await?)
}
pub async fn scope_overlap(
    c: &mut PgConnection,
    project: Uuid,
    key: &str,
    start: &str,
    end: &str,
    except: Option<Uuid>,
) -> Result<bool, Error> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_actual_cost_record WHERE project_id=$1 AND cost_type='labor' AND labor_scope_key=$2 AND record_status IN ('registered','confirmed','included') AND ($5::uuid IS NULL OR id<>$5) AND daterange(labor_period_start,labor_period_end,'[]') && daterange($3::date,$4::date,'[]'))").bind(project).bind(key).bind(start).bind(end).bind(except).fetch_one(c).await?)
}
