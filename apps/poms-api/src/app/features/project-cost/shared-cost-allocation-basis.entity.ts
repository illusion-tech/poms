import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

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
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourceCostScopeKey}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        sourceCostScopeKey: p.string().length(128).fieldName('source_cost_scope_key').comment('来源成本范围键'),
        basisType: p.string().length(64).fieldName('basis_type').comment('分摊依据类型'),
        allocationMethod: p.string().length(64).fieldName('allocation_method').comment('分摊方法'),
        basisSummary: p.text().nullable().fieldName('basis_summary').comment('分摊依据摘要'),
        status: p.string().length(32).default('pending').comment('状态：pending/active/superseded/voided'),
        effectiveAt: p.datetime().nullable().fieldName('effective_at').comment('生效时间'),
        effectiveBy: p.uuid().nullable().fieldName('effective_by').comment('生效操作人'),
        supersedesId: p.uuid().nullable().fieldName('supersedes_id').comment('被替代的旧依据 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class SharedCostAllocationBasis extends SharedCostAllocationBasisSchema.class {}

SharedCostAllocationBasisSchema.setClass(SharedCostAllocationBasis);
