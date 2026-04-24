import { defineEntity } from '@mikro-orm/core';
import { Project } from './project.entity';

export type ProjectTechnicalCostPackageStatus = 'effective' | 'superseded';
export type TechnicalFeasibilityDecision = 'feasible' | 'conditional' | 'not-feasible';
export type TechnicalScopeItemType = 'in-scope' | 'out-of-scope' | 'assumption';
export type PresigningRiskLevel = 'R1' | 'R2' | 'R3' | 'R4';
export type PresigningRiskStatus = 'open' | 'mitigating' | 'accepted' | 'closed';
export type CostEstimateConfidenceLevel = 'high' | 'medium' | 'low';
export type TaxReviewStatus = 'pending' | 'reviewed' | 'not-required';

const p = defineEntity.properties;

export const ProjectTechnicalCostPackageSchema = defineEntity({
    name: 'ProjectTechnicalCostPackage',
    tableName: 'project_technical_cost_package',
    schema: 'poms',
    comment: '签约前技术与成本测算版本包',
    indexes: [
        { name: 'idx_project_technical_cost_package_project_version', properties: ['projectId', 'version'] },
        { name: 'idx_project_technical_cost_package_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_project_technical_cost_package_status', properties: ['status'] }
    ],
    uniques: [
        { name: 'uq_project_technical_cost_package_project_version', properties: ['projectId', 'version'] },
        {
            name: 'uq_project_technical_cost_package_current',
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
                .foreignKeyName('project_technical_cost_package_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        version: p.integer().comment('版本号'),
        isCurrent: p.boolean().default(true).fieldName('is_current').comment('是否当前有效版本'),
        supersedesId: () =>
            p
                .manyToOne(ProjectTechnicalCostPackage)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('project_technical_cost_package_supersedes_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('替代的旧版本包 ID'),
        status: p.string().length(32).default('effective').$type<ProjectTechnicalCostPackageStatus>().comment('状态：effective/superseded'),
        technicalFeasibilityDecision: p
            .string()
            .length(32)
            .fieldName('technical_feasibility_decision')
            .$type<TechnicalFeasibilityDecision>()
            .comment('技术可行性结论'),
        technicalConclusionSummary: p.text().fieldName('technical_conclusion_summary').comment('技术结论摘要'),
        allowNextStage: p.boolean().default(false).fieldName('allow_next_stage').comment('是否允许进入下一阶段'),
        currencyCode: p.string().length(16).fieldName('currency_code').comment('币种'),
        totalEstimatedAmountExcludingTax: p
            .decimal()
            .precision(18)
            .scale(2)
            .fieldName('total_estimated_amount_excluding_tax')
            .comment('估算总额（不含税）'),
        totalTaxCostAmount: p.decimal().precision(18).scale(2).fieldName('total_tax_cost_amount').comment('税金成本总额'),
        totalEstimatedAmountIncludingTax: p
            .decimal()
            .precision(18)
            .scale(2)
            .fieldName('total_estimated_amount_including_tax')
            .comment('估算总额（含税）'),
        taxAssumptionSummary: p.text().fieldName('tax_assumption_summary').comment('税务假设摘要'),
        taxReviewStatus: p.string().length(32).fieldName('tax_review_status').$type<TaxReviewStatus>().comment('税务复核状态'),
        highestRiskLevel: p.string().length(16).nullable().fieldName('highest_risk_level').$type<PresigningRiskLevel>().comment('最高风险等级'),
        blockerCount: p.integer().default(0).fieldName('blocker_count').comment('阻塞事项数量'),
        effectiveAt: p.datetime().fieldName('effective_at').comment('版本生效时间'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ProjectTechnicalCostPackage extends ProjectTechnicalCostPackageSchema.class {}

ProjectTechnicalCostPackageSchema.setClass(ProjectTechnicalCostPackage);

export const ProjectTechnicalScopeItemSchema = defineEntity({
    name: 'ProjectTechnicalScopeItem',
    tableName: 'project_technical_scope_item',
    schema: 'poms',
    comment: '签约前技术范围条目',
    indexes: [
        { name: 'idx_project_technical_scope_item_package', properties: ['packageId', 'sortOrder'] },
        { name: 'idx_project_technical_scope_item_type', properties: ['scopeType'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        packageId: () =>
            p
                .manyToOne(ProjectTechnicalCostPackage)
                .mapToPk()
                .fieldName('package_id')
                .foreignKeyName('project_technical_scope_item_package_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('技术成本版本包 ID'),
        scopeType: p.string().length(32).fieldName('scope_type').$type<TechnicalScopeItemType>().comment('范围类型'),
        label: p.string().length(255).comment('条目名称'),
        description: p.text().comment('条目说明'),
        sortOrder: p.integer().default(0).fieldName('sort_order').comment('排序号')
    }
});

export class ProjectTechnicalScopeItem extends ProjectTechnicalScopeItemSchema.class {}

ProjectTechnicalScopeItemSchema.setClass(ProjectTechnicalScopeItem);

export const ProjectTechnicalRiskItemSchema = defineEntity({
    name: 'ProjectTechnicalRiskItem',
    tableName: 'project_technical_risk_item',
    schema: 'poms',
    comment: '签约前技术风险条目',
    indexes: [
        { name: 'idx_project_technical_risk_item_package', properties: ['packageId', 'sortOrder'] },
        { name: 'idx_project_technical_risk_item_level', properties: ['riskLevel'] },
        { name: 'idx_project_technical_risk_item_blocker', properties: ['packageId', 'blocksNextStage'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        packageId: () =>
            p
                .manyToOne(ProjectTechnicalCostPackage)
                .mapToPk()
                .fieldName('package_id')
                .foreignKeyName('project_technical_risk_item_package_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('技术成本版本包 ID'),
        riskCategory: p.string().length(128).fieldName('risk_category').comment('风险类别'),
        riskLevel: p.string().length(16).fieldName('risk_level').$type<PresigningRiskLevel>().comment('风险等级'),
        riskDescription: p.text().fieldName('risk_description').comment('风险说明'),
        impactScope: p.text().fieldName('impact_scope').comment('影响范围'),
        mitigationPlan: p.text().fieldName('mitigation_plan').comment('缓解计划'),
        ownerRole: p.string().length(128).fieldName('owner_role').comment('责任角色'),
        riskStatus: p.string().length(32).fieldName('risk_status').$type<PresigningRiskStatus>().comment('风险状态'),
        blocksNextStage: p.boolean().default(false).fieldName('blocks_next_stage').comment('是否阻塞下一阶段'),
        sortOrder: p.integer().default(0).fieldName('sort_order').comment('排序号')
    }
});

export class ProjectTechnicalRiskItem extends ProjectTechnicalRiskItemSchema.class {}

ProjectTechnicalRiskItemSchema.setClass(ProjectTechnicalRiskItem);

export const ProjectTechnicalCostItemSchema = defineEntity({
    name: 'ProjectTechnicalCostItem',
    tableName: 'project_technical_cost_item',
    schema: 'poms',
    comment: '签约前成本估算条目',
    indexes: [
        { name: 'idx_project_technical_cost_item_package', properties: ['packageId', 'sortOrder'] },
        { name: 'idx_project_technical_cost_item_category', properties: ['costCategory'] },
        { name: 'idx_project_technical_cost_item_uncertainty', properties: ['packageId', 'highUncertainty'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        packageId: () =>
            p
                .manyToOne(ProjectTechnicalCostPackage)
                .mapToPk()
                .fieldName('package_id')
                .foreignKeyName('project_technical_cost_item_package_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('技术成本版本包 ID'),
        costCategory: p.string().length(128).fieldName('cost_category').comment('成本类别'),
        costSubcategory: p.string().length(128).nullable().fieldName('cost_subcategory').comment('成本子类'),
        costDescription: p.text().fieldName('cost_description').comment('成本说明'),
        estimationBasis: p.text().fieldName('estimation_basis').comment('估算依据'),
        quantity: p.decimal().precision(18).scale(4).nullable().comment('数量'),
        unit: p.string().length(32).nullable().comment('单位'),
        unitPrice: p.decimal().precision(18).scale(4).nullable().fieldName('unit_price').comment('单价'),
        amountExcludingTax: p.decimal().precision(18).scale(2).fieldName('amount_excluding_tax').comment('不含税金额'),
        taxCostAmount: p.decimal().precision(18).scale(2).fieldName('tax_cost_amount').comment('税金成本'),
        amountIncludingTax: p.decimal().precision(18).scale(2).fieldName('amount_including_tax').comment('含税金额'),
        currencyCode: p.string().length(16).fieldName('currency_code').comment('币种'),
        confidenceLevel: p.string().length(32).fieldName('confidence_level').$type<CostEstimateConfidenceLevel>().comment('估算置信度'),
        highUncertainty: p.boolean().default(false).fieldName('high_uncertainty').comment('是否高不确定性'),
        responsibleRole: p.string().length(128).nullable().fieldName('responsible_role').comment('责任角色'),
        sortOrder: p.integer().default(0).fieldName('sort_order').comment('排序号')
    }
});

export class ProjectTechnicalCostItem extends ProjectTechnicalCostItemSchema.class {}

ProjectTechnicalCostItemSchema.setClass(ProjectTechnicalCostItem);
