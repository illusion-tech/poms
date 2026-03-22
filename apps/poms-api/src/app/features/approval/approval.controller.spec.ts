import { NotFoundException } from '@nestjs/common';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';

describe('ApprovalController', () => {
    const approvalRecordId = '40000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000001';

    let controller: ApprovalController;
    let approvalService: jest.Mocked<ApprovalService>;

    beforeEach(() => {
        approvalService = {
            findApprovalRecordById: jest.fn(),
            approveRecord: jest.fn(),
            rejectRecord: jest.fn(),
            findOpenTodosForUser: jest.fn(),
            submitContractReview: jest.fn()
        } as unknown as jest.Mocked<ApprovalService>;

        controller = new ApprovalController(approvalService);
    });

    it('passes current user to approve command', async () => {
        approvalService.approveRecord.mockResolvedValue({
            targetId: '30000000-0000-0000-0000-000000000001',
            targetType: 'Contract',
            resultStatus: 'approved',
            businessStatusAfter: 'pending-review',
            approvalRecordId,
            confirmationRecordId: null,
            todoItemIds: ['50000000-0000-0000-0000-000000000001'],
            snapshotId: null
        });

        await controller.approveRecord(
            approvalRecordId,
            { user: { sub: userId, username: 'admin', permissions: ['project:write'] } },
            { comment: '通过' }
        );

        expect(approvalService.approveRecord).toHaveBeenCalledWith(approvalRecordId, userId, {
            comment: '通过'
        });
    });

    it('passes current user to reject command', async () => {
        approvalService.rejectRecord.mockResolvedValue({
            targetId: '30000000-0000-0000-0000-000000000001',
            targetType: 'Contract',
            resultStatus: 'rejected',
            businessStatusAfter: 'draft',
            approvalRecordId,
            confirmationRecordId: null,
            todoItemIds: ['50000000-0000-0000-0000-000000000001'],
            snapshotId: null
        });

        await controller.rejectRecord(
            approvalRecordId,
            { user: { sub: userId, username: 'admin', permissions: ['project:write'] } },
            { reason: '资料不全' }
        );

        expect(approvalService.rejectRecord).toHaveBeenCalledWith(approvalRecordId, userId, {
            reason: '资料不全'
        });
    });

    it('returns current user todo list', async () => {
        approvalService.findOpenTodosForUser.mockResolvedValue([]);

        await controller.getMyTodos({
            user: { sub: userId, username: 'admin', permissions: ['project:read'] }
        });

        expect(approvalService.findOpenTodosForUser).toHaveBeenCalledWith(userId);
    });

    it('throws when approval record detail is missing', async () => {
        approvalService.findApprovalRecordById.mockResolvedValue(null);

        await expect(controller.getApprovalRecord(approvalRecordId)).rejects.toThrow(NotFoundException);
    });
});
