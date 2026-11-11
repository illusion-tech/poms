//! Generated once from the immutable R4 GHI G1 public/context schemas.
//! Root owns regeneration; domain authors import this single model.
pub use super::runtime::*;
pub use super::scalars::{Millionths, OperatingMoneyCents, Sha256};
use chrono::{DateTime, NaiveDate, Utc};
use std::collections::BTreeMap;
use uuid::Uuid;

pub type Int4Version = i32;
pub type HeadVersion = i32;
pub type CurrencyCode = String;
pub type UtcInstant = DateTime<Utc>;
pub type BusinessDate = NaiveDate;
pub type PeriodKey = String;
pub type OperatingSourceRow = SourceRow;

pub type AcceptanceRecordList = Vec<AcceptanceRecordSummary>;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AcceptanceRecordSummary {
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "acceptanceType")]
    pub acceptance_type: AcceptanceRecordSummaryAcceptanceType,
    #[serde(rename = "acceptanceResult")]
    pub acceptance_result: AcceptanceRecordSummaryAcceptanceResult,
    #[serde(rename = "status")]
    pub status: AcceptanceRecordSummaryStatus,
    #[serde(rename = "scopeSummary")]
    pub scope_summary: String,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(rename = "comment")]
    pub comment: Option<String>,
    #[serde(rename = "confirmationRecordId")]
    pub confirmation_record_id: Option<Uuid>,
    #[serde(rename = "confirmedAt")]
    pub confirmed_at: DateTime<Utc>,
    #[serde(rename = "confirmedBy")]
    pub confirmed_by: Option<Uuid>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "createdBy")]
    pub created_by: Option<Uuid>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "updatedBy")]
    pub updated_by: Option<Uuid>,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: Option<String>,
    #[serde(rename = "sourceQualification")]
    pub source_qualification: AcceptanceRecordSummarySourceQualification,
    #[serde(rename = "sourceStageRecordId")]
    pub source_stage_record_id: Option<Uuid>,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<FrozenLifecycleEvidence>,
    #[serde(rename = "conditionalSummary")]
    pub conditional_summary: Option<String>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum AcceptanceRecordSummaryAcceptanceResult {
    #[serde(rename = "accepted")]
    Accepted,
    #[serde(rename = "conditional")]
    Conditional,
    #[serde(rename = "rejected")]
    Rejected,
}
impl AcceptanceRecordSummaryAcceptanceResult {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Accepted => "accepted",
            Self::Conditional => "conditional",
            Self::Rejected => "rejected",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum AcceptanceRecordSummaryAcceptanceType {
    #[serde(rename = "stage-outcome")]
    StageOutcome,
    #[serde(rename = "stage-acceptance")]
    StageAcceptance,
    #[serde(rename = "final-acceptance")]
    FinalAcceptance,
}
impl AcceptanceRecordSummaryAcceptanceType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::StageOutcome => "stage-outcome",
            Self::StageAcceptance => "stage-acceptance",
            Self::FinalAcceptance => "final-acceptance",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum AcceptanceRecordSummarySourceQualification {
    #[serde(rename = "verified-producer")]
    VerifiedProducer,
    #[serde(rename = "legacy-unverified")]
    LegacyUnverified,
}
impl AcceptanceRecordSummarySourceQualification {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::VerifiedProducer => "verified-producer",
            Self::LegacyUnverified => "legacy-unverified",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum AcceptanceRecordSummaryStatus {
    #[serde(rename = "confirmed")]
    Confirmed,
    #[serde(rename = "voided")]
    Voided,
}
impl AcceptanceRecordSummaryStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Confirmed => "confirmed",
            Self::Voided => "voided",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActivateOperatingBaselinePackageRequest {
    #[serde(rename = "inputVersion")]
    pub input_version: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "expectedInputHash")]
    pub expected_input_hash: String,
    #[serde(rename = "assertions")]
    pub assertions: Option<LegacyAssertions>,
    #[serde(rename = "expectedCurrentPackageRef")]
    pub expected_current_package_ref: Option<ExpectedRef>,
    #[serde(rename = "originalAdoptedCostRef")]
    pub original_adopted_cost_ref: ExpectedRef,
    #[serde(rename = "selectedHandoverBasisRef")]
    pub selected_handover_basis_ref: Option<ExpectedRef>,
    #[serde(rename = "handoverRebaselineRef")]
    pub handover_rebaseline_ref: Option<ExpectedRef>,
    #[serde(rename = "approvedChangeRefs")]
    pub approved_change_refs: Vec<ExpectedRef>,
    #[serde(rename = "reason")]
    pub reason: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AffectedRestatementTarget {
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "restatesSnapshotRef")]
    pub restates_snapshot_ref: ExpectedRef,
    #[serde(rename = "periodEndSnapshotRef")]
    pub period_end_snapshot_ref: Option<ExpectedRef>,
    #[serde(rename = "costDecisions")]
    pub cost_decisions: Vec<CostDecisionInput>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Allocation {
    #[serde(rename = "basisRef")]
    pub basis_ref: SourceRef,
    #[serde(rename = "resultRef")]
    pub result_ref: SourceRef,
    #[serde(rename = "sourceSnapshotRefs")]
    pub source_snapshot_refs: Vec<SourceRef>,
    #[serde(rename = "sourceCostRefs")]
    pub source_cost_refs: Vec<SourceRef>,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "status")]
    pub status: AllocationStatus,
    #[serde(rename = "measurementLayer")]
    pub measurement_layer: AllocationMeasurementLayer,
    #[serde(rename = "algorithmVersion")]
    pub algorithm_version: String,
    #[serde(rename = "allocatedAmounts")]
    pub allocated_amounts: Triple,
    #[serde(rename = "ratio6")]
    pub ratio6: String,
    #[serde(rename = "residualMinorUnits")]
    pub residual_minor_units: i32,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AllocationCorrection {
    #[serde(rename = "basisRef")]
    pub basis_ref: ExpectedRef,
    #[serde(rename = "sourceCostRefs")]
    pub source_cost_refs: Vec<ExpectedRef>,
    #[serde(rename = "projectShareItems")]
    pub project_share_items: Vec<AllocationShareInput>,
    #[serde(rename = "reason")]
    pub reason: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum AllocationMeasurementLayer {
    #[serde(rename = "net")]
    Net,
    #[serde(rename = "tax")]
    Tax,
    #[serde(rename = "gross")]
    Gross,
}
impl AllocationMeasurementLayer {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Net => "net",
            Self::Tax => "tax",
            Self::Gross => "gross",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AllocationShareInput {
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "allocationWeight")]
    pub allocation_weight: String,
    #[serde(rename = "expectedCurrentResultRef")]
    pub expected_current_result_ref: ExpectedRef,
    #[serde(rename = "reason")]
    pub reason: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum AllocationStatus {
    #[serde(rename = "frozen")]
    Frozen,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "superseded")]
    Superseded,
}
impl AllocationStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Frozen => "frozen",
            Self::Pending => "pending",
            Self::Superseded => "superseded",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Amount {
    #[serde(rename = "knowledge")]
    pub knowledge: Knowledge,
    #[serde(rename = "value")]
    pub value: Option<String>,
    #[serde(rename = "unknownReasonCode")]
    pub unknown_reason_code: Option<String>,
    #[serde(rename = "basisRefs")]
    pub basis_refs: Vec<SourceRef>,
    #[serde(rename = "zeroProof")]
    pub zero_proof: Option<AmountZeroProof>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum AmountZeroProof {
    #[serde(rename = "source-basis-value")]
    SourceBasisValue,
    #[serde(rename = "sum-known-members-zero")]
    SumKnownMembersZero,
    #[serde(rename = "exhaustive-classified-scope-zero")]
    ExhaustiveClassifiedScopeZero,
}
impl AmountZeroProof {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::SourceBasisValue => "source-basis-value",
            Self::SumKnownMembersZero => "sum-known-members-zero",
            Self::ExhaustiveClassifiedScopeZero => "exhaustive-classified-scope-zero",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum BaselineSelectionSource {
    #[serde(rename = "original")]
    Original,
    #[serde(rename = "handover-rebaseline")]
    HandoverRebaseline,
}
impl BaselineSelectionSource {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Original => "original",
            Self::HandoverRebaseline => "handover-rebaseline",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BusinessAccountingFeedbackView {
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "signalLevel")]
    pub signal_level: OperatingSignalLevel,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "taxImpactSummaryProjection")]
    pub tax_impact_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "allocationStabilitySummary")]
    pub allocation_stability_summary: (),
    #[serde(rename = "unmappedCostSummary")]
    pub unmapped_cost_summary: (),
    #[serde(rename = "dataMaturityLevel")]
    pub data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(rename = "nextActionSummaryProjection")]
    pub next_action_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "downstreamConsumerSummaryProjection")]
    pub downstream_consumer_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "evaluationContext")]
    pub evaluation_context: OperatingEvaluationContext,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "reviewState")]
    pub review_state: BusinessAccountingFeedbackViewReviewState,
    #[serde(rename = "metricKnowledge")]
    pub metric_knowledge: OperatingMetricKnowledge,
    #[serde(rename = "signalEvaluationId")]
    pub signal_evaluation_id: Uuid,
    #[serde(rename = "stageBindings")]
    pub stage_bindings: Vec<OperatingGateFeedbackItem>,
    #[serde(rename = "allocationStabilitySummaryProjection")]
    pub allocation_stability_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "unmappedCostSummaryProjection")]
    pub unmapped_cost_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum BusinessAccountingFeedbackViewReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl BusinessAccountingFeedbackViewReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Classification {
    #[serde(rename = "decisionId")]
    pub decision_id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "decision")]
    pub decision: ClassificationDecision,
    #[serde(rename = "reasonCode")]
    pub reason_code: String,
    #[serde(rename = "reasonText")]
    pub reason_text: String,
    #[serde(rename = "decidedBy")]
    pub decided_by: Uuid,
    #[serde(rename = "decidedAt")]
    pub decided_at: DateTime<Utc>,
    #[serde(rename = "evidenceHash")]
    pub evidence_hash: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ClassificationDecision {
    #[serde(rename = "include")]
    Include,
    #[serde(rename = "exclude")]
    Exclude,
}
impl ClassificationDecision {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Include => "include",
            Self::Exclude => "exclude",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CloseProjectCompletionConditionRequest {
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<LifecycleEvidenceRef>,
    #[serde(rename = "expectedConditionVersion")]
    pub expected_condition_version: i32,
    #[serde(rename = "closureSummary")]
    pub closure_summary: String,
    #[serde(rename = "expectedCompletionVersion")]
    pub expected_completion_version: i32,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum CloseProjectCompletionConditionResult {
    FullProjectConditionCloseResult(FullProjectConditionCloseResult),
    OwnConditionCloseResult(OwnConditionCloseResult),
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommissionGateBindingHistoryView {
    #[serde(rename = "bindingId")]
    pub binding_id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "signalEvaluationId")]
    pub signal_evaluation_id: Uuid,
    #[serde(rename = "gateStageType")]
    pub gate_stage_type: OperatingGateStage,
    #[serde(rename = "signalLevel")]
    pub signal_level: OperatingSignalLevel,
    #[serde(rename = "taxImpactSummary")]
    pub tax_impact_summary: (),
    #[serde(rename = "taxImpactPendingAmount")]
    pub tax_impact_pending_amount: (),
    #[serde(rename = "dataMaturityLevel")]
    pub data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "baselineSelectionSource")]
    pub baseline_selection_source: BaselineSelectionSource,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(rename = "bindingAction")]
    pub binding_action: OperatingSnapshotActionLevel,
    #[serde(rename = "gateReviewDecision")]
    pub gate_review_decision: Option<OperatingGateReviewDecision>,
    #[serde(rename = "blockingReasonSummary")]
    pub blocking_reason_summary: (),
    #[serde(rename = "summaryPackageKey")]
    pub summary_package_key: Option<String>,
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "projectionLevel")]
    pub projection_level: Option<String>,
    #[serde(rename = "exportPolicy")]
    pub export_policy: Option<String>,
    #[serde(rename = "nextActionSummary")]
    pub next_action_summary: (),
    #[serde(rename = "handledBy")]
    pub handled_by: Option<Uuid>,
    #[serde(rename = "handledAt")]
    pub handled_at: Option<DateTime<Utc>>,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "evaluationContext")]
    pub evaluation_context: OperatingEvaluationContext,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "reviewState")]
    pub review_state: CommissionGateBindingHistoryViewReviewState,
    #[serde(rename = "metricKnowledge")]
    pub metric_knowledge: OperatingMetricKnowledge,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "systemBindingAction")]
    pub system_binding_action: OperatingSnapshotActionLevel,
    #[serde(rename = "systemSignalLevel")]
    pub system_signal_level: OperatingSignalLevel,
    #[serde(rename = "sourceSummarySnapshotId")]
    pub source_summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "taxImpactSummaryProjection")]
    pub tax_impact_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "taxImpactPendingAmountProjection")]
    pub tax_impact_pending_amount_projection: SensitiveStringFieldProjection,
    #[serde(rename = "blockingReasonSummaryProjection")]
    pub blocking_reason_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "nextActionSummaryProjection")]
    pub next_action_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CommissionGateBindingHistoryViewReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl CommissionGateBindingHistoryViewReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommissionParticipantInput {
    #[serde(rename = "userId")]
    pub user_id: Uuid,
    #[serde(rename = "responsibilitySummary")]
    pub responsibility_summary: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "zeroWeightReason")]
    pub zero_weight_reason: Option<String>,
    #[serde(rename = "roleType")]
    pub role_type: String,
    #[serde(rename = "weight")]
    pub weight: Millionths,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommissionParticipantRead {
    #[serde(rename = "weightExact")]
    pub weight_exact: Option<String>,
    #[serde(rename = "userId")]
    pub user_id: Uuid,
    #[serde(rename = "responsibilitySummary")]
    pub responsibility_summary: Option<String>,
    #[serde(rename = "zeroWeightReason")]
    pub zero_weight_reason: Option<String>,
    #[serde(rename = "roleType")]
    pub role_type: String,
    #[serde(rename = "weight")]
    pub weight: serde_json::Number,
    #[serde(rename = "displayName")]
    pub display_name: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommissionRoleAssignmentDetailView {
    #[serde(rename = "roleAssignmentId")]
    pub role_assignment_id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "freezeVersionSummary")]
    pub freeze_version_summary: CommissionRoleAssignmentSummary,
    #[serde(rename = "sourceHandoverId")]
    pub source_handover_id: Option<Uuid>,
    #[serde(rename = "contractSummarySnapshotId")]
    pub contract_summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "handoverSummarySnapshotId")]
    pub handover_summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "effectiveHandoverBaselineSummary")]
    pub effective_handover_baseline_summary: ContractHandoverCurrentBaselineSummary,
    #[serde(rename = "receiptJudgmentModeSummary")]
    pub receipt_judgment_mode_summary: ProjectHandoverReceiptJudgmentModeSummary,
    #[serde(rename = "summaryPackageKey")]
    pub summary_package_key: Option<String>,
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "projectionLevel")]
    pub projection_level: Option<String>,
    #[serde(rename = "exportPolicy")]
    pub export_policy: Option<String>,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "generatedAt")]
    pub generated_at: DateTime<Utc>,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: Option<String>,
    #[serde(rename = "sourceQualification")]
    pub source_qualification: CommissionRoleAssignmentDetailViewSourceQualification,
    #[serde(rename = "receiptJudgmentFreezeId")]
    pub receipt_judgment_freeze_id: Option<Uuid>,
    #[serde(rename = "handoverBasisSnapshotId")]
    pub handover_basis_snapshot_id: Option<Uuid>,
    #[serde(rename = "freezeSummarySnapshotId")]
    pub freeze_summary_snapshot_id: Option<Uuid>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CommissionRoleAssignmentDetailViewSourceQualification {
    #[serde(rename = "verified-producer")]
    VerifiedProducer,
    #[serde(rename = "legacy-unverified")]
    LegacyUnverified,
}
impl CommissionRoleAssignmentDetailViewSourceQualification {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::VerifiedProducer => "verified-producer",
            Self::LegacyUnverified => "legacy-unverified",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CommissionRoleAssignmentStatus {
    #[serde(rename = "draft")]
    Draft,
    #[serde(rename = "frozen")]
    Frozen,
    #[serde(rename = "superseded")]
    Superseded,
}
impl CommissionRoleAssignmentStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Frozen => "frozen",
            Self::Superseded => "superseded",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommissionRoleAssignmentSummary {
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "version")]
    pub version: i32,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "isCurrent")]
    pub is_current: bool,
    #[serde(rename = "status")]
    pub status: CommissionRoleAssignmentStatus,
    #[serde(rename = "participantsJson")]
    pub participants_json: Vec<CommissionParticipantRead>,
    #[serde(rename = "sourceHandoverId")]
    pub source_handover_id: Option<Uuid>,
    #[serde(rename = "sourceHandoverRebaselineRecordId")]
    pub source_handover_rebaseline_record_id: Option<Uuid>,
    #[serde(rename = "contractSummarySnapshotId")]
    pub contract_summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "handoverSummarySnapshotId")]
    pub handover_summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "effectiveHandoverBaselineSnapshotId")]
    pub effective_handover_baseline_snapshot_id: Option<Uuid>,
    #[serde(rename = "frozenAt")]
    pub frozen_at: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: Option<String>,
    #[serde(rename = "freezeSummarySnapshotId")]
    pub freeze_summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "sourceQualification")]
    pub source_qualification: CommissionRoleAssignmentSummarySourceQualification,
    #[serde(rename = "frozenBy")]
    pub frozen_by: Option<Uuid>,
    #[serde(rename = "weightsPolicyVersion")]
    pub weights_policy_version: Option<String>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CommissionRoleAssignmentSummarySourceQualification {
    #[serde(rename = "verified-producer")]
    VerifiedProducer,
    #[serde(rename = "legacy-unverified")]
    LegacyUnverified,
}
impl CommissionRoleAssignmentSummarySourceQualification {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::VerifiedProducer => "verified-producer",
            Self::LegacyUnverified => "legacy-unverified",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ConfirmReceiptRecordRequest {
    #[serde(rename = "inputVersion")]
    pub input_version: String,
    #[serde(rename = "mode")]
    pub mode: ConfirmReceiptRecordRequestMode,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "expectedContractVersion")]
    pub expected_contract_version: i32,
    #[serde(rename = "basis")]
    pub basis: ReceiptBasisInput,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ConfirmReceiptRecordRequestMode {
    #[serde(rename = "confirm")]
    Confirm,
    #[serde(rename = "certify-existing-basis")]
    CertifyExistingBasis,
}
impl ConfirmReceiptRecordRequestMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Confirm => "confirm",
            Self::CertifyExistingBasis => "certify-existing-basis",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Contract {
    #[serde(rename = "contractRef")]
    pub contract_ref: SourceRef,
    #[serde(rename = "effectiveTermSnapshotRef")]
    pub effective_term_snapshot_ref: SourceRef,
    #[serde(rename = "preparationRef")]
    pub preparation_ref: SourceRef,
    #[serde(rename = "approvalBindingRef")]
    pub approval_binding_ref: SourceRef,
    #[serde(rename = "amounts")]
    pub amounts: Triple,
    #[serde(rename = "originalEstimatePackageRef")]
    pub original_estimate_package_ref: Option<SourceRef>,
    #[serde(rename = "memberRole")]
    pub member_role: ContractMemberRole,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ContractHandoverCurrentBaselineSourceType {
    #[serde(rename = "contract-readiness")]
    ContractReadiness,
    #[serde(rename = "project-handover")]
    ProjectHandover,
    #[serde(rename = "handover-rebaseline")]
    HandoverRebaseline,
    #[serde(rename = "none")]
    None,
}
impl ContractHandoverCurrentBaselineSourceType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::ContractReadiness => "contract-readiness",
            Self::ProjectHandover => "project-handover",
            Self::HandoverRebaseline => "handover-rebaseline",
            Self::None => "none",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ContractHandoverCurrentBaselineStatus {
    #[serde(rename = "available")]
    Available,
    #[serde(rename = "missing")]
    Missing,
}
impl ContractHandoverCurrentBaselineStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Missing => "missing",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ContractHandoverCurrentBaselineSummary {
    #[serde(rename = "status")]
    pub status: ContractHandoverCurrentBaselineStatus,
    #[serde(rename = "baselineSnapshotId")]
    pub baseline_snapshot_id: Option<Uuid>,
    #[serde(rename = "sourceType")]
    pub source_type: ContractHandoverCurrentBaselineSourceType,
    #[serde(rename = "sourceId")]
    pub source_id: Option<Uuid>,
    #[serde(rename = "summary")]
    pub summary: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ContractMemberRole {
    #[serde(rename = "main")]
    Main,
    #[serde(rename = "supplement")]
    Supplement,
    #[serde(rename = "amendment")]
    Amendment,
}
impl ContractMemberRole {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Main => "main",
            Self::Supplement => "supplement",
            Self::Amendment => "amendment",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Cost {
    #[serde(rename = "costRef")]
    pub cost_ref: Option<SourceRef>,
    #[serde(rename = "sourceRef")]
    pub source_ref: SourceRef,
    #[serde(rename = "sourceType")]
    pub source_type: CostSourceType,
    #[serde(rename = "canonicalAccumulationKey")]
    pub canonical_accumulation_key: String,
    #[serde(rename = "costType")]
    pub cost_type: Option<CostCostType>,
    #[serde(rename = "recognitionRole")]
    pub recognition_role: CostRecognitionRole,
    #[serde(rename = "classification")]
    pub classification: Classification,
    #[serde(rename = "stageAttributionRef")]
    pub stage_attribution_ref: Option<SourceRef>,
    #[serde(rename = "attributedStage")]
    pub attributed_stage: Option<String>,
    #[serde(rename = "businessDate")]
    pub business_date: NaiveDate,
    #[serde(rename = "amounts")]
    pub amounts: Triple,
    #[serde(rename = "allocationResultRef")]
    pub allocation_result_ref: Option<SourceRef>,
    #[serde(rename = "taxTreatmentRefs")]
    pub tax_treatment_refs: Vec<SourceRef>,
    #[serde(rename = "governanceEvidenceRefs")]
    pub governance_evidence_refs: Vec<SourceRef>,
    #[serde(rename = "containsLabor")]
    pub contains_labor: CostContainsLabor,
    #[serde(rename = "recordStatus")]
    pub record_status: Option<CostRecordStatus>,
    #[serde(rename = "stageEvidenceState")]
    pub stage_evidence_state: CostStageEvidenceState,
    #[serde(rename = "sourceChainKey")]
    pub source_chain_key: String,
    #[serde(rename = "primaryCostRef")]
    pub primary_cost_ref: Option<SourceRef>,
    #[serde(rename = "allocationSourceSetHash")]
    pub allocation_source_set_hash: Option<String>,
    #[serde(rename = "sourceLifecycleStatus")]
    pub source_lifecycle_status: String,
    #[serde(rename = "allocationSourceMembers")]
    pub allocation_source_members: Vec<SharedSourceMember>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CostConstraint {
    #[serde(rename = "ruleId")]
    pub rule_id: String,
    #[serde(rename = "ruleVersion")]
    pub rule_version: String,
    #[serde(rename = "action")]
    pub action: OperatingSnapshotActionLevel,
    #[serde(rename = "reasonCode")]
    pub reason_code: String,
    #[serde(rename = "basisRefs")]
    pub basis_refs: Vec<SourceRef>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl CostContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostCostType {
    #[serde(rename = "procurement")]
    Procurement,
    #[serde(rename = "invoice")]
    Invoice,
    #[serde(rename = "expense")]
    Expense,
    #[serde(rename = "payment-fact")]
    PaymentFact,
    #[serde(rename = "labor")]
    Labor,
}
impl CostCostType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Procurement => "procurement",
            Self::Invoice => "invoice",
            Self::Expense => "expense",
            Self::PaymentFact => "payment-fact",
            Self::Labor => "labor",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CostDecisionInput {
    #[serde(rename = "target")]
    pub target: ExpectedRef,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "decision")]
    pub decision: CostDecisionInputDecision,
    #[serde(rename = "recognitionRole")]
    pub recognition_role: CostDecisionInputRecognitionRole,
    #[serde(rename = "reasonCode")]
    pub reason_code: CostDecisionInputReasonCode,
    #[serde(rename = "reasonText")]
    pub reason_text: String,
    #[serde(rename = "primaryCostRef")]
    pub primary_cost_ref: Option<ExpectedRef>,
    #[serde(rename = "supportingSourceRefs")]
    pub supporting_source_refs: Vec<ExpectedRef>,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<ExpectedRef>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostDecisionInputDecision {
    #[serde(rename = "include")]
    Include,
    #[serde(rename = "exclude")]
    Exclude,
}
impl CostDecisionInputDecision {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Include => "include",
            Self::Exclude => "exclude",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostDecisionInputReasonCode {
    #[serde(rename = "actual-payment")]
    ActualPayment,
    #[serde(rename = "actual-expense")]
    ActualExpense,
    #[serde(rename = "executed-labor")]
    ExecutedLabor,
    #[serde(rename = "approved-commitment-exception")]
    ApprovedCommitmentException,
    #[serde(rename = "duplicate-support")]
    DuplicateSupport,
    #[serde(rename = "pending-confirmation")]
    PendingConfirmation,
    #[serde(rename = "pending-monetary-layer")]
    PendingMonetaryLayer,
    #[serde(rename = "shared-source-delegated")]
    SharedSourceDelegated,
    #[serde(rename = "outside-cutoff")]
    OutsideCutoff,
    #[serde(rename = "other-evidenced")]
    OtherEvidenced,
}
impl CostDecisionInputReasonCode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::ActualPayment => "actual-payment",
            Self::ActualExpense => "actual-expense",
            Self::ExecutedLabor => "executed-labor",
            Self::ApprovedCommitmentException => "approved-commitment-exception",
            Self::DuplicateSupport => "duplicate-support",
            Self::PendingConfirmation => "pending-confirmation",
            Self::PendingMonetaryLayer => "pending-monetary-layer",
            Self::SharedSourceDelegated => "shared-source-delegated",
            Self::OutsideCutoff => "outside-cutoff",
            Self::OtherEvidenced => "other-evidenced",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostDecisionInputRecognitionRole {
    #[serde(rename = "direct-source")]
    DirectSource,
    #[serde(rename = "allocation-share")]
    AllocationShare,
    #[serde(rename = "tax-support")]
    TaxSupport,
    #[serde(rename = "evidence-only")]
    EvidenceOnly,
}
impl CostDecisionInputRecognitionRole {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::DirectSource => "direct-source",
            Self::AllocationShare => "allocation-share",
            Self::TaxSupport => "tax-support",
            Self::EvidenceOnly => "evidence-only",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostRecognitionRole {
    #[serde(rename = "direct-source")]
    DirectSource,
    #[serde(rename = "allocation-share")]
    AllocationShare,
    #[serde(rename = "tax-support")]
    TaxSupport,
    #[serde(rename = "evidence-only")]
    EvidenceOnly,
}
impl CostRecognitionRole {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::DirectSource => "direct-source",
            Self::AllocationShare => "allocation-share",
            Self::TaxSupport => "tax-support",
            Self::EvidenceOnly => "evidence-only",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostRecordStatus {
    #[serde(rename = "draft")]
    Draft,
    #[serde(rename = "registered")]
    Registered,
    #[serde(rename = "confirmed")]
    Confirmed,
    #[serde(rename = "included")]
    Included,
    #[serde(rename = "voided")]
    Voided,
    #[serde(rename = "replaced")]
    Replaced,
}
impl CostRecordStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Registered => "registered",
            Self::Confirmed => "confirmed",
            Self::Included => "included",
            Self::Voided => "voided",
            Self::Replaced => "replaced",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostSourceType {
    #[serde(rename = "payment-record")]
    PaymentRecord,
    #[serde(rename = "invoice-record")]
    InvoiceRecord,
    #[serde(rename = "expense-record")]
    ExpenseRecord,
    #[serde(rename = "payable-record")]
    PayableRecord,
    #[serde(rename = "labor")]
    Labor,
    #[serde(rename = "shared-cost-allocation-result")]
    SharedCostAllocationResult,
}
impl CostSourceType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::PaymentRecord => "payment-record",
            Self::InvoiceRecord => "invoice-record",
            Self::ExpenseRecord => "expense-record",
            Self::PayableRecord => "payable-record",
            Self::Labor => "labor",
            Self::SharedCostAllocationResult => "shared-cost-allocation-result",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CostStageEvidenceState {
    #[serde(rename = "verified")]
    Verified,
    #[serde(rename = "not-yet-applicable")]
    NotYetApplicable,
    #[serde(rename = "missing")]
    Missing,
}
impl CostStageEvidenceState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Verified => "verified",
            Self::NotYetApplicable => "not-yet-applicable",
            Self::Missing => "missing",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateAcceptanceRecordRequest {
    #[serde(rename = "acceptanceType")]
    pub acceptance_type: CreateAcceptanceRecordRequestAcceptanceType,
    #[serde(rename = "acceptanceResult")]
    pub acceptance_result: CreateAcceptanceRecordRequestAcceptanceResult,
    #[serde(rename = "scopeSummary")]
    pub scope_summary: String,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "comment")]
    pub comment: Option<String>,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<LifecycleEvidenceRef>,
    #[serde(rename = "acceptanceStageRecordId")]
    pub acceptance_stage_record_id: Uuid,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "conditionalSummary")]
    pub conditional_summary: Option<String>,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CreateAcceptanceRecordRequestAcceptanceResult {
    #[serde(rename = "accepted")]
    Accepted,
    #[serde(rename = "conditional")]
    Conditional,
    #[serde(rename = "rejected")]
    Rejected,
}
impl CreateAcceptanceRecordRequestAcceptanceResult {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Accepted => "accepted",
            Self::Conditional => "conditional",
            Self::Rejected => "rejected",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CreateAcceptanceRecordRequestAcceptanceType {
    #[serde(rename = "stage-outcome")]
    StageOutcome,
    #[serde(rename = "stage-acceptance")]
    StageAcceptance,
    #[serde(rename = "final-acceptance")]
    FinalAcceptance,
}
impl CreateAcceptanceRecordRequestAcceptanceType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::StageOutcome => "stage-outcome",
            Self::StageAcceptance => "stage-acceptance",
            Self::FinalAcceptance => "final-acceptance",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateCommissionRoleAssignmentRequest {
    #[serde(rename = "participants")]
    pub participants: Vec<CommissionParticipantInput>,
    #[serde(rename = "expectedCurrentAssignmentId")]
    pub expected_current_assignment_id: Option<Uuid>,
    #[serde(rename = "expectedCurrentRowVersion")]
    pub expected_current_row_version: Option<i32>,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateOperatingRestatementRequest {
    #[serde(rename = "inputVersion")]
    pub input_version: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "expectedInputHash")]
    pub expected_input_hash: String,
    #[serde(rename = "assertions")]
    pub assertions: Option<LegacyAssertions>,
    #[serde(rename = "scope")]
    pub scope: CreateOperatingRestatementRequestScope,
    #[serde(rename = "periodEndSnapshotRef")]
    pub period_end_snapshot_ref: Option<ExpectedRef>,
    #[serde(rename = "restatesSnapshotRef")]
    pub restates_snapshot_ref: ExpectedRef,
    #[serde(rename = "restatementReason")]
    pub restatement_reason: String,
    #[serde(rename = "restatementSummary")]
    pub restatement_summary: String,
    #[serde(rename = "costDecisions")]
    pub cost_decisions: Vec<CostDecisionInput>,
    #[serde(rename = "laborCorrections")]
    pub labor_corrections: Vec<LaborCorrection>,
    #[serde(rename = "allocationCorrections")]
    pub allocation_corrections: Vec<AllocationCorrection>,
    #[serde(rename = "affectedTargets")]
    pub affected_targets: Vec<AffectedRestatementTarget>,
    #[serde(rename = "acknowledgedChangedSourceRefs")]
    pub acknowledged_changed_source_refs: Vec<ExpectedRef>,
    #[serde(rename = "stageCorrections")]
    pub stage_corrections: Vec<StageReclassificationCorrection>,
    #[serde(rename = "taxCorrections")]
    pub tax_corrections: Vec<TaxTreatmentReplacementCorrection>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CreateOperatingRestatementRequestScope {
    #[serde(rename = "live")]
    Live,
    #[serde(rename = "period")]
    Period,
}
impl CreateOperatingRestatementRequestScope {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Live => "live",
            Self::Period => "period",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreatePeriodClosingSnapshotRequest {
    #[serde(rename = "inputVersion")]
    pub input_version: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "expectedInputHash")]
    pub expected_input_hash: String,
    #[serde(rename = "assertions")]
    pub assertions: Option<LegacyAssertions>,
    #[serde(rename = "baselinePackageRef")]
    pub baseline_package_ref: Option<ExpectedRef>,
    #[serde(rename = "periodKey")]
    pub period_key: String,
    #[serde(rename = "expectedPeriodSnapshotRef")]
    pub expected_period_snapshot_ref: Option<ExpectedRef>,
    #[serde(rename = "costDecisions")]
    pub cost_decisions: Vec<CostDecisionInput>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateProjectArchiveRecordRequest {
    #[serde(rename = "archivedAt")]
    pub archived_at: DateTime<Utc>,
    #[serde(rename = "archiveSummary")]
    pub archive_summary: String,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateProjectCompletionRecordRequest {
    #[serde(rename = "acceptanceRecordId")]
    pub acceptance_record_id: Uuid,
    #[serde(rename = "completionResult")]
    pub completion_result: CreateProjectCompletionRecordRequestCompletionResult,
    #[serde(rename = "completedAt")]
    pub completed_at: DateTime<Utc>,
    #[serde(rename = "completionSummary")]
    pub completion_summary: String,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<LifecycleEvidenceRef>,
    #[serde(rename = "expectedAcceptanceVersion")]
    pub expected_acceptance_version: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "completionConditions")]
    pub completion_conditions: Option<Vec<ProjectCompletionConditionInput>>,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CreateProjectCompletionRecordRequestCompletionResult {
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "conditional-completed")]
    ConditionalCompleted,
}
impl CreateProjectCompletionRecordRequestCompletionResult {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::ConditionalCompleted => "conditional-completed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateProjectOperatingSnapshotRequest {
    #[serde(rename = "inputVersion")]
    pub input_version: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "expectedInputHash")]
    pub expected_input_hash: String,
    #[serde(rename = "assertions")]
    pub assertions: Option<LegacyAssertions>,
    #[serde(rename = "baselinePackageRef")]
    pub baseline_package_ref: Option<ExpectedRef>,
    #[serde(rename = "snapshotMode")]
    pub snapshot_mode: CreateProjectOperatingSnapshotRequestSnapshotMode,
    #[serde(rename = "periodKey")]
    pub period_key: Option<String>,
    #[serde(rename = "costDecisions")]
    pub cost_decisions: Vec<CostDecisionInput>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum CreateProjectOperatingSnapshotRequestSnapshotMode {
    #[serde(rename = "realtime")]
    Realtime,
    #[serde(rename = "period-end")]
    PeriodEnd,
}
impl CreateProjectOperatingSnapshotRequestSnapshotMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Realtime => "realtime",
            Self::PeriodEnd => "period-end",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateProjectRequest {
    #[serde(rename = "projectName")]
    pub project_name: String,
    #[serde(rename = "customerId")]
    pub customer_id: Uuid,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "customerProjectNo")]
    pub customer_project_no: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "currentStage")]
    pub current_stage: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "plannedSignAt")]
    pub planned_sign_at: Option<DateTime<Utc>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "initialOwnership")]
    pub initial_ownership: Option<ProjectInitialOwnership>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreatorFirstAssignmentAnchorView {
    #[serde(rename = "scopeKind")]
    pub scope_kind: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "projectNo")]
    pub project_no: String,
    #[serde(rename = "projectRowVersion")]
    pub project_row_version: i32,
    #[serde(rename = "ownerOrgId")]
    pub owner_org_id: Uuid,
    #[serde(rename = "ownerUserId")]
    pub owner_user_id: (),
    #[serde(rename = "creatorUserId")]
    pub creator_user_id: Uuid,
    #[serde(rename = "ownershipOriginRowVersion")]
    pub ownership_origin_row_version: i32,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
}

pub type CurrentCommissionRoleAssignmentResponse = Option<CommissionRoleAssignmentSummary>;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EvaluationRefs {
    #[serde(rename = "maturityEvaluationId")]
    pub maturity_evaluation_id: Uuid,
    #[serde(rename = "signalEvaluationId")]
    pub signal_evaluation_id: Uuid,
    #[serde(rename = "signalRowVersion")]
    pub signal_row_version: i32,
    #[serde(rename = "bindingIds")]
    pub binding_ids: BTreeMap<OperatingGateStage, Uuid>,
    #[serde(rename = "summarySnapshotIds")]
    pub summary_snapshot_ids: BTreeMap<OperatingGateStage, Uuid>,
    #[serde(rename = "evaluationHash")]
    pub evaluation_hash: String,
    #[serde(rename = "policyVersion")]
    pub policy_version: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ExecutionAdmissionContextView {
    #[serde(rename = "handoverStageRecordId")]
    pub handover_stage_record_id: Uuid,
    #[serde(rename = "handoverSummarySnapshotId")]
    pub handover_summary_snapshot_id: Uuid,
    #[serde(rename = "expectedRoleAssignmentVersion")]
    pub expected_role_assignment_version: i32,
    #[serde(rename = "commissionRoleAssignmentId")]
    pub commission_role_assignment_id: Uuid,
    #[serde(rename = "sourceHandoverId")]
    pub source_handover_id: Uuid,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ExpectedRef {
    #[serde(rename = "kind")]
    pub kind: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "payloadHash")]
    pub payload_hash: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FinancialGroup {
    #[serde(rename = "effectiveContractNet")]
    pub effective_contract_net: MoneyFact,
    #[serde(rename = "confirmedReceiptGross")]
    pub confirmed_receipt_gross: MoneyFact,
    #[serde(rename = "confirmedReceiptNet")]
    pub confirmed_receipt_net: MoneyFact,
    #[serde(rename = "includedCostNet")]
    pub included_cost_net: MoneyFact,
    #[serde(rename = "originalBaselineNet")]
    pub original_baseline_net: MoneyFact,
    #[serde(rename = "currentBaselineNet")]
    pub current_baseline_net: MoneyFact,
    #[serde(rename = "taxPending")]
    pub tax_pending: MoneyFact,
    #[serde(rename = "grossMarginNet")]
    pub gross_margin_net: MoneyFact,
    #[serde(rename = "grossMarginRate")]
    pub gross_margin_rate: Option<String>,
    #[serde(rename = "grossMarginRateState")]
    pub gross_margin_rate_state: FinancialGroupGrossMarginRateState,
    #[serde(rename = "taxSummary")]
    pub tax_summary: Option<String>,
    #[serde(rename = "allocationSummary")]
    pub allocation_summary: Option<String>,
    #[serde(rename = "unmappedSummary")]
    pub unmapped_summary: Option<String>,
    #[serde(rename = "reasonText")]
    pub reason_text: Option<String>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum FinancialGroupGrossMarginRateState {
    #[serde(rename = "known")]
    Known,
    #[serde(rename = "zero-denominator")]
    ZeroDenominator,
    #[serde(rename = "unknown")]
    Unknown,
}
impl FinancialGroupGrossMarginRateState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Known => "known",
            Self::ZeroDenominator => "zero-denominator",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FinancialProjection {
    #[serde(rename = "mode")]
    pub mode: FinancialProjectionMode,
    #[serde(rename = "displayText")]
    pub display_text: String,
    #[serde(rename = "fieldPackageKeys")]
    pub field_package_keys: Vec<FinancialProjectionFieldPackageKeysItem>,
    #[serde(rename = "value")]
    pub value: Option<FinancialGroup>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum FinancialProjectionFieldPackageKeysItem {
    #[serde(rename = "operating-finance")]
    OperatingFinance,
    #[serde(rename = "labor-cost-rate")]
    LaborCostRate,
}
impl FinancialProjectionFieldPackageKeysItem {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::OperatingFinance => "operating-finance",
            Self::LaborCostRate => "labor-cost-rate",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum FinancialProjectionMode {
    #[serde(rename = "full")]
    Full,
    #[serde(rename = "masked")]
    Masked,
    #[serde(rename = "denied")]
    Denied,
}
impl FinancialProjectionMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Masked => "masked",
            Self::Denied => "denied",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FormalEligibility {
    #[serde(rename = "status")]
    pub status: FormalEligibilityStatus,
    #[serde(rename = "blockingReasonCodes")]
    pub blocking_reason_codes: Vec<String>,
    #[serde(rename = "missingEvidenceRefs")]
    pub missing_evidence_refs: Vec<SourceRef>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum FormalEligibilityStatus {
    #[serde(rename = "eligible")]
    Eligible,
    #[serde(rename = "missing-evidence")]
    MissingEvidence,
}
impl FormalEligibilityStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Eligible => "eligible",
            Self::MissingEvidence => "missing-evidence",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FreezeCommissionRoleAssignmentRequest {
    #[serde(rename = "handoverSummarySnapshotId")]
    pub handover_summary_snapshot_id: Uuid,
    #[serde(rename = "handoverBasisSnapshotId")]
    pub handover_basis_snapshot_id: Uuid,
    #[serde(rename = "expectedSourceHash")]
    pub expected_source_hash: String,
    #[serde(rename = "expectedHandoverVersion")]
    pub expected_handover_version: i32,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "comment")]
    pub comment: Option<String>,
    #[serde(rename = "sourceHandoverId")]
    pub source_handover_id: Uuid,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FreezeCommissionRoleAssignmentResult {
    #[serde(rename = "targetId")]
    pub target_id: Uuid,
    #[serde(rename = "businessStatusAfter")]
    pub business_status_after: FreezeCommissionRoleAssignmentResultBusinessStatusAfter,
    #[serde(rename = "newVersionId")]
    pub new_version_id: Uuid,
    #[serde(rename = "sourceHandoverId")]
    pub source_handover_id: Uuid,
    #[serde(rename = "contractSummarySnapshotId")]
    pub contract_summary_snapshot_id: Uuid,
    #[serde(rename = "handoverSummarySnapshotId")]
    pub handover_summary_snapshot_id: Uuid,
    #[serde(rename = "effectiveHandoverBaselineSnapshotId")]
    pub effective_handover_baseline_snapshot_id: Uuid,
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Uuid,
    #[serde(rename = "projectionLevel")]
    pub projection_level: String,
    #[serde(rename = "exportPolicy")]
    pub export_policy: String,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "summaryPackageKey")]
    pub summary_package_key: String,
    #[serde(rename = "receiptJudgmentFreezeId")]
    pub receipt_judgment_freeze_id: Uuid,
    #[serde(rename = "handoverBasisSnapshotId")]
    pub handover_basis_snapshot_id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum FreezeCommissionRoleAssignmentResultBusinessStatusAfter {
    #[serde(rename = "frozen")]
    Frozen,
}
impl FreezeCommissionRoleAssignmentResultBusinessStatusAfter {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Frozen => "frozen",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FrozenLifecycleEvidence {
    #[serde(rename = "attachmentId")]
    pub attachment_id: Uuid,
    #[serde(rename = "attachmentRowVersion")]
    pub attachment_row_version: i32,
    #[serde(rename = "checksumSha256")]
    pub checksum_sha256: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "attachmentLinkId")]
    pub attachment_link_id: Uuid,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FullProjectCompletionRecordListView {
    #[serde(rename = "scopeKind")]
    pub scope_kind: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "items")]
    pub items: Vec<ProjectCompletionRecordSummary>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FullProjectConditionCloseResult {
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "completionRowVersion")]
    pub completion_row_version: i32,
    #[serde(rename = "conditionStatus")]
    pub condition_status: String,
    #[serde(rename = "conditionRowVersion")]
    pub condition_row_version: i32,
    #[serde(rename = "closedAt")]
    pub closed_at: DateTime<Utc>,
    #[serde(rename = "targetId")]
    pub target_id: Uuid,
    #[serde(rename = "completionConditionStatus")]
    pub completion_condition_status: FullProjectConditionCloseResultCompletionConditionStatus,
    #[serde(rename = "closedBy")]
    pub closed_by: Uuid,
    #[serde(rename = "conditionId")]
    pub condition_id: Uuid,
    #[serde(rename = "closureRecordId")]
    pub closure_record_id: Uuid,
    #[serde(rename = "scopeKind")]
    pub scope_kind: String,
    #[serde(rename = "closureEvidenceRefs")]
    pub closure_evidence_refs: Vec<FrozenLifecycleEvidence>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum FullProjectConditionCloseResultCompletionConditionStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "closed")]
    Closed,
}
impl FullProjectConditionCloseResultCompletionConditionStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Closed => "closed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FullProjectDetailView {
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectNo")]
    pub project_no: String,
    #[serde(rename = "projectName")]
    pub project_name: String,
    #[serde(rename = "sourceLeadId")]
    pub source_lead_id: Option<Uuid>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<Uuid>,
    #[serde(rename = "customerName")]
    pub customer_name: Option<String>,
    #[serde(rename = "customerProjectNo")]
    pub customer_project_no: Option<String>,
    #[serde(rename = "status")]
    pub status: ProjectStatus,
    #[serde(rename = "currentStage")]
    pub current_stage: ProjectStage,
    #[serde(rename = "ownerOrgId")]
    pub owner_org_id: Option<Uuid>,
    #[serde(rename = "ownerUserId")]
    pub owner_user_id: Option<Uuid>,
    #[serde(rename = "plannedSignAt")]
    pub planned_sign_at: Option<DateTime<Utc>>,
    #[serde(rename = "closedAt")]
    pub closed_at: Option<DateTime<Utc>>,
    #[serde(rename = "closedReason")]
    pub closed_reason: Option<String>,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "createdBy")]
    pub created_by: Option<Uuid>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "updatedBy")]
    pub updated_by: Option<Uuid>,
    #[serde(rename = "ownerName")]
    pub owner_name: Option<String>,
    #[serde(rename = "ownerOrgName")]
    pub owner_org_name: Option<String>,
    #[serde(rename = "sourceLeadSummary")]
    pub source_lead_summary: Option<FullProjectDetailViewSourceLeadSummary>,
    #[serde(rename = "stageSummary")]
    pub stage_summary: ProjectDetailStageSummary,
    #[serde(rename = "currentBidSummary")]
    pub current_bid_summary: ProjectDetailBidSummary,
    #[serde(rename = "currentContractSummary")]
    pub current_contract_summary: ProjectDetailContractSummary,
    #[serde(rename = "currentApprovalSummary")]
    pub current_approval_summary: ProjectDetailApprovalSummary,
    #[serde(rename = "currentConfirmationSummary")]
    pub current_confirmation_summary: ProjectDetailConfirmationSummary,
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "projectionLevel")]
    pub projection_level: Option<String>,
    #[serde(rename = "exportPolicy")]
    pub export_policy: Option<String>,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "generatedAt")]
    pub generated_at: DateTime<Utc>,
    #[serde(rename = "projectRowVersion")]
    pub project_row_version: i32,
    #[serde(rename = "currentStageRecordId")]
    pub current_stage_record_id: Option<Uuid>,
    #[serde(rename = "scopeKind")]
    pub scope_kind: String,
    #[serde(rename = "executionAdmissionContext")]
    pub execution_admission_context: Option<ExecutionAdmissionContextView>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FullProjectDetailViewSourceLeadSummary {
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "leadNo")]
    pub lead_no: String,
    #[serde(rename = "leadName")]
    pub lead_name: String,
    #[serde(rename = "customerId")]
    pub customer_id: Uuid,
    #[serde(rename = "customerName")]
    pub customer_name: String,
    #[serde(rename = "status")]
    pub status: LeadStatus,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum GrossMarginRateUse {
    #[serde(rename = "unavailable")]
    Unavailable,
    #[serde(rename = "observation-only")]
    ObservationOnly,
    #[serde(rename = "business-judgment")]
    BusinessJudgment,
}
impl GrossMarginRateUse {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Unavailable => "unavailable",
            Self::ObservationOnly => "observation-only",
            Self::BusinessJudgment => "business-judgment",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HistoricalPeriodBaselineSelection {
    #[serde(rename = "policyVersion")]
    pub policy_version: String,
    #[serde(rename = "publicationMode")]
    pub publication_mode: String,
    #[serde(rename = "periodKey")]
    pub period_key: String,
    #[serde(rename = "businessCutoff")]
    pub business_cutoff: NaiveDate,
    #[serde(rename = "selectionHash")]
    pub selection_hash: String,
    #[serde(rename = "originalAdoptedCostRef")]
    pub original_adopted_cost_ref: SourceRef,
    #[serde(rename = "selectedAdoptedCostRef")]
    pub selected_adopted_cost_ref: SourceRef,
    #[serde(rename = "handoverBasisRef")]
    pub handover_basis_ref: Option<SourceRef>,
    #[serde(rename = "handoverRebaselineRef")]
    pub handover_rebaseline_ref: Option<SourceRef>,
    #[serde(rename = "adoptionSourceRefs")]
    pub adoption_source_refs: Vec<SourceRef>,
    #[serde(rename = "technicalLineageRefs")]
    pub technical_lineage_refs: Vec<SourceRef>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum Knowledge {
    #[serde(rename = "known")]
    Known,
    #[serde(rename = "unknown")]
    Unknown,
}
impl Knowledge {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Known => "known",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LaborCorrection {
    #[serde(rename = "supersededCostRef")]
    pub superseded_cost_ref: ExpectedRef,
    #[serde(rename = "rateRef")]
    pub rate_ref: ExpectedRef,
    #[serde(rename = "laborPeriodStart")]
    pub labor_period_start: NaiveDate,
    #[serde(rename = "laborPeriodEnd")]
    pub labor_period_end: NaiveDate,
    #[serde(rename = "actualHours")]
    pub actual_hours: Option<String>,
    #[serde(rename = "actualPersonDays")]
    pub actual_person_days: Option<String>,
    #[serde(rename = "workSummary")]
    pub work_summary: String,
    #[serde(rename = "attachmentRefs")]
    pub attachment_refs: Vec<ExpectedRef>,
    #[serde(rename = "stageEvidenceRefs")]
    pub stage_evidence_refs: Vec<ExpectedRef>,
    #[serde(rename = "reason")]
    pub reason: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum LeadStatus {
    #[serde(rename = "registered")]
    Registered,
    #[serde(rename = "qualified")]
    Qualified,
    #[serde(rename = "converted")]
    Converted,
    #[serde(rename = "closed")]
    Closed,
}
impl LeadStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Registered => "registered",
            Self::Qualified => "qualified",
            Self::Converted => "converted",
            Self::Closed => "closed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LegacyAssertions {
    #[serde(rename = "originalBaselineCost")]
    pub original_baseline_cost: Option<String>,
    #[serde(rename = "currentEffectiveBaselineCost")]
    pub current_effective_baseline_cost: Option<String>,
    #[serde(rename = "changePackageTotal")]
    pub change_package_total: Option<String>,
    #[serde(rename = "effectiveContractTotal")]
    pub effective_contract_total: Option<String>,
    #[serde(rename = "receivableConfirmedTotal")]
    pub receivable_confirmed_total: Option<String>,
    #[serde(rename = "includedCostTotal")]
    pub included_cost_total: Option<String>,
    #[serde(rename = "taxImpactPendingAmount")]
    pub tax_impact_pending_amount: Option<String>,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: Option<OperatingSnapshotActionLevel>,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: Option<String>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LegacyOwnerAnchorView {
    #[serde(rename = "scopeKind")]
    pub scope_kind: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "projectNo")]
    pub project_no: String,
    #[serde(rename = "projectName")]
    pub project_name: String,
    #[serde(rename = "currentStage")]
    pub current_stage: ProjectStage,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "ownerUserId")]
    pub owner_user_id: Uuid,
    #[serde(rename = "ownerOrgId")]
    pub owner_org_id: (),
    #[serde(rename = "sourceQualification")]
    pub source_qualification: String,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "explanation")]
    pub explanation: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LifecycleEvidenceRef {
    #[serde(rename = "attachmentLinkId")]
    pub attachment_link_id: Uuid,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ManualOperatingMaterialityReview {
    #[serde(rename = "policyVersion")]
    pub policy_version: String,
    #[serde(rename = "issueCodes")]
    pub issue_codes: Vec<OperatingReasonCode>,
    #[serde(rename = "riskDecision")]
    pub risk_decision: ManualOperatingMaterialityReviewRiskDecision,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<SourceRef>,
    #[serde(rename = "rationale")]
    pub rationale: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ManualOperatingMaterialityReviewRiskDecision {
    #[serde(rename = "normal")]
    Normal,
    #[serde(rename = "attention")]
    Attention,
    #[serde(rename = "risk")]
    Risk,
}
impl ManualOperatingMaterialityReviewRiskDecision {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Attention => "attention",
            Self::Risk => "risk",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Metrics {
    #[serde(rename = "effectiveContractAmounts")]
    pub effective_contract_amounts: Triple,
    #[serde(rename = "confirmedReceiptAmounts")]
    pub confirmed_receipt_amounts: Triple,
    #[serde(rename = "includedCostAmounts")]
    pub included_cost_amounts: Triple,
    #[serde(rename = "excludedCostAmounts")]
    pub excluded_cost_amounts: Triple,
    #[serde(rename = "taxPendingAmount")]
    pub tax_pending_amount: Amount,
    #[serde(rename = "costVarianceNet")]
    pub cost_variance_net: Amount,
    #[serde(rename = "grossMarginNet")]
    pub gross_margin_net: Amount,
    #[serde(rename = "grossMarginRate")]
    pub gross_margin_rate: Ratio,
    #[serde(rename = "receiptRatio")]
    pub receipt_ratio: Ratio,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MoneyFact {
    #[serde(rename = "knowledge")]
    pub knowledge: Knowledge,
    #[serde(rename = "value")]
    pub value: Option<String>,
    #[serde(rename = "unknownReasonCode")]
    pub unknown_reason_code: Option<String>,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<SourceRef>,
    #[serde(rename = "zeroProof")]
    pub zero_proof: Option<MoneyFactZeroProof>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum MoneyFactZeroProof {
    #[serde(rename = "source-basis-value")]
    SourceBasisValue,
    #[serde(rename = "sum-known-members-zero")]
    SumKnownMembersZero,
    #[serde(rename = "exhaustive-classified-scope-zero")]
    ExhaustiveClassifiedScopeZero,
}
impl MoneyFactZeroProof {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::SourceBasisValue => "source-basis-value",
            Self::SumKnownMembersZero => "sum-known-members-zero",
            Self::ExhaustiveClassifiedScopeZero => "exhaustive-classified-scope-zero",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingAccountingPreparationView {
    #[serde(rename = "view")]
    pub view: String,
    #[serde(rename = "outputVersion")]
    pub output_version: String,
    #[serde(rename = "preparation")]
    pub preparation: OperatingPreparation,
    #[serde(rename = "officialCurrent")]
    pub official_current: Option<ProjectUnifiedAccountingView>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingBaselineContext {
    #[serde(rename = "baselinePackageRef")]
    pub baseline_package_ref: Option<SourceRef>,
    #[serde(rename = "selectionSource")]
    pub selection_source: BaselineSelectionSource,
    #[serde(rename = "originalTechnicalPackageRef")]
    pub original_technical_package_ref: Option<SourceRef>,
    #[serde(rename = "handoverRef")]
    pub handover_ref: Option<SourceRef>,
    #[serde(rename = "handoverRebaselineRef")]
    pub handover_rebaseline_ref: Option<SourceRef>,
    #[serde(rename = "approvedChangeRefs")]
    pub approved_change_refs: Vec<SourceRef>,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "originalNetCost")]
    pub original_net_cost: Amount,
    #[serde(rename = "currentEffectiveNetCost")]
    pub current_effective_net_cost: Amount,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingBaselinePackageSummary {
    #[serde(rename = "outputVersion")]
    pub output_version: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "capturedRowVersion")]
    pub captured_row_version: i32,
    #[serde(rename = "headVersion")]
    pub head_version: i32,
    #[serde(rename = "producerVersion")]
    pub producer_version: i32,
    #[serde(rename = "certification")]
    pub certification: String,
    #[serde(rename = "sourceHash")]
    pub source_hash: String,
    #[serde(rename = "sourceContextId")]
    pub source_context_id: Uuid,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "containsLabor")]
    pub contains_labor: OperatingBaselinePackageSummaryContainsLabor,
    #[serde(rename = "financialProjection")]
    pub financial_projection: FinancialProjection,
    #[serde(rename = "sourceRows")]
    pub source_rows: Vec<SourceRow>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "isCurrent")]
    pub is_current: bool,
    #[serde(rename = "status")]
    pub status: OperatingBaselinePackageSummaryStatus,
    #[serde(rename = "originalAdoptedCostRef")]
    pub original_adopted_cost_ref: SourceRef,
    #[serde(rename = "currentEffectiveCostRef")]
    pub current_effective_cost_ref: SourceRef,
    #[serde(rename = "handoverBasisRef")]
    pub handover_basis_ref: Option<SourceRef>,
    #[serde(rename = "handoverRebaselineRef")]
    pub handover_rebaseline_ref: Option<SourceRef>,
    #[serde(rename = "approvedChangeRefs")]
    pub approved_change_refs: Vec<SourceRef>,
    #[serde(rename = "effectiveAt")]
    pub effective_at: DateTime<Utc>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingBaselinePackageSummaryContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl OperatingBaselinePackageSummaryContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingBaselinePackageSummaryStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "superseded")]
    Superseded,
}
impl OperatingBaselinePackageSummaryStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Superseded => "superseded",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingCollectionStatus {
    #[serde(rename = "closed")]
    Closed,
    #[serde(rename = "open")]
    Open,
    #[serde(rename = "unknown")]
    Unknown,
}
impl OperatingCollectionStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Closed => "closed",
            Self::Open => "open",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingCommandResult {
    #[serde(rename = "targetId")]
    pub target_id: Uuid,
    #[serde(rename = "targetType")]
    pub target_type: OperatingCommandResultTargetType,
    #[serde(rename = "resultStatus")]
    pub result_status: String,
    #[serde(rename = "businessStatusAfter")]
    pub business_status_after: String,
    #[serde(rename = "approvalRecordId")]
    pub approval_record_id: (),
    #[serde(rename = "confirmationRecordId")]
    pub confirmation_record_id: (),
    #[serde(rename = "todoItemIds")]
    pub todo_item_ids: Vec<Uuid>,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "newHeadVersion")]
    pub new_head_version: i32,
    #[serde(rename = "snapshotId")]
    pub snapshot_id: Option<Uuid>,
    #[serde(rename = "periodEndSnapshotId")]
    pub period_end_snapshot_id: Option<Uuid>,
    #[serde(rename = "restatementIds")]
    pub restatement_ids: Vec<Uuid>,
    #[serde(rename = "sourceHash")]
    pub source_hash: Option<String>,
    #[serde(rename = "evaluationRefs")]
    pub evaluation_refs: Option<EvaluationRefs>,
    #[serde(rename = "outputVersion")]
    pub output_version: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingCommandResultTargetType {
    #[serde(rename = "OperatingBaselinePackage")]
    OperatingBaselinePackage,
    #[serde(rename = "ProjectOperatingSnapshot")]
    ProjectOperatingSnapshot,
    #[serde(rename = "PeriodClosingSnapshot")]
    PeriodClosingSnapshot,
    #[serde(rename = "OperatingRestatementRecord")]
    OperatingRestatementRecord,
}
impl OperatingCommandResultTargetType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::OperatingBaselinePackage => "OperatingBaselinePackage",
            Self::ProjectOperatingSnapshot => "ProjectOperatingSnapshot",
            Self::PeriodClosingSnapshot => "PeriodClosingSnapshot",
            Self::OperatingRestatementRecord => "OperatingRestatementRecord",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingDataMaturityLevel {
    #[serde(rename = "insufficient")]
    Insufficient,
    #[serde(rename = "preliminary")]
    Preliminary,
    #[serde(rename = "mature")]
    Mature,
}
impl OperatingDataMaturityLevel {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Insufficient => "insufficient",
            Self::Preliminary => "preliminary",
            Self::Mature => "mature",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingEvaluationCertification {
    #[serde(rename = "verified")]
    Verified,
    #[serde(rename = "missing-evidence")]
    MissingEvidence,
    #[serde(rename = "legacy-unverified")]
    LegacyUnverified,
}
impl OperatingEvaluationCertification {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Verified => "verified",
            Self::MissingEvidence => "missing-evidence",
            Self::LegacyUnverified => "legacy-unverified",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingEvaluationContext {
    #[serde(rename = "schemaVersion")]
    pub schema_version: i32,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "snapshotId")]
    pub snapshot_id: Uuid,
    #[serde(rename = "snapshotRowVersion")]
    pub snapshot_row_version: i32,
    #[serde(rename = "snapshotMode")]
    pub snapshot_mode: OperatingEvaluationContextSnapshotMode,
    #[serde(rename = "maturityEvaluationId")]
    pub maturity_evaluation_id: Uuid,
    #[serde(rename = "signalEvaluationId")]
    pub signal_evaluation_id: Uuid,
    #[serde(rename = "signalReviewRecordId")]
    pub signal_review_record_id: Option<Uuid>,
    #[serde(rename = "sourceHash")]
    pub source_hash: String,
    #[serde(rename = "evaluationHash")]
    pub evaluation_hash: String,
    #[serde(rename = "policyVersion")]
    pub policy_version: String,
    #[serde(rename = "policyHash")]
    pub policy_hash: String,
    #[serde(rename = "producerVersion")]
    pub producer_version: i32,
    #[serde(rename = "certification")]
    pub certification: OperatingEvaluationCertification,
    #[serde(rename = "evaluationStatus")]
    pub evaluation_status: OperatingEvaluationStatus,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingEvaluationContextSnapshotMode {
    #[serde(rename = "realtime")]
    Realtime,
    #[serde(rename = "period-end")]
    PeriodEnd,
    #[serde(rename = "restated")]
    Restated,
}
impl OperatingEvaluationContextSnapshotMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Realtime => "realtime",
            Self::PeriodEnd => "period-end",
            Self::Restated => "restated",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingEvaluationNotReadyError {
    #[serde(rename = "statusCode")]
    pub status_code: i32,
    #[serde(rename = "error")]
    pub error: String,
    #[serde(rename = "message")]
    pub message: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "evaluationStatus")]
    pub evaluation_status: OperatingEvaluationNotReadyErrorEvaluationStatus,
    #[serde(rename = "reasonCodes")]
    pub reason_codes: Vec<String>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingEvaluationNotReadyErrorEvaluationStatus {
    #[serde(rename = "not-evaluated")]
    NotEvaluated,
    #[serde(rename = "missing-evidence")]
    MissingEvidence,
}
impl OperatingEvaluationNotReadyErrorEvaluationStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotEvaluated => "not-evaluated",
            Self::MissingEvidence => "missing-evidence",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingEvaluationStatus {
    #[serde(rename = "complete")]
    Complete,
    #[serde(rename = "missing-evidence")]
    MissingEvidence,
    #[serde(rename = "manual-review-required")]
    ManualReviewRequired,
    #[serde(rename = "stale")]
    Stale,
}
impl OperatingEvaluationStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Complete => "complete",
            Self::MissingEvidence => "missing-evidence",
            Self::ManualReviewRequired => "manual-review-required",
            Self::Stale => "stale",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingGateFeedbackItem {
    #[serde(rename = "bindingId")]
    pub binding_id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "gateStageType")]
    pub gate_stage_type: OperatingGateStage,
    #[serde(rename = "systemBindingAction")]
    pub system_binding_action: OperatingSnapshotActionLevel,
    #[serde(rename = "bindingAction")]
    pub binding_action: OperatingSnapshotActionLevel,
    #[serde(rename = "gateReviewDecision")]
    pub gate_review_decision: Option<OperatingGateReviewDecision>,
    #[serde(rename = "reviewState")]
    pub review_state: OperatingGateFeedbackItemReviewState,
    #[serde(rename = "summaryPackageKey")]
    pub summary_package_key: String,
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Uuid,
    #[serde(rename = "projectionLevel")]
    pub projection_level: String,
    #[serde(rename = "exportPolicy")]
    pub export_policy: String,
    #[serde(rename = "evaluationHash")]
    pub evaluation_hash: String,
    #[serde(rename = "primaryReasonIds")]
    pub primary_reason_ids: Vec<String>,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "nextActionSummaryProjection")]
    pub next_action_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingGateFeedbackItemReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl OperatingGateFeedbackItemReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingGateReviewDecision {
    #[serde(rename = "confirmed")]
    Confirmed,
    #[serde(rename = "review-required")]
    ReviewRequired,
    #[serde(rename = "blocked")]
    Blocked,
}
impl OperatingGateReviewDecision {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Confirmed => "confirmed",
            Self::ReviewRequired => "review-required",
            Self::Blocked => "blocked",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingGateStage {
    #[serde(rename = "first")]
    First,
    #[serde(rename = "second")]
    Second,
    #[serde(rename = "final")]
    Final,
    #[serde(rename = "retention")]
    Retention,
}
impl OperatingGateStage {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::First => "first",
            Self::Second => "second",
            Self::Final => "final",
            Self::Retention => "retention",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingLaborLineage {
    #[serde(rename = "containsLabor")]
    pub contains_labor: OperatingLaborLineageContainsLabor,
    #[serde(rename = "basisRefs")]
    pub basis_refs: Vec<SourceRef>,
    #[serde(rename = "lineageHash")]
    pub lineage_hash: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingLaborLineageContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl OperatingLaborLineageContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingMetricKnowledge {
    #[serde(rename = "confirmedReceipts")]
    pub confirmed_receipts: Knowledge,
    #[serde(rename = "includedCost")]
    pub included_cost: Knowledge,
    #[serde(rename = "taxPending")]
    pub tax_pending: Knowledge,
    #[serde(rename = "grossMargin")]
    pub gross_margin: Knowledge,
    #[serde(rename = "grossMarginRate")]
    pub gross_margin_rate: Knowledge,
    #[serde(rename = "grossMarginRateReason")]
    pub gross_margin_rate_reason: Option<OperatingMetricKnowledgeGrossMarginRateReason>,
    #[serde(rename = "ratiosStable")]
    pub ratios_stable: bool,
    #[serde(rename = "grossMarginRateUse")]
    pub gross_margin_rate_use: GrossMarginRateUse,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingMetricKnowledgeGrossMarginRateReason {
    #[serde(rename = "zero-denominator")]
    ZeroDenominator,
    #[serde(rename = "missing-evidence")]
    MissingEvidence,
    #[serde(rename = "low-receipt-ratio")]
    LowReceiptRatio,
    #[serde(rename = "unstable")]
    Unstable,
}
impl OperatingMetricKnowledgeGrossMarginRateReason {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::ZeroDenominator => "zero-denominator",
            Self::MissingEvidence => "missing-evidence",
            Self::LowReceiptRatio => "low-receipt-ratio",
            Self::Unstable => "unstable",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingPreparation {
    #[serde(rename = "outputVersion")]
    pub output_version: String,
    #[serde(rename = "kind")]
    pub kind: String,
    #[serde(rename = "officialSnapshotRef")]
    pub official_snapshot_ref: Option<SourceRef>,
    #[serde(rename = "intent")]
    pub intent: OperatingPreparationIntentCode,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "headVersion")]
    pub head_version: i32,
    #[serde(rename = "projectVersion")]
    pub project_version: i32,
    #[serde(rename = "expectedInputHash")]
    pub expected_input_hash: String,
    #[serde(rename = "preparedAt")]
    pub prepared_at: DateTime<Utc>,
    #[serde(rename = "businessCutoff")]
    pub business_cutoff: NaiveDate,
    #[serde(rename = "periodKey")]
    pub period_key: Option<String>,
    #[serde(rename = "formalEligibility")]
    pub formal_eligibility: FormalEligibility,
    #[serde(rename = "evaluationStatus")]
    pub evaluation_status: OperatingPreparationEvaluationStatus,
    #[serde(rename = "sourceRows")]
    pub source_rows: Vec<SourceRow>,
    #[serde(rename = "proposedOriginalCostRef")]
    pub proposed_original_cost_ref: Option<SourceRef>,
    #[serde(rename = "selectedBaselinePackageRef")]
    pub selected_baseline_package_ref: Option<SourceRef>,
    #[serde(rename = "allowedCommandCodes")]
    pub allowed_command_codes: Vec<String>,
    #[serde(rename = "blockingReasonCodes")]
    pub blocking_reason_codes: Vec<String>,
    #[serde(rename = "proposedAffectedTargets")]
    pub proposed_affected_targets: Vec<AffectedRestatementTarget>,
    #[serde(rename = "periodBaselineSelection")]
    pub period_baseline_selection: Option<HistoricalPeriodBaselineSelection>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingPreparationEvaluationStatus {
    #[serde(rename = "not-evaluated")]
    NotEvaluated,
    #[serde(rename = "preview-only")]
    PreviewOnly,
}
impl OperatingPreparationEvaluationStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotEvaluated => "not-evaluated",
            Self::PreviewOnly => "preview-only",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingPreparationIntentCode {
    #[serde(rename = "baseline-activation")]
    BaselineActivation,
    #[serde(rename = "snapshot-create")]
    SnapshotCreate,
    #[serde(rename = "period-close")]
    PeriodClose,
    #[serde(rename = "restatement")]
    Restatement,
    #[serde(rename = "receipt-basis")]
    ReceiptBasis,
}
impl OperatingPreparationIntentCode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::BaselineActivation => "baseline-activation",
            Self::SnapshotCreate => "snapshot-create",
            Self::PeriodClose => "period-close",
            Self::Restatement => "restatement",
            Self::ReceiptBasis => "receipt-basis",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingReasonCategory {
    #[serde(rename = "evidence")]
    Evidence,
    #[serde(rename = "maturity")]
    Maturity,
    #[serde(rename = "cost")]
    Cost,
    #[serde(rename = "receipt")]
    Receipt,
    #[serde(rename = "risk")]
    Risk,
    #[serde(rename = "restatement")]
    Restatement,
    #[serde(rename = "formula")]
    Formula,
    #[serde(rename = "manual")]
    Manual,
}
impl OperatingReasonCategory {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Evidence => "evidence",
            Self::Maturity => "maturity",
            Self::Cost => "cost",
            Self::Receipt => "receipt",
            Self::Risk => "risk",
            Self::Restatement => "restatement",
            Self::Formula => "formula",
            Self::Manual => "manual",
        }
    }
}

pub type OperatingReasonCode = String;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingReasonView {
    #[serde(rename = "reasonId")]
    pub reason_id: String,
    #[serde(rename = "code")]
    pub code: OperatingReasonCode,
    #[serde(rename = "category")]
    pub category: OperatingReasonCategory,
    #[serde(rename = "ruleId")]
    pub rule_id: String,
    #[serde(rename = "projectAction")]
    pub project_action: OperatingSnapshotActionLevel,
    #[serde(rename = "stageActions")]
    pub stage_actions: BTreeMap<OperatingGateStage, OperatingSnapshotActionLevel>,
    #[serde(rename = "isPrimaryProjectReason")]
    pub is_primary_project_reason: bool,
    #[serde(rename = "primaryStages")]
    pub primary_stages: Vec<OperatingGateStage>,
    #[serde(rename = "detailProjection")]
    pub detail_projection: SensitiveStringFieldProjection,
    #[serde(rename = "evidenceProjection")]
    pub evidence_projection: SensitiveStringFieldProjection,
}

pub type OperatingRestatementListView = Vec<OperatingRestatementSummary>;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingRestatementSummary {
    #[serde(rename = "outputVersion")]
    pub output_version: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "capturedRowVersion")]
    pub captured_row_version: i32,
    #[serde(rename = "headVersion")]
    pub head_version: i32,
    #[serde(rename = "producerVersion")]
    pub producer_version: i32,
    #[serde(rename = "certification")]
    pub certification: String,
    #[serde(rename = "sourceHash")]
    pub source_hash: String,
    #[serde(rename = "sourceContextId")]
    pub source_context_id: Uuid,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "containsLabor")]
    pub contains_labor: OperatingRestatementSummaryContainsLabor,
    #[serde(rename = "financialProjection")]
    pub financial_projection: FinancialProjection,
    #[serde(rename = "sourceRows")]
    pub source_rows: Vec<SourceRow>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "scope")]
    pub scope: OperatingRestatementSummaryScope,
    #[serde(rename = "periodEndSnapshotRef")]
    pub period_end_snapshot_ref: Option<SourceRef>,
    #[serde(rename = "restatesSnapshotRef")]
    pub restates_snapshot_ref: SourceRef,
    #[serde(rename = "restatedSnapshotRef")]
    pub restated_snapshot_ref: SourceRef,
    #[serde(rename = "rootSnapshotRef")]
    pub root_snapshot_ref: SourceRef,
    #[serde(rename = "causalitySourceRefs")]
    pub causality_source_refs: Vec<SourceRef>,
    #[serde(rename = "affectedRestatementRefs")]
    pub affected_restatement_refs: Vec<SourceRef>,
    #[serde(rename = "reasonProjection")]
    pub reason_projection: FinancialProjection,
    #[serde(rename = "handledAt")]
    pub handled_at: DateTime<Utc>,
    #[serde(rename = "handledBy")]
    pub handled_by: Uuid,
    #[serde(rename = "status")]
    pub status: OperatingRestatementSummaryStatus,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingRestatementSummaryContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl OperatingRestatementSummaryContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingRestatementSummaryScope {
    #[serde(rename = "live")]
    Live,
    #[serde(rename = "period")]
    Period,
}
impl OperatingRestatementSummaryScope {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Live => "live",
            Self::Period => "period",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingRestatementSummaryStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "superseded")]
    Superseded,
}
impl OperatingRestatementSummaryStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Superseded => "superseded",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingRiskLevel {
    #[serde(rename = "normal")]
    Normal,
    #[serde(rename = "unknown")]
    Unknown,
    #[serde(rename = "attention")]
    Attention,
    #[serde(rename = "risk")]
    Risk,
}
impl OperatingRiskLevel {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Unknown => "unknown",
            Self::Attention => "attention",
            Self::Risk => "risk",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingScope {
    #[serde(rename = "collectionStatus")]
    pub collection_status: OperatingCollectionStatus,
    #[serde(rename = "collectionQueryVersion")]
    pub collection_query_version: String,
    #[serde(rename = "scopeInventoryHash")]
    pub scope_inventory_hash: String,
    #[serde(rename = "registeredReceiptCount")]
    pub registered_receipt_count: i32,
    #[serde(rename = "confirmedReceiptCount")]
    pub confirmed_receipt_count: i32,
    #[serde(rename = "registeredCostCount")]
    pub registered_cost_count: i32,
    #[serde(rename = "includedCostCount")]
    pub included_cost_count: i32,
    #[serde(rename = "excludedCostCount")]
    pub excluded_cost_count: i32,
    #[serde(rename = "unclassifiedCostCount")]
    pub unclassified_cost_count: i32,
    #[serde(rename = "pendingCostCount")]
    pub pending_cost_count: i32,
    #[serde(rename = "unmappedCostCount")]
    pub unmapped_cost_count: i32,
    #[serde(rename = "hasExplicitCostScopeEvidence")]
    pub has_explicit_cost_scope_evidence: bool,
    #[serde(rename = "closureEvidenceRefs")]
    pub closure_evidence_refs: Vec<SourceRef>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingSignalEvaluationView {
    #[serde(rename = "signalEvaluationId")]
    pub signal_evaluation_id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "formulaBoundaryAction")]
    pub formula_boundary_action: OperatingSnapshotActionLevel,
    #[serde(rename = "signalLevel")]
    pub signal_level: OperatingSignalLevel,
    #[serde(rename = "taxImpactSummary")]
    pub tax_impact_summary: (),
    #[serde(rename = "allocationStabilitySummary")]
    pub allocation_stability_summary: (),
    #[serde(rename = "unmappedCostSummary")]
    pub unmapped_cost_summary: (),
    #[serde(rename = "dataMaturityLevel")]
    pub data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(rename = "reviewRequired")]
    pub review_required: bool,
    #[serde(rename = "reviewSummary")]
    pub review_summary: (),
    #[serde(rename = "evaluationContext")]
    pub evaluation_context: OperatingEvaluationContext,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "reviewState")]
    pub review_state: OperatingSignalEvaluationViewReviewState,
    #[serde(rename = "metricKnowledge")]
    pub metric_knowledge: OperatingMetricKnowledge,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "riskLevel")]
    pub risk_level: OperatingRiskLevel,
    #[serde(rename = "systemSignalLevel")]
    pub system_signal_level: OperatingSignalLevel,
    #[serde(rename = "systemRiskLevel")]
    pub system_risk_level: OperatingRiskLevel,
    #[serde(rename = "taxImpactSummaryProjection")]
    pub tax_impact_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "allocationStabilitySummaryProjection")]
    pub allocation_stability_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "unmappedCostSummaryProjection")]
    pub unmapped_cost_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "reviewSummaryProjection")]
    pub review_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingSignalEvaluationViewReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl OperatingSignalEvaluationViewReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingSignalLevel {
    #[serde(rename = "normal")]
    Normal,
    #[serde(rename = "unknown")]
    Unknown,
    #[serde(rename = "attention")]
    Attention,
    #[serde(rename = "alert")]
    Alert,
}
impl OperatingSignalLevel {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Unknown => "unknown",
            Self::Attention => "attention",
            Self::Alert => "alert",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingSnapshotActionLevel {
    #[serde(rename = "prompt")]
    Prompt,
    #[serde(rename = "review")]
    Review,
    #[serde(rename = "block")]
    Block,
}
impl OperatingSnapshotActionLevel {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Prompt => "prompt",
            Self::Review => "review",
            Self::Block => "block",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingSnapshotIdentity {
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "version")]
    pub version: String,
    #[serde(rename = "mode")]
    pub mode: OperatingSnapshotIdentityMode,
    #[serde(rename = "snapshotAt")]
    pub snapshot_at: DateTime<Utc>,
    #[serde(rename = "knowledgeCutoff")]
    pub knowledge_cutoff: DateTime<Utc>,
    #[serde(rename = "sourceWindowStart")]
    pub source_window_start: Option<NaiveDate>,
    #[serde(rename = "sourceWindowEnd")]
    pub source_window_end: Option<NaiveDate>,
    #[serde(rename = "periodKey")]
    pub period_key: Option<String>,
    #[serde(rename = "businessTimezone")]
    pub business_timezone: String,
    #[serde(rename = "supersedesSnapshotId")]
    pub supersedes_snapshot_id: Option<Uuid>,
    #[serde(rename = "periodEndSnapshotRef")]
    pub period_end_snapshot_ref: Option<SourceRef>,
    #[serde(rename = "restatementRef")]
    pub restatement_ref: Option<SourceRef>,
    #[serde(rename = "restatesSnapshotRef")]
    pub restates_snapshot_ref: Option<SourceRef>,
    #[serde(rename = "restatedSnapshotRef")]
    pub restated_snapshot_ref: Option<SourceRef>,
    #[serde(rename = "restatementStatus")]
    pub restatement_status: OperatingSnapshotIdentityRestatementStatus,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingSnapshotIdentityMode {
    #[serde(rename = "realtime")]
    Realtime,
    #[serde(rename = "period-end")]
    PeriodEnd,
    #[serde(rename = "restated")]
    Restated,
}
impl OperatingSnapshotIdentityMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Realtime => "realtime",
            Self::PeriodEnd => "period-end",
            Self::Restated => "restated",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OperatingSnapshotIdentityRestatementStatus {
    #[serde(rename = "not-applicable")]
    NotApplicable,
    #[serde(rename = "confirmed")]
    Confirmed,
    #[serde(rename = "pending")]
    Pending,
}
impl OperatingSnapshotIdentityRestatementStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotApplicable => "not-applicable",
            Self::Confirmed => "confirmed",
            Self::Pending => "pending",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OperatingSourceContext {
    #[serde(rename = "schemaVersion")]
    pub schema_version: i32,
    #[serde(rename = "producerVersion")]
    pub producer_version: i32,
    #[serde(rename = "policyVersion")]
    pub policy_version: String,
    #[serde(rename = "policyHash")]
    pub policy_hash: String,
    #[serde(rename = "contextId")]
    pub context_id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "currency")]
    pub currency: Option<String>,
    #[serde(rename = "sourceHash")]
    pub source_hash: String,
    #[serde(rename = "scopeHash")]
    pub scope_hash: String,
    #[serde(rename = "formalEligibility")]
    pub formal_eligibility: FormalEligibility,
    #[serde(rename = "snapshot")]
    pub snapshot: OperatingSnapshotIdentity,
    #[serde(rename = "baseline")]
    pub baseline: OperatingBaselineContext,
    #[serde(rename = "contracts")]
    pub contracts: Vec<Contract>,
    #[serde(rename = "receipts")]
    pub receipts: Vec<Receipt>,
    #[serde(rename = "costs")]
    pub costs: Vec<Cost>,
    #[serde(rename = "allocations")]
    pub allocations: Vec<Allocation>,
    #[serde(rename = "taxTreatments")]
    pub tax_treatments: Vec<Tax>,
    #[serde(rename = "pendingFacts")]
    pub pending_facts: Vec<Pending>,
    #[serde(rename = "unclassifiedSourceRefs")]
    pub unclassified_source_refs: Vec<SourceRef>,
    #[serde(rename = "upstreamCostConstraints")]
    pub upstream_cost_constraints: Vec<CostConstraint>,
    #[serde(rename = "scope")]
    pub scope: OperatingScope,
    #[serde(rename = "laborLineage")]
    pub labor_lineage: OperatingLaborLineage,
    #[serde(rename = "metrics")]
    pub metrics: Metrics,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OwnCompletionConditionClosure {
    #[serde(rename = "closureRecordId")]
    pub closure_record_id: Uuid,
    #[serde(rename = "closedAt")]
    pub closed_at: DateTime<Utc>,
    #[serde(rename = "closedBy")]
    pub closed_by: Uuid,
    #[serde(rename = "closureSummary")]
    pub closure_summary: String,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<FrozenLifecycleEvidence>,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OwnCompletionConditionTask {
    #[serde(rename = "conditionId")]
    pub condition_id: Uuid,
    #[serde(rename = "conditionRowVersion")]
    pub condition_row_version: i32,
    #[serde(rename = "summary")]
    pub summary: String,
    #[serde(rename = "responsibleUserId")]
    pub responsible_user_id: Uuid,
    #[serde(rename = "dueAt")]
    pub due_at: DateTime<Utc>,
    #[serde(rename = "status")]
    pub status: OwnCompletionConditionTaskStatus,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<FrozenLifecycleEvidence>,
    #[serde(rename = "closure")]
    pub closure: Option<OwnCompletionConditionClosure>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OwnCompletionConditionTaskStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "closed")]
    Closed,
}
impl OwnCompletionConditionTaskStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Closed => "closed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OwnCompletionTaskListView {
    #[serde(rename = "scopeKind")]
    pub scope_kind: String,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "items")]
    pub items: Vec<OwnCompletionTaskParent>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OwnCompletionTaskParent {
    #[serde(rename = "completionRecordId")]
    pub completion_record_id: Uuid,
    #[serde(rename = "completionRowVersion")]
    pub completion_row_version: i32,
    #[serde(rename = "conditionStatus")]
    pub condition_status: OwnCompletionTaskParentConditionStatus,
    #[serde(rename = "ownTasks")]
    pub own_tasks: Vec<OwnCompletionConditionTask>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OwnCompletionTaskParentConditionStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "closed")]
    Closed,
}
impl OwnCompletionTaskParentConditionStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Closed => "closed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OwnConditionCloseResult {
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "completionRowVersion")]
    pub completion_row_version: i32,
    #[serde(rename = "conditionStatus")]
    pub condition_status: String,
    #[serde(rename = "conditionRowVersion")]
    pub condition_row_version: i32,
    #[serde(rename = "closedAt")]
    pub closed_at: DateTime<Utc>,
    #[serde(rename = "targetId")]
    pub target_id: Uuid,
    #[serde(rename = "completionConditionStatus")]
    pub completion_condition_status: OwnConditionCloseResultCompletionConditionStatus,
    #[serde(rename = "closedBy")]
    pub closed_by: Uuid,
    #[serde(rename = "conditionId")]
    pub condition_id: Uuid,
    #[serde(rename = "closureRecordId")]
    pub closure_record_id: Uuid,
    #[serde(rename = "scopeKind")]
    pub scope_kind: String,
    #[serde(rename = "closureEvidenceRefs")]
    pub closure_evidence_refs: Vec<FrozenLifecycleEvidence>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum OwnConditionCloseResultCompletionConditionStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "closed")]
    Closed,
}
impl OwnConditionCloseResultCompletionConditionStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Closed => "closed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Pending {
    #[serde(rename = "kind")]
    pub kind: PendingKind,
    #[serde(rename = "sourceRef")]
    pub source_ref: SourceRef,
    #[serde(rename = "amounts")]
    pub amounts: Option<Triple>,
    #[serde(rename = "reasonCode")]
    pub reason_code: String,
    #[serde(rename = "requiredForFormalAccounting")]
    pub required_for_formal_accounting: bool,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum PendingKind {
    #[serde(rename = "receipt")]
    Receipt,
    #[serde(rename = "cost")]
    Cost,
    #[serde(rename = "allocation")]
    Allocation,
    #[serde(rename = "tax")]
    Tax,
    #[serde(rename = "restatement")]
    Restatement,
    #[serde(rename = "classification")]
    Classification,
}
impl PendingKind {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Receipt => "receipt",
            Self::Cost => "cost",
            Self::Allocation => "allocation",
            Self::Tax => "tax",
            Self::Restatement => "restatement",
            Self::Classification => "classification",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PeriodClosingSnapshotSummary {
    #[serde(rename = "outputVersion")]
    pub output_version: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "capturedRowVersion")]
    pub captured_row_version: i32,
    #[serde(rename = "headVersion")]
    pub head_version: i32,
    #[serde(rename = "producerVersion")]
    pub producer_version: i32,
    #[serde(rename = "certification")]
    pub certification: String,
    #[serde(rename = "sourceHash")]
    pub source_hash: String,
    #[serde(rename = "sourceContextId")]
    pub source_context_id: Uuid,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "containsLabor")]
    pub contains_labor: PeriodClosingSnapshotSummaryContainsLabor,
    #[serde(rename = "financialProjection")]
    pub financial_projection: FinancialProjection,
    #[serde(rename = "sourceRows")]
    pub source_rows: Vec<SourceRow>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "periodKey")]
    pub period_key: String,
    #[serde(rename = "periodStart")]
    pub period_start: NaiveDate,
    #[serde(rename = "periodEnd")]
    pub period_end: NaiveDate,
    #[serde(rename = "businessTimezone")]
    pub business_timezone: String,
    #[serde(rename = "projectSnapshotRef")]
    pub project_snapshot_ref: SourceRef,
    #[serde(rename = "snapshotAt")]
    pub snapshot_at: DateTime<Utc>,
    #[serde(rename = "originalFrozenUnchanged")]
    pub original_frozen_unchanged: bool,
    #[serde(rename = "latestRestatementRef")]
    pub latest_restatement_ref: Option<SourceRef>,
    #[serde(rename = "status")]
    pub status: PeriodClosingSnapshotSummaryStatus,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum PeriodClosingSnapshotSummaryContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl PeriodClosingSnapshotSummaryContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum PeriodClosingSnapshotSummaryStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "superseded")]
    Superseded,
}
impl PeriodClosingSnapshotSummaryStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Superseded => "superseded",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PrepareProjectHandoverRequest {
    #[serde(rename = "executionOwnerUserId")]
    pub execution_owner_user_id: Uuid,
    #[serde(rename = "participants")]
    pub participants: Vec<ProjectHandoverParticipantInput>,
    #[serde(rename = "financeConfirmationRequired")]
    pub finance_confirmation_required: bool,
    #[serde(rename = "receiptJudgmentMode")]
    pub receipt_judgment_mode: ProjectReceiptJudgmentMode,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "expectedSourceHash")]
    pub expected_source_hash: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "expectedCurrentHandoverVersion")]
    pub expected_current_handover_version: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "comment")]
    pub comment: Option<String>,
}

pub type ProjectArchiveRecordList = Vec<ProjectArchiveRecordSummary>;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectArchiveRecordSummary {
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "archiveAnchorStage")]
    pub archive_anchor_stage: ProjectArchiveRecordSummaryArchiveAnchorStage,
    #[serde(rename = "archiveAnchorSourceType")]
    pub archive_anchor_source_type: ProjectArchiveRecordSummaryArchiveAnchorSourceType,
    #[serde(rename = "archiveAnchorSourceId")]
    pub archive_anchor_source_id: Uuid,
    #[serde(rename = "status")]
    pub status: ProjectArchiveRecordSummaryStatus,
    #[serde(rename = "archivedAt")]
    pub archived_at: DateTime<Utc>,
    #[serde(rename = "archivedBy")]
    pub archived_by: Option<Uuid>,
    #[serde(rename = "archivedByName")]
    pub archived_by_name: Option<String>,
    #[serde(rename = "archiveSummary")]
    pub archive_summary: String,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(rename = "supersedesArchiveRecordId")]
    pub supersedes_archive_record_id: Option<Uuid>,
    #[serde(rename = "replacementReason")]
    pub replacement_reason: Option<String>,
    #[serde(rename = "voidedAt")]
    pub voided_at: Option<DateTime<Utc>>,
    #[serde(rename = "voidedBy")]
    pub voided_by: Option<Uuid>,
    #[serde(rename = "voidedByName")]
    pub voided_by_name: Option<String>,
    #[serde(rename = "voidReason")]
    pub void_reason: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "createdBy")]
    pub created_by: Option<Uuid>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "updatedBy")]
    pub updated_by: Option<Uuid>,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: Option<String>,
    #[serde(rename = "sourceQualification")]
    pub source_qualification: ProjectArchiveRecordSummarySourceQualification,
    #[serde(rename = "sourceStageRecordId")]
    pub source_stage_record_id: Option<Uuid>,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<FrozenLifecycleEvidence>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectArchiveRecordSummaryArchiveAnchorSourceType {
    #[serde(rename = "project")]
    Project,
    #[serde(rename = "project-completion-record")]
    ProjectCompletionRecord,
}
impl ProjectArchiveRecordSummaryArchiveAnchorSourceType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Project => "project",
            Self::ProjectCompletionRecord => "project-completion-record",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectArchiveRecordSummaryArchiveAnchorStage {
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "closed-lost")]
    ClosedLost,
    #[serde(rename = "closed-terminated")]
    ClosedTerminated,
    #[serde(rename = "conditional-completed")]
    ConditionalCompleted,
}
impl ProjectArchiveRecordSummaryArchiveAnchorStage {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::ClosedLost => "closed-lost",
            Self::ClosedTerminated => "closed-terminated",
            Self::ConditionalCompleted => "conditional-completed",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectArchiveRecordSummarySourceQualification {
    #[serde(rename = "verified-producer")]
    VerifiedProducer,
    #[serde(rename = "legacy-unverified")]
    LegacyUnverified,
}
impl ProjectArchiveRecordSummarySourceQualification {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::VerifiedProducer => "verified-producer",
            Self::LegacyUnverified => "legacy-unverified",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectArchiveRecordSummaryStatus {
    #[serde(rename = "recorded")]
    Recorded,
    #[serde(rename = "voided")]
    Voided,
    #[serde(rename = "superseded")]
    Superseded,
}
impl ProjectArchiveRecordSummaryStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Recorded => "recorded",
            Self::Voided => "voided",
            Self::Superseded => "superseded",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectBusinessOutcomeOverviewView {
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "effectiveContractSetSummaryProjection")]
    pub effective_contract_set_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "receivableConfirmedAmountSummaryProjection")]
    pub receivable_confirmed_amount_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "includedCostTotalSummaryProjection")]
    pub included_cost_total_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "currentEffectiveBaselineCostSummaryProjection")]
    pub current_effective_baseline_cost_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "grossMarginAmountProjection")]
    pub gross_margin_amount_projection: SensitiveStringFieldProjection,
    #[serde(rename = "grossMarginRateProjection")]
    pub gross_margin_rate_projection: SensitiveStringFieldProjection,
    #[serde(rename = "taxImpactSummaryProjection")]
    pub tax_impact_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "allocationStabilitySummary")]
    pub allocation_stability_summary: (),
    #[serde(rename = "unmappedCostSummary")]
    pub unmapped_cost_summary: (),
    #[serde(rename = "dataMaturityLevel")]
    pub data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "evaluationContext")]
    pub evaluation_context: OperatingEvaluationContext,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "reviewState")]
    pub review_state: ProjectBusinessOutcomeOverviewViewReviewState,
    #[serde(rename = "metricKnowledge")]
    pub metric_knowledge: OperatingMetricKnowledge,
    #[serde(rename = "signalLevel")]
    pub signal_level: OperatingSignalLevel,
    #[serde(rename = "riskLevel")]
    pub risk_level: OperatingRiskLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "allocationStabilitySummaryProjection")]
    pub allocation_stability_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "unmappedCostSummaryProjection")]
    pub unmapped_cost_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectBusinessOutcomeOverviewViewReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl ProjectBusinessOutcomeOverviewViewReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectCompletionConditionInput {
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<LifecycleEvidenceRef>,
    #[serde(rename = "summary")]
    pub summary: String,
    #[serde(rename = "dueAt")]
    pub due_at: DateTime<Utc>,
    #[serde(rename = "responsibleUserId")]
    pub responsible_user_id: Uuid,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectCompletionConditionSummary {
    #[serde(rename = "closedAt")]
    pub closed_at: Option<DateTime<Utc>>,
    #[serde(rename = "summary")]
    pub summary: String,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "dueAt")]
    pub due_at: DateTime<Utc>,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "closureEvidenceRefs")]
    pub closure_evidence_refs: Vec<FrozenLifecycleEvidence>,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<FrozenLifecycleEvidence>,
    #[serde(rename = "status")]
    pub status: ProjectCompletionConditionSummaryStatus,
    #[serde(rename = "completionRecordId")]
    pub completion_record_id: Uuid,
    #[serde(rename = "responsibleUserId")]
    pub responsible_user_id: Uuid,
    #[serde(rename = "closureRecordId")]
    pub closure_record_id: Option<Uuid>,
    #[serde(rename = "closedBy")]
    pub closed_by: Option<Uuid>,
    #[serde(rename = "closureSummary")]
    pub closure_summary: Option<String>,
    #[serde(rename = "responsibleUserName")]
    pub responsible_user_name: Option<String>,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectCompletionConditionSummaryStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "closed")]
    Closed,
}
impl ProjectCompletionConditionSummaryStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Closed => "closed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum ProjectCompletionRecordList {
    FullProjectCompletionRecordListView(FullProjectCompletionRecordListView),
    OwnCompletionTaskListView(OwnCompletionTaskListView),
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectCompletionRecordSummary {
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "acceptanceRecordId")]
    pub acceptance_record_id: Uuid,
    #[serde(rename = "completionResult")]
    pub completion_result: ProjectCompletionRecordSummaryCompletionResult,
    #[serde(rename = "status")]
    pub status: ProjectCompletionRecordSummaryStatus,
    #[serde(rename = "completedAt")]
    pub completed_at: DateTime<Utc>,
    #[serde(rename = "completedBy")]
    pub completed_by: Option<Uuid>,
    #[serde(rename = "completedByName")]
    pub completed_by_name: Option<String>,
    #[serde(rename = "completionSummary")]
    pub completion_summary: String,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "createdBy")]
    pub created_by: Option<Uuid>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "updatedBy")]
    pub updated_by: Option<Uuid>,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: Option<String>,
    #[serde(rename = "sourceQualification")]
    pub source_qualification: ProjectCompletionRecordSummarySourceQualification,
    #[serde(rename = "sourceStageRecordId")]
    pub source_stage_record_id: Option<Uuid>,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<FrozenLifecycleEvidence>,
    #[serde(rename = "conditionStatus")]
    pub condition_status: ProjectCompletionRecordSummaryConditionStatus,
    #[serde(rename = "conditions")]
    pub conditions: Vec<ProjectCompletionConditionSummary>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectCompletionRecordSummaryCompletionResult {
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "conditional-completed")]
    ConditionalCompleted,
}
impl ProjectCompletionRecordSummaryCompletionResult {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::ConditionalCompleted => "conditional-completed",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectCompletionRecordSummaryConditionStatus {
    #[serde(rename = "not-applicable")]
    NotApplicable,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "closed")]
    Closed,
    #[serde(rename = "legacy-unverified")]
    LegacyUnverified,
}
impl ProjectCompletionRecordSummaryConditionStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotApplicable => "not-applicable",
            Self::Pending => "pending",
            Self::Closed => "closed",
            Self::LegacyUnverified => "legacy-unverified",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectCompletionRecordSummarySourceQualification {
    #[serde(rename = "verified-producer")]
    VerifiedProducer,
    #[serde(rename = "legacy-unverified")]
    LegacyUnverified,
}
impl ProjectCompletionRecordSummarySourceQualification {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::VerifiedProducer => "verified-producer",
            Self::LegacyUnverified => "legacy-unverified",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectCompletionRecordSummaryStatus {
    #[serde(rename = "confirmed")]
    Confirmed,
}
impl ProjectCompletionRecordSummaryStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Confirmed => "confirmed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectDetailApprovalSummary {
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Option<Uuid>,
    #[serde(rename = "summaryPackageKey")]
    pub summary_package_key: Option<String>,
    #[serde(rename = "projectionLevel")]
    pub projection_level: Option<String>,
    #[serde(rename = "exportPolicy")]
    pub export_policy: Option<String>,
    #[serde(rename = "generatedAt")]
    pub generated_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectDetailBidSummary {
    #[serde(rename = "bidProcessId")]
    pub bid_process_id: Option<Uuid>,
    #[serde(rename = "bidStatus")]
    pub bid_status: String,
    #[serde(rename = "resultStatus")]
    pub result_status: Option<String>,
    #[serde(rename = "tenderNo")]
    pub tender_no: Option<String>,
    #[serde(rename = "bidPackageNo")]
    pub bid_package_no: Option<String>,
    #[serde(rename = "summary")]
    pub summary: Option<String>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectDetailConfirmationSummary {
    #[serde(rename = "confirmationRecordId")]
    pub confirmation_record_id: Option<Uuid>,
    #[serde(rename = "status")]
    pub status: String,
    #[serde(rename = "requiredCount")]
    pub required_count: i32,
    #[serde(rename = "confirmedCount")]
    pub confirmed_count: i32,
    #[serde(rename = "pendingCount")]
    pub pending_count: i32,
    #[serde(rename = "confirmedAt")]
    pub confirmed_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectDetailContractSummary {
    #[serde(rename = "activeContractCount")]
    pub active_contract_count: i32,
    #[serde(rename = "latestContractId")]
    pub latest_contract_id: Option<Uuid>,
    #[serde(rename = "latestContractNo")]
    pub latest_contract_no: Option<String>,
    #[serde(rename = "latestContractStatus")]
    pub latest_contract_status: Option<String>,
    #[serde(rename = "signedAmountProjection")]
    pub signed_amount_projection: SensitiveStringFieldProjection,
    #[serde(rename = "currencyCode")]
    pub currency_code: Option<String>,
    #[serde(rename = "signedAt")]
    pub signed_at: Option<DateTime<Utc>>,
    #[serde(rename = "currentSnapshotId")]
    pub current_snapshot_id: Option<Uuid>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectDetailStageSummary {
    #[serde(rename = "currentStage")]
    pub current_stage: ProjectStage,
    #[serde(rename = "status")]
    pub status: ProjectStatus,
    #[serde(rename = "plannedSignAt")]
    pub planned_sign_at: Option<DateTime<Utc>>,
    #[serde(rename = "closedAt")]
    pub closed_at: Option<DateTime<Utc>>,
    #[serde(rename = "closedReason")]
    pub closed_reason: Option<String>,
    #[serde(rename = "blockingReasons")]
    pub blocking_reasons: Vec<String>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum ProjectDetailView {
    FullProjectDetailView(Box<FullProjectDetailView>),
    CreatorFirstAssignmentAnchorView(Box<CreatorFirstAssignmentAnchorView>),
    LegacyOwnerAnchorView(Box<LegacyOwnerAnchorView>),
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectHandoverParticipantInput {
    #[serde(rename = "userId")]
    pub user_id: Uuid,
    #[serde(rename = "responsibilities")]
    pub responsibilities: Vec<ProjectHandoverResponsibilityInput>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectHandoverReceiptJudgmentFreezeStatus {
    #[serde(rename = "not-frozen")]
    NotFrozen,
    #[serde(rename = "frozen")]
    Frozen,
}
impl ProjectHandoverReceiptJudgmentFreezeStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotFrozen => "not-frozen",
            Self::Frozen => "frozen",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectHandoverReceiptJudgmentModeSummary {
    #[serde(rename = "status")]
    pub status: ProjectHandoverReceiptJudgmentFreezeStatus,
    #[serde(rename = "receiptJudgmentMode")]
    pub receipt_judgment_mode: Option<String>,
    #[serde(rename = "sourceType")]
    pub source_type: ProjectHandoverReceiptJudgmentSourceType,
    #[serde(rename = "sourceId")]
    pub source_id: Option<Uuid>,
    #[serde(rename = "summary")]
    pub summary: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectHandoverReceiptJudgmentSourceType {
    #[serde(rename = "project-handover")]
    ProjectHandover,
    #[serde(rename = "project-receipt-judgment-freeze")]
    ProjectReceiptJudgmentFreeze,
    #[serde(rename = "none")]
    None,
}
impl ProjectHandoverReceiptJudgmentSourceType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::ProjectHandover => "project-handover",
            Self::ProjectReceiptJudgmentFreeze => "project-receipt-judgment-freeze",
            Self::None => "none",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectHandoverResponsibilityInput {
    #[serde(rename = "roleKey")]
    pub role_key: ProjectHandoverResponsibilityRole,
    #[serde(rename = "responsibilitySummary")]
    pub responsibility_summary: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectHandoverResponsibilityRole {
    #[serde(rename = "sales-owner")]
    SalesOwner,
    #[serde(rename = "business-admin")]
    BusinessAdmin,
    #[serde(rename = "technical-support")]
    TechnicalSupport,
    #[serde(rename = "execution-owner")]
    ExecutionOwner,
    #[serde(rename = "finance")]
    Finance,
}
impl ProjectHandoverResponsibilityRole {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::SalesOwner => "sales-owner",
            Self::BusinessAdmin => "business-admin",
            Self::TechnicalSupport => "technical-support",
            Self::ExecutionOwner => "execution-owner",
            Self::Finance => "finance",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectInitialOwnership {
    #[serde(rename = "creator")]
    Creator,
    #[serde(rename = "organization")]
    Organization,
}
impl ProjectInitialOwnership {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Creator => "creator",
            Self::Organization => "organization",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectOperatingSnapshotSummary {
    #[serde(rename = "outputVersion")]
    pub output_version: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "capturedRowVersion")]
    pub captured_row_version: i32,
    #[serde(rename = "headVersion")]
    pub head_version: i32,
    #[serde(rename = "producerVersion")]
    pub producer_version: i32,
    #[serde(rename = "certification")]
    pub certification: String,
    #[serde(rename = "sourceHash")]
    pub source_hash: String,
    #[serde(rename = "sourceContextId")]
    pub source_context_id: Uuid,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "containsLabor")]
    pub contains_labor: ProjectOperatingSnapshotSummaryContainsLabor,
    #[serde(rename = "financialProjection")]
    pub financial_projection: FinancialProjection,
    #[serde(rename = "sourceRows")]
    pub source_rows: Vec<SourceRow>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    #[serde(rename = "snapshotMode")]
    pub snapshot_mode: ProjectOperatingSnapshotSummarySnapshotMode,
    #[serde(rename = "snapshotAt")]
    pub snapshot_at: DateTime<Utc>,
    #[serde(rename = "sourceWindowStart")]
    pub source_window_start: (),
    #[serde(rename = "sourceWindowEnd")]
    pub source_window_end: NaiveDate,
    #[serde(rename = "knowledgeCutoff")]
    pub knowledge_cutoff: DateTime<Utc>,
    #[serde(rename = "businessTimezone")]
    pub business_timezone: String,
    #[serde(rename = "status")]
    pub status: ProjectOperatingSnapshotSummaryStatus,
    #[serde(rename = "supersedesId")]
    pub supersedes_id: Option<Uuid>,
    #[serde(rename = "baselinePackageRef")]
    pub baseline_package_ref: SourceRef,
    #[serde(rename = "periodEndSnapshotRef")]
    pub period_end_snapshot_ref: Option<SourceRef>,
    #[serde(rename = "restatementRef")]
    pub restatement_ref: Option<SourceRef>,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "formalEligibility")]
    pub formal_eligibility: FormalEligibility,
    #[serde(rename = "evaluationStatus")]
    pub evaluation_status: String,
    #[serde(rename = "evaluationRefs")]
    pub evaluation_refs: EvaluationRefs,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectOperatingSnapshotSummaryContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ProjectOperatingSnapshotSummaryContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectOperatingSnapshotSummarySnapshotMode {
    #[serde(rename = "realtime")]
    Realtime,
    #[serde(rename = "period-end")]
    PeriodEnd,
    #[serde(rename = "restated")]
    Restated,
}
impl ProjectOperatingSnapshotSummarySnapshotMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Realtime => "realtime",
            Self::PeriodEnd => "period-end",
            Self::Restated => "restated",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectOperatingSnapshotSummaryStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "superseded")]
    Superseded,
}
impl ProjectOperatingSnapshotSummaryStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Superseded => "superseded",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectReceiptJudgmentMode {
    #[serde(rename = "project-aggregate")]
    ProjectAggregate,
    #[serde(rename = "contract-separate")]
    ContractSeparate,
}
impl ProjectReceiptJudgmentMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::ProjectAggregate => "project-aggregate",
            Self::ContractSeparate => "contract-separate",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectSourceLeadSummary {
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "leadNo")]
    pub lead_no: String,
    #[serde(rename = "leadName")]
    pub lead_name: String,
    #[serde(rename = "customerId")]
    pub customer_id: Uuid,
    #[serde(rename = "customerName")]
    pub customer_name: String,
    #[serde(rename = "status")]
    pub status: LeadStatus,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectStage {
    #[serde(rename = "assessment")]
    Assessment,
    #[serde(rename = "scope-confirmation")]
    ScopeConfirmation,
    #[serde(rename = "commercial-closure")]
    CommercialClosure,
    #[serde(rename = "contracting")]
    Contracting,
    #[serde(rename = "handover")]
    Handover,
    #[serde(rename = "execution")]
    Execution,
    #[serde(rename = "acceptance")]
    Acceptance,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "closed-lost")]
    ClosedLost,
    #[serde(rename = "closed-terminated")]
    ClosedTerminated,
    #[serde(rename = "conditional-completed")]
    ConditionalCompleted,
}
impl ProjectStage {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Assessment => "assessment",
            Self::ScopeConfirmation => "scope-confirmation",
            Self::CommercialClosure => "commercial-closure",
            Self::Contracting => "contracting",
            Self::Handover => "handover",
            Self::Execution => "execution",
            Self::Acceptance => "acceptance",
            Self::Completed => "completed",
            Self::ClosedLost => "closed-lost",
            Self::ClosedTerminated => "closed-terminated",
            Self::ConditionalCompleted => "conditional-completed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectStageTransitionResult {
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "projectRowVersion")]
    pub project_row_version: i32,
    #[serde(rename = "enteredAt")]
    pub entered_at: DateTime<Utc>,
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Uuid,
    #[serde(rename = "targetId")]
    pub target_id: Uuid,
    #[serde(rename = "businessStatusAfter")]
    pub business_status_after: ProjectStageTransitionResultBusinessStatusAfter,
    #[serde(rename = "commissionRoleAssignmentId")]
    pub commission_role_assignment_id: Uuid,
    #[serde(rename = "enteredBy")]
    pub entered_by: Uuid,
    #[serde(rename = "projectStageRecordId")]
    pub project_stage_record_id: Uuid,
    #[serde(rename = "sourceHandoverId")]
    pub source_handover_id: Uuid,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectStageTransitionResultBusinessStatusAfter {
    #[serde(rename = "execution")]
    Execution,
    #[serde(rename = "acceptance")]
    Acceptance,
}
impl ProjectStageTransitionResultBusinessStatusAfter {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Execution => "execution",
            Self::Acceptance => "acceptance",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "pending-approval")]
    PendingApproval,
    #[serde(rename = "blocked")]
    Blocked,
    #[serde(rename = "on-hold")]
    OnHold,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "closed")]
    Closed,
}
impl ProjectStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::PendingApproval => "pending-approval",
            Self::Blocked => "blocked",
            Self::OnHold => "on-hold",
            Self::Completed => "completed",
            Self::Closed => "closed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum ProjectUnifiedAccountingResponse {
    ProjectUnifiedAccountingView(Box<ProjectUnifiedAccountingView>),
    OperatingAccountingPreparationView(Box<OperatingAccountingPreparationView>),
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectUnifiedAccountingView {
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "snapshotId")]
    pub snapshot_id: Uuid,
    #[serde(rename = "originalBaselineCostSummaryProjection")]
    pub original_baseline_cost_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "currentEffectiveBaselineCostSummaryProjection")]
    pub current_effective_baseline_cost_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "includedCostTotalSummaryProjection")]
    pub included_cost_total_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "receivableConfirmedAmountSummaryProjection")]
    pub receivable_confirmed_amount_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "taxImpactSummaryProjection")]
    pub tax_impact_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "taxImpactPendingAmountProjection")]
    pub tax_impact_pending_amount_projection: SensitiveStringFieldProjection,
    #[serde(rename = "allocationStabilitySummary")]
    pub allocation_stability_summary: (),
    #[serde(rename = "unmappedCostSummary")]
    pub unmapped_cost_summary: (),
    #[serde(rename = "dataMaturityLevel")]
    pub data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "evaluationContext")]
    pub evaluation_context: OperatingEvaluationContext,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "reviewState")]
    pub review_state: ProjectUnifiedAccountingViewReviewState,
    #[serde(rename = "metricKnowledge")]
    pub metric_knowledge: OperatingMetricKnowledge,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "allocationStabilitySummaryProjection")]
    pub allocation_stability_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "unmappedCostSummaryProjection")]
    pub unmapped_cost_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectUnifiedAccountingViewReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl ProjectUnifiedAccountingViewReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectVarianceRiskExplanationView {
    #[serde(rename = "projectId")]
    pub project_id: Uuid,
    #[serde(rename = "signalEvaluationId")]
    pub signal_evaluation_id: Uuid,
    #[serde(rename = "varianceSourceSummaryProjection")]
    pub variance_source_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "riskLevel")]
    pub risk_level: OperatingRiskLevel,
    #[serde(rename = "taxImpactSummaryProjection")]
    pub tax_impact_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "allocationStabilitySummary")]
    pub allocation_stability_summary: (),
    #[serde(rename = "unmappedCostSummary")]
    pub unmapped_cost_summary: (),
    #[serde(rename = "dataMaturityLevel")]
    pub data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(rename = "recommendedActionSummary")]
    pub recommended_action_summary: (),
    #[serde(rename = "allowedActions")]
    pub allowed_actions: Vec<String>,
    #[serde(rename = "evaluationContext")]
    pub evaluation_context: OperatingEvaluationContext,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "reviewState")]
    pub review_state: ProjectVarianceRiskExplanationViewReviewState,
    #[serde(rename = "metricKnowledge")]
    pub metric_knowledge: OperatingMetricKnowledge,
    #[serde(rename = "systemRiskLevel")]
    pub system_risk_level: OperatingRiskLevel,
    #[serde(rename = "allocationStabilitySummaryProjection")]
    pub allocation_stability_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "unmappedCostSummaryProjection")]
    pub unmapped_cost_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "recommendedActionSummaryProjection")]
    pub recommended_action_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ProjectVarianceRiskExplanationViewReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl ProjectVarianceRiskExplanationViewReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Ratio {
    #[serde(rename = "knowledge")]
    pub knowledge: Knowledge,
    #[serde(rename = "value")]
    pub value: Option<String>,
    #[serde(rename = "reasonCode")]
    pub reason_code: Option<String>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Receipt {
    #[serde(rename = "receiptRef")]
    pub receipt_ref: SourceRef,
    #[serde(rename = "contractId")]
    pub contract_id: Uuid,
    #[serde(rename = "status")]
    pub status: ReceiptStatus,
    #[serde(rename = "confirmedAt")]
    pub confirmed_at: DateTime<Utc>,
    #[serde(rename = "cashGross")]
    pub cash_gross: Amount,
    #[serde(rename = "accountingBasisRef")]
    pub accounting_basis_ref: Option<SourceRef>,
    #[serde(rename = "contractTermSnapshotRef")]
    pub contract_term_snapshot_ref: Option<SourceRef>,
    #[serde(rename = "basisOrigin")]
    pub basis_origin: ReceiptBasisOrigin,
    #[serde(rename = "legacyCorrectionRef")]
    pub legacy_correction_ref: Option<SourceRef>,
    #[serde(rename = "amounts")]
    pub amounts: Triple,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReceiptBasisInput {
    #[serde(rename = "termSnapshotRef")]
    pub term_snapshot_ref: ExpectedRef,
    #[serde(rename = "currencyBasisRef")]
    pub currency_basis_ref: ExpectedRef,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<ExpectedRef>,
    #[serde(rename = "selectionPolicy")]
    pub selection_policy: ReceiptBasisInputSelectionPolicy,
    #[serde(rename = "reason")]
    pub reason: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ReceiptBasisInputSelectionPolicy {
    #[serde(rename = "receipt-date-effective-terms")]
    ReceiptDateEffectiveTerms,
    #[serde(rename = "explicit-activated-terms-evidence")]
    ExplicitActivatedTermsEvidence,
}
impl ReceiptBasisInputSelectionPolicy {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::ReceiptDateEffectiveTerms => "receipt-date-effective-terms",
            Self::ExplicitActivatedTermsEvidence => "explicit-activated-terms-evidence",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ReceiptBasisOrigin {
    #[serde(rename = "confirmation")]
    Confirmation,
    #[serde(rename = "authorized-legacy-correction")]
    AuthorizedLegacyCorrection,
    #[serde(rename = "missing")]
    Missing,
}
impl ReceiptBasisOrigin {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Confirmation => "confirmation",
            Self::AuthorizedLegacyCorrection => "authorized-legacy-correction",
            Self::Missing => "missing",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ReceiptStatus {
    #[serde(rename = "confirmed")]
    Confirmed,
}
impl ReceiptStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Confirmed => "confirmed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReplaceProjectArchiveRecordRequest {
    #[serde(rename = "archivedAt")]
    pub archived_at: DateTime<Utc>,
    #[serde(rename = "archiveSummary")]
    pub archive_summary: String,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(rename = "replacementReason")]
    pub replacement_reason: String,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum RestatementAccountingTaxDeductibilityStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "deductible")]
    Deductible,
    #[serde(rename = "non-deductible")]
    NonDeductible,
}
impl RestatementAccountingTaxDeductibilityStatus {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Deductible => "deductible",
            Self::NonDeductible => "non-deductible",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum RestatementR4FGovernanceEvidence {
    RestatementR4FSourceEvidence(RestatementR4FSourceEvidence),
    RestatementR4FManualAssessmentEvidence(RestatementR4FManualAssessmentEvidence),
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RestatementR4FManualAssessmentEvidence {
    #[serde(rename = "kind")]
    pub kind: RestatementR4FManualAssessmentEvidenceKind,
    #[serde(rename = "businessDate")]
    pub business_date: NaiveDate,
    #[serde(rename = "reason")]
    pub reason: String,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "attachmentIds")]
    pub attachment_ids: Option<Vec<Uuid>>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum RestatementR4FManualAssessmentEvidenceKind {
    #[serde(rename = "manual")]
    Manual,
}
impl RestatementR4FManualAssessmentEvidenceKind {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Manual => "manual",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RestatementR4FSourceEvidence {
    #[serde(rename = "kind")]
    pub kind: RestatementR4FSourceEvidenceKind,
    #[serde(rename = "sourceType")]
    pub source_type: String,
    #[serde(rename = "sourceId")]
    pub source_id: String,
    #[serde(rename = "sourceVersion")]
    pub source_version: i32,
    #[serde(rename = "businessDate")]
    pub business_date: NaiveDate,
    #[serde(rename = "reason")]
    pub reason: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum RestatementR4FSourceEvidenceKind {
    #[serde(rename = "source")]
    Source,
}
impl RestatementR4FSourceEvidenceKind {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Source => "source",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RestatementStageProducerRequest {
    #[serde(rename = "newAttributedStage")]
    pub new_attributed_stage: String,
    #[serde(rename = "lockedBySnapshotId")]
    pub locked_by_snapshot_id: (),
    #[serde(rename = "reclassifyReason")]
    pub reclassify_reason: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "comment")]
    pub comment: Option<String>,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "attributionEvidence")]
    pub attribution_evidence: RestatementR4FGovernanceEvidence,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RestatementTaxProducerRequest {
    #[serde(rename = "taxTreatmentType")]
    pub tax_treatment_type: String,
    #[serde(rename = "deductibilityStatus")]
    pub deductibility_status: RestatementAccountingTaxDeductibilityStatus,
    #[serde(rename = "taxImpactAmount")]
    pub tax_impact_amount: String,
    #[serde(rename = "taxImpactSummary")]
    pub tax_impact_summary: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "taxPendingFlag")]
    pub tax_pending_flag: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "taxImpactPendingAmount")]
    pub tax_impact_pending_amount: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "basisSummary")]
    pub basis_summary: Option<String>,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "currency")]
    pub currency: String,
    #[serde(rename = "sourceReferences")]
    pub source_references: Vec<RestatementR4FGovernanceEvidence>,
    #[serde(rename = "replacementReason")]
    pub replacement_reason: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReviewCommissionGateBindingRequest {
    #[serde(rename = "bindingAction")]
    pub binding_action: OperatingSnapshotActionLevel,
    #[serde(rename = "gateReviewDecision")]
    pub gate_review_decision: OperatingGateReviewDecision,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "blockingReasonCode")]
    pub blocking_reason_code: Option<OperatingReasonCode>,
    #[serde(rename = "baselineSelectionSource")]
    pub baseline_selection_source: BaselineSelectionSource,
    #[serde(rename = "summaryPackageKey")]
    pub summary_package_key: String,
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Uuid,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "comment")]
    pub comment: Option<String>,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "expectedSourceHash")]
    pub expected_source_hash: String,
    #[serde(rename = "expectedEvaluationHash")]
    pub expected_evaluation_hash: String,
    #[serde(rename = "requestKey")]
    pub request_key: Uuid,
    #[serde(rename = "reviewAction")]
    pub review_action: ReviewCommissionGateBindingRequestReviewAction,
    #[serde(rename = "blockingReasonCodes")]
    pub blocking_reason_codes: Vec<OperatingReasonCode>,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ReviewCommissionGateBindingRequestReviewAction {
    #[serde(rename = "acknowledge")]
    Acknowledge,
    #[serde(rename = "tighten-review")]
    TightenReview,
    #[serde(rename = "tighten-block")]
    TightenBlock,
}
impl ReviewCommissionGateBindingRequestReviewAction {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Acknowledge => "acknowledge",
            Self::TightenReview => "tighten-review",
            Self::TightenBlock => "tighten-block",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReviewCommissionGateBindingResult {
    #[serde(rename = "targetId")]
    pub target_id: Uuid,
    #[serde(rename = "bindingResultId")]
    pub binding_result_id: Uuid,
    #[serde(rename = "gateReviewRecordId")]
    pub gate_review_record_id: Uuid,
    #[serde(rename = "taxImpactSummary")]
    pub tax_impact_summary: (),
    #[serde(rename = "taxImpactPendingAmount")]
    pub tax_impact_pending_amount: (),
    #[serde(rename = "dataMaturityLevel")]
    pub data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "baselineSelectionSource")]
    pub baseline_selection_source: BaselineSelectionSource,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(rename = "summaryPackageKey")]
    pub summary_package_key: String,
    #[serde(rename = "summarySnapshotId")]
    pub summary_snapshot_id: Uuid,
    #[serde(rename = "projectionLevel")]
    pub projection_level: String,
    #[serde(rename = "exportPolicy")]
    pub export_policy: String,
    #[serde(rename = "nextActionSummary")]
    pub next_action_summary: (),
    #[serde(rename = "businessStatusAfter")]
    pub business_status_after: String,
    #[serde(rename = "evaluationContext")]
    pub evaluation_context: OperatingEvaluationContext,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "reviewState")]
    pub review_state: ReviewCommissionGateBindingResultReviewState,
    #[serde(rename = "metricKnowledge")]
    pub metric_knowledge: OperatingMetricKnowledge,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "gateStageType")]
    pub gate_stage_type: OperatingGateStage,
    #[serde(rename = "systemBindingAction")]
    pub system_binding_action: OperatingSnapshotActionLevel,
    #[serde(rename = "bindingAction")]
    pub binding_action: OperatingSnapshotActionLevel,
    #[serde(rename = "gateReviewDecision")]
    pub gate_review_decision: OperatingGateReviewDecision,
    #[serde(rename = "taxImpactSummaryProjection")]
    pub tax_impact_summary_projection: SensitiveStringFieldProjection,
    #[serde(rename = "taxImpactPendingAmountProjection")]
    pub tax_impact_pending_amount_projection: SensitiveStringFieldProjection,
    #[serde(rename = "nextActionSummaryProjection")]
    pub next_action_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ReviewCommissionGateBindingResultReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl ReviewCommissionGateBindingResultReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReviewOperatingSignalEvaluationRequest {
    #[serde(rename = "reviewDecision")]
    pub review_decision: ReviewOperatingSignalEvaluationRequestReviewDecision,
    #[serde(rename = "resolvedDataMaturityLevel")]
    pub resolved_data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "reviewComment")]
    pub review_comment: Option<String>,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "expectedSourceHash")]
    pub expected_source_hash: String,
    #[serde(rename = "expectedEvaluationHash")]
    pub expected_evaluation_hash: String,
    #[serde(rename = "requestKey")]
    pub request_key: Uuid,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "manualMaterialityReview")]
    pub manual_materiality_review: Option<ManualOperatingMaterialityReview>,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ReviewOperatingSignalEvaluationRequestReviewDecision {
    #[serde(rename = "approve")]
    Approve,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
}
impl ReviewOperatingSignalEvaluationRequestReviewDecision {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Approve => "approve",
            Self::ManualConfirmed => "manual-confirmed",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReviewOperatingSignalEvaluationResult {
    #[serde(rename = "targetId")]
    pub target_id: Uuid,
    #[serde(rename = "signalEvaluationId")]
    pub signal_evaluation_id: Uuid,
    #[serde(rename = "reviewRecordId")]
    pub review_record_id: Uuid,
    #[serde(rename = "taxImpactSummary")]
    pub tax_impact_summary: (),
    #[serde(rename = "dataMaturityLevel")]
    pub data_maturity_level: OperatingDataMaturityLevel,
    #[serde(rename = "costActionRecommendation")]
    pub cost_action_recommendation: OperatingSnapshotActionLevel,
    #[serde(rename = "currentActionLevel")]
    pub current_action_level: OperatingSnapshotActionLevel,
    #[serde(rename = "referencedBaselineVersion")]
    pub referenced_baseline_version: String,
    #[serde(rename = "referencedSnapshotVersion")]
    pub referenced_snapshot_version: String,
    #[serde(rename = "resultStatus")]
    pub result_status: String,
    #[serde(rename = "evaluationContext")]
    pub evaluation_context: OperatingEvaluationContext,
    #[serde(rename = "reasonItems")]
    pub reason_items: Vec<OperatingReasonView>,
    #[serde(rename = "reviewState")]
    pub review_state: ReviewOperatingSignalEvaluationResultReviewState,
    #[serde(rename = "metricKnowledge")]
    pub metric_knowledge: OperatingMetricKnowledge,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "signalLevel")]
    pub signal_level: OperatingSignalLevel,
    #[serde(rename = "riskLevel")]
    pub risk_level: OperatingRiskLevel,
    #[serde(rename = "systemSignalLevel")]
    pub system_signal_level: OperatingSignalLevel,
    #[serde(rename = "systemRiskLevel")]
    pub system_risk_level: OperatingRiskLevel,
    #[serde(rename = "gateBindingIds")]
    pub gate_binding_ids: BTreeMap<OperatingGateStage, Uuid>,
    #[serde(rename = "taxImpactSummaryProjection")]
    pub tax_impact_summary_projection: SensitiveStringFieldProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum ReviewOperatingSignalEvaluationResultReviewState {
    #[serde(rename = "not-required")]
    NotRequired,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "acknowledged")]
    Acknowledged,
    #[serde(rename = "manual-confirmed")]
    ManualConfirmed,
    #[serde(rename = "stale")]
    Stale,
}
impl ReviewOperatingSignalEvaluationResultReviewState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::NotRequired => "not-required",
            Self::Pending => "pending",
            Self::Acknowledged => "acknowledged",
            Self::ManualConfirmed => "manual-confirmed",
            Self::Stale => "stale",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SensitiveFieldPackageKey {
    #[serde(rename = "contract-finance")]
    ContractFinance,
    #[serde(rename = "operating-finance")]
    OperatingFinance,
    #[serde(rename = "commission-compensation")]
    CommissionCompensation,
    #[serde(rename = "labor-cost-rate")]
    LaborCostRate,
    #[serde(rename = "exception-approval-opinion")]
    ExceptionApprovalOpinion,
}
impl SensitiveFieldPackageKey {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::ContractFinance => "contract-finance",
            Self::OperatingFinance => "operating-finance",
            Self::CommissionCompensation => "commission-compensation",
            Self::LaborCostRate => "labor-cost-rate",
            Self::ExceptionApprovalOpinion => "exception-approval-opinion",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SensitiveProjectionMode {
    #[serde(rename = "full")]
    Full,
    #[serde(rename = "summary")]
    Summary,
    #[serde(rename = "masked")]
    Masked,
    #[serde(rename = "denied")]
    Denied,
}
impl SensitiveProjectionMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Summary => "summary",
            Self::Masked => "masked",
            Self::Denied => "denied",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SensitiveProjectionReasonCode {
    #[serde(rename = "allowed")]
    Allowed,
    #[serde(rename = "summary-only")]
    SummaryOnly,
    #[serde(rename = "missing-sensitive-read-permission")]
    MissingSensitiveReadPermission,
    #[serde(rename = "field-package-not-applicable")]
    FieldPackageNotApplicable,
}
impl SensitiveProjectionReasonCode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Allowed => "allowed",
            Self::SummaryOnly => "summary-only",
            Self::MissingSensitiveReadPermission => "missing-sensitive-read-permission",
            Self::FieldPackageNotApplicable => "field-package-not-applicable",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SensitiveStringFieldProjection {
    #[serde(rename = "fieldPackageKey")]
    pub field_package_key: SensitiveFieldPackageKey,
    #[serde(rename = "mode")]
    pub mode: SensitiveProjectionMode,
    #[serde(rename = "value")]
    pub value: Option<String>,
    #[serde(rename = "displayText")]
    pub display_text: String,
    #[serde(rename = "reasonCode")]
    pub reason_code: SensitiveProjectionReasonCode,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SharedSourceMember {
    #[serde(rename = "costRef")]
    pub cost_ref: SourceRef,
    #[serde(rename = "sourceRef")]
    pub source_ref: SourceRef,
    #[serde(rename = "stageAttributionRef")]
    pub stage_attribution_ref: Option<SourceRef>,
    #[serde(rename = "attributedStage")]
    pub attributed_stage: Option<String>,
    #[serde(rename = "governanceEvidenceRefs")]
    pub governance_evidence_refs: Vec<SourceRef>,
    #[serde(rename = "containsLabor")]
    pub contains_labor: SharedSourceMemberContainsLabor,
    #[serde(rename = "costType")]
    pub cost_type: SharedSourceMemberCostType,
    #[serde(rename = "businessDate")]
    pub business_date: NaiveDate,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SharedSourceMemberContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl SharedSourceMemberContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SharedSourceMemberCostType {
    #[serde(rename = "procurement")]
    Procurement,
    #[serde(rename = "invoice")]
    Invoice,
    #[serde(rename = "expense")]
    Expense,
    #[serde(rename = "payment-fact")]
    PaymentFact,
    #[serde(rename = "labor")]
    Labor,
}
impl SharedSourceMemberCostType {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Procurement => "procurement",
            Self::Invoice => "invoice",
            Self::Expense => "expense",
            Self::PaymentFact => "payment-fact",
            Self::Labor => "labor",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceFinancialGroup {
    #[serde(rename = "currency")]
    pub currency: Option<String>,
    #[serde(rename = "net")]
    pub net: MoneyFact,
    #[serde(rename = "tax")]
    pub tax: MoneyFact,
    #[serde(rename = "gross")]
    pub gross: MoneyFact,
    #[serde(rename = "rate")]
    pub rate: Option<String>,
    #[serde(rename = "detailText")]
    pub detail_text: Option<String>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceFinancialProjection {
    #[serde(rename = "mode")]
    pub mode: SourceFinancialProjectionMode,
    #[serde(rename = "displayText")]
    pub display_text: String,
    #[serde(rename = "fieldPackageKeys")]
    pub field_package_keys: Vec<SourceFinancialProjectionFieldPackageKeysItem>,
    #[serde(rename = "value")]
    pub value: Option<SourceFinancialGroup>,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SourceFinancialProjectionFieldPackageKeysItem {
    #[serde(rename = "operating-finance")]
    OperatingFinance,
    #[serde(rename = "labor-cost-rate")]
    LaborCostRate,
}
impl SourceFinancialProjectionFieldPackageKeysItem {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::OperatingFinance => "operating-finance",
            Self::LaborCostRate => "labor-cost-rate",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SourceFinancialProjectionMode {
    #[serde(rename = "full")]
    Full,
    #[serde(rename = "masked")]
    Masked,
    #[serde(rename = "denied")]
    Denied,
}
impl SourceFinancialProjectionMode {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Masked => "masked",
            Self::Denied => "denied",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceRef {
    #[serde(rename = "kind")]
    pub kind: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "rowVersion")]
    pub row_version: i32,
    #[serde(rename = "payloadHash")]
    pub payload_hash: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceRow {
    #[serde(rename = "rowKind")]
    pub row_kind: SourceRowRowKind,
    #[serde(rename = "sourceRef")]
    pub source_ref: SourceRef,
    #[serde(rename = "sourceMembers")]
    pub source_members: Vec<SourceRef>,
    #[serde(rename = "state")]
    pub state: SourceRowState,
    #[serde(rename = "blockingReasonCodes")]
    pub blocking_reason_codes: Vec<String>,
    #[serde(rename = "currentDecisionRef")]
    pub current_decision_ref: Option<SourceRef>,
    #[serde(rename = "canonicalAccumulationKey")]
    pub canonical_accumulation_key: Option<String>,
    #[serde(rename = "sourceChainKey")]
    pub source_chain_key: Option<String>,
    #[serde(rename = "containsLabor")]
    pub contains_labor: SourceRowContainsLabor,
    #[serde(rename = "allowedRecognitionRoles")]
    pub allowed_recognition_roles: Vec<SourceRowAllowedRecognitionRolesItem>,
    #[serde(rename = "primaryCostRef")]
    pub primary_cost_ref: Option<SourceRef>,
    #[serde(rename = "sourceBusinessDate")]
    pub source_business_date: Option<NaiveDate>,
    #[serde(rename = "sourceEffectiveBusinessDate")]
    pub source_effective_business_date: Option<NaiveDate>,
    #[serde(rename = "financialProjection")]
    pub financial_projection: SourceFinancialProjection,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SourceRowAllowedRecognitionRolesItem {
    #[serde(rename = "direct-source")]
    DirectSource,
    #[serde(rename = "allocation-share")]
    AllocationShare,
    #[serde(rename = "tax-support")]
    TaxSupport,
    #[serde(rename = "evidence-only")]
    EvidenceOnly,
}
impl SourceRowAllowedRecognitionRolesItem {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::DirectSource => "direct-source",
            Self::AllocationShare => "allocation-share",
            Self::TaxSupport => "tax-support",
            Self::EvidenceOnly => "evidence-only",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SourceRowContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl SourceRowContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SourceRowRowKind {
    #[serde(rename = "contract")]
    Contract,
    #[serde(rename = "receipt")]
    Receipt,
    #[serde(rename = "direct-cost")]
    DirectCost,
    #[serde(rename = "allocation-share")]
    AllocationShare,
    #[serde(rename = "supporting-source")]
    SupportingSource,
    #[serde(rename = "tax-treatment")]
    TaxTreatment,
    #[serde(rename = "baseline")]
    Baseline,
    #[serde(rename = "stage-evidence")]
    StageEvidence,
}
impl SourceRowRowKind {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Contract => "contract",
            Self::Receipt => "receipt",
            Self::DirectCost => "direct-cost",
            Self::AllocationShare => "allocation-share",
            Self::SupportingSource => "supporting-source",
            Self::TaxTreatment => "tax-treatment",
            Self::Baseline => "baseline",
            Self::StageEvidence => "stage-evidence",
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum SourceRowState {
    #[serde(rename = "ready")]
    Ready,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "unclassified")]
    Unclassified,
    #[serde(rename = "legacy-unverified")]
    LegacyUnverified,
}
impl SourceRowState {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Ready => "ready",
            Self::Pending => "pending",
            Self::Unclassified => "unclassified",
            Self::LegacyUnverified => "legacy-unverified",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StageReclassificationCorrection {
    #[serde(rename = "correctionKind")]
    pub correction_kind: String,
    #[serde(rename = "stageAttributionRef")]
    pub stage_attribution_ref: StageReclassificationCorrectionStageAttributionRef,
    #[serde(rename = "costRef")]
    pub cost_ref: StageReclassificationCorrectionCostRef,
    #[serde(rename = "request")]
    pub request: RestatementStageProducerRequest,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StageReclassificationCorrectionCostRef {
    #[serde(rename = "kind")]
    pub kind: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "payloadHash")]
    pub payload_hash: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StageReclassificationCorrectionStageAttributionRef {
    #[serde(rename = "kind")]
    pub kind: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "payloadHash")]
    pub payload_hash: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StartProjectAcceptanceRequest {
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<LifecycleEvidenceRef>,
    #[serde(rename = "evidenceSummary")]
    pub evidence_summary: String,
    #[serde(rename = "executionStageRecordId")]
    pub execution_stage_record_id: Uuid,
    #[serde(rename = "readinessSummary")]
    pub readiness_summary: String,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StartProjectExecutionRequest {
    #[serde(rename = "handoverStageRecordId")]
    pub handover_stage_record_id: Uuid,
    #[serde(rename = "reason")]
    pub reason: String,
    #[serde(rename = "handoverSummarySnapshotId")]
    pub handover_summary_snapshot_id: Uuid,
    #[serde(rename = "expectedProjectVersion")]
    pub expected_project_version: i32,
    #[serde(rename = "expectedRoleAssignmentVersion")]
    pub expected_role_assignment_version: i32,
    #[serde(rename = "commissionRoleAssignmentId")]
    pub commission_role_assignment_id: Uuid,
    #[serde(rename = "sourceHandoverId")]
    pub source_handover_id: Uuid,
    #[serde(rename = "sourcePayloadHash")]
    pub source_payload_hash: String,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Tax {
    #[serde(rename = "taxTreatmentRef")]
    pub tax_treatment_ref: SourceRef,
    #[serde(rename = "evidenceRefs")]
    pub evidence_refs: Vec<SourceRef>,
    #[serde(rename = "deductibility")]
    pub deductibility: RestatementAccountingTaxDeductibilityStatus,
    #[serde(rename = "pendingAmount")]
    pub pending_amount: Amount,
    #[serde(rename = "recognizedAdjustmentNet")]
    pub recognized_adjustment_net: Amount,
    #[serde(rename = "adjustmentOverlapKey")]
    pub adjustment_overlap_key: String,
    #[serde(rename = "containsLabor")]
    pub contains_labor: TaxContainsLabor,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize,
)]
pub enum TaxContainsLabor {
    #[serde(rename = "yes")]
    Yes,
    #[serde(rename = "no")]
    No,
    #[serde(rename = "unknown")]
    Unknown,
}
impl TaxContainsLabor {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TaxTreatmentReplacementCorrection {
    #[serde(rename = "correctionKind")]
    pub correction_kind: String,
    #[serde(rename = "taxTreatmentRef")]
    pub tax_treatment_ref: TaxTreatmentReplacementCorrectionTaxTreatmentRef,
    #[serde(rename = "expectedSourceRefs")]
    pub expected_source_refs: Vec<ExpectedRef>,
    #[serde(rename = "request")]
    pub request: RestatementTaxProducerRequest,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TaxTreatmentReplacementCorrectionTaxTreatmentRef {
    #[serde(rename = "kind")]
    pub kind: String,
    #[serde(rename = "id")]
    pub id: Uuid,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "payloadHash")]
    pub payload_hash: String,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Triple {
    #[serde(rename = "currency")]
    pub currency: Option<String>,
    #[serde(rename = "gross")]
    pub gross: Amount,
    #[serde(rename = "net")]
    pub net: Amount,
    #[serde(rename = "tax")]
    pub tax: Amount,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct VoidProjectArchiveRecordRequest {
    #[serde(rename = "reason")]
    pub reason: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "comment")]
    pub comment: Option<String>,
    #[serde(rename = "expectedVersion")]
    pub expected_version: i32,
    #[serde(rename = "inputVersion")]
    pub input_version: String,
}
