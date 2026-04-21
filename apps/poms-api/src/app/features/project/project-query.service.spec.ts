import { ProjectQueryService } from './project-query.service';

describe('ProjectQueryService', () => {
    let service: ProjectQueryService;
    let projectRepository: {
        findById: jest.Mock;
        findMany: jest.Mock;
        findPlatformUsersByIds: jest.Mock;
        findOrgUnitsByIds: jest.Mock;
        findLatestSignedContractAtByProjectIds: jest.Mock;
        findContractsByProjectId: jest.Mock;
    };
    let approvalSummarySnapshotRepository: { findActiveByTarget: jest.Mock };

    beforeEach(() => {
        projectRepository = {
            findById: jest.fn(),
            findMany: jest.fn(),
            findPlatformUsersByIds: jest.fn(),
            findOrgUnitsByIds: jest.fn(),
            findLatestSignedContractAtByProjectIds: jest.fn(),
            findContractsByProjectId: jest.fn()
        };
        approvalSummarySnapshotRepository = { findActiveByTarget: jest.fn() };

        service = new ProjectQueryService(projectRepository as never, approvalSummarySnapshotRepository as never);
    });

    it('builds project list views with business names and latest milestone time', async () => {
        projectRepository.findMany.mockResolvedValue([
            {
                id: '20000000-0000-4000-8000-000000000001',
                projectCode: 'PRJ-2026-001',
                projectName: 'POMS 首期项目主链路样例',
                customerName: '华南地铁集团',
                currentStage: 'contracting',
                status: 'active',
                ownerOrgId: '10000000-0000-4000-8000-000000000001',
                ownerUserId: '00000000-0000-4000-8000-000000000001',
                closedAt: null,
                createdAt: new Date('2026-04-01T00:00:00.000Z')
            }
        ]);
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }
        ]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([
            { id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }
        ]);
        projectRepository.findLatestSignedContractAtByProjectIds.mockResolvedValue(
            new Map([['20000000-0000-4000-8000-000000000001', new Date('2026-04-18T08:00:00.000Z')]])
        );

        await expect(service.listProjects({ keyword: 'POMS' })).resolves.toEqual([
            {
                id: '20000000-0000-4000-8000-000000000001',
                projectCode: 'PRJ-2026-001',
                projectName: 'POMS 首期项目主链路样例',
                customerName: '华南地铁集团',
                currentStage: 'contracting',
                status: 'active',
                ownerOrgName: '华南销售一部',
                ownerName: '销售人员',
                latestMilestoneAt: '2026-04-18T08:00:00.000Z',
                createdAt: '2026-04-01T00:00:00.000Z'
            }
        ]);
    });

    it('builds project detail view with owner, contract summary, snapshot metadata and allowed actions', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000001',
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            customerId: null,
            customerName: '华南地铁集团',
            currentStage: 'execution',
            status: 'active',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            ownerUserId: '00000000-0000-4000-8000-000000000001',
            plannedSignAt: new Date('2026-04-20T00:00:00.000Z'),
            closedAt: null,
            closedReason: null,
            rowVersion: 2,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: '00000000-0000-4000-8000-000000000001',
            updatedAt: new Date('2026-04-18T08:00:00.000Z'),
            updatedBy: '00000000-0000-4000-8000-000000000002'
        });
        projectRepository.findPlatformUsersByIds.mockResolvedValue([
            { id: '00000000-0000-4000-8000-000000000001', displayName: '销售人员' }
        ]);
        projectRepository.findOrgUnitsByIds.mockResolvedValue([
            { id: '10000000-0000-4000-8000-000000000001', name: '华南销售一部' }
        ]);
        projectRepository.findContractsByProjectId.mockResolvedValue([
            {
                id: '30000000-0000-4000-8000-000000000001',
                contractNo: 'CT-2026-001',
                status: 'active',
                signedAmount: '12345.67',
                currencyCode: 'CNY',
                signedAt: new Date('2026-04-18T08:00:00.000Z'),
                currentSnapshotId: '31000000-0000-4000-8000-000000000001'
            }
        ]);
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue({
            id: '37000000-0000-4000-8000-000000000001',
            summaryPackageKey: 'project-detail',
            projectionLevel: 'project-detail',
            exportPolicy: 'controlled',
            generatedAt: new Date('2026-04-18T09:00:00.000Z')
        });

        const result = await service.getProjectDetail('20000000-0000-4000-8000-000000000001', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'sales_rep',
            permissions: ['project:read', 'project:write', 'commission:payouts:manage']
        });

        expect(approvalSummarySnapshotRepository.findActiveByTarget).toHaveBeenCalledWith(
            'Project',
            '20000000-0000-4000-8000-000000000001',
            'project-detail',
            'project-detail'
        );
        expect(result.ownerName).toBe('销售人员');
        expect(result.ownerOrgName).toBe('华南销售一部');
        expect(result.currentContractSummary).toEqual({
            activeContractCount: 1,
            latestContractId: '30000000-0000-4000-8000-000000000001',
            latestContractNo: 'CT-2026-001',
            latestContractStatus: 'active',
            signedAmount: '12345.67',
            currencyCode: 'CNY',
            signedAt: '2026-04-18T08:00:00.000Z',
            currentSnapshotId: '31000000-0000-4000-8000-000000000001'
        });
        expect(result.currentApprovalSummary).toEqual({
            summarySnapshotId: '37000000-0000-4000-8000-000000000001',
            summaryPackageKey: 'project-detail',
            projectionLevel: 'project-detail',
            exportPolicy: 'controlled',
            generatedAt: '2026-04-18T09:00:00.000Z'
        });
        expect(result.currentConfirmationSummary).toEqual({
            confirmationRecordId: null,
            status: 'not_configured',
            requiredCount: 0,
            confirmedCount: 0,
            pendingCount: 0,
            confirmedAt: null
        });
        expect(result.summarySnapshotId).toBe('37000000-0000-4000-8000-000000000001');
        expect(result.allowedActions).toEqual(['view-project-workspace', 'edit-project-basic-info', 'manage-project-commission']);
    });

    it('keeps write and commission actions hidden for closed read-only project detail', async () => {
        projectRepository.findById.mockResolvedValue({
            id: '20000000-0000-4000-8000-000000000002',
            projectCode: 'PRJ-2026-002',
            projectName: '已关闭项目',
            customerId: null,
            customerName: '华南地铁集团',
            currentStage: 'closed-terminated',
            status: 'closed',
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            closedAt: new Date('2026-04-20T00:00:00.000Z'),
            closedReason: '客户终止',
            rowVersion: 3,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-04-20T00:00:00.000Z'),
            updatedBy: null
        });
        projectRepository.findContractsByProjectId.mockResolvedValue([]);
        approvalSummarySnapshotRepository.findActiveByTarget.mockResolvedValue(null);

        const result = await service.getProjectDetail('20000000-0000-4000-8000-000000000002', {
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'viewer',
            permissions: ['project:read']
        });

        expect(result.allowedActions).toEqual(['view-project-workspace']);
        expect(result.stageSummary.blockingReasons).toEqual(['project-closed']);
        expect(result.currentContractSummary.activeContractCount).toBe(0);
        expect(result.currentApprovalSummary).toEqual({
            summarySnapshotId: null,
            summaryPackageKey: null,
            projectionLevel: null,
            exportPolicy: null,
            generatedAt: null
        });
        expect(result.currentConfirmationSummary.status).toBe('not_configured');
        expect(result.summarySnapshotId).toBeNull();
    });
});
