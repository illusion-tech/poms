import { EntityManager, EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { LeadStatusValue, ProjectStatusValue, SalesFollowUpRecordStatusValue, type CustomerListQuery } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Customer, CustomerAlias } from './customer.entity';

interface CountRow {
    customer_id: string;
    count: number | string;
}

export interface CustomerWorkspaceSummaryRow {
    leadCount: number | string;
    activeLeadCount: number | string;
    convertedLeadCount: number | string;
    projectCount: number | string;
    activeProjectCount: number | string;
    contractCount: number | string;
    recentFollowUpCount: number | string;
    recentDiscussionCount: number | string;
    latestFollowUpAt: Date | string | null;
    latestDiscussionAt: Date | string | null;
}

export interface CustomerWorkspaceLeadRow {
    id: string;
    leadNo: string;
    leadName: string;
    status: string;
    rating: string;
    urgency: string;
    ownerName: string | null;
    updatedAt: Date | string;
}

export interface CustomerWorkspaceProjectRow {
    id: string;
    projectNo: string;
    projectName: string;
    status: string;
    currentStage: string;
    ownerName: string | null;
    plannedSignAt: Date | string | null;
    updatedAt: Date | string;
}

export interface CustomerWorkspaceContractRow {
    id: string;
    contractNo: string;
    customerContractNo: string | null;
    status: string;
    projectId: string;
    projectName: string;
    signedAt: Date | string | null;
    updatedAt: Date | string;
}

export interface CustomerWorkspaceFollowUpRow {
    id: string;
    summary: string;
    outcome: string;
    occurredAt: Date | string;
    nextFollowUpAt: Date | string | null;
    ownerName: string | null;
}

export interface CustomerWorkspaceDiscussionRow {
    id: string;
    threadId: string;
    targetObjectType: string;
    targetObjectId: string;
    targetTitle: string;
    discussionType: string;
    body: string;
    isKeyConclusion: boolean;
    createdAt: Date | string;
}

const CUSTOMER_WORKSPACE_LIST_LIMIT = 5;
const ACTIVE_LEAD_STATUSES = [LeadStatusValue.Registered, LeadStatusValue.Qualified] as const;
const CONVERTED_LEAD_STATUS = LeadStatusValue.Converted;
const ACTIVE_PROJECT_STATUSES = [ProjectStatusValue.Active, ProjectStatusValue.PendingApproval, ProjectStatusValue.Blocked, ProjectStatusValue.OnHold] as const;

@Injectable()
export class CustomerRepository {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepository: EntityRepository<Customer>,
        @InjectRepository(CustomerAlias)
        private readonly customerAliasRepository: EntityRepository<CustomerAlias>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>
    ) {}

    async findMany(input: CustomerListQuery): Promise<Customer[]> {
        const where: FilterQuery<Customer> = {};

        if (input.status) {
            where.status = input.status;
        }

        if (input.ownerOrgId) {
            where.ownerOrgId = input.ownerOrgId;
        }

        if (input.keyword) {
            (where as FilterQuery<Customer> & { $or?: FilterQuery<Customer>[] }).$or = [
                { customerNo: { $ilike: `%${input.keyword}%` } },
                { displayName: { $ilike: `%${input.keyword}%` } },
                { legalName: { $ilike: `%${input.keyword}%` } },
                { shortName: { $ilike: `%${input.keyword}%` } }
            ];
        }

        return this.customerRepository.find(where, {
            orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ id });
    }

    async findAliasesByCustomerId(customerId: string): Promise<CustomerAlias[]> {
        return this.customerAliasRepository.find(
            { customerId },
            {
                orderBy: { isPrimary: QueryOrder.DESC, createdAt: QueryOrder.ASC }
            }
        );
    }

    async findPlatformUserById(id: string): Promise<PlatformUser | null> {
        return this.platformUserRepository.findOne({ id });
    }

    async findPlatformUsersByIds(ids: string[]): Promise<PlatformUser[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.platformUserRepository.find({ id: { $in: ids } });
    }

    async findOrgUnitById(id: string): Promise<OrgUnit | null> {
        return this.orgUnitRepository.findOne({ id });
    }

    async findOrgUnitsByIds(ids: string[]): Promise<OrgUnit[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.orgUnitRepository.find({ id: { $in: ids } });
    }

    create(input: ConstructorParameters<typeof Customer>[0]): Customer {
        return this.customerRepository.create(input);
    }

    createAlias(input: ConstructorParameters<typeof CustomerAlias>[0]): CustomerAlias {
        return this.customerAliasRepository.create(input);
    }

    async save(customer: Customer): Promise<void> {
        await this.customerRepository.getEntityManager().persist(customer).flush();
    }

    async saveAlias(alias: CustomerAlias): Promise<void> {
        await this.customerAliasRepository.getEntityManager().persist(alias).flush();
    }

    async countLeadsByCustomerIds(customerIds: string[]): Promise<Map<string, number>> {
        return this.countByCustomerIds(
            `select "customer_id", count(*)::int as "count" from "poms"."lead" where "customer_id" in (__IDS__) group by "customer_id"`,
            customerIds
        );
    }

    async countProjectsByCustomerIds(customerIds: string[]): Promise<Map<string, number>> {
        return this.countByCustomerIds(
            `select "customer_id", count(*)::int as "count" from "poms"."project" where "customer_id" in (__IDS__) group by "customer_id"`,
            customerIds
        );
    }

    async countContractsByCustomerIds(customerIds: string[]): Promise<Map<string, number>> {
        return this.countByCustomerIds(
            `
                select project."customer_id", count(contract."id")::int as "count"
                from "poms"."contract" contract
                inner join "poms"."project" project on project."id" = contract."project_id"
                where project."customer_id" in (__IDS__)
                group by project."customer_id"
            `,
            customerIds
        );
    }

    async getWorkspaceSummary(customerId: string): Promise<CustomerWorkspaceSummaryRow> {
        const rows = (await this.execute(
            `
                select
                    (select count(*)::int from "poms"."lead" lead where lead."customer_id" = ?) as "leadCount",
                    (select count(*)::int from "poms"."lead" lead where lead."customer_id" = ? and lead."status" in (?, ?)) as "activeLeadCount",
                    (select count(*)::int from "poms"."lead" lead where lead."customer_id" = ? and (lead."status" = ? or lead."converted_project_id" is not null)) as "convertedLeadCount",
                    (select count(*)::int from "poms"."project" project where project."customer_id" = ?) as "projectCount",
                    (select count(*)::int from "poms"."project" project where project."customer_id" = ? and project."status" in (?, ?, ?, ?)) as "activeProjectCount",
                    (
                        select count(contract."id")::int
                        from "poms"."contract" contract
                        inner join "poms"."project" project on project."id" = contract."project_id"
                        where project."customer_id" = ?
                    ) as "contractCount",
                    (select count(*)::int from "poms"."sales_follow_up_record" follow_up where follow_up."customer_id" = ? and follow_up."status" = ?) as "recentFollowUpCount",
                    (
                        select count(comment."id")::int
                        from "poms"."business_discussion_comment" comment
                        inner join "poms"."business_discussion_thread" thread on thread."id" = comment."thread_id"
                        where thread."customer_id" = ?
                    ) as "recentDiscussionCount",
                    (select max(follow_up."occurred_at") from "poms"."sales_follow_up_record" follow_up where follow_up."customer_id" = ? and follow_up."status" = ?) as "latestFollowUpAt",
                    (
                        select max(comment."created_at")
                        from "poms"."business_discussion_comment" comment
                        inner join "poms"."business_discussion_thread" thread on thread."id" = comment."thread_id"
                        where thread."customer_id" = ?
                    ) as "latestDiscussionAt"
            `,
            [
                customerId,
                customerId,
                ...ACTIVE_LEAD_STATUSES,
                customerId,
                CONVERTED_LEAD_STATUS,
                customerId,
                customerId,
                ...ACTIVE_PROJECT_STATUSES,
                customerId,
                customerId,
                SalesFollowUpRecordStatusValue.Active,
                customerId,
                customerId,
                SalesFollowUpRecordStatusValue.Active,
                customerId
            ]
        )) as CustomerWorkspaceSummaryRow[];

        return rows[0] ?? this.emptyWorkspaceSummary();
    }

    async findWorkspaceActiveLeads(customerId: string, limit = CUSTOMER_WORKSPACE_LIST_LIMIT): Promise<CustomerWorkspaceLeadRow[]> {
        return (await this.execute(
            `
                select
                    lead."id",
                    lead."lead_no" as "leadNo",
                    lead."lead_name" as "leadName",
                    lead."status",
                    lead."rating",
                    lead."urgency",
                    owner."display_name" as "ownerName",
                    lead."updated_at" as "updatedAt"
                from "poms"."lead" lead
                left join "poms"."platform_user" owner on owner."id" = lead."owner_user_id"
                where lead."customer_id" = ? and lead."status" in (?, ?)
                order by lead."updated_at" desc, lead."created_at" desc
                limit ?
            `,
            [customerId, ...ACTIVE_LEAD_STATUSES, limit]
        )) as CustomerWorkspaceLeadRow[];
    }

    async findWorkspaceActiveProjects(customerId: string, limit = CUSTOMER_WORKSPACE_LIST_LIMIT): Promise<CustomerWorkspaceProjectRow[]> {
        return (await this.execute(
            `
                select
                    project."id",
                    project."project_no" as "projectNo",
                    project."project_name" as "projectName",
                    project."status",
                    project."current_stage" as "currentStage",
                    owner."display_name" as "ownerName",
                    project."planned_sign_at" as "plannedSignAt",
                    project."updated_at" as "updatedAt"
                from "poms"."project" project
                left join "poms"."platform_user" owner on owner."id" = project."owner_user_id"
                where project."customer_id" = ? and project."status" in (?, ?, ?, ?)
                order by project."updated_at" desc, project."created_at" desc
                limit ?
            `,
            [customerId, ...ACTIVE_PROJECT_STATUSES, limit]
        )) as CustomerWorkspaceProjectRow[];
    }

    async findWorkspaceRecentContracts(customerId: string, limit = CUSTOMER_WORKSPACE_LIST_LIMIT): Promise<CustomerWorkspaceContractRow[]> {
        return (await this.execute(
            `
                select
                    contract."id",
                    contract."contract_no" as "contractNo",
                    contract."customer_contract_no" as "customerContractNo",
                    contract."status",
                    contract."project_id" as "projectId",
                    project."project_name" as "projectName",
                    contract."signed_at" as "signedAt",
                    contract."updated_at" as "updatedAt"
                from "poms"."contract" contract
                inner join "poms"."project" project on project."id" = contract."project_id"
                where project."customer_id" = ?
                order by contract."updated_at" desc, contract."created_at" desc
                limit ?
            `,
            [customerId, limit]
        )) as CustomerWorkspaceContractRow[];
    }

    async findWorkspaceRecentFollowUps(customerId: string, limit = CUSTOMER_WORKSPACE_LIST_LIMIT): Promise<CustomerWorkspaceFollowUpRow[]> {
        return (await this.execute(
            `
                select
                    follow_up."id",
                    follow_up."summary",
                    follow_up."outcome",
                    follow_up."occurred_at" as "occurredAt",
                    follow_up."next_follow_up_at" as "nextFollowUpAt",
                    owner."display_name" as "ownerName"
                from "poms"."sales_follow_up_record" follow_up
                left join "poms"."platform_user" owner on owner."id" = follow_up."owner_user_id"
                where follow_up."customer_id" = ? and follow_up."status" = ?
                order by follow_up."occurred_at" desc, follow_up."created_at" desc
                limit ?
            `,
            [customerId, SalesFollowUpRecordStatusValue.Active, limit]
        )) as CustomerWorkspaceFollowUpRow[];
    }

    async findWorkspaceRecentDiscussions(customerId: string, limit = CUSTOMER_WORKSPACE_LIST_LIMIT): Promise<CustomerWorkspaceDiscussionRow[]> {
        return (await this.execute(
            `
                select
                    comment."id",
                    comment."thread_id" as "threadId",
                    thread."target_object_type" as "targetObjectType",
                    thread."target_object_id" as "targetObjectId",
                    thread."target_title" as "targetTitle",
                    comment."discussion_type" as "discussionType",
                    comment."body",
                    comment."is_key_conclusion" as "isKeyConclusion",
                    comment."created_at" as "createdAt"
                from "poms"."business_discussion_comment" comment
                inner join "poms"."business_discussion_thread" thread on thread."id" = comment."thread_id"
                where thread."customer_id" = ?
                order by comment."created_at" desc
                limit ?
            `,
            [customerId, limit]
        )) as CustomerWorkspaceDiscussionRow[];
    }

    getEntityManager(): EntityManager {
        return this.customerRepository.getEntityManager();
    }

    private async countByCustomerIds(sqlTemplate: string, customerIds: string[]): Promise<Map<string, number>> {
        if (customerIds.length === 0) {
            return new Map();
        }

        const placeholders = customerIds.map(() => '?').join(', ');
        const rows = (await this.customerRepository
            .getEntityManager()
            .getConnection()
            .execute(sqlTemplate.replace('__IDS__', placeholders), customerIds)) as CountRow[];

        return new Map(rows.map((row) => [row.customer_id, Number(row.count)]));
    }

    private async execute(sql: string, params: unknown[]): Promise<unknown[]> {
        return this.customerRepository.getEntityManager().getConnection().execute(sql, params) as Promise<unknown[]>;
    }

    private emptyWorkspaceSummary(): CustomerWorkspaceSummaryRow {
        return {
            leadCount: 0,
            activeLeadCount: 0,
            convertedLeadCount: 0,
            projectCount: 0,
            activeProjectCount: 0,
            contractCount: 0,
            recentFollowUpCount: 0,
            recentDiscussionCount: 0,
            latestFollowUpAt: null,
            latestDiscussionAt: null
        };
    }
}
