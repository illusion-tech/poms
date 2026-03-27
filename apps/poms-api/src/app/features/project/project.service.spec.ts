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
    };

    beforeEach(() => {
        projectRepository = {
            findByCode: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            findMany: jest.fn()
        };

        service = new ProjectService(projectRepository as never);
    });

    it('creates a project with default status and nullable fields', async () => {
        const createdProject = createProjectEntity();
        projectRepository.findByCode.mockResolvedValue(null);
        projectRepository.create.mockReturnValue(createdProject);
        projectRepository.save.mockResolvedValue(undefined);

        const result = await service.createAndSave({
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            currentStage: 'commercial-closure'
        });

        expect(projectRepository.create).toHaveBeenCalledWith({
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            status: 'active',
            currentStage: 'commercial-closure',
            customerId: null,
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            createdBy: null,
            updatedBy: null
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
                currentStage: 'commercial-closure'
            })
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
            plannedSignAt: null,
            updatedBy: userId
        });

        expect(project.projectName).toBe('Updated project name');
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
            updatedBy: userId
        });

        expect(project.plannedSignAt).toBe(plannedSignAt);
    });

    it('throws when updating a missing project', async () => {
        projectRepository.findById.mockResolvedValue(null);

        await expect(service.updateBasicInfo(projectId, { updatedBy: userId })).rejects.toThrow(
            NotFoundException
        );
    });

    function createProjectEntity(overrides: Record<string, unknown> = {}) {
        return {
            id: projectId,
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            customerId: null,
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
