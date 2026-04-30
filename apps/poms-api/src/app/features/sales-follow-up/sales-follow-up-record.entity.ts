import { defineEntity } from '@mikro-orm/core';
import type { SalesFollowUpOutcome, SalesFollowUpRecordStatus, SalesFollowUpType } from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const SalesFollowUpRecordSchema = defineEntity({
    name: 'SalesFollowUpRecord',
    tableName: 'sales_follow_up_record',
    schema: 'poms',
    comment: '客户/线索/项目共享销售跟进记录',
    indexes: [
        {
            name: 'idx_sales_follow_up_customer_occurred',
            properties: ['customerId', 'occurredAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.customerId}", "${columns.occurredAt}" desc)`
        },
        {
            name: 'idx_sales_follow_up_lead_occurred',
            properties: ['leadId', 'occurredAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.leadId}", "${columns.occurredAt}" desc)`
        },
        {
            name: 'idx_sales_follow_up_project_occurred',
            properties: ['projectId', 'occurredAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.occurredAt}" desc)`
        },
        { name: 'idx_sales_follow_up_owner_user_id', properties: ['ownerUserId'] },
        { name: 'idx_sales_follow_up_next_at', properties: ['nextFollowUpAt'] },
        {
            name: 'idx_sales_follow_up_status_occurred',
            properties: ['status', 'occurredAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.status}", "${columns.occurredAt}" desc)`
        },
        { name: 'idx_sales_follow_up_supersedes', properties: ['supersedesRecordId'] },
        { name: 'idx_sales_follow_up_replaced_by', properties: ['replacedByRecordId'] }
    ],
    uniques: [
        {
            name: 'uq_sales_follow_up_supersedes_once',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.supersedesRecordId}") where "${columns.supersedesRecordId}" is not null`
        },
        {
            name: 'uq_sales_follow_up_replaced_by_once',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.replacedByRecordId}") where "${columns.replacedByRecordId}" is not null`
        }
    ],
    checks: [
        {
            name: 'chk_sales_follow_up_type',
            expression: `"follow_up_type" in ('phone', 'meeting', 'wechat', 'email', 'onsite', 'other')`
        },
        {
            name: 'chk_sales_follow_up_outcome',
            expression: `"outcome" in ('progress', 'waiting-customer', 'risk-discovered', 'deferred', 'close-recommended', 'no-response', 'other')`
        },
        {
            name: 'chk_sales_follow_up_record_status',
            expression: `"status" in ('active', 'superseded', 'voided')`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('销售跟进记录主键'),
        customerId: () =>
            p
                .manyToOne(Customer)
                .mapToPk()
                .fieldName('customer_id')
                .foreignKeyName('sales_follow_up_customer_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('客户主数据标识'),
        leadId: () =>
            p
                .manyToOne(Lead)
                .mapToPk()
                .nullable()
                .fieldName('lead_id')
                .foreignKeyName('sales_follow_up_lead_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('线索上下文标识'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .nullable()
                .fieldName('project_id')
                .foreignKeyName('sales_follow_up_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目上下文标识'),
        followUpType: p.string().$type<SalesFollowUpType>().length(32).fieldName('follow_up_type').comment('跟进方式'),
        status: p.string().$type<SalesFollowUpRecordStatus>().length(32).default('active').comment('状态：active/superseded/voided'),
        occurredAt: p.datetime().fieldName('occurred_at').comment('实际跟进时间'),
        summary: p.text().comment('跟进摘要'),
        detail: p.text().nullable().comment('跟进详情'),
        outcome: p.string().$type<SalesFollowUpOutcome>().length(32).comment('跟进结果'),
        nextFollowUpAt: p.datetime().nullable().fieldName('next_follow_up_at').comment('下次跟进时间'),
        ownerOrgId: () =>
            p
                .manyToOne(OrgUnit)
                .mapToPk()
                .nullable()
                .fieldName('owner_org_id')
                .foreignKeyName('sales_follow_up_owner_org_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('跟进责任组织标识'),
        ownerUserId: () =>
            p
                .manyToOne(PlatformUser)
                .mapToPk()
                .nullable()
                .fieldName('owner_user_id')
                .foreignKeyName('sales_follow_up_owner_user_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('跟进责任人标识'),
        supersedesRecordId: () =>
            p
                .manyToOne(SalesFollowUpRecord)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_record_id')
                .foreignKeyName('sales_follow_up_supersedes_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('替代的旧跟进记录 ID'),
        replacedByRecordId: () =>
            p
                .manyToOne(SalesFollowUpRecord)
                .mapToPk()
                .nullable()
                .fieldName('replaced_by_record_id')
                .foreignKeyName('sales_follow_up_replaced_by_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('替代当前记录的新跟进记录 ID'),
        replacementReason: p.text().nullable().fieldName('replacement_reason').comment('替代原因'),
        voidedAt: p.datetime().nullable().fieldName('voided_at').comment('作废时间'),
        voidedBy: p.uuid().nullable().fieldName('voided_by').comment('作废操作人'),
        voidReason: p.text().nullable().fieldName('void_reason').comment('作废原因'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export class SalesFollowUpRecord extends SalesFollowUpRecordSchema.class {}

SalesFollowUpRecordSchema.setClass(SalesFollowUpRecord);
