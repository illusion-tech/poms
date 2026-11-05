import { defineEntity } from '@mikro-orm/core';
import { EXPENSE_RECORD_STATUSES, EXPENSE_SOURCE_TYPES, ExpenseSourceTypeValue, type ExpenseCategory, type ExpenseRecordStatus, type ExpenseSourceType } from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const ExpenseRecordSchema = defineEntity({
    name: 'ExpenseRecord',
    tableName: 'expense_record',
    schema: 'poms',
    indexes: [
        { name: 'expense_record_project_date_idx', properties: ['projectId', 'expenseDate'] },
        { name: 'expense_record_project_status_idx', properties: ['projectId', 'status'] }
    ],
    checks: [
        {
            name: 'chk_expense_record_source_type',
            expression: `"source_type" in (${toSqlStringList(EXPENSE_SOURCE_TYPES)})`
        },
        {
            name: 'chk_expense_record_status',
            expression: `"status" in (${toSqlStringList(EXPENSE_RECORD_STATUSES)})`
        },
        { name: "chk_r4e_expense_attachment_count", expression: "((attachment_count >= 0))" },
        { name: "chk_r4e_expense_confirmation", expression: "((((status)::text <> 'confirmed'::text) OR ((confirmed_at IS NOT NULL) AND (confirmed_by IS NOT NULL))))" },
        { name: "chk_r4e_expense_money", expression: "(((amount_including_tax > (0)::numeric) AND ((tax_amount IS NULL) OR ((tax_amount >= (0)::numeric) AND (tax_amount <= amount_including_tax))) AND ((amount_excluding_tax IS NULL) OR ((amount_excluding_tax >= (0)::numeric) AND (amount_excluding_tax <= amount_including_tax))) AND ((tax_amount IS NULL) OR (amount_excluding_tax IS NULL) OR (amount_including_tax = (tax_amount + amount_excluding_tax)))))" },
        { name: "chk_r4e_expense_void", expression: "((((status)::text <> 'voided'::text) OR ((voided_at IS NOT NULL) AND (void_reason IS NOT NULL) AND (length(btrim(void_reason)) > 0))))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').foreignKeyName('expense_record_project_id_foreign').updateRule('cascade').deleteRule('cascade'),
        contractId: () => p.manyToOne(Contract).mapToPk().nullable().fieldName('contract_id').foreignKeyName('expense_record_contract_id_foreign').updateRule('cascade').deleteRule('set null'),
        expenseCategory: p.string().$type<ExpenseCategory>().length(32).fieldName('expense_category'),
        expenseDescription: p.text().fieldName('expense_description'),
        expenseDate: p.date().fieldName('expense_date'),
        currency: p.string().length(16).default('CNY'),
        amountIncludingTax: p.decimal().precision(18).scale(2).fieldName('amount_including_tax'),
        taxAmount: p.decimal().precision(18).scale(2).nullable().fieldName('tax_amount'),
        amountExcludingTax: p.decimal().precision(18).scale(2).nullable().fieldName('amount_excluding_tax'),
        sourceType: p.string().$type<ExpenseSourceType>().length(32).default(ExpenseSourceTypeValue.Manual).fieldName('source_type'),
        status: p.string().$type<ExpenseRecordStatus>().length(32),
        evidenceSummary: p.text().nullable().fieldName('evidence_summary'),
        attachmentCount: p.integer().default(0).fieldName('attachment_count'),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at'),
        confirmedBy: p.uuid().nullable().fieldName('confirmed_by'),
        voidedAt: p.datetime().nullable().fieldName('voided_at'),
        voidReason: p.text().nullable().fieldName('void_reason'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at'),
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
