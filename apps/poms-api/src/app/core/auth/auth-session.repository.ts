import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { AuthSession, AuthSessionStatusValue, type AuthSessionRevokedReason } from './auth-session.entity';

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
