import { defineEntity } from '@mikro-orm/core';
import {
    COMMISSION_LIFECYCLE_SNAPSHOT_STATUSES,
    COMMISSION_RULE_EXPLANATION_GATE_DECISIONS,
    COMMISSION_RULE_EXPLANATION_STAGE_STATUSES,
    type CommissionLifecycleSnapshotStatus,
    type CommissionRuleExplanationGateDecision,
    type CommissionRuleExplanationStageStatus
} from '@poms/shared-contracts';
import { Project } from '../project/project.entity';
import { CommissionFinalSettlementSnapshot } from './commission-final-settlement-snapshot.entity';

export type CommissionRuleExplanationSnapshotStatus = CommissionLifecycleSnapshotStatus;

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const CommissionRuleExplanationSnapshotSchema = defineEntity({
    name: 'CommissionRuleExplanationSnapshot',
    tableName: 'commission_rule_explanation_snapshot',
    schema: 'poms',
    comment: '统一规则解释快照',
    indexes: [
        { name: 'idx_cres_project_current', properties: ['projectId', 'isCurrent'] },
        {
            name: 'idx_cres_project_generated_at',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.generatedAt}" desc)`
        },
        { name: 'idx_cres_final_settlement', properties: ['finalSettlementSnapshotId'] },
        { name: 'idx_cres_blocking_reason_code', properties: ['blockingReasonCode'] },
        { name: 'idx_cres_gate_decision_status', properties: ['gateDecisionCode', 'status'] }
    ],
    uniques: [
        { name: 'cres_project_version_unique', properties: ['projectId', 'version'] },
        {
            name: 'uq_cres_project_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}") where "${columns.isCurrent}" = true`
        }
    ],
    checks: [
        {
            name: 'chk_cres_current_stage_status',
            expression: `"current_stage_status" in (${toSqlStringList(COMMISSION_RULE_EXPLANATION_STAGE_STATUSES)})`
        },
        {
            name: 'chk_cres_gate_decision_code',
            expression: `"gate_decision_code" in (${toSqlStringList(COMMISSION_RULE_EXPLANATION_GATE_DECISIONS)})`
        },
        {
            name: 'chk_cres_status',
            expression: `"status" in (${toSqlStringList(COMMISSION_LIFECYCLE_SNAPSHOT_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commission_rule_explanation_snapshot_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('关联项目'),
        finalSettlementSnapshotId: () =>
            p
                .manyToOne(CommissionFinalSettlementSnapshot)
                .mapToPk()
                .fieldName('final_settlement_snapshot_id')
                .foreignKeyName('cres_final_settlement_snapshot_fk')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('关联最终结算收口快照'),
        version: p.integer().comment('版本号'),
        isCurrent: p.boolean().default(true).fieldName('is_current').comment('是否当前有效'),
        currentStageStatus: p
            .string()
            .$type<CommissionRuleExplanationStageStatus>()
            .length(32)
            .fieldName('current_stage_status')
            .comment('当前阶段状态'),
        gateDecisionCode: p
            .string()
            .$type<CommissionRuleExplanationGateDecision>()
            .length(32)
            .fieldName('gate_decision_code')
            .comment('gate 决策码'),
        blockingReasonCategory: p.string().length(32).nullable().fieldName('blocking_reason_category').comment('阻断原因分类'),
        blockingReasonCode: p.string().length(64).nullable().fieldName('blocking_reason_code').comment('阻断原因编码'),
        blockingReasonSummary: p.text().nullable().fieldName('blocking_reason_summary').comment('阻断原因摘要'),
        gateDecisionSummary: p.text().fieldName('gate_decision_summary').comment('gate 结论摘要'),
        nextActionSummary: p.text().nullable().fieldName('next_action_summary').comment('下一步动作摘要'),
        generatedAt: p.datetime().defaultRaw('now()').fieldName('generated_at').comment('快照生成时间'),
        status: p
            .string()
            .length(32)
            .default('active')
            .$type<CommissionRuleExplanationSnapshotStatus>()
            .fieldName('status')
            .comment('状态：active/superseded/voided'),
        supersedesId: () =>
            p
                .manyToOne(CommissionRuleExplanationSnapshot)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('cres_supersedes_fk')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('被替代的旧解释快照'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionRuleExplanationSnapshot extends CommissionRuleExplanationSnapshotSchema.class {}

CommissionRuleExplanationSnapshotSchema.setClass(CommissionRuleExplanationSnapshot);
