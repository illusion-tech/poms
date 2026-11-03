import { defineEntity } from '@mikro-orm/core';
import type {
    ContractReadinessGuardDecision,
    ContractReadinessItemStatus,
    ContractReadinessItemType,
    ContractReadinessStatus
} from '@poms/shared-contracts';
import { Project } from '../project/project.entity';
import { CommercialBaselineDiffResult, CommercialReleaseBaseline } from './commercial-release-baseline.entity';

const p = defineEntity.properties;

export const ContractReadinessPackageSchema = defineEntity({
    name: 'ContractReadinessPackage',
    tableName: 'contract_readiness_package',
    schema: 'poms',
    indexes: [
        { name: 'idx_contract_readiness_package_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_contract_readiness_package_status', properties: ['packageStatus'] }
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
