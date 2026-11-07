use serde_json::{Value,json};
use uuid::Uuid;
fn completed_purpose_matches(
    purpose: &Value,
    source: &Value,
    project: Uuid,
    parent: Uuid,
    child: Uuid,
    actor: Uuid,
) -> bool {
    let session = &purpose["session"];
    let attachment = &purpose["attachment"];
    let link = &purpose["link"];
    session["project_scope_context_version"] == 1
        && session["completion_record_id"] == parent.to_string()
        && session["completion_condition_id"] == child.to_string()
        && session["target_type"] == "project"
        && session["target_id"] == project.to_string()
        && session["operation_type"] == "create-attachment"
        && session["status"] == "completed"
        && session["base_attachment_id"].is_null()
        && session["created_by"] == actor.to_string()
        && attachment["uploaded_by"] == actor.to_string()
        && source["uploadedBy"] == actor.to_string()
        && session["completed_attachment_id"] == attachment["id"]
        && attachment["id"] == source["attachmentId"]
        && attachment["status"] == "active"
        && attachment["version_no"] == 1
        && attachment["previous_attachment_id"].is_null()
        && attachment["version_group_id"] == attachment["id"]
        && attachment["row_version"] == source["attachmentRowVersion"]
        && attachment["row_version"]
            .as_i64()
            .is_some_and(|v| v > 0 && v <= i64::from(i32::MAX))
        && session["row_version"]
            .as_i64()
            .is_some_and(|v| v > 0 && v <= i64::from(i32::MAX))
        && session["checksum_sha256"] == attachment["checksum_sha256"]
        && attachment["checksum_sha256"] == source["checksumSha256"]
        && !session["checksum_sha256"].is_null()
        && session["size_bytes"] == attachment["size_bytes"]
        && !session["completed_at"].is_null()
        && !session["uploaded_at"].is_null()
        && link["id"] == source["attachmentLinkId"]
        && link["attachment_id"] == attachment["id"]
        && link["target_type"] == "project"
        && link["target_id"] == project.to_string()
        && link["status"] == "active"
        && link["linked_by"] == actor.to_string()
        && link["relation_type"] == session["relation_type"]
}

#[cfg(test)]
mod tests { use super::*;
    fn purpose_fixture() -> (Value, Value, Uuid, Uuid, Uuid, Uuid) {
        let project = Uuid::from_u128(1);
        let parent = Uuid::from_u128(2);
        let child = Uuid::from_u128(3);
        let actor = Uuid::from_u128(4);
        let attachment = Uuid::from_u128(5);
        let link = Uuid::from_u128(6);
        let checksum = "a".repeat(64);
        let source = json!({"attachmentId":attachment,"attachmentLinkId":link,"attachmentRowVersion":3,"checksumSha256":checksum,"uploadedBy":actor});
        let fact = json!({"session":{"id":Uuid::from_u128(7),"row_version":4,"project_scope_context_version":1,"completion_record_id":parent,"completion_condition_id":child,"target_type":"project","target_id":project,"operation_type":"create-attachment","status":"completed","base_attachment_id":null,"created_by":actor,"completed_attachment_id":attachment,"checksum_sha256":checksum,"size_bytes":24,"uploaded_at":"2026-11-07T00:00:00Z","completed_at":"2026-11-07T00:01:00Z","relation_type":"evidence"},"attachment":{"id":attachment,"row_version":3,"status":"active","version_no":1,"version_group_id":attachment,"previous_attachment_id":null,"uploaded_by":actor,"checksum_sha256":checksum,"size_bytes":24},"link":{"id":link,"attachment_id":attachment,"target_type":"project","target_id":project,"status":"active","linked_by":actor,"relation_type":"evidence"}});
        (fact, source, project, parent, child, actor)
    }

    #[test]
    fn ordinary_upload_by_same_actor_is_not_task_purpose_authority() {
        let (mut fact, source, p, parent, k, actor) = purpose_fixture();
        fact["session"]["project_scope_context_version"] = json!(0);
        assert!(!completed_purpose_matches(
            &fact, &source, p, parent, k, actor
        ));
    }

    #[test]
    fn another_owned_condition_or_wrong_parent_project_actor_cannot_be_reused() {
        let (fact, source, p, parent, k, actor) = purpose_fixture();
        for field in [
            "completion_condition_id",
            "completion_record_id",
            "target_id",
            "created_by",
        ] {
            let mut changed = fact.clone();
            changed["session"][field] = json!(Uuid::from_u128(99));
            assert!(!completed_purpose_matches(
                &changed, &source, p, parent, k, actor
            ));
        }
    }

    #[test]
    fn task_purpose_requires_actual_completed_original_file_and_exact_link() {
        let (fact, source, p, parent, k, actor) = purpose_fixture();
        for (object, field, value) in [
            ("session", "status", json!("uploaded")),
            (
                "session",
                "completed_attachment_id",
                json!(Uuid::from_u128(99)),
            ),
            ("session", "checksum_sha256", json!("b".repeat(64))),
            ("attachment", "version_no", json!(2)),
            ("attachment", "uploaded_by", json!(Uuid::from_u128(99))),
            ("attachment", "row_version", json!(2)),
            ("link", "attachment_id", json!(Uuid::from_u128(99))),
            ("link", "target_id", json!(Uuid::from_u128(99))),
            ("link", "linked_by", json!(Uuid::from_u128(99))),
        ] {
            let mut changed = fact.clone();
            changed[object][field] = value;
            assert!(!completed_purpose_matches(
                &changed, &source, p, parent, k, actor
            ));
        }
    }

    #[test]
    fn exact_completed_purpose_uses_real_current_attachment_row_version() {
        let (fact, source, p, parent, k, actor) = purpose_fixture();
        assert!(completed_purpose_matches(
            &fact, &source, p, parent, k, actor
        ));
        assert_eq!(source["attachmentRowVersion"], 3);
    }


}
