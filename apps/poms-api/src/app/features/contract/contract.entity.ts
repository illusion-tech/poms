import { defineEntity } from '@mikro-orm/core';
import type { ContractStatus } from '@poms/shared-contracts';

const p = defineEntity.properties;

export const ContractSchema = defineEntity({
    name: 'Contract',
    tableName: 'contract',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: p.uuid().fieldName('project_id'),
        contractNo: p.string().length(64).unique().fieldName('contract_no'),
        status: p.string().$type<ContractStatus>().length(32),
        signedAmount: p.string().columnType('numeric(18,2)').fieldName('signed_amount'),
        currencyCode: p.string().length(16).fieldName('currency_code'),
        currentSnapshotId: p.uuid().nullable().fieldName('current_snapshot_id'),
        signedAt: p.datetime().nullable().fieldName('signed_at'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p
            .datetime()
            .onCreate(() => new Date())
            .fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p
            .datetime()
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class Contract extends ContractSchema.class {}

ContractSchema.setClass(Contract);
