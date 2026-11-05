import { Project } from "../project/project.entity";
import { PlatformUser } from "../platform/platform-user.entity";
import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const ProjectHandoverBasisSnapshotSchema = defineEntity({
    name: "ProjectHandoverBasisSnapshot",
    tableName: "project_handover_basis_snapshot",
    schema: 'poms',
    checks: [
        { name: "chk_r4d_basis_current", expression: "(((NOT is_current) OR ((status)::text = 'active'::text)))" },
        { name: "project_handover_basis_snapshot_payload_hash_check", expression: "(((payload_hash)::text ~ '^[0-9a-f]{64}$'::text))" },
        { name: "project_handover_basis_snapshot_row_version_check", expression: "((row_version > 0))" },
        { name: "project_handover_basis_snapshot_source_hash_check", expression: "(((source_hash)::text ~ '^[0-9a-f]{64}$'::text))" },
        { name: "project_handover_basis_snapshot_source_payload_check", expression: "((jsonb_typeof(source_payload) = 'object'::text))" },
        { name: "project_handover_basis_snapshot_status_check", expression: "(((status)::text = ANY ((ARRAY['active'::character varying, 'superseded'::character varying, 'voided'::character varying])::text[])))" },
        { name: "project_handover_basis_snapshot_version_check", expression: "((version > 0))" }
    ],
    uniques: [
        { name: "uq_r4d_basis_project", properties: ["id","projectId"] },
        { name: "uq_r4d_basis_version", properties: ["projectId","version"] },
        { name: "uq_r4d_basis_current", expression: "CREATE UNIQUE INDEX uq_r4d_basis_current ON poms.project_handover_basis_snapshot USING btree (project_id) WHERE is_current" }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName("project_id").foreignKeyName("project_handover_basis_snapshot_project_id_fkey").updateRule('no action').deleteRule("restrict"),
        version: p.integer().fieldName("version"),
        sourcePayload: p.json<Record<string, unknown>>().columnType('jsonb').fieldName("source_payload"),
        sourceHash: p.string().length(64).fieldName("source_hash"),
        payloadHash: p.string().length(64).fieldName("payload_hash"),
        status: p.string().length(32).fieldName("status"),
        isCurrent: p.boolean().default(true).fieldName("is_current"),
        supersedesId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().nullable().fieldName("supersedes_id").foreignKeyName("project_handover_basis_snapshot_supersedes_id_fkey").updateRule('no action').deleteRule("restrict"),
        generatedAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("generated_at"),
        generatedBy: () => p.manyToOne(PlatformUser).mapToPk().fieldName("generated_by").foreignKeyName("project_handover_basis_snapshot_generated_by_fkey").updateRule('no action').deleteRule("restrict"),
        rowVersion: p.integer().version().default(1).fieldName("row_version")
    }
});

export class ProjectHandoverBasisSnapshot extends ProjectHandoverBasisSnapshotSchema.class {}

ProjectHandoverBasisSnapshotSchema.setClass(ProjectHandoverBasisSnapshot);
