use crate::{
    approval_common::{
        CommonSession,
        js::{Data, Value as CommonValue},
        schema::Table,
        store as common,
    },
    contract_support::{Actor, AuditWrite, Error, audit},
};
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) fn id(v: &Value, key: &str) -> Result<Uuid, Error> {
    crate::contract_support::require_uuid(v, key)
}
pub(super) fn text<'a>(v: &'a Value, key: &str) -> Result<&'a str, Error> {
    v.get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| Error::BadRequest(format!("{key} is required")))
}
pub(super) fn rv(v: &Value) -> Result<i32, Error> {
    v["row_version"]
        .as_i64()
        .and_then(|v| i32::try_from(v).ok())
        .ok_or(Error::Internal)
}
pub(super) fn iso(v: &Value) -> Value {
    v.as_str()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|d| {
            json!(
                d.with_timezone(&chrono::Utc)
                    .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
            )
        })
        .unwrap_or(Value::Null)
}
pub(super) fn now() -> Value {
    json!(crate::auth::model::clock_now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
}
pub(super) fn permission(actor: &Actor, p: &str) -> bool {
    actor
        .session
        .user
        .permissions
        .iter()
        .any(|v| v.as_ref() == p)
}
pub(super) fn changed() -> Error {
    Error::CodedConflict {
        code: "source_changed",
        message: "移交来源或材料版本已变化，请重新准备。".into(),
    }
}
pub(super) fn data(v: Value) -> Result<Data, Error> {
    match CommonValue::parse(&v.to_string())? {
        CommonValue::Object(mut v) => {
            for key in [
                "submittedAt",
                "confirmedAt",
                "completedAt",
                "closedAt",
                "generatedAt",
            ] {
                if let Some(parsed) = v
                    .get(key)
                    .and_then(CommonValue::as_text)
                    .and_then(|v| chrono::DateTime::parse_from_rfc3339(&v.to_utf8_lossy()).ok())
                {
                    v.insert(
                        key.into(),
                        CommonValue::Date(Some(crate::approval_common::Timestamp(
                            parsed.with_timezone(&chrono::Utc),
                        ))),
                    );
                }
            }
            Ok(v)
        }
        _ => Err(Error::Internal),
    }
}
pub(super) fn create(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    v: Value,
) -> Result<(), Error> {
    common::create(session.state, table, data(v)?);
    Ok(())
}
pub(super) async fn assign(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    key: Uuid,
    updates: Value,
) -> Result<(), Error> {
    let handles = common::find(
        session,
        table,
        &[("id", vec![CommonValue::text(key.to_string())])],
        &[],
        true,
    )
    .await?;
    let handle = *handles.first().ok_or(Error::Internal)?;
    common::assign(session.state, handle, data(updates)?)?;
    common::persist(session.state, handle)?;
    Ok(())
}
#[allow(clippy::too_many_arguments)] // Mirrors the caller-owned AuditWrite fields without another audit lifecycle.
pub(super) async fn record(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    op: &str,
    target: Uuid,
    project: Uuid,
    before: Option<Value>,
    after: Value,
    metadata: Value,
) -> Result<(), Error> {
    audit(
        session,
        actor,
        AuditWrite {
            operation_id: op.into(),
            target_type: "project-handover".into(),
            target_id: target,
            project_id: project,
            contract_id: None,
            before,
            after: Some(after),
            reason: None,
            metadata,
        },
    )
    .await
}
pub(super) fn safe_item(item: &Value) -> Value {
    let contract = item["payload"]["contractId"]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok());
    json!({"id":item["id"],"itemType":item["item_type"],"sourceType":item["source_type"],"sourceId":item["source_id"],"sourceVersion":item["source_version"],
        "summary":format!("{} · {} · 版本 {}{}",item["item_type"].as_str().unwrap_or("source"),item["source_id"].as_str().unwrap_or(""),item["source_version"].as_str().unwrap_or("—"),contract.map(|id|format!(" · 合同 {id}")).unwrap_or_default())})
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn source_labels_never_copy_sensitive_payload() {
        let item = json!({"id":Uuid::nil(),"item_type":"cost","source_type":"project-technical-cost-package","source_id":Uuid::nil(),"source_version":"2","payload":{"amount":"987.65","risk":"private"},"summary":"secret"});
        let out = safe_item(&item).to_string();
        for secret in ["987.65", "private", "secret", "payload"] {
            assert!(!out.contains(secret));
        }
    }
}
