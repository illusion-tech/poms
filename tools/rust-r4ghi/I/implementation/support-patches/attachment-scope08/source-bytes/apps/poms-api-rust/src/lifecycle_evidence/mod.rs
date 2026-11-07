//! Project lifecycle evidence is captured from real, accessible attachment links.
//! Every read and write uses the caller's existing transaction.
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error, canonical_hash, new_uuid},
    project_operating_common::model::LifecycleEvidenceRef,
};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use uuid::Uuid;

#[derive(Clone, Copy)]
pub enum EvidenceOwner {
    Stage(Uuid),
    Acceptance(Uuid),
    Completion(Uuid),
    Condition(Uuid),
    Closure(Uuid),
    Archive(Uuid),
}
impl EvidenceOwner {
    fn columns(self) -> [Option<Uuid>; 6] {
        match self {
            Self::Stage(id) => [Some(id), None, None, None, None, None],
            Self::Acceptance(id) => [None, Some(id), None, None, None, None],
            Self::Completion(id) => [None, None, Some(id), None, None, None],
            Self::Condition(id) => [None, None, None, Some(id), None, None],
            Self::Closure(id) => [None, None, None, None, Some(id), None],
            Self::Archive(id) => [None, None, None, None, None, Some(id)],
        }
    }
}

#[derive(Clone, Copy)]
pub enum EvidenceAccess {
    FullProject,
    /// A task holder can add their own uploaded evidence or reuse evidence already
    /// frozen to that task. Knowing another project's attachment ID grants nothing.
    OwnCondition(Uuid),
}

pub struct FrozenEvidenceSet {
    rows: Vec<Value>,
}
impl FrozenEvidenceSet {
    pub fn public_refs(&self) -> Vec<Value> {
        self.rows.iter().map(public_ref).collect()
    }
}

fn permitted(actor: &Actor, permission: &str) -> bool {
    actor
        .session
        .user
        .permissions
        .iter()
        .any(|p| p.as_str() == permission)
}

fn readable_classification(actor: &Actor, row: &Value) -> bool {
    classification_readable(row, sensitive_read(actor))
}

fn sensitive_read(actor: &Actor) -> bool {
    [
        "contract:finance:sensitive:read",
        "operating:finance:sensitive:read",
        "commission:amount:sensitive:read",
        "platform:roles:manage",
    ]
    .iter()
    .any(|permission| permitted(actor, permission))
}

fn classification_readable(row: &Value, can_read_sensitive: bool) -> bool {
    match row["securityLevel"].as_str() {
        Some("normal" | "internal" | "sensitive") => true,
        Some("confidential" | "restricted") => can_read_sensitive,
        _ => false,
    }
}

fn public_ref(row: &Value) -> Value {
    json!({
        "attachmentLinkId":row["attachmentLinkId"],
        "attachmentId":row["attachmentId"],
        "attachmentRowVersion":row["attachmentRowVersion"],
        "checksumSha256":row["checksumSha256"],
        "fileName":row["fileName"]
    })
}

fn current_public_ref(
    project_id: Uuid,
    frozen: &Value,
    current: &Value,
    can_read_project: bool,
    can_read_sensitive: bool,
) -> Result<Value, Error> {
    if !can_read_project
        || !classification_readable(current, can_read_sensitive)
        || !classification_readable(frozen, can_read_sensitive)
    {
        return Err(Error::Forbidden("无权读取该附件安全等级。".into()));
    }
    if current["attachmentLinkId"] != frozen["attachmentLinkId"]
        || current["attachmentId"] != frozen["attachmentId"]
        || current["targetType"] != "project"
        || current["targetId"] != project_id.to_string()
        || current["linkStatus"] != "active"
        || current["attachmentStatus"] != "active"
    {
        return Err(Error::NotFound("生命周期证据当前不可读取。".into()));
    }
    if current["attachmentRowVersion"] != frozen["attachmentRowVersion"]
        || current["checksumSha256"] != frozen["checksumSha256"]
    {
        return Err(Error::Conflict(
            "证据来源版本或校验和已变更，冻结引用保持原样。".into(),
        ));
    }
    Ok(public_ref(frozen))
}

/// Locks exact source links and attachments in UUID order. The project scope
/// proof is checked by the owning command before calling this helper.
pub async fn validate_and_freeze(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    refs: &[LifecycleEvidenceRef],
    access: EvidenceAccess,
    actor: &Actor,
) -> Result<FrozenEvidenceSet, Error> {
    if !permitted(actor, "project:read") {
        return Err(Error::Forbidden(
            "读取生命周期证据需要 project:read。".into(),
        ));
    }
    let mut ids = refs
        .iter()
        .map(|r| r.attachment_link_id)
        .collect::<Vec<_>>();
    ids.sort();
    if ids.is_empty()
        || ids.len() > 100
        || ids.iter().copied().collect::<BTreeSet<_>>().len() != ids.len()
    {
        return Err(Error::BadRequest(
            "证据必须为 1 到 100 个不同的真实附件关联。".into(),
        ));
    }
    let mut rows = Vec::with_capacity(ids.len());
    let mut attachments = BTreeSet::new();
    for link_id in ids {
        let row: Value = sqlx::query_scalar(
            r#"SELECT jsonb_build_object(
          'attachmentLinkId',l.id,'attachmentId',a.id,'attachmentRowVersion',a.row_version,
          'checksumSha256',a.checksum_sha256,'fileName',a.original_name,
          'targetType',l.target_type,'targetId',l.target_id,'linkStatus',l.status,
          'attachmentStatus',a.status,'securityLevel',a.security_level,
          'uploadedBy',a.uploaded_by,'relationType',l.relation_type)
          FROM poms.attachment_link l JOIN poms.attachment a ON a.id=l.attachment_id
          WHERE l.id=$1 FOR UPDATE OF l,a"#,
        )
        .bind(link_id)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("生命周期证据不存在。".into()))?;
        if row["targetType"] != "project"
            || row["targetId"] != project_id.to_string()
            || row["linkStatus"] != "active"
            || row["attachmentStatus"] != "active"
        {
            return Err(Error::Conflict("证据须是本项目当前有效的附件关联。".into()));
        }
        if !readable_classification(actor, &row) {
            return Err(Error::Forbidden("无权读取该附件安全等级。".into()));
        }
        if let EvidenceAccess::OwnCondition(condition_id) = access {
            let already_owned: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_lifecycle_evidence_ref WHERE project_id=$1 AND completion_condition_id=$2 AND attachment_link_id=$3 AND attachment_id=$4)")
                .bind(project_id).bind(condition_id).bind(link_id)
                .bind(uuid_field(&row, "attachmentId")?).fetch_one(&mut *session.connection).await?;
            if row["uploadedBy"] != actor.id.to_string() && !already_owned {
                return Err(Error::NotFound("本人条件证据不存在。".into()));
            }
        }
        let checksum = row["checksumSha256"].as_str().unwrap_or_default();
        let version = row["attachmentRowVersion"].as_i64().unwrap_or(0);
        if checksum.len() != 64
            || !checksum
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
            || version <= 0
            || version > i64::from(i32::MAX)
            || row["fileName"].as_str().is_none_or(|v| v.trim().is_empty())
            || !attachments.insert(uuid_field(&row, "attachmentId")?)
        {
            return Err(Error::Conflict("证据版本、校验和或文件标识无效。".into()));
        }
        rows.push(row);
    }
    Ok(FrozenEvidenceSet { rows })
}

fn uuid_field(value: &Value, name: &str) -> Result<Uuid, Error> {
    value[name]
        .as_str()
        .and_then(|v| Uuid::parse_str(v).ok())
        .ok_or(Error::Internal)
}

pub async fn persist(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    owner: EvidenceOwner,
    evidence: &FrozenEvidenceSet,
    actor: &Actor,
) -> Result<(), Error> {
    let columns = owner.columns();
    for row in &evidence.rows {
        let id = new_uuid()?;
        let payload = json!({"schemaVersion":1,"projectId":project_id,"source":row});
        let hash = canonical_hash(&payload)?;
        sqlx::query("INSERT INTO poms.project_lifecycle_evidence_ref(id,project_id,stage_record_id,acceptance_record_id,completion_record_id,completion_condition_id,condition_closure_id,archive_record_id,attachment_link_id,attachment_id,attachment_row_version,checksum_sha256,file_name,source_payload,source_payload_hash,frozen_at,frozen_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)")
            .bind(id).bind(project_id).bind(columns[0]).bind(columns[1]).bind(columns[2]).bind(columns[3]).bind(columns[4]).bind(columns[5])
            .bind(uuid_field(row,"attachmentLinkId")?).bind(uuid_field(row,"attachmentId")?)
            .bind(i32::try_from(row["attachmentRowVersion"].as_i64().ok_or(Error::Internal)?).map_err(|_| Error::Internal)?)
            .bind(row["checksumSha256"].as_str().ok_or(Error::Internal)?).bind(row["fileName"].as_str().ok_or(Error::Internal)?)
            .bind(payload).bind(hash).bind(crate::auth::model::clock_now()).bind(actor.id)
            .execute(&mut *session.connection).await?;
        session
            .state
            .trace
            .inserted("project_lifecycle_evidence_ref", &id.to_string());
    }
    Ok(())
}

/// Reads only the exact owner's frozen references. It never joins parent
/// acceptance/completion payloads or broadens to all project attachments.
pub async fn read(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    owner: EvidenceOwner,
    actor: &Actor,
) -> Result<Vec<Value>, Error> {
    if !permitted(actor, "project:read") {
        return Err(Error::Forbidden(
            "读取生命周期证据需要 project:read。".into(),
        ));
    }
    let columns = owner.columns();
    let rows: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(e) FROM poms.project_lifecycle_evidence_ref e WHERE project_id=$1 AND (stage_record_id=$2 OR acceptance_record_id=$3 OR completion_record_id=$4 OR completion_condition_id=$5 OR condition_closure_id=$6 OR archive_record_id=$7) ORDER BY attachment_link_id")
        .bind(project_id).bind(columns[0]).bind(columns[1]).bind(columns[2]).bind(columns[3]).bind(columns[4]).bind(columns[5])
        .fetch_all(&mut *session.connection).await?;
    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        let source = &row["source_payload"]["source"];
        let hash = canonical_hash(&row["source_payload"])?;
        if row["source_payload_hash"].as_str() != Some(hash.as_str()) {
            return Err(Error::Forbidden("证据冻结校验失败。".into()));
        }
        let current: Value = sqlx::query_scalar(
            r#"SELECT jsonb_build_object(
          'attachmentLinkId',l.id,'attachmentId',a.id,'attachmentRowVersion',a.row_version,
          'checksumSha256',a.checksum_sha256,'securityLevel',a.security_level,
          'targetType',l.target_type,'targetId',l.target_id,'linkStatus',l.status,
          'attachmentStatus',a.status)
          FROM poms.attachment_link l JOIN poms.attachment a ON a.id=l.attachment_id
          WHERE l.id=$1 AND a.id=$2 FOR SHARE OF l,a"#,
        )
        .bind(uuid_field(source, "attachmentLinkId")?)
        .bind(uuid_field(source, "attachmentId")?)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("生命周期证据当前不可读取。".into()))?;
        result.push(current_public_ref(
            project_id,
            source,
            &current,
            permitted(actor, "project:read"),
            sensitive_read(actor),
        )?);
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn frozen_source() -> (Uuid, Value) {
        let project = Uuid::from_u128(1);
        (
            project,
            json!({
                "attachmentLinkId":Uuid::from_u128(2),
                "attachmentId":Uuid::from_u128(3),
                "attachmentRowVersion":1,
                "checksumSha256":"a".repeat(64),
                "fileName":"frozen-proof.pdf",
                "targetType":"project",
                "targetId":project,
                "linkStatus":"active",
                "attachmentStatus":"active",
                "securityLevel":"normal"
            }),
        )
    }

    #[test]
    fn current_classification_upgrade_blocks_frozen_normal_metadata() {
        let (project, frozen) = frozen_source();
        for level in ["confidential", "restricted"] {
            let mut current = frozen.clone();
            current["securityLevel"] = json!(level);
            current["attachmentRowVersion"] = json!(2);
            assert!(matches!(
                current_public_ref(project, &frozen, &current, true, false),
                Err(Error::Forbidden(_))
            ));
        }
    }

    #[test]
    fn withdrawn_link_or_attachment_blocks_frozen_metadata() {
        let (project, frozen) = frozen_source();
        for field in ["linkStatus", "attachmentStatus"] {
            let mut current = frozen.clone();
            current[field] = json!("inactive");
            assert!(matches!(
                current_public_ref(project, &frozen, &current, true, false),
                Err(Error::NotFound(_))
            ));
        }
    }

    #[test]
    fn reparented_or_replaced_source_cannot_project_frozen_metadata() {
        let (project, frozen) = frozen_source();
        for field in ["attachmentLinkId", "attachmentId", "targetId"] {
            let mut current = frozen.clone();
            current[field] = json!(Uuid::from_u128(99));
            assert!(matches!(
                current_public_ref(project, &frozen, &current, true, false),
                Err(Error::NotFound(_))
            ));
        }
        let mut current = frozen.clone();
        current["targetType"] = json!("contract");
        assert!(matches!(
            current_public_ref(project, &frozen, &current, true, false),
            Err(Error::NotFound(_))
        ));
    }

    #[test]
    fn changed_version_or_checksum_does_not_replace_frozen_reference() {
        let (project, frozen) = frozen_source();
        for (field, value) in [
            ("attachmentRowVersion", json!(2)),
            ("checksumSha256", json!("b".repeat(64))),
        ] {
            let mut current = frozen.clone();
            current[field] = value;
            assert!(matches!(
                current_public_ref(project, &frozen, &current, true, true),
                Err(Error::Conflict(_))
            ));
        }
    }

    #[test]
    fn current_source_requires_project_permission_and_known_classification() {
        let (project, frozen) = frozen_source();
        assert!(matches!(
            current_public_ref(project, &frozen, &frozen, false, true),
            Err(Error::Forbidden(_))
        ));
        let mut current = frozen.clone();
        current["securityLevel"] = Value::Null;
        assert!(matches!(
            current_public_ref(project, &frozen, &current, true, true),
            Err(Error::Forbidden(_))
        ));
    }

    #[test]
    fn unchanged_readable_source_returns_only_original_frozen_reference() {
        let (project, mut frozen) = frozen_source();
        for level in ["normal", "internal", "sensitive"] {
            frozen["securityLevel"] = json!(level);
            assert_eq!(
                current_public_ref(project, &frozen, &frozen, true, false).ok(),
                Some(public_ref(&frozen))
            );
        }
        frozen["securityLevel"] = json!("restricted");
        assert!(matches!(
            current_public_ref(project, &frozen, &frozen, true, false),
            Err(Error::Forbidden(_))
        ));
        assert_eq!(
            current_public_ref(project, &frozen, &frozen, true, true).ok(),
            Some(public_ref(&frozen))
        );
    }

    #[test]
    fn evidence_projection_cannot_copy_attachment_authority_or_parent_payload() {
        let projected = public_ref(
            &json!({"attachmentLinkId":"l","attachmentId":"a","attachmentRowVersion":1,"checksumSha256":"h","fileName":"proof","uploadedBy":"private","storageKey":"secret","acceptanceRecordId":"parent"}),
        );
        assert_eq!(projected.as_object().unwrap().len(), 5);
        assert!(!projected.to_string().contains("private"));
        assert!(!projected.to_string().contains("parent"));
    }
}
