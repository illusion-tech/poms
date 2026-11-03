//! Existing Lead tables and caller-owned SQL primitives. No migrations, hidden
//! transactions or qualification filters live here. Writes expose optimistic
//! version/state conflicts to the owning business transaction.

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use std::collections::BTreeMap;
use uuid::Uuid;

use super::{
    model::{Query, js},
    scoring::{self, AttachmentFacts, Facts, GateInput, IntelligenceFacts},
};
use crate::auth::{js_json::JsString, model::clock_now};

#[derive(Clone, Debug)]
pub struct LeadRef {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub lead_name: String,
}

pub async fn by_id(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<LeadRef>, sqlx::Error> {
    sqlx::query("SELECT id,customer_id,lead_name FROM poms.lead WHERE id=$1::text::uuid LIMIT 1")
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(|row| {
            Ok(LeadRef {
                id: row.try_get("id")?,
                customer_id: row.try_get("customer_id")?,
                lead_name: row.try_get("lead_name")?,
            })
        })
        .transpose()
}

pub async fn by_ids(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<Vec<LeadRef>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    sqlx::query("SELECT id,customer_id,lead_name FROM poms.lead WHERE id=ANY($1)")
        .bind(ids)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| {
            Ok(LeadRef {
                id: row.try_get("id")?,
                customer_id: row.try_get("customer_id")?,
                lead_name: row.try_get("lead_name")?,
            })
        })
        .collect()
}

#[derive(Clone, Debug)]
pub struct LeadRow {
    pub id: Uuid,
    pub lead_no: String,
    pub lead_name: String,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub source_code: String,
    pub demand_description: Option<String>,
    pub budget_status: String,
    pub estimated_amount: Option<String>,
    pub urgency: String,
    pub expected_decision_date: Option<String>,
    pub score: i32,
    pub rating: String,
    pub score_reason: String,
    pub score_updated_at: DateTime<Utc>,
    pub status: String,
    pub owner_org_id: Option<Uuid>,
    pub owner_user_id: Option<Uuid>,
    pub qualification_summary: Option<String>,
    pub qualified_at: Option<DateTime<Utc>>,
    pub qualified_by: Option<Uuid>,
    pub closed_reason: Option<String>,
    pub closed_at: Option<DateTime<Utc>>,
    pub closed_by: Option<Uuid>,
    pub converted_project_id: Option<Uuid>,
    pub converted_at: Option<DateTime<Utc>>,
    pub converted_by: Option<Uuid>,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
    pub raw_text: BTreeMap<String, JsString>,
}

impl LeadRow {
    pub fn text(&self, key: &str) -> Option<JsString> {
        if let Some(value) = self.raw_text.get(key) {
            return Some(value.clone());
        }
        let value = match key {
            "leadName" => Some(self.lead_name.clone()),
            "customerName" => Some(self.customer_name.clone()),
            "sourceCode" => Some(self.source_code.clone()),
            "demandDescription" => self.demand_description.clone(),
            "budgetStatus" => Some(self.budget_status.clone()),
            "estimatedAmount" => self.estimated_amount.clone(),
            "urgency" => Some(self.urgency.clone()),
            "expectedDecisionDate" => self.expected_decision_date.clone(),
            "qualificationSummary" => self.qualification_summary.clone(),
            "closedReason" => self.closed_reason.clone(),
            "scoreReason" => Some(self.score_reason.clone()),
            "ownerOrgId" => self.owner_org_id.map(|id| id.to_string()),
            _ => None,
        };
        value.as_deref().map(js)
    }
    pub fn gate_input(&self) -> GateInput {
        GateInput {
            source_code: self.source_code.clone(),
            demand_description: self.text("demandDescription"),
            budget_status: self.budget_status.clone(),
            estimated_amount: self.estimated_amount.clone(),
            urgency: self.urgency.clone(),
            expected_decision_date: self.expected_decision_date.clone(),
            owner_user_id: self.owner_user_id,
            owner_org_id: self.owner_org_id,
            status: self.status.clone(),
            converted_project_id: self.converted_project_id,
        }
    }
}

macro_rules! lead_select { () => {
    "SELECT id,lead_no,lead_name,customer_id,customer_name,source_code,demand_description,budget_status,estimated_amount::text,urgency,expected_decision_date::text,score,rating,score_reason,score_updated_at,status,owner_org_id,owner_user_id,qualification_summary,qualified_at,qualified_by,closed_reason,closed_at,closed_by,converted_project_id,converted_at,converted_by,row_version,created_at,created_by,updated_at,updated_by FROM poms.lead "
}; }

fn lead(row: PgRow) -> Result<LeadRow, sqlx::Error> {
    Ok(LeadRow {
        id: row.try_get("id")?,
        lead_no: row.try_get("lead_no")?,
        lead_name: row.try_get("lead_name")?,
        customer_id: row.try_get("customer_id")?,
        customer_name: row.try_get("customer_name")?,
        source_code: row.try_get("source_code")?,
        demand_description: row.try_get("demand_description")?,
        budget_status: row.try_get("budget_status")?,
        estimated_amount: row.try_get("estimated_amount")?,
        urgency: row.try_get("urgency")?,
        expected_decision_date: row.try_get("expected_decision_date")?,
        score: row.try_get("score")?,
        rating: row.try_get("rating")?,
        score_reason: row.try_get("score_reason")?,
        score_updated_at: row.try_get("score_updated_at")?,
        status: row.try_get("status")?,
        owner_org_id: row.try_get("owner_org_id")?,
        owner_user_id: row.try_get("owner_user_id")?,
        qualification_summary: row.try_get("qualification_summary")?,
        qualified_at: row.try_get("qualified_at")?,
        qualified_by: row.try_get("qualified_by")?,
        closed_reason: row.try_get("closed_reason")?,
        closed_at: row.try_get("closed_at")?,
        closed_by: row.try_get("closed_by")?,
        converted_project_id: row.try_get("converted_project_id")?,
        converted_at: row.try_get("converted_at")?,
        converted_by: row.try_get("converted_by")?,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
        raw_text: BTreeMap::new(),
    })
}

pub async fn find(connection: &mut PgConnection, id: &str) -> Result<Option<LeadRow>, sqlx::Error> {
    sqlx::query(concat!(lead_select!(), "WHERE id=$1::text::uuid LIMIT 1"))
        .bind(id)
        .fetch_optional(connection)
        .await?
        .map(lead)
        .transpose()
}

pub async fn find_for_override_submission(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<LeadRow>, sqlx::Error> {
    sqlx::query(concat!(
        lead_select!(),
        "WHERE id=$1::text::uuid LIMIT 1 FOR SHARE"
    ))
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(lead)
    .transpose()
}

/// Decisions acquire this lock before touching override rows. In particular a
/// legacy repair never upgrades the submission path's shared Lead lock.
pub async fn find_for_score_decision(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<LeadRow>, sqlx::Error> {
    sqlx::query(concat!(
        lead_select!(),
        "WHERE id=$1::text::uuid LIMIT 1 FOR UPDATE"
    ))
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(lead)
    .transpose()
}

pub async fn source_name(
    connection: &mut PgConnection,
    code: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT name FROM poms.dictionary_item WHERE domain='lead-source' AND code=$1 LIMIT 1",
    )
    .bind(code)
    .fetch_optional(connection)
    .await
}

pub async fn list(
    connection: &mut PgConnection,
    input: &Query,
    user_id: Uuid,
) -> Result<Vec<LeadRow>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(concat!(lead_select!(), "WHERE true"));
    macro_rules! filter {
        ($field:ident,$column:literal) => {
            if let Some(value) = input.$field.as_ref() {
                query
                    .push(concat!(" AND ", $column, "="))
                    .push_bind(value.clone());
            }
        };
    }
    filter!(source_code, "source_code");
    filter!(budget_status, "budget_status");
    filter!(urgency, "urgency");
    filter!(rating, "rating");
    if let Some(org) = input.owner_org_id.as_ref() {
        query
            .push(" AND owner_org_id=")
            .push_bind(org.clone())
            .push("::text::uuid");
    }
    match input.ownership_scope.as_deref() {
        Some("mine") => {
            query.push(" AND owner_user_id=").push_bind(user_id);
        }
        Some("public-pool") => {
            query.push(" AND owner_user_id IS NULL");
        }
        _ => {
            if let Some(user) = input.owner_user_id.as_ref() {
                query
                    .push(" AND owner_user_id=")
                    .push_bind(user.clone())
                    .push("::text::uuid");
            }
        }
    }
    if let Some(keyword) = input.keyword.as_ref() {
        let pattern = format!("%{}%", keyword.to_utf8_lossy());
        query
            .push(" AND (lead_no ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR lead_name ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR customer_name ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR source_code ILIKE ")
            .push_bind(pattern)
            .push(")");
    }
    query.push(" ORDER BY updated_at DESC,created_at DESC");
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(lead)
        .collect()
}

pub async fn insert_lead(connection: &mut PgConnection, row: &LeadRow) -> Result<i32, sqlx::Error> {
    sqlx::query_scalar("INSERT INTO poms.lead (id,lead_no,lead_name,customer_id,customer_name,source_code,demand_description,budget_status,estimated_amount,urgency,expected_decision_date,score,rating,score_reason,score_updated_at,status,owner_org_id,owner_user_id,qualification_summary,qualified_at,qualified_by,closed_reason,closed_at,closed_by,converted_project_id,converted_at,converted_by,created_at,created_by,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::text::numeric,$10,$11::text::date,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31) RETURNING row_version")
        .bind(row.id).bind(&row.lead_no).bind(&row.lead_name).bind(row.customer_id).bind(&row.customer_name).bind(&row.source_code)
        .bind(&row.demand_description).bind(&row.budget_status).bind(&row.estimated_amount).bind(&row.urgency).bind(&row.expected_decision_date)
        .bind(row.score).bind(&row.rating).bind(&row.score_reason).bind(row.score_updated_at).bind(&row.status).bind(row.owner_org_id).bind(row.owner_user_id)
        .bind(&row.qualification_summary).bind(row.qualified_at).bind(row.qualified_by).bind(&row.closed_reason).bind(row.closed_at).bind(row.closed_by)
        .bind(row.converted_project_id).bind(row.converted_at).bind(row.converted_by).bind(row.created_at).bind(row.created_by).bind(row.updated_at).bind(row.updated_by)
        .fetch_one(connection).await
}

pub async fn update_lead(
    connection: &mut PgConnection,
    before: &LeadRow,
    row: &mut LeadRow,
) -> Result<bool, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.lead SET ");
    let mut count = 0;
    macro_rules! assign {
        ($column:literal,$value:expr) => {{
            if count > 0 {
                query.push(",");
            }
            count += 1;
            query.push(concat!($column, "=")).push_bind($value);
        }};
    }
    macro_rules! changed {
        ($field:ident,$column:literal) => {
            if before.$field != row.$field {
                assign!($column, row.$field.clone());
            }
        };
    }
    macro_rules! changed_text {
        ($field:ident,$column:literal,$key:literal) => {
            if before.text($key) != row.text($key) {
                assign!($column, row.$field.clone());
            }
        };
    }
    changed_text!(lead_name, "lead_name", "leadName");
    changed!(customer_id, "customer_id");
    changed_text!(customer_name, "customer_name", "customerName");
    changed!(source_code, "source_code");
    changed_text!(
        demand_description,
        "demand_description",
        "demandDescription"
    );
    changed!(budget_status, "budget_status");
    if before.estimated_amount != row.estimated_amount {
        assign!("estimated_amount", row.estimated_amount.clone());
        query.push("::text::numeric");
    }
    changed!(urgency, "urgency");
    if before.expected_decision_date != row.expected_decision_date {
        assign!("expected_decision_date", row.expected_decision_date.clone());
        query.push("::text::date");
    }
    changed!(score, "score");
    changed!(rating, "rating");
    changed_text!(score_reason, "score_reason", "scoreReason");
    changed!(score_updated_at, "score_updated_at");
    changed!(status, "status");
    if before.text("ownerOrgId") != row.text("ownerOrgId") {
        assign!("owner_org_id", row.owner_org_id);
    }
    changed!(owner_user_id, "owner_user_id");
    changed_text!(
        qualification_summary,
        "qualification_summary",
        "qualificationSummary"
    );
    changed!(qualified_at, "qualified_at");
    changed!(qualified_by, "qualified_by");
    changed_text!(closed_reason, "closed_reason", "closedReason");
    changed!(closed_at, "closed_at");
    changed!(closed_by, "closed_by");
    changed!(converted_project_id, "converted_project_id");
    changed!(converted_at, "converted_at");
    changed!(converted_by, "converted_by");
    changed!(updated_by, "updated_by");
    if count == 0 {
        return Ok(true);
    }
    row.updated_at = clock_now();
    query
        .push(",updated_at=")
        .push_bind(row.updated_at)
        .push(",row_version=row_version+1 WHERE id=")
        .push_bind(row.id)
        .push(" AND row_version=")
        .push_bind(before.row_version)
        .push(" AND status=")
        .push_bind(before.status.clone())
        .push(" RETURNING row_version");
    let version = query
        .build_query_scalar::<i32>()
        .fetch_optional(connection)
        .await?;
    if let Some(version) = version {
        row.row_version = version;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// A historical missing-tuple repair is a real system-score write, including
/// its time, actor and version even when the resulting numeric score is equal.
pub async fn update_recalculated_score(
    connection: &mut PgConnection,
    before: &LeadRow,
    row: &mut LeadRow,
) -> Result<bool, sqlx::Error> {
    row.updated_at = clock_now();
    let version = sqlx::query_scalar::<_, i32>(
        "UPDATE poms.lead SET score=$1,rating=$2,score_reason=$3,score_updated_at=$4,updated_at=$5,updated_by=$6,row_version=row_version+1 WHERE id=$7 AND row_version=$8 AND status=$9 RETURNING row_version"
    )
    .bind(row.score)
    .bind(&row.rating)
    .bind(&row.score_reason)
    .bind(row.score_updated_at)
    .bind(row.updated_at)
    .bind(row.updated_by)
    .bind(row.id)
    .bind(before.row_version)
    .bind(&before.status)
    .fetch_optional(connection)
    .await?;
    if let Some(version) = version {
        row.row_version = version;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[derive(Clone, Debug)]
pub struct Assignment {
    pub id: Uuid,
    pub lead_id: Uuid,
    pub previous_owner_org_id: Option<Uuid>,
    pub previous_owner_user_id: Option<Uuid>,
    pub new_owner_org_id: Option<Uuid>,
    pub new_owner_user_id: Uuid,
    pub assignment_type: String,
    pub reason: Option<String>,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: Uuid,
}

pub async fn insert_assignment(
    connection: &mut PgConnection,
    row: &Assignment,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.lead_owner_assignment_record(id,lead_id,previous_owner_org_id,previous_owner_user_id,new_owner_org_id,new_owner_user_id,assignment_type,reason,assigned_at,assigned_by,created_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$9,$10)")
        .bind(row.id).bind(row.lead_id).bind(row.previous_owner_org_id).bind(row.previous_owner_user_id).bind(row.new_owner_org_id).bind(row.new_owner_user_id)
        .bind(&row.assignment_type).bind(&row.reason).bind(row.assigned_at).bind(row.assigned_by).execute(connection).await?;
    Ok(())
}

pub async fn collect_facts(
    connection: &mut PgConnection,
    lead_id: Uuid,
) -> Result<Facts, sqlx::Error> {
    let facts = crate::sales_intelligence::store::collect_lead_score_facts(
        connection,
        &lead_id.to_string(),
    )
    .await?;
    let follow=sqlx::query("SELECT occurred_at,next_follow_up_at FROM poms.sales_follow_up_record WHERE lead_id=$1 AND status='active' ORDER BY occurred_at DESC")
        .bind(lead_id).fetch_all(&mut *connection).await?.into_iter().map(|row|Ok((row.try_get("occurred_at")?,row.try_get("next_follow_up_at")?))).collect::<Result<Vec<(DateTime<Utc>,Option<DateTime<Utc>>)>,sqlx::Error>>()?;
    let follow_up = scoring::follow_up_facts(&follow, clock_now())?;
    let links:Vec<Uuid>=sqlx::query_scalar("SELECT attachment_id FROM poms.attachment_link WHERE target_type='lead' AND target_id=$1 AND status='active'")
        .bind(lead_id).fetch_all(&mut *connection).await?;
    let mut attachment_ids = Vec::new();
    for id in links {
        if !attachment_ids.contains(&id) {
            attachment_ids.push(id);
        }
    }
    let attachments = if attachment_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query("SELECT category,is_latest,is_final FROM poms.attachment WHERE id=ANY($1) AND status='active'")
            .bind(&attachment_ids).fetch_all(connection).await?
    };
    let mut attachment_evidence = AttachmentFacts::default();
    for row in attachments {
        let latest: bool = row.try_get("is_latest")?;
        let final_: bool = row.try_get("is_final")?;
        attachment_evidence.latest_attachment_count += usize::from(latest);
        attachment_evidence.final_attachment_count += usize::from(final_);
        if !latest && !final_ {
            continue;
        }
        let category: String = row.try_get("category")?;
        let category = category.to_lowercase();
        let proposal = ["proposal", "solution", "plan", "方案"]
            .iter()
            .any(|value| category.contains(value));
        let quotation = ["quotation", "quote", "报价"]
            .iter()
            .any(|value| category.contains(value));
        let budget = ["budget", "预算"]
            .iter()
            .any(|value| category.contains(value));
        attachment_evidence.evidence_attachment_count +=
            usize::from(proposal || quotation || budget);
        attachment_evidence.has_proposal_attachment |= proposal;
        attachment_evidence.has_quotation_attachment |= quotation;
        attachment_evidence.has_budget_evidence_attachment |= budget;
    }
    Ok(Facts {
        sales_intelligence: IntelligenceFacts {
            decision_maker_known: facts.decision_maker_known,
            technical_evaluator_known: facts.technical_evaluator_known,
            procurement_process_known: facts.procurement_process_known,
            budget_source_known: facts.budget_source_known,
            competitor_known: facts.competitor_known,
            pain_point_known: facts.pain_point_known,
            next_contact_known: facts.next_contact_known,
        },
        follow_up,
        attachment_evidence,
    })
}

/// Internal metadata selection only. The real public attachment producer and
/// its API stay in the delivered attachment module.
pub async fn conversion_attachments(
    connection: &mut PgConnection,
    lead_id: Uuid,
) -> Result<Vec<Uuid>, sqlx::Error> {
    let links:Vec<Uuid>=sqlx::query_scalar("SELECT attachment_id FROM poms.attachment_link WHERE target_type='lead' AND target_id=$1 AND status='active' ORDER BY linked_at DESC")
        .bind(lead_id).fetch_all(&mut *connection).await?;
    let mut ids = Vec::new();
    for id in links {
        if !ids.contains(&id) {
            ids.push(id);
        }
    }
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let rows=sqlx::query("SELECT id,category FROM poms.attachment WHERE id=ANY($1) AND status='active' AND is_latest=true ORDER BY uploaded_at DESC")
        .bind(&ids).fetch_all(&mut *connection).await?;
    let ids = rows
        .iter()
        .map(|row| row.try_get::<Uuid, _>("id"))
        .collect::<Result<Vec<_>, _>>()?;
    // The original repository also loads the active links for these selected
    // attachments before the service applies its category exclusions.
    let _links=sqlx::query("SELECT id FROM poms.attachment_link WHERE attachment_id=ANY($1) AND status='active' ORDER BY linked_at DESC")
        .bind(&ids).fetch_all(connection).await?;
    let mut eligible = Vec::new();
    for row in rows {
        let category: String = row.try_get("category")?;
        if !matches!(category.as_str(), "finance" | "internal-assessment") {
            eligible.push(row.try_get("id")?);
        }
    }
    Ok(eligible)
}

pub async fn existing_project_link(
    connection: &mut PgConnection,
    attachment_id: Uuid,
    project_id: Uuid,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.attachment_link WHERE attachment_id=$1 AND target_type='project' AND target_id=$2 AND relation_type='source' AND status='active')")
        .bind(attachment_id).bind(project_id).fetch_one(connection).await
}

#[derive(Clone, Debug)]
pub struct CopyLink {
    pub id: Uuid,
    pub attachment_id: Uuid,
    pub project_id: Uuid,
    pub operator_id: Uuid,
    pub linked_at: DateTime<Utc>,
}

pub async fn insert_copy_link(
    connection: &mut PgConnection,
    row: &CopyLink,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.attachment_link(id,attachment_id,target_type,target_id,relation_type,status,linked_by,linked_at) VALUES($1,$2,'project',$3,'source','active',$4,$5)")
        .bind(row.id).bind(row.attachment_id).bind(row.project_id).bind(row.operator_id).bind(row.linked_at).execute(connection).await?;
    Ok(())
}

pub async fn insert_conversion_project(
    connection: &mut PgConnection,
    row: &crate::projects::store::ProjectRow,
) -> Result<i32, sqlx::Error> {
    sqlx::query_scalar("INSERT INTO poms.project(id,project_no,project_name,source_lead_id,customer_id,customer_name,customer_project_no,status,current_stage,owner_org_id,owner_user_id,planned_sign_at,created_at,created_by,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING row_version")
        .bind(row.id).bind(&row.project_no).bind(&row.project_name).bind(row.source_lead_id).bind(row.customer_id).bind(&row.customer_name).bind(&row.customer_project_no)
        .bind(&row.status).bind(&row.current_stage).bind(row.owner_org_id).bind(row.owner_user_id).bind(row.planned_sign_at).bind(row.created_at).bind(row.created_by).bind(row.updated_at).bind(row.updated_by)
        .fetch_one(connection).await
}

#[derive(Clone, Debug)]
pub struct OverrideRow {
    pub id: Uuid,
    pub lead_id: Uuid,
    pub requested_score: i32,
    pub requested_rating: String,
    pub reason: String,
    pub status: String,
    pub system_score_at_request: i32,
    pub system_rating_at_request: String,
    pub requested_by: Option<Uuid>,
    pub requested_at: DateTime<Utc>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub approval_note: Option<String>,
    pub rejected_by: Option<Uuid>,
    pub rejected_at: Option<DateTime<Utc>>,
    pub reject_reason: Option<String>,
    pub revoked_by: Option<Uuid>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub revoke_reason: Option<String>,
    pub superseded_by_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
    pub row_version: i32,
    pub raw_text: BTreeMap<String, JsString>,
}

impl OverrideRow {
    pub fn text(&self, key: &str) -> Option<JsString> {
        if let Some(value) = self.raw_text.get(key) {
            return Some(value.clone());
        }
        let value = match key {
            "reason" => Some(&self.reason),
            "approvalNote" => self.approval_note.as_ref(),
            "rejectReason" => self.reject_reason.as_ref(),
            "revokeReason" => self.revoke_reason.as_ref(),
            _ => None,
        };
        value.map(|value| js(value))
    }
}

macro_rules! override_select { () => {
    "SELECT id,lead_id,requested_score,requested_rating,reason,status,system_score_at_request,system_rating_at_request,requested_by,requested_at,approved_by,approved_at,approval_note,rejected_by,rejected_at,reject_reason,revoked_by,revoked_at,revoke_reason,superseded_by_id,created_at,updated_at,updated_by,row_version FROM poms.lead_score_override "
}; }

fn override_row(row: PgRow) -> Result<OverrideRow, sqlx::Error> {
    Ok(OverrideRow {
        id: row.try_get("id")?,
        lead_id: row.try_get("lead_id")?,
        requested_score: row.try_get("requested_score")?,
        requested_rating: row.try_get("requested_rating")?,
        reason: row.try_get("reason")?,
        status: row.try_get("status")?,
        system_score_at_request: row.try_get("system_score_at_request")?,
        system_rating_at_request: row.try_get("system_rating_at_request")?,
        requested_by: row.try_get("requested_by")?,
        requested_at: row.try_get("requested_at")?,
        approved_by: row.try_get("approved_by")?,
        approved_at: row.try_get("approved_at")?,
        approval_note: row.try_get("approval_note")?,
        rejected_by: row.try_get("rejected_by")?,
        rejected_at: row.try_get("rejected_at")?,
        reject_reason: row.try_get("reject_reason")?,
        revoked_by: row.try_get("revoked_by")?,
        revoked_at: row.try_get("revoked_at")?,
        revoke_reason: row.try_get("revoke_reason")?,
        superseded_by_id: row.try_get("superseded_by_id")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
        row_version: row.try_get("row_version")?,
        raw_text: BTreeMap::new(),
    })
}

pub async fn find_override(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<OverrideRow>, sqlx::Error> {
    sqlx::query(concat!(
        override_select!(),
        "WHERE id=$1::text::uuid LIMIT 1"
    ))
    .bind(id)
    .fetch_optional(connection)
    .await?
    .map(override_row)
    .transpose()
}

pub async fn find_override_status(
    connection: &mut PgConnection,
    lead_id: Uuid,
    status: &str,
) -> Result<Option<OverrideRow>, sqlx::Error> {
    sqlx::query(concat!(
        override_select!(),
        "WHERE lead_id=$1 AND status=$2 LIMIT 1"
    ))
    .bind(lead_id)
    .bind(status)
    .fetch_optional(connection)
    .await?
    .map(override_row)
    .transpose()
}

pub async fn overrides(
    connection: &mut PgConnection,
    lead_id: Uuid,
) -> Result<Vec<OverrideRow>, sqlx::Error> {
    sqlx::query(concat!(
        override_select!(),
        "WHERE lead_id=$1 ORDER BY requested_at DESC"
    ))
    .bind(lead_id)
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(override_row)
    .collect()
}

pub async fn active_overrides(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<Vec<OverrideRow>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    sqlx::query(concat!(
        override_select!(),
        "WHERE lead_id=ANY($1) AND status='approved'"
    ))
    .bind(ids)
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(override_row)
    .collect()
}

pub async fn insert_override(
    connection: &mut PgConnection,
    row: &OverrideRow,
) -> Result<i32, sqlx::Error> {
    sqlx::query_scalar("INSERT INTO poms.lead_score_override(id,lead_id,requested_score,requested_rating,reason,status,system_score_at_request,system_rating_at_request,requested_by,requested_at,created_at,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING row_version")
        .bind(row.id).bind(row.lead_id).bind(row.requested_score).bind(&row.requested_rating).bind(&row.reason).bind(&row.status)
        .bind(row.system_score_at_request).bind(&row.system_rating_at_request).bind(row.requested_by).bind(row.requested_at).bind(row.created_at).bind(row.updated_at).bind(row.updated_by)
        .fetch_one(connection).await
}

pub async fn update_override(
    connection: &mut PgConnection,
    before: &OverrideRow,
    row: &mut OverrideRow,
) -> Result<bool, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new("UPDATE poms.lead_score_override SET ");
    let mut count = 0;
    macro_rules! assign {
        ($column:literal,$value:expr) => {{
            if count > 0 {
                query.push(",");
            }
            count += 1;
            query.push(concat!($column, "=")).push_bind($value);
        }};
    }
    macro_rules! changed {
        ($field:ident,$column:literal) => {
            if before.$field != row.$field {
                assign!($column, row.$field.clone());
            }
        };
    }
    macro_rules! changed_text {
        ($field:ident,$column:literal,$key:literal) => {
            if before.text($key) != row.text($key) {
                assign!($column, row.$field.clone());
            }
        };
    }
    changed!(status, "status");
    changed!(approved_by, "approved_by");
    changed!(approved_at, "approved_at");
    changed_text!(approval_note, "approval_note", "approvalNote");
    changed!(rejected_by, "rejected_by");
    changed!(rejected_at, "rejected_at");
    changed_text!(reject_reason, "reject_reason", "rejectReason");
    changed!(revoked_by, "revoked_by");
    changed!(revoked_at, "revoked_at");
    changed_text!(revoke_reason, "revoke_reason", "revokeReason");
    changed!(superseded_by_id, "superseded_by_id");
    changed!(updated_by, "updated_by");
    if count == 0 {
        return Ok(true);
    }
    row.updated_at = clock_now();
    query
        .push(",updated_at=")
        .push_bind(row.updated_at)
        .push(",row_version=row_version+1 WHERE id=")
        .push_bind(row.id)
        .push(" AND row_version=")
        .push_bind(before.row_version)
        .push(" AND status=")
        .push_bind(before.status.clone())
        .push(" RETURNING row_version");
    let version = query
        .build_query_scalar::<i32>()
        .fetch_optional(connection)
        .await?;
    if let Some(version) = version {
        row.row_version = version;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[derive(Clone, Debug)]
pub struct SnapshotRow {
    pub id: Uuid,
    pub lead_id: Uuid,
    pub snapshot_kind: String,
    pub override_id: Option<Uuid>,
    pub formula_version: String,
    pub system_score: i32,
    pub system_rating: String,
    pub effective_score: i32,
    pub effective_rating: String,
    pub effective_score_source: String,
    pub score_reason: String,
    pub component_breakdown: String,
    pub gate_summary_snapshot: String,
    pub source_command: String,
    pub source_record_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

macro_rules! snapshot_select { () => {
    "SELECT id,lead_id,snapshot_kind,override_id,formula_version,system_score,system_rating,effective_score,effective_rating,effective_score_source,score_reason,component_breakdown::text,gate_summary_snapshot::text,source_command,source_record_id,created_at,created_by FROM poms.lead_score_snapshot "
}; }

fn snapshot(row: PgRow) -> Result<SnapshotRow, sqlx::Error> {
    Ok(SnapshotRow {
        id: row.try_get("id")?,
        lead_id: row.try_get("lead_id")?,
        snapshot_kind: row.try_get("snapshot_kind")?,
        override_id: row.try_get("override_id")?,
        formula_version: row.try_get("formula_version")?,
        system_score: row.try_get("system_score")?,
        system_rating: row.try_get("system_rating")?,
        effective_score: row.try_get("effective_score")?,
        effective_rating: row.try_get("effective_rating")?,
        effective_score_source: row.try_get("effective_score_source")?,
        score_reason: row.try_get("score_reason")?,
        component_breakdown: row.try_get("component_breakdown")?,
        gate_summary_snapshot: row.try_get("gate_summary_snapshot")?,
        source_command: row.try_get("source_command")?,
        source_record_id: row.try_get("source_record_id")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
    })
}

pub async fn latest_system_snapshot(
    connection: &mut PgConnection,
    lead_id: Uuid,
) -> Result<Option<SnapshotRow>, sqlx::Error> {
    sqlx::query(concat!(
        snapshot_select!(),
        "WHERE lead_id=$1 AND snapshot_kind='system' ORDER BY created_at DESC LIMIT 1"
    ))
    .bind(lead_id)
    .fetch_optional(connection)
    .await?
    .map(snapshot)
    .transpose()
}

/// Return candidate explanations for the actually stored result, newest first.
/// The service validates formula, component facts and current Lead gates before
/// accepting one; equal numeric scores alone do not establish a matching tuple.
pub async fn system_snapshots_for_score(
    connection: &mut PgConnection,
    lead: &LeadRow,
) -> Result<Vec<SnapshotRow>, sqlx::Error> {
    sqlx::query(concat!(
        snapshot_select!(),
        "WHERE lead_id=$1 AND snapshot_kind='system' AND system_score=$2 AND system_rating=$3 ORDER BY created_at DESC"
    ))
    .bind(lead.id)
    .bind(lead.score)
    .bind(&lead.rating)
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(snapshot)
    .collect()
}

pub async fn snapshots(
    connection: &mut PgConnection,
    lead_id: Uuid,
) -> Result<Vec<SnapshotRow>, sqlx::Error> {
    sqlx::query(concat!(
        snapshot_select!(),
        "WHERE lead_id=$1 ORDER BY created_at DESC"
    ))
    .bind(lead_id)
    .fetch_all(connection)
    .await?
    .into_iter()
    .map(snapshot)
    .collect()
}

pub async fn insert_snapshot(
    connection: &mut PgConnection,
    row: &SnapshotRow,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.lead_score_snapshot(id,lead_id,snapshot_kind,override_id,formula_version,system_score,system_rating,effective_score,effective_rating,effective_score_source,score_reason,component_breakdown,gate_summary_snapshot,source_command,source_record_id,created_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text::jsonb,$13::text::jsonb,$14,$15,$16,$17)")
        .bind(row.id).bind(row.lead_id).bind(&row.snapshot_kind).bind(row.override_id).bind(&row.formula_version).bind(row.system_score).bind(&row.system_rating).bind(row.effective_score)
        .bind(&row.effective_rating).bind(&row.effective_score_source).bind(&row.score_reason).bind(&row.component_breakdown).bind(&row.gate_summary_snapshot).bind(&row.source_command)
        .bind(row.source_record_id).bind(row.created_at).bind(row.created_by).execute(connection).await?;
    Ok(())
}

pub fn duplicate_snapshot(old: &SnapshotRow, next: &SnapshotRow) -> Result<bool, sqlx::Error> {
    Ok(old.formula_version == next.formula_version
        && old.system_score == next.system_score
        && old.system_rating == next.system_rating
        && scoring::semantic_json_equal(&old.component_breakdown, &next.component_breakdown)?
        && scoring::semantic_json_equal(&old.gate_summary_snapshot, &next.gate_summary_snapshot)?)
}

/// Audit writes borrow the business transaction. Validated persisted text is
/// lossless; any storage failure aborts the entire owning command.
pub struct RawAudit<'a> {
    pub event_type: &'a str,
    pub target_type: &'a str,
    pub target_id: &'a str,
    pub operator_id: Uuid,
    pub request_id: Option<&'a str>,
    pub before: Option<&'a str>,
    pub after: Option<&'a str>,
    pub metadata: Option<&'a str>,
}

pub async fn insert_raw_audit(
    connection: &mut PgConnection,
    input: RawAudit<'_>,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.audit_log(event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) VALUES($1,$2,$3,$4,$5,'success',null,$6::text::jsonb,$7::text::jsonb,$8::text::jsonb,$9)")
        .bind(input.event_type).bind(input.target_type).bind(input.target_id).bind(input.operator_id).bind(input.request_id).bind(input.before).bind(input.after).bind(input.metadata).bind(clock_now()).execute(connection).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn system_snapshot() -> SnapshotRow {
        SnapshotRow {id:Uuid::nil(),lead_id:Uuid::nil(),snapshot_kind:"system".into(),override_id:None,
            formula_version:"lead-score-v2".into(),system_score:65,system_rating:"B".into(),effective_score:65,effective_rating:"B".into(),
            effective_score_source:"system".into(),score_reason:"基础商务+65".into(),
            component_breakdown:r#"{"owner":10,"salesIntelligenceFacts":{"competitorKnown":false},"total":65}"#.into(),
            gate_summary_snapshot:r#"{"qualification":{"status":"ready","missingItems":[]},"conversion":{"status":"blocked","missingItems":["qualified-status"]}}"#.into(),
            source_command:"create-lead".into(),source_record_id:None,created_at:DateTime::from_timestamp_millis(0).unwrap_or_else(||panic!("epoch")),created_by:None}
    }

    #[test]
    fn unchanged_system_tuple_does_not_invent_history_for_metadata_or_key_order() {
        let old = system_snapshot();
        let mut next = old.clone();
        next.component_breakdown =
            r#"{"total":65.0,"salesIntelligenceFacts":{"competitorKnown":false},"owner":10}"#
                .into();
        next.source_command = "update-lead".into();
        next.source_record_id = Some(Uuid::from_u128(1));
        next.created_by = Some(Uuid::from_u128(2));
        next.effective_score = 90;
        next.effective_rating = "A".into();
        next.effective_score_source = "manual-override".into();
        next.score_reason = "人工覆盖评分：已核实".into();
        assert_eq!(duplicate_snapshot(&old, &next).ok(), Some(true));
    }

    #[test]
    fn changed_facts_gates_formula_or_system_result_each_require_history() {
        let old = system_snapshot();
        let mut facts = old.clone();
        facts.component_breakdown =
            r#"{"owner":10,"salesIntelligenceFacts":{"competitorKnown":true},"total":65}"#.into();
        let mut gate = old.clone();
        gate.gate_summary_snapshot=r#"{"qualification":{"status":"blocked","missingItems":["registered-status"]},"conversion":{"status":"ready","missingItems":[]}}"#.into();
        let mut formula = old.clone();
        formula.formula_version = "lead-score-v3".into();
        let mut score = old.clone();
        score.system_score = 66;
        let mut rating = old.clone();
        rating.system_rating = "A".into();
        for next in [facts, gate, formula, score, rating] {
            assert_eq!(duplicate_snapshot(&old, &next).ok(), Some(false));
        }
    }
}
