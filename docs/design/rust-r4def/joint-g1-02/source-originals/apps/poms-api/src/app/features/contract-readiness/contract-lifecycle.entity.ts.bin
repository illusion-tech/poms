import { defineEntity } from '@mikro-orm/core';
import { CONTRACT_TERM_PREPARATION_STATUSES, type ContractTermPreparationStatus, type ReceivablePlanSeed } from '@poms/shared-contracts';
import { ApprovalRecord } from '../approval/approval-record.entity';
import { Attachment } from '../attachment/attachment.entity';
import { Contract, ContractTermSnapshot } from '../contract/contract.entity';
import { ProjectBidCommercialProcess } from '../project/project-bid-commercial-process.entity';
import { ProjectPricingMarginReview } from '../project/project-pricing-margin-review.entity';
import { ProjectTechnicalCostPackage } from '../project/project-technical-cost-package.entity';
import { Project } from '../project/project.entity';
import { CommercialBaselineDiffResult, CommercialBaselineReviewRecord, CommercialReleaseBaseline } from './commercial-release-baseline.entity';
import { ContractReadinessPackage } from './contract-readiness-package.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

// Compound scope FKs reference UNIQUE tuples rather than entity primary keys.
// UUID identities remain genuine mapToPk relations. createForeignKeyConstraint(false)
// prevents inventing weaker single-column FKs; the exact SQL93 compound constraints
// remain mandatory database rules, itemized in this candidate's INTEGRATION.md.

export const CommercialBaselineReviewAttachmentSchema = defineEntity({
    name: 'CommercialBaselineReviewAttachment',
    tableName: 'commercial_baseline_review_attachment',
    schema: 'poms',
    properties: {
        reviewRecordId: () =>
            p.manyToOne(CommercialBaselineReviewRecord).mapToPk().primary().fieldName('review_record_id')
                .foreignKeyName('commercial_baseline_review_attachment_review_record_id_fkey').updateRule('no action').deleteRule('restrict'),
        attachmentId: () =>
            p.manyToOne(Attachment).mapToPk().primary().fieldName('attachment_id')
                .foreignKeyName('commercial_baseline_review_attachment_attachment_id_fkey').updateRule('no action').deleteRule('restrict')
    }
});

export class CommercialBaselineReviewAttachment extends CommercialBaselineReviewAttachmentSchema.class {}

CommercialBaselineReviewAttachmentSchema.setClass(CommercialBaselineReviewAttachment);

export const ContractTermPreparationSchema = defineEntity({
    name: 'ContractTermPreparation',
    tableName: 'contract_term_preparation',
    schema: 'poms',
    uniques: [
        { name: 'uq_r4_preparation_version', properties: ['contractId', 'version'] },
        { name: 'uq_r4_preparation_id_contract', properties: ['id', 'contractId'] },
        { name: 'uq_r4_preparation_source_scope', properties: ['id', 'sourceReadinessId', 'contractId'] },
        {
            name: 'uq_r4_preparation_current',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractId}") where "${columns.isCurrent}"`
        },
        {
            name: 'uq_r4_preparation_exact',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractId}", "${columns.sourceReadinessId}", "${columns.payloadHash}")`
        }
    ],
    checks: [
        { name: 'contract_term_preparation_version_check', expression: '"version" > 0' },
        { name: 'contract_term_preparation_row_version_check', expression: '"row_version" > 0' },
        { name: 'contract_term_preparation_status_check', expression: `"status" in (${toSqlStringList(CONTRACT_TERM_PREPARATION_STATUSES)})` },
        { name: 'contract_term_preparation_contract_row_version_at_prepara_check', expression: '"contract_row_version_at_preparation" > 0' },
        { name: 'contract_term_preparation_amount_tax_inclusive_check', expression: '"amount_tax_inclusive" > 0' },
        { name: 'contract_term_preparation_amount_tax_exclusive_check', expression: '"amount_tax_exclusive" > 0' },
        { name: 'contract_term_preparation_tax_rate_check', expression: '"tax_rate" between 0 and 1' },
        { name: 'contract_term_preparation_down_payment_rate_check', expression: '"down_payment_rate" between 0 and 1' },
        { name: 'contract_term_preparation_retention_rate_check', expression: '"retention_rate" between 0 and 1' },
        { name: 'contract_term_preparation_receivable_plan_seeds_check', expression: 'jsonb_typeof("receivable_plan_seeds") = \'array\' and jsonb_array_length("receivable_plan_seeds") > 0' },
        { name: 'contract_term_preparation_source_facts_check', expression: 'jsonb_typeof("source_facts") = \'object\'' },
        { name: 'contract_term_preparation_contract_core_hash_check', expression: '"contract_core_hash" ~ \'^[0-9a-f]{64}$\'' },
        { name: 'contract_term_preparation_payload_hash_check', expression: '"payload_hash" ~ \'^[0-9a-f]{64}$\'' },
        {
            name: 'chk_r4_preparation_activation',
            expression: '("status" = \'activated\' and "activated_snapshot_id" is not null and "activated_at" is not null and "activated_by" is not null) or ("status" <> \'activated\' and "activated_snapshot_id" is null and "activated_at" is null and "activated_by" is null)'
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').createForeignKeyConstraint(false),
        contractId: () => p.manyToOne(Contract).mapToPk().fieldName('contract_id').createForeignKeyConstraint(false),
        sourceReadinessId: () => p.manyToOne(ContractReadinessPackage).mapToPk().fieldName('source_readiness_id').createForeignKeyConstraint(false),
        sourceBaselineId: () => p.manyToOne(CommercialReleaseBaseline).mapToPk().fieldName('source_baseline_id').createForeignKeyConstraint(false),
        sourceDiffResultId: () => p.manyToOne(CommercialBaselineDiffResult).mapToPk().fieldName('source_diff_result_id').createForeignKeyConstraint(false),
        sourceCostPackageId: () =>
            p.manyToOne(ProjectTechnicalCostPackage).mapToPk().fieldName('source_cost_package_id')
                .foreignKeyName('contract_term_preparation_source_cost_package_id_fkey').updateRule('no action').deleteRule('restrict'),
        sourceBidProcessId: () =>
            p.manyToOne(ProjectBidCommercialProcess).mapToPk().nullable().fieldName('source_bid_process_id')
                .foreignKeyName('contract_term_preparation_source_bid_process_id_fkey').updateRule('no action').deleteRule('restrict'),
        sourcePricingReviewId: () =>
            p.manyToOne(ProjectPricingMarginReview).mapToPk().fieldName('source_pricing_review_id')
                .foreignKeyName('contract_term_preparation_source_pricing_review_id_fkey').updateRule('no action').deleteRule('restrict'),
        version: p.integer(),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        isCurrent: p.boolean().default(true).fieldName('is_current'),
        supersedesId: () =>
            p.manyToOne(ContractTermPreparation).mapToPk().nullable().fieldName('supersedes_id')
                .foreignKeyName('contract_term_preparation_supersedes_id_fkey').updateRule('no action').deleteRule('restrict'),
        status: p.string().length(32).$type<ContractTermPreparationStatus>(),
        contractRowVersionAtPreparation: p.integer().fieldName('contract_row_version_at_preparation'),
        currencyCode: p.string().length(16).fieldName('currency_code'),
        amountTaxInclusive: p.string().columnType('numeric(18,2)').precision(18).scale(2).fieldName('amount_tax_inclusive'),
        amountTaxExclusive: p.string().columnType('numeric(18,2)').precision(18).scale(2).fieldName('amount_tax_exclusive'),
        taxRate: p.string().columnType('numeric(5,4)').precision(5).scale(4).fieldName('tax_rate'),
        downPaymentRate: p.string().columnType('numeric(5,4)').precision(5).scale(4).fieldName('down_payment_rate'),
        retentionRate: p.string().columnType('numeric(5,4)').precision(5).scale(4).fieldName('retention_rate'),
        retentionDueDate: p.date().nullable().fieldName('retention_due_date'),
        paymentTerms: p.string().length(1000).fieldName('payment_terms'),
        receivablePlanSeeds: p.json<ReceivablePlanSeed[]>().fieldName('receivable_plan_seeds'),
        sourceFacts: p.json<Record<string, unknown>>().fieldName('source_facts'),
        contractCoreHash: p.string().length(64).fieldName('contract_core_hash'),
        payloadHash: p.string().length(64).fieldName('payload_hash'),
        preparedAt: p.datetime().columnType('timestamptz').defaultRaw('now()').fieldName('prepared_at'),
        preparedBy: p.uuid().fieldName('prepared_by'),
        preparedComment: p.string().length(1000).nullable().fieldName('prepared_comment'),
        activatedSnapshotId: () => p.manyToOne(ContractTermSnapshot).mapToPk().nullable().fieldName('activated_snapshot_id').createForeignKeyConstraint(false),
        activatedAt: p.datetime().columnType('timestamptz').nullable().fieldName('activated_at'),
        activatedBy: p.uuid().nullable().fieldName('activated_by'),
        createdAt: p.datetime().columnType('timestamptz').defaultRaw('now()').fieldName('created_at'),
        updatedAt: p.datetime().columnType('timestamptz').defaultRaw('now()').fieldName('updated_at')
    }
});

export class ContractTermPreparation extends ContractTermPreparationSchema.class {}

ContractTermPreparationSchema.setClass(ContractTermPreparation);

export const ContractReviewBindingSchema = defineEntity({
    name: 'ContractReviewBinding',
    tableName: 'contract_review_binding',
    schema: 'poms',
    indexes: [{
        name: 'idx_r4_review_contract',
        expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractId}", "${columns.createdAt}" desc)`
    }],
    checks: [
        { name: 'contract_review_binding_preparation_version_check', expression: '"preparation_version" > 0' },
        { name: 'contract_review_binding_payload_hash_check', expression: '"payload_hash" ~ \'^[0-9a-f]{64}$\'' }
    ],
    properties: {
        approvalRecordId: () =>
            p.manyToOne(ApprovalRecord).mapToPk().primary().fieldName('approval_record_id')
                .foreignKeyName('contract_review_binding_approval_record_id_fkey').updateRule('no action').deleteRule('restrict'),
        contractId: () =>
            p.manyToOne(Contract).mapToPk().fieldName('contract_id')
                .foreignKeyName('contract_review_binding_contract_id_fkey').updateRule('no action').deleteRule('restrict'),
        preparationId: () => p.manyToOne(ContractTermPreparation).mapToPk().fieldName('preparation_id').createForeignKeyConstraint(false),
        preparationVersion: p.integer().fieldName('preparation_version'),
        payloadHash: p.string().length(64).fieldName('payload_hash'),
        createdAt: p.datetime().columnType('timestamptz').defaultRaw('now()').fieldName('created_at'),
        createdBy: p.uuid().fieldName('created_by')
    }
});

export class ContractReviewBinding extends ContractReviewBindingSchema.class {}

ContractReviewBindingSchema.setClass(ContractReviewBinding);

export const ReceivablePlanVersionSchema = defineEntity({
    name: 'ReceivablePlanVersion',
    tableName: 'receivable_plan_version',
    schema: 'poms',
    uniques: [
        { name: 'uq_r4_plan_contract_version', properties: ['contractId', 'version'] },
        { name: 'uq_r4_plan_contract_snapshot', properties: ['contractId', 'snapshotId'] },
        { name: 'uq_r4_plan_id_contract', properties: ['id', 'contractId'] },
        {
            name: 'uq_r4_plan_contract_current',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractId}") where "${columns.isCurrent}"`
        }
    ],
    checks: [
        { name: 'receivable_plan_version_version_check', expression: '"version" > 0' },
        { name: 'receivable_plan_version_row_version_check', expression: '"row_version" > 0' },
        { name: 'receivable_plan_version_status_check', expression: '"status" in (\'active\', \'superseded\', \'voided\')' },
        { name: 'receivable_plan_version_amount_tax_inclusive_check', expression: '"amount_tax_inclusive" > 0' },
        { name: 'receivable_plan_version_payload_hash_check', expression: '"payload_hash" ~ \'^[0-9a-f]{64}$\'' }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').createForeignKeyConstraint(false),
        contractId: () => p.manyToOne(Contract).mapToPk().fieldName('contract_id').createForeignKeyConstraint(false),
        snapshotId: () => p.manyToOne(ContractTermSnapshot).mapToPk().fieldName('snapshot_id').createForeignKeyConstraint(false),
        sourcePreparationId: () => p.manyToOne(ContractTermPreparation).mapToPk().fieldName('source_preparation_id').createForeignKeyConstraint(false),
        sourceReadinessId: () => p.manyToOne(ContractReadinessPackage).mapToPk().fieldName('source_readiness_id').createForeignKeyConstraint(false),
        version: p.integer(),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        isCurrent: p.boolean().default(true).fieldName('is_current'),
        supersedesId: () =>
            p.manyToOne(ReceivablePlanVersion).mapToPk().nullable().fieldName('supersedes_id')
                .foreignKeyName('receivable_plan_version_supersedes_id_fkey').updateRule('no action').deleteRule('restrict'),
        // SQL93 persistence values; no additional public enum is introduced here.
        status: p.string().length(32).$type<'active' | 'superseded' | 'voided'>(),
        currencyCode: p.string().length(16).fieldName('currency_code'),
        amountTaxInclusive: p.string().columnType('numeric(18,2)').precision(18).scale(2).fieldName('amount_tax_inclusive'),
        payloadHash: p.string().length(64).fieldName('payload_hash'),
        initializedAt: p.datetime().columnType('timestamptz').defaultRaw('now()').fieldName('initialized_at'),
        initializedBy: p.uuid().fieldName('initialized_by'),
        createdAt: p.datetime().columnType('timestamptz').defaultRaw('now()').fieldName('created_at'),
        updatedAt: p.datetime().columnType('timestamptz').defaultRaw('now()').fieldName('updated_at')
    }
});

export class ReceivablePlanVersion extends ReceivablePlanVersionSchema.class {}

ReceivablePlanVersionSchema.setClass(ReceivablePlanVersion);

export const ReceivablePlanNodeSchema = defineEntity({
    name: 'ReceivablePlanNode',
    tableName: 'receivable_plan_node',
    schema: 'poms',
    uniques: [
        { name: 'uq_r4_plan_node_key', properties: ['planVersionId', 'nodeKey'] },
        { name: 'uq_r4_plan_node_order', properties: ['planVersionId', 'sortOrder'] }
    ],
    checks: [
        { name: 'receivable_plan_node_planned_amount_check', expression: '"planned_amount" > 0' },
        { name: 'receivable_plan_node_sort_order_check', expression: '"sort_order" >= 0' }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        planVersionId: () =>
            p.manyToOne(ReceivablePlanVersion).mapToPk().fieldName('plan_version_id')
                .foreignKeyName('receivable_plan_node_plan_version_id_fkey').updateRule('no action').deleteRule('restrict'),
        nodeKey: p.string().length(64).fieldName('node_key'),
        label: p.string().length(128),
        plannedAmount: p.string().columnType('numeric(18,2)').precision(18).scale(2).fieldName('planned_amount'),
        plannedDate: p.date().fieldName('planned_date'),
        isRetentionNode: p.boolean().fieldName('is_retention_node'),
        sortOrder: p.integer().fieldName('sort_order'),
        note: p.string().length(1000).nullable()
    }
});

export class ReceivablePlanNode extends ReceivablePlanNodeSchema.class {}

ReceivablePlanNodeSchema.setClass(ReceivablePlanNode);

export const ReceivablePlanInitRecordSchema = defineEntity({
    name: 'ReceivablePlanInitRecord',
    tableName: 'receivable_plan_init_record',
    schema: 'poms',
    uniques: [{ name: 'receivable_plan_init_record_plan_version_id_key', properties: ['planVersionId'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        planVersionId: () =>
            p.manyToOne(ReceivablePlanVersion).mapToPk().fieldName('plan_version_id')
                .foreignKeyName('receivable_plan_init_record_plan_version_id_fkey').updateRule('no action').deleteRule('restrict'),
        contractId: () => p.manyToOne(Contract).mapToPk().fieldName('contract_id').createForeignKeyConstraint(false),
        snapshotId: () => p.manyToOne(ContractTermSnapshot).mapToPk().fieldName('snapshot_id').createForeignKeyConstraint(false),
        sourceReadinessId: () =>
            p.manyToOne(ContractReadinessPackage).mapToPk().fieldName('source_readiness_id')
                .foreignKeyName('receivable_plan_init_record_source_readiness_id_fkey').updateRule('no action').deleteRule('restrict'),
        actorId: p.uuid().fieldName('actor_id'),
        comment: p.string().length(1000).nullable(),
        initializedAt: p.datetime().columnType('timestamptz').defaultRaw('now()').fieldName('initialized_at')
    }
});

export class ReceivablePlanInitRecord extends ReceivablePlanInitRecordSchema.class {}

ReceivablePlanInitRecordSchema.setClass(ReceivablePlanInitRecord);
