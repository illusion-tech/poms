import { defineEntity } from '@mikro-orm/core';
import type { PayableRecordStatus } from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const PayableRecordSchema = defineEntity({
    name: 'PayableRecord',
    tableName: 'payable_record',
    schema: 'poms',
    indexes: [{ name: 'payable_record_project_status_idx', properties: ['projectId', 'status'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('payable_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        contractId: () =>
            p
                .manyToOne(Contract)
                .mapToPk()
                .nullable()
                .fieldName('contract_id')
                .foreignKeyName('payable_record_contract_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        vendorName: p.string().length(200).fieldName('vendor_name'),
        costCategory: p.string().length(64).fieldName('cost_category'),
        payableDescription: p.text().fieldName('payable_description'),
        currency: p.string().length(16).default('CNY'),
        registeredAmount: p.decimal().precision(18).scale(2).fieldName('registered_amount'),
        paidAmount: p.decimal().precision(18).scale(2).fieldName('paid_amount').default('0'),
        expectedPaymentDate: p.date().fieldName('expected_payment_date'),
        status: p.string().$type<PayableRecordStatus>().length(32),
        evidenceSummary: p.text().nullable().fieldName('evidence_summary'),
        attachmentCount: p.integer().default(0).fieldName('attachment_count'),
        closedAt: p.datetime().nullable().fieldName('closed_at'),
        closeReason: p.text().nullable().fieldName('close_reason'),
        voidedAt: p.datetime().nullable().fieldName('voided_at'),
        voidReason: p.text().nullable().fieldName('void_reason'),
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

export class PayableRecord extends PayableRecordSchema.class {}

PayableRecordSchema.setClass(PayableRecord);
