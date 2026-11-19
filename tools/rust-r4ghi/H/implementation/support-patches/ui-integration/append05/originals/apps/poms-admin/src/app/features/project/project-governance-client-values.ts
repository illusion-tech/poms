import * as Api from '@poms/shared-api-client';
import * as Contract from '@poms/shared-contracts';

/** Select the real generated enum member by its wire value; no nominal cast. */
export function generatedEnum<T extends string>(wire: string, members: Readonly<Record<string, T>>): T {
    for (const member of Object.values(members)) if (member === wire) return member;
    throw new Error('生成客户端的枚举与当前正式契约不一致，请重新读取后重试。');
}

function assertions(value: Contract.LegacyAssertions | null): Api.LegacyAssertions | null {
    return value === null ? null : { ...value, currentActionLevel: value.currentActionLevel === null ? null : generatedEnum(value.currentActionLevel, Api.LegacyAssertionsCurrentActionLevelEnum) };
}
function cost(value: Contract.CostDecisionInput): Api.CostDecisionInput {
    return {
        ...value,
        decision: generatedEnum(value.decision, Api.CostDecisionInputDecisionEnum),
        recognitionRole: generatedEnum(value.recognitionRole, Api.CostDecisionInputRecognitionRoleEnum),
        reasonCode: generatedEnum(value.reasonCode, Api.CostDecisionInputReasonCodeEnum)
    };
}
function governance(value: Contract.RestatementR4FGovernanceEvidence): Api.RestatementR4FGovernanceEvidence {
    return value.kind === 'source'
        ? { ...value, kind: generatedEnum(value.kind, Api.RestatementR4FSourceEvidenceKindEnum) }
        : { ...value, kind: generatedEnum(value.kind, Api.RestatementR4FManualAssessmentEvidenceKindEnum) };
}
function stage(value: Contract.StageReclassificationCorrection): Api.StageReclassificationCorrection {
    return {
        ...value,
        correctionKind: generatedEnum(value.correctionKind, Api.StageReclassificationCorrectionCorrectionKindEnum),
        stageAttributionRef: { ...value.stageAttributionRef, kind: generatedEnum(value.stageAttributionRef.kind, Api.StageReclassificationCorrectionStageAttributionRefKindEnum) },
        costRef: { ...value.costRef, kind: generatedEnum(value.costRef.kind, Api.StageReclassificationCorrectionCostRefKindEnum) },
        request: { ...value.request, attributionEvidence: governance(value.request.attributionEvidence) }
    };
}
function tax(value: Contract.TaxTreatmentReplacementCorrection): Api.TaxTreatmentReplacementCorrection {
    return {
        ...value,
        correctionKind: generatedEnum(value.correctionKind, Api.TaxTreatmentReplacementCorrectionCorrectionKindEnum),
        taxTreatmentRef: { ...value.taxTreatmentRef, kind: generatedEnum(value.taxTreatmentRef.kind, Api.TaxTreatmentReplacementCorrectionTaxTreatmentRefKindEnum) },
        request: { ...value.request, deductibilityStatus: generatedEnum(value.request.deductibilityStatus, Api.RestatementAccountingTaxDeductibilityStatus), sourceReferences: value.request.sourceReferences.map(governance) }
    };
}
export function activate(value: Contract.ActivateOperatingBaselinePackageRequest): Api.ActivateOperatingBaselinePackageRequest {
    const input = Contract.ActivateOperatingBaselinePackageRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.ActivateOperatingBaselinePackageRequestInputVersionEnum), assertions: assertions(input.assertions) };
}
export function snapshot(value: Contract.CreateProjectOperatingSnapshotRequest): Api.CreateProjectOperatingSnapshotRequest {
    const input = Contract.CreateProjectOperatingSnapshotRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.CreateProjectOperatingSnapshotRequestInputVersionEnum), snapshotMode: generatedEnum(input.snapshotMode, Api.CreateProjectOperatingSnapshotRequestSnapshotModeEnum), assertions: assertions(input.assertions), costDecisions: input.costDecisions.map(cost) };
}
export function period(value: Contract.CreatePeriodClosingSnapshotRequest): Api.CreatePeriodClosingSnapshotRequest {
    const input = Contract.CreatePeriodClosingSnapshotRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.CreatePeriodClosingSnapshotRequestInputVersionEnum), assertions: assertions(input.assertions), costDecisions: input.costDecisions.map(cost) };
}
export function restatement(value: Contract.CreateOperatingRestatementRequest): Api.CreateOperatingRestatementRequest {
    const input = Contract.CreateOperatingRestatementRequestSchema.parse(value);
    return {
        ...input, inputVersion: generatedEnum(input.inputVersion, Api.CreateOperatingRestatementRequestInputVersionEnum), scope: generatedEnum(input.scope, Api.CreateOperatingRestatementRequestScopeEnum), assertions: assertions(input.assertions),
        costDecisions: input.costDecisions.map(cost), affectedTargets: input.affectedTargets.map((target) => ({ ...target, costDecisions: target.costDecisions.map(cost) })),
        stageCorrections: input.stageCorrections.map(stage), taxCorrections: input.taxCorrections.map(tax)
    };
}
export function signalReview(value: Contract.ReviewOperatingSignalEvaluationRequest): Api.ReviewOperatingSignalEvaluationRequest {
    const input = Contract.ReviewOperatingSignalEvaluationRequestSchema.parse(value);
    const { manualMaterialityReview: manual, ...fields } = input;
    return {
        ...fields, inputVersion: generatedEnum(input.inputVersion, Api.ReviewOperatingSignalEvaluationRequestInputVersionEnum),
        reviewDecision: generatedEnum(input.reviewDecision, Api.ReviewOperatingSignalEvaluationRequestReviewDecisionEnum),
        resolvedDataMaturityLevel: generatedEnum(input.resolvedDataMaturityLevel, Api.OperatingDataMaturityLevel),
        costActionRecommendation: generatedEnum(input.costActionRecommendation, Api.OperatingSnapshotActionLevel),
        ...(manual === undefined ? {} : { manualMaterialityReview: manual === null ? null : {
            ...manual, policyVersion: generatedEnum(manual.policyVersion, Api.ManualOperatingMaterialityReviewPolicyVersionEnum), riskDecision: generatedEnum(manual.riskDecision, Api.ManualOperatingMaterialityReviewRiskDecisionEnum)
        } })
    };
}
export function gateReview(value: Contract.ReviewCommissionGateBindingRequest): Api.ReviewCommissionGateBindingRequest {
    const input = Contract.ReviewCommissionGateBindingRequestSchema.parse(value);
    return {
        ...input, inputVersion: generatedEnum(input.inputVersion, Api.ReviewCommissionGateBindingRequestInputVersionEnum), bindingAction: generatedEnum(input.bindingAction, Api.OperatingSnapshotActionLevel), gateReviewDecision: generatedEnum(input.gateReviewDecision, Api.OperatingGateReviewDecision),
        baselineSelectionSource: generatedEnum(input.baselineSelectionSource, Api.BaselineSelectionSource), reviewAction: generatedEnum(input.reviewAction, Api.ReviewCommissionGateBindingRequestReviewActionEnum)
    };
}
export function receipt(value: Contract.ConfirmReceiptRecordRequest): Api.ConfirmReceiptRecordRequest {
    const input = Contract.ConfirmReceiptRecordRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.ConfirmReceiptRecordRequestInputVersionEnum), mode: generatedEnum(input.mode, Api.ConfirmReceiptRecordRequestModeEnum), basis: { ...input.basis, selectionPolicy: generatedEnum(input.basis.selectionPolicy, Api.ReceiptBasisInputSelectionPolicyEnum) } };
}
export function execution(value: Contract.StartProjectExecutionRequest): Api.StartProjectExecutionRequest {
    const input = Contract.StartProjectExecutionRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.StartProjectExecutionRequestInputVersionEnum) };
}
export function acceptanceAdmission(value: Contract.StartProjectAcceptanceRequest): Api.StartProjectAcceptanceRequest {
    const input = Contract.StartProjectAcceptanceRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.StartProjectAcceptanceRequestInputVersionEnum) };
}
export function acceptance(value: Contract.CreateAcceptanceRecordRequest): Api.CreateAcceptanceRecordRequest {
    const input = Contract.CreateAcceptanceRecordRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.CreateAcceptanceRecordRequestInputVersionEnum), acceptanceResult: generatedEnum(input.acceptanceResult, Api.CreateAcceptanceRecordRequestAcceptanceResultEnum), acceptanceType: generatedEnum(input.acceptanceType, Api.CreateAcceptanceRecordRequestAcceptanceTypeEnum) };
}
export function completion(value: Contract.CreateProjectCompletionRecordRequest): Api.CreateProjectCompletionRecordRequest {
    const input = Contract.CreateProjectCompletionRecordRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.CreateProjectCompletionRecordRequestInputVersionEnum), completionResult: generatedEnum(input.completionResult, Api.CreateProjectCompletionRecordRequestCompletionResultEnum) };
}
export function archive(value: Contract.CreateProjectArchiveRecordRequest): Api.CreateProjectArchiveRecordRequest {
    const input = Contract.CreateProjectArchiveRecordRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.CreateProjectArchiveRecordRequestInputVersionEnum) };
}
export function replaceArchive(value: Contract.ReplaceProjectArchiveRecordRequest): Api.ReplaceProjectArchiveRecordRequest {
    const input = Contract.ReplaceProjectArchiveRecordRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.ReplaceProjectArchiveRecordRequestInputVersionEnum) };
}
export function voidArchive(value: Contract.VoidProjectArchiveRecordRequest): Api.VoidProjectArchiveRecordRequest {
    const input = Contract.VoidProjectArchiveRecordRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.VoidProjectArchiveRecordRequestInputVersionEnum) };
}
export function closeCondition(value: Contract.CloseProjectCompletionConditionRequest): Api.CloseProjectCompletionConditionRequest {
    const input = Contract.CloseProjectCompletionConditionRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.CloseProjectCompletionConditionRequestInputVersionEnum) };
}
export function createRole(value: Contract.CreateCommissionRoleAssignmentRequest): Api.CreateCommissionRoleAssignmentRequest {
    const input = Contract.CreateCommissionRoleAssignmentRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.CreateCommissionRoleAssignmentRequestInputVersionEnum) };
}
export function freezeRole(value: Contract.FreezeCommissionRoleAssignmentRequest): Api.FreezeCommissionRoleAssignmentRequest {
    const input = Contract.FreezeCommissionRoleAssignmentRequestSchema.parse(value);
    return { ...input, inputVersion: generatedEnum(input.inputVersion, Api.FreezeCommissionRoleAssignmentRequestInputVersionEnum) };
}
