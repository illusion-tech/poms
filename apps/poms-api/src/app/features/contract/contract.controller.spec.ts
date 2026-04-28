import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { ApprovalService } from '../approval/approval.service';
import { ProjectService } from '../project/project.service';

describe('ContractController', () => {
    const contractId = '30000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000001';
    const baseDate = new Date('2026-03-22T10:00:00.000Z');

    let controller: ContractController;
    let contractService: jest.Mocked<ContractService>;
    let approvalService: jest.Mocked<ApprovalService>;
    let projectService: jest.Mocked<ProjectService>;
    let contractTermSnapshotRepository: { findById: jest.Mock };
    let sensitiveFieldProjectionService: { projectStringField: jest.Mock };

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
        projectService = {
            findById: jest.fn().mockResolvedValue(null),
            findByIds: jest.fn().mockResolvedValue([])
        } as unknown as jest.Mocked<ProjectService>;
        contractTermSnapshotRepository = { findById: jest.fn() };
        sensitiveFieldProjectionService = {
            projectStringField: jest.fn(async (input) => {
                if (input.rawValue === null) {
                    return {
                        fieldPackageKey: input.fieldPackageKey,
                        mode: 'full',
                        value: null,
                        displayText: '-',
                        reasonCode: 'field-package-not-applicable'
                    };
                }

                const canRead = input.user?.permissions?.includes('contract:finance:sensitive:read') ?? false;
                return {
                    fieldPackageKey: input.fieldPackageKey,
                    mode: canRead ? 'full' : 'masked',
                    value: canRead ? input.rawValue : null,
                    displayText: canRead ? (input.displayTextWhenFull ?? input.rawValue) : '敏感字段已隐藏',
                    reasonCode: canRead ? 'allowed' : 'missing-sensitive-read-permission'
                };
            })
        };

        controller = new ContractController(
            contractService,
            approvalService,
            projectService,
            contractTermSnapshotRepository as never,
            sensitiveFieldProjectionService as never
        );
    });

    it('maps create payload signedAt into Date', async () => {
        const signedAt = '2026-03-20T09:30:00.000Z';
        contractService.createAndSave.mockResolvedValue(
            createContractEntity({
                signedAt: new Date(signedAt)
            })
        );

        await controller.create(
            {
                projectId,
                contractNo: 'HT-2026-001',
                signedAmount: '880000.00',
                signedAt,
                createdBy: userId,
                updatedBy: userId
            },
            makeRequest()
        );

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

        await controller.updateBasicInfo(
            contractId,
            {
                signedAt: null,
                updatedBy: userId
            },
            makeRequest()
        );

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

        await controller.updateBasicInfo(
            contractId,
            {
                updatedBy: userId
            },
            makeRequest()
        );

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
            approvalRecordId: '40000000-0000-4000-8000-000000000001',
            confirmationRecordId: null,
            todoItemIds: ['50000000-0000-4000-8000-000000000001'],
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
            id: '40000000-0000-4000-8000-000000000001',
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

    it('projects contract list signed amount for callers without sensitive read permission', async () => {
        contractService.findMany.mockResolvedValue([createContractEntity()]);
        projectService.findByIds.mockResolvedValue([{ id: projectId, projectName: 'POMS 项目', customerName: '华南地铁集团' }] as never);

        const result = await controller.list({}, makeRequest(['project:read']));

        expect(result[0]).not.toHaveProperty('signedAmount');
        expect(result[0]?.signedAmountProjection).toEqual(
            expect.objectContaining({
                fieldPackageKey: 'contract-finance',
                mode: 'masked',
                value: null,
                reasonCode: 'missing-sensitive-read-permission'
            })
        );
    });

    it('activates contract with current user identity', async () => {
        contractService.activate.mockResolvedValue({
            targetId: contractId,
            targetType: 'Contract',
            resultStatus: 'activated',
            businessStatusAfter: 'active',
            approvalRecordId: '40000000-0000-4000-8000-000000000001',
            confirmationRecordId: null,
            todoItemIds: [],
            snapshotId: '60000000-0000-4000-8000-000000000001'
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
            retentionDueDate: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        };
    }

    function makeRequest(permissions: string[] = ['project:read', 'contract:finance:sensitive:read']) {
        return {
            user: { sub: userId, username: 'admin', permissions },
            originalUrl: '/contracts',
            method: 'GET'
        } as never;
    }
});
