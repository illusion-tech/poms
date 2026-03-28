import { Injectable } from '@nestjs/common';
import type { AuditLogListQuery, AuditLogSummary, SecurityEventListQuery, SecurityEventSummary } from '@poms/shared-contracts';
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

    async listAuditLogs(query: AuditLogListQuery): Promise<AuditLogSummary[]> {
        const occurredAt = this.#createOccurredAtFilter(query.from, query.to);
        const entities = await this.runtimeAuditRepository.findAuditLogs(
            {
                ...(query.eventType ? { eventType: query.eventType } : {}),
                ...(query.targetType ? { targetType: query.targetType } : {}),
                ...(query.targetId ? { targetId: query.targetId } : {}),
                ...(query.operatorId ? { operatorId: query.operatorId } : {}),
                ...(query.result ? { result: query.result } : {}),
                ...(occurredAt ? { occurredAt } : {})
            },
            query.limit ?? 50
        );

        return entities.map((entity) => ({
            id: entity.id,
            eventType: entity.eventType,
            targetType: entity.targetType,
            targetId: entity.targetId,
            operatorId: entity.operatorId ?? null,
            requestId: entity.requestId ?? null,
            result: entity.result as AuditLogSummary['result'],
            reason: entity.reason ?? null,
            beforeSnapshot: entity.beforeSnapshot ?? null,
            afterSnapshot: entity.afterSnapshot ?? null,
            metadata: entity.metadata ?? null,
            occurredAt: entity.occurredAt.toISOString()
        }));
    }

    async listSecurityEvents(query: SecurityEventListQuery): Promise<SecurityEventSummary[]> {
        const occurredAt = this.#createOccurredAtFilter(query.from, query.to);
        const entities = await this.runtimeAuditRepository.findSecurityEvents(
            {
                ...(query.eventType ? { eventType: query.eventType } : {}),
                ...(query.actorId ? { actorId: query.actorId } : {}),
                ...(query.principal ? { principal: query.principal } : {}),
                ...(query.path ? { path: query.path } : {}),
                ...(query.permissionKey ? { permissionKey: query.permissionKey } : {}),
                ...(query.result ? { result: query.result } : {}),
                ...(occurredAt ? { occurredAt } : {})
            },
            query.limit ?? 50
        );

        return entities.map((entity) => ({
            id: entity.id,
            eventType: entity.eventType,
            severity: entity.severity as SecurityEventSummary['severity'],
            actorId: entity.actorId ?? null,
            principal: entity.principal ?? null,
            requestId: entity.requestId ?? null,
            path: entity.path,
            method: entity.method ?? null,
            permissionKey: entity.permissionKey ?? null,
            result: entity.result as SecurityEventSummary['result'],
            ip: entity.ip ?? null,
            userAgent: entity.userAgent ?? null,
            details: entity.details ?? null,
            occurredAt: entity.occurredAt.toISOString()
        }));
    }

    #createOccurredAtFilter(from?: string, to?: string): { $gte?: Date; $lte?: Date } | null {
        const filter: { $gte?: Date; $lte?: Date } = {};
        if (from) {
            filter.$gte = new Date(from);
        }
        if (to) {
            filter.$lte = new Date(to);
        }
        return Object.keys(filter).length > 0 ? filter : null;
    }
}
