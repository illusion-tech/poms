import { defineEntity } from '@mikro-orm/core';
import type { SystemSettingKey, SystemSettingValueType } from '@poms/shared-contracts';

const p = defineEntity.properties;

export type SystemSettingValueJson = number | string | boolean | Record<string, unknown> | null;

export const SystemSettingSchema = defineEntity({
    name: 'SystemSetting',
    tableName: 'system_setting',
    schema: 'poms',
    comment: '平台通用系统设置',
    checks: [{ name: 'chk_system_setting_value_type', expression: `"value_type" in ('integer')` }],
    properties: {
        key: p.string().$type<SystemSettingKey>().length(128).primary().comment('系统设置 key'),
        valueType: p.string().$type<SystemSettingValueType>().length(32).fieldName('value_type').comment('设置值类型'),
        valueJson: p.json<SystemSettingValueJson>().fieldName('value_json').comment('设置值 JSON 表示'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人')
    }
});

export class SystemSetting extends SystemSettingSchema.class {}

SystemSettingSchema.setClass(SystemSetting);
