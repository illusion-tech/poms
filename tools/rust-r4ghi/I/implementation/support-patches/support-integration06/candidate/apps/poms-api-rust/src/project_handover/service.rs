use super::{
    model::*,
    sources::{self, Sources},
    view,
};
use crate::{
    approval_common::{CommonSession, schema::Table, store as common},
    contract_support::{Actor, Error, canonical_hash, expected_version, lock_project, new_uuid},
};
use serde_json::{Value, json};
use sqlx::Connection;
use std::collections::BTreeSet;
use uuid::Uuid;

pub async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation_id: &str,
    key: Option<Uuid>,
    _query: &Value,
    body: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    if !session.connection.is_in_transaction() {
        return Err(Error::Internal);
    }
    let name = operation_id.rsplit('_').next().unwrap_or(operation_id);
    match name {
        "getContractHandoverSummary" | "getProjectHandoverDetailByProject" => {
            let project = key.ok_or(Error::Internal)?;
            let h = sources::current(session, project).await?;
            let inherited = match h.as_ref() {
                Some(h) if h["producer_version"] == 1 => {
                    Some(sources::basis(session, h).await?["source_payload"].clone())
                }
                _ => None,
            };
            let s = sources::collect(session, project, false, inherited.as_ref()).await?;
            if name == "getContractHandoverSummary" {
                view::summary(session, actor, &s, h.as_ref()).await
            } else {
                view::detail(session, actor, &s, h.as_ref()).await
            }
        }
        "getProjectHandoverDetailByHandover" => {
            let h = sources::row(session, key.ok_or(Error::Internal)?, false).await?;
            let inherited = if h["producer_version"] == 1 {
                Some(sources::basis(session, &h).await?["source_payload"].clone())
            } else {
                None
            };
            let s =
                sources::collect(session, id(&h, "project_id")?, false, inherited.as_ref()).await?;
            view::detail(session, actor, &s, Some(&h)).await
        }
        "prepareProjectHandover" => {
            require_write(actor)?;
            let project = key.ok_or(Error::Internal)?;
            let h = prepare(session, actor, project, body, None, None, None).await?;
            let s = sources::fresh(session, &h).await?;
            view::detail(session, actor, &s, Some(&h)).await
        }
        "confirmProjectHandoverParticipant" => {
            self_confirm(
                session,
                actor,
                key.ok_or(Error::Internal)?,
                body,
                operation_id,
            )
            .await
        }
        "confirmProjectHandover" => {
            finalize(
                session,
                actor,
                key.ok_or(Error::Internal)?,
                body,
                operation_id,
            )
            .await
        }
        "rebaselineContractHandover" => rebaseline(session, actor, body, operation_id).await,
        _ => Err(Error::Internal),
    }
}
fn require_write(actor: &Actor) -> Result<(), Error> {
    if permission(actor, "project:write") {
        Ok(())
    } else {
        Err(Error::Forbidden("无项目写入权限。".into()))
    }
}
fn exact(body: &Value, field: &str, actual: &Value) -> Result<(), Error> {
    if body.get(field) == Some(actual) {
        Ok(())
    } else {
        Err(changed())
    }
}

fn validate_duties(body: &Value, owner: Uuid) -> Result<(), Error> {
    let users = body["participants"]
        .as_array()
        .filter(|v| !v.is_empty())
        .ok_or_else(|| Error::BadRequest("必须指定移交职责。".into()))?;
    let mut user_set = BTreeSet::new();
    let mut roles = BTreeSet::new();
    let mut execution = Vec::new();
    for user in users {
        let uid = id(user, "userId")?;
        if !user_set.insert(uid) {
            return Err(Error::BadRequest("同一人员只能登记一次。".into()));
        }
        let responsibilities = user["responsibilities"]
            .as_array()
            .filter(|v| !v.is_empty())
            .ok_or_else(|| Error::BadRequest("人员职责不能为空。".into()))?;
        let mut own = BTreeSet::new();
        for r in responsibilities {
            let role = text(r, "roleKey")?;
            if ![
                "execution-owner",
                "sales-owner",
                "business-admin",
                "technical-support",
                "finance",
            ]
            .contains(&role)
                || !own.insert(role)
            {
                return Err(Error::BadRequest("职责无效或重复。".into()));
            }
            if text(r, "responsibilitySummary")?.trim().is_empty() {
                return Err(Error::BadRequest("须明确责任说明。".into()));
            }
            if role == "sales-owner" && uid != owner {
                return Err(Error::BadRequest("销售主责必须与项目正式主责一致。".into()));
            }
            if role == "execution-owner" {
                execution.push(uid);
            }
            roles.insert(role);
        }
    }
    if execution.len() != 1 || execution[0] != id(body, "executionOwnerUserId")? {
        return Err(Error::BadRequest("须明确唯一执行负责人。".into()));
    }
    for role in [
        "execution-owner",
        "sales-owner",
        "business-admin",
        "technical-support",
    ] {
        if !roles.contains(role) {
            return Err(Error::BadRequest("移交关键职责尚未齐备。".into()));
        }
    }
    if body["financeConfirmationRequired"] == true && !roles.contains("finance") {
        return Err(Error::BadRequest("须指定财务确认职责。".into()));
    }
    if !matches!(
        body["receiptJudgmentMode"].as_str(),
        Some("project-aggregate" | "contract-separate")
    ) {
        return Err(Error::BadRequest("回款判断模式无效。".into()));
    }
    Ok(())
}
async fn close_previous(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    h: &Value,
) -> Result<(), Error> {
    if h["producer_version"] != 1 {
        return Ok(());
    }
    if h["status"] == "draft" {
        let confirmation = id(h, "confirmation_record_id")?;
        assign(session,Table::Confirmation,confirmation,json!({"status":"closed","closedAt":now(),"closedBy":actor.id,"closeReason":"移交材料新版本替代。","updatedBy":actor.id})).await?;
        let ids:Vec<Uuid>=sqlx::query_scalar("SELECT id FROM poms.confirmation_participant WHERE confirmation_record_id=$1 AND participant_status='pending' ORDER BY id FOR UPDATE").bind(confirmation).fetch_all(&mut *session.connection).await?;
        for key in ids {
            assign(
                session,
                Table::Participant,
                key,
                json!({"participantStatus":"closed","updatedBy":actor.id}),
            )
            .await?;
        }
        let todos:Vec<Uuid>=sqlx::query_scalar("SELECT id FROM poms.todo_item WHERE source_type='confirmation-record' AND source_id=$1 AND status IN ('open','processing') ORDER BY id FOR UPDATE").bind(confirmation).fetch_all(&mut *session.connection).await?;
        for key in todos {
            assign(
                session,
                Table::Todo,
                key,
                json!({"status":"canceled","completedAt":now()}),
            )
            .await?;
        }
        common::flush(session).await?;
    }
    sqlx::query("UPDATE poms.project_handover SET is_current=false,status=CASE WHEN status='draft' THEN 'superseded' ELSE status END,updated_by=$2,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND is_current").bind(id(h,"id")?).bind(actor.id).execute(&mut *session.connection).await?;
    sqlx::query("UPDATE poms.project_handover_basis_snapshot SET is_current=false,status='superseded',row_version=row_version+1 WHERE id=$1 AND is_current").bind(id(h,"basis_snapshot_id")?).execute(&mut *session.connection).await?;
    Ok(())
}
async fn summary_snapshot(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    project: Uuid,
    target: Uuid,
    kind: &str,
    package: &str,
    snapshot: Uuid,
) -> Result<(), Error> {
    let definition:Uuid=sqlx::query_scalar("SELECT id FROM poms.approval_summary_package_definition WHERE approval_scenario_key='handover-confirmation' AND summary_package_key=$1 AND projection_level='handover-confirmation' AND export_policy='handover-controlled' AND field_rule_version='r4d-v1' AND status='active'").bind(package).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::Conflict("正式移交摘要定义尚未部署。".into()))?;
    let previous:Option<Uuid>=sqlx::query_scalar("SELECT id FROM poms.approval_summary_snapshot WHERE target_type=$1 AND target_id=$2 AND approval_scenario_key='handover-confirmation' AND projection_level='handover-confirmation' AND status='active' FOR UPDATE").bind(kind).bind(target).fetch_optional(&mut *session.connection).await?;
    if let Some(previous) = previous {
        assign(
            session,
            Table::Snapshot,
            previous,
            json!({"status":"superseded","updatedBy":actor.id}),
        )
        .await?;
        common::flush(session).await?;
    }
    create(
        session,
        Table::Snapshot,
        json!({"id":snapshot,"targetType":kind,"targetId":target,"approvalScenarioKey":"handover-confirmation","summaryPackageId":definition,"summaryPackageKey":package,"projectionLevel":"handover-confirmation","exportPolicy":"handover-controlled","businessStatusAtSnapshot":"draft","generatedAt":now(),"status":"active","supersedesId":previous,"createdBy":actor.id,"updatedBy":actor.id}),
    )?;
    common::flush(session).await?;
    for (order, key) in [
        "project.identity",
        "contracts.members",
        "contracts.sources",
        "scope.items",
        "risk.items",
        "cost.baseline-reference",
        "responsibilities",
        "receipt-policy",
        "attachment-materials",
    ]
    .iter()
    .enumerate()
    {
        create(
            session,
            Table::Projection,
            json!({"id":new_uuid()?,"summarySnapshotId":snapshot,"fieldKey":key,"visibilityLevel":if *key=="contracts.members"{"summary"}else{"minimum-confirmation"},"maskingMode":if *key=="contracts.members"{"field-package"}else{"none"},"exportPolicy":"handover-controlled","fieldOrder":order,"channelScopeSummary":"同一已固定材料；操作范围和风险沿既有项目读取授权，结构化金融字段按 contract-finance 投影。","createdBy":actor.id}),
        )?;
    }
    common::flush(session).await?;
    let _ = project;
    Ok(())
}
async fn prepare(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    project: Uuid,
    body: &Value,
    anchor: Option<Uuid>,
    old_override: Option<Value>,
    lineage: Option<Vec<Value>>,
) -> Result<Value, Error> {
    lock_project(session.connection, project).await?;
    if anchor.is_none() {
        crate::project_action_authorization::require(
            session,
            actor,
            crate::project_action_authorization::ProjectAction::PrepareHandover,
            crate::project_action_authorization::ProjectActionTarget::Project { id: project },
        )
        .await?;
    }
    let old = match old_override {
        Some(v) => Some(v),
        None => sources::current(session, project).await?,
    };
    let inherited = match &old {
        Some(h) if h["producer_version"] == 1 => {
            Some(sources::basis(session, h).await?["source_payload"].clone())
        }
        _ => None,
    };
    let s = sources::collect(session, project, true, inherited.as_ref()).await?;
    if !s.blockers.is_empty() {
        return Err(Error::Conflict(
            "真实合同承接来源或正式回款计划尚未齐备。".into(),
        ));
    }
    exact(body, "expectedSourceHash", &json!(s.hash))?;
    exact(body, "expectedProjectVersion", &s.project["row_version"])?;
    if anchor.is_none()
        && old
            .as_ref()
            .is_some_and(|h| h["producer_version"] == 1 && h["is_current"] == true)
        && inherited
            .as_ref()
            .is_some_and(|v| sources::contract_changed(v, &s.members))
    {
        return Err(Error::CodedConflict {
            code: "handover_rebaseline_required",
            message: "原承接合同口径已变更，须通过真实再基线化确认影响范围。".into(),
        });
    }
    let inherited_rebaseline = if anchor.is_none() {
        old.as_ref()
            .filter(|h| h["producer_version"] == 1 && h["is_current"] == true)
            .and_then(|h| h["handover_rebaseline_record_id"].as_str())
            .map(|v| Uuid::parse_str(v).map_err(|_| Error::Internal))
            .transpose()?
    } else {
        None
    };
    if let Some(rebaseline) = inherited_rebaseline {
        let valid:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.contract_handover_rebaseline_record WHERE id=$1 AND project_id=$2 AND producer_version=1 AND status='effective' AND effective_baseline_after_id=$3)")
            .bind(rebaseline).bind(project).bind(old.as_ref().map(|h|id(h,"effective_handover_baseline_snapshot_id")).transpose()?).fetch_one(&mut *session.connection).await?;
        if !valid {
            return Err(changed());
        }
    }
    validate_duties(body, id(&s.project, "owner_user_id")?)?;
    let frozen_mode:Option<String>=sqlx::query_scalar("SELECT receipt_judgment_mode FROM poms.project_receipt_judgment_freeze WHERE project_id=$1 AND is_current").bind(project).fetch_optional(&mut *session.connection).await?;
    if frozen_mode
        .as_deref()
        .is_some_and(|mode| body["receiptJudgmentMode"] != mode)
    {
        return Err(Error::Conflict(
            "已有回款判断模式冻结，本次移交准备须沿用已冻结模式。".into(),
        ));
    }
    if let Some(h) = old.as_ref().filter(|h| h["is_current"] == true) {
        exact(body, "expectedCurrentHandoverVersion", &h["version"])?;
        if h["status"] == "confirmed" && h["source_payload_hash"] == s.hash {
            return Err(Error::Conflict("已有同来源的正式确认移交。".into()));
        }
    }
    let users = body["participants"].as_array().ok_or(Error::Internal)?;
    let mut names = std::collections::BTreeMap::new();
    for user in users {
        let key = id(user, "userId")?;
        let name: Option<String> = sqlx::query_scalar(
            "SELECT display_name FROM poms.platform_user WHERE id=$1 AND is_active FOR SHARE",
        )
        .bind(key)
        .fetch_optional(&mut *session.connection)
        .await?;
        names.insert(
            key,
            name.ok_or_else(|| Error::BadRequest("参与人无效或已停用。".into()))?,
        );
    }
    let handover = new_uuid()?;
    let basis = new_uuid()?;
    let cs = new_uuid()?;
    let hs = new_uuid()?;
    let confirmation = new_uuid()?;
    let version: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version),0)+1 FROM poms.project_handover WHERE project_id=$1",
    )
    .bind(project)
    .fetch_one(&mut *session.connection)
    .await?;
    if let Some(h) = &old {
        close_previous(session, actor, h).await?;
    }
    let mut lineages = inherited
        .as_ref()
        .and_then(|v| v["rebaselineChains"].as_array())
        .cloned()
        .unwrap_or_default();
    if let Some(lineage) = lineage {
        lineages.extend(lineage);
    }
    let payload = json!({"projectId":project,"salesOwnerUserId":s.project["owner_user_id"],"members":s.members,"materials":s.materials,"participants":users,"executionOwnerUserId":body["executionOwnerUserId"],"financeConfirmationRequired":body["financeConfirmationRequired"],"receiptJudgmentMode":body["receiptJudgmentMode"],"rebaselineChains":lineages});
    let payload_hash = canonical_hash(&payload)?;
    sqlx::query("INSERT INTO poms.project_handover_basis_snapshot(id,project_id,version,source_payload,source_hash,payload_hash,status,is_current,supersedes_id,generated_by) VALUES($1,$2,$3,$4,$5,$6,'active',true,$7,$8)").bind(basis).bind(project).bind(version).bind(&payload).bind(&s.hash).bind(&payload_hash).bind(old.as_ref().and_then(|h|id(h,"basis_snapshot_id").ok())).bind(actor.id).execute(&mut *session.connection).await?;
    let selected = match (anchor, inherited_rebaseline) {
        (Some(anchor), _) => anchor,
        (None, Some(_)) => id(
            old.as_ref().ok_or(Error::Internal)?,
            "effective_handover_baseline_snapshot_id",
        )?,
        _ => id(s.members.first().ok_or(Error::Internal)?, "snapshotId")?,
    };
    if !s
        .members
        .iter()
        .any(|m| m["snapshotId"] == selected.to_string())
    {
        return Err(changed());
    }
    for m in &s.members {
        sqlx::query("INSERT INTO poms.project_handover_contract_basis(basis_snapshot_id,project_id,contract_id,term_snapshot_id,readiness_package_id,preparation_id,plan_version_id,contract_amendment_id,source_payload_hash,currency_code,signed_amount,amount_tax_inclusive,amount_tax_exclusive,is_compatibility_anchor) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::numeric,$12::numeric,$13::numeric,$14)")
            .bind(basis).bind(project).bind(id(m,"contractId")?).bind(id(m,"snapshotId")?).bind(id(m,"readinessId")?).bind(id(m,"preparationId")?).bind(id(m,"planVersionId")?).bind(m["sourceAmendmentId"].as_str().and_then(|s|Uuid::parse_str(s).ok())).bind(text(m,"payloadHash")?).bind(text(m,"currencyCode")?).bind(text(m,"signedAmount")?).bind(text(m,"amountTaxInclusive")?).bind(text(m,"amountTaxExclusive")?).bind(id(m,"snapshotId")?==selected).execute(&mut *session.connection).await?;
    }
    summary_snapshot(
        session,
        actor,
        project,
        project,
        "project",
        "contract-handover-confirmation",
        cs,
    )
    .await?;
    summary_snapshot(
        session,
        actor,
        project,
        handover,
        "project-handover",
        "project-handover-confirmation",
        hs,
    )
    .await?;
    create(
        session,
        Table::Confirmation,
        json!({"id":confirmation,"confirmationType":"project-handover","businessDomain":"project-handover","targetType":"project-handover","targetId":handover,"projectId":project,"status":"pending","requiredCount":users.len(),"confirmedCount":0,"submittedAt":now(),"confirmedAt":null,"closedAt":null,"closedBy":null,"closeReason":null,"confirmationComment":body.get("comment"),"createdBy":actor.id,"updatedBy":actor.id}),
    )?;
    let mut participant_ids = Vec::new();
    for user in users {
        let uid = id(user, "userId")?;
        let pid = new_uuid()?;
        let duties = user["responsibilities"].as_array().ok_or(Error::Internal)?;
        let primary = if duties.iter().any(|r| r["roleKey"] == "execution-owner") {
            "execution-owner"
        } else {
            text(duties.first().ok_or(Error::Internal)?, "roleKey")?
        };
        create(
            session,
            Table::Participant,
            json!({"id":pid,"confirmationRecordId":confirmation,"participantId":uid,"participantRoleKey":primary,"participantDisplayName":names.get(&uid),"participantStatus":"pending","confirmedAt":null,"confirmedComment":null,"createdBy":actor.id,"updatedBy":actor.id}),
        )?;
        create(
            session,
            Table::Todo,
            json!({"id":new_uuid()?,"sourceType":"confirmation-record","sourceId":confirmation,"todoType":"confirmation","businessDomain":"project-handover","targetObjectType":"project-handover","targetObjectId":handover,"projectId":project,"title":"请确认本人移交职责","summary":"查看同一版本移交材料后确认本人职责。","assigneeUserId":uid,"status":"open","priority":"high","dueAt":null,"completedAt":null}),
        )?;
        participant_ids.push((pid, uid, duties));
    }
    common::flush(session).await?;
    sqlx::query("INSERT INTO poms.project_handover(id,project_id,contract_summary_snapshot_id,effective_handover_baseline_snapshot_id,summary_snapshot_id,status,created_by,updated_by,producer_version,basis_snapshot_id,version,is_current,supersedes_id,execution_owner_user_id,confirmation_record_id,finance_confirmation_required,prepared_receipt_judgment_mode,source_payload_hash,handover_rebaseline_record_id) VALUES($1,$2,$3,$4,$5,'draft',$6,$6,1,$7,$8,true,$9,$10,$11,$12,$13,$14,$15)")
        .bind(handover).bind(project).bind(cs).bind(selected).bind(hs).bind(actor.id).bind(basis).bind(version).bind(old.as_ref().map(|h|id(h,"id")).transpose()?).bind(id(body,"executionOwnerUserId")?).bind(confirmation).bind(body["financeConfirmationRequired"].as_bool().ok_or(Error::Internal)?).bind(text(body,"receiptJudgmentMode")?).bind(&s.hash).bind(inherited_rebaseline).execute(&mut *session.connection).await?;
    for (pid, uid, duties) in participant_ids {
        for r in duties {
            sqlx::query("INSERT INTO poms.project_handover_participant_role(handover_id,confirmation_record_id,confirmation_participant_id,participant_user_id,role_key,responsibility_summary,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)").bind(handover).bind(confirmation).bind(pid).bind(uid).bind(text(r,"roleKey")?).bind(text(r,"responsibilitySummary")?.trim()).bind(actor.id).execute(&mut *session.connection).await?;
        }
    }
    for (snapshot, target, contract_summary) in [(cs, None, None), (hs, Some(handover), Some(cs))] {
        sqlx::query("INSERT INTO poms.project_handover_summary_payload(summary_snapshot_id,project_id,handover_id,basis_snapshot_id,contract_summary_snapshot_id,payload,payload_hash,source_hash,generated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)").bind(snapshot).bind(project).bind(target).bind(basis).bind(contract_summary).bind(&payload).bind(&payload_hash).bind(&s.hash).bind(actor.id).execute(&mut *session.connection).await?;
    }
    for m in &s.members {
        for (kind, source_type, source_key) in [
            ("contract", "contract-term-snapshot", "snapshotId"),
            ("receivable", "receivable-plan-version", "planVersionId"),
            ("scope", "contract-term-preparation", "preparationId"),
            ("risk", "contract-term-preparation", "preparationId"),
            ("cost", "contract-term-preparation", "preparationId"),
        ] {
            insert_item(
                session,
                actor,
                basis,
                &format!("{kind}:{}", text(m, "contractId")?),
                kind,
                source_type,
                id(m, source_key)?,
                &m["snapshotVersion"].to_string(),
                m,
            )
            .await?;
        }
    }
    for material in &s.materials {
        insert_item(
            session,
            actor,
            basis,
            &format!("attachment:{}", text(material, "attachmentId")?),
            "attachment",
            "attachment",
            id(material, "attachmentId")?,
            &material["version"].to_string(),
            material,
        )
        .await?;
    }
    for user in users {
        insert_item(
            session,
            actor,
            basis,
            &format!("responsibility:{}", text(user, "userId")?),
            "responsibility",
            "platform-user",
            id(user, "userId")?,
            &version.to_string(),
            user,
        )
        .await?;
    }
    let h = sources::row(session, handover, false).await?;
    if anchor.is_none() {
        crate::project_lifecycle::enter_handover_with_session(
            session,
            project,
            handover,
            rv(&s.project)?,
            actor,
        )
        .await?;
    }
    if anchor.is_none() {
        record(session,actor,"ProjectHandoverController_prepareProjectHandover",handover,project,old.as_ref().map(|h|json!({"id":h["id"],"version":h["version"]})),json!({"id":handover,"basisId":basis,"summarySnapshotId":hs,"sourceHash":s.hash}),json!({"version":version,"confirmationRecordId":confirmation,"contractSummarySnapshotId":cs})).await?;
    }
    Ok(h)
}
#[allow(clippy::too_many_arguments)] // One immutable source item maps directly to the frozen schema columns.
async fn insert_item(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    basis: Uuid,
    key: &str,
    kind: &str,
    source: &str,
    source_id: Uuid,
    version: &str,
    payload: &Value,
) -> Result<(), Error> {
    sqlx::query("INSERT INTO poms.project_handover_basis_item(basis_snapshot_id,item_key,item_type,source_type,source_id,source_version,source_hash,payload,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)").bind(basis).bind(key).bind(kind).bind(source).bind(source_id).bind(version).bind(canonical_hash(payload)?).bind(payload).bind(actor.id).execute(&mut *session.connection).await?;
    Ok(())
}
async fn locked(session: &mut CommonSession<'_, '_>, key: Uuid) -> Result<(Value, Sources), Error> {
    let h = sources::row(session, key, false).await?;
    let s = sources::fresh(session, &h).await?;
    let h = sources::row(session, key, true).await?;
    if h["is_current"] != true || h["status"] != "draft" {
        return Err(Error::Conflict("移交不是当前可确认版本。".into()));
    }
    Ok((h, s))
}
async fn self_confirm(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    key: Uuid,
    body: &Value,
    op: &str,
) -> Result<Value, Error> {
    let (h, s) = locked(session, key).await?;
    exact(body, "summarySnapshotId", &h["summary_snapshot_id"])?;
    exact(body, "handoverBasisSnapshotId", &h["basis_snapshot_id"])?;
    let confirmation = id(&h, "confirmation_record_id")?;
    let c:Value=sqlx::query_scalar("SELECT to_jsonb(c) FROM poms.confirmation_record c WHERE id=$1 AND target_id=$2 AND project_id=$3 FOR UPDATE").bind(confirmation).bind(key).bind(id(&h,"project_id")?).fetch_optional(&mut *session.connection).await?.ok_or(Error::Internal)?;
    let p:Value=sqlx::query_scalar("SELECT to_jsonb(p) FROM poms.confirmation_participant p WHERE confirmation_record_id=$1 AND participant_id=$2 FOR UPDATE").bind(confirmation).bind(actor.id).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::Forbidden("只能确认本人已指派职责。".into()))?;
    if body.get("expectedConfirmationVersion") != Some(&c["row_version"]) {
        return Err(Error::Conflict("确认进度版本已变化，请刷新后重试。".into()));
    }
    if p["participant_status"] == "confirmed" {
        return view::detail(session, actor, &s, Some(&h)).await;
    }
    if c["status"] != "pending" || p["participant_status"] != "pending" {
        return Err(Error::Conflict("本次确认已关闭。".into()));
    }
    assign(session,Table::Participant,id(&p,"id")?,json!({"participantStatus":"confirmed","confirmedAt":now(),"confirmedComment":body.get("comment"),"updatedBy":actor.id})).await?;
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM poms.confirmation_participant WHERE confirmation_record_id=$1 AND participant_status='confirmed'").bind(confirmation).fetch_one(&mut *session.connection).await?;
    let count = count + 1;
    let completed = Some(count) == c["required_count"].as_i64();
    assign(session,Table::Confirmation,confirmation,json!({"confirmedCount":count,"status":if completed{"confirmed"}else{"pending"},"confirmedAt":if completed{now()}else{Value::Null},"updatedBy":actor.id})).await?;
    let todos:Vec<Uuid>=sqlx::query_scalar("SELECT id FROM poms.todo_item WHERE source_type='confirmation-record' AND source_id=$1 AND assignee_user_id=$2 AND status IN ('open','processing') FOR UPDATE").bind(confirmation).bind(actor.id).fetch_all(&mut *session.connection).await?;
    for todo in todos {
        assign(
            session,
            Table::Todo,
            todo,
            json!({"status":"completed","completedAt":now()}),
        )
        .await?;
    }
    common::flush(session).await?;
    record(session,actor,op,key,id(&h,"project_id")?,Some(json!({"participantStatus":"pending"})),json!({"participantId":actor.id,"participantStatus":"confirmed","summarySnapshotId":h["summary_snapshot_id"]}),json!({"confirmationRecordId":confirmation,"sourceHash":s.hash})).await?;
    view::detail(session, actor, &s, Some(&h)).await
}
async fn finalize(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    key: Uuid,
    body: &Value,
    op: &str,
) -> Result<Value, Error> {
    require_write(actor)?;
    let (h, _s) = locked(session, key).await?;
    expected_version(body, rv(&h)?, "project-handover")?;
    for (request, column) in [
        ("contractSummarySnapshotId", "contract_summary_snapshot_id"),
        ("summarySnapshotId", "summary_snapshot_id"),
        ("handoverBasisSnapshotId", "basis_snapshot_id"),
        ("sourcePayloadHash", "source_payload_hash"),
    ] {
        exact(body, request, &h[column])?;
    }
    let rows:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('participantId',r.participant_user_id,'participantRoleKey',r.role_key,'participantStatus',p.participant_status) FROM poms.project_handover_participant_role r JOIN poms.confirmation_participant p ON p.id=r.confirmation_participant_id WHERE r.handover_id=$1 ORDER BY r.participant_user_id,r.role_key").bind(key).fetch_all(&mut *session.connection).await?;
    if rows.is_empty() || rows.iter().any(|r| r["participantStatus"] != "confirmed") {
        return Err(Error::Conflict("关键参与人尚未全部确认。".into()));
    }
    let confirmation:Value=sqlx::query_scalar("SELECT to_jsonb(c) FROM poms.confirmation_record c WHERE id=$1 AND target_id=$2 AND target_type='project-handover' AND project_id=$3 FOR UPDATE")
        .bind(id(&h,"confirmation_record_id")?).bind(key).bind(id(&h,"project_id")?).fetch_optional(&mut *session.connection).await?.ok_or(Error::Internal)?;
    let people: BTreeSet<Uuid> = rows
        .iter()
        .map(|r| id(r, "participantId"))
        .collect::<Result<_, _>>()?;
    if confirmation["status"] != "confirmed"
        || confirmation["required_count"].as_u64() != Some(people.len() as u64)
        || confirmation["confirmed_count"].as_u64() != Some(people.len() as u64)
    {
        return Err(Error::Conflict("实际确认记录尚未完成。".into()));
    }
    let keys = |rows: &[Value]| -> Result<BTreeSet<(Uuid, String)>, Error> {
        rows.iter()
            .map(|r| {
                Ok((
                    id(r, "participantId")?,
                    text(r, "participantRoleKey")?.to_owned(),
                ))
            })
            .collect()
    };
    let requested = body["participantConfirmations"]
        .as_array()
        .ok_or(Error::Internal)?;
    if requested.len() != rows.len() || keys(requested)? != keys(&rows)? {
        return Err(Error::BadRequest("参与职责集合与固定材料不一致。".into()));
    }
    if let Some(mode) = body.get("receiptJudgmentMode")
        && mode != &h["prepared_receipt_judgment_mode"]
    {
        return Err(Error::BadRequest("回款判断模式必须与准备材料一致。".into()));
    }
    let project = id(&h, "project_id")?;
    let previous:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(f) FROM poms.project_receipt_judgment_freeze f WHERE project_id=$1 AND is_current FOR UPDATE").bind(project).fetch_optional(&mut *session.connection).await?;
    if let Some(f) = &previous {
        if f["receipt_judgment_mode"] != h["prepared_receipt_judgment_mode"] {
            return Err(Error::Conflict("已有冻结模式，本片不允许变更。".into()));
        }
        let exists:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commission_calculation WHERE project_id=$1) OR EXISTS(SELECT 1 FROM poms.commission_payout WHERE project_id=$1)").bind(project).fetch_one(&mut *session.connection).await?;
        if exists {
            return Err(Error::Conflict(
                "已有提成计算或发放，须进入正式受控冻结变更。".into(),
            ));
        }
        sqlx::query("UPDATE poms.project_receipt_judgment_freeze SET is_current=false,updated_at=now(),updated_by=$2,row_version=row_version+1 WHERE id=$1 AND is_current").bind(id(f,"id")?).bind(actor.id).execute(&mut *session.connection).await?;
    }
    let freeze = new_uuid()?;
    let version:i32=sqlx::query_scalar("SELECT COALESCE(MAX(version),0)+1 FROM poms.project_receipt_judgment_freeze WHERE project_id=$1").bind(project).fetch_one(&mut *session.connection).await?;
    let updated=sqlx::query("UPDATE poms.project_handover SET status='confirmed',confirmed_at=now(),confirmed_by=$2,comment=$3,updated_by=$2,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND row_version=$4 AND is_current AND status='draft'").bind(key).bind(actor.id).bind(body["comment"].as_str()).bind(rv(&h)?).execute(&mut *session.connection).await?;
    if updated.rows_affected() != 1 {
        return Err(changed());
    }
    sqlx::query("INSERT INTO poms.project_receipt_judgment_freeze(id,project_id,receipt_judgment_mode,source_type,source_id,source_handover_id,source_handover_summary_snapshot_id,source_handover_rebaseline_record_id,is_current,frozen_by,supersedes_id,created_by,updated_by,producer_version,basis_snapshot_id,version) VALUES($1,$2,$3,'project-handover',$4,$4,$5,$6,true,$7,$8,$7,$7,1,$9,$10)").bind(freeze).bind(project).bind(text(&h,"prepared_receipt_judgment_mode")?).bind(key).bind(id(&h,"summary_snapshot_id")?).bind(h["handover_rebaseline_record_id"].as_str().and_then(|v|Uuid::parse_str(v).ok())).bind(actor.id).bind(previous.as_ref().map(|f|id(f,"id")).transpose()?).bind(id(&h,"basis_snapshot_id")?).bind(version).execute(&mut *session.connection).await?;
    record(session,actor,op,key,project,Some(json!({"status":"draft","rowVersion":h["row_version"]})),json!({"status":"confirmed","receiptJudgmentFreezeId":freeze}),json!({"basisId":h["basis_snapshot_id"],"summarySnapshotId":h["summary_snapshot_id"],"contractSummarySnapshotId":h["contract_summary_snapshot_id"],"confirmationRecordId":h["confirmation_record_id"]})).await?;
    Ok(
        json!({"targetId":key,"businessStatusAfter":"confirmed","confirmationRecordId":h["confirmation_record_id"],"receiptJudgmentFreezeId":freeze,"contractSummarySnapshotId":h["contract_summary_snapshot_id"],"effectiveHandoverBaselineSnapshotId":h["effective_handover_baseline_snapshot_id"],"summarySnapshotId":h["summary_snapshot_id"],"projectionLevel":"handover-confirmation","exportPolicy":"handover-controlled","handoverBasisSnapshotId":h["basis_snapshot_id"],"sourcePayloadHash":h["source_payload_hash"],"closureStatus":"handover-confirmed-freeze-pending","executionAdmission":{"allowed":false,"blockingReasons":["正式执行准入仍需 R5 同链有效提成角色冻结。"]}}),
    )
}
async fn rebaseline(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    body: &Value,
    op: &str,
) -> Result<Value, Error> {
    require_write(actor)?;
    let old = sources::row(session, id(body, "sourceHandoverId")?, false).await?;
    let project = id(&old, "project_id")?;
    lock_project(session.connection, project).await?;
    let old = sources::row(session, id(&old, "id")?, true).await?;
    expected_version(body, rv(&old)?, "project-handover")?;
    exact(body, "handoverBasisSnapshotId", &old["basis_snapshot_id"])?;
    exact(body, "sourcePayloadHash", &old["source_payload_hash"])?;
    if old["is_current"] != true {
        return Err(changed());
    }
    let amendment:Value=sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.contract_amendment a WHERE id=$1 AND project_id=$2 AND producer_version=1 AND status='effective' AND is_current FOR UPDATE").bind(id(body,"contractAmendmentId")?).bind(project).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::BadRequest("再基线化需要真实生效的同项目合同变更。".into()))?;
    exact(
        body,
        "effectiveBaselineAfterId",
        &amendment["after_snapshot_id"],
    )?;
    let old_basis = sources::basis(session, &old).await?;
    let old_payload = &old_basis["source_payload"];
    let contract = id(&amendment, "contract_id")?;
    let all_items: Vec<Value> = sqlx::query_scalar(
        "SELECT to_jsonb(i) FROM poms.project_handover_basis_item i WHERE basis_snapshot_id=$1",
    )
    .bind(id(&old, "basis_snapshot_id")?)
    .fetch_all(&mut *session.connection)
    .await?;
    let requested = body["affectedHandoverItemIds"]
        .as_array()
        .ok_or(Error::Internal)?;
    let ids: BTreeSet<Uuid> = requested
        .iter()
        .map(|v| {
            v.as_str()
                .and_then(|v| Uuid::parse_str(v).ok())
                .ok_or(Error::Internal)
        })
        .collect::<Result<_, _>>()?;
    if ids.is_empty()
        || ids.len() != requested.len()
        || ids
            .iter()
            .any(|key| !all_items.iter().any(|v| v["id"] == key.to_string()))
    {
        return Err(Error::BadRequest(
            "影响项必须属于原移交真实依据且不得重复。".into(),
        ));
    }
    let s = sources::collect(session, project, true, Some(old_payload)).await?;
    if !s.members.iter().any(|m| {
        m["contractId"] == contract.to_string() && m["snapshotId"] == amendment["after_snapshot_id"]
    }) {
        return Err(changed());
    }
    let lineage = sources::rebaseline_lineage(session, project, old_payload, &s.members).await?;
    if !lineage.iter().any(|chain| {
        chain["contractId"] == contract.to_string()
            && chain["toSnapshotId"] == amendment["after_snapshot_id"]
            && chain["amendments"].as_array().is_some_and(|items| {
                items
                    .iter()
                    .any(|item| item["contractAmendmentId"] == amendment["id"])
            })
    }) {
        return Err(changed());
    }
    for item in &all_items {
        if lineage
            .iter()
            .any(|chain| chain["contractId"] == item["payload"]["contractId"])
            && matches!(item["item_type"].as_str(), Some("contract" | "receivable"))
            && !ids.contains(&id(item, "id")?)
        {
            return Err(Error::BadRequest(
                "须明确确认全部已变更合同的条款及回款计划影响项。".into(),
            ));
        }
    }
    let prepare_body = json!({"executionOwnerUserId":old_payload["executionOwnerUserId"],"participants":old_payload["participants"],"financeConfirmationRequired":old_payload["financeConfirmationRequired"],"receiptJudgmentMode":old_payload["receiptJudgmentMode"],"expectedProjectVersion":s.project["row_version"],"expectedSourceHash":s.hash,"expectedCurrentHandoverVersion":old["version"]});
    let replacement = prepare(
        session,
        actor,
        project,
        &prepare_body,
        Some(id(body, "effectiveBaselineAfterId")?),
        Some(old.clone()),
        Some(lineage.clone()),
    )
    .await?;
    let previous:Option<Value>=sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.contract_handover_rebaseline_record r WHERE project_id=$1 AND status='effective' FOR UPDATE").bind(project).fetch_optional(&mut *session.connection).await?;
    if let Some(p) = &previous {
        sqlx::query("UPDATE poms.contract_handover_rebaseline_record SET status='superseded',updated_by=$2,updated_at=now(),row_version=row_version+1 WHERE id=$1 AND status='effective'").bind(id(p,"id")?).bind(actor.id).execute(&mut *session.connection).await?;
    }
    let record_id = new_uuid()?;
    sqlx::query("INSERT INTO poms.contract_handover_rebaseline_record(id,contract_amendment_id,project_id,rebaseline_reason,effective_baseline_after_id,status,handled_by,supersedes_id,created_by,updated_by,producer_version,basis_before_id,basis_after_id,source_handover_id,replacement_handover_id) VALUES($1,$2,$3,$4,$5,'effective',$6,$7,$6,$6,1,$8,$9,$10,$11)").bind(record_id).bind(id(&amendment,"id")?).bind(project).bind(text(body,"rebaselineReason")?).bind(id(body,"effectiveBaselineAfterId")?).bind(actor.id).bind(previous.as_ref().map(|p|id(p,"id")).transpose()?).bind(id(&old,"basis_snapshot_id")?).bind(id(&replacement,"basis_snapshot_id")?).bind(id(&old,"id")?).bind(id(&replacement,"id")?).execute(&mut *session.connection).await?;
    let mut impacted = Vec::new();
    for item in all_items
        .iter()
        .filter(|v| id(v, "id").is_ok_and(|v| ids.contains(&v)))
    {
        let item_id = id(item, "id")?;
        sqlx::query("INSERT INTO poms.handover_baseline_impact_item(rebaseline_record_id,affected_handover_item_id,impact_type,impact_summary,supersedes_baseline_id,created_by,producer_version,basis_before_id,source_basis_item_id) VALUES($1,$2,$3,$4,$5,$6,1,$7,$2)").bind(record_id).bind(item_id).bind(text(item,"item_type")?).bind(format!("承接来源项 {item_id} 由正式变更替代。" )).bind(id(&old,"effective_handover_baseline_snapshot_id")?).bind(actor.id).bind(id(&old,"basis_snapshot_id")?).execute(&mut *session.connection).await?;
        impacted.push(safe_item(item));
    }
    sqlx::query("UPDATE poms.project_handover SET handover_rebaseline_record_id=$2,updated_at=now(),row_version=row_version+1 WHERE id=$1").bind(id(&replacement,"id")?).bind(record_id).execute(&mut *session.connection).await?;
    let replacement = sources::row(session, id(&replacement, "id")?, false).await?;
    record(session,actor,op,record_id,project,Some(json!({"handoverId":old["id"],"basisId":old["basis_snapshot_id"]})),json!({"replacementHandoverId":replacement["id"],"basisId":replacement["basis_snapshot_id"]}),json!({"contractAmendmentId":amendment["id"],"amendmentChains":lineage,"sourceHash":replacement["source_payload_hash"],"affectedItemIds":requested})).await?;
    Ok(
        json!({"targetId":record_id,"rebaselineRecordId":record_id,"effectiveBaselineAfterId":body["effectiveBaselineAfterId"],"resultStatus":"effective","sourceHandoverId":old["id"],"replacementHandoverId":replacement["id"],"handoverBasisSnapshotId":replacement["basis_snapshot_id"],"contractSummarySnapshotId":replacement["contract_summary_snapshot_id"],"summarySnapshotId":replacement["summary_snapshot_id"],"sourcePayloadHash":replacement["source_payload_hash"],"affectedHandoverItems":impacted,"currentHandoverBaselineSummary":view::baseline(Some(&replacement))}),
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    fn body() -> Value {
        let uid = Uuid::nil();
        json!({"executionOwnerUserId":uid,"financeConfirmationRequired":false,"receiptJudgmentMode":"project-aggregate","participants":[{"userId":uid,"responsibilities":[{"roleKey":"sales-owner","responsibilitySummary":"sales"},{"roleKey":"execution-owner","responsibilitySummary":"execution"},{"roleKey":"business-admin","responsibilitySummary":"business"},{"roleKey":"technical-support","responsibilitySummary":"technical"}]}]})
    }
    #[test]
    fn one_person_can_hold_multiple_duties_but_missing_core_duty_is_rejected() {
        assert!(validate_duties(&body(), Uuid::nil()).is_ok());
        let mut b = body();
        b["participants"][0]["responsibilities"]
            .as_array_mut()
            .unwrap()
            .pop();
        assert!(validate_duties(&b, Uuid::nil()).is_err());
    }
    #[test]
    fn finance_requirement_and_sales_identity_are_real_guards() {
        let mut b = body();
        b["financeConfirmationRequired"] = json!(true);
        assert!(validate_duties(&b, Uuid::nil()).is_err());
        assert!(validate_duties(&body(), Uuid::from_u128(1)).is_err());
    }
}
