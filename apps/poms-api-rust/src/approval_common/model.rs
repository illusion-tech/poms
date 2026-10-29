//! Persisted rows and original internal service inputs. Text is deliberately
//! not constrained by the public HTTP Zod DTOs. Database defaults/flushes are
//! applied by the persistence layer, not strengthened by these models.

use super::{JsField, Text};
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Timestamp(pub DateTime<Utc>);

impl Timestamp {
    /// Node Date values retain milliseconds, not PostgreSQL microseconds.
    pub fn from_database(value: DateTime<Utc>) -> Self {
        Self(DateTime::from_timestamp_millis(value.timestamp_millis()).unwrap_or(value))
    }

    pub fn now() -> Self {
        Self::from_database(Utc::now())
    }
}

impl Serialize for Timestamp {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0.to_rfc3339_opts(SecondsFormat::Millis, true))
    }
}

impl<'de> Deserialize<'de> for Timestamp {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        let parsed = DateTime::parse_from_rfc3339(&value).map_err(serde::de::Error::custom)?;
        DateTime::from_timestamp_millis(parsed.timestamp_millis())
            .map(Self)
            .ok_or_else(|| serde::de::Error::custom("timestamp is outside supported range"))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRecord {
    pub id: Text,
    pub approval_type: Text,
    pub business_domain: Text,
    pub target_object_type: Text,
    pub target_object_id: Text,
    pub project_id: Option<Text>,
    pub current_status: Text,
    pub current_node_key: Text,
    pub initiator_user_id: Text,
    pub current_approver_user_id: Option<Text>,
    pub decision: Option<Text>,
    pub decision_comment: Option<Text>,
    pub submitted_at: Timestamp,
    pub decided_at: Option<Timestamp>,
    pub closed_at: Option<Timestamp>,
    pub row_version: i32,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub id: Text,
    pub source_type: Text,
    pub source_id: Text,
    pub todo_type: Text,
    pub business_domain: Text,
    pub target_object_type: Text,
    pub target_object_id: Text,
    pub project_id: Option<Text>,
    pub title: Text,
    pub summary: Option<Text>,
    pub assignee_user_id: Text,
    pub status: Text,
    pub priority: Text,
    pub due_at: Option<Timestamp>,
    pub completed_at: Option<Timestamp>,
    pub row_version: i32,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmationRecord {
    pub id: Text,
    pub confirmation_type: Text,
    pub business_domain: Text,
    pub target_type: Text,
    pub target_id: Text,
    pub project_id: Option<Text>,
    pub status: Text,
    pub required_count: i64,
    pub confirmed_count: i64,
    pub confirmation_comment: Option<Text>,
    pub submitted_at: Timestamp,
    pub confirmed_at: Option<Timestamp>,
    pub closed_at: Option<Timestamp>,
    pub closed_by: Option<Text>,
    pub close_reason: Option<Text>,
    pub created_at: Timestamp,
    pub created_by: Option<Text>,
    pub updated_at: Timestamp,
    pub updated_by: Option<Text>,
    pub row_version: i32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmationParticipant {
    pub id: Text,
    pub confirmation_record_id: Text,
    pub participant_id: Text,
    pub participant_role_key: Text,
    pub participant_display_name: Option<Text>,
    pub participant_status: Text,
    pub confirmed_at: Option<Timestamp>,
    pub confirmed_comment: Option<Text>,
    pub created_at: Timestamp,
    pub created_by: Option<Text>,
    pub updated_at: Timestamp,
    pub updated_by: Option<Text>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryPackageDefinition {
    pub id: Text,
    pub approval_scenario_key: Text,
    pub summary_package_key: Text,
    pub projection_level: Text,
    pub export_policy: Text,
    pub field_rule_version: Text,
    pub status: Text,
    pub created_at: Timestamp,
    pub created_by: Option<Text>,
    pub updated_at: Timestamp,
    pub updated_by: Option<Text>,
    pub row_version: i32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummarySnapshot {
    pub id: Text,
    pub target_type: Text,
    pub target_id: Text,
    pub approval_scenario_key: Text,
    pub summary_package_id: Text,
    pub summary_package_key: Text,
    pub projection_level: Text,
    pub export_policy: Text,
    pub business_status_at_snapshot: Text,
    pub generated_at: Timestamp,
    pub status: Text,
    pub supersedes_id: Option<Text>,
    pub created_at: Timestamp,
    pub created_by: Option<Text>,
    pub updated_at: Timestamp,
    pub updated_by: Option<Text>,
    pub row_version: i32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryFieldProjection {
    pub id: Text,
    pub summary_snapshot_id: Text,
    pub field_key: Text,
    pub visibility_level: Text,
    pub masking_mode: Text,
    pub export_policy: Text,
    pub field_order: i32,
    pub channel_scope_summary: Option<Text>,
    pub created_at: Timestamp,
    pub created_by: Option<Text>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSummaryFieldInput {
    pub field_key: Text,
    pub visibility_level: Text,
    pub masking_mode: Text,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub export_policy: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub field_order: JsField<f64>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub channel_scope_summary: JsField<Text>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSummaryInput {
    pub target_type: Text,
    pub target_id: Text,
    pub approval_scenario_key: Text,
    pub summary_package_key: Text,
    pub projection_level: Text,
    pub export_policy: Text,
    pub business_status_at_snapshot: Text,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub supersedes_id: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub created_by: JsField<Text>,
    pub field_projections: Vec<CreateSummaryFieldInput>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmationParticipantInput {
    pub participant_id: Text,
    pub participant_role_key: Text,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub participant_display_name: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub todo_title: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub todo_summary: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub due_at: JsField<Timestamp>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConfirmationInput {
    pub confirmation_type: Text,
    pub business_domain: Text,
    pub target_type: Text,
    pub target_id: Text,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub project_id: JsField<Text>,
    pub title: Text,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub summary: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub comment: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub priority: JsField<Text>,
    pub participants: Vec<ConfirmationParticipantInput>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmParticipantInput {
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub comment: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub expected_version: JsField<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseConfirmationInput {
    pub reason: Text,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub comment: JsField<Text>,
    #[serde(default, skip_serializing_if = "JsField::is_undefined")]
    pub expected_version: JsField<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub target_id: Text,
    pub target_type: Text,
    pub result_status: Text,
    pub business_status_after: Text,
    pub approval_record_id: Option<Text>,
    pub confirmation_record_id: Option<Text>,
    pub todo_item_ids: Vec<Text>,
    pub snapshot_id: Option<Text>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmationProgressParticipant {
    pub participant_id: Text,
    pub participant_role_key: Text,
    pub participant_display_name: Option<Text>,
    pub participant_status: Text,
    pub confirmed_at: Option<Timestamp>,
    pub confirmed_comment: Option<Text>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmationProgress {
    pub id: Text,
    pub confirmation_type: Text,
    pub business_domain: Text,
    pub target_type: Text,
    pub target_id: Text,
    pub project_id: Option<Text>,
    pub status: Text,
    pub required_count: i64,
    pub confirmed_count: i64,
    pub submitted_at: Timestamp,
    pub confirmed_at: Option<Timestamp>,
    pub closed_at: Option<Timestamp>,
    pub row_version: i32,
    pub participants: Vec<ConfirmationProgressParticipant>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApprovalDecision {
    Approved,
    Rejected,
}

impl ApprovalDecision {
    pub fn text(self) -> Text {
        Text::from(match self {
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        })
    }
}

#[derive(Clone, Debug)]
pub struct DecisionContext {
    pub actor_id: Text,
    pub decision: ApprovalDecision,
    pub record: ApprovalRecord,
    pub todo: Option<TodoItem>,
}
