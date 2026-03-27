import { defineEntity } from '@mikro-orm/core';
import type { ReceiptRecordStatus } from '@poms/shared-contracts';

const p = defineEntity.properties;

export const ReceiptRecordSchema = defineEntity({
    name: 'ReceiptRecord',
    tableName: 'receipt_record',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        contractId: p.uuid().fieldName('contract_id'),
        projectId: p.uuid().fieldName('project_id'),
        receiptAmount: p.decimal().precision(18).scale(2).fieldName('receipt_amount'),
        receiptDate: p.datetime().fieldName('receipt_date'),
        sourceType: p.string().length(32).fieldName('source_type'),
        status: p.string().$type<ReceiptRecordStatus>().length(32),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at'),
        confirmedBy: p.uuid().nullable().fieldName('confirmed_by'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().onCreate(() => new Date()).fieldName('created_at'),
        updatedAt: p
            .datetime()
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
    }
});

export class ReceiptRecord extends ReceiptRecordSchema.class {}

ReceiptRecordSchema.setClass(ReceiptRecord);
