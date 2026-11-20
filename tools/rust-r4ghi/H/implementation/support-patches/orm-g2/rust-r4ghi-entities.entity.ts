// Root review candidate. SQL remains authoritative; no DB has been accessed.
import { defineEntity } from "@mikro-orm/core";
import {AcceptanceRecord} from "../project/acceptance-record.entity";
import {ApprovalSummarySnapshot} from "../approval-summary/approval-summary.entity";
import {Attachment} from "../attachment/attachment.entity";
import {CommissionGateReviewRecord} from "./commission-gate-review-record.entity";
import {CommissionRoleAssignment} from "../commission/commission-role-assignment.entity";
import {ContractHandoverRebaselineRecord,ProjectHandover,ProjectReceiptJudgmentFreeze} from "../project-handover/project-handover.entity";
import {ContractTermSnapshot} from "../contract/contract.entity";
import {OperatingBaselinePackage} from "./operating-baseline-package.entity";
import {OperatingSignalToCommissionGateBinding} from "./operating-signal-gate-binding.entity";
import {OperatingSignalReviewRecord} from "./operating-signal-review-record.entity";
import {OrgUnit} from "../platform/org-unit.entity";
import {PlatformUser} from "../platform/platform-user.entity";
import {Project} from "../project/project.entity";
import {ProjectActualCostRecord} from "./project-actual-cost-record.entity";
import {ProjectArchiveRecord} from "../project/project-archive-record.entity";
import {ProjectCompletionRecord} from "../project/project-completion-record.entity";
import {ProjectHandoverBasisSnapshot} from "../project-handover/project-handover-basis-snapshot.entity";
import {ProjectOperatingSnapshot} from "./project-operating-snapshot.entity";
import {ProjectOwnerReassignmentRecord} from "../project/project-owner-reassignment-record.entity";
import {ProjectTechnicalCostPackage} from "../project/project-technical-cost-package.entity";
import {ReceiptRecord} from "../contract-finance/receipt-record.entity";
import {SharedCostAllocationResult} from "./shared-cost-allocation-result.entity";
const p = defineEntity.properties;

export class ReceiptAccountingBasis {
  declare id: string;
  declare receiptId: string;
  declare projectId: string;
  declare contractId: string;
  declare receiptRowVersion: number;
  declare termSnapshotId: string;
  declare termSnapshotVersion: number;
  declare termSnapshotRowVersion: number;
  declare termPayloadHash: string;
  declare currency: string;
  declare currencySourceKind: string;
  declare currencySourceId: string;
  declare currencySourceVersion: number;
  declare currencySourceHash: string;
  declare cashGross: string;
  declare amountExcludingTax: string;
  declare taxAmount: string;
  declare taxRate: string;
  declare captureMode: string;
  declare selectionPolicy: string;
  declare roundingPolicy: string;
  declare reason: string;
  declare evidenceRefs: unknown;
  declare frozenPayload: unknown;
  declare payloadHash: string;
  declare producerVersion: number;
  declare rowVersion: number;
  declare capturedAt: Date;
  declare capturedBy: string;
}
export class OperatingBaselineSource {
  declare id: string;
  declare projectId: string;
  declare originalCostPackageId: string;
  declare originalCostPackageVersion: number;
  declare currentCostPackageId: string;
  declare currentCostPackageVersion: number;
  declare handoverBasisId: string | null;
  declare handoverRebaselineId: string | null;
  declare currency: string;
  declare approvedTransitions: unknown;
  declare frozenPayload: unknown;
  declare sourceHash: string;
  declare payloadHash: string;
  declare producerVersion: number;
  declare rowVersion: number;
  declare capturedAt: Date;
  declare capturedBy: string;
}
export class ProjectCostInclusionDecision {
  declare id: string;
  declare projectId: string;
  declare unitKey: string;
  declare sourceChainKey: string | null;
  declare costRecordId: string | null;
  declare allocationResultId: string | null;
  declare sourceRowVersion: number;
  declare decision: string;
  declare recognitionRole: string;
  declare primaryCostId: string | null;
  declare reasonCode: string;
  declare reasonText: string;
  declare supportingSourceRefs: unknown;
  declare evidenceRefs: unknown;
  declare frozenPayload: unknown;
  declare payloadHash: string;
  declare supersedesId: string | null;
  declare producerVersion: number;
  declare rowVersion: number;
  declare decidedAt: Date;
  declare decidedBy: string;
}
export class ProjectCostInclusionHead {
  declare projectId: string;
  declare unitKey: string;
  declare decisionId: string;
  declare rowVersion: number;
}
export class OperatingSourceContext {
  declare id: string;
  declare projectId: string;
  declare snapshotId: string;
  declare schemaVersion: number;
  declare producerVersion: number;
  declare policyVersion: string;
  declare policyHash: string;
  declare currency: string;
  declare businessCutoff: string;
  declare knowledgeCutoff: Date;
  declare businessTimezone: string;
  declare scopeHash: string;
  declare sourceHash: string;
  declare payloadHash: string;
  declare frozenPayload: unknown;
  declare formalEligibility: string;
  declare containsLabor: string;
  declare capturedAt: Date;
  declare capturedBy: string;
  declare rowVersion: number;
}
export class OperatingSnapshotCostMember {
  declare snapshotId: string;
  declare projectId: string;
  declare unitKey: string;
  declare decisionId: string;
  declare capturedSourceVersion: number;
  declare capturedPayloadHash: string;
  declare netKnowledge: string;
  declare amountExcludingTax: string | null;
  declare taxCostAmount: string | null;
  declare amountIncludingTax: string | null;
  declare frozenPayload: unknown;
}
export class OperatingSourceMember {
  declare contextId: string;
  declare memberKey: string;
  declare sourceKind: string;
  declare sourceId: string;
  declare sourceRowVersion: number;
  declare sourcePayloadHash: string;
  declare capturedPayload: unknown;
}
export class ProjectOperatingHead {
  declare projectId: string;
  declare baselinePackageId: string | null;
  declare currentSnapshotId: string | null;
  declare rowVersion: number;
  declare updatedAt: Date;
  declare updatedBy: string;
}
export class ProjectStageRecord {
  declare id: string;
  declare projectId: string;
  declare sequenceNo: number;
  declare eventType: string;
  declare fromStage: string;
  declare toStage: string;
  declare previousStageRecordId: string | null;
  declare sourceHandoverId: string;
  declare sourceRoleAssignmentId: string | null;
  declare sourceCompletionRecordId: string | null;
  declare summarySnapshotId: string;
  declare projectRowVersionBefore: number;
  declare projectRowVersionAfter: number;
  declare enteredAt: Date;
  declare enteredBy: string;
  declare reason: string;
  declare sourcePayload: unknown;
  declare sourcePayloadHash: string;
  declare producerVersion: number;
  declare createdAt: Date;
}
export class CommissionRoleAssignmentParticipant {
  declare id: string;
  declare assignmentId: string;
  declare userId: string;
  declare roleType: string;
  declare responsibilitySummary: string;
  declare weightUnits: number;
  declare zeroWeightReason: string | null;
  declare displayNameAtAssignment: string;
  declare sortOrder: number;
}
export class CommissionRoleAssignmentFreezePayload {
  declare assignmentId: string;
  declare projectId: string;
  declare handoverId: string;
  declare handoverBasisSnapshotId: string;
  declare receiptJudgmentFreezeId: string;
  declare contractSummarySnapshotId: string;
  declare handoverSummarySnapshotId: string;
  declare freezeSummarySnapshotId: string;
  declare weightsPolicyVersion: string;
  declare sourcePayload: unknown;
  declare sourcePayloadHash: string;
  declare frozenAt: Date;
  declare frozenBy: string;
}
export class ProjectCompletionCondition {
  declare id: string;
  declare projectId: string;
  declare completionRecordId: string;
  declare sortOrder: number;
  declare summary: string;
  declare responsibleUserId: string;
  declare dueAt: Date;
  declare status: string;
  declare closureRecordId: string | null;
  declare closedAt: Date | null;
  declare closedBy: string | null;
  declare rowVersion: number;
  declare createdAt: Date;
  declare createdBy: string;
}
export class ProjectCompletionConditionClosure {
  declare id: string;
  declare conditionId: string;
  declare projectId: string;
  declare completionRecordId: string;
  declare closedBy: string;
  declare closedAt: Date;
  declare closureSummary: string;
  declare sourcePayload: unknown;
  declare sourcePayloadHash: string;
}
export class ProjectLifecycleEvidenceRef {
  declare id: string;
  declare projectId: string;
  declare stageRecordId: string | null;
  declare acceptanceRecordId: string | null;
  declare completionRecordId: string | null;
  declare completionConditionId: string | null;
  declare conditionClosureId: string | null;
  declare archiveRecordId: string | null;
  declare attachmentLinkId: string;
  declare attachmentId: string;
  declare attachmentRowVersion: number;
  declare checksumSha256: string;
  declare fileName: string;
  declare sourcePayload: unknown;
  declare sourcePayloadHash: string;
  declare frozenAt: Date;
  declare frozenBy: string;
}
export class OperatingEvaluationEvidence {
  declare id: string;
  declare projectId: string;
  declare snapshotId: string;
  declare sourceContextId: string;
  declare producerVersion: number;
  declare policyVersion: string;
  declare policyHash: string;
  declare sourceHash: string;
  declare evaluationHash: string;
  declare frozenOutput: unknown;
  declare outputPayloadHash: string;
  declare containsLabor: string;
  declare evaluatedAt: Date;
  declare evaluatedBy: string;
  declare rowVersion: number;
}
export class OperatingEvaluationReason {
  declare evidenceId: string;
  declare reasonIndex: number;
  declare ruleId: string;
  declare reasonCode: string;
  declare projectAction: string;
  declare stageActions: unknown;
  declare projectPrimary: boolean;
  declare stagePrimaries: unknown;
  declare sourceRefs: unknown;
  declare frozenPayload: unknown;
  declare payloadHash: string;
}
export class OperatingGateSummaryPayload {
  declare summarySnapshotId: string;
  declare bindingId: string;
  declare bindingRowVersion: number;
  declare projectId: string;
  declare gateStageType: string;
  declare snapshotId: string;
  declare evidenceId: string;
  declare sourceHash: string;
  declare evaluationHash: string;
  declare policyVersion: string;
  declare policyHash: string;
  declare sourceSummarySnapshotId: string | null;
  declare signalReviewId: string | null;
  declare gateReviewId: string | null;
  declare frozenPayload: unknown;
  declare payloadHash: string;
  declare createdAt: Date;
  declare createdBy: string;
}
export class OperatingCommandReceipt {
  declare id: string;
  declare operationId: string;
  declare targetScope: string;
  declare actorId: string;
  declare requestKey: string;
  declare requestHash: string;
  declare authorizedResponse: unknown;
  declare httpStatus: number;
  declare sourceHash: string;
  declare evaluationHash: string | null;
  declare committedAt: Date;
}
export class ProjectOwnershipOrigin {
  declare projectId: string;
  declare producerVersion: number;
  declare creatorUserId: string;
  declare sourceType: string;
  declare sourceRecordId: string;
  declare initialKind: string;
  declare initialOwnerUserId: string | null;
  declare initialOwnerOrgId: string | null;
  declare sourcePayload: unknown;
  declare sourcePayloadHash: string;
  declare bootstrapState: string;
  declare firstPersonalOwnerUserId: string | null;
  declare firstPersonalAssignedAt: Date | null;
  declare bootstrapConsumedAt: Date | null;
  declare bootstrapAssignmentRecordId: string | null;
  declare rowVersion: number;
  declare createdAt: Date;
}

export const ReceiptAccountingBasisSchema = defineEntity({
  class: ReceiptAccountingBasis, tableName: "receipt_accounting_basis", schema: "poms",
  checks: [{"name":"receipt_accounting_basis_receipt_row_version_check","expression":"receipt_row_version>0"},{"name":"receipt_accounting_basis_term_snapshot_version_check","expression":"term_snapshot_version>0"},{"name":"receipt_accounting_basis_term_snapshot_row_version_check","expression":"term_snapshot_row_version>0"},{"name":"receipt_accounting_basis_term_payload_hash_check","expression":"term_payload_hash~'^[0-9a-f]{64}$'"},{"name":"receipt_accounting_basis_currency_check","expression":"currency~'^[A-Z]{3}$'"},{"name":"receipt_accounting_basis_currency_source_version_check","expression":"currency_source_version>0"},{"name":"receipt_accounting_basis_currency_source_hash_check","expression":"currency_source_hash~'^[0-9a-f]{64}$'"},{"name":"receipt_accounting_basis_cash_gross_check","expression":"cash_gross>0"},{"name":"receipt_accounting_basis_amount_excluding_tax_check","expression":"amount_excluding_tax>=0"},{"name":"receipt_accounting_basis_tax_amount_check","expression":"tax_amount>=0"},{"name":"receipt_accounting_basis_tax_rate_check","expression":"tax_rate>=0 AND tax_rate<=1"},{"name":"receipt_accounting_basis_capture_mode_check","expression":"capture_mode IN ('confirm','certify-existing-basis')"},{"name":"receipt_accounting_basis_selection_policy_check","expression":"selection_policy IN ('receipt-date-effective-terms','explicit-activated-terms-evidence')"},{"name":"receipt_accounting_basis_rounding_policy_check","expression":"rounding_policy='gross-net-HALF_UP-cents-v1'"},{"name":"receipt_accounting_basis_reason_check","expression":"length(btrim(reason))>0"},{"name":"receipt_accounting_basis_evidence_refs_check","expression":"jsonb_typeof(evidence_refs)='array'"},{"name":"receipt_accounting_basis_frozen_payload_check","expression":"jsonb_typeof(frozen_payload)='object'"},{"name":"receipt_accounting_basis_payload_hash_check","expression":"payload_hash~'^[0-9a-f]{64}$'"},{"name":"receipt_accounting_basis_producer_version_check","expression":"producer_version=1"},{"name":"receipt_accounting_basis_row_version_check","expression":"row_version=1"},{"name":"chk_r4g_receipt_split","expression":"cash_gross=amount_excluding_tax+tax_amount"}],
  uniques: [{"name":"receipt_accounting_basis_receipt_id_key","properties":["receiptId"]},{"name":"uq_r4g_receipt_basis_project","properties":["id","projectId"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    receiptId: p.uuid().fieldName("receipt_id"),
    projectId: p.uuid().fieldName("project_id"),
    contractId: p.uuid().fieldName("contract_id"),
    receiptRowVersion: p.integer().fieldName("receipt_row_version"),
    termSnapshotId: p.uuid().fieldName("term_snapshot_id"),
    termSnapshotVersion: p.integer().fieldName("term_snapshot_version"),
    termSnapshotRowVersion: p.integer().fieldName("term_snapshot_row_version"),
    termPayloadHash: p.string().length(64).fieldName("term_payload_hash"),
    currency: p.string().length(3).fieldName("currency"),
    currencySourceKind: p.string().length(64).fieldName("currency_source_kind"),
    currencySourceId: p.uuid().fieldName("currency_source_id"),
    currencySourceVersion: p.integer().fieldName("currency_source_version"),
    currencySourceHash: p.string().length(64).fieldName("currency_source_hash"),
    cashGross: p.decimal().precision(18).scale(2).fieldName("cash_gross"),
    amountExcludingTax: p.decimal().precision(18).scale(2).fieldName("amount_excluding_tax"),
    taxAmount: p.decimal().precision(18).scale(2).fieldName("tax_amount"),
    taxRate: p.decimal().precision(5).scale(4).fieldName("tax_rate"),
    captureMode: p.string().length(32).fieldName("capture_mode"),
    selectionPolicy: p.string().length(64).fieldName("selection_policy"),
    roundingPolicy: p.string().length(64).fieldName("rounding_policy"),
    reason: p.text().fieldName("reason"),
    evidenceRefs: p.json<unknown>().columnType('jsonb').fieldName("evidence_refs"),
    frozenPayload: p.json<unknown>().columnType('jsonb').fieldName("frozen_payload"),
    payloadHash: p.string().length(64).fieldName("payload_hash"),
    producerVersion: p.smallint().fieldName("producer_version"),
    rowVersion: p.integer().default(1).fieldName("row_version"),
    capturedAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("captured_at"),
    capturedBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("captured_by").referencedColumnNames("id").foreignKeyName("receipt_accounting_basis_captured_by_fkey").deleteRule("restrict").updateRule("no action"),
    scopeConstraint1: () => p.manyToOne(ReceiptRecord).mapToPk().joinColumns("receipt_id","project_id","contract_id").referencedColumnNames("id","project_id","contract_id").columnTypes("uuid","uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_receipt_basis_receipt").deleteRule("restrict").updateRule("no action"),
    scopeConstraint2: () => p.manyToOne(ContractTermSnapshot).mapToPk().joinColumns("term_snapshot_id","contract_id").referencedColumnNames("id","contract_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_receipt_basis_terms").deleteRule("restrict").updateRule("no action"),
  }
});
ReceiptAccountingBasisSchema.setClass(ReceiptAccountingBasis);

export const OperatingBaselineSourceSchema = defineEntity({
  class: OperatingBaselineSource, tableName: "operating_baseline_source", schema: "poms",
  checks: [{"name":"operating_baseline_source_original_cost_package_version_check","expression":"original_cost_package_version>0"},{"name":"operating_baseline_source_current_cost_package_version_check","expression":"current_cost_package_version>0"},{"name":"operating_baseline_source_currency_check","expression":"currency~'^[A-Z]{3}$'"},{"name":"operating_baseline_source_approved_transitions_check","expression":"jsonb_typeof(approved_transitions)='array'"},{"name":"operating_baseline_source_frozen_payload_check","expression":"jsonb_typeof(frozen_payload)='object'"},{"name":"operating_baseline_source_source_hash_check","expression":"source_hash~'^[0-9a-f]{64}$'"},{"name":"operating_baseline_source_payload_hash_check","expression":"payload_hash~'^[0-9a-f]{64}$'"},{"name":"operating_baseline_source_producer_version_check","expression":"producer_version=1"},{"name":"operating_baseline_source_row_version_check","expression":"row_version=1"}],
  uniques: [{"name":"uq_r4g_baseline_source_project","properties":["id","projectId"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("operating_baseline_source_project_id_fkey").deleteRule("restrict").updateRule("no action"),
    originalCostPackageId: () => p.manyToOne(ProjectTechnicalCostPackage).mapToPk().joinColumns("original_cost_package_id").referencedColumnNames("id").foreignKeyName("operating_baseline_source_original_cost_package_id_fkey").deleteRule("restrict").updateRule("no action"),
    originalCostPackageVersion: p.integer().fieldName("original_cost_package_version"),
    currentCostPackageId: () => p.manyToOne(ProjectTechnicalCostPackage).mapToPk().joinColumns("current_cost_package_id").referencedColumnNames("id").foreignKeyName("operating_baseline_source_current_cost_package_id_fkey").deleteRule("restrict").updateRule("no action"),
    currentCostPackageVersion: p.integer().fieldName("current_cost_package_version"),
    handoverBasisId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().joinColumns("handover_basis_id").referencedColumnNames("id").foreignKeyName("operating_baseline_source_handover_basis_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    handoverRebaselineId: () => p.manyToOne(ContractHandoverRebaselineRecord).mapToPk().joinColumns("handover_rebaseline_id").referencedColumnNames("id").foreignKeyName("operating_baseline_source_handover_rebaseline_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    currency: p.string().length(3).fieldName("currency"),
    approvedTransitions: p.json<unknown>().columnType('jsonb').fieldName("approved_transitions"),
    frozenPayload: p.json<unknown>().columnType('jsonb').fieldName("frozen_payload"),
    sourceHash: p.string().length(64).fieldName("source_hash"),
    payloadHash: p.string().length(64).fieldName("payload_hash"),
    producerVersion: p.smallint().fieldName("producer_version"),
    rowVersion: p.integer().default(1).fieldName("row_version"),
    capturedAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("captured_at"),
    capturedBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("captured_by").referencedColumnNames("id").foreignKeyName("operating_baseline_source_captured_by_fkey").deleteRule("restrict").updateRule("no action"),
  }
});
OperatingBaselineSourceSchema.setClass(OperatingBaselineSource);

export const ProjectCostInclusionDecisionSchema = defineEntity({
  class: ProjectCostInclusionDecision, tableName: "project_cost_inclusion_decision", schema: "poms",
  checks: [{"name":"project_cost_inclusion_decision_source_row_version_check","expression":"source_row_version>0"},{"name":"project_cost_inclusion_decision_decision_check","expression":"decision IN ('include','exclude')"},{"name":"project_cost_inclusion_decision_recognition_role_check","expression":"recognition_role IN ('direct-source','allocation-share','tax-support','evidence-only')"},{"name":"project_cost_inclusion_decision_reason_text_check","expression":"length(btrim(reason_text))>0"},{"name":"project_cost_inclusion_decision_supporting_source_refs_check","expression":"jsonb_typeof(supporting_source_refs)='array'"},{"name":"project_cost_inclusion_decision_evidence_refs_check","expression":"jsonb_typeof(evidence_refs)='array'"},{"name":"project_cost_inclusion_decision_frozen_payload_check","expression":"jsonb_typeof(frozen_payload)='object'"},{"name":"project_cost_inclusion_decision_payload_hash_check","expression":"payload_hash~'^[0-9a-f]{64}$'"},{"name":"project_cost_inclusion_decision_producer_version_check","expression":"producer_version=1"},{"name":"project_cost_inclusion_decision_row_version_check","expression":"row_version=1"},{"name":"chk_r4g_inclusion_target","expression":"(cost_record_id IS NULL)<>(allocation_result_id IS NULL)"},{"name":"chk_r4g_support_not_primary","expression":"recognition_role NOT IN ('tax-support','evidence-only') OR decision='exclude'"}],
  uniques: [{"name":"uq_r4g_inclusion_project_unit","properties":["id","projectId","unitKey"]},{"name":"uq_r4g_decision_successor","expression":"CREATE UNIQUE INDEX uq_r4g_decision_successor ON poms.project_cost_inclusion_decision(supersedes_id) WHERE supersedes_id IS NOT NULL"}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("project_cost_inclusion_decision_project_id_fkey").deleteRule("restrict").updateRule("no action"),
    unitKey: p.string().length(192).fieldName("unit_key"),
    sourceChainKey: p.string().length(192).nullable().fieldName("source_chain_key"),
    costRecordId: () => p.manyToOne(ProjectActualCostRecord).mapToPk().joinColumns("cost_record_id").referencedColumnNames("id").foreignKeyName("project_cost_inclusion_decision_cost_record_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    allocationResultId: () => p.manyToOne(SharedCostAllocationResult).mapToPk().joinColumns("allocation_result_id").referencedColumnNames("id").foreignKeyName("project_cost_inclusion_decision_allocation_result_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    sourceRowVersion: p.integer().fieldName("source_row_version"),
    decision: p.string().length(16).fieldName("decision"),
    recognitionRole: p.string().length(32).fieldName("recognition_role"),
    primaryCostId: () => p.manyToOne(ProjectActualCostRecord).mapToPk().joinColumns("primary_cost_id").referencedColumnNames("id").foreignKeyName("project_cost_inclusion_decision_primary_cost_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    reasonCode: p.string().length(64).fieldName("reason_code"),
    reasonText: p.text().fieldName("reason_text"),
    supportingSourceRefs: p.json<unknown>().columnType('jsonb').fieldName("supporting_source_refs"),
    evidenceRefs: p.json<unknown>().columnType('jsonb').fieldName("evidence_refs"),
    frozenPayload: p.json<unknown>().columnType('jsonb').fieldName("frozen_payload"),
    payloadHash: p.string().length(64).fieldName("payload_hash"),
    supersedesId: () => p.manyToOne(ProjectCostInclusionDecision).mapToPk().joinColumns("supersedes_id").referencedColumnNames("id").foreignKeyName("project_cost_inclusion_decision_supersedes_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    producerVersion: p.smallint().fieldName("producer_version"),
    rowVersion: p.integer().default(1).fieldName("row_version"),
    decidedAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("decided_at"),
    decidedBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("decided_by").referencedColumnNames("id").foreignKeyName("project_cost_inclusion_decision_decided_by_fkey").deleteRule("restrict").updateRule("no action"),
  }
});
ProjectCostInclusionDecisionSchema.setClass(ProjectCostInclusionDecision);

export const ProjectCostInclusionHeadSchema = defineEntity({
  class: ProjectCostInclusionHead, tableName: "project_cost_inclusion_head", schema: "poms",
  checks: [{"name":"project_cost_inclusion_head_row_version_check","expression":"row_version>0"}],
  properties: {
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("project_cost_inclusion_head_project_id_fkey").deleteRule("restrict").updateRule("no action").primary(),
    unitKey: p.string().length(192).primary().fieldName("unit_key"),
    decisionId: p.uuid().fieldName("decision_id"),
    rowVersion: p.integer().fieldName("row_version"),
    scopeConstraint1: () => p.manyToOne(ProjectCostInclusionDecision).mapToPk().joinColumns("decision_id","project_id","unit_key").referencedColumnNames("id","project_id","unit_key").columnTypes("uuid","uuid","varchar(192)").ownColumns().hydrate(false).hidden().foreignKeyName("project_cost_inclusion_head_decision_id_project_id_unit_ke_fkey").deleteRule("restrict").updateRule("no action"),
  }
});
ProjectCostInclusionHeadSchema.setClass(ProjectCostInclusionHead);

export const OperatingSourceContextSchema = defineEntity({
  class: OperatingSourceContext, tableName: "operating_source_context", schema: "poms",
  checks: [{"name":"operating_source_context_schema_version_check","expression":"schema_version=1"},{"name":"operating_source_context_producer_version_check","expression":"producer_version=1"},{"name":"operating_source_context_policy_hash_check","expression":"policy_hash~'^[0-9a-f]{64}$'"},{"name":"operating_source_context_currency_check","expression":"currency~'^[A-Z]{3}$'"},{"name":"operating_source_context_business_timezone_check","expression":"business_timezone='Asia/Hong_Kong'"},{"name":"operating_source_context_scope_hash_check","expression":"scope_hash~'^[0-9a-f]{64}$'"},{"name":"operating_source_context_source_hash_check","expression":"source_hash~'^[0-9a-f]{64}$'"},{"name":"operating_source_context_payload_hash_check","expression":"payload_hash~'^[0-9a-f]{64}$'"},{"name":"operating_source_context_frozen_payload_check","expression":"jsonb_typeof(frozen_payload)='object'"},{"name":"operating_source_context_formal_eligibility_check","expression":"formal_eligibility='eligible'"},{"name":"operating_source_context_contains_labor_check","expression":"contains_labor IN ('yes','no','unknown')"},{"name":"operating_source_context_row_version_check","expression":"row_version=1"}],
  uniques: [{"name":"uq_r4g_context_snapshot","properties":["snapshotId"]},{"name":"uq_r4g_context_scope","properties":["id","projectId","snapshotId"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("operating_source_context_project_id_fkey").deleteRule("restrict").updateRule("no action"),
    snapshotId: p.uuid().fieldName("snapshot_id"),
    schemaVersion: p.smallint().fieldName("schema_version"),
    producerVersion: p.smallint().fieldName("producer_version"),
    policyVersion: p.string().length(64).fieldName("policy_version"),
    policyHash: p.string().length(64).fieldName("policy_hash"),
    currency: p.string().length(3).fieldName("currency"),
    businessCutoff: p.date().fieldName("business_cutoff"),
    knowledgeCutoff: p.datetime().columnType('timestamptz').fieldName("knowledge_cutoff"),
    businessTimezone: p.string().length(64).fieldName("business_timezone"),
    scopeHash: p.string().length(64).fieldName("scope_hash"),
    sourceHash: p.string().length(64).fieldName("source_hash"),
    payloadHash: p.string().length(64).fieldName("payload_hash"),
    frozenPayload: p.json<unknown>().columnType('jsonb').fieldName("frozen_payload"),
    formalEligibility: p.string().length(32).fieldName("formal_eligibility"),
    containsLabor: p.string().length(16).fieldName("contains_labor"),
    capturedAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("captured_at"),
    capturedBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("captured_by").referencedColumnNames("id").foreignKeyName("operating_source_context_captured_by_fkey").deleteRule("restrict").updateRule("no action"),
    rowVersion: p.integer().default(1).fieldName("row_version"),
    scopeConstraint1: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().joinColumns("snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_context_snapshot").deleteRule("no action").updateRule("no action").deferMode('deferred'),
  }
});
OperatingSourceContextSchema.setClass(OperatingSourceContext);

export const OperatingSnapshotCostMemberSchema = defineEntity({
  class: OperatingSnapshotCostMember, tableName: "operating_snapshot_cost_member", schema: "poms",
  checks: [{"name":"operating_snapshot_cost_member_captured_source_version_check","expression":"captured_source_version>0"},{"name":"operating_snapshot_cost_member_captured_payload_hash_check","expression":"captured_payload_hash~'^[0-9a-f]{64}$'"},{"name":"operating_snapshot_cost_member_net_knowledge_check","expression":"net_knowledge IN ('known','unknown')"},{"name":"operating_snapshot_cost_member_frozen_payload_check","expression":"jsonb_typeof(frozen_payload)='object'"},{"name":"operating_snapshot_cost_member_check","expression":"(net_knowledge='known')=(amount_excluding_tax IS NOT NULL)"}],
  properties: {
    snapshotId: p.uuid().primary().fieldName("snapshot_id"),
    projectId: p.uuid().fieldName("project_id"),
    unitKey: p.string().length(192).primary().fieldName("unit_key"),
    decisionId: p.uuid().fieldName("decision_id"),
    capturedSourceVersion: p.integer().fieldName("captured_source_version"),
    capturedPayloadHash: p.string().length(64).fieldName("captured_payload_hash"),
    netKnowledge: p.string().length(16).fieldName("net_knowledge"),
    amountExcludingTax: p.decimal().precision(18).scale(2).nullable().fieldName("amount_excluding_tax"),
    taxCostAmount: p.decimal().precision(18).scale(2).nullable().fieldName("tax_cost_amount"),
    amountIncludingTax: p.decimal().precision(18).scale(2).nullable().fieldName("amount_including_tax"),
    frozenPayload: p.json<unknown>().columnType('jsonb').fieldName("frozen_payload"),
    scopeConstraint1: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().joinColumns("snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("operating_snapshot_cost_member_snapshot_id_project_id_fkey").deleteRule("no action").updateRule("no action").deferMode('deferred'),
    scopeConstraint2: () => p.manyToOne(ProjectCostInclusionDecision).mapToPk().joinColumns("decision_id","project_id","unit_key").referencedColumnNames("id","project_id","unit_key").columnTypes("uuid","uuid","varchar(192)").ownColumns().hydrate(false).hidden().foreignKeyName("operating_snapshot_cost_membe_decision_id_project_id_unit__fkey").deleteRule("no action").updateRule("no action"),
  }
});
OperatingSnapshotCostMemberSchema.setClass(OperatingSnapshotCostMember);

export const OperatingSourceMemberSchema = defineEntity({
  class: OperatingSourceMember, tableName: "operating_source_member", schema: "poms",
  checks: [{"name":"operating_source_member_source_row_version_check","expression":"source_row_version>0"},{"name":"operating_source_member_source_payload_hash_check","expression":"source_payload_hash~'^[0-9a-f]{64}$'"},{"name":"operating_source_member_captured_payload_check","expression":"jsonb_typeof(captured_payload)='object'"}],
  properties: {
    contextId: () => p.manyToOne(OperatingSourceContext).mapToPk().joinColumns("context_id").referencedColumnNames("id").foreignKeyName("operating_source_member_context_id_fkey").deleteRule("restrict").updateRule("no action").primary(),
    memberKey: p.string().length(256).primary().fieldName("member_key"),
    sourceKind: p.string().length(64).fieldName("source_kind"),
    sourceId: p.uuid().fieldName("source_id"),
    sourceRowVersion: p.integer().fieldName("source_row_version"),
    sourcePayloadHash: p.string().length(64).fieldName("source_payload_hash"),
    capturedPayload: p.json<unknown>().columnType('jsonb').fieldName("captured_payload"),
  }
});
OperatingSourceMemberSchema.setClass(OperatingSourceMember);

export const ProjectOperatingHeadSchema = defineEntity({
  class: ProjectOperatingHead, tableName: "project_operating_head", schema: "poms",
  checks: [{"name":"project_operating_head_row_version_check","expression":"row_version>=0"}],
  properties: {
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("project_operating_head_project_id_fkey").deleteRule("restrict").updateRule("no action").primary(),
    baselinePackageId: p.uuid().nullable().fieldName("baseline_package_id"),
    currentSnapshotId: p.uuid().nullable().fieldName("current_snapshot_id"),
    rowVersion: p.integer().default(0).fieldName("row_version"),
    updatedAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("updated_at"),
    updatedBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("updated_by").referencedColumnNames("id").foreignKeyName("project_operating_head_updated_by_fkey").deleteRule("no action").updateRule("no action"),
    scopeConstraint1: () => p.manyToOne(OperatingBaselinePackage).mapToPk().joinColumns("baseline_package_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("project_operating_head_baseline_package_id_project_id_fkey").deleteRule("no action").updateRule("no action").nullable(),
    scopeConstraint2: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().joinColumns("current_snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("project_operating_head_current_snapshot_id_project_id_fkey").deleteRule("no action").updateRule("no action").nullable(),
  }
});
ProjectOperatingHeadSchema.setClass(ProjectOperatingHead);

export const ProjectStageRecordSchema = defineEntity({
  class: ProjectStageRecord, tableName: "project_stage_record", schema: "poms",
  checks: [{"name":"project_stage_record_sequence_no_check","expression":"sequence_no > 0"},{"name":"project_stage_record_event_type_check","expression":"event_type IN ('stage-entered','stage-requalified')"},{"name":"project_stage_record_to_stage_check","expression":"to_stage IN ('handover','execution','acceptance','completed','conditional-completed')"},{"name":"project_stage_record_project_row_version_before_check","expression":"project_row_version_before > 0"},{"name":"project_stage_record_reason_check","expression":"length(btrim(reason)) BETWEEN 1 AND 2000"},{"name":"project_stage_record_source_payload_hash_check","expression":"source_payload_hash ~ '^[0-9a-f]{64}$'"},{"name":"project_stage_record_producer_version_check","expression":"producer_version = 1"},{"name":"project_stage_record_check","expression":"previous_stage_record_id IS DISTINCT FROM id"},{"name":"project_stage_record_check1","expression":"project_row_version_after = project_row_version_before + 1"},{"name":"project_stage_record_check2","expression":"(to_stage='handover' AND from_stage IN ('assessment','scope-confirmation','commercial-closure','contracting','handover'))\n        OR (to_stage='execution' AND from_stage='handover' AND previous_stage_record_id IS NOT NULL AND source_role_assignment_id IS NOT NULL)\n        OR (to_stage='acceptance' AND from_stage='execution' AND previous_stage_record_id IS NOT NULL AND source_role_assignment_id IS NOT NULL)\n        OR (to_stage IN ('completed','conditional-completed') AND from_stage='acceptance' AND previous_stage_record_id IS NOT NULL AND source_role_assignment_id IS NOT NULL AND source_completion_record_id IS NOT NULL)"},{"name":"project_stage_record_check3","expression":"(event_type='stage-requalified') = (from_stage='handover' AND to_stage='handover')"},{"name":"ck_jghi_stage_payload_object","expression":"jsonb_typeof(source_payload)='object'"}],
  uniques: [{"name":"project_stage_record_project_id_sequence_no_key","properties":["projectId","sequenceNo"]},{"name":"project_stage_record_id_project_id_key","properties":["id","projectId"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("project_stage_record_project_id_fkey").deleteRule("restrict").updateRule("no action"),
    sequenceNo: p.integer().fieldName("sequence_no"),
    eventType: p.text().fieldName("event_type"),
    fromStage: p.text().fieldName("from_stage"),
    toStage: p.text().fieldName("to_stage"),
    previousStageRecordId: () => p.manyToOne(ProjectStageRecord).mapToPk().joinColumns("previous_stage_record_id").referencedColumnNames("id").foreignKeyName("project_stage_record_previous_stage_record_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    sourceHandoverId: () => p.manyToOne(ProjectHandover).mapToPk().joinColumns("source_handover_id").referencedColumnNames("id").foreignKeyName("project_stage_record_source_handover_id_fkey").deleteRule("restrict").updateRule("no action"),
    sourceRoleAssignmentId: () => p.manyToOne(CommissionRoleAssignment).mapToPk().joinColumns("source_role_assignment_id").referencedColumnNames("id").foreignKeyName("project_stage_record_source_role_assignment_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    sourceCompletionRecordId: () => p.manyToOne(ProjectCompletionRecord).mapToPk().joinColumns("source_completion_record_id").referencedColumnNames("id").foreignKeyName("project_stage_record_source_completion_record_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    summarySnapshotId: () => p.manyToOne(ApprovalSummarySnapshot).mapToPk().joinColumns("summary_snapshot_id").referencedColumnNames("id").foreignKeyName("project_stage_record_summary_snapshot_id_fkey").deleteRule("restrict").updateRule("no action"),
    projectRowVersionBefore: p.integer().fieldName("project_row_version_before"),
    projectRowVersionAfter: p.integer().fieldName("project_row_version_after"),
    enteredAt: p.datetime().columnType('timestamptz').fieldName("entered_at"),
    enteredBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("entered_by").referencedColumnNames("id").foreignKeyName("project_stage_record_entered_by_fkey").deleteRule("restrict").updateRule("no action"),
    reason: p.text().fieldName("reason"),
    sourcePayload: p.json<unknown>().columnType('jsonb').fieldName("source_payload"),
    sourcePayloadHash: p.string().length(64).fieldName("source_payload_hash"),
    producerVersion: p.integer().fieldName("producer_version"),
    createdAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("created_at"),
    scopeConstraint1: () => p.manyToOne(ProjectStageRecord).mapToPk().joinColumns("previous_stage_record_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_stage_previous_project").deleteRule("no action").updateRule("no action").nullable(),
    scopeConstraint2: () => p.manyToOne(ProjectHandover).mapToPk().joinColumns("source_handover_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_stage_handover_project").deleteRule("no action").updateRule("no action"),
    scopeConstraint3: () => p.manyToOne(CommissionRoleAssignment).mapToPk().joinColumns("source_role_assignment_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_stage_assignment_project").deleteRule("no action").updateRule("no action").nullable(),
    scopeConstraint4: () => p.manyToOne(ProjectCompletionRecord).mapToPk().joinColumns("source_completion_record_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_stage_completion_project").deleteRule("no action").updateRule("no action").nullable(),
  }
});
ProjectStageRecordSchema.setClass(ProjectStageRecord);

export const CommissionRoleAssignmentParticipantSchema = defineEntity({
  class: CommissionRoleAssignmentParticipant, tableName: "commission_role_assignment_participant", schema: "poms",
  checks: [{"name":"commission_role_assignment_participant_role_type_check","expression":"length(btrim(role_type)) > 0"},{"name":"commission_role_assignment_partici_responsibility_summary_check","expression":"length(btrim(responsibility_summary)) BETWEEN 1 AND 2000"},{"name":"commission_role_assignment_participant_weight_units_check","expression":"weight_units BETWEEN 0 AND 1000000"},{"name":"commission_role_assignment_participant_sort_order_check","expression":"sort_order >= 0"},{"name":"commission_role_assignment_participant_check","expression":"(weight_units=0 AND zero_weight_reason IS NOT NULL AND length(btrim(zero_weight_reason)) BETWEEN 1 AND 1000)\n        OR (weight_units>0 AND zero_weight_reason IS NULL)"}],
  uniques: [{"name":"commission_role_assignment_pa_assignment_id_user_id_role_ty_key","properties":["assignmentId","userId","roleType"]},{"name":"commission_role_assignment_partici_assignment_id_sort_order_key","properties":["assignmentId","sortOrder"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    assignmentId: () => p.manyToOne(CommissionRoleAssignment).mapToPk().joinColumns("assignment_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_participant_assignment_id_fkey").deleteRule("restrict").updateRule("no action"),
    userId: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("user_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_participant_user_id_fkey").deleteRule("restrict").updateRule("no action"),
    roleType: p.string().length(64).fieldName("role_type"),
    responsibilitySummary: p.text().fieldName("responsibility_summary"),
    weightUnits: p.integer().fieldName("weight_units"),
    zeroWeightReason: p.text().nullable().fieldName("zero_weight_reason"),
    displayNameAtAssignment: p.text().fieldName("display_name_at_assignment"),
    sortOrder: p.integer().fieldName("sort_order"),
  }
});
CommissionRoleAssignmentParticipantSchema.setClass(CommissionRoleAssignmentParticipant);

export const CommissionRoleAssignmentFreezePayloadSchema = defineEntity({
  class: CommissionRoleAssignmentFreezePayload, tableName: "commission_role_assignment_freeze_payload", schema: "poms",
  checks: [{"name":"commission_role_assignment_freeze__weights_policy_version_check","expression":"weights_policy_version='normalized-six-v1-zero-reason'"},{"name":"commission_role_assignment_freeze_pay_source_payload_hash_check","expression":"source_payload_hash ~ '^[0-9a-f]{64}$'"},{"name":"commission_role_assignment_freeze_payload_check","expression":"freeze_summary_snapshot_id <> handover_summary_snapshot_id"},{"name":"ck_jghi_freeze_payload_object","expression":"jsonb_typeof(source_payload)='object'"}],
  uniques: [{"name":"commission_role_assignment_freez_freeze_summary_snapshot_id_key","properties":["freezeSummarySnapshotId"]}],
  properties: {
    assignmentId: () => p.manyToOne(CommissionRoleAssignment).mapToPk().joinColumns("assignment_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_freeze_payload_assignment_id_fkey").deleteRule("restrict").updateRule("no action").primary(),
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_freeze_payload_project_id_fkey").deleteRule("restrict").updateRule("no action"),
    handoverId: () => p.manyToOne(ProjectHandover).mapToPk().joinColumns("handover_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_freeze_payload_handover_id_fkey").deleteRule("restrict").updateRule("no action"),
    handoverBasisSnapshotId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().joinColumns("handover_basis_snapshot_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_free_handover_basis_snapshot_id_fkey").deleteRule("restrict").updateRule("no action"),
    receiptJudgmentFreezeId: () => p.manyToOne(ProjectReceiptJudgmentFreeze).mapToPk().joinColumns("receipt_judgment_freeze_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_free_receipt_judgment_freeze_id_fkey").deleteRule("restrict").updateRule("no action"),
    contractSummarySnapshotId: () => p.manyToOne(ApprovalSummarySnapshot).mapToPk().joinColumns("contract_summary_snapshot_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_fr_contract_summary_snapshot_id_fkey").deleteRule("restrict").updateRule("no action"),
    handoverSummarySnapshotId: () => p.manyToOne(ApprovalSummarySnapshot).mapToPk().joinColumns("handover_summary_snapshot_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_fr_handover_summary_snapshot_id_fkey").deleteRule("restrict").updateRule("no action"),
    freezeSummarySnapshotId: () => p.manyToOne(ApprovalSummarySnapshot).mapToPk().joinColumns("freeze_summary_snapshot_id").referencedColumnNames("id").foreignKeyName("commission_role_assignment_free_freeze_summary_snapshot_id_fkey").deleteRule("restrict").updateRule("no action"),
    weightsPolicyVersion: p.text().fieldName("weights_policy_version"),
    sourcePayload: p.json<unknown>().columnType('jsonb').fieldName("source_payload"),
    sourcePayloadHash: p.string().length(64).fieldName("source_payload_hash"),
    frozenAt: p.datetime().columnType('timestamptz').fieldName("frozen_at"),
    frozenBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("frozen_by").referencedColumnNames("id").foreignKeyName("commission_role_assignment_freeze_payload_frozen_by_fkey").deleteRule("restrict").updateRule("no action"),
    scopeConstraint1: () => p.manyToOne(CommissionRoleAssignment).mapToPk().joinColumns("assignment_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_freeze_assignment_project").deleteRule("no action").updateRule("no action"),
    scopeConstraint2: () => p.manyToOne(ProjectHandover).mapToPk().joinColumns("handover_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_freeze_handover_project").deleteRule("no action").updateRule("no action"),
  }
});
CommissionRoleAssignmentFreezePayloadSchema.setClass(CommissionRoleAssignmentFreezePayload);

export const ProjectCompletionConditionSchema = defineEntity({
  class: ProjectCompletionCondition, tableName: "project_completion_condition", schema: "poms",
  checks: [{"name":"project_completion_condition_sort_order_check","expression":"sort_order >= 0"},{"name":"project_completion_condition_summary_check","expression":"length(btrim(summary)) BETWEEN 1 AND 2000"},{"name":"project_completion_condition_status_check","expression":"status IN ('pending','closed')"},{"name":"project_completion_condition_row_version_check","expression":"row_version > 0"},{"name":"project_completion_condition_check","expression":"(status='pending' AND closure_record_id IS NULL AND closed_at IS NULL AND closed_by IS NULL)\n      OR (status='closed' AND closure_record_id IS NOT NULL AND closed_at IS NOT NULL AND closed_by IS NOT NULL AND closed_by=responsible_user_id)"}],
  uniques: [{"name":"project_completion_condition_completion_record_id_sort_orde_key","properties":["completionRecordId","sortOrder"]},{"name":"uq_jghi_condition_scope","properties":["id","completionRecordId","projectId"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("project_completion_condition_project_id_fkey").deleteRule("restrict").updateRule("no action"),
    completionRecordId: () => p.manyToOne(ProjectCompletionRecord).mapToPk().joinColumns("completion_record_id").referencedColumnNames("id").foreignKeyName("project_completion_condition_completion_record_id_fkey").deleteRule("restrict").updateRule("no action"),
    sortOrder: p.integer().fieldName("sort_order"),
    summary: p.text().fieldName("summary"),
    responsibleUserId: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("responsible_user_id").referencedColumnNames("id").foreignKeyName("project_completion_condition_responsible_user_id_fkey").deleteRule("restrict").updateRule("no action"),
    dueAt: p.datetime().columnType('timestamptz').fieldName("due_at"),
    status: p.text().fieldName("status"),
    closureRecordId: () => p.manyToOne(ProjectCompletionConditionClosure).mapToPk().joinColumns("closure_record_id").referencedColumnNames("id").foreignKeyName("completion_condition_closure_fk").deleteRule("restrict").updateRule("no action").nullable(),
    closedAt: p.datetime().columnType('timestamptz').nullable().fieldName("closed_at"),
    closedBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("closed_by").referencedColumnNames("id").foreignKeyName("project_completion_condition_closed_by_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    rowVersion: p.integer().default(1).fieldName("row_version"),
    createdAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("created_at"),
    createdBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("created_by").referencedColumnNames("id").foreignKeyName("project_completion_condition_created_by_fkey").deleteRule("restrict").updateRule("no action"),
    scopeConstraint1: () => p.manyToOne(ProjectCompletionRecord).mapToPk().joinColumns("completion_record_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_condition_parent").deleteRule("no action").updateRule("no action"),
  }
});
ProjectCompletionConditionSchema.setClass(ProjectCompletionCondition);

export const ProjectCompletionConditionClosureSchema = defineEntity({
  class: ProjectCompletionConditionClosure, tableName: "project_completion_condition_closure", schema: "poms",
  checks: [{"name":"project_completion_condition_closure_closure_summary_check","expression":"length(btrim(closure_summary)) BETWEEN 1 AND 2000"},{"name":"project_completion_condition_closure_source_payload_hash_check","expression":"source_payload_hash ~ '^[0-9a-f]{64}$'"},{"name":"ck_jghi_closure_payload_object","expression":"jsonb_typeof(source_payload)='object'"}],
  uniques: [{"name":"project_completion_condition_closure_condition_id_key","properties":["conditionId"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    conditionId: () => p.manyToOne(ProjectCompletionCondition).mapToPk().joinColumns("condition_id").referencedColumnNames("id").foreignKeyName("project_completion_condition_closure_condition_id_fkey").deleteRule("restrict").updateRule("no action"),
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("project_completion_condition_closure_project_id_fkey").deleteRule("restrict").updateRule("no action"),
    completionRecordId: () => p.manyToOne(ProjectCompletionRecord).mapToPk().joinColumns("completion_record_id").referencedColumnNames("id").foreignKeyName("project_completion_condition_closure_completion_record_id_fkey").deleteRule("restrict").updateRule("no action"),
    closedBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("closed_by").referencedColumnNames("id").foreignKeyName("project_completion_condition_closure_closed_by_fkey").deleteRule("restrict").updateRule("no action"),
    closedAt: p.datetime().columnType('timestamptz').fieldName("closed_at"),
    closureSummary: p.text().fieldName("closure_summary"),
    sourcePayload: p.json<unknown>().columnType('jsonb').fieldName("source_payload"),
    sourcePayloadHash: p.string().length(64).fieldName("source_payload_hash"),
    scopeConstraint1: () => p.manyToOne(ProjectCompletionCondition).mapToPk().joinColumns("condition_id","completion_record_id","project_id").referencedColumnNames("id","completion_record_id","project_id").columnTypes("uuid","uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_closure_parent").deleteRule("no action").updateRule("no action"),
  }
});
ProjectCompletionConditionClosureSchema.setClass(ProjectCompletionConditionClosure);

export const ProjectLifecycleEvidenceRefSchema = defineEntity({
  class: ProjectLifecycleEvidenceRef, tableName: "project_lifecycle_evidence_ref", schema: "poms",
  checks: [{"name":"project_lifecycle_evidence_ref_attachment_row_version_check","expression":"attachment_row_version>0"},{"name":"project_lifecycle_evidence_ref_checksum_sha256_check","expression":"checksum_sha256 ~ '^[0-9a-f]{64}$'"},{"name":"project_lifecycle_evidence_ref_source_payload_hash_check","expression":"source_payload_hash ~ '^[0-9a-f]{64}$'"},{"name":"project_lifecycle_evidence_ref_check","expression":"num_nonnulls(stage_record_id,acceptance_record_id,completion_record_id,completion_condition_id,condition_closure_id,archive_record_id)=1"},{"name":"ck_jghi_lifecycle_payload_object","expression":"jsonb_typeof(source_payload)='object'"}],
  uniques: [{"name":"lifecycle_evidence_stage_attachment","expression":"CREATE UNIQUE INDEX lifecycle_evidence_stage_attachment ON poms.project_lifecycle_evidence_ref(stage_record_id,attachment_id) WHERE stage_record_id IS NOT NULL"},{"name":"lifecycle_evidence_acceptance_attachment","expression":"CREATE UNIQUE INDEX lifecycle_evidence_acceptance_attachment ON poms.project_lifecycle_evidence_ref(acceptance_record_id,attachment_id) WHERE acceptance_record_id IS NOT NULL"},{"name":"lifecycle_evidence_completion_attachment","expression":"CREATE UNIQUE INDEX lifecycle_evidence_completion_attachment ON poms.project_lifecycle_evidence_ref(completion_record_id,attachment_id) WHERE completion_record_id IS NOT NULL"},{"name":"lifecycle_evidence_condition_attachment","expression":"CREATE UNIQUE INDEX lifecycle_evidence_condition_attachment ON poms.project_lifecycle_evidence_ref(completion_condition_id,attachment_id) WHERE completion_condition_id IS NOT NULL"},{"name":"lifecycle_evidence_closure_attachment","expression":"CREATE UNIQUE INDEX lifecycle_evidence_closure_attachment ON poms.project_lifecycle_evidence_ref(condition_closure_id,attachment_id) WHERE condition_closure_id IS NOT NULL"},{"name":"lifecycle_evidence_archive_attachment","expression":"CREATE UNIQUE INDEX lifecycle_evidence_archive_attachment ON poms.project_lifecycle_evidence_ref(archive_record_id,attachment_id) WHERE archive_record_id IS NOT NULL"}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_project_id_fkey").deleteRule("restrict").updateRule("no action"),
    stageRecordId: () => p.manyToOne(ProjectStageRecord).mapToPk().joinColumns("stage_record_id").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_stage_record_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    acceptanceRecordId: () => p.manyToOne(AcceptanceRecord).mapToPk().joinColumns("acceptance_record_id").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_acceptance_record_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    completionRecordId: () => p.manyToOne(ProjectCompletionRecord).mapToPk().joinColumns("completion_record_id").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_completion_record_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    completionConditionId: () => p.manyToOne(ProjectCompletionCondition).mapToPk().joinColumns("completion_condition_id").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_completion_condition_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    conditionClosureId: () => p.manyToOne(ProjectCompletionConditionClosure).mapToPk().joinColumns("condition_closure_id").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_condition_closure_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    archiveRecordId: () => p.manyToOne(ProjectArchiveRecord).mapToPk().joinColumns("archive_record_id").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_archive_record_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    attachmentLinkId: p.uuid().fieldName("attachment_link_id"),
    attachmentId: () => p.manyToOne(Attachment).mapToPk().joinColumns("attachment_id").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_attachment_id_fkey").deleteRule("restrict").updateRule("no action"),
    attachmentRowVersion: p.integer().fieldName("attachment_row_version"),
    checksumSha256: p.string().length(64).fieldName("checksum_sha256"),
    fileName: p.text().fieldName("file_name"),
    sourcePayload: p.json<unknown>().columnType('jsonb').fieldName("source_payload"),
    sourcePayloadHash: p.string().length(64).fieldName("source_payload_hash"),
    frozenAt: p.datetime().columnType('timestamptz').fieldName("frozen_at"),
    frozenBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("frozen_by").referencedColumnNames("id").foreignKeyName("project_lifecycle_evidence_ref_frozen_by_fkey").deleteRule("restrict").updateRule("no action"),
  }
});
ProjectLifecycleEvidenceRefSchema.setClass(ProjectLifecycleEvidenceRef);

export const OperatingEvaluationEvidenceSchema = defineEntity({
  class: OperatingEvaluationEvidence, tableName: "operating_evaluation_evidence", schema: "poms",
  checks: [{"name":"operating_evaluation_evidence_producer_version_check","expression":"producer_version=1"},{"name":"operating_evaluation_evidence_policy_version_check","expression":"policy_version='r4h-operating-v1'"},{"name":"operating_evaluation_evidence_policy_hash_check","expression":"policy_hash~'^[0-9a-f]{64}$'"},{"name":"operating_evaluation_evidence_source_hash_check","expression":"source_hash~'^[0-9a-f]{64}$'"},{"name":"operating_evaluation_evidence_evaluation_hash_check","expression":"evaluation_hash~'^[0-9a-f]{64}$'"},{"name":"operating_evaluation_evidence_frozen_output_check","expression":"jsonb_typeof(frozen_output)='object'"},{"name":"operating_evaluation_evidence_output_payload_hash_check","expression":"output_payload_hash~'^[0-9a-f]{64}$'"},{"name":"operating_evaluation_evidence_contains_labor_check","expression":"contains_labor IN ('yes','no','unknown')"},{"name":"operating_evaluation_evidence_row_version_check","expression":"row_version=1"}],
  uniques: [{"name":"operating_evaluation_evidence_id_project_id_snapshot_id_key","properties":["id","projectId","snapshotId"]},{"name":"operating_evaluation_evidence_snapshot_id_policy_version_key","properties":["snapshotId","policyVersion"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    projectId: p.uuid().fieldName("project_id"),
    snapshotId: p.uuid().fieldName("snapshot_id"),
    sourceContextId: p.uuid().fieldName("source_context_id"),
    producerVersion: p.smallint().fieldName("producer_version"),
    policyVersion: p.string().length(64).fieldName("policy_version"),
    policyHash: p.string().length(64).fieldName("policy_hash"),
    sourceHash: p.string().length(64).fieldName("source_hash"),
    evaluationHash: p.string().length(64).fieldName("evaluation_hash"),
    frozenOutput: p.json<unknown>().columnType('jsonb').fieldName("frozen_output"),
    outputPayloadHash: p.string().length(64).fieldName("output_payload_hash"),
    containsLabor: p.string().length(16).fieldName("contains_labor"),
    evaluatedAt: p.datetime().columnType('timestamptz').fieldName("evaluated_at"),
    evaluatedBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("evaluated_by").referencedColumnNames("id").foreignKeyName("operating_evaluation_evidence_evaluated_by_fkey").deleteRule("no action").updateRule("no action"),
    rowVersion: p.integer().default(1).fieldName("row_version"),
    scopeConstraint1: () => p.manyToOne(OperatingSourceContext).mapToPk().joinColumns("source_context_id","project_id","snapshot_id").referencedColumnNames("id","project_id","snapshot_id").columnTypes("uuid","uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("operating_evaluation_evidence_source_context_id_project_id_fkey").deleteRule("no action").updateRule("no action").deferMode('deferred'),
  }
});
OperatingEvaluationEvidenceSchema.setClass(OperatingEvaluationEvidence);

export const OperatingEvaluationReasonSchema = defineEntity({
  class: OperatingEvaluationReason, tableName: "operating_evaluation_reason", schema: "poms",
  checks: [{"name":"operating_evaluation_reason_reason_index_check","expression":"reason_index>=0"},{"name":"operating_evaluation_reason_reason_code_check","expression":"length(btrim(reason_code))>0"},{"name":"operating_evaluation_reason_project_action_check","expression":"project_action IN ('prompt','review','block')"},{"name":"operating_evaluation_reason_stage_actions_check","expression":"jsonb_typeof(stage_actions)='object'"},{"name":"operating_evaluation_reason_stage_primaries_check","expression":"jsonb_typeof(stage_primaries)='array'"},{"name":"operating_evaluation_reason_source_refs_check","expression":"jsonb_typeof(source_refs)='array'"},{"name":"operating_evaluation_reason_frozen_payload_check","expression":"jsonb_typeof(frozen_payload)='object'"},{"name":"operating_evaluation_reason_payload_hash_check","expression":"payload_hash~'^[0-9a-f]{64}$'"},{"name":"operating_evaluation_reason_rule_id_check","expression":"rule_id IN ('H01','H02','H03','H04','H05','H06','H07','H08','H09','H10','H11')"}],
  properties: {
    evidenceId: () => p.manyToOne(OperatingEvaluationEvidence).mapToPk().joinColumns("evidence_id").referencedColumnNames("id").foreignKeyName("operating_evaluation_reason_evidence_id_fkey").deleteRule("no action").updateRule("no action").primary(),
    reasonIndex: p.integer().primary().fieldName("reason_index"),
    ruleId: p.string().length(8).fieldName("rule_id"),
    reasonCode: p.string().length(128).fieldName("reason_code"),
    projectAction: p.string().length(16).fieldName("project_action"),
    stageActions: p.json<unknown>().columnType('jsonb').fieldName("stage_actions"),
    projectPrimary: p.boolean().fieldName("project_primary"),
    stagePrimaries: p.json<unknown>().columnType('jsonb').fieldName("stage_primaries"),
    sourceRefs: p.json<unknown>().columnType('jsonb').fieldName("source_refs"),
    frozenPayload: p.json<unknown>().columnType('jsonb').fieldName("frozen_payload"),
    payloadHash: p.string().length(64).fieldName("payload_hash"),
  }
});
OperatingEvaluationReasonSchema.setClass(OperatingEvaluationReason);

export const OperatingGateSummaryPayloadSchema = defineEntity({
  class: OperatingGateSummaryPayload, tableName: "operating_gate_summary_payload", schema: "poms",
  checks: [{"name":"operating_gate_summary_payload_binding_row_version_check","expression":"binding_row_version>0"},{"name":"operating_gate_summary_payload_gate_stage_type_check","expression":"gate_stage_type IN ('first','second','final','retention')"},{"name":"operating_gate_summary_payload_source_hash_check","expression":"source_hash~'^[0-9a-f]{64}$'"},{"name":"operating_gate_summary_payload_evaluation_hash_check","expression":"evaluation_hash~'^[0-9a-f]{64}$'"},{"name":"operating_gate_summary_payload_policy_hash_check","expression":"policy_hash~'^[0-9a-f]{64}$'"},{"name":"operating_gate_summary_payload_frozen_payload_check","expression":"jsonb_typeof(frozen_payload)='object'"},{"name":"operating_gate_summary_payload_payload_hash_check","expression":"payload_hash~'^[0-9a-f]{64}$'"}],
  properties: {
    summarySnapshotId: () => p.manyToOne(ApprovalSummarySnapshot).mapToPk().joinColumns("summary_snapshot_id").referencedColumnNames("id").foreignKeyName("operating_gate_summary_payload_summary_snapshot_id_fkey").deleteRule("no action").updateRule("no action").primary(),
    bindingId: p.uuid().fieldName("binding_id"),
    bindingRowVersion: p.integer().fieldName("binding_row_version"),
    projectId: p.uuid().fieldName("project_id"),
    gateStageType: p.string().length(32).fieldName("gate_stage_type"),
    snapshotId: p.uuid().fieldName("snapshot_id"),
    evidenceId: p.uuid().fieldName("evidence_id"),
    sourceHash: p.string().length(64).fieldName("source_hash"),
    evaluationHash: p.string().length(64).fieldName("evaluation_hash"),
    policyVersion: p.string().length(64).fieldName("policy_version"),
    policyHash: p.string().length(64).fieldName("policy_hash"),
    sourceSummarySnapshotId: () => p.manyToOne(ApprovalSummarySnapshot).mapToPk().joinColumns("source_summary_snapshot_id").referencedColumnNames("id").foreignKeyName("operating_gate_summary_payload_source_summary_snapshot_id_fkey").deleteRule("no action").updateRule("no action").nullable(),
    signalReviewId: () => p.manyToOne(OperatingSignalReviewRecord).mapToPk().joinColumns("signal_review_id").referencedColumnNames("id").foreignKeyName("operating_gate_summary_payload_signal_review_id_fkey").deleteRule("no action").updateRule("no action").nullable(),
    gateReviewId: () => p.manyToOne(CommissionGateReviewRecord).mapToPk().joinColumns("gate_review_id").referencedColumnNames("id").foreignKeyName("operating_gate_summary_payload_gate_review_id_fkey").deleteRule("no action").updateRule("no action").deferMode('deferred').nullable(),
    frozenPayload: p.json<unknown>().columnType('jsonb').fieldName("frozen_payload"),
    payloadHash: p.string().length(64).fieldName("payload_hash"),
    createdAt: p.datetime().columnType('timestamptz').fieldName("created_at"),
    createdBy: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("created_by").referencedColumnNames("id").foreignKeyName("operating_gate_summary_payload_created_by_fkey").deleteRule("no action").updateRule("no action"),
    scopeConstraint1: () => p.manyToOne(OperatingSignalToCommissionGateBinding).mapToPk().joinColumns("binding_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("operating_gate_summary_payload_binding_id_project_id_fkey").deleteRule("no action").updateRule("no action").deferMode('deferred'),
    scopeConstraint2: () => p.manyToOne(OperatingEvaluationEvidence).mapToPk().joinColumns("evidence_id","project_id","snapshot_id").referencedColumnNames("id","project_id","snapshot_id").columnTypes("uuid","uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("operating_gate_summary_payloa_evidence_id_project_id_snaps_fkey").deleteRule("no action").updateRule("no action"),
  }
});
OperatingGateSummaryPayloadSchema.setClass(OperatingGateSummaryPayload);

export const OperatingCommandReceiptSchema = defineEntity({
  class: OperatingCommandReceipt, tableName: "operating_command_receipt", schema: "poms",
  checks: [{"name":"operating_command_receipt_request_hash_check","expression":"request_hash~'^[0-9a-f]{64}$'"},{"name":"operating_command_receipt_authorized_response_check","expression":"jsonb_typeof(authorized_response)='object'"},{"name":"operating_command_receipt_http_status_check","expression":"http_status BETWEEN 200 AND 299"},{"name":"operating_command_receipt_source_hash_check","expression":"source_hash~'^[0-9a-f]{64}$'"},{"name":"operating_command_receipt_evaluation_hash_check","expression":"evaluation_hash~'^[0-9a-f]{64}$'"},{"name":"ck_jghi_receipt_real_evaluation","expression":"(operation_id='ProjectCostController_activateOperatingBaselinePackage' AND evaluation_hash IS NULL)\n  OR (operation_id<>'ProjectCostController_activateOperatingBaselinePackage' AND evaluation_hash IS NOT NULL)"}],
  uniques: [{"name":"operating_command_receipt_operation_id_target_scope_actor_i_key","properties":["operationId","targetScope","actorId","requestKey"]}],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
    operationId: p.string().length(160).fieldName("operation_id"),
    targetScope: p.string().length(192).fieldName("target_scope"),
    actorId: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("actor_id").referencedColumnNames("id").foreignKeyName("operating_command_receipt_actor_id_fkey").deleteRule("no action").updateRule("no action"),
    requestKey: p.uuid().fieldName("request_key"),
    requestHash: p.string().length(64).fieldName("request_hash"),
    authorizedResponse: p.json<unknown>().columnType('jsonb').fieldName("authorized_response"),
    httpStatus: p.integer().fieldName("http_status"),
    sourceHash: p.string().length(64).fieldName("source_hash"),
    evaluationHash: p.string().length(64).nullable().fieldName("evaluation_hash"),
    committedAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("committed_at"),
  }
});
OperatingCommandReceiptSchema.setClass(OperatingCommandReceipt);

export const ProjectOwnershipOriginSchema = defineEntity({
  class: ProjectOwnershipOrigin, tableName: "project_ownership_origin", schema: "poms",
  checks: [{"name":"project_ownership_origin_producer_version_check","expression":"producer_version=1"},{"name":"project_ownership_origin_source_type_check","expression":"source_type IN ('direct-create','lead-conversion')"},{"name":"project_ownership_origin_initial_kind_check","expression":"initial_kind IN ('personal','org-owned')"},{"name":"project_ownership_origin_source_payload_hash_check","expression":"source_payload_hash ~ '^[0-9a-f]{64}$'"},{"name":"project_ownership_origin_bootstrap_state_check","expression":"bootstrap_state IN ('available','consumed')"},{"name":"project_ownership_origin_row_version_check","expression":"row_version>0"},{"name":"project_ownership_origin_check","expression":"(initial_kind='personal' AND initial_owner_user_id IS NOT NULL)\n        OR (initial_kind='org-owned' AND initial_owner_user_id IS NULL AND initial_owner_org_id IS NOT NULL)"},{"name":"project_ownership_origin_check1","expression":"(bootstrap_state='available' AND initial_kind='org-owned'\n         AND first_personal_owner_user_id IS NULL AND first_personal_assigned_at IS NULL\n         AND bootstrap_consumed_at IS NULL AND bootstrap_assignment_record_id IS NULL)\n        OR (bootstrap_state='consumed' AND first_personal_owner_user_id IS NOT NULL\n         AND first_personal_assigned_at IS NOT NULL AND bootstrap_consumed_at IS NOT NULL)"},{"name":"project_ownership_origin_check2","expression":"initial_kind<>'personal' OR (bootstrap_state='consumed'\n         AND first_personal_owner_user_id=initial_owner_user_id)"},{"name":"project_ownership_origin_check3","expression":"initial_kind<>'org-owned' OR bootstrap_state<>'consumed'\n         OR bootstrap_assignment_record_id IS NOT NULL"}],
  properties: {
    projectId: () => p.manyToOne(Project).mapToPk().joinColumns("project_id").referencedColumnNames("id").foreignKeyName("project_ownership_origin_project_id_fkey").deleteRule("restrict").updateRule("no action").primary(),
    producerVersion: p.integer().fieldName("producer_version"),
    creatorUserId: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("creator_user_id").referencedColumnNames("id").foreignKeyName("project_ownership_origin_creator_user_id_fkey").deleteRule("restrict").updateRule("no action"),
    sourceType: p.text().fieldName("source_type"),
    sourceRecordId: p.uuid().fieldName("source_record_id"),
    initialKind: p.text().fieldName("initial_kind"),
    initialOwnerUserId: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("initial_owner_user_id").referencedColumnNames("id").foreignKeyName("project_ownership_origin_initial_owner_user_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    initialOwnerOrgId: () => p.manyToOne(OrgUnit).mapToPk().joinColumns("initial_owner_org_id").referencedColumnNames("id").foreignKeyName("project_ownership_origin_initial_owner_org_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    sourcePayload: p.json<unknown>().columnType('jsonb').fieldName("source_payload"),
    sourcePayloadHash: p.string().length(64).fieldName("source_payload_hash"),
    bootstrapState: p.text().fieldName("bootstrap_state"),
    firstPersonalOwnerUserId: () => p.manyToOne(PlatformUser).mapToPk().joinColumns("first_personal_owner_user_id").referencedColumnNames("id").foreignKeyName("project_ownership_origin_first_personal_owner_user_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    firstPersonalAssignedAt: p.datetime().columnType('timestamptz').nullable().fieldName("first_personal_assigned_at"),
    bootstrapConsumedAt: p.datetime().columnType('timestamptz').nullable().fieldName("bootstrap_consumed_at"),
    bootstrapAssignmentRecordId: () => p.manyToOne(ProjectOwnerReassignmentRecord).mapToPk().joinColumns("bootstrap_assignment_record_id").referencedColumnNames("id").foreignKeyName("project_ownership_origin_bootstrap_assignment_record_id_fkey").deleteRule("restrict").updateRule("no action").nullable(),
    rowVersion: p.integer().default(1).fieldName("row_version"),
    createdAt: p.datetime().columnType('timestamptz').fieldName("created_at"),
    scopeConstraint1: () => p.manyToOne(ProjectOwnerReassignmentRecord).mapToPk().joinColumns("bootstrap_assignment_record_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_jghi_origin_reassignment_project").deleteRule("no action").updateRule("no action").nullable(),
  }
});
ProjectOwnershipOriginSchema.setClass(ProjectOwnershipOrigin);
export const RUST_R4_GHI_ENTITIES = [ReceiptAccountingBasis,OperatingBaselineSource,ProjectCostInclusionDecision,ProjectCostInclusionHead,OperatingSourceContext,OperatingSnapshotCostMember,OperatingSourceMember,ProjectOperatingHead,ProjectStageRecord,CommissionRoleAssignmentParticipant,CommissionRoleAssignmentFreezePayload,ProjectCompletionCondition,ProjectCompletionConditionClosure,ProjectLifecycleEvidenceRef,OperatingEvaluationEvidence,OperatingEvaluationReason,OperatingGateSummaryPayload,OperatingCommandReceipt,ProjectOwnershipOrigin];
