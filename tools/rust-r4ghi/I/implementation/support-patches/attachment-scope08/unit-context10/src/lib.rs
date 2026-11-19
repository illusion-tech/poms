mod validation {
pub(super) fn valid_uuid(s: &str) -> bool {
    if s == "00000000-0000-0000-0000-000000000000" || s == "ffffffff-ffff-ffff-ffff-ffffffffffff" {
        return true;
    }
    let b = s.as_bytes();
    b.len() == 36
        && b.iter().enumerate().all(|(i, v)| {
            if [8, 13, 18, 23].contains(&i) {
                *v == b'-'
            } else {
                v.is_ascii_hexdigit()
            }
        })
        && matches!(b[14], b'1'..=b'8')
        && matches!(b[19], b'8' | b'9' | b'a' | b'b' | b'A' | b'B')
}
}
mod model {
#[derive(Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompletionConditionContext {
    #[serde(deserialize_with = "context_uuid")]
    pub completion_record_id: uuid::Uuid,
    #[serde(deserialize_with = "context_uuid")]
    pub condition_id: uuid::Uuid,
}
fn context_uuid<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<uuid::Uuid, D::Error> {
    let value = <String as serde::Deserialize>::deserialize(deserializer)?;
    if !super::validation::valid_uuid(&value) {
        return Err(serde::de::Error::custom(
            "Expected the shared 36-character UUID shape",
        ));
    }
    uuid::Uuid::parse_str(&value).map_err(serde::de::Error::custom)
}
#[cfg(test)]
mod condition_context_tests {
    use super::*;
    #[test]
    fn condition_context_rejects_uuid_parser_only_alias_shapes() {
        for parent in [
            "00000000000040008000000000000001",
            "urn:uuid:00000000-0000-4000-8000-000000000001",
            "{00000000-0000-4000-8000-000000000001}",
        ] {
            let raw = serde_json::json!({"completionRecordId":parent,"conditionId":"00000000-0000-4000-8000-000000000002"}).to_string();
            assert!(serde_json::from_str::<CompletionConditionContext>(&raw).is_err());
        }
    }
    #[test]
    fn condition_context_is_strict_and_requires_both_real_uuid_fields() {
        for raw in [
            r#"{}"#,
            r#"{"completionRecordId":"bad","conditionId":"bad"}"#,
            r#"{"completionRecordId":"00000000-0000-4000-8000-000000000001","conditionId":"00000000-0000-4000-8000-000000000002","projectId":"extra"}"#,
        ] {
            assert!(serde_json::from_str::<CompletionConditionContext>(raw).is_err());
        }
        assert!(serde_json::from_str::<CompletionConditionContext>(r#"{"completionRecordId":"00000000-0000-4000-8000-000000000001","conditionId":"00000000-0000-4000-8000-000000000002"}"#).is_ok());
    }
}

}
