import { defineEntity } from '@mikro-orm/core';
import { ContractHandoverRebaselineRecord } from '../project-handover/project-handover.entity';
import { Project } from '../project/project.entity';
import { PeriodClosingSnapshot } from './period-closing-snapshot.entity';
import { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';

const p = defineEntity.properties;

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
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.restatesSnapshotId}") where "${columns.status}" = 'active'`
        },
        {
            name: 'uq_orr_restated_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.restatedSnapshotId}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        periodEndSnapshotId: () => p.manyToOne(PeriodClosingSnapshot).mapToPk().fieldName('period_end_snapshot_id').comment('关联期末冻结快照'),
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
        status: p.string().length(32).default('active').comment('状态：active/superseded/voided'),
        handledAt: p.datetime().defaultRaw('now()').fieldName('handled_at').comment('处理时间'),
        handledBy: p.uuid().nullable().fieldName('handled_by').comment('处理人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class OperatingRestatementRecord extends OperatingRestatementRecordSchema.class {}

OperatingRestatementRecordSchema.setClass(OperatingRestatementRecord);
