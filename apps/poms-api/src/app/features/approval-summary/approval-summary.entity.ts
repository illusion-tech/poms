import { defineEntity } from '@mikro-orm/core';

export type ApprovalSummaryDefinitionStatus = 'active' | 'inactive' | 'superseded';
export type ApprovalSummarySnapshotStatus = 'active' | 'superseded' | 'voided';

const p = defineEntity.properties;

export const ApprovalSummaryPackageDefinitionSchema = defineEntity({
    name: 'ApprovalSummaryPackageDefinition',
    tableName: 'approval_summary_package_definition',
    schema: 'poms',
    comment: '审批摘要包定义',
    indexes: [
        { name: 'idx_aspd_scenario_status', properties: ['approvalScenarioKey', 'status'] },
        { name: 'idx_aspd_scenario_projection_status', properties: ['approvalScenarioKey', 'projectionLevel', 'status'] }
    ],
    uniques: [{ name: 'uq_aspd_scenario_package', properties: ['approvalScenarioKey', 'summaryPackageKey'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        approvalScenarioKey: p.string().length(128).fieldName('approval_scenario_key').comment('审批场景键'),
        summaryPackageKey: p.string().length(64).fieldName('summary_package_key').comment('摘要包键'),
        projectionLevel: p.string().length(32).fieldName('projection_level').comment('摘要投影级别'),
        exportPolicy: p.string().length(32).fieldName('export_policy').comment('导出策略'),
        fieldRuleVersion: p.string().length(64).fieldName('field_rule_version').comment('字段规则版本'),
        status: p.string().length(32).default('active').$type<ApprovalSummaryDefinitionStatus>().comment('状态：active/inactive/superseded'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ApprovalSummaryPackageDefinition extends ApprovalSummaryPackageDefinitionSchema.class {}

ApprovalSummaryPackageDefinitionSchema.setClass(ApprovalSummaryPackageDefinition);

export const ApprovalSummarySnapshotSchema = defineEntity({
    name: 'ApprovalSummarySnapshot',
    tableName: 'approval_summary_snapshot',
    schema: 'poms',
    comment: '审批摘要场景快照',
    indexes: [
        { name: 'idx_ass_target', properties: ['targetType', 'targetId'] },
        {
            name: 'idx_ass_scenario_generated',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.approvalScenarioKey}", "${columns.generatedAt}" desc)`
        },
        { name: 'idx_ass_package_status', properties: ['summaryPackageId', 'status'] }
    ],
    uniques: [
        {
            name: 'uq_ass_target_scenario_projection_active',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.targetType}", "${columns.targetId}", "${columns.approvalScenarioKey}", "${columns.projectionLevel}") where "${columns.status}" = 'active'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        targetType: p.string().length(64).fieldName('target_type').comment('审批对象类型'),
        targetId: p.uuid().fieldName('target_id').comment('审批对象 ID'),
        approvalScenarioKey: p.string().length(128).fieldName('approval_scenario_key').comment('审批场景键'),
        summaryPackageId: () =>
            p
                .manyToOne(ApprovalSummaryPackageDefinition)
                .mapToPk()
                .fieldName('summary_package_id')
                .foreignKeyName('approval_summary_snapshot_summary_package_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('摘要包定义 ID'),
        summaryPackageKey: p.string().length(64).fieldName('summary_package_key').comment('摘要包键'),
        projectionLevel: p.string().length(32).fieldName('projection_level').comment('摘要投影级别'),
        exportPolicy: p.string().length(32).fieldName('export_policy').comment('导出策略'),
        businessStatusAtSnapshot: p.string().length(32).fieldName('business_status_at_snapshot').comment('快照生成时业务状态'),
        generatedAt: p.datetime().defaultRaw('now()').fieldName('generated_at').comment('生成时间'),
        status: p.string().length(32).default('active').$type<ApprovalSummarySnapshotStatus>().comment('状态：active/superseded/voided'),
        supersedesId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('approval_summary_snapshot_supersedes_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('被替代的摘要快照'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ApprovalSummarySnapshot extends ApprovalSummarySnapshotSchema.class {}

ApprovalSummarySnapshotSchema.setClass(ApprovalSummarySnapshot);

export const ApprovalSummaryFieldProjectionSchema = defineEntity({
    name: 'ApprovalSummaryFieldProjection',
    tableName: 'approval_summary_field_projection',
    schema: 'poms',
    comment: '审批摘要字段投影明细',
    indexes: [{ name: 'idx_asfp_snapshot_order', properties: ['summarySnapshotId', 'fieldOrder'] }],
    uniques: [{ name: 'uq_asfp_snapshot_field', properties: ['summarySnapshotId', 'fieldKey'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        summarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('summary_snapshot_id')
                .foreignKeyName('approval_summary_field_projection_summary_snapshot_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('摘要快照 ID'),
        fieldKey: p.string().length(128).fieldName('field_key').comment('字段键'),
        visibilityLevel: p.string().length(32).fieldName('visibility_level').comment('可见级别'),
        maskingMode: p.string().length(32).fieldName('masking_mode').comment('脱敏模式'),
        exportPolicy: p.string().length(32).fieldName('export_policy').comment('导出策略'),
        fieldOrder: p.integer().default(0).fieldName('field_order').comment('字段排序'),
        channelScopeSummary: p.text().nullable().fieldName('channel_scope_summary').comment('渠道范围摘要'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人')
    }
});

export class ApprovalSummaryFieldProjection extends ApprovalSummaryFieldProjectionSchema.class {}

ApprovalSummaryFieldProjectionSchema.setClass(ApprovalSummaryFieldProjection);
