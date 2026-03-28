import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let platformService: {
        resolveActiveAuthUser: jest.Mock;
        isKnownPlatformUser: jest.Mock;
    };
    let runtimeAuditService: {
        recordSecurityEvent: jest.Mock;
    };

    beforeEach(() => {
        platformService = {
            resolveActiveAuthUser: jest.fn(),
            isKnownPlatformUser: jest.fn()
        };
        runtimeAuditService = {
            recordSecurityEvent: jest.fn().mockResolvedValue(undefined)
        };

        strategy = new JwtStrategy(platformService as never, runtimeAuditService as never);
    });

    it('returns live platform permissions for an active user', async () => {
        platformService.resolveActiveAuthUser.mockResolvedValue({
            userId: '00000000-0000-4000-8000-000000000001',
            username: 'admin',
            permissions: ['platform:users:manage']
        });

        const result = await strategy.validate(
            {
                method: 'GET',
                originalUrl: '/auth/profile',
                headers: {}
            },
            {
                sub: '00000000-0000-4000-8000-000000000001',
                username: 'admin',
                permissions: []
            }
        );

        expect(result).toEqual({
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'admin',
            permissions: ['platform:users:manage']
        });
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('records a security event when a known platform user token is no longer valid', async () => {
        platformService.resolveActiveAuthUser.mockResolvedValue(null);
        platformService.isKnownPlatformUser.mockResolvedValue(true);

        await expect(
            strategy.validate(
                {
                    method: 'GET',
                    originalUrl: '/platform/users',
                    ip: '127.0.0.1',
                    headers: {
                        'user-agent': 'jest',
                        'x-request-id': 'req-token-rejected'
                    }
                },
                {
                    sub: '00000000-0000-4000-8000-000000000001',
                    username: 'viewer',
                    permissions: []
                }
            )
        ).rejects.toThrow(UnauthorizedException);

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'auth.token.rejected',
                actorId: '00000000-0000-4000-8000-000000000001',
                principal: 'viewer',
                requestId: 'req-token-rejected',
                path: '/platform/users',
                method: 'GET',
                result: 'expired',
                details: { reason: 'inactive_or_removed_user' }
            })
        );
    });
});
