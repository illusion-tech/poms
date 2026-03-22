import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Project } from './project.entity';
import { ProjectRepository } from './project.repository';

export interface CreateProjectRecord {
    projectCode: string;
    projectName: string;
    currentStage: string;
    status?: string;
    customerId?: string | null;
    ownerOrgId?: string | null;
    ownerUserId?: string | null;
    plannedSignAt?: Date | null;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export interface FindProjectsQuery {
    status?: string;
    currentStage?: string;
    ownerOrgId?: string;
    keyword?: string;
}

export interface UpdateProjectBasicInfoRecord {
    projectName?: string;
    customerId?: string | null;
    ownerOrgId?: string | null;
    ownerUserId?: string | null;
    plannedSignAt?: Date | null;
    updatedBy?: string | null;
}

@Injectable()
export class ProjectService {
    constructor(private readonly projectRepository: ProjectRepository) {}

    async findAll(): Promise<Project[]> {
        return this.projectRepository.findAll();
    }

    async findMany(query: FindProjectsQuery): Promise<Project[]> {
        return this.projectRepository.findMany(query);
    }

    async findById(id: string): Promise<Project | null> {
        return this.projectRepository.findById(id);
    }

    async findByCode(projectCode: string): Promise<Project | null> {
        return this.projectRepository.findByCode(projectCode);
    }

    async createAndSave(input: CreateProjectRecord): Promise<Project> {
        const project = this.projectRepository.create({
            projectCode: input.projectCode,
            projectName: input.projectName,
            status: input.status ?? 'active',
            currentStage: input.currentStage,
            customerId: input.customerId ?? null,
            ownerOrgId: input.ownerOrgId ?? null,
            ownerUserId: input.ownerUserId ?? null,
            plannedSignAt: input.plannedSignAt ?? null,
            createdBy: input.createdBy ?? null,
            updatedBy: input.updatedBy ?? null
        });

        await this.projectRepository.save(project);

        return project;
    }

    async updateBasicInfo(id: string, input: UpdateProjectBasicInfoRecord): Promise<Project> {
        const project = await this.projectRepository.findById(id);
        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        if (!['active', 'blocked'].includes(project.status)) {
            throw new BadRequestException(
                `Project ${id} cannot be edited in status ${project.status}`
            );
        }

        if (input.projectName !== undefined) {
            project.projectName = input.projectName;
        }

        if (input.customerId !== undefined) {
            project.customerId = input.customerId;
        }

        if (input.ownerOrgId !== undefined) {
            project.ownerOrgId = input.ownerOrgId;
        }

        if (input.ownerUserId !== undefined) {
            project.ownerUserId = input.ownerUserId;
        }

        if (input.plannedSignAt !== undefined) {
            project.plannedSignAt = input.plannedSignAt;
        }

        if (input.updatedBy !== undefined) {
            project.updatedBy = input.updatedBy;
        }

        await this.projectRepository.save(project);

        return project;
    }
}
