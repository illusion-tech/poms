import { defineEntity } from '@mikro-orm/core';
import { CUSTOMER_ALIAS_TYPES, CUSTOMER_STATUSES, CustomerAliasTypeValue, CustomerStatusValue, type CustomerAliasType, type CustomerStatus } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const CustomerSchema = defineEntity({
    name: 'Customer',
    tableName: 'customer',
    schema: 'poms',
    comment: '客户主数据表',
    indexes: [
        { name: 'idx_customer_status', properties: ['status'] },
        { name: 'idx_customer_owner_org_id', properties: ['ownerOrgId'] },
        { name: 'idx_customer_owner_user_id', properties: ['ownerUserId'] },
        { name: 'idx_customer_merged_into_customer_id', properties: ['mergedIntoCustomerId'] }
    ],
    checks: [
        {
            name: 'chk_customer_status',
            expression: `"status" in (${toSqlStringList(CUSTOMER_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('客户主键'),
        customerNo: p.string().length(64).unique().fieldName('customer_no').comment('客户编号'),
        displayName: p.string().length(255).fieldName('display_name').comment('客户显示名称'),
        legalName: p.string().length(255).nullable().fieldName('legal_name').comment('客户法定名称'),
        shortName: p.string().length(128).nullable().fieldName('short_name').comment('客户简称'),
        status: p.string().$type<CustomerStatus>().length(32).default(CustomerStatusValue.Active).comment('客户状态'),
        ownerOrgId: () =>
            p
                .manyToOne(OrgUnit)
                .mapToPk()
                .nullable()
                .fieldName('owner_org_id')
                .foreignKeyName('customer_owner_org_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('客户主责组织标识'),
        ownerUserId: () =>
            p
                .manyToOne(PlatformUser)
                .mapToPk()
                .nullable()
                .fieldName('owner_user_id')
                .foreignKeyName('customer_owner_user_id_foreign')
                .updateRule('cascade')
                .deleteRule('set null')
                .comment('客户主责人标识'),
        sourceChannel: p.string().length(64).nullable().fieldName('source_channel').comment('客户来源渠道'),
        remark: p.text().nullable().comment('客户备注'),
        mergedIntoCustomerId: () =>
            p
                .manyToOne(Customer)
                .mapToPk()
                .nullable()
                .fieldName('merged_into_customer_id')
                .foreignKeyName('customer_merged_into_customer_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('合并后客户标识'),
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

export class Customer extends CustomerSchema.class {}

CustomerSchema.setClass(Customer);

export const CustomerAliasSchema = defineEntity({
    name: 'CustomerAlias',
    tableName: 'customer_alias',
    schema: 'poms',
    comment: '客户别名表',
    indexes: [
        { name: 'idx_customer_alias_customer_id', properties: ['customerId'] },
        { name: 'idx_customer_alias_normalized_name', properties: ['normalizedName'] },
        {
            name: 'uq_customer_alias_primary',
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.customerId}") where "${columns.isPrimary}" = true`
        }
    ],
    uniques: [{ name: 'uq_customer_alias_customer_normalized_type', properties: ['customerId', 'normalizedName', 'aliasType'] }],
    checks: [
        {
            name: 'chk_customer_alias_type',
            expression: `"alias_type" in (${toSqlStringList(CUSTOMER_ALIAS_TYPES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('客户别名主键'),
        customerId: () =>
            p
                .manyToOne(Customer)
                .mapToPk()
                .fieldName('customer_id')
                .foreignKeyName('customer_alias_customer_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('客户主数据标识'),
        aliasName: p.string().length(255).fieldName('alias_name').comment('客户别名'),
        aliasType: p.string().$type<CustomerAliasType>().length(32).default(CustomerAliasTypeValue.Alias).fieldName('alias_type').comment('别名类型'),
        normalizedName: p.string().length(255).fieldName('normalized_name').comment('规范化别名'),
        isPrimary: p.boolean().default(false).fieldName('is_primary').comment('是否主别名'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识')
    }
});

export class CustomerAlias extends CustomerAliasSchema.class {}

CustomerAliasSchema.setClass(CustomerAlias);
