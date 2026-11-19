import { defineEntity } from '@mikro-orm/core';
import type { CommissionLowDownPaymentDecision } from '@poms/shared-contracts';
import { PlatformUser } from '../platform/platform-user.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { Project } from '../project/project.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';

const p = defineEntity.properties;

// SQL migration owns the append-only trigger and the business constraints.
export const CommissionLowDownPaymentReleaseSchema = defineEntity({
    name: 'CommissionLowDownPaymentRelease',
    tableName: 'commission_low_down_payment_release',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').updateRule('no action').deleteRule('restrict'),
        freezeVersionId: () => p.manyToOne(CommissionRoleAssignment).mapToPk().fieldName('freeze_version_id').updateRule('no action').deleteRule('restrict'),
        freezeRowVersion: p.integer().fieldName('freeze_row_version'),
        sourceHandoverId: () => p.manyToOne(ProjectHandover).mapToPk().fieldName('source_handover_id').updateRule('no action').deleteRule('restrict'),
        contractIds: p.json().$type<string[]>().fieldName('contract_ids'),
        sourceContractScope: p.json().$type<Array<Record<string, unknown>>>().fieldName('source_contract_scope'),
        decision: p.string().$type<CommissionLowDownPaymentDecision>().length(32),
        reason: p.text(),
        conditionsConfirmed: p.boolean().fieldName('conditions_confirmed'),
        criteria: p.json().$type<Record<string, unknown>>(),
        approvedBy: () => p.manyToOne(PlatformUser).mapToPk().fieldName('approved_by').updateRule('no action').deleteRule('restrict'),
        approvedAt: p.datetime().defaultRaw('now()').fieldName('approved_at'),
        rowVersion: p.integer().default(1).fieldName('row_version')
    }
});

export class CommissionLowDownPaymentRelease extends CommissionLowDownPaymentReleaseSchema.class {}
CommissionLowDownPaymentReleaseSchema.setClass(CommissionLowDownPaymentRelease);
