import { ProjectQueryService } from './project-query.service';

describe('ProjectQueryService', () => {
    let service: ProjectQueryService;
    let projectRepository: {
        findMany: jest.Mock;
        findPlatformUsersByIds: jest.Mock;
        findOrgUnitsByIds: jest.Mock;
        findLatestSignedContractAtByProjectIds: jest.Mock;
    };

    beforeEach(() => {
        projectRepository = {
            findMany: jest.fn(),
            findPlatformUsersByIds: jest.fn(),
            findOrgUnitsByIds: jest.fn(),
            findLatestSignedContractAtByProjectIds: jest.fn()
        };

        service = new ProjectQueryService(projectRepository as never);
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
});
