import { NotFoundException } from '@nestjs/common';
import { ProjectHandoverQueryService } from './project-handover-query.service';

describe('ProjectHandoverQueryService', () => {
    const projectId = '20000000-0000-4000-8000-000000000001';
    const contractId = '30000000-0000-4000-8000-000000000001';
    const readinessId = '50000000-0000-4000-8000-000000000001';
    const snapshotId = '60000000-0000-4000-8000-000000000001';
    const handoverId = '70000000-0000-4000-8000-000000000001';
    const rebaselineId = '80000000-0000-4000-8000-000000000001';

    let service: ProjectHandoverQueryService;
    let projectService: { findById: jest.Mock };
    let contractService: { findMany: jest.Mock };
    let contractReadinessService: { findCurrentContractReadinessByProjectId: jest.Mock };
    let confirmationService: { findLatestConfirmationProgressByTarget: jest.Mock };
    let approvalSummarySnapshotRepository: { findActiveByTarget: jest.Mock; findById: jest.Mock };
    let projectHandoverRepository: { findById: jest.Mock; findByProjectId: jest.Mock };
    let contractHandoverRebaselineRecordRepository: { findById: jest.Mock; findLatestByProjectId: jest.Mock };
    let handoverBaselineImpactItemRepository: { findByRebaselineRecordId: jest.Mock };
    let projectReceiptJudgmentFreezeRepository: { findCurrentByProjectId: jest.Mock };

    beforeEach(() => {
        projectService = { findById: jest.fn() };
        contractService = { findMany: jest.fn() };
        contractReadinessService = { findCurrentContractReadinessByProjectId: jest.fn() };
        confirmationService = { findLatestConfirmationProgressByTarget: jest.fn() };
        approvalSummarySnapshotRepository = { findActiveByTarget: jest.fn(), findById: jest.fn() };
        projectHandoverRepository = { findById: jest.fn(), findByProjectId: jest.fn() };
        contractHandoverRebaselineRecordRepository = { findById: jest.fn(), findLatestByProjectId: jest.fn() };
        handoverBaselineImpactItemRepository = { findByRebaselineRecordId: jest.fn() };
        projectReceiptJudgmentFreezeRepository = { findCurrentByProjectId: jest.fn() };

        service = new ProjectHandoverQueryService(
            projectService as never,
            contractService as never,
            contractReadinessService as never,
            confirmationService as never,
            approvalSummarySnapshotRepository as never,
            projectHandoverRepository as never,
            contractHandoverRebaselineRecordRepository as never,
            handoverBaselineImpactItemRepository as never,
            projectReceiptJudgmentFreezeRepository as never
        );

        projectService.findById.mockResolvedValue(makeProject());
        contractService.findMany.mockResolvedValue([makeContract()]);
        contractReadinessService.findCurrentContractReadinessByProjectId.mockResolvedValue(makeReadiness());
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue(makeSnapshot());
        approvalSummarySnapshotRepository.findById.mockResolvedValue(makeHandoverSummarySnapshot());
        projectHandoverRepository.findByProjectId.mockResolvedValue([]);
        contractHandoverRebaselineRecordRepository.findById.mockResolvedValue(null);
        contractHandoverRebaselineRecordRepository.findLatestByProjectId.mockResolvedValue(null);
        handoverBaselineImpactItemRepository.findByRebaselineRecordId.mockResolvedValue([]);
        projectReceiptJudgmentFreezeRepository.findCurrentByProjectId.mockResolvedValue(null);
        confirmationService.findLatestConfirmationProgressByTarget.mockResolvedValue(makeConfirmationProgress());
    });

    it('returns a ready contract handover summary view for an initialized project', async () => {
        const result = await service.getContractHandoverSummary(projectId);

        expect(contractService.findMany).toHaveBeenCalledWith({ projectId, status: 'active' });
        expect(approvalSummarySnapshotRepository.findActiveByTarget).toHaveBeenCalledWith(
            'Project',
            projectId,
            'handover-confirmation',
            'handover-confirmation'
        );
        expect(result.projectId).toBe(projectId);
        expect(result.effectiveContractSetSummary.activeContractCount).toBe(1);
        expect(result.effectiveContractSetSummary.totalSignedAmount).toBe('12345.67');
        expect(result.contractBaselineValidationSummary.status).toBe('ready');
        expect(result.currentHandoverBaselineSummary.baselineSnapshotId).toBe('50000000-0000-4000-8000-000000000101');
        expect(result.receivablePlanInitSummary.status).toBe('initialized');
        expect(result.contractSummarySnapshotId).toBe(snapshotId);
        expect(result.allowedActions).toEqual(['confirm-project-handover']);
        expect(result.blockingReasons).toEqual([]);
    });

    it('keeps the query read-only when the contract summary snapshot has not been generated', async () => {
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue(null);

        const result = await service.getContractHandoverSummary(projectId);

        expect(result.contractSummarySnapshotId).toBeNull();
        expect(result.allowedActions).toEqual(['generate-contract-handover-summary-snapshot']);
        expect(result.blockingReasons).toContain('Contract handover summary snapshot is not generated');
    });

    it('throws when the project does not exist', async () => {
        projectService.findById.mockResolvedValue(null);

        await expect(service.getContractHandoverSummary(projectId)).rejects.toThrow(NotFoundException);
    });

    it('reports a linked pending rebaseline record as a handover blocker', async () => {
        projectHandoverRepository.findByProjectId.mockResolvedValue([
            {
                id: handoverId,
                handoverRebaselineRecordId: rebaselineId,
                effectiveHandoverBaselineSnapshotId: '50000000-0000-4000-8000-000000000101'
            }
        ]);
        contractHandoverRebaselineRecordRepository.findById.mockResolvedValue({
            id: rebaselineId,
            status: 'processing',
            effectiveBaselineAfterId: '50000000-0000-4000-8000-000000000202',
            handledAt: new Date('2026-04-15T01:00:00.000Z')
        });
        handoverBaselineImpactItemRepository.findByRebaselineRecordId.mockResolvedValue([
            { impactType: 'scope', impactSummary: '范围快照待更新' }
        ]);

        const result = await service.getContractHandoverSummary(projectId);

        expect(result.latestHandoverRebaselineSummary.status).toBe('processing');
        expect(result.latestHandoverRebaselineSummary.blockingStatus).toBe('blocking');
        expect(result.latestHandoverRebaselineSummary.impactItemCount).toBe(1);
        expect(result.allowedActions).toEqual([]);
        expect(result.blockingReasons).toContain(`Handover rebaseline record ${rebaselineId} is still processing`);
    });

    it('returns the latest project handover detail with summary and participant confirmation chains', async () => {
        projectHandoverRepository.findByProjectId.mockResolvedValue([makeHandover()]);

        const result = await service.getProjectHandoverDetailByProjectId(projectId);

        expect(approvalSummarySnapshotRepository.findById).toHaveBeenCalledWith('60000000-0000-4000-8000-000000000201');
        expect(confirmationService.findLatestConfirmationProgressByTarget).toHaveBeenCalledWith(
            'ProjectHandover',
            handoverId,
            'project-handover'
        );
        expect(result.handoverId).toBe(handoverId);
        expect(result.handoverStatus).toBe('draft');
        expect(result.contractSummarySnapshotId).toBe(snapshotId);
        expect(result.summarySnapshotId).toBe('60000000-0000-4000-8000-000000000201');
        expect(result.summaryPackageKey).toBe('project-handover-confirmation');
        expect(result.participantConfirmationSummary.status).toBe('confirmed');
        expect(result.receiptJudgmentModeSummary.status).toBe('not_frozen');
        expect(result.allowedActions).toEqual(['confirm-project-handover']);
        expect(result.blockingReasons).toEqual([]);
    });

    it('returns frozen receipt judgment mode from the current project freeze record', async () => {
        projectHandoverRepository.findByProjectId.mockResolvedValue([makeHandover()]);
        projectReceiptJudgmentFreezeRepository.findCurrentByProjectId.mockResolvedValue({
            id: '73000000-0000-4000-8000-000000000001',
            projectId,
            receiptJudgmentMode: 'milestone-receipt',
            sourceType: 'project-handover',
            sourceId: handoverId
        });

        const result = await service.getProjectHandoverDetailByProjectId(projectId);

        expect(result.receiptJudgmentModeSummary).toEqual({
            status: 'frozen',
            receiptJudgmentMode: 'milestone-receipt',
            sourceType: 'project-handover',
            sourceId: handoverId,
            summary: `Receipt judgment mode is frozen from project-handover ${handoverId}`
        });
    });

    it('returns a controlled project handover placeholder when no handover record exists', async () => {
        const result = await service.getProjectHandoverDetailByProjectId(projectId);

        expect(result.handoverId).toBeNull();
        expect(result.handoverStatus).toBe('not_started');
        expect(result.participantConfirmationSummary.status).toBe('not_started');
        expect(result.summarySnapshotId).toBeNull();
        expect(result.allowedActions).toEqual(['prepare-project-handover']);
        expect(result.blockingReasons).toContain('Project handover record is not prepared');
    });

    it('throws when the requested handover does not exist', async () => {
        projectHandoverRepository.findById.mockResolvedValue(null);

        await expect(service.getProjectHandoverDetailByHandoverId(handoverId)).rejects.toThrow(NotFoundException);
    });

    function makeProject() {
        return {
            id: projectId,
            projectNo: 'P-001',
            projectName: '项目一'
        };
    }

    function makeContract() {
        return {
            id: contractId,
            projectId,
            contractNo: 'C-001',
            status: 'active',
            signedAmount: '12345.67',
            currencyCode: 'CNY',
            currentSnapshotId: '30000000-0000-4000-8000-000000000101',
            signedAt: new Date('2026-01-02T00:00:00.000Z')
        };
    }

    function makeReadiness() {
        return {
            id: readinessId,
            projectId,
            sourceBaselineId: '50000000-0000-4000-8000-000000000011',
            commercialReleaseBaselineId: '50000000-0000-4000-8000-000000000011',
            latestDiffResultId: '50000000-0000-4000-8000-000000000012',
            diffLevel: 'prompt',
            reviewStatus: 'not-required',
            packageStatus: 'ready',
            guardDecision: 'allowed',
            currentEffectiveDecisionSummary: '已放行',
            blockingReasonSummary: null,
            missingPrerequisiteCount: 0,
            initializedContractSnapshotId: '50000000-0000-4000-8000-000000000101',
            initializedReceivablePlanVersionId: '50000000-0000-4000-8000-000000000102',
            contractSnapshotInitializedAt: '2026-04-14T00:00:00.000Z',
            receivablePlanInitializedAt: '2026-04-14T00:05:00.000Z',
            isCurrent: true,
            rowVersion: 1,
            createdAt: '2026-04-14T00:00:00.000Z',
            createdBy: null,
            updatedAt: '2026-04-14T00:00:00.000Z',
            updatedBy: null,
            allowedActions: [],
            items: []
        };
    }

    function makeSnapshot() {
        return {
            id: snapshotId,
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled'
        };
    }

    function makeHandoverSummarySnapshot() {
        return {
            id: '60000000-0000-4000-8000-000000000201',
            summaryPackageKey: 'project-handover-confirmation',
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled'
        };
    }

    function makeHandover() {
        return {
            id: handoverId,
            projectId,
            contractSummarySnapshotId: snapshotId,
            effectiveHandoverBaselineSnapshotId: '50000000-0000-4000-8000-000000000101',
            summarySnapshotId: '60000000-0000-4000-8000-000000000201',
            handoverRebaselineRecordId: null,
            status: 'draft',
            confirmedAt: null,
            confirmedBy: null,
            comment: null,
            rowVersion: 1
        };
    }

    function makeConfirmationProgress() {
        return {
            id: '40000000-0000-4000-8000-000000000101',
            confirmationType: 'project-handover',
            businessDomain: 'project-handover',
            targetType: 'ProjectHandover',
            targetId: handoverId,
            projectId,
            status: 'confirmed',
            requiredCount: 1,
            confirmedCount: 1,
            submittedAt: '2026-04-15T00:00:00.000Z',
            confirmedAt: '2026-04-15T00:10:00.000Z',
            closedAt: null,
            rowVersion: 2,
            participants: [
                {
                    participantId: '00000000-0000-4000-8000-000000000011',
                    participantRoleKey: 'sales-owner',
                    participantDisplayName: '销售负责人',
                    participantStatus: 'confirmed',
                    confirmedAt: '2026-04-15T00:10:00.000Z',
                    confirmedComment: '已确认'
                }
            ]
        };
    }
});
