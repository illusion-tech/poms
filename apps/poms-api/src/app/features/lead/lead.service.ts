import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import {
    AttachmentRelationTypeValue,
    AttachmentTargetTypeValue,
    LeadOwnerAssignmentTypeValue,
    LeadSourceStatusValue,
    LeadStatusValue,
    ProjectStageValue,
    ProjectStatusValue,
    type LeadBudgetStatus,
    type LeadOwnerAssignmentResult,
    type LeadOwnerAssignmentType,
    type LeadSourceStatus,
    type LeadUrgency
} from '@poms/shared-contracts';
import { AttachmentService } from '../attachment/attachment.service';
import { BusinessNumberService } from '../business-number/business-number.service';
import type { AuditSnapshot } from '../../core/runtime-audit/audit-log.entity';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { CustomerService } from '../customer/customer.service';
import { Project } from '../project/project.entity';
import { LeadOwnerAssignmentRecord } from './lead-owner-assignment-record.entity';
import { Lead, LeadSource } from './lead.entity';
import { LeadRepository } from './lead.repository';
import { LeadScoreFactsService } from './lead-score-facts.service';
import { LeadScoreService } from './lead-score.service';
import { calculateLeadScore, collectLeadGateMissingItems } from './lead-scoring';

const LEAD_MUTABLE_STATUSES: readonly string[] = [LeadStatusValue.Registered, LeadStatusValue.Qualified];
const LEAD_FIELD_AUDIT_FIELDS = [
    'leadName',
    'customerId',
    'customerName',
    'sourceId',
    'sourceChannel',
    'demandDescription',
    'budgetStatus',
    'estimatedAmount',
    'urgency',
    'expectedDecisionDate'
] as const;

type LeadFieldAuditField = typeof LEAD_FIELD_AUDIT_FIELDS[number];
type LeadFieldAuditValues = Record<LeadFieldAuditField, unknown>;
const LEAD_FIELD_AUDIT_REDACTED_FIELDS = new Set<LeadFieldAuditField>(['demandDescription']);

export interface CreateLeadSourceRecord {
    code: string;
    name: string;
    description?: string | null;
    sortOrder?: number;
}

export interface UpdateLeadSourceRecord {
    name?: string;
    description?: string | null;
    status?: LeadSourceStatus;
    sortOrder?: number;
}

export interface CreateLeadRecord {
    leadName: string;
    customerId: string;
    sourceId: string;
    demandDescription: string;
    budgetStatus: LeadBudgetStatus;
    estimatedAmount?: string | null;
    urgency: LeadUrgency;
    expectedDecisionDate?: string | null;
    ownerOrgId?: string | null;
    ownerUserId?: string | null;
}

export interface UpdateLeadRecord {
    leadName?: string;
    customerId?: string;
    sourceId?: string;
    demandDescription?: string;
    budgetStatus?: LeadBudgetStatus;
    estimatedAmount?: string | null;
    urgency?: LeadUrgency;
    expectedDecisionDate?: string | null;
    expectedVersion?: number;
}

export interface ClaimLeadOwnerRecord {
    expectedVersion?: number;
}

export interface AssignLeadOwnerRecord {
    ownerUserId: string;
    ownerOrgId?: string | null;
    reason: string;
    expectedVersion?: number;
}

export interface QualifyLeadRecord {
    qualificationSummary: string;
}

export interface CloseLeadRecord {
    closedReason: string;
}

export interface ConvertLeadToProjectRecord {
    projectName?: string;
    customerProjectNo?: string | null;
    plannedSignAt?: Date | null;
}

@Injectable()
export class LeadService {
    constructor(
        private readonly leadRepository: LeadRepository,
        private readonly businessNumberService: BusinessNumberService,
        private readonly customerService: CustomerService,
        private readonly attachmentService: AttachmentService,
        private readonly leadScoreFactsService: LeadScoreFactsService,
        private readonly leadScoreService: LeadScoreService,
        private readonly runtimeAuditService: RuntimeAuditService
    ) {}

    async createLeadSource(input: CreateLeadSourceRecord, operatorUserId: string): Promise<LeadSource> {
        const code = input.code.trim();
        const existing = await this.leadRepository.findLeadSourceByCode(code);
        if (existing) {
            throw new ConflictException(`Lead source code ${code} already exists`);
        }

        const source = this.leadRepository.createLeadSource({
            code,
            name: input.name.trim(),
            description: input.description?.trim() || null,
            status: LeadSourceStatusValue.Active,
            sortOrder: input.sortOrder ?? 100,
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        await this.leadRepository.saveLeadSource(source);
        return source;
    }

    async updateLeadSource(id: string, input: UpdateLeadSourceRecord, operatorUserId: string): Promise<LeadSource> {
        const source = await this.leadRepository.findLeadSourceById(id);
        if (!source) {
            throw new NotFoundException(`Lead source ${id} not found`);
        }

        if (input.name !== undefined) {
            source.name = input.name.trim();
        }

        if (input.description !== undefined) {
            source.description = input.description?.trim() || null;
        }

        if (input.status !== undefined) {
            source.status = input.status;
        }

        if (input.sortOrder !== undefined) {
            source.sortOrder = input.sortOrder;
        }

        source.updatedBy = operatorUserId;
        await this.leadRepository.saveLeadSource(source);
        return source;
    }

    async createLead(input: CreateLeadRecord, operatorUserId: string): Promise<Lead> {
        const operator = await this.leadRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        const owner = await this.resolveOwner(input.ownerUserId, input.ownerOrgId, operator);
        const customer = await this.customerService.requireActiveCustomer(input.customerId);
        const source = await this.requireActiveLeadSource(input.sourceId);
        return this.leadRepository.getEntityManager().transactional(async (em) => {
            const leadNo = await this.businessNumberService.next('lead', new Date(), em);
            const lead = em.create(Lead, {
                id: randomUUID(),
                leadNo,
                leadName: input.leadName,
                customerId: customer.id,
                customerName: customer.displayName,
                sourceId: source.id,
                sourceChannel: source.name,
                demandDescription: input.demandDescription.trim(),
                budgetStatus: input.budgetStatus,
                estimatedAmount: this.normalizeEstimatedAmount(input.estimatedAmount),
                urgency: input.urgency,
                expectedDecisionDate: this.normalizeDateOnly(input.expectedDecisionDate),
                status: LeadStatusValue.Registered,
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

            await this.refreshLeadScore(lead, em);
            em.persist(lead);
            await this.leadScoreService.recordSystemSnapshot(lead, 'create-lead', operator.id, null, em);
            await em.flush();
            return lead;
        });
    }

    async updateLead(id: string, input: UpdateLeadRecord, operatorUserId: string, requestId?: string | null): Promise<Lead> {
        const customer = input.customerId !== undefined ? await this.customerService.requireActiveCustomer(input.customerId) : null;
        const source = input.sourceId !== undefined ? await this.requireActiveLeadSource(input.sourceId) : null;

        return this.leadRepository.getEntityManager().transactional(async (em) => {
            const lead = await em.findOne(Lead, { id });
            if (!lead) {
                throw new NotFoundException(`Lead ${id} not found`);
            }
            this.assertLeadEditable(lead);
            this.assertExpectedVersion(lead.rowVersion, input.expectedVersion, 'lead');

            const beforeValues = this.buildLeadFieldAuditValues(lead);

            if (input.leadName !== undefined) {
                lead.leadName = input.leadName;
            }

            if (customer) {
                lead.customerId = customer.id;
                lead.customerName = customer.displayName;
            }

            if (source) {
                lead.sourceId = source.id;
                lead.sourceChannel = source.name;
            }

            if (input.demandDescription !== undefined) {
                lead.demandDescription = input.demandDescription.trim();
            }

            if (input.budgetStatus !== undefined) {
                lead.budgetStatus = input.budgetStatus;
            }

            if (input.estimatedAmount !== undefined) {
                lead.estimatedAmount = this.normalizeEstimatedAmount(input.estimatedAmount);
            }

            if (input.urgency !== undefined) {
                lead.urgency = input.urgency;
            }

            if (input.expectedDecisionDate !== undefined) {
                lead.expectedDecisionDate = this.normalizeDateOnly(input.expectedDecisionDate);
            }

            const afterValues = this.buildLeadFieldAuditValues(lead);
            const changedFields = this.collectLeadFieldAuditChangedFields(beforeValues, afterValues);
            if (changedFields.length === 0) {
                return lead;
            }

            lead.updatedBy = operatorUserId;
            await this.refreshLeadScore(lead, em);
            em.persist(lead);
            await this.leadScoreService.recordSystemSnapshot(lead, 'update-lead', operatorUserId, null, em);
            await this.runtimeAuditService.recordAuditLog(
                {
                    eventType: 'lead.updated',
                    targetType: 'lead',
                    targetId: lead.id,
                    operatorId: operatorUserId,
                    requestId: requestId ?? null,
                    result: 'success',
                    beforeSnapshot: this.pickLeadFieldAuditSnapshot(beforeValues, changedFields),
                    afterSnapshot: this.pickLeadFieldAuditSnapshot(afterValues, changedFields),
                    metadata: {
                        changedFields,
                        sourceCommand: 'update-lead',
                        expectedVersion: input.expectedVersion ?? null,
                        redactedFields: changedFields.filter((field) => LEAD_FIELD_AUDIT_REDACTED_FIELDS.has(field)),
                        businessContext: {
                            leadId: lead.id
                        }
                    }
                },
                em
            );
            await em.flush();

            return lead;
        });
    }

    async claimLeadOwner(id: string, input: ClaimLeadOwnerRecord, operatorUserId: string): Promise<LeadOwnerAssignmentResult> {
        const lead = await this.requireLead(id);
        this.assertExpectedVersion(lead.rowVersion, input.expectedVersion, 'lead');
        this.assertLeadAssignable(lead);

        if (lead.ownerUserId) {
            throw new ConflictException(`Lead ${id} already has owner ${lead.ownerUserId}`);
        }

        const operator = await this.leadRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }
        if (operator.isActive === false) {
            throw new BadRequestException(`Platform user ${operatorUserId} is not active`);
        }

        const nextOwnerOrgId = operator.primaryOrgUnitId ?? null;
        await this.assertActiveOrgExists(nextOwnerOrgId);

        return this.applyLeadOwnerAssignment({
            lead,
            operatorUserId,
            ownerUserId: operator.id,
            ownerOrgId: nextOwnerOrgId,
            assignmentType: LeadOwnerAssignmentTypeValue.Claimed,
            reason: null
        });
    }

    async assignLeadOwner(id: string, input: AssignLeadOwnerRecord, operatorUserId: string): Promise<LeadOwnerAssignmentResult> {
        const lead = await this.requireLead(id);
        this.assertExpectedVersion(lead.rowVersion, input.expectedVersion, 'lead');
        this.assertLeadAssignable(lead);

        const targetOwner = await this.leadRepository.findPlatformUserById(input.ownerUserId);
        if (!targetOwner) {
            throw new NotFoundException(`Platform user ${input.ownerUserId} not found`);
        }
        if (targetOwner.isActive === false) {
            throw new BadRequestException(`Platform user ${input.ownerUserId} is not active`);
        }

        const nextOwnerOrgId = input.ownerOrgId === undefined ? (targetOwner.primaryOrgUnitId ?? null) : (input.ownerOrgId ?? null);
        await this.assertActiveOrgExists(nextOwnerOrgId);

        if (lead.ownerUserId === targetOwner.id && (lead.ownerOrgId ?? null) === nextOwnerOrgId) {
            throw new BadRequestException(`Lead ${id} already has the requested owner`);
        }

        return this.applyLeadOwnerAssignment({
            lead,
            operatorUserId,
            ownerUserId: targetOwner.id,
            ownerOrgId: nextOwnerOrgId,
            assignmentType: lead.ownerUserId ? LeadOwnerAssignmentTypeValue.Reassigned : LeadOwnerAssignmentTypeValue.Assigned,
            reason: input.reason.trim()
        });
    }

    async qualifyLead(id: string, input: QualifyLeadRecord, operatorUserId: string): Promise<Lead> {
        const lead = await this.requireLead(id);
        if (lead.status !== LeadStatusValue.Registered) {
            throw new BadRequestException(`Lead ${id} cannot be qualified in status ${lead.status}`);
        }
        this.assertLeadReadyForQualified(lead);

        const now = new Date();
        lead.status = LeadStatusValue.Qualified;
        lead.qualificationSummary = input.qualificationSummary;
        lead.qualifiedAt = now;
        lead.qualifiedBy = operatorUserId;
        lead.updatedBy = operatorUserId;
        await this.refreshLeadScore(lead);

        await this.leadRepository.save(lead);
        await this.leadScoreService.recordSystemSnapshot(lead, 'qualify-lead', operatorUserId);

        return lead;
    }

    async closeLead(id: string, input: CloseLeadRecord, operatorUserId: string): Promise<Lead> {
        const lead = await this.requireLead(id);
        if (!LEAD_MUTABLE_STATUSES.includes(lead.status)) {
            throw new BadRequestException(`Lead ${id} cannot be closed in status ${lead.status}`);
        }

        const now = new Date();
        lead.status = LeadStatusValue.Closed;
        lead.closedReason = input.closedReason;
        lead.closedAt = now;
        lead.closedBy = operatorUserId;
        lead.updatedBy = operatorUserId;
        await this.refreshLeadScore(lead);

        await this.leadRepository.save(lead);
        await this.leadScoreService.recordSystemSnapshot(lead, 'close-lead', operatorUserId);

        return lead;
    }

    async convertToProject(id: string, input: ConvertLeadToProjectRecord, operatorUserId: string): Promise<Project> {
        const operator = await this.leadRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        return this.leadRepository.getEntityManager().transactional(async (em) => {
            const lead = await em.findOne(Lead, { id });
            if (!lead) {
                throw new NotFoundException(`Lead ${id} not found`);
            }

            if (lead.status === LeadStatusValue.Converted || lead.convertedProjectId) {
                throw new ConflictException(`Lead ${id} has already been converted to project ${lead.convertedProjectId}`);
            }

            if (lead.status !== LeadStatusValue.Qualified) {
                throw new BadRequestException(`Lead ${id} cannot be converted in status ${lead.status}`);
            }
            this.assertLeadReadyForProject(lead);

            const projectNo = await this.businessNumberService.next('project', new Date(), em);
            const project = em.create(Project, {
                id: randomUUID(),
                projectNo,
                projectName: input.projectName?.trim() || lead.leadName,
                sourceLeadId: lead.id,
                status: ProjectStatusValue.Active,
                currentStage: ProjectStageValue.Assessment,
                customerId: lead.customerId,
                customerName: lead.customerName,
                customerProjectNo: input.customerProjectNo?.trim() || null,
                ownerOrgId: lead.ownerOrgId ?? null,
                ownerUserId: lead.ownerUserId ?? null,
                plannedSignAt: input.plannedSignAt ?? null,
                createdBy: operator.id,
                updatedBy: operator.id
            });

            const now = new Date();
            lead.status = LeadStatusValue.Converted;
            lead.convertedProjectId = project.id;
            lead.convertedAt = now;
            lead.convertedBy = operator.id;
            lead.updatedBy = operator.id;
            await this.refreshLeadScore(lead, em);

            em.persist([lead, project]);
            await this.attachmentService.copyActiveLinksToTarget({
                from: { targetType: AttachmentTargetTypeValue.Lead, targetId: lead.id },
                to: { targetType: AttachmentTargetTypeValue.Project, targetId: project.id },
                relationType: AttachmentRelationTypeValue.Source,
                operatorUserId: operator.id,
                entityManager: em,
                excludeCategories: ['finance', 'internal-assessment']
            });
            await this.leadScoreService.recordSystemSnapshot(lead, 'convert-to-project', operator.id, project.id, em);
            await em.flush();
            return project;
        });
    }

    private async requireLead(id: string): Promise<Lead> {
        const lead = await this.leadRepository.findById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }

        return lead;
    }

    private async requireActiveLeadSource(id: string): Promise<LeadSource> {
        const source = await this.leadRepository.findLeadSourceById(id);
        if (!source) {
            throw new NotFoundException(`Lead source ${id} not found`);
        }

        if (source.status !== LeadSourceStatusValue.Active) {
            throw new ConflictException(`Lead source ${id} is inactive`);
        }

        return source;
    }

    private assertLeadEditable(lead: Lead): void {
        if (!LEAD_MUTABLE_STATUSES.includes(lead.status)) {
            throw new BadRequestException(`Lead ${lead.id} cannot be edited in status ${lead.status}`);
        }
    }

    private assertLeadAssignable(lead: Lead): void {
        if (!LEAD_MUTABLE_STATUSES.includes(lead.status)) {
            throw new BadRequestException(`Lead ${lead.id} cannot assign owner in status ${lead.status}`);
        }
    }

    private assertLeadReadyForQualified(lead: Lead): void {
        const missing = collectLeadGateMissingItems(lead, 'qualification');
        if (missing.length > 0) {
            throw new BadRequestException(`Lead ${lead.id} is missing required qualification facts: ${missing.join(', ')}`);
        }
    }

    private assertLeadReadyForProject(lead: Lead): void {
        const missing = collectLeadGateMissingItems(lead, 'conversion');
        if (missing.length > 0) {
            throw new BadRequestException(`Lead ${lead.id} is missing required conversion facts: ${missing.join(', ')}`);
        }
    }

    private normalizeEstimatedAmount(value: string | null | undefined): string | null {
        const normalized = value?.trim();
        return normalized ? normalized : null;
    }

    private normalizeDateOnly(value: string | null | undefined): string | null {
        const normalized = value?.trim();
        return normalized ? normalized.slice(0, 10) : null;
    }

    private buildLeadFieldAuditValues(lead: Lead): LeadFieldAuditValues {
        return {
            leadName: lead.leadName,
            customerId: lead.customerId,
            customerName: lead.customerName,
            sourceId: lead.sourceId,
            sourceChannel: lead.sourceChannel ?? null,
            demandDescription: lead.demandDescription ?? null,
            budgetStatus: lead.budgetStatus,
            estimatedAmount: lead.estimatedAmount ?? null,
            urgency: lead.urgency,
            expectedDecisionDate: this.normalizeAuditDate(lead.expectedDecisionDate)
        };
    }

    private collectLeadFieldAuditChangedFields(beforeValues: LeadFieldAuditValues, afterValues: LeadFieldAuditValues): LeadFieldAuditField[] {
        return LEAD_FIELD_AUDIT_FIELDS.filter((field) => beforeValues[field] !== afterValues[field]);
    }

    private pickLeadFieldAuditSnapshot(values: LeadFieldAuditValues, fields: readonly LeadFieldAuditField[]): AuditSnapshot {
        return fields.reduce<AuditSnapshot>((snapshot, field) => {
            snapshot[field] = field === 'demandDescription'
                ? this.summarizeAuditText(values[field])
                : values[field] ?? null;
            return snapshot;
        }, {});
    }

    private summarizeAuditText(value: unknown): AuditSnapshot {
        const text = typeof value === 'string' ? value : '';
        return {
            changed: true,
            length: text.length
        };
    }

    private normalizeAuditDate(value: Date | string | null | undefined): string | null {
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        return this.normalizeDateOnly(value);
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

        if (ownerUserId === null) {
            return {
                ownerUserId: null,
                ownerOrgId: null
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

    private async assertOrgExists(orgUnitId: string | null): Promise<void> {
        if (!orgUnitId) {
            return;
        }

        const orgUnit = await this.leadRepository.findOrgUnitById(orgUnitId);
        if (!orgUnit) {
            throw new NotFoundException(`Org unit ${orgUnitId} not found`);
        }
    }

    private async assertActiveOrgExists(orgUnitId: string | null): Promise<void> {
        if (!orgUnitId) {
            return;
        }

        const orgUnit = await this.leadRepository.findOrgUnitById(orgUnitId);
        if (!orgUnit) {
            throw new NotFoundException(`Org unit ${orgUnitId} not found`);
        }
        if (orgUnit.isActive === false) {
            throw new BadRequestException(`Org unit ${orgUnitId} is not active`);
        }
    }

    private async applyLeadOwnerAssignment(input: {
        lead: Lead;
        operatorUserId: string;
        ownerUserId: string;
        ownerOrgId: string | null;
        assignmentType: LeadOwnerAssignmentType;
        reason: string | null;
    }): Promise<LeadOwnerAssignmentResult> {
        const previousOwnerUserId = input.lead.ownerUserId ?? null;
        const previousOwnerOrgId = input.lead.ownerOrgId ?? null;
        const now = new Date();
        const record = this.leadRepository.createLeadOwnerAssignmentRecord({
            id: randomUUID(),
            leadId: input.lead.id,
            previousOwnerOrgId,
            previousOwnerUserId,
            newOwnerOrgId: input.ownerOrgId,
            newOwnerUserId: input.ownerUserId,
            assignmentType: input.assignmentType,
            reason: input.reason,
            assignedAt: now,
            assignedBy: input.operatorUserId,
            createdAt: now,
            createdBy: input.operatorUserId
        });

        input.lead.ownerUserId = input.ownerUserId;
        input.lead.ownerOrgId = input.ownerOrgId;
        input.lead.updatedBy = input.operatorUserId;
        await this.refreshLeadScore(input.lead);

        await this.leadRepository.saveLeadOwnerAssignment({
            lead: input.lead,
            record
        });
        await this.leadScoreService.recordSystemSnapshot(input.lead, `${input.assignmentType}-lead-owner`, input.operatorUserId, record.id);

        return this.mapLeadOwnerAssignmentResult(input.lead, record);
    }

    private assertExpectedVersion(currentVersion: number, expectedVersion: number | undefined, targetType: string): void {
        if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
            throw new ConflictException(`${targetType} version ${expectedVersion} does not match current version ${currentVersion}`);
        }
    }

    private mapLeadOwnerAssignmentResult(lead: Lead, record: LeadOwnerAssignmentRecord): LeadOwnerAssignmentResult {
        return {
            targetId: lead.id,
            leadOwnerAssignmentRecordId: record.id,
            previousOwnerUserId: record.previousOwnerUserId ?? null,
            previousOwnerOrgId: record.previousOwnerOrgId ?? null,
            newOwnerUserId: record.newOwnerUserId,
            newOwnerOrgId: record.newOwnerOrgId ?? null,
            assignmentType: record.assignmentType,
            businessStatusAfter: lead.status
        };
    }

    private async refreshLeadScore(lead: Lead, entityManager?: EntityManager): Promise<void> {
        const facts = await this.leadScoreFactsService.collectLeadScoreFacts(lead.id, entityManager);
        const snapshot = calculateLeadScore(lead, facts);
        lead.score = snapshot.score;
        lead.rating = snapshot.rating;
        lead.scoreReason = snapshot.scoreReason;
        lead.scoreUpdatedAt = new Date();
    }
}
