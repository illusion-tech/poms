//! Original tables and predicates only. Parent INSERT deliberately precedes
//! old-current UPDATE, as witnessed Native SQL-order-authority02 requires.

use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row as SqlxRow, postgres::PgRow};
use uuid::Uuid;

use super::model::CreateRequest;
use crate::compat::scalars::{NumberInput, js_iso_string, js_to_fixed, legacy_number};

#[derive(Clone, Debug)]
pub struct Row<V = i32> {
    pub id: Uuid,
    pub project_id: Uuid,
    pub version: V,
    pub is_current: bool,
    pub supersedes_id: Option<Uuid>,
    pub status: String,
    pub technical_feasibility_decision: String,
    pub technical_conclusion_summary: String,
    pub allow_next_stage: bool,
    pub currency_code: String,
    pub total_estimated_amount_excluding_tax: String,
    pub total_tax_cost_amount: String,
    pub total_estimated_amount_including_tax: String,
    pub tax_assumption_summary: String,
    pub tax_review_status: String,
    pub highest_risk_level: Option<String>,
    pub blocker_count: i32,
    pub effective_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
    pub row_version: i32,
}

/// JS increments the int4 source version as a Number before PostgreSQL checks
/// the new int4 value. Keep that candidate wide until its parent INSERT.
pub type NewPackage = Row<i64>;

macro_rules! columns {
    () => { "id,project_id,version,is_current,supersedes_id,status,technical_feasibility_decision,technical_conclusion_summary,allow_next_stage,currency_code,total_estimated_amount_excluding_tax::text,total_tax_cost_amount::text,total_estimated_amount_including_tax::text,tax_assumption_summary,tax_review_status,highest_risk_level,blocker_count,effective_at,created_at,created_by,updated_at,updated_by,row_version" };
}

fn row(value: PgRow) -> Result<Row, sqlx::Error> {
    Ok(Row {
        id: value.try_get("id")?,
        project_id: value.try_get("project_id")?,
        version: value.try_get("version")?,
        is_current: value.try_get("is_current")?,
        supersedes_id: value.try_get("supersedes_id")?,
        status: value.try_get("status")?,
        technical_feasibility_decision: value.try_get("technical_feasibility_decision")?,
        technical_conclusion_summary: value.try_get("technical_conclusion_summary")?,
        allow_next_stage: value.try_get("allow_next_stage")?,
        currency_code: value.try_get("currency_code")?,
        total_estimated_amount_excluding_tax: value
            .try_get("total_estimated_amount_excluding_tax")?,
        total_tax_cost_amount: value.try_get("total_tax_cost_amount")?,
        total_estimated_amount_including_tax: value
            .try_get("total_estimated_amount_including_tax")?,
        tax_assumption_summary: value.try_get("tax_assumption_summary")?,
        tax_review_status: value.try_get("tax_review_status")?,
        highest_risk_level: value.try_get("highest_risk_level")?,
        blocker_count: value.try_get("blocker_count")?,
        effective_at: value.try_get("effective_at")?,
        created_at: value.try_get("created_at")?,
        created_by: value.try_get("created_by")?,
        updated_at: value.try_get("updated_at")?,
        updated_by: value.try_get("updated_by")?,
        row_version: value.try_get("row_version")?,
    })
}

pub async fn list(
    connection: &mut PgConnection,
    project_id: &str,
) -> Result<Vec<Row>, sqlx::Error> {
    sqlx::query(concat!("SELECT ",columns!()," FROM poms.project_technical_cost_package WHERE project_id=$1::text::uuid ORDER BY version DESC,effective_at DESC,created_at DESC"))
        .bind(project_id).fetch_all(connection).await?.into_iter().map(row).collect()
}

pub async fn current(
    connection: &mut PgConnection,
    project_id: &str,
) -> Result<Option<Row>, sqlx::Error> {
    sqlx::query(concat!("SELECT ",columns!()," FROM poms.project_technical_cost_package WHERE project_id=$1::text::uuid AND is_current=true AND status='effective' ORDER BY version DESC,effective_at DESC,created_at DESC LIMIT 1"))
        .bind(project_id).fetch_optional(connection).await?.map(row).transpose()
}

pub async fn by_id(connection: &mut PgConnection, id: Uuid) -> Result<Option<Row>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        columns!(),
        " FROM poms.project_technical_cost_package WHERE id=$1 LIMIT 1"
    ))
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(row)
    .transpose()
}

fn iso(value: DateTime<Utc>) -> String {
    js_iso_string(value).unwrap_or_else(|_| value.to_rfc3339())
}

pub fn summary(value: &Row) -> Value {
    json!({
        "id":value.id,"projectId":value.project_id,"version":value.version,"isCurrent":value.is_current,
        "supersedesId":value.supersedes_id,"status":value.status,"technicalFeasibilityDecision":value.technical_feasibility_decision,
        "technicalConclusionSummary":value.technical_conclusion_summary,"allowNextStage":value.allow_next_stage,
        "currencyCode":value.currency_code,"totalEstimatedAmountExcludingTax":value.total_estimated_amount_excluding_tax,
        "totalTaxCostAmount":value.total_tax_cost_amount,"totalEstimatedAmountIncludingTax":value.total_estimated_amount_including_tax,
        "taxAssumptionSummary":value.tax_assumption_summary,"taxReviewStatus":value.tax_review_status,
        "highestRiskLevel":value.highest_risk_level,"blockerCount":value.blocker_count,
        "effectiveAt":iso(value.effective_at),"createdAt":iso(value.created_at),"createdBy":value.created_by,
        "updatedAt":iso(value.updated_at),"updatedBy":value.updated_by,"rowVersion":value.row_version,
    })
}

pub async fn insert(connection: &mut PgConnection, value: &NewPackage) -> Result<Row, sqlx::Error> {
    sqlx::query(concat!("INSERT INTO poms.project_technical_cost_package (id,project_id,version,is_current,supersedes_id,status,technical_feasibility_decision,technical_conclusion_summary,allow_next_stage,currency_code,total_estimated_amount_excluding_tax,total_tax_cost_amount,total_estimated_amount_including_tax,tax_assumption_summary,tax_review_status,highest_risk_level,blocker_count,effective_at,created_at,created_by,updated_at,updated_by,row_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text::numeric,$12::text::numeric,$13::text::numeric,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING ",columns!()))
        .bind(value.id).bind(value.project_id).bind(value.version).bind(value.is_current).bind(value.supersedes_id)
        .bind(&value.status).bind(&value.technical_feasibility_decision).bind(&value.technical_conclusion_summary)
        .bind(value.allow_next_stage).bind(&value.currency_code).bind(&value.total_estimated_amount_excluding_tax)
        .bind(&value.total_tax_cost_amount).bind(&value.total_estimated_amount_including_tax).bind(&value.tax_assumption_summary)
        .bind(&value.tax_review_status).bind(&value.highest_risk_level).bind(value.blocker_count).bind(value.effective_at)
        .bind(value.created_at).bind(value.created_by).bind(value.updated_at).bind(value.updated_by).bind(value.row_version)
        .fetch_one(connection).await.and_then(row)
}

fn money(value: &str) -> String {
    js_to_fixed(legacy_number(NumberInput::Text(value)), 2).unwrap_or_default()
}

/// Native's ORM orders dependent INSERT groups as cost -> risk -> scope,
/// independently of the persist graph's original [scope,risk,cost] array.
pub async fn insert_children(
    connection: &mut PgConnection,
    id: Uuid,
    input: &CreateRequest,
) -> Result<(), sqlx::Error> {
    if !input.cost_items.is_empty() {
        let mut query = QueryBuilder::<Postgres>::new(
            "INSERT INTO poms.project_technical_cost_item (package_id,cost_category,cost_subcategory,cost_description,estimation_basis,quantity,unit,unit_price,amount_excluding_tax,tax_cost_amount,amount_including_tax,currency_code,confidence_level,high_uncertainty,responsible_role,sort_order) ",
        );
        query.push_values(
            input.cost_items.iter().enumerate(),
            |mut b, (index, item)| {
                b.push_bind(id)
                    .push_bind(item.cost_category.to_utf8_lossy())
                    .push_bind(item.cost_subcategory.as_ref().map(|v| v.to_utf8_lossy()))
                    .push_bind(item.cost_description.to_utf8_lossy())
                    .push_bind(item.estimation_basis.to_utf8_lossy())
                    .push_bind(item.quantity.clone())
                    .push_unseparated("::text::numeric")
                    .push_bind(item.unit.as_ref().map(|v| v.to_utf8_lossy()))
                    .push_bind(item.unit_price.clone())
                    .push_unseparated("::text::numeric")
                    .push_bind(money(&item.amount_excluding_tax))
                    .push_unseparated("::text::numeric")
                    .push_bind(money(&item.tax_cost_amount))
                    .push_unseparated("::text::numeric")
                    .push_bind(money(&item.amount_including_tax))
                    .push_unseparated("::text::numeric")
                    .push_bind(item.currency_code.to_utf8_lossy())
                    .push_bind(item.confidence_level.clone())
                    .push_bind(item.high_uncertainty)
                    .push_bind(item.responsible_role.as_ref().map(|v| v.to_utf8_lossy()))
                    .push_bind(item.sort_order.unwrap_or(index as i64 + 1))
                    .push_unseparated("::int4");
            },
        );
        query.build().execute(&mut *connection).await?;
    }
    if !input.risk_items.is_empty() {
        let mut query = QueryBuilder::<Postgres>::new(
            "INSERT INTO poms.project_technical_risk_item (package_id,risk_category,risk_level,risk_description,impact_scope,mitigation_plan,owner_role,risk_status,blocks_next_stage,sort_order) ",
        );
        query.push_values(
            input.risk_items.iter().enumerate(),
            |mut b, (index, item)| {
                b.push_bind(id)
                    .push_bind(item.risk_category.to_utf8_lossy())
                    .push_bind(item.risk_level.clone())
                    .push_bind(item.risk_description.to_utf8_lossy())
                    .push_bind(item.impact_scope.to_utf8_lossy())
                    .push_bind(item.mitigation_plan.to_utf8_lossy())
                    .push_bind(item.owner_role.to_utf8_lossy())
                    .push_bind(item.risk_status.clone())
                    .push_bind(item.blocks_next_stage)
                    .push_bind(item.sort_order.unwrap_or(index as i64 + 1))
                    .push_unseparated("::int4");
            },
        );
        query.build().execute(&mut *connection).await?;
    }
    if !input.scope_items.is_empty() {
        let mut query = QueryBuilder::<Postgres>::new(
            "INSERT INTO poms.project_technical_scope_item (package_id,scope_type,label,description,sort_order) ",
        );
        query.push_values(
            input.scope_items.iter().enumerate(),
            |mut b, (index, item)| {
                b.push_bind(id)
                    .push_bind(item.scope_type.clone())
                    .push_bind(item.label.to_utf8_lossy())
                    .push_bind(item.description.to_utf8_lossy())
                    .push_bind(item.sort_order.unwrap_or(index as i64 + 1))
                    .push_unseparated("::int4");
            },
        );
        query.build().execute(&mut *connection).await?;
    }
    Ok(())
}

pub async fn supersede(
    connection: &mut PgConnection,
    previous: &Row,
    actor: Uuid,
    now: DateTime<Utc>,
) -> Result<(), sqlx::Error> {
    let result=sqlx::query("UPDATE poms.project_technical_cost_package SET is_current=false,status='superseded',updated_by=$1,updated_at=$2,row_version=row_version+1 WHERE id=$3 AND row_version=$4 RETURNING id")
        .bind(actor).bind(now).bind(previous.id).bind(previous.row_version).fetch_optional(connection).await?;
    if result.is_none() {
        return Err(sqlx::Error::Protocol(
            "technical cost managed version conflict".into(),
        ));
    }
    Ok(())
}

#[derive(Clone)]
pub struct RiskRow {
    pub risk_category: String,
    pub risk_description: String,
    pub risk_status: String,
    pub blocks_next_stage: bool,
    pub view: Value,
}

pub async fn scopes(connection: &mut PgConnection, id: Uuid) -> Result<Vec<Value>, sqlx::Error> {
    sqlx::query("SELECT id,package_id,scope_type,label,description,sort_order FROM poms.project_technical_scope_item WHERE package_id=ANY($1) ORDER BY package_id ASC,sort_order ASC")
        .bind(vec![id]).fetch_all(connection).await?.into_iter().map(|r|Ok(json!({
            "id":r.try_get::<Uuid,_>("id")?,"packageId":r.try_get::<Uuid,_>("package_id")?,"scopeType":r.try_get::<String,_>("scope_type")?,
            "label":r.try_get::<String,_>("label")?,"description":r.try_get::<String,_>("description")?,"sortOrder":r.try_get::<i32,_>("sort_order")?,
        }))).collect()
}

pub async fn risks(connection: &mut PgConnection, id: Uuid) -> Result<Vec<RiskRow>, sqlx::Error> {
    sqlx::query("SELECT id,package_id,risk_category,risk_level,risk_description,impact_scope,mitigation_plan,owner_role,risk_status,blocks_next_stage,sort_order FROM poms.project_technical_risk_item WHERE package_id=ANY($1) ORDER BY package_id ASC,sort_order ASC")
        .bind(vec![id]).fetch_all(connection).await?.into_iter().map(|r|{
            let risk_category:String=r.try_get("risk_category")?;
            let risk_description:String=r.try_get("risk_description")?;
            let risk_status:String=r.try_get("risk_status")?;
            let blocks_next_stage:bool=r.try_get("blocks_next_stage")?;
            let view=json!({
                "id":r.try_get::<Uuid,_>("id")?,"packageId":r.try_get::<Uuid,_>("package_id")?,"riskCategory":risk_category,
                "riskLevel":r.try_get::<String,_>("risk_level")?,"riskDescription":risk_description,
                "impactScope":r.try_get::<String,_>("impact_scope")?,"mitigationPlan":r.try_get::<String,_>("mitigation_plan")?,
                "ownerRole":r.try_get::<String,_>("owner_role")?,"riskStatus":risk_status,"blocksNextStage":blocks_next_stage,
                "sortOrder":r.try_get::<i32,_>("sort_order")?,
            });
            Ok(RiskRow{risk_category,risk_description,risk_status,blocks_next_stage,view})
        }).collect()
}

pub async fn costs(connection: &mut PgConnection, id: Uuid) -> Result<Vec<Value>, sqlx::Error> {
    sqlx::query("SELECT id,package_id,cost_category,cost_subcategory,cost_description,estimation_basis,quantity::text,unit,unit_price::text,amount_excluding_tax::text,tax_cost_amount::text,amount_including_tax::text,currency_code,confidence_level,high_uncertainty,responsible_role,sort_order FROM poms.project_technical_cost_item WHERE package_id=ANY($1) ORDER BY package_id ASC,sort_order ASC")
        .bind(vec![id]).fetch_all(connection).await?.into_iter().map(|r|Ok(json!({
            "id":r.try_get::<Uuid,_>("id")?,"packageId":r.try_get::<Uuid,_>("package_id")?,"costCategory":r.try_get::<String,_>("cost_category")?,
            "costSubcategory":r.try_get::<Option<String>,_>("cost_subcategory")?,"costDescription":r.try_get::<String,_>("cost_description")?,
            "estimationBasis":r.try_get::<String,_>("estimation_basis")?,"quantity":r.try_get::<Option<String>,_>("quantity")?,
            "unit":r.try_get::<Option<String>,_>("unit")?,"unitPrice":r.try_get::<Option<String>,_>("unit_price")?,
            "amountExcludingTax":r.try_get::<String,_>("amount_excluding_tax")?,"taxCostAmount":r.try_get::<String,_>("tax_cost_amount")?,
            "amountIncludingTax":r.try_get::<String,_>("amount_including_tax")?,"currencyCode":r.try_get::<String,_>("currency_code")?,
            "confidenceLevel":r.try_get::<String,_>("confidence_level")?,"highUncertainty":r.try_get::<bool,_>("high_uncertainty")?,
            "responsibleRole":r.try_get::<Option<String>,_>("responsible_role")?,"sortOrder":r.try_get::<i32,_>("sort_order")?,
        }))).collect()
}
