import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
    const userId = '00000000-0000-0000-0000-000000000001';

    let service: ContractService;
    let contractRepository: {
        findByNo: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        findById: jest.Mock;
        findMany: jest.Mock;
    };
    let approvalRecordRepository: {
        findOne: jest.Mock;
    };
    let projectService: jest.Mocked<ProjectService>;

    beforeEach(() => {
        contractRepository = {
            findByNo: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            findMany: jest.fn()
        };
        approvalRecordRepository = {
            findOne: jest.fn()
        };
        projectService = {
            findById: jest.fn()
        } as unknown as jest.Mocked<ProjectService>;

        service = new ContractService(contractRepository as never, projectService, approvalRecordRepository as never);
    });

    it('creates a contract after validating project existence and defaults', async () => {
        const createdContract = createContractEntity();
        projectService.findById.mockResolvedValue({ id: projectId } as never);
        contractRepository.findByNo.mockResolvedValue(null);
        contractRepository.create.mockReturnValue(createdContract);
        contractRepository.save.mockResolvedValue(undefined);

        const result = await service.createAndSave({
            projectId,
            contractNo: 'HT-2026-001',
            signedAmount: '880000.00'
        });

        expect(contractRepository.create).toHaveBeenCalledWith({
            projectId,
            contractNo: 'HT-2026-001',
            status: 'draft',
            signedAmount: '880000.00',
            currencyCode: 'CNY',
            currentSnapshotId: null,
            signedAt: null,
            createdBy: null,
            updatedBy: null
        });
        expect(contractRepository.save).toHaveBeenCalledWith(createdContract);
        expect(result).toBe(createdContract);
    });

    it('rejects contract creation when project does not exist', async () => {
        projectService.findById.mockResolvedValue(null);

        await expect(
            service.createAndSave({
                projectId,
                contractNo: 'HT-2026-001',
                signedAmount: '880000.00'
            })
        ).rejects.toThrow(NotFoundException);

        expect(contractRepository.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate contract numbers before save', async () => {
        projectService.findById.mockResolvedValue({ id: projectId } as never);
        contractRepository.findByNo.mockResolvedValue(createContractEntity());

        await expect(
            service.createAndSave({
                projectId,
                contractNo: 'HT-2026-001',
                signedAmount: '880000.00'
            })
        ).rejects.toThrow(ConflictException);

        expect(contractRepository.create).not.toHaveBeenCalled();
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

    it('activates a reviewed contract and generates snapshot id when missing', async () => {
        const approvedApprovalId = '40000000-0000-4000-8000-000000000001';
        const contract = createContractEntity({
            status: 'pending-review',
            rowVersion: 3
        });
        contractRepository.findById.mockResolvedValue(contract);
        contractRepository.save.mockResolvedValue(undefined);
        approvalRecordRepository.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: approvedApprovalId });

        const result = await service.activate(contractId, userId, {
            comment: '确认合同生效',
            expectedVersion: 3
        });

        expect(contract.status).toBe('active');
        expect(contract.currentSnapshotId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        expect(contract.updatedBy).toBe(userId);
        expect(result).toEqual({
            targetId: contractId,
            targetType: 'Contract',
            resultStatus: 'activated',
            businessStatusAfter: 'active',
            approvalRecordId: approvedApprovalId,
            confirmationRecordId: null,
            todoItemIds: [],
            snapshotId: contract.currentSnapshotId
        });
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

        await expect(
            service.activate(contractId, userId, {
                expectedVersion: 1
            })
        ).rejects.toThrow(BadRequestException);
    });

    function createContractEntity(overrides: Record<string, unknown> = {}) {
        return {
            id: contractId,
            projectId,
            contractNo: 'HT-2026-001',
            status: 'draft',
            signedAmount: '880000.00',
            currencyCode: 'CNY',
            currentSnapshotId: null,
            signedAt: null,
            rowVersion: 1,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            createdBy: userId,
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedBy: userId,
            ...overrides
        };
    }
});
