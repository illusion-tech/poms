import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let runtimeAuditService: {
        recordSecurityEvent: jest.Mock;
    };

    beforeEach(() => {
        runtimeAuditService = {
            recordSecurityEvent: jest.fn().mockResolvedValue(undefined)
        };

        guard = new JwtAuthGuard(new Reflector(), runtimeAuditService as never);
    });

    it('records a security event when an invalid bearer token is presented', () => {
        const context = createContext({
            method: 'GET',
            originalUrl: '/auth/profile',
            ip: '127.0.0.1',
            headers: {
                authorization: 'Bearer malformed-token',
                'user-agent': 'jest',
                'x-request-id': 'req-jwt-invalid'
            }
        });

        expect(() =>
            guard.handleRequest(
                null,
                null,
                { name: 'JsonWebTokenError', message: 'jwt malformed' },
                context
            )
        ).toThrow('Authentication required');

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'auth.token.invalid',
                requestId: 'req-jwt-invalid',
                path: '/auth/profile',
                method: 'GET',
                result: 'failed',
                details: {
                    reason: 'jwt malformed'
                }
            })
        );
    });

    it('does not record a security event when the request has no bearer token', () => {
        const context = createContext({
            method: 'GET',
            originalUrl: '/auth/profile',
            headers: {}
        });

        expect(() => guard.handleRequest(null, null, null, context)).toThrow('Authentication required');
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });
});

function createContext(request: object): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => request
        })
    } as ExecutionContext;
}
