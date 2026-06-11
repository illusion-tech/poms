import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { UserPayload } from '@poms/shared-contracts';
import { loadValidatedEnv } from '../../../config/load-env';
import { PlatformService } from '../../features/platform/platform.service';
import { AuthSession, AuthSessionRevokedReasonValue, AuthSessionStatusValue, type AuthSessionRevokedReason } from './auth-session.entity';
import { AuthSessionRepository, type AuthSessionWriteSnapshot, type RawAuthSessionTimestamp } from './auth-session.repository';

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

export type CreatedCsrfToken = {
    session: AuthSession | null;
    user: UserPayload | null;
    csrfToken: string;
    expiresAt: Date;
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

        return this.#revokeSession(session, reason, options.now ?? new Date());
    }

    revokeActiveUserSessions(userId: string, reason: AuthSessionRevokedReason, options: AuthSessionLifecycleOptions = {}): Promise<number> {
        return this.authSessionRepository.revokeActiveSessionsForUser(userId, reason, options.now ?? new Date());
    }

    async refreshCsrfToken(sessionToken: string | null, requestInfo: AuthSessionRequestInfo = {}, options: AuthSessionLifecycleOptions = {}): Promise<CreatedCsrfToken> {
        if (!sessionToken) {
            return this.createAnonymousCsrfToken(options);
        }

        const now = options.now ?? new Date();
        const resolved = await this.resolveSessionToken(sessionToken, requestInfo, { ...options, now });
        const csrfToken = createOpaqueToken();
        const rotatedSession = await this.authSessionRepository.rotateCsrfTokenForActiveSession({
            sessionId: resolved.session.id,
            csrfTokenHash: hashToken(csrfToken),
            now
        });
        if (!rotatedSession) {
            await this.#throwCurrentSessionAuthenticationError(resolved.session.id, now);
        } else {
            applySessionWriteSnapshot(resolved.session, rotatedSession);
        }

        return {
            session: resolved.session,
            user: resolved.user,
            csrfToken,
            expiresAt: minDate(resolved.session.idleExpiresAt, resolved.session.absoluteExpiresAt)
        };
    }

    createAnonymousCsrfToken(options: AuthSessionLifecycleOptions = {}): CreatedCsrfToken {
        const now = options.now ?? new Date();
        const lifecycle = this.#getLifecycleOptions(options);
        return {
            session: null,
            user: null,
            csrfToken: createOpaqueToken(),
            expiresAt: addSeconds(now, lifecycle.idleTimeoutSeconds)
        };
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
        const elapsedSeconds = Math.floor((now.getTime() - toDate(session.lastSeenAt).getTime()) / 1000);
        if (elapsedSeconds < lifecycle.lastSeenThrottleSeconds) {
            return;
        }

        const touchedSession = await this.authSessionRepository.touchLastSeenIfDue({
            sessionId: session.id,
            now,
            ip: requestInfo.ip,
            idleTimeoutSeconds: lifecycle.idleTimeoutSeconds,
            lastSeenThrottleSeconds: lifecycle.lastSeenThrottleSeconds
        });

        if (!touchedSession) {
            return;
        }

        session.lastSeenAt = toDate(touchedSession.lastSeenAt);
        session.lastIp = touchedSession.lastIp;
        session.idleExpiresAt = toDate(touchedSession.idleExpiresAt);
        session.rowVersion = touchedSession.rowVersion;
        session.updatedAt = toDate(touchedSession.updatedAt);
    }

    async #markExpired(session: AuthSession, now: Date): Promise<void> {
        if (session.status === AuthSessionStatusValue.Expired) {
            return;
        }

        const expiredSession = await this.authSessionRepository.expireActiveSession({ sessionId: session.id, now });
        if (expiredSession) {
            applySessionWriteSnapshot(session, expiredSession);
        }
    }

    async #revokeSession(session: AuthSession, reason: AuthSessionRevokedReason, now: Date): Promise<boolean> {
        const revokedSession = await this.authSessionRepository.revokeActiveSession({ sessionId: session.id, reason, now });
        if (!revokedSession) {
            return false;
        }

        applySessionWriteSnapshot(session, revokedSession);
        return true;
    }

    async #throwCurrentSessionAuthenticationError(sessionId: string, now: Date): Promise<never> {
        const currentSession = await this.authSessionRepository.findWriteSnapshotById(sessionId);
        if (!currentSession) {
            throw new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.SessionMissing);
        }

        if (currentSession.status === AuthSessionStatusValue.Revoked) {
            throw new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.SessionRevoked);
        }

        if (currentSession.status === AuthSessionStatusValue.Expired || isExpired(currentSession, now)) {
            throw new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.SessionExpired);
        }

        throw new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.SessionRevoked);
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

function minDate(left: RawAuthSessionTimestamp, right: RawAuthSessionTimestamp): Date {
    const leftDate = toDate(left);
    const rightDate = toDate(right);
    return leftDate.getTime() <= rightDate.getTime() ? leftDate : rightDate;
}

function applySessionWriteSnapshot(session: AuthSession, snapshot: AuthSessionWriteSnapshot): void {
    session.status = snapshot.status;
    session.csrfTokenHash = snapshot.csrfTokenHash;
    session.idleExpiresAt = toDate(snapshot.idleExpiresAt);
    session.absoluteExpiresAt = toDate(snapshot.absoluteExpiresAt);
    session.lastSeenAt = toDate(snapshot.lastSeenAt);
    session.lastIp = snapshot.lastIp;
    session.revokedAt = snapshot.revokedAt === null ? null : toDate(snapshot.revokedAt);
    session.revokedReason = snapshot.revokedReason;
    session.rowVersion = snapshot.rowVersion;
    session.updatedAt = toDate(snapshot.updatedAt);
}

function isExpired(session: { idleExpiresAt: RawAuthSessionTimestamp; absoluteExpiresAt: RawAuthSessionTimestamp }, now: Date): boolean {
    return toDate(session.idleExpiresAt).getTime() <= now.getTime() || toDate(session.absoluteExpiresAt).getTime() <= now.getTime();
}

function toDate(value: RawAuthSessionTimestamp): Date {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid auth session timestamp');
    }
    return date;
}
