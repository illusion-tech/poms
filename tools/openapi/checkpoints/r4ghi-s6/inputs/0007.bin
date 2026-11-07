import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { AuthSession, AuthSessionStatusValue, type AuthSessionRevokedReason, type AuthSessionStatus } from './auth-session.entity';

export interface TouchLastSeenInput {
    sessionId: string;
    now: Date;
    ip?: string | null;
    idleTimeoutSeconds: number;
    lastSeenThrottleSeconds: number;
}

export interface RotateCsrfTokenInput {
    sessionId: string;
    csrfTokenHash: string;
    now: Date;
}

export interface ExpireSessionInput {
    sessionId: string;
    now: Date;
}

export interface RevokeSessionInput {
    sessionId: string;
    reason: AuthSessionRevokedReason;
    now: Date;
}

export type RawAuthSessionTimestamp = Date | string;

export interface AuthSessionWriteSnapshot {
    status: AuthSessionStatus;
    csrfTokenHash: string | null;
    idleExpiresAt: RawAuthSessionTimestamp;
    absoluteExpiresAt: RawAuthSessionTimestamp;
    lastSeenAt: RawAuthSessionTimestamp;
    lastIp: string | null;
    revokedAt: RawAuthSessionTimestamp | null;
    revokedReason: AuthSessionRevokedReason | null;
    rowVersion: number;
    updatedAt: RawAuthSessionTimestamp;
}

export type TouchedAuthSession = Pick<AuthSessionWriteSnapshot, 'lastSeenAt' | 'lastIp' | 'idleExpiresAt' | 'rowVersion' | 'updatedAt'>;

const AUTH_SESSION_WRITE_RETURNING_SQL = `
                    "status" as "status",
                    "csrf_token_hash" as "csrfTokenHash",
                    "idle_expires_at" as "idleExpiresAt",
                    "absolute_expires_at" as "absoluteExpiresAt",
                    "last_seen_at" as "lastSeenAt",
                    "last_ip" as "lastIp",
                    "revoked_at" as "revokedAt",
                    "revoked_reason" as "revokedReason",
                    "row_version" as "rowVersion",
                    "updated_at" as "updatedAt"
`;

@Injectable()
export class AuthSessionRepository {
    constructor(
        @InjectRepository(AuthSession)
        private readonly authSessionRepository: EntityRepository<AuthSession>
    ) {}

    createSession(input: ConstructorParameters<typeof AuthSession>[0]): AuthSession {
        return this.authSessionRepository.create(input);
    }

    findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
        return this.authSessionRepository.findOne({ tokenHash });
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.authSessionRepository.getEntityManager().persist(entities).flush();
    }

    async findWriteSnapshotById(id: string): Promise<AuthSessionWriteSnapshot | null> {
        const rows = (await this.authSessionRepository.getEntityManager().getConnection().execute(
            `
                select
${AUTH_SESSION_WRITE_RETURNING_SQL}
                from "poms"."auth_session"
                where "id" = ?;
            `,
            [id]
        )) as AuthSessionWriteSnapshot[];

        return rows[0] ?? null;
    }

    async touchLastSeenIfDue(input: TouchLastSeenInput): Promise<TouchedAuthSession | null> {
        const refreshDueBefore = new Date(input.now.getTime() - input.lastSeenThrottleSeconds * 1000);
        const nextIdleExpiresAt = new Date(input.now.getTime() + input.idleTimeoutSeconds * 1000);
        const rows = (await this.authSessionRepository.getEntityManager().getConnection().execute(
            `
                update "poms"."auth_session"
                set
                    "last_seen_at" = ?,
                    "last_ip" = coalesce(?, "last_ip"),
                    "idle_expires_at" = least(?, "absolute_expires_at"),
                    "row_version" = "row_version" + 1,
                    "updated_at" = ?
                where
                    "id" = ?
                    and "status" = ?
                    and "last_seen_at" <= ?
                    and "idle_expires_at" > ?
                    and "absolute_expires_at" > ?
                returning
                    "last_seen_at" as "lastSeenAt",
                    "last_ip" as "lastIp",
                    "idle_expires_at" as "idleExpiresAt",
                    "row_version" as "rowVersion",
                    "updated_at" as "updatedAt";
            `,
            [
                input.now,
                input.ip ?? null,
                nextIdleExpiresAt,
                input.now,
                input.sessionId,
                AuthSessionStatusValue.Active,
                refreshDueBefore,
                input.now,
                input.now
            ]
        )) as TouchedAuthSession[];

        return rows[0] ?? null;
    }

    async rotateCsrfTokenForActiveSession(input: RotateCsrfTokenInput): Promise<AuthSessionWriteSnapshot | null> {
        const rows = (await this.authSessionRepository.getEntityManager().getConnection().execute(
            `
                update "poms"."auth_session"
                set
                    "csrf_token_hash" = ?,
                    "row_version" = "row_version" + 1,
                    "updated_at" = ?
                where
                    "id" = ?
                    and "status" = ?
                    and "idle_expires_at" > ?
                    and "absolute_expires_at" > ?
                returning
${AUTH_SESSION_WRITE_RETURNING_SQL};
            `,
            [input.csrfTokenHash, input.now, input.sessionId, AuthSessionStatusValue.Active, input.now, input.now]
        )) as AuthSessionWriteSnapshot[];

        return rows[0] ?? null;
    }

    async expireActiveSession(input: ExpireSessionInput): Promise<AuthSessionWriteSnapshot | null> {
        const rows = (await this.authSessionRepository.getEntityManager().getConnection().execute(
            `
                update "poms"."auth_session"
                set
                    "status" = ?,
                    "revoked_at" = ?,
                    "revoked_reason" = null,
                    "row_version" = "row_version" + 1,
                    "updated_at" = ?
                where
                    "id" = ?
                    and "status" = ?
                returning
${AUTH_SESSION_WRITE_RETURNING_SQL};
            `,
            [AuthSessionStatusValue.Expired, input.now, input.now, input.sessionId, AuthSessionStatusValue.Active]
        )) as AuthSessionWriteSnapshot[];

        return rows[0] ?? null;
    }

    async revokeActiveSession(input: RevokeSessionInput): Promise<AuthSessionWriteSnapshot | null> {
        const rows = (await this.authSessionRepository.getEntityManager().getConnection().execute(
            `
                update "poms"."auth_session"
                set
                    "status" = ?,
                    "revoked_at" = ?,
                    "revoked_reason" = ?,
                    "row_version" = "row_version" + 1,
                    "updated_at" = ?
                where
                    "id" = ?
                    and "status" = ?
                returning
${AUTH_SESSION_WRITE_RETURNING_SQL};
            `,
            [AuthSessionStatusValue.Revoked, input.now, input.reason, input.now, input.sessionId, AuthSessionStatusValue.Active]
        )) as AuthSessionWriteSnapshot[];

        return rows[0] ?? null;
    }

    async revokeActiveSessionsForUser(userId: string, reason: AuthSessionRevokedReason, now: Date): Promise<number> {
        const rows = (await this.authSessionRepository.getEntityManager().getConnection().execute(
            `
                update "poms"."auth_session"
                set
                    "status" = ?,
                    "revoked_at" = ?,
                    "revoked_reason" = ?,
                    "row_version" = "row_version" + 1,
                    "updated_at" = ?
                where
                    "user_id" = ?
                    and "status" = ?
                returning
                    "id";
            `,
            [AuthSessionStatusValue.Revoked, now, reason, now, userId, AuthSessionStatusValue.Active]
        )) as Array<{ id: string }>;

        return rows.length;
    }
}
