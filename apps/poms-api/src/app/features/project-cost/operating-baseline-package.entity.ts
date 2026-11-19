import { OperatingBaselineSource } from './rust-r4ghi-entities.entity';
import { defineEntity } from '@mikro-orm/core';
import {
    BASELINE_SELECTION_SOURCES,
    OPERATING_BASELINE_PACKAGE_STATUSES,
    BaselineSelectionSourceValue,
    OperatingBaselinePackageStatusValue,
    type BaselineSelectionSource,
    type OperatingBaselinePackageStatus
} from '@poms/shared-contracts';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

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
        },
        {"name":"uq_r4g_baseline_package_project","properties":["id","projectId"]}
    ],
    checks: [
        {
            name: 'chk_operating_baseline_package_baseline_selection_source',
            expression: `"baseline_selection_source" in (${toSqlStringList(BASELINE_SELECTION_SOURCES)})`
        },
        {
            name: 'chk_operating_baseline_package_status',
            expression: `"status" in (${toSqlStringList(OPERATING_BASELINE_PACKAGE_STATUSES)})`
        },
        {"name":"chk_r4g_baseline_certified","expression":"producer_version=0 OR\n    (producer_version=1 AND source_context_id IS NOT NULL AND currency IS NOT NULL\n     AND currency~'^[A-Z]{3}$' AND source_hash IS NOT NULL AND source_hash~'^[0-9a-f]{64}$'\n     AND handover_baseline_cost IS NOT NULL AND execution_change_package_total IS NOT NULL)"}
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        originalBaselineCost: p.decimal().precision(18).scale(2).default(0).fieldName('original_baseline_cost').comment('原始签约基线成本'),
        changePackageTotal: p.decimal().precision(18).scale(2).default(0).fieldName('change_package_total').comment('已批准变更包累计金额'),
        currentEffectiveBaselineCost: p.decimal().precision(18).scale(2).default(0).fieldName('current_effective_baseline_cost').comment('当前有效基线成本 = 原始 + 变更包'),
        baselineSelectionSource: p.string().$type<BaselineSelectionSource>().length(32).default(BaselineSelectionSourceValue.Original).fieldName('baseline_selection_source').comment('基线来源：original/handover-rebaseline'),
        effectiveOperatingBaselineId: p.uuid().nullable().fieldName('effective_operating_baseline_id').comment('生效的经营基线引用 ID'),
        baselineSummary: p.text().nullable().fieldName('baseline_summary').comment('基线说明'),
        isCurrent: p.boolean().default(false).fieldName('is_current').comment('是否为当前有效基线包'),
        status: p.string().$type<OperatingBaselinePackageStatus>().length(32).default(OperatingBaselinePackageStatusValue.Draft).comment('状态：draft/active/superseded'),
        effectiveAt: p.datetime().nullable().fieldName('effective_at').comment('生效时间'),
        effectiveBy: p.uuid().nullable().fieldName('effective_by').comment('生效操作人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    ,
        producerVersion: p.smallint().default(0).fieldName("producer_version"),
        sourceContextId: p.uuid().nullable().fieldName("source_context_id"),
        currency: p.string().length(3).nullable().fieldName("currency"),
        sourceHash: p.string().length(64).nullable().fieldName("source_hash"),
        handoverBaselineCost: p.decimal().precision(18).scale(2).nullable().fieldName("handover_baseline_cost"),
        executionChangePackageTotal: p.decimal().precision(18).scale(2).nullable().fieldName("execution_change_package_total"),
        jghiScopeConstraint1: () => p.manyToOne(OperatingBaselineSource).mapToPk().joinColumns("source_context_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_baseline_source").deleteRule("restrict").updateRule("no action").nullable()
    }
});

export class OperatingBaselinePackage extends OperatingBaselinePackageSchema.class {}

OperatingBaselinePackageSchema.setClass(OperatingBaselinePackage);
