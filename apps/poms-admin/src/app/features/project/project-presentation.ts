import {
    BaselineSelectionSource,
    CommissionFinalSettlementStatus,
    CommissionNonRetentionSettlementStatus,
    CommissionRetentionSettlementStatus,
    CommissionRoleAssignmentStatus,
    CommissionRuleExplanationGateDecision,
    CommissionRuleExplanationStageStatus,
    OperatingDataMaturityLevel,
    OperatingRiskLevel,
    OperatingSignalLevel,
    OperatingSnapshotActionLevel
} from '@poms/admin-data-access';
import type { UiTagSeverityValue } from '../../shared/ui/ui-severity';

export type { UiTagSeverity } from '../../shared/ui/ui-severity';
export {
    projectStageLabel,
    projectStageLabelOrFallback,
    projectStageSeverity,
    projectStageSeverityOrFallback,
    projectStatusLabel,
    projectStatusLabelOrFallback,
    projectStatusSeverity,
    projectStatusSeverityOrFallback
} from '../../shared/ui/status-presentation';

export interface ProjectWorkspaceGuide {
    currentStep: string;
    nextStep: string;
    currentGap: string;
    owner: string;
}

const ACTION_LEVEL_LABELS = {
    [OperatingSnapshotActionLevel.Prompt]: '提示',
    [OperatingSnapshotActionLevel.Review]: '复核',
    [OperatingSnapshotActionLevel.Block]: '阻断'
} as const satisfies Record<OperatingSnapshotActionLevel, string>;

export type ActionLevelCode = OperatingSnapshotActionLevel;

const ACTION_LEVEL_SEVERITIES = {
    [OperatingSnapshotActionLevel.Prompt]: 'info',
    [OperatingSnapshotActionLevel.Review]: 'warn',
    [OperatingSnapshotActionLevel.Block]: 'danger'
} as const satisfies Record<ActionLevelCode, UiTagSeverityValue>;

export type SignalLevelCode = OperatingSignalLevel | OperatingRiskLevel;

const SIGNAL_LEVEL_LABELS: Readonly<Record<string, string>> = {
    [OperatingSignalLevel.Attention]: '关注',
    [OperatingSignalLevel.Alert]: '警报',
    [OperatingRiskLevel.Risk]: '风险'
};

const DATA_MATURITY_LEVEL_LABELS = {
    [OperatingDataMaturityLevel.Insufficient]: '数据不足',
    [OperatingDataMaturityLevel.Preliminary]: '初步可看',
    [OperatingDataMaturityLevel.Mature]: '成熟'
} as const satisfies Record<OperatingDataMaturityLevel, string>;

export type DataMaturityLevelCode = OperatingDataMaturityLevel;

const COMMISSION_SETTLEMENT_STATUS_LABELS = {
    [CommissionFinalSettlementStatus.PendingFinalSettlement]: '待最终结算',
    [CommissionFinalSettlementStatus.PendingRetentionSettlement]: '质保金待结算',
    [CommissionFinalSettlementStatus.SettledAll]: '全部结清',
    [CommissionNonRetentionSettlementStatus.PendingNonRetention]: '非质保待结算',
    [CommissionNonRetentionSettlementStatus.SettledNonRetention]: '非质保已结清',
    [CommissionRetentionSettlementStatus.WaitingRetention]: '待质保金条件',
    [CommissionRetentionSettlementStatus.ReadyRetention]: '质保金可结算',
    [CommissionRetentionSettlementStatus.SettledRetention]: '质保金已结清'
} as const satisfies Record<CommissionFinalSettlementStatus | CommissionNonRetentionSettlementStatus | CommissionRetentionSettlementStatus, string>;

export type CommissionSettlementStatusCode = CommissionFinalSettlementStatus | CommissionNonRetentionSettlementStatus | CommissionRetentionSettlementStatus;

const COMMISSION_SETTLEMENT_STATUS_SEVERITIES = {
    [CommissionFinalSettlementStatus.PendingFinalSettlement]: 'warn',
    [CommissionFinalSettlementStatus.PendingRetentionSettlement]: 'warn',
    [CommissionFinalSettlementStatus.SettledAll]: 'success',
    [CommissionNonRetentionSettlementStatus.PendingNonRetention]: 'info',
    [CommissionNonRetentionSettlementStatus.SettledNonRetention]: 'success',
    [CommissionRetentionSettlementStatus.WaitingRetention]: 'warn',
    [CommissionRetentionSettlementStatus.ReadyRetention]: 'info',
    [CommissionRetentionSettlementStatus.SettledRetention]: 'success'
} as const satisfies Record<CommissionSettlementStatusCode, UiTagSeverityValue>;

const BASELINE_SELECTION_SOURCE_LABELS = {
    [BaselineSelectionSource.Original]: '原始经营基线',
    [BaselineSelectionSource.HandoverRebaseline]: '移交再基线化'
} as const satisfies Record<BaselineSelectionSource, string>;

export type BaselineSelectionSourceCode = BaselineSelectionSource;

const FREEZE_VERSION_STATUS_LABELS = {
    [CommissionRoleAssignmentStatus.Draft]: '草稿',
    [CommissionRoleAssignmentStatus.Frozen]: '已冻结',
    [CommissionRoleAssignmentStatus.Superseded]: '已被替代'
} as const satisfies Record<CommissionRoleAssignmentStatus, string>;

export type FreezeVersionStatusCode = CommissionRoleAssignmentStatus;

const FREEZE_VERSION_STATUS_SEVERITIES = {
    [CommissionRoleAssignmentStatus.Draft]: 'secondary',
    [CommissionRoleAssignmentStatus.Frozen]: 'success',
    [CommissionRoleAssignmentStatus.Superseded]: 'warn'
} as const satisfies Record<FreezeVersionStatusCode, UiTagSeverityValue>;

const COMMISSION_RULE_STAGE_LABELS = {
    [CommissionRuleExplanationStageStatus.PendingFinalSettlement]: '待最终结算',
    [CommissionRuleExplanationStageStatus.BlockedRetention]: '质保金结算阻塞',
    [CommissionRuleExplanationStageStatus.ReadyRetention]: '可进入质保金结算',
    [CommissionRuleExplanationStageStatus.SettledRetention]: '质保金已结清'
} as const satisfies Record<CommissionRuleExplanationStageStatus, string>;

export type CommissionRuleStageCode = CommissionRuleExplanationStageStatus;

const COMMISSION_GATE_DECISION_LABELS = {
    [CommissionRuleExplanationGateDecision.AllowFinalSettlement]: '允许最终结算',
    [CommissionRuleExplanationGateDecision.SettledRetention]: '质保金已结清',
    [CommissionRuleExplanationGateDecision.BlockRetention]: '阻断质保金结算',
    [CommissionRuleExplanationGateDecision.ReviewRetention]: '复核质保金结算',
    [CommissionRuleExplanationGateDecision.AllowRetention]: '允许质保金结算'
} as const satisfies Record<CommissionRuleExplanationGateDecision, string>;

export type GateDecisionCode = CommissionRuleExplanationGateDecision;

function knownLabel<TLabels extends Readonly<Record<string, string>>, TCode extends keyof TLabels & string>(labels: TLabels, code: TCode): TLabels[TCode] {
    return labels[code];
}

function labelOrFallback<TLabels extends Readonly<Record<string, string>>>(labels: TLabels, value: string | null | undefined, fallback: string): string {
    if (!value) {
        return fallback;
    }

    return Object.prototype.hasOwnProperty.call(labels, value) ? labels[value as keyof TLabels] : value;
}

function normalizedLabelOrFallback<TLabels extends Readonly<Record<string, string>>>(labels: TLabels, value: string | null | undefined, fallback: string): string {
    if (!value) {
        return fallback;
    }

    const normalized = value.toUpperCase();
    return Object.prototype.hasOwnProperty.call(labels, normalized) ? labels[normalized as keyof TLabels] : value;
}

function knownSeverity<TCode extends string>(severities: Readonly<Record<TCode, UiTagSeverityValue>>, code: TCode): UiTagSeverityValue {
    return severities[code];
}

function severityOrFallback<TSeverities extends Readonly<Record<string, UiTagSeverityValue>>>(severities: TSeverities, value: string | null | undefined): UiTagSeverityValue {
    if (!value) {
        return 'secondary';
    }

    return Object.prototype.hasOwnProperty.call(severities, value) ? severities[value as keyof TSeverities] : 'secondary';
}

function normalizedSeverityOrFallback<TSeverities extends Readonly<Record<string, UiTagSeverityValue>>>(severities: TSeverities, value: string | null | undefined): UiTagSeverityValue {
    if (!value) {
        return 'secondary';
    }

    const normalized = value.toUpperCase();
    return Object.prototype.hasOwnProperty.call(severities, normalized) ? severities[normalized as keyof TSeverities] : 'secondary';
}

export function actionLevelLabel(level: ActionLevelCode): string {
    return knownLabel(ACTION_LEVEL_LABELS, level);
}

export function actionLevelSeverity(level: ActionLevelCode): UiTagSeverityValue {
    return knownSeverity(ACTION_LEVEL_SEVERITIES, level);
}

export function actionLevelLabelOrFallback(level: string | null | undefined): string {
    return normalizedLabelOrFallback(ACTION_LEVEL_LABELS, level, '待判断');
}

export function actionLevelSeverityOrFallback(level: string | null | undefined): UiTagSeverityValue {
    return normalizedSeverityOrFallback(ACTION_LEVEL_SEVERITIES, level);
}

export function signalLevelLabel(level: SignalLevelCode): string {
    return SIGNAL_LEVEL_LABELS[level];
}

export function signalLevelLabelOrFallback(level: string | null | undefined): string {
    return normalizedLabelOrFallback(SIGNAL_LEVEL_LABELS, level, '待判断');
}

export function dataMaturityLevelLabel(level: DataMaturityLevelCode): string {
    return knownLabel(DATA_MATURITY_LEVEL_LABELS, level);
}

export function dataMaturityLevelLabelOrFallback(level: string | null | undefined): string {
    return normalizedLabelOrFallback(DATA_MATURITY_LEVEL_LABELS, level, '待判断');
}

export function commissionSettlementStatusLabel(status: CommissionSettlementStatusCode): string {
    return knownLabel(COMMISSION_SETTLEMENT_STATUS_LABELS, status);
}

export function commissionSettlementStatusSeverity(status: CommissionSettlementStatusCode): UiTagSeverityValue {
    return knownSeverity(COMMISSION_SETTLEMENT_STATUS_SEVERITIES, status);
}

export function commissionSettlementStatusLabelOrFallback(status: string | null | undefined): string {
    return labelOrFallback(COMMISSION_SETTLEMENT_STATUS_LABELS, status, '待判断');
}

export function commissionSettlementStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return severityOrFallback(COMMISSION_SETTLEMENT_STATUS_SEVERITIES, status);
}

export function baselineSelectionSourceLabel(source: BaselineSelectionSourceCode): string {
    return knownLabel(BASELINE_SELECTION_SOURCE_LABELS, source);
}

export function baselineSelectionSourceLabelOrFallback(source: string | null | undefined): string {
    return labelOrFallback(BASELINE_SELECTION_SOURCE_LABELS, source, '待确认');
}

export function freezeVersionStatusLabel(status: FreezeVersionStatusCode): string {
    return knownLabel(FREEZE_VERSION_STATUS_LABELS, status);
}

export function freezeVersionStatusSeverity(status: FreezeVersionStatusCode): UiTagSeverityValue {
    return knownSeverity(FREEZE_VERSION_STATUS_SEVERITIES, status);
}

export function freezeVersionStatusLabelOrFallback(status: string | null | undefined): string {
    return labelOrFallback(FREEZE_VERSION_STATUS_LABELS, status, '待确认');
}

export function freezeVersionStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return severityOrFallback(FREEZE_VERSION_STATUS_SEVERITIES, status);
}

export function commissionRuleStageLabel(status: CommissionRuleStageCode): string {
    return knownLabel(COMMISSION_RULE_STAGE_LABELS, status);
}

export function commissionRuleStageLabelOrFallback(status: string | null | undefined): string {
    return labelOrFallback(COMMISSION_RULE_STAGE_LABELS, status, '待判断');
}

export function gateDecisionLabel(code: GateDecisionCode): string {
    return knownLabel(COMMISSION_GATE_DECISION_LABELS, code);
}

export function gateDecisionLabelOrFallback(code: string | null | undefined): string {
    return labelOrFallback(COMMISSION_GATE_DECISION_LABELS, code, '待判断');
}

export function gateDecisionSeverity(code: GateDecisionCode): UiTagSeverityValue {
    if (code.startsWith('BLOCK')) {
        return 'danger';
    }
    if (code.startsWith('ALLOW') || code.startsWith('SETTLED')) {
        return 'success';
    }
    if (code.startsWith('REVIEW')) {
        return 'warn';
    }

    return 'secondary';
}

export function gateDecisionSeverityOrFallback(code: string | null | undefined): UiTagSeverityValue {
    if (!code) {
        return 'secondary';
    }

    if (code.startsWith('BLOCK')) {
        return 'danger';
    }
    if (code.startsWith('ALLOW') || code.startsWith('SETTLED')) {
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

export function projectOwnerSummary(project: { ownerUserId?: string | null; ownerOrgId?: string | null }): string {
    if (project.ownerUserId) {
        return `用户 ${project.ownerUserId}`;
    }
    if (project.ownerOrgId) {
        return `组织 ${project.ownerOrgId}`;
    }
    return '待指定';
}

export function projectWorkspaceGuide(project: { currentStage: string; status: string; ownerUserId?: string | null; ownerOrgId?: string | null }): ProjectWorkspaceGuide {
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
