import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export type AuditSnapshot = Record<string, unknown>;

export const AuditLogSchema = defineEntity({
    name: 'AuditLog',
    tableName: 'audit_log',
    schema: 'poms',
    indexes: [
        { name: 'idx_audit_log_occurred_at', properties: ['occurredAt'] },
        { name: 'idx_audit_log_target', properties: ['targetType', 'targetId', 'occurredAt'] },
        { name: 'idx_audit_log_event_type', properties: ['eventType', 'occurredAt'] },
        { name: 'idx_audit_log_operator_id', properties: ['operatorId', 'occurredAt'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        eventType: p.string().length(128).fieldName('event_type'),
        targetType: p.string().length(64).fieldName('target_type'),
        targetId: p.string().length(128).fieldName('target_id'),
        operatorId: p.uuid().nullable().fieldName('operator_id'),
        requestId: p.string().length(64).nullable().fieldName('request_id'),
        result: p.string().length(32),
        reason: p.text().nullable(),
        beforeSnapshot: p.json<AuditSnapshot>().nullable().fieldName('before_snapshot'),
        afterSnapshot: p.json<AuditSnapshot>().nullable().fieldName('after_snapshot'),
        metadata: p.json<AuditSnapshot>().nullable(),
        occurredAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('occurred_at')
    }
});

export class AuditLog extends AuditLogSchema.class {}

AuditLogSchema.setClass(AuditLog);
