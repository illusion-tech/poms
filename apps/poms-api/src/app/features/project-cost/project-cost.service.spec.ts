import { ConflictException, NotFoundException } from '@nestjs/common';
import { InternalCostRateVersionRepository, ProjectActualCostRecordRepository } from './project-cost.repository';

jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { ProjectCostService } from './project-cost.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const RATE_VERSION_ID = '33333333-3333-4333-8333-333333333333';
const RECORD_ID = '44444444-4444-4444-8444-444444444444';

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

describe('ProjectCostService', () => {
    let service: ProjectCostService;
    let internalCostRateVersionRepository: jest.Mocked<InternalCostRateVersionRepository>;
    let projectActualCostRecordRepository: jest.Mocked<ProjectActualCostRecordRepository>;

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
            findById: jest.fn()
        };

        internalCostRateVersionRepository = mockInternalCostRateVersionRepository as unknown as jest.Mocked<InternalCostRateVersionRepository>;
        projectActualCostRecordRepository = mockProjectActualCostRecordRepository as unknown as jest.Mocked<ProjectActualCostRecordRepository>;
        service = new ProjectCostService(internalCostRateVersionRepository, projectActualCostRecordRepository);
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
