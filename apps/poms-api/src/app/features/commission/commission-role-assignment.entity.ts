import { defineEntity } from '@mikro-orm/core';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { ContractTermSnapshot } from '../contract/contract.entity';
import {
    ContractHandoverRebaselineRecord,
    ProjectHandover
} from '../project-handover/project-handover.entity';
import { Project } from '../project/project.entity';

export type CommissionRoleAssignmentStatus = 'draft' | 'frozen' | 'superseded';

export interface CommissionParticipant {
    userId: string;
    displayName: string;
    roleType: string;
    weight: number;
}

const p = defineEntity.properties;

export const CommissionRoleAssignmentSchema = defineEntity({
    name: 'CommissionRoleAssignment',
    tableName: 'commission_role_assignment',
    schema: 'poms',
    indexes: [
        { name: 'idx_commission_role_assignment_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_commission_role_assignment_status', properties: ['status'] },
        { name: 'idx_cra_source_handover', properties: ['sourceHandoverId'] },
        { name: 'idx_cra_source_handover_rebaseline', properties: ['sourceHandoverRebaselineRecordId'] },
        { name: 'idx_cra_handover_summary_snapshot', properties: ['handoverSummarySnapshotId'] },
        { name: 'idx_cra_supersedes', properties: ['supersedesId'] }
    ],
    uniques: [
        { name: 'commission_role_assignment_project_version_unique', properties: ['projectId', 'version'] },
        {
            name: 'uq_commission_role_assignment_project_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}") where "${columns.isCurrent}" = true`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commission_role_assignment_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        version: p.integer(),
        isCurrent: p.boolean().default(true).fieldName('is_current'),
        status: p.string().$type<CommissionRoleAssignmentStatus>().length(32).default('draft'),
        participantsJson: p.json<CommissionParticipant[]>().default([]).fieldName('participants_json'),
        sourceHandoverId: () =>
            p
                .manyToOne(ProjectHandover)
                .mapToPk()
                .nullable()
                .fieldName('source_handover_id')
                .foreignKeyName('cra_source_handover_fk')
                .updateRule('cascade')
                .deleteRule('restrict'),
        sourceHandoverRebaselineRecordId: () =>
            p
                .manyToOne(ContractHandoverRebaselineRecord)
                .mapToPk()
                .nullable()
                .fieldName('source_handover_rebaseline_record_id')
                .foreignKeyName('cra_source_handover_rebaseline_fk')
                .updateRule('cascade')
                .deleteRule('restrict'),
        contractSummarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .nullable()
                .fieldName('contract_summary_snapshot_id')
                .foreignKeyName('cra_contract_summary_snapshot_fk')
                .updateRule('cascade')
                .deleteRule('restrict'),
        handoverSummarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .nullable()
                .fieldName('handover_summary_snapshot_id')
                .foreignKeyName('cra_handover_summary_snapshot_fk')
                .updateRule('cascade')
                .deleteRule('restrict'),
        effectiveHandoverBaselineSnapshotId: () =>
            p
                .manyToOne(ContractTermSnapshot)
                .mapToPk()
                .nullable()
                .fieldName('effective_handover_baseline_snapshot_id')
                .foreignKeyName('cra_effective_handover_baseline_fk')
                .updateRule('cascade')
                .deleteRule('restrict'),
        frozenAt: p.datetime().nullable().fieldName('frozen_at'),
        frozenBy: p.uuid().nullable().fieldName('frozen_by'),
        supersedesId: () =>
            p
                .manyToOne(CommissionRoleAssignment)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('commission_role_assignment_supersedes_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionRoleAssignment extends CommissionRoleAssignmentSchema.class {}

CommissionRoleAssignmentSchema.setClass(CommissionRoleAssignment);
