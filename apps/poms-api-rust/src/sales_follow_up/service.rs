//! Append-only follow-up commands with atomic record, reminder and required audit.

use std::collections::{BTreeMap, HashSet};

use sqlx::{Connection, PgConnection};
use uuid::Uuid;

use super::{
    model::{Create, Fields, Query, Replace, Void},
    reminder,
    store::{self, Context, Record, User},
};
use crate::{
    auth::{
        guards::RequestMetadata,
        js_json::JsString,
        model::{ResolvedSession, SessionFlush, clock_now},
        store::flush_managed_session,
    },
    compat::json::Field,
    customer_contacts::service::{array, iso, random_uuid},
    database::Database,
    projects::model::{Wire, js},
};

pub use crate::customer_contacts::service::Error;

#[derive(Clone, Debug)]
pub struct Service {
    database: Database,
}

#[derive(Clone, Copy)]
enum AuditKind {
    Replacement,
    Void,
}

impl AuditKind {
    fn event(self) -> &'static str {
        match self {
            Self::Replacement => "sales-follow-up.replaced",
            Self::Void => "sales-follow-up.voided",
        }
    }
}

struct RequiredAudit {
    kind: AuditKind,
    source_id: Uuid,
    expected_version: i64,
    operator_id: Uuid,
    request_id: Option<String>,
    reason: JsString,
    raw: BTreeMap<String, JsString>,
}

impl RequiredAudit {
    fn metadata(&self, before: &Record, after: &Record) -> Result<String, Error> {
        if self.source_id != before.id {
            return Err(Error::Internal);
        }
        let before = snapshot(before, &BTreeMap::new())?;
        let after_snapshot = snapshot(after, &self.raw)?;
        Ok(match self.kind {
            AuditKind::Replacement => format!(
                "{{\"replacementId\":{},\"replacementReason\":{},\"before\":{},\"after\":{}}}",
                js(&after.id.to_string()).json(),
                self.reason.json(),
                before.0,
                after_snapshot.0
            ),
            AuditKind::Void => format!(
                "{{\"reason\":{},\"before\":{},\"after\":{}}}",
                self.reason.json(),
                before.0,
                after_snapshot.0
            ),
        })
    }
}

type FlushedRecords = (Option<Record>, Option<Record>);

impl Service {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list(&self, input: Query) -> Result<Wire, Error> {
        let rows = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::list(connection, &input).await })
            })
            .await?;
        let customer_ids = unique(rows.iter().map(|row| row.customer_id));
        let lead_ids = unique(rows.iter().filter_map(|row| row.lead_id));
        let project_ids = unique(rows.iter().filter_map(|row| row.project_id));
        let user_ids = unique(
            rows.iter()
                .filter_map(|row| row.owner_user_id)
                .chain(rows.iter().filter_map(|row| row.voided_by)),
        );
        let org_ids = unique(rows.iter().filter_map(|row| row.owner_org_id));
        let (customers, leads, projects, users, orgs) = tokio::try_join!(
            self.database
                .with_connection(move |connection| Box::pin(store::customers(
                    connection,
                    customer_ids
                ))),
            self.database
                .with_connection(move |connection| Box::pin(store::leads(connection, lead_ids))),
            self.database
                .with_connection(move |connection| Box::pin(store::projects(
                    connection,
                    project_ids
                ))),
            self.database
                .with_connection(move |connection| Box::pin(store::users(connection, user_ids))),
            self.database
                .with_connection(move |connection| Box::pin(store::orgs(connection, org_ids))),
        )?;
        let values = rows
            .iter()
            .map(|row| {
                summary(
                    row,
                    &Context {
                        customer: customers.get(&row.customer_id).cloned(),
                        lead: row.lead_id.and_then(|id| leads.get(&id).cloned()),
                        project: row.project_id.and_then(|id| projects.get(&id).cloned()),
                        owner_user: row.owner_user_id.and_then(|id| users.get(&id).cloned()),
                        owner_org: row.owner_org_id.and_then(|id| orgs.get(&id).cloned()),
                        voided_by_user: row.voided_by.and_then(|id| users.get(&id).cloned()),
                    },
                )
                .map(Wire::value)
            })
            .collect::<Result<Vec<_>, _>>()?;
        Ok(array(values))
    }

    pub async fn create(&self, input: Create, session: &ResolvedSession) -> Result<Wire, Error> {
        let operator = actor(session);
        let customer = self.require_customer(&input.customer_id).await?;
        if customer.status != "active" {
            return Err(Error::BadRequest(format!(
                "Customer {} is not active",
                input.customer_id
            )));
        }
        let lead = match &input.lead_id {
            Field::Value(id) => Some(self.require_lead(id, customer.id).await?),
            _ => None,
        };
        let project = match &input.project_id {
            Field::Value(id) => Some(self.require_project(id, customer.id).await?),
            _ => None,
        };
        let mut context = Context {
            customer: Some(customer),
            lead,
            project,
            ..Context::default()
        };
        self.resolve_owner(&input.fields, None, &operator, &mut context, session)
            .await?;
        self.require_dictionary(&input.fields.follow_up_type)
            .await?;
        let mut row = new_record(&input.fields, &context, operator.id)?;
        let raw = record_text(&input.fields);
        row = self
            .flush(
                Some(row),
                None,
                &context,
                &input.fields.summary,
                session.pending_flush.as_ref(),
                None,
            )
            .await?
            .0
            .ok_or(Error::Internal)?;
        Ok(Wire::object(summary(&row, &context)?, &raw))
    }

    pub async fn replace(
        &self,
        id: &str,
        input: Replace,
        session: &ResolvedSession,
        metadata: &RequestMetadata,
    ) -> Result<Wire, Error> {
        let operator = actor(session);
        let before = self.require_record(id).await?;
        expected(&before, input.expected_version)?;
        if before.status != "active" {
            return Err(Error::BadRequest(format!(
                "Only active sales follow-up records can be replaced, current status: {}",
                before.status
            )));
        }
        let mut context = self.anchors(&before).await?;
        self.resolve_owner(
            &input.fields,
            Some(&before),
            &operator,
            &mut context,
            session,
        )
        .await?;
        self.require_dictionary(&input.fields.follow_up_type)
            .await?;
        let mut replacement = new_record(&input.fields, &context, operator.id)?;
        replacement.customer_id = before.customer_id;
        replacement.lead_id = before.lead_id;
        replacement.project_id = before.project_id;
        replacement.supersedes_record_id = Some(before.id);
        replacement.replacement_reason = Some(input.replacement_reason.to_utf8_lossy());
        let mut superseded = before.clone();
        superseded.status = "superseded".to_owned();
        superseded.replaced_by_record_id = Some(replacement.id);
        superseded.updated_by = Some(operator.id);
        let mut raw = record_text(&input.fields);
        raw.insert(
            "replacementReason".to_owned(),
            input.replacement_reason.clone(),
        );
        let audit = RequiredAudit {
            kind: AuditKind::Replacement,
            source_id: before.id,
            expected_version: input.expected_version,
            operator_id: operator.id,
            request_id: metadata.request_id.clone(),
            reason: input.replacement_reason.clone(),
            raw: raw.clone(),
        };
        replacement = self
            .flush(
                Some(replacement),
                Some((before.clone(), superseded)),
                &context,
                &input.fields.summary,
                session.pending_flush.as_ref(),
                Some(audit),
            )
            .await?
            .0
            .ok_or(Error::Internal)?;
        Ok(Wire::object(summary(&replacement, &context)?, &raw))
    }

    pub async fn void(
        &self,
        id: &str,
        input: Void,
        session: &ResolvedSession,
        metadata: &RequestMetadata,
    ) -> Result<Wire, Error> {
        let operator = actor(session);
        let before = self.require_record(id).await?;
        expected(&before, input.expected_version)?;
        if before.status != "active" {
            return Err(Error::BadRequest(format!(
                "Only active sales follow-up records can be voided, current status: {}",
                before.status
            )));
        }
        let mut context = self.anchors(&before).await?;
        context.owner_user = match before.owner_user_id {
            Some(id) => self.user(&id.to_string(), session).await?,
            None => None,
        };
        context.owner_org = match before.owner_org_id {
            Some(id) => self.org(&id.to_string()).await?,
            None => None,
        };
        context.voided_by_user = Some(operator.clone());
        let reason = append_comment(input.reason, &input.comment);
        let mut after = before.clone();
        after.status = "voided".to_owned();
        after.voided_at = Some(clock_now());
        after.voided_by = Some(operator.id);
        after.void_reason = Some(reason.to_utf8_lossy());
        after.updated_by = Some(operator.id);
        let raw = BTreeMap::from([("voidReason".to_owned(), reason.clone())]);
        let summary_text = js(&after.summary);
        let audit = RequiredAudit {
            kind: AuditKind::Void,
            source_id: before.id,
            expected_version: input.expected_version,
            operator_id: operator.id,
            request_id: metadata.request_id.clone(),
            reason,
            raw: raw.clone(),
        };
        after = self
            .flush(
                None,
                Some((before.clone(), after)),
                &context,
                &summary_text,
                session.pending_flush.as_ref(),
                Some(audit),
            )
            .await?
            .1
            .ok_or(Error::Internal)?;
        Ok(Wire::object(summary(&after, &context)?, &raw))
    }

    async fn require_record(&self, id: &str) -> Result<Record, Error> {
        let key = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move { store::find(connection, &key).await })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("SalesFollowUpRecord {id} not found")))
    }

    async fn require_customer(&self, id: &str) -> Result<store::Customer, Error> {
        let key = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_customer(connection, &key).await })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("Customer {id} not found")))
    }

    async fn require_lead(&self, id: &str, customer_id: Uuid) -> Result<store::Lead, Error> {
        let key = id.to_owned();
        let lead = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_lead(connection, &key).await })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("Lead {id} not found")))?;
        if lead.customer_id != customer_id {
            return Err(Error::BadRequest(format!(
                "Lead {id} does not belong to customer {customer_id}"
            )));
        }
        Ok(lead)
    }

    async fn require_project(&self, id: &str, customer_id: Uuid) -> Result<store::Project, Error> {
        let key = id.to_owned();
        let project = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_project(connection, &key).await })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("Project {id} not found")))?;
        if project.customer_id != Some(customer_id) {
            return Err(Error::BadRequest(format!(
                "Project {id} does not belong to customer {customer_id}"
            )));
        }
        Ok(project)
    }

    async fn anchors(&self, row: &Record) -> Result<Context, Error> {
        let customer = self.require_customer(&row.customer_id.to_string()).await?;
        let lead = match row.lead_id {
            Some(id) => Some(self.require_lead(&id.to_string(), row.customer_id).await?),
            None => None,
        };
        let project = match row.project_id {
            Some(id) => Some(
                self.require_project(&id.to_string(), row.customer_id)
                    .await?,
            ),
            None => None,
        };
        Ok(Context {
            customer: Some(customer),
            lead,
            project,
            ..Context::default()
        })
    }

    async fn user(&self, id: &str, session: &ResolvedSession) -> Result<Option<User>, Error> {
        if id == session.user_snapshot.id.to_string() {
            return Ok(Some(actor(session)));
        }
        let key = id.to_owned();
        let mut user = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_user(connection, &key).await })
            })
            .await?;
        if let Some(user) = user.as_mut()
            && user.id == session.user_snapshot.id
            && user.primary_org_unit_id.is_none()
        {
            user.primary_org_unit_id = session.user_snapshot.primary_org_unit_id;
        }
        Ok(user)
    }

    async fn org(&self, id: &str) -> Result<Option<store::Org>, Error> {
        let key = id.to_owned();
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::find_org(connection, &key).await })
            })
            .await?)
    }

    async fn resolve_owner(
        &self,
        fields: &Fields,
        current: Option<&Record>,
        operator: &User,
        context: &mut Context,
        session: &ResolvedSession,
    ) -> Result<(), Error> {
        let project_user = context.project.as_ref().and_then(|row| row.owner_user_id);
        let lead_user = context.lead.as_ref().and_then(|row| row.owner_user_id);
        let default_user = match current {
            Some(row) => row.owner_user_id,
            None => project_user.or(lead_user).or(Some(operator.id)),
        };
        let user_id = match &fields.owner_user_id {
            Field::Missing => default_user.map(|id| id.to_string()),
            Field::Null => None,
            Field::Value(id) => Some(id.clone()),
        };
        let user = match user_id {
            Some(id) => Some(
                self.user(&id, session)
                    .await?
                    .ok_or_else(|| Error::NotFound(format!("Platform user {id} not found")))?,
            ),
            None => None,
        };
        let retained_org = current
            .filter(|_| fields.owner_user_id.is_missing())
            .and_then(|row| row.owner_org_id);
        let default_org = user
            .as_ref()
            .and_then(|row| row.primary_org_unit_id)
            .or(retained_org)
            .or_else(|| context.project.as_ref().and_then(|row| row.owner_org_id))
            .or_else(|| context.lead.as_ref().and_then(|row| row.owner_org_id))
            .or(operator.primary_org_unit_id);
        let org_id = match &fields.owner_org_id {
            Field::Missing => default_org.map(|id| id.to_string()),
            Field::Null => None,
            Field::Value(id) => Some(id.clone()),
        };
        let org = match org_id {
            Some(id) => Some(
                self.org(&id)
                    .await?
                    .ok_or_else(|| Error::NotFound(format!("Org unit {id} not found")))?,
            ),
            None => None,
        };
        context.owner_user = user;
        context.owner_org = org;
        Ok(())
    }

    async fn require_dictionary(&self, code: &str) -> Result<(), Error> {
        let key = code.to_owned();
        let status = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::dictionary_status(connection, &key).await })
            })
            .await?;
        match status.as_deref() {
            None => Err(Error::BadRequest(format!(
                "Dictionary item not found: sales-follow-up-type/{code}"
            ))),
            Some("active") => Ok(()),
            Some(_) => Err(Error::BadRequest(format!(
                "Dictionary item is inactive: sales-follow-up-type/{code}"
            ))),
        }
    }

    async fn flush(
        &self,
        mut new: Option<Record>,
        mut old: Option<(Record, Record)>,
        context: &Context,
        summary: &JsString,
        pending: Option<&SessionFlush>,
        audit: Option<RequiredAudit>,
    ) -> Result<FlushedRecords, Error> {
        let context = context.clone();
        let summary = summary.clone();
        let pending = pending.cloned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<Result<FlushedRecords, Error>, sqlx::Error> = async {
                        // Lock order is source F first, then reminder work. A
                        // same-source loser rechecks the committed version/state
                        // before it reads or changes any Todo or required audit.
                        if let Some((before, _)) = old.as_mut() {
                            let Some(required) = audit.as_ref() else {
                                return Ok(Err(Error::Internal));
                            };
                            if required.source_id != before.id {
                                return Ok(Err(Error::Internal));
                            }
                            let Some(locked) =
                                store::lock_source(&mut transaction, before.id).await?
                            else {
                                return Ok(Err(Error::NotFound(format!(
                                    "SalesFollowUpRecord {} not found",
                                    before.id
                                ))));
                            };
                            if let Err(error) = locked_source(&locked, required.expected_version) {
                                return Ok(Err(error));
                            }
                            *before = locked;
                        }
                        let Some(current) = new
                            .as_ref()
                            .or_else(|| old.as_ref().map(|(_, after)| after))
                        else {
                            return Ok(Err(Error::Internal));
                        };
                        let cancel_source = old.as_ref().map(|(before, _)| before.id);
                        let mut todos = reminder::prepare(
                            &mut transaction,
                            current,
                            &context,
                            &summary,
                            cancel_source,
                        )
                        .await?;

                        // Preserve the existing record/reminder write graph,
                        // with all writes and the necessary audit in this TX.
                        if let Some(todo) = todos.new_todo.as_mut() {
                            todo.row_version = store::insert_todo(&mut transaction, todo).await?;
                        }
                        if let Some(row) = new.as_mut() {
                            row.row_version = store::insert(&mut transaction, row).await?;
                        }
                        if new.is_none() {
                            for (before, after) in &mut todos.changed {
                                if !store::update_todo(&mut transaction, before, after).await? {
                                    return Ok(Err(managed_conflict(
                                        "sales-follow-up reminder",
                                        before.id,
                                    )));
                                }
                            }
                        }
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        if new.is_some() {
                            for (before, after) in &mut todos.changed {
                                if !store::update_todo(&mut transaction, before, after).await? {
                                    return Ok(Err(managed_conflict(
                                        "sales-follow-up reminder",
                                        before.id,
                                    )));
                                }
                            }
                        }
                        if let Some((before, after)) = old.as_mut() {
                            after.updated_at = clock_now();
                            let Some(version) =
                                store::update(&mut transaction, before, after).await?
                            else {
                                return Ok(Err(managed_conflict(
                                    "sales-follow-up-record",
                                    before.id,
                                )));
                            };
                            after.row_version = version;
                        }
                        if let Some(required) = audit.as_ref() {
                            let Some((before, changed)) = old.as_ref() else {
                                return Ok(Err(Error::Internal));
                            };
                            let after = new.as_ref().unwrap_or(changed);
                            let metadata = match required.metadata(before, after) {
                                Ok(metadata) => metadata,
                                Err(error) => return Ok(Err(error)),
                            };
                            insert_required_audit(&mut transaction, required, &metadata).await?;
                        }
                        Ok(Ok((new, old.map(|(_, after)| after))))
                    }
                    .await;
                    match result {
                        Ok(Ok(rows)) => {
                            transaction.commit().await?;
                            Ok(Ok(rows))
                        }
                        Ok(Err(error)) => {
                            transaction.rollback().await?;
                            Ok(Err(error))
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?
    }
}

async fn insert_required_audit(
    connection: &mut PgConnection,
    audit: &RequiredAudit,
    metadata: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.audit_log (event_type,target_type,target_id,operator_id,request_id,result,reason,before_snapshot,after_snapshot,metadata,occurred_at) VALUES ($1,'sales-follow-up-record',$2,$3,$4,'success',NULL,NULL,NULL,$5::text::jsonb,$6)")
        .bind(audit.kind.event()).bind(audit.source_id.to_string()).bind(audit.operator_id)
        .bind(audit.request_id.clone()).bind(metadata).bind(clock_now())
        .execute(connection).await?;
    Ok(())
}

fn managed_conflict(kind: &str, id: Uuid) -> Error {
    Error::Conflict(format!("{kind} {id} has been modified; refresh and retry"))
}

fn locked_source(row: &Record, version: i64) -> Result<(), Error> {
    expected(row, version)?;
    if row.status != "active" {
        return Err(managed_conflict("sales-follow-up-record", row.id));
    }
    Ok(())
}

fn unique(ids: impl Iterator<Item = Uuid>) -> Vec<Uuid> {
    let mut seen = HashSet::new();
    ids.filter(|id| seen.insert(*id)).collect()
}

fn actor(session: &ResolvedSession) -> User {
    User {
        id: session.user_snapshot.id,
        name: session.user_snapshot.display_name.clone(),
        primary_org_unit_id: session.user_snapshot.primary_org_unit_id,
    }
}

fn expected(row: &Record, version: i64) -> Result<(), Error> {
    if i64::from(row.row_version) != version {
        return Err(Error::Conflict(format!(
            "sales-follow-up-record version {version} does not match current version {}",
            row.row_version
        )));
    }
    Ok(())
}

fn new_record(fields: &Fields, context: &Context, operator: Uuid) -> Result<Record, Error> {
    let customer = context.customer.as_ref().ok_or(Error::Internal)?;
    Ok(Record {
        id: random_uuid()?,
        customer_id: customer.id,
        lead_id: context.lead.as_ref().map(|row| row.id),
        project_id: context.project.as_ref().map(|row| row.id),
        status: "active".to_owned(),
        follow_up_type: fields.follow_up_type.clone(),
        occurred_at: fields.occurred_at,
        summary: fields.summary.to_utf8_lossy(),
        detail: nullable_text(&fields.detail),
        outcome: fields.outcome.clone(),
        next_follow_up_at: match &fields.next_follow_up_at {
            Field::Value(value) => Some(*value),
            _ => None,
        },
        owner_org_id: context.owner_org.as_ref().map(|row| row.id),
        owner_user_id: context.owner_user.as_ref().map(|row| row.id),
        supersedes_record_id: None,
        replaced_by_record_id: None,
        replacement_reason: None,
        voided_at: None,
        voided_by: None,
        void_reason: None,
        row_version: 1,
        created_at: clock_now(),
        created_by: Some(operator),
        updated_at: clock_now(),
        updated_by: Some(operator),
    })
}

fn record_text(fields: &Fields) -> BTreeMap<String, JsString> {
    let mut raw = BTreeMap::from([("summary".to_owned(), fields.summary.clone())]);
    if let Field::Value(value) = &fields.detail {
        raw.insert("detail".to_owned(), value.clone());
    }
    raw
}

fn nullable_text(value: &Field<JsString>) -> Option<String> {
    match value {
        Field::Value(value) => Some(value.to_utf8_lossy()),
        _ => None,
    }
}

fn append_comment(reason: JsString, comment: &Field<JsString>) -> JsString {
    let Field::Value(comment) = comment else {
        return reason;
    };
    if comment.is_empty() {
        return reason;
    }
    let mut units = reason.as_code_units().to_vec();
    units.extend(": ".encode_utf16());
    units.extend_from_slice(comment.as_code_units());
    JsString::from_code_units(units)
}

fn optional_iso(value: Option<chrono::DateTime<chrono::Utc>>) -> Result<Option<String>, Error> {
    value.map(iso).transpose()
}

fn summary(row: &Record, context: &Context) -> Result<serde_json::Value, Error> {
    Ok(serde_json::json!({
        "id":row.id,"customerId":row.customer_id,"customerName":context.customer.as_ref().map_or("", |row| row.name.as_str()),
        "leadId":row.lead_id,"leadName":context.lead.as_ref().map(|row| row.name.as_str()),
        "projectId":row.project_id,"projectName":context.project.as_ref().map(|row| row.name.as_str()),
        "followUpType":row.follow_up_type,"status":row.status,"occurredAt":iso(row.occurred_at)?,
        "summary":row.summary,"detail":row.detail,"outcome":row.outcome,"nextFollowUpAt":optional_iso(row.next_follow_up_at)?,
        "ownerOrgId":row.owner_org_id,"ownerOrgName":context.owner_org.as_ref().map(|row| row.name.as_str()),
        "ownerUserId":row.owner_user_id,"ownerName":context.owner_user.as_ref().map(|row| row.name.as_str()),
        "supersedesId":row.supersedes_record_id,"replacedById":row.replaced_by_record_id,"replacementReason":row.replacement_reason,
        "voidedAt":optional_iso(row.voided_at)?,"voidedBy":row.voided_by,"voidedByName":context.voided_by_user.as_ref().map(|row| row.name.as_str()),
        "voidReason":row.void_reason,"rowVersion":row.row_version,
        "createdAt":iso(row.created_at)?,"createdBy":row.created_by,"updatedAt":iso(row.updated_at)?,"updatedBy":row.updated_by,
    }))
}

fn snapshot(row: &Record, raw: &BTreeMap<String, JsString>) -> Result<Wire, Error> {
    Ok(Wire::object(
        serde_json::json!({
            "customerId":row.customer_id,"leadId":row.lead_id,"projectId":row.project_id,"status":row.status,
            "followUpType":row.follow_up_type,"occurredAt":iso(row.occurred_at)?,"summary":row.summary,"outcome":row.outcome,
            "nextFollowUpAt":optional_iso(row.next_follow_up_at)?,"ownerUserId":row.owner_user_id,"ownerOrgId":row.owner_org_id,
            "supersedesId":row.supersedes_record_id,"replacedById":row.replaced_by_record_id,"replacementReason":row.replacement_reason,
            "voidedAt":optional_iso(row.voided_at)?,"voidedBy":row.voided_by,"voidReason":row.void_reason,"rowVersion":row.row_version,
        }),
        raw,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{http::StatusCode, response::IntoResponse};
    use serde_json::{Value, json};

    fn source() -> Record {
        let at = chrono::DateTime::<chrono::Utc>::UNIX_EPOCH;
        Record {
            id: Uuid::from_u128(1),
            customer_id: Uuid::from_u128(2),
            lead_id: Some(Uuid::from_u128(3)),
            project_id: None,
            status: "active".to_owned(),
            follow_up_type: "phone".to_owned(),
            occurred_at: at,
            summary: "Original follow-up".to_owned(),
            detail: None,
            outcome: "pending".to_owned(),
            next_follow_up_at: Some(at),
            owner_org_id: None,
            owner_user_id: Some(Uuid::from_u128(4)),
            supersedes_record_id: None,
            replaced_by_record_id: None,
            replacement_reason: None,
            voided_at: None,
            voided_by: None,
            void_reason: None,
            row_version: 3,
            created_at: at,
            created_by: Some(Uuid::from_u128(4)),
            updated_at: at,
            updated_by: Some(Uuid::from_u128(4)),
        }
    }

    fn required(kind: AuditKind, row: &Record, reason: JsString) -> RequiredAudit {
        RequiredAudit {
            kind,
            source_id: row.id,
            expected_version: i64::from(row.row_version),
            operator_id: Uuid::from_u128(5),
            request_id: Some("request-42".to_owned()),
            reason,
            raw: BTreeMap::new(),
        }
    }

    #[test]
    fn locked_source_requires_the_current_active_version() {
        let mut row = source();
        assert!(locked_source(&row, 3).is_ok());
        let stale = locked_source(&row, 2)
            .err()
            .unwrap_or_else(|| panic!("a stale version must conflict"));
        assert_eq!(
            stale.into_api_error().into_response().status(),
            StatusCode::CONFLICT,
        );
        for status in ["superseded", "voided"] {
            row.status = status.to_owned();
            let terminal = locked_source(&row, 3)
                .err()
                .unwrap_or_else(|| panic!("a terminal source must conflict under the lock"));
            assert_eq!(
                terminal.into_api_error().into_response().status(),
                StatusCode::CONFLICT,
            );
        }
    }

    #[test]
    fn replacement_audit_preserves_source_and_new_record_versions() {
        let before = source();
        let reason = js("Correct the meeting outcome");
        let audit = required(AuditKind::Replacement, &before, reason.clone());
        let mut after = before.clone();
        after.id = Uuid::from_u128(6);
        after.row_version = 1;
        after.supersedes_record_id = Some(before.id);
        after.replacement_reason = Some(reason.to_utf8_lossy());
        after.summary = "Corrected follow-up".to_owned();
        let metadata: Value = serde_json::from_str(
            &audit
                .metadata(&before, &after)
                .unwrap_or_else(|_| panic!("valid replacement audit snapshots")),
        )
        .unwrap_or_else(|_| panic!("valid audit JSON"));
        assert_eq!(audit.kind.event(), "sales-follow-up.replaced");
        assert_eq!(audit.source_id, before.id);
        assert_eq!(audit.request_id.as_deref(), Some("request-42"));
        assert_eq!(metadata["replacementId"], json!(after.id));
        assert_eq!(metadata["replacementReason"], json!(reason.to_utf8_lossy()));
        assert_eq!(metadata["before"]["rowVersion"], json!(3));
        assert_eq!(metadata["before"]["status"], json!("active"));
        assert_eq!(metadata["after"]["rowVersion"], json!(1));
        assert_eq!(metadata["after"]["supersedesId"], json!(before.id));
        assert_eq!(metadata["after"]["summary"], json!("Corrected follow-up"));
    }

    #[test]
    fn void_audit_records_the_final_lifecycle_and_reason() {
        let before = source();
        let reason = append_comment(js("Entered in error"), &Field::Value(js("Duplicate")));
        let audit = required(AuditKind::Void, &before, reason.clone());
        let mut after = before.clone();
        after.row_version = 4;
        after.status = "voided".to_owned();
        after.void_reason = Some(reason.to_utf8_lossy());
        after.voided_at = Some(before.occurred_at);
        after.voided_by = Some(audit.operator_id);
        let metadata: Value = serde_json::from_str(
            &audit
                .metadata(&before, &after)
                .unwrap_or_else(|_| panic!("valid void audit snapshots")),
        )
        .unwrap_or_else(|_| panic!("valid audit JSON"));
        assert_eq!(audit.kind.event(), "sales-follow-up.voided");
        assert_eq!(metadata["reason"], json!("Entered in error: Duplicate"));
        assert_eq!(metadata["before"]["rowVersion"], json!(3));
        assert_eq!(metadata["before"]["status"], json!("active"));
        assert_eq!(metadata["after"]["rowVersion"], json!(4));
        assert_eq!(metadata["after"]["status"], json!("voided"));
        assert_eq!(metadata["after"]["voidReason"], metadata["reason"]);
        assert_eq!(metadata["after"]["voidedBy"], json!(audit.operator_id));
    }
}
