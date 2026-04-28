import { defineEntity } from '@mikro-orm/core';
import { Project } from './project.entity';

const p = defineEntity.properties;

export const ProjectOwnerReassignmentRecordSchema = defineEntity({
    name: 'ProjectOwnerReassignmentRecord',
    tableName: 'project_owner_reassignment_record',
    schema: 'poms',
    comment: '项目销售主责变更动作记录',
    indexes: [
        { name: 'idx_project_owner_reassignment_project_reassigned', properties: ['projectId', 'reassignedAt'] },
        { name: 'idx_project_owner_reassignment_reassigned_by', properties: ['reassignedBy'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').foreignKeyName('project_owner_reassignment_record_project_id_foreign').updateRule('cascade').deleteRule('restrict').comment('项目 ID'),
        previousOwnerOrgId: p.uuid().nullable().fieldName('previous_owner_org_id').comment('变更前销售主责组织 ID'),
        previousOwnerUserId: p.uuid().nullable().fieldName('previous_owner_user_id').comment('变更前销售主责人 ID'),
        newOwnerOrgId: p.uuid().nullable().fieldName('new_owner_org_id').comment('变更后销售主责组织 ID'),
        newOwnerUserId: p.uuid().fieldName('new_owner_user_id').comment('变更后销售主责人 ID'),
        reason: p.text().comment('销售主责变更原因'),
        reassignedAt: p.datetime().fieldName('reassigned_at').comment('变更生效时间'),
        reassignedBy: p.uuid().fieldName('reassigned_by').comment('变更操作人'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人')
    }
});

export class ProjectOwnerReassignmentRecord extends ProjectOwnerReassignmentRecordSchema.class {}

ProjectOwnerReassignmentRecordSchema.setClass(ProjectOwnerReassignmentRecord);
