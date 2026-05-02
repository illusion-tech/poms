import { ApprovalStatus, CommissionAdjustmentStatus, CommissionCalculationStatus, CommissionPayoutStatus, ContractStatus, LeadStatus, ProjectStage, ProjectStatus } from '@poms/admin-data-access';
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
    [ContractStatus.Draft]: '草稿',
    [ContractStatus.PendingReview]: '待审核',
    [ContractStatus.Active]: '已生效',
    [ContractStatus.Terminated]: '已终止',
    [ContractStatus.Completed]: '已完成'
} as const satisfies Record<ContractStatus, string>;

export type ContractStatusCode = ContractStatus;

const CONTRACT_STATUS_SEVERITIES = {
    [ContractStatus.Draft]: 'secondary',
    [ContractStatus.PendingReview]: 'warn',
    [ContractStatus.Active]: 'success',
    [ContractStatus.Terminated]: 'danger',
    [ContractStatus.Completed]: 'contrast'
} as const satisfies Record<ContractStatusCode, UiTagSeverityValue>;

export const APPROVAL_STATUS_LABELS = {
    [ApprovalStatus.Pending]: '审批中',
    [ApprovalStatus.Approved]: '已通过',
    [ApprovalStatus.Rejected]: '已驳回'
} as const satisfies Record<ApprovalStatus, string>;

export type ApprovalStatusCode = ApprovalStatus;

const APPROVAL_STATUS_SEVERITIES = {
    [ApprovalStatus.Pending]: 'warn',
    [ApprovalStatus.Approved]: 'success',
    [ApprovalStatus.Rejected]: 'danger'
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
    [LeadStatus.Registered]: '待确认',
    [LeadStatus.Qualified]: '已有效',
    [LeadStatus.Converted]: '已转项目',
    [LeadStatus.Closed]: '已关闭'
} as const satisfies Record<LeadStatus, string>;

export type LeadStatusCode = LeadStatus;

const LEAD_STATUS_SEVERITIES = {
    [LeadStatus.Registered]: 'secondary',
    [LeadStatus.Qualified]: 'success',
    [LeadStatus.Converted]: 'info',
    [LeadStatus.Closed]: 'contrast'
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
    [CommissionCalculationStatus.Pending]: '待计算',
    [CommissionCalculationStatus.Calculated]: '已计算',
    [CommissionCalculationStatus.Effective]: '已生效',
    [CommissionCalculationStatus.Superseded]: '已替代'
} as const satisfies Record<CommissionCalculationStatus, string>;

export type CommissionCalculationStatusCode = CommissionCalculationStatus;

const COMMISSION_CALCULATION_STATUS_SEVERITIES = {
    [CommissionCalculationStatus.Pending]: 'secondary',
    [CommissionCalculationStatus.Calculated]: 'info',
    [CommissionCalculationStatus.Effective]: 'success',
    [CommissionCalculationStatus.Superseded]: 'contrast'
} as const satisfies Record<CommissionCalculationStatusCode, UiTagSeverityValue>;

export const COMMISSION_PAYOUT_STATUS_LABELS = {
    [CommissionPayoutStatus.Draft]: '草稿',
    [CommissionPayoutStatus.PendingApproval]: '待审批',
    [CommissionPayoutStatus.Approved]: '已批准',
    [CommissionPayoutStatus.Paid]: '已发放',
    [CommissionPayoutStatus.Suspended]: '已暂停',
    [CommissionPayoutStatus.Reversed]: '已冲销'
} as const satisfies Record<CommissionPayoutStatus, string>;

export type CommissionPayoutStatusCode = CommissionPayoutStatus;

const COMMISSION_PAYOUT_STATUS_SEVERITIES = {
    [CommissionPayoutStatus.Draft]: 'secondary',
    [CommissionPayoutStatus.PendingApproval]: 'warn',
    [CommissionPayoutStatus.Approved]: 'success',
    [CommissionPayoutStatus.Paid]: 'info',
    [CommissionPayoutStatus.Suspended]: 'warn',
    [CommissionPayoutStatus.Reversed]: 'danger'
} as const satisfies Record<CommissionPayoutStatusCode, UiTagSeverityValue>;

export const COMMISSION_ADJUSTMENT_STATUS_LABELS = {
    [CommissionAdjustmentStatus.Draft]: '草稿',
    [CommissionAdjustmentStatus.PendingApproval]: '待审批',
    [CommissionAdjustmentStatus.Approved]: '已批准',
    [CommissionAdjustmentStatus.Executed]: '已执行',
    [CommissionAdjustmentStatus.Rejected]: '已驳回',
    [CommissionAdjustmentStatus.Closed]: '已关闭'
} as const satisfies Record<CommissionAdjustmentStatus, string>;

export type CommissionAdjustmentStatusCode = CommissionAdjustmentStatus;

const COMMISSION_ADJUSTMENT_STATUS_SEVERITIES = {
    [CommissionAdjustmentStatus.Draft]: 'secondary',
    [CommissionAdjustmentStatus.PendingApproval]: 'warn',
    [CommissionAdjustmentStatus.Approved]: 'success',
    [CommissionAdjustmentStatus.Executed]: 'info',
    [CommissionAdjustmentStatus.Rejected]: 'danger',
    [CommissionAdjustmentStatus.Closed]: 'contrast'
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
