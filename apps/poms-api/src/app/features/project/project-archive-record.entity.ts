import { defineEntity } from '@mikro-orm/core';
import { Project } from './project.entity';

export type ProjectArchiveAnchorStage = 'completed' | 'closed-lost' | 'closed-terminated';
export type ProjectArchiveAnchorSourceType = 'project' | 'project-completion-record';
export type ProjectArchiveRecordStatus = 'recorded';

const p = defineEntity.properties;

export const ProjectArchiveRecordSchema = defineEntity({
    name: 'ProjectArchiveRecord',
    tableName: 'project_archive_record',
    schema: 'poms',
    comment: '项目归档记录',
    indexes: [
        { name: 'idx_project_archive_record_project_archived', properties: ['projectId', 'status', 'archivedAt'] },
        { name: 'idx_project_archive_record_project_anchor_stage', properties: ['projectId', 'archiveAnchorStage'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('project_archive_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        archiveAnchorStage: p
            .string()
            .length(32)
            .fieldName('archive_anchor_stage')
            .$type<ProjectArchiveAnchorStage>()
            .comment('归档锚定终态阶段'),
        archiveAnchorSourceType: p
            .string()
            .length(32)
            .fieldName('archive_anchor_source_type')
            .$type<ProjectArchiveAnchorSourceType>()
            .comment('归档锚定来源类型'),
        archiveAnchorSourceId: p.uuid().fieldName('archive_anchor_source_id').comment('归档锚定来源 ID'),
        status: p.string().length(32).default('recorded').$type<ProjectArchiveRecordStatus>().comment('状态：recorded'),
        archivedAt: p.datetime().fieldName('archived_at').comment('归档时间'),
        archivedBy: p.uuid().nullable().fieldName('archived_by').comment('归档操作人'),
        archiveSummary: p.text().fieldName('archive_summary').comment('归档结论摘要'),
        evidenceSummary: p.text().fieldName('evidence_summary').comment('归档证据摘要'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ProjectArchiveRecord extends ProjectArchiveRecordSchema.class {}

ProjectArchiveRecordSchema.setClass(ProjectArchiveRecord);
