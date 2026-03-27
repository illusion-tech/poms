import { randomUUID } from 'node:crypto';
import type {
    CreateCommissionAdjustmentRequest,
    CreateCommissionCalculationRequest,
    CreateCommissionPayoutRequest,
    CreateCommissionRoleAssignmentRequest,
    CreateCommissionRuleVersionRequest,
    CreateContractRequest,
    CreateProjectRequest,
    SanitizedUserWithOrgUnits
} from './types';

export function makeUniqueSuffix(prefix: string): string {
    return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`.toUpperCase();
}

export function buildProjectInput(
    profile: SanitizedUserWithOrgUnits,
    overrides: Partial<CreateProjectRequest> & Pick<CreateProjectRequest, 'projectCode' | 'projectName' | 'currentStage'>
): CreateProjectRequest {
    return {
        projectCode: overrides.projectCode,
        projectName: overrides.projectName,
        currentStage: overrides.currentStage,
        status: overrides.status ?? 'active',
        customerId: overrides.customerId ?? null,
        ownerOrgId: overrides.ownerOrgId ?? profile.orgUnits[0]?.id ?? null,
        ownerUserId: overrides.ownerUserId ?? profile.id,
        plannedSignAt: overrides.plannedSignAt ?? undefined,
        createdBy: overrides.createdBy ?? profile.id,
        updatedBy: overrides.updatedBy ?? profile.id
    };
}

export function buildContractInput(
    projectId: string,
    actorUserId: string,
    overrides: Partial<CreateContractRequest> & Pick<CreateContractRequest, 'contractNo' | 'signedAmount'>
): CreateContractRequest {
    return {
        projectId,
        contractNo: overrides.contractNo,
        signedAmount: overrides.signedAmount,
        status: overrides.status,
        currencyCode: overrides.currencyCode,
        currentSnapshotId: overrides.currentSnapshotId,
        signedAt: overrides.signedAt,
        createdBy: overrides.createdBy ?? actorUserId,
        updatedBy: overrides.updatedBy ?? actorUserId
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
    overrides?: Partial<CreateCommissionCalculationRequest>
): CreateCommissionCalculationRequest {
    return {
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
