import { defineEntity } from '@mikro-orm/core';
import { AcceptanceRecord } from './acceptance-record.entity';
import { Project } from './project.entity';

export type ProjectCompletionRecordResult = 'completed' | 'conditional-completed';
export type ProjectCompletionRecordStatus = 'confirmed';

const p = defineEntity.properties;

export const ProjectCompletionRecordSchema = defineEntity({
    name: 'ProjectCompletionRecord',
    tableName: 'project_completion_record',
    schema: 'poms',
    comment: '项目完成结论记录',
    indexes: [
        { name: 'idx_project_completion_record_project_completed', properties: ['projectId', 'status', 'completedAt'] },
        { name: 'idx_project_completion_record_acceptance', properties: ['acceptanceRecordId'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('project_completion_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        acceptanceRecordId: () =>
            p
                .manyToOne(AcceptanceRecord)
                .mapToPk()
                .fieldName('acceptance_record_id')
                .foreignKeyName('project_completion_record_acceptance_record_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('验收记录 ID'),
        completionResult: p.string().length(32).fieldName('completion_result').$type<ProjectCompletionRecordResult>().comment('完成结论'),
        status: p.string().length(32).default('confirmed').$type<ProjectCompletionRecordStatus>().comment('状态：confirmed'),
        completedAt: p.datetime().fieldName('completed_at').comment('完成确认时间'),
        completedBy: p.uuid().nullable().fieldName('completed_by').comment('确认人'),
        completionSummary: p.text().fieldName('completion_summary').comment('完成结论摘要'),
        evidenceSummary: p.text().fieldName('evidence_summary').comment('证据摘要'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ProjectCompletionRecord extends ProjectCompletionRecordSchema.class {}

ProjectCompletionRecordSchema.setClass(ProjectCompletionRecord);
