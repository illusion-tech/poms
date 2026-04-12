import { defineEntity } from '@mikro-orm/core';
import type { ExpenseCategory, ExpenseRecordStatus, ExpenseSourceType } from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const ExpenseRecordSchema = defineEntity({
    name: 'ExpenseRecord',
    tableName: 'expense_record',
    schema: 'poms',
    indexes: [
        { name: 'expense_record_project_date_idx', properties: ['projectId', 'expenseDate'] },
        { name: 'expense_record_project_status_idx', properties: ['projectId', 'status'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('expense_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        contractId: () =>
            p
                .manyToOne(Contract)
                .mapToPk()
                .nullable()
                .fieldName('contract_id')
                .foreignKeyName('expense_record_contract_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        expenseCategory: p.string().$type<ExpenseCategory>().length(32).fieldName('expense_category'),
        expenseDescription: p.text().fieldName('expense_description'),
        expenseDate: p.date().fieldName('expense_date'),
        currency: p.string().length(16).default('CNY'),
        amountIncludingTax: p.decimal().precision(15).scale(4).fieldName('amount_including_tax'),
        taxAmount: p.decimal().precision(15).scale(4).nullable().fieldName('tax_amount'),
        amountExcludingTax: p.decimal().precision(15).scale(4).nullable().fieldName('amount_excluding_tax'),
        sourceType: p.string().$type<ExpenseSourceType>().length(32).default('manual').fieldName('source_type'),
        status: p.string().$type<ExpenseRecordStatus>().length(32),
        evidenceSummary: p.text().nullable().fieldName('evidence_summary'),
        attachmentCount: p.integer().default(0).fieldName('attachment_count'),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at'),
        confirmedBy: p.uuid().nullable().fieldName('confirmed_by'),
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

export class ExpenseRecord extends ExpenseRecordSchema.class {}

ExpenseRecordSchema.setClass(ExpenseRecord);
