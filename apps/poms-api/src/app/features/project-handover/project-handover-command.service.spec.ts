import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectHandoverCommandService } from './project-handover-command.service';

describe('ProjectHandoverCommandService', () => {
    const handoverId = '70000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const actorUserId = '00000000-0000-4000-8000-000000000099';
    const contractSummarySnapshotId = '60000000-0000-4000-8000-000000000001';
    const handoverSummarySnapshotId = '60000000-0000-4000-8000-000000000201';
    const effectiveBaselineSnapshotId = '50000000-0000-4000-8000-000000000101';
    const confirmationRecordId = '40000000-0000-4000-8000-000000000101';
    const executionOwnerId = '00000000-0000-4000-8000-000000000011';
    const salesOwnerId = '00000000-0000-4000-8000-000000000012';

    let service: ProjectHandoverCommandService;
    let projectHandoverRepository: { findById: jest.Mock; save: jest.Mock };
    let projectHandoverQueryService: { getProjectHandoverDetailByHandoverId: jest.Mock };

    beforeEach(() => {
        projectHandoverRepository = {
            findById: jest.fn(),
            save: jest.fn()
        };
        projectHandoverQueryService = {
            getProjectHandoverDetailByHandoverId: jest.fn()
        };

        service = new ProjectHandoverCommandService(
            projectHandoverRepository as never,
            projectHandoverQueryService as never
        );

        projectHandoverRepository.findById.mockResolvedValue(makeHandover());
        projectHandoverRepository.save.mockResolvedValue(undefined);
        projectHandoverQueryService.getProjectHandoverDetailByHandoverId.mockResolvedValue(makeDetail());
    });

    it('confirms a draft handover when guard chains are ready', async () => {
        const handover = makeHandover();
        projectHandoverRepository.findById.mockResolvedValue(handover);

        const result = await service.confirmProjectHandover(handoverId, actorUserId, makeInput());

        expect(projectHandoverQueryService.getProjectHandoverDetailByHandoverId).toHaveBeenCalledWith(handoverId);
        expect(projectHandoverRepository.save).toHaveBeenCalledWith(handover);
        expect(handover.status).toBe('confirmed');
        expect(handover.confirmedAt).toBeInstanceOf(Date);
        expect(handover.confirmedBy).toBe(actorUserId);
        expect(handover.comment).toBe('同意移交');
        expect(handover.updatedBy).toBe(actorUserId);
        expect(result).toEqual({
            targetId: handoverId,
            businessStatusAfter: 'confirmed',
            confirmationRecordId,
            contractSummarySnapshotId,
            effectiveHandoverBaselineSnapshotId: effectiveBaselineSnapshotId,
            summarySnapshotId: handoverSummarySnapshotId,
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled'
        });
    });

    it('throws NotFoundException when the handover does not exist', async () => {
        projectHandoverRepository.findById.mockResolvedValue(null);

        await expect(service.confirmProjectHandover(handoverId, actorUserId, makeInput())).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when expectedVersion does not match rowVersion', async () => {
        projectHandoverRepository.findById.mockResolvedValue(makeHandover({ rowVersion: 3 }));

        await expect(
            service.confirmProjectHandover(handoverId, actorUserId, makeInput({ expectedVersion: 2 }))
        ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when the requested contract summary snapshot is stale', async () => {
        await expect(
            service.confirmProjectHandover(
                handoverId,
                actorUserId,
                makeInput({ contractSummarySnapshotId: '60000000-0000-4000-8000-000000000099' })
            )
        ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the detail guard reports blockers', async () => {
        projectHandoverQueryService.getProjectHandoverDetailByHandoverId.mockResolvedValue(
            makeDetail({
                allowedActions: [],
                blockingReasons: ['No active contract is available for project handover']
            })
        );

        await expect(service.confirmProjectHandover(handoverId, actorUserId, makeInput())).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the execution owner has not confirmed', async () => {
        projectHandoverQueryService.getProjectHandoverDetailByHandoverId.mockResolvedValue(
            makeDetail({
                participantConfirmationSummary: {
                    ...makeDetail().participantConfirmationSummary,
                    participants: [
                        {
                            participantId: salesOwnerId,
                            participantRoleKey: 'sales-owner',
                            participantDisplayName: '销售负责人',
                            participantStatus: 'confirmed',
                            confirmedAt: '2026-04-15T00:10:00.000Z',
                            confirmedComment: '已确认'
                        }
                    ]
                }
            })
        );

        await expect(
            service.confirmProjectHandover(
                handoverId,
                actorUserId,
                makeInput({
                    participantConfirmations: [
                        {
                            participantId: salesOwnerId,
                            participantRoleKey: 'sales-owner',
                            participantStatus: 'confirmed'
                        }
                    ]
                })
            )
        ).rejects.toThrow(BadRequestException);
    });

    function makeInput(overrides: Record<string, unknown> = {}) {
        return {
            comment: ' 同意移交 ',
            participantConfirmations: [
                {
                    participantId: executionOwnerId,
                    participantRoleKey: 'execution-owner',
                    participantStatus: 'confirmed'
                },
                {
                    participantId: salesOwnerId,
                    participantRoleKey: 'sales-owner',
                    participantStatus: 'confirmed'
                }
            ],
            contractSummarySnapshotId,
            expectedVersion: 2,
            ...overrides
        };
    }

    function makeHandover(overrides: Record<string, unknown> = {}) {
        return {
            id: handoverId,
            projectId,
            contractSummarySnapshotId,
            effectiveHandoverBaselineSnapshotId: effectiveBaselineSnapshotId,
            summarySnapshotId: handoverSummarySnapshotId,
            handoverRebaselineRecordId: null,
            status: 'draft',
            confirmedAt: null,
            confirmedBy: null,
            comment: null,
            updatedBy: null,
            rowVersion: 2,
            ...overrides
        };
    }

    function makeDetail(overrides: Record<string, unknown> = {}) {
        return {
            handoverId,
            projectId,
            projectCode: 'P-001',
            projectName: '项目一',
            handoverStatus: 'draft',
            confirmedAt: null,
            confirmedBy: null,
            comment: null,
            rowVersion: 2,
            effectiveContractSetSummary: {
                activeContractCount: 1,
                activeContractIds: ['30000000-0000-4000-8000-000000000001'],
                contractNos: ['C-001'],
                totalSignedAmount: '12345.67',
                currencyCodes: ['CNY'],
                earliestSignedAt: '2026-01-02T00:00:00.000Z',
                latestSignedAt: '2026-01-02T00:00:00.000Z',
                contracts: []
            },
            contractSummarySnapshotId,
            currentHandoverBaselineSummary: {
                status: 'available',
                baselineSnapshotId: effectiveBaselineSnapshotId,
                sourceType: 'project-handover',
                sourceId: handoverId,
                summary: 'Current handover baseline comes from the latest project handover record'
            },
            participantConfirmationSummary: {
                status: 'confirmed',
                confirmationRecordId,
                requiredCount: 2,
                confirmedCount: 2,
                pendingCount: 0,
                closedCount: 0,
                submittedAt: '2026-04-15T00:00:00.000Z',
                confirmedAt: '2026-04-15T00:10:00.000Z',
                closedAt: null,
                rowVersion: 2,
                participants: [
                    {
                        participantId: executionOwnerId,
                        participantRoleKey: 'execution-owner',
                        participantDisplayName: '执行负责人',
                        participantStatus: 'confirmed',
                        confirmedAt: '2026-04-15T00:10:00.000Z',
                        confirmedComment: '已确认'
                    },
                    {
                        participantId: salesOwnerId,
                        participantRoleKey: 'sales-owner',
                        participantDisplayName: '销售负责人',
                        participantStatus: 'confirmed',
                        confirmedAt: '2026-04-15T00:10:00.000Z',
                        confirmedComment: '已确认'
                    }
                ]
            },
            receiptJudgmentModeSummary: {
                status: 'not_frozen',
                receiptJudgmentMode: null,
                sourceType: 'none',
                sourceId: null,
                summary: 'Receipt judgment mode is frozen by confirmProjectHandover or the downstream receipt judgment freeze chain'
            },
            summaryPackageKey: 'project-handover-confirmation',
            summarySnapshotId: handoverSummarySnapshotId,
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            allowedActions: ['confirm-project-handover'],
            blockingReasons: [],
            generatedAt: '2026-04-15T00:15:00.000Z',
            ...overrides
        };
    }
});
