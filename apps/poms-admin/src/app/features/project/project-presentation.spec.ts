import {
    BaselineSelectionSource,
    CommissionFinalSettlementStatus,
    CommissionNonRetentionSettlementStatus,
    CommissionRetentionSettlementStatus,
    CommissionRuleExplanationGateDecision,
    CommissionRuleExplanationStageStatus,
    OperatingDataMaturityLevel,
    OperatingRiskLevel,
    OperatingSignalLevel,
    OperatingSnapshotActionLevel
} from '@poms/admin-data-access';
import {
    actionLevelLabel,
    actionLevelSeverity,
    baselineSelectionSourceLabel,
    commissionRuleStageLabel,
    commissionSettlementStatusLabel,
    commissionSettlementStatusSeverity,
    dataMaturityLevelLabel,
    gateDecisionLabel,
    gateDecisionSeverity,
    signalLevelLabel
} from './project-presentation';

describe('project presentation', () => {
    it('maps operating levels from generated enums', () => {
        expect(actionLevelLabel(OperatingSnapshotActionLevel.Block)).toBe('阻断');
        expect(actionLevelSeverity(OperatingSnapshotActionLevel.Block)).toBe('danger');
        expect(signalLevelLabel(OperatingSignalLevel.Alert)).toBe('警报');
        expect(signalLevelLabel(OperatingRiskLevel.Risk)).toBe('风险');
        expect(dataMaturityLevelLabel(OperatingDataMaturityLevel.Mature)).toBe('成熟');
        expect(baselineSelectionSourceLabel(BaselineSelectionSource.HandoverRebaseline)).toBe('移交再基线化');
    });

    it('maps commission settlement statuses from generated enums', () => {
        expect(commissionSettlementStatusLabel(CommissionFinalSettlementStatus.SettledAll)).toBe('全部结清');
        expect(commissionSettlementStatusSeverity(CommissionFinalSettlementStatus.SettledAll)).toBe('success');
        expect(commissionSettlementStatusLabel(CommissionNonRetentionSettlementStatus.PendingNonRetention)).toBe('非质保待结算');
        expect(commissionSettlementStatusLabel(CommissionRetentionSettlementStatus.ReadyRetention)).toBe('质保金可结算');
    });

    it('maps commission rule explanation states from generated enums', () => {
        expect(commissionRuleStageLabel(CommissionRuleExplanationStageStatus.BlockedRetention)).toBe('质保金结算阻塞');
        expect(gateDecisionLabel(CommissionRuleExplanationGateDecision.AllowFinalSettlement)).toBe('允许最终结算');
        expect(gateDecisionSeverity(CommissionRuleExplanationGateDecision.BlockRetention)).toBe('danger');
        expect(gateDecisionSeverity(CommissionRuleExplanationGateDecision.ReviewRetention)).toBe('warn');
        expect(gateDecisionSeverity(CommissionRuleExplanationGateDecision.AllowRetention)).toBe('success');
    });
});
