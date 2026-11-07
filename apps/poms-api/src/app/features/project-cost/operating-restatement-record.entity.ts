import { defineEntity } from '@mikro-orm/core';
import { OPERATING_LIFECYCLE_STATUSES, OperatingLifecycleStatusValue, type OperatingLifecycleStatus } from '@poms/shared-contracts';
import { ContractHandoverRebaselineRecord } from '../project-handover/project-handover.entity';
import { Project } from '../project/project.entity';
import { PeriodClosingSnapshot } from './period-closing-snapshot.entity';
import { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const OperatingRestatementRecordSchema = defineEntity({
    name: 'OperatingRestatementRecord',
    tableName: 'operating_restatement_record',
    schema: 'poms',
    comment: '经营快照重述记录（期末冻结后的补录 / 替代链）',
    indexes: [
        {
            name: 'idx_orr_project_handled',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.handledAt}" desc)`
        },
        { name: 'idx_orr_period_snapshot', properties: ['periodEndSnapshotId'] },
        { name: 'idx_orr_restates_snapshot', properties: ['restatesSnapshotId'] },
        { name: 'idx_orr_restated_snapshot', properties: ['restatedSnapshotId'] },
        { name: 'idx_orr_handover_rebaseline', properties: ['handoverRebaselineRecordId'] }
    ],
    uniques: [
        {
            name: 'uq_orr_restates_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.restatesSnapshotId}") where "${columns.status}" = '${OperatingLifecycleStatusValue.Active}'`
        },
        {
            name: 'uq_orr_restated_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.restatedSnapshotId}") where "${columns.status}" = '${OperatingLifecycleStatusValue.Active}'`
        }
    ],
    checks: [
        {
            name: 'chk_operating_restatement_record_status',
            expression: `"status" in (${toSqlStringList(OPERATING_LIFECYCLE_STATUSES)})`
        },
        {"name":"chk_r4g_restatement_verified","expression":"producer_version=0 OR\n    (producer_version=1 AND restatement_scope IS NOT NULL AND restatement_scope IN ('live','period') AND root_snapshot_id IS NOT NULL\n     AND (restatement_scope='period')=(period_end_snapshot_id IS NOT NULL)\n     AND causal_source_refs IS NOT NULL AND jsonb_typeof(causal_source_refs)='array'\n     AND before_source_hash IS NOT NULL AND before_source_hash~'^[0-9a-f]{64}$'\n     AND after_source_hash IS NOT NULL AND after_source_hash~'^[0-9a-f]{64}$' AND restatement_batch_id IS NOT NULL)"}
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        periodEndSnapshotId: () => p.manyToOne(PeriodClosingSnapshot).mapToPk().fieldName('period_end_snapshot_id').deleteRule('no action').updateRule('no action').comment('关联期末冻结快照').nullable(),
        restatesSnapshotId: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().fieldName('restates_snapshot_id').comment('被重述 / 被替代的经营快照'),
        restatedSnapshotId: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().fieldName('restated_snapshot_id').comment('新生成的重述经营快照'),
        handoverRebaselineRecordId: () =>
            p
                .manyToOne(ContractHandoverRebaselineRecord)
                .mapToPk()
                .nullable()
                .fieldName('handover_rebaseline_record_id')
                .foreignKeyName('operating_restatement_record_handover_rebaseline_record_id_fore')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('移交前再基线化记录 ID'),
        restatementReason: p.string().length(256).fieldName('restatement_reason').comment('重述原因'),
        restatementSummary: p.text().fieldName('restatement_summary').comment('重述摘要'),
        status: p.string().$type<OperatingLifecycleStatus>().length(32).default(OperatingLifecycleStatusValue.Active).comment('状态：active/superseded/voided'),
        handledAt: p.datetime().defaultRaw('now()').fieldName('handled_at').comment('处理时间'),
        handledBy: p.uuid().nullable().fieldName('handled_by').comment('处理人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    ,
        producerVersion: p.smallint().default(0).fieldName("producer_version"),
        restatementScope: p.string().length(16).nullable().fieldName("restatement_scope"),
        rootSnapshotId: p.uuid().nullable().fieldName("root_snapshot_id"),
        causalSourceRefs: p.json<unknown>().columnType('jsonb').nullable().fieldName("causal_source_refs"),
        beforeSourceHash: p.string().length(64).nullable().fieldName("before_source_hash"),
        afterSourceHash: p.string().length(64).nullable().fieldName("after_source_hash"),
        restatementBatchId: p.uuid().nullable().fieldName("restatement_batch_id"),
        jghiScopeConstraint1: () => p.manyToOne(PeriodClosingSnapshot).mapToPk().joinColumns("period_end_snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_restatement_period").deleteRule("no action").updateRule("no action").nullable(),
        jghiScopeConstraint2: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().joinColumns("restates_snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_restatement_before").deleteRule("no action").updateRule("no action"),
        jghiScopeConstraint3: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().joinColumns("restated_snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_restatement_after").deleteRule("no action").updateRule("no action"),
        jghiScopeConstraint4: () => p.manyToOne(ProjectOperatingSnapshot).mapToPk().joinColumns("root_snapshot_id","project_id").referencedColumnNames("id","project_id").columnTypes("uuid","uuid").ownColumns().hydrate(false).hidden().foreignKeyName("fk_r4g_restatement_root").deleteRule("no action").updateRule("no action").nullable()
    }
});

export class OperatingRestatementRecord extends OperatingRestatementRecordSchema.class {}

OperatingRestatementRecordSchema.setClass(OperatingRestatementRecord);
