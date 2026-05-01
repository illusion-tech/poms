import { EntityManager, EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { BusinessDomainValue, TargetObjectTypeValue, TodoPriorityValue, TodoSourceTypeValue, TodoStatusValue, TodoTypeValue } from '@poms/shared-contracts';
import type { SalesFollowUpRecordLifecycleScope, TargetObjectType, TodoPriority } from '@poms/shared-contracts';
import { TodoItem } from '../approval/todo-item.entity';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from './sales-follow-up-record.entity';

const SALES_FOLLOW_UP_REMINDER_SOURCE_TYPE = TodoSourceTypeValue.SalesFollowUpRecord;
const SALES_FOLLOW_UP_REMINDER_TODO_TYPE = TodoTypeValue.SalesFollowUpReminder;
const SALES_BUSINESS_DOMAIN = BusinessDomainValue.Sales;
const OPEN_REMINDER_STATUSES = [TodoStatusValue.Open, TodoStatusValue.Processing] as const;
const CUSTOMER_TARGET_TYPE = TargetObjectTypeValue.Customer;
const LEAD_TARGET_TYPE = TargetObjectTypeValue.Lead;
const PROJECT_TARGET_TYPE = TargetObjectTypeValue.Project;

export interface SalesFollowUpRecordFilters {
    customerId?: string;
    leadId?: string;
    projectId?: string;
    lifecycleScope?: SalesFollowUpRecordLifecycleScope;
}

export interface SalesFollowUpReminderContext {
    customer: Customer;
    lead: Lead | null;
    project: Project | null;
}

@Injectable()
export class SalesFollowUpRepository {
    constructor(
        @InjectRepository(SalesFollowUpRecord)
        private readonly followUpRepository: EntityRepository<SalesFollowUpRecord>,
        @InjectRepository(Customer)
        private readonly customerRepository: EntityRepository<Customer>,
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>
    ) {}

    async findMany(filters: SalesFollowUpRecordFilters): Promise<SalesFollowUpRecord[]> {
        const where: FilterQuery<SalesFollowUpRecord> = {};
        const anchorFilters: FilterQuery<SalesFollowUpRecord>[] = [];

        if (filters.leadId) {
            anchorFilters.push({ leadId: filters.leadId });
        }

        if (filters.projectId) {
            anchorFilters.push({ projectId: filters.projectId });
        }

        if (filters.customerId) {
            where.customerId = filters.customerId;
        }

        if ((filters.lifecycleScope ?? 'active') === 'active') {
            where.status = 'active';
        }

        if (anchorFilters.length > 0) {
            (where as FilterQuery<SalesFollowUpRecord> & { $or: FilterQuery<SalesFollowUpRecord>[] }).$or = anchorFilters;
        }

        return this.followUpRepository.find(where, {
            orderBy: { occurredAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    create(input: ConstructorParameters<typeof SalesFollowUpRecord>[0]): SalesFollowUpRecord {
        return this.followUpRepository.create(input);
    }

    async findById(id: string): Promise<SalesFollowUpRecord | null> {
        return this.followUpRepository.findOne({ id });
    }

    async save(record: SalesFollowUpRecord): Promise<void> {
        await this.followUpRepository.getEntityManager().persist(record).flush();
    }

    async saveWithReminderSync(record: SalesFollowUpRecord, context: SalesFollowUpReminderContext): Promise<void> {
        const em = this.followUpRepository.getEntityManager();
        em.persist(record);
        await this.syncReminderTodoForActiveRecord(em, record, context);
        await em.flush();
    }

    async saveReplacement(input: { supersededRecord: SalesFollowUpRecord; replacementRecord: SalesFollowUpRecord }): Promise<void> {
        await this.followUpRepository.getEntityManager().persist([input.supersededRecord, input.replacementRecord]).flush();
    }

    async saveReplacementWithReminderSync(input: {
        supersededRecord: SalesFollowUpRecord;
        replacementRecord: SalesFollowUpRecord;
        context: SalesFollowUpReminderContext;
    }): Promise<void> {
        const em = this.followUpRepository.getEntityManager();
        em.persist([input.supersededRecord, input.replacementRecord]);
        await this.cancelReminderTodosForSource(em, input.supersededRecord.id);
        await this.syncReminderTodoForActiveRecord(em, input.replacementRecord, input.context);
        await em.flush();
    }

    async saveVoidWithReminderSync(record: SalesFollowUpRecord): Promise<void> {
        const em = this.followUpRepository.getEntityManager();
        em.persist(record);
        await this.cancelReminderTodosForSource(em, record.id);
        await em.flush();
    }

    async findCustomerById(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ id });
    }

    async findCustomersByIds(ids: string[]): Promise<Customer[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.customerRepository.find({ id: { $in: ids } });
    }

    async findLeadById(id: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ id });
    }

    async findLeadsByIds(ids: string[]): Promise<Lead[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.leadRepository.find({ id: { $in: ids } });
    }

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findProjectsByIds(ids: string[]): Promise<Project[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.projectRepository.find({ id: { $in: ids } });
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

    private async syncReminderTodoForActiveRecord(em: EntityManager, record: SalesFollowUpRecord, context: SalesFollowUpReminderContext): Promise<void> {
        if (record.status !== 'active' || !record.ownerUserId) {
            return;
        }

        const target = this.resolveReminderTarget(record, context);
        const now = new Date();
        const streamTodos = await em.find(TodoItem, {
            sourceType: SALES_FOLLOW_UP_REMINDER_SOURCE_TYPE,
            todoType: SALES_FOLLOW_UP_REMINDER_TODO_TYPE,
            assigneeUserId: record.ownerUserId,
            targetObjectType: target.targetObjectType,
            targetObjectId: target.targetObjectId,
            status: { $in: [...OPEN_REMINDER_STATUSES] }
        });

        for (const todo of streamTodos) {
            if (todo.sourceId !== record.id) {
                todo.status = TodoStatusValue.Completed;
                todo.completedAt = now;
            }
        }

        if (!record.nextFollowUpAt) {
            return;
        }

        const existingTodo = await em.findOne(TodoItem, {
            sourceType: SALES_FOLLOW_UP_REMINDER_SOURCE_TYPE,
            sourceId: record.id,
            assigneeUserId: record.ownerUserId,
            status: { $in: [...OPEN_REMINDER_STATUSES] }
        });
        const title = `销售跟进提醒：${target.targetTitle}`;
        const summary = this.buildReminderSummary(record.summary);
        const priority: TodoPriority = record.nextFollowUpAt.getTime() <= Date.now() ? TodoPriorityValue.High : TodoPriorityValue.Normal;

        if (existingTodo) {
            existingTodo.todoType = SALES_FOLLOW_UP_REMINDER_TODO_TYPE;
            existingTodo.businessDomain = SALES_BUSINESS_DOMAIN;
            existingTodo.targetObjectType = target.targetObjectType;
            existingTodo.targetObjectId = target.targetObjectId;
            existingTodo.projectId = target.projectId;
            existingTodo.title = title;
            existingTodo.summary = summary;
            existingTodo.status = TodoStatusValue.Open;
            existingTodo.priority = priority;
            existingTodo.dueAt = record.nextFollowUpAt;
            existingTodo.completedAt = null;
            return;
        }

        const todo = em.create(TodoItem, {
            sourceType: SALES_FOLLOW_UP_REMINDER_SOURCE_TYPE,
            sourceId: record.id,
            todoType: SALES_FOLLOW_UP_REMINDER_TODO_TYPE,
            businessDomain: SALES_BUSINESS_DOMAIN,
            targetObjectType: target.targetObjectType,
            targetObjectId: target.targetObjectId,
            projectId: target.projectId,
            title,
            summary,
            assigneeUserId: record.ownerUserId,
            status: TodoStatusValue.Open,
            priority,
            dueAt: record.nextFollowUpAt,
            completedAt: null
        });
        em.persist(todo);
    }

    private async cancelReminderTodosForSource(em: EntityManager, sourceId: string): Promise<void> {
        const todos = await em.find(TodoItem, {
            sourceType: SALES_FOLLOW_UP_REMINDER_SOURCE_TYPE,
            sourceId,
            todoType: SALES_FOLLOW_UP_REMINDER_TODO_TYPE,
            status: { $in: [...OPEN_REMINDER_STATUSES] }
        });
        const now = new Date();

        for (const todo of todos) {
            todo.status = TodoStatusValue.Canceled;
            todo.completedAt = now;
        }
    }

    private resolveReminderTarget(
        record: SalesFollowUpRecord,
        context: SalesFollowUpReminderContext
    ): { targetObjectType: TargetObjectType; targetObjectId: string; targetTitle: string; projectId: string | null } {
        if (record.projectId) {
            return {
                targetObjectType: PROJECT_TARGET_TYPE,
                targetObjectId: record.projectId,
                targetTitle: context.project?.projectName ?? context.lead?.leadName ?? context.customer.displayName,
                projectId: record.projectId
            };
        }

        if (record.leadId) {
            return {
                targetObjectType: LEAD_TARGET_TYPE,
                targetObjectId: record.leadId,
                targetTitle: context.lead?.leadName ?? context.customer.displayName,
                projectId: null
            };
        }

        return {
            targetObjectType: CUSTOMER_TARGET_TYPE,
            targetObjectId: record.customerId,
            targetTitle: context.customer.displayName,
            projectId: null
        };
    }

    private buildReminderSummary(summary: string): string | null {
        const value = summary.trim();
        if (!value) {
            return null;
        }

        return value.length > 160 ? `${value.slice(0, 157)}...` : value;
    }
}
