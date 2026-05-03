import { defineEntity } from '@mikro-orm/core';
import {
    ACTIVE_INACTIVE_STATUSES,
    ActiveInactiveStatusValue,
    DICTIONARY_DOMAINS,
    type DictionaryDomain,
    type DictionaryItemStatus
} from '@poms/shared-contracts';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const DictionaryItemSchema = defineEntity({
    name: 'DictionaryItem',
    tableName: 'dictionary_item',
    schema: 'poms',
    comment: '可运营维护的业务配置字典项',
    indexes: [
        { name: 'idx_dictionary_item_domain_status_sort', properties: ['domain', 'status', 'sortOrder'] },
        { name: 'idx_dictionary_item_domain_code', properties: ['domain', 'code'] }
    ],
    uniques: [{ name: 'uq_dictionary_item_domain_code', properties: ['domain', 'code'] }],
    checks: [
        {
            name: 'chk_dictionary_item_domain',
            expression: `"domain" in (${toSqlStringList(DICTIONARY_DOMAINS)})`
        },
        {
            name: 'chk_dictionary_item_status',
            expression: `"status" in (${toSqlStringList(ACTIVE_INACTIVE_STATUSES)})`
        },
        {
            name: 'chk_dictionary_item_code_format',
            expression: `"code" ~ '^[a-z][a-z0-9-]*$'`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('字典项主键'),
        domain: p.string().$type<DictionaryDomain>().length(64).comment('字典域'),
        code: p.string().length(64).comment('稳定业务编码'),
        name: p.string().length(128).comment('展示名称'),
        description: p.text().nullable().comment('说明'),
        status: p.string().$type<DictionaryItemStatus>().length(32).default(ActiveInactiveStatusValue.Active).comment('状态：active/inactive'),
        sortOrder: p.integer().default(100).fieldName('sort_order').comment('排序号'),
        isSystem: p.boolean().default(false).fieldName('is_system').comment('是否系统初始化字典项'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
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

export class DictionaryItem extends DictionaryItemSchema.class {}

DictionaryItemSchema.setClass(DictionaryItem);
