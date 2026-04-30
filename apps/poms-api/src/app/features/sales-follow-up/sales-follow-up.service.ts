import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateSalesFollowUpRecordRequest, ReplaceSalesFollowUpRecordRequest, SalesFollowUpRecordListQuery, SalesFollowUpRecordSummary, VoidSalesFollowUpRecordRequest } from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { Customer } from '../customer/customer.entity';
import { CustomerService } from '../customer/customer.service';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { mapSalesFollowUpRecordToSummary } from './sales-follow-up.mapper';
import { SalesFollowUpRecord } from './sales-follow-up-record.entity';
import { SalesFollowUpRepository } from './sales-follow-up.repository';

@Injectable()
export class SalesFollowUpService {
    constructor(
        private readonly salesFollowUpRepository: SalesFollowUpRepository,
        private readonly customerService: CustomerService,
        private readonly runtimeAuditService: RuntimeAuditService
    ) {}

    async listSalesFollowUpRecords(query: SalesFollowUpRecordListQuery): Promise<SalesFollowUpRecordSummary[]> {
        const records = await this.salesFollowUpRepository.findMany(query);
        const context = await this.loadContext(records);

        return records.map((record) =>
            mapSalesFollowUpRecordToSummary(record, {
                customer: context.customerMap.get(record.customerId) ?? null,
                lead: record.leadId ? context.leadMap.get(record.leadId) ?? null : null,
                project: record.projectId ? context.projectMap.get(record.projectId) ?? null : null,
                ownerUser: record.ownerUserId ? context.userMap.get(record.ownerUserId) ?? null : null,
                ownerOrg: record.ownerOrgId ? context.orgMap.get(record.ownerOrgId) ?? null : null,
                voidedByUser: record.voidedBy ? context.userMap.get(record.voidedBy) ?? null : null
            })
        );
    }

    async createSalesFollowUpRecord(input: CreateSalesFollowUpRecordRequest, operatorUserId: string): Promise<SalesFollowUpRecordSummary> {
        const operator = await this.salesFollowUpRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        const customer = await this.customerService.requireActiveCustomer(input.customerId);
        const lead = input.leadId ? await this.requireLead(input.leadId, customer.id) : null;
        const project = input.projectId ? await this.requireProject(input.projectId, customer.id) : null;
        const owner = await this.resolveOwner(input.ownerUserId, input.ownerOrgId, operator, lead, project);

        const record = this.salesFollowUpRepository.create({
            customerId: customer.id,
            leadId: lead?.id ?? null,
            projectId: project?.id ?? null,
            status: 'active',
            followUpType: input.followUpType,
            occurredAt: new Date(input.occurredAt),
            summary: input.summary.trim(),
            detail: input.detail?.trim() || null,
            outcome: input.outcome,
            nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
            ownerUserId: owner.ownerUserId,
            ownerOrgId: owner.ownerOrgId,
            createdBy: operator.id,
            updatedBy: operator.id
        });

        await this.salesFollowUpRepository.save(record);

        return mapSalesFollowUpRecordToSummary(record, {
            customer,
            lead,
            project,
            ownerUser: owner.ownerUser,
            ownerOrg: owner.ownerOrg
        });
    }

    async replaceSalesFollowUpRecord(id: string, input: ReplaceSalesFollowUpRecordRequest, operatorUserId: string, requestId?: string | null): Promise<SalesFollowUpRecordSummary> {
        const operator = await this.requireOperator(operatorUserId);
        const supersededRecord = await this.salesFollowUpRepository.findById(id);
        if (!supersededRecord) {
            throw new NotFoundException(`SalesFollowUpRecord ${id} not found`);
        }

        this.assertExpectedVersion(supersededRecord.rowVersion, input.expectedVersion, 'SalesFollowUpRecord');
        if (supersededRecord.status !== 'active') {
            throw new BadRequestException(`Only active sales follow-up records can be replaced, current status: ${supersededRecord.status}`);
        }

        const [customer, lead, project] = await this.loadRecordAnchors(supersededRecord);
        const owner = await this.resolveReplacementOwner(input.ownerUserId, input.ownerOrgId, supersededRecord, operator, lead, project);
        const replacementId = randomUUID();
        const beforeSnapshot = this.auditSnapshot(supersededRecord);

        supersededRecord.status = 'superseded';
        supersededRecord.replacedByRecordId = replacementId;
        supersededRecord.updatedBy = operator.id;

        const replacementRecord = this.salesFollowUpRepository.create({
            id: replacementId,
            customerId: supersededRecord.customerId,
            leadId: supersededRecord.leadId ?? null,
            projectId: supersededRecord.projectId ?? null,
            status: 'active',
            followUpType: input.followUpType,
            occurredAt: new Date(input.occurredAt),
            summary: input.summary.trim(),
            detail: input.detail?.trim() || null,
            outcome: input.outcome,
            nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
            ownerUserId: owner.ownerUserId,
            ownerOrgId: owner.ownerOrgId,
            supersedesRecordId: supersededRecord.id,
            replacementReason: input.replacementReason.trim(),
            createdBy: operator.id,
            updatedBy: operator.id
        });

        await this.salesFollowUpRepository.saveReplacement({ supersededRecord, replacementRecord });
        await this.recordAudit('sales_follow_up.replaced', supersededRecord.id, operator.id, requestId, {
            replacementId: replacementRecord.id,
            replacementReason: replacementRecord.replacementReason,
            before: beforeSnapshot,
            after: this.auditSnapshot(replacementRecord)
        });

        return mapSalesFollowUpRecordToSummary(replacementRecord, {
            customer,
            lead,
            project,
            ownerUser: owner.ownerUser,
            ownerOrg: owner.ownerOrg,
            voidedByUser: null
        });
    }

    async voidSalesFollowUpRecord(id: string, input: VoidSalesFollowUpRecordRequest, operatorUserId: string, requestId?: string | null): Promise<SalesFollowUpRecordSummary> {
        const operator = await this.requireOperator(operatorUserId);
        const record = await this.salesFollowUpRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`SalesFollowUpRecord ${id} not found`);
        }

        this.assertExpectedVersion(record.rowVersion, input.expectedVersion, 'SalesFollowUpRecord');
        if (record.status !== 'active') {
            throw new BadRequestException(`Only active sales follow-up records can be voided, current status: ${record.status}`);
        }

        const [customer, lead, project] = await this.loadRecordAnchors(record);
        const ownerUser = record.ownerUserId ? await this.salesFollowUpRepository.findPlatformUserById(record.ownerUserId) : null;
        const ownerOrg = record.ownerOrgId ? await this.salesFollowUpRepository.findOrgUnitById(record.ownerOrgId) : null;
        const beforeSnapshot = this.auditSnapshot(record);

        record.status = 'voided';
        record.voidedAt = new Date();
        record.voidedBy = operator.id;
        record.voidReason = this.appendComment(input.reason.trim(), input.comment);
        record.updatedBy = operator.id;

        await this.salesFollowUpRepository.save(record);
        await this.recordAudit('sales_follow_up.voided', record.id, operator.id, requestId, {
            reason: record.voidReason,
            before: beforeSnapshot,
            after: this.auditSnapshot(record)
        });

        return mapSalesFollowUpRecordToSummary(record, {
            customer,
            lead,
            project,
            ownerUser,
            ownerOrg,
            voidedByUser: operator
        });
    }

    private async requireOperator(operatorUserId: string): Promise<PlatformUser> {
        const operator = await this.salesFollowUpRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }
        return operator;
    }

    private async loadRecordAnchors(record: SalesFollowUpRecord): Promise<[Customer, Lead | null, Project | null]> {
        const customer = await this.salesFollowUpRepository.findCustomerById(record.customerId);
        if (!customer) {
            throw new NotFoundException(`Customer ${record.customerId} not found`);
        }

        const lead = record.leadId ? await this.requireLead(record.leadId, record.customerId) : null;
        const project = record.projectId ? await this.requireProject(record.projectId, record.customerId) : null;
        return [customer, lead, project];
    }

    private async requireLead(id: string, customerId: string): Promise<Lead> {
        const lead = await this.salesFollowUpRepository.findLeadById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }

        if (lead.customerId !== customerId) {
            throw new BadRequestException(`Lead ${id} does not belong to customer ${customerId}`);
        }

        return lead;
    }

    private async requireProject(id: string, customerId: string): Promise<Project> {
        const project = await this.salesFollowUpRepository.findProjectById(id);
        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        if (project.customerId !== customerId) {
            throw new BadRequestException(`Project ${id} does not belong to customer ${customerId}`);
        }

        return project;
    }

    private async resolveOwner(
        ownerUserId: string | null | undefined,
        ownerOrgId: string | null | undefined,
        operator: PlatformUser,
        lead: Lead | null,
        project: Project | null
    ): Promise<{ ownerUserId: string | null; ownerOrgId: string | null; ownerUser: PlatformUser | null; ownerOrg: OrgUnit | null }> {
        const defaultOwnerUserId = project?.ownerUserId ?? lead?.ownerUserId ?? operator.id;
        const defaultOwnerOrgId = project?.ownerOrgId ?? lead?.ownerOrgId ?? operator.primaryOrgUnitId ?? null;
        const resolvedOwnerUserId = ownerUserId === undefined ? defaultOwnerUserId : ownerUserId;
        const ownerUser = resolvedOwnerUserId ? await this.salesFollowUpRepository.findPlatformUserById(resolvedOwnerUserId) : null;

        if (resolvedOwnerUserId && !ownerUser) {
            throw new NotFoundException(`Platform user ${resolvedOwnerUserId} not found`);
        }

        const resolvedOwnerOrgId = ownerOrgId === undefined ? ownerUser?.primaryOrgUnitId ?? defaultOwnerOrgId : ownerOrgId;
        const ownerOrg = resolvedOwnerOrgId ? await this.salesFollowUpRepository.findOrgUnitById(resolvedOwnerOrgId) : null;

        if (resolvedOwnerOrgId && !ownerOrg) {
            throw new NotFoundException(`Org unit ${resolvedOwnerOrgId} not found`);
        }

        return {
            ownerUserId: ownerUser?.id ?? null,
            ownerOrgId: ownerOrg?.id ?? null,
            ownerUser,
            ownerOrg
        };
    }

    private async resolveReplacementOwner(
        ownerUserId: string | null | undefined,
        ownerOrgId: string | null | undefined,
        currentRecord: SalesFollowUpRecord,
        operator: PlatformUser,
        lead: Lead | null,
        project: Project | null
    ): Promise<{ ownerUserId: string | null; ownerOrgId: string | null; ownerUser: PlatformUser | null; ownerOrg: OrgUnit | null }> {
        const resolvedOwnerUserId = ownerUserId === undefined ? currentRecord.ownerUserId : ownerUserId;
        const ownerUser = resolvedOwnerUserId ? await this.salesFollowUpRepository.findPlatformUserById(resolvedOwnerUserId) : null;

        if (resolvedOwnerUserId && !ownerUser) {
            throw new NotFoundException(`Platform user ${resolvedOwnerUserId} not found`);
        }

        const defaultOwnerOrgId =
            ownerUser?.primaryOrgUnitId ??
            (ownerUserId === undefined ? currentRecord.ownerOrgId : null) ??
            project?.ownerOrgId ??
            lead?.ownerOrgId ??
            operator.primaryOrgUnitId ??
            null;
        const resolvedOwnerOrgId = ownerOrgId === undefined ? defaultOwnerOrgId : ownerOrgId;
        const ownerOrg = resolvedOwnerOrgId ? await this.salesFollowUpRepository.findOrgUnitById(resolvedOwnerOrgId) : null;

        if (resolvedOwnerOrgId && !ownerOrg) {
            throw new NotFoundException(`Org unit ${resolvedOwnerOrgId} not found`);
        }

        return {
            ownerUserId: ownerUser?.id ?? null,
            ownerOrgId: ownerOrg?.id ?? null,
            ownerUser,
            ownerOrg
        };
    }

    private async loadContext(records: SalesFollowUpRecord[]): Promise<{
        customerMap: Map<string, Customer>;
        leadMap: Map<string, Lead>;
        projectMap: Map<string, Project>;
        userMap: Map<string, PlatformUser>;
        orgMap: Map<string, OrgUnit>;
    }> {
        const customerIds = [...new Set(records.map((record) => record.customerId))];
        const leadIds = [...new Set(records.map((record) => record.leadId).filter((id): id is string => Boolean(id)))];
        const projectIds = [...new Set(records.map((record) => record.projectId).filter((id): id is string => Boolean(id)))];
        const ownerUserIds = [
            ...new Set([
                ...records.map((record) => record.ownerUserId).filter((id): id is string => Boolean(id)),
                ...records.map((record) => record.voidedBy).filter((id): id is string => Boolean(id))
            ])
        ];
        const ownerOrgIds = [...new Set(records.map((record) => record.ownerOrgId).filter((id): id is string => Boolean(id)))];

        const [customers, leads, projects, users, orgs] = await Promise.all([
            this.salesFollowUpRepository.findCustomersByIds(customerIds),
            this.salesFollowUpRepository.findLeadsByIds(leadIds),
            this.salesFollowUpRepository.findProjectsByIds(projectIds),
            this.salesFollowUpRepository.findPlatformUsersByIds(ownerUserIds),
            this.salesFollowUpRepository.findOrgUnitsByIds(ownerOrgIds)
        ]);

        return {
            customerMap: new Map(customers.map((customer) => [customer.id, customer])),
            leadMap: new Map(leads.map((lead) => [lead.id, lead])),
            projectMap: new Map(projects.map((project) => [project.id, project])),
            userMap: new Map(users.map((user) => [user.id, user])),
            orgMap: new Map(orgs.map((org) => [org.id, org]))
        };
    }

    private assertExpectedVersion(currentVersion: number, expectedVersion: number | undefined, targetType: string): void {
        if (expectedVersion === undefined) {
            throw new BadRequestException(`${targetType} expectedVersion is required`);
        }

        if (currentVersion !== expectedVersion) {
            throw new ConflictException(`${targetType} version ${expectedVersion} does not match current version ${currentVersion}`);
        }
    }

    private appendComment(value: string, comment: string | null | undefined): string {
        const suffix = comment?.trim();
        return suffix ? `${value}: ${suffix}` : value;
    }

    private auditSnapshot(record: SalesFollowUpRecord): Record<string, unknown> {
        return {
            customerId: record.customerId,
            leadId: record.leadId ?? null,
            projectId: record.projectId ?? null,
            status: record.status,
            followUpType: record.followUpType,
            occurredAt: record.occurredAt.toISOString(),
            summary: record.summary,
            outcome: record.outcome,
            nextFollowUpAt: record.nextFollowUpAt?.toISOString() ?? null,
            ownerUserId: record.ownerUserId ?? null,
            ownerOrgId: record.ownerOrgId ?? null,
            supersedesId: record.supersedesRecordId ?? null,
            replacedById: record.replacedByRecordId ?? null,
            replacementReason: record.replacementReason ?? null,
            voidedAt: record.voidedAt?.toISOString() ?? null,
            voidedBy: record.voidedBy ?? null,
            voidReason: record.voidReason ?? null,
            rowVersion: record.rowVersion
        };
    }

    private async recordAudit(eventType: string, targetId: string, operatorId: string, requestId: string | null | undefined, metadata: Record<string, unknown>): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType,
            targetType: 'sales_follow_up_record',
            targetId,
            operatorId,
            requestId: requestId ?? null,
            result: 'success',
            metadata
        });
    }
}
