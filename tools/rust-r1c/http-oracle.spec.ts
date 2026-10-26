/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import * as fs from 'node:fs';
import { request } from 'node:http';
import { gunzipSync, deflateSync, brotliCompressSync } from 'node:zlib';
import { Module } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { hashSync } from 'bcryptjs';
import { ZodSerializerInterceptor, ZodValidationPipe } from '@poms/vendor-nestjs-zod';
import { AuthController } from '../../apps/poms-api/src/app/core/auth/auth.controller';
import { AuthSessionService, hashToken } from '../../apps/poms-api/src/app/core/auth/auth-session.service';
import { AuthSessionCookieService } from '../../apps/poms-api/src/app/core/auth/auth-session-cookie.service';
import { SessionAuthGuard } from '../../apps/poms-api/src/app/core/auth/guards/session-auth.guard';
import { AuthCsrfGuard } from '../../apps/poms-api/src/app/core/auth/guards/auth-csrf.guard';
import { PermissionsGuard } from '../../apps/poms-api/src/app/core/auth/guards/permissions.guard';
import { RuntimeAuditService } from '../../apps/poms-api/src/app/core/runtime-audit/runtime-audit.service';
import { PlatformService } from '../../apps/poms-api/src/app/features/platform/platform.service';
import { IdentityProviderService } from '../../apps/poms-api/src/app/features/identity-provider/identity-provider.service';
import { DEV_USERS } from '../../apps/poms-api/src/app/core/platform/dev-platform.fixtures';
import { loaderEvidence } from './http-env.mock';

jest.mock('node:crypto', () => ({ ...jest.requireActual('node:crypto'), randomBytes: jest.fn((length: number) => Buffer.alloc(length, 0x11)) }));
const NOW = '2026-05-13T01:00:00.000Z';
const USER_ID = '90000000-0000-4000-8000-000000000001';
const SESSION_ID = '90000000-0000-4000-8000-000000000002';
const ROLE_ID = '90000000-0000-4000-8000-000000000003';
const PASSWORD = 'public-synthetic-password';
const SALT = '$2b$04$abcdefghijklmnopqrstuu';
const csrfHeaders = { 'x-csrf-token': 'csrf-token', cookie: 'poms_csrf=csrf-token' };
const authenticatedHeaders = { 'x-csrf-token': 'csrf-token', cookie: 'poms_session=session-token; poms_csrf=csrf-token' };
type Case = { id: string; method?: string; path?: string; body?: string; bodyBytesBase64?: string; headers?: Record<string, string | string[]>; status?: string; active?: boolean; password?: string; auditFailure?: boolean };
const validLoginBytes = Buffer.from(JSON.stringify({ username: 'r1c-http', password: PASSWORD }));
const utf16Login = Buffer.from(validLoginBytes.toString(), 'utf16le');
const largeBody = JSON.stringify({ username: 'r1c-http', password: PASSWORD, extra: 'x'.repeat(102400) });
// Fixed public wire bytes: gzipSync embeds an OS-dependent header byte. Both
// platforms must send the identical input, not normalize the observed result.
const gzipLoginBase64 = 'H4sIAAAAAAAACqtWKi1OLcpLzE1VslIqMkzWzSgpKVDSUSpILC4uzy9KUbJSKihNyslM1i2uzCvJSC3JTNaFy9UCALxbMbE+AAAA';
const gzipLargeBase64 =
    'H4sIAAAAAAAACu3JMQ6CMBQA0Lv8GQbX3qZiE0gUSFsixnh3Ny/he+t7x9FKXfOjRIp6mca59z2G2HNrz63eIsV+XO/LNLbX2ufSl2n83RDl7DVHihMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBPxOcLjxg9ekmQAQA=';
if (!gunzipSync(Buffer.from(gzipLoginBase64, 'base64')).equals(validLoginBytes) || !gunzipSync(Buffer.from(gzipLargeBase64, 'base64')).equals(Buffer.from(largeBody))) throw new Error('Fixed public gzip input does not match its declared plain body');
const cases: Case[] = [
    { id: 'session-anonymous', method: 'GET', path: '/api/auth/session' },
    { id: 'csrf-anonymous', method: 'GET', path: '/api/auth/csrf-token' },
    { id: 'session-valid', method: 'GET', path: '/api/auth/session', headers: authenticatedHeaders },
    { id: 'session-unknown', method: 'GET', path: '/api/auth/session', headers: { cookie: 'poms_session=unknown' } },
    { id: 'session-revoked', method: 'GET', path: '/api/auth/session', headers: authenticatedHeaders, status: 'revoked' },
    { id: 'session-expired', method: 'GET', path: '/api/auth/session', headers: authenticatedHeaders, status: 'expired' },
    { id: 'session-disabled', method: 'GET', path: '/api/auth/session', headers: authenticatedHeaders, active: false },
    { id: 'session-malformed-cookie', method: 'GET', path: '/api/auth/session', headers: { cookie: 'poms_session=%E0%A4%A' } },
    { id: 'csrf-session-bound', method: 'GET', path: '/api/auth/csrf-token', headers: authenticatedHeaders },
    { id: 'csrf-session-invalid', method: 'GET', path: '/api/auth/csrf-token', headers: { cookie: 'poms_session=unknown' } },
    { id: 'login-valid', body: JSON.stringify({ username: 'r1c-http', password: PASSWORD }), headers: csrfHeaders },
    { id: 'login-wrong-password', body: JSON.stringify({ username: 'r1c-http', password: 'wrong' }), headers: csrfHeaders },
    { id: 'login-whitespace-not-trimmed', body: JSON.stringify({ username: ' r1c-http ', password: PASSWORD }), headers: csrfHeaders },
    { id: 'login-both-empty', body: '{"username":"","password":""}', headers: csrfHeaders },
    { id: 'login-missing-password', body: '{"username":"r1c-http"}', headers: csrfHeaders },
    { id: 'login-csrf-before-dto', body: '{}', headers: {} },
    { id: 'login-malformed-before-csrf', body: '{', headers: {} },
    { id: 'login-json-empty-body', body: '', headers: csrfHeaders },
    { id: 'login-json-whitespace', body: '  \r\n ', headers: csrfHeaders },
    { id: 'login-json-null-strict', body: 'null', headers: csrfHeaders },
    { id: 'login-json-array', body: '[]', headers: csrfHeaders },
    { id: 'login-no-content-type', body: '{}', headers: { ...csrfHeaders, 'content-type': '' } },
    { id: 'login-text-ignored', body: JSON.stringify({ username: 'r1c-http', password: PASSWORD }), headers: { ...csrfHeaders, 'content-type': 'text/plain' } },
    { id: 'login-url-encoded', body: `username=r1c-http&password=${PASSWORD}`, headers: { ...csrfHeaders, 'content-type': 'application/x-www-form-urlencoded' } },
    { id: 'login-duplicate-json-last-wins', body: `{"username":"wrong","username":"r1c-http","password":"${PASSWORD}"}`, headers: csrfHeaders },
    { id: 'login-surrogate-password', body: '{"username":"r1c-http","password":"\\ud800"}', password: '\ud800', headers: csrfHeaders },
    { id: 'login-surrogate-unknown-key-value', body: `{"username":"r1c-http","password":"${PASSWORD}","\\ud800":"\\udc00"}`, headers: csrfHeaders },
    { id: 'login-escaped-known-key', body: `{"username":"r1c-http","\\u0070assword":"${PASSWORD}"}`, headers: csrfHeaders },
    { id: 'login-duplicate-csrf-header', body: '{}', headers: { ...csrfHeaders, 'x-csrf-token': ['csrf-token', 'csrf-token'] } },
    { id: 'login-unsupported-charset', body: '{}', headers: { ...csrfHeaders, 'content-type': 'application/json; charset=iso-8859-1' } },
    { id: 'logout-valid', path: '/api/auth/session:logout', body: '{}', headers: authenticatedHeaders },
    { id: 'logout-auth-before-csrf-dto', path: '/api/auth/session:logout', body: '{"extra":true}', headers: {} },
    { id: 'logout-csrf-before-dto', path: '/api/auth/session:logout', body: '{"extra":true}', headers: { cookie: 'poms_session=session-token' } },
    { id: 'logout-strict-unknown', path: '/api/auth/session:logout', body: '{"extra":true}', headers: authenticatedHeaders },
    { id: 'logout-strict-surrogate-key', path: '/api/auth/session:logout', body: '{"\\ud800":true}', headers: authenticatedHeaders },
    { id: 'logout-invalid-session-no-clear', path: '/api/auth/session:logout', body: '{}', headers: { ...authenticatedHeaders, cookie: 'poms_session=unknown; poms_csrf=csrf-token' } },
    { id: 'logout-empty-cookie-first', path: '/api/auth/session:logout', body: '{}', headers: { ...authenticatedHeaders, cookie: 'poms_session=; poms_session=session-token; poms_csrf=csrf-token' } },
    { id: 'logout-bearer-ignored', path: '/api/auth/session:logout', body: '{}', headers: { ...csrfHeaders, authorization: 'Bearer synthetic' } },
    { id: 'unknown-method-no-guard', method: 'DELETE', path: '/api/auth/sessions', body: '{}', headers: {} },
    { id: 'unknown-path-json-before-404', path: '/api/auth/not-implemented', body: '{', headers: {} },
    { id: 'login-audit-failure-is-500', body: JSON.stringify({ username: 'r1c-http', password: 'wrong' }), headers: csrfHeaders, auditFailure: true },
    { id: 'login-gzip', bodyBytesBase64: gzipLoginBase64, headers: { ...csrfHeaders, 'content-encoding': 'gzip' } },
    { id: 'login-deflate', bodyBytesBase64: deflateSync(validLoginBytes).toString('base64'), headers: { ...csrfHeaders, 'content-encoding': 'deflate' } },
    { id: 'login-brotli', bodyBytesBase64: brotliCompressSync(validLoginBytes).toString('base64'), headers: { ...csrfHeaders, 'content-encoding': 'br' } },
    { id: 'login-invalid-gzip', body: 'invalid', headers: { ...csrfHeaders, 'content-encoding': 'gzip' } },
    { id: 'login-unsupported-encoding', body: '{}', headers: { ...csrfHeaders, 'content-encoding': 'compress' } },
    { id: 'login-utf8-bom', body: '\ufeff' + validLoginBytes.toString(), headers: csrfHeaders },
    { id: 'login-utf16le', bodyBytesBase64: utf16Login.toString('base64'), headers: { ...csrfHeaders, 'content-type': 'application/json; charset=utf-16le' } },
    { id: 'login-utf16be', bodyBytesBase64: Buffer.from(utf16Login).swap16().toString('base64'), headers: { ...csrfHeaders, 'content-type': 'application/json; charset=utf-16be' } },
    { id: 'login-json-over-100kb', body: largeBody, headers: csrfHeaders },
    { id: 'login-gzip-inflates-over-100kb', bodyBytesBase64: gzipLargeBase64, headers: { ...csrfHeaders, 'content-encoding': 'gzip' } },
    { id: 'login-urlencoded-duplicate-user', body: `username=r1c-http&username=wrong&password=${PASSWORD}`, headers: { ...csrfHeaders, 'content-type': 'application/x-www-form-urlencoded' } },
    { id: 'login-urlencoded-nested-user', body: `username[x]=r1c-http&password=${PASSWORD}`, headers: { ...csrfHeaders, 'content-type': 'application/x-www-form-urlencoded' } },
    { id: 'known-get-malformed-body', method: 'GET', path: '/api/auth/session', body: '{', headers: {} },
    { id: 'unknown-get-valid-body', method: 'GET', path: '/api/auth/not-implemented', body: '{}', headers: {} },
    { id: 'login-unknown-invalid-utf8', bodyBytesBase64: Buffer.concat([Buffer.from(`{"username":"r1c-http","password":"${PASSWORD}","extra":"`), Buffer.from([255]), Buffer.from('"}')]).toString('base64'), headers: csrfHeaders },
    { id: 'login-leading-whitespace-array', body: ' \n []', headers: csrfHeaders },
    { id: 'login-urlencoded-multiple-object-fields', body: 'username[x]=a&username[y]=b&password=p', headers: { ...csrfHeaders, 'content-type': 'application/x-www-form-urlencoded' } },
    { id: 'login-utf16le-invalid-surrogate-escape', bodyBytesBase64: 'ewAiAHUAcwBlAHIAbgBhAG0AZQAiADoAIgB1ACIALAAiAHAAYQBzAHMAdwBvAHIAZAAiADoAIgBcAADYIgB9AA==', headers: { 'content-type': 'application/json; charset=utf-16le' } },
    ...[
        ['unclosed-string', '{"username":"r1c-http'],
        ['missing-colon', '{"username" "x"}'],
        ['trailing-comma', '{"username":"x",}'],
        ['unquoted-key', '{username:"x"}'],
        ['after-value', '{"username":"x" "password":"p"}'],
        ['invalid-escape', '{"password":"\\q"}'],
        ['invalid-unicode-escape', '{"password":"\\u12xz"}'],
        ['control-char', '{"password":"a\nb"}'],
        ['trailing-garbage', '{}x'],
        ['unknown-token', '{"password":invalid}'],
        ['unclosed-object', '{"username":"x"'],
        ['array-missing-comma', '[1 2]'],
        ['bad-exponent', '{"password":1e}'],
        ['leading-zero', '{"password":01}'],
        ['fraction', '{"password":1.}'],
        ['truncated-true', '{"password":tru}']
    ].map(([id, body]) => ({ id: `login-json-${id}`, body, headers: {} }))
];

test('captures actual Nest HTTP parser, original auth guards/controller/services, no DB', async () => {
    const hermetic = (fs as any).__R1C_HTTP_HERMETIC__;
    expect(hermetic.evidence.inheritedSensitiveEnvironment).toEqual([]);
    jest.useFakeTimers({ now: new Date(NOW), doNotFake: ['hrtime', 'performance', 'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const reflector = new Reflector();
    const cookies = new AuthSessionCookieService();
    let current: Case = cases[0];
    const user = { id: USER_ID, username: 'r1c-http', displayName: 'R1C HTTP 合成用户', email: null, avatarUrl: null, isActive: true, lastLoginAt: null, emailVerified: false, phoneVerified: false, phone: null };
    const permissions = ['project:read', 'future:raw:permission'];
    const roles = [{ id: ROLE_ID, name: 'Synthetic role', isActive: true }];
    const platformRepository = {
        findActiveUserByUsername: jest.fn(async (username) => (username === user.username && current.active !== false ? user : null)),
        findCredentialByUserId: jest.fn(async () => ({ passwordHash: hashSync(current.password ?? PASSWORD, SALT) })),
        findUserById: jest.fn(async () => ({ ...user, isActive: current.active !== false })),
        findActiveUserRoleAssignments: jest.fn(async () => [{ userId: USER_ID, roleId: ROLE_ID }]),
        findRolesByIds: jest.fn(async () => roles),
        findActiveRolePermissionAssignments: jest.fn(async () => permissions.map((permissionKey) => ({ roleId: ROLE_ID, permissionKey }))),
        findAllUsers: jest.fn(async () => [user]),
        findAllRoles: jest.fn(async () => roles),
        findAllOrgUnits: jest.fn(async () => []),
        findActiveUserOrgMemberships: jest.fn(async () => [])
    };
    const auditRepository = {
        createSecurityEvent: jest.fn((input) => input),
        saveAll: jest.fn(async () => {
            if (current.auditFailure) throw new Error('synthetic audit failure');
        })
    };
    const audit = new RuntimeAuditService(auditRepository as never);
    const platform = new PlatformService(platformRepository as never, audit, {} as never);
    const session = () => ({
        id: SESSION_ID,
        userId: USER_ID,
        tokenHash: hashToken('session-token'),
        csrfTokenHash: hashToken('csrf-token'),
        status: current.status ?? 'active',
        idleExpiresAt: new Date('2026-05-13T01:15:00.000Z'),
        absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z'),
        lastSeenAt: new Date(NOW),
        lastIp: null,
        revokedAt: null,
        revokedReason: null,
        rowVersion: 1,
        createdAt: new Date(NOW),
        updatedAt: new Date(NOW)
    });
    const repository = {
        createSession: jest.fn((input) => ({ ...session(), ...input })),
        saveAll: jest.fn(async () => undefined),
        findByTokenHash: jest.fn(async (hash) => (hash === hashToken('session-token') ? session() : null)),
        touchLastSeenIfDue: jest.fn(async () => null),
        expireActiveSession: jest.fn(async () => ({ ...session(), status: 'expired' })),
        revokeActiveSession: jest.fn(async () => ({ ...session(), status: 'revoked', revokedAt: new Date(NOW), revokedReason: 'logout' })),
        rotateCsrfTokenForActiveSession: jest.fn(async () => ({ ...session(), csrfTokenHash: hashToken(Buffer.alloc(32, 0x11).toString('base64url')) })),
        findWriteSnapshotById: jest.fn(async () => session())
    };
    const sessions = new AuthSessionService(repository as never, platform);
    class OracleModule {}
    Module({
        controllers: [AuthController],
        providers: [
            { provide: PlatformService, useValue: platform },
            { provide: RuntimeAuditService, useValue: audit },
            { provide: IdentityProviderService, useValue: {} },
            { provide: AuthSessionService, useValue: sessions },
            { provide: AuthSessionCookieService, useValue: cookies }
        ]
    })(OracleModule);
    const app = await NestFactory.create(OracleModule, { logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalGuards(new SessionAuthGuard(reflector, sessions, cookies, audit), new AuthCsrfGuard(reflector, sessions, cookies, audit), new PermissionsGuard(reflector, audit));
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalInterceptors(new ZodSerializerInterceptor(reflector));
    try {
        process.stderr.write('R1C HTTP oracle: listening\n');
        await app.listen(0, '127.0.0.1');
        const port = app.getHttpServer().address().port;
        const observed = [];
        for (const input of cases) {
            process.stderr.write(`R1C HTTP oracle case ${input.id}\n`);
            current = input;
            jest.clearAllMocks();
            const body = input.bodyBytesBase64 ? Buffer.from(input.bodyBytesBase64, 'base64') : input.body;
            const headers: Record<string, string | string[]> = { 'content-type': 'application/json', 'x-request-id': 'r1c-http-oracle', 'user-agent': 'r1c-http-oracle', ...input.headers };
            if (headers['content-type'] === '') delete headers['content-type'];
            if (body !== undefined) headers['content-length'] = String(Buffer.byteLength(body));
            const response: any = await new Promise((resolve, reject) => {
                const req = request({ hostname: '127.0.0.1', port, path: input.path ?? '/api/auth/sessions', method: input.method ?? 'POST', headers, agent: false }, (res) => {
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () =>
                        resolve({
                            status: res.statusCode,
                            headers: {
                                'content-type': res.headers['content-type'],
                                'set-cookie': res.headers['set-cookie'] ?? [],
                                'content-security-policy': res.headers['content-security-policy'] ?? null,
                                'x-content-type-options': res.headers['x-content-type-options'] ?? null,
                                'x-powered-by': res.headers['x-powered-by'] ?? null
                            },
                            body: (() => {
                                const text = Buffer.concat(chunks).toString('utf8');
                                try {
                                    return JSON.parse(text);
                                } catch {
                                    return { rawText: text };
                                }
                            })()
                        })
                    );
                });
                req.on('error', reject);
                req.setTimeout(10000, () => req.destroy(new Error('owned oracle HTTP timeout')));
                req.end(body);
            });
            observed.push({
                input,
                observed: response,
                effects: {
                    securityEvents: auditRepository.createSecurityEvent.mock.calls.map((call) => call[0]),
                    sessionCreate: repository.createSession.mock.calls.length,
                    sessionRead: repository.findByTokenHash.mock.calls.length,
                    sessionRevoke: repository.revokeActiveSession.mock.calls.length
                }
            });
        }
        expect(observed.find((entry) => entry.input.id === 'login-surrogate-password')?.observed.status).toBe(200);
        expect(observed.find((entry) => entry.input.id === 'login-surrogate-unknown-key-value')?.observed.status).toBe(200);
        expect(observed.find((entry) => entry.input.id === 'logout-strict-surrogate-key')?.observed.status).toBe(400);
        expect(hermetic.evidence.protectedReadAttempts).toBe(0);
        expect(hermetic.evidence.rejectedNetworkAttempts).toBe(0);
        expect(hermetic.evidence.processAttempts).toBe(0);
        expect(hermetic.evidence.listenerCount).toBe(1);
        expect(loaderEvidence.calls).toBeGreaterThan(0);
        const fallback = DEV_USERS.map(({ id, displayName, roles, orgUnits }) => ({ id, displayName, roles, orgUnits }));
        fs.writeFileSync(
            process.env['R1C_HTTP_OUTPUT'] as string,
            JSON.stringify({
                now: NOW,
                configuration: {
                    globalPrefix: (app as any).config.getGlobalPrefix(),
                    globalGuards: (app as any).config.getGlobalGuards().map((guard: any) => guard.constructor.name),
                    globalPipes: (app as any).config.getGlobalPipes().map((pipe: any) => pipe.constructor.name),
                    globalInterceptors: (app as any).config.getGlobalInterceptors().map((interceptor: any) => interceptor.constructor.name),
                    exceptionFilters: (app as any).config.getGlobalFilters().length,
                    requestDtoMetadata: Reflect.getMetadata('design:paramtypes', AuthController.prototype, 'createPasswordAuthSession')[0].name,
                    compilerMetadataSource: 'apps/poms-api/tsconfig.app.json emitDecoratorMetadata=true',
                    excludedBootstrap: 'Swagger documentation and CORS are not installed in this narrow oracle; the requests do not use CORS or Swagger paths'
                },
                boundary: 'Original Nest HTTP/DTO/guards/controller/Platform/AuthSession/Audit services; repository mocks and fixed entropy/time; no database, R2 routes not exercised',
                hermetic: hermetic.evidence,
                originalEnvLoaderCalls: loaderEvidence.calls,
                fallbackProfiles: fallback,
                cases: observed
            })
        );
    } finally {
        process.stderr.write('R1C HTTP oracle: closing\n');
        await app.close();
        jest.useRealTimers();
    }
}, 60000);
