import { RuntimeAuditService } from './runtime-audit.service';

describe('RuntimeAuditService', () => {
    let service: RuntimeAuditService;
    let repository: {
        createAuditLog: jest.Mock;
        createSecurityEvent: jest.Mock;
        saveAll: jest.Mock;
    };

    beforeEach(() => {
        repository = {
            createAuditLog: jest.fn((input) => ({ id: 'audit-log-id', ...input })),
            createSecurityEvent: jest.fn((input) => ({ id: 'security-event-id', ...input })),
            saveAll: jest.fn().mockResolvedValue(undefined)
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
});
