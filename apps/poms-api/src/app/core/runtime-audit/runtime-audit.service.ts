import { Injectable } from '@nestjs/common';
import type { AuditSnapshot } from './audit-log.entity';
import { RuntimeAuditRepository } from './runtime-audit.repository';
import type { SecurityEventDetails } from './security-event.entity';

export type RecordAuditLogInput = {
    eventType: string;
    targetType: string;
    targetId: string;
    operatorId?: string | null;
    requestId?: string | null;
    result: 'success' | 'rejected' | 'failed';
    reason?: string | null;
    beforeSnapshot?: AuditSnapshot | null;
    afterSnapshot?: AuditSnapshot | null;
    metadata?: AuditSnapshot | null;
    occurredAt?: Date;
};

export type RecordSecurityEventInput = {
    eventType: string;
    severity: 'info' | 'warning' | 'high';
    actorId?: string | null;
    principal?: string | null;
    requestId?: string | null;
    path: string;
    method?: string | null;
    permissionKey?: string | null;
    result: 'blocked' | 'failed' | 'expired';
    ip?: string | null;
    userAgent?: string | null;
    details?: SecurityEventDetails | null;
    occurredAt?: Date;
};

@Injectable()
export class RuntimeAuditService {
    constructor(private readonly runtimeAuditRepository: RuntimeAuditRepository) {}

    async recordAuditLog(input: RecordAuditLogInput): Promise<void> {
        const entity = this.runtimeAuditRepository.createAuditLog({
            eventType: input.eventType,
            targetType: input.targetType,
            targetId: input.targetId,
            operatorId: input.operatorId ?? null,
            requestId: input.requestId ?? null,
            result: input.result,
            reason: input.reason ?? null,
            beforeSnapshot: input.beforeSnapshot ?? null,
            afterSnapshot: input.afterSnapshot ?? null,
            metadata: input.metadata ?? null,
            occurredAt: input.occurredAt ?? new Date()
        });

        await this.runtimeAuditRepository.saveAll([entity]);
    }

    async recordSecurityEvent(input: RecordSecurityEventInput): Promise<void> {
        const entity = this.runtimeAuditRepository.createSecurityEvent({
            eventType: input.eventType,
            severity: input.severity,
            actorId: input.actorId ?? null,
            principal: input.principal ?? null,
            requestId: input.requestId ?? null,
            path: input.path,
            method: input.method ?? null,
            permissionKey: input.permissionKey ?? null,
            result: input.result,
            ip: input.ip ?? null,
            userAgent: input.userAgent ?? null,
            details: input.details ?? null,
            occurredAt: input.occurredAt ?? new Date()
        });

        await this.runtimeAuditRepository.saveAll([entity]);
    }
}
