use super::model::{changed, id, iso, text};
use crate::{
    approval_common::CommonSession,
    contract_support::{Error, canonical_hash, lock_project},
};
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) struct Sources {
    pub project: Value,
    pub members: Vec<Value>,
    pub materials: Vec<Value>,
    pub blockers: Vec<String>,
    pub hash: String,
}
pub(super) fn contract_changed(previous: &Value, current: &[Value]) -> bool {
    previous["members"].as_array().is_none_or(|members| {
        members.iter().any(|old| {
            current
                .iter()
                .find(|new| new["contractId"] == old["contractId"])
                .is_none_or(|new| new["snapshotId"] != old["snapshotId"])
        })
    })
}
fn trace_amendment_chains(
    previous: &Value,
    current: &[Value],
    amendments: &[Value],
) -> Result<Vec<Value>, Error> {
    let mut result = Vec::new();
    for old in previous["members"].as_array().ok_or(Error::Internal)? {
        let contract = id(old, "contractId")?;
        let new = current
            .iter()
            .find(|v| v["contractId"] == old["contractId"])
            .ok_or_else(changed)?;
        let from = id(old, "snapshotId")?;
        let to = id(new, "snapshotId")?;
        if from == to {
            continue;
        }
        let mut cursor = to;
        let mut expected = Some(id(new, "sourceAmendmentId")?);
        let mut seen = std::collections::BTreeSet::new();
        let mut chain = Vec::new();
        while cursor != from {
            let matches = amendments
                .iter()
                .filter(|a| {
                    a["contract_id"] == contract.to_string()
                        && a["after_snapshot_id"] == cursor.to_string()
                })
                .collect::<Vec<_>>();
            if matches.len() != 1 {
                return Err(changed());
            }
            let a = matches[0];
            let key = id(a, "id")?;
            let before = id(a, "before_snapshot_id")?;
            if expected != Some(key)
                || !seen.insert(key)
                || before == cursor
                || a["verified"] != true
                || !matches!(a["status"].as_str(), Some("effective" | "superseded"))
                || a["before_version"].as_i64().and_then(|v| v.checked_add(1))
                    != a["after_version"].as_i64()
            {
                return Err(changed());
            }
            chain.push(json!({"contractAmendmentId":key,"beforeSnapshotId":before,"afterSnapshotId":cursor,"preparationId":a["source_preparation_id"],"approvalRecordId":a["source_review_id"],"payloadHash":a["payload_hash"]}));
            cursor = before;
            expected = a["supersedes_id"]
                .as_str()
                .map(Uuid::parse_str)
                .transpose()
                .map_err(|_| Error::Internal)?;
        }
        chain.reverse();
        result.push(json!({"contractId":contract,"fromSnapshotId":from,"toSnapshotId":to,"amendments":chain}));
    }
    result.sort_by(|a, b| a["contractId"].as_str().cmp(&b["contractId"].as_str()));
    Ok(result)
}
pub(super) async fn rebaseline_lineage(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    previous: &Value,
    current: &[Value],
) -> Result<Vec<Value>, Error> {
    let rows:Vec<Value>=sqlx::query_scalar(r#"SELECT to_jsonb(a)||jsonb_build_object('verified',true,'before_version',before.version,'after_version',after.version)
      FROM poms.contract_amendment a
      JOIN poms.contract_term_snapshot before ON before.id=a.before_snapshot_id AND before.contract_id=a.contract_id
      JOIN poms.contract_term_snapshot after ON after.id=a.after_snapshot_id AND after.contract_id=a.contract_id AND after.source_amendment_id=a.id
      JOIN poms.contract_term_preparation p ON p.id=a.source_preparation_id AND p.contract_id=a.contract_id AND p.source_readiness_id=a.source_readiness_id AND p.contract_amendment_id=a.id AND p.before_snapshot_id=before.id AND p.activated_snapshot_id=after.id AND p.status='activated'
        AND p.payload_hash=a.payload_hash AND after.payload_hash=a.payload_hash AND after.source_preparation_id=p.id AND after.source_readiness_id=p.source_readiness_id AND after.source_baseline_id=p.source_baseline_id
        AND after.amount_tax_inclusive=p.amount_tax_inclusive AND after.amount_tax_exclusive=p.amount_tax_exclusive AND after.tax_rate=p.tax_rate AND after.down_payment_rate=p.down_payment_rate AND after.retention_rate=p.retention_rate
        AND after.payment_terms=p.payment_terms AND after.retention_due_date IS NOT DISTINCT FROM p.retention_due_date AND after.receivable_plan_seeds=p.receivable_plan_seeds
      JOIN poms.contract_review_binding b ON b.approval_record_id=a.source_review_id AND b.contract_id=a.contract_id AND b.preparation_id=p.id AND b.preparation_version=p.version AND b.contract_amendment_id=a.id AND b.payload_hash=a.payload_hash
      JOIN poms.approval_record approved ON approved.id=b.approval_record_id AND approved.target_object_type='contract' AND approved.target_object_id=a.contract_id AND approved.approval_type='contract-review' AND approved.current_status='approved'
      WHERE a.project_id=$1 AND a.producer_version=1 AND a.status IN ('effective','superseded') AND a.effective_at IS NOT NULL ORDER BY a.contract_id,a.version"#).bind(project).fetch_all(&mut *session.connection).await?;
    let chains = trace_amendment_chains(previous, current, &rows)?;
    for chain in &chains {
        for a in chain["amendments"].as_array().ok_or(Error::Internal)? {
            let p = crate::contract_readiness::load_preparation(
                session,
                id(chain, "contractId")?,
                id(a, "preparationId")?,
                false,
            )
            .await?;
            if p["payloadHash"] != a["payloadHash"]
                || p["contractAmendmentId"] != a["contractAmendmentId"]
                || p["beforeSnapshotId"] != a["beforeSnapshotId"]
                || p["activatedSnapshotId"] != a["afterSnapshotId"]
            {
                return Err(changed());
            }
        }
    }
    Ok(chains)
}
pub(super) async fn row(
    session: &mut CommonSession<'_, '_>,
    key: Uuid,
    lock: bool,
) -> Result<Value, Error> {
    let sql = if lock {
        "SELECT to_jsonb(h) FROM poms.project_handover h WHERE id=$1 FOR UPDATE"
    } else {
        "SELECT to_jsonb(h) FROM poms.project_handover h WHERE id=$1"
    };
    sqlx::query_scalar(sql)
        .bind(key)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("Project handover not found".into()))
}
pub(super) async fn current(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
) -> Result<Option<Value>, Error> {
    Ok(sqlx::query_scalar("SELECT to_jsonb(h) FROM poms.project_handover h WHERE project_id=$1 ORDER BY is_current DESC,version DESC NULLS LAST,created_at DESC,id LIMIT 1").bind(project).fetch_optional(&mut *session.connection).await?)
}
pub(super) async fn collect(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    lock: bool,
    inherited: Option<&Value>,
) -> Result<Sources, Error> {
    collect_scoped(session, project, lock, inherited, None).await
}
async fn collect_scoped(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    lock: bool,
    inherited: Option<&Value>,
    fixed_materials: Option<&[Value]>,
) -> Result<Sources, Error> {
    if lock {
        lock_project(session.connection, project).await?;
    }
    let p: Value = sqlx::query_scalar("SELECT to_jsonb(p) FROM poms.project p WHERE id=$1")
        .bind(project)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("Project not found".into()))?;
    if lock {
        sqlx::query("SELECT id FROM poms.contract WHERE project_id=$1 ORDER BY id FOR UPDATE")
            .bind(project)
            .fetch_all(&mut *session.connection)
            .await?;
    }
    // Only immutable, activation-approved provenance enters the fingerprint.
    // Current preparation/readiness flags can change while a new amendment is pending.
    let members:Vec<Value>=sqlx::query_scalar(r#"SELECT jsonb_build_object(
        'contractId',c.id,'contractNo',c.contract_no,'signedAmount',c.signed_amount::text,'currencyCode',c.currency_code,'signedAt',c.signed_at,
        'snapshotId',s.id,'snapshotVersion',s.version,'snapshotStatus',s.snapshot_status,
        'amountTaxInclusive',s.amount_tax_inclusive::text,'amountTaxExclusive',s.amount_tax_exclusive::text,
        'taxRate',s.tax_rate::text,'downPaymentRate',s.down_payment_rate::text,'retentionRate',s.retention_rate::text,
        'retentionDueDate',s.retention_due_date,'paymentTerms',s.payment_terms,
        'preparationId',p.id,'preparationVersion',p.version,'preparationStatus',p.status,'payloadHash',p.payload_hash,
        'snapshotPayloadHash',s.payload_hash,'activatedSnapshotId',p.activated_snapshot_id,'readinessId',s.source_readiness_id,
        'baselineId',s.source_baseline_id,'diffId',p.source_diff_result_id,'diffLevel',d.diff_level,'reviewStatus',d.review_status,
        'sourceFacts',p.source_facts,'sourceAmendmentId',s.source_amendment_id,
        'planVersionId',v.id,'planVersion',v.version,'planSnapshotId',v.snapshot_id,'planPayloadHash',v.payload_hash,
        'planAmount',v.amount_tax_inclusive::text,'planCurrencyCode',v.currency_code,
        'planPreparationId',v.source_preparation_id,'planReadinessId',v.source_readiness_id,'planInitializedAt',v.initialized_at,
        'reviewApprovalId',b.approval_record_id,'reviewPayloadHash',b.payload_hash,'approvalStatus',a.current_status,
        'snapshotEffectiveAt',s.effective_at,'initRecordId',i.id,'snapshotSeeds',s.receivable_plan_seeds,
        'planSeeds',(SELECT jsonb_agg(jsonb_build_object('nodeKey',n.node_key,'label',n.label,'plannedAmount',n.planned_amount::text,'plannedDate',n.planned_date::text,'isRetentionNode',n.is_retention_node,'sortOrder',n.sort_order,'note',n.note) ORDER BY n.sort_order,n.id) FROM poms.receivable_plan_node n WHERE n.plan_version_id=v.id))
      FROM poms.contract c
      LEFT JOIN poms.contract_term_snapshot s ON s.id=c.current_snapshot_id AND s.contract_id=c.id
      LEFT JOIN poms.contract_term_preparation p ON p.id=s.source_preparation_id AND p.contract_id=c.id
      LEFT JOIN poms.commercial_baseline_diff_result d ON d.id=p.source_diff_result_id AND d.contract_id=c.id
      LEFT JOIN poms.receivable_plan_version v ON v.contract_id=c.id AND v.is_current AND v.status='active'
      LEFT JOIN poms.receivable_plan_init_record i ON i.plan_version_id=v.id AND i.contract_id=c.id AND i.snapshot_id=s.id
      LEFT JOIN LATERAL (SELECT b.* FROM poms.contract_review_binding b JOIN poms.approval_record approved ON approved.id=b.approval_record_id AND approved.current_status='approved'
        WHERE b.preparation_id=p.id AND b.contract_id=c.id AND b.payload_hash=p.payload_hash AND b.contract_amendment_id IS NOT DISTINCT FROM s.source_amendment_id ORDER BY b.created_at DESC,b.approval_record_id DESC LIMIT 1) b ON true
      LEFT JOIN poms.approval_record a ON a.id=b.approval_record_id AND a.current_status='approved'
      WHERE c.project_id=$1 AND c.status='active' ORDER BY c.id"#)
        .bind(project).fetch_all(&mut *session.connection).await?;
    let mut seen = std::collections::BTreeSet::new();
    let mut members: Vec<Value> = members
        .into_iter()
        .filter(|v| seen.insert(v["contractId"].clone().to_string()))
        .collect();
    let mut blockers = Vec::new();
    if p["status"] == "closed" || p["status"] == "blocked" {
        blockers.push("项目已关闭或仍有未解除的阻断。".into());
    }
    if p["owner_user_id"].is_null() {
        blockers.push("项目缺少正式销售主责。".into());
    }
    if members.is_empty() {
        blockers.push("没有可承接的生效合同。".into());
    }
    for m in &mut members {
        for key in ["signedAt", "snapshotEffectiveAt", "planInitializedAt"] {
            m[key] = iso(&m[key]);
        }
        if member_ready(m) {
            match crate::contract_readiness::load_preparation(
                session,
                id(m, "contractId")?,
                id(m, "preparationId")?,
                false,
            )
            .await
            {
                Ok(prepared) => {
                    let plan_hash = crate::contract_readiness::formal_plan_payload_hash(
                        project,
                        id(m, "contractId")?,
                        id(m, "snapshotId")?,
                        id(m, "preparationId")?,
                        text(m, "payloadHash")?,
                        &prepared,
                    )?;
                    m["integrity"] = json!(
                        prepared["payloadHash"] == m["payloadHash"]
                            && prepared["sourceReadinessId"] == m["readinessId"]
                            && prepared["sourceBaselineId"] == m["baselineId"]
                            && m["signedAmount"] == m["amountTaxInclusive"]
                            && m["planAmount"] == m["amountTaxInclusive"]
                            && m["planCurrencyCode"] == m["currencyCode"]
                            && m["planPayloadHash"] == plan_hash
                            && [
                                "amountTaxInclusive",
                                "amountTaxExclusive",
                                "taxRate",
                                "downPaymentRate",
                                "retentionRate",
                                "retentionDueDate",
                                "paymentTerms"
                            ]
                            .iter()
                            .all(|key| prepared[*key] == m[*key])
                            && prepared["receivablePlanSeeds"] == m["snapshotSeeds"]
                    );
                    if m["integrity"] == true {
                        let source = id(&m["sourceFacts"]["cost"], "id")?;
                        let frozen = freeze_scope_risks(session, project, source).await?;
                        if frozen["sourceVersion"] != m["sourceFacts"]["cost"]["version"] {
                            m["integrity"] = json!(false);
                        } else {
                            m["handoverFacts"] = frozen;
                        }
                    }
                }
                Err(
                    Error::BadRequest(_)
                    | Error::Conflict(_)
                    | Error::CodedConflict { .. }
                    | Error::NotFound(_),
                ) => {
                    m["integrity"] = json!(false);
                }
                Err(error) => return Err(error),
            }
        } else {
            m["integrity"] = json!(false);
        }
        if !member_ready(m) {
            blockers.push(format!(
                "合同 {} 的生效快照、精确审核或正式计划来源尚未齐备。",
                m["contractId"].as_str().unwrap_or("")
            ));
        }
    }
    let pending:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.contract_handover_rebaseline_record WHERE project_id=$1 AND status IN ('processing','pending-effective'))").bind(project).fetch_one(&mut *session.connection).await?;
    if pending {
        blockers.push("再基线化仍在处理中。".into());
    }
    let materials = if let Some(captured) = fixed_materials {
        captured.to_vec()
    } else {
        let inherited_ids: Vec<Uuid> = inherited
            .and_then(|v| v["materials"].as_array())
            .map(|rows| {
                rows.iter()
                    .filter_map(|v| id(v, "attachmentId").ok())
                    .collect()
            })
            .unwrap_or_default();
        let material_sql = r#"WITH groups AS (SELECT DISTINCT a.version_group_id FROM poms.attachment a WHERE a.id=ANY($2::uuid[]) OR EXISTS(
            SELECT 1 FROM poms.attachment_link l WHERE l.attachment_id=a.id AND l.status='active' AND
            ((l.target_type='project' AND l.target_id=$1) OR (l.target_type='lead' AND l.target_id=(SELECT source_lead_id FROM poms.project WHERE id=$1))
            OR (l.target_type='contract' AND l.target_id IN (SELECT id FROM poms.contract WHERE project_id=$1))
            OR (l.target_type='sales-follow-up' AND l.target_id IN (SELECT id FROM poms.sales_follow_up_record WHERE project_id=$1 OR lead_id=(SELECT source_lead_id FROM poms.project WHERE id=$1)))))
          ) SELECT jsonb_build_object('attachmentId',a.id,'versionGroupId',a.version_group_id,
            'contentHash',a.checksum_sha256,'securityLevel',a.security_level,'status',a.status,'version',a.version_no,
            'included',a.status='active' AND a.security_level IN ('normal','internal'))
          FROM groups g JOIN LATERAL (SELECT * FROM poms.attachment a WHERE a.version_group_id=g.version_group_id
            ORDER BY (a.status='active') DESC,a.is_final DESC,a.is_latest DESC,a.version_no DESC,a.id LIMIT 1) a ON true
          ORDER BY a.version_group_id"#;
        let materials: Vec<Value> = sqlx::query_scalar(material_sql)
            .bind(project)
            .bind(&inherited_ids)
            .fetch_all(&mut *session.connection)
            .await?;
        if lock && !materials.is_empty() {
            let ids: Vec<Uuid> = materials
                .iter()
                .map(|m| id(m, "attachmentId"))
                .collect::<Result<_, _>>()?;
            sqlx::query("SELECT id FROM poms.attachment WHERE id=ANY($1) ORDER BY id FOR SHARE")
                .bind(&ids)
                .fetch_all(&mut *session.connection)
                .await?;
            let locked_materials: Vec<Value> = sqlx::query_scalar(material_sql)
                .bind(project)
                .bind(&inherited_ids)
                .fetch_all(&mut *session.connection)
                .await?;
            if locked_materials != materials {
                return Err(changed());
            }
        }
        materials
    };
    let hash = canonical_hash(
        &json!({"projectId":project,"salesOwnerUserId":p["owner_user_id"],"members":members,"materials":materials}),
    )?;
    Ok(Sources {
        project: p,
        members,
        materials,
        blockers,
        hash,
    })
}
async fn freeze_scope_risks(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    package: Uuid,
) -> Result<Value, Error> {
    let version: Option<i32> = sqlx::query_scalar(
        "SELECT version FROM poms.project_technical_cost_package WHERE id=$1 AND project_id=$2",
    )
    .bind(package)
    .bind(project)
    .fetch_optional(&mut *session.connection)
    .await?;
    let version = version
        .filter(|v| *v > 0)
        .ok_or_else(|| Error::Conflict("历史技术范围与风险来源不存在或不属于本项目。".into()))?;
    let scopes:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('id',id,'packageId',package_id,'scopeType',scope_type,'label',label,'description',description,'sortOrder',sort_order) FROM poms.project_technical_scope_item WHERE package_id=$1 ORDER BY sort_order,id").bind(package).fetch_all(&mut *session.connection).await?;
    let risks:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('id',id,'packageId',package_id,'riskCategory',risk_category,'riskLevel',risk_level,'riskDescription',risk_description,'impactScope',impact_scope,'mitigationPlan',mitigation_plan,'ownerRole',owner_role,'riskStatus',risk_status,'blocksNextStage',blocks_next_stage,'sortOrder',sort_order) FROM poms.project_technical_risk_item WHERE package_id=$1 ORDER BY sort_order,id").bind(package).fetch_all(&mut *session.connection).await?;
    // No cost rows, amounts, person, quantity or rate fields are copied into confirmation material.
    Ok(
        json!({"sourcePackageId":package,"sourceVersion":version,"scopeItems":scopes,"riskItems":risks,"costBaselineReference":{"id":package,"version":version}}),
    )
}
pub(super) fn member_ready(m: &Value) -> bool {
    m["integrity"] != false
        && !m["snapshotId"].is_null()
        && m["snapshotStatus"] == "active"
        && m["preparationStatus"] == "activated"
        && m["activatedSnapshotId"] == m["snapshotId"]
        && !m["payloadHash"].is_null()
        && m["payloadHash"] == m["snapshotPayloadHash"]
        && m["approvalStatus"] == "approved"
        && m["reviewPayloadHash"] == m["payloadHash"]
        && (m["diffLevel"] == "prompt"
            || (m["diffLevel"] == "review-required" && m["reviewStatus"] == "approved"))
        && !m["planVersionId"].is_null()
        && m["planSnapshotId"] == m["snapshotId"]
        && m["planPreparationId"] == m["preparationId"]
        && m["planReadinessId"] == m["readinessId"]
        && !m["initRecordId"].is_null()
        && !m["snapshotSeeds"].is_null()
        && m["snapshotSeeds"] == m["planSeeds"]
}
pub(super) async fn basis(session: &mut CommonSession<'_, '_>, h: &Value) -> Result<Value, Error> {
    if h["producer_version"] != 1 {
        return Err(Error::Conflict(
            "历史移交缺少真实生产依据，需要正式重新准备。".into(),
        ));
    }
    let v:Value=sqlx::query_scalar("SELECT to_jsonb(b) FROM poms.project_handover_basis_snapshot b WHERE id=$1 AND project_id=$2").bind(id(h,"basis_snapshot_id")?).bind(id(h,"project_id")?).fetch_optional(&mut *session.connection).await?.ok_or(Error::Internal)?;
    if canonical_hash(&v["source_payload"])? != text(&v, "payload_hash")?
        || v["source_hash"] != h["source_payload_hash"]
    {
        return Err(Error::Conflict("移交依据内容校验失败。".into()));
    }
    for (column, kind, package, target) in [
        (
            "contract_summary_snapshot_id",
            "project",
            "contract-handover-confirmation",
            id(h, "project_id")?,
        ),
        (
            "summary_snapshot_id",
            "project-handover",
            "project-handover-confirmation",
            id(h, "id")?,
        ),
    ] {
        let row:Option<Value>=sqlx::query_scalar("SELECT jsonb_build_object('payload',p.payload,'payloadHash',p.payload_hash,'sourceHash',p.source_hash,'basisId',p.basis_snapshot_id,'contractSummaryId',p.contract_summary_snapshot_id) FROM poms.project_handover_summary_payload p JOIN poms.approval_summary_snapshot s ON s.id=p.summary_snapshot_id WHERE s.id=$1 AND s.target_type=$2 AND s.target_id=$3 AND s.approval_scenario_key='handover-confirmation' AND s.summary_package_key=$4 AND s.projection_level='handover-confirmation' AND s.export_policy='handover-controlled' AND p.project_id=$5")
            .bind(id(h,column)?).bind(kind).bind(target).bind(package).bind(id(h,"project_id")?).fetch_optional(&mut *session.connection).await?;
        let row = row.ok_or_else(|| Error::Conflict("移交摘要来源链不完整。".into()))?;
        if row["basisId"] != h["basis_snapshot_id"]
            || row["payloadHash"] != v["payload_hash"]
            || row["sourceHash"] != v["source_hash"]
            || canonical_hash(&row["payload"])? != text(&v, "payload_hash")?
            || (kind == "project-handover"
                && row["contractSummaryId"] != h["contract_summary_snapshot_id"])
        {
            return Err(Error::Conflict("移交摘要来源链不一致。".into()));
        }
    }
    Ok(v)
}
// Root-owned additions to project_handover/sources.rs. Used by the generated
// handover-fixed-evidence03.patch; not a new HTTP/provider or a new producer.

fn captured_source_hash(payload: &Value) -> Result<String, Error> {
    id(payload, "projectId")?;
    if payload["members"].as_array().is_none() || payload["materials"].as_array().is_none() {
        return Err(changed());
    }
    canonical_hash(
        &json!({"projectId":payload["projectId"],"salesOwnerUserId":payload["salesOwnerUserId"],"members":payload["members"],"materials":payload["materials"]}),
    )
}

pub(super) fn confirmed_source_hash(
    project: &Value,
    members: &[Value],
    payload: &Value,
) -> Result<String, Error> {
    // The business comparison uses the actual current owner/contracts but the
    // exact original material set. New groups and new latest versions are not
    // sources of an already confirmed handover.
    captured_source_hash(
        &json!({"projectId":project["id"],"salesOwnerUserId":project["owner_user_id"],"members":members,"materials":payload["materials"]}),
    )
}

async fn fixed_duties_with_basis(
    session: &mut CommonSession<'_, '_>,
    h: &Value,
    b: &Value,
) -> Result<(), Error> {
    let project = id(h, "project_id")?;
    if h["producer_version"] != 1
        || h["is_current"] != true
        || !matches!(h["status"].as_str(), Some("draft" | "confirmed"))
        || b["status"] != "active"
        || b["is_current"] != true
        || b["version"] != h["version"]
    {
        return Err(changed());
    }
    let owner: Option<Uuid> =
        sqlx::query_scalar("SELECT owner_user_id FROM poms.project WHERE id=$1 FOR UPDATE")
            .bind(project)
            .fetch_optional(&mut *session.connection)
            .await?
            .ok_or_else(changed)?;
    let payload = &b["source_payload"];
    if payload["projectId"] != project.to_string()
        || owner != Some(id(payload, "salesOwnerUserId")?)
        || payload["executionOwnerUserId"] != h["execution_owner_user_id"]
        || payload["financeConfirmationRequired"] != h["finance_confirmation_required"]
        || payload["receiptJudgmentMode"] != h["prepared_receipt_judgment_mode"]
        || captured_source_hash(payload)? != text(h, "source_payload_hash")?
        || !payload["members"]
            .as_array()
            .ok_or_else(changed)?
            .iter()
            .any(|m| m["snapshotId"] == h["effective_handover_baseline_snapshot_id"])
    {
        return Err(changed());
    }
    let mut expected = std::collections::BTreeSet::new();
    let mut people = std::collections::BTreeSet::new();
    for user in payload["participants"].as_array().ok_or_else(changed)? {
        let user_id = id(user, "userId")?;
        if !people.insert(user_id) {
            return Err(changed());
        }
        let duties = user["responsibilities"]
            .as_array()
            .filter(|v| !v.is_empty())
            .ok_or_else(changed)?;
        for duty in duties {
            if !expected.insert((
                user_id,
                text(duty, "roleKey")?.to_owned(),
                text(duty, "responsibilitySummary")?.trim().to_owned(),
            )) {
                return Err(changed());
            }
        }
    }
    if people.is_empty() {
        return Err(changed());
    }
    let role_rows:Vec<(Uuid,String,String,bool)>=sqlx::query_as(r#"SELECT r.participant_user_id,r.role_key,r.responsibility_summary,
      (r.confirmation_record_id=$2 AND p.id IS NOT NULL AND p.confirmation_record_id=$2 AND p.participant_id=r.participant_user_id
        AND p.participant_status IN ('pending','confirmed') AND (p.participant_status<>'confirmed' OR p.confirmed_at IS NOT NULL))
      FROM poms.project_handover_participant_role r LEFT JOIN poms.confirmation_participant p ON p.id=r.confirmation_participant_id
      WHERE r.handover_id=$1 ORDER BY r.participant_user_id,r.role_key"#)
        .bind(id(h,"id")?).bind(id(h,"confirmation_record_id")?).fetch_all(&mut *session.connection).await?;
    let actual = role_rows
        .iter()
        .map(|(user, role, summary, _)| (*user, role.clone(), summary.clone()))
        .collect::<std::collections::BTreeSet<_>>();
    if actual != expected
        || role_rows.len() != expected.len()
        || role_rows.iter().any(|(_, _, _, valid)| !*valid)
    {
        return Err(changed());
    }
    let participants:Vec<(Uuid,String,Option<chrono::DateTime<chrono::Utc>>)>=sqlx::query_as("SELECT participant_id,participant_status,confirmed_at FROM poms.confirmation_participant WHERE confirmation_record_id=$1 ORDER BY participant_id,id FOR SHARE")
        .bind(id(h,"confirmation_record_id")?).fetch_all(&mut *session.connection).await?;
    let actual_people = participants
        .iter()
        .map(|(user, _, _)| *user)
        .collect::<std::collections::BTreeSet<_>>();
    if people != actual_people
        || participants.len() != people.len()
        || participants.iter().any(|(_, status, at)| {
            !matches!(status.as_str(), "pending" | "confirmed")
                || (status == "confirmed" && at.is_none())
        })
    {
        return Err(changed());
    }
    let c:Value=sqlx::query_scalar("SELECT to_jsonb(c) FROM poms.confirmation_record c WHERE id=$1 AND target_type='project-handover' AND confirmation_type='project-handover' AND target_id=$2 AND project_id=$3 FOR UPDATE")
        .bind(id(h,"confirmation_record_id")?).bind(id(h,"id")?).bind(project).fetch_optional(&mut *session.connection).await?.ok_or_else(changed)?;
    let confirmed = participants
        .iter()
        .filter(|(_, status, _)| status == "confirmed")
        .count();
    if c["required_count"].as_u64() != Some(people.len() as u64)
        || c["confirmed_count"].as_u64() != Some(confirmed as u64)
        || c["status"]
            != if confirmed == people.len() {
                "confirmed"
            } else {
                "pending"
            }
    {
        return Err(changed());
    }
    if h["status"] == "confirmed"
        && (h["confirmed_at"].is_null()
            || h["confirmed_by"].is_null()
            || confirmed != people.len()
            || c["confirmed_at"].is_null())
    {
        return Err(changed());
    }
    Ok(())
}

/// Authorization verifies the immutable package and real current duty relation.
/// Current attachment groups, later receipt/cost data and unrelated user profile
/// changes cannot revoke this relation. Root separately checks the active actor.
pub(super) async fn intrinsic_frozen_duties(
    session: &mut CommonSession<'_, '_>,
    h: &Value,
) -> Result<Value, Error> {
    let b = basis(session, h).await?; // Recomputes basis + both actual summary payload hashes.
    fixed_duties_with_basis(session, h, &b).await?;
    Ok(b)
}

async fn all_participants_active(
    session: &mut CommonSession<'_, '_>,
    h: &Value,
) -> Result<bool, Error> {
    let inactive:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_handover_participant_role r LEFT JOIN poms.platform_user u ON u.id=r.participant_user_id WHERE r.handover_id=$1 AND (u.id IS NULL OR NOT u.is_active))")
        .bind(id(h,"id")?).fetch_one(&mut *session.connection).await?;
    Ok(!inactive)
}

pub(super) async fn fixed_included_materials_current(
    session: &mut CommonSession<'_, '_>,
    payload: &Value,
) -> Result<bool, Error> {
    let mut included = std::collections::BTreeMap::new();
    for material in payload["materials"].as_array().ok_or_else(changed)? {
        let include = material["included"].as_bool().ok_or_else(changed)?;
        if !include {
            continue;
        }
        let key = id(material, "attachmentId")?;
        let hash = text(material, "contentHash")?;
        if hash.len() != 64
            || !hash
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
            || material["status"] != "active"
            || !matches!(
                material["securityLevel"].as_str(),
                Some("normal" | "internal")
            )
            || material["version"].as_i64().is_none_or(|v| v <= 0)
            || included.insert(key, material).is_some()
        {
            return Err(changed());
        }
    }
    if included.is_empty() {
        return Ok(true);
    }
    let ids = included.keys().copied().collect::<Vec<_>>();
    // Exact captured IDs only. Do not select by version group, latest or final.
    let current:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('attachmentId',id,'versionGroupId',version_group_id,'contentHash',checksum_sha256,'securityLevel',security_level,'status',status,'version',version_no) FROM poms.attachment WHERE id=ANY($1) ORDER BY id FOR SHARE")
        .bind(ids).fetch_all(&mut *session.connection).await?;
    if current.len() != included.len() {
        return Ok(false);
    }
    for actual in current {
        let key = id(&actual, "attachmentId")?;
        let Some(expected) = included.get(&key) else {
            return Ok(false);
        };
        if actual["status"] != "active"
            || [
                "attachmentId",
                "versionGroupId",
                "contentHash",
                "securityLevel",
                "version",
            ]
            .iter()
            .any(|field| actual[*field] != expected[*field])
        {
            return Ok(false);
        }
    }
    Ok(true)
}

/// Business admission additionally validates real current contracts/snapshots/
/// formal plans and the originally included immutable attachment identities.
pub(super) async fn confirmed_sources(
    session: &mut CommonSession<'_, '_>,
    h: &Value,
) -> Result<Sources, Error> {
    if h["status"] != "confirmed" {
        return Err(changed());
    }
    let b = intrinsic_frozen_duties(session, h).await?;
    let materials = b["source_payload"]["materials"]
        .as_array()
        .ok_or_else(changed)?;
    let s = collect_scoped(
        session,
        id(h, "project_id")?,
        true,
        Some(&b["source_payload"]),
        Some(materials),
    )
    .await?;
    if !s.blockers.is_empty()
        || s.hash != text(h, "source_payload_hash")?
        || !all_participants_active(session, h).await?
        || !fixed_included_materials_current(session, &b["source_payload"]).await?
    {
        return Err(changed());
    }
    Ok(s)
}

// Replaces the original fresh body. Draft self-confirm/finalize still compare
// the complete current live fingerprint, including any new material groups.
pub(super) async fn fresh(
    session: &mut CommonSession<'_, '_>,
    h: &Value,
) -> Result<Sources, Error> {
    let b = basis(session, h).await?;
    let s = collect(
        session,
        id(h, "project_id")?,
        true,
        Some(&b["source_payload"]),
    )
    .await?;
    fixed_duties_with_basis(session, h, &b).await?;
    if !all_participants_active(session, h).await?
        || !s.blockers.is_empty()
        || s.hash != text(h, "source_payload_hash")?
    {
        return Err(changed());
    }
    Ok(s)
}

/// Historical facts for F; confirmedAt is a fact, never an invented execution interval.
pub async fn load_handover_facts_in_session(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    as_of: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<Vec<Value>, Error> {
    Ok(sqlx::query_scalar(r#"SELECT jsonb_build_object('handoverId',h.id,'projectId',h.project_id,'status',h.status,'confirmedAt',h.confirmed_at,
      'confirmedBy',h.confirmed_by,'contractSummarySnapshotId',h.contract_summary_snapshot_id,'handoverSummarySnapshotId',h.summary_snapshot_id,
      'effectiveHandoverBaselineSnapshotId',h.effective_handover_baseline_snapshot_id,'handoverBasisSnapshotId',h.basis_snapshot_id,
      'handoverRebaselineRecordId',h.handover_rebaseline_record_id,'sourcePayloadHash',h.source_payload_hash,
      'contractMembers',(SELECT jsonb_agg(jsonb_build_object('contractId',m.contract_id,'termSnapshotId',m.term_snapshot_id,'readinessId',m.readiness_package_id,'planVersionId',m.plan_version_id) ORDER BY m.contract_id) FROM poms.project_handover_contract_basis m WHERE m.basis_snapshot_id=b.id)) FROM poms.project_handover h JOIN poms.project_handover_basis_snapshot b ON b.id=h.basis_snapshot_id
      WHERE h.project_id=$1 AND h.producer_version=1 AND h.confirmed_at IS NOT NULL AND ($2::timestamptz IS NULL OR h.confirmed_at<=$2) ORDER BY h.confirmed_at,h.id"#)
      .bind(project).bind(as_of).fetch_all(&mut *session.connection).await?)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn chain_fixture() -> (Value, Vec<Value>, Vec<Value>) {
        let uid = |v| Uuid::from_u128(v);
        let previous = json!({"members":[{"contractId":uid(100),"snapshotId":uid(1)},{"contractId":uid(200),"snapshotId":uid(4)}]});
        let current = vec![
            json!({"contractId":uid(100),"snapshotId":uid(3),"sourceAmendmentId":uid(12)}),
            json!({"contractId":uid(200),"snapshotId":uid(5),"sourceAmendmentId":uid(21)}),
        ];
        let row = |contract, key, before, after, version, supersedes: Option<Uuid>| json!({"id":uid(key),"contract_id":uid(contract),"before_snapshot_id":uid(before),"after_snapshot_id":uid(after),"before_version":version,"after_version":version+1,"supersedes_id":supersedes,"status":"superseded","verified":true,"source_preparation_id":uid(key+1000),"source_review_id":uid(key+2000),"payload_hash":"frozen"});
        let rows = vec![
            row(100, 11, 1, 2, 1, None),
            row(100, 12, 2, 3, 2, Some(uid(11))),
            row(200, 21, 4, 5, 1, None),
        ];
        (previous, current, rows)
    }
    #[test]
    fn rebaseline_traces_every_changed_contract() {
        let (previous, current, rows) = chain_fixture();
        let chains = trace_amendment_chains(&previous, &current, &rows).unwrap();
        assert_eq!(chains.len(), 2);
        assert_eq!(chains[0]["amendments"].as_array().unwrap().len(), 2);
        assert_eq!(chains[1]["amendments"].as_array().unwrap().len(), 1);
    }
    #[test]
    fn rebaseline_retains_two_successive_activations_in_order() {
        let (previous, current, rows) = chain_fixture();
        let chains = trace_amendment_chains(&previous, &current, &rows).unwrap();
        assert_eq!(
            chains[0]["amendments"][0]["contractAmendmentId"],
            json!(Uuid::from_u128(11))
        );
        assert_eq!(
            chains[0]["amendments"][1]["contractAmendmentId"],
            json!(Uuid::from_u128(12))
        );
    }
    #[test]
    fn rebaseline_rejects_missing_mismatched_or_branched_history() {
        let (previous, current, mut rows) = chain_fixture();
        assert!(trace_amendment_chains(&previous, &current, &rows[1..]).is_err());
        rows[0]["contract_id"] = json!(Uuid::from_u128(999));
        assert!(trace_amendment_chains(&previous, &current, &rows).is_err());
        let (previous, current, mut rows) = chain_fixture();
        rows.push(rows[0].clone());
        assert!(trace_amendment_chains(&previous, &current, &rows).is_err());
        rows.pop();
        rows[0]["verified"] = json!(false);
        assert!(trace_amendment_chains(&previous, &current, &rows).is_err());
    }
    #[test]
    fn existing_contract_snapshot_changes_require_rebaseline_but_new_contracts_can_be_prepared() {
        let previous = json!({"members":[{"contractId":"a","snapshotId":"a1"}]});
        assert!(!contract_changed(
            &previous,
            &[
                json!({"contractId":"a","snapshotId":"a1"}),
                json!({"contractId":"b","snapshotId":"b1"})
            ]
        ));
        assert!(contract_changed(
            &previous,
            &[json!({"contractId":"a","snapshotId":"a2"})]
        ));
        assert!(contract_changed(
            &previous,
            &[json!({"contractId":"b","snapshotId":"b1"})]
        ));
    }
    #[test]
    fn readiness_requires_exact_formal_plan_not_any_same_contract_plan() {
        let m = json!({"snapshotId":"s","snapshotStatus":"active","preparationStatus":"activated","activatedSnapshotId":"s","payloadHash":"h","snapshotPayloadHash":"h","approvalStatus":"approved","reviewPayloadHash":"h","diffLevel":"prompt","planVersionId":"p","planSnapshotId":"other","planPreparationId":"prep","preparationId":"prep","planReadinessId":"r","readinessId":"r","initRecordId":"i"});
        assert!(!member_ready(&m));
        let mut exact = m;
        exact["planSnapshotId"] = json!("s");
        exact["snapshotSeeds"] = json!([{"nodeKey":"one","plannedAmount":"10.00"}]);
        exact["planSeeds"] = exact["snapshotSeeds"].clone();
        assert!(member_ready(&exact));
        exact["planSeeds"][0]["plannedAmount"] = json!("11.00");
        assert!(!member_ready(&exact));
    }
}
