import { SharedCostAllocationBasis } from "./shared-cost-allocation-basis.entity";
import { ProjectActualCostRecord } from "./project-actual-cost-record.entity";
import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const SharedCostAllocationSourceSnapshotSchema = defineEntity({
    name: "SharedCostAllocationSourceSnapshot",
    tableName: "shared_cost_allocation_source_snapshot",
    schema: 'poms',
    checks: [
        { name: "shared_cost_allocation_source_snapsho_source_payload_hash_check", expression: "((source_payload_hash ~ '^[0-9a-f]{64}$'::text))" },
        { name: "shared_cost_allocation_source_snapshot_check", expression: "((((amount_excluding_tax IS NULL) OR (amount_excluding_tax >= (0)::numeric)) AND ((tax_cost_amount IS NULL) OR (tax_cost_amount >= (0)::numeric)) AND ((amount_including_tax IS NULL) OR (amount_including_tax >= (0)::numeric)) AND ((amount_excluding_tax IS NULL) OR (tax_cost_amount IS NULL) OR (amount_including_tax IS NULL) OR ((amount_excluding_tax + tax_cost_amount) = amount_including_tax))))" },
        { name: "shared_cost_allocation_source_snapshot_cost_row_version_check", expression: "((cost_row_version > 0))" },
        { name: "shared_cost_allocation_source_snapshot_source_payload_check", expression: "((jsonb_typeof(source_payload) = 'object'::text))" },
        { name: "shared_cost_allocation_source_snapshot_source_row_version_check", expression: "((source_row_version > 0))" }
    ],
    uniques: [
        { name: "uq_r4f_allocation_source_current", expression: "CREATE UNIQUE INDEX uq_r4f_allocation_source_current ON poms.shared_cost_allocation_source_snapshot USING btree (cost_record_id) WHERE is_current" }
    ],
    properties: {
        basisId: () => p.manyToOne(SharedCostAllocationBasis).mapToPk().primary().fieldName("basis_id").foreignKeyName("shared_cost_allocation_source_snapshot_basis_id_fkey").updateRule('no action').deleteRule("no action"),
        costRecordId: () => p.manyToOne(ProjectActualCostRecord).mapToPk().primary().fieldName("cost_record_id").foreignKeyName("shared_cost_allocation_source_snapshot_cost_record_id_fkey").updateRule('no action').deleteRule("no action"),
        costRowVersion: p.integer().fieldName("cost_row_version"),
        sourceType: p.string().length(64).nullable().fieldName("source_type"),
        sourceId: p.string().length(64).nullable().fieldName("source_id"),
        sourceRowVersion: p.integer().nullable().fieldName("source_row_version"),
        currency: p.string().length(16).fieldName("currency"),
        amountExcludingTax: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("amount_excluding_tax"),
        taxCostAmount: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("tax_cost_amount"),
        amountIncludingTax: p.string().columnType('numeric(18,2)').precision(18).scale(2).nullable().fieldName("amount_including_tax"),
        sourcePayload: p.json<Record<string, unknown>>().columnType('jsonb').fieldName("source_payload"),
        sourcePayloadHash: p.string().columnType('char(64)').length(64).fieldName("source_payload_hash"),
        isCurrent: p.boolean().fieldName("is_current"),
        createdAt: p.datetime().columnType('timestamptz').defaultRaw("now()").fieldName("created_at")
    }
});

export class SharedCostAllocationSourceSnapshot extends SharedCostAllocationSourceSnapshotSchema.class {}

SharedCostAllocationSourceSnapshotSchema.setClass(SharedCostAllocationSourceSnapshot);
