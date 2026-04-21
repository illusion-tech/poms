import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ProjectStage } from '@poms/shared-contracts';
import { Project } from './project.entity';
import { ProjectRepository } from './project.repository';

export interface CreateProjectRecord {
    projectCode: string;
    projectName: string;
    customerName: string;
    currentStage?: ProjectStage;
    plannedSignAt?: Date | null;
}

export interface FindProjectsQuery {
    status?: string;
    currentStage?: string;
    ownerOrgId?: string;
    keyword?: string;
}

export interface UpdateProjectBasicInfoRecord {
    projectName?: string;
    customerName?: string | null;
    plannedSignAt?: Date | null;
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

    async createAndSave(input: CreateProjectRecord, operatorUserId: string): Promise<Project> {
        const existingProject = await this.projectRepository.findByCode(input.projectCode);
        if (existingProject) {
            throw new ConflictException(`Project code ${input.projectCode} already exists`);
        }

        const operator = await this.projectRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        const project = this.projectRepository.create({
            projectCode: input.projectCode,
            projectName: input.projectName,
            status: 'active',
            currentStage: input.currentStage ?? 'assessment',
            customerId: null,
            customerName: input.customerName,
            ownerOrgId: operator.primaryOrgUnitId ?? null,
            ownerUserId: operator.id,
            plannedSignAt: input.plannedSignAt ?? null,
            createdBy: operator.id,
            updatedBy: operator.id
        });

        await this.projectRepository.save(project);

        return project;
    }

    async updateBasicInfo(id: string, input: UpdateProjectBasicInfoRecord, operatorUserId: string): Promise<Project> {
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

        if (input.customerName !== undefined) {
            project.customerName = input.customerName;
        }

        if (input.plannedSignAt !== undefined) {
            project.plannedSignAt = input.plannedSignAt;
        }

        project.updatedBy = operatorUserId;

        await this.projectRepository.save(project);

        return project;
    }
}
