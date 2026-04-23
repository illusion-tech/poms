import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000001';

    let service: ProjectService;
    let projectRepository: {
        findByCode: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        findById: jest.Mock;
        findAll: jest.Mock;
        findMany: jest.Mock;
        findPlatformUserById: jest.Mock;
        findAcceptanceRecordById: jest.Mock;
        createAcceptanceRecord: jest.Mock;
        saveAcceptanceRecord: jest.Mock;
        createProjectCompletionRecord: jest.Mock;
        saveProjectCompletionRecord: jest.Mock;
    };

    beforeEach(() => {
        projectRepository = {
            findByCode: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            findMany: jest.fn(),
            findPlatformUserById: jest.fn(),
            findAcceptanceRecordById: jest.fn(),
            createAcceptanceRecord: jest.fn(),
            saveAcceptanceRecord: jest.fn(),
            createProjectCompletionRecord: jest.fn(),
            saveProjectCompletionRecord: jest.fn()
        };

        service = new ProjectService(projectRepository as never);
    });

    it('creates a project with default assessment stage and operator ownership', async () => {
        const createdProject = createProjectEntity();
        projectRepository.findByCode.mockResolvedValue(null);
        projectRepository.findPlatformUserById.mockResolvedValue({
            id: userId,
            primaryOrgUnitId: '10000000-0000-4000-8000-000000000001'
        });
        projectRepository.create.mockReturnValue(createdProject);
        projectRepository.save.mockResolvedValue(undefined);

        const result = await service.createAndSave({
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            customerName: '华南地铁集团'
        }, userId);

        expect(projectRepository.create).toHaveBeenCalledWith({
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            customerName: '华南地铁集团',
            status: 'active',
            currentStage: 'assessment',
            customerId: null,
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            ownerUserId: userId,
            plannedSignAt: null,
            createdBy: userId,
            updatedBy: userId
        });
        expect(projectRepository.save).toHaveBeenCalledWith(createdProject);
        expect(result).toBe(createdProject);
    });

    it('rejects duplicate project codes before save', async () => {
        projectRepository.findByCode.mockResolvedValue(createProjectEntity());

        await expect(
            service.createAndSave({
                projectCode: 'PRJ-2026-001',
                projectName: 'Duplicate',
                customerName: '重复客户'
            }, userId)
        ).rejects.toThrow(ConflictException);

        expect(projectRepository.create).not.toHaveBeenCalled();
        expect(projectRepository.save).not.toHaveBeenCalled();
    });

    it('rejects basic info updates for non-editable status', async () => {
        projectRepository.findById.mockResolvedValue(
            createProjectEntity({
                status: 'closed'
            })
        );

        await expect(
            service.updateBasicInfo(projectId, {
                projectName: 'Updated name',
                updatedBy: userId
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('updates basic info and allows plannedSignAt to be cleared', async () => {
        const project = createProjectEntity({
            plannedSignAt: new Date('2026-04-15T00:00:00.000Z')
        });
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.save.mockResolvedValue(undefined);

        const result = await service.updateBasicInfo(projectId, {
            projectName: 'Updated project name',
            customerName: '新的客户名称',
            plannedSignAt: null
        }, userId);

        expect(project.projectName).toBe('Updated project name');
        expect(project.customerName).toBe('新的客户名称');
        expect(project.plannedSignAt).toBeNull();
        expect(project.updatedBy).toBe(userId);
        expect(projectRepository.save).toHaveBeenCalledWith(project);
        expect(result).toBe(project);
    });

    it('preserves plannedSignAt when update payload leaves it undefined', async () => {
        const plannedSignAt = new Date('2026-04-15T00:00:00.000Z');
        const project = createProjectEntity({
            plannedSignAt
        });
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.save.mockResolvedValue(undefined);

        await service.updateBasicInfo(projectId, {
        }, userId);

        expect(project.plannedSignAt).toBe(plannedSignAt);
    });

    it('throws when updating a missing project', async () => {
        projectRepository.findById.mockResolvedValue(null);

        await expect(service.updateBasicInfo(projectId, {}, userId)).rejects.toThrow(
            NotFoundException
        );
    });

    it('creates a confirmed acceptance record only from acceptance stage', async () => {
        const record = {
            id: '36000000-0000-4000-8000-000000000001',
            projectId,
            acceptanceType: 'stage-acceptance',
            acceptanceResult: 'accepted',
            status: 'confirmed'
        };
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'acceptance' }));
        projectRepository.createAcceptanceRecord.mockReturnValue(record);
        projectRepository.saveAcceptanceRecord.mockResolvedValue(undefined);

        const result = await service.createAcceptanceRecord(projectId, {
            acceptanceType: 'stage-acceptance',
            acceptanceResult: 'accepted',
            scopeSummary: '阶段成果验收范围',
            evidenceSummary: '客户验收单',
            comment: ' 确认通过 '
        }, userId);

        expect(projectRepository.createAcceptanceRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId,
                acceptanceType: 'stage-acceptance',
                acceptanceResult: 'accepted',
                status: 'confirmed',
                scopeSummary: '阶段成果验收范围',
                evidenceSummary: '客户验收单',
                comment: '确认通过',
                confirmationRecordId: null,
                confirmedBy: userId,
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(projectRepository.createAcceptanceRecord.mock.calls[0][0].confirmedAt).toEqual(expect.any(Date));
        expect(projectRepository.saveAcceptanceRecord).toHaveBeenCalledWith(record);
        expect(result).toBe(record);
    });

    it('rejects acceptance record creation before acceptance stage', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'execution' }));

        await expect(service.createAcceptanceRecord(projectId, {
            acceptanceType: 'stage-acceptance',
            acceptanceResult: 'accepted',
            scopeSummary: '阶段成果验收范围',
            evidenceSummary: '客户验收单'
        }, userId)).rejects.toThrow(BadRequestException);

        expect(projectRepository.createAcceptanceRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveAcceptanceRecord).not.toHaveBeenCalled();
    });

    it('creates a completion record from an effective acceptance source and moves project to completed', async () => {
        const completedAt = new Date('2026-04-20T10:00:00.000Z');
        const project = createProjectEntity({ currentStage: 'acceptance', status: 'active' });
        const record = {
            id: '37000000-0000-4000-8000-000000000001',
            projectId,
            acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
            completionResult: 'completed',
            status: 'confirmed'
        };
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.findAcceptanceRecordById.mockResolvedValue({
            id: '36000000-0000-4000-8000-000000000001',
            projectId,
            status: 'confirmed',
            acceptanceResult: 'accepted'
        });
        projectRepository.createProjectCompletionRecord.mockReturnValue(record);
        projectRepository.saveProjectCompletionRecord.mockResolvedValue(undefined);

        const result = await service.createProjectCompletionRecord(projectId, {
            acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
            completionResult: 'completed',
            completedAt,
            completionSummary: '项目交付完成',
            evidenceSummary: '完成确认单'
        }, userId);

        expect(projectRepository.createProjectCompletionRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId,
                acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
                completionResult: 'completed',
                status: 'confirmed',
                completedAt,
                completedBy: userId,
                completionSummary: '项目交付完成',
                evidenceSummary: '完成确认单',
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(project.currentStage).toBe('completed');
        expect(project.status).toBe('completed');
        expect(project.updatedBy).toBe(userId);
        expect(projectRepository.saveProjectCompletionRecord).toHaveBeenCalledWith(record, project);
        expect(result).toBe(record);
    });

    it('rejects completion record creation without an effective acceptance source', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'acceptance', status: 'active' }));
        projectRepository.findAcceptanceRecordById.mockResolvedValue({
            id: '36000000-0000-4000-8000-000000000001',
            projectId,
            status: 'confirmed',
            acceptanceResult: 'rejected'
        });

        await expect(service.createProjectCompletionRecord(projectId, {
            acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
            completionResult: 'completed',
            completedAt: new Date('2026-04-20T10:00:00.000Z'),
            completionSummary: '项目交付完成',
            evidenceSummary: '完成确认单'
        }, userId)).rejects.toThrow(BadRequestException);

        expect(projectRepository.createProjectCompletionRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveProjectCompletionRecord).not.toHaveBeenCalled();
    });

    it('rejects completion record creation before acceptance stage', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'execution', status: 'active' }));

        await expect(service.createProjectCompletionRecord(projectId, {
            acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
            completionResult: 'completed',
            completedAt: new Date('2026-04-20T10:00:00.000Z'),
            completionSummary: '项目交付完成',
            evidenceSummary: '完成确认单'
        }, userId)).rejects.toThrow(BadRequestException);

        expect(projectRepository.findAcceptanceRecordById).not.toHaveBeenCalled();
        expect(projectRepository.createProjectCompletionRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveProjectCompletionRecord).not.toHaveBeenCalled();
    });

    function createProjectEntity(overrides: Record<string, unknown> = {}) {
        return {
            id: projectId,
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            customerId: null,
            customerName: '华南地铁集团',
            status: 'active',
            currentStage: 'commercial-closure',
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            rowVersion: 1,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            createdBy: userId,
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedBy: userId,
            ...overrides
        };
    }
});
