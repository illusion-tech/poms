//! Opportunity checks, typed read models and atomic field audits.

use std::{collections::BTreeMap, error::Error as StdError, fmt};

use axum::http::StatusCode;
use serde_json::{Value, json, value::RawValue};
use sqlx::{Connection, PgConnection};
use uuid::Uuid;

use super::{
    model::{
        CreateCompetitor, CreateDiscovery, CreateStakeholder, Query, SalesIntelligenceFacts,
        UpdateCompetitor, UpdateDiscovery, UpdateStakeholder,
    },
    store::{self, FieldValue, Kind, Record, Values},
};
use crate::{
    auth::{
        guards::RequestMetadata,
        js_json::{JsString, decode_string},
        model::{ResolvedSession, clock_now},
        store::flush_managed_session,
    },
    compat::{json::Field, scalars::js_iso_string},
    customers,
    database::{Database, DbError},
    error::ApiError,
    leads, opportunity_context, projects,
    projects::model::{Wire, js, trim_js},
};

#[derive(Debug)]
pub enum Error {
    BadRequest(String),
    NotFound(String),
    Conflict(String),
    Database(DbError),
    Internal,
}

impl fmt::Display for Error {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("sales intelligence operation failed")
    }
}
impl StdError for Error {}
impl From<DbError> for Error {
    fn from(value: DbError) -> Self {
        Self::Database(value)
    }
}
impl Error {
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::Conflict(message) => ApiError::message(StatusCode::CONFLICT, message),
            Self::Database(_) | Self::Internal => ApiError::internal(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Service {
    database: Database,
}

impl Service {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list_stakeholders(&self, input: Query) -> Result<Wire, Error> {
        self.list(Kind::Stakeholder, input).await
    }
    pub async fn list_competitors(&self, input: Query) -> Result<Wire, Error> {
        self.list(Kind::Competitor, input).await
    }
    pub async fn list_discovery(&self, input: Query) -> Result<Wire, Error> {
        self.list(Kind::Discovery, input).await
    }

    async fn list(&self, kind: Kind, input: Query) -> Result<Wire, Error> {
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    if let Err(error) =
                        require_opportunity_context(connection, &input, None).await?
                    {
                        return Ok(Err(error));
                    }
                    let rows = store::list(connection, kind, &input).await?;
                    let names = load_context(connection, &rows).await?;
                    Ok(rows
                        .iter()
                        .map(|row| summary(kind, row, &names))
                        .collect::<Result<Vec<_>, _>>()
                        .map(array))
                })
            })
            .await?
    }

    pub async fn create_stakeholder(
        &self,
        input: CreateStakeholder,
        session: &ResolvedSession,
    ) -> Result<Wire, Error> {
        let values = BTreeMap::from([
            ("role", text(&input.role)),
            (
                "attitude",
                text(input.attitude.as_deref().unwrap_or("unknown")),
            ),
            (
                "influenceLevel",
                text(input.influence_level.as_deref().unwrap_or("unknown")),
            ),
            (
                "accessLevel",
                text(input.access_level.as_deref().unwrap_or("unknown")),
            ),
            (
                "focusAreas",
                focus(input.focus_areas.as_deref().unwrap_or(&[])),
            ),
            (
                "communicationNotes",
                optional_text(&input.communication_notes),
            ),
            (
                "isPrimary",
                FieldValue::Boolean(input.is_primary.unwrap_or(false)),
            ),
        ]);
        self.create(
            Kind::Stakeholder,
            CreateData {
                customer_id: input.customer_id,
                query: Query {
                    lead_id: input.lead_id,
                    project_id: input.project_id,
                },
                contact_id: Some(input.contact_id),
                values,
            },
            session,
        )
        .await
    }

    pub async fn create_competitor(
        &self,
        input: CreateCompetitor,
        session: &ResolvedSession,
    ) -> Result<Wire, Error> {
        let values = BTreeMap::from([
            (
                "competitorName",
                FieldValue::Text(trim_js(input.competitor_name)),
            ),
            (
                "position",
                text(input.position.as_deref().unwrap_or("unknown")),
            ),
            (
                "customerPreference",
                text(input.customer_preference.as_deref().unwrap_or("unknown")),
            ),
            (
                "competitorStrengths",
                optional_text(&input.competitor_strengths),
            ),
            (
                "competitorWeaknesses",
                optional_text(&input.competitor_weaknesses),
            ),
            ("ourAdvantages", optional_text(&input.our_advantages)),
            ("ourRisks", optional_text(&input.our_risks)),
            (
                "winProbability",
                text(input.win_probability.as_deref().unwrap_or("unknown")),
            ),
            ("evidence", optional_text(&input.evidence)),
        ]);
        self.create(
            Kind::Competitor,
            CreateData {
                customer_id: input.customer_id,
                query: Query {
                    lead_id: input.lead_id,
                    project_id: input.project_id,
                },
                contact_id: None,
                values,
            },
            session,
        )
        .await
    }

    pub async fn create_discovery(
        &self,
        input: CreateDiscovery,
        session: &ResolvedSession,
    ) -> Result<Wire, Error> {
        let values = BTreeMap::from([
            (
                "procurementProcess",
                optional_text(&input.procurement_process),
            ),
            ("budgetSource", optional_text(&input.budget_source)),
            (
                "customerPainPoints",
                optional_text(&input.customer_pain_points),
            ),
            ("decisionCycle", optional_text(&input.decision_cycle)),
            ("nextContactPlan", optional_text(&input.next_contact_plan)),
            ("remark", optional_text(&input.remark)),
        ]);
        self.create(
            Kind::Discovery,
            CreateData {
                customer_id: input.customer_id,
                query: Query {
                    lead_id: input.lead_id,
                    project_id: input.project_id,
                },
                contact_id: None,
                values,
            },
            session,
        )
        .await
    }

    async fn create(
        &self,
        kind: Kind,
        input: CreateData,
        session: &ResolvedSession,
    ) -> Result<Wire, Error> {
        let customer_id = input.customer_id.clone();
        let contact_id = input.contact_id.clone();
        let query = input.query;
        let context = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let context =
                        match require_opportunity_context(connection, &query, Some(&customer_id))
                            .await?
                        {
                            Ok(context) => context,
                            Err(error) => return Ok(Err(error)),
                        };
                    let mut names = context.names();
                    // Contact existence and input-string customer comparison occur only
                    // after all opportunity/customer checks, including inactive rows.
                    let contact_id = if let Some(id) = contact_id.as_deref() {
                        let Some(contact) =
                            opportunity_context::store::contact_by_id(connection, id).await?
                        else {
                            return Ok(Err(Error::NotFound(format!(
                                "CustomerContact {id} not found"
                            ))));
                        };
                        if contact.customer_id.to_string() != customer_id {
                            return Ok(Err(Error::BadRequest(format!(
                                "Contact {} does not belong to customer {customer_id}",
                                contact.id
                            ))));
                        }
                        names.contacts.insert(
                            contact.id,
                            ContactName {
                                name: contact.name,
                                department: contact.department,
                                title: contact.title,
                            },
                        );
                        Some(contact.id)
                    } else {
                        None
                    };
                    Ok(Ok(CreateContext {
                        customer_id: context.customer_id,
                        lead_id: context.lead.as_ref().map(|(id, _)| *id),
                        project_id: context.project.as_ref().map(|(id, _)| *id),
                        contact_id,
                        names,
                    }))
                })
            })
            .await??;
        let mut row = Record {
            id: random_uuid()?,
            customer_id: context.customer_id,
            lead_id: context.lead_id,
            project_id: context.project_id,
            contact_id: context.contact_id,
            values: input.values,
            row_version: 1,
            created_at: clock_now(),
            created_by: Some(session.user.user_id),
            updated_at: clock_now(),
            updated_by: Some(session.user.user_id),
        };
        let stored = row.clone();
        let pending = session.pending_flush.clone();
        row.row_version = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<i32, sqlx::Error> = async {
                        let version = store::insert(&mut transaction, kind, &stored).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(version)
                    }
                    .await;
                    match result {
                        Ok(version) => {
                            transaction.commit().await?;
                            Ok(version)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        summary(kind, &row, &context.names)
    }

    pub async fn update_stakeholder(
        &self,
        id: &str,
        input: UpdateStakeholder,
        session: &ResolvedSession,
        metadata: &RequestMetadata,
    ) -> Result<Wire, Error> {
        let mut values = BTreeMap::new();
        for (key, value) in [
            ("role", input.role),
            ("attitude", input.attitude),
            ("influenceLevel", input.influence_level),
            ("accessLevel", input.access_level),
        ] {
            if let Some(value) = value {
                values.insert(key, text(&value));
            }
        }
        if let Some(value) = input.focus_areas {
            values.insert("focusAreas", focus(&value));
        }
        patch_text(
            &mut values,
            "communicationNotes",
            &input.communication_notes,
        );
        if let Some(value) = input.is_primary {
            values.insert("isPrimary", FieldValue::Boolean(value));
        }
        self.update(Kind::Stakeholder, id, values, session, metadata)
            .await
    }

    pub async fn update_competitor(
        &self,
        id: &str,
        input: UpdateCompetitor,
        session: &ResolvedSession,
        metadata: &RequestMetadata,
    ) -> Result<Wire, Error> {
        let mut values = BTreeMap::new();
        if let Some(value) = input.competitor_name {
            values.insert("competitorName", FieldValue::Text(trim_js(value)));
        }
        for (key, value) in [
            ("position", input.position),
            ("customerPreference", input.customer_preference),
            ("winProbability", input.win_probability),
        ] {
            if let Some(value) = value {
                values.insert(key, text(&value));
            }
        }
        for (key, value) in [
            ("competitorStrengths", &input.competitor_strengths),
            ("competitorWeaknesses", &input.competitor_weaknesses),
            ("ourAdvantages", &input.our_advantages),
            ("ourRisks", &input.our_risks),
            ("evidence", &input.evidence),
        ] {
            patch_text(&mut values, key, value);
        }
        self.update(Kind::Competitor, id, values, session, metadata)
            .await
    }

    pub async fn update_discovery(
        &self,
        id: &str,
        input: UpdateDiscovery,
        session: &ResolvedSession,
        metadata: &RequestMetadata,
    ) -> Result<Wire, Error> {
        let mut values = BTreeMap::new();
        for (key, value) in [
            ("procurementProcess", &input.procurement_process),
            ("budgetSource", &input.budget_source),
            ("customerPainPoints", &input.customer_pain_points),
            ("decisionCycle", &input.decision_cycle),
            ("nextContactPlan", &input.next_contact_plan),
            ("remark", &input.remark),
        ] {
            patch_text(&mut values, key, value);
        }
        self.update(Kind::Discovery, id, values, session, metadata)
            .await
    }

    async fn update(
        &self,
        kind: Kind,
        id: &str,
        values: Values,
        session: &ResolvedSession,
        metadata: &RequestMetadata,
    ) -> Result<Wire, Error> {
        let id = id.to_owned();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        let request_id = metadata.request_id.clone();
        self.database.with_connection(move |connection| Box::pin(async move {
            let mut transaction = connection.begin().await?;
            let result: Result<Result<Wire, Error>, sqlx::Error> = async {
                let Some(before) = store::find(&mut transaction, kind, &id).await? else {
                    return Ok(Err(Error::NotFound(format!("{} {id} not found", kind.entity()))));
                };
                let mut after = before.clone();
                after.values.extend(values);
                let changed = changed_fields(kind, &before.values, &after.values);
                // PATCH loads display context, rather than rerunning create
                // eligibility/customer/anchor checks on an existing record.
                let names = load_context(&mut transaction, std::slice::from_ref(&after)).await?;
                if changed.is_empty() {
                    // A semantic no-op does not update the business row,
                    // version, time, actor or audit. Session maintenance is
                    // independent; the raw legacy representation stays intact.
                    let response = summary(kind, &before, &names);
                    if response.is_err() { return Ok(response); }
                    if let Some(pending) = pending.as_ref() {
                        flush_managed_session(&mut transaction, pending).await?;
                    }
                    return Ok(response);
                }
                after.updated_by = Some(operator);
                let before_snapshot = audit_snapshot(&before.values, &changed, kind.redacted())?;
                let after_snapshot = audit_snapshot(&after.values, &changed, kind.redacted())?;
                let mut business_context = json!({
                    "customerId": before.customer_id, "leadId": before.lead_id,
                    "projectId": before.project_id,
                });
                if kind == Kind::Stakeholder { business_context["contactId"] = json!(before.contact_id); }
                let audit_metadata = json!({
                    "changedFields": changed, "sourceCommand": kind.command(),
                    "redactedFields": changed.iter().filter(|key| kind.redacted().contains(key)).collect::<Vec<_>>(),
                    "businessContext": business_context,
                });
                // Native SQL authority03: audit INSERT, managed session UPDATE,
                // then the business row CAS UPDATE, all in the same transaction.
                insert_audit(&mut transaction, kind, before.id, operator, request_id,
                    &before_snapshot, &after_snapshot, audit_metadata).await?;
                if let Some(pending) = pending.as_ref() {
                    flush_managed_session(&mut transaction, pending).await?;
                }
                let at = clock_now();
                let updated = store::update(&mut transaction, kind, &before, &after, &changed, at).await?;
                after.row_version = match updated_version(kind, before.id, updated) {
                    Ok(version) => version,
                    Err(error) => return Ok(Err(error)),
                };
                after.updated_at = at;
                Ok(summary(kind, &after, &names))
            }.await;
            match result {
                Ok(Ok(value)) => { transaction.commit().await?; Ok(Ok(value)) }
                Ok(Err(error)) => { transaction.rollback().await?; Ok(Err(error)) }
                Err(error) => { transaction.rollback().await?; Err(error) }
            }
        })).await?
    }

    pub async fn gaps(&self, input: Query) -> Result<Wire, Error> {
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    if let Err(error) =
                        require_opportunity_context(connection, &input, None).await?
                    {
                        return Ok(Err(error));
                    }
                    let stakeholders = store::list(connection, Kind::Stakeholder, &input).await?;
                    let competitors = store::list(connection, Kind::Competitor, &input).await?;
                    let discovery = store::list(connection, Kind::Discovery, &input).await?;
                    let facts = gap_facts(&stakeholders, &competitors, discovery.first());
                    Ok(Ok(gap_summary(&facts)))
                })
            })
            .await?
    }
}

struct CreateData {
    customer_id: String,
    query: Query,
    contact_id: Option<String>,
    values: Values,
}
struct CreateContext {
    customer_id: Uuid,
    lead_id: Option<Uuid>,
    project_id: Option<Uuid>,
    contact_id: Option<Uuid>,
    names: ContextNames,
}
struct OpportunityContext {
    customer_id: Uuid,
    customer_name: String,
    lead: Option<(Uuid, String)>,
    project: Option<(Uuid, String)>,
}

impl OpportunityContext {
    fn names(&self) -> ContextNames {
        ContextNames {
            customers: BTreeMap::from([(self.customer_id, self.customer_name.clone())]),
            leads: self.lead.iter().cloned().collect(),
            projects: self.project.iter().cloned().collect(),
            contacts: BTreeMap::new(),
        }
    }
}

async fn require_opportunity_context(
    connection: &mut PgConnection,
    input: &Query,
    input_customer: Option<&str>,
) -> Result<Result<OpportunityContext, Error>, sqlx::Error> {
    // Both requested anchors are read before the source's missing-row checks.
    let lead = match input.lead_id.as_deref() {
        Some(id) => leads::store::by_id(connection, id).await?,
        None => None,
    };
    let project = match input.project_id.as_deref() {
        Some(id) => projects::store::find(connection, id).await?,
        None => None,
    };
    if let Some(id) = input.lead_id.as_deref()
        && lead.is_none()
    {
        return Ok(Err(Error::NotFound(format!("Lead {id} not found"))));
    }
    if let Some(id) = input.project_id.as_deref()
        && project.is_none()
    {
        return Ok(Err(Error::NotFound(format!("Project {id} not found"))));
    }
    let customer_id = input_customer
        .map(str::to_owned)
        .or_else(|| {
            project
                .as_ref()
                .and_then(|project| project.customer_id)
                .map(|id| id.to_string())
        })
        .or_else(|| lead.as_ref().map(|lead| lead.customer_id.to_string()));
    let Some(customer_id) = customer_id.filter(|value| !value.is_empty()) else {
        return Ok(Err(Error::BadRequest(
            "Opportunity context must resolve a customer".into(),
        )));
    };
    // Keep the input spelling: PostgreSQL UUID equality is deliberately not a
    // substitute for Native's strict JavaScript customer-id string comparison.
    if let Some(lead) = lead.as_ref()
        && lead.customer_id.to_string() != customer_id
    {
        return Ok(Err(Error::BadRequest(format!(
            "Lead {} does not belong to customer {customer_id}",
            lead.id
        ))));
    }
    if let Some(project) = project.as_ref()
        && project.customer_id.map(|id| id.to_string()).as_deref() != Some(customer_id.as_str())
    {
        return Ok(Err(Error::BadRequest(format!(
            "Project {} does not belong to customer {customer_id}",
            project.id
        ))));
    }
    let Some(customer) = customers::store::find_customer(connection, &customer_id).await? else {
        return Ok(Err(Error::NotFound(format!(
            "Customer {customer_id} not found"
        ))));
    };
    Ok(Ok(OpportunityContext {
        customer_id: customer.id,
        customer_name: customer.display_name,
        lead: lead.map(|lead| (lead.id, lead.lead_name)),
        project: project.map(|project| (project.id, project.project_name)),
    }))
}

#[derive(Default)]
struct ContextNames {
    customers: BTreeMap<Uuid, String>,
    leads: BTreeMap<Uuid, String>,
    projects: BTreeMap<Uuid, String>,
    contacts: BTreeMap<Uuid, ContactName>,
}
struct ContactName {
    name: String,
    department: Option<String>,
    title: Option<String>,
}

async fn load_context(
    connection: &mut PgConnection,
    rows: &[Record],
) -> Result<ContextNames, sqlx::Error> {
    let mut customer_ids = Vec::new();
    let mut lead_ids = Vec::new();
    let mut project_ids = Vec::new();
    let mut contact_ids = Vec::new();
    for row in rows {
        unique(&mut customer_ids, row.customer_id);
        if let Some(id) = row.lead_id {
            unique(&mut lead_ids, id);
        }
        if let Some(id) = row.project_id {
            unique(&mut project_ids, id);
        }
        if let Some(id) = row.contact_id {
            unique(&mut contact_ids, id);
        }
    }
    let mut names = ContextNames::default();
    for id in customer_ids {
        if let Some(row) = customers::store::find_customer(connection, &id.to_string()).await? {
            names.customers.insert(row.id, row.display_name);
        }
    }
    for row in leads::store::by_ids(connection, &lead_ids).await? {
        names.leads.insert(row.id, row.lead_name);
    }
    for id in project_ids {
        if let Some(row) = projects::store::find(connection, &id.to_string()).await? {
            names.projects.insert(row.id, row.project_name);
        }
    }
    for id in contact_ids {
        if let Some(row) =
            opportunity_context::store::contact_by_id(connection, &id.to_string()).await?
        {
            names.contacts.insert(
                row.id,
                ContactName {
                    name: row.name,
                    department: row.department,
                    title: row.title,
                },
            );
        }
    }
    Ok(names)
}

fn unique(values: &mut Vec<Uuid>, value: Uuid) {
    if !values.contains(&value) {
        values.push(value);
    }
}

fn text(value: &str) -> FieldValue {
    FieldValue::Text(js(value))
}
fn optional_text(value: &Field<JsString>) -> FieldValue {
    match value {
        Field::Value(value) => {
            let value = trim_js(value.clone());
            if value.is_empty() {
                FieldValue::Null
            } else {
                FieldValue::Text(value)
            }
        }
        _ => FieldValue::Null,
    }
}
fn patch_text(values: &mut Values, key: &'static str, value: &Field<JsString>) {
    if !value.is_missing() {
        values.insert(key, optional_text(value));
    }
}
fn focus(values: &[JsString]) -> FieldValue {
    FieldValue::Json {
        raw: format!(
            "[{}]",
            values
                .iter()
                .map(JsString::json)
                .collect::<Vec<_>>()
                .join(",")
        ),
        nullish: false,
    }
}

fn changed_fields(kind: Kind, before: &Values, after: &Values) -> Vec<&'static str> {
    kind.fields()
        .iter()
        .copied()
        .filter(|key| {
            let encode = |values: &Values| {
                values
                    .get(key)
                    .map_or_else(|| "null".into(), |value| value.audit_json(key))
            };
            encode(before) != encode(after)
        })
        .collect()
}

fn updated_version(kind: Kind, id: Uuid, version: Option<i32>) -> Result<i32, Error> {
    version.ok_or_else(|| {
        Error::Conflict(format!(
            "{} {id} has been modified; refresh and retry",
            kind.entity()
        ))
    })
}

fn focus_areas_view(value: &FieldValue) -> Vec<String> {
    // Read-side type projection only: preserve every valid legacy string,
    // order and duplicate, including arrays beyond the write-side max12.
    // Null and invalid old shapes are an empty public list; never repair storage
    // or reveal an arbitrary old object through the string[] summary contract.
    serde_json::from_str::<Vec<String>>(&value.json()).unwrap_or_default()
}

fn audit_snapshot(
    values: &Values,
    fields: &[&str],
    redacted: &[&str],
) -> Result<String, sqlx::Error> {
    let mut entries = Vec::new();
    for &key in fields {
        let raw = values
            .get(key)
            .map_or_else(|| "null".into(), |value| value.audit_json(key));
        let value = if redacted.contains(&key) {
            let value: &RawValue = serde_json::from_str(&raw)
                .map_err(|_| sqlx::Error::Protocol("invalid sales audit value".into()))?;
            if value.get().starts_with('[') {
                let array: Vec<&RawValue> = serde_json::from_str(value.get())
                    .map_err(|_| sqlx::Error::Protocol("invalid sales audit array".into()))?;
                json!({"changed":true,"count":array.len()}).to_string()
            } else {
                let length =
                    decode_string(value.get()).map_or(0, |text| text.as_code_units().len());
                json!({"changed":true,"present":length>0,"length":length}).to_string()
            }
        } else {
            raw
        };
        entries.push(format!("{}:{value}", js(key).json()));
    }
    Ok(format!("{{{}}}", entries.join(",")))
}

#[allow(clippy::too_many_arguments)]
async fn insert_audit(
    connection: &mut PgConnection,
    kind: Kind,
    id: Uuid,
    operator: Uuid,
    request_id: Option<String>,
    before: &str,
    after: &str,
    metadata: Value,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.audit_log (event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) VALUES ($1,$2,$3,$4,$5,'success',NULL,$6::text::jsonb,$7::text::jsonb,$8,$9)")
        .bind(kind.event()).bind(kind.target()).bind(id.to_string()).bind(operator).bind(request_id)
        .bind(before).bind(after).bind(metadata).bind(clock_now()).execute(connection).await?;
    Ok(())
}

fn summary(kind: Kind, row: &Record, names: &ContextNames) -> Result<Wire, Error> {
    let mut fields = vec![
        ("id", json!(row.id).to_string()),
        ("customerId", json!(row.customer_id).to_string()),
        (
            "customerName",
            js(names
                .customers
                .get(&row.customer_id)
                .map_or("", String::as_str))
            .json(),
        ),
        ("leadId", json!(row.lead_id).to_string()),
        (
            "leadName",
            json!(row.lead_id.and_then(|id| names.leads.get(&id))).to_string(),
        ),
        ("projectId", json!(row.project_id).to_string()),
        (
            "projectName",
            json!(row.project_id.and_then(|id| names.projects.get(&id))).to_string(),
        ),
    ];
    if kind == Kind::Stakeholder {
        let contact = row.contact_id.and_then(|id| names.contacts.get(&id));
        fields.extend([
            ("contactId", json!(row.contact_id).to_string()),
            (
                "contactName",
                js(contact.map_or("", |contact| contact.name.as_str())).json(),
            ),
            (
                "contactDepartment",
                json!(contact.and_then(|contact| contact.department.as_ref())).to_string(),
            ),
            (
                "contactTitle",
                json!(contact.and_then(|contact| contact.title.as_ref())).to_string(),
            ),
        ]);
    }
    for &key in kind.fields() {
        let value = row.values.get(key).ok_or(Error::Internal)?;
        fields.push((
            key,
            if key == "focusAreas" {
                json!(focus_areas_view(value)).to_string()
            } else {
                value.json()
            },
        ));
    }
    fields.extend([
        ("rowVersion", row.row_version.to_string()),
        (
            "createdAt",
            json!(js_iso_string(row.created_at).map_err(|_| Error::Internal)?).to_string(),
        ),
        ("createdBy", json!(row.created_by).to_string()),
        (
            "updatedAt",
            json!(js_iso_string(row.updated_at).map_err(|_| Error::Internal)?).to_string(),
        ),
        ("updatedBy", json!(row.updated_by).to_string()),
    ]);
    Ok(Wire(format!(
        "{{{}}}",
        fields
            .into_iter()
            .map(|(key, value)| { format!("{}:{value}", js(key).json()) })
            .collect::<Vec<_>>()
            .join(",")
    )))
}

fn array(values: Vec<Wire>) -> Wire {
    Wire(format!(
        "[{}]",
        values
            .into_iter()
            .map(|value| value.0)
            .collect::<Vec<_>>()
            .join(",")
    ))
}

fn gap_facts(
    stakeholders: &[Record],
    competitors: &[Record],
    discovery: Option<&Record>,
) -> SalesIntelligenceFacts {
    let has_role = |role| {
        stakeholders.iter().any(|row| {
            matches!(
                row.values.get("role"), Some(FieldValue::Text(value)) if value.eq_ascii(role)
            )
        })
    };
    let has_text = |key| {
        discovery.and_then(|row| row.values.get(key)).is_some_and(
            |value| matches!(value, FieldValue::Text(text) if !trim_js(text.clone()).is_empty()),
        )
    };
    SalesIntelligenceFacts {
        decision_maker_known: has_role("decision-maker"),
        technical_evaluator_known: has_role("technical-evaluator"),
        procurement_process_known: has_text("procurementProcess"),
        budget_source_known: has_text("budgetSource"),
        competitor_known: !competitors.is_empty(),
        pain_point_known: has_text("customerPainPoints"),
        next_contact_known: has_text("nextContactPlan")
            || stakeholders
                .iter()
                .any(|row| matches!(row.values.get("isPrimary"), Some(FieldValue::Boolean(true)))),
    }
}

fn gap_summary(facts: &SalesIntelligenceFacts) -> Wire {
    let entries = [
        (
            facts.decision_maker_known,
            "decision-maker",
            "决策人未知",
            "soft-blocker",
        ),
        (
            facts.technical_evaluator_known,
            "technical-evaluator",
            "技术把关人未知",
            "attention",
        ),
        (
            facts.procurement_process_known,
            "procurement-process",
            "采购流程未知",
            "soft-blocker",
        ),
        (
            facts.budget_source_known,
            "budget-source",
            "预算来源未知",
            "soft-blocker",
        ),
        (
            facts.competitor_known,
            "competitor",
            "竞争对手未知",
            "attention",
        ),
        (
            facts.pain_point_known,
            "pain-point",
            "客户核心痛点不明确",
            "attention",
        ),
        (
            facts.next_contact_known,
            "next-contact",
            "下一步接触对象不明确",
            "attention",
        ),
    ];
    array(entries.into_iter().filter(|(known, _, _, _)| !known).map(|(_, item, label, severity)| {
        Wire(format!("{{\"item\":{},\"label\":{},\"isMissing\":true,\"explanation\":{},\"severity\":{}}}",
            js(item).json(), js(label).json(), js(label).json(), js(severity).json()))
    }).collect())
}

fn random_uuid() -> Result<Uuid, Error> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| Error::Internal)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audit_uses_utf16_and_array_order_instead_of_set_equality() {
        let before = BTreeMap::from([
            ("focusAreas", focus(&[js("a"), js("b")])),
            ("communicationNotes", FieldValue::Null),
        ]);
        let after = BTreeMap::from([
            ("focusAreas", focus(&[js("b"), js("a")])),
            ("communicationNotes", text("🙂")),
        ]);
        let changed = changed_fields(Kind::Stakeholder, &before, &after);
        assert_eq!(changed, ["focusAreas", "communicationNotes"]);
        let snapshot = audit_snapshot(&after, &changed, Kind::Stakeholder.redacted())
            .unwrap_or_else(|_| panic!("valid source audit values"));
        let snapshot: Value =
            serde_json::from_str(&snapshot).unwrap_or_else(|_| panic!("valid audit JSON"));
        assert_eq!(snapshot["focusAreas"], json!({"changed":true,"count":2}));
        assert_eq!(
            snapshot["communicationNotes"],
            json!({"changed":true,"present":true,"length":2})
        );
    }

    #[test]
    fn null_focus_empty_patch_is_noop_and_never_joins_an_unrelated_field_write() {
        let before = BTreeMap::from([
            (
                "focusAreas",
                FieldValue::Json {
                    raw: "null".into(),
                    nullish: true,
                },
            ),
            ("communicationNotes", FieldValue::Null),
        ]);
        let mut after = before.clone();
        after.insert("focusAreas", focus(&[]));
        assert!(changed_fields(Kind::Stakeholder, &before, &after).is_empty());
        assert_eq!(
            before.get("focusAreas").map(FieldValue::json).as_deref(),
            Some("null")
        );

        after.insert("communicationNotes", text("meaningful note"));
        let changed = changed_fields(Kind::Stakeholder, &before, &after);
        assert_eq!(changed, ["communicationNotes"]);
        let snapshot = audit_snapshot(&after, &changed, Kind::Stakeholder.redacted())
            .unwrap_or_else(|_| panic!("valid audit values"));
        let snapshot: Value =
            serde_json::from_str(&snapshot).unwrap_or_else(|_| panic!("valid audit JSON"));
        assert!(snapshot.get("focusAreas").is_none());
        assert_eq!(
            before.get("focusAreas").map(FieldValue::json).as_deref(),
            Some("null")
        );

        let meaningful = BTreeMap::from([
            ("focusAreas", focus(&[js("budget")])),
            ("communicationNotes", FieldValue::Null),
        ]);
        assert_eq!(
            changed_fields(Kind::Stakeholder, &before, &meaningful),
            ["focusAreas"]
        );
    }

    fn stakeholder_record_with_focus(raw: &str) -> Record {
        Record {
            id: Uuid::nil(),
            customer_id: Uuid::nil(),
            lead_id: Some(Uuid::nil()),
            project_id: None,
            contact_id: Some(Uuid::nil()),
            values: BTreeMap::from([
                ("role", text("unknown")),
                ("attitude", text("unknown")),
                ("influenceLevel", text("unknown")),
                ("accessLevel", text("unknown")),
                (
                    "focusAreas",
                    FieldValue::Json {
                        raw: raw.to_owned(),
                        nullish: raw == "null",
                    },
                ),
                ("communicationNotes", FieldValue::Null),
                ("isPrimary", FieldValue::Boolean(false)),
            ]),
            row_version: 7,
            created_at: chrono::DateTime::<chrono::Utc>::UNIX_EPOCH,
            created_by: None,
            updated_at: chrono::DateTime::<chrono::Utc>::UNIX_EPOCH,
            updated_by: None,
        }
    }

    #[test]
    fn focus_summary_preserves_legacy_strings_and_projects_invalid_shapes_without_mutation() {
        let thirteen = (0..13)
            .map(|index| format!("legacy-{index}"))
            .collect::<Vec<_>>();
        let full_strings = vec![
            " untrimmed ".to_owned(),
            " untrimmed ".to_owned(),
            "🙂".repeat(65),
        ];
        let cases = [
            ("null".to_owned(), Vec::<String>::new()),
            (
                "{\"legacy\":\"must not leak as an object\"}".to_owned(),
                vec![],
            ),
            ("[\"valid\",7]".to_owned(), vec![]),
            ("\"not-an-array\"".to_owned(), vec![]),
            (json!(thirteen).to_string(), thirteen),
            (json!(full_strings).to_string(), full_strings),
        ];
        for (raw, expected) in cases {
            let row = stakeholder_record_with_focus(&raw);
            let before = row.values.get("focusAreas").map(FieldValue::json);
            let wire = summary(Kind::Stakeholder, &row, &ContextNames::default())
                .unwrap_or_else(|_| panic!("typed stakeholder summary"));
            let body: Value =
                serde_json::from_str(&wire.0).unwrap_or_else(|_| panic!("valid summary JSON"));
            assert_eq!(body["focusAreas"], json!(expected));
            assert!(
                body["focusAreas"]
                    .as_array()
                    .is_some_and(|values| values.iter().all(Value::is_string))
            );
            assert_eq!(row.values.get("focusAreas").map(FieldValue::json), before);
            assert_eq!(row.row_version, 7);
            assert_eq!(row.updated_at, chrono::DateTime::<chrono::Utc>::UNIX_EPOCH);
            assert_eq!(row.updated_by, None);
        }
    }

    #[test]
    fn managed_version_failure_is_a_clear_409() {
        use axum::response::IntoResponse;
        assert_eq!(
            updated_version(Kind::Discovery, Uuid::nil(), Some(8))
                .unwrap_or_else(|_| panic!("successful CAS version")),
            8
        );
        let Err(error) = updated_version(Kind::Discovery, Uuid::nil(), None) else {
            panic!("missing CAS result must conflict");
        };
        assert!(
            matches!(&error, Error::Conflict(message) if message.contains("refresh and retry"))
        );
        assert_eq!(
            error.into_api_error().into_response().status(),
            StatusCode::CONFLICT
        );
    }

    #[test]
    fn missing_gaps_keep_the_seven_source_items_and_severity_order() {
        let gaps = gap_summary(&SalesIntelligenceFacts::default());
        let gaps: Value =
            serde_json::from_str(&gaps.0).unwrap_or_else(|_| panic!("valid gaps JSON"));
        let items = gaps
            .as_array()
            .into_iter()
            .flatten()
            .map(|item| item["item"].as_str().unwrap_or(""))
            .collect::<Vec<_>>();
        assert_eq!(
            items,
            [
                "decision-maker",
                "technical-evaluator",
                "procurement-process",
                "budget-source",
                "competitor",
                "pain-point",
                "next-contact"
            ]
        );
        assert_eq!(gaps[0]["severity"], "soft-blocker");
        assert_eq!(gaps[1]["severity"], "attention");
        assert_eq!(gaps[2]["severity"], "soft-blocker");
        assert_eq!(gaps[3]["severity"], "soft-blocker");
    }
}
