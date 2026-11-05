import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessNumberService } from '../business-number/business-number.service';
import { ContractReadinessService } from '../contract-readiness/contract-readiness.service';
import { ProjectService } from '../project/project.service';

jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

jest.mock('../approval/approval-record.entity', () => ({
    ApprovalRecord: class ApprovalRecord {}
}));

import { ContractService } from './contract.service';

describe('ContractService', () => {
    const contractId = '30000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000001';

    let service: ContractService;
    let contractRepository: {
        findByNo: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        findById: jest.Mock;
        findMany: jest.Mock;
        getEntityManager: jest.Mock;
    };
    let businessNumberService: jest.Mocked<Pick<BusinessNumberService, 'next'>>;
    let approvalRecordRepository: {
        findOne: jest.Mock;
    };
    let projectService: jest.Mocked<ProjectService>;
    let contractReadinessService: jest.Mocked<ContractReadinessService>;
    let contractTermSnapshotRepository: {
        createActiveSnapshotIfAbsent: jest.Mock;
    };
    let commercialReleaseBaselineRepository: {
        findById: jest.Mock;
    };
    let entityManager: {
        create: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
    };

    beforeEach(() => {
        entityManager = {
            create: jest.fn((_, input) => createContractEntity(input)),
            persist: jest.fn(),
            flush: jest.fn()
        };
        contractRepository = {
            findByNo: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            findMany: jest.fn(),
            getEntityManager: jest.fn(() => ({
                transactional: jest.fn((work) => work(entityManager))
            }))
        };
        businessNumberService = {
            next: jest.fn(async () => 'CT-2026-000001')
        };
        approvalRecordRepository = {
            findOne: jest.fn()
        };
        projectService = {
            findById: jest.fn()
        } as unknown as jest.Mocked<ProjectService>;
        contractReadinessService = {
            resolveActivationReadiness: jest.fn(),
            findContractReadinessById: jest.fn()
        } as unknown as jest.Mocked<ContractReadinessService>;
        contractTermSnapshotRepository = {
            createActiveSnapshotIfAbsent: jest.fn()
        };
        commercialReleaseBaselineRepository = {
            findById: jest.fn()
        };

        service = new ContractService(
            contractRepository as never,
            businessNumberService as never,
            projectService,
            contractReadinessService,
            contractTermSnapshotRepository as never,
            commercialReleaseBaselineRepository as never,
            approvalRecordRepository as never
        );
    });

    it('creates a contract after validating project existence and defaults', async () => {
        projectService.findById.mockResolvedValue({ id: projectId } as never);

        const result = await service.createAndSave({
            projectId,
            customerContractNo: ' CUS-HT-001 ',
            signedAmount: '880000.00'
        });

        expect(businessNumberService.next).toHaveBeenCalledWith('contract', expect.any(Date), entityManager);
        expect(entityManager.create).toHaveBeenCalledWith(
            expect.any(Function),
            {
                projectId,
                contractNo: 'CT-2026-000001',
                customerContractNo: 'CUS-HT-001',
                status: 'draft',
                signedAmount: '880000.00',
                currencyCode: 'CNY',
                signedAt: null,
                retentionDueDate: null,
                createdBy: null,
                updatedBy: null
            }
        );
        expect(entityManager.persist).toHaveBeenCalledWith(result);
        expect(entityManager.flush).toHaveBeenCalled();
    });

    it('rejects contract creation when project does not exist', async () => {
        projectService.findById.mockResolvedValue(null);

        await expect(
            service.createAndSave({
                projectId,
                signedAmount: '880000.00'
            })
        ).rejects.toThrow(NotFoundException);

        expect(businessNumberService.next).not.toHaveBeenCalled();
        expect(entityManager.persist).not.toHaveBeenCalled();
    });

    it('creates a contract with a generated internal number when customer number is omitted', async () => {
        projectService.findById.mockResolvedValue({ id: projectId } as never);

        const result = await service.createAndSave({
            projectId,
            signedAmount: '880000.00'
        });

        expect(result.contractNo).toBe('CT-2026-000001');
        expect(result.customerContractNo).toBeNull();
    });

    it('updates contract basic info and allows signedAt to be cleared', async () => {
        const contract = createContractEntity({
            signedAt: new Date('2026-03-20T09:30:00.000Z')
        });
        contractRepository.findById.mockResolvedValue(contract);
        contractRepository.save.mockResolvedValue(undefined);

        const result = await service.updateBasicInfo(contractId, {
            signedAmount: '920000.00',
            signedAt: null,
            updatedBy: userId
        });

        expect(contract.signedAmount).toBe('920000.00');
        expect(contract.signedAt).toBeNull();
        expect(contract.updatedBy).toBe(userId);
        expect(contractRepository.save).toHaveBeenCalledWith(contract);
        expect(result).toBe(contract);
    });

    it('rejects basic info updates after review has started', async () => {
        contractRepository.findById.mockResolvedValue(
            createContractEntity({
                status: 'pending-review'
            })
        );

        await expect(
            service.updateBasicInfo(contractId, {
                signedAmount: '920000.00',
                updatedBy: userId
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('throws when updating a missing contract', async () => {
        contractRepository.findById.mockResolvedValue(null);

        await expect(service.updateBasicInfo(contractId, { updatedBy: userId })).rejects.toThrow(
            NotFoundException
        );
    });

    it('rejects activation when contract snapshot is not initialized', async () => {
        const approvedApprovalId = '40000000-0000-4000-8000-000000000001';
        const contract = createContractEntity({
            status: 'pending-review',
            rowVersion: 3
        });
        contractRepository.findById.mockResolvedValue(contract);
        approvalRecordRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: approvedApprovalId });
        contractReadinessService.resolveActivationReadiness.mockResolvedValue({
            allowed: true,
            reason: null,
            sourceReadinessId: '50000000-0000-4000-8000-000000000001',
            snapshotId: null
        });

        await expect(
            service.activate(contractId, userId, {
                comment: '确认合同生效',
                expectedVersion: 3
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects activation when baseline is missing core terms', async () => {
        contractRepository.findById.mockResolvedValue(
            createContractEntity({
                status: 'pending-review'
            })
        );
        approvalRecordRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: '40000000-0000-4000-8000-000000000001' });
        contractReadinessService.resolveActivationReadiness.mockResolvedValue({
            allowed: true,
            reason: null,
            sourceReadinessId: '50000000-0000-4000-8000-000000000001',
            snapshotId: '70000000-0000-4000-8000-000000000001'
        });
        contractReadinessService.findContractReadinessById.mockResolvedValue({
            id: '50000000-0000-4000-8000-000000000001',
            sourceBaselineId: '60000000-0000-4000-8000-000000000001'
        } as never);
        commercialReleaseBaselineRepository.findById.mockResolvedValue({
            id: '60000000-0000-4000-8000-000000000001',
            taxRate: null,
            amountTaxInclusive: '',
            amountTaxExclusive: '88495.58',
            downPaymentRate: '0.30',
            retentionRate: '0.05',
            paymentTerms: '30% 首付，65% 阶段款，5% 质保金'
        } as never);

        await expect(
            service.activate(contractId, userId, {
                expectedVersion: 1
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects activation when readiness package is missing', async () => {
        contractRepository.findById.mockResolvedValue(
            createContractEntity({
                status: 'pending-review'
            })
        );
        approvalRecordRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: '40000000-0000-4000-8000-000000000001' });
        contractReadinessService.resolveActivationReadiness.mockResolvedValue({
            allowed: true,
            reason: null,
            sourceReadinessId: null,
            snapshotId: null
        });

        await expect(
            service.activate(contractId, userId, {
                expectedVersion: 1
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects activation when no approved review record exists', async () => {
        contractRepository.findById.mockResolvedValue(
            createContractEntity({
                status: 'pending-review'
            })
        );
        approvalRecordRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);
        contractReadinessService.resolveActivationReadiness.mockResolvedValue({
            allowed: true,
            reason: null,
            sourceReadinessId: '50000000-0000-4000-8000-000000000001',
            snapshotId: '70000000-0000-4000-8000-000000000001'
        });
        contractReadinessService.findContractReadinessById.mockResolvedValue({
            id: '50000000-0000-4000-8000-000000000001',
            sourceBaselineId: '60000000-0000-4000-8000-000000000001'
        } as never);
        commercialReleaseBaselineRepository.findById.mockResolvedValue({
            id: '60000000-0000-4000-8000-000000000001',
            taxRate: '0.13',
            amountTaxInclusive: '100000.00',
            amountTaxExclusive: '88495.58',
            downPaymentRate: '0.30',
            retentionRate: '0.05',
            paymentTerms: '30% 首付，65% 阶段款，5% 质保金'
        } as never);

        await expect(
            service.activate(contractId, userId, {
                expectedVersion: 1
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects activation when no current readiness package is available', async () => {
        contractRepository.findById.mockResolvedValue(
            createContractEntity({
                status: 'pending-review'
            })
        );
        approvalRecordRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: '40000000-0000-4000-8000-000000000001' });
        contractReadinessService.resolveActivationReadiness.mockResolvedValue({
            allowed: false,
            reason: 'Project has no current contract readiness package',
            sourceReadinessId: null,
            snapshotId: null
        });

        await expect(
            service.activate(contractId, userId, {
                expectedVersion: 1
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('reuses readiness snapshot id when contract snapshot is not initialized yet', async () => {
        const approvedApprovalId = '40000000-0000-4000-8000-000000000001';
        const readinessSnapshotId = '70000000-0000-4000-8000-000000000001';
        const contract = createContractEntity({
            status: 'pending-review',
            rowVersion: 4,
            currentSnapshotId: null
        });
        contractRepository.findById.mockResolvedValue(contract);
        contractRepository.save.mockResolvedValue(undefined);
        approvalRecordRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: approvedApprovalId });
        contractReadinessService.resolveActivationReadiness.mockResolvedValue({
            allowed: true,
            reason: null,
            sourceReadinessId: '50000000-0000-4000-8000-000000000001',
            snapshotId: readinessSnapshotId
        });
        contractReadinessService.findContractReadinessById.mockResolvedValue({
            id: '50000000-0000-4000-8000-000000000001',
            sourceBaselineId: '60000000-0000-4000-8000-000000000001'
        } as never);
        commercialReleaseBaselineRepository.findById.mockResolvedValue({
            id: '60000000-0000-4000-8000-000000000001',
            taxRate: '0.13',
            amountTaxInclusive: '100000.00',
            amountTaxExclusive: '88495.58',
            downPaymentRate: '0.30',
            retentionRate: '0.05',
            paymentTerms: '30% 首付，65% 阶段款，5% 质保金'
        } as never);

        const result = await service.activate(contractId, userId, {
            expectedVersion: 4
        });

        expect(contract.currentSnapshotId).toBe(readinessSnapshotId);
        expect(contractTermSnapshotRepository.createActiveSnapshotIfAbsent).toHaveBeenCalledWith({
            id: readinessSnapshotId,
            contractId,
            effectiveBy: userId,
            createdBy: userId,
            retentionDueDate: null,
            amountTaxInclusive: '100000.00',
            amountTaxExclusive: '88495.58',
            taxRate: '0.13',
            downPaymentRate: '0.30',
            retentionRate: '0.05',
            paymentTerms: '30% 首付，65% 阶段款，5% 质保金',
            sourceReadinessId: '50000000-0000-4000-8000-000000000001',
            sourceBaselineId: '60000000-0000-4000-8000-000000000001'
        });
        expect(result.snapshotId).toBe(readinessSnapshotId);
    });

    function createContractEntity(overrides: Record<string, unknown> = {}) {
        return {
            id: contractId,
            projectId,
            contractNo: 'CT-2026-000001',
            status: 'draft',
            signedAmount: '880000.00',
            currencyCode: 'CNY',
            currentSnapshotId: null,
            signedAt: null,
            retentionDueDate: null,
            rowVersion: 1,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            createdBy: userId,
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedBy: userId,
            ...overrides
        };
    }
});
