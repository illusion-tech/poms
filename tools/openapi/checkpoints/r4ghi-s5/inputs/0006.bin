import { defineEntity } from '@mikro-orm/core';
import { PlatformUser } from '../../features/platform/platform-user.entity';

const p = defineEntity.properties;

export const AuthSessionStatusValue = {
    Active: 'active',
    Revoked: 'revoked',
    Expired: 'expired'
} as const;

export type AuthSessionStatus = (typeof AuthSessionStatusValue)[keyof typeof AuthSessionStatusValue];

export const AuthSessionRevokedReasonValue = {
    Logout: 'logout',
    AdminRevoked: 'admin-revoked',
    PasswordReset: 'password-reset',
    AccountDisabled: 'account-disabled',
    SessionRotated: 'session-rotated'
} as const;

export type AuthSessionRevokedReason = (typeof AuthSessionRevokedReasonValue)[keyof typeof AuthSessionRevokedReasonValue];

export const AuthSessionSchema = defineEntity({
    name: 'AuthSession',
    tableName: 'auth_session',
    schema: 'poms',
    comment: 'Admin Web 服务端 opaque 认证会话',
    indexes: [
        { name: 'idx_auth_session_token_hash', properties: ['tokenHash'] },
        { name: 'idx_auth_session_user_status', properties: ['userId', 'status'] },
        { name: 'idx_auth_session_status_idle_expires', properties: ['status', 'idleExpiresAt'] },
        { name: 'idx_auth_session_status_absolute_expires', properties: ['status', 'absoluteExpiresAt'] }
    ],
    checks: [
        {
            name: 'chk_auth_session_status',
            expression: `"status" in ('active', 'revoked', 'expired')`
        },
        {
            name: 'chk_auth_session_revoked_reason',
            expression: `("revoked_reason" is null or ("revoked_reason")::text = any ((array['logout'::character varying, 'admin-revoked'::character varying, 'password-reset'::character varying, 'account-disabled'::character varying, 'session-rotated'::character varying])::text[]))`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('认证会话主键'),
        tokenHash: p.string().length(128).unique().fieldName('token_hash').comment('opaque session token SHA-256 摘要'),
        csrfTokenHash: p.string().length(128).nullable().fieldName('csrf_token_hash').comment('当前 CSRF token SHA-256 摘要'),
        userId: () => p.manyToOne(PlatformUser).mapToPk().fieldName('user_id').foreignKeyName('auth_session_user_id_foreign').updateRule('cascade').deleteRule('cascade').comment('绑定的 POMS 用户标识'),
        status: p.string().$type<AuthSessionStatus>().length(32).default(AuthSessionStatusValue.Active).comment('会话状态'),
        idleExpiresAt: p.datetime().fieldName('idle_expires_at').comment('空闲超时时间'),
        absoluteExpiresAt: p.datetime().fieldName('absolute_expires_at').comment('绝对超时时间'),
        lastSeenAt: p.datetime().fieldName('last_seen_at').comment('最近一次成功认证时间'),
        revokedAt: p.datetime().nullable().fieldName('revoked_at').comment('撤销时间'),
        revokedReason: p.string().$type<AuthSessionRevokedReason>().length(64).nullable().fieldName('revoked_reason').comment('撤销原因'),
        createdIp: p.string().length(128).nullable().fieldName('created_ip').comment('创建会话时的请求 IP'),
        lastIp: p.string().length(128).nullable().fieldName('last_ip').comment('最近一次成功认证 IP'),
        createdUserAgent: p.string().length(512).nullable().fieldName('created_user_agent').comment('创建会话时的 User-Agent'),
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

export class AuthSession extends AuthSessionSchema.class {}

AuthSessionSchema.setClass(AuthSession);
