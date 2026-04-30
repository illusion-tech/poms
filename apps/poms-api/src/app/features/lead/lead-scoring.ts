import type { LeadBudgetStatus, LeadGateCheck, LeadGateMissingItem, LeadGateSummary, LeadRating, LeadStatus, LeadUrgency } from '@poms/shared-contracts';

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

const missingItemLabels: Record<LeadGateMissingItem, string> = {
    source: '线索来源',
    'demand-description': '需求描述',
    budget: '预算情况',
    'estimated-amount': '预计金额',
    urgency: '紧迫程度',
    owner: '销售主责人',
    'owner-org': '销售主责组织',
    'registered-status': '待确认状态',
    'qualified-status': '已确认有效状态',
    'not-converted': '未转项目状态',
    'not-closed': '未关闭状态'
};

export function calculateLeadScore(input: LeadGateInput): LeadScoreSnapshot {
    const components: string[] = [];
    let score = 0;

    const add = (label: string, points: number) => {
        if (points <= 0) {
            return;
        }
        score += points;
        components.push(`${label}+${points}`);
    };

    add('来源', input.sourceId ? 10 : 0);

    const demandLength = input.demandDescription?.trim().length ?? 0;
    add('需求', demandLength >= 30 ? 15 : demandLength > 0 ? 10 : 0);

    add('预算', resolveBudgetScore(input.budgetStatus));
    add('金额', parsePositiveAmount(input.estimatedAmount) ? 15 : 0);
    add('紧迫', resolveUrgencyScore(input.urgency));
    add('决策日期', input.expectedDecisionDate ? 10 : 0);
    add('主责', input.ownerUserId && input.ownerOrgId ? 10 : 0);

    const cappedScore = Math.min(score, 100);
    return {
        score: cappedScore,
        rating: resolveLeadRating(cappedScore),
        scoreReason: components.length > 0 ? components.join('；') : '暂无有效评分事实'
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

    if (input.status === 'closed') {
        missing.push('not-closed');
    }

    if (gate === 'qualification') {
        if (input.status !== 'registered') {
            missing.push('registered-status');
        }
    } else {
        if (input.status === 'converted' || input.convertedProjectId) {
            missing.push('not-converted');
        }
        if (input.status !== 'qualified') {
            missing.push('qualified-status');
        }
    }

    if (!input.sourceId) missing.push('source');
    if (!input.demandDescription?.trim()) missing.push('demand-description');
    if (input.budgetStatus === 'unknown' || input.budgetStatus === 'no-budget') missing.push('budget');
    if (!parsePositiveAmount(input.estimatedAmount)) missing.push('estimated-amount');
    if (!input.urgency) missing.push('urgency');
    if (!input.ownerUserId) missing.push('owner');
    if (!input.ownerOrgId) missing.push('owner-org');

    return [...new Set(missing)];
}

function buildGateCheck(missingItems: LeadGateMissingItem[], gate: 'qualification' | 'conversion'): LeadGateCheck {
    if (missingItems.length === 0) {
        return {
            status: 'ready',
            missingItems: [],
            explanation: gate === 'qualification' ? '已满足确认有效硬闸口' : '已满足转项目硬闸口'
        };
    }

    return {
        status: 'blocked',
        missingItems,
        explanation: `缺少：${missingItems.map((item) => missingItemLabels[item]).join('、')}`
    };
}

function resolveBudgetScore(status: LeadBudgetStatus): number {
    switch (status) {
        case 'rough-budget':
            return 15;
        case 'budget-confirmed':
            return 20;
        case 'budget-approved':
            return 25;
        default:
            return 0;
    }
}

function resolveUrgencyScore(urgency: LeadUrgency | null | undefined): number {
    switch (urgency) {
        case 'low':
            return 5;
        case 'normal':
            return 10;
        case 'high':
        case 'critical':
            return 15;
        default:
            return 0;
    }
}

function resolveLeadRating(score: number): LeadRating {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
}

function parsePositiveAmount(value: string | null | undefined): boolean {
    if (!value) {
        return false;
    }

    return Number(value) > 0;
}
