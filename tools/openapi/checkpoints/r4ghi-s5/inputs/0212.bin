import { ProjectHandoverBasisSnapshot } from "./project-handover-basis-snapshot.entity";
import { PlatformUser } from "../platform/platform-user.entity";
import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const ProjectHandoverBasisItemSchema = defineEntity({
    name: "ProjectHandoverBasisItem",
    tableName: "project_handover_basis_item",
    schema: 'poms',
    checks: [
        { name: "project_handover_basis_item_item_key_check", expression: "((length(btrim((item_key)::text)) > 0))" },
        { name: "project_handover_basis_item_item_type_check", expression: "(((item_type)::text = ANY ((ARRAY['scope'::character varying, 'risk'::character varying, 'receivable'::character varying, 'cost'::character varying, 'responsibility'::character varying, 'attachment'::character varying, 'contract'::character varying])::text[])))" },
        { name: "project_handover_basis_item_payload_check", expression: "((jsonb_typeof(payload) = 'object'::text))" },
        { name: "project_handover_basis_item_source_hash_check", expression: "(((source_hash IS NULL) OR ((source_hash)::text ~ '^[0-9a-f]{64}$'::text)))" },
        { name: "project_handover_basis_item_source_type_check", expression: "((length(btrim((source_type)::text)) > 0))" }
    ],
    uniques: [
        { name: "uq_r4d_basis_item_key", properties: ["basisSnapshotId","itemKey"] },
        { name: "uq_r4d_basis_item_scope", properties: ["id","basisSnapshotId"] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
        basisSnapshotId: () => p.manyToOne(ProjectHandoverBasisSnapshot).mapToPk().fieldName("basis_snapshot_id").foreignKeyName("project_handover_basis_item_basis_snapshot_id_fkey").updateRule('no action').deleteRule("restrict"),
        itemKey: p.string().length(128).fieldName("item_key"),
        itemType: p.string().length(32).fieldName("item_type"),
        sourceType: p.string().length(64).fieldName("source_type"),
        sourceId: p.uuid().fieldName("source_id"),
        sourceVersion: p.string().length(64).nullable().fieldName("source_version"),
        sourceHash: p.string().length(64).nullable().fieldName("source_hash"),
        payload: p.json<Record<string, unknown>>().columnType('jsonb').fieldName("payload"),
        createdAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("created_at"),
        createdBy: () => p.manyToOne(PlatformUser).mapToPk().fieldName("created_by").foreignKeyName("project_handover_basis_item_created_by_fkey").updateRule('no action').deleteRule("restrict")
    }
});

export class ProjectHandoverBasisItem extends ProjectHandoverBasisItemSchema.class {}

ProjectHandoverBasisItemSchema.setClass(ProjectHandoverBasisItem);
