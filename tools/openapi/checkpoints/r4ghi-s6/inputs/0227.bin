import { defineEntity } from '@mikro-orm/core';
import { Project } from './project.entity';

export type ProjectBidCommercialProcessStatus = 'effective' | 'superseded';
export type BidCommercialMode =
    | 'public-tender'
    | 'invitation'
    | 'comparison'
    | 'commercial-negotiation'
    | 'competitive-negotiation'
    | 'direct-commercial'
    | 'not-required';
export type BidCommercialStage = 'not-started' | 'preparation' | 'submitted' | 'negotiating' | 'result-confirmed' | 'closed';
export type BidCommercialDecision = 'pending' | 'participate' | 'no-bid' | 'not-required';
export type BidCommercialResultStatus = 'pending' | 'won' | 'lost' | 'cancelled' | 'not-applicable';
export type BidCommercialMaterialStatus = 'missing' | 'in-progress' | 'ready' | 'not-required';
export type BidCommercialTimelineStatus = 'pending' | 'done' | 'cancelled';

const p = defineEntity.properties;

export const ProjectBidCommercialProcessSchema = defineEntity({
    name: 'ProjectBidCommercialProcess',
    tableName: 'project_bid_commercial_process',
    schema: 'poms',
    comment: '签约前招投标与商务竞标过程版本',
    indexes: [
        { name: 'idx_project_bid_commercial_process_project_version', properties: ['projectId', 'version'] },
        { name: 'idx_project_bid_commercial_process_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_project_bid_commercial_process_mode', properties: ['bidMode'] },
        { name: 'idx_project_bid_commercial_process_result', properties: ['resultStatus'] }
    ],
    uniques: [
        { name: 'uq_project_bid_commercial_process_project_version', properties: ['projectId', 'version'] },
        {
            name: 'uq_project_bid_commercial_process_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}") where "${columns.isCurrent}" = true`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('project_bid_commercial_process_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        version: p.integer().comment('版本号'),
        isCurrent: p.boolean().default(true).fieldName('is_current').comment('是否当前有效版本'),
        supersedesId: () =>
            p
                .manyToOne(ProjectBidCommercialProcess)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('project_bid_commercial_process_supersedes_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('替代的旧过程版本 ID'),
        status: p.string().length(32).default('effective').$type<ProjectBidCommercialProcessStatus>().comment('状态：effective/superseded'),
        bidMode: p.string().length(64).fieldName('bid_mode').$type<BidCommercialMode>().comment('竞标 / 商务路径形态'),
        currentStage: p.string().length(64).fieldName('current_stage').$type<BidCommercialStage>().comment('当前竞标阶段'),
        decision: p.string().length(64).$type<BidCommercialDecision>().comment('参与竞标决策'),
        resultStatus: p.string().length(64).fieldName('result_status').$type<BidCommercialResultStatus>().comment('竞标结果状态'),
        processSummary: p.text().fieldName('process_summary').comment('过程摘要'),
        decisionSummary: p.text().nullable().fieldName('decision_summary').comment('决策说明'),
        resultSummary: p.text().nullable().fieldName('result_summary').comment('结果说明'),
        tenderNo: p.string().length(128).nullable().fieldName('tender_no').comment('招标编号'),
        bidPackageNo: p.string().length(128).nullable().fieldName('bid_package_no').comment('标段/包件编号'),
        ownerRole: p.string().length(128).nullable().fieldName('owner_role').comment('责任角色'),
        blockerCount: p.integer().default(0).fieldName('blocker_count').comment('阻塞事项数量'),
        effectiveAt: p.datetime().fieldName('effective_at').comment('版本生效时间'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ProjectBidCommercialProcess extends ProjectBidCommercialProcessSchema.class {}

ProjectBidCommercialProcessSchema.setClass(ProjectBidCommercialProcess);

export const ProjectBidCommercialMaterialItemSchema = defineEntity({
    name: 'ProjectBidCommercialMaterialItem',
    tableName: 'project_bid_commercial_material_item',
    schema: 'poms',
    comment: '签约前竞标材料齐备度条目',
    indexes: [
        { name: 'idx_project_bid_commercial_material_process', properties: ['processId', 'sortOrder'] },
        { name: 'idx_project_bid_commercial_material_status', properties: ['materialStatus'] },
        { name: 'idx_project_bid_commercial_material_blocker', properties: ['processId', 'blocksNextStep'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        processId: () =>
            p
                .manyToOne(ProjectBidCommercialProcess)
                .mapToPk()
                .fieldName('process_id')
                .foreignKeyName('project_bid_commercial_material_item_process_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('竞标过程版本 ID'),
        materialKey: p.string().length(128).fieldName('material_key').comment('材料键'),
        label: p.string().length(255).comment('材料名称'),
        materialStatus: p.string().length(32).fieldName('material_status').$type<BidCommercialMaterialStatus>().comment('材料状态'),
        responsibleRole: p.string().length(128).nullable().fieldName('responsible_role').comment('责任角色'),
        dueAt: p.datetime().nullable().fieldName('due_at').comment('要求完成时间'),
        blocksNextStep: p.boolean().default(false).fieldName('blocks_next_step').comment('是否阻塞下一步'),
        navigationHint: p.string().length(255).nullable().fieldName('navigation_hint').comment('跳转提示'),
        sortOrder: p.integer().default(0).fieldName('sort_order').comment('排序号')
    }
});

export class ProjectBidCommercialMaterialItem extends ProjectBidCommercialMaterialItemSchema.class {}

ProjectBidCommercialMaterialItemSchema.setClass(ProjectBidCommercialMaterialItem);

export const ProjectBidCommercialTimelineItemSchema = defineEntity({
    name: 'ProjectBidCommercialTimelineItem',
    tableName: 'project_bid_commercial_timeline_item',
    schema: 'poms',
    comment: '签约前竞标过程时间线条目',
    indexes: [
        { name: 'idx_project_bid_commercial_timeline_process', properties: ['processId', 'sortOrder'] },
        { name: 'idx_project_bid_commercial_timeline_status', properties: ['timelineStatus'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        processId: () =>
            p
                .manyToOne(ProjectBidCommercialProcess)
                .mapToPk()
                .fieldName('process_id')
                .foreignKeyName('project_bid_commercial_timeline_item_process_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('竞标过程版本 ID'),
        eventKey: p.string().length(128).fieldName('event_key').comment('事件键'),
        label: p.string().length(255).comment('事件名称'),
        summary: p.text().nullable().comment('事件摘要'),
        timelineStatus: p.string().length(32).fieldName('timeline_status').$type<BidCommercialTimelineStatus>().comment('时间线状态'),
        occurredAt: p.datetime().nullable().fieldName('occurred_at').comment('实际发生时间'),
        dueAt: p.datetime().nullable().fieldName('due_at').comment('计划完成时间'),
        responsibleRole: p.string().length(128).nullable().fieldName('responsible_role').comment('责任角色'),
        sortOrder: p.integer().default(0).fieldName('sort_order').comment('排序号')
    }
});

export class ProjectBidCommercialTimelineItem extends ProjectBidCommercialTimelineItemSchema.class {}

ProjectBidCommercialTimelineItemSchema.setClass(ProjectBidCommercialTimelineItem);
