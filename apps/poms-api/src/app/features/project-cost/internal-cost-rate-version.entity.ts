import { defineEntity } from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';

const p = defineEntity.properties;

export const InternalCostRateVersionSchema = defineEntity({
    name: 'InternalCostRateVersion',
    tableName: 'internal_cost_rate_version',
    schema: 'poms',
    comment: 'POMS 内部成本率版本',
    indexes: [
        { name: 'idx_cost_rate_scope', properties: ['rateScopeType'] },
        { name: 'idx_cost_rate_effective', properties: ['effectiveFrom', 'effectiveTo'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        rateScopeType: p.string().length(32).fieldName('rate_scope_type').comment('生效范围类型：PERSON / ROLE'),
        personId: p.uuid().nullable().fieldName('person_id').comment('人员标识'),
        roleCode: p.string().length(64).nullable().fieldName('role_code').comment('角色编码'),
        rateUnit: p.string().length(32).fieldName('rate_unit').comment('单位：HOUR / DAY'),
        rateValue: p.decimal().precision(15).scale(4).fieldName('rate_value').comment('成本率'),
        currency: p.string().length(16).default('CNY').comment('币种'),
        effectiveFrom: p.date().fieldName('effective_from').comment('生效开始日期'),
        effectiveTo: p.date().nullable().fieldName('effective_to').comment('生效结束日期'),
        publishedAt: p.datetime().nullable().fieldName('published_at').comment('发布时间'),
        publishedBy: p.uuid().nullable().fieldName('published_by').comment('发布人'),
        supersedesRateVersion: () => p.manyToOne(() => InternalCostRateVersion).nullable().fieldName('supersedes_rate_version_id').comment('替代的旧版本'),
        changeReason: p.text().nullable().fieldName('change_reason').comment('变更原因'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export class InternalCostRateVersion extends InternalCostRateVersionSchema.class {
    override supersedesRateVersion!: Ref<InternalCostRateVersion> | null;
}

InternalCostRateVersionSchema.setClass(InternalCostRateVersion);
