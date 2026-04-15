import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectHandoverCommandService } from './project-handover-command.service';

describe('ProjectHandoverCommandService', () => {
    const handoverId = '70000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const actorUserId = '00000000-0000-4000-8000-000000000099';
    const contractSummarySnapshotId = '60000000-0000-4000-8000-000000000001';
    const handoverSummarySnapshotId = '60000000-0000-4000-8000-000000000201';
    const effectiveBaselineSnapshotId = '50000000-0000-4000-8000-000000000101';
    const effectiveBaselineAfterId = '50000000-0000-4000-8000-000000000202';
    const confirmationRecordId = '40000000-0000-4000-8000-000000000101';
    const contractId = '30000000-0000-4000-8000-000000000001';
    const contractAmendmentId = '31000000-0000-4000-8000-000000000001';
    const affectedHandoverItemId = '71000000-0000-4000-8000-000000000001';
    const executionOwnerId = '00000000-0000-4000-8000-000000000011';
    const salesOwnerId = '00000000-0000-4000-8000-000000000012';

    let service: ProjectHandoverCommandService;
    let projectHandoverRepository: { findById: jest.Mock; findLatestConfirmedByProjectId: jest.Mock; save: jest.Mock };
    let projectHandoverQueryService: { getProjectHandoverDetailByHandoverId: jest.Mock };
    let contractAmendmentRepository: { findEffectiveById: jest.Mock };
    let contractService: { findById: jest.Mock };
    let contractTermSnapshotRepository: { findById: jest.Mock };
    let contractHandoverRebaselineRecordRepository: {
        findEffectiveByContractAmendmentId: jest.Mock;
        findLatestByProjectId: jest.Mock;
        create: jest.Mock;
        saveWithImpactsAndHandover: jest.Mock;
    };
    let handoverBaselineImpactItemRepository: { create: jest.Mock };
    let projectReceiptJudgmentFreezeRepository: {
        findCurrentByProjectId: jest.Mock;
        create: jest.Mock;
        saveWithHandover: jest.Mock;
    };

    beforeEach(() => {
        projectHandoverRepository = {
            findById: jest.fn(),
            findLatestConfirmedByProjectId: jest.fn(),
            save: jest.fn()
        };
        projectHandoverQueryService = {
            getProjectHandoverDetailByHandoverId: jest.fn()
        };
        contractAmendmentRepository = {
            findEffectiveById: jest.fn()
        };
        contractService = {
            findById: jest.fn()
        };
        contractTermSnapshotRepository = {
            findById: jest.fn()
        };
        contractHandoverRebaselineRecordRepository = {
            findEffectiveByContractAmendmentId: jest.fn(),
            findLatestByProjectId: jest.fn(),
            create: jest.fn(),
            saveWithImpactsAndHandover: jest.fn()
        };
        handoverBaselineImpactItemRepository = {
            create: jest.fn()
        };
        projectReceiptJudgmentFreezeRepository = {
            findCurrentByProjectId: jest.fn(),
            create: jest.fn(),
            saveWithHandover: jest.fn()
        };

        service = new ProjectHandoverCommandService(
            projectHandoverRepository as never,
            projectHandoverQueryService as never,
            contractAmendmentRepository as never,
            contractService as never,
            contractTermSnapshotRepository as never,
            contractHandoverRebaselineRecordRepository as never,
            handoverBaselineImpactItemRepository as never,
            projectReceiptJudgmentFreezeRepository as never
        );

        projectHandoverRepository.findById.mockResolvedValue(makeHandover());
        projectHandoverRepository.findLatestConfirmedByProjectId.mockResolvedValue(makeHandover({ status: 'confirmed', rowVersion: 4 }));
        projectHandoverRepository.save.mockResolvedValue(undefined);
        projectHandoverQueryService.getProjectHandoverDetailByHandoverId.mockResolvedValue(makeDetail());
        contractAmendmentRepository.findEffectiveById.mockResolvedValue(makeContractAmendment());
        contractService.findById.mockResolvedValue(makeContract());
        contractTermSnapshotRepository.findById.mockResolvedValue(makeContractTermSnapshot());
        contractHandoverRebaselineRecordRepository.findEffectiveByContractAmendmentId.mockResolvedValue(null);
        contractHandoverRebaselineRecordRepository.findLatestByProjectId.mockResolvedValue(null);
        contractHandoverRebaselineRecordRepository.create.mockImplementation((input) => ({ rowVersion: 1, ...input }));
        contractHandoverRebaselineRecordRepository.saveWithImpactsAndHandover.mockResolvedValue(undefined);
        handoverBaselineImpactItemRepository.create.mockImplementation((input) => ({ id: `impact-${input.affectedHandoverItemId}`, ...input }));
        projectReceiptJudgmentFreezeRepository.findCurrentByProjectId.mockResolvedValue(null);
        projectReceiptJudgmentFreezeRepository.create.mockImplementation((input) => ({ id: '73000000-0000-4000-8000-000000000001', ...input }));
        projectReceiptJudgmentFreezeRepository.saveWithHandover.mockResolvedValue(undefined);
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
            receiptJudgmentFreezeId: null,
            contractSummarySnapshotId,
            effectiveHandoverBaselineSnapshotId: effectiveBaselineSnapshotId,
            summarySnapshotId: handoverSummarySnapshotId,
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled'
        });
    });

    it('freezes receipt judgment mode from the project handover confirmation when provided', async () => {
        const handover = makeHandover({ handoverRebaselineRecordId: '72000000-0000-4000-8000-000000000001' });
        projectHandoverRepository.findById.mockResolvedValue(handover);

        const result = await service.confirmProjectHandover(
            handoverId,
            actorUserId,
            makeInput({ receiptJudgmentMode: 'milestone-receipt' })
        );

        expect(projectHandoverRepository.save).not.toHaveBeenCalled();
        expect(projectReceiptJudgmentFreezeRepository.findCurrentByProjectId).toHaveBeenCalledWith(projectId);
        expect(projectReceiptJudgmentFreezeRepository.create).toHaveBeenCalledWith({
            projectId,
            receiptJudgmentMode: 'milestone-receipt',
            sourceType: 'project-handover',
            sourceId: handoverId,
            sourceHandoverId: handoverId,
            sourceHandoverSummarySnapshotId: handoverSummarySnapshotId,
            sourceHandoverRebaselineRecordId: '72000000-0000-4000-8000-000000000001',
            isCurrent: true,
            frozenAt: expect.any(Date),
            frozenBy: actorUserId,
            supersedesId: null,
            createdBy: actorUserId,
            updatedBy: actorUserId
        });
        expect(projectReceiptJudgmentFreezeRepository.saveWithHandover).toHaveBeenCalledWith({
            handover,
            receiptJudgmentFreeze: expect.objectContaining({
                id: '73000000-0000-4000-8000-000000000001',
                receiptJudgmentMode: 'milestone-receipt'
            })
        });
        expect(result.receiptJudgmentFreezeId).toBe('73000000-0000-4000-8000-000000000001');
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

    it('creates an effective handover rebaseline and links it to the latest confirmed handover', async () => {
        const handover = makeHandover({ status: 'confirmed', rowVersion: 4 });
        const previousRebaseline = {
            id: '72000000-0000-4000-8000-000000000001',
            projectId,
            contractAmendmentId: '31000000-0000-4000-8000-000000000000',
            effectiveBaselineAfterId: effectiveBaselineSnapshotId,
            status: 'effective',
            handledAt: new Date('2026-04-15T00:00:00.000Z'),
            createdAt: new Date('2026-04-15T00:00:00.000Z'),
            updatedBy: null
        };
        projectHandoverRepository.findLatestConfirmedByProjectId.mockResolvedValue(handover);
        contractHandoverRebaselineRecordRepository.findLatestByProjectId.mockResolvedValue(previousRebaseline);

        const result = await service.rebaselineContractHandover(actorUserId, makeRebaselineInput());

        const saved = contractHandoverRebaselineRecordRepository.saveWithImpactsAndHandover.mock.calls[0][0];
        expect(contractAmendmentRepository.findEffectiveById).toHaveBeenCalledWith(contractAmendmentId);
        expect(contractService.findById).toHaveBeenCalledWith(contractId);
        expect(projectHandoverRepository.findLatestConfirmedByProjectId).toHaveBeenCalledWith(projectId);
        expect(contractTermSnapshotRepository.findById).toHaveBeenCalledWith(effectiveBaselineAfterId);
        expect(saved.rebaselineRecord).toMatchObject({
            contractAmendmentId,
            projectId,
            rebaselineReason: '合同变更后调整移交基线',
            effectiveBaselineAfterId,
            status: 'effective',
            handledBy: actorUserId,
            supersedesId: previousRebaseline.id,
            createdBy: actorUserId,
            updatedBy: actorUserId
        });
        expect(saved.impactItems).toEqual([
            expect.objectContaining({
                rebaselineRecordId: saved.rebaselineRecord.id,
                affectedHandoverItemId,
                impactType: 'handover-item',
                impactSummary: '合同变更后调整移交基线',
                supersedesBaselineId: effectiveBaselineSnapshotId,
                createdBy: actorUserId
            })
        ]);
        expect(saved.handover).toBe(handover);
        expect(handover.handoverRebaselineRecordId).toBe(saved.rebaselineRecord.id);
        expect(previousRebaseline.status).toBe('superseded');
        expect(previousRebaseline.updatedBy).toBe(actorUserId);
        expect(result).toEqual({
            targetId: saved.rebaselineRecord.id,
            rebaselineRecordId: saved.rebaselineRecord.id,
            effectiveBaselineAfterId,
            resultStatus: 'effective'
        });
    });

    it('throws BadRequestException when the contract amendment is not effective', async () => {
        contractAmendmentRepository.findEffectiveById.mockResolvedValue(null);

        await expect(service.rebaselineContractHandover(actorUserId, makeRebaselineInput())).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no confirmed handover exists', async () => {
        projectHandoverRepository.findLatestConfirmedByProjectId.mockResolvedValue(null);

        await expect(service.rebaselineContractHandover(actorUserId, makeRebaselineInput())).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the latest project rebaseline is still processing', async () => {
        contractHandoverRebaselineRecordRepository.findLatestByProjectId.mockResolvedValue({
            id: '72000000-0000-4000-8000-000000000002',
            status: 'processing'
        });

        await expect(service.rebaselineContractHandover(actorUserId, makeRebaselineInput())).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when effective baseline after is not an active snapshot of the amendment contract', async () => {
        contractTermSnapshotRepository.findById.mockResolvedValue(makeContractTermSnapshot({ contractId: '30000000-0000-4000-8000-000000000099' }));

        await expect(service.rebaselineContractHandover(actorUserId, makeRebaselineInput())).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when rebaseline expectedVersion does not match the latest handover', async () => {
        projectHandoverRepository.findLatestConfirmedByProjectId.mockResolvedValue(makeHandover({ status: 'confirmed', rowVersion: 5 }));

        await expect(
            service.rebaselineContractHandover(actorUserId, makeRebaselineInput({ expectedVersion: 4 }))
        ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when affected handover item IDs are duplicated', async () => {
        await expect(
            service.rebaselineContractHandover(
                actorUserId,
                makeRebaselineInput({ affectedHandoverItemIds: [affectedHandoverItemId, affectedHandoverItemId] })
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

    function makeRebaselineInput(overrides: Record<string, unknown> = {}) {
        return {
            contractAmendmentId,
            rebaselineReason: ' 合同变更后调整移交基线 ',
            affectedHandoverItemIds: [affectedHandoverItemId],
            effectiveBaselineAfterId,
            expectedVersion: 4,
            ...overrides
        };
    }

    function makeContractAmendment(overrides: Record<string, unknown> = {}) {
        return {
            id: contractAmendmentId,
            contractId,
            status: 'effective',
            isCurrent: true,
            rowVersion: 1,
            ...overrides
        };
    }

    function makeContract(overrides: Record<string, unknown> = {}) {
        return {
            id: contractId,
            projectId,
            status: 'active',
            rowVersion: 1,
            ...overrides
        };
    }

    function makeContractTermSnapshot(overrides: Record<string, unknown> = {}) {
        return {
            id: effectiveBaselineAfterId,
            contractId,
            snapshotStatus: 'active',
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
