//! A controlled version of an already Active contract. No receipt is copied or replayed.
use super::{
    model::{data_uuid, data_version, date_only, optional_string, optional_value, uuid_value},
    store,
};
use crate::{
    approval_common::{
        CommonSession, DomainDecisionOutcome, Text, js::Value, service::object, store as common,
    },
    contract_support::{
        Actor, AuditWrite, Error, audit, audit_identity, contract_fact, expected_version,
        lock_project, money, money_string, new_uuid, ratio, ratio_string, require_uuid,
    },
};
use serde_json::{Value as Json, json};
use uuid::Uuid;

fn text<'a>(v: &'a Json, key: &str) -> Result<&'a str, Error> {
    v[key].as_str().ok_or(Error::Internal)
}
fn uid(v: &Json, key: &str) -> Result<Uuid, Error> {
    require_uuid(v, key)
}
async fn amendment(session: &mut CommonSession<'_, '_>, key: Uuid) -> Result<Json, Error> {
    sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.contract_amendment a WHERE id=$1 AND producer_version=1 FOR UPDATE").bind(key).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::NotFound("正式合同变更不存在。".into()))
}
pub async fn prepare_amendment_readiness(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    contract: Uuid,
    readiness: Uuid,
    input: &Json,
    actor: &Actor,
) -> Result<Uuid, Error> {
    lock_project(session.connection, project).await?;
    let fact = contract_fact(session.connection, contract, Some(project), true)
        .await?
        .ok_or(Error::Internal)?;
    if fact.status != "active" || fact.current_snapshot_id != Some(uid(input, "sourceSnapshotId")?)
    {
        return Err(Error::Conflict(
            "变更必须引用本合同当前真实生效快照。".into(),
        ));
    }
    let real_snapshot:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.contract_term_snapshot WHERE id=$1 AND contract_id=$2 AND snapshot_status='active' AND source_preparation_id IS NOT NULL AND payload_hash IS NOT NULL)")
        .bind(uid(input,"sourceSnapshotId")?).bind(contract).fetch_one(&mut *session.connection).await?;
    if !real_snapshot {
        return Err(Error::Conflict("变更前缺少真实生效来源。".into()));
    }
    expected_version(
        &json!({"expectedVersion":input["expectedContractVersion"]}),
        fact.row_version,
        "contract",
    )?;
    let reason = text(input, "reason")?.trim();
    if reason.is_empty() {
        return Err(Error::BadRequest("须提供正式变更原因。".into()));
    }
    let package:Json=sqlx::query_scalar("SELECT to_jsonb(p) FROM poms.contract_readiness_package p WHERE id=$1 AND contract_id=$2 FOR UPDATE").bind(readiness).bind(contract).fetch_one(&mut *session.connection).await?;
    let open:Option<Json>=sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.contract_amendment a WHERE contract_id=$1 AND producer_version=1 AND status IN ('draft','submitted','approved') FOR UPDATE").bind(contract).fetch_optional(&mut *session.connection).await?;
    let key = if let Some(open) = open {
        if open["status"] != "draft" || open["before_snapshot_id"] != input["sourceSnapshotId"] {
            return Err(Error::Conflict(
                "已有待审或待生效变更，不能改写其准备来源。".into(),
            ));
        }
        let key = uid(&open, "id")?;
        sqlx::query("UPDATE poms.contract_amendment SET source_readiness_id=$2,source_preparation_id=null,payload_hash=$3,amendment_reason=$4,updated_by=$5,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND status='draft'").bind(key).bind(readiness).bind(text(&package,"payload_hash")?).bind(reason).bind(actor.id).execute(&mut *session.connection).await?;
        key
    } else {
        let version: i32 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version),0)+1 FROM poms.contract_amendment WHERE contract_id=$1",
        )
        .bind(contract)
        .fetch_one(&mut *session.connection)
        .await?;
        let previous: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM poms.contract_amendment WHERE contract_id=$1 AND is_current FOR UPDATE",
        )
        .bind(contract)
        .fetch_optional(&mut *session.connection)
        .await?;
        let key = new_uuid()?;
        sqlx::query("INSERT INTO poms.contract_amendment(id,contract_id,version,is_current,supersedes_id,status,created_by,updated_by,producer_version,project_id,source_readiness_id,before_snapshot_id,amendment_reason,payload_hash) VALUES($1,$2,$3,false,$4,'draft',$5,$5,1,$6,$7,$8,$9,$10)")
            .bind(key).bind(contract).bind(version).bind(previous).bind(actor.id).bind(project).bind(readiness).bind(fact.current_snapshot_id).bind(reason).bind(text(&package,"payload_hash")?).execute(&mut *session.connection).await?;
        key
    };
    sqlx::query("UPDATE poms.contract_readiness_package SET contract_amendment_id=$2 WHERE id=$1")
        .bind(readiness)
        .bind(key)
        .execute(&mut *session.connection)
        .await?;
    audit(session,actor,AuditWrite{operation_id:"ContractReadinessController_createContractReadinessPackage".into(),target_type:"contract-amendment".into(),target_id:key,project_id:project,contract_id:Some(contract),before:None,after:Some(json!({"status":"draft","readinessId":readiness,"beforeSnapshotId":fact.current_snapshot_id})),reason:Some(reason.into()),metadata:json!({"requiredSensitivePackages":["contract-finance"],"payloadHash":package["payload_hash"],"contractStillActive":true})}).await?;
    Ok(key)
}
pub async fn validate_amendment_preparation(
    session: &mut CommonSession<'_, '_>,
    key: Uuid,
    contract: Uuid,
    readiness: Uuid,
) -> Result<(), Error> {
    let a = amendment(session, key).await?;
    let fact = contract_fact(
        session.connection,
        contract,
        Some(uid(&a, "project_id")?),
        true,
    )
    .await?
    .ok_or(Error::Internal)?;
    if uid(&a, "contract_id")? != contract
        || uid(&a, "source_readiness_id")? != readiness
        || fact.status != "active"
        || fact.current_snapshot_id != Some(uid(&a, "before_snapshot_id")?)
        || !matches!(
            a["status"].as_str(),
            Some("draft" | "submitted" | "approved")
        )
    {
        return Err(Error::CodedConflict {
            code: "source_changed",
            message: "变更前生效口径或精确准备来源已变化。".into(),
        });
    }
    Ok(())
}
pub async fn apply_amendment_review(
    session: &mut CommonSession<'_, '_>,
    contract: Uuid,
    approval: Uuid,
    approved: bool,
    actor: Uuid,
) -> Result<Option<DomainDecisionOutcome>, Error> {
    let Some(binding) = store::review_binding(session.connection, approval, true).await? else {
        return Ok(None);
    };
    let Some(key) = binding.amendment_id else {
        return Ok(None);
    };
    let a = amendment(session, key).await?;
    if binding.contract_id != contract
        || uid(&a, "source_preparation_id")? != binding.preparation_id
        || uid(&a, "source_review_id")? != approval
        || a["payload_hash"] != binding.payload_hash
        || a["status"] != "submitted"
    {
        return Err(Error::Conflict("变更审核并未精确绑定当前准备。".into()));
    }
    let prepared = crate::contract_readiness::load_preparation(
        session,
        contract,
        binding.preparation_id,
        approved,
    )
    .await?;
    if prepared["payloadHash"] != binding.payload_hash
        || prepared["contractAmendmentId"] != key.to_string()
    {
        return Err(Error::Conflict("变更准备内容校验失败。".into()));
    }
    let status = if approved { "approved" } else { "voided" };
    let changed=sqlx::query("UPDATE poms.contract_amendment SET status=$2,updated_by=$3,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND status='submitted' AND row_version=$4")
        .bind(key).bind(status).bind(actor).bind(a["row_version"].as_i64().ok_or(Error::Internal)? as i32).execute(&mut *session.connection).await?;
    if changed.rows_affected() != 1 {
        return Err(Error::Conflict("变更审核版本已变化。".into()));
    }
    let request_id = session.request_id.clone();
    audit_identity(session,actor,request_id.as_deref(),AuditWrite{operation_id:if approved{"ApprovalController_approveRecord"}else{"ApprovalController_rejectRecord"}.into(),target_type:"contract-amendment".into(),target_id:key,project_id:uid(&a,"project_id")?,contract_id:Some(contract),before:Some(json!({"status":"submitted"})),after:Some(json!({"status":status,"contractStatus":"active"})),reason:None,metadata:json!({"approvalRecordId":approval,"preparationId":binding.preparation_id,"payloadHash":binding.payload_hash})}).await?;
    Ok(Some(DomainDecisionOutcome {
        target_id: Text::from(contract.to_string()),
        target_type: Text::from("contract"),
        business_status_after: Text::from("active"),
        snapshot_id: None,
    }))
}
pub(super) async fn activate(
    session: &mut CommonSession<'_, '_>,
    contract: Uuid,
    body: &Json,
    actor: &Actor,
) -> Result<Json, Error> {
    let record = store::locked_contract(session, contract).await?;
    expected_version(body, data_version(&record.data)?, "contract")?;
    let key = uid(body, "contractAmendmentId")?;
    let approval = uid(body, "approvalRecordId")?;
    let a = amendment(session, key).await?;
    let project = uid(&a, "project_id")?;
    if uid(&a, "contract_id")? != contract
        || data_uuid(&record.data, "projectId")? != project
        || uid(&a, "source_review_id")? != approval
    {
        return Err(Error::Conflict("变更和审核归属不一致。".into()));
    }
    let binding = store::review_binding(session.connection, approval, true)
        .await?
        .ok_or(Error::Internal)?;
    if binding.amendment_id != Some(key)
        || uid(&a, "source_preparation_id")? != binding.preparation_id
        || a["payload_hash"] != binding.payload_hash
    {
        return Err(Error::Conflict("变更审核绑定内容已变化。".into()));
    }
    if a["status"] == "effective" {
        let fact = contract_fact(session.connection, contract, Some(project), true)
            .await?
            .ok_or(Error::Internal)?;
        if fact.current_snapshot_id != Some(uid(&a, "after_snapshot_id")?) {
            return Err(Error::Conflict("变更已不是当前有效口径。".into()));
        }
        let plan = crate::contract_readiness::initialize_plan_from_effective_snapshot(
            session,
            uid(&a, "source_readiness_id")?,
            contract,
            actor,
            "ContractController_activate",
        )
        .await?;
        let snapshot = store::snapshot(session.connection, uid(&a, "after_snapshot_id")?)
            .await?
            .ok_or(Error::Internal)?;
        return Ok(
            json!({"targetId":contract,"targetType":"contract","resultStatus":"activated","businessStatusAfter":"active","approvalRecordId":approval,"confirmationRecordId":null,"todoItemIds":[],"snapshotId":a["after_snapshot_id"],"preparationId":binding.preparation_id,"contractAmendmentId":key,"beforeSnapshotId":a["before_snapshot_id"],"snapshotVersion":snapshot.version,"planVersionId":plan["planVersionId"]}),
        );
    }
    if a["status"] != "approved" {
        return Err(Error::BadRequest("变更尚未获批准。".into()));
    }
    let approved:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.approval_record WHERE id=$1 AND target_object_id=$2 AND target_object_type='contract' AND approval_type='contract-review' AND current_status='approved')").bind(approval).bind(contract).fetch_one(&mut *session.connection).await?;
    if !approved {
        return Err(Error::BadRequest("正式审核未批准。".into()));
    }
    let prepared = crate::contract_readiness::load_preparation(
        session,
        contract,
        binding.preparation_id,
        true,
    )
    .await?;
    if prepared["payloadHash"] != binding.payload_hash
        || prepared["contractAmendmentId"] != key.to_string()
    {
        return Err(Error::Conflict("变更精确内容已变化。".into()));
    }
    let before = uid(&a, "before_snapshot_id")?;
    let snapshot = new_uuid()?;
    let at = crate::auth::model::clock_now();
    let version: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version),0)+1 FROM poms.contract_term_snapshot WHERE contract_id=$1",
    )
    .bind(contract)
    .fetch_one(&mut *session.connection)
    .await?;
    let inclusive = money_string(money(text(&prepared, "amountTaxInclusive")?)?);
    let exclusive = money_string(money(text(&prepared, "amountTaxExclusive")?)?);
    let due = prepared["retentionDueDate"]
        .as_str()
        .map(|v| date_only(v, "retentionDueDate"))
        .transpose()?;
    let updated=sqlx::query("UPDATE poms.contract_term_snapshot SET snapshot_status='superseded' WHERE id=$1 AND contract_id=$2 AND snapshot_status='active'").bind(before).bind(contract).execute(&mut *session.connection).await?;
    if updated.rows_affected() != 1 {
        return Err(Error::Conflict("变更前快照已失效。".into()));
    }
    sqlx::query("INSERT INTO poms.contract_term_snapshot(id,contract_id,effective_at,effective_by,retention_due_date,amount_tax_inclusive,amount_tax_exclusive,tax_rate,down_payment_rate,retention_rate,payment_terms,source_readiness_id,source_baseline_id,version,snapshot_status,created_at,created_by,row_version,source_preparation_id,receivable_plan_seeds,payload_hash,source_amendment_id) VALUES($1,$2,$3,$4,$5,$6::numeric,$7::numeric,$8::numeric,$9::numeric,$10::numeric,$11,$12,$13,$14,'active',$3,$4,1,$15,$16,$17,$18)")
        .bind(snapshot).bind(contract).bind(at).bind(actor.id).bind(due).bind(&inclusive).bind(&exclusive).bind(ratio_string(ratio(text(&prepared,"taxRate")?)?)).bind(ratio_string(ratio(text(&prepared,"downPaymentRate")?)?)).bind(ratio_string(ratio(text(&prepared,"retentionRate")?)?)).bind(text(&prepared,"paymentTerms")?).bind(uid(&prepared,"sourceReadinessId")?).bind(uid(&prepared,"sourceBaselineId")?).bind(version).bind(binding.preparation_id).bind(&prepared["receivablePlanSeeds"]).bind(&binding.payload_hash).bind(key).execute(&mut *session.connection).await?;
    let updated=sqlx::query("UPDATE poms.contract_term_preparation SET status='activated',activated_snapshot_id=$2,activated_at=$3,activated_by=$4,updated_at=$3,row_version=row_version+1 WHERE id=$1 AND is_current AND status='prepared' AND payload_hash=$5 AND contract_amendment_id=$6").bind(binding.preparation_id).bind(snapshot).bind(at).bind(actor.id).bind(&binding.payload_hash).bind(key).execute(&mut *session.connection).await?;
    if updated.rows_affected() != 1 {
        return Err(Error::Conflict("变更准备版本已变化。".into()));
    }
    let updated=sqlx::query("UPDATE poms.contract_readiness_package SET initialized_contract_snapshot_id=$2,contract_snapshot_initialized_at=$3,updated_by=$4,updated_at=$3,row_version=row_version+1 WHERE id=$1 AND contract_amendment_id=$5 AND current_preparation_id=$6 AND is_current").bind(uid(&a,"source_readiness_id")?).bind(snapshot).bind(at).bind(actor.id).bind(key).bind(binding.preparation_id).execute(&mut *session.connection).await?;
    if updated.rows_affected() != 1 {
        return Err(Error::Conflict("变更就绪来源版本已变化。".into()));
    }
    common::assign(
        session.state,
        record.handle,
        object([
            ("status", Value::text("active")),
            ("currentSnapshotId", uuid_value(snapshot)),
            ("signedAmount", Value::text(inclusive)),
            (
                "retentionDueDate",
                optional_value(due.map(|d| d.to_string())),
            ),
            ("updatedBy", uuid_value(actor.id)),
        ]),
    )?;
    common::persist(session.state, record.handle)?;
    common::flush(session).await?;
    let plan = crate::contract_readiness::initialize_plan_from_effective_snapshot(
        session,
        uid(&a, "source_readiness_id")?,
        contract,
        actor,
        "ContractController_activate",
    )
    .await?;
    // The new schedule is complete; old nodes/receipts remain historical. Never INSERT receipt_record here.
    sqlx::query("UPDATE poms.contract_amendment SET is_current=false,status='superseded',updated_at=$2,updated_by=$3,row_version=row_version+1 WHERE contract_id=$1 AND is_current").bind(contract).bind(at).bind(actor.id).execute(&mut *session.connection).await?;
    let updated=sqlx::query("UPDATE poms.contract_amendment SET status='effective',is_current=true,after_snapshot_id=$2,effective_at=$3,effective_by=$4,updated_by=$4,updated_at=$3,row_version=row_version+1 WHERE id=$1 AND status='approved' AND payload_hash=$5").bind(key).bind(snapshot).bind(at).bind(actor.id).bind(&binding.payload_hash).execute(&mut *session.connection).await?;
    if updated.rows_affected() != 1 {
        return Err(Error::Conflict("变更生效版本已变化。".into()));
    }
    audit(session,actor,AuditWrite{operation_id:"ContractController_activate".into(),target_type:"contract-amendment".into(),target_id:key,project_id:project,contract_id:Some(contract),before:Some(json!({"status":"approved","snapshotId":before})),after:Some(json!({"status":"effective","snapshotId":snapshot,"planVersionId":plan["planVersionId"]})),reason:optional_string(body,"comment")?,metadata:json!({"requiredSensitivePackages":["contract-finance"],"approvalRecordId":approval,"preparationId":binding.preparation_id,"payloadHash":binding.payload_hash,"snapshotVersion":version,"existingReceiptsNotReplayed":true})}).await?;
    Ok(
        json!({"targetId":contract,"targetType":"contract","resultStatus":"activated","businessStatusAfter":"active","approvalRecordId":approval,"confirmationRecordId":null,"todoItemIds":[],"snapshotId":snapshot,"preparationId":binding.preparation_id,"contractAmendmentId":key,"beforeSnapshotId":before,"snapshotVersion":version,"planVersionId":plan["planVersionId"]}),
    )
}
