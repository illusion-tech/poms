import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { ApprovalService } from '../approval/approval.service';

describe('ContractController', () => {
    const contractId = '30000000-0000-0000-0000-000000000001';
    const projectId = '20000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000001';
    const baseDate = new Date('2026-03-22T10:00:00.000Z');

    let controller: ContractController;
    let contractService: jest.Mocked<ContractService>;
    let approvalService: jest.Mocked<ApprovalService>;

    beforeEach(() => {
        contractService = {
            findMany: jest.fn(),
            findByNo: jest.fn(),
            findById: jest.fn(),
            createAndSave: jest.fn(),
            updateBasicInfo: jest.fn(),
            activate: jest.fn()
        } as unknown as jest.Mocked<ContractService>;
        approvalService = {
            submitContractReview: jest.fn(),
            findLatestApprovalForTarget: jest.fn()
        } as unknown as jest.Mocked<ApprovalService>;

        controller = new ContractController(contractService, approvalService);
    });

    it('maps create payload signedAt into Date', async () => {
        const signedAt = '2026-03-20T09:30:00.000Z';
        contractService.createAndSave.mockResolvedValue(
            createContractEntity({
                signedAt: new Date(signedAt)
            })
        );

        await controller.create({
            projectId,
            contractNo: 'HT-2026-001',
            signedAmount: '880000.00',
            signedAt,
            createdBy: userId,
            updatedBy: userId
        });

        expect(contractService.createAndSave).toHaveBeenCalledWith(
            expect.objectContaining({
                signedAt: new Date(signedAt)
            })
        );
    });

    it('maps update payload null signedAt into null', async () => {
        contractService.updateBasicInfo.mockResolvedValue(
            createContractEntity({
                signedAt: null
            })
        );

        await controller.updateBasicInfo(contractId, {
            signedAt: null,
            updatedBy: userId
        });

        expect(contractService.updateBasicInfo).toHaveBeenCalledWith(
            contractId,
            expect.objectContaining({
                signedAt: null,
                updatedBy: userId
            })
        );
    });

    it('leaves update payload signedAt undefined when not provided', async () => {
        contractService.updateBasicInfo.mockResolvedValue(createContractEntity());

        await controller.updateBasicInfo(contractId, {
            updatedBy: userId
        });

        expect(contractService.updateBasicInfo).toHaveBeenCalledWith(
            contractId,
            expect.objectContaining({
                signedAt: undefined,
                updatedBy: userId
            })
        );
    });

    it('submits contract review with current user identity', async () => {
        approvalService.submitContractReview.mockResolvedValue({
            targetId: contractId,
            targetType: 'Contract',
            resultStatus: 'submitted',
            businessStatusAfter: 'pending-review',
            approvalRecordId: '40000000-0000-0000-0000-000000000001',
            confirmationRecordId: null,
            todoItemIds: ['50000000-0000-0000-0000-000000000001'],
            snapshotId: null
        });

        await controller.submitReview(
            contractId,
            {
                user: { sub: userId, username: 'admin', permissions: ['project:write'] }
            },
            { comment: '请审核合同' }
        );

        expect(approvalService.submitContractReview).toHaveBeenCalledWith(contractId, userId, {
            comment: '请审核合同'
        });
    });

    it('returns current approval summary for contract', async () => {
        approvalService.findLatestApprovalForTarget.mockResolvedValue({
            id: '40000000-0000-0000-0000-000000000001',
            approvalType: 'contract-review',
            businessDomain: 'contract-finance',
            targetObjectType: 'Contract',
            targetObjectId: contractId,
            projectId,
            currentStatus: 'pending',
            currentNodeKey: 'contract-review',
            currentNodeName: '合同审核',
            initiatorUserId: userId,
            currentApproverUserId: userId,
            decision: null,
            decisionComment: null,
            targetTitle: 'HT-2026-001',
            targetStatus: 'pending-review',
            submittedAt: baseDate.toISOString(),
            decidedAt: null,
            closedAt: null,
            rowVersion: 1,
            createdAt: baseDate.toISOString(),
            updatedAt: baseDate.toISOString()
        });

        await controller.getCurrentApproval(contractId);

        expect(approvalService.findLatestApprovalForTarget).toHaveBeenCalledWith('Contract', contractId);
    });

    it('activates contract with current user identity', async () => {
        contractService.activate.mockResolvedValue({
            targetId: contractId,
            targetType: 'Contract',
            resultStatus: 'activated',
            businessStatusAfter: 'active',
            approvalRecordId: '40000000-0000-0000-0000-000000000001',
            confirmationRecordId: null,
            todoItemIds: [],
            snapshotId: '60000000-0000-0000-0000-000000000001'
        });

        await controller.activate(
            contractId,
            {
                user: { sub: userId, username: 'admin', permissions: ['project:write'] }
            },
            { comment: '合同已审核通过', expectedVersion: 3 }
        );

        expect(contractService.activate).toHaveBeenCalledWith(contractId, userId, {
            comment: '合同已审核通过',
            expectedVersion: 3
        });
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
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        };
    }
});
