use chrono::{DateTime, SecondsFormat, Utc};
use serde_json::{Value, json};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row as SqlxRow, postgres::PgRow};
use uuid::Uuid;

use super::model::CreateRequest;
use crate::compat::scalars::js_iso_string;

#[derive(Clone, Debug)]
pub struct Row<V = i32> {
    pub id: Uuid,
    pub project_id: Uuid,
    pub version: V,
    pub is_current: bool,
    pub supersedes_id: Option<Uuid>,
    pub status: String,
    pub technical_cost_package_id: Uuid,
    pub bid_commercial_process_id: Option<Uuid>,
    pub commercial_release_baseline_id: Option<Uuid>,
    pub pricing_path: String,
    pub quote_version: String,
    pub currency_code: String,
    pub quote_amount_tax_inclusive: String,
    pub quote_amount_tax_exclusive: String,
    pub tax_rate: String,
    pub tax_condition_summary: String,
    pub payment_terms_summary: String,
    pub gross_margin_rate: Option<String>,
    pub gross_margin_band: String,
    pub gross_margin_summary: String,
    pub decision: String,
    pub decision_summary: String,
    pub approval_scenario_key: Option<String>,
    pub summary_package_key: Option<String>,
    pub summary_snapshot_id: Option<Uuid>,
    pub projection_level: Option<String>,
    pub export_policy: Option<String>,
    pub ready_for_contracting: bool,
    pub owner_role: Option<String>,
    pub blocker_count: i32,
    pub effective_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
    pub row_version: i32,
}

/// Keep the next version wide until PostgreSQL applies its existing int4 bound.
pub type NewReview = Row<i64>;

macro_rules! columns {
    ()=>{"id,project_id,version,is_current,supersedes_id,status,technical_cost_package_id,bid_commercial_process_id,commercial_release_baseline_id,pricing_path,quote_version,currency_code,quote_amount_tax_inclusive::text,quote_amount_tax_exclusive::text,tax_rate::text,tax_condition_summary,payment_terms_summary,gross_margin_rate::text,gross_margin_band,gross_margin_summary,decision,decision_summary,approval_scenario_key,summary_package_key,summary_snapshot_id,projection_level,export_policy,ready_for_contracting,owner_role,blocker_count,effective_at,created_at,created_by,updated_at,updated_by,row_version"};
}

fn row(r: PgRow) -> Result<Row, sqlx::Error> {
    Ok(Row {
        id: r.try_get("id")?,
        project_id: r.try_get("project_id")?,
        version: r.try_get("version")?,
        is_current: r.try_get("is_current")?,
        supersedes_id: r.try_get("supersedes_id")?,
        status: r.try_get("status")?,
        technical_cost_package_id: r.try_get("technical_cost_package_id")?,
        bid_commercial_process_id: r.try_get("bid_commercial_process_id")?,
        commercial_release_baseline_id: r.try_get("commercial_release_baseline_id")?,
        pricing_path: r.try_get("pricing_path")?,
        quote_version: r.try_get("quote_version")?,
        currency_code: r.try_get("currency_code")?,
        quote_amount_tax_inclusive: r.try_get("quote_amount_tax_inclusive")?,
        quote_amount_tax_exclusive: r.try_get("quote_amount_tax_exclusive")?,
        tax_rate: r.try_get("tax_rate")?,
        tax_condition_summary: r.try_get("tax_condition_summary")?,
        payment_terms_summary: r.try_get("payment_terms_summary")?,
        gross_margin_rate: r.try_get("gross_margin_rate")?,
        gross_margin_band: r.try_get("gross_margin_band")?,
        gross_margin_summary: r.try_get("gross_margin_summary")?,
        decision: r.try_get("decision")?,
        decision_summary: r.try_get("decision_summary")?,
        approval_scenario_key: r.try_get("approval_scenario_key")?,
        summary_package_key: r.try_get("summary_package_key")?,
        summary_snapshot_id: r.try_get("summary_snapshot_id")?,
        projection_level: r.try_get("projection_level")?,
        export_policy: r.try_get("export_policy")?,
        ready_for_contracting: r.try_get("ready_for_contracting")?,
        owner_role: r.try_get("owner_role")?,
        blocker_count: r.try_get("blocker_count")?,
        effective_at: r.try_get("effective_at")?,
        created_at: r.try_get("created_at")?,
        created_by: r.try_get("created_by")?,
        updated_at: r.try_get("updated_at")?,
        updated_by: r.try_get("updated_by")?,
        row_version: r.try_get("row_version")?,
    })
}

pub async fn list(
    connection: &mut PgConnection,
    project_id: &str,
) -> Result<Vec<Row>, sqlx::Error> {
    sqlx::query(concat!("SELECT ",columns!()," FROM poms.project_pricing_margin_review WHERE project_id=$1::text::uuid ORDER BY version DESC,effective_at DESC,created_at DESC"))
        .bind(project_id).fetch_all(connection).await?.into_iter().map(row).collect()
}

pub async fn current(
    connection: &mut PgConnection,
    project_id: &str,
) -> Result<Option<Row>, sqlx::Error> {
    sqlx::query(concat!("SELECT ",columns!()," FROM poms.project_pricing_margin_review WHERE project_id=$1::text::uuid AND is_current=true AND status='effective' ORDER BY version DESC,effective_at DESC,created_at DESC LIMIT 1"))
        .bind(project_id).fetch_optional(connection).await?.map(row).transpose()
}

pub(crate) async fn next_version(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar("SELECT COALESCE(MAX(version)::bigint,0)+1 FROM poms.project_pricing_margin_review WHERE project_id=$1")
        .bind(project_id).fetch_one(connection).await
}

pub async fn by_id(connection: &mut PgConnection, id: Uuid) -> Result<Option<Row>, sqlx::Error> {
    sqlx::query(concat!(
        "SELECT ",
        columns!(),
        " FROM poms.project_pricing_margin_review WHERE id=$1 LIMIT 1"
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

pub fn summary(r: &Row) -> Value {
    json!({
        "id":r.id,"projectId":r.project_id,"version":r.version,"isCurrent":r.is_current,"supersedesId":r.supersedes_id,"status":r.status,
        "technicalCostPackageId":r.technical_cost_package_id,"bidCommercialProcessId":r.bid_commercial_process_id,
        "commercialReleaseBaselineId":r.commercial_release_baseline_id,"pricingPath":r.pricing_path,"quoteVersion":r.quote_version,
        "currencyCode":r.currency_code,"quoteAmountTaxInclusive":r.quote_amount_tax_inclusive,"quoteAmountTaxExclusive":r.quote_amount_tax_exclusive,
        "taxRate":r.tax_rate,"taxConditionSummary":r.tax_condition_summary,"paymentTermsSummary":r.payment_terms_summary,
        "grossMarginRate":r.gross_margin_rate,"grossMarginBand":r.gross_margin_band,"grossMarginSummary":r.gross_margin_summary,
        "decision":r.decision,"decisionSummary":r.decision_summary,"approvalScenarioKey":r.approval_scenario_key,
        "summaryPackageKey":r.summary_package_key,"summarySnapshotId":r.summary_snapshot_id,"projectionLevel":r.projection_level,
        "exportPolicy":r.export_policy,"readyForContracting":r.ready_for_contracting,"ownerRole":r.owner_role,"blockerCount":r.blocker_count,
        "effectiveAt":iso(r.effective_at),"createdAt":iso(r.created_at),"createdBy":r.created_by,"updatedAt":iso(r.updated_at),"updatedBy":r.updated_by,"rowVersion":r.row_version,
    })
}

pub async fn insert(connection: &mut PgConnection, r: &NewReview) -> Result<Row, sqlx::Error> {
    sqlx::query(concat!("INSERT INTO poms.project_pricing_margin_review (id,project_id,version,is_current,supersedes_id,status,technical_cost_package_id,bid_commercial_process_id,commercial_release_baseline_id,pricing_path,quote_version,currency_code,quote_amount_tax_inclusive,quote_amount_tax_exclusive,tax_rate,tax_condition_summary,payment_terms_summary,gross_margin_rate,gross_margin_band,gross_margin_summary,decision,decision_summary,approval_scenario_key,summary_package_key,summary_snapshot_id,projection_level,export_policy,ready_for_contracting,owner_role,blocker_count,effective_at,created_at,created_by,updated_at,updated_by,row_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::text::numeric,$14::text::numeric,$15::text::numeric,$16,$17,$18::text::numeric,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36) RETURNING ",columns!()))
        .bind(r.id).bind(r.project_id).bind(r.version).bind(r.is_current).bind(r.supersedes_id).bind(&r.status)
        .bind(r.technical_cost_package_id).bind(r.bid_commercial_process_id).bind(r.commercial_release_baseline_id)
        .bind(&r.pricing_path).bind(&r.quote_version).bind(&r.currency_code).bind(&r.quote_amount_tax_inclusive)
        .bind(&r.quote_amount_tax_exclusive).bind(&r.tax_rate).bind(&r.tax_condition_summary).bind(&r.payment_terms_summary)
        .bind(&r.gross_margin_rate).bind(&r.gross_margin_band).bind(&r.gross_margin_summary).bind(&r.decision).bind(&r.decision_summary)
        .bind(&r.approval_scenario_key).bind(&r.summary_package_key).bind(r.summary_snapshot_id).bind(&r.projection_level)
        .bind(&r.export_policy).bind(r.ready_for_contracting).bind(&r.owner_role).bind(r.blocker_count).bind(r.effective_at)
        .bind(r.created_at).bind(r.created_by).bind(r.updated_at).bind(r.updated_by).bind(r.row_version)
        .fetch_one(connection).await.and_then(row)
}

pub async fn insert_conditions(
    connection: &mut PgConnection,
    id: Uuid,
    input: &CreateRequest,
) -> Result<(), sqlx::Error> {
    if input.condition_items.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Postgres>::new(
        "INSERT INTO poms.project_pricing_margin_condition_item (review_id,condition_key,condition_type,label,condition_summary,condition_status,required_for_contracting,responsible_role,due_at,resolution_summary,sort_order) ",
    );
    query.push_values(
        input.condition_items.iter().enumerate(),
        |mut b, (index, item)| {
            b.push_bind(id)
                .push_bind(item.condition_key.to_utf8_lossy())
                .push_bind(item.condition_type.clone())
                .push_bind(item.label.to_utf8_lossy())
                .push_bind(item.condition_summary.to_utf8_lossy())
                .push_bind(item.condition_status.clone())
                .push_bind(item.required_for_contracting)
                .push_bind(item.responsible_role.as_ref().map(|v| v.to_utf8_lossy()))
                // Native serializes this request Date to ISO text before PG
                // parses timestamptz. Preserve year 0000's INSERT-time failure.
                .push_bind(
                    item.due_at
                        .map(|value| value.to_rfc3339_opts(SecondsFormat::Millis, true)),
                )
                .push_unseparated("::text::timestamptz")
                .push_bind(item.resolution_summary.as_ref().map(|v| v.to_utf8_lossy()))
                .push_bind(item.sort_order.unwrap_or(index as i64 + 1))
                .push_unseparated("::int4");
        },
    );
    query.build().execute(connection).await?;
    Ok(())
}

pub async fn supersede(
    connection: &mut PgConnection,
    previous: &Row,
    actor: Uuid,
    now: DateTime<Utc>,
) -> Result<bool, sqlx::Error> {
    let value=sqlx::query("UPDATE poms.project_pricing_margin_review SET is_current=false,status='superseded',updated_by=$1,updated_at=$2,row_version=row_version+1 WHERE id=$3 AND row_version=$4 AND is_current=true AND status='effective' RETURNING id")
        .bind(actor).bind(now).bind(previous.id).bind(previous.row_version).fetch_optional(connection).await?;
    Ok(value.is_some())
}

pub struct ConditionRow {
    pub label: String,
    pub condition_summary: String,
    pub condition_status: String,
    pub required_for_contracting: bool,
    pub view: Value,
}

pub async fn conditions(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Vec<ConditionRow>, sqlx::Error> {
    sqlx::query("SELECT id,review_id,condition_key,condition_type,label,condition_summary,condition_status,required_for_contracting,responsible_role,due_at,resolution_summary,sort_order FROM poms.project_pricing_margin_condition_item WHERE review_id=ANY($1) ORDER BY review_id ASC,sort_order ASC")
        .bind(vec![id]).fetch_all(connection).await?.into_iter().map(|r|{
            let label:String=r.try_get("label")?;
            let condition_summary:String=r.try_get("condition_summary")?;
            let condition_status:String=r.try_get("condition_status")?;
            let required_for_contracting:bool=r.try_get("required_for_contracting")?;
            let view=json!({
                "id":r.try_get::<Uuid,_>("id")?,"reviewId":r.try_get::<Uuid,_>("review_id")?,"conditionKey":r.try_get::<String,_>("condition_key")?,
                "conditionType":r.try_get::<String,_>("condition_type")?,"label":label,"conditionSummary":condition_summary,
                "conditionStatus":condition_status,"requiredForContracting":required_for_contracting,
                "responsibleRole":r.try_get::<Option<String>,_>("responsible_role")?,"dueAt":r.try_get::<Option<DateTime<Utc>>,_>("due_at")?.map(iso),
                "resolutionSummary":r.try_get::<Option<String>,_>("resolution_summary")?,"sortOrder":r.try_get::<i32,_>("sort_order")?,
            });
            Ok(ConditionRow{label,condition_summary,condition_status,required_for_contracting,view})
        }).collect()
}
