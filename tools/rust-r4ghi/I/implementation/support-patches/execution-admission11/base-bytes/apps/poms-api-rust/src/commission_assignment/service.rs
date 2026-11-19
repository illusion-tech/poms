use crate::project_operating_common::{ResourceKeys, TypedRequest};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error, canonical_hash, new_uuid},
    project_action_authorization::{self as scope, ProjectAction, ProjectActionTarget},
    project_lifecycle::facts::{
        self, SummarySpec, cas, id, instant, next_version, qualification, text, version,
    },
    project_operating_common::model::{
        CreateCommissionRoleAssignmentRequest, FreezeCommissionRoleAssignmentRequest,
    },
};
use serde_json::{Value, json};
use sqlx::Connection;
use std::collections::BTreeSet;
use uuid::Uuid;

const WEIGHTS_POLICY: &str = "normalized-six-v1-zero-reason";

pub async fn execute_with_session(
    session: &mut CommonSession<'_, '_>,
    operation_id: &str,
    keys: &ResourceKeys,
    _query: &Value,
    request: &TypedRequest,
    actor: &Actor,
) -> Result<Value, Error> {
    if !session.connection.is_in_transaction() {
        return Err(Error::Internal);
    }
    match (operation_id, request) {
        ("CommissionController_getCurrentRoleAssignment", TypedRequest::None) => {
            current_with_session(session, keys.require("projectId")?, actor).await
        }
        (
            "CommissionController_createRoleAssignment",
            TypedRequest::CreateCommissionRoleAssignmentRequest(input),
        ) => create_with_session(session, keys.require("projectId")?, input, actor).await,
        ("CommissionRoleAssignmentController_getRoleAssignmentDetail", TypedRequest::None) => {
            detail_with_session(session, keys.require("id")?, actor).await
        }
        (
            "CommissionRoleAssignmentController_freezeRoleAssignment",
            TypedRequest::FreezeCommissionRoleAssignmentRequest(input),
        ) => freeze_with_session(session, keys.require("id")?, input, actor).await,
        _ => Err(Error::Internal),
    }
}

pub struct FrozenAssignmentFacts {
    pub assignment_id: Uuid,
    pub row_version: i32,
    pub handover: Value,
    pub receipt_freeze_id: Uuid,
    pub payload_hash: String,
    pub freeze_summary_id: Uuid,
}

async fn row(session: &mut CommonSession<'_, '_>, assignment_id: Uuid) -> Result<Value, Error> {
    sqlx::query_scalar(
        "SELECT to_jsonb(a) FROM poms.commission_role_assignment a WHERE id=$1 FOR UPDATE",
    )
    .bind(assignment_id)
    .fetch_optional(&mut *session.connection)
    .await?
    .ok_or_else(|| Error::NotFound("角色分配不存在。".into()))
}
async fn current(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
) -> Result<Option<Value>, Error> {
    // Cross-producer current is authoritative, including old frozen assignments.
    Ok(sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.commission_role_assignment a WHERE project_id=$1 AND is_current FOR UPDATE")
        .bind(project_id).fetch_optional(&mut *session.connection).await?)
}
fn weight_exact(units: i32) -> String {
    format!("{}.{:06}", units / 1_000_000, units % 1_000_000)
}
fn weight_number(units: i32) -> Value {
    json!(f64::from(units) / 1_000_000.0)
}

async fn participants(
    session: &mut CommonSession<'_, '_>,
    assignment_id: Uuid,
) -> Result<Vec<Value>, Error> {
    Ok(sqlx::query_scalar("SELECT jsonb_build_object('userId',user_id,'roleType',role_type,'responsibilitySummary',responsibility_summary,'weightUnits',weight_units,'zeroWeightReason',zero_weight_reason,'displayName',display_name_at_assignment) FROM poms.commission_role_assignment_participant WHERE assignment_id=$1 ORDER BY sort_order")
        .bind(assignment_id).fetch_all(&mut *session.connection).await?)
}
fn validate_participant_rows(rows: &[Value]) -> Result<(), Error> {
    let mut sum = 0_i32;
    let mut identities = BTreeSet::new();
    if rows.is_empty() {
        return Err(Error::Conflict("角色分配缺少真实参与者。".into()));
    }
    for p in rows {
        let units = p["weightUnits"]
            .as_i64()
            .and_then(|v| i32::try_from(v).ok())
            .filter(|v| (0..=1_000_000).contains(v))
            .ok_or_else(|| Error::Conflict("角色权重无效。".into()))?;
        let zero_reason = p["zeroWeightReason"]
            .as_str()
            .filter(|s| !s.trim().is_empty());
        if (units == 0 && zero_reason.is_none())
            || (units > 0 && !p["zeroWeightReason"].is_null())
            || text(p, "responsibilitySummary")?.trim().is_empty()
            || !identities.insert((id(p, "userId")?, text(p, "roleType")?.to_owned()))
        {
            return Err(Error::Conflict(
                "真实职责、零权重原因或参与者标识无效。".into(),
            ));
        }
        sum = sum
            .checked_add(units)
            .ok_or_else(|| Error::Conflict("角色权重合计超限。".into()))?;
    }
    if sum != 1_000_000 {
        return Err(Error::BadRequest("权重合计必须精确等于 1。".into()));
    }
    Ok(())
}

async fn verify_duties(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    rows: &[Value],
    confirmed: bool,
) -> Result<(), Error> {
    validate_participant_rows(rows)?;
    for p in rows {
        let valid: bool = sqlx::query_scalar(r#"SELECT EXISTS(
          SELECT 1 FROM poms.platform_user u JOIN poms.project project ON project.id=$1
          WHERE u.id=$2 AND u.is_active AND (
            (NOT $4 AND project.owner_user_id=u.id AND $3='sales-owner') OR EXISTS(
              SELECT 1 FROM poms.project_handover h
              JOIN poms.project_handover_participant_role r ON r.handover_id=h.id
              JOIN poms.confirmation_record c ON c.id=h.confirmation_record_id AND c.target_type='project-handover' AND c.target_id=h.id AND c.project_id=project.id
              JOIN poms.confirmation_participant cp ON cp.id=r.confirmation_participant_id AND cp.confirmation_record_id=c.id AND cp.participant_id=u.id
              WHERE h.project_id=project.id AND h.is_current AND h.producer_version=1
              AND r.confirmation_record_id=c.id AND r.participant_user_id=u.id AND r.role_key=$3
              AND length(btrim(r.responsibility_summary))>0
              AND ((NOT $4 AND h.status IN ('draft','confirmed') AND c.status IN ('pending','confirmed') AND cp.participant_status IN ('pending','confirmed'))
                OR ($4 AND h.status='confirmed' AND c.status='confirmed' AND cp.participant_status='confirmed'))
            )))"#)
            .bind(project_id).bind(id(p,"userId")?).bind(text(p,"roleType")?).bind(confirmed)
            .fetch_one(&mut *session.connection).await?;
        if !valid {
            return Err(Error::Conflict(
                "每项角色必须由有效用户承担本项目真实当前职责。".into(),
            ));
        }
    }
    Ok(())
}

async fn summary(session: &mut CommonSession<'_, '_>, assignment: &Value) -> Result<Value, Error> {
    let mut people = Vec::new();
    if assignment["producer_version"] == 1 {
        for p in participants(session, id(assignment, "id")?).await? {
            let units = p["weightUnits"]
                .as_i64()
                .and_then(|v| i32::try_from(v).ok())
                .ok_or(Error::Internal)?;
            people.push(json!({"userId":p["userId"],"roleType":p["roleType"],"responsibilitySummary":p["responsibilitySummary"],"weight":weight_number(units),"weightExact":weight_exact(units),"zeroWeightReason":p["zeroWeightReason"],"displayName":p["displayName"]}));
        }
    } else if let Some(rows) = assignment["participants_json"].as_array() {
        for p in rows {
            // Read-only legacy display never promotes an unverified decimal or duty.
            people.push(json!({"userId":p["userId"],"roleType":p["roleType"],"responsibilitySummary":null,"weight":p["weight"],"weightExact":null,"zeroWeightReason":null,"displayName":p["displayName"].as_str().unwrap_or("历史参与者")}));
        }
    }
    let payload: Option<Value> = sqlx::query_scalar("SELECT to_jsonb(f) FROM poms.commission_role_assignment_freeze_payload f WHERE assignment_id=$1")
        .bind(id(assignment,"id")?).fetch_optional(&mut *session.connection).await?;
    Ok(
        json!({"id":assignment["id"],"projectId":assignment["project_id"],"version":assignment["version"],"rowVersion":assignment["row_version"],"isCurrent":assignment["is_current"],"status":assignment["status"],"participantsJson":people,
      "sourceHandoverId":assignment["source_handover_id"],"sourceHandoverRebaselineRecordId":assignment["source_handover_rebaseline_record_id"],"contractSummarySnapshotId":assignment["contract_summary_snapshot_id"],"handoverSummarySnapshotId":assignment["handover_summary_snapshot_id"],"effectiveHandoverBaselineSnapshotId":assignment["effective_handover_baseline_snapshot_id"],"frozenAt":instant(&assignment["frozen_at"]),"createdAt":instant(&assignment["created_at"]),"updatedAt":instant(&assignment["updated_at"]),"sourcePayloadHash":payload.as_ref().map(|v|v["source_payload_hash"].clone()),"freezeSummarySnapshotId":payload.as_ref().map(|v|v["freeze_summary_snapshot_id"].clone()),"sourceQualification":qualification(assignment),"frozenBy":assignment["frozen_by"],"weightsPolicyVersion":assignment["weights_policy_version"]}),
    )
}

pub async fn current_with_session(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    scope::require(
        session,
        actor,
        ProjectAction::ReadCommissionAssignment,
        ProjectActionTarget::Project { id: project_id },
    )
    .await?;
    match current(session, project_id).await? {
        Some(a) => summary(session, &a).await,
        None => Ok(Value::Null),
    }
}
pub async fn detail_with_session(
    session: &mut CommonSession<'_, '_>,
    assignment_id: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    scope::require(
        session,
        actor,
        ProjectAction::ReadCommissionAssignment,
        ProjectActionTarget::Assignment { id: assignment_id },
    )
    .await?;
    let a = row(session, assignment_id).await?;
    let can_freeze =
        if a["status"] == "draft" && a["is_current"] == true && a["producer_version"] == 1 {
            match scope::require(
                session,
                actor,
                ProjectAction::FreezeCommissionAssignment,
                ProjectActionTarget::Assignment { id: assignment_id },
            )
            .await
            {
                Ok(_) => true,
                Err(Error::Forbidden(_) | Error::NotFound(_) | Error::Conflict(_)) => false,
                Err(error) => return Err(error),
            }
        } else {
            false
        };
    let frozen: Option<Value> = sqlx::query_scalar("SELECT to_jsonb(f) FROM poms.commission_role_assignment_freeze_payload f WHERE assignment_id=$1")
        .bind(assignment_id).fetch_optional(&mut *session.connection).await?;
    let empty = Value::Null;
    let f = frozen.as_ref().unwrap_or(&empty);
    Ok(
        json!({"roleAssignmentId":assignment_id,"projectId":a["project_id"],"freezeVersionSummary":summary(session,&a).await?,"sourceHandoverId":a["source_handover_id"],"contractSummarySnapshotId":a["contract_summary_snapshot_id"],"handoverSummarySnapshotId":a["handover_summary_snapshot_id"],
      "effectiveHandoverBaselineSummary":{"status":if a["effective_handover_baseline_snapshot_id"].is_null(){"missing"}else{"available"},"baselineSnapshotId":a["effective_handover_baseline_snapshot_id"],"sourceType":if a["source_handover_id"].is_null(){"none"}else{"project-handover"},"sourceId":a["source_handover_id"],"summary":if a["status"]=="frozen"{"角色冻结引用固定移交基线。"}else{"尚未冻结移交基线。"}},
      "receiptJudgmentModeSummary":{"status":if frozen.is_some(){"frozen"}else{"not-frozen"},"receiptJudgmentMode":f["source_payload"]["receiptJudgmentMode"],"sourceType":if frozen.is_some(){"project-handover"}else{"none"},"sourceId":a["source_handover_id"],"summary":if frozen.is_some(){"使用同链回款判断冻结。"}else{"角色尚未引用正式回款冻结。"}},
      "summaryPackageKey":frozen.as_ref().map(|_|"commission-role-freeze-confirmation"),"summarySnapshotId":f["freeze_summary_snapshot_id"],"projectionLevel":frozen.as_ref().map(|_|"commission-role-freeze"),"exportPolicy":frozen.as_ref().map(|_|"commission-controlled"),"allowedActions":if can_freeze {vec!["freeze-commission-role-assignment"]}else{vec![]},"generatedAt":crate::auth::model::clock_now(),"sourcePayloadHash":f["source_payload_hash"],"sourceQualification":qualification(&a),"receiptJudgmentFreezeId":f["receipt_judgment_freeze_id"],"handoverBasisSnapshotId":f["handover_basis_snapshot_id"],"freezeSummarySnapshotId":f["freeze_summary_snapshot_id"]}),
    )
}

pub async fn create_with_session(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    request: &CreateCommissionRoleAssignmentRequest,
    actor: &Actor,
) -> Result<Value, Error> {
    let p = facts::project(session, project_id, true).await?;
    scope::require(
        session,
        actor,
        ProjectAction::CreateCommissionAssignmentDraft,
        ProjectActionTarget::Project { id: project_id },
    )
    .await?;
    if p["status"] != "active" {
        return Err(Error::Conflict("终态项目不可新建角色分配。".into()));
    }
    let previous = current(session, project_id).await?;
    if previous.as_ref().is_some_and(|a| a["status"] == "frozen") {
        return Err(Error::CodedConflict {
            code: "commission_frozen_change_requires_dispute",
            message: "已有冻结分配，须使用受控变更链。".into(),
        });
    }
    match previous.as_ref() {
        None if request.expected_current_assignment_id.is_none()
            && request.expected_current_row_version.is_none() => {}
        Some(a)
            if a["status"] == "draft"
                && request.expected_current_assignment_id == Some(id(a, "id")?) =>
        {
            cas(
                request
                    .expected_current_row_version
                    .ok_or_else(|| Error::BadRequest("当前角色版本必填。".into()))?,
                version(a)?,
                "角色分配",
            )?;
            next_version(version(a)?)?;
        }
        _ => return Err(Error::Conflict("当前角色分配已变化。".into())),
    }
    let mut people = Vec::with_capacity(request.participants.len());
    for participant in &request.participants {
        let display_name: String = sqlx::query_scalar(
            "SELECT display_name FROM poms.platform_user WHERE id=$1 AND is_active FOR SHARE",
        )
        .bind(participant.user_id)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::BadRequest("参与者不存在或已停用。".into()))?;
        people.push(json!({"userId":participant.user_id,"roleType":participant.role_type.trim(),"responsibilitySummary":participant.responsibility_summary.trim(),"weightUnits":participant.weight.units(),"zeroWeightReason":participant.zero_weight_reason.as_deref().map(str::trim),"displayName":display_name}));
    }
    verify_duties(session, project_id, &people, false).await?;
    let assignment_id = new_uuid()?;
    let maximum_version: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version),0) FROM poms.commission_role_assignment WHERE project_id=$1",
    )
    .bind(project_id)
    .fetch_one(&mut *session.connection)
    .await?;
    let logical_version = next_version(maximum_version)?;
    if let Some(a) = &previous {
        let updated=sqlx::query("UPDATE poms.commission_role_assignment SET is_current=false,status='superseded',row_version=row_version+1,updated_by=$1,updated_at=$2 WHERE id=$3 AND row_version=$4 AND status='draft' AND is_current")
            .bind(actor.id).bind(crate::auth::model::clock_now()).bind(id(a,"id")?).bind(version(a)?).execute(&mut *session.connection).await?.rows_affected();
        if updated != 1 {
            return Err(Error::Conflict("角色分配已变化。".into()));
        }
    }
    let legacy_shape=people.iter().map(|v|{let units=v["weightUnits"].as_i64().unwrap_or_default() as i32;json!({"userId":v["userId"],"roleType":v["roleType"],"weight":weight_number(units),"displayName":v["displayName"]})}).collect::<Vec<_>>();
    sqlx::query("INSERT INTO poms.commission_role_assignment(id,project_id,version,is_current,status,participants_json,supersedes_id,created_by,updated_by,producer_version,weights_policy_version) VALUES($1,$2,$3,true,'draft',$4,$5,$6,$6,1,$7)")
        .bind(assignment_id).bind(project_id).bind(logical_version).bind(json!(legacy_shape)).bind(previous.as_ref().map(|v|id(v,"id")).transpose()?).bind(actor.id).bind(WEIGHTS_POLICY)
        .execute(&mut *session.connection).await?;
    session
        .state
        .trace
        .inserted("commission_role_assignment", &assignment_id.to_string());
    for (order, person) in people.iter().enumerate() {
        let participant_id = new_uuid()?;
        sqlx::query("INSERT INTO poms.commission_role_assignment_participant(id,assignment_id,user_id,role_type,responsibility_summary,weight_units,zero_weight_reason,display_name_at_assignment,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)")
            .bind(participant_id).bind(assignment_id).bind(id(person,"userId")?).bind(text(person,"roleType")?).bind(text(person,"responsibilitySummary")?)
            .bind(i32::try_from(person["weightUnits"].as_i64().ok_or(Error::Internal)?).map_err(|_|Error::Internal)?)
            .bind(person["zeroWeightReason"].as_str()).bind(text(person,"displayName")?).bind(i32::try_from(order).map_err(|_|Error::Internal)?)
            .execute(&mut *session.connection).await?;
        session.state.trace.inserted(
            "commission_role_assignment_participant",
            &participant_id.to_string(),
        );
    }
    let a = row(session, assignment_id).await?;
    facts::record(session,actor,"CommissionController_createRoleAssignment","commission-role-assignment",assignment_id,project_id,previous.as_ref().map(|v|json!({"id":v["id"],"rowVersion":v["row_version"]})),json!({"id":assignment_id,"rowVersion":1,"participants":people,"weightsPolicyVersion":WEIGHTS_POLICY})).await?;
    summary(session, &a).await
}

async fn receipt(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    h: &Value,
) -> Result<Value, Error> {
    let f:Value=sqlx::query_scalar("SELECT to_jsonb(f) FROM poms.project_receipt_judgment_freeze f WHERE project_id=$1 AND is_current FOR UPDATE")
        .bind(project_id).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::Conflict("缺少正式回款判断冻结。".into()))?;
    if f["producer_version"] != 1
        || f["source_handover_id"] != h["id"]
        || f["basis_snapshot_id"] != h["basis_snapshot_id"]
        || f["source_handover_summary_snapshot_id"] != h["summary_snapshot_id"]
        || f["receipt_judgment_mode"] != h["prepared_receipt_judgment_mode"]
    {
        return Err(Error::Conflict("回款冻结与当前移交来源链不一致。".into()));
    }
    Ok(f)
}

pub async fn freeze_with_session(
    session: &mut CommonSession<'_, '_>,
    assignment_id: Uuid,
    request: &FreezeCommissionRoleAssignmentRequest,
    actor: &Actor,
) -> Result<Value, Error> {
    // Resolve anchor without taking an assignment lock before the project lock.
    let project_id: Uuid =
        sqlx::query_scalar("SELECT project_id FROM poms.commission_role_assignment WHERE id=$1")
            .bind(assignment_id)
            .fetch_optional(&mut *session.connection)
            .await?
            .ok_or_else(|| Error::NotFound("角色分配不存在。".into()))?;
    facts::project(session, project_id, true).await?;
    scope::require(
        session,
        actor,
        ProjectAction::FreezeCommissionAssignment,
        ProjectActionTarget::Assignment { id: assignment_id },
    )
    .await?;
    let h = crate::project_handover::verify_confirmed_handover_with_session(
        session,
        project_id,
        request.source_handover_id,
    )
    .await?;
    cas(request.expected_handover_version, version(&h)?, "移交")?;
    if h["summary_snapshot_id"] != request.handover_summary_snapshot_id.to_string()
        || h["basis_snapshot_id"] != request.handover_basis_snapshot_id.to_string()
        || h["source_payload_hash"] != request.expected_source_hash
    {
        return Err(Error::Conflict("移交材料与提交的固定来源不一致。".into()));
    }
    let receipt = receipt(session, project_id, &h).await?;
    let a = row(session, assignment_id).await?;
    cas(request.expected_version, version(&a)?, "角色分配")?;
    next_version(request.expected_version)?;
    if a["is_current"] != true
        || a["status"] != "draft"
        || a["producer_version"] != 1
        || a["weights_policy_version"] != WEIGHTS_POLICY
    {
        return Err(Error::Conflict("仅本次真实当前草稿可冻结。".into()));
    }
    let people = participants(session, assignment_id).await?;
    verify_duties(session, project_id, &people, true).await?;
    let frozen_at = crate::auth::model::clock_now();
    let payload = json!({"schemaVersion":1,"projectId":project_id,"assignmentId":assignment_id,"assignmentVersion":a["version"],"weightsPolicyVersion":WEIGHTS_POLICY,"participants":people,"handoverId":h["id"],"handoverRowVersion":h["row_version"],"handoverBasisSnapshotId":h["basis_snapshot_id"],"handoverSourceHash":h["source_payload_hash"],"contractSummarySnapshotId":h["contract_summary_snapshot_id"],"handoverSummarySnapshotId":h["summary_snapshot_id"],"effectiveHandoverBaselineSnapshotId":h["effective_handover_baseline_snapshot_id"],"receiptJudgmentFreezeId":receipt["id"],"receiptJudgmentMode":receipt["receipt_judgment_mode"],"frozenAt":frozen_at,"frozenBy":actor.id});
    let hash = canonical_hash(&payload)?;
    let summary_id = facts::summary(
        session,
        actor,
        SummarySpec {
            scenario: "commission-role-freeze",
            package: "commission-role-freeze-confirmation",
            target_type: "commission-role-assignment",
            target: assignment_id,
            status: "frozen",
            fields: &[
                "project.identity",
                "participants.responsibilities",
                "participants.weights",
                "source.handover",
                "source.receipt-freeze",
                "source.hash",
            ],
        },
    )
    .await?;
    sqlx::query("INSERT INTO poms.commission_role_assignment_freeze_payload(assignment_id,project_id,handover_id,handover_basis_snapshot_id,receipt_judgment_freeze_id,contract_summary_snapshot_id,handover_summary_snapshot_id,freeze_summary_snapshot_id,weights_policy_version,source_payload,source_payload_hash,frozen_at,frozen_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)")
        .bind(assignment_id).bind(project_id).bind(id(&h,"id")?).bind(id(&h,"basis_snapshot_id")?).bind(id(&receipt,"id")?).bind(id(&h,"contract_summary_snapshot_id")?).bind(id(&h,"summary_snapshot_id")?).bind(summary_id).bind(WEIGHTS_POLICY).bind(payload).bind(&hash).bind(frozen_at).bind(actor.id).execute(&mut *session.connection).await?;
    session.state.trace.inserted(
        "commission_role_assignment_freeze_payload",
        &assignment_id.to_string(),
    );
    let changed=sqlx::query("UPDATE poms.commission_role_assignment SET status='frozen',source_handover_id=$1,source_handover_rebaseline_record_id=$2,contract_summary_snapshot_id=$3,handover_summary_snapshot_id=$4,effective_handover_baseline_snapshot_id=$5,frozen_at=$6,frozen_by=$7,freeze_payload_id=id,row_version=row_version+1,updated_at=$6,updated_by=$7 WHERE id=$8 AND row_version=$9 AND is_current AND status='draft'")
        .bind(id(&h,"id")?).bind(h["handover_rebaseline_record_id"].as_str().and_then(|v|Uuid::parse_str(v).ok())).bind(id(&h,"contract_summary_snapshot_id")?).bind(id(&h,"summary_snapshot_id")?).bind(id(&h,"effective_handover_baseline_snapshot_id")?).bind(frozen_at).bind(actor.id).bind(assignment_id).bind(request.expected_version).execute(&mut *session.connection).await?.rows_affected();
    if changed != 1 {
        return Err(Error::Conflict("角色分配已变化。".into()));
    }
    facts::record(session,actor,"CommissionRoleAssignmentController_freezeRoleAssignment","commission-role-assignment",assignment_id,project_id,Some(json!({"status":"draft","rowVersion":request.expected_version})),json!({"status":"frozen","sourcePayloadHash":hash,"summarySnapshotId":summary_id,"receiptJudgmentFreezeId":receipt["id"]})).await?;
    Ok(
        json!({"targetId":assignment_id,"businessStatusAfter":"frozen","newVersionId":assignment_id,"sourceHandoverId":h["id"],"contractSummarySnapshotId":h["contract_summary_snapshot_id"],"handoverSummarySnapshotId":h["summary_snapshot_id"],"effectiveHandoverBaselineSnapshotId":h["effective_handover_baseline_snapshot_id"],"summarySnapshotId":summary_id,"projectionLevel":"commission-role-freeze","exportPolicy":"commission-controlled","sourcePayloadHash":hash,"summaryPackageKey":"commission-role-freeze-confirmation","receiptJudgmentFreezeId":receipt["id"],"handoverBasisSnapshotId":h["basis_snapshot_id"],"rowVersion":next_version(request.expected_version)?}),
    )
}

pub async fn require_current_frozen(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    assignment_id: Uuid,
    expected_version: Option<i32>,
) -> Result<FrozenAssignmentFacts, Error> {
    let f:Value=sqlx::query_scalar("SELECT to_jsonb(f) FROM poms.commission_role_assignment_freeze_payload f WHERE assignment_id=$1 AND project_id=$2")
        .bind(assignment_id).bind(project_id).fetch_optional(&mut *session.connection).await?.ok_or_else(||Error::Conflict("缺少角色冻结来源副本。".into()))?;
    let h = crate::project_handover::verify_confirmed_handover_with_session(
        session,
        project_id,
        id(&f, "handover_id")?,
    )
    .await?;
    let receipt = receipt(session, project_id, &h).await?;
    // Handover/receipt rank precedes the assignment rank. The caller already
    // holds the project lock; re-read the cross-producer authority after locks.
    let current = current(session, project_id)
        .await?
        .ok_or_else(|| Error::Conflict("尚无有效角色冻结。".into()))?;
    if id(&current, "id")? != assignment_id
        || current["status"] != "frozen"
        || current["producer_version"] != 1
        || current["freeze_payload_id"] != assignment_id.to_string()
    {
        return Err(Error::Conflict("当前角色冻结未取得本批真实准入。".into()));
    }
    if expected_version.is_some_and(|expected| Some(expected) != version(&current).ok()) {
        return Err(Error::Conflict("冻结角色版本已变化。".into()));
    }
    let people = participants(session, assignment_id).await?;
    verify_duties(session, project_id, &people, true).await?;
    let summary_valid:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.approval_summary_snapshot s JOIN poms.approval_summary_package_definition d ON d.id=s.summary_package_id WHERE s.id=$1 AND s.target_type='commission-role-assignment' AND s.target_id=$2 AND s.approval_scenario_key='commission-role-freeze' AND s.summary_package_key='commission-role-freeze-confirmation' AND s.projection_level='commission-role-freeze' AND s.export_policy='commission-controlled' AND s.business_status_at_snapshot='frozen' AND d.field_rule_version='r4i-role-freeze-v1')")
        .bind(id(&f,"freeze_summary_snapshot_id")?).bind(assignment_id).fetch_one(&mut *session.connection).await?;
    if canonical_hash(&f["source_payload"])? != text(&f, "source_payload_hash")?
        || !summary_valid
        || f["source_payload"]["participants"] != json!(people)
        || f["receipt_judgment_freeze_id"] != receipt["id"]
        || f["handover_basis_snapshot_id"] != h["basis_snapshot_id"]
        || f["handover_summary_snapshot_id"] != h["summary_snapshot_id"]
        || f["contract_summary_snapshot_id"] != h["contract_summary_snapshot_id"]
        || f["source_payload"]["handoverSourceHash"] != h["source_payload_hash"]
        || current["source_handover_id"] != h["id"]
        || f["freeze_summary_snapshot_id"] == h["summary_snapshot_id"]
    {
        return Err(Error::Conflict("角色冻结与当前真实移交链不一致。".into()));
    }
    Ok(FrozenAssignmentFacts {
        assignment_id,
        row_version: version(&current)?,
        handover: h,
        receipt_freeze_id: id(&receipt, "id")?,
        payload_hash: text(&f, "source_payload_hash")?.into(),
        freeze_summary_id: id(&f, "freeze_summary_snapshot_id")?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn person(user: u128, role: &str, weight: i32, reason: Option<&str>) -> Value {
        json!({"userId":Uuid::from_u128(user),"roleType":role,"responsibilitySummary":"真实职责","weightUnits":weight,"zeroWeightReason":reason})
    }
    #[test]
    fn weights_use_exact_units_and_zero_requires_a_reason() {
        assert!(
            validate_participant_rows(&[
                person(1, "sales-owner", 1_000_000, None),
                person(1, "execution-owner", 0, Some("无分成职责"))
            ])
            .is_ok()
        );
        assert!(validate_participant_rows(&[person(1, "sales-owner", 999_999, None)]).is_err());
        assert!(
            validate_participant_rows(&[
                person(1, "sales-owner", 1_000_000, None),
                person(2, "execution-owner", 0, None)
            ])
            .is_err()
        );
        assert!(
            validate_participant_rows(&[
                person(1, "sales-owner", 500_000, None),
                person(1, "sales-owner", 500_000, None)
            ])
            .is_err()
        );
        assert_eq!(weight_exact(1), "0.000001");
        assert_eq!(weight_exact(1_000_000), "1.000000");
    }
}
