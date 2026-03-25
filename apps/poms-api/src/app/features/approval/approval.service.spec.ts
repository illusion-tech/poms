import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('node:crypto', () => ({
    randomUUID: jest.fn().mockReturnValueOnce('40000000-0000-4000-8000-000000000001').mockReturnValueOnce('50000000-0000-4000-8000-000000000001')
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
    const projectId = '20000000-0000-4000-8000-000000000001';
    const initiatorUserId = '00000000-0000-0000-0000-000000000002';
    const approverUserId = '00000000-0000-0000-0000-000000000001';

    let service: ApprovalService;
    let approvalRecordRepository: { getEntityManager: jest.Mock; findOne: jest.Mock; find: jest.Mock };
    let todoItemRepository: { find: jest.Mock };
    let contractRepository: { findOne: jest.Mock; find: jest.Mock };
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

        service = new ApprovalService(approvalRecordRepository as never, todoItemRepository as never, contractRepository as never);
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
        em.findOne.mockResolvedValueOnce(approval).mockResolvedValueOnce(contract).mockResolvedValueOnce(todo);

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

    it('rejects pending review back to draft and cancels todo', async () => {
        const approval = createApprovalRecord();
        const contract = createContract({ status: 'pending-review' });
        const todo = createTodoItem();
        em.findOne.mockResolvedValueOnce(approval).mockResolvedValueOnce(contract).mockResolvedValueOnce(todo);

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
        todoItemRepository.find.mockResolvedValue([createTodoItem({ status: 'open' }), createTodoItem({ id: '50000000-0000-4000-8000-000000000002', sourceId: '40000000-0000-4000-8000-000000000002' })]);
        approvalRecordRepository.find.mockResolvedValue([createApprovalRecord(), createApprovalRecord({ id: '40000000-0000-4000-8000-000000000002' })]);
        contractRepository.find.mockResolvedValue([createContract()]);

        const todos = await service.findOpenTodosForUser(approverUserId);

        expect(todoItemRepository.find).toHaveBeenCalledWith({ assigneeUserId: approverUserId, status: { $in: ['open', 'processing'] } }, { orderBy: { createdAt: 'ASC' } });
        expect(approvalRecordRepository.find).toHaveBeenCalledWith({
            id: { $in: [approvalRecordId, '40000000-0000-4000-8000-000000000002'] }
        });
        expect(contractRepository.find).toHaveBeenCalledWith({
            id: { $in: [contractId] }
        });
        expect(todos).toHaveLength(2);
        expect(todos[0]).toEqual(
            expect.objectContaining({
                targetTitle: 'HT-2026-001',
                currentNodeName: '合同审核',
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
});
