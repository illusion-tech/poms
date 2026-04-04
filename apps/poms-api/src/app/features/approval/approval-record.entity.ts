import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const ApprovalRecordSchema = defineEntity({
    name: 'ApprovalRecord',
    tableName: 'approval_record',
    schema: 'poms',
    comment: 'POMS 第一阶段统一审批记录表',
    indexes: [
        { name: 'idx_approval_record_target', properties: ['targetObjectType', 'targetObjectId'] },
        { name: 'idx_approval_record_status', properties: ['currentStatus'] },
        { name: 'idx_approval_record_approver', properties: ['currentApproverUserId'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        approvalType: p.string().length(64).fieldName('approval_type'),
        businessDomain: p.string().length(64).fieldName('business_domain'),
        targetObjectType: p.string().length(64).fieldName('target_object_type'),
        targetObjectId: p.uuid().fieldName('target_object_id'),
        projectId: p.uuid().nullable().fieldName('project_id'),
        currentStatus: p.string().length(32).fieldName('current_status'),
        currentNodeKey: p.string().length(64).fieldName('current_node_key'),
        initiatorUserId: p.uuid().fieldName('initiator_user_id'),
        currentApproverUserId: p.uuid().nullable().fieldName('current_approver_user_id'),
        decision: p.string().length(32).nullable(),
        decisionComment: p.text().nullable().fieldName('decision_comment'),
        submittedAt: p.datetime().fieldName('submitted_at'),
        decidedAt: p.datetime().nullable().fieldName('decided_at'),
        closedAt: p.datetime().nullable().fieldName('closed_at'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
    }
});

export class ApprovalRecord extends ApprovalRecordSchema.class {}

ApprovalRecordSchema.setClass(ApprovalRecord);
