import { PeriodClosingSnapshot } from './period-closing-snapshot.entity';
import { OperatingSourceContext } from './rust-r4ghi-entities.entity';
import { defineEntity } from '@mikro-orm/core';
import {
    BASELINE_SELECTION_SOURCES,
    OPERATING_LIFECYCLE_STATUSES,
    OPERATING_SNAPSHOT_ACTION_LEVELS,
    OPERATING_SNAPSHOT_MODES,
    BaselineSelectionSourceValue,
    OperatingLifecycleStatusValue,
    type BaselineSelectionSource,
    type OperatingLifecycleStatus,
    type OperatingSnapshotActionLevel,
    type OperatingSnapshotMode
} from '@poms/shared-contracts';
import { ContractHandoverRebaselineRecord } from '../project-handover/project-handover.entity';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const ProjectOperatingSnapshotSchema = defineEntity({
    uniques: [
        {"name":"uq_r4g_project_snapshot_scope","properties":["id","projectId"]},
        {"name":"uq_r4g_snapshot_successor","expression":"CREATE UNIQUE INDEX uq_r4g_snapshot_successor ON poms.project_operating_snapshot(supersedes_id)\n  WHERE producer_version=1 AND supersedes_id IS NOT NULL"}
    ],
    name: 'ProjectOperatingSnapshot',
    tableName: 'project_operating_snapshot',
    schema: 'poms',
    comment: '项目实时 / 历史经营快照（L2 稳定结果锚点）',
    indexes: [
        {
            name: 'idx_pos_project_snapshot_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.snapshotAt}" desc)`
        },
        { name: 'idx_pos_project_mode', properties: ['projectId', 'snapshotMode'] },
        { name: 'idx_pos_project_baseline_mode', properties: ['projectId', 'referencedBaselineVersion', 'snapshotMode'] },
        { name: 'idx_pos_handover_rebaseline', properties: ['handoverRebaselineRecordId'] }
    ],
    checks: [
        {
            name: 'chk_project_operating_snapshot_snapshot_mode',
            expression: `"snapshot_mode" in (${toSqlStringList(OPERATING_SNAPSHOT_MODES)})`
        },
        {
            name: 'chk_project_operating_snapshot_current_action_level',
            expression: `"current_action_level" in (${toSqlStringList(OPERATING_SNAPSHOT_ACTION_LEVELS)})`
        },
        {
            name: 'chk_project_operating_snapshot_baseline_selection_source',
            expression: `"baseline_selection_source" in (${toSqlStringList(BASELINE_SELECTION_SOURCES)})`
        },
        {
            name: 'chk_project_operating_snapshot_status',
            expression: `"status" in (${toSqlStringList(OPERATING_LIFECYCLE_STATUSES)})`
        },
        {"name":"chk_r4g_snapshot_verified","expression":"producer_version=0 OR\n    (producer_version=1 AND captured_row_version IS NOT NULL AND captured_row_version=1\n     AND source_context_id IS NOT NULL AND source_hash IS NOT NULL\n     AND source_hash~'^[0-9a-f]{64}$' AND currency IS NOT NULL AND currency~'^[A-Z]{3}$')"},
        {"name":"ck_jghi_snapshot_pending_tax_v1","expression":"producer_version=0 OR\n  (producer_version=1 AND tax_pending_knowledge IS NOT NULL AND\n   ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)\n    OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL)))"}
    ],
    properties: {
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        snapshotMode: p.string().$type<OperatingSnapshotMode>().length(32).fieldName('snapshot_mode').comment('快照模式：realtime/period-end/restated'),
        snapshotAt: p.datetime().defaultRaw('now()').fieldName('snapshot_at').comment('快照时点'),
        sourceWindowStart: p.date().nullable().fieldName('source_window_start').comment('来源窗口开始日期'),
        sourceWindowEnd: p.date().nullable().fieldName('source_window_end').comment('来源窗口结束日期'),
        effectiveContractTotal: p.decimal().precision(18).scale(2).default(0).fieldName('effective_contract_total').comment('当前有效合同总额'),
        receivableConfirmedTotal: p.decimal().precision(18).scale(2).default(0).fieldName('receivable_confirmed_total').comment('已确认回款总额'),
        includedCostTotal: p.decimal().precision(18).scale(2).default(0).fieldName('included_cost_total').comment('已纳入口径成本总额'),
        originalBaselineCost: p.decimal().precision(18).scale(2).default(0).fieldName('original_baseline_cost').comment('原始签约基线成本'),
        currentEffectiveBaselineCost: p.decimal().precision(18).scale(2).default(0).fieldName('current_effective_baseline_cost').comment('当前有效基线成本'),
        grossMarginAmount: p.decimal().precision(18).scale(2).default(0).fieldName('gross_margin_amount').comment('毛利金额'),
        grossMarginRate: p.decimal().precision(38).scale(6).nullable().fieldName('gross_margin_rate').comment('毛利率'),
        taxImpactSummary: p.text().fieldName('tax_impact_summary').comment('税务影响摘要（供 L4/L5 稳定消费）'),
        taxImpactPendingAmount: p.decimal().precision(18).scale(2).default(0).fieldName('tax_impact_pending_amount').comment('待确认税务影响金额').nullable(),
        allocationStabilitySummary: p.text().nullable().fieldName('allocation_stability_summary').comment('分摊稳定性摘要'),
        unmappedCostSummary: p.text().nullable().fieldName('unmapped_cost_summary').comment('未映射成本摘要'),
        currentActionLevel: p.string().$type<OperatingSnapshotActionLevel>().length(32).fieldName('current_action_level').comment('当前动作等级：prompt/review/block'),
        referencedBaselineVersion: p.string().length(64).fieldName('referenced_baseline_version').comment('引用基线版本标识'),
        baselineSelectionSource: p.string().$type<BaselineSelectionSource>().length(32).default(BaselineSelectionSourceValue.Original).fieldName('baseline_selection_source').comment('基线选择来源：original/handover-rebaseline'),
        handoverRebaselineRecordId: () =>
            p
                .manyToOne(ContractHandoverRebaselineRecord)
                .mapToPk()
                .nullable()
                .fieldName('handover_rebaseline_record_id')
                .foreignKeyName('project_operating_snapshot_handover_rebaseline_record_id_foreig')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('移交前再基线化记录 ID'),
        status: p.string().$type<OperatingLifecycleStatus>().length(32).default(OperatingLifecycleStatusValue.Active).comment('状态：active/superseded/voided'),
        supersedesId: p.uuid().nullable().fieldName('supersedes_id').comment('被替代的旧快照 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    ,
        producerVersion: p.smallint().default(0).fieldName("producer_version"),
        capturedRowVersion: p.integer().nullable().fieldName("captured_row_version"),
        sourceContextId: p.uuid().nullable().fieldName("source_context_id"),
        sourceHash: p.string().length(64).nullable().fieldName("source_hash"),
        currency: p.string().length(3).nullable().fieldName("currency"),
        periodEndSnapshotId: p.uuid().nullable().fieldName("period_end_snapshot_id"),
        rootSnapshotId: p.uuid().nullable().fieldName("root_snapshot_id"),
        taxPendingKnowledge: p.string().length(16).nullable().fieldName("tax_pending_knowledge"),
        jghiScopeConstraint1: () => p.manyToOne(OperatingSourceContext).mapToPk().joinColumns("source_context_id","project_id","id").referencedColumnNames("id","project_id","snapshot_id").columnTypes("uuid","uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_snapshot_context").deleteRule("no action").updateRule("no action").deferMode('deferred').nullable(),
        jghiScopeConstraint2: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().joinColumns("supersedes_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_snapshot_supersedes").deleteRule("restrict").updateRule("no action"),
        jghiScopeConstraint3: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().joinColumns("root_snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_snapshot_root").deleteRule("restrict").updateRule("no action").nullable(),
        jghiScopeConstraint4: () => p.manyToOne(PeriodClosingSnapshot).mapToPk().joinColumns("period_end_snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_snapshot_period").deleteRule("no action").updateRule("no action").deferMode('deferred').nullable(),
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
    }
});

export class ProjectOperatingSnapshot extends ProjectOperatingSnapshotSchema.class {}

ProjectOperatingSnapshotSchema.setClass(ProjectOperatingSnapshot);
