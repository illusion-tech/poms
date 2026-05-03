import { ApprovalStatus, CommissionAdjustmentStatus, CommissionCalculationStatus, CommissionPayoutStatus, ContractStatus, LeadStatus, ProjectStage, ProjectStatus } from '@poms/admin-data-access';
import {
    ApprovalStatusLabel,
    ApprovalStatusSeverity,
    CommissionAdjustmentStatusLabel,
    CommissionAdjustmentStatusSeverity,
    CommissionCalculationStatusLabel,
    CommissionCalculationStatusSeverity,
    CommissionPayoutStatusLabel,
    CommissionPayoutStatusSeverity,
    ContractStatusLabel,
    ContractStatusSeverity,
    LeadStatusLabel,
    LeadStatusSeverity,
    ProjectStageLabel,
    ProjectStageSeverity,
    ProjectStatusLabel,
    ProjectStatusSeverity
} from '@poms/shared-contracts';
import type { UiTagSeverityValue } from './ui-severity';

export const PROJECT_STAGE_LABELS = ProjectStageLabel as Record<ProjectStage, string>;

export type ProjectStageCode = ProjectStage;

const PROJECT_STAGE_SEVERITIES = ProjectStageSeverity as Record<ProjectStageCode, UiTagSeverityValue>;

export const PROJECT_STATUS_LABELS = ProjectStatusLabel as Record<ProjectStatus, string>;

export type ProjectStatusCode = ProjectStatus;

const PROJECT_STATUS_SEVERITIES = ProjectStatusSeverity as Record<ProjectStatusCode, UiTagSeverityValue>;

export const CONTRACT_STATUS_LABELS = ContractStatusLabel as Record<ContractStatus, string>;

export type ContractStatusCode = ContractStatus;

const CONTRACT_STATUS_SEVERITIES = ContractStatusSeverity as Record<ContractStatusCode, UiTagSeverityValue>;

export const APPROVAL_STATUS_LABELS = ApprovalStatusLabel as Record<ApprovalStatus, string>;

export type ApprovalStatusCode = ApprovalStatus;

const APPROVAL_STATUS_SEVERITIES = ApprovalStatusSeverity as Record<ApprovalStatusCode, UiTagSeverityValue>;

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

export const LEAD_STATUS_LABELS = LeadStatusLabel as Record<LeadStatus, string>;

export type LeadStatusCode = LeadStatus;

const LEAD_STATUS_SEVERITIES = LeadStatusSeverity as Record<LeadStatusCode, UiTagSeverityValue>;

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

export const COMMISSION_CALCULATION_STATUS_LABELS = CommissionCalculationStatusLabel as Record<CommissionCalculationStatus, string>;

export type CommissionCalculationStatusCode = CommissionCalculationStatus;

const COMMISSION_CALCULATION_STATUS_SEVERITIES = CommissionCalculationStatusSeverity as Record<CommissionCalculationStatusCode, UiTagSeverityValue>;

export const COMMISSION_PAYOUT_STATUS_LABELS = CommissionPayoutStatusLabel as Record<CommissionPayoutStatus, string>;

export type CommissionPayoutStatusCode = CommissionPayoutStatus;

const COMMISSION_PAYOUT_STATUS_SEVERITIES = CommissionPayoutStatusSeverity as Record<CommissionPayoutStatusCode, UiTagSeverityValue>;

export const COMMISSION_ADJUSTMENT_STATUS_LABELS = CommissionAdjustmentStatusLabel as Record<CommissionAdjustmentStatus, string>;

export type CommissionAdjustmentStatusCode = CommissionAdjustmentStatus;

const COMMISSION_ADJUSTMENT_STATUS_SEVERITIES = CommissionAdjustmentStatusSeverity as Record<CommissionAdjustmentStatusCode, UiTagSeverityValue>;

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
