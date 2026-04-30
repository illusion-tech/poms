import { defineEntity } from '@mikro-orm/core';
import type { LeadOwnerAssignmentType } from '@poms/shared-contracts';
import { Lead } from './lead.entity';

const p = defineEntity.properties;

export const LeadOwnerAssignmentRecordSchema = defineEntity({
    name: 'LeadOwnerAssignmentRecord',
    tableName: 'lead_owner_assignment_record',
    schema: 'poms',
    comment: '线索销售主责申领与分配动作记录',
    indexes: [
        { name: 'idx_lead_owner_assignment_lead_assigned', properties: ['leadId', 'assignedAt'] },
        { name: 'idx_lead_owner_assignment_assigned_by', properties: ['assignedBy'] },
        { name: 'idx_lead_owner_assignment_new_owner', properties: ['newOwnerUserId'] }
    ],
    checks: [
        {
            name: 'chk_lead_owner_assignment_type',
            expression: `"assignment_type" in ('claimed', 'assigned', 'reassigned')`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        leadId: () => p.manyToOne(Lead).mapToPk().fieldName('lead_id').foreignKeyName('lead_owner_assignment_record_lead_id_foreign').updateRule('cascade').deleteRule('restrict').comment('线索 ID'),
        previousOwnerOrgId: p.uuid().nullable().fieldName('previous_owner_org_id').comment('动作前销售主责组织 ID'),
        previousOwnerUserId: p.uuid().nullable().fieldName('previous_owner_user_id').comment('动作前销售主责人 ID'),
        newOwnerOrgId: p.uuid().nullable().fieldName('new_owner_org_id').comment('动作后销售主责组织 ID'),
        newOwnerUserId: p.uuid().fieldName('new_owner_user_id').comment('动作后销售主责人 ID'),
        assignmentType: p.string().$type<LeadOwnerAssignmentType>().length(32).fieldName('assignment_type').comment('负责人动作类型'),
        reason: p.text().nullable().comment('负责人动作原因'),
        assignedAt: p.datetime().fieldName('assigned_at').comment('动作生效时间'),
        assignedBy: p.uuid().fieldName('assigned_by').comment('动作操作人'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人')
    }
});

export class LeadOwnerAssignmentRecord extends LeadOwnerAssignmentRecordSchema.class {}

LeadOwnerAssignmentRecordSchema.setClass(LeadOwnerAssignmentRecord);
