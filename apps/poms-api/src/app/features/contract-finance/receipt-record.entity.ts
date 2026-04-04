import { defineEntity } from '@mikro-orm/core';
import type { ReceiptRecordStatus } from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const ReceiptRecordSchema = defineEntity({
    name: 'ReceiptRecord',
    tableName: 'receipt_record',
    schema: 'poms',
    indexes: [{ name: 'receipt_record_project_status_idx', properties: ['projectId', 'status'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        contractId: () =>
            p
                .manyToOne(Contract)
                .mapToPk()
                .fieldName('contract_id')
                .foreignKeyName('receipt_record_contract_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('receipt_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        receiptAmount: p.decimal().precision(18).scale(2).fieldName('receipt_amount'),
        receiptDate: p.datetime().fieldName('receipt_date'),
        sourceType: p.string().length(32).fieldName('source_type'),
        status: p.string().$type<ReceiptRecordStatus>().length(32),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at'),
        confirmedBy: p.uuid().nullable().fieldName('confirmed_by'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
    }
});

export class ReceiptRecord extends ReceiptRecordSchema.class {}

ReceiptRecordSchema.setClass(ReceiptRecord);
