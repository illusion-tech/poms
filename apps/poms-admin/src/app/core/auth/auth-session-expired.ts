import { HttpErrorResponse } from '@angular/common/http';

export const AUTH_SESSION_EXPIRED_REASON_VALUES = ['session_missing', 'session_expired', 'session_revoked', 'account_disabled'] as const;

export type AuthSessionExpiredReason = (typeof AUTH_SESSION_EXPIRED_REASON_VALUES)[number];

const AUTH_SESSION_EXPIRED_REASONS = new Set<string>(AUTH_SESSION_EXPIRED_REASON_VALUES);

const AUTH_SESSION_EXPIRED_MESSAGES: Record<AuthSessionExpiredReason, string> = {
    session_missing: '请先登录后继续。',
    session_expired: '登录已过期，请重新登录后继续。',
    session_revoked: '当前登录已退出，请重新登录后继续。',
    account_disabled: '当前账号已被停用，请联系管理员。'
};

export function readAuthErrorCode(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse)) return null;
    const body = error.error as { code?: unknown } | null;
    return typeof body?.code === 'string' ? body.code : null;
}

export function readAuthSessionExpiredReason(error: unknown): AuthSessionExpiredReason | null {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return null;
    const code = readAuthErrorCode(error);
    return code !== null && AUTH_SESSION_EXPIRED_REASONS.has(code) ? (code as AuthSessionExpiredReason) : null;
}

export function isAuthSessionExpiredError(error: unknown): boolean {
    return readAuthSessionExpiredReason(error) !== null;
}

export function resolveAuthSessionNotice(reason: unknown): string | null {
    if (typeof reason !== 'string' || !AUTH_SESSION_EXPIRED_REASONS.has(reason)) return null;
    return AUTH_SESSION_EXPIRED_MESSAGES[reason as AuthSessionExpiredReason];
}
