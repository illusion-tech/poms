import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalCostRateVersionRepository, ProjectActualCostRecordRepository } from './project-cost.repository';

jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { ProjectCostService } from './project-cost.service';

describe('ProjectCostService', () => {
    let service: ProjectCostService;
    let internalCostRateVersionRepository: jest.Mocked<InternalCostRateVersionRepository>;
    let projectActualCostRecordRepository: jest.Mocked<ProjectActualCostRecordRepository>;

    let originalRecordInstance: any;

    beforeEach(async () => {
        originalRecordInstance = {};
        const mockInternalCostRateVersionRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findActiveVersion: jest.fn(),
            findById: jest.fn(),
        };

        const mockProjectActualCostRecordRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                transactional: async (cb: any) => cb({
                    findOne: jest.fn().mockResolvedValue(originalRecordInstance),
                    persist: jest.fn(),
                    flush: jest.fn(),
                    create: jest.fn().mockReturnValue({ id: 'new-record-1', supersedesRecord: 'record-1' })
                })
            })
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectCostService,
                {
                    provide: InternalCostRateVersionRepository,
                    useValue: mockInternalCostRateVersionRepository,
                },
                {
                    provide: ProjectActualCostRecordRepository,
                    useValue: mockProjectActualCostRecordRepository,
                },
            ],
        }).compile();

        service = module.get<ProjectCostService>(ProjectCostService);
        internalCostRateVersionRepository = module.get<InternalCostRateVersionRepository>(InternalCostRateVersionRepository) as any;
        projectActualCostRecordRepository = module.get<ProjectActualCostRecordRepository>(ProjectActualCostRecordRepository) as any;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('publishInternalCostRateVersion', () => {
        it('should successfully publish a new cost rate version', async () => {
            const input = {
                rateScopeType: 'GLOBAL',
                rateUnit: 'DAY',
                rateValue: '1000',
                currency: 'CNY',
                effectiveFrom: '2023-01-01',
            };
            const userId = 'user-123';
            
            internalCostRateVersionRepository.findActiveVersion.mockResolvedValue(null);
            const entity = { id: 'rate-1', ...input };
            internalCostRateVersionRepository.create.mockReturnValue(entity as any);

            const result = await service.publishInternalCostRateVersion(input, userId);

            expect(internalCostRateVersionRepository.create).toHaveBeenCalled();
            expect(internalCostRateVersionRepository.save).toHaveBeenCalledWith(entity);
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe('rate-1');
        });

        it('should throw ConflictException if there is a historical period conflict', async () => {
            const input = {
                rateScopeType: 'GLOBAL',
                rateUnit: 'DAY',
                rateValue: '1000',
                currency: 'CNY',
                effectiveFrom: '2023-01-01',
            };
            const userId = 'user-123';
            
            internalCostRateVersionRepository.findActiveVersion.mockResolvedValue({ id: 'existing-rate' } as any);

            await expect(service.publishInternalCostRateVersion(input, userId)).rejects.toThrow(ConflictException);
        });
    });

    describe('registerLaborCostRecord', () => {
        it('should successfully register a labor cost record', async () => {
            const input = {
                projectId: 'proj-1',
                laborPeriodStart: '2023-01-01',
                laborPeriodEnd: '2023-01-31',
                rateVersionId: 'rate-1',
                actualHours: 160
            };
            const userId = 'user-123';

            internalCostRateVersionRepository.findById.mockResolvedValue({ id: 'rate-1' } as any);
            const entity = { id: 'record-1', ...input, costType: 'LABOR' };
            projectActualCostRecordRepository.create.mockReturnValue(entity as any);

            const result = await service.registerLaborCostRecord(input, userId);

            expect(projectActualCostRecordRepository.create).toHaveBeenCalled();
            expect(projectActualCostRecordRepository.save).toHaveBeenCalledWith(entity);
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe('record-1');
            expect(entity.costType).toBe('LABOR');
        });

        it('should throw NotFoundException if valid cost rate is not found', async () => {
            const input = {
                projectId: 'proj-1',
                rateVersionId: 'invalid-rate',
            };
            const userId = 'user-123';

            internalCostRateVersionRepository.findById.mockResolvedValue(null);

            await expect(service.registerLaborCostRecord(input, userId)).rejects.toThrow(NotFoundException);
        });
    });

    describe('replaceLaborCostRecord', () => {
        it('should throw NotFoundException if original record is not found', async () => {
            const input = { replacementOfRecordId: 'missing-record' };
            projectActualCostRecordRepository.findById.mockResolvedValue(null);

            await expect(service.replaceLaborCostRecord(input, 'user-1')).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException if optimistic locking fails', async () => {
            const input = { replacementOfRecordId: 'record-1', expectedVersion: 2 };
            projectActualCostRecordRepository.findById.mockResolvedValue({ id: 'record-1', rowVersion: 1 } as any);

            await expect(service.replaceLaborCostRecord(input, 'user-1')).rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException if record is already included in project cost', async () => {
            const input = { replacementOfRecordId: 'record-1' };
            projectActualCostRecordRepository.findById.mockResolvedValue({ id: 'record-1', isIncludedInProjectCost: true } as any);

            await expect(service.replaceLaborCostRecord(input, 'user-1')).rejects.toThrow(ConflictException);
        });

        it('should successfully replace a labor cost record', async () => {
            const originalRecord = {
                id: 'record-1',
                project: 'proj-1',
                recordStatus: 'REGISTERED',
                laborPeriodStart: new Date('2023-01-01'),
                laborPeriodEnd: new Date('2023-01-31')
            };
            
            const input = {
                replacementOfRecordId: 'record-1',
                laborPeriodStart: '2023-02-01',
                laborPeriodEnd: '2023-02-28',
                rateVersionId: 'rate-2',
                replaceReason: 'Correction'
            };
            const userId = 'user-1';

            originalRecordInstance = originalRecord;
            projectActualCostRecordRepository.findById.mockResolvedValue(originalRecord as any);
            projectActualCostRecordRepository.create.mockReturnValue({ id: 'new-record-1', supersedesRecord: 'record-1' } as any);

            const result = await service.replaceLaborCostRecord(input, userId);

            expect(originalRecord.recordStatus).toBe('REPLACED');
            expect(result.resultStatus).toBe('success');
            expect(result.targetId).toBe('new-record-1');
        });
    });
});