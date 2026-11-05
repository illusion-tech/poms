use std::collections::HashMap;

use serde_json::{Value as Json, json};
use uuid::Uuid;

use super::{
    model::{
        data_instant, data_optional_text, data_optional_uuid, data_text, data_uuid, data_version,
        instant,
    },
    store::{ProjectLabel, SnapshotRecord},
};
use crate::{
    approval_common::{CommonSession, js::Data, store as common},
    auth::{audit::insert_security_event, projection as sensitive},
    contract_support::{Actor, Error},
    shared::generated::SensitiveFieldPackageKey,
};

async fn fields(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    target_type: &str,
    target_id: Uuid,
    fields: Vec<sensitive::StringField>,
) -> Result<HashMap<String, sensitive::StringFieldProjection>, Error> {
    let plan = sensitive::plan(&sensitive::ProjectionInput {
        field_package_key: SensitiveFieldPackageKey::ContractFinance,
        fields,
        user: Some(sensitive::ProjectionUser {
            sub: actor.id,
            username: actor.session.user.username.clone(),
            permissions: actor
                .session
                .user
                .permissions
                .iter()
                .map(|permission| permission.as_str().to_owned())
                .collect(),
        }),
        target_type: target_type.into(),
        target_id: target_id.to_string(),
        request_context: actor.request_context.clone(),
        mode_when_unauthorized: None,
        masked_display_text: None,
        denied_display_text: None,
    })
    .map_err(|_| Error::Internal)?;
    if let Some(event) = plan.event {
        // A hidden result is returned only after its actual audit INSERT. This
        // uses the same outer transaction and consumes pending auth at most once.
        insert_security_event(&mut *session.connection, &event).await?;
        common::flush(session).await?;
    }
    Ok(plan.fields)
}

fn string_field(key: &str, value: Option<String>) -> sensitive::StringField {
    sensitive::StringField {
        key: key.into(),
        display_text_when_full: value.clone(),
        raw_value: value,
        masked_display_text: None,
        denied_display_text: None,
    }
}

pub(super) async fn contract_summary(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    contract: &Data,
    project: Option<&ProjectLabel>,
) -> Result<Json, Error> {
    let id = data_uuid(contract, "id")?;
    let signed_amount = data_text(contract, "signedAmount")?;
    let currency = data_text(contract, "currencyCode")?;
    let mut projected = fields(
        session,
        actor,
        "contract",
        id,
        vec![sensitive::StringField {
            key: "signedAmountProjection".into(),
            display_text_when_full: Some(format!("{signed_amount} {currency}")),
            raw_value: Some(signed_amount),
            masked_display_text: None,
            denied_display_text: None,
        }],
    )
    .await?;
    let amount = projected
        .remove("signedAmountProjection")
        .ok_or(Error::Internal)?;
    Ok(json!({
        "id": id,
        "projectId": data_uuid(contract, "projectId")?,
        "projectName": project.map(|project| project.name.as_str()).unwrap_or(""),
        "customerName": project.and_then(|project| project.customer.as_deref()),
        "contractNo": data_text(contract, "contractNo")?,
        "customerContractNo": data_optional_text(contract, "customerContractNo")?,
        "status": data_text(contract, "status")?,
        "signedAmountProjection": amount,
        "currencyCode": currency,
        "currentSnapshotId": data_optional_uuid(contract, "currentSnapshotId")?,
        "signedAt": data_instant(contract, "signedAt")?,
        "retentionDueDate": data_optional_text(contract, "retentionDueDate")?,
        "rowVersion": data_version(contract)?,
        "createdAt": data_instant(contract, "createdAt")?.ok_or(Error::Internal)?,
        "createdBy": data_optional_uuid(contract, "createdBy")?,
        "updatedAt": data_instant(contract, "updatedAt")?.ok_or(Error::Internal)?,
        "updatedBy": data_optional_uuid(contract, "updatedBy")?
    }))
}

pub(super) async fn snapshot_summary(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    snapshot: &SnapshotRecord,
) -> Result<Json, Error> {
    let projected = fields(
        session,
        actor,
        "ContractSnapshot",
        snapshot.id,
        vec![
            string_field(
                "amountTaxInclusiveProjection",
                snapshot.amount_tax_inclusive.clone(),
            ),
            string_field(
                "amountTaxExclusiveProjection",
                snapshot.amount_tax_exclusive.clone(),
            ),
            string_field("taxRateProjection", snapshot.tax_rate.clone()),
            string_field(
                "downPaymentRateProjection",
                snapshot.down_payment_rate.clone(),
            ),
            string_field("retentionRateProjection", snapshot.retention_rate.clone()),
            string_field("paymentTermsProjection", snapshot.payment_terms.clone()),
        ],
    )
    .await?;
    let field = |key: &str| projected.get(key).ok_or(Error::Internal);
    Ok(json!({
        "id": snapshot.id,
        "contractId": snapshot.contract_id,
        "effectiveAt": instant(snapshot.effective_at),
        "effectiveBy": snapshot.effective_by,
        "retentionDueDate": snapshot.retention_due_date.map(|date| date.to_string()),
        "amountTaxInclusiveProjection": field("amountTaxInclusiveProjection")?,
        "amountTaxExclusiveProjection": field("amountTaxExclusiveProjection")?,
        "taxRateProjection": field("taxRateProjection")?,
        "downPaymentRateProjection": field("downPaymentRateProjection")?,
        "retentionRateProjection": field("retentionRateProjection")?,
        "paymentTermsProjection": field("paymentTermsProjection")?,
        "sourceReadinessId": snapshot.source_readiness_id,
        "sourceBaselineId": snapshot.source_baseline_id,
        "sourcePreparationId": snapshot.source_preparation_id,
        "version": snapshot.version,
        "snapshotStatus": snapshot.status,
        "createdAt": instant(snapshot.created_at),
        "createdBy": snapshot.created_by,
        "rowVersion": snapshot.row_version
    }))
}
