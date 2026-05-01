import {
    CommissionFinalSettlementStatusValue,
    CommissionNonRetentionSettlementStatusValue,
    CommissionRetentionDueStatusValue,
    CommissionRetentionSettlementStatusValue,
    CommissionRuleExplanationGateDecisionValue,
    CommissionRuleExplanationStageStatusValue,
    type CommissionFinalSettlementStatus,
    type CommissionNonRetentionSettlementStatus,
    type CommissionRetentionDueStatus,
    type CommissionRetentionSettlementStatus,
    type CommissionRuleExplanationGateDecision,
    type CommissionRuleExplanationStageStatus
} from '@poms/shared-contracts';
import { toBusinessDateOnly, toBusinessDateString } from '../../core/date/business-date.utils';

export const FINAL_SETTLEMENT_STATUS_PENDING = CommissionFinalSettlementStatusValue.PendingFinalSettlement;
export const FINAL_SETTLEMENT_STATUS_PENDING_RETENTION = CommissionFinalSettlementStatusValue.PendingRetentionSettlement;
export const FINAL_SETTLEMENT_STATUS_SETTLED_ALL = CommissionFinalSettlementStatusValue.SettledAll;

export const NON_RETENTION_SETTLEMENT_STATUS_PENDING = CommissionNonRetentionSettlementStatusValue.PendingNonRetention;
export const NON_RETENTION_SETTLEMENT_STATUS_SETTLED = CommissionNonRetentionSettlementStatusValue.SettledNonRetention;

export const RETENTION_SETTLEMENT_STATUS_WAITING = CommissionRetentionSettlementStatusValue.WaitingRetention;
export const RETENTION_SETTLEMENT_STATUS_READY = CommissionRetentionSettlementStatusValue.ReadyRetention;
export const RETENTION_SETTLEMENT_STATUS_SETTLED = CommissionRetentionSettlementStatusValue.SettledRetention;

export const CURRENT_STAGE_STATUS_PENDING_FINAL = CommissionRuleExplanationStageStatusValue.PendingFinalSettlement;
export const CURRENT_STAGE_STATUS_BLOCKED_RETENTION = CommissionRuleExplanationStageStatusValue.BlockedRetention;
export const CURRENT_STAGE_STATUS_READY_RETENTION = CommissionRuleExplanationStageStatusValue.ReadyRetention;
export const CURRENT_STAGE_STATUS_SETTLED_RETENTION = CommissionRuleExplanationStageStatusValue.SettledRetention;

export const DEFAULT_RETENTION_REQUIREMENT_SUMMARY = '待质保期届满、重大争议收口与质保金到账';

export type RetentionDueStatus = CommissionRetentionDueStatus;

type SettlementDecisionSummary = {
    confirmationRequirementSummary?: string | null;
    decisionSummary: string;
};

type SettlementReceiptSummary = {
    receiptAmount: string | number;
    receiptDate: Date;
};

export type RetentionDueEvaluation = {
    retentionDueDate: string | null;
    retentionDueStatus: RetentionDueStatus;
};

export type RuleExplanationDraft = {
    currentStageStatus: CommissionRuleExplanationStageStatus;
    gateDecisionCode: CommissionRuleExplanationGateDecision;
    blockingReasonCategory: string | null;
    blockingReasonCode: string | null;
    blockingReasonSummary: string | null;
    gateDecisionSummary: string;
    nextActionSummary: string | null;
};

export type RetentionSettlementDraft = {
    finalSettlementStatus: CommissionFinalSettlementStatus;
    nonRetentionSettlementStatus: CommissionNonRetentionSettlementStatus;
    retentionSettlementStatus: CommissionRetentionSettlementStatus;
    retentionDueDate: string | null;
    retentionDueStatus: RetentionDueStatus;
    retentionRequirementSummary: string | null;
    retentionReceiptSummary: string | null;
    departureExceptionSummary: string | null;
    ruleExplanation: RuleExplanationDraft;
};

export type RetentionEvaluationInput = {
    openFreezeDispute: boolean;
    retentionDue: RetentionDueEvaluation;
    departureDecision: SettlementDecisionSummary | null;
    retentionReceipt: SettlementReceiptSummary | null;
    gateBindingAction?: string | null;
    gateReviewDecision?: string | null;
    gateReviewBlockingReasonCode?: string | null;
    gateNextActionSummary?: string | null;
    markAsSettled?: boolean;
};

export function buildPendingFinalRuleExplanation(): RuleExplanationDraft {
    return {
        currentStageStatus: CURRENT_STAGE_STATUS_PENDING_FINAL,
        gateDecisionCode: CommissionRuleExplanationGateDecisionValue.AllowFinalSettlement,
        blockingReasonCategory: null,
        blockingReasonCode: null,
        blockingReasonSummary: null,
        gateDecisionSummary: '当前可进入最终结算。',
        nextActionSummary: '请登记最终阶段发放。'
    };
}

export function buildRetentionSettlementDraft(input: RetentionEvaluationInput): RetentionSettlementDraft {
    const departureExceptionSummary = input.departureDecision?.decisionSummary ?? null;
    const retentionReceiptSummary = input.retentionReceipt ? formatRetentionReceiptSummary(input.retentionReceipt) : null;
    const unmetRequirements = buildUnmetRequirements(input);

    if (input.markAsSettled) {
        return {
            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_SETTLED_ALL,
            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionDueDate: input.retentionDue.retentionDueDate,
            retentionDueStatus: input.retentionDue.retentionDueStatus,
            retentionRequirementSummary: null,
            retentionReceiptSummary,
            departureExceptionSummary,
            ruleExplanation: {
                currentStageStatus: CURRENT_STAGE_STATUS_SETTLED_RETENTION,
                gateDecisionCode: CommissionRuleExplanationGateDecisionValue.SettledRetention,
                blockingReasonCategory: null,
                blockingReasonCode: null,
                blockingReasonSummary: null,
                gateDecisionSummary: '当前非质保部分与质保金部分均已结清。',
                nextActionSummary: null
            }
        };
    }

    const gateSeverity = getGateSeverity(input.gateBindingAction, input.gateReviewDecision);

    if (input.openFreezeDispute) {
        return {
            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
            retentionDueDate: input.retentionDue.retentionDueDate,
            retentionDueStatus: input.retentionDue.retentionDueStatus,
            retentionRequirementSummary: '待重大争议收口',
            retentionReceiptSummary,
            departureExceptionSummary,
            ruleExplanation: {
                currentStageStatus: CURRENT_STAGE_STATUS_BLOCKED_RETENTION,
                gateDecisionCode: CommissionRuleExplanationGateDecisionValue.BlockRetention,
                blockingReasonCategory: 'exception',
                blockingReasonCode: 'FREEZE_DISPUTE_PENDING',
                blockingReasonSummary: '当前冻结版本存在待仲裁争议，后续发放已进入受控暂停。',
                gateDecisionSummary: '当前暂不能进入质保金结算。',
                nextActionSummary: '请先完成冻结后争议仲裁，再复核质保金结算。'
            }
        };
    }

    if (input.retentionDue.retentionDueStatus === CommissionRetentionDueStatusValue.Missing) {
        return {
            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
            retentionDueDate: null,
            retentionDueStatus: input.retentionDue.retentionDueStatus,
            retentionRequirementSummary: buildRequirementSummary(unmetRequirements),
            retentionReceiptSummary,
            departureExceptionSummary,
            ruleExplanation: {
                currentStageStatus: CURRENT_STAGE_STATUS_BLOCKED_RETENTION,
                gateDecisionCode: CommissionRuleExplanationGateDecisionValue.BlockRetention,
                blockingReasonCategory: 'retention',
                blockingReasonCode: 'RETENTION_DUE_FACT_MISSING',
                blockingReasonSummary: '当前有效合同条款缺少质保期届满日期，暂不能进入质保金结算。',
                gateDecisionSummary: '当前暂不能进入质保金结算。',
                nextActionSummary: '请先补齐当前有效合同条款的质保期届满日期，再复核质保金结算。'
            }
        };
    }

    if (input.retentionDue.retentionDueStatus === CommissionRetentionDueStatusValue.Pending) {
        return {
            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
            retentionDueDate: input.retentionDue.retentionDueDate,
            retentionDueStatus: input.retentionDue.retentionDueStatus,
            retentionRequirementSummary: buildRequirementSummary(unmetRequirements),
            retentionReceiptSummary,
            departureExceptionSummary,
            ruleExplanation: {
                currentStageStatus: CURRENT_STAGE_STATUS_BLOCKED_RETENTION,
                gateDecisionCode: CommissionRuleExplanationGateDecisionValue.BlockRetention,
                blockingReasonCategory: 'retention',
                blockingReasonCode: 'RETENTION_DUE_PENDING',
                blockingReasonSummary: '当前质保期尚未届满。',
                gateDecisionSummary: '当前暂不能进入质保金结算。',
                nextActionSummary: '请待合同约定质保期届满后再复核质保金结算。'
            }
        };
    }

    if (!input.departureDecision) {
        return {
            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
            retentionDueDate: input.retentionDue.retentionDueDate,
            retentionDueStatus: input.retentionDue.retentionDueStatus,
            retentionRequirementSummary: buildRequirementSummary(unmetRequirements),
            retentionReceiptSummary,
            departureExceptionSummary,
            ruleExplanation: {
                currentStageStatus: CURRENT_STAGE_STATUS_BLOCKED_RETENTION,
                gateDecisionCode: CommissionRuleExplanationGateDecisionValue.BlockRetention,
                blockingReasonCategory: 'exception',
                blockingReasonCode: 'DEPARTURE_EXCEPTION_PENDING',
                blockingReasonSummary: '离职 / 特例结论尚未明确。',
                gateDecisionSummary: '当前暂不能进入质保金结算。',
                nextActionSummary: '请先创建当前有效离职 / 特例结论，再复核质保金结算。'
            }
        };
    }

    if (hasText(input.departureDecision.confirmationRequirementSummary)) {
        const confirmationRequirementSummary = input.departureDecision.confirmationRequirementSummary.trim();
        return {
            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
            retentionDueDate: input.retentionDue.retentionDueDate,
            retentionDueStatus: input.retentionDue.retentionDueStatus,
            retentionRequirementSummary: confirmationRequirementSummary,
            retentionReceiptSummary,
            departureExceptionSummary,
            ruleExplanation: {
                currentStageStatus: CURRENT_STAGE_STATUS_BLOCKED_RETENTION,
                gateDecisionCode: CommissionRuleExplanationGateDecisionValue.BlockRetention,
                blockingReasonCategory: 'special-case',
                blockingReasonCode: 'DEPARTURE_CONFIRMATION_PENDING',
                blockingReasonSummary: confirmationRequirementSummary,
                gateDecisionSummary: '当前涉及离职 / 特例限制，暂不能进入质保金结算。',
                nextActionSummary: '请先完成责任承接确认，再复核质保金结算。'
            }
        };
    }

    if (!input.retentionReceipt) {
        return {
            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
            retentionDueDate: input.retentionDue.retentionDueDate,
            retentionDueStatus: input.retentionDue.retentionDueStatus,
            retentionRequirementSummary: '待质保金到账',
            retentionReceiptSummary,
            departureExceptionSummary,
            ruleExplanation: {
                currentStageStatus: CURRENT_STAGE_STATUS_BLOCKED_RETENTION,
                gateDecisionCode: CommissionRuleExplanationGateDecisionValue.BlockRetention,
                blockingReasonCategory: 'retention',
                blockingReasonCode: 'RETENTION_RECEIPT_PENDING',
                blockingReasonSummary: '质保金尚未到账。',
                gateDecisionSummary: '当前暂不能进入质保金结算。',
                nextActionSummary: '请财务确认质保金到账后再复核。'
            }
        };
    }

    if (gateSeverity) {
        return {
            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
            retentionDueDate: input.retentionDue.retentionDueDate,
            retentionDueStatus: input.retentionDue.retentionDueStatus,
            retentionRequirementSummary: '待经营依据复核完成',
            retentionReceiptSummary,
            departureExceptionSummary,
            ruleExplanation: {
                currentStageStatus: CURRENT_STAGE_STATUS_BLOCKED_RETENTION,
                gateDecisionCode:
                    gateSeverity === 'block'
                        ? CommissionRuleExplanationGateDecisionValue.BlockRetention
                        : CommissionRuleExplanationGateDecisionValue.ReviewRetention,
                blockingReasonCategory: 'operating-risk',
                blockingReasonCode:
                    input.gateReviewBlockingReasonCode?.trim() ||
                    (gateSeverity === 'block' ? 'FINAL_GATE_BLOCKED' : 'FINAL_GATE_REVIEW_PENDING'),
                blockingReasonSummary:
                    gateSeverity === 'block'
                        ? '当前经营依据已阻断质保金结算。'
                        : '当前经营依据仍待复核，暂不能进入质保金结算。',
                gateDecisionSummary:
                    gateSeverity === 'block'
                        ? '当前已被经营风险阻断，暂不能进入质保金结算。'
                        : '当前待补条件，暂不能进入质保金结算。',
                nextActionSummary: input.gateNextActionSummary?.trim() || '请先完成经营核算复核，再处理质保金结算。'
            }
        };
    }

    return {
        finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
        nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
        retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_READY,
        retentionDueDate: input.retentionDue.retentionDueDate,
        retentionDueStatus: input.retentionDue.retentionDueStatus,
        retentionRequirementSummary: '当前质保金已具备结算条件',
        retentionReceiptSummary,
        departureExceptionSummary,
        ruleExplanation: {
            currentStageStatus: CURRENT_STAGE_STATUS_READY_RETENTION,
            gateDecisionCode: CommissionRuleExplanationGateDecisionValue.AllowRetention,
            blockingReasonCategory: null,
            blockingReasonCode: null,
            blockingReasonSummary: null,
            gateDecisionSummary: '当前质保金已到账，且无重大争议，可进入质保金结算。',
            nextActionSummary: '请提交质保金结算审批并登记发放。'
        }
    };
}

export function evaluateRetentionDueDate(value: Date | string | null | undefined, now = new Date()): RetentionDueEvaluation {
    const retentionDueDate = toBusinessDateOnly(value);
    if (!retentionDueDate) {
        return {
            retentionDueDate: null,
            retentionDueStatus: CommissionRetentionDueStatusValue.Missing
        };
    }

    return {
        retentionDueDate,
        retentionDueStatus:
            retentionDueDate <= toBusinessDateString(now)
                ? CommissionRetentionDueStatusValue.Due
                : CommissionRetentionDueStatusValue.Pending
    };
}

function buildRequirementSummary(requirements: string[]): string {
    if (requirements.length === 0) {
        return '当前质保金已具备结算条件';
    }
    return `待${requirements.join('、')}`;
}

function buildUnmetRequirements(input: RetentionEvaluationInput): string[] {
    const requirements: string[] = [];
    if (input.retentionDue.retentionDueStatus === CommissionRetentionDueStatusValue.Missing) {
        requirements.push('补齐合同质保期届满日期');
    } else if (input.retentionDue.retentionDueStatus === CommissionRetentionDueStatusValue.Pending) {
        requirements.push('质保期届满');
    }
    if (!input.departureDecision) {
        requirements.push('离职 / 特例结论明确');
    }
    if (!input.retentionReceipt) {
        requirements.push('质保金到账');
    }
    return requirements;
}

function formatRetentionReceiptSummary(receipt: SettlementReceiptSummary): string {
    const receiptDate = toBusinessDateString(receipt.receiptDate);
    const receiptAmount = typeof receipt.receiptAmount === 'string' ? receipt.receiptAmount : receipt.receiptAmount.toFixed(2);
    return `质保金到账：${receiptDate} / ${receiptAmount}`;
}

function getGateSeverity(bindingAction?: string | null, gateReviewDecision?: string | null): 'block' | 'review' | null {
    const normalized = [bindingAction, gateReviewDecision]
        .map((value) => value?.trim().toUpperCase())
        .filter((value): value is string => Boolean(value));

    if (normalized.some((value) => value === 'BLOCK' || value.startsWith('BLOCK_'))) {
        return 'block';
    }
    if (normalized.some((value) => value === 'REVIEW' || value.startsWith('REVIEW_'))) {
        return 'review';
    }
    return null;
}

function hasText(value?: string | null): value is string {
    return Boolean(value && value.trim().length > 0);
}
