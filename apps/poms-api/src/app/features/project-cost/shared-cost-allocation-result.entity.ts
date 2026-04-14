import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';
import { SharedCostAllocationBasis } from './shared-cost-allocation-basis.entity';

const p = defineEntity.properties;

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
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.basisId}", "${columns.projectId}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        basisId: () => p.manyToOne(SharedCostAllocationBasis).mapToPk().fieldName('basis_id').comment('关联分摊依据'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        allocatedAmount: p.decimal().precision(18).scale(2).default(0).fieldName('allocated_amount').comment('分摊金额'),
        allocationRatio: p.decimal().precision(9).scale(6).nullable().fieldName('allocation_ratio').comment('分摊比例'),
        allocationSummary: p.text().nullable().fieldName('allocation_summary').comment('分摊结果说明'),
        status: p.string().length(32).default('pending').comment('状态：pending/active/superseded/voided'),
        effectiveAt: p.datetime().nullable().fieldName('effective_at').comment('生效时间'),
        supersedesId: p.uuid().nullable().fieldName('supersedes_id').comment('被替代的旧结果 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class SharedCostAllocationResult extends SharedCostAllocationResultSchema.class {}

SharedCostAllocationResultSchema.setClass(SharedCostAllocationResult);
