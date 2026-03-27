import { defineEntity } from '@mikro-orm/core';
import type { PaymentRecordStatus } from '@poms/shared-contracts';

const p = defineEntity.properties;

export const PaymentRecordSchema = defineEntity({
    name: 'PaymentRecord',
    tableName: 'payment_record',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: p.uuid().fieldName('project_id'),
        contractId: p.uuid().nullable().fieldName('contract_id'),
        paymentAmount: p.decimal().precision(18).scale(2).fieldName('payment_amount'),
        paymentDate: p.datetime().fieldName('payment_date'),
        costCategory: p.string().length(64).fieldName('cost_category'),
        sourceType: p.string().length(32).fieldName('source_type'),
        status: p.string().$type<PaymentRecordStatus>().length(32),
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

export class PaymentRecord extends PaymentRecordSchema.class {}

PaymentRecordSchema.setClass(PaymentRecord);
