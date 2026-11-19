import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const BusinessNumberSequenceSchema = defineEntity({
    name: 'BusinessNumberSequence',
    tableName: 'business_number_sequence',
    schema: 'poms',
    comment: 'POMS 业务编号序列表',
    uniques: [{ name: 'uq_business_number_sequence_scope_period', properties: ['scope', 'period'] }],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        scope: p.string().length(64).comment('编号范围'),
        period: p.string().length(16).comment('编号周期'),
        nextValue: p.integer().default(1).fieldName('next_value').comment('下一个可用序号'),
        prefix: p.string().length(32).comment('编号前缀'),
        padding: p.integer().default(6).comment('序号补零宽度'),
        description: p.string().length(255).nullable().comment('说明'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间')
    }
});

export class BusinessNumberSequence extends BusinessNumberSequenceSchema.class {}

BusinessNumberSequenceSchema.setClass(BusinessNumberSequence);
