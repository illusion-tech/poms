import { Inject, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
    CreateCustomerAliasRequest,
    CreateCustomerRequest,
    CustomerAliasSummary,
    CustomerDetailView,
    CustomerListQuery,
    CustomerListView,
    CustomerSummary,
    CustomerWorkspaceActionItem,
    CustomerWorkspaceContractItem,
    CustomerWorkspaceDiscussionItem,
    CustomerWorkspaceFollowUpItem,
    CustomerWorkspaceLeadItem,
    CustomerWorkspaceOverviewView,
    CustomerWorkspaceProjectItem,
    CustomerWorkspaceSummary,
    CustomerWorkspaceTimelineItem,
    UpdateCustomerRequest
} from '@poms/shared-contracts';
import { CustomerAliasTypeValue, CustomerStatusValue } from '@poms/shared-contracts';
import { BusinessNumberService } from '../business-number/business-number.service';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Customer, CustomerAlias } from './customer.entity';
import {
    CustomerRepository,
    type CustomerWorkspaceContractRow,
    type CustomerWorkspaceDiscussionRow,
    type CustomerWorkspaceFollowUpRow,
    type CustomerWorkspaceLeadRow,
    type CustomerWorkspaceProjectRow,
    type CustomerWorkspaceSummaryRow
} from './customer.repository';

@Injectable()
export class CustomerService {
    constructor(
        @Inject(CustomerRepository) private readonly customerRepository: CustomerRepository,
        @Inject(BusinessNumberService) private readonly businessNumberService: BusinessNumberService
    ) {}

    async listCustomers(query: CustomerListQuery): Promise<CustomerListView[]> {
        const customers = await this.customerRepository.findMany(query);
        const context = await this.loadListContext(customers);

        return customers.map((customer) =>
            this.toListView(
                customer,
                customer.ownerUserId ? (context.userMap.get(customer.ownerUserId) ?? null) : null,
                customer.ownerOrgId ? (context.orgUnitMap.get(customer.ownerOrgId) ?? null) : null,
                context.leadCountByCustomerId.get(customer.id) ?? 0,
                context.projectCountByCustomerId.get(customer.id) ?? 0,
                context.contractCountByCustomerId.get(customer.id) ?? 0
            )
        );
    }

    async getCustomer(id: string): Promise<CustomerDetailView> {
        const customer = await this.requireCustomer(id);
        const [aliases, context] = await Promise.all([this.customerRepository.findAliasesByCustomerId(customer.id), this.loadListContext([customer])]);

        return this.toDetailView(
            customer,
            customer.ownerUserId ? (context.userMap.get(customer.ownerUserId) ?? null) : null,
            customer.ownerOrgId ? (context.orgUnitMap.get(customer.ownerOrgId) ?? null) : null,
            context.leadCountByCustomerId.get(customer.id) ?? 0,
            context.projectCountByCustomerId.get(customer.id) ?? 0,
            context.contractCountByCustomerId.get(customer.id) ?? 0,
            aliases
        );
    }

    async getCustomerWorkspaceOverview(id: string): Promise<CustomerWorkspaceOverviewView> {
        const customer = await this.requireCustomer(id);
        const [summary, activeLeads, activeProjects, recentContracts, recentFollowUps, recentDiscussions] = await Promise.all([
            this.customerRepository.getWorkspaceSummary(customer.id),
            this.customerRepository.findWorkspaceActiveLeads(customer.id),
            this.customerRepository.findWorkspaceActiveProjects(customer.id),
            this.customerRepository.findWorkspaceRecentContracts(customer.id),
            this.customerRepository.findWorkspaceRecentFollowUps(customer.id),
            this.customerRepository.findWorkspaceRecentDiscussions(customer.id)
        ]);

        const workspaceSummary = this.toWorkspaceSummary(summary);
        const workspaceLeads = activeLeads.map((row) => this.toWorkspaceLeadItem(row));
        const workspaceProjects = activeProjects.map((row) => this.toWorkspaceProjectItem(row));
        const workspaceContracts = recentContracts.map((row) => this.toWorkspaceContractItem(row));
        const workspaceFollowUps = recentFollowUps.map((row) => this.toWorkspaceFollowUpItem(row));
        const workspaceDiscussions = recentDiscussions.map((row) => this.toWorkspaceDiscussionItem(row));

        return {
            customerId: customer.id,
            summary: workspaceSummary,
            activeLeads: workspaceLeads,
            activeProjects: workspaceProjects,
            recentContracts: workspaceContracts,
            recentFollowUps: workspaceFollowUps,
            recentDiscussions: workspaceDiscussions,
            recommendedActions: this.buildWorkspaceRecommendedActions(customer, workspaceSummary, workspaceLeads, workspaceProjects, workspaceContracts, workspaceFollowUps, workspaceDiscussions),
            timeline: this.buildWorkspaceTimeline(workspaceLeads, workspaceProjects, workspaceContracts, workspaceFollowUps, workspaceDiscussions),
            generatedAt: new Date().toISOString()
        };
    }

    async createCustomer(input: CreateCustomerRequest, operatorUserId: string): Promise<CustomerSummary> {
        const operator = await this.customerRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        const owner = await this.resolveOwner(input.ownerUserId, input.ownerOrgId, operator);
        const now = new Date();

        return this.customerRepository.getEntityManager().transactional(async (em) => {
            const customerNo = await this.businessNumberService.next('customer', now, em);
            const customer = em.create(Customer, {
                id: randomUUID(),
                customerNo,
                displayName: input.displayName,
                legalName: input.legalName?.trim() || null,
                shortName: input.shortName?.trim() || null,
                status: CustomerStatusValue.Active,
                ownerOrgId: owner.ownerOrgId,
                ownerUserId: owner.ownerUserId,
                sourceChannel: input.sourceChannel?.trim() || null,
                remark: input.remark?.trim() || null,
                mergedIntoCustomerId: null,
                createdBy: operator.id,
                updatedBy: operator.id
            });
            const primaryAlias = em.create(CustomerAlias, {
                customerId: customer.id,
                aliasName: customer.displayName,
                aliasType: CustomerAliasTypeValue.Alias,
                normalizedName: this.normalizeCustomerName(customer.displayName),
                isPrimary: true,
                createdBy: operator.id
            });

            em.persist([customer, primaryAlias]);
            await em.flush();
            return this.toSummary(customer);
        });
    }

    async updateCustomer(id: string, input: UpdateCustomerRequest, operatorUserId: string): Promise<CustomerDetailView> {
        const customer = await this.requireCustomer(id);
        if (customer.status === CustomerStatusValue.Merged) {
            throw new BadRequestException(`Customer ${id} is merged and cannot be edited directly`);
        }

        if (input.displayName !== undefined) {
            customer.displayName = input.displayName;
        }
        if (input.legalName !== undefined) {
            customer.legalName = input.legalName?.trim() || null;
        }
        if (input.shortName !== undefined) {
            customer.shortName = input.shortName?.trim() || null;
        }
        if (input.status !== undefined) {
            customer.status = input.status;
        }
        if (input.sourceChannel !== undefined) {
            customer.sourceChannel = input.sourceChannel?.trim() || null;
        }
        if (input.remark !== undefined) {
            customer.remark = input.remark?.trim() || null;
        }
        if (input.ownerUserId !== undefined || input.ownerOrgId !== undefined) {
            const owner = await this.resolveOwnerUpdate(customer, input.ownerUserId, input.ownerOrgId);
            customer.ownerUserId = owner.ownerUserId;
            customer.ownerOrgId = owner.ownerOrgId;
        }

        customer.updatedBy = operatorUserId;
        await this.customerRepository.save(customer);

        return this.getCustomer(id);
    }

    async listAliases(customerId: string): Promise<CustomerAliasSummary[]> {
        await this.requireCustomer(customerId);
        const aliases = await this.customerRepository.findAliasesByCustomerId(customerId);
        return aliases.map((alias) => this.toAliasSummary(alias));
    }

    async createAlias(customerId: string, input: CreateCustomerAliasRequest, operatorUserId: string): Promise<CustomerAliasSummary> {
        const customer = await this.requireCustomer(customerId);
        if (customer.status === CustomerStatusValue.Merged) {
            throw new BadRequestException(`Customer ${customerId} is merged and cannot accept new aliases`);
        }

        const alias = this.customerRepository.createAlias({
            customerId: customer.id,
            aliasName: input.aliasName,
            aliasType: input.aliasType ?? CustomerAliasTypeValue.Alias,
            normalizedName: this.normalizeCustomerName(input.aliasName),
            isPrimary: false,
            createdBy: operatorUserId
        });

        await this.customerRepository.saveAlias(alias);
        return this.toAliasSummary(alias);
    }

    async requireActiveCustomer(id: string): Promise<Customer> {
        const customer = await this.requireCustomer(id);
        if (customer.status !== CustomerStatusValue.Active) {
            throw new BadRequestException(`Customer ${id} is not active`);
        }

        return customer;
    }

    toSummary(customer: Customer): CustomerSummary {
        return {
            id: customer.id,
            customerNo: customer.customerNo,
            displayName: customer.displayName,
            legalName: customer.legalName ?? null,
            shortName: customer.shortName ?? null,
            status: customer.status,
            ownerOrgId: customer.ownerOrgId ?? null,
            ownerUserId: customer.ownerUserId ?? null,
            sourceChannel: customer.sourceChannel ?? null,
            remark: customer.remark ?? null,
            mergedIntoCustomerId: customer.mergedIntoCustomerId ?? null,
            rowVersion: customer.rowVersion,
            createdAt: customer.createdAt.toISOString(),
            createdBy: customer.createdBy ?? null,
            updatedAt: customer.updatedAt.toISOString(),
            updatedBy: customer.updatedBy ?? null
        };
    }

    private async requireCustomer(id: string): Promise<Customer> {
        const customer = await this.customerRepository.findById(id);
        if (!customer) {
            throw new NotFoundException(`Customer ${id} not found`);
        }

        return customer;
    }

    private async loadListContext(customers: Customer[]): Promise<{
        userMap: Map<string, PlatformUser>;
        orgUnitMap: Map<string, OrgUnit>;
        leadCountByCustomerId: Map<string, number>;
        projectCountByCustomerId: Map<string, number>;
        contractCountByCustomerId: Map<string, number>;
    }> {
        const customerIds = customers.map((customer) => customer.id);
        const ownerUserIds = [...new Set(customers.map((customer) => customer.ownerUserId).filter((id): id is string => Boolean(id)))];
        const ownerOrgIds = [...new Set(customers.map((customer) => customer.ownerOrgId).filter((id): id is string => Boolean(id)))];
        const [users, orgUnits, leadCountByCustomerId, projectCountByCustomerId, contractCountByCustomerId] = await Promise.all([
            this.customerRepository.findPlatformUsersByIds(ownerUserIds),
            this.customerRepository.findOrgUnitsByIds(ownerOrgIds),
            this.customerRepository.countLeadsByCustomerIds(customerIds),
            this.customerRepository.countProjectsByCustomerIds(customerIds),
            this.customerRepository.countContractsByCustomerIds(customerIds)
        ]);

        return {
            userMap: new Map(users.map((user) => [user.id, user])),
            orgUnitMap: new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit])),
            leadCountByCustomerId,
            projectCountByCustomerId,
            contractCountByCustomerId
        };
    }

    private toListView(customer: Customer, owner: PlatformUser | null, ownerOrg: OrgUnit | null, leadCount: number, projectCount: number, contractCount: number): CustomerListView {
        return {
            ...this.toSummary(customer),
            ownerName: owner?.displayName ?? null,
            ownerOrgName: ownerOrg?.name ?? null,
            leadCount,
            projectCount,
            contractCount
        };
    }

    private toDetailView(customer: Customer, owner: PlatformUser | null, ownerOrg: OrgUnit | null, leadCount: number, projectCount: number, contractCount: number, aliases: CustomerAlias[]): CustomerDetailView {
        return {
            ...this.toListView(customer, owner, ownerOrg, leadCount, projectCount, contractCount),
            aliases: aliases.map((alias) => this.toAliasSummary(alias))
        };
    }

    private toAliasSummary(alias: CustomerAlias): CustomerAliasSummary {
        return {
            id: alias.id,
            customerId: alias.customerId,
            aliasName: alias.aliasName,
            aliasType: alias.aliasType,
            normalizedName: alias.normalizedName,
            isPrimary: alias.isPrimary,
            createdAt: alias.createdAt.toISOString(),
            createdBy: alias.createdBy ?? null
        };
    }

    private toWorkspaceSummary(row: CustomerWorkspaceSummaryRow): CustomerWorkspaceSummary {
        return {
            leadCount: this.toNumber(row.leadCount),
            activeLeadCount: this.toNumber(row.activeLeadCount),
            convertedLeadCount: this.toNumber(row.convertedLeadCount),
            projectCount: this.toNumber(row.projectCount),
            activeProjectCount: this.toNumber(row.activeProjectCount),
            contractCount: this.toNumber(row.contractCount),
            recentFollowUpCount: this.toNumber(row.recentFollowUpCount),
            recentDiscussionCount: this.toNumber(row.recentDiscussionCount),
            latestFollowUpAt: this.toOptionalIsoDateTime(row.latestFollowUpAt),
            latestDiscussionAt: this.toOptionalIsoDateTime(row.latestDiscussionAt)
        };
    }

    private toWorkspaceLeadItem(row: CustomerWorkspaceLeadRow): CustomerWorkspaceLeadItem {
        return {
            id: row.id,
            leadNo: row.leadNo,
            leadName: row.leadName,
            status: row.status as CustomerWorkspaceLeadItem['status'],
            rating: row.rating as CustomerWorkspaceLeadItem['rating'],
            urgency: row.urgency as CustomerWorkspaceLeadItem['urgency'],
            ownerName: row.ownerName ?? null,
            updatedAt: this.toIsoDateTime(row.updatedAt)
        };
    }

    private toWorkspaceProjectItem(row: CustomerWorkspaceProjectRow): CustomerWorkspaceProjectItem {
        return {
            id: row.id,
            projectNo: row.projectNo,
            projectName: row.projectName,
            status: row.status as CustomerWorkspaceProjectItem['status'],
            currentStage: row.currentStage as CustomerWorkspaceProjectItem['currentStage'],
            ownerName: row.ownerName ?? null,
            plannedSignAt: this.toOptionalIsoDateTime(row.plannedSignAt),
            updatedAt: this.toIsoDateTime(row.updatedAt)
        };
    }

    private toWorkspaceContractItem(row: CustomerWorkspaceContractRow): CustomerWorkspaceContractItem {
        return {
            id: row.id,
            contractNo: row.contractNo,
            customerContractNo: row.customerContractNo ?? null,
            status: row.status as CustomerWorkspaceContractItem['status'],
            projectId: row.projectId,
            projectName: row.projectName,
            signedAt: this.toOptionalIsoDateTime(row.signedAt),
            updatedAt: this.toIsoDateTime(row.updatedAt)
        };
    }

    private toWorkspaceFollowUpItem(row: CustomerWorkspaceFollowUpRow): CustomerWorkspaceFollowUpItem {
        return {
            id: row.id,
            summary: row.summary,
            outcome: row.outcome as CustomerWorkspaceFollowUpItem['outcome'],
            occurredAt: this.toIsoDateTime(row.occurredAt),
            nextFollowUpAt: this.toOptionalIsoDateTime(row.nextFollowUpAt),
            ownerName: row.ownerName ?? null
        };
    }

    private toWorkspaceDiscussionItem(row: CustomerWorkspaceDiscussionRow): CustomerWorkspaceDiscussionItem {
        return {
            id: row.id,
            threadId: row.threadId,
            targetObjectType: row.targetObjectType as CustomerWorkspaceDiscussionItem['targetObjectType'],
            targetObjectId: row.targetObjectId,
            targetTitle: row.targetTitle,
            discussionType: row.discussionType as CustomerWorkspaceDiscussionItem['discussionType'],
            body: row.body,
            isKeyConclusion: Boolean(row.isKeyConclusion),
            createdAt: this.toIsoDateTime(row.createdAt)
        };
    }

    private buildWorkspaceRecommendedActions(
        customer: Customer,
        summary: CustomerWorkspaceSummary,
        activeLeads: CustomerWorkspaceLeadItem[],
        activeProjects: CustomerWorkspaceProjectItem[],
        recentContracts: CustomerWorkspaceContractItem[],
        recentFollowUps: CustomerWorkspaceFollowUpItem[],
        recentDiscussions: CustomerWorkspaceDiscussionItem[]
    ): CustomerWorkspaceActionItem[] {
        const actions: CustomerWorkspaceActionItem[] = [];
        const firstLead = activeLeads[0] ?? null;
        const firstProject = activeProjects[0] ?? null;
        const firstContract = recentContracts[0] ?? null;

        if (summary.activeLeadCount > 0) {
            actions.push({
                key: 'review-active-leads',
                intent: 'open-leads',
                title: '处理活跃线索',
                description: `当前有 ${summary.activeLeadCount} 条活跃线索需要推进，优先查看最近更新的线索。`,
                targetObjectType: 'lead',
                targetObjectId: firstLead?.id ?? null,
                targetTitle: firstLead?.leadName ?? null,
                priority: 10
            });
        }

        if (summary.activeProjectCount > 0) {
            actions.push({
                key: 'advance-active-projects',
                intent: 'open-project-workspace',
                title: '推进进行中项目',
                description: `当前有 ${summary.activeProjectCount} 个进行中项目，优先处理最近更新的项目。`,
                targetObjectType: 'project',
                targetObjectId: firstProject?.id ?? null,
                targetTitle: firstProject?.projectName ?? null,
                priority: 20
            });
        }

        if (summary.contractCount > 0) {
            actions.push({
                key: 'review-recent-contracts',
                intent: 'open-contract',
                title: '复核近期合同',
                description: `当前有 ${summary.contractCount} 份合同记录，查看最近合同状态与项目承接。`,
                targetObjectType: 'contract',
                targetObjectId: firstContract?.id ?? null,
                targetTitle: firstContract?.contractNo ?? null,
                priority: 30
            });
        }

        actions.push({
            key: 'record-follow-up',
            intent: 'record-follow-up',
            title: recentFollowUps.length > 0 ? '记录下一次跟进' : '补充客户跟进',
            description: recentFollowUps.length > 0 ? '沿着最近一次客户沟通继续记录后续动作。' : '当前还没有客户级跟进记录，先补齐第一条互动事实。',
            targetObjectType: 'customer',
            targetObjectId: customer.id,
            targetTitle: customer.displayName,
            priority: 40
        });

        actions.push({
            key: 'capture-discussion',
            intent: 'capture-discussion',
            title: recentDiscussions.length > 0 ? '沉淀关键讨论' : '补充客户讨论',
            description: recentDiscussions.length > 0 ? '把最新共识沉淀到客户讨论，便于跨项目延续。' : '当前还没有客户级讨论记录，先补齐关键背景和共识。',
            targetObjectType: 'customer',
            targetObjectId: customer.id,
            targetTitle: customer.displayName,
            priority: 50
        });

        return actions.sort((left, right) => left.priority - right.priority).slice(0, 5);
    }

    private buildWorkspaceTimeline(
        activeLeads: CustomerWorkspaceLeadItem[],
        activeProjects: CustomerWorkspaceProjectItem[],
        recentContracts: CustomerWorkspaceContractItem[],
        recentFollowUps: CustomerWorkspaceFollowUpItem[],
        recentDiscussions: CustomerWorkspaceDiscussionItem[]
    ): CustomerWorkspaceTimelineItem[] {
        const timeline: CustomerWorkspaceTimelineItem[] = [
            ...activeLeads.map((lead) => ({
                key: `lead:${lead.id}`,
                eventType: 'lead-updated' as const,
                sourceType: 'lead' as const,
                sourceId: lead.id,
                occurredAt: lead.updatedAt,
                title: lead.leadName,
                description: `${lead.leadNo} · ${lead.status} · ${lead.rating} · ${lead.urgency}`,
                actorName: lead.ownerName,
                targetObjectType: 'lead' as const,
                targetObjectId: lead.id,
                targetTitle: lead.leadName,
                isKey: lead.rating === 'A' || lead.urgency === 'high'
            })),
            ...activeProjects.map((project) => ({
                key: `project:${project.id}`,
                eventType: 'project-updated' as const,
                sourceType: 'project' as const,
                sourceId: project.id,
                occurredAt: project.updatedAt,
                title: project.projectName,
                description: `${project.projectNo} · ${project.status} · ${project.currentStage}`,
                actorName: project.ownerName,
                targetObjectType: 'project' as const,
                targetObjectId: project.id,
                targetTitle: project.projectName,
                isKey: true
            })),
            ...recentContracts.map((contract) => ({
                key: `contract:${contract.id}`,
                eventType: 'contract-updated' as const,
                sourceType: 'contract' as const,
                sourceId: contract.id,
                occurredAt: contract.updatedAt,
                title: contract.contractNo,
                description: `${contract.projectName} · ${contract.status}`,
                actorName: null,
                targetObjectType: 'contract' as const,
                targetObjectId: contract.id,
                targetTitle: contract.contractNo,
                isKey: contract.status === 'active'
            })),
            ...recentFollowUps.map((followUp) => ({
                key: `follow-up:${followUp.id}`,
                eventType: 'follow-up-recorded' as const,
                sourceType: 'follow-up' as const,
                sourceId: followUp.id,
                occurredAt: followUp.occurredAt,
                title: followUp.summary,
                description: followUp.nextFollowUpAt ? `下次跟进 ${followUp.nextFollowUpAt}` : null,
                actorName: followUp.ownerName,
                targetObjectType: 'follow-up' as const,
                targetObjectId: followUp.id,
                targetTitle: followUp.summary,
                isKey: false
            })),
            ...recentDiscussions.map((discussion) => ({
                key: `discussion:${discussion.id}`,
                eventType: 'discussion-added' as const,
                sourceType: 'discussion' as const,
                sourceId: discussion.id,
                occurredAt: discussion.createdAt,
                title: discussion.targetTitle,
                description: discussion.body,
                actorName: null,
                targetObjectType: 'discussion' as const,
                targetObjectId: discussion.id,
                targetTitle: discussion.targetTitle,
                isKey: discussion.isKeyConclusion
            }))
        ];

        return timeline.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()).slice(0, 12);
    }

    private toNumber(value: number | string): number {
        return Number(value);
    }

    private toIsoDateTime(value: Date | string): string {
        return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    }

    private toOptionalIsoDateTime(value: Date | string | null): string | null {
        return value ? this.toIsoDateTime(value) : null;
    }

    private async resolveOwner(ownerUserId: string | null | undefined, ownerOrgId: string | null | undefined, operator: PlatformUser): Promise<{ ownerUserId: string | null; ownerOrgId: string | null }> {
        if (ownerUserId === undefined) {
            const resolvedOrgId = ownerOrgId === undefined ? (operator.primaryOrgUnitId ?? null) : ownerOrgId;
            await this.assertOrgExists(resolvedOrgId);
            return {
                ownerUserId: operator.id,
                ownerOrgId: resolvedOrgId
            };
        }

        const ownerUser = ownerUserId ? await this.customerRepository.findPlatformUserById(ownerUserId) : null;
        if (ownerUserId && !ownerUser) {
            throw new NotFoundException(`Platform user ${ownerUserId} not found`);
        }

        const resolvedOrgId = ownerOrgId === undefined ? (ownerUser?.primaryOrgUnitId ?? null) : ownerOrgId;
        await this.assertOrgExists(resolvedOrgId);

        return {
            ownerUserId: ownerUser?.id ?? null,
            ownerOrgId: resolvedOrgId
        };
    }

    private async resolveOwnerUpdate(customer: Customer, ownerUserId: string | null | undefined, ownerOrgId: string | null | undefined): Promise<{ ownerUserId: string | null; ownerOrgId: string | null }> {
        if (ownerUserId === undefined) {
            const resolvedOrgId = ownerOrgId === undefined ? (customer.ownerOrgId ?? null) : ownerOrgId;
            await this.assertOrgExists(resolvedOrgId);
            return {
                ownerUserId: customer.ownerUserId ?? null,
                ownerOrgId: resolvedOrgId
            };
        }

        const ownerUser = ownerUserId ? await this.customerRepository.findPlatformUserById(ownerUserId) : null;
        if (ownerUserId && !ownerUser) {
            throw new NotFoundException(`Platform user ${ownerUserId} not found`);
        }

        const resolvedOrgId = ownerOrgId === undefined ? (ownerUser?.primaryOrgUnitId ?? customer.ownerOrgId ?? null) : ownerOrgId;
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

        const orgUnit = await this.customerRepository.findOrgUnitById(orgUnitId);
        if (!orgUnit) {
            throw new NotFoundException(`Org unit ${orgUnitId} not found`);
        }
    }

    private normalizeCustomerName(value: string): string {
        return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    }
}
