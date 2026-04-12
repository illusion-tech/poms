import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContractFinanceRepository } from '../contract-finance/contract-finance.repository';
import { InternalCostRateVersionRepository, ProjectActualCostRecordRepository } from './project-cost.repository';

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
        paymentAmount: '8888.50',
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

describe('ProjectCostService', () => {
    let service: ProjectCostService;
    let internalCostRateVersionRepository: jest.Mocked<InternalCostRateVersionRepository>;
    let projectActualCostRecordRepository: jest.Mocked<ProjectActualCostRecordRepository>;
    let contractFinanceRepository: jest.Mocked<ContractFinanceRepository>;

    beforeEach(() => {
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
            findReplacementBySupersedesRecordId: jest.fn()
        };

        const mockContractFinanceRepository = {
            findPaymentById: jest.fn()
        };

        internalCostRateVersionRepository = mockInternalCostRateVersionRepository as unknown as jest.Mocked<InternalCostRateVersionRepository>;
        projectActualCostRecordRepository = mockProjectActualCostRecordRepository as unknown as jest.Mocked<ProjectActualCostRecordRepository>;
        contractFinanceRepository = mockContractFinanceRepository as unknown as jest.Mocked<ContractFinanceRepository>;
        service = new ProjectCostService(internalCostRateVersionRepository, projectActualCostRecordRepository, contractFinanceRepository);
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
                {
                    paymentRecordId: PAYMENT_RECORD_ID,
                    projectId: PROJECT_ID,
                    costDescription: 'confirmed vendor payment',
                    evidenceSummary: 'bank slip attached',
                    expectedVersion: 3
                },
                USER_ID
            );

            expect(projectActualCostRecordRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    costType: 'PAYMENT_FACT',
                    costSubtype: 'vendor-payment',
                    occurredOn: '2023-03-18',
                    recordStatus: 'CONFIRMED',
                    amountIncludingTax: '8888.5000',
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
                    {
                        paymentRecordId: PAYMENT_RECORD_ID,
                        projectId: PROJECT_ID
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
                    {
                        paymentRecordId: PAYMENT_RECORD_ID,
                        projectId: PROJECT_ID
                    },
                    USER_ID
                )
            ).rejects.toThrow(ConflictException);
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
                    amountExcludingTax: null,
                    taxCostAmount: null,
                    amountIncludingTax: '8888.5000',
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
                    amountIncludingTax: '8888.5000'
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
    });

    describe('registerLaborCostRecord', () => {
        it('registers a labor cost record with calculated amount and traceable rate version', async () => {
            internalCostRateVersionRepository.findById.mockResolvedValue(makeRateVersion() as never);

            const result = await service.registerLaborCostRecord(
                {
                    projectId: PROJECT_ID,
                    laborRole: 'dev',
                    laborPeriodType: 'MONTH',
                    laborPeriodStart: '2023-01-01',
                    laborPeriodEnd: '2023-01-31',
                    rateVersionId: RATE_VERSION_ID,
                    actualPersonDays: '20'
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
                    {
                        projectId: PROJECT_ID,
                        laborPeriodType: 'MONTH',
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20'
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
                    {
                        projectId: PROJECT_ID,
                        laborRole: 'dev',
                        laborPeriodType: 'MONTH',
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20'
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
                    {
                        supersedesRecordId: RECORD_ID,
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
                    {
                        supersedesRecordId: RECORD_ID,
                        laborPeriodStart: '2023-01-01',
                        laborPeriodEnd: '2023-01-31',
                        rateVersionId: RATE_VERSION_ID,
                        actualPersonDays: '20',
                        replaceReason: 'Correction',
                        expectedVersion: 2
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
                {
                    supersedesRecordId: RECORD_ID,
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
