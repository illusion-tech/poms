import { ProjectHandoverController } from './project-handover.controller';

describe('ProjectHandoverController', () => {
    const projectId = '20000000-0000-4000-8000-000000000001';
    const handoverId = '70000000-0000-4000-8000-000000000001';
    const actorUserId = '00000000-0000-4000-8000-000000000099';
    const contractSummarySnapshotId = '60000000-0000-4000-8000-000000000001';
    const amendmentId = '31000000-0000-4000-8000-000000000001';
    const effectiveBaselineAfterId = '50000000-0000-4000-8000-000000000202';

    let controller: ProjectHandoverController;
    let queryService: {
        getContractHandoverSummary: jest.Mock;
        getProjectHandoverDetailByProjectId: jest.Mock;
        getProjectHandoverDetailByHandoverId: jest.Mock;
    };
    let commandService: {
        confirmProjectHandover: jest.Mock;
        rebaselineContractHandover: jest.Mock;
    };
    const viewerRequest = {
        user: { sub: actorUserId, username: 'viewer', permissions: ['project:read'] },
        originalUrl: '/projects/20000000-0000-4000-8000-000000000001/contract-handover',
        method: 'GET'
    };

    beforeEach(() => {
        queryService = {
            getContractHandoverSummary: jest.fn(),
            getProjectHandoverDetailByProjectId: jest.fn(),
            getProjectHandoverDetailByHandoverId: jest.fn()
        };
        commandService = {
            confirmProjectHandover: jest.fn(),
            rebaselineContractHandover: jest.fn()
        };
        controller = new ProjectHandoverController(queryService as never, commandService as never);
    });

    it('delegates contract handover summary queries by project id', async () => {
        const summary = { projectId, allowedActions: ['confirm-project-handover'] };
        queryService.getContractHandoverSummary.mockResolvedValue(summary);

        await expect(controller.getContractHandoverSummary(projectId, viewerRequest as never)).resolves.toBe(summary);
        expect(queryService.getContractHandoverSummary).toHaveBeenCalledWith(
            projectId,
            viewerRequest.user,
            expect.objectContaining({ path: viewerRequest.originalUrl })
        );
    });

    it('delegates latest project handover detail queries by project id', async () => {
        const detail = { handoverId, projectId, handoverStatus: 'draft' };
        queryService.getProjectHandoverDetailByProjectId.mockResolvedValue(detail);

        await expect(controller.getProjectHandoverDetailByProject(projectId, viewerRequest as never)).resolves.toBe(detail);
        expect(queryService.getProjectHandoverDetailByProjectId).toHaveBeenCalledWith(
            projectId,
            viewerRequest.user,
            expect.objectContaining({ path: viewerRequest.originalUrl })
        );
    });

    it('delegates project handover detail queries by handover id', async () => {
        const detail = { handoverId, projectId, handoverStatus: 'draft' };
        queryService.getProjectHandoverDetailByHandoverId.mockResolvedValue(detail);

        await expect(controller.getProjectHandoverDetailByHandover(handoverId, viewerRequest as never)).resolves.toBe(detail);
        expect(queryService.getProjectHandoverDetailByHandoverId).toHaveBeenCalledWith(
            handoverId,
            viewerRequest.user,
            expect.objectContaining({ path: viewerRequest.originalUrl })
        );
    });

    it('passes actor id and request body to confirmProjectHandover', async () => {
        const body = {
            comment: '确认移交',
            participantConfirmations: [
                {
                    participantId: actorUserId,
                    participantRoleKey: 'execution-owner',
                    participantStatus: 'confirmed'
                }
            ],
            receiptJudgmentMode: 'milestone-receipt',
            contractSummarySnapshotId,
            expectedVersion: 1
        };
        const result = {
            targetId: handoverId,
            businessStatusAfter: 'confirmed',
            receiptJudgmentFreezeId: '73000000-0000-4000-8000-000000000001'
        };
        commandService.confirmProjectHandover.mockResolvedValue(result);

        await expect(
            controller.confirmProjectHandover(handoverId, { user: { sub: actorUserId } } as never, body as never)
        ).resolves.toBe(result);
        expect(commandService.confirmProjectHandover).toHaveBeenCalledWith(handoverId, actorUserId, body);
    });

    it('passes actor id and body to rebaselineContractHandover', async () => {
        const body = {
            contractAmendmentId: amendmentId,
            rebaselineReason: '合同变更影响移交基线',
            affectedHandoverItemIds: ['71000000-0000-4000-8000-000000000001'],
            effectiveBaselineAfterId,
            expectedVersion: 2
        };
        const result = {
            targetId: '72000000-0000-4000-8000-000000000001',
            rebaselineRecordId: '72000000-0000-4000-8000-000000000001',
            effectiveBaselineAfterId,
            resultStatus: 'effective'
        };
        commandService.rebaselineContractHandover.mockResolvedValue(result);

        await expect(
            controller.rebaselineContractHandover({ user: { sub: actorUserId } } as never, body as never)
        ).resolves.toBe(result);
        expect(commandService.rebaselineContractHandover).toHaveBeenCalledWith(actorUserId, body);
    });
});
