import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommissionService } from './commission.service';
import type { CommissionRepository } from './commission.repository';

const RULE_VERSION_ID = '50000000-0000-4000-8000-000000000001';
const ASSIGNMENT_ID = '51000000-0000-4000-8000-000000000001';
const CALCULATION_ID = '52000000-0000-4000-8000-000000000001';
const PAYOUT_ID = '53000000-0000-4000-8000-000000000001';
const ADJUSTMENT_ID = '54000000-0000-4000-8000-000000000001';
const DISPUTE_ID = '55000000-0000-4000-8000-000000000001';
const CHANGE_REQUEST_ID = '56000000-0000-4000-8000-000000000001';
const FINAL_SETTLEMENT_SNAPSHOT_ID = '57000000-0000-4000-8000-000000000001';
const DEPARTURE_EXCEPTION_DECISION_ID = '57500000-0000-4000-8000-000000000001';
const RETENTION_RECEIPT_ID = '57600000-0000-4000-8000-000000000001';
const RULE_EXPLANATION_SNAPSHOT_ID = '58000000-0000-4000-8000-000000000001';
const GATE_REVIEW_RECORD_ID = '59000000-0000-4000-8000-000000000001';
const NEXT_FINAL_SETTLEMENT_SNAPSHOT_ID = '57000000-0000-4000-8000-000000000099';
const NEXT_DEPARTURE_EXCEPTION_DECISION_ID = '57500000-0000-4000-8000-000000000099';
const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const HANDOVER_ID = '61000000-0000-4000-8000-000000000001';
const HANDOVER_SUMMARY_SNAPSHOT_ID = '62000000-0000-4000-8000-000000000001';
const CONTRACT_SUMMARY_SNAPSHOT_ID = '62000000-0000-4000-8000-000000000002';
const EFFECTIVE_BASELINE_SNAPSHOT_ID = '63000000-0000-4000-8000-000000000001';
const HANDOVER_REBASELINE_RECORD_ID = '64000000-0000-4000-8000-000000000001';

const makeDraftRule = (overrides: Record<string, unknown> = {}) => ({
    id: RULE_VERSION_ID,
    ruleCode: 'STANDARD',
    version: 1,
    status: 'draft',
    tierDefinitionJson: { tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }] },
    firstStageCapRuleJson: null,
    secondStageCapRuleJson: null,
    retentionRuleJson: null,
    lowDownPaymentRuleJson: null,
    exceptionRuleJson: null,
    effectiveFrom: null,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const makeDraftAssignment = (overrides: Record<string, unknown> = {}) => ({
    id: ASSIGNMENT_ID,
    projectId: PROJECT_ID,
    version: 1,
    rowVersion: 1,
    isCurrent: true,
    status: 'draft',
    participantsJson: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }],
    sourceHandoverId: null,
    sourceHandoverRebaselineRecordId: null,
    contractSummarySnapshotId: null,
    handoverSummarySnapshotId: null,
    effectiveHandoverBaselineSnapshotId: null,
    frozenAt: null,
    frozenBy: null,
    supersedesId: null,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const makeConfirmedHandover = (overrides: Record<string, unknown> = {}) => ({
    id: HANDOVER_ID,
    projectId: PROJECT_ID,
    contractSummarySnapshotId: CONTRACT_SUMMARY_SNAPSHOT_ID,
    effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID,
    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
    handoverRebaselineRecordId: HANDOVER_REBASELINE_RECORD_ID,
    status: 'confirmed',
    confirmedAt: new Date('2026-03-25T10:00:00Z'),
    confirmedBy: 'user-1',
    comment: 'handover confirmed',
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const makeApprovalSummarySnapshot = (overrides: Record<string, unknown> = {}) => ({
    id: HANDOVER_SUMMARY_SNAPSHOT_ID,
    targetType: 'ProjectHandover',
    targetId: HANDOVER_ID,
    approvalScenarioKey: 'project-handover-confirmation',
    summaryPackageKey: 'project-handover-confirmation',
    projectionLevel: 'handover-confirmation',
    exportPolicy: 'handover-controlled',
    status: 'active',
    supersedesId: null,
    snapshotJson: { sections: [] },
    createdAt: new Date('2026-03-25T10:00:00Z'),
    createdBy: 'user-1',
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    updatedBy: 'user-1',
    rowVersion: 1,
    ...overrides
});

const makeReceiptJudgmentFreeze = (overrides: Record<string, unknown> = {}) => ({
    id: '65000000-0000-4000-8000-000000000001',
    projectId: PROJECT_ID,
    receiptJudgmentMode: 'net-receipt',
    sourceType: 'project-handover',
    sourceId: HANDOVER_ID,
    sourceHandoverId: HANDOVER_ID,
    sourceHandoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
    sourceHandoverRebaselineRecordId: HANDOVER_REBASELINE_RECORD_ID,
    isCurrent: true,
    frozenAt: new Date('2026-03-25T10:00:00Z'),
    frozenBy: 'user-1',
    supersedesId: null,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    rowVersion: 1,
    ...overrides
});

const makeFreezeDisputeRecord = (overrides: Record<string, unknown> = {}) => ({
    id: DISPUTE_ID,
    projectId: PROJECT_ID,
    freezeVersionId: ASSIGNMENT_ID,
    summaryPackageKey: 'project-handover-confirmation',
    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
    projectionLevel: 'handover-confirmation',
    exportPolicy: 'handover-controlled',
    disputeReason: '角色权重需要调整',
    affectedAssignmentSummary: '张三(sales-owner, weight=1)',
    arbitrationStatus: 'pending',
    recalculationImpactMode: 'recalculate-and-adjust',
    impactAssessmentSummary: 'recalculationImpactMode=recalculate-and-adjust; no-current-calculation; no-payout-records; riskFlags=no-downstream-risk-detected',
    status: 'submitted',
    handledAt: new Date('2026-03-25T10:10:00Z'),
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:10:00Z'),
    updatedAt: new Date('2026-03-25T10:10:00Z'),
    ...overrides
});

const makeFreezeChangeRequest = (overrides: Record<string, unknown> = {}) => ({
    id: CHANGE_REQUEST_ID,
    disputeRecordId: DISPUTE_ID,
    supersededFreezeVersionId: ASSIGNMENT_ID,
    replacementFreezeVersionId: '51000000-0000-4000-8000-000000000099',
    summaryPackageKey: 'project-handover-confirmation',
    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
    projectionLevel: 'handover-confirmation',
    exportPolicy: 'handover-controlled',
    arbitrationDecision: 'replace-freeze-version',
    recalculationImpactMode: 'recalculate-and-adjust',
    affectedCalculationSummary: 'Current calculation 52000000-0000-4000-8000-000000000001 (effective) may require recalculate-and-adjust',
    affectedPayoutSummary: 'Payout count=1; statuses=paid',
    riskFlagSummary: 'effective-calculation-present, downstream-payout-chain-present',
    status: 'effective',
    handledAt: new Date('2026-03-25T10:20:00Z'),
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:20:00Z'),
    updatedAt: new Date('2026-03-25T10:20:00Z'),
    ...overrides
});

const makeDepartureExceptionDecision = (overrides: Record<string, unknown> = {}) => ({
    id: DEPARTURE_EXCEPTION_DECISION_ID,
    projectId: PROJECT_ID,
    freezeVersionId: ASSIGNMENT_ID,
    version: 1,
    rowVersion: 1,
    isCurrent: true,
    departureScenarioCode: 'employee-left-company',
    decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
    decisionSummary: '原销售已离职，后续质保金结算前需补承接确认',
    confirmationRequirementSummary: '请销售负责人确认责任承接人与权重',
    summaryPackageKey: 'project-handover-confirmation',
    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
    projectionLevel: 'handover-confirmation',
    exportPolicy: 'handover-controlled',
    handledAt: new Date('2026-03-25T10:25:00Z'),
    handledBy: 'user-1',
    status: 'active',
    supersedesId: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date('2026-03-25T10:25:00Z'),
    updatedAt: new Date('2026-03-25T10:25:00Z'),
    ...overrides
});

const makeRetentionReceipt = (overrides: Record<string, unknown> = {}) => ({
    id: RETENTION_RECEIPT_ID,
    contractId: '30000000-0000-4000-8000-000000000001',
    projectId: PROJECT_ID,
    receiptAmount: '360.00',
    receiptDate: new Date('2026-03-25T10:28:00Z'),
    sourceType: 'contract-receipt',
    status: 'confirmed',
    confirmedAt: new Date('2026-03-25T10:28:00Z'),
    confirmedBy: 'user-1',
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:28:00Z'),
    updatedAt: new Date('2026-03-25T10:28:00Z'),
    ...overrides
});

const makeFinalGateBinding = (overrides: Record<string, unknown> = {}) => ({
    id: '59100000-0000-4000-8000-000000000001',
    projectId: PROJECT_ID,
    signalEvaluationId: '59200000-0000-4000-8000-000000000001',
    bindingAction: 'ALLOW',
    gateStageType: 'final',
    baselineSelectionSource: 'original',
    taxImpactSummary: '税务影响待闭合',
    taxImpactPendingAmount: '1200.00',
    allocationStabilitySummary: null,
    unmappedCostSummary: null,
    dataMaturityLevel: 'stable',
    costActionRecommendation: 'ALLOW',
    currentActionLevel: 'ALLOW',
    nextActionSummary: 'ALLOW_RETENTION',
    downstreamConsumerSummary: null,
    referencedBaselineVersion: 'baseline-v3',
    referencedSnapshotVersion: 'snapshot-v5',
    generatedAt: new Date('2026-03-25T10:29:00Z'),
    status: 'active',
    createdAt: new Date('2026-03-25T10:29:00Z'),
    updatedAt: new Date('2026-03-25T10:29:00Z'),
    ...overrides
});

const makeFinalGateReview = (overrides: Record<string, unknown> = {}) => ({
    id: GATE_REVIEW_RECORD_ID,
    bindingId: '59100000-0000-4000-8000-000000000001',
    gateReviewDecision: 'ALLOW_RETENTION',
    blockingReasonCode: null,
    summaryPackageKey: 'commission-final-settlement',
    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
    projectionLevel: 'final-settlement',
    exportPolicy: 'controlled',
    nextActionSummary: 'ALLOW_RETENTION',
    handledAt: new Date('2026-03-25T10:31:00Z'),
    handledBy: 'user-1',
    status: 'active',
    createdAt: new Date('2026-03-25T10:31:00Z'),
    updatedAt: new Date('2026-03-25T10:31:00Z'),
    ...overrides
});

const makeFinalSettlementSnapshot = (overrides: Record<string, unknown> = {}) => ({
    id: FINAL_SETTLEMENT_SNAPSHOT_ID,
    projectId: PROJECT_ID,
    freezeVersionId: ASSIGNMENT_ID,
    gateReviewRecordId: GATE_REVIEW_RECORD_ID,
    retentionReceiptRecordId: null,
    departureExceptionDecisionId: null,
    version: 1,
    isCurrent: true,
    finalSettlementStatus: 'pending-final-settlement',
    nonRetentionSettlementStatus: 'settled',
    retentionSettlementStatus: 'waiting-retention',
    retentionRequirementSummary: '等待质保金到账',
    retentionReceiptSummary: null,
    departureExceptionSummary: null,
    baselineSelectionSource: 'original',
    taxImpactSummary: '税务影响待闭合',
    taxImpactPendingAmount: '1200.00',
    dataMaturityLevel: 'stable',
    costActionRecommendation: 'REVIEW',
    currentActionLevel: 'BLOCK',
    referencedBaselineVersion: 'baseline-v3',
    referencedSnapshotVersion: 'snapshot-v5',
    summaryPackageKey: 'commission-final-settlement',
    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
    projectionLevel: 'final-settlement',
    exportPolicy: 'controlled',
    generatedAt: new Date('2026-03-25T10:30:00Z'),
    status: 'active',
    supersedesId: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:30:00Z'),
    updatedAt: new Date('2026-03-25T10:30:00Z'),
    ...overrides
});

const makeRuleExplanationSnapshot = (overrides: Record<string, unknown> = {}) => ({
    id: RULE_EXPLANATION_SNAPSHOT_ID,
    projectId: PROJECT_ID,
    finalSettlementSnapshotId: FINAL_SETTLEMENT_SNAPSHOT_ID,
    version: 1,
    isCurrent: true,
    currentStageStatus: 'blocked-retention',
    gateDecisionCode: 'BLOCK_RETENTION',
    blockingReasonCategory: 'retention',
    blockingReasonCode: 'RETENTION_RECEIPT_PENDING',
    blockingReasonSummary: '质保金尚未到账',
    gateDecisionSummary: '当前暂不能进入质保金结算',
    nextActionSummary: '请财务确认质保金到账后再复核',
    generatedAt: new Date('2026-03-25T10:35:00Z'),
    status: 'active',
    supersedesId: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:35:00Z'),
    updatedAt: new Date('2026-03-25T10:35:00Z'),
    ...overrides
});

const makeProject = (overrides: Record<string, unknown> = {}) => ({
    id: PROJECT_ID,
    currentStage: 'execution',
    ...overrides
});

const makeActiveContract = (overrides: Record<string, unknown> = {}) => ({
    id: '30000000-0000-4000-8000-000000000001',
    projectId: PROJECT_ID,
    contractNo: 'HT-2026-001',
    status: 'active',
    signedAmount: '100000.00',
    currencyCode: 'CNY',
    currentSnapshotId: '31000000-0000-4000-8000-000000000001',
    signedAt: new Date('2026-03-25T10:00:00Z'),
    retentionDueDate: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const makeContractTermSnapshot = (overrides: Record<string, unknown> = {}) => ({
    id: EFFECTIVE_BASELINE_SNAPSHOT_ID,
    contractId: '30000000-0000-4000-8000-000000000001',
    effectiveAt: new Date('2026-03-25T10:00:00Z'),
    effectiveBy: 'user-1',
    retentionDueDate: '2026-03-24',
    snapshotStatus: 'active',
    createdAt: new Date('2026-03-25T10:00:00Z'),
    createdBy: 'user-1',
    rowVersion: 1,
    ...overrides
});

const makeCalculatedResult = (overrides: Record<string, unknown> = {}) => ({
    id: CALCULATION_ID,
    projectId: PROJECT_ID,
    ruleVersionId: RULE_VERSION_ID,
    version: 1,
    isCurrent: true,
    status: 'calculated',
    recognizedRevenueTaxExclusive: '100000.00',
    recognizedCostTaxExclusive: '70000.00',
    contributionMargin: '30000.00',
    contributionMarginRate: '0.3000',
    commissionPool: '2400.00',
    recalculatedFromId: null,
    approvedAt: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const buildCalculationRequest = (
    overrides: Partial<{
        ruleVersionId: string;
        recognizedRevenueTaxExclusive: string;
        recognizedCostTaxExclusive: string;
    }> = {}
) => ({
    ruleVersionId: overrides.ruleVersionId ?? RULE_VERSION_ID,
    recognizedRevenueTaxExclusive: overrides.recognizedRevenueTaxExclusive ?? '100000.00',
    recognizedCostTaxExclusive: overrides.recognizedCostTaxExclusive ?? '70000.00'
});

const makeDraftPayout = (overrides: Record<string, unknown> = {}) => ({
    id: PAYOUT_ID,
    projectId: PROJECT_ID,
    calculationId: CALCULATION_ID,
    stageType: 'first',
    payoutKind: 'primary',
    sourcePayoutId: null,
    selectedTier: 'basic',
    theoreticalCapAmount: '480.00',
    approvedAmount: null,
    paidRecordAmount: null,
    status: 'draft',
    approvedAt: null,
    handledAt: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

const makeDraftAdjustment = (overrides: Record<string, unknown> = {}) => ({
    id: ADJUSTMENT_ID,
    projectId: PROJECT_ID,
    adjustmentType: 'suspend-payout',
    relatedPayoutId: PAYOUT_ID,
    relatedCalculationId: CALCULATION_ID,
    amount: null,
    reason: '客户退款待核实',
    status: 'draft',
    executedAt: null,
    rowVersion: 1,
    createdAt: new Date('2026-03-25T10:00:00Z'),
    updatedAt: new Date('2026-03-25T10:00:00Z'),
    ...overrides
});

describe('CommissionService', () => {
    let service: CommissionService;
    let repo: jest.Mocked<CommissionRepository>;

    beforeEach(() => {
        repo = {
            findProjectById: jest.fn(),
            findActiveContractsForProject: jest.fn(),
            findConfirmedReceiptsForProject: jest.fn(),
            findConfirmedPaymentsForProject: jest.fn(),
            findProjectHandoverById: jest.fn(),
            findCurrentReceiptJudgmentFreeze: jest.fn(),
            findApprovalSummarySnapshotById: jest.fn(),
            findCurrentFinalSettlementSnapshot: jest.fn(),
            findFinalSettlementSnapshotById: jest.fn(),
            findFinalSettlementSnapshotsForProject: jest.fn(),
            createFinalSettlementSnapshot: jest.fn(),
            persistAndFlushFinalSettlementSnapshot: jest.fn(),
            flushFinalSettlementSnapshot: jest.fn(),
            findCurrentRuleExplanationSnapshot: jest.fn(),
            findRuleExplanationSnapshotById: jest.fn(),
            findRuleExplanationSnapshotsForProject: jest.fn(),
            createRuleExplanationSnapshot: jest.fn(),
            persistAndFlushRuleExplanationSnapshot: jest.fn(),
            flushRuleExplanationSnapshot: jest.fn(),
            findCurrentDepartureExceptionDecision: jest.fn(),
            findDepartureExceptionDecisionById: jest.fn(),
            findDepartureExceptionDecisionsForProject: jest.fn(),
            createDepartureExceptionDecision: jest.fn(),
            persistAndFlushDepartureExceptionDecision: jest.fn(),
            flushDepartureExceptionDecision: jest.fn(),
            findAllRuleVersions: jest.fn(),
            findRuleVersionById: jest.fn(),
            findRuleVersionByCodeAndVersion: jest.fn(),
            findActiveRuleVersion: jest.fn(),
            createRuleVersion: jest.fn(),
            persistAndFlushRuleVersion: jest.fn(),
            flushRuleVersion: jest.fn(),
            findCurrentRoleAssignment: jest.fn(),
            findRoleAssignmentById: jest.fn(),
            findContractTermSnapshotById: jest.fn(),
            findAllRoleAssignmentsForProject: jest.fn(),
            createRoleAssignment: jest.fn(),
            persistAndFlushRoleAssignment: jest.fn(),
            flushRoleAssignment: jest.fn(),
            findOpenFreezeDisputeByFreezeVersionId: jest.fn(),
            findFreezeDisputeById: jest.fn(),
            createFreezeDisputeRecord: jest.fn(),
            persistAndFlushFreezeDisputeRecord: jest.fn(),
            flushFreezeDisputeRecord: jest.fn(),
            findFreezeChangeRequestById: jest.fn(),
            createFreezeChangeRequest: jest.fn(),
            persistAndFlushFreezeChangeRequest: jest.fn(),
            flushFreezeChangeRequest: jest.fn(),
            findCurrentCalculation: jest.fn(),
            findCalculationById: jest.fn(),
            findCalculationsForProject: jest.fn(),
            createCalculation: jest.fn(),
            persistAndFlushCalculation: jest.fn(),
            flushCalculation: jest.fn(),
            findPayoutById: jest.fn(),
            findPayoutsForProject: jest.fn(),
            findPayoutByProjectCalculationStage: jest.fn(),
            createPayout: jest.fn(),
            persistAndFlushPayout: jest.fn(),
            flushPayout: jest.fn(),
            transactional: jest.fn(async (work) => work({
                findOne: jest.fn(async (entity, where) => {
                    if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                        if (where.id === ASSIGNMENT_ID) {
                            return makeDraftAssignment({ status: 'frozen' });
                        }
                        return where.projectId === PROJECT_ID && where.isCurrent === true
                            ? makeDraftAssignment({ status: 'frozen' })
                            : null;
                    }
                    if ((entity as { name?: string })?.name === 'CommissionAdjustment') {
                        return where.id === ADJUSTMENT_ID ? makeDraftAdjustment({ status: 'approved' }) : null;
                    }
                    if ((entity as { name?: string })?.name === 'CommissionPayout') {
                        return where.id === PAYOUT_ID ? makeDraftPayout({ status: 'approved' }) : null;
                    }
                    if ((entity as { name?: string })?.name === 'CommissionCalculation') {
                        return where.id === CALCULATION_ID ? makeCalculatedResult({ status: 'effective' }) : null;
                    }
                    if ((entity as { name?: string })?.name === 'CommissionRuleVersion') {
                        return makeDraftRule({ status: 'active' });
                    }
                    if ((entity as { name?: string })?.name === 'CommissionFreezeDisputeRecord') {
                        return where.id === DISPUTE_ID ? makeFreezeDisputeRecord() : null;
                    }
                    if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                        return where.projectId === PROJECT_ID && where.isCurrent === true
                            ? makeDepartureExceptionDecision()
                            : null;
                    }
                    if ((entity as { name?: string })?.name === 'ReceiptRecord') {
                        return where.id === RETENTION_RECEIPT_ID ? makeRetentionReceipt() : null;
                    }
                    if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                        if (where.id === FINAL_SETTLEMENT_SNAPSHOT_ID) {
                            return makeFinalSettlementSnapshot();
                        }
                        return where.projectId === PROJECT_ID && where.isCurrent === true ? makeFinalSettlementSnapshot() : null;
                    }
                    if ((entity as { name?: string })?.name === 'CommissionRuleExplanationSnapshot') {
                        return where.projectId === PROJECT_ID && where.isCurrent === true ? makeRuleExplanationSnapshot() : null;
                    }
                    if ((entity as { name?: string })?.name === 'OperatingSignalToCommissionGateBinding') {
                        return where.projectId === PROJECT_ID && where.gateStageType === 'final' ? makeFinalGateBinding() : null;
                    }
                    if ((entity as { name?: string })?.name === 'CommissionGateReviewRecord') {
                        return where.id === GATE_REVIEW_RECORD_ID || where.bindingId === '59100000-0000-4000-8000-000000000001'
                            ? makeFinalGateReview()
                            : null;
                    }
                    return null;
                }),
                create: jest.fn((entity, input) => {
                    if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                        return makeDraftAssignment({
                            id: ASSIGNMENT_ID,
                            rowVersion: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...input
                        });
                    }
                    if ((entity as { name?: string })?.name === 'CommissionCalculation') {
                        return makeCalculatedResult({
                            id: CALCULATION_ID,
                            rowVersion: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...input
                        });
                    }
                    if ((entity as { name?: string })?.name === 'CommissionPayout') {
                        return makeDraftPayout({
                            id: PAYOUT_ID,
                            rowVersion: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...input
                        });
                    }
                    if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                        return makeFinalSettlementSnapshot({
                            id: NEXT_FINAL_SETTLEMENT_SNAPSHOT_ID,
                            rowVersion: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...input
                        });
                    }
                    if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                        return makeDepartureExceptionDecision({
                            id: NEXT_DEPARTURE_EXCEPTION_DECISION_ID,
                            rowVersion: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...input
                        });
                    }
                    if ((entity as { name?: string })?.name === 'CommissionRuleExplanationSnapshot') {
                        return makeRuleExplanationSnapshot({
                            id: RULE_EXPLANATION_SNAPSHOT_ID,
                            rowVersion: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...input
                        });
                    }
                    return { id: ADJUSTMENT_ID, rowVersion: 1, createdAt: new Date(), updatedAt: new Date(), ...input };
                }),
                persist: jest.fn(),
                find: jest.fn(async (entity, where) => {
                    if ((entity as { name?: string })?.name === 'ReceiptRecord' && where.projectId === PROJECT_ID) {
                        return [makeRetentionReceipt()];
                    }
                    if ((entity as { name?: string })?.name === 'CommissionPayout') {
                        return where.projectId === PROJECT_ID ? [makeDraftPayout({ status: 'approved' })] : [];
                    }
                    return [];
                }),
                flush: jest.fn()
            })),
            findAdjustmentById: jest.fn(),
            findAdjustmentsForProject: jest.fn(),
            createAdjustment: jest.fn(),
            persistAndFlushAdjustment: jest.fn(),
            flushAdjustment: jest.fn()
        } as unknown as jest.Mocked<CommissionRepository>;

        service = new CommissionService(repo);
    });

    // ── Rule Versions ────────────────────────────────────────────────────────

    describe('listRuleVersions', () => {
        it('returns list from repository', async () => {
            repo.findAllRuleVersions.mockResolvedValue([makeDraftRule() as never]);
            const result = await service.listRuleVersions();
            expect(result).toHaveLength(1);
            expect(result[0].ruleCode).toBe('STANDARD');
        });
    });

    describe('createRuleVersion', () => {
        it('creates a draft rule version', async () => {
            repo.findRuleVersionByCodeAndVersion.mockResolvedValue(null);
            const created = makeDraftRule();
            repo.createRuleVersion.mockReturnValue(created as never);
            repo.persistAndFlushRuleVersion.mockResolvedValue();

            const result = await service.createRuleVersion({
                ruleCode: 'STANDARD',
                version: 1,
                tierDefinitionJson: { tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }] }
            });

            expect(repo.createRuleVersion).toHaveBeenCalled();
            expect(result.status).toBe('draft');
        });

        it('throws ConflictException if rule_code+version already exists', async () => {
            repo.findRuleVersionByCodeAndVersion.mockResolvedValue(makeDraftRule() as never);

            await expect(
                service.createRuleVersion({
                    ruleCode: 'STANDARD',
                    version: 1,
                    tierDefinitionJson: { tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }] }
                })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('activateRuleVersion', () => {
        it('activates a draft rule version', async () => {
            const rule = makeDraftRule();
            repo.findRuleVersionById.mockResolvedValue(rule as never);
            repo.findActiveRuleVersion.mockResolvedValue(null);
            repo.flushRuleVersion.mockResolvedValue();

            const result = await service.activateRuleVersion(RULE_VERSION_ID);

            expect(rule.status).toBe('active');
            expect(result.status).toBe('active');
        });

        it('stops existing active version when activating new one', async () => {
            const existingActive = makeDraftRule({ id: '50000000-0000-4000-8000-000000000099', status: 'active' });
            const newDraft = makeDraftRule();
            repo.findRuleVersionById.mockResolvedValue(newDraft as never);
            repo.findActiveRuleVersion.mockResolvedValue(existingActive as never);
            repo.flushRuleVersion.mockResolvedValue();

            await service.activateRuleVersion(RULE_VERSION_ID);

            expect(existingActive.status).toBe('stopped');
            expect(newDraft.status).toBe('active');
        });

        it('throws NotFoundException if rule version not found', async () => {
            repo.findRuleVersionById.mockResolvedValue(null);
            await expect(service.activateRuleVersion('nonexistent')).rejects.toThrow(NotFoundException);
        });

        it('throws UnprocessableEntityException if not draft', async () => {
            repo.findRuleVersionById.mockResolvedValue(makeDraftRule({ status: 'active' }) as never);
            await expect(service.activateRuleVersion(RULE_VERSION_ID)).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('stopRuleVersion', () => {
        it('stops an active rule version', async () => {
            const rule = makeDraftRule({ status: 'active' });
            repo.findRuleVersionById.mockResolvedValue(rule as never);
            repo.flushRuleVersion.mockResolvedValue();

            const result = await service.stopRuleVersion(RULE_VERSION_ID);

            expect(rule.status).toBe('stopped');
            expect(result.status).toBe('stopped');
        });

        it('throws UnprocessableEntityException if not active', async () => {
            repo.findRuleVersionById.mockResolvedValue(makeDraftRule() as never);
            await expect(service.stopRuleVersion(RULE_VERSION_ID)).rejects.toThrow(UnprocessableEntityException);
        });
    });

    // ── Role Assignments ─────────────────────────────────────────────────────

    describe('getCurrentRoleAssignment', () => {
        it('returns current assignment if exists', async () => {
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment() as never);
            const result = await service.getCurrentRoleAssignment(PROJECT_ID);
            expect(result?.projectId).toBe(PROJECT_ID);
        });

        it('returns null if no current assignment', async () => {
            repo.findCurrentRoleAssignment.mockResolvedValue(null);
            const result = await service.getCurrentRoleAssignment(PROJECT_ID);
            expect(result).toBeNull();
        });
    });

    describe('getCommissionFinalSettlement', () => {
        it('maps the current final settlement snapshot into the view contract', async () => {
            repo.findCurrentFinalSettlementSnapshot.mockResolvedValue(makeFinalSettlementSnapshot() as never);
            repo.findRoleAssignmentById.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);

            const result = await service.getCommissionFinalSettlement(PROJECT_ID);

            expect(result.projectId).toBe(PROJECT_ID);
            expect(result.finalSettlementStatus).toBe('pending-final-settlement');
            expect(result.retentionDueDate).toBeNull();
            expect(result.retentionDueStatus).toBe('missing');
            expect(result.summarySnapshotId).toBe(HANDOVER_SUMMARY_SNAPSHOT_ID);
            expect(result.freezeVersionSummary.id).toBe(ASSIGNMENT_ID);
            expect(result.allowedActions).toEqual([]);
        });

        it('throws NotFoundException when the current final settlement snapshot is missing', async () => {
            repo.findCurrentFinalSettlementSnapshot.mockResolvedValue(null);

            await expect(service.getCommissionFinalSettlement(PROJECT_ID)).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when the linked freeze version is missing', async () => {
            repo.findCurrentFinalSettlementSnapshot.mockResolvedValue(makeFinalSettlementSnapshot() as never);
            repo.findRoleAssignmentById.mockResolvedValue(null);

            await expect(service.getCommissionFinalSettlement(PROJECT_ID)).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when the linked freeze version is no longer current frozen', async () => {
            repo.findCurrentFinalSettlementSnapshot.mockResolvedValue(makeFinalSettlementSnapshot() as never);
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({ status: 'superseded', isCurrent: false }) as never
            );

            await expect(service.getCommissionFinalSettlement(PROJECT_ID)).rejects.toThrow(NotFoundException);
        });
    });

    describe('getCommissionRuleExplanation', () => {
        it('hydrates shared evidence fields from the linked final settlement snapshot', async () => {
            repo.findCurrentRuleExplanationSnapshot.mockResolvedValue(makeRuleExplanationSnapshot() as never);
            repo.findFinalSettlementSnapshotById.mockResolvedValue(makeFinalSettlementSnapshot() as never);
            repo.findRoleAssignmentById.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);

            const result = await service.getCommissionRuleExplanation(PROJECT_ID);

            expect(result.projectId).toBe(PROJECT_ID);
            expect(result.gateDecisionCode).toBe('BLOCK_RETENTION');
            expect(result.blockingReasonCode).toBe('RETENTION_RECEIPT_PENDING');
            expect(result.summarySnapshotId).toBe(HANDOVER_SUMMARY_SNAPSHOT_ID);
            expect(result.taxImpactSummary).toBe('税务影响待闭合');
            expect(result.freezeVersionSummary.id).toBe(ASSIGNMENT_ID);
            expect(result.allowedActions).toEqual([]);
        });

        it('throws NotFoundException when the current rule explanation snapshot is missing', async () => {
            repo.findCurrentRuleExplanationSnapshot.mockResolvedValue(null);

            await expect(service.getCommissionRuleExplanation(PROJECT_ID)).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when the linked final settlement snapshot is no longer current', async () => {
            repo.findCurrentRuleExplanationSnapshot.mockResolvedValue(makeRuleExplanationSnapshot() as never);
            repo.findFinalSettlementSnapshotById.mockResolvedValue(
                makeFinalSettlementSnapshot({ isCurrent: false, status: 'superseded' }) as never
            );

            await expect(service.getCommissionRuleExplanation(PROJECT_ID)).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when the linked final settlement snapshot belongs to another project', async () => {
            repo.findCurrentRuleExplanationSnapshot.mockResolvedValue(makeRuleExplanationSnapshot() as never);
            repo.findFinalSettlementSnapshotById.mockResolvedValue(
                makeFinalSettlementSnapshot({ projectId: '00000000-0000-4000-8000-000000000099' }) as never
            );

            await expect(service.getCommissionRuleExplanation(PROJECT_ID)).rejects.toThrow(NotFoundException);
        });
    });

    describe('getRoleAssignmentDetail', () => {
        it('returns detail view with traceability fields', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({
                    status: 'frozen',
                    sourceHandoverId: HANDOVER_ID,
                    sourceHandoverRebaselineRecordId: HANDOVER_REBASELINE_RECORD_ID,
                    contractSummarySnapshotId: CONTRACT_SUMMARY_SNAPSHOT_ID,
                    handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
                    effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID,
                    frozenAt: new Date('2026-03-25T10:00:00Z')
                }) as never
            );
            repo.findApprovalSummarySnapshotById.mockResolvedValue(makeApprovalSummarySnapshot() as never);
            repo.findCurrentReceiptJudgmentFreeze.mockResolvedValue(makeReceiptJudgmentFreeze() as never);

            const result = await service.getRoleAssignmentDetail(ASSIGNMENT_ID);

            expect(result.roleAssignmentId).toBe(ASSIGNMENT_ID);
            expect(result.summarySnapshotId).toBe(HANDOVER_SUMMARY_SNAPSHOT_ID);
            expect(result.effectiveHandoverBaselineSummary.status).toBe('available');
            expect(result.allowedActions).toEqual(['submit-commission-freeze-dispute']);
        });

        it('throws NotFoundException when role assignment detail target is missing', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(null);

            await expect(service.getRoleAssignmentDetail(ASSIGNMENT_ID)).rejects.toThrow(NotFoundException);
        });

        it('suppresses dispute submit action when an open dispute already exists', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({
                    status: 'frozen',
                    sourceHandoverId: HANDOVER_ID,
                    handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
                    effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID
                }) as never
            );
            repo.findApprovalSummarySnapshotById.mockResolvedValue(makeApprovalSummarySnapshot() as never);
            repo.findCurrentReceiptJudgmentFreeze.mockResolvedValue(makeReceiptJudgmentFreeze() as never);
            repo.findOpenFreezeDisputeByFreezeVersionId.mockResolvedValue(makeFreezeDisputeRecord() as never);

            const result = await service.getRoleAssignmentDetail(ASSIGNMENT_ID);

            expect(result.allowedActions).toEqual([]);
        });
    });

    describe('createRoleAssignment', () => {
        it('creates first assignment at version 1', async () => {
            repo.findCurrentRoleAssignment.mockResolvedValue(null);

            const result = await service.createRoleAssignment(PROJECT_ID, {
                participants: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }]
            });

            expect(repo.transactional).toHaveBeenCalled();
            expect(result.version).toBe(1);
            expect(result.isCurrent).toBe(true);
        });

        it('creates next version and marks previous as not current', async () => {
            const existing = makeDraftAssignment({ status: 'frozen', version: 1 });
            repo.findCurrentRoleAssignment.mockResolvedValue(existing as never);

            const result = await service.createRoleAssignment(PROJECT_ID, {
                participants: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }]
            });

            expect(repo.transactional).toHaveBeenCalled();
            expect(result.version).toBe(2);
            expect(result.status).toBe('draft');
        });

        it('maps single-current unique violation to conflict', async () => {
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment({ version: 1 }) as never);
            repo.transactional.mockRejectedValueOnce({
                code: '23505',
                constraint: 'uq_commission_role_assignment_project_current'
            } as never);

            await expect(
                service.createRoleAssignment(PROJECT_ID, {
                    participants: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }]
                })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('freezeCommissionRoleAssignment', () => {
        it('freezes assignment against confirmed handover chain', async () => {
            const assignment = makeDraftAssignment();
            const handover = makeConfirmedHandover();
            const summarySnapshot = makeApprovalSummarySnapshot();
            const receiptFreeze = makeReceiptJudgmentFreeze();

            repo.findRoleAssignmentById.mockResolvedValue(assignment as never);
            repo.findProjectHandoverById.mockResolvedValue(handover as never);
            repo.findApprovalSummarySnapshotById.mockResolvedValue(summarySnapshot as never);
            repo.findCurrentReceiptJudgmentFreeze.mockResolvedValue(receiptFreeze as never);
            repo.flushRoleAssignment.mockResolvedValue();

            const result = await service.freezeCommissionRoleAssignment(ASSIGNMENT_ID, 'user-1', {
                sourceHandoverId: HANDOVER_ID,
                handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
                expectedVersion: 1
            });

            expect(assignment.status).toBe('frozen');
            expect(assignment.sourceHandoverId).toBe(HANDOVER_ID);
            expect(assignment.contractSummarySnapshotId).toBe(CONTRACT_SUMMARY_SNAPSHOT_ID);
            expect(result.summarySnapshotId).toBe(HANDOVER_SUMMARY_SNAPSHOT_ID);
            expect(result.businessStatusAfter).toBe('frozen');
        });

        it('rejects freeze when handover summary snapshot mismatches the requested chain', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(makeDraftAssignment() as never);
            repo.findProjectHandoverById.mockResolvedValue(
                makeConfirmedHandover({ summarySnapshotId: '62000000-0000-4000-8000-000000000099' }) as never
            );

            await expect(
                service.freezeCommissionRoleAssignment(ASSIGNMENT_ID, 'user-1', {
                    sourceHandoverId: HANDOVER_ID,
                    handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects freeze when current receipt judgment freeze does not align with handover chain', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(makeDraftAssignment() as never);
            repo.findProjectHandoverById.mockResolvedValue(makeConfirmedHandover() as never);
            repo.findApprovalSummarySnapshotById.mockResolvedValue(makeApprovalSummarySnapshot() as never);
            repo.findCurrentReceiptJudgmentFreeze.mockResolvedValue(
                makeReceiptJudgmentFreeze({ sourceHandoverSummarySnapshotId: '62000000-0000-4000-8000-000000000099' }) as never
            );

            await expect(
                service.freezeCommissionRoleAssignment(ASSIGNMENT_ID, 'user-1', {
                    sourceHandoverId: HANDOVER_ID,
                    handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects freeze when the assignment is a stale non-current draft', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({ isCurrent: false }) as never
            );

            await expect(
                service.freezeCommissionRoleAssignment(ASSIGNMENT_ID, 'user-1', {
                    sourceHandoverId: HANDOVER_ID,
                    handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
                    expectedVersion: 1
                })
            ).rejects.toThrow(
                new UnprocessableEntityException('只有当前有效的角色分配草稿可以冻结，当前版本已不是 current')
            );
        });
    });

    describe('submitCommissionFreezeDispute', () => {
        it('creates a dispute record from the current frozen version', async () => {
            const assignment = makeDraftAssignment({
                status: 'frozen',
                sourceHandoverId: HANDOVER_ID,
                handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
            });
            const dispute = makeFreezeDisputeRecord();

            repo.findRoleAssignmentById.mockResolvedValue(assignment as never);
            repo.findOpenFreezeDisputeByFreezeVersionId.mockResolvedValue(null);
            repo.findApprovalSummarySnapshotById.mockResolvedValue(makeApprovalSummarySnapshot() as never);
            repo.findCurrentCalculation.mockResolvedValue(null);
            repo.findPayoutsForProject.mockResolvedValue([]);
            repo.createFreezeDisputeRecord.mockReturnValue(dispute as never);
            repo.persistAndFlushFreezeDisputeRecord.mockResolvedValue();

            const result = await service.submitCommissionFreezeDispute('user-1', {
                freezeVersionId: ASSIGNMENT_ID,
                disputeReason: '角色权重需要调整',
                affectedAssignmentIds: ['00000000-0000-4000-8000-000000000010'],
                recalculationImpactMode: 'recalculate-and-adjust',
                expectedVersion: 1
            });

            expect(repo.createFreezeDisputeRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    freezeVersionId: ASSIGNMENT_ID,
                    arbitrationStatus: 'pending',
                    status: 'submitted'
                })
            );
            expect(result.disputeRecordId).toBe(DISPUTE_ID);
            expect(result.businessStatusAfter).toBe('dispute-submitted');
        });

        it('rejects duplicate open disputes on the same freeze version', async () => {
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({
                    status: 'frozen',
                    sourceHandoverId: HANDOVER_ID,
                    handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                }) as never
            );
            repo.findOpenFreezeDisputeByFreezeVersionId.mockResolvedValue(makeFreezeDisputeRecord() as never);

            await expect(
                service.submitCommissionFreezeDispute('user-1', {
                    freezeVersionId: ASSIGNMENT_ID,
                    disputeReason: '重复提交',
                    affectedAssignmentIds: ['00000000-0000-4000-8000-000000000010'],
                    recalculationImpactMode: 'recalculate-and-adjust'
                })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('getCommissionFreezeDispute', () => {
        it('returns dispute detail view', async () => {
            repo.findFreezeDisputeById.mockResolvedValue(makeFreezeDisputeRecord() as never);

            const result = await service.getCommissionFreezeDispute(DISPUTE_ID);

            expect(result.disputeRecordId).toBe(DISPUTE_ID);
            expect(result.allowedActions).toEqual(['arbitrate-commission-freeze-dispute']);
        });
    });

    describe('arbitrateCommissionFreezeDispute', () => {
        it('arbitrates dispute and creates replacement freeze version', async () => {
            const disputedAssignment = makeDraftAssignment({
                status: 'frozen',
                sourceHandoverId: HANDOVER_ID,
                sourceHandoverRebaselineRecordId: HANDOVER_REBASELINE_RECORD_ID,
                contractSummarySnapshotId: CONTRACT_SUMMARY_SNAPSHOT_ID,
                handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
                effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID
            });
            const currentCalculation = makeCalculatedResult({ status: 'effective' });
            const payouts = [makeDraftPayout({ status: 'paid' })];

            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionFreezeDisputeRecord') {
                            return where.id === DISPUTE_ID ? makeFreezeDisputeRecord() : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            if (where.id === ASSIGNMENT_ID) {
                                return disputedAssignment;
                            }
                            if (where.projectId === PROJECT_ID && where.isCurrent === true) {
                                return disputedAssignment;
                            }
                        }
                        if ((entity as { name?: string })?.name === 'CommissionCalculation') {
                            return currentCalculation;
                        }
                        return null;
                    }),
                    find: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionPayout' && where.projectId === PROJECT_ID) {
                            return payouts;
                        }
                        return [];
                    }),
                    create: jest.fn((entity, input) => ({ rowVersion: 1, createdAt: new Date(), updatedAt: new Date(), ...input })),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            const result = await service.arbitrateCommissionFreezeDispute(DISPUTE_ID, 'user-1', {
                arbitrationDecision: 'replace-freeze-version',
                replacementAssignmentPayload: {
                    participants: [
                        {
                            userId: '00000000-0000-4000-8000-000000000010',
                            displayName: '张三',
                            roleType: 'sales-owner',
                            weight: 0.7
                        },
                        {
                            userId: '00000000-0000-4000-8000-000000000011',
                            displayName: '李四',
                            roleType: 'delivery-owner',
                            weight: 0.3
                        }
                    ]
                },
                recalculationImpactMode: 'recalculate-and-adjust',
                expectedVersion: 1
            });

            expect(result.disputeRecordId).toBe(DISPUTE_ID);
            expect(result.replacementFreezeVersionId).not.toBeNull();
            expect(result.resultStatus).toBe('replacement-created');
            expect(disputedAssignment.isCurrent).toBe(false);
            expect(disputedAssignment.status).toBe('superseded');
        });
    });

    describe('getCommissionFreezeChangeRequest', () => {
        it('returns change request detail', async () => {
            repo.findFreezeChangeRequestById.mockResolvedValue(makeFreezeChangeRequest() as never);

            const result = await service.getCommissionFreezeChangeRequest(CHANGE_REQUEST_ID);

            expect(result.changeRequestId).toBe(CHANGE_REQUEST_ID);
            expect(result.replacementFreezeVersionId).toBe('51000000-0000-4000-8000-000000000099');
        });
    });

    describe('createDepartureExceptionDecision', () => {
        it('creates the first current decision from the current frozen version', async () => {
            const freezeVersion = makeDraftAssignment({
                status: 'frozen',
                handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
            });

            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findApprovalSummarySnapshotById.mockResolvedValue(makeApprovalSummarySnapshot() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID ? freezeVersion : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                            return null;
                        }
                        return null;
                    }),
                    create: jest.fn((entity, input) => {
                        if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                            return makeDepartureExceptionDecision({
                                id: DEPARTURE_EXCEPTION_DECISION_ID,
                                rowVersion: 1,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                ...input
                            });
                        }
                        return input;
                    }),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            const result = await service.createDepartureExceptionDecision(PROJECT_ID, 'user-1', {
                freezeVersionId: ASSIGNMENT_ID,
                departureScenarioCode: 'employee-left-company',
                decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
                decisionSummary: '原销售已离职，后续质保金结算前需补承接确认',
                confirmationRequirementSummary: '请销售负责人确认责任承接人与权重',
                summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
            });

            expect(result.id).toBe(DEPARTURE_EXCEPTION_DECISION_ID);
            expect(result.projectId).toBe(PROJECT_ID);
            expect(result.version).toBe(1);
            expect(result.isCurrent).toBe(true);
            expect(result.summarySnapshotId).toBe(HANDOVER_SUMMARY_SNAPSHOT_ID);
            expect(result.status).toBe('active');
        });

        it('supersedes the current decision and increments version', async () => {
            const freezeVersion = makeDraftAssignment({
                status: 'frozen',
                handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
            });
            const currentDecision = makeDepartureExceptionDecision();
            const createdInputs: Record<string, unknown>[] = [];

            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findApprovalSummarySnapshotById.mockResolvedValue(makeApprovalSummarySnapshot() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID ? freezeVersion : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                            return where.projectId === PROJECT_ID && where.isCurrent === true ? currentDecision : null;
                        }
                        return null;
                    }),
                    create: jest.fn((entity, input) => {
                        if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                            createdInputs.push(input);
                            return makeDepartureExceptionDecision({
                                id: NEXT_DEPARTURE_EXCEPTION_DECISION_ID,
                                rowVersion: 1,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                ...input
                            });
                        }
                        return input;
                    }),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            const result = await service.createDepartureExceptionDecision(PROJECT_ID, 'user-1', {
                freezeVersionId: ASSIGNMENT_ID,
                departureScenarioCode: 'employee-left-company',
                decisionCode: 'ALLOW_RETENTION_WITH_SUCCESSOR',
                decisionSummary: '允许在承接确认后进入质保金结算',
                summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
            });

            expect(currentDecision.isCurrent).toBe(false);
            expect(currentDecision.status).toBe('superseded');
            expect(currentDecision.updatedBy).toBe('user-1');
            expect(createdInputs[0]).toEqual(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    freezeVersionId: ASSIGNMENT_ID,
                    version: 2,
                    supersedesId: DEPARTURE_EXCEPTION_DECISION_ID,
                    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID,
                    handledBy: 'user-1',
                    createdBy: 'user-1',
                    updatedBy: 'user-1'
                })
            );
            expect(result.id).toBe(NEXT_DEPARTURE_EXCEPTION_DECISION_ID);
            expect(result.version).toBe(2);
        });

        it('rejects when the request summary snapshot does not match the frozen version anchor', async () => {
            const freezeVersion = makeDraftAssignment({
                status: 'frozen',
                handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
            });

            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findApprovalSummarySnapshotById.mockResolvedValue(makeApprovalSummarySnapshot() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID ? freezeVersion : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                            return null;
                        }
                        return null;
                    }),
                    create: jest.fn(),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            await expect(
                service.createDepartureExceptionDecision(PROJECT_ID, 'user-1', {
                    freezeVersionId: ASSIGNMENT_ID,
                    departureScenarioCode: 'employee-left-company',
                    decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
                    decisionSummary: '原销售已离职',
                    summarySnapshotId: '62000000-0000-4000-8000-000000000099'
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects when the referenced freeze version belongs to another project', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID
                                ? makeDraftAssignment({
                                      projectId: '00000000-0000-4000-8000-000000000099',
                                      status: 'frozen',
                                      handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                                  })
                                : null;
                        }
                        return null;
                    }),
                    create: jest.fn(),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            await expect(
                service.createDepartureExceptionDecision(PROJECT_ID, 'user-1', {
                    freezeVersionId: ASSIGNMENT_ID,
                    departureScenarioCode: 'employee-left-company',
                    decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
                    decisionSummary: '原销售已离职',
                    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects when the referenced freeze version is not frozen', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID
                                ? makeDraftAssignment({
                                      status: 'draft',
                                      isCurrent: true,
                                      handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                                  })
                                : null;
                        }
                        return null;
                    }),
                    create: jest.fn(),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            await expect(
                service.createDepartureExceptionDecision(PROJECT_ID, 'user-1', {
                    freezeVersionId: ASSIGNMENT_ID,
                    departureScenarioCode: 'employee-left-company',
                    decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
                    decisionSummary: '原销售已离职',
                    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                })
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('rejects when the referenced freeze version is no longer current', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID
                                ? makeDraftAssignment({
                                      status: 'frozen',
                                      isCurrent: false,
                                      handoverSummarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                                  })
                                : null;
                        }
                        return null;
                    }),
                    create: jest.fn(),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            await expect(
                service.createDepartureExceptionDecision(PROJECT_ID, 'user-1', {
                    freezeVersionId: ASSIGNMENT_ID,
                    departureScenarioCode: 'employee-left-company',
                    decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
                    decisionSummary: '原销售已离职',
                    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                })
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('rejects when the referenced freeze version has no handover summary snapshot', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID
                                ? makeDraftAssignment({
                                      status: 'frozen',
                                      handoverSummarySnapshotId: null
                                  })
                                : null;
                        }
                        return null;
                    }),
                    create: jest.fn(),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            await expect(
                service.createDepartureExceptionDecision(PROJECT_ID, 'user-1', {
                    freezeVersionId: ASSIGNMENT_ID,
                    departureScenarioCode: 'employee-left-company',
                    decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
                    decisionSummary: '原销售已离职',
                    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('maps concurrent current/version conflicts to ConflictException', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.transactional.mockRejectedValueOnce({
                code: '23505',
                constraint: 'uq_cded_project_current'
            } as never);

            await expect(
                service.createDepartureExceptionDecision(PROJECT_ID, 'user-1', {
                    freezeVersionId: ASSIGNMENT_ID,
                    departureScenarioCode: 'employee-left-company',
                    decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
                    decisionSummary: '原销售已离职',
                    summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID
                })
            ).rejects.toThrow(ConflictException);
        });
    });

    // ── Calculations ────────────────────────────────────────────────────────

    describe('listCalculations', () => {
        it('returns calculation list from repository', async () => {
            repo.findCalculationsForProject.mockResolvedValue([makeCalculatedResult() as never]);
            const result = await service.listCalculations(PROJECT_ID);
            expect(result).toHaveLength(1);
            expect(result[0].commissionPool).toBe('2400.00');
        });
    });

    describe('triggerCalculation', () => {
        it('creates a new calculated commission result', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findActiveContractsForProject.mockResolvedValue([makeActiveContract() as never]);
            repo.findConfirmedReceiptsForProject.mockResolvedValue([{ receiptAmount: '100000.00' }] as never);
            repo.findConfirmedPaymentsForProject.mockResolvedValue([{ amountExcludingTax: '70000.00' }] as never);
            repo.findRuleVersionById.mockResolvedValue(makeDraftRule({ id: RULE_VERSION_ID, status: 'active' }) as never);
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);
            repo.findCurrentCalculation.mockResolvedValue(null);

            const result = await service.createCalculation(PROJECT_ID, buildCalculationRequest());

            expect(repo.findRuleVersionById).toHaveBeenCalledWith(RULE_VERSION_ID);
            expect(repo.transactional).toHaveBeenCalled();
            expect(result.contributionMargin).toBe('30000.00');
            expect(result.commissionPool).toBe('2400.00');
        });

        it('throws if requested rule version does not exist', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findActiveContractsForProject.mockResolvedValue([makeActiveContract() as never]);
            repo.findConfirmedReceiptsForProject.mockResolvedValue([{ receiptAmount: '100000.00' }] as never);
            repo.findConfirmedPaymentsForProject.mockResolvedValue([{ amountExcludingTax: '70000.00' }] as never);
            repo.findRuleVersionById.mockResolvedValue(null);
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);

            await expect(service.createCalculation(PROJECT_ID, buildCalculationRequest())).rejects.toThrow(NotFoundException);
        });

        it('throws if requested rule version is not active', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findActiveContractsForProject.mockResolvedValue([makeActiveContract() as never]);
            repo.findConfirmedReceiptsForProject.mockResolvedValue([{ receiptAmount: '100000.00' }] as never);
            repo.findConfirmedPaymentsForProject.mockResolvedValue([{ amountExcludingTax: '70000.00' }] as never);
            repo.findRuleVersionById.mockResolvedValue(makeDraftRule({ id: RULE_VERSION_ID, status: 'draft' }) as never);
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);

            await expect(service.createCalculation(PROJECT_ID, buildCalculationRequest())).rejects.toThrow(UnprocessableEntityException);
        });

        it('throws if project has no active contract facts', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findActiveContractsForProject.mockResolvedValue([]);

            await expect(service.createCalculation(PROJECT_ID, buildCalculationRequest())).rejects.toThrow(UnprocessableEntityException);
        });

        it('throws if confirmed receipts are less than requested revenue', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findActiveContractsForProject.mockResolvedValue([makeActiveContract() as never]);
            repo.findConfirmedReceiptsForProject.mockResolvedValue([{ receiptAmount: '50000.00' }] as never);
            repo.findConfirmedPaymentsForProject.mockResolvedValue([{ amountExcludingTax: '70000.00' }] as never);

            await expect(service.createCalculation(PROJECT_ID, buildCalculationRequest())).rejects.toThrow(UnprocessableEntityException);
        });

        it('throws if confirmed payments are less than requested cost', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findActiveContractsForProject.mockResolvedValue([makeActiveContract() as never]);
            repo.findConfirmedReceiptsForProject.mockResolvedValue([{ receiptAmount: '100000.00' }] as never);
            repo.findConfirmedPaymentsForProject.mockResolvedValue([{ amountExcludingTax: '30000.00' }] as never);

            await expect(service.createCalculation(PROJECT_ID, buildCalculationRequest())).rejects.toThrow(UnprocessableEntityException);
        });

        it('maps calculation single-current unique violation to conflict', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findActiveContractsForProject.mockResolvedValue([makeActiveContract() as never]);
            repo.findConfirmedReceiptsForProject.mockResolvedValue([{ receiptAmount: '100000.00' }] as never);
            repo.findConfirmedPaymentsForProject.mockResolvedValue([{ amountExcludingTax: '70000.00' }] as never);
            repo.findRuleVersionById.mockResolvedValue(makeDraftRule({ id: RULE_VERSION_ID, status: 'active' }) as never);
            repo.findCurrentRoleAssignment.mockResolvedValue(makeDraftAssignment({ status: 'frozen' }) as never);
            repo.findCurrentCalculation.mockResolvedValue(makeCalculatedResult({ id: '52000000-0000-4000-8000-000000000099', version: 1 }) as never);
            repo.createCalculation.mockReturnValue(makeCalculatedResult({ version: 2 }) as never);
            repo.persistAndFlushCalculation.mockRejectedValue({
                code: '23505',
                constraint: 'uq_commission_calculation_project_current'
            });

            await expect(service.createCalculation(PROJECT_ID, buildCalculationRequest())).rejects.toThrow(ConflictException);
        });
    });

    describe('confirmCalculation', () => {
        it('marks calculated result as effective', async () => {
            const calculation = makeCalculatedResult();
            repo.findCalculationById.mockResolvedValue(calculation as never);
            repo.flushCalculation.mockResolvedValue();

            const result = await service.approveCalculation(CALCULATION_ID, {});

            expect(calculation.status).toBe('effective');
            expect(result.status).toBe('effective');
        });

        it('throws if calculation is not in calculated status', async () => {
            repo.findCalculationById.mockResolvedValue(makeCalculatedResult({ status: 'effective' }) as never);
            await expect(service.approveCalculation(CALCULATION_ID, {})).rejects.toThrow(UnprocessableEntityException);
        });
    });

    // ── Payouts ─────────────────────────────────────────────────────────────

    describe('listPayouts', () => {
        it('returns payout list from repository', async () => {
            repo.findPayoutsForProject.mockResolvedValue([makeDraftPayout() as never]);
            const result = await service.listPayouts(PROJECT_ID);
            expect(result).toHaveLength(1);
            expect(result[0].theoreticalCapAmount).toBe('480.00');
        });
    });

    describe('createPayout', () => {
        it('creates payout draft from effective calculation', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findCalculationById.mockResolvedValue(makeCalculatedResult({ status: 'effective' }) as never);
            repo.findPayoutByProjectCalculationStage.mockResolvedValue(null);
            const created = makeDraftPayout();
            repo.createPayout.mockReturnValue(created as never);
            repo.persistAndFlushPayout.mockResolvedValue();

            const result = await service.createPayout(PROJECT_ID, {
                calculationId: CALCULATION_ID,
                stageType: 'first',
                selectedTier: 'basic'
            });

            expect(repo.createPayout).toHaveBeenCalledWith(expect.objectContaining({ stageType: 'first', selectedTier: 'basic' }));
            expect(result.status).toBe('draft');
        });

        it('throws if payout already exists for stage', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findCalculationById.mockResolvedValue(makeCalculatedResult({ status: 'effective' }) as never);
            repo.findPayoutByProjectCalculationStage.mockResolvedValue(makeDraftPayout() as never);

            await expect(
                service.createPayout(PROJECT_ID, {
                    calculationId: CALCULATION_ID,
                    stageType: 'first',
                    selectedTier: 'basic'
                })
            ).rejects.toThrow(ConflictException);
        });

        it('creates retention payout draft from the remaining unpaid pool after non-retention settlement', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findCalculationById.mockResolvedValue(makeCalculatedResult({ status: 'effective' }) as never);
            repo.findCurrentFinalSettlementSnapshot.mockResolvedValue(
                makeFinalSettlementSnapshot({
                    finalSettlementStatus: 'pending-retention-settlement',
                    nonRetentionSettlementStatus: 'settled-non-retention',
                    retentionSettlementStatus: 'waiting-retention'
                }) as never
            );
            repo.findPayoutsForProject.mockResolvedValue([
                makeDraftPayout({
                    id: '53000000-0000-4000-8000-000000000011',
                    stageType: 'first',
                    status: 'paid',
                    paidRecordAmount: '480.00'
                }) as never,
                makeDraftPayout({
                    id: '53000000-0000-4000-8000-000000000012',
                    stageType: 'second',
                    status: 'paid',
                    paidRecordAmount: '960.00'
                }) as never
            ]);
            repo.createPayout.mockImplementation((input) => makeDraftPayout({ stageType: 'retention', theoreticalCapAmount: input.theoreticalCapAmount, ...input }) as never);
            repo.persistAndFlushPayout.mockResolvedValue();

            const result = await service.createPayout(PROJECT_ID, {
                calculationId: CALCULATION_ID,
                stageType: 'retention',
                selectedTier: 'basic'
            });

            expect(repo.createPayout).toHaveBeenCalledWith(expect.objectContaining({ stageType: 'retention', theoreticalCapAmount: '960.00' }));
            expect(result.stageType).toBe('retention');
            expect(result.theoreticalCapAmount).toBe('960.00');
        });
    });

    describe('submitPayoutApproval', () => {
        it('moves payout from draft to pending-approval', async () => {
            const payout = makeDraftPayout();
            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.flushPayout.mockResolvedValue();

            const result = await service.submitPayoutApproval(PAYOUT_ID, {});

            expect(payout.status).toBe('pending-approval');
            expect(result.status).toBe('pending-approval');
        });

        it('rejects supplement payout submission', async () => {
            repo.findPayoutById.mockResolvedValue(makeDraftPayout({ payoutKind: 'supplement' }) as never);

            await expect(service.submitPayoutApproval(PAYOUT_ID, {})).rejects.toThrow(UnprocessableEntityException);
        });

        it('allows retention payout submission after final settlement enters the retention stage', async () => {
            const payout = makeDraftPayout({ stageType: 'retention' });
            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.findCurrentFinalSettlementSnapshot.mockResolvedValue(
                makeFinalSettlementSnapshot({
                    finalSettlementStatus: 'pending-retention-settlement',
                    nonRetentionSettlementStatus: 'settled-non-retention',
                    retentionSettlementStatus: 'waiting-retention'
                }) as never
            );
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({ status: 'frozen', effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID }) as never
            );
            repo.findContractTermSnapshotById.mockResolvedValue(makeContractTermSnapshot() as never);
            repo.flushPayout.mockResolvedValue();

            const result = await service.submitPayoutApproval(PAYOUT_ID, { payoutStage: 'retention' });

            expect(payout.status).toBe('pending-approval');
            expect(result.status).toBe('pending-approval');
        });

        it('blocks retention payout submission when retention due date is still pending', async () => {
            const payout = makeDraftPayout({ stageType: 'retention' });
            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.findCurrentFinalSettlementSnapshot.mockResolvedValue(
                makeFinalSettlementSnapshot({
                    finalSettlementStatus: 'pending-retention-settlement',
                    nonRetentionSettlementStatus: 'settled-non-retention',
                    retentionSettlementStatus: 'waiting-retention'
                }) as never
            );
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({ status: 'frozen', effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID }) as never
            );
            repo.findContractTermSnapshotById.mockResolvedValue(
                makeContractTermSnapshot({ retentionDueDate: '2099-01-01' }) as never
            );

            await expect(service.submitPayoutApproval(PAYOUT_ID, { payoutStage: 'retention' })).rejects.toThrow(
                UnprocessableEntityException
            );
        });
    });

    describe('approvePayout', () => {
        it('approves payout with default approved amount', async () => {
            const payout = makeDraftPayout({ status: 'pending-approval' });
            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.flushPayout.mockResolvedValue();

            const result = await service.approvePayout(PAYOUT_ID, {});

            expect(payout.status).toBe('approved');
            expect(result.approvedAmount).toBe('480.00');
        });

        it('throws if approved amount is above cap', async () => {
            repo.findPayoutById.mockResolvedValue(makeDraftPayout({ status: 'pending-approval' }) as never);
            await expect(service.approvePayout(PAYOUT_ID, { approvedAmount: '999.00' })).rejects.toThrow(UnprocessableEntityException);
        });

        it('writes current final settlement and rule explanation snapshots when approving final payout directly', async () => {
            const payout = makeDraftPayout({ stageType: 'final', status: 'pending-approval' });
            const createdSnapshots: Record<string, unknown>[] = [];
            const createdRuleExplanations: Record<string, unknown>[] = [];

            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({ status: 'frozen', effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID }) as never
            );
            repo.findContractTermSnapshotById.mockResolvedValue(makeContractTermSnapshot() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionPayout') {
                            return where.id === PAYOUT_ID ? payout : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.projectId === PROJECT_ID || where.id === ASSIGNMENT_ID ? makeDraftAssignment({ status: 'frozen' }) : null;
                        }
                        if ((entity as { name?: string })?.name === 'OperatingSignalToCommissionGateBinding') {
                            return makeFinalGateBinding();
                        }
                        if ((entity as { name?: string })?.name === 'CommissionGateReviewRecord') {
                            return makeFinalGateReview();
                        }
                        if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                            return null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRuleExplanationSnapshot') {
                            return null;
                        }
                        return null;
                    }),
                    create: jest.fn((entity, input) => {
                        if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                            createdSnapshots.push(input);
                            return makeFinalSettlementSnapshot({ id: NEXT_FINAL_SETTLEMENT_SNAPSHOT_ID, ...input });
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRuleExplanationSnapshot') {
                            createdRuleExplanations.push(input);
                            return makeRuleExplanationSnapshot({ finalSettlementSnapshotId: NEXT_FINAL_SETTLEMENT_SNAPSHOT_ID, ...input });
                        }
                        return input;
                    }),
                    persist: jest.fn(),
                    find: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            const result = await service.approvePayout(PAYOUT_ID, {});

            expect(createdSnapshots[0]).toEqual(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    freezeVersionId: ASSIGNMENT_ID,
                    gateReviewRecordId: GATE_REVIEW_RECORD_ID,
                    finalSettlementStatus: 'pending-final-settlement',
                    nonRetentionSettlementStatus: 'pending-non-retention',
                    retentionSettlementStatus: 'waiting-retention'
                })
            );
            expect(createdRuleExplanations[0]).toEqual(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    currentStageStatus: 'pending-final-settlement',
                    gateDecisionCode: 'ALLOW_FINAL_SETTLEMENT'
                })
            );
            expect(result.status).toBe('approved');
        });
    });

    describe('registerPayout', () => {
        it('registers payout as paid', async () => {
            const payout = makeDraftPayout({ status: 'approved', approvedAmount: '480.00' });
            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.flushPayout.mockResolvedValue();

            const result = await service.registerPayout(PAYOUT_ID, { paidRecordAmount: '400.00' });

            expect(payout.status).toBe('paid');
            expect(result.paidRecordAmount).toBe('400.00');
        });

        it('throws if paid amount exceeds approved amount', async () => {
            repo.findPayoutById.mockResolvedValue(makeDraftPayout({ status: 'approved', approvedAmount: '480.00' }) as never);
            await expect(service.registerPayout(PAYOUT_ID, { paidRecordAmount: '500.00' })).rejects.toThrow(UnprocessableEntityException);
        });

        it('rejects supplement payout registration', async () => {
            repo.findPayoutById.mockResolvedValue(
                makeDraftPayout({ status: 'approved', payoutKind: 'supplement', approvedAmount: '120.00' }) as never
            );

            await expect(service.registerPayout(PAYOUT_ID, { paidRecordAmount: '120.00' })).rejects.toThrow(UnprocessableEntityException);
        });

        it('supersedes the current final settlement snapshot when final payout registration is completed', async () => {
            const payout = makeDraftPayout({
                stageType: 'final',
                status: 'approved',
                approvedAmount: '480.00'
            });
            const currentSnapshot = makeFinalSettlementSnapshot({
                finalSettlementStatus: 'pending-final-settlement',
                nonRetentionSettlementStatus: 'pending-non-retention',
                currentActionLevel: 'ALLOW'
            });
            const createdSnapshots: Record<string, unknown>[] = [];
            const createdRuleExplanations: Record<string, unknown>[] = [];

            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({ status: 'frozen', effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID }) as never
            );
            repo.findContractTermSnapshotById.mockResolvedValue(makeContractTermSnapshot() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionPayout') {
                            return where.id === PAYOUT_ID ? payout : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                            return where.projectId === PROJECT_ID && where.isCurrent === true ? currentSnapshot : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID ? makeDraftAssignment({ status: 'frozen' }) : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionGateReviewRecord') {
                            return where.id === GATE_REVIEW_RECORD_ID ? makeFinalGateReview() : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                            return null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRuleExplanationSnapshot') {
                            return null;
                        }
                        return null;
                    }),
                    create: jest.fn((entity, input) => {
                        if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                            createdSnapshots.push(input);
                            return makeFinalSettlementSnapshot({
                                id: NEXT_FINAL_SETTLEMENT_SNAPSHOT_ID,
                                ...input
                            });
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRuleExplanationSnapshot') {
                            createdRuleExplanations.push(input);
                            return makeRuleExplanationSnapshot({
                                finalSettlementSnapshotId: NEXT_FINAL_SETTLEMENT_SNAPSHOT_ID,
                                ...input
                            });
                        }
                        return input;
                    }),
                    persist: jest.fn(),
                    find: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            const result = await service.registerPayout(PAYOUT_ID, { paidRecordAmount: '400.00' }, 'user-1');

            expect(payout.status).toBe('paid');
            expect(currentSnapshot.isCurrent).toBe(false);
            expect(currentSnapshot.status).toBe('superseded');
            expect(createdSnapshots[0]).toEqual(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    freezeVersionId: ASSIGNMENT_ID,
                    gateReviewRecordId: GATE_REVIEW_RECORD_ID,
                    finalSettlementStatus: 'pending-retention-settlement',
                    nonRetentionSettlementStatus: 'settled-non-retention',
                    retentionSettlementStatus: 'waiting-retention',
                    supersedesId: FINAL_SETTLEMENT_SNAPSHOT_ID,
                    createdBy: 'user-1',
                    updatedBy: 'user-1'
                })
            );
            expect(createdRuleExplanations[0]).toEqual(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    finalSettlementSnapshotId: createdSnapshots[0].id
                })
            );
            expect(result.status).toBe('paid');
            expect(result.paidRecordAmount).toBe('400.00');
        });

        it('settles the current final settlement snapshot when retention payout registration is completed', async () => {
            const payout = makeDraftPayout({
                stageType: 'retention',
                status: 'approved',
                approvedAmount: '360.00',
                theoreticalCapAmount: '360.00'
            });
            const currentSnapshot = makeFinalSettlementSnapshot({
                finalSettlementStatus: 'pending-retention-settlement',
                nonRetentionSettlementStatus: 'settled-non-retention',
                retentionSettlementStatus: 'ready-retention',
                retentionReceiptRecordId: RETENTION_RECEIPT_ID,
                departureExceptionDecisionId: DEPARTURE_EXCEPTION_DECISION_ID,
                currentActionLevel: 'ALLOW'
            });
            const createdSnapshots: Record<string, unknown>[] = [];
            const createdRuleExplanations: Record<string, unknown>[] = [];

            repo.findPayoutById.mockResolvedValue(payout as never);
            repo.findRoleAssignmentById.mockResolvedValue(
                makeDraftAssignment({ status: 'frozen', effectiveHandoverBaselineSnapshotId: EFFECTIVE_BASELINE_SNAPSHOT_ID }) as never
            );
            repo.findContractTermSnapshotById.mockResolvedValue(makeContractTermSnapshot() as never);
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionPayout') {
                            return where.id === PAYOUT_ID ? payout : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                            return where.projectId === PROJECT_ID && where.isCurrent === true ? currentSnapshot : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID ? makeDraftAssignment({ status: 'frozen' }) : null;
                        }
                        if ((entity as { name?: string })?.name === 'ReceiptRecord') {
                            return where.id === RETENTION_RECEIPT_ID ? makeRetentionReceipt() : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionDepartureExceptionDecision') {
                            return where.id === DEPARTURE_EXCEPTION_DECISION_ID
                                ? makeDepartureExceptionDecision({
                                      decisionCode: 'ALLOW_RETENTION_WITH_SUCCESSOR',
                                      decisionSummary: '允许进入质保金结算',
                                      confirmationRequirementSummary: null
                                  })
                                : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionGateReviewRecord') {
                            return where.id === GATE_REVIEW_RECORD_ID ? makeFinalGateReview() : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRuleExplanationSnapshot') {
                            return null;
                        }
                        return null;
                    }),
                    create: jest.fn((entity, input) => {
                        if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                            createdSnapshots.push(input);
                            return makeFinalSettlementSnapshot({
                                id: NEXT_FINAL_SETTLEMENT_SNAPSHOT_ID,
                                ...input
                            });
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRuleExplanationSnapshot') {
                            createdRuleExplanations.push(input);
                            return makeRuleExplanationSnapshot({
                                finalSettlementSnapshotId: NEXT_FINAL_SETTLEMENT_SNAPSHOT_ID,
                                ...input
                            });
                        }
                        return input;
                    }),
                    persist: jest.fn(),
                    find: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            const result = await service.registerPayout(
                PAYOUT_ID,
                { payoutStage: 'retention', paidRecordAmount: '360.00', summarySnapshotId: HANDOVER_SUMMARY_SNAPSHOT_ID },
                'user-1'
            );

            expect(createdSnapshots[0]).toEqual(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    finalSettlementStatus: 'settled-all',
                    nonRetentionSettlementStatus: 'settled-non-retention',
                    retentionSettlementStatus: 'settled-retention',
                    retentionReceiptRecordId: RETENTION_RECEIPT_ID,
                    departureExceptionDecisionId: DEPARTURE_EXCEPTION_DECISION_ID
                })
            );
            expect(createdRuleExplanations[0]).toEqual(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    gateDecisionCode: 'SETTLED_RETENTION',
                    currentStageStatus: 'settled-retention'
                })
            );
            expect(result.status).toBe('paid');
            expect(result.paidRecordAmount).toBe('360.00');
        });

        it('blocks final payout registration when the current final settlement snapshot is missing', async () => {
            repo.findPayoutById.mockResolvedValue(
                makeDraftPayout({ stageType: 'final', status: 'approved', approvedAmount: '480.00' }) as never
            );
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionPayout') {
                            return where.id === PAYOUT_ID ? makeDraftPayout({ stageType: 'final', status: 'approved', approvedAmount: '480.00' }) : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                            return null;
                        }
                        return null;
                    }),
                    create: jest.fn(),
                    persist: jest.fn(),
                    find: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            await expect(service.registerPayout(PAYOUT_ID, { paidRecordAmount: '400.00' })).rejects.toThrow(UnprocessableEntityException);
        });

        it('blocks final payout registration when the linked freeze version is no longer current frozen', async () => {
            repo.findPayoutById.mockResolvedValue(
                makeDraftPayout({ stageType: 'final', status: 'approved', approvedAmount: '480.00' }) as never
            );
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionPayout') {
                            return where.id === PAYOUT_ID ? makeDraftPayout({ stageType: 'final', status: 'approved', approvedAmount: '480.00' }) : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionFinalSettlementSnapshot') {
                            return where.projectId === PROJECT_ID && where.isCurrent === true ? makeFinalSettlementSnapshot() : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionRoleAssignment') {
                            return where.id === ASSIGNMENT_ID ? makeDraftAssignment({ status: 'frozen', isCurrent: false }) : null;
                        }
                        return null;
                    }),
                    create: jest.fn(),
                    persist: jest.fn(),
                    find: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            await expect(service.registerPayout(PAYOUT_ID, { paidRecordAmount: '400.00' })).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('listAdjustments', () => {
        it('returns adjustment list from repository', async () => {
            repo.findAdjustmentsForProject.mockResolvedValue([makeDraftAdjustment() as never]);
            const result = await service.listAdjustments(PROJECT_ID);
            expect(result).toHaveLength(1);
            expect(result[0].adjustmentType).toBe('suspend-payout');
        });
    });

    describe('createAdjustment', () => {
        it('creates payout suspension adjustment draft', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findPayoutById.mockResolvedValue(makeDraftPayout({ status: 'approved' }) as never);
            repo.findCalculationById.mockResolvedValue(makeCalculatedResult({ status: 'effective' }) as never);
            repo.createAdjustment.mockReturnValue(makeDraftAdjustment() as never);
            repo.persistAndFlushAdjustment.mockResolvedValue();

            const result = await service.createAdjustment(PROJECT_ID, {
                adjustmentType: 'suspend-payout',
                relatedPayoutId: PAYOUT_ID,
                relatedCalculationId: CALCULATION_ID,
                reason: '客户退款待核实'
            });

            expect(repo.createAdjustment).toHaveBeenCalledWith(expect.objectContaining({ adjustmentType: 'suspend-payout', status: 'draft' }));
            expect(result.status).toBe('draft');
        });

        it('requires amount for clawback adjustment', async () => {
            repo.findProjectById.mockResolvedValue(makeProject() as never);
            repo.findPayoutById.mockResolvedValue(makeDraftPayout({ status: 'paid' }) as never);

            await expect(
                service.createAdjustment(PROJECT_ID, {
                    adjustmentType: 'clawback',
                    relatedPayoutId: PAYOUT_ID,
                    reason: '坏账扣回'
                })
            ).rejects.toThrow(UnprocessableEntityException);
        });
    });

    describe('executeAdjustment', () => {
        it('executes approved suspension adjustment and suspends payout', async () => {
            const result = await service.executeAdjustment(ADJUSTMENT_ID, { expectedVersion: 1 });
            expect(repo.transactional).toHaveBeenCalled();
            expect(result.status).toBe('executed');
        });

        it('creates compensating payout when executing supplement adjustment', async () => {
            const persisted: unknown[] = [];
            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionAdjustment') {
                            return where.id === ADJUSTMENT_ID
                                ? makeDraftAdjustment({
                                      adjustmentType: 'supplement',
                                      status: 'approved',
                                      amount: '80.00'
                                  })
                                : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionPayout') {
                            return where.id === PAYOUT_ID
                                ? makeDraftPayout({
                                      status: 'paid',
                                      approvedAmount: '480.00',
                                      paidRecordAmount: '400.00'
                                  })
                                : null;
                        }
                        return null;
                    }),
                    create: jest.fn((entity, input) => {
                        if ((entity as { name?: string })?.name === 'CommissionPayout') {
                            return makeDraftPayout({
                                id: '53000000-0000-4000-8000-000000000099',
                                status: 'paid',
                                rowVersion: 1,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                ...input
                            });
                        }
                        return { id: ADJUSTMENT_ID, rowVersion: 1, createdAt: new Date(), updatedAt: new Date(), ...input };
                    }),
                    persist: jest.fn((value) => {
                        persisted.push(value);
                    }),
                    flush: jest.fn()
                } as never)
            );

            const result = await service.executeAdjustment(ADJUSTMENT_ID, { expectedVersion: 1 });

            expect(result.status).toBe('executed');
            expect(persisted).toHaveLength(1);
            expect(persisted[0]).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ adjustmentType: 'supplement', status: 'executed' }),
                    expect.objectContaining({
                        payoutKind: 'supplement',
                        sourcePayoutId: PAYOUT_ID,
                        approvedAmount: '80.00',
                        paidRecordAmount: '80.00',
                        status: 'paid'
                    }),
                    expect.objectContaining({ id: PAYOUT_ID, payoutKind: 'primary', status: 'paid' })
                ])
            );
        });

        it('marks source payout as reversed when clawback fully offsets paid amount', async () => {
            const sourcePayout = makeDraftPayout({
                status: 'paid',
                approvedAmount: '480.00',
                paidRecordAmount: '400.00'
            });

            repo.transactional.mockImplementationOnce(async (work) =>
                work({
                    findOne: jest.fn(async (entity, where) => {
                        if ((entity as { name?: string })?.name === 'CommissionAdjustment') {
                            return where.id === ADJUSTMENT_ID
                                ? makeDraftAdjustment({
                                      adjustmentType: 'clawback',
                                      status: 'approved',
                                      amount: '400.00'
                                  })
                                : null;
                        }
                        if ((entity as { name?: string })?.name === 'CommissionPayout') {
                            return where.id === PAYOUT_ID ? sourcePayout : null;
                        }
                        return null;
                    }),
                    create: jest.fn(),
                    persist: jest.fn(),
                    flush: jest.fn()
                } as never)
            );

            const result = await service.executeAdjustment(ADJUSTMENT_ID, { expectedVersion: 1 });

            expect(result.status).toBe('executed');
            expect(sourcePayout.status).toBe('reversed');
        });
    });

    describe('recalculateCalculation', () => {
        it('creates recalculated version and adjustment trail', async () => {
            repo.findActiveContractsForProject.mockResolvedValue([makeActiveContract() as never]);
            repo.findConfirmedReceiptsForProject.mockResolvedValue([{ receiptAmount: '100000.00' }] as never);
            repo.findConfirmedPaymentsForProject.mockResolvedValue([{ amountExcludingTax: '70000.00' }] as never);

            const result = await service.recalculateCalculation(CALCULATION_ID, {
                reason: '回款冲减',
                recognizedRevenueTaxExclusive: '80000.00',
                recognizedCostTaxExclusive: '70000.00',
                expectedVersion: 1
            });

            expect(repo.transactional).toHaveBeenCalled();
            expect(result.version).toBe(2);
            expect(result.recalculatedFromId).toBe(CALCULATION_ID);
        });

        it('rejects recalculation when confirmed receipts are below requested revenue', async () => {
            repo.findActiveContractsForProject.mockResolvedValue([makeActiveContract() as never]);
            repo.findConfirmedReceiptsForProject.mockResolvedValue([{ receiptAmount: '50000.00' }] as never);
            repo.findConfirmedPaymentsForProject.mockResolvedValue([{ amountExcludingTax: '70000.00' }] as never);

            await expect(
                service.recalculateCalculation(CALCULATION_ID, {
                    reason: '回款冲减后重算',
                    recognizedRevenueTaxExclusive: '80000.00',
                    recognizedCostTaxExclusive: '70000.00',
                    expectedVersion: 1
                })
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('maps recalculation single-current unique violation to conflict', async () => {
            repo.transactional.mockRejectedValueOnce({
                code: '23505',
                constraint: 'uq_commission_calculation_project_current'
            } as never);

            await expect(
                service.recalculateCalculation(CALCULATION_ID, {
                    reason: '并发重算',
                    expectedVersion: 1
                })
            ).rejects.toThrow(ConflictException);
        });
    });
});
