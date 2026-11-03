import { defineEntity } from '@mikro-orm/core';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { CommercialReleaseBaseline } from '../contract-readiness/commercial-release-baseline.entity';
import { ProjectBidCommercialProcess } from './project-bid-commercial-process.entity';
import { ProjectTechnicalCostPackage } from './project-technical-cost-package.entity';
import { Project } from './project.entity';

export type ProjectPricingMarginReviewStatus = 'effective' | 'superseded';
export type PricingMarginPath = 'bid' | 'direct-commercial';
export type PricingMarginDecision = 'pending' | 'released' | 'conditional-release' | 'rejected' | 'escalation-required';
export type GrossMarginBand = 'below-redline' | 'watch' | 'target' | 'not-calculated';
export type PricingMarginConditionType = 'financial' | 'tax' | 'payment' | 'scope' | 'risk' | 'approval';
export type PricingMarginConditionStatus = 'open' | 'closed' | 'waived';

const p = defineEntity.properties;

export const ProjectPricingMarginReviewSchema = defineEntity({
    name: 'ProjectPricingMarginReview',
    tableName: 'project_pricing_margin_review',
    schema: 'poms',
    comment: '签约前报价与毛利评审版本',
    indexes: [
        { name: 'idx_project_pricing_margin_review_project_version', properties: ['projectId', 'version'] },
        { name: 'idx_project_pricing_margin_review_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_project_pricing_margin_review_decision', properties: ['decision'] },
        { name: 'idx_project_pricing_margin_review_cost_package', properties: ['technicalCostPackageId'] },
        { name: 'idx_project_pricing_margin_review_baseline', properties: ['commercialReleaseBaselineId'] },
        { name: 'idx_project_pricing_margin_review_summary_snapshot', properties: ['summarySnapshotId'] }
    ],
    uniques: [
        { name: 'uq_project_pricing_margin_review_project_version', properties: ['projectId', 'version'] },
        {
            name: 'uq_project_pricing_margin_review_current',
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
                .foreignKeyName('project_pricing_margin_review_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        version: p.integer().comment('版本号'),
        isCurrent: p.boolean().default(true).fieldName('is_current').comment('是否当前有效版本'),
        supersedesId: () =>
            p
                .manyToOne(ProjectPricingMarginReview)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('project_pricing_margin_review_supersedes_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('替代的旧评审版本 ID'),
        status: p.string().length(32).default('effective').$type<ProjectPricingMarginReviewStatus>().comment('状态：effective/superseded'),
        technicalCostPackageId: () =>
            p
                .manyToOne(ProjectTechnicalCostPackage)
                .mapToPk()
                .fieldName('technical_cost_package_id')
                .foreignKeyName('project_pricing_margin_review_technical_cost_package_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('来源技术与成本版本包 ID'),
        bidCommercialProcessId: () =>
            p
                .manyToOne(ProjectBidCommercialProcess)
                .mapToPk()
                .nullable()
                .fieldName('bid_commercial_process_id')
                .foreignKeyName('project_pricing_margin_review_bid_commercial_process_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('来源招投标 / 商务竞标过程 ID'),
        commercialReleaseBaselineId: () =>
            p
                .manyToOne(CommercialReleaseBaseline)
                .mapToPk()
                .nullable()
                .fieldName('commercial_release_baseline_id')
                .foreignKeyName('project_pricing_margin_review_commercial_release_baseline_id_fo')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('商业放行基线 ID'),
        pricingPath: p.string().length(32).fieldName('pricing_path').$type<PricingMarginPath>().comment('报价路径'),
        quoteVersion: p.string().length(64).fieldName('quote_version').comment('报价版本号'),
        currencyCode: p.string().length(16).fieldName('currency_code').comment('币种'),
        quoteAmountTaxInclusive: p.decimal().precision(18).scale(2).fieldName('quote_amount_tax_inclusive').comment('报价含税金额'),
        quoteAmountTaxExclusive: p.decimal().precision(18).scale(2).fieldName('quote_amount_tax_exclusive').comment('报价不含税金额'),
        taxRate: p.decimal().precision(18).scale(8).fieldName('tax_rate').comment('税率'),
        taxConditionSummary: p.text().fieldName('tax_condition_summary').comment('税务条件摘要'),
        paymentTermsSummary: p.text().fieldName('payment_terms_summary').comment('回款条件摘要'),
        grossMarginRate: p.decimal().precision(18).scale(8).nullable().fieldName('gross_margin_rate').comment('预计毛利率'),
        grossMarginBand: p.string().length(32).fieldName('gross_margin_band').$type<GrossMarginBand>().comment('毛利区间'),
        grossMarginSummary: p.text().fieldName('gross_margin_summary').comment('毛利判断摘要'),
        decision: p.string().length(32).$type<PricingMarginDecision>().comment('评审结论'),
        decisionSummary: p.text().fieldName('decision_summary').comment('评审结论说明'),
        approvalScenarioKey: p.string().length(128).nullable().fieldName('approval_scenario_key').comment('审批场景键'),
        summaryPackageKey: p.string().length(64).nullable().fieldName('summary_package_key').comment('审批摘要包键'),
        summarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .nullable()
                .fieldName('summary_snapshot_id')
                .foreignKeyName('project_pricing_margin_review_summary_snapshot_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('审批摘要快照 ID'),
        projectionLevel: p.string().length(32).nullable().fieldName('projection_level').comment('投影级别'),
        exportPolicy: p.string().length(32).nullable().fieldName('export_policy').comment('导出策略'),
        readyForContracting: p.boolean().default(false).fieldName('ready_for_contracting').comment('是否可进入签约就绪'),
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

export class ProjectPricingMarginReview extends ProjectPricingMarginReviewSchema.class {}

ProjectPricingMarginReviewSchema.setClass(ProjectPricingMarginReview);

export const ProjectPricingMarginConditionItemSchema = defineEntity({
    name: 'ProjectPricingMarginConditionItem',
    tableName: 'project_pricing_margin_condition_item',
    schema: 'poms',
    comment: '签约前报价与毛利评审条件项',
    indexes: [
        { name: 'idx_project_pricing_margin_condition_review', properties: ['reviewId', 'sortOrder'] },
        { name: 'idx_project_pricing_margin_condition_status', properties: ['conditionStatus'] },
        { name: 'idx_project_pricing_margin_condition_blocker', properties: ['reviewId', 'requiredForContracting'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        reviewId: () =>
            p
                .manyToOne(ProjectPricingMarginReview)
                .mapToPk()
                .fieldName('review_id')
                .foreignKeyName('project_pricing_margin_condition_item_review_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('报价与毛利评审版本 ID'),
        conditionKey: p.string().length(128).fieldName('condition_key').comment('条件键'),
        conditionType: p.string().length(32).fieldName('condition_type').$type<PricingMarginConditionType>().comment('条件类型'),
        label: p.string().length(255).comment('条件名称'),
        conditionSummary: p.text().fieldName('condition_summary').comment('条件说明'),
        conditionStatus: p.string().length(32).fieldName('condition_status').$type<PricingMarginConditionStatus>().comment('条件状态'),
        requiredForContracting: p.boolean().default(false).fieldName('required_for_contracting').comment('是否阻塞进入签约就绪'),
        responsibleRole: p.string().length(128).nullable().fieldName('responsible_role').comment('责任角色'),
        dueAt: p.datetime().nullable().fieldName('due_at').comment('要求完成时间'),
        resolutionSummary: p.text().nullable().fieldName('resolution_summary').comment('关闭或豁免说明'),
        sortOrder: p.integer().default(0).fieldName('sort_order').comment('排序号')
    }
});

export class ProjectPricingMarginConditionItem extends ProjectPricingMarginConditionItemSchema.class {}

ProjectPricingMarginConditionItemSchema.setClass(ProjectPricingMarginConditionItem);
