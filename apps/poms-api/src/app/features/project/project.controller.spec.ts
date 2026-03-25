jest.mock('@mikro-orm/core', () => {
    const makeChain = () => {
        const chain: Record<string, unknown> = {};
        ['primary', 'nullable', 'length', 'defaultRaw', 'unique', 'fieldName', 'version', 'default', 'onCreate', 'onUpdate'].forEach((m) => {
            chain[m] = () => chain;
        });
        return chain;
    };
    const defineEntity = (_config: unknown) => ({ class: class {}, setClass: () => {} });
    defineEntity.properties = new Proxy({} as Record<string, unknown>, { get: () => makeChain });
    return { QueryOrder: { ASC: 'ASC', DESC: 'DESC' }, defineEntity };
});

import { NotFoundException } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { Project } from './project.entity';
import { ProjectService } from './project.service';

describe('ProjectController', () => {
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000001';
    const baseDate = new Date('2026-03-22T10:00:00.000Z');

    let controller: ProjectController;
    let projectService: jest.Mocked<ProjectService>;

    beforeEach(() => {
        projectService = {
            findMany: jest.fn(),
            findByCode: jest.fn(),
            findById: jest.fn(),
            createAndSave: jest.fn(),
            updateBasicInfo: jest.fn(),
            findAll: jest.fn()
        } as unknown as jest.Mocked<ProjectService>;

        controller = new ProjectController(projectService);
    });

    it('maps create payload plannedSignAt into Date', async () => {
        const plannedSignAt = '2026-04-15T00:00:00.000Z';
        projectService.createAndSave.mockResolvedValue(
            createProjectEntity({
                plannedSignAt: new Date(plannedSignAt)
            })
        );

        await controller.create({
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            currentStage: 'commercial-closure',
            plannedSignAt,
            createdBy: userId,
            updatedBy: userId
        });

        expect(projectService.createAndSave).toHaveBeenCalledWith(
            expect.objectContaining({
                plannedSignAt: new Date(plannedSignAt)
            })
        );
    });

    it('maps update payload null plannedSignAt into null', async () => {
        projectService.updateBasicInfo.mockResolvedValue(
            createProjectEntity({
                plannedSignAt: null
            })
        );

        await controller.updateBasicInfo(projectId, {
            plannedSignAt: null,
            updatedBy: userId
        });

        expect(projectService.updateBasicInfo).toHaveBeenCalledWith(
            projectId,
            expect.objectContaining({
                plannedSignAt: null,
                updatedBy: userId
            })
        );
    });

    it('leaves update payload plannedSignAt undefined when not provided', async () => {
        projectService.updateBasicInfo.mockResolvedValue(createProjectEntity());

        await controller.updateBasicInfo(projectId, {
            updatedBy: userId
        });

        expect(projectService.updateBasicInfo).toHaveBeenCalledWith(
            projectId,
            expect.objectContaining({
                plannedSignAt: undefined,
                updatedBy: userId
            })
        );
    });

    it('throws when project is not found by id', async () => {
        projectService.findById.mockResolvedValue(null);

        await expect(controller.getById(projectId)).rejects.toThrow(NotFoundException);
    });

    function createProjectEntity(overrides: Partial<Project> = {}): Project {
        return Object.assign(new Project(), {
            id: projectId,
            projectCode: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            customerId: null,
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
