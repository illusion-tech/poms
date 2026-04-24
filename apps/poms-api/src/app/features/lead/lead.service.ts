import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Project } from '../project/project.entity';
import { Lead } from './lead.entity';
import { LeadRepository } from './lead.repository';

export interface CreateLeadRecord {
    leadCode: string;
    leadName: string;
    customerName: string;
    sourceChannel?: string | null;
    ownerOrgId?: string | null;
    ownerUserId?: string | null;
}

export interface UpdateLeadRecord {
    leadName?: string;
    customerName?: string;
    sourceChannel?: string | null;
    ownerOrgId?: string | null;
    ownerUserId?: string | null;
}

export interface QualifyLeadRecord {
    qualificationSummary: string;
}

export interface CloseLeadRecord {
    closedReason: string;
}

export interface ConvertLeadToProjectRecord {
    projectCode: string;
    projectName?: string;
    plannedSignAt?: Date | null;
}

@Injectable()
export class LeadService {
    constructor(private readonly leadRepository: LeadRepository) {}

    async createLead(input: CreateLeadRecord, operatorUserId: string): Promise<Lead> {
        const existingLead = await this.leadRepository.findByCode(input.leadCode);
        if (existingLead) {
            throw new ConflictException(`Lead code ${input.leadCode} already exists`);
        }

        const operator = await this.leadRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        const owner = await this.resolveOwner(input.ownerUserId, input.ownerOrgId, operator);
        const lead = this.leadRepository.create({
            leadCode: input.leadCode,
            leadName: input.leadName,
            customerName: input.customerName,
            sourceChannel: input.sourceChannel?.trim() || null,
            status: 'registered',
            ownerOrgId: owner.ownerOrgId,
            ownerUserId: owner.ownerUserId,
            qualificationSummary: null,
            qualifiedAt: null,
            qualifiedBy: null,
            closedReason: null,
            closedAt: null,
            closedBy: null,
            convertedProjectId: null,
            convertedAt: null,
            convertedBy: null,
            createdBy: operator.id,
            updatedBy: operator.id
        });

        await this.leadRepository.save(lead);

        return lead;
    }

    async updateLead(id: string, input: UpdateLeadRecord, operatorUserId: string): Promise<Lead> {
        const lead = await this.requireLead(id);
        this.assertLeadEditable(lead);

        if (input.leadName !== undefined) {
            lead.leadName = input.leadName;
        }

        if (input.customerName !== undefined) {
            lead.customerName = input.customerName;
        }

        if (input.sourceChannel !== undefined) {
            lead.sourceChannel = input.sourceChannel?.trim() || null;
        }

        if (input.ownerUserId !== undefined || input.ownerOrgId !== undefined) {
            const owner = await this.resolveOwnerUpdate(lead, input.ownerUserId, input.ownerOrgId);
            lead.ownerUserId = owner.ownerUserId;
            lead.ownerOrgId = owner.ownerOrgId;
        }

        lead.updatedBy = operatorUserId;
        await this.leadRepository.save(lead);

        return lead;
    }

    async qualifyLead(id: string, input: QualifyLeadRecord, operatorUserId: string): Promise<Lead> {
        const lead = await this.requireLead(id);
        if (lead.status !== 'registered') {
            throw new BadRequestException(`Lead ${id} cannot be qualified in status ${lead.status}`);
        }

        const now = new Date();
        lead.status = 'qualified';
        lead.qualificationSummary = input.qualificationSummary;
        lead.qualifiedAt = now;
        lead.qualifiedBy = operatorUserId;
        lead.updatedBy = operatorUserId;

        await this.leadRepository.save(lead);

        return lead;
    }

    async closeLead(id: string, input: CloseLeadRecord, operatorUserId: string): Promise<Lead> {
        const lead = await this.requireLead(id);
        if (!['registered', 'qualified'].includes(lead.status)) {
            throw new BadRequestException(`Lead ${id} cannot be closed in status ${lead.status}`);
        }

        const now = new Date();
        lead.status = 'closed';
        lead.closedReason = input.closedReason;
        lead.closedAt = now;
        lead.closedBy = operatorUserId;
        lead.updatedBy = operatorUserId;

        await this.leadRepository.save(lead);

        return lead;
    }

    async convertToProject(id: string, input: ConvertLeadToProjectRecord, operatorUserId: string): Promise<Project> {
        const lead = await this.requireLead(id);
        if (lead.status === 'converted' || lead.convertedProjectId) {
            throw new ConflictException(`Lead ${id} has already been converted to project ${lead.convertedProjectId}`);
        }

        if (lead.status !== 'qualified') {
            throw new BadRequestException(`Lead ${id} cannot be converted in status ${lead.status}`);
        }

        const existingProject = await this.leadRepository.findProjectByCode(input.projectCode);
        if (existingProject) {
            throw new ConflictException(`Project code ${input.projectCode} already exists`);
        }

        const operator = await this.leadRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        const project = this.leadRepository.createProject({
            id: randomUUID(),
            projectCode: input.projectCode,
            projectName: input.projectName?.trim() || lead.leadName,
            sourceLeadId: lead.id,
            status: 'active',
            currentStage: 'assessment',
            customerId: null,
            customerName: lead.customerName,
            ownerOrgId: lead.ownerOrgId ?? null,
            ownerUserId: lead.ownerUserId ?? null,
            plannedSignAt: input.plannedSignAt ?? null,
            createdBy: operator.id,
            updatedBy: operator.id
        });

        const now = new Date();
        lead.status = 'converted';
        lead.convertedProjectId = project.id;
        lead.convertedAt = now;
        lead.convertedBy = operator.id;
        lead.updatedBy = operator.id;

        await this.leadRepository.saveLeadAndProject(lead, project);

        return project;
    }

    private async requireLead(id: string): Promise<Lead> {
        const lead = await this.leadRepository.findById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }

        return lead;
    }

    private assertLeadEditable(lead: Lead): void {
        if (!['registered', 'qualified'].includes(lead.status)) {
            throw new BadRequestException(`Lead ${lead.id} cannot be edited in status ${lead.status}`);
        }
    }

    private async resolveOwner(
        ownerUserId: string | null | undefined,
        ownerOrgId: string | null | undefined,
        operator: { id: string; primaryOrgUnitId?: string | null }
    ): Promise<{ ownerUserId: string | null; ownerOrgId: string | null }> {
        if (ownerUserId === undefined) {
            const resolvedOrgId = ownerOrgId === undefined ? operator.primaryOrgUnitId ?? null : ownerOrgId;
            await this.assertOrgExists(resolvedOrgId);
            return {
                ownerUserId: operator.id,
                ownerOrgId: resolvedOrgId
            };
        }

        const ownerUser = ownerUserId ? await this.leadRepository.findPlatformUserById(ownerUserId) : null;
        if (ownerUserId && !ownerUser) {
            throw new NotFoundException(`Platform user ${ownerUserId} not found`);
        }

        const resolvedOrgId = ownerOrgId === undefined ? ownerUser?.primaryOrgUnitId ?? null : ownerOrgId;
        await this.assertOrgExists(resolvedOrgId);

        return {
            ownerUserId: ownerUser?.id ?? null,
            ownerOrgId: resolvedOrgId
        };
    }

    private async resolveOwnerUpdate(
        lead: Lead,
        ownerUserId: string | null | undefined,
        ownerOrgId: string | null | undefined
    ): Promise<{ ownerUserId: string | null; ownerOrgId: string | null }> {
        if (ownerUserId === undefined) {
            const resolvedOrgId = ownerOrgId === undefined ? lead.ownerOrgId ?? null : ownerOrgId;
            await this.assertOrgExists(resolvedOrgId);
            return {
                ownerUserId: lead.ownerUserId ?? null,
                ownerOrgId: resolvedOrgId
            };
        }

        const ownerUser = ownerUserId ? await this.leadRepository.findPlatformUserById(ownerUserId) : null;
        if (ownerUserId && !ownerUser) {
            throw new NotFoundException(`Platform user ${ownerUserId} not found`);
        }

        const resolvedOrgId = ownerOrgId === undefined ? ownerUser?.primaryOrgUnitId ?? lead.ownerOrgId ?? null : ownerOrgId;
        await this.assertOrgExists(resolvedOrgId);

        return {
            ownerUserId: ownerUser?.id ?? null,
            ownerOrgId: resolvedOrgId
        };
    }

    private async assertOrgExists(orgUnitId: string | null): Promise<void> {
        if (!orgUnitId) {
            return;
        }

        const orgUnit = await this.leadRepository.findOrgUnitById(orgUnitId);
        if (!orgUnit) {
            throw new NotFoundException(`Org unit ${orgUnitId} not found`);
        }
    }
}
