import { defineEntity } from '@mikro-orm/core';
import { Project } from './project.entity';

export type AcceptanceRecordType = 'stage-outcome' | 'stage-acceptance' | 'final-acceptance';
export type AcceptanceRecordStatus = 'confirmed' | 'voided';
export type AcceptanceRecordResult = 'accepted' | 'conditional' | 'rejected';

const p = defineEntity.properties;

export const AcceptanceRecordSchema = defineEntity({
    name: 'AcceptanceRecord',
    tableName: 'acceptance_record',
    schema: 'poms',
    comment: '项目验收确认记录',
    indexes: [
        { name: 'idx_acceptance_record_project_confirmed', properties: ['projectId', 'status', 'confirmedAt'] },
        { name: 'idx_acceptance_record_project_type', properties: ['projectId', 'acceptanceType'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('acceptance_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        acceptanceType: p.string().length(64).fieldName('acceptance_type').$type<AcceptanceRecordType>().comment('验收类型'),
        acceptanceResult: p.string().length(32).fieldName('acceptance_result').$type<AcceptanceRecordResult>().comment('验收结论'),
        status: p.string().length(32).default('confirmed').$type<AcceptanceRecordStatus>().comment('状态：confirmed/voided'),
        scopeSummary: p.text().fieldName('scope_summary').comment('验收范围摘要'),
        evidenceSummary: p.text().fieldName('evidence_summary').comment('证据摘要'),
        comment: p.text().nullable().comment('确认备注'),
        confirmationRecordId: p.uuid().nullable().fieldName('confirmation_record_id').comment('关联确认实例 ID'),
        confirmedAt: p.datetime().fieldName('confirmed_at').comment('确认时间'),
        confirmedBy: p.uuid().nullable().fieldName('confirmed_by').comment('确认人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class AcceptanceRecord extends AcceptanceRecordSchema.class {}

AcceptanceRecordSchema.setClass(AcceptanceRecord);
