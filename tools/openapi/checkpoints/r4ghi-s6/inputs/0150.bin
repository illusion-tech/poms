import { defineEntity } from '@mikro-orm/core';
import { IDENTITY_PROVIDERS, IdentityProviderValue, type IdentityProvider } from '@poms/shared-contracts';
import { PlatformUser } from '../platform/platform-user.entity';
import { ExternalIdentity } from './external-identity.entity';
import { IdentityProviderConfig } from './identity-provider-config.entity';

const p = defineEntity.properties;
const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const ExternalLoginTicketStatusValue = {
    Issued: 'issued',
    Consumed: 'consumed',
    Expired: 'expired'
} as const;

export type ExternalLoginTicketStatus = (typeof ExternalLoginTicketStatusValue)[keyof typeof ExternalLoginTicketStatusValue];

export const ExternalLoginTicketSchema = defineEntity({
    name: 'ExternalLoginTicket',
    tableName: 'external_login_ticket',
    schema: 'poms',
    comment: '外部登录 callback 后用于交换 POMS JWT 的短时一次性票据',
    indexes: [
        { name: 'idx_external_login_ticket_hash', properties: ['ticketHash'] },
        { name: 'idx_external_login_ticket_user_status', properties: ['pomsUserId', 'status'] }
    ],
    checks: [
        {
            name: 'chk_external_login_ticket_provider',
            expression: `"provider" in (${toSqlStringList(IDENTITY_PROVIDERS)})`
        },
        {
            name: 'chk_external_login_ticket_status',
            expression: `"status" in ('issued', 'consumed', 'expired')`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('外部登录票据主键'),
        ticketHash: p.string().length(128).unique().fieldName('ticket_hash').comment('一次性票据 SHA-256 摘要'),
        identityProviderConfigId: () =>
            p.manyToOne(IdentityProviderConfig).mapToPk().fieldName('identity_provider_config_id').foreignKeyName('external_login_ticket_provider_config_id_foreign').updateRule('cascade').deleteRule('restrict').comment('外部身份提供商配置标识'),
        externalIdentityId: () =>
            p.manyToOne(ExternalIdentity).mapToPk().fieldName('external_identity_id').foreignKeyName('external_login_ticket_external_identity_id_foreign').updateRule('cascade').deleteRule('restrict').comment('匹配到的外部身份绑定标识'),
        pomsUserId: () => p.manyToOne(PlatformUser).mapToPk().fieldName('poms_user_id').foreignKeyName('external_login_ticket_poms_user_id_foreign').updateRule('cascade').deleteRule('restrict').comment('即将登录的 POMS 用户标识'),
        provider: p.string().$type<IdentityProvider>().length(32).default(IdentityProviderValue.Feishu).comment('外部身份提供商代码'),
        tenantId: p.string().length(128).nullable().fieldName('tenant_id').comment('外部租户标识'),
        subjectId: p.string().length(255).fieldName('subject_id').comment('外部用户主体标识'),
        status: p.string().$type<ExternalLoginTicketStatus>().length(32).default(ExternalLoginTicketStatusValue.Issued).comment('票据状态'),
        expiresAt: p.datetime().fieldName('expires_at').comment('票据过期时间'),
        consumedAt: p.datetime().nullable().fieldName('consumed_at').comment('票据消费时间'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间')
    }
});

export class ExternalLoginTicket extends ExternalLoginTicketSchema.class {}

ExternalLoginTicketSchema.setClass(ExternalLoginTicket);
