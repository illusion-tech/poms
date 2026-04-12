import { defineEntity } from '@mikro-orm/core';
import type { InvoiceRecordExceptionStatus, InvoiceRecordStatus, InvoiceRecordType } from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const InvoiceRecordSchema = defineEntity({
    name: 'InvoiceRecord',
    tableName: 'invoice_record',
    schema: 'poms',
    indexes: [
        { name: 'invoice_record_project_status_idx', properties: ['projectId', 'status'] },
        { name: 'invoice_record_contract_status_idx', properties: ['contractId', 'status'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('invoice_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        contractId: () =>
            p
                .manyToOne(Contract)
                .mapToPk()
                .nullable()
                .fieldName('contract_id')
                .foreignKeyName('invoice_record_contract_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        invoiceType: p.string().$type<InvoiceRecordType>().length(16).fieldName('invoice_type'),
        invoiceNumber: p.string().length(128).unique().fieldName('invoice_no'),
        invoiceAmount: p.decimal().precision(18).scale(2).fieldName('invoice_amount'),
        invoiceDate: p.date().fieldName('invoice_date'),
        status: p.string().$type<InvoiceRecordStatus>().length(32),
        exceptionStatus: p.string().$type<InvoiceRecordExceptionStatus>().length(32).default('none').fieldName('exception_status'),
        exceptionReason: p.text().nullable().fieldName('exception_reason'),
        exceptionResolution: p.text().nullable().fieldName('exception_resolution'),
        closedAt: p.datetime().nullable().fieldName('closed_at'),
        closeReason: p.text().nullable().fieldName('close_reason'),
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

export class InvoiceRecord extends InvoiceRecordSchema.class {}

InvoiceRecordSchema.setClass(InvoiceRecord);
