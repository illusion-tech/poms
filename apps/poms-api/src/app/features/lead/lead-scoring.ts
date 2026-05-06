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
    componentBreakdown: LeadScoreComponentBreakdown;
}

export interface LeadScoreComponentBreakdown {
    source: number;
    demand: number;
    budget: number;
    amount: number;
    urgency: number;
    expectedDecisionDate: number;
    owner: number;
    baseBusiness: number;
    salesIntelligence: number;
    followUpActivity: number;
    attachmentEvidence: number;
    total: number;
    formulaVersion: typeof LEAD_SCORE_FORMULA_VERSION;
    salesIntelligenceFacts: LeadScoreSalesIntelligenceFactSummary;
    followUpFacts: LeadScoreFollowUpFactSummary;
    attachmentFacts: LeadScoreAttachmentFactSummary;
}

export interface LeadScoreSalesIntelligenceFactSummary {
    decisionMakerKnown: boolean;
    technicalEvaluatorKnown: boolean;
    procurementProcessKnown: boolean;
    budgetSourceKnown: boolean;
    competitorKnown: boolean;
    painPointKnown: boolean;
    nextContactKnown: boolean;
}

export interface LeadScoreFollowUpFactSummary {
    lastFollowUpAt: string | null;
    daysSinceLastFollowUp: number | null;
    followUpCount30d: number;
    hasPlannedNextFollowUp: boolean;
    nextFollowUpAt: string | null;
    nextFollowUpOverdue: boolean;
}

export interface LeadScoreAttachmentFactSummary {
    evidenceAttachmentCount: number;
    hasProposalAttachment: boolean;
    hasQuotationAttachment: boolean;
    hasBudgetEvidenceAttachment: boolean;
    latestAttachmentCount: number;
    finalAttachmentCount: number;
}

export interface LeadScoreV2FactSummary {
    salesIntelligence: LeadScoreSalesIntelligenceFactSummary;
    followUp: LeadScoreFollowUpFactSummary;
    attachmentEvidence: LeadScoreAttachmentFactSummary;
}

export const LEAD_SCORE_FORMULA_VERSION = 'lead-score-v2';

export const EMPTY_LEAD_SCORE_V2_FACT_SUMMARY: LeadScoreV2FactSummary = {
    salesIntelligence: {
        decisionMakerKnown: false,
        technicalEvaluatorKnown: false,
        procurementProcessKnown: false,
        budgetSourceKnown: false,
        competitorKnown: false,
        painPointKnown: false,
        nextContactKnown: false
    },
    followUp: {
        lastFollowUpAt: null,
        daysSinceLastFollowUp: null,
        followUpCount30d: 0,
        hasPlannedNextFollowUp: false,
        nextFollowUpAt: null,
        nextFollowUpOverdue: false
    },
    attachmentEvidence: {
        evidenceAttachmentCount: 0,
        hasProposalAttachment: false,
        hasQuotationAttachment: false,
        hasBudgetEvidenceAttachment: false,
        latestAttachmentCount: 0,
        finalAttachmentCount: 0
    }
};

export function calculateLeadScore(input: LeadGateInput, facts: LeadScoreV2FactSummary = EMPTY_LEAD_SCORE_V2_FACT_SUMMARY): LeadScoreSnapshot {
    const components: string[] = [];
    const breakdown = buildLeadScoreComponentBreakdown(input, facts);
    const score = breakdown.total;

    const add = (label: string, points: number) => {
        if (points <= 0) {
            return;
        }
        components.push(`${label}+${points}`);
    };

    add('基础商务', breakdown.baseBusiness);
    add('销售情报', breakdown.salesIntelligence);
    add('跟进活跃', breakdown.followUpActivity);
    add('附件证据', breakdown.attachmentEvidence);

    const cappedScore = Math.min(score, 100);
    return {
        score: cappedScore,
        rating: resolveLeadRating(cappedScore),
        scoreReason: components.length > 0 ? components.join('；') : '暂无有效评分事实',
        componentBreakdown: {
            ...breakdown,
            total: cappedScore
        }
    };
}

export function buildLeadScoreComponentBreakdown(input: LeadGateInput, facts: LeadScoreV2FactSummary = EMPTY_LEAD_SCORE_V2_FACT_SUMMARY): LeadScoreComponentBreakdown {
    const demandLength = input.demandDescription?.trim().length ?? 0;
    const baseFacts = {
        source: input.sourceId ? 10 : 0,
        demand: demandLength >= 30 ? 15 : demandLength > 0 ? 10 : 0,
        budget: resolveBudgetScore(input.budgetStatus),
        amount: parsePositiveAmount(input.estimatedAmount) ? 15 : 0,
        urgency: resolveUrgencyScore(input.urgency),
        expectedDecisionDate: input.expectedDecisionDate ? 10 : 0,
        owner: input.ownerUserId && input.ownerOrgId ? 10 : 0
    };
    const baseRaw = Object.values(baseFacts).reduce((sum, points) => sum + points, 0);
    const baseBusiness = Math.round(Math.min(baseRaw, 100) * 0.65);
    const salesIntelligence = resolveSalesIntelligenceScore(facts.salesIntelligence);
    const followUpActivity = resolveFollowUpActivityScore(facts.followUp);
    const attachmentEvidence = resolveAttachmentEvidenceScore(facts.attachmentEvidence);
    const total = Math.min(baseBusiness + salesIntelligence + followUpActivity + attachmentEvidence, 100);

    return {
        ...baseFacts,
        baseBusiness,
        salesIntelligence,
        followUpActivity,
        attachmentEvidence,
        total,
        formulaVersion: LEAD_SCORE_FORMULA_VERSION,
        salesIntelligenceFacts: { ...facts.salesIntelligence },
        followUpFacts: { ...facts.followUp },
        attachmentFacts: { ...facts.attachmentEvidence }
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

function resolveSalesIntelligenceScore(facts: LeadScoreSalesIntelligenceFactSummary): number {
    return Math.min(
        (facts.decisionMakerKnown ? 4 : 0) +
            (facts.technicalEvaluatorKnown ? 3 : 0) +
            (facts.procurementProcessKnown ? 3 : 0) +
            (facts.budgetSourceKnown ? 3 : 0) +
            (facts.competitorKnown ? 2 : 0) +
            (facts.painPointKnown ? 3 : 0) +
            (facts.nextContactKnown ? 2 : 0),
        20
    );
}

function resolveFollowUpActivityScore(facts: LeadScoreFollowUpFactSummary): number {
    const countScore = facts.followUpCount30d >= 3 ? 4 : facts.followUpCount30d > 0 ? 2 : 0;
    const recencyScore = facts.daysSinceLastFollowUp === null ? 0 : facts.daysSinceLastFollowUp <= 7 ? 3 : facts.daysSinceLastFollowUp <= 14 ? 2 : facts.daysSinceLastFollowUp <= 30 ? 1 : 0;
    const planScore = facts.hasPlannedNextFollowUp ? (facts.nextFollowUpOverdue ? 0 : 3) : 0;

    return Math.min(countScore + recencyScore + planScore, 10);
}

function resolveAttachmentEvidenceScore(facts: LeadScoreAttachmentFactSummary): number {
    return Math.min((facts.hasProposalAttachment ? 2 : 0) + (facts.hasQuotationAttachment ? 2 : 0) + (facts.hasBudgetEvidenceAttachment ? 1 : 0), 5);
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
