import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('node:crypto', () => ({
    randomUUID: jest
        .fn()
        .mockReturnValueOnce('40000000-0000-4000-8000-000000000001')
        .mockReturnValueOnce('50000000-0000-4000-8000-000000000001')
        .mockReturnValue('generated-uuid')
}));

jest.mock('@mikro-orm/core', () => ({
    QueryOrder: {
        ASC: 'ASC',
        DESC: 'DESC'
    }
}));

jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

jest.mock('../contract/contract.entity', () => ({
    Contract: class Contract {}
}));

jest.mock('../commission/commission-payout.entity', () => ({
    CommissionPayout: class CommissionPayout {}
}));

jest.mock('../commission/commission-adjustment.entity', () => ({
    CommissionAdjustment: class CommissionAdjustment {}
}));

jest.mock('./approval-record.entity', () => ({
    ApprovalRecord: class ApprovalRecord {}
}));

jest.mock('./todo-item.entity', () => ({
    TodoItem: class TodoItem {}
}));

import { ApprovalService } from './approval.service';

describe('ApprovalService', () => {
    const approvalRecordId = '40000000-0000-4000-8000-000000000001';
    const todoItemId = '50000000-0000-4000-8000-000000000001';
    const contractId = '30000000-0000-4000-8000-000000000001';
    const payoutId = '31000000-0000-4000-8000-000000000001';
    const adjustmentId = '32000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const initiatorUserId = '00000000-0000-4000-8000-000000000002';
    const approverUserId = '00000000-0000-4000-8000-000000000001';

    let service: ApprovalService;
    let approvalRecordRepository: { getEntityManager: jest.Mock; findOne: jest.Mock; find: jest.Mock };
    let todoItemRepository: { find: jest.Mock };
    let contractRepository: { findOne: jest.Mock; find: jest.Mock };
    let commissionPayoutRepository: { findOne: jest.Mock; find: jest.Mock };
    let commissionAdjustmentRepository: { findOne: jest.Mock; find: jest.Mock };
    let em: {
        transactional: jest.Mock;
        findOne: jest.Mock;
        create: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
    };

    beforeEach(() => {
        em = {
            transactional: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((entity, data) => ({ id: pickGeneratedId(entity?.name), rowVersion: 1, createdAt: new Date(), updatedAt: new Date(), ...data })),
            persist: jest.fn(),
            flush: jest.fn()
        };
        em.transactional.mockImplementation(async (callback: (innerEm: typeof em) => Promise<unknown>) => callback(em));

        approvalRecordRepository = {
            getEntityManager: jest.fn(() => em),
            findOne: jest.fn(),
            find: jest.fn()
        };
        todoItemRepository = {
            find: jest.fn()
        };
        contractRepository = {
            findOne: jest.fn(),
            find: jest.fn()
        };
        commissionPayoutRepository = {
            findOne: jest.fn(),
            find: jest.fn()
        };
        commissionAdjustmentRepository = {
            findOne: jest.fn(),
            find: jest.fn()
        };

        service = new ApprovalService(
            approvalRecordRepository as never,
            todoItemRepository as never,
            contractRepository as never,
            commissionPayoutRepository as never,
            commissionAdjustmentRepository as never
        );
    });

    it('submits contract review and creates approval plus todo', async () => {
        const contract = createContract({ status: 'draft', rowVersion: 3 });
        em.findOne.mockResolvedValueOnce(contract).mockResolvedValueOnce(null);

        const result = await service.submitContractReview(contractId, initiatorUserId, {
            comment: '请审核合同条款',
            expectedVersion: 3
        });

        expect(contract.status).toBe('pending-review');
        expect(em.create).toHaveBeenNthCalledWith(
            1,
            expect.any(Function),
            expect.objectContaining({
                id: approvalRecordId,
                targetObjectId: contractId,
                currentStatus: 'pending'
            })
        );
        expect(em.create).toHaveBeenNthCalledWith(
            2,
            expect.any(Function),
            expect.objectContaining({
                id: todoItemId,
                sourceId: approvalRecordId,
                targetObjectId: contractId,
                status: 'open'
            })
        );
        expect(em.persist).toHaveBeenCalled();
        expect(result).toEqual({
            targetId: contractId,
            targetType: 'Contract',
            resultStatus: 'submitted',
            businessStatusAfter: 'pending-review',
            approvalRecordId,
            confirmationRecordId: null,
            todoItemIds: [todoItemId],
            snapshotId: null
        });
    });

    it('rejects duplicate pending contract review approvals', async () => {
        em.findOne.mockResolvedValueOnce(createContract({ status: 'draft' })).mockResolvedValueOnce(createApprovalRecord({ currentStatus: 'pending' }));

        await expect(service.submitContractReview(contractId, initiatorUserId, {})).rejects.toThrow(ConflictException);
    });

    it('requires contract to stay in draft before submit review', async () => {
        em.findOne.mockResolvedValueOnce(createContract({ status: 'active' }));

        await expect(service.submitContractReview(contractId, initiatorUserId, {})).rejects.toThrow(BadRequestException);
    });

    it('approves pending review and closes todo without activating contract yet', async () => {
        const approval = createApprovalRecord();
        const contract = createContract({ status: 'pending-review' });
        const todo = createTodoItem();
        em.findOne.mockResolvedValueOnce(approval).mockResolvedValueOnce(todo).mockResolvedValueOnce(contract);

        const result = await service.approveRecord(approvalRecordId, approverUserId, {
            comment: '审核通过',
            expectedVersion: 4
        });

        expect(approval.currentStatus).toBe('approved');
        expect(contract.status).toBe('pending-review');
        expect(todo.status).toBe('completed');
        expect(result.resultStatus).toBe('approved');
        expect(result.businessStatusAfter).toBe('pending-review');
        expect(result.snapshotId).toBeNull();
    });

    it('submits commission payout approval and creates approval plus todo', async () => {
        const payout = createCommissionPayout({ status: 'draft', rowVersion: 2 });
        em.findOne.mockResolvedValueOnce(payout).mockResolvedValueOnce(null);

        const result = await service.submitCommissionPayoutApproval(payoutId, initiatorUserId, {
            expectedVersion: 2
        });

        expect(payout.status).toBe('pending-approval');
        expect(result).toEqual(
            expect.objectContaining({
                targetId: payoutId,
                targetType: 'CommissionPayout',
                resultStatus: 'submitted',
                businessStatusAfter: 'pending-approval',
                confirmationRecordId: null,
                snapshotId: null
            })
        );
        expect(result.approvalRecordId).toBeTruthy();
        expect(result.todoItemIds).toHaveLength(1);
    });

    it('approves pending commission payout and closes todo', async () => {
        const approval = createApprovalRecord({
            approvalType: 'commission-payout-approval',
            businessDomain: 'commission',
            targetObjectType: 'CommissionPayout',
            targetObjectId: payoutId,
            currentNodeKey: 'commission-payout-approval'
        });
        const payout = createCommissionPayout({ status: 'pending-approval' });
        const todo = createTodoItem({
            businessDomain: 'commission',
            targetObjectType: 'CommissionPayout',
            targetObjectId: payoutId,
            title: '提成发放审批：第一阶段'
        });
        em.findOne.mockResolvedValueOnce(approval).mockResolvedValueOnce(todo).mockResolvedValueOnce(payout);

        const result = await service.approveRecord(approvalRecordId, approverUserId, {
            comment: '批准发放',
            expectedVersion: 4
        });

        expect(payout.status).toBe('approved');
        expect(payout.approvedAmount).toBe('480.00');
        expect(todo.status).toBe('completed');
        expect(result.targetType).toBe('CommissionPayout');
        expect(result.businessStatusAfter).toBe('approved');
    });

    it('submits commission adjustment approval and creates approval plus todo', async () => {
        const adjustment = createCommissionAdjustment({ status: 'draft', rowVersion: 2 });
        em.findOne.mockResolvedValueOnce(adjustment).mockResolvedValueOnce(null);

        const result = await service.submitCommissionAdjustmentApproval(adjustmentId, initiatorUserId, {
            expectedVersion: 2
        });

        expect(adjustment.status).toBe('pending-approval');
        expect(result).toEqual(
            expect.objectContaining({
                targetId: adjustmentId,
                targetType: 'CommissionAdjustment',
                resultStatus: 'submitted',
                businessStatusAfter: 'pending-approval'
            })
        );
    });

    it('approves pending commission adjustment and closes todo', async () => {
        const approval = createApprovalRecord({
            approvalType: 'commission-adjustment-approval',
            businessDomain: 'commission',
            targetObjectType: 'CommissionAdjustment',
            targetObjectId: adjustmentId,
            currentNodeKey: 'commission-adjustment-approval'
        });
        const adjustment = createCommissionAdjustment({ status: 'pending-approval' });
        const todo = createTodoItem({
            businessDomain: 'commission',
            targetObjectType: 'CommissionAdjustment',
            targetObjectId: adjustmentId,
            title: '提成调整审批：暂停发放'
        });
        em.findOne.mockResolvedValueOnce(approval).mockResolvedValueOnce(todo).mockResolvedValueOnce(adjustment);

        const result = await service.approveRecord(approvalRecordId, approverUserId, {
            comment: '同意调整',
            expectedVersion: 4
        });

        expect(adjustment.status).toBe('approved');
        expect(todo.status).toBe('completed');
        expect(result.targetType).toBe('CommissionAdjustment');
        expect(result.businessStatusAfter).toBe('approved');
    });

    it('rejects pending review back to draft and cancels todo', async () => {
        const approval = createApprovalRecord();
        const contract = createContract({ status: 'pending-review' });
        const todo = createTodoItem();
        em.findOne.mockResolvedValueOnce(approval).mockResolvedValueOnce(todo).mockResolvedValueOnce(contract);

        const result = await service.rejectRecord(approvalRecordId, approverUserId, {
            reason: '金额条款不完整',
            comment: '请补齐付款条件',
            expectedVersion: 4
        });

        expect(approval.currentStatus).toBe('rejected');
        expect(contract.status).toBe('draft');
        expect(todo.status).toBe('canceled');
        expect(result.resultStatus).toBe('rejected');
        expect(result.businessStatusAfter).toBe('draft');
        expect(result.snapshotId).toBeNull();
    });

    it('blocks approval when current user is not assignee', async () => {
        em.findOne.mockResolvedValueOnce(createApprovalRecord({ currentApproverUserId: approverUserId }));

        await expect(service.approveRecord(approvalRecordId, initiatorUserId, {})).rejects.toThrow(ForbiddenException);
    });

    it('throws when approval record is missing', async () => {
        em.findOne.mockResolvedValueOnce(null);

        await expect(service.approveRecord(approvalRecordId, approverUserId, {})).rejects.toThrow(NotFoundException);
    });

    it('returns approval detail with related contract summary fields', async () => {
        approvalRecordRepository.findOne.mockResolvedValue(createApprovalRecord({ currentStatus: 'approved' }));
        contractRepository.findOne.mockResolvedValue(createContract({ status: 'pending-review' }));

        const result = await service.findApprovalRecordById(approvalRecordId);

        expect(contractRepository.findOne).toHaveBeenCalledWith({ id: contractId });
        expect(result).toEqual(
            expect.objectContaining({
                id: approvalRecordId,
                currentNodeKey: 'contract-review',
                currentNodeName: '合同审核',
                targetTitle: 'HT-2026-001',
                targetStatus: 'pending-review'
            })
        );
    });

    it('returns approval detail with related payout summary fields', async () => {
        approvalRecordRepository.findOne.mockResolvedValue(
            createApprovalRecord({
                approvalType: 'commission-payout-approval',
                businessDomain: 'commission',
                targetObjectType: 'CommissionPayout',
                targetObjectId: payoutId,
                currentNodeKey: 'commission-payout-approval'
            })
        );
        commissionPayoutRepository.findOne.mockResolvedValue(createCommissionPayout({ status: 'pending-approval' }));

        const result = await service.findApprovalRecordById(approvalRecordId);

        expect(result).toEqual(
            expect.objectContaining({
                currentNodeName: '提成发放审批',
                targetTitle: '第一阶段提成发放',
                targetStatus: 'pending-approval'
            })
        );
    });

    it('returns approval detail with related adjustment summary fields', async () => {
        approvalRecordRepository.findOne.mockResolvedValue(
            createApprovalRecord({
                approvalType: 'commission-adjustment-approval',
                businessDomain: 'commission',
                targetObjectType: 'CommissionAdjustment',
                targetObjectId: adjustmentId,
                currentNodeKey: 'commission-adjustment-approval'
            })
        );
        commissionAdjustmentRepository.findOne.mockResolvedValue(createCommissionAdjustment({ status: 'pending-approval' }));

        const result = await service.findApprovalRecordById(approvalRecordId);

        expect(result).toEqual(
            expect.objectContaining({
                currentNodeName: '提成调整审批',
                targetTitle: '暂停发放调整',
                targetStatus: 'pending-approval'
            })
        );
    });

    it('returns latest approval summary for target object', async () => {
        approvalRecordRepository.findOne.mockResolvedValue(createApprovalRecord({ currentStatus: 'approved' }));
        contractRepository.findOne.mockResolvedValue(createContract({ status: 'pending-review' }));

        const result = await service.findLatestApprovalForTarget('Contract', contractId);

        expect(approvalRecordRepository.findOne).toHaveBeenCalledWith(
            {
                targetObjectType: 'Contract',
                targetObjectId: contractId
            },
            {
                orderBy: {
                    submittedAt: 'DESC',
                    createdAt: 'DESC'
                }
            }
        );
        expect(result).toEqual(
            expect.objectContaining({
                id: approvalRecordId,
                currentStatus: 'approved',
                targetTitle: 'HT-2026-001'
            })
        );
    });

    it('lists only open todos for current user with target summary and allowed actions', async () => {
        todoItemRepository.find.mockResolvedValue([
            createTodoItem({ status: 'open' }),
            createTodoItem({ id: '50000000-0000-4000-8000-000000000002', sourceId: '40000000-0000-4000-8000-000000000002' }),
            createTodoItem({
                id: '50000000-0000-4000-8000-000000000003',
                sourceId: '40000000-0000-4000-8000-000000000003',
                businessDomain: 'commission',
                targetObjectType: 'CommissionPayout',
                targetObjectId: payoutId,
                title: '提成发放审批：第一阶段'
            }),
            createTodoItem({
                id: '50000000-0000-4000-8000-000000000004',
                sourceId: '40000000-0000-4000-8000-000000000004',
                businessDomain: 'commission',
                targetObjectType: 'CommissionAdjustment',
                targetObjectId: adjustmentId,
                title: '提成调整审批：暂停发放'
            })
        ]);
        approvalRecordRepository.find.mockResolvedValue([
            createApprovalRecord(),
            createApprovalRecord({ id: '40000000-0000-4000-8000-000000000002' }),
            createApprovalRecord({
                id: '40000000-0000-4000-8000-000000000003',
                approvalType: 'commission-payout-approval',
                businessDomain: 'commission',
                targetObjectType: 'CommissionPayout',
                targetObjectId: payoutId,
                currentNodeKey: 'commission-payout-approval'
            }),
            createApprovalRecord({
                id: '40000000-0000-4000-8000-000000000004',
                approvalType: 'commission-adjustment-approval',
                businessDomain: 'commission',
                targetObjectType: 'CommissionAdjustment',
                targetObjectId: adjustmentId,
                currentNodeKey: 'commission-adjustment-approval'
            })
        ]);
        contractRepository.find.mockResolvedValue([createContract()]);
        commissionPayoutRepository.find.mockResolvedValue([createCommissionPayout()]);
        commissionAdjustmentRepository.find.mockResolvedValue([createCommissionAdjustment()]);

        const todos = await service.findOpenTodosForUser(approverUserId);

        expect(todoItemRepository.find).toHaveBeenCalledWith({ assigneeUserId: approverUserId, status: { $in: ['open', 'processing'] } }, { orderBy: { createdAt: 'ASC' } });
        expect(approvalRecordRepository.find).toHaveBeenCalledWith({
            id: { $in: [approvalRecordId, '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000004'] }
        });
        expect(contractRepository.find).toHaveBeenCalledWith({
            id: { $in: [contractId] }
        });
        expect(commissionPayoutRepository.find).toHaveBeenCalledWith({
            id: { $in: [payoutId] }
        });
        expect(commissionAdjustmentRepository.find).toHaveBeenCalledWith({
            id: { $in: [adjustmentId] }
        });
        expect(todos).toHaveLength(4);
        expect(todos[0]).toEqual(
            expect.objectContaining({
                targetTitle: 'HT-2026-001',
                currentNodeName: '合同审核',
                allowedActions: ['approve', 'reject']
            })
        );
        expect(todos[2]).toEqual(
            expect.objectContaining({
                targetTitle: '第一阶段提成发放',
                currentNodeName: '提成发放审批',
                allowedActions: ['approve', 'reject']
            })
        );
        expect(todos[3]).toEqual(
            expect.objectContaining({
                targetTitle: '暂停发放调整',
                currentNodeName: '提成调整审批',
                allowedActions: ['approve', 'reject']
            })
        );
    });

    function pickGeneratedId(entityName?: string): string {
        if (entityName === 'TodoItem') {
            return todoItemId;
        }
        if (entityName === 'ApprovalRecord') {
            return approvalRecordId;
        }
        return 'generated-id';
    }

    function createContract(overrides: Record<string, unknown> = {}) {
        return {
            id: contractId,
            projectId,
            contractNo: 'HT-2026-001',
            status: 'draft',
            signedAmount: '880000.00',
            currencyCode: 'CNY',
            currentSnapshotId: null,
            signedAt: null,
            rowVersion: 4,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            ...overrides
        };
    }

    function createApprovalRecord(overrides: Record<string, unknown> = {}) {
        return {
            id: approvalRecordId,
            approvalType: 'contract-review',
            businessDomain: 'contract-finance',
            targetObjectType: 'Contract',
            targetObjectId: contractId,
            projectId,
            currentStatus: 'pending',
            currentNodeKey: 'contract-review',
            initiatorUserId,
            currentApproverUserId: approverUserId,
            decision: null,
            decisionComment: null,
            submittedAt: new Date('2026-03-22T10:00:00.000Z'),
            decidedAt: null,
            closedAt: null,
            rowVersion: 4,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            ...overrides
        };
    }

    function createTodoItem(overrides: Record<string, unknown> = {}) {
        return {
            id: todoItemId,
            sourceType: 'ApprovalRecord',
            sourceId: approvalRecordId,
            todoType: 'approval',
            businessDomain: 'contract-finance',
            targetObjectType: 'Contract',
            targetObjectId: contractId,
            projectId,
            title: '合同审核：HT-2026-001',
            summary: null,
            assigneeUserId: approverUserId,
            status: 'open',
            priority: 'high',
            dueAt: null,
            completedAt: null,
            rowVersion: 1,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            ...overrides
        };
    }

    function createCommissionPayout(overrides: Record<string, unknown> = {}) {
        return {
            id: payoutId,
            projectId,
            calculationId: '52000000-0000-4000-8000-000000000001',
            stageType: 'first',
            selectedTier: 'basic',
            theoreticalCapAmount: '480.00',
            approvedAmount: null,
            paidRecordAmount: null,
            status: 'draft',
            approvedAt: null,
            handledAt: null,
            rowVersion: 4,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            ...overrides
        };
    }

    function createCommissionAdjustment(overrides: Record<string, unknown> = {}) {
        return {
            id: adjustmentId,
            projectId,
            adjustmentType: 'suspend-payout',
            relatedPayoutId: payoutId,
            relatedCalculationId: '52000000-0000-4000-8000-000000000001',
            amount: null,
            reason: '客户退款待核实',
            status: 'draft',
            executedAt: null,
            rowVersion: 4,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            ...overrides
        };
    }
});
