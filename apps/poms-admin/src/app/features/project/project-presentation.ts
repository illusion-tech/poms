export type UiTagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined;

export interface ProjectWorkspaceGuide {
    currentStep: string;
    nextStep: string;
    currentGap: string;
    owner: string;
}

const PROJECT_STAGE_LABELS: Record<string, string> = {
    assessment: '立项评估',
    'scope-confirmation': '范围确认',
    'commercial-closure': '商务收口',
    contracting: '签约中',
    handover: '项目移交',
    execution: '正式执行',
    acceptance: '验收确认',
    completed: '已完成',
    lead: '线索',
    opportunity: '商机',
    proposal: '方案',
    negotiation: '谈判'
};

const PROJECT_STAGE_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    assessment: 'secondary',
    'scope-confirmation': 'info',
    'commercial-closure': 'warn',
    contracting: 'warn',
    handover: 'warn',
    execution: 'success',
    acceptance: 'info',
    completed: 'contrast',
    lead: 'secondary',
    opportunity: 'info',
    proposal: 'info',
    negotiation: 'warn'
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
    active: '进行中',
    blocked: '阻塞中',
    completed: '已完成',
    draft: '草稿',
    closed_won: '已签约',
    closed_lost: '已丢单',
    'closed-lost': '已丢单',
    'closed-terminated': '已终止',
    suspended: '已暂停'
};

const PROJECT_STATUS_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    active: 'info',
    blocked: 'warn',
    completed: 'success',
    draft: 'secondary',
    closed_won: 'success',
    closed_lost: 'danger',
    'closed-lost': 'danger',
    'closed-terminated': 'danger',
    suspended: 'warn'
};

const ACTION_LEVEL_LABELS: Record<string, string> = {
    PROMPT: '提示',
    REVIEW: '复核',
    BLOCK: '阻断'
};

const ACTION_LEVEL_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    PROMPT: 'info',
    REVIEW: 'warn',
    BLOCK: 'danger'
};

const SIGNAL_LEVEL_LABELS: Record<string, string> = {
    STABLE: '稳定',
    ATTENTION: '关注',
    RISK: '风险'
};

const COMMISSION_SETTLEMENT_STATUS_LABELS: Record<string, string> = {
    'pending-final-settlement': '待最终结算',
    'pending-non-retention': '非质保待结算',
    'pending-retention-settlement': '质保金待结算',
    'waiting-retention': '待质保金条件',
    'ready-retention': '质保金可结算',
    settled: '已结清',
    'settled-non-retention': '非质保已结清',
    'settled-final': '最终结算已完成',
    'settled-retention': '质保金已结清'
};

const COMMISSION_SETTLEMENT_STATUS_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    'pending-final-settlement': 'warn',
    'pending-non-retention': 'info',
    'pending-retention-settlement': 'warn',
    'waiting-retention': 'warn',
    'ready-retention': 'info',
    settled: 'success',
    'settled-non-retention': 'success',
    'settled-final': 'success',
    'settled-retention': 'success'
};

const BASELINE_SELECTION_SOURCE_LABELS: Record<string, string> = {
    original: '原始经营基线',
    handover_rebaseline: '移交再基线化'
};

const FREEZE_VERSION_STATUS_LABELS: Record<string, string> = {
    draft: '草稿',
    frozen: '已冻结',
    superseded: '已被替代'
};

const FREEZE_VERSION_STATUS_SEVERITIES: Record<string, Exclude<UiTagSeverity, undefined>> = {
    draft: 'secondary',
    frozen: 'success',
    superseded: 'warn'
};

const COMMISSION_RULE_STAGE_LABELS: Record<string, string> = {
    'blocked-retention': '质保金结算阻塞',
    'blocked-final-settlement': '最终结算阻塞',
    'ready-final-settlement': '可进入最终结算',
    'ready-retention': '可进入质保金结算',
    settled: '已结清'
};

const COMMISSION_GATE_DECISION_LABELS: Record<string, string> = {
    BLOCK_RETENTION: '阻断质保金结算',
    BLOCK_FINAL_SETTLEMENT: '阻断最终结算',
    READY_FOR_FINAL_SETTLEMENT: '可进入最终结算',
    READY_FOR_RETENTION_SETTLEMENT: '可进入质保金结算',
    SETTLED: '已结清'
};

export function projectStageLabel(stage: string): string {
    return PROJECT_STAGE_LABELS[stage] ?? stage;
}

export function projectStageSeverity(stage: string): UiTagSeverity {
    return PROJECT_STAGE_SEVERITIES[stage];
}

export function projectStatusLabel(status: string): string {
    return PROJECT_STATUS_LABELS[status] ?? status;
}

export function projectStatusSeverity(status: string): UiTagSeverity {
    return PROJECT_STATUS_SEVERITIES[status];
}

export function actionLevelLabel(level: string | null | undefined): string {
    if (!level) {
        return '待判断';
    }
    return ACTION_LEVEL_LABELS[level.toUpperCase()] ?? level;
}

export function actionLevelSeverity(level: string | null | undefined): UiTagSeverity {
    if (!level) {
        return 'secondary';
    }
    return ACTION_LEVEL_SEVERITIES[level.toUpperCase()] ?? 'secondary';
}

export function signalLevelLabel(level: string | null | undefined): string {
    if (!level) {
        return '待判断';
    }
    return SIGNAL_LEVEL_LABELS[level.toUpperCase()] ?? level;
}

export function commissionSettlementStatusLabel(status: string | null | undefined): string {
    if (!status) {
        return '待判断';
    }
    return COMMISSION_SETTLEMENT_STATUS_LABELS[status] ?? status;
}

export function commissionSettlementStatusSeverity(status: string | null | undefined): UiTagSeverity {
    if (!status) {
        return 'secondary';
    }
    return COMMISSION_SETTLEMENT_STATUS_SEVERITIES[status] ?? 'secondary';
}

export function baselineSelectionSourceLabel(source: string | null | undefined): string {
    if (!source) {
        return '待确认';
    }
    return BASELINE_SELECTION_SOURCE_LABELS[source] ?? source;
}

export function freezeVersionStatusLabel(status: string | null | undefined): string {
    if (!status) {
        return '待确认';
    }
    return FREEZE_VERSION_STATUS_LABELS[status] ?? status;
}

export function freezeVersionStatusSeverity(status: string | null | undefined): UiTagSeverity {
    if (!status) {
        return 'secondary';
    }
    return FREEZE_VERSION_STATUS_SEVERITIES[status] ?? 'secondary';
}

export function commissionRuleStageLabel(status: string | null | undefined): string {
    if (!status) {
        return '待判断';
    }
    return COMMISSION_RULE_STAGE_LABELS[status] ?? status;
}

export function gateDecisionLabel(code: string | null | undefined): string {
    if (!code) {
        return '待判断';
    }
    return COMMISSION_GATE_DECISION_LABELS[code] ?? code;
}

export function gateDecisionSeverity(code: string | null | undefined): UiTagSeverity {
    if (!code) {
        return 'secondary';
    }

    if (code.startsWith('BLOCK')) {
        return 'danger';
    }
    if (code.startsWith('READY') || code === 'SETTLED') {
        return 'success';
    }
    if (code.startsWith('REVIEW')) {
        return 'warn';
    }

    return 'secondary';
}

export function formatAmount(value: string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '--';
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return value;
    }

    return parsed.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    });
}

export function projectOwnerSummary(project: {
    ownerUserId?: string | null;
    ownerOrgId?: string | null;
}): string {
    if (project.ownerUserId) {
        return `用户 ${project.ownerUserId}`;
    }
    if (project.ownerOrgId) {
        return `组织 ${project.ownerOrgId}`;
    }
    return '待指定';
}

export function projectWorkspaceGuide(project: {
    currentStage: string;
    status: string;
    ownerUserId?: string | null;
    ownerOrgId?: string | null;
}): ProjectWorkspaceGuide {
    if (project.status === 'blocked') {
        return {
            currentStep: '先消除当前阻塞',
            nextStep: '恢复主线推进后再进入对应工作区处理',
            currentGap: '项目当前被标记为阻塞，后续阶段判断不能作为有效结论',
            owner: projectOwnerSummary(project)
        };
    }

    switch (project.currentStage) {
        case 'assessment':
            return {
                currentStep: '完成立项评估与机会判断',
                nextStep: '确认范围后进入范围确认阶段',
                currentGap: '未形成明确范围与投入边界前，不进入商务收口',
                owner: '销售负责人 / 方案负责人'
            };
        case 'scope-confirmation':
            return {
                currentStep: '收口技术边界、排除项与前期成本',
                nextStep: '商务条件成熟后进入商务收口',
                currentGap: '范围、风险与估算未冻结前，不进入报价与签约准备',
                owner: '方案负责人 / 技术支持'
            };
        case 'commercial-closure':
            return {
                currentStep: '统一报价、投标和成交条件判断',
                nextStep: '满足签约前置条件后进入签约',
                currentGap: '签约前工作区尚未前端化，本轮先补项目级执行工作区骨架',
                owner: '销售负责人 / 商务负责人'
            };
        case 'contracting':
            return {
                currentStep: '完成合同登记、生效和责任交接准备',
                nextStep: '移交确认后进入项目移交阶段',
                currentGap: '合同主链与移交工作区仍待后续切片前端化',
                owner: '商务行政 / 项目负责人'
            };
        case 'handover':
            return {
                currentStep: '完成移交确认并冻结下游责任边界',
                nextStep: '移交完成后进入正式执行',
                currentGap: '移交工作区仍待单独前端切片，不在本轮读取页范围内',
                owner: '销售 / 技术支持 / 项目负责人'
            };
        case 'acceptance':
            return {
                currentStep: '核对验收事实与收尾条件',
                nextStep: '满足完成条件后进入完成态',
                currentGap: '最终结算与规则解释读取页已可查看，但质保金写侧和收尾执行链仍待后续切片',
                owner: '项目负责人 / 业务确认角色'
            };
        case 'completed':
            return {
                currentStep: '项目主线已收口',
                nextStep: '查看最终结算、规则解释与归档结果',
                currentGap: '最终结算读取链已具备，归档与剩余收尾写侧仍待后续切片',
                owner: projectOwnerSummary(project)
            };
        case 'execution':
        default:
            return {
                currentStep: '围绕项目经营口径、偏差风险和提成 gate 持续推进',
                nextStep: '优先查看经营总览、偏差风险和阶段闸口解释',
                currentGap: '若未形成有效经营快照、信号评价或 gate 绑定，L4/L5 读取页会直接显示阻塞',
                owner: '项目负责人 / 经营核算角色'
            };
    }
}
