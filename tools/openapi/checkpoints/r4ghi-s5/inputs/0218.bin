import { ApprovalSummarySnapshot } from "../approval-summary/approval-summary.entity";
import { Project } from "../project/project.entity";
import { ProjectHandover } from "./project-handover.entity";
import { ProjectHandoverBasisSnapshot } from "./project-handover-basis-snapshot.entity";
import { PlatformUser } from "../platform/platform-user.entity";
import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const ProjectHandoverSummaryPayloadSchema = defineEntity({
    name: "ProjectHandoverSummaryPayload",
    tableName: "project_handover_summary_payload",
    schema: 'poms',
    checks: [
        { name: "chk_r4d_payload_kind", expression: "((((handover_id IS NULL) AND (contract_summary_snapshot_id IS NULL)) OR ((handover_id IS NOT NULL) AND (contract_summary_snapshot_id IS NOT NULL))))" },
        { name: "project_handover_summary_payload_payload_check", expression: "((jsonb_typeof(payload) = 'object'::text))" },
        { name: "project_handover_summary_payload_payload_hash_check", expression: "(((payload_hash)::text ~ '^[0-9a-f]{64}$'::text))" },
        { name: "project_handover_summary_payload_source_hash_check", expression: "(((source_hash)::text ~ '^[0-9a-f]{64}$'::text))" }
    ],
    properties: {
        summarySnapshotId: () => p.manyToOne(ApprovalSummarySnapshot).mapToPk().primary().fieldName("summary_snapshot_id").foreignKeyName("project_handover_summary_payload_summary_snapshot_id_fkey").updateRule('no action').deleteRule("restrict"),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName("project_id").createForeignKeyConstraint(false),
        handoverId: () => p.manyToOne(ProjectHandover).mapToPk().nullable().fieldName("handover_id").createForeignKeyConstraint(false),
        basisSnapshotId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().fieldName("basis_snapshot_id").createForeignKeyConstraint(false),
        contractSummarySnapshotId: () => p.manyToOne(ApprovalSummarySnapshot).mapToPk().nullable().fieldName("contract_summary_snapshot_id").foreignKeyName("project_handover_summary_payl_contract_summary_snapshot_id_fkey").updateRule('no action').deleteRule("restrict"),
        payload: p.json<Record<string, unknown>>().columnType('jsonb').fieldName("payload"),
        payloadHash: p.string().length(64).fieldName("payload_hash"),
        sourceHash: p.string().length(64).fieldName("source_hash"),
        generatedAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("generated_at"),
        generatedBy: () => p.manyToOne(PlatformUser).mapToPk().fieldName("generated_by").foreignKeyName("project_handover_summary_payload_generated_by_fkey").updateRule('no action').deleteRule("restrict")
    }
});

export class ProjectHandoverSummaryPayload extends ProjectHandoverSummaryPayloadSchema.class {}

ProjectHandoverSummaryPayloadSchema.setClass(ProjectHandoverSummaryPayload);
