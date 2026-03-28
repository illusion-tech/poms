import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { AuditLog } from './audit-log.entity';
import { SecurityEvent } from './security-event.entity';

@Injectable()
export class RuntimeAuditRepository {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: EntityRepository<AuditLog>,
        @InjectRepository(SecurityEvent)
        private readonly securityEventRepository: EntityRepository<SecurityEvent>
    ) {}

    createAuditLog(input: ConstructorParameters<typeof AuditLog>[0]): AuditLog {
        return this.auditLogRepository.create(input);
    }

    createSecurityEvent(input: ConstructorParameters<typeof SecurityEvent>[0]): SecurityEvent {
        return this.securityEventRepository.create(input);
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.auditLogRepository.getEntityManager().persist(entities).flush();
    }

    async findRecentAuditLogs(limit = 20): Promise<AuditLog[]> {
        return this.auditLogRepository.findAll({ orderBy: { occurredAt: QueryOrder.DESC }, limit });
    }

    async findRecentSecurityEvents(limit = 20): Promise<SecurityEvent[]> {
        return this.securityEventRepository.findAll({ orderBy: { occurredAt: QueryOrder.DESC }, limit });
    }

    async findAuditLogs(where: FilterQuery<AuditLog>, limit = 50): Promise<AuditLog[]> {
        return this.auditLogRepository.find(where, {
            orderBy: { occurredAt: QueryOrder.DESC },
            limit
        });
    }

    async findSecurityEvents(where: FilterQuery<SecurityEvent>, limit = 50): Promise<SecurityEvent[]> {
        return this.securityEventRepository.find(where, {
            orderBy: { occurredAt: QueryOrder.DESC },
            limit
        });
    }
}
