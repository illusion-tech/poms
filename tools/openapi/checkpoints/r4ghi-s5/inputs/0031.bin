import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export type SecurityEventDetails = Record<string, unknown>;

export const SecurityEventSchema = defineEntity({
    name: 'SecurityEvent',
    tableName: 'security_event',
    schema: 'poms',
    indexes: [
        { name: 'idx_security_event_occurred_at', properties: ['occurredAt'] },
        { name: 'idx_security_event_event_type', properties: ['eventType', 'occurredAt'] },
        { name: 'idx_security_event_actor_id', properties: ['actorId', 'occurredAt'] },
        { name: 'idx_security_event_path', properties: ['path', 'occurredAt'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        eventType: p.string().length(128).fieldName('event_type'),
        severity: p.string().length(16),
        actorId: p.uuid().nullable().fieldName('actor_id'),
        principal: p.string().length(255).nullable(),
        requestId: p.string().length(64).nullable().fieldName('request_id'),
        path: p.string().length(255),
        method: p.string().length(16).nullable(),
        permissionKey: p.string().length(128).nullable().fieldName('permission_key'),
        result: p.string().length(32),
        ip: p.string().length(64).nullable(),
        userAgent: p.string().length(512).nullable().fieldName('user_agent'),
        details: p.json<SecurityEventDetails>().nullable(),
        occurredAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('occurred_at')
    }
});

export class SecurityEvent extends SecurityEventSchema.class {}

SecurityEventSchema.setClass(SecurityEvent);
