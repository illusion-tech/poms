//! Request-local managed Todo mutations. The cancel and stream queries run
//! before the one business flush, so the same old Todo can finish completed.

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
    let (target_type, target_id, title, project_id) = target(record, context);
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
