//! Lead business commands commit their state, score, owner record, required
//! snapshot and audit together. Number reservation remains independent.

use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::{Connection, PgConnection};
use std::{
    collections::{BTreeMap, HashMap},
    error::Error,
    fmt,
    future::Future,
    pin::Pin,
    sync::Arc,
};
use uuid::Uuid;

use super::{
    model::*,
    scoring,
    store::{self, LeadRow, OverrideRow, SnapshotRow},
};
use crate::{
    auth::{
        js_json::JsString,
        model::{ResolvedSession, SessionFlush, UserReadSnapshot, clock_now},
        service::AuthService,
        store::flush_managed_session,
    },
    business_numbers::{BusinessNumberScope, BusinessNumberService},
    compat::{json::Field, scalars::js_iso_string},
    customers::service::{CustomersError, CustomersService},
    database::{Database, DbError},
    dictionary::{
        model::DictionaryQuery,
        service::{DictionaryError, DictionaryService},
    },
    error::ApiError,
    projects::store::ProjectRow,
};

#[derive(Debug)]
pub enum LeadsError {
    NotFound(String),
    BadRequest(String),
    Conflict(String),
    Customer(CustomersError),
    Dictionary(DictionaryError),
    Database(DbError),
    Business(crate::contract_support::Error),
    Internal,
}

impl LeadsError {
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
            Self::Conflict(message) => ApiError::message(StatusCode::CONFLICT, message),
            Self::Customer(error) => error.into_api_error(),
            Self::Business(error) => error.into_api_error(),
            Self::Dictionary(DictionaryError::NotFound(message)) => {
                ApiError::message(StatusCode::NOT_FOUND, message)
            }
            Self::Dictionary(DictionaryError::BadRequest(message)) => {
                ApiError::message(StatusCode::BAD_REQUEST, message)
            }
            Self::Dictionary(DictionaryError::Conflict(message)) => {
                ApiError::message(StatusCode::CONFLICT, message)
            }
            _ => ApiError::internal(),
        }
    }
}
impl fmt::Display for LeadsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("lead operation failed")
    }
}
impl Error for LeadsError {}
impl From<DbError> for LeadsError {
    fn from(error: DbError) -> Self {
        Self::Database(error)
    }
}
impl From<sqlx::Error> for LeadsError {
    fn from(error: sqlx::Error) -> Self {
        if error.as_database_error().is_some_and(|error| {
            error.code().is_some_and(|code| code == "23505")
                && matches!(
                    error.constraint(),
                    Some("uq_lso_lead_pending" | "uq_lso_lead_approved")
                )
        }) {
            return Self::Conflict(
                "Lead score override changed concurrently; reload and retry".into(),
            );
        }
        Self::Internal
    }
}
impl From<CustomersError> for LeadsError {
    fn from(error: CustomersError) -> Self {
        Self::Customer(error)
    }
}
impl From<DictionaryError> for LeadsError {
    fn from(error: DictionaryError) -> Self {
        Self::Dictionary(error)
    }
}

type Work<'c, T> = Pin<Box<dyn Future<Output = Result<T, LeadsError>> + Send + 'c>>;

/// One explicit system calculation owns both the persisted result and its
/// explanation. Building a snapshot never collects a second set of live facts.
#[derive(Clone, Debug)]
struct SystemScoreTuple {
    formula_version: String,
    score: i32,
    rating: String,
    reason: String,
    component_breakdown: String,
    gate_summary: String,
}

impl SystemScoreTuple {
    fn calculate(lead: &LeadRow, facts: &scoring::Facts) -> Result<Self, LeadsError> {
        let input = lead.gate_input();
        let value = scoring::breakdown(&input, facts);
        Ok(Self {
            formula_version: scoring::FORMULA_VERSION.into(),
            score: value.total,
            rating: scoring::rating(value.total).into(),
            reason: scoring::score_reason(&value),
            component_breakdown: serde_json::to_string(&value).map_err(|_| LeadsError::Internal)?,
            gate_summary: serde_json::to_string(&scoring::gate_summary(&input))
                .map_err(|_| LeadsError::Internal)?,
        })
    }

    fn apply(&self, lead: &mut LeadRow) {
        lead.score = self.score;
        lead.rating = self.rating.clone();
        lead.score_reason = self.reason.clone();
        lead.score_updated_at = clock_now();
    }

    /// Validate stored facts against their own calculation, never against
    /// newly collected I/F/upload facts. Extra historical JSON metadata is kept.
    fn from_stored(lead: &LeadRow, snapshot: &SnapshotRow) -> Result<Option<Self>, LeadsError> {
        if snapshot.lead_id != lead.id
            || snapshot.snapshot_kind != "system"
            || snapshot.system_score != lead.score
            || snapshot.system_rating != lead.rating
            || snapshot.system_rating != scoring::rating(lead.score)
        {
            return Ok(None);
        }
        let Ok(component) = serde_json::from_str::<Value>(&snapshot.component_breakdown) else {
            return Ok(None);
        };
        let Ok(gates) = serde_json::from_str::<Value>(&snapshot.gate_summary_snapshot) else {
            return Ok(None);
        };
        if !component.is_object() || !gates.is_object() {
            return Ok(None);
        }
        let input = lead.gate_input();
        let expected_gates = serde_json::to_value(scoring::gate_summary(&input))
            .map_err(|_| LeadsError::Internal)?;
        if !equal_json(&gates, &expected_gates)
            || !component
                .get("total")
                .is_some_and(|total| equal_json(total, &json!(lead.score)))
            || component
                .get("formulaVersion")
                .is_some_and(|version| version.as_str() != Some(snapshot.formula_version.as_str()))
        {
            return Ok(None);
        }

        let expected = match snapshot.formula_version.as_str() {
            scoring::FORMULA_VERSION => {
                let Some(facts) = stored_score_facts(&component) else {
                    return Ok(None);
                };
                let value = scoring::breakdown(&input, &facts);
                if value.total != lead.score || scoring::score_reason(&value) != lead.score_reason {
                    return Ok(None);
                }
                serde_json::to_value(value).map_err(|_| LeadsError::Internal)?
            }
            "lead-score-v1" => {
                // v1 has the same seven base components before v2's 65% weight.
                // Its historical system reason and formula remain unchanged.
                let value = scoring::breakdown(&input, &scoring::Facts::default());
                let total = (value.source
                    + value.demand
                    + value.budget
                    + value.amount
                    + value.urgency
                    + value.expected_decision_date
                    + value.owner)
                    .min(100);
                if total != lead.score {
                    return Ok(None);
                }
                let mut value = serde_json::to_value(value).map_err(|_| LeadsError::Internal)?;
                value["total"] = json!(total);
                value["formulaVersion"] = json!("lead-score-v1");
                value
            }
            _ => return Ok(None),
        };
        let fields: &[&str] = if snapshot.formula_version == scoring::FORMULA_VERSION {
            &[
                "source",
                "demand",
                "budget",
                "amount",
                "urgency",
                "expectedDecisionDate",
                "owner",
                "baseBusiness",
                "salesIntelligence",
                "followUpActivity",
                "attachmentEvidence",
                "total",
                "formulaVersion",
            ]
        } else {
            &[
                "source",
                "demand",
                "budget",
                "amount",
                "urgency",
                "expectedDecisionDate",
                "owner",
                "total",
            ]
        };
        if fields
            .iter()
            .any(|key| match (component.get(*key), expected.get(*key)) {
                (Some(actual), Some(expected)) => !equal_json(actual, expected),
                _ => true,
            })
        {
            return Ok(None);
        }
        Ok(Some(Self {
            formula_version: snapshot.formula_version.clone(),
            score: lead.score,
            rating: lead.rating.clone(),
            reason: lead.score_reason.clone(),
            component_breakdown: snapshot.component_breakdown.clone(),
            gate_summary: snapshot.gate_summary_snapshot.clone(),
        }))
    }
}

fn equal_json(actual: &Value, expected: &Value) -> bool {
    scoring::semantic_json_equal(&actual.to_string(), &expected.to_string()).unwrap_or(false)
}

fn stored_score_facts(component: &Value) -> Option<scoring::Facts> {
    Some(scoring::Facts {
        sales_intelligence: serde_json::from_value(stored_fact_numbers(
            component.get("salesIntelligenceFacts")?.clone(),
        ))
        .ok()?,
        follow_up: serde_json::from_value(stored_fact_numbers(
            component.get("followUpFacts")?.clone(),
        ))
        .ok()?,
        attachment_evidence: serde_json::from_value(stored_fact_numbers(
            component.get("attachmentFacts")?.clone(),
        ))
        .ok()?,
    })
}

fn stored_fact_numbers(mut value: Value) -> Value {
    // JSONB may spell an integer count as 1.0. Preserve semantic matching
    // without converting exact historical integers through binary64.
    if let Value::Object(object) = &mut value {
        for value in object.values_mut() {
            if let Value::Number(number) = value
                && let Ok(decimal) = number.to_string().parse::<rust_decimal::Decimal>()
                && decimal.fract().is_zero()
                && let Ok(integer) = decimal
                    .normalize()
                    .to_string()
                    .parse::<serde_json::Number>()
            {
                *number = integer;
            }
        }
    }
    value
}

struct OwnerChange {
    lead: LeadRow,
    operator: Uuid,
    owner: Uuid,
    org_wire: Option<String>,
    kind: &'static str,
    reason: Option<JsString>,
    pending: Option<SessionFlush>,
}

#[derive(Clone)]
pub struct LeadsService {
    database: Database,
    customers: Arc<CustomersService>,
    dictionary: Arc<DictionaryService>,
    _auth: Arc<AuthService>,
}

impl LeadsService {
    pub fn new(
        database: Database,
        customers: Arc<CustomersService>,
        dictionary: Arc<DictionaryService>,
        auth: Arc<AuthService>,
    ) -> Self {
        Self {
            database,
            customers,
            dictionary,
            _auth: auth,
        }
    }

    async fn read<T, F>(&self, work: F) -> Result<T, LeadsError>
    where
        T: Send + 'static,
        F: for<'c> FnOnce(&'c mut PgConnection) -> Work<'c, T> + Send + 'static,
    {
        self.database
            .with_connection(move |connection| Box::pin(async move { Ok(work(connection).await) }))
            .await?
    }

    async fn transaction<T, F>(&self, work: F) -> Result<T, LeadsError>
    where
        T: Send + 'static,
        F: for<'c> FnOnce(&'c mut PgConnection) -> Work<'c, T> + Send + 'static,
    {
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    match work(&mut transaction).await {
                        Ok(value) => {
                            transaction.commit().await?;
                            Ok(Ok(value))
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Ok(Err(error))
                        }
                    }
                })
            })
            .await?
    }

    async fn source_names(&self) -> Result<BTreeMap<String, JsString>, LeadsError> {
        let items = self
            .dictionary
            .list(DictionaryQuery {
                domain: Some("lead-source".into()),
                ..Default::default()
            })
            .await?;
        Ok(items
            .into_iter()
            .map(|item| (item.code.to_utf8_lossy(), item.name))
            .collect())
    }

    async fn override_transaction<F>(
        &self,
        event: &'static str,
        request_id: Option<String>,
        work: F,
    ) -> Result<OverrideRow, LeadsError>
    where
        F: for<'c> FnOnce(&'c mut PgConnection) -> Work<'c, OverrideRow> + Send + 'static,
    {
        self.transaction(move |connection| {
            Box::pin(async move {
                let row = work(connection).await?;
                let metadata = override_metadata(event, &row);
                store::insert_raw_audit(
                    connection,
                    store::RawAudit {
                        event_type: event,
                        target_type: "lead-score-override",
                        target_id: &row.id.to_string(),
                        operator_id: row.updated_by.ok_or(LeadsError::Internal)?,
                        request_id: request_id.as_deref(),
                        before: None,
                        after: None,
                        metadata: Some(&metadata),
                    },
                )
                .await?;
                Ok(row)
            })
        })
        .await
    }

    pub async fn list(&self, input: Query, session: &ResolvedSession) -> Result<Wire, LeadsError> {
        let user_id = session.user.user_id;
        let permissions = session.user.permissions.clone();
        let result = self
            .read(move |connection| {
                Box::pin(async move {
                    let leads = store::list(connection, &input, user_id).await?;
                    let mut counts = BTreeMap::from([
                        ("active", 0_usize),
                        ("registered", 0),
                        ("qualified", 0),
                        ("ready-to-convert", 0),
                        ("blocked-conversion", 0),
                        ("converted", 0),
                        ("closed", 0),
                        ("all", 0),
                    ]);
                    for lead in &leads {
                        for scope in scoring::scopes(&lead.gate_input()) {
                            if let Some(n) = counts.get_mut(scope) {
                                *n += 1;
                            }
                        }
                    }
                    let scoped = leads
                        .into_iter()
                        .filter(|lead| {
                            scoring::scopes(&lead.gate_input()).contains(&input.scope.as_str())
                        })
                        .collect::<Vec<_>>();
                    let total = scoped.len();
                    let skip = (input.page - 1).saturating_mul(input.page_size) as usize;
                    let page = scoped
                        .into_iter()
                        .skip(skip)
                        .take(input.page_size as usize)
                        .collect::<Vec<_>>();
                    let ids = page.iter().map(|lead| lead.id).collect::<Vec<_>>();
                    let active = store::active_overrides(connection, &ids)
                        .await?
                        .into_iter()
                        .map(|row| (row.lead_id, row))
                        .collect::<HashMap<_, _>>();
                    let mut items = Vec::new();
                    for lead in &page {
                        items.push(
                            list_view(connection, lead, None, active.get(&lead.id), &permissions)
                                .await?,
                        );
                    }
                    Ok((input, counts, total, page, items))
                })
            })
            .await?;
        let (input, counts, total, page, mut items) = result;
        if !page.is_empty() {
            let sources = self.source_names().await?;
            for (lead, item) in page.iter().zip(items.iter_mut()) {
                item["sourceName"] = sources
                    .get(&lead.source_code)
                    .map_or(Value::Null, |name| json!(name.to_utf8_lossy()));
            }
        }
        let facets = facets(&counts);
        Ok(Wire::value(
            json!({"scope":input.scope,"summary":counts,"facets":facets,"totalItems":total,"page":input.page,"pageSize":input.page_size,"items":items}),
        ))
    }

    pub async fn get(&self, id: &str, session: &ResolvedSession) -> Result<Wire, LeadsError> {
        let key = id.to_owned();
        let permissions = session.user.permissions.clone();
        let principal = session.user_snapshot.clone();
        let (lead, mut detail) = self
            .read(move |connection| {
                Box::pin(async move {
                    let lead = require_lead(connection, &key).await?;
                    let active =
                        store::find_override_status(connection, lead.id, "approved").await?;
                    let mut detail = summary(&lead, None, active.as_ref())?;
                    append_context(
                        connection,
                        &lead,
                        &mut detail,
                        &permissions,
                        Some(&principal),
                    )
                    .await?;
                    Ok((lead, detail))
                })
            })
            .await?;
        let sources = self.source_names().await?;
        detail["sourceName"] = sources
            .get(&lead.source_code)
            .map_or(Value::Null, |name| json!(name.to_utf8_lossy()));
        detail["sourceSummary"] = sources
            .get(&lead.source_code)
            .filter(|name| !name.is_empty())
            .map_or(Value::Null, |name| {
                json!(format!("来源：{}", name.to_utf8_lossy()))
            });
        Ok(Wire::value(detail))
    }

    pub async fn create(
        &self,
        input: Create,
        session: &ResolvedSession,
    ) -> Result<Wire, LeadsError> {
        let operator = self
            .require_user(&session.user.user_id.to_string(), session)
            .await?;
        let (owner_user_id, owner_org_id, owner_org_wire) = self
            .resolve_owner(
                &input.owner_user_id,
                &input.owner_org_id,
                &operator,
                session,
            )
            .await?;
        let customer = self
            .customers
            .require_active_customer(&input.customer_id)
            .await?;
        let source = self
            .dictionary
            .require_active_item("lead-source", &input.source_code)
            .await?;
        let numbers = BusinessNumberService::new(self.database.clone());
        // Independent reservation finishes and releases its pool connection
        // before the command acquires a business transaction connection.
        let lead_no = numbers
            .next(BusinessNumberScope::Lead, None)
            .await
            .map_err(|_| LeadsError::Internal)?;
        let pending = session.pending_flush.clone();
        self.transaction(move |connection| {
            Box::pin(async move {
                let now = clock_now();
                let mut raw_text = BTreeMap::from([
                    ("leadName".into(), input.lead_name.clone()),
                    (
                        "demandDescription".into(),
                        trim_js(input.demand_description.clone()),
                    ),
                ]);
                if let Some(org) = owner_org_wire {
                    raw_text.insert("ownerOrgId".into(), js(&org));
                }
                let mut lead = LeadRow {
                    id: random_uuid()?,
                    lead_no,
                    lead_name: input.lead_name.to_utf8_lossy(),
                    customer_id: customer.id,
                    customer_name: customer.display_name,
                    source_code: source.code,
                    demand_description: Some(trim_js(input.demand_description).to_utf8_lossy()),
                    budget_status: input.budget_status,
                    estimated_amount: field_option(input.estimated_amount),
                    urgency: input.urgency,
                    expected_decision_date: field_option(input.expected_decision_date),
                    score: 0,
                    rating: "D".into(),
                    score_reason: "暂无有效评分事实".into(),
                    score_updated_at: now,
                    status: "registered".into(),
                    owner_org_id,
                    owner_user_id,
                    qualification_summary: None,
                    qualified_at: None,
                    qualified_by: None,
                    closed_reason: None,
                    closed_at: None,
                    closed_by: None,
                    converted_project_id: None,
                    converted_at: None,
                    converted_by: None,
                    row_version: 1,
                    created_at: now,
                    created_by: Some(operator.id),
                    updated_at: now,
                    updated_by: Some(operator.id),
                    raw_text,
                };
                let system = refresh_score(connection, &mut lead).await?;
                let snapshot =
                    system_snapshot(connection, &lead, &system, "create-lead", operator.id, None)
                        .await?;
                lead.row_version = store::insert_lead(connection, &lead).await?;
                if let Some(snapshot) = snapshot {
                    store::insert_snapshot(connection, &snapshot).await?;
                }
                flush_session(connection, pending.as_ref()).await?;
                command_summary(connection, &lead).await
            })
        })
        .await
    }

    pub async fn update(
        &self,
        id: &str,
        input: Update,
        session: &ResolvedSession,
        request_id: Option<&str>,
    ) -> Result<Wire, LeadsError> {
        // Source preflights run before the Lead lookup and BEGIN.
        let customer = if let Some(id) = input.customer_id.as_ref() {
            Some(self.customers.require_active_customer(id).await?)
        } else {
            None
        };
        let source = if let Some(code) = input.source_code.as_ref() {
            Some(
                self.dictionary
                    .require_active_item("lead-source", code)
                    .await?,
            )
        } else {
            None
        };
        let key = id.to_owned();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        let request_id = request_id.map(str::to_owned);
        self.transaction(move |connection|Box::pin(async move {
            let before=require_lead(connection,&key).await?;assert_editable(&before,"edited")?;check_version(before.row_version,input.expected_version,"lead")?;
            let mut lead=before.clone();
            if let Some(value)=input.lead_name {lead.lead_name=value.to_utf8_lossy();lead.raw_text.insert("leadName".into(),value);}
            if let Some(customer)=customer {lead.customer_id=customer.id;lead.customer_name=customer.display_name;}
            if let Some(source)=source {lead.source_code=source.code;}
            if let Some(value)=input.demand_description {let value=trim_js(value);lead.demand_description=Some(value.to_utf8_lossy());lead.raw_text.insert("demandDescription".into(),value);}
            if let Some(value)=input.budget_status {lead.budget_status=value;}
            if !input.estimated_amount.is_missing() {lead.estimated_amount=field_option(input.estimated_amount);}
            if let Some(value)=input.urgency {lead.urgency=value;}
            if !input.expected_decision_date.is_missing() {lead.expected_decision_date=field_option(input.expected_decision_date);}
            let changed=changed_fields(&before,&lead);
            if changed.is_empty() {return command_summary(connection,&lead).await;}
            lead.updated_by=Some(operator);let system=refresh_score(connection,&mut lead).await?;
            let metadata=json!({"changedFields":changed,"sourceCommand":"update-lead","expectedVersion":input.expected_version,
                "redactedFields":changed.iter().filter(|field|**field=="demandDescription").collect::<Vec<_>>(),"businessContext":{"leadId":lead.id}}).to_string();
            let before_json=field_audit(&before,&changed);let after_json=field_audit(&lead,&changed);
            // Claim the expected version before dependent snapshot/audit writes.
            save_lead(connection,&before,&mut lead).await?;
            store::insert_raw_audit(connection,store::RawAudit {event_type:"lead.updated",target_type:"lead",target_id:&lead.id.to_string(),operator_id:operator,request_id:request_id.as_deref(),before:Some(&before_json),after:Some(&after_json),metadata:Some(&metadata)}).await?;
            persist_system_snapshot(connection,&lead,&system,"update-lead",operator,None).await?;
            flush_session(connection,pending.as_ref()).await?;
            command_summary(connection,&lead).await
        })).await
    }

    pub async fn claim(
        &self,
        id: &str,
        input: Claim,
        session: &ResolvedSession,
    ) -> Result<Wire, LeadsError> {
        let lead = self.find_lead(id).await?;
        check_version(lead.row_version, input.expected_version, "lead")?;
        assert_assignable(&lead)?;
        if let Some(owner) = lead.owner_user_id {
            return Err(LeadsError::Conflict(format!(
                "Lead {id} already has owner {owner}"
            )));
        }
        let operator = self
            .require_user(&session.user.user_id.to_string(), session)
            .await?;
        if !operator.is_active {
            return Err(LeadsError::BadRequest(format!(
                "Platform user {} is not active",
                session.user.user_id
            )));
        }
        let org = operator.primary_org_unit_id.map(|id| id.to_string());
        self.require_org(org.as_deref(), true).await?;
        self.assign_main(OwnerChange {
            lead,
            operator: operator.id,
            owner: operator.id,
            org_wire: org,
            kind: "claimed",
            reason: None,
            pending: session.pending_flush.clone(),
        })
        .await
    }

    pub async fn assign(
        &self,
        id: &str,
        input: Assign,
        session: &ResolvedSession,
    ) -> Result<Wire, LeadsError> {
        let lead = self.find_lead(id).await?;
        check_version(lead.row_version, input.expected_version, "lead")?;
        assert_assignable(&lead)?;
        let owner = self.require_user(&input.owner_user_id, session).await?;
        if !owner.is_active {
            return Err(LeadsError::BadRequest(format!(
                "Platform user {} is not active",
                input.owner_user_id
            )));
        }
        let org = match input.owner_org_id {
            Field::Missing => owner.primary_org_unit_id.map(|id| id.to_string()),
            Field::Null => None,
            Field::Value(value) => Some(value),
        };
        self.require_org(org.as_deref(), true).await?;
        if lead.owner_user_id == Some(owner.id) && lead.owner_org_id.map(|id| id.to_string()) == org
        {
            return Err(LeadsError::BadRequest(format!(
                "Lead {id} already has the requested owner"
            )));
        }
        let kind = if lead.owner_user_id.is_some() {
            "reassigned"
        } else {
            "assigned"
        };
        self.assign_main(OwnerChange {
            lead,
            operator: session.user.user_id,
            owner: owner.id,
            org_wire: org,
            kind,
            reason: Some(trim_js(input.reason)),
            pending: session.pending_flush.clone(),
        })
        .await
    }

    async fn assign_main(&self, change: OwnerChange) -> Result<Wire, LeadsError> {
        let OwnerChange {
            mut lead,
            operator,
            owner,
            org_wire,
            kind,
            reason,
            pending,
        } = change;
        let before = lead.clone();
        let now = clock_now();
        let org = org_wire.as_deref().map(parse_uuid).transpose()?;
        let record = store::Assignment {
            id: random_uuid()?,
            lead_id: lead.id,
            previous_owner_org_id: lead.owner_org_id,
            previous_owner_user_id: lead.owner_user_id,
            new_owner_org_id: org,
            new_owner_user_id: owner,
            assignment_type: kind.into(),
            reason: reason.as_ref().map(JsString::to_utf8_lossy),
            assigned_at: now,
            assigned_by: operator,
        };
        lead.owner_user_id = Some(owner);
        lead.owner_org_id = org;
        lead.updated_by = Some(operator);
        if let Some(org) = org_wire.as_ref() {
            lead.raw_text.insert("ownerOrgId".into(), js(org));
        }
        let record_id = record.id;
        let target_id = lead.id;
        let status = lead.status.clone();
        let previous_user = record.previous_owner_user_id;
        let previous_org = record.previous_owner_org_id;
        self
            .transaction(move |connection| {
                Box::pin(async move {
                    let system=refresh_score(connection,&mut lead).await?;
                    save_lead(connection, &before, &mut lead).await?;
                    store::insert_assignment(connection, &record).await?;
                    persist_system_snapshot(connection,&lead,&system,&format!("{kind}-lead-owner"),operator,Some(record_id)).await?;
                    flush_session(connection, pending.as_ref()).await?;
                    Ok(Wire::value(json!({"targetId":target_id,"leadOwnerAssignmentRecordId":record_id,"previousOwnerUserId":previous_user,"previousOwnerOrgId":previous_org,
                        "newOwnerUserId":owner,"newOwnerOrgId":org_wire,"assignmentType":kind,"businessStatusAfter":status})))
                })
            })
            .await
    }

    pub async fn qualify(
        &self,
        id: &str,
        input: Qualify,
        session: &ResolvedSession,
    ) -> Result<Wire, LeadsError> {
        let mut lead = self.find_lead(id).await?;
        if lead.status != "registered" {
            return Err(LeadsError::BadRequest(format!(
                "Lead {id} cannot be qualified in status {}",
                lead.status
            )));
        }
        ready(&lead, false)?;
        let before = lead.clone();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        lead.status = "qualified".into();
        lead.qualification_summary = Some(input.qualification_summary.to_utf8_lossy());
        lead.raw_text
            .insert("qualificationSummary".into(), input.qualification_summary);
        lead.qualified_at = Some(clock_now());
        lead.qualified_by = Some(operator);
        lead.updated_by = Some(operator);
        self.transaction(move |connection| {
            Box::pin(async move {
                let system = refresh_score(connection, &mut lead).await?;
                save_lead(connection, &before, &mut lead).await?;
                persist_system_snapshot(connection, &lead, &system, "qualify-lead", operator, None)
                    .await?;
                flush_session(connection, pending.as_ref()).await?;
                command_summary(connection, &lead).await
            })
        })
        .await
    }

    pub async fn close(
        &self,
        id: &str,
        input: Close,
        session: &ResolvedSession,
    ) -> Result<Wire, LeadsError> {
        let mut lead = self.find_lead(id).await?;
        if !mutable(&lead) {
            return Err(LeadsError::BadRequest(format!(
                "Lead {id} cannot be closed in status {}",
                lead.status
            )));
        }
        let before = lead.clone();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        lead.status = "closed".into();
        lead.closed_reason = Some(input.closed_reason.to_utf8_lossy());
        lead.raw_text
            .insert("closedReason".into(), input.closed_reason);
        lead.closed_at = Some(clock_now());
        lead.closed_by = Some(operator);
        lead.updated_by = Some(operator);
        self.transaction(move |connection| {
            Box::pin(async move {
                let system = refresh_score(connection, &mut lead).await?;
                save_lead(connection, &before, &mut lead).await?;
                persist_system_snapshot(connection, &lead, &system, "close-lead", operator, None)
                    .await?;
                flush_session(connection, pending.as_ref()).await?;
                command_summary(connection, &lead).await
            })
        })
        .await
    }

    async fn find_lead(&self, id: &str) -> Result<LeadRow, LeadsError> {
        let key = id.to_owned();
        self.read(move |connection| Box::pin(async move { require_lead(connection, &key).await }))
            .await
    }

    async fn require_user(
        &self,
        id: &str,
        session: &ResolvedSession,
    ) -> Result<UserReadSnapshot, LeadsError> {
        if id == session.user_snapshot.id.to_string() {
            return Ok(session.user_snapshot.clone());
        }
        let key = id.to_owned();
        let mut user = self
            .read(move |connection| {
                Box::pin(async move { Ok(crate::users::store::find(connection, &key).await?) })
            })
            .await?
            .ok_or_else(|| LeadsError::NotFound(format!("Platform user {id} not found")))?;
        if user.id == session.user_snapshot.id && user.primary_org_unit_id.is_none() {
            user.primary_org_unit_id = session.user_snapshot.primary_org_unit_id;
        }
        Ok(user)
    }

    async fn require_org(&self, id: Option<&str>, active: bool) -> Result<(), LeadsError> {
        let Some(id) = id else {
            return Ok(());
        };
        let key = id.to_owned();
        let org = self
            .read(move |connection| {
                Box::pin(async move { Ok(crate::org_units::store::find(connection, &key).await?) })
            })
            .await?
            .ok_or_else(|| LeadsError::NotFound(format!("Org unit {id} not found")))?;
        if active && !org.is_active {
            return Err(LeadsError::BadRequest(format!(
                "Org unit {id} is not active"
            )));
        }
        Ok(())
    }

    async fn resolve_owner(
        &self,
        user: &Field<String>,
        org: &Field<String>,
        operator: &UserReadSnapshot,
        session: &ResolvedSession,
    ) -> Result<(Option<Uuid>, Option<Uuid>, Option<String>), LeadsError> {
        if user.is_null() {
            return Ok((None, None, None));
        }
        let user = match user {
            Field::Missing => operator.clone(),
            Field::Value(id) => self.require_user(id, session).await?,
            Field::Null => return Ok((None, None, None)),
        };
        let org = match org {
            Field::Missing => user.primary_org_unit_id.map(|id| id.to_string()),
            Field::Null => None,
            Field::Value(id) => Some(id.clone()),
        };
        self.require_org(org.as_deref(), false).await?;
        Ok((
            Some(user.id),
            org.as_deref().map(parse_uuid).transpose()?,
            org,
        ))
    }
}

fn random_uuid() -> Result<Uuid, LeadsError> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| LeadsError::Internal)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}
fn parse_uuid(value: &str) -> Result<Uuid, LeadsError> {
    Uuid::parse_str(value).map_err(|_| LeadsError::Internal)
}
fn field_option<T>(value: Field<T>) -> Option<T> {
    match value {
        Field::Value(value) => Some(value),
        _ => None,
    }
}
fn iso(value: DateTime<Utc>) -> Result<String, LeadsError> {
    js_iso_string(value).map_err(|_| LeadsError::Internal)
}
fn optional_iso(value: Option<DateTime<Utc>>) -> Result<Option<String>, LeadsError> {
    value.map(iso).transpose()
}
fn mutable(lead: &LeadRow) -> bool {
    matches!(lead.status.as_str(), "registered" | "qualified")
}
fn assert_editable(lead: &LeadRow, verb: &str) -> Result<(), LeadsError> {
    if !mutable(lead) {
        return Err(LeadsError::BadRequest(format!(
            "Lead {} cannot be {verb} in status {}",
            lead.id, lead.status
        )));
    }
    Ok(())
}
fn assert_assignable(lead: &LeadRow) -> Result<(), LeadsError> {
    if !mutable(lead) {
        return Err(LeadsError::BadRequest(format!(
            "Lead {} cannot assign owner in status {}",
            lead.id, lead.status
        )));
    }
    Ok(())
}
fn check_version(actual: i32, expected: Option<i64>, target: &str) -> Result<(), LeadsError> {
    if let Some(expected) = expected
        && expected != i64::from(actual)
    {
        return Err(LeadsError::Conflict(format!(
            "{target} version {expected} does not match current version {actual}"
        )));
    }
    Ok(())
}
fn ready(lead: &LeadRow, conversion: bool) -> Result<(), LeadsError> {
    let missing = scoring::missing(&lead.gate_input(), conversion);
    if !missing.is_empty() {
        return Err(LeadsError::BadRequest(format!(
            "Lead {} is missing required {} facts: {}",
            lead.id,
            if conversion {
                "conversion"
            } else {
                "qualification"
            },
            missing.join(", ")
        )));
    }
    Ok(())
}

fn assert_convertible(lead: &LeadRow, id: &str) -> Result<(), LeadsError> {
    if lead.status == "converted" || lead.converted_project_id.is_some() {
        return Err(LeadsError::Conflict(format!(
            "Lead {id} has already been converted to project {}",
            lead.converted_project_id
                .map_or("null".into(), |id| id.to_string())
        )));
    }
    if lead.status != "qualified" {
        return Err(LeadsError::BadRequest(format!(
            "Lead {id} cannot be converted in status {}",
            lead.status
        )));
    }
    ready(lead, true)
}

async fn require_lead(connection: &mut PgConnection, id: &str) -> Result<LeadRow, LeadsError> {
    store::find(connection, id)
        .await?
        .ok_or_else(|| LeadsError::NotFound(format!("Lead {id} not found")))
}
async fn flush_session(
    connection: &mut PgConnection,
    pending: Option<&SessionFlush>,
) -> Result<(), LeadsError> {
    if let Some(pending) = pending {
        flush_managed_session(connection, pending).await?;
    }
    Ok(())
}
async fn refresh_score(
    connection: &mut PgConnection,
    lead: &mut LeadRow,
) -> Result<SystemScoreTuple, LeadsError> {
    let facts = store::collect_facts(connection, lead.id).await?;
    let system = SystemScoreTuple::calculate(lead, &facts)?;
    system.apply(lead);
    Ok(system)
}

fn effective(lead: &LeadRow, active: Option<&OverrideRow>) -> Value {
    if let Some(active) = active {
        json!({"effectiveScore":active.requested_score,"effectiveRating":active.requested_rating,"effectiveScoreReason":format!("人工覆盖评分：{}",active.reason),"effectiveScoreSource":"manual-override","activeScoreOverrideId":active.id})
    } else {
        json!({"effectiveScore":lead.score,"effectiveRating":lead.rating,"effectiveScoreReason":lead.score_reason,"effectiveScoreSource":"system","activeScoreOverrideId":null})
    }
}

fn summary(
    lead: &LeadRow,
    source: Option<&JsString>,
    active: Option<&OverrideRow>,
) -> Result<Value, LeadsError> {
    let mut result = json!({"id":lead.id,"leadNo":lead.lead_no,"leadName":lead.lead_name,"customerId":lead.customer_id,"customerName":lead.customer_name,
        "sourceCode":lead.source_code,"sourceName":source.map(JsString::to_utf8_lossy),"demandDescription":lead.demand_description,"budgetStatus":lead.budget_status,
        "estimatedAmount":lead.estimated_amount,"urgency":lead.urgency,"expectedDecisionDate":lead.expected_decision_date,"score":lead.score,"rating":lead.rating,
        "scoreReason":lead.score_reason,"scoreUpdatedAt":iso(lead.score_updated_at)?,"gateSummary":scoring::gate_summary(&lead.gate_input()),"status":lead.status,
        "ownerOrgId":lead.owner_org_id,"ownerUserId":lead.owner_user_id,"qualificationSummary":lead.qualification_summary,"qualifiedAt":optional_iso(lead.qualified_at)?,"qualifiedBy":lead.qualified_by,
        "closedReason":lead.closed_reason,"closedAt":optional_iso(lead.closed_at)?,"closedBy":lead.closed_by,"convertedProjectId":lead.converted_project_id,
        "convertedAt":optional_iso(lead.converted_at)?,"convertedBy":lead.converted_by,"rowVersion":lead.row_version,"createdAt":iso(lead.created_at)?,"createdBy":lead.created_by,"updatedAt":iso(lead.updated_at)?,"updatedBy":lead.updated_by});
    if let Some(object) = result.as_object_mut()
        && let Some(fields) = effective(lead, active).as_object()
    {
        object.extend(fields.clone());
    }
    Ok(result)
}

async fn append_context(
    connection: &mut PgConnection,
    lead: &LeadRow,
    value: &mut Value,
    permissions: &[crate::compat::permissions::RawPermission],
    principal: Option<&UserReadSnapshot>,
) -> Result<(), LeadsError> {
    value["ownerName"] = if let Some(id) = lead.owner_user_id {
        if let Some(principal) = principal.filter(|principal| principal.id == id) {
            json!(principal.display_name)
        } else {
            crate::users::store::find(connection, &id.to_string())
                .await?
                .map_or(Value::Null, |user| json!(user.display_name))
        }
    } else {
        Value::Null
    };
    value["ownerOrgName"] = if let Some(id) = lead.owner_org_id {
        crate::org_units::store::find(connection, &id.to_string())
            .await?
            .map_or(Value::Null, |org| json!(org.name))
    } else {
        Value::Null
    };
    value["convertedProjectSummary"] = if let Some(id) = lead.converted_project_id {
        crate::projects::store::find(connection,&id.to_string()).await?.map_or(Value::Null,|project|json!({"id":project.id,"projectNo":project.project_no,"projectName":project.project_name,"customerId":project.customer_id,"status":project.status,"currentStage":project.current_stage}))
    } else {
        Value::Null
    };
    let has = |key: &str| {
        permissions
            .iter()
            .any(|permission| permission.as_str() == key)
    };
    let mut actions = Vec::new();
    if mutable(lead) && lead.owner_user_id.is_none() && has("lead:write") {
        actions.push("claim-lead-owner");
    }
    if mutable(lead) && has("lead:assign") {
        actions.push("assign-lead-owner");
    }
    value["allowedActions"] = json!(actions);
    Ok(())
}

async fn list_view(
    connection: &mut PgConnection,
    lead: &LeadRow,
    source: Option<&JsString>,
    active: Option<&OverrideRow>,
    permissions: &[crate::compat::permissions::RawPermission],
) -> Result<Value, LeadsError> {
    let mut value = summary(lead, source, active)?;
    if let Some(object) = value.as_object_mut() {
        for key in [
            "qualificationSummary",
            "qualifiedBy",
            "closedReason",
            "closedAt",
            "closedBy",
            "convertedBy",
            "createdBy",
            "updatedBy",
        ] {
            object.remove(key);
        }
    }
    append_context(connection, lead, &mut value, permissions, None).await?;
    Ok(value)
}

fn facets(counts: &BTreeMap<&str, usize>) -> Value {
    let rows = [
        ("active", "处理中", "待确认与已有效线索", "info", 10),
        (
            "registered",
            "待确认",
            "尚未确认有效的线索",
            "secondary",
            20,
        ),
        (
            "qualified",
            "已有效",
            "已确认有效且仍在推进的线索",
            "success",
            30,
        ),
        (
            "ready-to-convert",
            "可转项目",
            "已满足转项目硬闸口的线索",
            "success",
            40,
        ),
        (
            "blocked-conversion",
            "转化受阻",
            "已有效但缺少转项目必填条件的线索",
            "warn",
            50,
        ),
        (
            "converted",
            "已转项目",
            "已完成项目转化的历史线索",
            "info",
            60,
        ),
        ("closed", "已关闭", "已关闭且不再推进的线索", "contrast", 70),
        (
            "all",
            "全部线索",
            "包含处理中、已转项目和已关闭线索",
            "secondary",
            80,
        ),
    ];
    json!(rows.into_iter().map(|(scope,label,hint,severity,order)|json!({"scope":scope,"label":label,"hint":hint,"severity":severity,"count":counts.get(scope).copied().unwrap_or(0),"order":order})).collect::<Vec<_>>())
}

const AUDIT_FIELDS: [&str; 9] = [
    "leadName",
    "customerId",
    "customerName",
    "sourceCode",
    "demandDescription",
    "budgetStatus",
    "estimatedAmount",
    "urgency",
    "expectedDecisionDate",
];
fn changed_fields(before: &LeadRow, next: &LeadRow) -> Vec<&'static str> {
    AUDIT_FIELDS
        .into_iter()
        .filter(|key| {
            if *key == "customerId" {
                before.customer_id != next.customer_id
            } else {
                before.text(key) != next.text(key)
            }
        })
        .collect()
}
fn field_audit(lead: &LeadRow, fields: &[&str]) -> String {
    raw_object(fields.iter().map(|key|{
        let value=if *key=="demandDescription" {json!({"changed":true,"length":lead.text(key).map_or(0,|text|text.as_code_units().len())}).to_string()}
        else if *key=="customerId" {json!(lead.customer_id).to_string()}
        else {lead.text(key).map_or("null".into(),|text|text.json())};
        ((*key).to_owned(),value)
    }))
}
fn raw_object(fields: impl IntoIterator<Item = (String, String)>) -> String {
    format!(
        "{{{}}}",
        fields
            .into_iter()
            .map(|(key, value)| format!("{}:{value}", js(&key).json()))
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn build_snapshot(
    system: &SystemScoreTuple,
    lead: &LeadRow,
    active: Option<&OverrideRow>,
    kind: &str,
    command: &str,
    operator: Uuid,
    record: Option<Uuid>,
) -> Result<SnapshotRow, LeadsError> {
    Ok(SnapshotRow {
        id: random_uuid()?,
        lead_id: lead.id,
        snapshot_kind: kind.into(),
        override_id: active.map(|row| row.id),
        formula_version: system.formula_version.clone(),
        system_score: system.score,
        system_rating: system.rating.clone(),
        effective_score: active.map_or(system.score, |row| row.requested_score),
        effective_rating: active
            .map_or_else(|| system.rating.clone(), |row| row.requested_rating.clone()),
        effective_score_source: if active.is_some() {
            "manual-override"
        } else {
            "system"
        }
        .into(),
        score_reason: active.map_or_else(
            || system.reason.clone(),
            |row| format!("人工覆盖评分：{}", row.reason),
        ),
        component_breakdown: system.component_breakdown.clone(),
        gate_summary_snapshot: system.gate_summary.clone(),
        source_command: command.into(),
        source_record_id: record,
        created_at: clock_now(),
        created_by: Some(operator),
    })
}
async fn system_snapshot(
    connection: &mut PgConnection,
    lead: &LeadRow,
    system: &SystemScoreTuple,
    command: &str,
    operator: Uuid,
    record: Option<Uuid>,
) -> Result<Option<SnapshotRow>, LeadsError> {
    let active = store::find_override_status(connection, lead.id, "approved").await?;
    let next = build_snapshot(
        system,
        lead,
        active.as_ref(),
        "system",
        command,
        operator,
        record,
    )?;
    if let Some(old) = store::latest_system_snapshot(connection, lead.id).await?
        && store::duplicate_snapshot(&old, &next)?
    {
        return Ok(None);
    }
    Ok(Some(next))
}

async fn persist_system_snapshot(
    connection: &mut PgConnection,
    lead: &LeadRow,
    system: &SystemScoreTuple,
    command: &str,
    operator: Uuid,
    record: Option<Uuid>,
) -> Result<(), LeadsError> {
    if let Some(snapshot) =
        system_snapshot(connection, lead, system, command, operator, record).await?
    {
        store::insert_snapshot(connection, &snapshot).await?;
    }
    Ok(())
}

async fn command_summary(
    connection: &mut PgConnection,
    lead: &LeadRow,
) -> Result<Wire, LeadsError> {
    let source = store::source_name(connection, &lead.source_code)
        .await?
        .as_deref()
        .map(js);
    let mut raw = lead.raw_text.clone();
    if let Some(source) = source.as_ref() {
        raw.insert("sourceName".into(), source.clone());
    }
    let active = store::find_override_status(connection, lead.id, "approved").await?;
    Ok(Wire::object(
        summary(lead, source.as_ref(), active.as_ref())?,
        &raw,
    ))
}

async fn save_lead(
    connection: &mut PgConnection,
    before: &LeadRow,
    row: &mut LeadRow,
) -> Result<(), LeadsError> {
    if !store::update_lead(connection, before, row).await? {
        return Err(LeadsError::Conflict(format!(
            "Lead {} changed concurrently; reload and retry",
            row.id
        )));
    }
    Ok(())
}

async fn save_override(
    connection: &mut PgConnection,
    before: &OverrideRow,
    row: &mut OverrideRow,
) -> Result<(), LeadsError> {
    if !store::update_override(connection, before, row).await? {
        return Err(LeadsError::Conflict(format!(
            "Lead score override {} changed concurrently; reload and retry",
            row.id
        )));
    }
    Ok(())
}

async fn lock_override_lead(
    connection: &mut PgConnection,
    id: &str,
) -> Result<(LeadRow, OverrideRow), LeadsError> {
    // This first read is not a row lock. Every decision takes the Lead lock
    // first, then rereads/CASes overrides, including a possible old approved row.
    let observed = require_override(connection, id).await?;
    let lead_id = observed.lead_id.to_string();
    let lead = store::find_for_score_decision(connection, &lead_id)
        .await?
        .ok_or_else(|| LeadsError::NotFound(format!("Lead {lead_id} not found")))?;
    let current = require_override(connection, id).await?;
    if current.lead_id != lead.id {
        return Err(LeadsError::Conflict(
            "Lead score override target changed concurrently; reload and retry".into(),
        ));
    }
    Ok((lead, current))
}

async fn system_tuple_for_decision(
    connection: &mut PgConnection,
    lead: &mut LeadRow,
    active: Option<&OverrideRow>,
    command: &str,
    operator: Uuid,
    record: Uuid,
) -> Result<SystemScoreTuple, LeadsError> {
    for snapshot in store::system_snapshots_for_score(connection, lead).await? {
        if let Some(system) = SystemScoreTuple::from_stored(lead, &snapshot)? {
            return Ok(system);
        }
    }

    // User-authorized legacy fallback only: score, its system explanation and
    // the later manual decision all belong to the caller's one transaction.
    let before = lead.clone();
    let system = refresh_score(connection, lead).await?;
    lead.updated_by = Some(operator);
    if !store::update_recalculated_score(connection, &before, lead).await? {
        return Err(LeadsError::Conflict(format!(
            "Lead {} changed concurrently; reload and retry",
            lead.id
        )));
    }
    // A repair must record its system evidence even if an older unrelated
    // snapshot happens to have the newly calculated score. Normal triggers
    // still use semantic dedup; a matching tuple never enters this branch.
    let snapshot = build_snapshot(
        &system,
        lead,
        active,
        "system",
        command,
        operator,
        Some(record),
    )?;
    store::insert_snapshot(connection, &snapshot).await?;
    Ok(system)
}

impl LeadsService {
    pub async fn convert(
        &self,
        id: &str,
        input: Convert,
        session: &ResolvedSession,
    ) -> Result<Wire, LeadsError> {
        let operator = self
            .require_user(&session.user.user_id.to_string(), session)
            .await?;
        let key = id.to_owned();
        // This short read returns an owned row and releases its connection.
        // The same eligibility check runs again inside the business TX.
        let preflight = self.find_lead(id).await?;
        assert_convertible(&preflight, id)?;
        let numbers = BusinessNumberService::new(self.database.clone());
        let project_no = numbers
            .next(BusinessNumberScope::Project, None)
            .await
            .map_err(|_| LeadsError::Internal)?;
        let pending = session.pending_flush.clone();
        self.transaction(move |connection|Box::pin(async move {
            let before=require_lead(connection,&key).await?;
            assert_convertible(&before,&key)?;
            let project_name=input.project_name.map(trim_js).filter(|value|!value.is_empty()).unwrap_or_else(||before.text("leadName").unwrap_or_else(||js(&before.lead_name)));
            let customer_project_no=field_option(input.customer_project_no).map(trim_js).filter(|value|!value.is_empty());
            let mut original_text=BTreeMap::from([("projectName".into(),project_name.clone())]);
            if let Some(value)=customer_project_no.as_ref() {original_text.insert("customerProjectNo".into(),value.clone());}
            let now=clock_now();
            let mut project=ProjectRow {id:random_uuid()?,project_no,project_name:project_name.to_utf8_lossy(),source_lead_id:Some(before.id),customer_id:Some(before.customer_id),
                customer_name:Some(before.customer_name.clone()),customer_project_no:customer_project_no.as_ref().map(JsString::to_utf8_lossy),status:"active".into(),current_stage:"assessment".into(),
                owner_org_id:before.owner_org_id,owner_user_id:before.owner_user_id,planned_sign_at:field_option(input.planned_sign_at),closed_at:None,closed_reason:None,
                row_version:1,created_at:now,created_by:Some(operator.id),updated_at:now,updated_by:Some(operator.id)};
            let mut lead=before.clone();lead.status="converted".into();lead.converted_project_id=Some(project.id);lead.converted_at=Some(clock_now());lead.converted_by=Some(operator.id);lead.updated_by=Some(operator.id);
            let system=refresh_score(connection,&mut lead).await?;
            let candidates=store::conversion_attachments(connection,lead.id).await?;
            project.row_version=store::insert_conversion_project(connection,&project).await?;
            save_lead(connection,&before,&mut lead).await?;
            crate::project_action_authorization::ownership::record_new_origin_with_connection(
                connection,project.id,operator.id,"lead-conversion",before.id,None).await.map_err(LeadsError::Business)?;
            let mut copied=0;
            for attachment_id in candidates {
                if store::existing_project_link(connection,attachment_id,project.id).await? {continue;}
                let link=store::CopyLink {id:random_uuid()?,attachment_id,project_id:project.id,operator_id:operator.id,linked_at:clock_now()};
                store::insert_copy_link(connection,&link).await?;copied+=1;
            }
            if copied>0 {
                let metadata=json!({"from":{"targetType":"lead","targetId":lead.id},"to":{"targetType":"project","targetId":project.id},"relationType":"source","copiedCount":copied}).to_string();
                store::insert_raw_audit(connection,store::RawAudit {event_type:"attachment.link_copied_to_project",target_type:"attachment",target_id:&project.id.to_string(),operator_id:operator.id,request_id:None,before:None,after:None,metadata:Some(&metadata)}).await?;
            }
            persist_system_snapshot(connection,&lead,&system,"convert-to-project",operator.id,Some(project.id)).await?;
            flush_session(connection,pending.as_ref()).await?;
            Ok(Wire::object(project_summary(&project)?,&original_text))
        })).await
    }

    pub async fn score_history(&self, id: &str) -> Result<Wire, LeadsError> {
        let key = id.to_owned();
        self.read(move |connection|Box::pin(async move {
            let lead=require_lead(connection,&key).await?;
            let snapshots=store::snapshots(connection,lead.id).await?;
            let overrides=store::overrides(connection,lead.id).await?;
            let active=overrides.iter().find(|row|row.status=="approved");let pending=overrides.iter().find(|row|row.status=="pending");
            let mut value=json!({"leadId":lead.id,"systemScore":lead.score,"systemRating":lead.rating,"scoreReason":lead.score_reason,"scoreUpdatedAt":iso(lead.score_updated_at)?,
                "activeOverride":active.map(override_summary).transpose()?,"pendingOverride":pending.map(override_summary).transpose()?,
                "snapshots":snapshots.iter().map(snapshot_summary).collect::<Result<Vec<_>,_>>()?,"overrides":overrides.iter().map(override_summary).collect::<Result<Vec<_>,_>>()?});
            if let Some(object)=value.as_object_mut() && let Some(fields)=effective(&lead,active).as_object() {object.extend(fields.clone());}
            Ok(Wire::value(value))
        })).await
    }

    pub async fn submit_override(
        &self,
        id: &str,
        input: SubmitOverride,
        session: &ResolvedSession,
        request_id: Option<&str>,
    ) -> Result<Wire, LeadsError> {
        let key = id.to_owned();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        let row = self
            .override_transaction(
                "lead-score-override.submitted",
                request_id.map(str::to_owned),
                move |connection| {
                    Box::pin(async move {
                        let lead = store::find_for_override_submission(connection, &key)
                            .await?
                            .ok_or_else(|| LeadsError::NotFound(format!("Lead {key} not found")))?;
                        check_version(
                            lead.row_version,
                            Some(input.expected_lead_row_version),
                            "lead",
                        )?;
                        if let Some(existing) =
                            store::find_override_status(connection, lead.id, "pending").await?
                        {
                            return Err(LeadsError::Conflict(format!(
                                "Lead {key} already has pending score override {}",
                                existing.id
                            )));
                        }
                        let now = clock_now();
                        let reason = trim_js(input.reason);
                        let mut row = OverrideRow {
                            id: random_uuid()?,
                            lead_id: lead.id,
                            requested_score: input.score,
                            requested_rating: scoring::rating(input.score).into(),
                            reason: reason.to_utf8_lossy(),
                            status: "pending".into(),
                            system_score_at_request: lead.score,
                            system_rating_at_request: lead.rating,
                            requested_by: Some(operator),
                            requested_at: now,
                            approved_by: None,
                            approved_at: None,
                            approval_note: None,
                            rejected_by: None,
                            rejected_at: None,
                            reject_reason: None,
                            revoked_by: None,
                            revoked_at: None,
                            revoke_reason: None,
                            superseded_by_id: None,
                            created_at: clock_now(),
                            updated_at: now,
                            updated_by: Some(operator),
                            row_version: 1,
                            raw_text: BTreeMap::from([
                                ("reason".into(), reason),
                                ("leadId".into(), js(&key)),
                            ]),
                        };
                        row.row_version = store::insert_override(connection, &row).await?;
                        flush_session(connection, pending.as_ref()).await?;
                        Ok(row)
                    })
                },
            )
            .await?;
        Ok(Wire::object(override_summary(&row)?, &row.raw_text))
    }

    pub async fn approve_override(
        &self,
        id: &str,
        input: ApproveOverride,
        session: &ResolvedSession,
        request_id: Option<&str>,
    ) -> Result<Wire, LeadsError> {
        let key = id.to_owned();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        let row = self
            .override_transaction(
                "lead-score-override.approved",
                request_id.map(str::to_owned),
                move |connection| {
                    Box::pin(async move {
                        let (mut lead, before) = lock_override_lead(connection, &key).await?;
                        check_version(
                            before.row_version,
                            Some(input.expected_override_row_version),
                            "lead score override",
                        )?;
                        override_status(&before, "pending", "approve")?;
                        let mut active =
                            store::find_override_status(connection, before.lead_id, "approved")
                                .await?;
                        let system = system_tuple_for_decision(
                            connection,
                            &mut lead,
                            active.as_ref(),
                            "approve-score-override",
                            operator,
                            before.id,
                        )
                        .await?;
                        let mut row = before.clone();
                        row.status = "approved".into();
                        row.approved_at = Some(clock_now());
                        row.approved_by = Some(operator);
                        row.updated_by = Some(operator);
                        let note = field_option(input.note)
                            .map(trim_js)
                            .filter(|text| !text.is_empty());
                        row.approval_note = note.as_ref().map(JsString::to_utf8_lossy);
                        if let Some(note) = note {
                            row.raw_text.insert("approvalNote".into(), note);
                        } else {
                            row.raw_text.remove("approvalNote");
                        }
                        if let Some(active) = active.as_mut() {
                            let previous = active.clone();
                            active.status = "superseded".into();
                            active.superseded_by_id = Some(row.id);
                            active.updated_by = Some(operator);
                            save_override(connection, &previous, active).await?;
                        }
                        save_override(connection, &before, &mut row).await?;
                        let snapshot = build_snapshot(
                            &system,
                            &lead,
                            Some(&row),
                            "manual-override",
                            "approve-score-override",
                            operator,
                            Some(row.id),
                        )?;
                        store::insert_snapshot(connection, &snapshot).await?;
                        flush_session(connection, pending.as_ref()).await?;
                        Ok(row)
                    })
                },
            )
            .await?;
        Ok(Wire::object(override_summary(&row)?, &row.raw_text))
    }

    pub async fn reject_override(
        &self,
        id: &str,
        input: RejectOverride,
        session: &ResolvedSession,
        request_id: Option<&str>,
    ) -> Result<Wire, LeadsError> {
        let key = id.to_owned();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        let row = self
            .override_transaction(
                "lead-score-override.rejected",
                request_id.map(str::to_owned),
                move |connection| {
                    Box::pin(async move {
                        let before = require_override(connection, &key).await?;
                        check_version(
                            before.row_version,
                            Some(input.expected_override_row_version),
                            "lead score override",
                        )?;
                        override_status(&before, "pending", "reject")?;
                        let mut row = before.clone();
                        let reason = trim_js(input.reason);
                        row.status = "rejected".into();
                        row.rejected_at = Some(clock_now());
                        row.rejected_by = Some(operator);
                        row.reject_reason = Some(reason.to_utf8_lossy());
                        row.raw_text.insert("rejectReason".into(), reason);
                        row.updated_by = Some(operator);
                        save_override(connection, &before, &mut row).await?;
                        flush_session(connection, pending.as_ref()).await?;
                        Ok(row)
                    })
                },
            )
            .await?;
        Ok(Wire::object(override_summary(&row)?, &row.raw_text))
    }

    pub async fn revoke_override(
        &self,
        id: &str,
        input: RevokeOverride,
        session: &ResolvedSession,
        request_id: Option<&str>,
    ) -> Result<Wire, LeadsError> {
        let key = id.to_owned();
        let operator = session.user.user_id;
        let pending = session.pending_flush.clone();
        let row = self
            .override_transaction(
                "lead-score-override.revoked",
                request_id.map(str::to_owned),
                move |connection| {
                    Box::pin(async move {
                        let (mut lead, before) = lock_override_lead(connection, &key).await?;
                        check_version(
                            before.row_version,
                            Some(input.expected_override_row_version),
                            "lead score override",
                        )?;
                        override_status(&before, "approved", "revoke")?;
                        let system = system_tuple_for_decision(
                            connection,
                            &mut lead,
                            Some(&before),
                            "revoke-score-override",
                            operator,
                            before.id,
                        )
                        .await?;
                        let mut row = before.clone();
                        let reason = trim_js(input.reason);
                        row.status = "revoked".into();
                        row.revoked_at = Some(clock_now());
                        row.revoked_by = Some(operator);
                        row.revoke_reason = Some(reason.to_utf8_lossy());
                        row.raw_text.insert("revokeReason".into(), reason);
                        row.updated_by = Some(operator);
                        save_override(connection, &before, &mut row).await?;
                        let snapshot = build_snapshot(
                            &system,
                            &lead,
                            None,
                            "override-revoked",
                            "revoke-score-override",
                            operator,
                            Some(row.id),
                        )?;
                        store::insert_snapshot(connection, &snapshot).await?;
                        flush_session(connection, pending.as_ref()).await?;
                        Ok(row)
                    })
                },
            )
            .await?;
        Ok(Wire::object(override_summary(&row)?, &row.raw_text))
    }
}

fn project_summary(project: &ProjectRow) -> Result<Value, LeadsError> {
    Ok(
        json!({"id":project.id,"projectNo":project.project_no,"projectName":project.project_name,"sourceLeadId":project.source_lead_id,
        "customerId":project.customer_id,"customerName":project.customer_name,"customerProjectNo":project.customer_project_no,"status":project.status,"currentStage":project.current_stage,
        "ownerOrgId":project.owner_org_id,"ownerUserId":project.owner_user_id,"plannedSignAt":optional_iso(project.planned_sign_at)?,"closedAt":optional_iso(project.closed_at)?,
        "closedReason":project.closed_reason,"rowVersion":project.row_version,"createdAt":iso(project.created_at)?,"createdBy":project.created_by,"updatedAt":iso(project.updated_at)?,"updatedBy":project.updated_by}),
    )
}

async fn require_override(
    connection: &mut PgConnection,
    id: &str,
) -> Result<OverrideRow, LeadsError> {
    store::find_override(connection, id)
        .await?
        .ok_or_else(|| LeadsError::NotFound(format!("Lead score override {id} not found")))
}
fn override_status(row: &OverrideRow, expected: &str, action: &str) -> Result<(), LeadsError> {
    if row.status != expected {
        return Err(LeadsError::BadRequest(format!(
            "Cannot {action} lead score override {} in status {}",
            row.id, row.status
        )));
    }
    Ok(())
}
fn override_lead_id(row: &OverrideRow) -> String {
    row.raw_text
        .get("leadId")
        .map_or_else(|| json!(row.lead_id).to_string(), JsString::json)
}

fn override_metadata(event: &str, row: &OverrideRow) -> String {
    let mut fields = vec![("leadId".into(), override_lead_id(row))];
    match event {
        "lead-score-override.submitted" => fields.extend([
            (
                "requestedScore".into(),
                json!(row.requested_score).to_string(),
            ),
            (
                "requestedRating".into(),
                json!(row.requested_rating).to_string(),
            ),
            (
                "systemScoreAtRequest".into(),
                json!(row.system_score_at_request).to_string(),
            ),
            (
                "systemRatingAtRequest".into(),
                json!(row.system_rating_at_request).to_string(),
            ),
        ]),
        "lead-score-override.approved" => fields.extend([
            (
                "requestedScore".into(),
                json!(row.requested_score).to_string(),
            ),
            (
                "requestedRating".into(),
                json!(row.requested_rating).to_string(),
            ),
            (
                "approvalNote".into(),
                row.text("approvalNote")
                    .map_or("null".into(), |text| text.json()),
            ),
        ]),
        "lead-score-override.rejected" => fields.push((
            "rejectReason".into(),
            row.text("rejectReason")
                .map_or("null".into(), |text| text.json()),
        )),
        "lead-score-override.revoked" => fields.push((
            "revokeReason".into(),
            row.text("revokeReason")
                .map_or("null".into(), |text| text.json()),
        )),
        _ => {}
    }
    raw_object(fields)
}

fn override_summary(row: &OverrideRow) -> Result<Value, LeadsError> {
    Ok(
        json!({"id":row.id,"leadId":row.lead_id,"requestedScore":row.requested_score,"requestedRating":row.requested_rating,"reason":row.reason,"status":row.status,
        "systemScoreAtRequest":row.system_score_at_request,"systemRatingAtRequest":row.system_rating_at_request,"requestedBy":row.requested_by,"requestedAt":iso(row.requested_at)?,
        "approvedBy":row.approved_by,"approvedAt":optional_iso(row.approved_at)?,"approvalNote":row.approval_note,"rejectedBy":row.rejected_by,"rejectedAt":optional_iso(row.rejected_at)?,
        "rejectReason":row.reject_reason,"revokedBy":row.revoked_by,"revokedAt":optional_iso(row.revoked_at)?,"revokeReason":row.revoke_reason,"supersededById":row.superseded_by_id,"rowVersion":row.row_version}),
    )
}

fn snapshot_summary(row: &SnapshotRow) -> Result<Value, LeadsError> {
    let component: Value =
        serde_json::from_str(&row.component_breakdown).map_err(|_| LeadsError::Internal)?;
    let gate: Value =
        serde_json::from_str(&row.gate_summary_snapshot).map_err(|_| LeadsError::Internal)?;
    Ok(
        json!({"id":row.id,"leadId":row.lead_id,"snapshotKind":row.snapshot_kind,"overrideId":row.override_id,"formulaVersion":row.formula_version,
        "systemScore":row.system_score,"systemRating":row.system_rating,"effectiveScore":row.effective_score,"effectiveRating":row.effective_rating,"effectiveScoreSource":row.effective_score_source,
        "scoreReason":row.score_reason,"componentBreakdown":component,"gateSummarySnapshot":gate,"sourceCommand":row.source_command,"sourceRecordId":row.source_record_id,"createdAt":iso(row.created_at)?,"createdBy":row.created_by}),
    )
}

#[cfg(test)]
mod score_tuple_tests {
    use super::*;

    fn lead() -> LeadRow {
        let epoch = DateTime::from_timestamp_millis(0).unwrap_or_else(|| panic!("epoch"));
        LeadRow {
            id: Uuid::from_u128(1),
            lead_no: "LD-test".into(),
            lead_name: "既有线索".into(),
            customer_id: Uuid::from_u128(2),
            customer_name: "真实客户".into(),
            source_code: "customer-visit".into(),
            demand_description: Some(
                "已核对设备建设需求、项目范围、预算来源以及下一步沟通安排。".into(),
            ),
            budget_status: "rough-budget".into(),
            estimated_amount: Some("1200000.00".into()),
            urgency: "normal".into(),
            expected_decision_date: Some("2026-11-20".into()),
            score: 0,
            rating: "D".into(),
            score_reason: "暂无有效评分事实".into(),
            score_updated_at: epoch,
            status: "registered".into(),
            owner_org_id: Some(Uuid::from_u128(3)),
            owner_user_id: Some(Uuid::from_u128(4)),
            qualification_summary: None,
            qualified_at: None,
            qualified_by: None,
            closed_reason: None,
            closed_at: None,
            closed_by: None,
            converted_project_id: None,
            converted_at: None,
            converted_by: None,
            row_version: 1,
            created_at: epoch,
            created_by: Some(Uuid::from_u128(4)),
            updated_at: epoch,
            updated_by: Some(Uuid::from_u128(4)),
            raw_text: BTreeMap::new(),
        }
    }

    fn system_snapshot(
        lead: &LeadRow,
        system: &SystemScoreTuple,
    ) -> Result<SnapshotRow, LeadsError> {
        build_snapshot(
            system,
            lead,
            None,
            "system",
            "create-lead",
            Uuid::from_u128(4),
            None,
        )
    }

    fn active_override(lead: &LeadRow) -> OverrideRow {
        let now = lead.updated_at;
        OverrideRow {
            id: Uuid::from_u128(5),
            lead_id: lead.id,
            requested_score: 91,
            requested_rating: "A".into(),
            reason: "已核对特殊业务事实".into(),
            status: "approved".into(),
            system_score_at_request: lead.score,
            system_rating_at_request: lead.rating.clone(),
            requested_by: lead.updated_by,
            requested_at: now,
            approved_by: lead.updated_by,
            approved_at: Some(now),
            approval_note: None,
            rejected_by: None,
            rejected_at: None,
            reject_reason: None,
            revoked_by: None,
            revoked_at: None,
            revoke_reason: None,
            superseded_by_id: None,
            created_at: now,
            updated_at: now,
            updated_by: lead.updated_by,
            row_version: 2,
            raw_text: BTreeMap::new(),
        }
    }

    fn breakdown(snapshot: &SnapshotRow) -> Result<Value, LeadsError> {
        serde_json::from_str(&snapshot.component_breakdown).map_err(|_| LeadsError::Internal)
    }

    #[test]
    fn one_materialized_result_supplies_lead_and_system_explanation() -> Result<(), LeadsError> {
        let mut lead = lead();
        let facts = scoring::Facts {
            sales_intelligence: scoring::IntelligenceFacts {
                decision_maker_known: true,
                budget_source_known: true,
                ..Default::default()
            },
            ..Default::default()
        };
        let system = SystemScoreTuple::calculate(&lead, &facts)?;
        system.apply(&mut lead);
        let snapshot = system_snapshot(&lead, &system)?;
        assert_eq!(snapshot.system_score, lead.score);
        assert_eq!(snapshot.system_rating, lead.rating);
        assert_eq!(breakdown(&snapshot)?["total"], json!(lead.score));
        assert_eq!(snapshot.score_reason, lead.score_reason);
        assert_eq!(snapshot.formula_version, scoring::FORMULA_VERSION);
        assert!(SystemScoreTuple::from_stored(&lead, &snapshot)?.is_some());
        Ok(())
    }

    #[test]
    fn manual_and_revoked_explanations_keep_the_stored_facts_after_new_facts_arrive()
    -> Result<(), LeadsError> {
        let mut lead = lead();
        let system = SystemScoreTuple::calculate(&lead, &scoring::Facts::default())?;
        system.apply(&mut lead);
        let original = system_snapshot(&lead, &system)?;
        let new_facts = scoring::Facts {
            sales_intelligence: scoring::IntelligenceFacts {
                decision_maker_known: true,
                ..Default::default()
            },
            ..Default::default()
        };
        let newly_calculated = SystemScoreTuple::calculate(&lead, &new_facts)?;
        assert_ne!(newly_calculated.score, lead.score);
        let stored =
            SystemScoreTuple::from_stored(&lead, &original)?.ok_or(LeadsError::Internal)?;
        let active = active_override(&lead);
        let manual = build_snapshot(
            &stored,
            &lead,
            Some(&active),
            "manual-override",
            "approve-score-override",
            Uuid::from_u128(4),
            Some(active.id),
        )?;
        let revoked = build_snapshot(
            &stored,
            &lead,
            None,
            "override-revoked",
            "revoke-score-override",
            Uuid::from_u128(4),
            Some(active.id),
        )?;
        for snapshot in [&manual, &revoked] {
            assert_eq!(snapshot.system_score, lead.score);
            assert_eq!(snapshot.component_breakdown, original.component_breakdown);
            assert_eq!(breakdown(snapshot)?["total"], json!(lead.score));
            assert_eq!(snapshot.source_record_id, Some(active.id));
        }
        assert_eq!(manual.effective_score, 91);
        assert_eq!(manual.override_id, Some(active.id));
        assert_eq!(revoked.effective_score, lead.score);
        assert_eq!(revoked.override_id, None);
        Ok(())
    }

    #[test]
    fn damaged_or_internally_mismatched_history_cannot_be_reused() -> Result<(), LeadsError> {
        let mut lead = lead();
        let system = SystemScoreTuple::calculate(&lead, &scoring::Facts::default())?;
        system.apply(&mut lead);
        let original = system_snapshot(&lead, &system)?;
        let mut corruptions = Vec::new();
        for (field, value) in [
            ("total", json!(lead.score + 1)),
            ("salesIntelligence", json!(20)),
            ("formulaVersion", json!("lead-score-v1")),
            ("salesIntelligenceFacts", Value::Null),
        ] {
            let mut snapshot = original.clone();
            let mut component = breakdown(&snapshot)?;
            component[field] = value;
            snapshot.component_breakdown = component.to_string();
            corruptions.push(snapshot);
        }
        let mut invalid_json = original.clone();
        invalid_json.component_breakdown = "{invalid".into();
        corruptions.push(invalid_json);
        let mut invalid_gates = original.clone();
        invalid_gates.gate_summary_snapshot = "{}".into();
        corruptions.push(invalid_gates);
        let mut invalid_rating = original.clone();
        invalid_rating.system_rating = "A".into();
        corruptions.push(invalid_rating);
        for snapshot in corruptions {
            assert!(SystemScoreTuple::from_stored(&lead, &snapshot)?.is_none());
        }
        Ok(())
    }

    #[test]
    fn equal_total_from_different_base_facts_is_not_a_matching_tuple() -> Result<(), LeadsError> {
        let mut lead = lead();
        let system = SystemScoreTuple::calculate(&lead, &scoring::Facts::default())?;
        system.apply(&mut lead);
        let original = system_snapshot(&lead, &system)?;
        // +5 budget and -5 urgency preserve the total and aggregate reason.
        lead.budget_status = "budget-confirmed".into();
        lead.urgency = "low".into();
        let changed = SystemScoreTuple::calculate(&lead, &scoring::Facts::default())?;
        assert_eq!(changed.score, lead.score);
        assert_eq!(changed.reason, lead.score_reason);
        assert!(SystemScoreTuple::from_stored(&lead, &original)?.is_none());
        Ok(())
    }

    #[test]
    fn semantic_numeric_json_and_extra_historical_metadata_are_preserved() -> Result<(), LeadsError>
    {
        let mut lead = lead();
        let system = SystemScoreTuple::calculate(&lead, &scoring::Facts::default())?;
        system.apply(&mut lead);
        let mut snapshot = system_snapshot(&lead, &system)?;
        let mut component = breakdown(&snapshot)?;
        component["total"] = json!(f64::from(lead.score));
        component["followUpFacts"]["followUpCount30d"] = json!(0.0);
        component["attachmentFacts"]["latestAttachmentCount"] = json!(0.0);
        component["historicalMetadata"] = json!({"source":"retained"});
        snapshot.component_breakdown = component.to_string();
        let stored =
            SystemScoreTuple::from_stored(&lead, &snapshot)?.ok_or(LeadsError::Internal)?;
        assert_eq!(stored.component_breakdown, snapshot.component_breakdown);
        Ok(())
    }

    #[test]
    fn a_coherent_v1_stored_result_keeps_its_original_formula_without_live_refresh()
    -> Result<(), LeadsError> {
        let mut lead = lead();
        let value = scoring::breakdown(&lead.gate_input(), &scoring::Facts::default());
        let total = (value.source
            + value.demand
            + value.budget
            + value.amount
            + value.urgency
            + value.expected_decision_date
            + value.owner)
            .min(100);
        lead.score = total;
        lead.rating = scoring::rating(total).into();
        lead.score_reason = "历史v1系统解释".into();
        let system = SystemScoreTuple {
            formula_version: "lead-score-v1".into(), score: total, rating: lead.rating.clone(),
            reason: lead.score_reason.clone(),
            component_breakdown: json!({"source":value.source,"demand":value.demand,
                "budget":value.budget,"amount":value.amount,"urgency":value.urgency,
                "expectedDecisionDate":value.expected_decision_date,"owner":value.owner,"total":total}).to_string(),
            gate_summary: serde_json::to_string(&scoring::gate_summary(&lead.gate_input()))
                .map_err(|_| LeadsError::Internal)?,
        };
        let snapshot = system_snapshot(&lead, &system)?;
        let stored =
            SystemScoreTuple::from_stored(&lead, &snapshot)?.ok_or(LeadsError::Internal)?;
        assert_eq!(stored.formula_version, "lead-score-v1");
        assert_eq!(stored.score, total);
        assert_eq!(stored.reason, "历史v1系统解释");
        Ok(())
    }
}
