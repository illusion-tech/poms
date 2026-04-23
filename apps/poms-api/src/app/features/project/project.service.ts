import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AcceptanceRecordResult, AcceptanceRecordType, ProjectCompletionRecordResult, ProjectStage } from '@poms/shared-contracts';
import { AcceptanceRecord } from './acceptance-record.entity';
import { ProjectCompletionRecord } from './project-completion-record.entity';
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

export interface CreateAcceptanceRecordInput {
    acceptanceType: AcceptanceRecordType;
    acceptanceResult: AcceptanceRecordResult;
    scopeSummary: string;
    evidenceSummary: string;
    comment?: string | null;
}

export interface CreateProjectCompletionRecordInput {
    acceptanceRecordId: string;
    completionResult: ProjectCompletionRecordResult;
    completedAt: Date;
    completionSummary: string;
    evidenceSummary: string;
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

    async findByIds(ids: string[]): Promise<Project[]> {
        return this.projectRepository.findByIds(ids);
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

    async createAcceptanceRecord(projectId: string, input: CreateAcceptanceRecordInput, operatorUserId: string): Promise<AcceptanceRecord> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (project.currentStage !== 'acceptance') {
            throw new BadRequestException(
                `Project ${projectId} cannot record acceptance in stage ${project.currentStage}`
            );
        }

        const now = new Date();
        const record = this.projectRepository.createAcceptanceRecord({
            projectId,
            acceptanceType: input.acceptanceType,
            acceptanceResult: input.acceptanceResult,
            status: 'confirmed',
            scopeSummary: input.scopeSummary,
            evidenceSummary: input.evidenceSummary,
            comment: input.comment?.trim() || null,
            confirmationRecordId: null,
            confirmedAt: now,
            confirmedBy: operatorUserId,
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        await this.projectRepository.saveAcceptanceRecord(record);

        return record;
    }

    async createProjectCompletionRecord(projectId: string, input: CreateProjectCompletionRecordInput, operatorUserId: string): Promise<ProjectCompletionRecord> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (project.status === 'closed' || project.currentStage === 'closed-lost' || project.currentStage === 'closed-terminated') {
            throw new BadRequestException(`Project ${projectId} cannot record completion because it is closed`);
        }

        if (project.currentStage !== 'acceptance') {
            throw new BadRequestException(
                `Project ${projectId} cannot record completion in stage ${project.currentStage}`
            );
        }

        const acceptanceRecord = await this.projectRepository.findAcceptanceRecordById(input.acceptanceRecordId);
        if (!acceptanceRecord || acceptanceRecord.projectId !== project.id) {
            throw new BadRequestException(`Acceptance record ${input.acceptanceRecordId} is not valid for project ${projectId}`);
        }

        if (acceptanceRecord.status !== 'confirmed' || !['accepted', 'conditional'].includes(acceptanceRecord.acceptanceResult)) {
            throw new BadRequestException(`Acceptance record ${input.acceptanceRecordId} is not an effective acceptance source`);
        }

        const record = this.projectRepository.createProjectCompletionRecord({
            projectId,
            acceptanceRecordId: acceptanceRecord.id,
            completionResult: input.completionResult,
            status: 'confirmed',
            completedAt: input.completedAt,
            completedBy: operatorUserId,
            completionSummary: input.completionSummary,
            evidenceSummary: input.evidenceSummary,
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        project.currentStage = 'completed';
        project.status = 'completed';
        project.updatedBy = operatorUserId;

        await this.projectRepository.saveProjectCompletionRecord(record, project);

        return record;
    }
}
