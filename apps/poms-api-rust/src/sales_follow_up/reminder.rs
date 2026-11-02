//! Transaction-scoped target serialization and managed Todo mutations.

use sqlx::PgConnection;
use uuid::Uuid;

use super::store::{self, Context, Record, Todo};
use crate::{
    auth::{js_json::JsString, model::clock_now},
    customer_contacts::service::{Error, random_uuid},
    projects::model::trim_js,
};

#[derive(Default)]
pub(super) struct Plan {
    pub new_todo: Option<Todo>,
    pub changed: Vec<(Todo, Todo)>,
}

impl Plan {
    fn manage(&mut self, row: Todo) -> &mut Todo {
        let index = match self
            .changed
            .iter()
            .position(|(before, _)| before.id == row.id)
        {
            Some(index) => index,
            None => {
                self.changed.push((row.clone(), row));
                self.changed.len() - 1
            }
        };
        &mut self.changed[index].1
    }
}

pub(super) async fn prepare(
    connection: &mut PgConnection,
    record: &Record,
    context: &Context,
    summary: &JsString,
    cancel_source: Option<Uuid>,
) -> Result<Plan, sqlx::Error> {
    let (target_type, target_id, title, project_id) = target(record, context);
    // The source record lock/version check, when needed, precedes prepare.
    // Lock even empty/no-owner/no-date streams before any cancellation or Todo
    // read. One target lock covers owner changes without taking two owner locks.
    lock_target(connection, target_type, target_id).await?;
    let mut plan = Plan::default();
    if let Some(source_id) = cancel_source {
        let rows = store::source_todos(connection, source_id).await?;
        let at = clock_now();
        for row in rows {
            let managed = plan.manage(row);
            managed.status = "canceled".to_owned();
            managed.completed_at = Some(at);
        }
    }
    let Some(owner) = record.owner_user_id.filter(|_| record.status == "active") else {
        return Ok(plan);
    };
    let at = clock_now();
    for row in store::stream_todos(connection, owner, target_type, target_id).await? {
        if row.source_id != record.id {
            let managed = plan.manage(row);
            // G1 Native: same-owner/target old Todo was canceled only in the
            // managed state; this later stream loop overwrites it completed.
            managed.status = "completed".to_owned();
            managed.completed_at = Some(at);
        }
    }
    let Some(due_at) = record.next_follow_up_at else {
        return Ok(plan);
    };
    let existing = store::existing_todo(connection, record.id, owner).await?;
    let title = format!("销售跟进提醒：{title}");
    let summary = reminder_summary(summary);
    let priority = if due_at.timestamp_millis() <= clock_now().timestamp_millis() {
        "high"
    } else {
        "normal"
    }
    .to_owned();
    if let Some(row) = existing {
        let managed = plan.manage(row);
        managed.todo_type = "sales-follow-up-reminder".to_owned();
        managed.business_domain = "sales".to_owned();
        managed.target_object_type = target_type.to_owned();
        managed.target_object_id = target_id;
        managed.project_id = project_id;
        managed.title = title;
        managed.summary = summary;
        managed.status = "open".to_owned();
        managed.priority = priority;
        managed.due_at = Some(due_at);
        managed.completed_at = None;
    } else {
        let id = random_uuid().map_err(|_: Error| {
            sqlx::Error::Protocol("cannot allocate reminder identity".into())
        })?;
        plan.new_todo = Some(Todo {
            id,
            source_type: "sales-follow-up-record".to_owned(),
            source_id: record.id,
            todo_type: "sales-follow-up-reminder".to_owned(),
            business_domain: "sales".to_owned(),
            target_object_type: target_type.to_owned(),
            target_object_id: target_id,
            project_id,
            title,
            summary,
            assignee_user_id: owner,
            status: "open".to_owned(),
            priority,
            due_at: Some(due_at),
            completed_at: None,
            row_version: 1,
            created_at: clock_now(),
            updated_at: clock_now(),
        });
    }
    Ok(plan)
}

async fn lock_target(
    connection: &mut PgConnection,
    target_type: &str,
    target_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1::text,0::bigint))")
        .bind(target_lock_key(target_type, target_id))
        .execute(connection)
        .await?;
    Ok(())
}

fn target_lock_key(target_type: &str, target_id: Uuid) -> String {
    format!("sales-follow-up-reminder:{target_type}:{target_id}")
}

fn target<'a>(
    record: &Record,
    context: &'a Context,
) -> (&'static str, Uuid, &'a str, Option<Uuid>) {
    let customer_name = context
        .customer
        .as_ref()
        .map_or("", |customer| customer.name.as_str());
    if let Some(id) = record.project_id {
        return (
            "project",
            id,
            context
                .project
                .as_ref()
                .map(|project| project.name.as_str())
                .or_else(|| context.lead.as_ref().map(|lead| lead.name.as_str()))
                .unwrap_or(customer_name),
            Some(id),
        );
    }
    if let Some(id) = record.lead_id {
        return (
            "lead",
            id,
            context
                .lead
                .as_ref()
                .map_or(customer_name, |lead| lead.name.as_str()),
            None,
        );
    }
    ("customer", record.customer_id, customer_name, None)
}

fn reminder_summary(summary: &JsString) -> Option<String> {
    let summary = trim_js(summary.clone());
    let units = summary.as_code_units();
    if units.is_empty() {
        return None;
    }
    if units.len() > 160 {
        let mut truncated = units[..157].to_vec();
        truncated.extend("...".encode_utf16());
        Some(JsString::from_code_units(truncated).to_utf8_lossy())
    } else {
        Some(summary.to_utf8_lossy())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record() -> Record {
        let at = chrono::DateTime::<chrono::Utc>::UNIX_EPOCH;
        Record {
            id: Uuid::from_u128(1),
            customer_id: Uuid::from_u128(2),
            lead_id: Some(Uuid::from_u128(3)),
            project_id: Some(Uuid::from_u128(4)),
            status: "active".to_owned(),
            follow_up_type: "phone".to_owned(),
            occurred_at: at,
            summary: "Actual follow-up summary".to_owned(),
            detail: None,
            outcome: "progress".to_owned(),
            next_follow_up_at: Some(at),
            owner_org_id: None,
            owner_user_id: Some(Uuid::from_u128(5)),
            supersedes_record_id: None,
            replaced_by_record_id: None,
            replacement_reason: None,
            voided_at: None,
            voided_by: None,
            void_reason: None,
            row_version: 1,
            created_at: at,
            created_by: None,
            updated_at: at,
            updated_by: None,
        }
    }

    fn key_for(record: &Record) -> String {
        let context = Context::default();
        let (kind, id, _, _) = target(record, &context);
        target_lock_key(kind, id)
    }

    #[test]
    fn target_lock_identity_is_shared_across_owners_and_lifecycle_paths() {
        let mut row = record();
        let key = key_for(&row);
        row.id = Uuid::from_u128(6);
        row.owner_user_id = Some(Uuid::from_u128(7));
        row.supersedes_record_id = Some(Uuid::from_u128(1));
        assert_eq!(key_for(&row), key);
        row.owner_user_id = None;
        row.next_follow_up_at = None;
        assert_eq!(key_for(&row), key);
        row.status = "voided".to_owned();
        assert_eq!(key_for(&row), key);
    }

    #[test]
    fn target_lock_keeps_project_lead_customer_priority_and_separates_targets() {
        let mut row = record();
        let project_key = key_for(&row);
        assert_eq!(project_key, target_lock_key("project", Uuid::from_u128(4)));
        row.project_id = None;
        assert_eq!(key_for(&row), target_lock_key("lead", Uuid::from_u128(3)));
        row.lead_id = None;
        assert_eq!(
            key_for(&row),
            target_lock_key("customer", Uuid::from_u128(2))
        );
        let shared_id = Uuid::from_u128(4);
        assert_ne!(project_key, target_lock_key("lead", shared_id));
        assert_ne!(project_key, target_lock_key("customer", shared_id));
        assert_ne!(project_key, target_lock_key("project", Uuid::from_u128(8)));
    }

    #[test]
    fn target_lock_uses_namespaced_canonical_uuid_identity() {
        let lower = Uuid::parse_str("123e4567-e89b-42d3-a456-426614174000")
            .unwrap_or_else(|_| panic!("valid target UUID"));
        let upper = Uuid::parse_str("123E4567-E89B-42D3-A456-426614174000")
            .unwrap_or_else(|_| panic!("valid uppercase target UUID"));
        assert_eq!(
            target_lock_key("project", lower),
            target_lock_key("project", upper)
        );
        assert_eq!(
            target_lock_key("project", upper),
            "sales-follow-up-reminder:project:123e4567-e89b-42d3-a456-426614174000"
        );
    }
}
