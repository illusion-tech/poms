import { CostGovernanceEvidence } from "./cost-governance-evidence.entity";
import { defineEntity } from '@mikro-orm/core';
import { OPERATING_PENDING_LIFECYCLE_STATUSES, OperatingPendingLifecycleStatusValue, type OperatingPendingLifecycleStatus } from '@poms/shared-contracts';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const SharedCostAllocationBasisSchema = defineEntity({
    name: 'SharedCostAllocationBasis',
    tableName: 'shared_cost_allocation_basis',
    schema: 'poms',
    comment: '共享成本分摊依据主表',
    indexes: [
        { name: 'idx_scab_scope_key', properties: ['sourceCostScopeKey'] },
        {
            name: 'idx_scab_status_effective',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.status}", "${columns.effectiveAt}" desc)`
        }
    ],
    uniques: [
        {
            name: 'uq_scab_scope_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourceCostScopeKey}") where "${columns.status}" = '${OperatingPendingLifecycleStatusValue.Active}'`
        },
        { name: "uq_r4f_basis_successor", expression: "CREATE UNIQUE INDEX uq_r4f_basis_successor ON poms.shared_cost_allocation_basis USING btree (supersedes_id) WHERE (supersedes_id IS NOT NULL)" }
    ],
    checks: [
        {
            name: 'chk_shared_cost_allocation_basis_status',
            expression: `"status" in (${toSqlStringList(OPERATING_PENDING_LIFECYCLE_STATUSES)})`
        },
        { name: "chk_r4f_basis_money_layers", expression: "((((source_amount_excluding_tax IS NULL) OR (source_amount_excluding_tax >= (0)::numeric)) AND ((source_tax_cost_amount IS NULL) OR (source_tax_cost_amount >= (0)::numeric)) AND ((source_amount_including_tax IS NULL) OR (source_amount_including_tax >= (0)::numeric)) AND ((source_amount_excluding_tax IS NULL) OR (source_tax_cost_amount IS NULL) OR (source_amount_including_tax IS NULL) OR ((source_amount_excluding_tax + source_tax_cost_amount) = source_amount_including_tax))))" },
        { name: "chk_r4f_basis_v1", expression: "(((governance_schema_version = 0) OR ((governance_schema_version = 1) AND (currency IS NOT NULL) AND (measurement_basis IS NOT NULL) AND ((measurement_basis)::text = ANY ((ARRAY['excluding-tax'::character varying, 'tax'::character varying, 'including-tax'::character varying])::text[])) AND (measurement_amount IS NOT NULL) AND (measurement_amount >= (0)::numeric) AND (allocation_algorithm IS NOT NULL) AND ((allocation_algorithm)::text = 'largest-remainder-cents-v1'::text) AND (governance_evidence_id IS NOT NULL) AND ((supersedes_id IS NULL) OR ((replacement_reason IS NOT NULL) AND (length(btrim(replacement_reason)) > 0))))))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        sourceCostScopeKey: p.string().length(128).fieldName('source_cost_scope_key').comment('来源成本范围键'),
        basisType: p.string().length(64).fieldName('basis_type').comment('分摊依据类型'),
        allocationMethod: p.string().length(64).fieldName('allocation_method').comment('分摊方法'),
        basisSummary: p.text().nullable().fieldName('basis_summary').comment('分摊依据摘要'),
        status: p.string().$type<OperatingPendingLifecycleStatus>().length(32).default(OperatingPendingLifecycleStatusValue.Pending).comment('状态：pending/active/superseded/voided'),
        effectiveAt: p.datetime().nullable().fieldName('effective_at').comment('生效时间'),
        effectiveBy: p.uuid().nullable().fieldName('effective_by').comment('生效操作人'),
        supersedesId: () => p.manyToOne(SharedCostAllocationBasis).mapToPk().nullable().fieldName("supersedes_id").foreignKeyName("fk_r4f_basis_supersedes").updateRule('no action').deleteRule("no action").comment('被替代的旧依据 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        currency: p.string().length(16).nullable().fieldName("currency"),
        measurementBasis: p.string().length(32).nullable().fieldName("measurement_basis"),
        sourceAmountExcludingTax: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("source_amount_excluding_tax"),
        sourceTaxCostAmount: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("source_tax_cost_amount"),
        sourceAmountIncludingTax: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("source_amount_including_tax"),
        measurementAmount: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("measurement_amount"),
        allocationAlgorithm: p.string().length(64).nullable().fieldName("allocation_algorithm"),
        replacementOperationId: p.uuid().nullable().fieldName("replacement_operation_id"),
        replacementReason: p.text().nullable().fieldName("replacement_reason"),
        governanceEvidenceId: () => p.manyToOne(CostGovernanceEvidence).mapToPk().nullable().fieldName("governance_evidence_id").foreignKeyName("shared_cost_allocation_basis_governance_evidence_id_fkey").updateRule('no action').deleteRule("no action"),
        governanceSchemaVersion: p.integer().columnType('smallint').default(1).fieldName("governance_schema_version")
    }
});

export class SharedCostAllocationBasis extends SharedCostAllocationBasisSchema.class {}

SharedCostAllocationBasisSchema.setClass(SharedCostAllocationBasis);
