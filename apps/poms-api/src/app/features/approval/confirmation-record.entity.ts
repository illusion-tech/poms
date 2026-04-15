import { defineEntity } from '@mikro-orm/core';

export type ConfirmationRecordStatus = 'pending' | 'confirmed' | 'closed';
export type ConfirmationParticipantStatus = 'pending' | 'confirmed' | 'closed';

const p = defineEntity.properties;

export const ConfirmationRecordSchema = defineEntity({
    name: 'ConfirmationRecord',
    tableName: 'confirmation_record',
    schema: 'poms',
    comment: '统一确认实例',
    indexes: [
        { name: 'idx_confirmation_record_target', properties: ['targetType', 'targetId'] },
        { name: 'idx_confirmation_record_status', properties: ['status'] },
        { name: 'idx_confirmation_record_project_status', properties: ['projectId', 'status'] }
    ],
    uniques: [
        {
            name: 'uq_confirmation_record_open_target',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.confirmationType}", "${columns.targetType}", "${columns.targetId}") where "${columns.status}" = 'pending'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        confirmationType: p.string().length(64).fieldName('confirmation_type').comment('确认类型'),
        businessDomain: p.string().length(64).fieldName('business_domain').comment('业务域'),
        targetType: p.string().length(64).fieldName('target_type').comment('确认目标类型'),
        targetId: p.uuid().fieldName('target_id').comment('确认目标 ID'),
        projectId: p.uuid().nullable().fieldName('project_id').comment('项目 ID'),
        status: p.string().length(32).default('pending').$type<ConfirmationRecordStatus>().comment('状态：pending/confirmed/closed'),
        requiredCount: p.integer().fieldName('required_count').comment('需确认人数'),
        confirmedCount: p.integer().default(0).fieldName('confirmed_count').comment('已确认人数'),
        confirmationComment: p.text().nullable().fieldName('confirmation_comment').comment('确认发起备注'),
        submittedAt: p.datetime().defaultRaw('now()').fieldName('submitted_at').comment('发起时间'),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at').comment('全部确认时间'),
        closedAt: p.datetime().nullable().fieldName('closed_at').comment('关闭时间'),
        closedBy: p.uuid().nullable().fieldName('closed_by').comment('关闭人'),
        closeReason: p.text().nullable().fieldName('close_reason').comment('关闭原因'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ConfirmationRecord extends ConfirmationRecordSchema.class {}

ConfirmationRecordSchema.setClass(ConfirmationRecord);

export const ConfirmationParticipantSchema = defineEntity({
    name: 'ConfirmationParticipant',
    tableName: 'confirmation_participant',
    schema: 'poms',
    comment: '统一确认参与人明细',
    indexes: [
        { name: 'idx_confirmation_participant_record_status', properties: ['confirmationRecordId', 'participantStatus'] },
        { name: 'idx_confirmation_participant_user_status', properties: ['participantId', 'participantStatus'] }
    ],
    uniques: [{ name: 'uq_confirmation_participant_record_user', properties: ['confirmationRecordId', 'participantId'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        confirmationRecordId: () =>
            p
                .manyToOne(ConfirmationRecord)
                .mapToPk()
                .fieldName('confirmation_record_id')
                .foreignKeyName('confirmation_participant_confirmation_record_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('确认实例 ID'),
        participantId: p.uuid().fieldName('participant_id').comment('确认参与人 ID'),
        participantRoleKey: p.string().length(64).fieldName('participant_role_key').comment('参与人角色键'),
        participantDisplayName: p.string().length(128).nullable().fieldName('participant_display_name').comment('参与人展示名'),
        participantStatus: p.string().length(32).default('pending').fieldName('participant_status').$type<ConfirmationParticipantStatus>().comment('参与状态：pending/confirmed/closed'),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at').comment('确认时间'),
        confirmedComment: p.text().nullable().fieldName('confirmed_comment').comment('确认意见'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人')
    }
});

export class ConfirmationParticipant extends ConfirmationParticipantSchema.class {}

ConfirmationParticipantSchema.setClass(ConfirmationParticipant);
