//! Project scope is checked by the caller before this sensitive projection.
//! Unknown labor lineage is intentionally treated as the strongest group.
use crate::{
    approval_common::CommonSession,
    auth::{audit::insert_security_event, projection as sensitive},
    contract_support::{Actor, Error},
    shared::generated::SensitiveFieldPackageKey,
};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use uuid::Uuid;

pub(crate) fn permission(actor: &Actor, key: &str) -> bool {
    actor
        .session
        .user
        .permissions
        .iter()
        .any(|p| p.as_str() == key)
}

pub(crate) fn may_read(actor: &Actor, strongest_group: bool) -> bool {
    permission(actor, "operating:finance:sensitive:read")
        && (!strongest_group || permission(actor, "labor-cost-rate:sensitive:read"))
}

pub(crate) fn require_sensitive_write(actor: &Actor, strongest_group: bool) -> Result<(), Error> {
    if !may_read(actor, strongest_group) {
        return Err(Error::Forbidden(
            "Operating review requires the source-derived sensitive permissions".into(),
        ));
    }
    Ok(())
}

/// All required security events finish before any returned payload is exposed.
/// Field values, explanations, evidence, and next actions share one reversible
/// group: a protected operand cannot leak through its textual explanation.
pub(crate) async fn fields(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    target_type: &str,
    target_id: Uuid,
    project_id: Uuid,
    strongest_group: bool,
    values: Vec<(String, Option<String>)>,
) -> Result<BTreeMap<String, Value>, Error> {
    let user = sensitive::ProjectionUser {
        sub: actor.id,
        username: actor.session.user.username.clone(),
        permissions: actor
            .session
            .user
            .permissions
            .iter()
            .map(|p| p.as_str().to_owned())
            .collect(),
    };
    let inputs = values
        .into_iter()
        .map(|(key, value)| sensitive::StringField {
            key,
            display_text_when_full: Some(
                value
                    .as_ref()
                    .map(|v| {
                        if v.is_empty() {
                            "--".into()
                        } else if v.encode_utf16().count() > 2000 {
                            "已授权的经营复核依据".into()
                        } else {
                            v.clone()
                        }
                    })
                    .unwrap_or_else(|| "未知".into()),
            ),
            raw_value: value,
            masked_display_text: None,
            denied_display_text: None,
        })
        .collect::<Vec<_>>();
    let mut packages = vec![SensitiveFieldPackageKey::OperatingFinance];
    if strongest_group {
        packages.push(SensitiveFieldPackageKey::LaborCostRate);
    }
    let mut plans = Vec::new();
    for package in packages {
        let plan = sensitive::plan(&sensitive::ProjectionInput {
            field_package_key: package,
            fields: inputs.clone(),
            user: Some(user.clone()),
            target_type: target_type.into(),
            target_id: target_id.to_string(),
            request_context: actor.request_context.clone(),
            mode_when_unauthorized: None,
            masked_display_text: None,
            denied_display_text: None,
        })
        .map_err(|_| Error::Internal)?;
        if let Some(mut event) = plan.event {
            if let Some(details) = event.details.as_mut().and_then(Value::as_object_mut) {
                details.insert("projectId".into(), json!(project_id));
            }
            insert_security_event(&mut *session.connection, &event).await?;
        }
        plans.push(plan.fields);
    }
    let selected = plans
        .iter()
        .enumerate()
        .map(|(index, fields)| {
            let severity = fields
                .values()
                .map(|field| match field.mode.as_str() {
                    "full" => 0,
                    "summary" => 1,
                    "masked" => 2,
                    _ => 3,
                })
                .max()
                .unwrap_or(3);
            (index, severity)
        })
        .max_by_key(|(_, severity)| *severity)
        .map(|(index, _)| index)
        .ok_or(Error::Internal)?;
    plans
        .get(selected)
        .ok_or(Error::Internal)?
        .iter()
        .map(|(key, value)| {
            serde_json::to_value(value)
                .map(|v| (key.clone(), v))
                .map_err(|_| Error::Internal)
        })
        .collect()
}
