import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const OperatingBaselinePackageSchema = defineEntity({
    name: 'OperatingBaselinePackage',
    tableName: 'operating_baseline_package',
    schema: 'poms',
    comment: '经营基线包（原始签约基线 + 变更包汇总）',
    indexes: [
        { name: 'idx_obp_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_obp_effective_baseline', properties: ['effectiveOperatingBaselineId'] }
    ],
    uniques: [
        {
            name: 'uq_obp_project_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}") where "${columns.isCurrent}" = true`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        originalBaselineCost: p.decimal().precision(18).scale(2).default(0).fieldName('original_baseline_cost').comment('原始签约基线成本'),
        changePackageTotal: p.decimal().precision(18).scale(2).default(0).fieldName('change_package_total').comment('已批准变更包累计金额'),
        currentEffectiveBaselineCost: p.decimal().precision(18).scale(2).default(0).fieldName('current_effective_baseline_cost').comment('当前有效基线成本 = 原始 + 变更包'),
        baselineSelectionSource: p.string().length(32).default('original').fieldName('baseline_selection_source').comment('基线来源：original/handover_rebaseline'),
        effectiveOperatingBaselineId: p.uuid().nullable().fieldName('effective_operating_baseline_id').comment('生效的经营基线引用 ID'),
        baselineSummary: p.text().nullable().fieldName('baseline_summary').comment('基线说明'),
        isCurrent: p.boolean().default(false).fieldName('is_current').comment('是否为当前有效基线包'),
        status: p.string().length(32).default('draft').comment('状态：draft/active/superseded'),
        effectiveAt: p.datetime().nullable().fieldName('effective_at').comment('生效时间'),
        effectiveBy: p.uuid().nullable().fieldName('effective_by').comment('生效操作人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class OperatingBaselinePackage extends OperatingBaselinePackageSchema.class {}

OperatingBaselinePackageSchema.setClass(OperatingBaselinePackage);
