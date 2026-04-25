import { randomUUID } from 'node:crypto';
import type {
    CreateCommissionAdjustmentRequest,
    CreateCommissionCalculationRequest,
    CreateCommissionPayoutRequest,
    CreateCommissionRoleAssignmentRequest,
    CreateCommissionRuleVersionRequest,
    CreateCommercialReleaseBaselineRequest,
    CreateContractRequest,
    CreateContractReadinessPackageRequest,
    CreateProjectRequest,
    SanitizedUserWithOrgUnits
} from './types';

export function makeUniqueSuffix(prefix: string): string {
    return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`.toUpperCase();
}

export function buildProjectInput(
    profile: SanitizedUserWithOrgUnits,
    overrides: Partial<CreateProjectRequest> & { projectName: string; customerProjectNo?: string | null }
): CreateProjectRequest {
    return {
        projectName: overrides.projectName,
        customerName: overrides.customerName ?? `${profile.displayName} 客户`,
        customerProjectNo: overrides.customerProjectNo ?? null,
        currentStage: overrides.currentStage ?? 'assessment',
        plannedSignAt: overrides.plannedSignAt ?? undefined
    };
}

export function buildContractInput(
    projectId: string,
    actorUserId: string,
    overrides: Partial<CreateContractRequest> & { signedAmount: string; customerContractNo?: string | null }
): CreateContractRequest {
    return {
        projectId,
        customerContractNo: overrides.customerContractNo ?? null,
        signedAmount: overrides.signedAmount,
        status: overrides.status,
        currencyCode: overrides.currencyCode,
        currentSnapshotId: overrides.currentSnapshotId,
        signedAt: overrides.signedAt,
        createdBy: overrides.createdBy ?? actorUserId,
        updatedBy: overrides.updatedBy ?? actorUserId
    };
}

export function buildCommercialReleaseBaselineInput(
    projectId: string,
    actorUserId: string,
    unique: string,
    overrides?: Partial<CreateCommercialReleaseBaselineRequest>
): CreateCommercialReleaseBaselineRequest {
    const defaultBaselineCode = `BL-${unique}`.slice(0, 64);

    return {
        projectId,
        baselineCode: overrides?.baselineCode ?? defaultBaselineCode,
        quotationReviewId: overrides?.quotationReviewId ?? null,
        grossMarginSummary: overrides?.grossMarginSummary ?? '毛利结论已放行',
        paymentTermsSummary: overrides?.paymentTermsSummary ?? '首付款 30%，分两期回款',
        amountTaxInclusive: overrides?.amountTaxInclusive ?? '188000.00',
        amountTaxExclusive: overrides?.amountTaxExclusive ?? '177358.49',
        taxRate: overrides?.taxRate ?? '0.06',
        downPaymentRate: overrides?.downPaymentRate ?? '0.30',
        retentionRate: overrides?.retentionRate ?? '0.05',
        paymentTerms: overrides?.paymentTerms ?? '30% 首付，65% 验收款，5% 质保金',
        diffLevel: overrides?.diffLevel ?? 'review-required',
        diffSummary: overrides?.diffSummary ?? '首付款比例与回款节点存在差异',
        diffItems: overrides?.diffItems ?? [
            {
                fieldKey: 'downPaymentRate',
                fieldLabel: '首付款比例',
                diffLevel: overrides?.diffLevel ?? 'review-required'
            }
        ],
        createdBy: overrides?.createdBy ?? actorUserId,
        updatedBy: overrides?.updatedBy ?? actorUserId
    };
}

export function buildContractReadinessPackageInput(
    projectId: string,
    actorUserId: string,
    sourceBaselineId: string,
    latestDiffResultId: string,
    overrides?: Partial<CreateContractReadinessPackageRequest>
): CreateContractReadinessPackageRequest {
    return {
        projectId,
        sourceBaselineId,
        latestDiffResultId,
        packageStatus: overrides?.packageStatus ?? 'ready',
        guardDecision: overrides?.guardDecision ?? 'allowed',
        currentEffectiveDecisionSummary: overrides?.currentEffectiveDecisionSummary ?? '前置事项已收口，可进入合同主链',
        blockingReasonSummary: overrides?.blockingReasonSummary ?? null,
        missingPrerequisiteCount: overrides?.missingPrerequisiteCount ?? 0,
        items: overrides?.items ?? [
            {
                itemType: 'checklist',
                itemKey: 'quotation-approved',
                label: '报价与毛利评审已放行',
                status: 'ready'
            }
        ],
        createdBy: overrides?.createdBy ?? actorUserId,
        updatedBy: overrides?.updatedBy ?? actorUserId
    };
}

export function buildCommissionRuleVersionInput(unique: string): CreateCommissionRuleVersionRequest {
    return {
        ruleCode: `000-E2E-RULE-${unique}`,
        version: 1,
        tierDefinitionJson: {
            tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }]
        }
    };
}

export function buildRoleAssignmentInput(
    profile: SanitizedUserWithOrgUnits,
    overrides?: Partial<CreateCommissionRoleAssignmentRequest>
): CreateCommissionRoleAssignmentRequest {
    return {
        participants: overrides?.participants ?? [
            {
                userId: profile.id,
                displayName: profile.displayName,
                roleType: 'sales-owner',
                weight: 1
            }
        ]
    };
}

export function buildCalculationInput(
    ruleVersionId: string,
    overrides?: Partial<CreateCommissionCalculationRequest>
): CreateCommissionCalculationRequest {
    return {
        ruleVersionId: overrides?.ruleVersionId ?? ruleVersionId,
        recognizedRevenueTaxExclusive: overrides?.recognizedRevenueTaxExclusive ?? '100000.00',
        recognizedCostTaxExclusive: overrides?.recognizedCostTaxExclusive ?? '70000.00'
    };
}

export function buildPayoutInput(
    calculationId: string,
    overrides?: Partial<CreateCommissionPayoutRequest>
): CreateCommissionPayoutRequest {
    return {
        calculationId,
        stageType: overrides?.stageType ?? 'first',
        selectedTier: overrides?.selectedTier ?? 'basic'
    };
}

export function buildAdjustmentInput(
    calculationId: string,
    payoutId: string,
    overrides?: Partial<CreateCommissionAdjustmentRequest>
): CreateCommissionAdjustmentRequest {
    return {
        adjustmentType: overrides?.adjustmentType ?? 'suspend-payout',
        relatedPayoutId: overrides?.relatedPayoutId ?? payoutId,
        relatedCalculationId: overrides?.relatedCalculationId ?? calculationId,
        amount: overrides?.amount,
        reason: overrides?.reason ?? 'e2e 异常处理'
    };
}
