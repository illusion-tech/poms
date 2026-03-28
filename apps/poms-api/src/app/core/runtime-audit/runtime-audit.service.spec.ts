import { RuntimeAuditService } from './runtime-audit.service';

describe('RuntimeAuditService', () => {
    let service: RuntimeAuditService;
    let repository: {
        createAuditLog: jest.Mock;
        createSecurityEvent: jest.Mock;
        saveAll: jest.Mock;
        findAuditLogs: jest.Mock;
        findSecurityEvents: jest.Mock;
    };

    beforeEach(() => {
        repository = {
            createAuditLog: jest.fn((input) => ({ id: 'audit-log-id', ...input })),
            createSecurityEvent: jest.fn((input) => ({ id: 'security-event-id', ...input })),
            saveAll: jest.fn().mockResolvedValue(undefined),
            findAuditLogs: jest.fn(),
            findSecurityEvents: jest.fn()
        };

        service = new RuntimeAuditService(repository as never);
    });

    it('persists normalized audit log payloads', async () => {
        await service.recordAuditLog({
            eventType: 'platform.user.deactivated',
            targetType: 'PlatformUser',
            targetId: '00000000-0000-4000-8000-000000000001',
            result: 'success',
            metadata: { source: 'platform.service' }
        });

        expect(repository.createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'platform.user.deactivated',
                targetType: 'PlatformUser',
                targetId: '00000000-0000-4000-8000-000000000001',
                operatorId: null,
                requestId: null,
                reason: null,
                metadata: { source: 'platform.service' }
            })
        );
        expect(repository.saveAll).toHaveBeenCalledWith([expect.objectContaining({ id: 'audit-log-id' })]);
    });

    it('persists normalized security event payloads', async () => {
        await service.recordSecurityEvent({
            eventType: 'authz.permission.denied',
            severity: 'warning',
            path: '/platform/users',
            result: 'blocked'
        });

        expect(repository.createSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'authz.permission.denied',
                severity: 'warning',
                path: '/platform/users',
                result: 'blocked',
                actorId: null,
                permissionKey: null
            })
        );
        expect(repository.saveAll).toHaveBeenCalledWith([expect.objectContaining({ id: 'security-event-id' })]);
    });

    it('maps audit log entities for read-side queries', async () => {
        repository.findAuditLogs.mockResolvedValue([
            {
                id: '0f6dceee-8176-4f12-b8ae-bca9231ca2db',
                eventType: 'platform.user.created',
                targetType: 'PlatformUser',
                targetId: '00000000-0000-4000-8000-000000000001',
                operatorId: '00000000-0000-4000-8000-000000000010',
                requestId: 'req-audit-1',
                result: 'success',
                reason: null,
                beforeSnapshot: null,
                afterSnapshot: { username: 'admin' },
                metadata: null,
                occurredAt: new Date('2026-03-28T08:00:00.000Z')
            }
        ]);

        const result = await service.listAuditLogs({ eventType: 'platform.user.created', limit: 1 });

        expect(repository.findAuditLogs).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'platform.user.created' }),
            1
        );
        expect(result).toEqual([
            expect.objectContaining({
                eventType: 'platform.user.created',
                occurredAt: '2026-03-28T08:00:00.000Z'
            })
        ]);
    });

    it('maps security event entities for read-side queries', async () => {
        repository.findSecurityEvents.mockResolvedValue([
            {
                id: 'c145eb92-7e1a-46cd-8ef9-52134526056a',
                eventType: 'auth.login.failed',
                severity: 'warning',
                actorId: null,
                principal: 'admin',
                requestId: 'req-security-1',
                path: '/auth/login',
                method: 'POST',
                permissionKey: null,
                result: 'failed',
                ip: '127.0.0.1',
                userAgent: 'jest',
                details: { reason: 'invalid_credentials' },
                occurredAt: new Date('2026-03-28T08:00:00.000Z')
            }
        ]);

        const result = await service.listSecurityEvents({ eventType: 'auth.login.failed', limit: 1 });

        expect(repository.findSecurityEvents).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'auth.login.failed' }),
            1
        );
        expect(result).toEqual([
            expect.objectContaining({
                eventType: 'auth.login.failed',
                occurredAt: '2026-03-28T08:00:00.000Z'
            })
        ]);
    });
});
