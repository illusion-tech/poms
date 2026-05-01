import { defineEntity } from '@mikro-orm/core';
import {
    BASELINE_SELECTION_SOURCES,
    OPERATING_LIFECYCLE_STATUSES,
    OPERATING_SNAPSHOT_ACTION_LEVELS,
    OperatingLifecycleStatusValue,
    OperatingSnapshotModeValue,
    BaselineSelectionSourceValue,
    type BaselineSelectionSource,
    type OperatingLifecycleStatus,
    type OperatingSnapshotActionLevel,
    type OperatingSnapshotMode
} from '@poms/shared-contracts';
import { ContractHandoverRebaselineRecord } from '../project-handover/project-handover.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const PeriodClosingSnapshotSchema = defineEntity({
    name: 'PeriodClosingSnapshot',
    tableName: 'period_closing_snapshot',
    schema: 'poms',
    comment: '期末冻结快照（按期间锁定经营口径）',
    indexes: [
        { name: 'idx_pcs_project_period', properties: ['projectId', 'periodKey'] },
        {
            name: 'idx_pcs_snapshot_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.snapshotAt}" desc)`
        },
        { name: 'idx_pcs_project_baseline', properties: ['projectId', 'referencedBaselineVersion'] },
        { name: 'idx_pcs_handover_rebaseline', properties: ['handoverRebaselineRecordId'] }
    ],
    uniques: [
        {
            name: 'uq_pcs_project_period_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.periodKey}") where "${columns.snapshotMode}" = '${OperatingSnapshotModeValue.PeriodEnd}' and "${columns.status}" = '${OperatingLifecycleStatusValue.Active}'`
        }
    ],
    checks: [
        {
            name: 'chk_period_closing_snapshot_snapshot_mode',
            expression: `"snapshot_mode" in ('${OperatingSnapshotModeValue.PeriodEnd}')`
        },
        {
            name: 'chk_period_closing_snapshot_current_action_level',
            expression: `"current_action_level" in (${toSqlStringList(OPERATING_SNAPSHOT_ACTION_LEVELS)})`
        },
        {
            name: 'chk_period_closing_snapshot_baseline_selection_source',
            expression: `"baseline_selection_source" in (${toSqlStringList(BASELINE_SELECTION_SOURCES)})`
        },
        {
            name: 'chk_period_closing_snapshot_status',
            expression: `"status" in (${toSqlStringList(OPERATING_LIFECYCLE_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        periodKey: p.string().length(32).fieldName('period_key').comment('期间键（格式：YYYY-MM 或 YYYY-Www）'),
        snapshotMode: p.string().$type<OperatingSnapshotMode>().length(32).default(OperatingSnapshotModeValue.PeriodEnd).fieldName('snapshot_mode').comment('快照模式：period-end'),
        snapshotAt: p.datetime().defaultRaw('now()').fieldName('snapshot_at').comment('快照生成时点'),
        effectiveContractTotal: p.decimal().precision(18).scale(2).default(0).fieldName('effective_contract_total').comment('当前有效合同总额'),
        receivableConfirmedTotal: p.decimal().precision(18).scale(2).default(0).fieldName('receivable_confirmed_total').comment('已确认回款总额'),
        includedCostTotal: p.decimal().precision(18).scale(2).default(0).fieldName('included_cost_total').comment('已纳入口径成本总额'),
        originalBaselineCost: p.decimal().precision(18).scale(2).default(0).fieldName('original_baseline_cost').comment('原始签约基线成本'),
        currentEffectiveBaselineCost: p.decimal().precision(18).scale(2).default(0).fieldName('current_effective_baseline_cost').comment('当前有效基线成本'),
        grossMarginAmount: p.decimal().precision(18).scale(2).default(0).fieldName('gross_margin_amount').comment('毛利金额'),
        grossMarginRate: p.decimal().precision(9).scale(6).nullable().fieldName('gross_margin_rate').comment('毛利率'),
        taxImpactSummary: p.text().fieldName('tax_impact_summary').comment('税务影响摘要'),
        taxImpactPendingAmount: p.decimal().precision(18).scale(2).default(0).fieldName('tax_impact_pending_amount').comment('待确认税务影响金额'),
        allocationStabilitySummary: p.text().nullable().fieldName('allocation_stability_summary').comment('分摊稳定性摘要'),
        unmappedCostSummary: p.text().nullable().fieldName('unmapped_cost_summary').comment('未映射成本摘要'),
        currentActionLevel: p.string().$type<OperatingSnapshotActionLevel>().length(32).fieldName('current_action_level').comment('当前动作等级：PROMPT/REVIEW/BLOCK'),
        referencedBaselineVersion: p.string().length(64).fieldName('referenced_baseline_version').comment('引用基线版本标识'),
        baselineSelectionSource: p.string().$type<BaselineSelectionSource>().length(32).default(BaselineSelectionSourceValue.Original).fieldName('baseline_selection_source').comment('基线选择来源：original/handover_rebaseline'),
        handoverRebaselineRecordId: () =>
            p
                .manyToOne(ContractHandoverRebaselineRecord)
                .mapToPk()
                .nullable()
                .fieldName('handover_rebaseline_record_id')
                .foreignKeyName('period_closing_snapshot_handover_rebaseline_record_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('移交前再基线化记录 ID'),
        status: p.string().$type<OperatingLifecycleStatus>().length(32).default(OperatingLifecycleStatusValue.Active).comment('状态：active/superseded/voided'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class PeriodClosingSnapshot extends PeriodClosingSnapshotSchema.class {}

PeriodClosingSnapshotSchema.setClass(PeriodClosingSnapshot);
