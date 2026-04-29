import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateSalesFollowUpRecordRequest, SalesFollowUpRecordListQuery, SalesFollowUpRecordSummary } from '@poms/shared-contracts';
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
        private readonly customerService: CustomerService
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
                ownerOrg: record.ownerOrgId ? context.orgMap.get(record.ownerOrgId) ?? null : null
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
        const ownerUserIds = [...new Set(records.map((record) => record.ownerUserId).filter((id): id is string => Boolean(id)))];
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
}
