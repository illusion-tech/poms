import { ProjectHandoverBasisSnapshot } from "./project-handover-basis-snapshot.entity";
import { PlatformUser } from "../platform/platform-user.entity";
import { ConfirmationRecord } from "../approval/confirmation-record.entity";
import { ProjectHandoverBasisItem } from "./project-handover-basis-item.entity";
import { defineEntity } from '@mikro-orm/core';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { ContractAmendment, ContractTermSnapshot } from '../contract/contract.entity';
import { Project } from '../project/project.entity';

export type ProjectHandoverStatus = 'draft' | 'confirmed' | 'superseded' | 'voided';
export type ContractHandoverRebaselineStatus = 'processing' | 'pending-effective' | 'effective' | 'superseded' | 'voided';
export type ProjectReceiptJudgmentFreezeSourceType = 'project-handover' | 'project-receipt-judgment-freeze';

const p = defineEntity.properties;

export const ContractHandoverRebaselineRecordSchema = defineEntity({
    name: 'ContractHandoverRebaselineRecord',
    tableName: 'contract_handover_rebaseline_record',
    schema: 'poms',
    comment: '合同移交前再基线化记录',
    indexes: [
        {
            name: 'idx_chrr_amendment_handled',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractAmendmentId}", "${columns.handledAt}" desc)`
        },
        {
            name: 'idx_chrr_project_handled',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.handledAt}" desc)`
        },
        { name: 'idx_chrr_amendment_status', properties: ['contractAmendmentId', 'status'] },
        { name: 'idx_chrr_project_status', properties: ['projectId', 'status'] },
        { name: 'idx_chrr_effective_baseline_after', properties: ['effectiveBaselineAfterId'] },
        { name: 'idx_chrr_supersedes', properties: ['supersedesId'] }
    ],
    uniques: [
        {
            name: 'uq_chrr_amendment_effective',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.contractAmendmentId}") where "${columns.status}" = 'effective'`
        },
        {
            name: 'uq_chrr_project_effective',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}") where "${columns.status}" = 'effective'`
        },
        { name: "uq_r4d_rebaseline_before", properties: ["id","basisBeforeId"] }
    ],
    checks: [
        { name: "chk_r4d_rebaseline_producer", expression: "(((producer_version IS NULL) OR ((producer_version = 1) AND (basis_before_id IS NOT NULL) AND (basis_after_id IS NOT NULL) AND (basis_before_id <> basis_after_id) AND (source_handover_id IS NOT NULL) AND (replacement_handover_id IS NOT NULL) AND (source_handover_id <> replacement_handover_id))))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        contractAmendmentId: () =>
            p
                .manyToOne(ContractAmendment)
                .mapToPk()
                .fieldName('contract_amendment_id')
                .foreignKeyName('contract_handover_rebaseline_record_contract_amendment_id_forei')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('合同变更版本 ID'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('contract_handover_rebaseline_record_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        rebaselineReason: p.text().fieldName('rebaseline_reason').comment('再基线化原因'),
        effectiveBaselineAfterId: () =>
            p
                .manyToOne(ContractTermSnapshot)
                .mapToPk()
                .fieldName('effective_baseline_after_id')
                .foreignKeyName('contract_handover_rebaseline_record_effective_baseline_after_id')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('再基线化后生效基线快照 ID'),
        status: p.string().length(32).default('processing').$type<ContractHandoverRebaselineStatus>().comment('状态：processing/pending-effective/effective/superseded/voided'),
        handledAt: p.datetime().defaultRaw('now()').fieldName('handled_at').comment('处理时间'),
        handledBy: p.uuid().nullable().fieldName('handled_by').comment('处理人'),
        supersedesId: () =>
            p
                .manyToOne(ContractHandoverRebaselineRecord)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('contract_handover_rebaseline_record_supersedes_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('被替代的再基线化记录'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        producerVersion: p.integer().nullable().fieldName("producer_version"),
        basisBeforeId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().nullable().fieldName("basis_before_id").foreignKeyName("contract_handover_rebaseline_record_basis_before_id_fkey").updateRule('no action').deleteRule("restrict"),
        basisAfterId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().nullable().fieldName("basis_after_id").foreignKeyName("contract_handover_rebaseline_record_basis_after_id_fkey").updateRule('no action').deleteRule("restrict"),
        sourceHandoverId: () => p.manyToOne(ProjectHandover).mapToPk().nullable().fieldName("source_handover_id").foreignKeyName("contract_handover_rebaseline_record_source_handover_id_fkey").updateRule('no action').deleteRule("restrict"),
        replacementHandoverId: () => p.manyToOne(ProjectHandover).mapToPk().nullable().fieldName("replacement_handover_id").foreignKeyName("contract_handover_rebaseline_recor_replacement_handover_id_fkey").updateRule('no action').deleteRule("restrict")
    }
});

export class ContractHandoverRebaselineRecord extends ContractHandoverRebaselineRecordSchema.class {}

ContractHandoverRebaselineRecordSchema.setClass(ContractHandoverRebaselineRecord);

export const ProjectHandoverSchema = defineEntity({
    name: 'project-handover',
    tableName: 'project_handover',
    schema: 'poms',
    comment: '项目移交确认记录',
    indexes: [
        {
            name: 'idx_project_handover_project_confirmed',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.confirmedAt}" desc)`
        },
        { name: 'idx_project_handover_contract_summary_snapshot', properties: ['contractSummarySnapshotId'] },
        { name: 'idx_project_handover_summary_snapshot', properties: ['summarySnapshotId'] },
        { name: 'idx_project_handover_rebaseline', properties: ['handoverRebaselineRecordId'] }
    ],
    uniques: [
        { name: "uq_r4d_handover_confirmation", properties: ["id","confirmationRecordId"] },
        { name: "uq_r4d_handover_freeze_source", properties: ["id","summarySnapshotId","basisSnapshotId"] },
        { name: "uq_r4d_handover_scope", properties: ["id","projectId","basisSnapshotId"] },
        { name: "uq_r4d_handover_version", properties: ["projectId","version"] },
        { name: "uq_r4d_handover_current", expression: "CREATE UNIQUE INDEX uq_r4d_handover_current ON poms.project_handover USING btree (project_id) WHERE is_current" },
        {"name":"uq_jghi_handover_project","properties":["id","projectId"]}
    ],
    checks: [
        { name: "chk_r4d_handover_producer", expression: "(((producer_version IS NULL) OR ((producer_version = 1) AND (basis_snapshot_id IS NOT NULL) AND (version IS NOT NULL) AND (execution_owner_user_id IS NOT NULL) AND (confirmation_record_id IS NOT NULL) AND (finance_confirmation_required IS NOT NULL) AND (prepared_receipt_judgment_mode IS NOT NULL) AND ((prepared_receipt_judgment_mode)::text = ANY ((ARRAY['project-aggregate'::character varying, 'contract-separate'::character varying])::text[])) AND (source_payload_hash IS NOT NULL) AND ((source_payload_hash)::text ~ '^[0-9a-f]{64}$'::text) AND (((status)::text <> 'confirmed'::text) OR ((confirmed_at IS NOT NULL) AND (confirmed_by IS NOT NULL))) AND (((status)::text <> 'draft'::text) OR ((confirmed_at IS NULL) AND (confirmed_by IS NULL))) AND ((NOT is_current) OR ((status)::text = ANY ((ARRAY['draft'::character varying, 'confirmed'::character varying])::text[]))))))" },
        { name: "project_handover_version_check", expression: "(((version IS NULL) OR (version > 0)))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('project_handover_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('关联项目'),
        contractSummarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('contract_summary_snapshot_id')
                .foreignKeyName('project_handover_contract_summary_snapshot_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('合同承接摘要快照 ID'),
        effectiveHandoverBaselineSnapshotId: () =>
            p
                .manyToOne(ContractTermSnapshot)
                .mapToPk()
                .fieldName('effective_handover_baseline_snapshot_id')
                .foreignKeyName('project_handover_effective_handover_baseline_snapshot_id_foreig')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('移交前有效基线快照 ID'),
        summarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('summary_snapshot_id')
                .foreignKeyName('project_handover_summary_snapshot_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('移交确认摘要快照 ID'),
        handoverRebaselineRecordId: () =>
            p
                .manyToOne(ContractHandoverRebaselineRecord)
                .mapToPk()
                .nullable()
                .fieldName('handover_rebaseline_record_id')
                .foreignKeyName('project_handover_handover_rebaseline_record_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('最近一次已生效移交前再基线化记录'),
        status: p.string().length(32).default('draft').$type<ProjectHandoverStatus>().comment('状态：draft/confirmed/superseded/voided'),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at').comment('确认时间'),
        confirmedBy: p.uuid().nullable().fieldName('confirmed_by').comment('确认人'),
        comment: p.text().nullable().comment('确认备注'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        producerVersion: p.integer().nullable().fieldName("producer_version"),
        basisSnapshotId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().nullable().fieldName("basis_snapshot_id").createForeignKeyConstraint(false),
        version: p.integer().nullable().fieldName("version"),
        isCurrent: p.boolean().default(false).fieldName("is_current"),
        supersedesId: () => p.manyToOne(ProjectHandover).mapToPk().nullable().fieldName("supersedes_id").foreignKeyName("project_handover_supersedes_id_fkey").updateRule('no action').deleteRule("restrict"),
        executionOwnerUserId: () => p.manyToOne(PlatformUser).mapToPk().nullable().fieldName("execution_owner_user_id").foreignKeyName("project_handover_execution_owner_user_id_fkey").updateRule('no action').deleteRule("restrict"),
        confirmationRecordId: () => p.manyToOne(ConfirmationRecord).mapToPk().nullable().fieldName("confirmation_record_id").foreignKeyName("project_handover_confirmation_record_id_fkey").updateRule('no action').deleteRule("restrict"),
        financeConfirmationRequired: p.boolean().nullable().fieldName("finance_confirmation_required"),
        preparedReceiptJudgmentMode: p.string().length(64).nullable().fieldName("prepared_receipt_judgment_mode"),
        sourcePayloadHash: p.string().length(64).nullable().fieldName("source_payload_hash")
    }
});

export class ProjectHandover extends ProjectHandoverSchema.class {}

ProjectHandoverSchema.setClass(ProjectHandover);

export const HandoverBaselineImpactItemSchema = defineEntity({
    name: 'HandoverBaselineImpactItem',
    tableName: 'handover_baseline_impact_item',
    schema: 'poms',
    comment: '移交前再基线化影响项',
    indexes: [
        { name: 'idx_hbii_rebaseline_record', properties: ['rebaselineRecordId'] },
        { name: 'idx_hbii_affected_item', properties: ['affectedHandoverItemId'] }
    ],
    uniques: [
        { name: "uq_r4d_rebaseline_item", expression: "CREATE UNIQUE INDEX uq_r4d_rebaseline_item ON poms.handover_baseline_impact_item USING btree (rebaseline_record_id, source_basis_item_id) WHERE (producer_version = 1)" }
    ],
    checks: [
        { name: "chk_r4d_impact_producer", expression: "(((producer_version IS NULL) OR ((producer_version = 1) AND (basis_before_id IS NOT NULL) AND (source_basis_item_id IS NOT NULL) AND (affected_handover_item_id = source_basis_item_id))))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        rebaselineRecordId: () =>
            p
                .manyToOne(ContractHandoverRebaselineRecord)
                .mapToPk()
                .fieldName('rebaseline_record_id')
                .foreignKeyName('handover_baseline_impact_item_rebaseline_record_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('所属再基线化记录'),
        affectedHandoverItemId: p.uuid().fieldName('affected_handover_item_id').comment('受影响移交前事实项 ID'),
        impactType: p.string().length(64).fieldName('impact_type').comment('影响类型'),
        impactSummary: p.text().fieldName('impact_summary').comment('影响摘要'),
        supersedesBaselineId: p.uuid().nullable().fieldName('supersedes_baseline_id').comment('被替代基线 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        producerVersion: p.integer().nullable().fieldName("producer_version"),
        basisBeforeId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().nullable().fieldName("basis_before_id").createForeignKeyConstraint(false),
        sourceBasisItemId: () => p.manyToOne(ProjectHandoverBasisItem).mapToPk().nullable().fieldName("source_basis_item_id").createForeignKeyConstraint(false)
    }
});

export class HandoverBaselineImpactItem extends HandoverBaselineImpactItemSchema.class {}

HandoverBaselineImpactItemSchema.setClass(HandoverBaselineImpactItem);

export const ProjectReceiptJudgmentFreezeSchema = defineEntity({
    name: 'ProjectReceiptJudgmentFreeze',
    tableName: 'project_receipt_judgment_freeze',
    schema: 'poms',
    comment: '项目回款判断模式冻结记录',
    indexes: [
        {
            name: 'idx_prjf_project_frozen',
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}", "${columns.frozenAt}" desc)`
        },
        { name: 'idx_prjf_source_handover', properties: ['sourceHandoverId'] },
        { name: 'idx_prjf_handover_summary', properties: ['sourceHandoverSummarySnapshotId'] },
        { name: 'idx_prjf_handover_rebaseline', properties: ['sourceHandoverRebaselineRecordId'] },
        { name: 'idx_prjf_supersedes', properties: ['supersedesId'] }
    ],
    uniques: [
        {
            name: 'uq_prjf_project_current',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.projectId}") where "${columns.isCurrent}" = true`
        },
        { name: "uq_r4d_receipt_freeze_version", properties: ["projectId","version"] }
    ],
    checks: [
        { name: "chk_r4d_receipt_freeze_producer", expression: "(((producer_version IS NULL) OR ((producer_version = 1) AND (basis_snapshot_id IS NOT NULL) AND (version IS NOT NULL) AND ((receipt_judgment_mode)::text = ANY ((ARRAY['project-aggregate'::character varying, 'contract-separate'::character varying])::text[])) AND ((source_type)::text = ANY ((ARRAY['project-handover'::character varying, 'project-receipt-judgment-freeze'::character varying])::text[])) AND (((source_type)::text <> 'project-handover'::text) OR (source_id = source_handover_id)))))" },
        { name: "project_receipt_judgment_freeze_version_check", expression: "(((version IS NULL) OR (version > 0)))" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('project_receipt_judgment_freeze_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        receiptJudgmentMode: p.string().length(64).fieldName('receipt_judgment_mode').comment('回款判断模式'),
        sourceType: p.string().length(64).fieldName('source_type').$type<ProjectReceiptJudgmentFreezeSourceType>().comment('来源类型'),
        sourceId: p.uuid().fieldName('source_id').comment('来源记录 ID'),
        sourceHandoverId: () =>
            p
                .manyToOne(ProjectHandover)
                .mapToPk()
                .fieldName('source_handover_id')
                .foreignKeyName('project_receipt_judgment_freeze_source_handover_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('来源移交记录 ID'),
        sourceHandoverSummarySnapshotId: () =>
            p
                .manyToOne(ApprovalSummarySnapshot)
                .mapToPk()
                .fieldName('source_handover_summary_snapshot_id')
                .foreignKeyName('project_receipt_judgment_freeze_source_handover_summary_snapsh')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('来源移交确认摘要快照 ID'),
        sourceHandoverRebaselineRecordId: () =>
            p
                .manyToOne(ContractHandoverRebaselineRecord)
                .mapToPk()
                .nullable()
                .fieldName('source_handover_rebaseline_record_id')
                .foreignKeyName('project_receipt_judgment_freeze_source_handover_rebaseline_')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('来源移交前再基线化记录 ID'),
        isCurrent: p.boolean().default(true).fieldName('is_current').comment('是否当前有效冻结'),
        frozenAt: p.datetime().defaultRaw('now()').fieldName('frozen_at').comment('冻结时间'),
        frozenBy: p.uuid().nullable().fieldName('frozen_by').comment('冻结操作人'),
        supersedesId: () =>
            p
                .manyToOne(ProjectReceiptJudgmentFreeze)
                .mapToPk()
                .nullable()
                .fieldName('supersedes_id')
                .foreignKeyName('project_receipt_judgment_freeze_supersedes_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('被替代冻结记录 ID'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        producerVersion: p.integer().nullable().fieldName("producer_version"),
        basisSnapshotId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().nullable().fieldName("basis_snapshot_id").createForeignKeyConstraint(false),
        version: p.integer().nullable().fieldName("version")
    }
});

export class ProjectReceiptJudgmentFreeze extends ProjectReceiptJudgmentFreezeSchema.class {}

ProjectReceiptJudgmentFreezeSchema.setClass(ProjectReceiptJudgmentFreeze);
