import { defineEntity } from '@mikro-orm/core';
import type { PaymentRecordStatus } from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const PaymentRecordSchema = defineEntity({
    name: 'PaymentRecord',
    tableName: 'payment_record',
    schema: 'poms',
    indexes: [{ name: 'payment_record_project_status_idx', properties: ['projectId', 'status'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('payment_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        contractId: () =>
            p
                .manyToOne(Contract)
                .mapToPk()
                .nullable()
                .fieldName('contract_id')
                .foreignKeyName('payment_record_contract_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        paymentAmount: p.decimal().precision(18).scale(2).fieldName('payment_amount'),
        paymentDate: p.datetime().fieldName('payment_date'),
        costCategory: p.string().length(64).fieldName('cost_category'),
        sourceType: p.string().length(32).fieldName('source_type'),
        status: p.string().$type<PaymentRecordStatus>().length(32),
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

export class PaymentRecord extends PaymentRecordSchema.class {}

PaymentRecordSchema.setClass(PaymentRecord);
