import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ApprovalSummarySnapshotRepository } from '../approval-summary/approval-summary.repository';
import { BusinessNumberService } from '../business-number/business-number.service';
import { ContractFinanceRepository } from '../contract-finance/contract-finance.repository';
import { ContractHandoverRebaselineRecordRepository } from '../project-handover/project-handover.repository';
import {
    AccountingTaxTreatmentSnapshotRepository,
    ChangePackageBaselineRepository,
    CommissionGateReviewRecordRepository,
    CostStageAttributionSnapshotRepository,
    DataMaturityEvaluationResultRepository,
    ExpenseRecordRepository,
    InternalCostRateVersionRepository,
    OperatingBaselinePackageRepository,
    OperatingRestatementRecordRepository,
    OperatingSignalEvaluationResultRepository,
    OperatingSignalReviewRecordRepository,
    OperatingSignalToCommissionGateBindingRepository,
    PeriodClosingSnapshotRepository,
    ProjectActualCostRecordRepository,
    ProjectOperatingSnapshotRepository,
    SharedCostAllocationBasisRepository,
    SharedCostAllocationResultRepository
} from './project-cost.repository';

jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { ProjectCostService } from './project-cost.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const RATE_VERSION_ID = '33333333-3333-4333-8333-333333333333';
const RECORD_ID = '44444444-4444-4444-8444-444444444444';
const PAYMENT_RECORD_ID = '55555555-5555-4555-8555-555555555555';
const REPLACEMENT_RECORD_ID = '66666666-6666-4666-8666-666666666666';
const INVOICE_RECORD_ID = '77777777-7777-4777-8777-777777777777';
const EXPENSE_RECORD_ID = '88888888-8888-4888-8888-888888888888';
const CONTRACT_ID = '99999999-9999-4999-8999-999999999999';
const PAYABLE_RECORD_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BASELINE_PACKAGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CHANGE_PACKAGE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PERIOD_SNAPSHOT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const OPERATING_SNAPSHOT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const RESTATED_SNAPSHOT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const RESTATEMENT_ID = '12121212-1212-4121-8121-121212121212';
const SHARED_COST_BASIS_ID = '13131313-1313-4131-8131-131313131313';
const SHARED_COST_RESULT_ID = '14141414-1414-4141-8141-141414141414';
const REPLACEMENT_SHARED_COST_RESULT_ID = '15151515-1515-4151-8151-151515151515';
const STAGE_ATTRIBUTION_ID = '16161616-1616-4161-8161-161616161616';
const RECLASSIFIED_STAGE_ATTRIBUTION_ID = '17171717-1717-4171-8171-171717171717';
const TAX_TREATMENT_ID = '18181818-1818-4181-8181-181818181818';
const REPLACEMENT_TAX_TREATMENT_ID = '19191919-1919-4191-8191-191919191919';
const HANDOVER_REBASELINE_RECORD_ID = '20202020-2020-4020-8020-202020202020';
const DATA_MATURITY_EVALUATION_ID = '21212121-2121-4121-8121-212121212121';
const OPERATING_SIGNAL_EVALUATION_ID = '22212221-2221-4221-8221-222122212221';
const OPERATING_SIGNAL_REVIEW_RECORD_ID = '23232323-2323-4232-8232-232323232323';
const SUPERSEDED_SIGNAL_REVIEW_RECORD_ID = '24242424-2424-4242-8242-242424242424';
const GATE_BINDING_ID = '25252525-2525-4252-8252-252525252525';
const SECONDARY_GATE_BINDING_ID = '26262626-2626-4262-8262-262626262626';
const REVIEW_GATE_BINDING_ID = '27272727-2727-4272-8272-272727272727';
const COMMISSION_GATE_REVIEW_RECORD_ID = '28282828-2828-4282-8282-282828282828';
const SUPERSEDED_GATE_REVIEW_RECORD_ID = '29292929-2929-4292-8292-292929292929';
const SUMMARY_SNAPSHOT_ID = '30303030-3030-4030-8030-303030303030';

function makeRateVersion(overrides: Record<string, unknown> = {}) {
    return {
        id: RATE_VERSION_ID,
        rateKey: 'ROLE:dev:DAY',
        version: 1,
        status: 'active',
        isCurrent: true,
        rateScopeType: 'ROLE',
        personId: null,
        roleCode: 'dev',
        rateUnit: 'DAY',
        rateValue: '1000',
        currency: 'CNY',
        effectiveFrom: new Date('2023-01-01T00:00:00.000Z'),
        effectiveTo: null,
        rowVersion: 1,
        ...overrides
    };
}

function makePaymentRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: PAYMENT_RECORD_ID,
        projectId: PROJECT_ID,
        currency: 'CNY',
        amountExcludingTax: '8888.50',
        taxAmount: null,
        amountIncludingTax: null,
        paymentDate: new Date('2023-03-18T08:00:00.000Z'),
        costCategory: 'vendor-payment',
        sourceType: 'manual',
        status: 'confirmed',
        confirmedAt: new Date('2023-03-19T09:00:00.000Z'),
        confirmedBy: USER_ID,
        rowVersion: 3,
        ...overrides
    };
}

function makeInvoiceRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: INVOICE_RECORD_ID,
        projectId: PROJECT_ID,
        contractId: null,
        invoiceType: 'input',
        invoiceNumber: 'INV-2026-0001',
        invoiceAmount: '3210.50',
        invoiceDate: '2023-04-02',
        status: 'verified',
        exceptionStatus: 'none',
        updatedAt: new Date('2023-04-03T10:00:00.000Z'),
        rowVersion: 2,
        ...overrides
    };
}

function makeProject(overrides: Record<string, unknown> = {}) {
    return {
        id: PROJECT_ID,
        ...overrides
    };
}

function makeContract(overrides: Record<string, unknown> = {}) {
    return {
        id: CONTRACT_ID,
        projectId: PROJECT_ID,
        ...overrides
    };
}

function makeExpenseRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: EXPENSE_RECORD_ID,
        projectId: PROJECT_ID,
        contractId: CONTRACT_ID,
        expenseCategory: 'travel',
        expenseDescription: 'Taxi reimbursement',
        expenseDate: '2023-05-10',
        currency: 'CNY',
        amountIncludingTax: '1234.5600',
        taxAmount: '123.4500',
        amountExcludingTax: '1111.1100',
        sourceType: 'manual',
        status: 'recorded',
        evidenceSummary: 'receipt attached',
        attachmentCount: 2,
        confirmedAt: null,
        confirmedBy: null,
        voidedAt: null,
        voidReason: null,
        rowVersion: 1,
        createdAt: new Date('2023-05-10T09:00:00.000Z'),
        updatedAt: new Date('2023-05-10T09:00:00.000Z'),
        ...overrides
    };
}

function makePayableRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: PAYABLE_RECORD_ID,
        projectId: PROJECT_ID,
        contractId: CONTRACT_ID,
        vendorName: 'Acme Supplier',
        costCategory: 'hardware',
        payableDescription: 'Server procurement',
        currency: 'CNY',
        amountExcludingTax: '4567.8900',
        taxAmount: null,
        amountIncludingTax: null,
        expectedPaymentDate: '2023-06-15',
        status: 'recorded',
        evidenceSummary: 'quotation approved',
        attachmentCount: 1,
        rowVersion: 2,
        createdAt: new Date('2023-06-01T10:00:00.000Z'),
        updatedAt: new Date('2023-06-01T10:00:00.000Z'),
        ...overrides
    };
}

function makeOperatingBaselinePackage(overrides: Record<string, unknown> = {}) {
    return {
        id: BASELINE_PACKAGE_ID,
        projectId: PROJECT_ID,
        originalBaselineCost: '100000.0000',
        changePackageTotal: '5000.0000',
        currentEffectiveBaselineCost: '105000.0000',
        baselineSelectionSource: 'original',
        effectiveOperatingBaselineId: null,
        baselineSummary: 'baseline',
        isCurrent: true,
        status: 'active',
        effectiveAt: new Date('2023-07-01T00:00:00.000Z'),
        rowVersion: 1,
        createdAt: new Date('2023-07-01T00:00:00.000Z'),
        updatedAt: new Date('2023-07-01T00:00:00.000Z'),
        ...overrides
    };
}

function makeProjectOperatingSnapshot(overrides: Record<string, unknown> = {}) {
    return {
        id: OPERATING_SNAPSHOT_ID,
        projectId: PROJECT_ID,
        snapshotMode: 'period-end',
        snapshotAt: new Date('2023-07-31T16:00:00.000Z'),
        sourceWindowStart: '2023-07-01',
        sourceWindowEnd: '2023-07-31',
        effectiveContractTotal: '200000.0000',
        receivableConfirmedTotal: '80000.0000',
        includedCostTotal: '120000.0000',
        originalBaselineCost: '100000.0000',
        currentEffectiveBaselineCost: '105000.0000',
        grossMarginAmount: '80000.0000',
        grossMarginRate: '0.400000',
        taxImpactSummary: 'input tax pending',
        taxImpactPendingAmount: '3000.0000',
        allocationStabilitySummary: 'stable',
        unmappedCostSummary: null,
        currentActionLevel: 'REVIEW',
        referencedBaselineVersion: BASELINE_PACKAGE_ID,
        baselineSelectionSource: 'original',
        handoverRebaselineRecordId: null,
        status: 'active',
        supersedesId: null,
        rowVersion: 1,
        createdAt: new Date('2023-07-31T16:00:00.000Z'),
        updatedAt: new Date('2023-07-31T16:00:00.000Z'),
        ...overrides
    };
}

function makePeriodClosingSnapshot(overrides: Record<string, unknown> = {}) {
    return {
        id: PERIOD_SNAPSHOT_ID,
        projectId: PROJECT_ID,
        periodKey: '2023-07',
        snapshotMode: 'period-end',
        snapshotAt: new Date('2023-07-31T16:00:00.000Z'),
        effectiveContractTotal: '200000.0000',
        receivableConfirmedTotal: '80000.0000',
        includedCostTotal: '120000.0000',
        originalBaselineCost: '100000.0000',
        currentEffectiveBaselineCost: '105000.0000',
        grossMarginAmount: '80000.0000',
        grossMarginRate: '0.400000',
        taxImpactSummary: 'input tax pending',
        taxImpactPendingAmount: '3000.0000',
        allocationStabilitySummary: 'stable',
        unmappedCostSummary: null,
        currentActionLevel: 'REVIEW',
        referencedBaselineVersion: BASELINE_PACKAGE_ID,
        baselineSelectionSource: 'original',
        handoverRebaselineRecordId: null,
        status: 'active',
        rowVersion: 1,
        createdAt: new Date('2023-07-31T16:00:00.000Z'),
        updatedAt: new Date('2023-07-31T16:00:00.000Z'),
        ...overrides
    };
}

function makeSharedCostAllocationBasis(overrides: Record<string, unknown> = {}) {
    return {
        id: SHARED_COST_BASIS_ID,
        sourceCostScopeKey: 'cost-scope:abc',
        basisType: 'vendor-shared',
        allocationMethod: 'ratio',
        basisSummary: 'Shared vendor cost',
        status: 'active',
        effectiveAt: new Date('2023-08-01T00:00:00.000Z'),
        effectiveBy: USER_ID,
        supersedesId: null,
        rowVersion: 1,
        createdAt: new Date('2023-08-01T00:00:00.000Z'),
        updatedAt: new Date('2023-08-01T00:00:00.000Z'),
        ...overrides
    };
}

function makeSharedCostAllocationResult(overrides: Record<string, unknown> = {}) {
    return {
        id: SHARED_COST_RESULT_ID,
        basisId: SHARED_COST_BASIS_ID,
        projectId: PROJECT_ID,
        allocatedAmount: '3000.0000',
        allocationRatio: '0.300000',
        allocationSummary: 'Initial share',
        status: 'active',
        effectiveAt: new Date('2023-08-01T00:00:00.000Z'),
        supersedesId: null,
        rowVersion: 1,
        createdAt: new Date('2023-08-01T00:00:00.000Z'),
        updatedAt: new Date('2023-08-01T00:00:00.000Z'),
        ...overrides
    };
}

function makeCostStageAttribution(overrides: Record<string, unknown> = {}) {
    return {
        id: STAGE_ATTRIBUTION_ID,
        costRecordId: RECORD_ID,
        attributedStage: 'delivery',
        attributionMode: 'manual',
        lockedBySnapshotId: null,
        attributionSummary: 'Manual attribution',
        status: 'active',
        supersedesId: null,
        handledAt: new Date('2023-08-02T00:00:00.000Z'),
        handledBy: USER_ID,
        rowVersion: 1,
        createdAt: new Date('2023-08-02T00:00:00.000Z'),
        updatedAt: new Date('2023-08-02T00:00:00.000Z'),
        ...overrides
    };
}

function makeAccountingTaxTreatment(overrides: Record<string, unknown> = {}) {
    return {
        id: TAX_TREATMENT_ID,
        projectId: PROJECT_ID,
        taxTreatmentType: 'input-vat',
        deductibilityStatus: 'pending',
        taxImpactAmount: '1200.0000',
        taxPendingFlag: true,
        taxImpactSummary: 'VAT pending deduction',
        taxImpactPendingAmount: '1200.0000',
        basisSummary: 'Invoice not yet verified',
        status: 'active',
        supersedesId: null,
        confirmedAt: new Date('2023-08-03T00:00:00.000Z'),
        confirmedBy: USER_ID,
        rowVersion: 1,
        createdAt: new Date('2023-08-03T00:00:00.000Z'),
        updatedAt: new Date('2023-08-03T00:00:00.000Z'),
        ...overrides
    };
}

function makeDataMaturityEvaluationResult(overrides: Record<string, unknown> = {}) {
    return {
        id: DATA_MATURITY_EVALUATION_ID,
        projectId: PROJECT_ID,
        referencedSnapshotId: OPERATING_SNAPSHOT_ID,
        dataMaturityLevel: '数据不足',
        costActionRecommendation: 'REVIEW',
        taxImpactPendingAmount: '1200.0000',
        allocationStabilitySummary: 'Cost allocation requires verification',
        unmappedCostSummary: 'Two vendor costs remain unmapped',
        evaluationBasisJson: { sourceCoverage: 'partial' },
        evaluatedAt: new Date('2023-08-04T00:00:00.000Z'),
        status: 'active',
        rowVersion: 1,
        createdAt: new Date('2023-08-04T00:00:00.000Z'),
        updatedAt: new Date('2023-08-04T00:00:00.000Z'),
        ...overrides
    };
}

function makeOperatingSignalEvaluationResult(overrides: Record<string, unknown> = {}) {
    return {
        id: OPERATING_SIGNAL_EVALUATION_ID,
        projectId: PROJECT_ID,
        referencedSnapshotId: OPERATING_SNAPSHOT_ID,
        dataMaturityEvaluationId: DATA_MATURITY_EVALUATION_ID,
        signalLevel: 'ATTENTION',
        riskLevel: 'ATTENTION',
        formulaBoundaryAction: 'PROMPT',
        varianceSourceSummary: 'Margin deviation requires validation',
        taxImpactSummary: 'Tax package is pending closeout',
        allocationStabilitySummary: 'Allocation basis shifted after restatement',
        unmappedCostSummary: 'Unmapped delivery cost detected',
        currentActionLevel: 'REVIEW',
        recommendedActionSummary: 'Review revenue and cost recognition before payout',
        referencedBaselineVersion: 'baseline-v1',
        referencedSnapshotVersion: 'snapshot-v1',
        reviewRequired: true,
        evaluatedAt: new Date('2023-08-04T00:00:00.000Z'),
        status: 'active',
        rowVersion: 4,
        createdAt: new Date('2023-08-04T00:00:00.000Z'),
        updatedAt: new Date('2023-08-04T00:00:00.000Z'),
        ...overrides
    };
}

function makeOperatingSignalReviewRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: OPERATING_SIGNAL_REVIEW_RECORD_ID,
        signalEvaluationId: OPERATING_SIGNAL_EVALUATION_ID,
        reviewDecision: 'MANUAL_CONFIRMED',
        resolvedDataMaturityLevel: '成熟',
        resolvedCostActionRecommendation: 'PROMPT',
        resolvedCurrentActionLevel: 'REVIEW',
        referencedBaselineVersion: 'baseline-v2',
        referencedSnapshotVersion: 'snapshot-v2',
        reviewComment: 'Manual accounting review completed',
        handledAt: new Date('2023-08-05T00:00:00.000Z'),
        handledBy: USER_ID,
        status: 'active',
        rowVersion: 1,
        createdAt: new Date('2023-08-05T00:00:00.000Z'),
        updatedAt: new Date('2023-08-05T00:00:00.000Z'),
        ...overrides
    };
}

function makeOperatingSignalToCommissionGateBinding(overrides: Record<string, unknown> = {}) {
    return {
        id: GATE_BINDING_ID,
        projectId: PROJECT_ID,
        signalEvaluationId: OPERATING_SIGNAL_EVALUATION_ID,
        bindingAction: 'REVIEW',
        gateStageType: 'commission_settlement',
        baselineSelectionSource: 'original',
        taxImpactSummary: 'Tax package is pending closeout',
        taxImpactPendingAmount: '1200.0000',
        allocationStabilitySummary: 'Allocation basis shifted after restatement',
        unmappedCostSummary: 'Unmapped delivery cost detected',
        dataMaturityLevel: '数据不足',
        costActionRecommendation: 'REVIEW',
        currentActionLevel: 'REVIEW',
        nextActionSummary: 'Review commission settlement package',
        downstreamConsumerSummary: 'Commission payout workflow',
        referencedBaselineVersion: 'baseline-v1',
        referencedSnapshotVersion: 'snapshot-v1',
        generatedAt: new Date('2023-08-05T00:00:00.000Z'),
        status: 'active',
        rowVersion: 2,
        createdAt: new Date('2023-08-05T00:00:00.000Z'),
        updatedAt: new Date('2023-08-05T00:00:00.000Z'),
        ...overrides
    };
}

function makeApprovalSummarySnapshot(overrides: Record<string, unknown> = {}) {
    return {
        id: SUMMARY_SNAPSHOT_ID,
        targetType: 'commission_settlement',
        targetId: PROJECT_ID,
        approvalScenarioKey: 'project-commission-gate',
        summaryPackageId: '31313131-3131-4131-8131-313131313131',
        summaryPackageKey: 'commission-final',
        projectionLevel: 'L4',
        exportPolicy: 'internal-only',
        businessStatusAtSnapshot: 'REVIEW',
        generatedAt: new Date('2023-08-05T00:00:00.000Z'),
        status: 'active',
        supersedesId: null,
        rowVersion: 1,
        createdAt: new Date('2023-08-05T00:00:00.000Z'),
        updatedAt: new Date('2023-08-05T00:00:00.000Z'),
        ...overrides
    };
}

function makeCommissionGateReviewRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: COMMISSION_GATE_REVIEW_RECORD_ID,
        bindingId: GATE_BINDING_ID,
        gateReviewDecision: 'REVIEW',
        blockingReasonCode: null,
        summaryPackageKey: 'commission-final',
        summarySnapshotId: SUMMARY_SNAPSHOT_ID,
        projectionLevel: 'L4',
        exportPolicy: 'internal-only',
        nextActionSummary: 'Review commission settlement package',
        handledAt: new Date('2023-08-05T00:00:00.000Z'),
        handledBy: USER_ID,
        status: 'active',
        rowVersion: 1,
        createdAt: new Date('2023-08-05T00:00:00.000Z'),
        updatedAt: new Date('2023-08-05T00:00:00.000Z'),
        ...overrides
    };
}

describe('ProjectCostService', () => {
    let service: ProjectCostService;
    let expenseRecordRepository: jest.Mocked<ExpenseRecordRepository>;
    let internalCostRateVersionRepository: jest.Mocked<InternalCostRateVersionRepository>;
    let projectActualCostRecordRepository: jest.Mocked<ProjectActualCostRecordRepository>;
    let operatingBaselinePackageRepository: jest.Mocked<OperatingBaselinePackageRepository>;
    let changePackageBaselineRepository: jest.Mocked<ChangePackageBaselineRepository>;
    let projectOperatingSnapshotRepository: jest.Mocked<ProjectOperatingSnapshotRepository>;
    let periodClosingSnapshotRepository: jest.Mocked<PeriodClosingSnapshotRepository>;
    let operatingRestatementRecordRepository: jest.Mocked<OperatingRestatementRecordRepository>;
    let sharedCostAllocationBasisRepository: jest.Mocked<SharedCostAllocationBasisRepository>;
    let sharedCostAllocationResultRepository: jest.Mocked<SharedCostAllocationResultRepository>;
    let costStageAttributionSnapshotRepository: jest.Mocked<CostStageAttributionSnapshotRepository>;
    let accountingTaxTreatmentSnapshotRepository: jest.Mocked<AccountingTaxTreatmentSnapshotRepository>;
    let contractHandoverRebaselineRecordRepository: jest.Mocked<ContractHandoverRebaselineRecordRepository>;
    let businessNumberService: jest.Mocked<Pick<BusinessNumberService, 'next'>>;
    let dataMaturityEvaluationResultRepository: jest.Mocked<DataMaturityEvaluationResultRepository>;
    let operatingSignalEvaluationResultRepository: jest.Mocked<OperatingSignalEvaluationResultRepository>;
    let operatingSignalReviewRecordRepository: jest.Mocked<OperatingSignalReviewRecordRepository>;
    let operatingSignalToCommissionGateBindingRepository: jest.Mocked<OperatingSignalToCommissionGateBindingRepository>;
    let commissionGateReviewRecordRepository: jest.Mocked<CommissionGateReviewRecordRepository>;
    let approvalSummarySnapshotRepository: jest.Mocked<ApprovalSummarySnapshotRepository>;
    let contractFinanceRepository: jest.Mocked<ContractFinanceRepository>;
    let transactionalEntityManager: {
        nativeUpdate: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
    };

    beforeEach(() => {
        transactionalEntityManager = {
            nativeUpdate: jest.fn(),
            persist: jest.fn().mockReturnThis(),
            flush: jest.fn()
        };

        const mockExpenseRecordRepository = {
            create: jest.fn((input) => ({
                ...makeExpenseRecord(),
                id: EXPENSE_RECORD_ID,
                rowVersion: 1,
                ...input
            })),
            save: jest.fn(),
            findByProjectId: jest.fn(),
            findById: jest.fn()
        };

        const mockInternalCostRateVersionRepository = {
            create: jest.fn((input) => ({ id: RATE_VERSION_ID, ...input })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findActiveVersionByRateKey: jest.fn(),
            findActiveVersion: jest.fn(),
            findCurrentByRateKey: jest.fn(),
            findOverlappingActiveVersion: jest.fn(),
            findById: jest.fn()
        };

        const mockProjectActualCostRecordRepository = {
            create: jest.fn((input) => ({ id: RECORD_ID, ...input })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findByProjectId: jest.fn(),
            findCurrentEffectiveBySource: jest.fn(),
            findReplacementBySupersedesRecordId: jest.fn(),
            transactional: jest.fn(async (work) => work(transactionalEntityManager))
        };

        const mockOperatingBaselinePackageRepository = {
            create: jest.fn((input) => ({ id: BASELINE_PACKAGE_ID, rowVersion: 1, createdAt: new Date('2023-07-01T00:00:00.000Z'), updatedAt: new Date('2023-07-01T00:00:00.000Z'), ...input })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findCurrentByProjectId: jest.fn(),
            findById: jest.fn()
        };

        const mockChangePackageBaselineRepository = {
            create: jest.fn((input) => ({ id: CHANGE_PACKAGE_ID, ...input })),
            saveAll: jest.fn()
        };

        const mockProjectOperatingSnapshotRepository = {
            create: jest.fn((input) => ({ id: RESTATED_SNAPSHOT_ID, rowVersion: 1, createdAt: new Date('2023-07-01T00:00:00.000Z'), updatedAt: new Date('2023-07-01T00:00:00.000Z'), ...input })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findLatestActiveByProject: jest.fn()
        };

        const mockPeriodClosingSnapshotRepository = {
            create: jest.fn((input) => ({ id: PERIOD_SNAPSHOT_ID, rowVersion: 1, createdAt: new Date('2023-07-01T00:00:00.000Z'), updatedAt: new Date('2023-07-01T00:00:00.000Z'), ...input })),
            save: jest.fn(),
            findById: jest.fn(),
            findActiveByProjectAndPeriod: jest.fn()
        };

        const mockOperatingRestatementRecordRepository = {
            create: jest.fn((input) => ({ id: RESTATEMENT_ID, rowVersion: 1, createdAt: new Date('2023-07-01T00:00:00.000Z'), updatedAt: new Date('2023-07-01T00:00:00.000Z'), ...input })),
            save: jest.fn(),
            findById: jest.fn(),
            findByProjectId: jest.fn(),
            findActiveByRestatesSnapshotId: jest.fn()
        };

        const mockSharedCostAllocationBasisRepository = {
            create: jest.fn((input) => ({ id: SHARED_COST_BASIS_ID, rowVersion: 1, createdAt: new Date('2023-08-01T00:00:00.000Z'), updatedAt: new Date('2023-08-01T00:00:00.000Z'), ...input })),
            save: jest.fn(),
            findById: jest.fn(),
            findActiveByScopeKey: jest.fn()
        };

        const mockSharedCostAllocationResultRepository = {
            create: jest.fn((input) => ({ id: SHARED_COST_RESULT_ID, rowVersion: 1, createdAt: new Date('2023-08-01T00:00:00.000Z'), updatedAt: new Date('2023-08-01T00:00:00.000Z'), ...input })),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findByBasisId: jest.fn(),
            findActiveByBasisAndProject: jest.fn()
        };

        const mockCostStageAttributionSnapshotRepository = {
            create: jest.fn((input) => ({ id: STAGE_ATTRIBUTION_ID, rowVersion: 1, createdAt: new Date('2023-08-02T00:00:00.000Z'), updatedAt: new Date('2023-08-02T00:00:00.000Z'), ...input })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findByCostRecordId: jest.fn(),
            findActiveByCostRecordId: jest.fn()
        };

        const mockAccountingTaxTreatmentSnapshotRepository = {
            create: jest.fn((input) => ({ id: TAX_TREATMENT_ID, rowVersion: 1, createdAt: new Date('2023-08-03T00:00:00.000Z'), updatedAt: new Date('2023-08-03T00:00:00.000Z'), ...input })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findByProjectId: jest.fn(),
            findActiveByProjectAndTaxTreatmentType: jest.fn()
        };

        const mockContractHandoverRebaselineRecordRepository = {
            findById: jest.fn()
        };

        const mockDataMaturityEvaluationResultRepository = {
            create: jest.fn((input) => ({
                ...makeDataMaturityEvaluationResult(),
                rowVersion: 1,
                ...input
            })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findActiveByProjectAndSnapshot: jest.fn()
        };

        const mockOperatingSignalEvaluationResultRepository = {
            create: jest.fn((input) => ({
                ...makeOperatingSignalEvaluationResult(),
                rowVersion: 1,
                ...input
            })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findActiveByProjectAndSnapshot: jest.fn()
        };

        const mockOperatingSignalReviewRecordRepository = {
            create: jest.fn((input) => ({
                ...makeOperatingSignalReviewRecord(),
                rowVersion: 1,
                ...input
            })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findActiveBySignalEvaluationId: jest.fn()
        };

        const mockOperatingSignalToCommissionGateBindingRepository = {
            create: jest.fn((input) => ({
                ...makeOperatingSignalToCommissionGateBinding(),
                rowVersion: 1,
                ...input
            })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findActiveByProject: jest.fn(),
            findActiveByProjectAndGateStageType: jest.fn()
        };

        const mockCommissionGateReviewRecordRepository = {
            create: jest.fn((input) => ({
                ...makeCommissionGateReviewRecord(),
                rowVersion: 1,
                ...input
            })),
            save: jest.fn(),
            saveAll: jest.fn(),
            findById: jest.fn(),
            findByBindingId: jest.fn()
        };

        const mockApprovalSummarySnapshotRepository = {
            findById: jest.fn()
        };

        const mockContractFinanceRepository = {
            findProjectById: jest.fn(),
            findContractById: jest.fn(),
            findPaymentById: jest.fn(),
            findInvoiceById: jest.fn(),
            findPayableById: jest.fn()
        };
        const mockBusinessNumberService = {
            next: jest.fn(async (scope: string) => {
                const prefixes: Record<string, string> = {
                    'cost-payment-fact': 'AC-PAY',
                    'cost-invoice': 'AC-INV',
                    'cost-expense': 'AC-EXP',
                    'cost-procurement': 'AC-PRC',
                    'cost-labor': 'AC-LBR'
                };

                return `${prefixes[scope] ?? 'AC'}-2026-000001`;
            })
        };

        expenseRecordRepository = mockExpenseRecordRepository as unknown as jest.Mocked<ExpenseRecordRepository>;
        internalCostRateVersionRepository = mockInternalCostRateVersionRepository as unknown as jest.Mocked<InternalCostRateVersionRepository>;
        projectActualCostRecordRepository = mockProjectActualCostRecordRepository as unknown as jest.Mocked<ProjectActualCostRecordRepository>;
        operatingBaselinePackageRepository = mockOperatingBaselinePackageRepository as unknown as jest.Mocked<OperatingBaselinePackageRepository>;
        changePackageBaselineRepository = mockChangePackageBaselineRepository as unknown as jest.Mocked<ChangePackageBaselineRepository>;
        projectOperatingSnapshotRepository = mockProjectOperatingSnapshotRepository as unknown as jest.Mocked<ProjectOperatingSnapshotRepository>;
        periodClosingSnapshotRepository = mockPeriodClosingSnapshotRepository as unknown as jest.Mocked<PeriodClosingSnapshotRepository>;
        operatingRestatementRecordRepository = mockOperatingRestatementRecordRepository as unknown as jest.Mocked<OperatingRestatementRecordRepository>;
        sharedCostAllocationBasisRepository = mockSharedCostAllocationBasisRepository as unknown as jest.Mocked<SharedCostAllocationBasisRepository>;
        sharedCostAllocationResultRepository = mockSharedCostAllocationResultRepository as unknown as jest.Mocked<SharedCostAllocationResultRepository>;
        costStageAttributionSnapshotRepository = mockCostStageAttributionSnapshotRepository as unknown as jest.Mocked<CostStageAttributionSnapshotRepository>;
        accountingTaxTreatmentSnapshotRepository = mockAccountingTaxTreatmentSnapshotRepository as unknown as jest.Mocked<AccountingTaxTreatmentSnapshotRepository>;
        contractHandoverRebaselineRecordRepository =
            mockContractHandoverRebaselineRecordRepository as unknown as jest.Mocked<ContractHandoverRebaselineRecordRepository>;
        businessNumberService = mockBusinessNumberService as jest.Mocked<Pick<BusinessNumberService, 'next'>>;
        dataMaturityEvaluationResultRepository =
            mockDataMaturityEvaluationResultRepository as unknown as jest.Mocked<DataMaturityEvaluationResultRepository>;
        operatingSignalEvaluationResultRepository =
            mockOperatingSignalEvaluationResultRepository as unknown as jest.Mocked<OperatingSignalEvaluationResultRepository>;
        operatingSignalReviewRecordRepository =
            mockOperatingSignalReviewRecordRepository as unknown as jest.Mocked<OperatingSignalReviewRecordRepository>;
        operatingSignalToCommissionGateBindingRepository =
            mockOperatingSignalToCommissionGateBindingRepository as unknown as jest.Mocked<OperatingSignalToCommissionGateBindingRepository>;
        commissionGateReviewRecordRepository =
            mockCommissionGateReviewRecordRepository as unknown as jest.Mocked<CommissionGateReviewRecordRepository>;
        approvalSummarySnapshotRepository =
            mockApprovalSummarySnapshotRepository as unknown as jest.Mocked<ApprovalSummarySnapshotRepository>;
        contractFinanceRepository = mockContractFinanceRepository as unknown as jest.Mocked<ContractFinanceRepository>;
        service = new ProjectCostService(
            expenseRecordRepository,
            internalCostRateVersionRepository,
            projectActualCostRecordRepository,
            contractFinanceRepository,
            operatingBaselinePackageRepository,
            changePackageBaselineRepository,
            projectOperatingSnapshotRepository,
            periodClosingSnapshotRepository,
            operatingRestatementRecordRepository,
            sharedCostAllocationBasisRepository,
            sharedCostAllocationResultRepository,
            costStageAttributionSnapshotRepository,
            accountingTaxTreatmentSnapshotRepository,
            contractHandoverRebaselineRecordRepository,
            businessNumberService as never,
            dataMaturityEvaluationResultRepository,
            operatingSignalEvaluationResultRepository,
            operatingSignalReviewRecordRepository,
            operatingSignalToCommissionGateBindingRepository,
            commissionGateReviewRecordRepository,
            approvalSummarySnapshotRepository
        );
        contractHandoverRebaselineRecordRepository.findById.mockResolvedValue(null);
        projectOperatingSnapshotRepository.findLatestActiveByProject.mockResolvedValue(null);
        dataMaturityEvaluationResultRepository.findById.mockResolvedValue(null);
        dataMaturityEvaluationResultRepository.findActiveByProjectAndSnapshot.mockResolvedValue(null);
        operatingSignalEvaluationResultRepository.findById.mockResolvedValue(null);
        operatingSignalEvaluationResultRepository.findActiveByProjectAndSnapshot.mockResolvedValue(null);
        operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId.mockResolvedValue(null);
        operatingSignalToCommissionGateBindingRepository.findById.mockResolvedValue(null);
        operatingSignalToCommissionGateBindingRepository.findActiveByProject.mockResolvedValue([]);
        commissionGateReviewRecordRepository.findByBindingId.mockResolvedValue([]);
        approvalSummarySnapshotRepository.findById.mockResolvedValue(null);
    });

    describe('publishInternalCostRateVersion', () => {
        it('publishes the first active cost rate version with a stable rate key', async () => {
            internalCostRateVersionRepository.findCurrentByRateKey.mockResolvedValue(null);
            internalCostRateVersionRepository.findOverlappingActiveVersion.mockResolvedValue(null);

            const result = await service.publishInternalCostRateVersion(
                {
                    rateScopeType: 'ROLE',
                    roleCode: 'dev',
                    rateUnit: 'DAY',
                    rateValue: '1000',
                    currency: 'CNY',
                    effectiveFrom: '2023-01-01'
                },
                USER_ID
            );

            expect(internalCostRateVersionRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    rateKey: 'ROLE:dev:DAY',
                    version: 1,
                    status: 'active',
                    isCurrent: true,
                    effectiveFrom: '2023-01-01'
                })
            );
            expect(internalCostRateVersionRepository.save).toHaveBeenCalled();
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe(RATE_VERSION_ID);
        });

        it('blocks publishing a new current version without an explicit supersedes chain', async () => {
            internalCostRateVersionRepository.findCurrentByRateKey.mockResolvedValue(makeRateVersion() as never);

            await expect(
                service.publishInternalCostRateVersion(
                    {
                        rateScopeType: 'ROLE',
                        roleCode: 'dev',
                        rateUnit: 'DAY',
                        rateValue: '1200',
                        currency: 'CNY',
                        effectiveFrom: '2023-02-01'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('registerPaymentFactCostRecord', () => {
        it('registers a confirmed payment as a PAYMENT_FACT cost record', async () => {
            contractFinanceRepository.findPaymentById.mockResolvedValue(makePaymentRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            const result = await service.registerPaymentFactCostRecord(
                PROJECT_ID,
                {
                    paymentRecordId: PAYMENT_RECORD_ID,
                    costDescription: 'confirmed vendor payment',
                    evidenceSummary: 'bank slip attached',
                    expectedSourceVersion: 3,
                    costType: 'PAYMENT_FACT'
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'PAYMENT_FACT',
                    costSubtype: 'vendor-payment',
                    occurredOn: '2023-03-18',
                    recordStatus: 'CONFIRMED',
                    amountExcludingTax: '8888.5000',
                    amountIncludingTax: null,
                    sourceType: 'PAYMENT_RECORD',
                    sourceId: PAYMENT_RECORD_ID,
                    sourceRefNo: PAYMENT_RECORD_ID,
                    evidenceSummary: 'bank slip attached'
                })
            );
            expect(projectActualCostRecordRepository.save).toHaveBeenCalled();
            expect(result.businessStatusAfter).toBe('CONFIRMED');
            expect(result.targetId).toBe(RECORD_ID);
        });

        it('blocks duplicate current PAYMENT_FACT mapping for the same payment source', async () => {
            contractFinanceRepository.findPaymentById.mockResolvedValue(makePaymentRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            await expect(
                service.registerPaymentFactCostRecord(
                    PROJECT_ID,
                    {
                        paymentRecordId: PAYMENT_RECORD_ID,
                        costType: 'PAYMENT_FACT'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('blocks mapping when payment source is not confirmed', async () => {
            contractFinanceRepository.findPaymentById.mockResolvedValue(makePaymentRecord({ status: 'recorded' }) as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            await expect(
                service.registerPaymentFactCostRecord(
                    PROJECT_ID,
                    {
                        paymentRecordId: PAYMENT_RECORD_ID,
                        costType: 'PAYMENT_FACT'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('registerInvoiceCostRecord', () => {
        it('registers a verified input invoice as an INVOICE cost record', async () => {
            contractFinanceRepository.findInvoiceById.mockResolvedValue(makeInvoiceRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            const result = await service.registerInvoiceCostRecord(
                PROJECT_ID,
                {
                    invoiceRecordId: INVOICE_RECORD_ID,
                    costDescription: 'mapped from verified invoice',
                    evidenceSummary: 'invoice pdf archived',
                    taxImpactSummary: 'vat pending deduction',
                    expectedSourceVersion: 2,
                    costType: 'INVOICE'
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'INVOICE',
                    costSubtype: 'input',
                    occurredOn: '2023-04-02',
                    recordStatus: 'CONFIRMED',
                    amountIncludingTax: '3210.5000',
                    sourceType: 'INVOICE_RECORD',
                    sourceId: INVOICE_RECORD_ID,
                    sourceRefNo: 'INV-2026-0001',
                    taxImpactSummary: 'vat pending deduction'
                })
            );
            expect(projectActualCostRecordRepository.save).toHaveBeenCalled();
            expect(result.businessStatusAfter).toBe('CONFIRMED');
        });

        it('blocks mapping for non-verified invoice status', async () => {
            contractFinanceRepository.findInvoiceById.mockResolvedValue(
                makeInvoiceRecord({ status: 'received' }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            await expect(
                service.registerInvoiceCostRecord(
                    PROJECT_ID,
                    {
                        invoiceRecordId: INVOICE_RECORD_ID,
                        costType: 'INVOICE'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('blocks duplicate current INVOICE mapping for the same invoice source', async () => {
            contractFinanceRepository.findInvoiceById.mockResolvedValue(makeInvoiceRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            await expect(
                service.registerInvoiceCostRecord(
                    PROJECT_ID,
                    {
                        invoiceRecordId: INVOICE_RECORD_ID,
                        costType: 'INVOICE'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('registerExpenseCostRecord', () => {
        it('registers a confirmed expense as an EXPENSE cost record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({
                    status: 'confirmed',
                    confirmedAt: new Date('2023-05-11T10:00:00.000Z'),
                    confirmedBy: USER_ID
                }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            const result = await service.registerExpenseCostRecord(
                PROJECT_ID,
                {
                    expenseRecordId: EXPENSE_RECORD_ID,
                    costDescription: 'mapped from confirmed expense',
                    evidenceSummary: 'receipt archived',
                    taxImpactSummary: 'manual expense pending tax review',
                    expectedSourceVersion: 1,
                    costType: 'EXPENSE'
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'EXPENSE',
                    costSubtype: 'travel',
                    occurredOn: '2023-05-10',
                    recordStatus: 'CONFIRMED',
                    amountIncludingTax: '1234.5600',
                    amountExcludingTax: '1111.1100',
                    taxCostAmount: '123.4500',
                    sourceType: 'EXPENSE_RECORD',
                    sourceId: EXPENSE_RECORD_ID,
                    sourceRefNo: EXPENSE_RECORD_ID,
                    evidenceSummary: 'receipt archived',
                    taxImpactSummary: 'manual expense pending tax review'
                })
            );
            expect(projectActualCostRecordRepository.save).toHaveBeenCalled();
            expect(result.businessStatusAfter).toBe('CONFIRMED');
        });

        it('blocks mapping when expense source is not confirmed', async () => {
            expenseRecordRepository.findById.mockResolvedValue(makeExpenseRecord({ status: 'recorded' }) as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            await expect(
                service.registerExpenseCostRecord(
                    PROJECT_ID,
                    {
                        expenseRecordId: EXPENSE_RECORD_ID,
                        costType: 'EXPENSE'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('blocks duplicate current EXPENSE mapping for the same expense source', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            await expect(
                service.registerExpenseCostRecord(
                    PROJECT_ID,
                    {
                        expenseRecordId: EXPENSE_RECORD_ID,
                        costType: 'EXPENSE'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('registerProcurementCostRecord', () => {
        it('registers a formal payable as a PROCUREMENT cost record', async () => {
            contractFinanceRepository.findPayableById.mockResolvedValue(makePayableRecord() as never);
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            const result = await service.registerProcurementCostRecord(
                PROJECT_ID,
                {
                    payableRecordId: PAYABLE_RECORD_ID,
                    costDescription: 'mapped from approved commitment',
                    evidenceSummary: 'quotation archived',
                    taxImpactSummary: 'tax impact pending invoice',
                    expectedSourceVersion: 2,
                    costType: 'PROCUREMENT'
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.findCurrentEffectiveBySource).toHaveBeenCalledWith(
                'PAYABLE_RECORD',
                PAYABLE_RECORD_ID,
                ['REGISTERED', 'CONFIRMED', 'INCLUDED']
            );
            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'PROCUREMENT',
                    costSubtype: 'hardware',
                    occurredOn: '2023-06-15',
                    recordStatus: 'REGISTERED',
                    amountExcludingTax: '4567.8900',
                    amountIncludingTax: null,
                    sourceType: 'PAYABLE_RECORD',
                    sourceId: PAYABLE_RECORD_ID,
                    sourceRefNo: PAYABLE_RECORD_ID,
                    evidenceSummary: 'quotation archived',
                    taxImpactSummary: 'tax impact pending invoice'
                })
            );
            expect(result.businessStatusAfter).toBe('REGISTERED');
        });

        it('blocks procurement mapping for non-formal payable states', async () => {
            contractFinanceRepository.findPayableById.mockResolvedValue(
                makePayableRecord({ status: 'draft' }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue(null);

            await expect(
                service.registerProcurementCostRecord(
                    PROJECT_ID,
                    {
                        payableRecordId: PAYABLE_RECORD_ID,
                        costType: 'PROCUREMENT'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('expense records', () => {
        it('creates an expense record after validating project and contract ownership', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            contractFinanceRepository.findContractById.mockResolvedValue(makeContract() as never);

            const result = await service.createExpenseRecord(
                PROJECT_ID,
                {
                    contractId: CONTRACT_ID,
                    expenseCategory: 'travel',
                    expenseDescription: ' Taxi reimbursement ',
                    expenseDate: '2023-05-10',
                    amountIncludingTax: '1234.56',
                    taxAmount: '123.45',
                    amountExcludingTax: '1111.11',
                    evidenceSummary: 'receipt attached',
                    attachmentCount: 2
                }
            );

            expect(expenseRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    contractId: CONTRACT_ID,
                    expenseCategory: 'travel',
                    expenseDescription: 'Taxi reimbursement',
                    expenseDate: '2023-05-10',
                    amountIncludingTax: '1234.56',
                    taxAmount: '123.45',
                    amountExcludingTax: '1111.11',
                    sourceType: 'manual',
                    status: 'recorded'
                })
            );
            expect(expenseRecordRepository.save).toHaveBeenCalled();
            expect(result.status).toBe('recorded');
            expect(result.contractId).toBe(CONTRACT_ID);
        });

        it('rejects inconsistent expense amount split', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);

            await expect(
                service.createExpenseRecord(
                    PROJECT_ID,
                    {
                        expenseCategory: 'travel',
                        expenseDescription: 'Taxi reimbursement',
                        expenseDate: '2023-05-10',
                        amountIncludingTax: '1234.56',
                        taxAmount: '100.00',
                        amountExcludingTax: '1000.00'
                    }
                )
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('updates a recorded expense record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(makeExpenseRecord() as never);
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);

            const result = await service.updateExpenseRecord(EXPENSE_RECORD_ID, {
                expenseDescription: 'Updated taxi reimbursement',
                attachmentCount: 3,
                expectedVersion: 1
            });

            expect(expenseRecordRepository.save).toHaveBeenCalled();
            expect(result.expenseDescription).toBe('Updated taxi reimbursement');
            expect(result.attachmentCount).toBe(3);
        });

        it('confirms a recorded expense record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(makeExpenseRecord() as never);

            const result = await service.confirmExpenseRecord(EXPENSE_RECORD_ID, USER_ID, {
                expectedVersion: 1
            });

            expect(expenseRecordRepository.save).toHaveBeenCalled();
            expect(result.status).toBe('confirmed');
            expect(result.confirmedBy).toBe(USER_ID);
        });

        it('blocks updating a confirmed expense record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(makeExpenseRecord({ status: 'confirmed' }) as never);

            await expect(
                service.updateExpenseRecord(EXPENSE_RECORD_ID, {
                    expenseDescription: 'cannot edit',
                    expectedVersion: 1
                })
            ).rejects.toThrow('can no longer be updated');
        });

        it('voids an expense record with appended reason/comment', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );

            const result = await service.voidExpenseRecord(EXPENSE_RECORD_ID, {
                reason: 'duplicate',
                comment: 're-entered from approved claim',
                expectedVersion: 1
            });

            expect(expenseRecordRepository.save).toHaveBeenCalled();
            expect(result.status).toBe('voided');
            expect(result.voidReason).toBe('duplicate: re-entered from approved claim');
        });

        it('blocks voiding a mapped expense record', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            await expect(
                service.voidExpenseRecord(EXPENSE_RECORD_ID, {
                    reason: 'duplicate',
                    expectedVersion: 1
                })
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('hides expense actions once a current project cost mapping exists', async () => {
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );
            projectActualCostRecordRepository.findCurrentEffectiveBySource.mockResolvedValue({ id: RECORD_ID } as never);

            const result = await service.getExpenseRecordDetail(EXPENSE_RECORD_ID);

            expect(result.allowedActions).toEqual([]);
        });
    });

    describe('listProjectActualCostRecords', () => {
        it('returns mapped summary rows for project actual cost query', async () => {
            projectActualCostRecordRepository.findByProjectId.mockResolvedValue([
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'PAYMENT-1',
                    costType: 'PAYMENT_FACT',
                    costSubtype: 'vendor-payment',
                    occurredOn: '2023-03-18',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-03-19T09:00:00.000Z'),
                    confirmedAt: new Date('2023-03-19T09:00:00.000Z'),
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: '8888.5000',
                    taxCostAmount: null,
                    amountIncludingTax: null,
                    recordStatus: 'CONFIRMED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'PAYMENT_RECORD',
                    sourceId: PAYMENT_RECORD_ID,
                    sourceRefNo: PAYMENT_RECORD_ID,
                    evidenceSummary: 'bank slip attached',
                    attachmentCount: 0,
                    registeredBy: USER_ID,
                    confirmedBy: USER_ID,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: 'confirmed vendor payment',
                    taxImpactSummary: null,
                    riskNote: null,
                    supersedesRecordId: null,
                    voidReason: null,
                    rowVersion: 1,
                    createdAt: new Date('2023-03-19T09:00:00.000Z'),
                    updatedAt: new Date('2023-03-19T09:00:00.000Z')
                }
            ] as never);

            const result = await service.listProjectActualCostRecords(PROJECT_ID, { sourceType: 'PAYMENT_RECORD' });

            expect(projectActualCostRecordRepository.findByProjectId).toHaveBeenCalledWith(PROJECT_ID, { sourceType: 'PAYMENT_RECORD' });
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(
                expect.objectContaining({
                    id: RECORD_ID,
                    costType: 'PAYMENT_FACT',
                    sourceType: 'PAYMENT_RECORD',
                    sourceId: PAYMENT_RECORD_ID,
                    amountExcludingTax: '8888.5000',
                    amountIncludingTax: null
                })
            );
        });
    });

    describe('getProjectActualCostRecordDetail', () => {
        it('returns labor detail with replacement chain and allowed actions', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'LABOR-1',
                    costType: 'LABOR',
                    costSubtype: null,
                    occurredOn: '2023-01-01',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-01-31T12:00:00.000Z'),
                    confirmedAt: null,
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: '20000.0000',
                    taxCostAmount: '0.0000',
                    amountIncludingTax: '20000.0000',
                    recordStatus: 'REGISTERED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'LABOR',
                    sourceId: RATE_VERSION_ID,
                    sourceRefNo: 'ROLE:dev:DAY',
                    evidenceSummary: null,
                    attachmentCount: 0,
                    registeredBy: USER_ID,
                    confirmedBy: null,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: null,
                    taxImpactSummary: null,
                    riskNote: null,
                    supersedesRecordId: null,
                    voidReason: null,
                    laborPersonId: null,
                    laborRole: 'dev',
                    laborPeriodType: 'MONTH',
                    laborPeriodStart: '2023-01-01',
                    laborPeriodEnd: '2023-01-31',
                    actualHours: null,
                    actualPersonDays: '20',
                    internalCostRate: '1000.0000',
                    laborAmount: '20000.0000',
                    workSummary: 'delivery support',
                    deliveryStage: null,
                    rateVersionId: RATE_VERSION_ID,
                    rowVersion: 1,
                    createdAt: new Date('2023-01-31T12:00:00.000Z'),
                    updatedAt: new Date('2023-01-31T12:00:00.000Z')
                } as never
            );
            internalCostRateVersionRepository.findById.mockResolvedValue(makeRateVersion() as never);
            projectActualCostRecordRepository.findReplacementBySupersedesRecordId.mockResolvedValue({ id: REPLACEMENT_RECORD_ID } as never);

            const result = await service.getProjectActualCostRecordDetail(RECORD_ID);

            expect(result.allowedActions).toEqual(['replace']);
            expect(result.supersedesSummary).toBe(`Replaced by ${REPLACEMENT_RECORD_ID}`);
            expect(result.measurementBasisSummary).toBe('20d x 1000.0000 CNY');
            expect(result.sourceStatusSummary).toBe('InternalCostRateVersion:active');
        });

        it('throws NotFoundException when detail target is missing', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(null);

            await expect(service.getProjectActualCostRecordDetail(RECORD_ID)).rejects.toThrow(NotFoundException);
        });

        it('returns invoice detail with source summary', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'INVOICE-1',
                    costType: 'INVOICE',
                    costSubtype: 'input',
                    occurredOn: '2023-04-02',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-04-03T10:00:00.000Z'),
                    confirmedAt: new Date('2023-04-03T10:00:00.000Z'),
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: null,
                    taxCostAmount: null,
                    amountIncludingTax: '3210.5000',
                    recordStatus: 'CONFIRMED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'INVOICE_RECORD',
                    sourceId: INVOICE_RECORD_ID,
                    sourceRefNo: 'INV-2026-0001',
                    evidenceSummary: 'invoice pdf archived',
                    attachmentCount: 0,
                    registeredBy: USER_ID,
                    confirmedBy: USER_ID,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: 'mapped from verified invoice',
                    taxImpactSummary: 'vat pending deduction',
                    riskNote: null,
                    supersedesRecordId: null,
                    voidReason: null,
                    laborPersonId: null,
                    laborRole: null,
                    laborPeriodType: null,
                    laborPeriodStart: null,
                    laborPeriodEnd: null,
                    actualHours: null,
                    actualPersonDays: null,
                    internalCostRate: null,
                    laborAmount: null,
                    workSummary: null,
                    deliveryStage: null,
                    rateVersionId: null,
                    rowVersion: 1,
                    createdAt: new Date('2023-04-03T10:00:00.000Z'),
                    updatedAt: new Date('2023-04-03T10:00:00.000Z')
                } as never
            );
            contractFinanceRepository.findInvoiceById.mockResolvedValue(makeInvoiceRecord() as never);
            projectActualCostRecordRepository.findReplacementBySupersedesRecordId.mockResolvedValue(null);

            const result = await service.getProjectActualCostRecordDetail(RECORD_ID);

            expect(result.allowedActions).toEqual([]);
            expect(result.sourceStatusSummary).toBe('InvoiceRecord:verified/none');
            expect(result.effectivePeriodSummary).toBe('2023-04-02');
            expect(result.measurementBasisSummary).toBe('3210.5000 CNY @ 2023-04-02');
        });

        it('returns expense detail with source summary', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'EXPENSE-1',
                    costType: 'EXPENSE',
                    costSubtype: 'travel',
                    occurredOn: '2023-05-10',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-05-11T10:00:00.000Z'),
                    confirmedAt: new Date('2023-05-11T10:00:00.000Z'),
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: '1111.1100',
                    taxCostAmount: '123.4500',
                    amountIncludingTax: '1234.5600',
                    recordStatus: 'CONFIRMED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'EXPENSE_RECORD',
                    sourceId: EXPENSE_RECORD_ID,
                    sourceRefNo: EXPENSE_RECORD_ID,
                    evidenceSummary: 'receipt archived',
                    attachmentCount: 2,
                    registeredBy: USER_ID,
                    confirmedBy: USER_ID,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: 'mapped from confirmed expense',
                    taxImpactSummary: 'manual expense pending tax review',
                    riskNote: null,
                    supersedesRecordId: null,
                    voidReason: null,
                    laborPersonId: null,
                    laborRole: null,
                    laborPeriodType: null,
                    laborPeriodStart: null,
                    laborPeriodEnd: null,
                    actualHours: null,
                    actualPersonDays: null,
                    internalCostRate: null,
                    laborAmount: null,
                    workSummary: null,
                    deliveryStage: null,
                    rateVersionId: null,
                    rowVersion: 1,
                    createdAt: new Date('2023-05-11T10:00:00.000Z'),
                    updatedAt: new Date('2023-05-11T10:00:00.000Z')
                } as never
            );
            expenseRecordRepository.findById.mockResolvedValue(
                makeExpenseRecord({ status: 'confirmed', confirmedAt: new Date(), confirmedBy: USER_ID }) as never
            );
            projectActualCostRecordRepository.findReplacementBySupersedesRecordId.mockResolvedValue(null);

            const result = await service.getProjectActualCostRecordDetail(RECORD_ID);

            expect(result.allowedActions).toEqual([]);
            expect(result.sourceStatusSummary).toBe('ExpenseRecord:confirmed');
            expect(result.effectivePeriodSummary).toBe('2023-05-10');
            expect(result.measurementBasisSummary).toBe('1234.5600 CNY @ 2023-05-10');
        });

        it('returns procurement detail with source summary', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(
                {
                    id: RECORD_ID,
                    projectId: PROJECT_ID,
                    recordNo: 'PROCUREMENT-1',
                    costType: 'PROCUREMENT',
                    costSubtype: 'hardware',
                    occurredOn: '2023-06-15',
                    accountingPeriod: null,
                    registeredAt: new Date('2023-06-01T10:00:00.000Z'),
                    confirmedAt: null,
                    includedAt: null,
                    executionStageCode: null,
                    stageDerivedFromType: null,
                    stageDerivedFromId: null,
                    stageDerivedAt: null,
                    stageLockedAt: null,
                    currency: 'CNY',
                    amountExcludingTax: '4567.8900',
                    taxCostAmount: null,
                    amountIncludingTax: null,
                    recordStatus: 'REGISTERED',
                    isIncludedInProjectCost: false,
                    isHighRisk: false,
                    sourceType: 'PAYABLE_RECORD',
                    sourceId: PAYABLE_RECORD_ID,
                    sourceRefNo: PAYABLE_RECORD_ID,
                    evidenceSummary: 'quotation archived',
                    attachmentCount: 1,
                    registeredBy: USER_ID,
                    confirmedBy: null,
                    includedBy: null,
                    ownerRole: null,
                    costDescription: 'mapped from approved commitment',
                    taxImpactSummary: 'tax impact pending invoice',
                    riskNote: 'PROCUREMENT mapping expresses commitment boundary only; default not included until downstream inclusion rules say so',
                    supersedesRecordId: null,
                    voidReason: null,
                    laborPersonId: null,
                    laborRole: null,
                    laborPeriodType: null,
                    laborPeriodStart: null,
                    laborPeriodEnd: null,
                    actualHours: null,
                    actualPersonDays: null,
                    internalCostRate: null,
                    laborAmount: null,
                    workSummary: null,
                    deliveryStage: null,
                    rateVersionId: null,
                    rowVersion: 1,
                    createdAt: new Date('2023-06-01T10:00:00.000Z'),
                    updatedAt: new Date('2023-06-01T10:00:00.000Z')
                } as never
            );
            contractFinanceRepository.findPayableById.mockResolvedValue(
                makePayableRecord({ status: 'partially-paid' }) as never
            );
            projectActualCostRecordRepository.findReplacementBySupersedesRecordId.mockResolvedValue(null);

            const result = await service.getProjectActualCostRecordDetail(RECORD_ID);

            expect(result.allowedActions).toEqual([]);
            expect(result.sourceStatusSummary).toBe('PayableRecord:partially-paid');
            expect(result.effectivePeriodSummary).toBe('2023-06-15');
            expect(result.measurementBasisSummary).toBe('4567.8900 CNY ex-tax @ 2023-06-15');
        });
    });

    describe('EX-07B operating baseline and restatement chain', () => {
        it('activates an operating baseline package and supersedes the previous current package', async () => {
            const currentPackage = makeOperatingBaselinePackage({ rowVersion: 2 });
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            operatingBaselinePackageRepository.findCurrentByProjectId.mockResolvedValue(currentPackage as never);

            const result = await service.activateOperatingBaselinePackage(
                {
                    projectId: PROJECT_ID,
                    originalBaselineCost: '100000',
                    baselineSelectionSource: 'original',
                    baselineSummary: 'July baseline',
                    expectedCurrentPackageVersion: 2,
                    changePackages: [
                        {
                            changePackageId: CHANGE_PACKAGE_ID,
                            changeAmount: '5000',
                            changeSummary: 'approved scope change'
                        }
                    ]
                },
                USER_ID
            );

            expect(currentPackage.isCurrent).toBe(false);
            expect(currentPackage.status).toBe('superseded');
            expect(operatingBaselinePackageRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    originalBaselineCost: '100000.0000',
                    changePackageTotal: '5000.0000',
                    currentEffectiveBaselineCost: '105000.0000',
                    isCurrent: true,
                    status: 'active'
                })
            );
            expect(changePackageBaselineRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    changePackageId: CHANGE_PACKAGE_ID,
                    changeAmount: '5000.0000',
                    status: 'active'
                })
            );
            expect(projectActualCostRecordRepository.transactional).toHaveBeenCalled();
            expect(result.targetType).toBe('OperatingBaselinePackage');
        });

        it('requires a stable handover baseline reference when selecting handover_rebaseline', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);

            await expect(
                service.activateOperatingBaselinePackage(
                    {
                        projectId: PROJECT_ID,
                        originalBaselineCost: '100000',
                        baselineSelectionSource: 'handover_rebaseline',
                        changePackages: []
                    },
                    USER_ID
                )
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('creates one active period closing snapshot per project period', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            periodClosingSnapshotRepository.findActiveByProjectAndPeriod.mockResolvedValue(null);

            const result = await service.createPeriodClosingSnapshot(
                {
                    projectId: PROJECT_ID,
                    periodKey: '2023-07',
                    effectiveContractTotal: '200000',
                    receivableConfirmedTotal: '80000',
                    includedCostTotal: '120000',
                    originalBaselineCost: '100000',
                    currentEffectiveBaselineCost: '105000',
                    taxImpactSummary: 'input tax pending',
                    taxImpactPendingAmount: '3000',
                    currentActionLevel: 'REVIEW',
                    referencedBaselineVersion: BASELINE_PACKAGE_ID,
                    baselineSelectionSource: 'original'
                },
                USER_ID
            );

            expect(periodClosingSnapshotRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    periodKey: '2023-07',
                    effectiveContractTotal: '200000.0000',
                    includedCostTotal: '120000.0000',
                    grossMarginAmount: '80000.0000',
                    grossMarginRate: '0.400000',
                    status: 'active'
                })
            );
            expect(periodClosingSnapshotRepository.save).toHaveBeenCalled();
            expect(result.targetType).toBe('PeriodClosingSnapshot');
        });

        it('requires an effective project-owned handover rebaseline record for period closing snapshots', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            periodClosingSnapshotRepository.findActiveByProjectAndPeriod.mockResolvedValue(null);
            contractHandoverRebaselineRecordRepository.findById.mockResolvedValue(
                { id: HANDOVER_REBASELINE_RECORD_ID, projectId: PROJECT_ID, status: 'effective' } as never
            );

            const result = await service.createPeriodClosingSnapshot(
                {
                    projectId: PROJECT_ID,
                    periodKey: '2023-07',
                    effectiveContractTotal: '200000',
                    receivableConfirmedTotal: '80000',
                    includedCostTotal: '120000',
                    originalBaselineCost: '100000',
                    currentEffectiveBaselineCost: '105000',
                    taxImpactSummary: 'input tax pending',
                    taxImpactPendingAmount: '3000',
                    currentActionLevel: 'REVIEW',
                    referencedBaselineVersion: BASELINE_PACKAGE_ID,
                    baselineSelectionSource: 'handover_rebaseline',
                    handoverRebaselineRecordId: HANDOVER_REBASELINE_RECORD_ID
                },
                USER_ID
            );

            expect(contractHandoverRebaselineRecordRepository.findById).toHaveBeenCalledWith(HANDOVER_REBASELINE_RECORD_ID);
            expect(periodClosingSnapshotRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    handoverRebaselineRecordId: HANDOVER_REBASELINE_RECORD_ID,
                    baselineSelectionSource: 'handover_rebaseline'
                })
            );
            expect(result.targetType).toBe('PeriodClosingSnapshot');
        });

        it('creates a project operating snapshot with stable baseline and action metadata', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);

            const result = await service.createProjectOperatingSnapshot(
                {
                    projectId: PROJECT_ID,
                    snapshotMode: 'period-end',
                    sourceWindowStart: '2023-07-01',
                    sourceWindowEnd: '2023-07-31',
                    effectiveContractTotal: '200000',
                    receivableConfirmedTotal: '80000',
                    includedCostTotal: '120000',
                    originalBaselineCost: '100000',
                    currentEffectiveBaselineCost: '105000',
                    taxImpactSummary: 'input tax pending',
                    taxImpactPendingAmount: '3000',
                    allocationStabilitySummary: 'stable',
                    currentActionLevel: 'REVIEW',
                    referencedBaselineVersion: BASELINE_PACKAGE_ID,
                    baselineSelectionSource: 'original'
                },
                USER_ID
            );

            expect(projectOperatingSnapshotRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    snapshotMode: 'period-end',
                    sourceWindowStart: '2023-07-01',
                    sourceWindowEnd: '2023-07-31',
                    grossMarginAmount: '80000.0000',
                    grossMarginRate: '0.400000',
                    referencedBaselineVersion: BASELINE_PACKAGE_ID,
                    status: 'active'
                })
            );
            expect(projectOperatingSnapshotRepository.save).toHaveBeenCalled();
            expect(result.targetType).toBe('ProjectOperatingSnapshot');
        });

        it('formats operating snapshot source windows with the business day instead of UTC slicing', async () => {
            projectOperatingSnapshotRepository.findById.mockResolvedValue(
                makeProjectOperatingSnapshot({
                    sourceWindowStart: new Date('2023-06-30T16:30:00.000Z'),
                    sourceWindowEnd: new Date('2023-07-30T16:30:00.000Z')
                }) as never
            );

            const result = await service.getProjectOperatingSnapshot(OPERATING_SNAPSHOT_ID);

            expect(result.sourceWindowStart).toBe('2023-07-01');
            expect(result.sourceWindowEnd).toBe('2023-07-31');
        });

        it('rejects handover rebaseline snapshot creation when the record belongs to another project', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            contractHandoverRebaselineRecordRepository.findById.mockResolvedValue(
                { id: HANDOVER_REBASELINE_RECORD_ID, projectId: '99999999-0000-4000-8000-000000000000', status: 'effective' } as never
            );

            await expect(
                service.createProjectOperatingSnapshot(
                    {
                        projectId: PROJECT_ID,
                        snapshotMode: 'period-end',
                        sourceWindowStart: '2023-07-01',
                        sourceWindowEnd: '2023-07-31',
                        effectiveContractTotal: '200000',
                        receivableConfirmedTotal: '80000',
                        includedCostTotal: '120000',
                        originalBaselineCost: '100000',
                        currentEffectiveBaselineCost: '105000',
                        taxImpactSummary: 'input tax pending',
                        taxImpactPendingAmount: '3000',
                        allocationStabilitySummary: 'stable',
                        currentActionLevel: 'REVIEW',
                        referencedBaselineVersion: BASELINE_PACKAGE_ID,
                        baselineSelectionSource: 'handover_rebaseline',
                        handoverRebaselineRecordId: HANDOVER_REBASELINE_RECORD_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('creates an append-only operating restatement and supersedes the old operating snapshot', async () => {
            const periodSnapshot = makePeriodClosingSnapshot();
            const restatesSnapshot = makeProjectOperatingSnapshot({ rowVersion: 3 });
            periodClosingSnapshotRepository.findById.mockResolvedValue(periodSnapshot as never);
            projectOperatingSnapshotRepository.findById.mockResolvedValue(restatesSnapshot as never);
            operatingRestatementRecordRepository.findActiveByRestatesSnapshotId.mockResolvedValue(null);

            const result = await service.createOperatingRestatement(
                {
                    projectId: PROJECT_ID,
                    periodEndSnapshotId: PERIOD_SNAPSHOT_ID,
                    restatesSnapshotId: OPERATING_SNAPSHOT_ID,
                    expectedRestatesSnapshotVersion: 3,
                    restatementReason: 'late invoice inclusion',
                    restatementSummary: 'Included late verified invoice into July view',
                    restatedValues: {
                        includedCostTotal: '125000',
                        taxImpactPendingAmount: '3500',
                        currentActionLevel: 'BLOCK'
                    }
                },
                USER_ID
            );

            expect(restatesSnapshot.status).toBe('superseded');
            expect(projectOperatingSnapshotRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    snapshotMode: 'restated',
                    includedCostTotal: '125000.0000',
                    grossMarginAmount: '75000.0000',
                    grossMarginRate: '0.375000',
                    currentActionLevel: 'BLOCK',
                    supersedesId: OPERATING_SNAPSHOT_ID
                })
            );
            expect(operatingRestatementRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    periodEndSnapshotId: PERIOD_SNAPSHOT_ID,
                    restatesSnapshotId: OPERATING_SNAPSHOT_ID,
                    restatementReason: 'late invoice inclusion',
                    status: 'active'
                })
            );
            expect(projectActualCostRecordRepository.transactional).toHaveBeenCalled();
            expect(result.targetType).toBe('OperatingRestatementRecord');
        });

        it('blocks duplicate active restatement for the same operating snapshot', async () => {
            periodClosingSnapshotRepository.findById.mockResolvedValue(makePeriodClosingSnapshot() as never);
            projectOperatingSnapshotRepository.findById.mockResolvedValue(makeProjectOperatingSnapshot() as never);
            operatingRestatementRecordRepository.findActiveByRestatesSnapshotId.mockResolvedValue({ id: RESTATEMENT_ID } as never);

            await expect(
                service.createOperatingRestatement(
                    {
                        projectId: PROJECT_ID,
                        periodEndSnapshotId: PERIOD_SNAPSHOT_ID,
                        restatesSnapshotId: OPERATING_SNAPSHOT_ID,
                        restatementReason: 'duplicate',
                        restatementSummary: 'duplicate',
                        restatedValues: {}
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('EX-07C allocation, stage attribution, and tax treatment chain', () => {
        it('confirms a shared cost allocation basis and project allocation results', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue({ id: RECORD_ID } as never);
            sharedCostAllocationBasisRepository.findActiveByScopeKey.mockResolvedValue(null);
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);

            const result = await service.confirmSharedCostAllocationBasis(
                {
                    basisType: 'vendor-shared',
                    sourceCostRecordIds: [RECORD_ID],
                    allocationMethod: 'ratio',
                    basisSummary: 'Shared vendor cost',
                    projectShareItems: [
                        {
                            projectId: PROJECT_ID,
                            allocatedAmount: '3000',
                            allocationRatio: '0.3',
                            allocationSummary: '30 percent share'
                        }
                    ]
                },
                USER_ID
            );

            expect(sharedCostAllocationBasisRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    basisType: 'vendor-shared',
                    allocationMethod: 'ratio',
                    status: 'active',
                    effectiveBy: USER_ID
                })
            );
            expect(sharedCostAllocationResultRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    allocatedAmount: '3000.0000',
                    allocationRatio: '0.300000',
                    status: 'active'
                })
            );
            expect(projectActualCostRecordRepository.transactional).toHaveBeenCalled();
            expect(result.targetType).toBe('SharedCostAllocationBasis');
        });

        it('blocks duplicate active shared cost allocation basis for the same source scope', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue({ id: RECORD_ID } as never);
            sharedCostAllocationBasisRepository.findActiveByScopeKey.mockResolvedValue(makeSharedCostAllocationBasis() as never);

            await expect(
                service.confirmSharedCostAllocationBasis(
                    {
                        basisType: 'vendor-shared',
                        sourceCostRecordIds: [RECORD_ID],
                        allocationMethod: 'ratio',
                        projectShareItems: [{ projectId: PROJECT_ID, allocatedAmount: '3000' }]
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('replaces a shared cost allocation result through a supersedes chain', async () => {
            const superseded = makeSharedCostAllocationResult({ rowVersion: 2 });
            sharedCostAllocationResultRepository.findById.mockResolvedValue(superseded as never);
            sharedCostAllocationResultRepository.findActiveByBasisAndProject.mockResolvedValue(superseded as never);
            sharedCostAllocationResultRepository.create.mockImplementation((input) => ({
                id: REPLACEMENT_SHARED_COST_RESULT_ID,
                rowVersion: 1,
                createdAt: new Date('2023-08-04T00:00:00.000Z'),
                updatedAt: new Date('2023-08-04T00:00:00.000Z'),
                ...input
            }) as never);

            const result = await service.replaceSharedCostAllocationResult(
                SHARED_COST_RESULT_ID,
                {
                    allocatedAmount: '3500',
                    allocationRatio: '0.35',
                    replacementReason: 'Updated delivery usage',
                    expectedVersion: 2
                },
                USER_ID
            );

            expect(superseded.status).toBe('superseded');
            expect(sharedCostAllocationResultRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: expect.any(String),
                    basisId: SHARED_COST_BASIS_ID,
                    projectId: PROJECT_ID,
                    allocatedAmount: '3500.0000',
                    allocationRatio: '0.350000',
                    supersedesId: SHARED_COST_RESULT_ID
                })
            );
            expect(projectActualCostRecordRepository.transactional).toHaveBeenCalled();
            expect(transactionalEntityManager.nativeUpdate).toHaveBeenCalledWith(
                expect.any(Function),
                { id: SHARED_COST_RESULT_ID },
                { status: 'superseded', updatedBy: USER_ID }
            );
            expect(result.targetType).toBe('SharedCostAllocationResult');
            expect(result.targetId).toEqual(expect.any(String));
        });

        it('confirms cost stage attribution and updates the cost record stage lock fields', async () => {
            const costRecord = {
                id: RECORD_ID,
                rowVersion: 4,
                executionStageCode: null,
                stageDerivedFromType: null,
                stageDerivedFromId: null,
                stageDerivedAt: null,
                stageLockedAt: null,
                updatedBy: null
            };
            projectActualCostRecordRepository.findById.mockResolvedValue(costRecord as never);
            costStageAttributionSnapshotRepository.findActiveByCostRecordId.mockResolvedValue(null);

            const result = await service.confirmCostStageAttribution(
                RECORD_ID,
                {
                    stageAttributionMode: 'manual',
                    attributedStage: 'delivery',
                    attributionSummary: 'Confirmed from delivery log',
                    expectedVersion: 4
                },
                USER_ID
            );

            expect(costStageAttributionSnapshotRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costRecordId: RECORD_ID,
                    attributedStage: 'delivery',
                    attributionMode: 'manual',
                    status: 'active'
                })
            );
            expect(costRecord.executionStageCode).toBe('delivery');
            expect(costRecord.stageDerivedFromType).toBe('CostStageAttributionSnapshot');
            expect(projectActualCostRecordRepository.transactional).toHaveBeenCalled();
            expect(result.targetType).toBe('CostStageAttributionSnapshot');
        });

        it('reclassifies active cost stage attribution without overwriting history', async () => {
            const superseded = makeCostStageAttribution({ rowVersion: 2 });
            const costRecord = {
                id: RECORD_ID,
                rowVersion: 5,
                executionStageCode: 'delivery',
                stageDerivedFromType: 'CostStageAttributionSnapshot',
                stageDerivedFromId: STAGE_ATTRIBUTION_ID,
                stageDerivedAt: new Date('2023-08-02T00:00:00.000Z'),
                stageLockedAt: null,
                updatedBy: null
            };
            costStageAttributionSnapshotRepository.findById.mockResolvedValue(superseded as never);
            projectActualCostRecordRepository.findById.mockResolvedValue(costRecord as never);
            costStageAttributionSnapshotRepository.create.mockImplementation((input) => ({
                id: RECLASSIFIED_STAGE_ATTRIBUTION_ID,
                rowVersion: 1,
                createdAt: new Date('2023-08-04T00:00:00.000Z'),
                updatedAt: new Date('2023-08-04T00:00:00.000Z'),
                ...input
            }) as never);

            const result = await service.reclassifyCostStageAttribution(
                STAGE_ATTRIBUTION_ID,
                {
                    newAttributedStage: 'acceptance',
                    reclassifyReason: 'Moved to acceptance stage',
                    expectedVersion: 2
                },
                USER_ID
            );

            expect(superseded.status).toBe('superseded');
            expect(costStageAttributionSnapshotRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributedStage: 'acceptance',
                    attributionMode: 'reclassified',
                    supersedesId: STAGE_ATTRIBUTION_ID
                })
            );
            expect(costRecord.executionStageCode).toBe('acceptance');
            expect(costRecord.stageDerivedFromId).toBe(result.targetId);
            expect(projectActualCostRecordRepository.transactional).toHaveBeenCalled();
            expect(transactionalEntityManager.nativeUpdate).toHaveBeenCalledWith(
                expect.any(Function),
                { id: STAGE_ATTRIBUTION_ID },
                { status: 'superseded', updatedBy: USER_ID }
            );
            expect(result.targetType).toBe('CostStageAttributionSnapshot');
        });

        it('confirms accounting tax treatment for a project', async () => {
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            accountingTaxTreatmentSnapshotRepository.findActiveByProjectAndTaxTreatmentType.mockResolvedValue(null);

            const result = await service.confirmAccountingTaxTreatment(
                PROJECT_ID,
                {
                    taxTreatmentType: 'input-vat',
                    deductibilityStatus: 'pending',
                    taxImpactAmount: '800',
                    taxImpactSummary: 'Input VAT pending invoice verification',
                    taxPendingFlag: true,
                    taxImpactPendingAmount: '800',
                    basisSummary: 'Labor cost tax impact pending'
                },
                USER_ID
            );

            expect(accountingTaxTreatmentSnapshotRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    taxTreatmentType: 'input-vat',
                    deductibilityStatus: 'pending',
                    taxImpactAmount: '800.0000',
                    taxImpactPendingAmount: '800.0000',
                    supersedesId: null,
                    status: 'active'
                })
            );
            expect(accountingTaxTreatmentSnapshotRepository.save).toHaveBeenCalled();
            expect(result.targetType).toBe('AccountingTaxTreatmentSnapshot');
        });

        it('replaces the previous active accounting tax treatment snapshot through a supersedes chain', async () => {
            const superseded = makeAccountingTaxTreatment({ rowVersion: 3 });
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            accountingTaxTreatmentSnapshotRepository.findById.mockResolvedValue(superseded as never);
            accountingTaxTreatmentSnapshotRepository.findActiveByProjectAndTaxTreatmentType.mockResolvedValue(superseded as never);
            accountingTaxTreatmentSnapshotRepository.create.mockImplementation((input) => ({
                id: REPLACEMENT_TAX_TREATMENT_ID,
                rowVersion: 1,
                createdAt: new Date('2023-08-05T00:00:00.000Z'),
                updatedAt: new Date('2023-08-05T00:00:00.000Z'),
                ...input
            }) as never);

            const result = await service.replaceAccountingTaxTreatment(
                TAX_TREATMENT_ID,
                {
                    taxTreatmentType: 'input-vat',
                    deductibilityStatus: 'deductible',
                    taxImpactAmount: '900',
                    taxImpactSummary: 'Input VAT can be deducted',
                    taxPendingFlag: false,
                    taxImpactPendingAmount: '0',
                    basisSummary: 'Verified invoice',
                    expectedVersion: 3
                },
                USER_ID
            );

            expect(superseded.status).toBe('superseded');
            expect(accountingTaxTreatmentSnapshotRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: PROJECT_ID,
                    taxTreatmentType: 'input-vat',
                    deductibilityStatus: 'deductible',
                    taxImpactAmount: '900.0000',
                    taxImpactPendingAmount: '0.0000',
                    supersedesId: TAX_TREATMENT_ID,
                    status: 'active'
                })
            );
            expect(projectActualCostRecordRepository.transactional).toHaveBeenCalled();
            expect(transactionalEntityManager.nativeUpdate).toHaveBeenCalledWith(
                expect.any(Function),
                { id: TAX_TREATMENT_ID },
                { status: 'superseded', updatedBy: USER_ID }
            );
            expect(result.targetType).toBe('AccountingTaxTreatmentSnapshot');
            expect(result.targetId).toEqual(expect.any(String));
        });

        it('blocks creating a duplicate active accounting tax treatment snapshot without superseding the current one', async () => {
            const activeSnapshot = makeAccountingTaxTreatment({ rowVersion: 2 });
            contractFinanceRepository.findProjectById.mockResolvedValue(makeProject() as never);
            accountingTaxTreatmentSnapshotRepository.findActiveByProjectAndTaxTreatmentType.mockResolvedValue(activeSnapshot as never);

            await expect(
                service.confirmAccountingTaxTreatment(
                    PROJECT_ID,
                    {
                        taxTreatmentType: 'input-vat',
                        deductibilityStatus: 'deductible',
                        taxImpactAmount: '0',
                        taxImpactSummary: 'Input VAT cleared',
                        taxPendingFlag: false,
                        taxImpactPendingAmount: '0'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('EX-13B operating signal review and downstream views', () => {
        it('records an operating signal review and supersedes the previous active review', async () => {
            const evaluation = makeOperatingSignalEvaluationResult({
                rowVersion: 4,
                riskLevel: 'ATTENTION',
                currentActionLevel: 'REVIEW'
            });
            const dataMaturity = makeDataMaturityEvaluationResult({
                dataMaturityLevel: '初步可看',
                costActionRecommendation: 'PROMPT'
            });
            const activeReview = makeOperatingSignalReviewRecord({
                id: SUPERSEDED_SIGNAL_REVIEW_RECORD_ID,
                status: 'active'
            });

            operatingSignalEvaluationResultRepository.findById.mockResolvedValue(evaluation as never);
            dataMaturityEvaluationResultRepository.findById.mockResolvedValue(dataMaturity as never);
            operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId.mockResolvedValue(activeReview as never);

            const result = await service.reviewOperatingSignalEvaluation(
                evaluation.id,
                {
                    reviewDecision: 'APPROVE',
                    resolvedDataMaturityLevel: '初步可看',
                    costActionRecommendation: 'PROMPT',
                    referencedBaselineVersion: 'baseline-v2',
                    referencedSnapshotVersion: 'snapshot-v2',
                    reviewComment: 'finance manual review',
                    expectedVersion: 4
                },
                USER_ID
            );

            expect(activeReview.status).toBe('superseded');
            expect(operatingSignalReviewRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    signalEvaluationId: evaluation.id,
                    reviewDecision: 'APPROVE',
                    resolvedDataMaturityLevel: '初步可看',
                    resolvedCostActionRecommendation: 'PROMPT',
                    resolvedCurrentActionLevel: 'REVIEW',
                    referencedBaselineVersion: 'baseline-v2',
                    referencedSnapshotVersion: 'snapshot-v2'
                })
            );
            expect(operatingSignalReviewRecordRepository.saveAll).toHaveBeenCalledWith([
                activeReview,
                expect.objectContaining({
                    signalEvaluationId: evaluation.id,
                    reviewDecision: 'APPROVE',
                    resolvedCurrentActionLevel: 'REVIEW'
                })
            ]);
            expect(result).toMatchObject({
                signalEvaluationId: evaluation.id,
                dataMaturityLevel: '初步可看',
                costActionRecommendation: 'PROMPT',
                currentActionLevel: 'REVIEW',
                referencedBaselineVersion: 'baseline-v2',
                referencedSnapshotVersion: 'snapshot-v2',
                resultStatus: 'success'
            });
            expect(result.reviewRecordId).toEqual(expect.any(String));
            expect(result.targetId).toBe(result.reviewRecordId);
        });

        it('rejects stale operating signal reviews when expectedVersion is outdated', async () => {
            operatingSignalEvaluationResultRepository.findById.mockResolvedValue(
                makeOperatingSignalEvaluationResult({ rowVersion: 4 }) as never
            );

            await expect(
                service.reviewOperatingSignalEvaluation(
                    OPERATING_SIGNAL_EVALUATION_ID,
                    {
                        reviewDecision: 'APPROVE',
                        resolvedDataMaturityLevel: '成熟',
                        costActionRecommendation: 'PROMPT',
                        referencedBaselineVersion: 'baseline-v2',
                        referencedSnapshotVersion: 'snapshot-v2',
                        expectedVersion: 3
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('returns the operating signal evaluation view with active review overlays', async () => {
            const evaluation = makeOperatingSignalEvaluationResult({
                referencedBaselineVersion: 'baseline-v1',
                referencedSnapshotVersion: 'snapshot-v1'
            });
            const dataMaturity = makeDataMaturityEvaluationResult({
                dataMaturityLevel: '数据不足',
                costActionRecommendation: 'REVIEW',
                allocationStabilitySummary: 'maturity allocation summary',
                unmappedCostSummary: 'maturity unmapped summary'
            });
            const activeReview = makeOperatingSignalReviewRecord({
                reviewDecision: 'MANUAL_CONFIRMED',
                resolvedDataMaturityLevel: '成熟',
                resolvedCostActionRecommendation: 'PROMPT',
                resolvedCurrentActionLevel: 'BLOCK',
                referencedBaselineVersion: 'baseline-v2',
                referencedSnapshotVersion: 'snapshot-v2',
                reviewComment: 'tax packet missing'
            });

            operatingSignalEvaluationResultRepository.findById.mockResolvedValue(evaluation as never);
            dataMaturityEvaluationResultRepository.findById.mockResolvedValue(dataMaturity as never);
            operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId.mockResolvedValue(activeReview as never);

            const result = await service.getOperatingSignalEvaluation(evaluation.id);

            expect(result).toMatchObject({
                signalEvaluationId: evaluation.id,
                dataMaturityLevel: '成熟',
                costActionRecommendation: 'PROMPT',
                currentActionLevel: 'BLOCK',
                referencedBaselineVersion: 'baseline-v2',
                referencedSnapshotVersion: 'snapshot-v2',
                reviewRequired: true,
                reviewSummary: 'MANUAL_CONFIRMED | 成熟 | PROMPT | tax packet missing'
            });
        });

        it('updates commission gate binding and supersedes the previous active gate review', async () => {
            const binding = makeOperatingSignalToCommissionGateBinding({
                rowVersion: 2,
                bindingAction: 'REVIEW',
                nextActionSummary: 'legacy summary'
            });
            const evaluation = makeOperatingSignalEvaluationResult({
                id: binding.signalEvaluationId,
                dataMaturityEvaluationId: DATA_MATURITY_EVALUATION_ID,
                riskLevel: 'ATTENTION',
                currentActionLevel: 'REVIEW'
            });
            const dataMaturity = makeDataMaturityEvaluationResult({
                id: evaluation.dataMaturityEvaluationId,
                dataMaturityLevel: '数据不足',
                costActionRecommendation: 'REVIEW'
            });
            const activeSignalReview = makeOperatingSignalReviewRecord({
                signalEvaluationId: evaluation.id,
                resolvedDataMaturityLevel: '成熟',
                resolvedCostActionRecommendation: 'PROMPT',
                resolvedCurrentActionLevel: 'REVIEW',
                referencedBaselineVersion: 'baseline-v2',
                referencedSnapshotVersion: 'snapshot-v2'
            });
            const activeGateReview = makeCommissionGateReviewRecord({
                id: SUPERSEDED_GATE_REVIEW_RECORD_ID,
                bindingId: binding.id,
                status: 'active'
            });
            const summarySnapshot = makeApprovalSummarySnapshot({
                summaryPackageKey: 'commission-final'
            });

            operatingSignalToCommissionGateBindingRepository.findById.mockResolvedValue(binding as never);
            operatingSignalEvaluationResultRepository.findById.mockResolvedValue(evaluation as never);
            dataMaturityEvaluationResultRepository.findById.mockResolvedValue(dataMaturity as never);
            operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId.mockResolvedValue(activeSignalReview as never);
            commissionGateReviewRecordRepository.findByBindingId.mockResolvedValue([activeGateReview] as never);
            approvalSummarySnapshotRepository.findById.mockResolvedValue(summarySnapshot as never);

            const result = await service.reviewCommissionGateBinding(
                binding.id,
                {
                    bindingAction: 'BLOCK',
                    gateReviewDecision: 'BLOCK',
                    blockingReasonCode: 'tax_gap',
                    baselineSelectionSource: 'handover_rebaseline',
                    summaryPackageKey: 'commission-final',
                    summarySnapshotId: summarySnapshot.id,
                    referencedBaselineVersion: 'baseline-v3',
                    referencedSnapshotVersion: 'snapshot-v3',
                    expectedVersion: 2
                },
                USER_ID
            );

            expect(binding.bindingAction).toBe('BLOCK');
            expect(binding.baselineSelectionSource).toBe('handover_rebaseline');
            expect(binding.dataMaturityLevel).toBe('成熟');
            expect(binding.costActionRecommendation).toBe('PROMPT');
            expect(binding.currentActionLevel).toBe('REVIEW');
            expect(binding.referencedBaselineVersion).toBe('baseline-v3');
            expect(binding.referencedSnapshotVersion).toBe('snapshot-v3');
            expect(binding.nextActionSummary).toBe('BLOCK: tax_gap');
            expect(activeGateReview.status).toBe('superseded');
            expect(operatingSignalToCommissionGateBindingRepository.save).toHaveBeenCalledWith(binding);
            expect(commissionGateReviewRecordRepository.saveAll).toHaveBeenCalledWith([
                activeGateReview,
                expect.objectContaining({
                    bindingId: binding.id,
                    gateReviewDecision: 'BLOCK',
                    blockingReasonCode: 'tax_gap',
                    summaryPackageKey: 'commission-final',
                    nextActionSummary: 'BLOCK: tax_gap'
                })
            ]);
            expect(result).toMatchObject({
                bindingResultId: binding.id,
                dataMaturityLevel: '成熟',
                costActionRecommendation: 'PROMPT',
                currentActionLevel: 'REVIEW',
                baselineSelectionSource: 'handover_rebaseline',
                referencedBaselineVersion: 'baseline-v3',
                referencedSnapshotVersion: 'snapshot-v3',
                summaryPackageKey: 'commission-final',
                businessStatusAfter: 'BLOCK'
            });
            expect(result.gateReviewRecordId).toEqual(expect.any(String));
            expect(result.targetId).toBe(result.gateReviewRecordId);
        });

        it('blocks commission gate review payloads that omit blockingReasonCode for BLOCK', async () => {
            operatingSignalToCommissionGateBindingRepository.findById.mockResolvedValue(
                makeOperatingSignalToCommissionGateBinding({ rowVersion: 2, bindingAction: 'REVIEW' }) as never
            );

            await expect(
                service.reviewCommissionGateBinding(
                    GATE_BINDING_ID,
                    {
                        bindingAction: 'BLOCK',
                        gateReviewDecision: 'BLOCK',
                        baselineSelectionSource: 'original',
                        summaryPackageKey: 'commission-final',
                        summarySnapshotId: SUMMARY_SNAPSHOT_ID,
                        referencedBaselineVersion: 'baseline-v2',
                        referencedSnapshotVersion: 'snapshot-v2',
                        expectedVersion: 2
                    },
                    USER_ID
                )
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('builds business accounting feedback from the most severe active bindings', async () => {
            const snapshot = makeProjectOperatingSnapshot();
            const dataMaturity = makeDataMaturityEvaluationResult({
                referencedSnapshotId: snapshot.id
            });
            const evaluation = makeOperatingSignalEvaluationResult({
                referencedSnapshotId: snapshot.id,
                dataMaturityEvaluationId: dataMaturity.id,
                signalLevel: 'ALERT'
            });
            const activeSignalReview = makeOperatingSignalReviewRecord({
                signalEvaluationId: evaluation.id,
                resolvedDataMaturityLevel: '成熟',
                resolvedCostActionRecommendation: 'PROMPT',
                resolvedCurrentActionLevel: 'REVIEW',
                referencedBaselineVersion: 'baseline-v2',
                referencedSnapshotVersion: 'snapshot-v2'
            });
            const bindings = [
                makeOperatingSignalToCommissionGateBinding({
                    id: GATE_BINDING_ID,
                    signalEvaluationId: evaluation.id,
                    bindingAction: 'BLOCK',
                    generatedAt: new Date('2023-08-05T00:00:00.000Z'),
                    taxImpactSummary: 'Tax package stalled',
                    nextActionSummary: 'Close tax gap',
                    downstreamConsumerSummary: 'Finance settlement hold'
                }),
                makeOperatingSignalToCommissionGateBinding({
                    id: SECONDARY_GATE_BINDING_ID,
                    signalEvaluationId: evaluation.id,
                    bindingAction: 'BLOCK',
                    generatedAt: new Date('2023-08-04T00:00:00.000Z'),
                    taxImpactSummary: 'Tax package stalled',
                    nextActionSummary: 'Freeze commission payout',
                    downstreamConsumerSummary: 'Approval board escalation'
                }),
                makeOperatingSignalToCommissionGateBinding({
                    id: REVIEW_GATE_BINDING_ID,
                    signalEvaluationId: evaluation.id,
                    bindingAction: 'REVIEW',
                    generatedAt: new Date('2023-08-06T00:00:00.000Z'),
                    nextActionSummary: 'Review only'
                })
            ];

            projectOperatingSnapshotRepository.findLatestActiveByProject.mockResolvedValue(snapshot as never);
            dataMaturityEvaluationResultRepository.findActiveByProjectAndSnapshot.mockResolvedValue(dataMaturity as never);
            operatingSignalEvaluationResultRepository.findActiveByProjectAndSnapshot.mockResolvedValue(evaluation as never);
            operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId.mockResolvedValue(activeSignalReview as never);
            operatingSignalToCommissionGateBindingRepository.findActiveByProject.mockResolvedValue(bindings as never);
            operatingSignalEvaluationResultRepository.findById.mockResolvedValue(evaluation as never);

            const result = await service.getBusinessAccountingFeedback(PROJECT_ID);

            expect(result).toMatchObject({
                projectId: PROJECT_ID,
                signalLevel: 'ALERT',
                currentActionLevel: 'REVIEW',
                taxImpactSummary: 'Tax package stalled',
                dataMaturityLevel: '成熟',
                costActionRecommendation: 'PROMPT',
                referencedBaselineVersion: 'baseline-v2',
                referencedSnapshotVersion: 'snapshot-v2',
                nextActionSummary: 'Close tax gap；Freeze commission payout',
                downstreamConsumerSummary: 'Finance settlement hold；Approval board escalation',
                allowedActions: ['reviewCommissionGateBinding']
            });
        });
    });

    describe('registerLaborCostRecord', () => {
        it('registers a labor cost record with calculated amount and traceable rate version', async () => {
            internalCostRateVersionRepository.findById.mockResolvedValue(makeRateVersion() as never);

            const result = await service.registerLaborCostRecord(
                PROJECT_ID,
                {
                    laborRole: 'dev',
                    laborPeriodType: 'MONTH',
                    laborPeriodStart: '2023-01-01',
                    laborPeriodEnd: '2023-01-31',
                    rateVersionId: RATE_VERSION_ID,
                    actualPersonDays: '20',
                    costType: 'LABOR'
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'LABOR',
                    currency: 'CNY',
                    amountExcludingTax: '20000.0000',
                    amountIncludingTax: '20000.0000',
                    internalCostRate: '1000.0000',
                    laborAmount: '20000.0000',
                    rateVersionId: RATE_VERSION_ID,
                    sourceId: RATE_VERSION_ID,
                    sourceRefNo: 'ROLE:dev:DAY'
                })
            );
            expect(projectActualCostRecordRepository.save).toHaveBeenCalled();
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe(RECORD_ID);
        });

        it('throws NotFoundException if the rate version is missing', async () => {
            internalCostRateVersionRepository.findById.mockResolvedValue(null);

            await expect(
                service.registerLaborCostRecord(
                    PROJECT_ID,
                    {
                        laborPeriodType: 'MONTH',
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20',
                        costType: 'LABOR'
                    },
                    USER_ID
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('blocks labor records that cross the selected rate version period', async () => {
            internalCostRateVersionRepository.findById.mockResolvedValue(
                makeRateVersion({ effectiveTo: new Date('2023-01-15T00:00:00.000Z') }) as never
            );

            await expect(
                service.registerLaborCostRecord(
                    PROJECT_ID,
                    {
                        laborRole: 'dev',
                        laborPeriodType: 'MONTH',
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20',
                        costType: 'LABOR'
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('replaceLaborCostRecord', () => {
        it('throws NotFoundException if original record is not found', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue(null);

            await expect(
                service.replaceLaborCostRecord(
                    RECORD_ID,
                    {
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20',
                        replaceReason: 'Correction'
                    },
                    USER_ID
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('throws ConflictException if optimistic locking fails', async () => {
            projectActualCostRecordRepository.findById.mockResolvedValue({ id: RECORD_ID, rowVersion: 1 } as never);

            await expect(
                service.replaceLaborCostRecord(
                    RECORD_ID,
                    {
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20',
                        replaceReason: 'Correction',
                        expectedSupersededRecordVersion: 2
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
        });

        it('successfully replaces a labor cost record using append-only supersedes chain', async () => {
            const originalRecord = {
                id: RECORD_ID,
                projectId: PROJECT_ID,
                costType: 'LABOR',
                recordStatus: 'REGISTERED',
                isIncludedInProjectCost: false,
                rowVersion: 1,
                laborRole: 'dev',
                laborPeriodType: 'MONTH',
                costSubtype: null
            };

            projectActualCostRecordRepository.findById.mockResolvedValue(originalRecord as never);
            internalCostRateVersionRepository.findById.mockResolvedValue(makeRateVersion() as never);

            const result = await service.replaceLaborCostRecord(
                RECORD_ID,
                {
                    laborPeriodStart: '2023-01-01',
                    laborPeriodEnd: '2023-01-31',
                    rateVersionId: RATE_VERSION_ID,
                    actualPersonDays: '22.5',
                    replaceReason: 'Corrected working days'
                },
                USER_ID
            );

            expect(originalRecord.recordStatus).toBe('REPLACED');
            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    supersedesRecordId: RECORD_ID,
                    amountExcludingTax: '22500.0000',
                    amountIncludingTax: '22500.0000',
                    laborAmount: '22500.0000',
                    rateVersionId: RATE_VERSION_ID
                })
            );
            expect(projectActualCostRecordRepository.saveAll).toHaveBeenCalled();
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe(RECORD_ID);
        });
    });
});
