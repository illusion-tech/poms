import { Injectable } from '@nestjs/common';
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

@Injectable()
export class ProjectService {
    constructor(private readonly projectRepository: ProjectRepository) {}

    async findAll(): Promise<Project[]> {
        return this.projectRepository.findAll();
    }

    async findById(id: string): Promise<Project | null> {
        return this.projectRepository.findById(id);
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
}
