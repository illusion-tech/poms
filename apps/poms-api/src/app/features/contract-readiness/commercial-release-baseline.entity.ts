import { defineEntity } from '@mikro-orm/core';
import type { CommercialBaselineReviewDecision, CommercialDiffLevel, CommercialDiffReviewStatus } from '@poms/shared-contracts';
import { Project } from '../project/project.entity';

export type CommercialReleaseBaselineStatus = 'draft' | 'effective' | 'superseded';

const p = defineEntity.properties;

export const CommercialReleaseBaselineSchema = defineEntity({
    name: 'CommercialReleaseBaseline',
    tableName: 'commercial_release_baseline',
    schema: 'poms',
    indexes: [
        { name: 'idx_commercial_release_baseline_project_current', properties: ['projectId', 'isCurrent'] },
        { name: 'idx_commercial_release_baseline_status', properties: ['baselineStatus'] }
    ],
    uniques: [{ name: 'commercial_release_baseline_project_code_unique', properties: ['projectId', 'baselineCode'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commercial_release_baseline_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        baselineCode: p.string().length(64).fieldName('baseline_code'),
        quotationReviewId: p.uuid().nullable().fieldName('quotation_review_id'),
        baselineStatus: p.string().length(32).default('effective').fieldName('baseline_status').$type<CommercialReleaseBaselineStatus>(),
        isCurrent: p.boolean().default(true).fieldName('is_current'),
        grossMarginSummary: p.string().length(1000).nullable().fieldName('gross_margin_summary'),
        paymentTermsSummary: p.string().length(1000).nullable().fieldName('payment_terms_summary'),
        latestDiffResultId: () =>
            p
                .manyToOne(CommercialBaselineDiffResult)
                .mapToPk()
                .nullable()
                .fieldName('latest_diff_result_id')
                .foreignKeyName('commercial_release_baseline_latest_diff_result_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommercialReleaseBaseline extends CommercialReleaseBaselineSchema.class {}

CommercialReleaseBaselineSchema.setClass(CommercialReleaseBaseline);

export const CommercialBaselineDiffResultSchema = defineEntity({
    name: 'CommercialBaselineDiffResult',
    tableName: 'commercial_baseline_diff_result',
    schema: 'poms',
    indexes: [
        { name: 'idx_commercial_baseline_diff_result_baseline', properties: ['baselineId', 'createdAt'] },
        { name: 'idx_commercial_baseline_diff_result_review_status', properties: ['reviewStatus'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        baselineId: () =>
            p
                .manyToOne(CommercialReleaseBaseline)
                .mapToPk()
                .fieldName('baseline_id')
                .foreignKeyName('commercial_baseline_diff_result_baseline_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commercial_baseline_diff_result_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        diffLevel: p.string().length(32).fieldName('diff_level').$type<CommercialDiffLevel>(),
        reviewStatus: p.string().length(32).fieldName('review_status').$type<CommercialDiffReviewStatus>(),
        diffSummary: p.string().length(1000).nullable().fieldName('diff_summary'),
        currentReviewDecision: p
            .string()
            .length(32)
            .nullable()
            .fieldName('current_review_decision')
            .$type<CommercialBaselineReviewDecision | null>(),
        reviewedAt: p.datetime().nullable().fieldName('reviewed_at'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at')
    }
});

export class CommercialBaselineDiffResult extends CommercialBaselineDiffResultSchema.class {}

CommercialBaselineDiffResultSchema.setClass(CommercialBaselineDiffResult);

export const CommercialBaselineDiffItemSchema = defineEntity({
    name: 'CommercialBaselineDiffItem',
    tableName: 'commercial_baseline_diff_item',
    schema: 'poms',
    indexes: [{ name: 'idx_commercial_baseline_diff_item_result_sort', properties: ['diffResultId', 'sortOrder'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        diffResultId: () =>
            p
                .manyToOne(CommercialBaselineDiffResult)
                .mapToPk()
                .fieldName('diff_result_id')
                .foreignKeyName('commercial_baseline_diff_item_diff_result_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        fieldKey: p.string().length(128).fieldName('field_key'),
        fieldLabel: p.string().length(128).fieldName('field_label'),
        oldValueSummary: p.string().length(1000).nullable().fieldName('old_value_summary'),
        newValueSummary: p.string().length(1000).nullable().fieldName('new_value_summary'),
        diffLevel: p.string().length(32).fieldName('diff_level').$type<CommercialDiffLevel>(),
        isBlocking: p.boolean().default(false).fieldName('is_blocking'),
        sortOrder: p.integer().default(0).fieldName('sort_order')
    }
});

export class CommercialBaselineDiffItem extends CommercialBaselineDiffItemSchema.class {}

CommercialBaselineDiffItemSchema.setClass(CommercialBaselineDiffItem);

export const CommercialBaselineReviewRecordSchema = defineEntity({
    name: 'CommercialBaselineReviewRecord',
    tableName: 'commercial_baseline_review_record',
    schema: 'poms',
    indexes: [
        { name: 'idx_commercial_baseline_review_record_diff_result', properties: ['diffResultId', 'createdAt'] },
        { name: 'idx_commercial_baseline_review_record_project', properties: ['projectId'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        baselineId: () =>
            p
                .manyToOne(CommercialReleaseBaseline)
                .mapToPk()
                .fieldName('baseline_id')
                .foreignKeyName('commercial_baseline_review_record_baseline_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        diffResultId: () =>
            p
                .manyToOne(CommercialBaselineDiffResult)
                .mapToPk()
                .fieldName('diff_result_id')
                .foreignKeyName('commercial_baseline_review_record_diff_result_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('commercial_baseline_review_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        decision: p.string().length(32).fieldName('decision').$type<CommercialBaselineReviewDecision>(),
        reviewedFieldKeys: p.json<string[]>().default([]).fieldName('reviewed_field_keys'),
        comment: p.string().length(1000).nullable(),
        reviewerUserId: p.uuid().fieldName('reviewer_user_id'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at')
    }
});

export class CommercialBaselineReviewRecord extends CommercialBaselineReviewRecordSchema.class {}

CommercialBaselineReviewRecordSchema.setClass(CommercialBaselineReviewRecord);
