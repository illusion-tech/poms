import { NotFoundException } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { Project } from './project.entity';
import { ProjectQueryService } from './project-query.service';
import { ProjectService } from './project.service';

describe('ProjectController', () => {
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000001';
    const baseDate = new Date('2026-03-22T10:00:00.000Z');

    let controller: ProjectController;
    let projectQueryService: jest.Mocked<ProjectQueryService>;
    let projectService: jest.Mocked<ProjectService>;

    beforeEach(() => {
        projectQueryService = {
            listProjects: jest.fn(),
            getProjectDetail: jest.fn(),
            getProjectWorkspaceGuidance: jest.fn(),
            getProjectTimeline: jest.fn(),
            listAcceptanceRecords: jest.fn()
        } as unknown as jest.Mocked<ProjectQueryService>;

        projectService = {
            findMany: jest.fn(),
            findByCode: jest.fn(),
            findById: jest.fn(),
            createAndSave: jest.fn(),
            createAcceptanceRecord: jest.fn(),
            updateBasicInfo: jest.fn(),
            findAll: jest.fn()
        } as unknown as jest.Mocked<ProjectService>;

        controller = new ProjectController(projectQueryService, projectService);
    });

    it('maps create payload plannedSignAt into Date and injects operator id', async () => {
        const plannedSignAt = '2026-04-15T00:00:00.000Z';
        projectService.createAndSave.mockResolvedValue(
            createProjectEntity({
                plannedSignAt: new Date(plannedSignAt)
            })
        );

        await controller.create(
            {
                projectCode: 'PRJ-2026-001',
                projectName: 'POMS 首期项目主链路样例',
                customerName: '华南地铁集团',
                currentStage: 'commercial-closure',
                plannedSignAt
            },
            { user: { sub: userId } } as never
        );

        expect(projectService.createAndSave).toHaveBeenCalledWith(
            expect.objectContaining({
                customerName: '华南地铁集团',
                plannedSignAt: new Date(plannedSignAt)
            }),
            userId
        );
    });

    it('maps update payload null plannedSignAt into null', async () => {
        projectService.updateBasicInfo.mockResolvedValue(
            createProjectEntity({
                plannedSignAt: null
            })
        );

        await controller.updateBasicInfo(projectId, {
            plannedSignAt: null
        }, { user: { sub: userId } } as never);

        expect(projectService.updateBasicInfo).toHaveBeenCalledWith(
            projectId,
            expect.objectContaining({
                plannedSignAt: null
            }),
            userId
        );
    });

    it('leaves update payload plannedSignAt undefined when not provided', async () => {
        projectService.updateBasicInfo.mockResolvedValue(createProjectEntity());

        await controller.updateBasicInfo(projectId, {}, { user: { sub: userId } } as never);

        expect(projectService.updateBasicInfo).toHaveBeenCalledWith(
            projectId,
            expect.objectContaining({
                plannedSignAt: undefined
            }),
            userId
        );
    });

    it('returns project detail through the query service', async () => {
        const detail = {
            id: projectId,
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            allowedActions: ['view-project-workspace']
        };
        const user = { sub: userId, username: 'sales_rep', permissions: ['project:read'] };
        projectQueryService.getProjectDetail.mockResolvedValue(detail as never);

        await expect(controller.getById(projectId, { user } as never)).resolves.toBe(detail);
        expect(projectQueryService.getProjectDetail).toHaveBeenCalledWith(projectId, user);
    });

    it('returns project workspace guidance through the query service', async () => {
        const guidance = {
            projectId,
            headline: '围绕经营、回款、成本和提成条件持续推进',
            recommendedEntries: []
        };
        const user = { sub: userId, username: 'sales_rep', permissions: ['project:read'] };
        projectQueryService.getProjectWorkspaceGuidance.mockResolvedValue(guidance as never);

        await expect(controller.getWorkspaceGuidance(projectId, { user } as never)).resolves.toBe(guidance);
        expect(projectQueryService.getProjectWorkspaceGuidance).toHaveBeenCalledWith(projectId, user);
    });

    it('returns project timeline through the query service', async () => {
        const timeline = {
            projectId,
            events: [
                {
                    eventKey: 'project-created',
                    stage: 'assessment',
                    stageLabel: '立项评估',
                    eventType: 'stage-entered',
                    occurredAt: '2026-03-22T10:00:00.000Z',
                    actorUserId: userId,
                    actorName: '销售人员',
                    resultLabel: '项目创建',
                    sourceType: 'project',
                    sourceId: projectId,
                    evidenceLabel: 'PRJ-2026-001',
                    isAuthoritative: true
                }
            ],
            generatedAt: '2026-03-22T10:00:00.000Z'
        };
        projectQueryService.getProjectTimeline.mockResolvedValue(timeline as never);

        await expect(controller.getTimeline(projectId)).resolves.toBe(timeline);
        expect(projectQueryService.getProjectTimeline).toHaveBeenCalledWith(projectId);
    });

    it('returns project acceptance records through the query service', async () => {
        const records = [
            {
                id: '36000000-0000-4000-8000-000000000001',
                projectId,
                acceptanceType: 'stage-acceptance',
                acceptanceResult: 'accepted',
                status: 'confirmed',
                scopeSummary: '阶段成果验收范围',
                evidenceSummary: '客户验收单',
                comment: null,
                confirmationRecordId: null,
                confirmedAt: '2026-04-18T09:30:00.000Z',
                confirmedBy: userId,
                createdAt: '2026-04-18T09:30:00.000Z',
                createdBy: userId,
                updatedAt: '2026-04-18T09:30:00.000Z',
                updatedBy: userId,
                rowVersion: 1
            }
        ];
        projectQueryService.listAcceptanceRecords.mockResolvedValue(records as never);

        await expect(controller.listAcceptanceRecords(projectId)).resolves.toBe(records);
        expect(projectQueryService.listAcceptanceRecords).toHaveBeenCalledWith(projectId);
    });

    it('creates project acceptance record with operator id', async () => {
        const confirmedAt = new Date('2026-04-18T09:30:00.000Z');
        projectService.createAcceptanceRecord.mockResolvedValue({
            id: '36000000-0000-4000-8000-000000000001',
            projectId,
            acceptanceType: 'stage-acceptance',
            acceptanceResult: 'accepted',
            status: 'confirmed',
            scopeSummary: '阶段成果验收范围',
            evidenceSummary: '客户验收单',
            comment: '确认通过',
            confirmationRecordId: null,
            confirmedAt,
            confirmedBy: userId,
            createdAt: confirmedAt,
            createdBy: userId,
            updatedAt: confirmedAt,
            updatedBy: userId,
            rowVersion: 1
        } as never);

        const result = await controller.createAcceptanceRecord(
            projectId,
            {
                acceptanceType: 'stage-acceptance',
                acceptanceResult: 'accepted',
                scopeSummary: '阶段成果验收范围',
                evidenceSummary: '客户验收单',
                comment: '确认通过'
            },
            { user: { sub: userId } } as never
        );

        expect(projectService.createAcceptanceRecord).toHaveBeenCalledWith(
            projectId,
            {
                acceptanceType: 'stage-acceptance',
                acceptanceResult: 'accepted',
                scopeSummary: '阶段成果验收范围',
                evidenceSummary: '客户验收单',
                comment: '确认通过'
            },
            userId
        );
        expect(result.confirmedAt).toBe('2026-04-18T09:30:00.000Z');
        expect(result.evidenceSummary).toBe('客户验收单');
    });

    it('throws when project detail is not found by id', async () => {
        projectQueryService.getProjectDetail.mockRejectedValue(new NotFoundException(`Project ${projectId} not found`));

        await expect(
            controller.getById(projectId, {
                user: { sub: userId, username: 'sales_rep', permissions: ['project:read'] }
            } as never)
        ).rejects.toThrow(NotFoundException);
    });

    function createProjectEntity(overrides: Partial<Project> = {}): Project {
        return Object.assign(new Project(), {
            id: projectId,
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            customerId: null,
            customerName: '华南地铁集团',
            status: 'active',
            currentStage: 'commercial-closure',
            ownerOrgId: null,
            ownerUserId: userId,
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        });
    }
});
