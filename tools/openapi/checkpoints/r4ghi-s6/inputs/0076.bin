import { defineEntity } from '@mikro-orm/core';
import { BUSINESS_DISCUSSION_TARGET_OBJECT_TYPES, BUSINESS_DISCUSSION_TYPES, type BusinessDiscussionTargetObjectType, type BusinessDiscussionType } from '@poms/shared-contracts';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { CompetitorIntelligenceRecord, CustomerContact } from '../sales-intelligence/sales-intelligence.entity';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const BusinessDiscussionThreadSchema = defineEntity({
    name: 'BusinessDiscussionThread',
    tableName: 'business_discussion_thread',
    schema: 'poms',
    comment: '业务对象讨论板线程',
    indexes: [
        { name: 'idx_business_discussion_thread_customer', properties: ['customerId'] },
        { name: 'idx_business_discussion_thread_lead', properties: ['leadId'] },
        { name: 'idx_business_discussion_thread_project', properties: ['projectId'] }
    ],
    uniques: [{ name: 'uq_business_discussion_thread_target', properties: ['targetObjectType', 'targetObjectId'] }],
    checks: [{ name: 'chk_business_discussion_thread_target', expression: `"target_object_type" in (${toSqlStringList(BUSINESS_DISCUSSION_TARGET_OBJECT_TYPES)})` }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('讨论线程主键'),
        targetObjectType: p.string().$type<BusinessDiscussionTargetObjectType>().length(64).fieldName('target_object_type').comment('目标对象类型'),
        targetObjectId: p.uuid().fieldName('target_object_id').comment('目标对象标识'),
        customerId: () => p.manyToOne(Customer).mapToPk().nullable().fieldName('customer_id').foreignKeyName('business_discussion_thread_customer_id_foreign').updateRule('cascade').deleteRule('restrict').comment('客户主数据标识'),
        leadId: () => p.manyToOne(Lead).mapToPk().nullable().fieldName('lead_id').foreignKeyName('business_discussion_thread_lead_id_foreign').updateRule('cascade').deleteRule('restrict').comment('线索标识'),
        projectId: () => p.manyToOne(Project).mapToPk().nullable().fieldName('project_id').foreignKeyName('business_discussion_thread_project_id_foreign').updateRule('cascade').deleteRule('restrict').comment('项目标识'),
        targetTitle: p.string().length(255).fieldName('target_title').comment('目标对象标题快照'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识')
    }
});

export const BusinessDiscussionCommentSchema = defineEntity({
    name: 'BusinessDiscussionComment',
    tableName: 'business_discussion_comment',
    schema: 'poms',
    comment: '业务对象讨论评论',
    indexes: [
        {
            name: 'idx_business_discussion_comment_thread_created',
            properties: ['threadId', 'createdAt'],
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.threadId}", "${columns.createdAt}" asc)`
        }
    ],
    checks: [{ name: 'chk_business_discussion_type', expression: `"discussion_type" in (${toSqlStringList(BUSINESS_DISCUSSION_TYPES)})` }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('讨论评论主键'),
        threadId: () =>
            p
                .manyToOne(BusinessDiscussionThread)
                .mapToPk()
                .fieldName('thread_id')
                .foreignKeyName('business_discussion_comment_thread_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('讨论线程标识'),
        discussionType: p.string().$type<BusinessDiscussionType>().length(64).fieldName('discussion_type').comment('讨论类型'),
        body: p.text().comment('讨论正文'),
        relatedContactId: () =>
            p
                .manyToOne(CustomerContact)
                .mapToPk()
                .nullable()
                .fieldName('related_contact_id')
                .foreignKeyName('business_discussion_comment_contact_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('关联客户联系人标识'),
        relatedCompetitorRecordId: () =>
            p
                .manyToOne(CompetitorIntelligenceRecord)
                .mapToPk()
                .nullable()
                .fieldName('related_competitor_record_id')
                .foreignKeyName('business_discussion_comment_competitor_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('关联竞争态势记录标识'),
        relatedFollowUpRecordId: () =>
            p
                .manyToOne(SalesFollowUpRecord)
                .mapToPk()
                .nullable()
                .fieldName('related_follow_up_record_id')
                .foreignKeyName('business_discussion_comment_follow_up_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('关联销售跟进记录标识'),
        isPinned: p.boolean().default(false).fieldName('is_pinned').comment('是否置顶'),
        isKeyConclusion: p.boolean().default(false).fieldName('is_key_conclusion').comment('是否关键结论'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识')
    }
});

export class BusinessDiscussionThread extends BusinessDiscussionThreadSchema.class {}

export class BusinessDiscussionComment extends BusinessDiscussionCommentSchema.class {}

BusinessDiscussionThreadSchema.setClass(BusinessDiscussionThread);
BusinessDiscussionCommentSchema.setClass(BusinessDiscussionComment);
