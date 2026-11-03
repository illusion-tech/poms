//! SQL primitives use only existing EX-61 tables and caller-owned connections.

use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use serde_json::value::RawValue;
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

use super::model::{CompetitorRef, Query, SalesIntelligenceFacts};
use crate::{
    auth::js_json::JsString,
    external_org_sync::validation::node_raw,
    projects::model::{js, trim_js},
};

pub(super) const STAKEHOLDER_FIELDS: [&str; 7] = [
    "role",
    "attitude",
    "influenceLevel",
    "accessLevel",
    "focusAreas",
    "communicationNotes",
    "isPrimary",
];
pub(super) const COMPETITOR_FIELDS: [&str; 9] = [
    "competitorName",
    "position",
    "customerPreference",
    "competitorStrengths",
    "competitorWeaknesses",
    "ourAdvantages",
    "ourRisks",
    "winProbability",
    "evidence",
];
pub(super) const DISCOVERY_FIELDS: [&str; 6] = [
    "procurementProcess",
    "budgetSource",
    "customerPainPoints",
    "decisionCycle",
    "nextContactPlan",
    "remark",
];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Kind {
    Stakeholder,
    Competitor,
    Discovery,
}

impl Kind {
    pub(super) const fn table(self) -> &'static str {
        match self {
            Self::Stakeholder => "opportunity_stakeholder",
            Self::Competitor => "competitor_intelligence_record",
            Self::Discovery => "sales_discovery_record",
        }
    }
    pub(super) const fn entity(self) -> &'static str {
        match self {
            Self::Stakeholder => "OpportunityStakeholder",
            Self::Competitor => "CompetitorIntelligenceRecord",
            Self::Discovery => "SalesDiscoveryRecord",
        }
    }
    pub(super) const fn fields(self) -> &'static [&'static str] {
        match self {
            Self::Stakeholder => &STAKEHOLDER_FIELDS,
            Self::Competitor => &COMPETITOR_FIELDS,
            Self::Discovery => &DISCOVERY_FIELDS,
        }
    }
    pub(super) const fn redacted(self) -> &'static [&'static str] {
        match self {
            Self::Stakeholder => &["focusAreas", "communicationNotes"],
            Self::Competitor => &[
                "competitorStrengths",
                "competitorWeaknesses",
                "ourAdvantages",
                "ourRisks",
                "evidence",
            ],
            Self::Discovery => &DISCOVERY_FIELDS,
        }
    }
    pub(super) const fn event(self) -> &'static str {
        match self {
            Self::Stakeholder => "opportunity-stakeholder.updated",
            Self::Competitor => "competitor-intelligence.updated",
            Self::Discovery => "sales-discovery-record.updated",
        }
    }
    pub(super) const fn target(self) -> &'static str {
        match self {
            Self::Stakeholder => "opportunity-stakeholder",
            Self::Competitor => "competitor-intelligence",
            Self::Discovery => "sales-discovery-record",
        }
    }
    pub(super) const fn command(self) -> &'static str {
        match self {
            Self::Stakeholder => "update-opportunity-stakeholder",
            Self::Competitor => "update-competitor-intelligence-record",
            Self::Discovery => "update-sales-discovery-record",
        }
    }
}

/// A JSON value stays separate from text, including legal legacy JSONB shapes.
/// `Json` contains Node-compatible compact JSON with preserved object ordering.
#[derive(Clone, Debug)]
pub(super) enum FieldValue {
    Null,
    Text(JsString),
    Boolean(bool),
    Json { raw: String, nullish: bool },
}

impl FieldValue {
    pub(super) fn json(&self) -> String {
        match self {
            Self::Null => "null".into(),
            Self::Text(value) => value.json(),
            Self::Boolean(value) => value.to_string(),
            Self::Json { raw, .. } => raw.clone(),
        }
    }
    pub(super) fn audit_json(&self, key: &str) -> String {
        // Persisted JSON null and an empty focus list have the same business
        // meaning. Raw representation alone must never trigger a domain write.
        if key == "focusAreas" && matches!(self, Self::Null | Self::Json { nullish: true, .. }) {
            "[]".into()
        } else {
            self.json()
        }
    }
}

pub(super) type Values = BTreeMap<&'static str, FieldValue>;

#[derive(Clone, Debug)]
pub(super) struct Record {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub lead_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
    pub values: Values,
    pub row_version: i32,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<Uuid>,
}

pub(super) fn column(key: &str) -> &str {
    match key {
        "influenceLevel" => "influence_level",
        "accessLevel" => "access_level",
        "focusAreas" => "focus_areas_json",
        "communicationNotes" => "communication_notes",
        "isPrimary" => "is_primary",
        "competitorName" => "competitor_name",
        "customerPreference" => "customer_preference",
        "competitorStrengths" => "competitor_strengths",
        "competitorWeaknesses" => "competitor_weaknesses",
        "ourAdvantages" => "our_advantages",
        "ourRisks" => "our_risks",
        "winProbability" => "win_probability",
        "procurementProcess" => "procurement_process",
        "budgetSource" => "budget_source",
        "customerPainPoints" => "customer_pain_points",
        "decisionCycle" => "decision_cycle",
        "nextContactPlan" => "next_contact_plan",
        key => key,
    }
}

fn required_text(key: &str) -> bool {
    matches!(
        key,
        "role"
            | "attitude"
            | "influenceLevel"
            | "accessLevel"
            | "competitorName"
            | "position"
            | "customerPreference"
            | "winProbability"
    )
}

fn record(kind: Kind, row: PgRow) -> Result<Record, sqlx::Error> {
    let mut values = BTreeMap::new();
    for &key in kind.fields() {
        let value = match key {
            "isPrimary" => FieldValue::Boolean(row.try_get(column(key))?),
            "focusAreas" => {
                let raw: String = row.try_get("__focus_raw")?;
                let value: &RawValue = serde_json::from_str(&raw)
                    .map_err(|_| sqlx::Error::Protocol("invalid stored focus JSON".into()))?;
                FieldValue::Json {
                    raw: node_raw(value)
                        .map_err(|_| sqlx::Error::Protocol("invalid stored focus JSON".into()))?,
                    nullish: value.get() == "null",
                }
            }
            _ if required_text(key) => {
                FieldValue::Text(js(&row.try_get::<String, _>(column(key))?))
            }
            _ => row
                .try_get::<Option<String>, _>(column(key))?
                .map_or(FieldValue::Null, |value| FieldValue::Text(js(&value))),
        };
        values.insert(key, value);
    }
    Ok(Record {
        id: row.try_get("id")?,
        customer_id: row.try_get("customer_id")?,
        lead_id: row.try_get("lead_id")?,
        project_id: row.try_get("project_id")?,
        contact_id: if kind == Kind::Stakeholder {
            Some(row.try_get("contact_id")?)
        } else {
            None
        },
        values,
        row_version: row.try_get("row_version")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
        updated_at: row.try_get("updated_at")?,
        updated_by: row.try_get("updated_by")?,
    })
}

fn select(kind: Kind) -> String {
    match kind {
        Kind::Stakeholder => format!(
            "SELECT *,focus_areas_json::text AS __focus_raw FROM poms.{}",
            kind.table()
        ),
        _ => format!("SELECT * FROM poms.{}", kind.table()),
    }
}

pub(super) async fn find(
    connection: &mut PgConnection,
    kind: Kind,
    id: &str,
) -> Result<Option<Record>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(select(kind));
    query
        .push(" WHERE id=")
        .push_bind(id.to_owned())
        .push("::text::uuid LIMIT 1");
    query
        .build()
        .fetch_optional(connection)
        .await?
        .map(|row| record(kind, row))
        .transpose()
}

pub(super) async fn list(
    connection: &mut PgConnection,
    kind: Kind,
    input: &Query,
) -> Result<Vec<Record>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(select(kind));
    query.push(" WHERE ");
    match (&input.lead_id, &input.project_id) {
        (Some(lead), Some(project)) => {
            query
                .push("(lead_id=")
                .push_bind(lead.clone())
                .push("::text::uuid OR project_id=")
                .push_bind(project.clone())
                .push("::text::uuid)");
        }
        (Some(lead), None) => {
            query
                .push("lead_id=")
                .push_bind(lead.clone())
                .push("::text::uuid");
        }
        (None, Some(project)) => {
            query
                .push("project_id=")
                .push_bind(project.clone())
                .push("::text::uuid");
        }
        (None, None) => {
            query.push("false");
        }
    }
    query.push(match kind {
        Kind::Stakeholder => " ORDER BY is_primary DESC,updated_at DESC,created_at DESC",
        _ => " ORDER BY updated_at DESC,created_at DESC",
    });
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| record(kind, row))
        .collect()
}

fn bind_value(query: &mut QueryBuilder<Postgres>, value: &FieldValue) {
    match value {
        FieldValue::Null => {
            query.push_bind(Option::<String>::None);
        }
        FieldValue::Text(value) => {
            query.push_bind(value.to_utf8_lossy());
        }
        FieldValue::Boolean(value) => {
            query.push_bind(*value);
        }
        // New values passed request-local storage validation. Keep JSON types
        // distinct from text, without rewriting old representations on read.
        FieldValue::Json { raw, .. } => {
            query.push_bind(raw.clone()).push("::text::jsonb");
        }
    }
}

pub(super) async fn insert(
    connection: &mut PgConnection,
    kind: Kind,
    row: &Record,
) -> Result<i32, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(format!(
        "INSERT INTO poms.{} (id,customer_id,lead_id,project_id",
        kind.table()
    ));
    if kind == Kind::Stakeholder {
        query.push(",contact_id");
    }
    for key in kind.fields() {
        query.push(",").push(column(key));
    }
    query
        .push(",created_at,created_by,updated_at,updated_by) VALUES (")
        .push_bind(row.id)
        .push(",")
        .push_bind(row.customer_id)
        .push(",")
        .push_bind(row.lead_id)
        .push(",")
        .push_bind(row.project_id);
    if kind == Kind::Stakeholder {
        query.push(",").push_bind(row.contact_id);
    }
    for key in kind.fields() {
        query.push(",");
        let value = row
            .values
            .get(key)
            .ok_or_else(|| sqlx::Error::Protocol("missing sales fact field".into()))?;
        bind_value(&mut query, value);
    }
    query
        .push(",")
        .push_bind(row.created_at)
        .push(",")
        .push_bind(row.created_by)
        .push(",")
        .push_bind(row.updated_at)
        .push(",")
        .push_bind(row.updated_by)
        .push(") RETURNING row_version");
    query.build_query_scalar().fetch_one(connection).await
}

pub(super) async fn update(
    connection: &mut PgConnection,
    kind: Kind,
    before: &Record,
    after: &Record,
    fields: &[&str],
    at: DateTime<Utc>,
) -> Result<Option<i32>, sqlx::Error> {
    let mut query = QueryBuilder::<Postgres>::new(format!("UPDATE poms.{} SET ", kind.table()));
    for (index, key) in fields.iter().enumerate() {
        if index != 0 {
            query.push(",");
        }
        query.push(column(key)).push("=");
        let value = after
            .values
            .get(key)
            .ok_or_else(|| sqlx::Error::Protocol("missing sales fact field".into()))?;
        bind_value(&mut query, value);
    }
    if before.updated_by != after.updated_by {
        query.push(",updated_by=").push_bind(after.updated_by);
    }
    query
        .push(",updated_at=")
        .push_bind(at)
        .push(",row_version=row_version+1 WHERE id=")
        .push_bind(before.id)
        .push(" AND row_version=")
        .push_bind(before.row_version)
        .push(" RETURNING row_version");
    query
        .build_query_scalar::<i32>()
        .fetch_optional(connection)
        .await
}

/// Exact id lookup; J retains the source nullable-anchor validation.
pub async fn competitor_by_id(
    connection: &mut PgConnection,
    id: &str,
) -> Result<Option<CompetitorRef>, sqlx::Error> {
    sqlx::query("SELECT id,customer_id,lead_id,project_id FROM poms.competitor_intelligence_record WHERE id=$1::text::uuid")
        .bind(id).fetch_optional(connection).await?.map(|row| Ok(CompetitorRef {
            id: row.try_get("id")?, customer_id: row.try_get("customer_id")?,
            lead_id: row.try_get("lead_id")?, project_id: row.try_get("project_id")?,
        })).transpose()
}

/// The scoring query deliberately does not reuse I's public discovery list:
/// Native H sorts its latest row by updated_at DESC only, without a tie-breaker.
pub async fn collect_lead_score_facts(
    connection: &mut PgConnection,
    lead_id: &str,
) -> Result<SalesIntelligenceFacts, sqlx::Error> {
    let stakeholders = sqlx::query(
        "SELECT role,is_primary FROM poms.opportunity_stakeholder WHERE lead_id=$1::text::uuid",
    )
    .bind(lead_id)
    .fetch_all(&mut *connection)
    .await?;
    let competitor_known: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM poms.competitor_intelligence_record WHERE lead_id=$1::text::uuid)")
        .bind(lead_id).fetch_one(&mut *connection).await?;
    let discovery = sqlx::query("SELECT procurement_process,budget_source,customer_pain_points,next_contact_plan FROM poms.sales_discovery_record WHERE lead_id=$1::text::uuid ORDER BY updated_at DESC LIMIT 1")
        .bind(lead_id).fetch_optional(connection).await?;
    let mut facts = SalesIntelligenceFacts {
        competitor_known,
        ..SalesIntelligenceFacts::default()
    };
    for row in stakeholders {
        let role: String = row.try_get("role")?;
        facts.decision_maker_known |= role == "decision-maker";
        facts.technical_evaluator_known |= role == "technical-evaluator";
        facts.next_contact_known |= row.try_get::<bool, _>("is_primary")?;
    }
    if let Some(row) = discovery {
        facts.procurement_process_known = has_text(
            row.try_get::<Option<String>, _>("procurement_process")?
                .as_deref(),
        );
        facts.budget_source_known = has_text(
            row.try_get::<Option<String>, _>("budget_source")?
                .as_deref(),
        );
        facts.pain_point_known = has_text(
            row.try_get::<Option<String>, _>("customer_pain_points")?
                .as_deref(),
        );
        facts.next_contact_known |= has_text(
            row.try_get::<Option<String>, _>("next_contact_plan")?
                .as_deref(),
        );
    }
    Ok(facts)
}

pub(super) fn has_text(value: Option<&str>) -> bool {
    value.is_some_and(|value| !trim_js(js(value)).is_empty())
}
