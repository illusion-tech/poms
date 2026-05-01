import { ProjectStage, ProjectStatus } from '@poms/admin-data-access';
import type { UiTagSeverityValue } from './ui-severity';

export const PROJECT_STAGE_LABELS = {
    [ProjectStage.Assessment]: '立项评估',
    [ProjectStage.ScopeConfirmation]: '范围确认',
    [ProjectStage.CommercialClosure]: '商务收口',
    [ProjectStage.Contracting]: '签约中',
    [ProjectStage.Handover]: '项目移交',
    [ProjectStage.Execution]: '正式执行',
    [ProjectStage.Acceptance]: '验收确认',
    [ProjectStage.Completed]: '已完成',
    [ProjectStage.ClosedLost]: '已丢单',
    [ProjectStage.ClosedTerminated]: '已终止'
} as const satisfies Record<ProjectStage, string>;

export type ProjectStageCode = ProjectStage;

const PROJECT_STAGE_SEVERITIES = {
    [ProjectStage.Assessment]: 'secondary',
    [ProjectStage.ScopeConfirmation]: 'info',
    [ProjectStage.CommercialClosure]: 'warn',
    [ProjectStage.Contracting]: 'warn',
    [ProjectStage.Handover]: 'warn',
    [ProjectStage.Execution]: 'success',
    [ProjectStage.Acceptance]: 'info',
    [ProjectStage.Completed]: 'contrast',
    [ProjectStage.ClosedLost]: 'danger',
    [ProjectStage.ClosedTerminated]: 'danger'
} as const satisfies Record<ProjectStageCode, UiTagSeverityValue>;

export const PROJECT_STATUS_LABELS = {
    [ProjectStatus.Active]: '进行中',
    [ProjectStatus.PendingApproval]: '待审批',
    [ProjectStatus.Blocked]: '阻塞中',
    [ProjectStatus.OnHold]: '已挂起',
    [ProjectStatus.Completed]: '已完成',
    [ProjectStatus.Closed]: '已关闭'
} as const satisfies Record<ProjectStatus, string>;

export type ProjectStatusCode = ProjectStatus;

const PROJECT_STATUS_SEVERITIES = {
    [ProjectStatus.Active]: 'info',
    [ProjectStatus.PendingApproval]: 'secondary',
    [ProjectStatus.Blocked]: 'warn',
    [ProjectStatus.OnHold]: 'warn',
    [ProjectStatus.Completed]: 'success',
    [ProjectStatus.Closed]: 'contrast'
} as const satisfies Record<ProjectStatusCode, UiTagSeverityValue>;

export const CONTRACT_STATUS_LABELS = {
    draft: '草稿',
    'pending-review': '待审核',
    pending_review: '待审批',
    approved: '已审批',
    active: '已生效',
    suspended: '已暂停',
    terminated: '已终止',
    expired: '已过期',
    archived: '已归档',
    completed: '已完成'
} as const;

export type ContractStatusCode = keyof typeof CONTRACT_STATUS_LABELS;

const CONTRACT_STATUS_SEVERITIES = {
    draft: 'secondary',
    'pending-review': 'warn',
    pending_review: 'warn',
    approved: 'success',
    active: 'success',
    suspended: 'warn',
    terminated: 'danger',
    expired: 'danger',
    archived: 'contrast',
    completed: 'contrast'
} as const satisfies Record<ContractStatusCode, UiTagSeverityValue>;

export const APPROVAL_STATUS_LABELS = {
    draft: '草稿',
    pending: '审批中',
    approved: '已通过',
    rejected: '已驳回',
    canceled: '已取消',
    closed: '已关闭'
} as const;

export type ApprovalStatusCode = keyof typeof APPROVAL_STATUS_LABELS;

const APPROVAL_STATUS_SEVERITIES = {
    draft: 'secondary',
    pending: 'warn',
    approved: 'success',
    rejected: 'danger',
    canceled: 'contrast',
    closed: 'contrast'
} as const satisfies Record<ApprovalStatusCode, UiTagSeverityValue>;

export const CONFIRMATION_STATUS_LABELS = {
    not_configured: '暂未形成确认记录',
    pending: '待确认',
    partial: '部分确认',
    confirmed: '已确认',
    voided: '已作废'
} as const;

export type ConfirmationStatusCode = keyof typeof CONFIRMATION_STATUS_LABELS;

const CONFIRMATION_STATUS_SEVERITIES = {
    not_configured: 'secondary',
    pending: 'warn',
    partial: 'info',
    confirmed: 'success',
    voided: 'contrast'
} as const satisfies Record<ConfirmationStatusCode, UiTagSeverityValue>;

export const LEAD_STATUS_LABELS = {
    registered: '待确认',
    qualified: '已有效',
    converted: '已转项目',
    closed: '已关闭'
} as const;

export type LeadStatusCode = keyof typeof LEAD_STATUS_LABELS;

const LEAD_STATUS_SEVERITIES = {
    registered: 'secondary',
    qualified: 'success',
    converted: 'info',
    closed: 'contrast'
} as const satisfies Record<LeadStatusCode, UiTagSeverityValue>;

export const ARCHIVE_STATUS_LABELS = {
    recorded: '当前有效',
    voided: '已撤销',
    superseded: '已被替代'
} as const;

export type ArchiveStatusCode = keyof typeof ARCHIVE_STATUS_LABELS;

const ARCHIVE_STATUS_SEVERITIES = {
    recorded: 'success',
    voided: 'danger',
    superseded: 'warn'
} as const satisfies Record<ArchiveStatusCode, UiTagSeverityValue>;

export const COMMISSION_CALCULATION_STATUS_LABELS = {
    pending: '待计算',
    calculated: '已计算',
    effective: '已生效',
    superseded: '已替代'
} as const;

export type CommissionCalculationStatusCode = keyof typeof COMMISSION_CALCULATION_STATUS_LABELS;

const COMMISSION_CALCULATION_STATUS_SEVERITIES = {
    pending: 'secondary',
    calculated: 'info',
    effective: 'success',
    superseded: 'contrast'
} as const satisfies Record<CommissionCalculationStatusCode, UiTagSeverityValue>;

export const COMMISSION_PAYOUT_STATUS_LABELS = {
    draft: '草稿',
    'pending-approval': '待审批',
    approved: '已批准',
    paid: '已发放',
    suspended: '已暂停',
    reversed: '已冲销'
} as const;

export type CommissionPayoutStatusCode = keyof typeof COMMISSION_PAYOUT_STATUS_LABELS;

const COMMISSION_PAYOUT_STATUS_SEVERITIES = {
    draft: 'secondary',
    'pending-approval': 'warn',
    approved: 'success',
    paid: 'info',
    suspended: 'warn',
    reversed: 'danger'
} as const satisfies Record<CommissionPayoutStatusCode, UiTagSeverityValue>;

export const COMMISSION_ADJUSTMENT_STATUS_LABELS = {
    draft: '草稿',
    'pending-approval': '待审批',
    approved: '已批准',
    executed: '已执行',
    rejected: '已驳回',
    closed: '已关闭'
} as const;

export type CommissionAdjustmentStatusCode = keyof typeof COMMISSION_ADJUSTMENT_STATUS_LABELS;

const COMMISSION_ADJUSTMENT_STATUS_SEVERITIES = {
    draft: 'secondary',
    'pending-approval': 'warn',
    approved: 'success',
    executed: 'info',
    rejected: 'danger',
    closed: 'contrast'
} as const satisfies Record<CommissionAdjustmentStatusCode, UiTagSeverityValue>;

function displayKnownLabel<TLabels extends Readonly<Record<string, string>>, TCode extends keyof TLabels & string>(labels: TLabels, value: TCode): TLabels[TCode] {
    return labels[value];
}

function displayLabelOrFallback<TLabels extends Readonly<Record<string, string>>>(labels: TLabels, value: string | null | undefined, fallback = '待确认'): string {
    if (!value) {
        return fallback;
    }

    return Object.prototype.hasOwnProperty.call(labels, value) ? labels[value as keyof TLabels] : value;
}

function knownTagSeverity<TCode extends string>(severities: Readonly<Record<TCode, UiTagSeverityValue>>, value: TCode): UiTagSeverityValue {
    return severities[value];
}

function tagSeverityOrFallback<TSeverities extends Readonly<Record<string, UiTagSeverityValue>>>(severities: TSeverities, value: string | null | undefined): UiTagSeverityValue {
    if (!value) {
        return 'secondary';
    }

    return Object.prototype.hasOwnProperty.call(severities, value) ? severities[value as keyof TSeverities] : 'secondary';
}

export function projectStageLabel(stage: ProjectStageCode): string {
    return displayKnownLabel(PROJECT_STAGE_LABELS, stage);
}

export function projectStageSeverity(stage: ProjectStageCode): UiTagSeverityValue {
    return knownTagSeverity(PROJECT_STAGE_SEVERITIES, stage);
}

export function projectStageLabelOrFallback(stage: string | null | undefined): string {
    return displayLabelOrFallback(PROJECT_STAGE_LABELS, stage);
}

export function projectStageSeverityOrFallback(stage: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(PROJECT_STAGE_SEVERITIES, stage);
}

export function projectStatusLabel(status: ProjectStatusCode): string {
    return displayKnownLabel(PROJECT_STATUS_LABELS, status);
}

export function projectStatusSeverity(status: ProjectStatusCode): UiTagSeverityValue {
    return knownTagSeverity(PROJECT_STATUS_SEVERITIES, status);
}

export function projectStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(PROJECT_STATUS_LABELS, status);
}

export function projectStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(PROJECT_STATUS_SEVERITIES, status);
}

export function contractStatusLabel(status: ContractStatusCode): string {
    return displayKnownLabel(CONTRACT_STATUS_LABELS, status);
}

export function contractStatusSeverity(status: ContractStatusCode): UiTagSeverityValue {
    return knownTagSeverity(CONTRACT_STATUS_SEVERITIES, status);
}

export function contractStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(CONTRACT_STATUS_LABELS, status);
}

export function contractStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(CONTRACT_STATUS_SEVERITIES, status);
}

export function approvalStatusLabel(status: ApprovalStatusCode): string {
    return displayKnownLabel(APPROVAL_STATUS_LABELS, status);
}

export function approvalStatusSeverity(status: ApprovalStatusCode): UiTagSeverityValue {
    return knownTagSeverity(APPROVAL_STATUS_SEVERITIES, status);
}

export function approvalStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(APPROVAL_STATUS_LABELS, status);
}

export function approvalStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(APPROVAL_STATUS_SEVERITIES, status);
}

export function confirmationStatusLabel(status: ConfirmationStatusCode): string {
    return displayKnownLabel(CONFIRMATION_STATUS_LABELS, status);
}

export function confirmationStatusSeverity(status: ConfirmationStatusCode): UiTagSeverityValue {
    return knownTagSeverity(CONFIRMATION_STATUS_SEVERITIES, status);
}

export function confirmationStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(CONFIRMATION_STATUS_LABELS, status);
}

export function confirmationStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(CONFIRMATION_STATUS_SEVERITIES, status);
}

export function leadStatusLabel(status: LeadStatusCode): string {
    return displayKnownLabel(LEAD_STATUS_LABELS, status);
}

export function leadStatusSeverity(status: LeadStatusCode): UiTagSeverityValue {
    return knownTagSeverity(LEAD_STATUS_SEVERITIES, status);
}

export function leadStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(LEAD_STATUS_LABELS, status);
}

export function leadStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(LEAD_STATUS_SEVERITIES, status);
}

export function archiveStatusLabel(status: ArchiveStatusCode): string {
    return displayKnownLabel(ARCHIVE_STATUS_LABELS, status);
}

export function archiveStatusSeverity(status: ArchiveStatusCode): UiTagSeverityValue {
    return knownTagSeverity(ARCHIVE_STATUS_SEVERITIES, status);
}

export function archiveStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(ARCHIVE_STATUS_LABELS, status);
}

export function archiveStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(ARCHIVE_STATUS_SEVERITIES, status);
}

export function commissionCalculationStatusLabel(status: CommissionCalculationStatusCode): string {
    return displayKnownLabel(COMMISSION_CALCULATION_STATUS_LABELS, status);
}

export function commissionCalculationStatusSeverity(status: CommissionCalculationStatusCode): UiTagSeverityValue {
    return knownTagSeverity(COMMISSION_CALCULATION_STATUS_SEVERITIES, status);
}

export function commissionCalculationStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(COMMISSION_CALCULATION_STATUS_LABELS, status);
}

export function commissionCalculationStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(COMMISSION_CALCULATION_STATUS_SEVERITIES, status);
}

export function commissionPayoutStatusLabel(status: CommissionPayoutStatusCode): string {
    return displayKnownLabel(COMMISSION_PAYOUT_STATUS_LABELS, status);
}

export function commissionPayoutStatusSeverity(status: CommissionPayoutStatusCode): UiTagSeverityValue {
    return knownTagSeverity(COMMISSION_PAYOUT_STATUS_SEVERITIES, status);
}

export function commissionPayoutStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(COMMISSION_PAYOUT_STATUS_LABELS, status);
}

export function commissionPayoutStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(COMMISSION_PAYOUT_STATUS_SEVERITIES, status);
}

export function commissionAdjustmentStatusLabel(status: CommissionAdjustmentStatusCode): string {
    return displayKnownLabel(COMMISSION_ADJUSTMENT_STATUS_LABELS, status);
}

export function commissionAdjustmentStatusSeverity(status: CommissionAdjustmentStatusCode): UiTagSeverityValue {
    return knownTagSeverity(COMMISSION_ADJUSTMENT_STATUS_SEVERITIES, status);
}

export function commissionAdjustmentStatusLabelOrFallback(status: string | null | undefined): string {
    return displayLabelOrFallback(COMMISSION_ADJUSTMENT_STATUS_LABELS, status);
}

export function commissionAdjustmentStatusSeverityOrFallback(status: string | null | undefined): UiTagSeverityValue {
    return tagSeverityOrFallback(COMMISSION_ADJUSTMENT_STATUS_SEVERITIES, status);
}
