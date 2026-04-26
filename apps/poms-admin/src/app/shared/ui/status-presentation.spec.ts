import {
    archiveStatusLabel,
    archiveStatusSeverity,
    approvalStatusLabel,
    approvalStatusSeverity,
    commissionAdjustmentStatusLabel,
    commissionAdjustmentStatusSeverity,
    type CommissionAdjustmentStatusCode,
    commissionCalculationStatusLabel,
    commissionCalculationStatusSeverity,
    type CommissionCalculationStatusCode,
    commissionPayoutStatusLabel,
    commissionPayoutStatusSeverity,
    type CommissionPayoutStatusCode,
    contractStatusLabel,
    contractStatusSeverity,
    type ContractStatusCode,
    leadStatusLabel,
    leadStatusSeverity,
    type LeadStatusCode,
    projectStageLabel,
    projectStageLabelOrFallback,
    projectStageSeverity,
    projectStageSeverityOrFallback,
    type ProjectStageCode,
    projectStatusLabel,
    projectStatusLabelOrFallback,
    projectStatusSeverity,
    projectStatusSeverityOrFallback,
    type ProjectStatusCode
} from './status-presentation';

describe('status presentation', () => {
    it('maps project stages and statuses consistently', () => {
        const stage = 'handover' satisfies ProjectStageCode;
        const status = 'closed-lost' satisfies ProjectStatusCode;

        expect(projectStageLabel(stage)).toBe('项目移交');
        expect(projectStageSeverity(stage)).toBe('warn');
        expect(projectStatusLabel(status)).toBe('已丢单');
        expect(projectStatusSeverity(status)).toBe('danger');
    });

    it('maps lead, contract, approval and archive statuses', () => {
        const leadStatus = 'qualified' satisfies LeadStatusCode;
        const contractStatus = 'pending-review' satisfies ContractStatusCode;

        expect(leadStatusLabel(leadStatus)).toBe('已有效');
        expect(leadStatusSeverity(leadStatus)).toBe('success');
        expect(contractStatusLabel(contractStatus)).toBe('待审核');
        expect(contractStatusSeverity(contractStatus)).toBe('warn');
        expect(approvalStatusLabel('rejected')).toBe('已驳回');
        expect(approvalStatusSeverity('rejected')).toBe('danger');
        expect(archiveStatusLabel('superseded')).toBe('已被替代');
        expect(archiveStatusSeverity('superseded')).toBe('warn');
    });

    it('maps commission operation statuses', () => {
        const calculationStatus = 'effective' satisfies CommissionCalculationStatusCode;
        const payoutStatus = 'reversed' satisfies CommissionPayoutStatusCode;
        const adjustmentStatus = 'executed' satisfies CommissionAdjustmentStatusCode;

        expect(commissionCalculationStatusLabel(calculationStatus)).toBe('已生效');
        expect(commissionCalculationStatusSeverity(calculationStatus)).toBe('success');
        expect(commissionPayoutStatusLabel(payoutStatus)).toBe('已冲销');
        expect(commissionPayoutStatusSeverity(payoutStatus)).toBe('danger');
        expect(commissionAdjustmentStatusLabel(adjustmentStatus)).toBe('已执行');
        expect(commissionAdjustmentStatusSeverity(adjustmentStatus)).toBe('info');
    });

    it('falls back safely for unknown or missing values', () => {
        expect(projectStatusLabelOrFallback('custom-status')).toBe('custom-status');
        expect(projectStatusSeverityOrFallback('custom-status')).toBe('secondary');
        expect(projectStageLabelOrFallback(null)).toBe('待确认');
        expect(projectStageSeverityOrFallback(undefined)).toBe('secondary');
    });
});
