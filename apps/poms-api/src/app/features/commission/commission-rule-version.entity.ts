import { defineEntity } from '@mikro-orm/core';

export type CommissionRuleVersionStatus = 'draft' | 'active' | 'stopped';

export interface TierDefinition {
    tiers: Array<{ minMarginRate: number; maxMarginRate: number | null; commissionRate: number }>;
}

const p = defineEntity.properties;

export const CommissionRuleVersionSchema = defineEntity({
    name: 'CommissionRuleVersion',
    tableName: 'commission_rule_version',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        ruleCode: p.string().length(64).fieldName('rule_code'),
        version: p.integer(),
        status: p.string().length(32).default('draft') as ReturnType<typeof p.string> & { (): CommissionRuleVersionStatus },
        tierDefinitionJson: p.json<TierDefinition>().fieldName('tier_definition_json'),
        firstStageCapRuleJson: p.json<Record<string, unknown>>().nullable().fieldName('first_stage_cap_rule_json'),
        secondStageCapRuleJson: p.json<Record<string, unknown>>().nullable().fieldName('second_stage_cap_rule_json'),
        retentionRuleJson: p.json<Record<string, unknown>>().nullable().fieldName('retention_rule_json'),
        lowDownPaymentRuleJson: p.json<Record<string, unknown>>().nullable().fieldName('low_down_payment_rule_json'),
        exceptionRuleJson: p.json<Record<string, unknown>>().nullable().fieldName('exception_rule_json'),
        effectiveFrom: p.datetime().nullable().fieldName('effective_from'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p.datetime().onCreate(() => new Date()).fieldName('created_at'),
        createdBy: p.uuid().nullable().fieldName('created_by'),
        updatedAt: p.datetime().onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at'),
        updatedBy: p.uuid().nullable().fieldName('updated_by')
    }
});

export class CommissionRuleVersion extends CommissionRuleVersionSchema.class {}

CommissionRuleVersionSchema.setClass(CommissionRuleVersion);
