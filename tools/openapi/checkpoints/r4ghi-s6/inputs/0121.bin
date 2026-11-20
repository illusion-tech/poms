import { defineEntity } from '@mikro-orm/core';
import { CONTRACT_STATUSES, CONTRACT_TERM_SNAPSHOT_STATUSES, ContractTermSnapshotStatusValue, type ContractStatus, type ContractTermSnapshotStatus, type ReceivablePlanSeed } from '@poms/shared-contracts';
import { CommercialReleaseBaseline } from '../contract-readiness/commercial-release-baseline.entity';
import { ContractReadinessPackage } from '../contract-readiness/contract-readiness-package.entity';
import { ContractTermPreparation, ContractReviewBinding } from '../contract-readiness/contract-lifecycle.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export type ContractAmendmentStatus = 'draft' | 'submitted' | 'approved' | 'effective' | 'superseded' | 'voided';

export const ContractSchema = defineEntity({
    name: 'Contract',
    tableName: 'contract',
    schema: 'poms',
    comment: 'POMS 第一阶段合同主表',
    indexes: [
        { name: 'idx_contract_project_id', properties: ['projectId'] },
        { name: 'idx_contract_status', properties: ['status'] }
    ],
    uniques: [{ name: 'uq_r4_contract_id_project', properties: ['id', 'projectId'] }],
    checks: [
        {
            name: 'chk_contract_status',
            expression: `"status" in (${toSqlStringList(CONTRACT_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('合同主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').foreignKeyName('contract_project_id_foreign').updateRule('cascade').deleteRule('restrict').comment('所属项目标识'),
        contractNo: p.string().length(64).unique().fieldName('contract_no').comment('合同编号'),
        customerContractNo: p.string().length(128).nullable().fieldName('customer_contract_no').comment('客户合同编号'),
        status: p.string().$type<ContractStatus>().length(32).comment('合同状态'),
        signedAmount: p.string().columnType('numeric(18,2)').defaultRaw('0').fieldName('signed_amount').comment('合同签约金额'),
        currencyCode: p.string().length(16).default('CNY').fieldName('currency_code').comment('币种代码'),
        currentSnapshotId: p.uuid().nullable().fieldName('current_snapshot_id').comment('当前生效条款快照标识'),
        signedAt: p.datetime().nullable().fieldName('signed_at').comment('签约时间'),
        retentionDueDate: p.date().nullable().fieldName('retention_due_date').comment('质保期届满日期'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export class Contract extends ContractSchema.class {}

ContractSchema.setClass(Contract);

export const ContractTermSnapshotSchema = defineEntity({
    name: 'ContractTermSnapshot',
    tableName: 'contract_term_snapshot',
    schema: 'poms',
    comment: '合同条款生效快照',
    indexes: [
        {
            name: 'idx_contract_term_snapshot_contract_effective',
            expression: (columns, table, indexName) => `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractId}", "${columns.effectiveAt}" desc)`
        },
        { name: 'idx_contract_term_snapshot_status', properties: ['snapshotStatus'] },
        { name: 'idx_contract_term_snapshot_baseline', properties: ['sourceBaselineId'] },
        { name: 'idx_contract_term_snapshot_readiness', properties: ['sourceReadinessId'] }
    ],
    uniques: [
        { name: 'uq_r4_snapshot_id_contract', properties: ['id', 'contractId'] },
        { name: 'uq_r4_snapshot_preparation_scope', properties: ['id', 'contractId', 'sourcePreparationId'] },
        {
            name: 'uq_r4_snapshot_source_preparation',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourcePreparationId}") where "${columns.sourcePreparationId}" is not null`
        },
        {
            name: 'uq_contract_term_snapshot_contract_active',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractId}") where "${columns.snapshotStatus}" = '${ContractTermSnapshotStatusValue.Active}'`
        }
    ],
    checks: [
        {
            name: 'chk_contract_term_snapshot_status',
            expression: `"snapshot_status" in (${toSqlStringList(CONTRACT_TERM_SNAPSHOT_STATUSES)})`
        },
        {"name":"chk_r4g_term_currency","expression":"currency_code IS NULL OR currency_code~'^[A-Z]{3}$'"}
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        contractId: () => p.manyToOne(Contract).mapToPk().fieldName('contract_id').foreignKeyName('contract_term_snapshot_contract_id_foreign').updateRule('cascade').deleteRule('restrict').comment('所属合同 ID'),
        effectiveAt: p.datetime().defaultRaw('now()').fieldName('effective_at').comment('生效时间'),
        effectiveBy: p.uuid().nullable().fieldName('effective_by').comment('生效操作人'),
        retentionDueDate: p.date().nullable().fieldName('retention_due_date').comment('质保期届满日期'),
        amountTaxInclusive: p.string().columnType('numeric(18,2)').nullable().fieldName('amount_tax_inclusive').comment('含税金额'),
        amountTaxExclusive: p.string().columnType('numeric(18,2)').nullable().fieldName('amount_tax_exclusive').comment('未税金额'),
        taxRate: p.string().columnType('numeric(5,4)').nullable().fieldName('tax_rate').comment('税率'),
        downPaymentRate: p.string().columnType('numeric(5,4)').nullable().fieldName('down_payment_rate').comment('首付款比例'),
        retentionRate: p.string().columnType('numeric(5,4)').nullable().fieldName('retention_rate').comment('质保金比例'),
        paymentTerms: p.string().length(1000).nullable().fieldName('payment_terms').comment('付款条款'),
        sourceReadinessId: () =>
            p.manyToOne(ContractReadinessPackage).mapToPk().nullable().fieldName('source_readiness_id').foreignKeyName('contract_term_snapshot_source_readiness_fk').updateRule('cascade').deleteRule('restrict').comment('来源签约就绪包 ID'),
        sourceBaselineId: () =>
            p.manyToOne(CommercialReleaseBaseline).mapToPk().nullable().fieldName('source_baseline_id').foreignKeyName('contract_term_snapshot_source_baseline_fk').updateRule('cascade').deleteRule('restrict').comment('来源商业放行基线 ID'),
        // fk_r4_snapshot_preparation_contract is retained as the SQL93 compound
        // (source_preparation_id, contract_id) scope FK, not a weaker scalar FK.
        sourcePreparationId: () => p.manyToOne(ContractTermPreparation).mapToPk().nullable().fieldName('source_preparation_id').createForeignKeyConstraint(false),
        receivablePlanSeeds: p.json<ReceivablePlanSeed[]>().nullable().fieldName('receivable_plan_seeds'),
        payloadHash: p.string().length(64).nullable().fieldName('payload_hash'),
        version: p.integer().default(1).comment('快照版本号'),
        snapshotStatus: p.string().length(32).default(ContractTermSnapshotStatusValue.Active).fieldName('snapshot_status').$type<ContractTermSnapshotStatus>().comment('快照状态：active/superseded/voided'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        sourceAmendmentId: () => p.manyToOne(ContractAmendment).mapToPk().nullable().fieldName("source_amendment_id").createForeignKeyConstraint(false)
    ,
        currencyCode: p.string().length(3).nullable().fieldName("currency_code")
    }
});

export class ContractTermSnapshot extends ContractTermSnapshotSchema.class {}

ContractTermSnapshotSchema.setClass(ContractTermSnapshot);

export const ContractAmendmentSchema = defineEntity({
    name: 'ContractAmendment',
    tableName: 'contract_amendment',
    schema: 'poms',
    comment: '合同变更版本表',
    indexes: [
        { name: 'idx_contract_amendment_contract', properties: ['contractId'] },
        { name: 'idx_contract_amendment_status', properties: ['status'] },
        { name: 'idx_contract_amendment_supersedes', properties: ['supersedesId'] }
    ],
    uniques: [
        { name: 'uq_contract_amendment_contract_version', properties: ['contractId', 'version'] },
        {
            name: 'uq_contract_amendment_contract_current',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractId}") where "${columns.isCurrent}" = true`
        },
        { name: "uq_r4d_amendment_scope", properties: ["id","contractId"] },
        { name: "uq_r4d_amendment_open", expression: "CREATE UNIQUE INDEX uq_r4d_amendment_open ON poms.contract_amendment USING btree (contract_id) WHERE ((producer_version = 1) AND ((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying])::text[])))" }
    ],
    checks: [
        { name: "chk_r4d_amendment_producer", expression: "(((producer_version IS NULL) OR ((producer_version = 1) AND (project_id IS NOT NULL) AND (source_readiness_id IS NOT NULL) AND (before_snapshot_id IS NOT NULL) AND (amendment_reason IS NOT NULL) AND (length(btrim((amendment_reason)::text)) > 0) AND (payload_hash IS NOT NULL) AND ((payload_hash)::text ~ '^[0-9a-f]{64}$'::text) AND (((status)::text <> ALL ((ARRAY['submitted'::character varying, 'approved'::character varying, 'effective'::character varying, 'superseded'::character varying])::text[])) OR ((source_preparation_id IS NOT NULL) AND (source_review_id IS NOT NULL))) AND (((status)::text <> ALL ((ARRAY['effective'::character varying, 'superseded'::character varying])::text[])) OR ((after_snapshot_id IS NOT NULL) AND (after_snapshot_id <> before_snapshot_id) AND (effective_at IS NOT NULL) AND (effective_by IS NOT NULL))))))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        contractId: () => p.manyToOne(Contract).mapToPk().fieldName('contract_id').foreignKeyName('contract_amendment_contract_id_foreign').updateRule('cascade').deleteRule('restrict').comment('所属合同 ID'),
        version: p.integer().comment('合同变更版本号'),
        isCurrent: p.boolean().default(false).fieldName('is_current').comment('是否当前有效变更版本'),
        supersedesId: () => p.manyToOne(ContractAmendment).mapToPk().nullable().fieldName('supersedes_id').foreignKeyName('contract_amendment_supersedes_id_foreign').updateRule('cascade').deleteRule('set null').comment('被替代的合同变更版本'),
        status: p.string().length(32).default('draft').$type<ContractAmendmentStatus>().comment('状态：draft/submitted/approved/effective/superseded/voided'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        producerVersion: p.integer().nullable().fieldName("producer_version"),
        projectId: () => p.manyToOne(Project).mapToPk().nullable().fieldName("project_id").createForeignKeyConstraint(false),
        sourceReadinessId: () => p.manyToOne(ContractReadinessPackage).mapToPk().nullable().fieldName("source_readiness_id").createForeignKeyConstraint(false),
        sourcePreparationId: () => p.manyToOne(ContractTermPreparation).mapToPk().nullable().fieldName("source_preparation_id").createForeignKeyConstraint(false),
        sourceReviewId: () => p.manyToOne(ContractReviewBinding).mapToPk().nullable().fieldName("source_review_id").createForeignKeyConstraint(false),
        beforeSnapshotId: () => p.manyToOne(ContractTermSnapshot).mapToPk().nullable().fieldName("before_snapshot_id").createForeignKeyConstraint(false),
        afterSnapshotId: () => p.manyToOne(ContractTermSnapshot).mapToPk().nullable().fieldName("after_snapshot_id").createForeignKeyConstraint(false),
        amendmentReason: p.string().length(1000).nullable().fieldName("amendment_reason"),
        payloadHash: p.string().length(64).nullable().fieldName("payload_hash"),
        effectiveAt: p.datetime().columnType('timestamptz').nullable().fieldName("effective_at"),
        effectiveBy: p.uuid().nullable().fieldName("effective_by")
    }
});

export class ContractAmendment extends ContractAmendmentSchema.class {}

ContractAmendmentSchema.setClass(ContractAmendment);
