import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { UserPayload } from '@poms/shared-contracts';
import { loadValidatedEnv } from '../../../config/load-env';
import { PlatformService } from '../../features/platform/platform.service';
import { AuthSession, AuthSessionRevokedReasonValue, AuthSessionStatusValue, type AuthSessionRevokedReason } from './auth-session.entity';
import { AuthSessionRepository } from './auth-session.repository';

export type AuthSessionRequestInfo = {
    ip?: string | null;
    userAgent?: string | null;
};

export type AuthSessionLifecycleOptions = {
    idleTimeoutSeconds?: number;
    absoluteTimeoutSeconds?: number;
    lastSeenThrottleSeconds?: number;
    now?: Date;
};

export type CreatedAuthSession = {
    session: AuthSession;
    sessionToken: string;
    csrfToken: string;
};

export type ResolvedAuthSession = {
    session: AuthSession;
    user: UserPayload;
};

export const AuthSessionErrorCodeValue = {
    SessionMissing: 'session_missing',
    SessionExpired: 'session_expired',
    SessionRevoked: 'session_revoked',
    AccountDisabled: 'account_disabled'
} as const;

export type AuthSessionErrorCode = (typeof AuthSessionErrorCodeValue)[keyof typeof AuthSessionErrorCodeValue];

export class AuthSessionAuthenticationError extends Error {
    constructor(readonly code: AuthSessionErrorCode) {
        super(code);
        this.name = 'AuthSessionAuthenticationError';
    }
}

@Injectable()
export class AuthSessionService {
    constructor(
        private readonly authSessionRepository: AuthSessionRepository,
        private readonly platformService: PlatformService
    ) {}

    async createSession(userId: string, requestInfo: AuthSessionRequestInfo = {}, options: AuthSessionLifecycleOptions = {}): Promise<CreatedAuthSession> {
        const now = options.now ?? new Date();
        const lifecycle = this.#getLifecycleOptions(options);
        const sessionToken = createOpaqueToken();
        const csrfToken = createOpaqueToken();
        const absoluteExpiresAt = addSeconds(now, lifecycle.absoluteTimeoutSeconds);
        const idleExpiresAt = minDate(addSeconds(now, lifecycle.idleTimeoutSeconds), absoluteExpiresAt);
        const session = this.authSessionRepository.createSession({
            tokenHash: hashToken(sessionToken),
            csrfTokenHash: hashToken(csrfToken),
            userId,
            status: AuthSessionStatusValue.Active,
            idleExpiresAt,
            absoluteExpiresAt,
            lastSeenAt: now,
            revokedAt: null,
            revokedReason: null,
            createdIp: requestInfo.ip ?? null,
            lastIp: requestInfo.ip ?? null,
            createdUserAgent: requestInfo.userAgent ?? null
        });

        await this.authSessionRepository.saveAll([session]);
        return { session, sessionToken, csrfToken };
    }

    async resolveSessionToken(sessionToken: string, requestInfo: AuthSessionRequestInfo = {}, options: AuthSessionLifecycleOptions = {}): Promise<ResolvedAuthSession> {
        const now = options.now ?? new Date();
        const session = await this.authSessionRepository.findByTokenHash(hashToken(sessionToken));
        if (!session) {
            throw new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.SessionMissing);
        }

        if (session.status === AuthSessionStatusValue.Revoked) {
            throw new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.SessionRevoked);
        }

        if (session.status === AuthSessionStatusValue.Expired || isExpired(session, now)) {
            await this.#markExpired(session, now);
            throw new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.SessionExpired);
        }

        const platformUser = await this.platformService.resolveActiveAuthUser(session.userId);
        if (!platformUser) {
            await this.#revokeSession(session, AuthSessionRevokedReasonValue.AccountDisabled, now);
            throw new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.AccountDisabled);
        }

        await this.#touchSession(session, requestInfo, options, now);
        return {
            session,
            user: {
                sub: platformUser.userId,
                username: platformUser.username,
                permissions: platformUser.permissions
            }
        };
    }

    async revokeSessionToken(sessionToken: string, reason: AuthSessionRevokedReason = AuthSessionRevokedReasonValue.Logout, options: AuthSessionLifecycleOptions = {}): Promise<boolean> {
        const session = await this.authSessionRepository.findByTokenHash(hashToken(sessionToken));
        if (!session || session.status !== AuthSessionStatusValue.Active) {
            return false;
        }

        await this.#revokeSession(session, reason, options.now ?? new Date());
        return true;
    }

    revokeActiveUserSessions(userId: string, reason: AuthSessionRevokedReason, options: AuthSessionLifecycleOptions = {}): Promise<number> {
        return this.authSessionRepository.revokeActiveSessionsForUser(userId, reason, options.now ?? new Date());
    }

    verifyCsrfToken(session: AuthSession, csrfToken: string): boolean {
        return session.csrfTokenHash !== null && session.csrfTokenHash === hashToken(csrfToken);
    }

    #getLifecycleOptions(options: AuthSessionLifecycleOptions): Required<Omit<AuthSessionLifecycleOptions, 'now'>> {
        const env = loadValidatedEnv();
        return {
            idleTimeoutSeconds: options.idleTimeoutSeconds ?? env.AUTH_SESSION_IDLE_TIMEOUT_SECONDS,
            absoluteTimeoutSeconds: options.absoluteTimeoutSeconds ?? env.AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS,
            lastSeenThrottleSeconds: options.lastSeenThrottleSeconds ?? env.AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS
        };
    }

    async #touchSession(session: AuthSession, requestInfo: AuthSessionRequestInfo, options: AuthSessionLifecycleOptions, now: Date): Promise<void> {
        const lifecycle = this.#getLifecycleOptions(options);
        const elapsedSeconds = Math.floor((now.getTime() - session.lastSeenAt.getTime()) / 1000);
        if (elapsedSeconds < lifecycle.lastSeenThrottleSeconds) {
            return;
        }

        session.lastSeenAt = now;
        session.lastIp = requestInfo.ip ?? session.lastIp;
        session.idleExpiresAt = minDate(addSeconds(now, lifecycle.idleTimeoutSeconds), session.absoluteExpiresAt);
        await this.authSessionRepository.saveAll([session]);
    }

    async #markExpired(session: AuthSession, now: Date): Promise<void> {
        if (session.status === AuthSessionStatusValue.Expired) {
            return;
        }

        session.status = AuthSessionStatusValue.Expired;
        session.revokedAt = now;
        await this.authSessionRepository.saveAll([session]);
    }

    async #revokeSession(session: AuthSession, reason: AuthSessionRevokedReason, now: Date): Promise<void> {
        session.status = AuthSessionStatusValue.Revoked;
        session.revokedAt = now;
        session.revokedReason = reason;
        await this.authSessionRepository.saveAll([session]);
    }
}

export function createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

function addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
}

function minDate(left: Date, right: Date): Date {
    return left.getTime() <= right.getTime() ? left : right;
}

function isExpired(session: AuthSession, now: Date): boolean {
    return session.idleExpiresAt.getTime() <= now.getTime() || session.absoluteExpiresAt.getTime() <= now.getTime();
}
