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
    let approvalSummarySnapshotRepository: { findActiveByTarget: jest.Mock };
    let projectHandoverRepository: { findByProjectId: jest.Mock };
    let contractHandoverRebaselineRecordRepository: { findById: jest.Mock };
    let handoverBaselineImpactItemRepository: { findByRebaselineRecordId: jest.Mock };

    beforeEach(() => {
        projectService = { findById: jest.fn() };
        contractService = { findMany: jest.fn() };
        contractReadinessService = { findCurrentContractReadinessByProjectId: jest.fn() };
        approvalSummarySnapshotRepository = { findActiveByTarget: jest.fn() };
        projectHandoverRepository = { findByProjectId: jest.fn() };
        contractHandoverRebaselineRecordRepository = { findById: jest.fn() };
        handoverBaselineImpactItemRepository = { findByRebaselineRecordId: jest.fn() };

        service = new ProjectHandoverQueryService(
            projectService as never,
            contractService as never,
            contractReadinessService as never,
            approvalSummarySnapshotRepository as never,
            projectHandoverRepository as never,
            contractHandoverRebaselineRecordRepository as never,
            handoverBaselineImpactItemRepository as never
        );

        projectService.findById.mockResolvedValue(makeProject());
        contractService.findMany.mockResolvedValue([makeContract()]);
        contractReadinessService.findCurrentContractReadinessByProjectId.mockResolvedValue(makeReadiness());
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue(makeSnapshot());
        projectHandoverRepository.findByProjectId.mockResolvedValue([]);
        contractHandoverRebaselineRecordRepository.findById.mockResolvedValue(null);
        handoverBaselineImpactItemRepository.findByRebaselineRecordId.mockResolvedValue([]);
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

    function makeProject() {
        return {
            id: projectId,
            projectCode: 'P-001',
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
});
