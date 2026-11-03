import { defineEntity } from '@mikro-orm/core';
import type {
    ContractReadinessGuardDecision,
    ContractCommercialTerms,
    ContractReadinessItemStatus,
    ContractReadinessItemType,
    ContractReadinessStatus
} from '@poms/shared-contracts';
import { Contract } from '../contract/contract.entity';
import { ProjectBidCommercialProcess } from '../project/project-bid-commercial-process.entity';
import { ProjectPricingMarginReview } from '../project/project-pricing-margin-review.entity';
import { ProjectTechnicalCostPackage } from '../project/project-technical-cost-package.entity';
import { Project } from '../project/project.entity';
import { CommercialBaselineDiffResult, CommercialReleaseBaseline } from './commercial-release-baseline.entity';
import { ContractTermPreparation } from './contract-lifecycle.entity';

const p = defineEntity.properties;

export const ContractReadinessPackageSchema = defineEntity({
    name: 'ContractReadinessPackage',
    tableName: 'contract_readiness_package',
    schema: 'poms',
    indexes: [
        { name: 'idx_contract_readiness_package_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_contract_readiness_package_status', properties: ['packageStatus'] }
    ],
    uniques: [
        { name: 'uq_r4_readiness_scope', properties: ['id', 'projectId', 'contractId'] },
        {
            name: 'uq_r4_readiness_contract_current',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.contractId}") where "${columns.isCurrent}" and "${columns.contractId}" is not null`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('contract_readiness_package_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        // SQL93 adds strong compound scope FKs for these identities; their
        // non-PK unique tuples are enumerated in the ORM candidate integration map.
        contractId: () => p.manyToOne(Contract).mapToPk().nullable().fieldName('contract_id').createForeignKeyConstraint(false),
        candidateTerms: p.json<ContractCommercialTerms>().nullable().fieldName('candidate_terms'),
        sourceFacts: p.json<Record<string, unknown>>().defaultRaw("'{}'::jsonb").fieldName('source_facts'),
        payloadHash: p.string().length(64).nullable().fieldName('payload_hash'),
        currentPreparationId: () => p.manyToOne(ContractTermPreparation).mapToPk().nullable().fieldName('current_preparation_id').createForeignKeyConstraint(false),
        sourceCostPackageId: () =>
            p.manyToOne(ProjectTechnicalCostPackage).mapToPk().nullable().fieldName('source_cost_package_id')
                .foreignKeyName('contract_readiness_package_source_cost_package_id_fkey').updateRule('no action').deleteRule('restrict'),
        sourceBidProcessId: () =>
            p.manyToOne(ProjectBidCommercialProcess).mapToPk().nullable().fieldName('source_bid_process_id')
                .foreignKeyName('contract_readiness_package_source_bid_process_id_fkey').updateRule('no action').deleteRule('restrict'),
        sourcePricingReviewId: () =>
            p.manyToOne(ProjectPricingMarginReview).mapToPk().nullable().fieldName('source_pricing_review_id')
                .foreignKeyName('contract_readiness_package_source_pricing_review_id_fkey').updateRule('no action').deleteRule('restrict'),
        sourceBaselineId: () =>
            p
                .manyToOne(CommercialReleaseBaseline)
                .mapToPk()
                .fieldName('source_baseline_id')
                .foreignKeyName('contract_readiness_package_source_baseline_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict'),
        latestDiffResultId: () =>
            p
                .manyToOne(CommercialBaselineDiffResult)
                .mapToPk()
                .fieldName('latest_diff_result_id')
                .foreignKeyName('contract_readiness_package_latest_diff_result_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict'),
        packageStatus: p.string().length(32).fieldName('package_status').$type<ContractReadinessStatus>(),
        guardDecision: p.string().length(32).fieldName('guard_decision').$type<ContractReadinessGuardDecision>(),
        currentEffectiveDecisionSummary: p.string().length(1000).nullable().fieldName('current_effective_decision_summary'),
        blockingReasonSummary: p.string().length(1000).nullable().fieldName('blocking_reason_summary'),
        missingPrerequisiteCount: p.integer().default(0).fieldName('missing_prerequisite_count'),
        initializedContractSnapshotId: p.uuid().nullable().fieldName('initialized_contract_snapshot_id'),
        initializedReceivablePlanVersionId: p.uuid().nullable().fieldName('initialized_receivable_plan_version_id'),
        contractSnapshotInitializedAt: p.datetime().nullable().fieldName('contract_snapshot_initialized_at'),
        receivablePlanInitializedAt: p.datetime().nullable().fieldName('receivable_plan_initialized_at'),
        isCurrent: p.boolean().default(true).fieldName('is_current'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class ContractReadinessPackage extends ContractReadinessPackageSchema.class {}

ContractReadinessPackageSchema.setClass(ContractReadinessPackage);

export const ContractReadinessPackageItemSchema = defineEntity({
    name: 'ContractReadinessPackageItem',
    tableName: 'contract_readiness_package_item',
    schema: 'poms',
    indexes: [{ name: 'idx_contract_readiness_package_item_package_sort', properties: ['packageId', 'sortOrder'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        packageId: () =>
            p
                .manyToOne(ContractReadinessPackage)
                .mapToPk()
                .fieldName('package_id')
                .foreignKeyName('contract_readiness_package_item_package_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        itemType: p.string().length(32).fieldName('item_type').$type<ContractReadinessItemType>(),
        itemKey: p.string().length(128).fieldName('item_key'),
        label: p.string().length(128),
        summary: p.string().length(1000).nullable(),
        status: p.string().length(32).$type<ContractReadinessItemStatus>(),
        responsibleRole: p.string().length(128).nullable().fieldName('responsible_role'),
        navigationHint: p.string().length(255).nullable().fieldName('navigation_hint'),
        sortOrder: p.integer().default(0).fieldName('sort_order')
    }
});

export class ContractReadinessPackageItem extends ContractReadinessPackageItemSchema.class {}

ContractReadinessPackageItemSchema.setClass(ContractReadinessPackageItem);
