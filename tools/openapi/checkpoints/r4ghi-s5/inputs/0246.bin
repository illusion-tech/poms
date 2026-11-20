import { randomUUID } from 'node:crypto';
import type { EntityManager } from '@mikro-orm/core';
import { Inject, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
    CompetitorPositionValue,
    CustomerContactGenderValue,
    CustomerContactStatusValue,
    CustomerPreferenceValue,
    OpportunityStakeholderAccessLevelValue,
    OpportunityStakeholderAttitudeValue,
    OpportunityStakeholderInfluenceLevelValue,
    OpportunityStakeholderRoleValue,
    SalesIntelligenceGapItemLabel,
    SalesIntelligenceGapItemValue,
    SalesIntelligenceGapSeverityValue,
    WinProbabilityLevelValue
} from '@poms/shared-contracts';
import type {
    CompetitorIntelligenceRecordSummary,
    CreateCompetitorIntelligenceRecordRequest,
    CreateCustomerContactRequest,
    CreateOpportunityStakeholderRequest,
    CreateSalesDiscoveryRecordRequest,
    CustomerContactSummary,
    OpportunityContextQuery,
    OpportunityStakeholderSummary,
    SalesDiscoveryRecordSummary,
    SalesIntelligenceGapItem,
    SalesIntelligenceGapSeverity,
    SalesIntelligenceGapSummary,
    UpdateCompetitorIntelligenceRecordRequest,
    UpdateCustomerContactRequest,
    UpdateOpportunityStakeholderRequest,
    UpdateSalesDiscoveryRecordRequest
} from '@poms/shared-contracts';
import type { AuditSnapshot } from '../../core/runtime-audit/audit-log.entity';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';
import { CompetitorIntelligenceRecord, CustomerContact, OpportunityStakeholder, SalesDiscoveryRecord } from './sales-intelligence.entity';
import { SalesIntelligenceRepository } from './sales-intelligence.repository';

const CUSTOMER_CONTACT_AUDIT_FIELDS = ['name', 'gender', 'department', 'title', 'workPhone', 'mobile', 'wechat', 'email', 'remark', 'status'] as const;
type CustomerContactAuditField = (typeof CUSTOMER_CONTACT_AUDIT_FIELDS)[number];
const CUSTOMER_CONTACT_AUDIT_REDACTED_FIELDS: ReadonlySet<string> = new Set<CustomerContactAuditField>(['workPhone', 'mobile', 'wechat', 'email', 'remark']);

const STAKEHOLDER_AUDIT_FIELDS = ['role', 'attitude', 'influenceLevel', 'accessLevel', 'focusAreas', 'communicationNotes', 'isPrimary'] as const;
type StakeholderAuditField = (typeof STAKEHOLDER_AUDIT_FIELDS)[number];
const STAKEHOLDER_AUDIT_REDACTED_FIELDS: ReadonlySet<string> = new Set<StakeholderAuditField>(['focusAreas', 'communicationNotes']);

const COMPETITOR_AUDIT_FIELDS = ['competitorName', 'position', 'customerPreference', 'competitorStrengths', 'competitorWeaknesses', 'ourAdvantages', 'ourRisks', 'winProbability', 'evidence'] as const;
type CompetitorAuditField = (typeof COMPETITOR_AUDIT_FIELDS)[number];
const COMPETITOR_AUDIT_REDACTED_FIELDS: ReadonlySet<string> = new Set<CompetitorAuditField>(['competitorStrengths', 'competitorWeaknesses', 'ourAdvantages', 'ourRisks', 'evidence']);

const DISCOVERY_AUDIT_FIELDS = ['procurementProcess', 'budgetSource', 'customerPainPoints', 'decisionCycle', 'nextContactPlan', 'remark'] as const;
type DiscoveryAuditField = (typeof DISCOVERY_AUDIT_FIELDS)[number];
const DISCOVERY_AUDIT_REDACTED_FIELDS: ReadonlySet<string> = new Set<DiscoveryAuditField>(DISCOVERY_AUDIT_FIELDS);

@Injectable()
export class SalesIntelligenceService {
    constructor(
        @Inject(SalesIntelligenceRepository) private readonly salesIntelligenceRepository: SalesIntelligenceRepository,
        @Inject(RuntimeAuditService) private readonly runtimeAuditService: RuntimeAuditService
    ) {}

    async listCustomerContacts(customerId: string): Promise<CustomerContactSummary[]> {
        const customer = await this.requireCustomer(customerId);
        const contacts = await this.salesIntelligenceRepository.listCustomerContacts(customer.id);
        return contacts.map((contact) => this.mapCustomerContact(contact, customer));
    }

    async createCustomerContact(input: CreateCustomerContactRequest, operatorUserId: string): Promise<CustomerContactSummary> {
        const customer = await this.requireCustomer(input.customerId);
        const contact = this.salesIntelligenceRepository.createCustomerContact({
            id: randomUUID(),
            customerId: customer.id,
            name: input.name.trim(),
            gender: input.gender ?? CustomerContactGenderValue.Unknown,
            department: this.optionalText(input.department),
            title: this.optionalText(input.title),
            workPhone: this.optionalText(input.workPhone),
            mobile: this.optionalText(input.mobile),
            wechat: this.optionalText(input.wechat),
            email: input.email ?? null,
            remark: this.optionalText(input.remark),
            status: CustomerContactStatusValue.Active,
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        await this.salesIntelligenceRepository.saveCustomerContact(contact);
        return this.mapCustomerContact(contact, customer);
    }

    async updateCustomerContact(id: string, input: UpdateCustomerContactRequest, operatorUserId: string, requestId?: string | null): Promise<CustomerContactSummary> {
        return this.salesIntelligenceRepository.getEntityManager().transactional(async (em) => {
            const contact = await this.requireContact(id, em);
            const customer = await this.requireCustomer(contact.customerId, em);
            const beforeValues = this.buildCustomerContactAuditValues(contact);

            if (input.name !== undefined) {
                contact.name = input.name.trim();
            }
            if (input.gender !== undefined) {
                contact.gender = input.gender;
            }
            if (input.department !== undefined) {
                contact.department = this.optionalText(input.department);
            }
            if (input.title !== undefined) {
                contact.title = this.optionalText(input.title);
            }
            if (input.workPhone !== undefined) {
                contact.workPhone = this.optionalText(input.workPhone);
            }
            if (input.mobile !== undefined) {
                contact.mobile = this.optionalText(input.mobile);
            }
            if (input.wechat !== undefined) {
                contact.wechat = this.optionalText(input.wechat);
            }
            if (input.email !== undefined) {
                contact.email = input.email ?? null;
            }
            if (input.remark !== undefined) {
                contact.remark = this.optionalText(input.remark);
            }
            if (input.status !== undefined) {
                contact.status = input.status;
            }

            const afterValues = this.buildCustomerContactAuditValues(contact);
            const changedFields = this.collectAuditChangedFields(CUSTOMER_CONTACT_AUDIT_FIELDS, beforeValues, afterValues);
            if (changedFields.length === 0) {
                return this.mapCustomerContact(contact, customer);
            }

            contact.updatedBy = operatorUserId;
            em.persist(contact);
            await this.recordSalesFactFieldAudit({
                eventType: 'customer-contact.updated',
                targetType: 'customer-contact',
                targetId: contact.id,
                operatorUserId,
                requestId,
                beforeValues,
                afterValues,
                changedFields,
                redactedFields: CUSTOMER_CONTACT_AUDIT_REDACTED_FIELDS,
                sourceCommand: 'update-customer-contact',
                businessContext: {
                    customerId: contact.customerId
                },
                entityManager: em
            });
            await em.flush();
            return this.mapCustomerContact(contact, customer);
        });
    }

    async listOpportunityStakeholders(query: OpportunityContextQuery): Promise<OpportunityStakeholderSummary[]> {
        await this.requireOpportunityContext(query);
        const stakeholders = await this.salesIntelligenceRepository.listOpportunityStakeholders(query);
        const context = await this.loadContext(stakeholders);
        return stakeholders.map((stakeholder) => this.mapStakeholder(stakeholder, context));
    }

    async createOpportunityStakeholder(input: CreateOpportunityStakeholderRequest, operatorUserId: string): Promise<OpportunityStakeholderSummary> {
        const context = await this.requireOpportunityContext(input);
        const contact = await this.requireContact(input.contactId);
        if (contact.customerId !== input.customerId) {
            throw new BadRequestException(`Contact ${contact.id} does not belong to customer ${input.customerId}`);
        }

        const stakeholder = this.salesIntelligenceRepository.createOpportunityStakeholder({
            id: randomUUID(),
            customerId: context.customer.id,
            leadId: context.lead?.id ?? null,
            projectId: context.project?.id ?? null,
            contactId: contact.id,
            role: input.role,
            attitude: input.attitude ?? OpportunityStakeholderAttitudeValue.Unknown,
            influenceLevel: input.influenceLevel ?? OpportunityStakeholderInfluenceLevelValue.Unknown,
            accessLevel: input.accessLevel ?? OpportunityStakeholderAccessLevelValue.Unknown,
            focusAreas: input.focusAreas ?? [],
            communicationNotes: this.optionalText(input.communicationNotes),
            isPrimary: input.isPrimary ?? false,
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        await this.salesIntelligenceRepository.saveOpportunityStakeholder(stakeholder);
        return this.mapStakeholder(stakeholder, {
            customerMap: new Map([[context.customer.id, context.customer]]),
            leadMap: context.lead ? new Map([[context.lead.id, context.lead]]) : new Map(),
            projectMap: context.project ? new Map([[context.project.id, context.project]]) : new Map(),
            contactMap: new Map([[contact.id, contact]])
        });
    }

    async updateOpportunityStakeholder(id: string, input: UpdateOpportunityStakeholderRequest, operatorUserId: string, requestId?: string | null): Promise<OpportunityStakeholderSummary> {
        return this.salesIntelligenceRepository.getEntityManager().transactional(async (em) => {
            const stakeholder = await this.requireStakeholder(id, em);
            const beforeValues = this.buildStakeholderAuditValues(stakeholder);

            if (input.role !== undefined) {
                stakeholder.role = input.role;
            }
            if (input.attitude !== undefined) {
                stakeholder.attitude = input.attitude;
            }
            if (input.influenceLevel !== undefined) {
                stakeholder.influenceLevel = input.influenceLevel;
            }
            if (input.accessLevel !== undefined) {
                stakeholder.accessLevel = input.accessLevel;
            }
            if (input.focusAreas !== undefined) {
                stakeholder.focusAreas = input.focusAreas;
            }
            if (input.communicationNotes !== undefined) {
                stakeholder.communicationNotes = this.optionalText(input.communicationNotes);
            }
            if (input.isPrimary !== undefined) {
                stakeholder.isPrimary = input.isPrimary;
            }

            const afterValues = this.buildStakeholderAuditValues(stakeholder);
            const changedFields = this.collectAuditChangedFields(STAKEHOLDER_AUDIT_FIELDS, beforeValues, afterValues);
            const context = await this.loadContext([stakeholder]);
            if (changedFields.length === 0) {
                return this.mapStakeholder(stakeholder, context);
            }

            stakeholder.updatedBy = operatorUserId;
            em.persist(stakeholder);
            await this.recordSalesFactFieldAudit({
                eventType: 'opportunity-stakeholder.updated',
                targetType: 'opportunity-stakeholder',
                targetId: stakeholder.id,
                operatorUserId,
                requestId,
                beforeValues,
                afterValues,
                changedFields,
                redactedFields: STAKEHOLDER_AUDIT_REDACTED_FIELDS,
                sourceCommand: 'update-opportunity-stakeholder',
                businessContext: {
                    customerId: stakeholder.customerId,
                    leadId: stakeholder.leadId ?? null,
                    projectId: stakeholder.projectId ?? null,
                    contactId: stakeholder.contactId
                },
                entityManager: em
            });
            await em.flush();
            return this.mapStakeholder(stakeholder, context);
        });
    }

    async listCompetitorIntelligenceRecords(query: OpportunityContextQuery): Promise<CompetitorIntelligenceRecordSummary[]> {
        await this.requireOpportunityContext(query);
        const records = await this.salesIntelligenceRepository.listCompetitorRecords(query);
        const context = await this.loadContext(records);
        return records.map((record) => this.mapCompetitorRecord(record, context));
    }

    async createCompetitorIntelligenceRecord(input: CreateCompetitorIntelligenceRecordRequest, operatorUserId: string): Promise<CompetitorIntelligenceRecordSummary> {
        const context = await this.requireOpportunityContext(input);
        const record = this.salesIntelligenceRepository.createCompetitorRecord({
            id: randomUUID(),
            customerId: context.customer.id,
            leadId: context.lead?.id ?? null,
            projectId: context.project?.id ?? null,
            competitorName: input.competitorName.trim(),
            position: input.position ?? CompetitorPositionValue.Unknown,
            customerPreference: input.customerPreference ?? CustomerPreferenceValue.Unknown,
            competitorStrengths: this.optionalText(input.competitorStrengths),
            competitorWeaknesses: this.optionalText(input.competitorWeaknesses),
            ourAdvantages: this.optionalText(input.ourAdvantages),
            ourRisks: this.optionalText(input.ourRisks),
            winProbability: input.winProbability ?? WinProbabilityLevelValue.Unknown,
            evidence: this.optionalText(input.evidence),
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        await this.salesIntelligenceRepository.saveCompetitorRecord(record);
        return this.mapCompetitorRecord(record, this.contextFromOpportunity(context));
    }

    async updateCompetitorIntelligenceRecord(id: string, input: UpdateCompetitorIntelligenceRecordRequest, operatorUserId: string, requestId?: string | null): Promise<CompetitorIntelligenceRecordSummary> {
        return this.salesIntelligenceRepository.getEntityManager().transactional(async (em) => {
            const record = await this.requireCompetitorRecord(id, em);
            const beforeValues = this.buildCompetitorAuditValues(record);
            if (input.competitorName !== undefined) {
                record.competitorName = input.competitorName.trim();
            }
            if (input.position !== undefined) {
                record.position = input.position;
            }
            if (input.customerPreference !== undefined) {
                record.customerPreference = input.customerPreference;
            }
            if (input.competitorStrengths !== undefined) {
                record.competitorStrengths = this.optionalText(input.competitorStrengths);
            }
            if (input.competitorWeaknesses !== undefined) {
                record.competitorWeaknesses = this.optionalText(input.competitorWeaknesses);
            }
            if (input.ourAdvantages !== undefined) {
                record.ourAdvantages = this.optionalText(input.ourAdvantages);
            }
            if (input.ourRisks !== undefined) {
                record.ourRisks = this.optionalText(input.ourRisks);
            }
            if (input.winProbability !== undefined) {
                record.winProbability = input.winProbability;
            }
            if (input.evidence !== undefined) {
                record.evidence = this.optionalText(input.evidence);
            }

            const afterValues = this.buildCompetitorAuditValues(record);
            const changedFields = this.collectAuditChangedFields(COMPETITOR_AUDIT_FIELDS, beforeValues, afterValues);
            const context = await this.loadContext([record]);
            if (changedFields.length === 0) {
                return this.mapCompetitorRecord(record, context);
            }

            record.updatedBy = operatorUserId;
            em.persist(record);
            await this.recordSalesFactFieldAudit({
                eventType: 'competitor-intelligence.updated',
                targetType: 'competitor-intelligence',
                targetId: record.id,
                operatorUserId,
                requestId,
                beforeValues,
                afterValues,
                changedFields,
                redactedFields: COMPETITOR_AUDIT_REDACTED_FIELDS,
                sourceCommand: 'update-competitor-intelligence-record',
                businessContext: {
                    customerId: record.customerId,
                    leadId: record.leadId ?? null,
                    projectId: record.projectId ?? null
                },
                entityManager: em
            });
            await em.flush();
            return this.mapCompetitorRecord(record, context);
        });
    }

    async listSalesDiscoveryRecords(query: OpportunityContextQuery): Promise<SalesDiscoveryRecordSummary[]> {
        await this.requireOpportunityContext(query);
        const records = await this.salesIntelligenceRepository.listDiscoveryRecords(query);
        const context = await this.loadContext(records);
        return records.map((record) => this.mapDiscoveryRecord(record, context));
    }

    async createSalesDiscoveryRecord(input: CreateSalesDiscoveryRecordRequest, operatorUserId: string): Promise<SalesDiscoveryRecordSummary> {
        const context = await this.requireOpportunityContext(input);
        const record = this.salesIntelligenceRepository.createDiscoveryRecord({
            id: randomUUID(),
            customerId: context.customer.id,
            leadId: context.lead?.id ?? null,
            projectId: context.project?.id ?? null,
            procurementProcess: this.optionalText(input.procurementProcess),
            budgetSource: this.optionalText(input.budgetSource),
            customerPainPoints: this.optionalText(input.customerPainPoints),
            decisionCycle: this.optionalText(input.decisionCycle),
            nextContactPlan: this.optionalText(input.nextContactPlan),
            remark: this.optionalText(input.remark),
            createdBy: operatorUserId,
            updatedBy: operatorUserId
        });

        await this.salesIntelligenceRepository.saveDiscoveryRecord(record);
        return this.mapDiscoveryRecord(record, this.contextFromOpportunity(context));
    }

    async updateSalesDiscoveryRecord(id: string, input: UpdateSalesDiscoveryRecordRequest, operatorUserId: string, requestId?: string | null): Promise<SalesDiscoveryRecordSummary> {
        return this.salesIntelligenceRepository.getEntityManager().transactional(async (em) => {
            const record = await this.requireDiscoveryRecord(id, em);
            const beforeValues = this.buildDiscoveryAuditValues(record);
            if (input.procurementProcess !== undefined) {
                record.procurementProcess = this.optionalText(input.procurementProcess);
            }
            if (input.budgetSource !== undefined) {
                record.budgetSource = this.optionalText(input.budgetSource);
            }
            if (input.customerPainPoints !== undefined) {
                record.customerPainPoints = this.optionalText(input.customerPainPoints);
            }
            if (input.decisionCycle !== undefined) {
                record.decisionCycle = this.optionalText(input.decisionCycle);
            }
            if (input.nextContactPlan !== undefined) {
                record.nextContactPlan = this.optionalText(input.nextContactPlan);
            }
            if (input.remark !== undefined) {
                record.remark = this.optionalText(input.remark);
            }

            const afterValues = this.buildDiscoveryAuditValues(record);
            const changedFields = this.collectAuditChangedFields(DISCOVERY_AUDIT_FIELDS, beforeValues, afterValues);
            const context = await this.loadContext([record]);
            if (changedFields.length === 0) {
                return this.mapDiscoveryRecord(record, context);
            }

            record.updatedBy = operatorUserId;
            em.persist(record);
            await this.recordSalesFactFieldAudit({
                eventType: 'sales-discovery-record.updated',
                targetType: 'sales-discovery-record',
                targetId: record.id,
                operatorUserId,
                requestId,
                beforeValues,
                afterValues,
                changedFields,
                redactedFields: DISCOVERY_AUDIT_REDACTED_FIELDS,
                sourceCommand: 'update-sales-discovery-record',
                businessContext: {
                    customerId: record.customerId,
                    leadId: record.leadId ?? null,
                    projectId: record.projectId ?? null
                },
                entityManager: em
            });
            await em.flush();
            return this.mapDiscoveryRecord(record, context);
        });
    }

    async getSalesIntelligenceGaps(query: OpportunityContextQuery): Promise<SalesIntelligenceGapSummary[]> {
        await this.requireOpportunityContext(query);
        const [stakeholders, competitors, discoveryRecords] = await Promise.all([
            this.salesIntelligenceRepository.listOpportunityStakeholders(query),
            this.salesIntelligenceRepository.listCompetitorRecords(query),
            this.salesIntelligenceRepository.listDiscoveryRecords(query)
        ]);
        const discovery = discoveryRecords[0] ?? null;
        const missing = new Set<SalesIntelligenceGapItem>();

        if (!stakeholders.some((stakeholder) => stakeholder.role === OpportunityStakeholderRoleValue.DecisionMaker)) {
            missing.add(SalesIntelligenceGapItemValue.DecisionMaker);
        }
        if (!stakeholders.some((stakeholder) => stakeholder.role === OpportunityStakeholderRoleValue.TechnicalEvaluator)) {
            missing.add(SalesIntelligenceGapItemValue.TechnicalEvaluator);
        }
        if (!this.hasText(discovery?.procurementProcess)) {
            missing.add(SalesIntelligenceGapItemValue.ProcurementProcess);
        }
        if (!this.hasText(discovery?.budgetSource)) {
            missing.add(SalesIntelligenceGapItemValue.BudgetSource);
        }
        if (competitors.length === 0) {
            missing.add(SalesIntelligenceGapItemValue.Competitor);
        }
        if (!this.hasText(discovery?.customerPainPoints)) {
            missing.add(SalesIntelligenceGapItemValue.PainPoint);
        }
        if (!this.hasText(discovery?.nextContactPlan) && !stakeholders.some((stakeholder) => stakeholder.isPrimary)) {
            missing.add(SalesIntelligenceGapItemValue.NextContact);
        }

        return [...missing].map((item) => this.buildGap(item));
    }

    private async requireCustomer(id: string, entityManager?: EntityManager): Promise<Customer> {
        const customer = await this.salesIntelligenceRepository.findCustomerById(id, entityManager);
        if (!customer) {
            throw new NotFoundException(`Customer ${id} not found`);
        }
        return customer;
    }

    private async requireContact(id: string, entityManager?: EntityManager): Promise<CustomerContact> {
        const contact = await this.salesIntelligenceRepository.findCustomerContactById(id, entityManager);
        if (!contact) {
            throw new NotFoundException(`CustomerContact ${id} not found`);
        }
        return contact;
    }

    private async requireStakeholder(id: string, entityManager?: EntityManager): Promise<OpportunityStakeholder> {
        const stakeholder = await this.salesIntelligenceRepository.findOpportunityStakeholderById(id, entityManager);
        if (!stakeholder) {
            throw new NotFoundException(`OpportunityStakeholder ${id} not found`);
        }
        return stakeholder;
    }

    private async requireCompetitorRecord(id: string, entityManager?: EntityManager): Promise<CompetitorIntelligenceRecord> {
        const record = await this.salesIntelligenceRepository.findCompetitorRecordById(id, entityManager);
        if (!record) {
            throw new NotFoundException(`CompetitorIntelligenceRecord ${id} not found`);
        }
        return record;
    }

    private async requireDiscoveryRecord(id: string, entityManager?: EntityManager): Promise<SalesDiscoveryRecord> {
        const record = await this.salesIntelligenceRepository.findDiscoveryRecordById(id, entityManager);
        if (!record) {
            throw new NotFoundException(`SalesDiscoveryRecord ${id} not found`);
        }
        return record;
    }

    private async requireOpportunityContext(input: OpportunityContextQuery & { customerId?: string }): Promise<{ customer: Customer; lead: Lead | null; project: Project | null }> {
        const [lead, project] = await Promise.all([input.leadId ? this.salesIntelligenceRepository.findLeadById(input.leadId) : null, input.projectId ? this.salesIntelligenceRepository.findProjectById(input.projectId) : null]);
        if (input.leadId && !lead) {
            throw new NotFoundException(`Lead ${input.leadId} not found`);
        }
        if (input.projectId && !project) {
            throw new NotFoundException(`Project ${input.projectId} not found`);
        }

        const customerId = input.customerId ?? project?.customerId ?? lead?.customerId;
        if (!customerId) {
            throw new BadRequestException('Opportunity context must resolve a customer');
        }
        if (lead && lead.customerId !== customerId) {
            throw new BadRequestException(`Lead ${lead.id} does not belong to customer ${customerId}`);
        }
        if (project && project.customerId !== customerId) {
            throw new BadRequestException(`Project ${project.id} does not belong to customer ${customerId}`);
        }

        const customer = await this.requireCustomer(customerId);
        return { customer, lead, project };
    }

    private async loadContext(records: Array<{ customerId: string; leadId?: string | null; projectId?: string | null; contactId?: string | null }>): Promise<{
        customerMap: Map<string, Customer>;
        leadMap: Map<string, Lead>;
        projectMap: Map<string, Project>;
        contactMap: Map<string, CustomerContact>;
    }> {
        const customerIds = [...new Set(records.map((record) => record.customerId))];
        const leadIds = [...new Set(records.map((record) => record.leadId).filter((id): id is string => Boolean(id)))];
        const projectIds = [...new Set(records.map((record) => record.projectId).filter((id): id is string => Boolean(id)))];
        const contactIds = [...new Set(records.map((record) => record.contactId).filter((id): id is string => Boolean(id)))];
        const [customers, leads, projects, contacts] = await Promise.all([
            this.salesIntelligenceRepository.findCustomersByIds(customerIds),
            this.salesIntelligenceRepository.findLeadsByIds(leadIds),
            this.salesIntelligenceRepository.findProjectsByIds(projectIds),
            Promise.all(contactIds.map((id) => this.salesIntelligenceRepository.findCustomerContactById(id))).then((items) => items.filter((item): item is CustomerContact => Boolean(item)))
        ]);

        return {
            customerMap: new Map(customers.map((customer) => [customer.id, customer])),
            leadMap: new Map(leads.map((lead) => [lead.id, lead])),
            projectMap: new Map(projects.map((project) => [project.id, project])),
            contactMap: new Map(contacts.map((contact) => [contact.id, contact]))
        };
    }

    private contextFromOpportunity(context: { customer: Customer; lead: Lead | null; project: Project | null }): {
        customerMap: Map<string, Customer>;
        leadMap: Map<string, Lead>;
        projectMap: Map<string, Project>;
        contactMap: Map<string, CustomerContact>;
    } {
        return {
            customerMap: new Map([[context.customer.id, context.customer]]),
            leadMap: context.lead ? new Map([[context.lead.id, context.lead]]) : new Map(),
            projectMap: context.project ? new Map([[context.project.id, context.project]]) : new Map(),
            contactMap: new Map()
        };
    }

    private buildCustomerContactAuditValues(contact: CustomerContact): Record<CustomerContactAuditField, unknown> {
        return {
            name: contact.name,
            gender: contact.gender,
            department: contact.department ?? null,
            title: contact.title ?? null,
            workPhone: contact.workPhone ?? null,
            mobile: contact.mobile ?? null,
            wechat: contact.wechat ?? null,
            email: contact.email ?? null,
            remark: contact.remark ?? null,
            status: contact.status
        };
    }

    private buildStakeholderAuditValues(stakeholder: OpportunityStakeholder): Record<StakeholderAuditField, unknown> {
        return {
            role: stakeholder.role,
            attitude: stakeholder.attitude,
            influenceLevel: stakeholder.influenceLevel,
            accessLevel: stakeholder.accessLevel,
            focusAreas: stakeholder.focusAreas ?? [],
            communicationNotes: stakeholder.communicationNotes ?? null,
            isPrimary: stakeholder.isPrimary
        };
    }

    private buildCompetitorAuditValues(record: CompetitorIntelligenceRecord): Record<CompetitorAuditField, unknown> {
        return {
            competitorName: record.competitorName,
            position: record.position,
            customerPreference: record.customerPreference,
            competitorStrengths: record.competitorStrengths ?? null,
            competitorWeaknesses: record.competitorWeaknesses ?? null,
            ourAdvantages: record.ourAdvantages ?? null,
            ourRisks: record.ourRisks ?? null,
            winProbability: record.winProbability,
            evidence: record.evidence ?? null
        };
    }

    private buildDiscoveryAuditValues(record: SalesDiscoveryRecord): Record<DiscoveryAuditField, unknown> {
        return {
            procurementProcess: record.procurementProcess ?? null,
            budgetSource: record.budgetSource ?? null,
            customerPainPoints: record.customerPainPoints ?? null,
            decisionCycle: record.decisionCycle ?? null,
            nextContactPlan: record.nextContactPlan ?? null,
            remark: record.remark ?? null
        };
    }

    private collectAuditChangedFields<T extends string>(fields: readonly T[], beforeValues: Record<T, unknown>, afterValues: Record<T, unknown>): T[] {
        return fields.filter((field) => !this.auditValuesEqual(beforeValues[field], afterValues[field]));
    }

    private async recordSalesFactFieldAudit<T extends string>(input: {
        eventType: string;
        targetType: string;
        targetId: string;
        operatorUserId: string;
        requestId?: string | null;
        beforeValues: Record<T, unknown>;
        afterValues: Record<T, unknown>;
        changedFields: readonly T[];
        redactedFields: ReadonlySet<string>;
        sourceCommand: string;
        businessContext: AuditSnapshot;
        entityManager: EntityManager;
    }): Promise<void> {
        await this.runtimeAuditService.recordAuditLog(
            {
                eventType: input.eventType,
                targetType: input.targetType,
                targetId: input.targetId,
                operatorId: input.operatorUserId,
                requestId: input.requestId ?? null,
                result: 'success',
                beforeSnapshot: this.pickAuditSnapshot(input.beforeValues, input.changedFields, input.redactedFields),
                afterSnapshot: this.pickAuditSnapshot(input.afterValues, input.changedFields, input.redactedFields),
                metadata: {
                    changedFields: input.changedFields,
                    sourceCommand: input.sourceCommand,
                    redactedFields: input.changedFields.filter((field) => input.redactedFields.has(field)),
                    businessContext: input.businessContext
                }
            },
            input.entityManager
        );
    }

    private pickAuditSnapshot<T extends string>(values: Record<T, unknown>, fields: readonly T[], redactedFields: ReadonlySet<string>): AuditSnapshot {
        return fields.reduce<AuditSnapshot>((snapshot, field) => {
            snapshot[field] = redactedFields.has(field) ? this.summarizeAuditValue(values[field]) : (values[field] ?? null);
            return snapshot;
        }, {});
    }

    private summarizeAuditValue(value: unknown): AuditSnapshot {
        if (Array.isArray(value)) {
            return {
                changed: true,
                count: value.length
            };
        }
        const text = typeof value === 'string' ? value : '';
        return {
            changed: true,
            present: text.length > 0,
            length: text.length
        };
    }

    private auditValuesEqual(left: unknown, right: unknown): boolean {
        return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
    }

    private mapCustomerContact(contact: CustomerContact, customer: Customer): CustomerContactSummary {
        return {
            id: contact.id,
            customerId: contact.customerId,
            customerName: customer.displayName,
            name: contact.name,
            gender: contact.gender,
            department: contact.department ?? null,
            title: contact.title ?? null,
            workPhone: contact.workPhone ?? null,
            mobile: contact.mobile ?? null,
            wechat: contact.wechat ?? null,
            email: contact.email ?? null,
            remark: contact.remark ?? null,
            status: contact.status,
            rowVersion: contact.rowVersion,
            createdAt: contact.createdAt.toISOString(),
            createdBy: contact.createdBy ?? null,
            updatedAt: contact.updatedAt.toISOString(),
            updatedBy: contact.updatedBy ?? null
        };
    }

    private mapStakeholder(stakeholder: OpportunityStakeholder, context: { customerMap: Map<string, Customer>; leadMap: Map<string, Lead>; projectMap: Map<string, Project>; contactMap: Map<string, CustomerContact> }): OpportunityStakeholderSummary {
        const contact = context.contactMap.get(stakeholder.contactId) ?? null;
        return {
            id: stakeholder.id,
            customerId: stakeholder.customerId,
            customerName: context.customerMap.get(stakeholder.customerId)?.displayName ?? '',
            leadId: stakeholder.leadId ?? null,
            leadName: stakeholder.leadId ? (context.leadMap.get(stakeholder.leadId)?.leadName ?? null) : null,
            projectId: stakeholder.projectId ?? null,
            projectName: stakeholder.projectId ? (context.projectMap.get(stakeholder.projectId)?.projectName ?? null) : null,
            contactId: stakeholder.contactId,
            contactName: contact?.name ?? '',
            contactDepartment: contact?.department ?? null,
            contactTitle: contact?.title ?? null,
            role: stakeholder.role,
            attitude: stakeholder.attitude,
            influenceLevel: stakeholder.influenceLevel,
            accessLevel: stakeholder.accessLevel,
            focusAreas: stakeholder.focusAreas ?? [],
            communicationNotes: stakeholder.communicationNotes ?? null,
            isPrimary: stakeholder.isPrimary,
            rowVersion: stakeholder.rowVersion,
            createdAt: stakeholder.createdAt.toISOString(),
            createdBy: stakeholder.createdBy ?? null,
            updatedAt: stakeholder.updatedAt.toISOString(),
            updatedBy: stakeholder.updatedBy ?? null
        };
    }

    private mapCompetitorRecord(record: CompetitorIntelligenceRecord, context: { customerMap: Map<string, Customer>; leadMap: Map<string, Lead>; projectMap: Map<string, Project> }): CompetitorIntelligenceRecordSummary {
        return {
            id: record.id,
            customerId: record.customerId,
            customerName: context.customerMap.get(record.customerId)?.displayName ?? '',
            leadId: record.leadId ?? null,
            leadName: record.leadId ? (context.leadMap.get(record.leadId)?.leadName ?? null) : null,
            projectId: record.projectId ?? null,
            projectName: record.projectId ? (context.projectMap.get(record.projectId)?.projectName ?? null) : null,
            competitorName: record.competitorName,
            position: record.position,
            customerPreference: record.customerPreference,
            competitorStrengths: record.competitorStrengths ?? null,
            competitorWeaknesses: record.competitorWeaknesses ?? null,
            ourAdvantages: record.ourAdvantages ?? null,
            ourRisks: record.ourRisks ?? null,
            winProbability: record.winProbability,
            evidence: record.evidence ?? null,
            rowVersion: record.rowVersion,
            createdAt: record.createdAt.toISOString(),
            createdBy: record.createdBy ?? null,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy ?? null
        };
    }

    private mapDiscoveryRecord(record: SalesDiscoveryRecord, context: { customerMap: Map<string, Customer>; leadMap: Map<string, Lead>; projectMap: Map<string, Project> }): SalesDiscoveryRecordSummary {
        return {
            id: record.id,
            customerId: record.customerId,
            customerName: context.customerMap.get(record.customerId)?.displayName ?? '',
            leadId: record.leadId ?? null,
            leadName: record.leadId ? (context.leadMap.get(record.leadId)?.leadName ?? null) : null,
            projectId: record.projectId ?? null,
            projectName: record.projectId ? (context.projectMap.get(record.projectId)?.projectName ?? null) : null,
            procurementProcess: record.procurementProcess ?? null,
            budgetSource: record.budgetSource ?? null,
            customerPainPoints: record.customerPainPoints ?? null,
            decisionCycle: record.decisionCycle ?? null,
            nextContactPlan: record.nextContactPlan ?? null,
            remark: record.remark ?? null,
            rowVersion: record.rowVersion,
            createdAt: record.createdAt.toISOString(),
            createdBy: record.createdBy ?? null,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy ?? null
        };
    }

    private buildGap(item: SalesIntelligenceGapItem): SalesIntelligenceGapSummary {
        const severity: SalesIntelligenceGapSeverity =
            item === SalesIntelligenceGapItemValue.DecisionMaker || item === SalesIntelligenceGapItemValue.ProcurementProcess || item === SalesIntelligenceGapItemValue.BudgetSource
                ? SalesIntelligenceGapSeverityValue.SoftBlocker
                : SalesIntelligenceGapSeverityValue.Attention;
        return {
            item,
            label: SalesIntelligenceGapItemLabel[item],
            isMissing: true,
            explanation: SalesIntelligenceGapItemLabel[item],
            severity
        };
    }

    private optionalText(value: string | null | undefined): string | null {
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
    }

    private hasText(value: string | null | undefined): boolean {
        return Boolean(value?.trim());
    }
}
