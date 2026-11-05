import { CostGovernanceEvidence } from "./cost-governance-evidence.entity";
import { defineEntity } from '@mikro-orm/core';
import { OPERATING_PENDING_LIFECYCLE_STATUSES, OperatingPendingLifecycleStatusValue, type OperatingPendingLifecycleStatus } from '@poms/shared-contracts';
import { Project } from '../project/project.entity';
import { SharedCostAllocationBasis } from './shared-cost-allocation-basis.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const SharedCostAllocationResultSchema = defineEntity({
    name: 'SharedCostAllocationResult',
    tableName: 'shared_cost_allocation_result',
    schema: 'poms',
    comment: '共享成本分摊结果表',
    indexes: [
        { name: 'idx_scar_project_status', properties: ['projectId', 'status'] },
        { name: 'idx_scar_basis_status', properties: ['basisId', 'status'] }
    ],
    uniques: [
        {
            name: 'uq_scar_basis_project_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.basisId}", "${columns.projectId}") where "${columns.status}" = '${OperatingPendingLifecycleStatusValue.Active}'`
        },
        { name: "uq_r4f_result_successor", expression: "CREATE UNIQUE INDEX uq_r4f_result_successor ON poms.shared_cost_allocation_result USING btree (supersedes_id) WHERE (supersedes_id IS NOT NULL)" }
    ],
    checks: [
        {
            name: 'chk_shared_cost_allocation_result_status',
            expression: `"status" in (${toSqlStringList(OPERATING_PENDING_LIFECYCLE_STATUSES)})`
        },
        { name: "chk_r4f_result_money_layers", expression: "((((allocated_amount_excluding_tax IS NULL) OR (allocated_amount_excluding_tax >= (0)::numeric)) AND ((allocated_tax_cost_amount IS NULL) OR (allocated_tax_cost_amount >= (0)::numeric)) AND ((allocated_amount_including_tax IS NULL) OR (allocated_amount_including_tax >= (0)::numeric)) AND ((allocated_amount_excluding_tax IS NULL) OR (allocated_tax_cost_amount IS NULL) OR (allocated_amount_including_tax IS NULL) OR ((allocated_amount_excluding_tax + allocated_tax_cost_amount) = allocated_amount_including_tax))))" },
        { name: "chk_r4f_result_v1", expression: "(((governance_schema_version = 0) OR ((governance_schema_version = 1) AND (currency IS NOT NULL) AND (allocation_weight IS NOT NULL) AND (allocation_weight >= (0)::numeric) AND (allocated_amount >= (0)::numeric) AND ((allocation_ratio IS NULL) OR ((allocation_ratio >= (0)::numeric) AND (allocation_ratio <= (1)::numeric))) AND (residual_minor_units IS NOT NULL) AND ((residual_minor_units >= 0) AND (residual_minor_units <= 2)) AND (governance_evidence_id IS NOT NULL) AND ((supersedes_id IS NULL) OR ((replacement_reason IS NOT NULL) AND (length(btrim(replacement_reason)) > 0))))))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        basisId: () => p.manyToOne(SharedCostAllocationBasis).mapToPk().fieldName('basis_id').comment('关联分摊依据'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        allocatedAmount: p.decimal().precision(18).scale(2).default(0).fieldName('allocated_amount').comment('分摊金额'),
        allocationRatio: p.decimal().precision(9).scale(6).nullable().fieldName('allocation_ratio').comment('分摊比例'),
        allocationSummary: p.text().nullable().fieldName('allocation_summary').comment('分摊结果说明'),
        status: p.string().$type<OperatingPendingLifecycleStatus>().length(32).default(OperatingPendingLifecycleStatusValue.Pending).comment('状态：pending/active/superseded/voided'),
        effectiveAt: p.datetime().nullable().fieldName('effective_at').comment('生效时间'),
        supersedesId: () => p.manyToOne(SharedCostAllocationResult).mapToPk().nullable().fieldName("supersedes_id").foreignKeyName("fk_r4f_result_supersedes").updateRule('no action').deleteRule("no action").comment('被替代的旧结果 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        allocationWeight: p.string().columnType('numeric(18,6)').precision(18).scale(6).nullable().fieldName("allocation_weight"),
        currency: p.string().length(16).nullable().fieldName("currency"),
        allocatedAmountExcludingTax: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("allocated_amount_excluding_tax"),
        allocatedTaxCostAmount: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("allocated_tax_cost_amount"),
        allocatedAmountIncludingTax: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("allocated_amount_including_tax"),
        residualMinorUnits: p.integer().columnType('smallint').nullable().fieldName("residual_minor_units"),
        replacementOperationId: p.uuid().nullable().fieldName("replacement_operation_id"),
        replacementReason: p.text().nullable().fieldName("replacement_reason"),
        governanceEvidenceId: () => p.manyToOne(CostGovernanceEvidence).mapToPk().nullable().fieldName("governance_evidence_id").foreignKeyName("shared_cost_allocation_result_governance_evidence_id_fkey").updateRule('no action').deleteRule("no action"),
        governanceSchemaVersion: p.integer().columnType('smallint').default(1).fieldName("governance_schema_version")
    }
});

export class SharedCostAllocationResult extends SharedCostAllocationResultSchema.class {}

SharedCostAllocationResultSchema.setClass(SharedCostAllocationResult);
