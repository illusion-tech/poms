import {
    LeadBudgetStatusValue,
    LeadGateMissingItemLabel,
    LeadGateMissingItemValue,
    LeadGateStatusValue,
    LeadRatingValue,
    LeadStatusValue,
    LeadUrgencyValue,
    type LeadBudgetStatus,
    type LeadGateCheck,
    type LeadGateMissingItem,
    type LeadGateSummary,
    type LeadRating,
    type LeadStatus,
    type LeadUrgency
} from '@poms/shared-contracts';

export interface LeadGateInput {
    sourceId?: string | null;
    demandDescription?: string | null;
    budgetStatus: LeadBudgetStatus;
    estimatedAmount?: string | null;
    urgency?: LeadUrgency | null;
    expectedDecisionDate?: string | Date | null;
    ownerUserId?: string | null;
    ownerOrgId?: string | null;
    status: LeadStatus;
    convertedProjectId?: string | null;
}

export interface LeadScoreSnapshot {
    score: number;
    rating: LeadRating;
    scoreReason: string;
}

export interface LeadScoreComponentBreakdown {
    source: number;
    demand: number;
    budget: number;
    amount: number;
    urgency: number;
    expectedDecisionDate: number;
    owner: number;
}

export function calculateLeadScore(input: LeadGateInput): LeadScoreSnapshot {
    const components: string[] = [];
    const breakdown = buildLeadScoreComponentBreakdown(input);
    let score = 0;

    const add = (label: string, points: number) => {
        if (points <= 0) {
            return;
        }
        score += points;
        components.push(`${label}+${points}`);
    };

    add('来源', breakdown.source);
    add('需求', breakdown.demand);
    add('预算', breakdown.budget);
    add('金额', breakdown.amount);
    add('紧迫', breakdown.urgency);
    add('决策日期', breakdown.expectedDecisionDate);
    add('主责', breakdown.owner);

    const cappedScore = Math.min(score, 100);
    return {
        score: cappedScore,
        rating: resolveLeadRating(cappedScore),
        scoreReason: components.length > 0 ? components.join('；') : '暂无有效评分事实'
    };
}

export function buildLeadScoreComponentBreakdown(input: LeadGateInput): LeadScoreComponentBreakdown {
    const demandLength = input.demandDescription?.trim().length ?? 0;

    return {
        source: input.sourceId ? 10 : 0,
        demand: demandLength >= 30 ? 15 : demandLength > 0 ? 10 : 0,
        budget: resolveBudgetScore(input.budgetStatus),
        amount: parsePositiveAmount(input.estimatedAmount) ? 15 : 0,
        urgency: resolveUrgencyScore(input.urgency),
        expectedDecisionDate: input.expectedDecisionDate ? 10 : 0,
        owner: input.ownerUserId && input.ownerOrgId ? 10 : 0
    };
}

export function buildLeadGateSummary(input: LeadGateInput): LeadGateSummary {
    return {
        qualification: buildGateCheck(collectLeadGateMissingItems(input, 'qualification'), 'qualification'),
        conversion: buildGateCheck(collectLeadGateMissingItems(input, 'conversion'), 'conversion')
    };
}

export function collectLeadGateMissingItems(input: LeadGateInput, gate: 'qualification' | 'conversion'): LeadGateMissingItem[] {
    const missing: LeadGateMissingItem[] = [];

    if (input.status === LeadStatusValue.Closed) {
        missing.push(LeadGateMissingItemValue.NotClosed);
    }

    if (gate === 'qualification') {
        if (input.status !== LeadStatusValue.Registered) {
            missing.push(LeadGateMissingItemValue.RegisteredStatus);
        }
    } else {
        if (input.status === LeadStatusValue.Converted || input.convertedProjectId) {
            missing.push(LeadGateMissingItemValue.NotConverted);
        }
        if (input.status !== LeadStatusValue.Qualified) {
            missing.push(LeadGateMissingItemValue.QualifiedStatus);
        }
    }

    if (!input.sourceId) missing.push(LeadGateMissingItemValue.Source);
    if (!input.demandDescription?.trim()) missing.push(LeadGateMissingItemValue.DemandDescription);
    if (input.budgetStatus === LeadBudgetStatusValue.Unknown || input.budgetStatus === LeadBudgetStatusValue.NoBudget) missing.push(LeadGateMissingItemValue.Budget);
    if (!parsePositiveAmount(input.estimatedAmount)) missing.push(LeadGateMissingItemValue.EstimatedAmount);
    if (!input.urgency) missing.push(LeadGateMissingItemValue.Urgency);
    if (!input.ownerUserId) missing.push(LeadGateMissingItemValue.Owner);
    if (!input.ownerOrgId) missing.push(LeadGateMissingItemValue.OwnerOrg);

    return [...new Set(missing)];
}

function buildGateCheck(missingItems: LeadGateMissingItem[], gate: 'qualification' | 'conversion'): LeadGateCheck {
    if (missingItems.length === 0) {
        return {
            status: LeadGateStatusValue.Ready,
            missingItems: [],
            explanation: gate === 'qualification' ? '已满足确认有效硬闸口' : '已满足转项目硬闸口'
        };
    }

    return {
        status: LeadGateStatusValue.Blocked,
        missingItems,
        explanation: `缺少：${missingItems.map((item) => LeadGateMissingItemLabel[item]).join('、')}`
    };
}

function resolveBudgetScore(status: LeadBudgetStatus): number {
    switch (status) {
        case LeadBudgetStatusValue.RoughBudget:
            return 15;
        case LeadBudgetStatusValue.BudgetConfirmed:
            return 20;
        case LeadBudgetStatusValue.BudgetApproved:
            return 25;
        default:
            return 0;
    }
}

function resolveUrgencyScore(urgency: LeadUrgency | null | undefined): number {
    switch (urgency) {
        case LeadUrgencyValue.Low:
            return 5;
        case LeadUrgencyValue.Normal:
            return 10;
        case LeadUrgencyValue.High:
        case LeadUrgencyValue.Critical:
            return 15;
        default:
            return 0;
    }
}

export function resolveLeadRating(score: number): LeadRating {
    if (score >= 80) return LeadRatingValue.A;
    if (score >= 60) return LeadRatingValue.B;
    if (score >= 40) return LeadRatingValue.C;
    return LeadRatingValue.D;
}

function parsePositiveAmount(value: string | null | undefined): boolean {
    if (!value) {
        return false;
    }

    return Number(value) > 0;
}
