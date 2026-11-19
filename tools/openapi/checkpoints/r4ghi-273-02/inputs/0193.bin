import { Project } from "../project/project.entity";
import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const CostGovernanceEvidenceSchema = defineEntity({
    name: "CostGovernanceEvidence",
    tableName: "cost_governance_evidence",
    schema: 'poms',
    checks: [
        { name: "cost_governance_evidence_evidence_kind_check", expression: "(((evidence_kind)::text = ANY ((ARRAY['source-facts'::character varying, 'manual-stage'::character varying, 'manual-finance'::character varying])::text[])))" },
        { name: "cost_governance_evidence_frozen_payload_check", expression: "((jsonb_typeof(frozen_payload) = 'object'::text))" },
        { name: "cost_governance_evidence_payload_hash_check", expression: "((payload_hash ~ '^[0-9a-f]{64}$'::text))" },
        { name: "cost_governance_evidence_reason_check", expression: "((length(btrim(reason)) > 0))" },
        { name: "cost_governance_evidence_schema_version_check", expression: "((schema_version = 1))" },
        { name: "cost_governance_evidence_source_references_check", expression: "((jsonb_typeof(source_references) = 'array'::text))" },
        { name: "cost_governance_evidence_target_type_check", expression: "(((target_type)::text = ANY ((ARRAY['SharedCostAllocationBasis'::character varying, 'SharedCostAllocationResult'::character varying, 'CostStageAttributionSnapshot'::character varying, 'AccountingTaxTreatmentSnapshot'::character varying])::text[])))" }
    ],
    uniques: [
        { name: "cost_governance_evidence_target_type_target_id_key", properties: ["targetType","targetId"] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw("gen_random_uuid()").fieldName("id"),
        targetType: p.string().length(64).fieldName("target_type"),
        targetId: p.uuid().fieldName("target_id"),
        projectId: () => p.manyToOne(Project).mapToPk().nullable().fieldName("project_id").foreignKeyName("cost_governance_evidence_project_id_fkey").updateRule('no action').deleteRule("no action"),
        evidenceKind: p.string().length(32).fieldName("evidence_kind"),
        businessDate: p.date().fieldName("business_date"),
        sourceReferences: p.json<unknown[]>().columnType('jsonb').fieldName("source_references"),
        frozenPayload: p.json<Record<string, unknown>>().columnType('jsonb').fieldName("frozen_payload"),
        payloadHash: p.string().columnType('char(64)').length(64).fieldName("payload_hash"),
        reason: p.text().fieldName("reason"),
        actorId: p.uuid().fieldName("actor_id"),
        requestId: p.string().length(128).nullable().fieldName("request_id"),
        schemaVersion: p.integer().columnType('smallint').default(1).fieldName("schema_version"),
        createdAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("created_at")
    }
});

export class CostGovernanceEvidence extends CostGovernanceEvidenceSchema.class {}

CostGovernanceEvidenceSchema.setClass(CostGovernanceEvidence);
