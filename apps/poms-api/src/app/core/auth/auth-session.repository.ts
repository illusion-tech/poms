import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { AuthSession, AuthSessionStatusValue, type AuthSessionRevokedReason } from './auth-session.entity';

export interface TouchLastSeenInput {
    sessionId: string;
    now: Date;
    ip?: string | null;
    idleTimeoutSeconds: number;
    lastSeenThrottleSeconds: number;
}

export interface TouchedAuthSession {
    lastSeenAt: Date;
    lastIp: string | null;
    idleExpiresAt: Date;
    rowVersion: number;
    updatedAt: Date;
}

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

    findActiveByUserId(userId: string): Promise<AuthSession[]> {
        return this.authSessionRepository.find({ userId, status: AuthSessionStatusValue.Active });
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.authSessionRepository.getEntityManager().persist(entities).flush();
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

    async revokeActiveSessionsForUser(userId: string, reason: AuthSessionRevokedReason, now: Date): Promise<number> {
        const sessions = await this.findActiveByUserId(userId);
        sessions.forEach((session) => {
            session.status = AuthSessionStatusValue.Revoked;
            session.revokedAt = now;
            session.revokedReason = reason;
        });

        if (sessions.length > 0) {
            await this.saveAll(sessions);
        }

        return sessions.length;
    }
}
