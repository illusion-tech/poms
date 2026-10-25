/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { BadRequestException, ForbiddenException, HttpException, StreamableFile, type ExecutionContext } from '@nestjs/common';
import { BaseExceptionFilter, Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { CreatePasswordAuthSessionRequestDto, LogoutAuthSessionRequestDto, CurrentAuthSessionViewDto } from '@poms/api-contracts';
import { ZodSerializerDto, ZodSerializerInterceptor, ZodValidationPipe } from '@poms/vendor-nestjs-zod';
import { ZodSerializerDtoOptions } from '../../libs/vendor/nestjs-zod/src/serializer';
import { AuthSessionCookieService } from '../../apps/poms-api/src/app/core/auth/auth-session-cookie.service';
import { AuthSessionAuthenticationError, AuthSessionErrorCodeValue, AuthSessionService, createOpaqueToken, hashToken } from '../../apps/poms-api/src/app/core/auth/auth-session.service';
import { AuthSessionRepository } from '../../apps/poms-api/src/app/core/auth/auth-session.repository';
import { AuthSessionRevokedReasonValue } from '../../apps/poms-api/src/app/core/auth/auth-session.entity';
import { AuthController } from '../../apps/poms-api/src/app/core/auth/auth.controller';
import { SessionAuthGuard } from '../../apps/poms-api/src/app/core/auth/guards/session-auth.guard';
import { AuthCsrfGuard } from '../../apps/poms-api/src/app/core/auth/guards/auth-csrf.guard';
import { PermissionsGuard } from '../../apps/poms-api/src/app/core/auth/guards/permissions.guard';
import { Public } from '../../apps/poms-api/src/app/core/auth/decorators/public.decorator';
import { Authenticated } from '../../apps/poms-api/src/app/core/auth/decorators/authenticated.decorator';
import { HasPermissions } from '../../apps/poms-api/src/app/core/auth/decorators/has-permissions.decorator';
import { HasAnyPermissions } from '../../apps/poms-api/src/app/core/auth/decorators/has-any-permissions.decorator';
import { SecretCipherService } from '../../apps/poms-api/src/app/core/secret/secret-cipher.service';
import { HealthService } from '../../apps/poms-api/src/app/core/health/health.service';
import { HealthController } from '../../apps/poms-api/src/app/core/health/health.controller';
import { loaderEvidence, syntheticEnvironment } from './support/env.mock';

// Keep the actual crypto functions. Only entropy is replaced for public vectors.
jest.mock('node:crypto', () => ({ ...jest.requireActual('node:crypto'), randomBytes: jest.fn() }));
const crypto = jest.requireMock('node:crypto') as { randomBytes: jest.Mock };
const NOW = '2026-05-13T01:00:00.000Z';
const USER_ID = '90000000-0000-4000-8000-000000000001';
const SESSION_ID = '90000000-0000-4000-8000-000000000002';
const currentUser = { sub: USER_ID, username: 'r0f-synthetic', permissions: ['project:read'] };
const cases: any[] = [];
const reflector = new Reflector();
const cookieService = new AuthSessionCookieService();

function clean(value: any): any {
    return JSON.parse(JSON.stringify(value));
}

function add(group: string, id: string, evidence: string, input: any, observed: any) {
    expect(cases.some((entry) => entry.id === id)).toBe(false);
    cases.push(clean({ group, id, evidence, input, observed }));
}

function exceptionView(error: any) {
    if (error instanceof AuthSessionAuthenticationError) {
        return { exceptionName: error.name, domainCode: error.code, message: error.message, httpMapping: 'none-at-service-layer; guard/controller mappings have separate cases' };
    }
    const reply = jest.fn();
    const adapter = { isHeadersSent: () => false, reply, end: jest.fn() };
    const logger = jest.spyOn((BaseExceptionFilter as any).logger, 'error').mockImplementation(() => undefined);
    try {
        new BaseExceptionFilter(adapter as never).catch(error, { getArgByIndex: () => ({}) } as never);
    } finally {
        logger.mockRestore();
    }
    const [, body, status] = reply.mock.calls[0];
    return { exceptionName: error?.constructor?.name ?? typeof error, status, body, ...(error instanceof HttpException ? { exceptionResponse: error.getResponse() } : {}) };
}

async function resultOf(action: () => any) {
    try {
        return { value: await action() };
    } catch (error) {
        return { error: exceptionView(error) };
    }
}

function session(overrides: any = {}) {
    return {
        id: SESSION_ID,
        tokenHash: hashToken('synthetic-session-token'),
        csrfTokenHash: hashToken('synthetic-csrf-token'),
        userId: USER_ID,
        status: 'active',
        idleExpiresAt: new Date('2026-05-13T01:15:00.000Z'),
        absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z'),
        lastSeenAt: new Date(NOW),
        revokedAt: null,
        revokedReason: null,
        createdIp: null,
        lastIp: null,
        createdUserAgent: null,
        rowVersion: 1,
        createdAt: new Date(NOW),
        updatedAt: new Date(NOW),
        ...overrides
    };
}

function sessionDoubles() {
    const repository = {
        createSession: jest.fn((input) => ({ id: SESSION_ID, rowVersion: 1, createdAt: new Date(NOW), updatedAt: new Date(NOW), ...input })),
        findByTokenHash: jest.fn(),
        findWriteSnapshotById: jest.fn(),
        saveAll: jest.fn().mockResolvedValue(undefined),
        touchLastSeenIfDue: jest.fn().mockResolvedValue(null),
        rotateCsrfTokenForActiveSession: jest.fn(),
        expireActiveSession: jest.fn().mockResolvedValue(null),
        revokeActiveSession: jest.fn().mockResolvedValue(null),
        revokeActiveSessionsForUser: jest.fn().mockResolvedValue(2)
    };
    const platform = { resolveActiveAuthUser: jest.fn().mockResolvedValue({ userId: USER_ID, username: currentUser.username, permissions: currentUser.permissions }) };
    return { repository, platform, service: new AuthSessionService(repository as never, platform as never) };
}

function callsOf(doubles: Record<string, any>) {
    return Object.fromEntries(
        Object.entries(doubles)
            .filter(([, value]) => jest.isMockFunction(value))
            .map(([key, value]) => [key, value.mock.calls])
    );
}

function context(request: any = {}, decorators: any[] = [], classDecorators: any[] = []) {
    const handler = () => undefined;
    class Controller {}
    for (const decorator of decorators) decorator(handler);
    for (const decorator of classDecorators) decorator(Controller);
    return { getHandler: () => handler, getClass: () => Controller, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

function request(overrides: any = {}) {
    return { method: 'GET', originalUrl: '/api/synthetic', ip: '127.0.0.1', headers: { 'user-agent': 'r0f-oracle', 'x-request-id': 'r0f-request' }, ...overrides };
}

function auditDouble() {
    return { recordSecurityEvent: jest.fn().mockResolvedValue(undefined) };
}

function entropy(byte: number) {
    crypto.randomBytes.mockImplementation((length: number) => Buffer.alloc(length, byte));
}

async function cookieCases() {
    for (const [id, type, token, expiry, options] of [
        ['session-secure', 'session', 'token /+中文', '2026-05-13T01:15:00.000Z', { secure: true, path: '/api', now: new Date(NOW) }],
        ['csrf-readable', 'csrf', 'csrf-test', '2026-05-13T01:15:00.999Z', { secure: false, path: '/custom', now: new Date(NOW) }],
        ['session-expired', 'session', 'expired', '2026-05-13T00:59:59.999Z', { secure: false, now: new Date(NOW) }],
        ['session-subsecond', 'session', 'short', '2026-05-13T01:00:00.999Z', { secure: false, now: new Date(NOW) }]
    ] as const) {
        const header = type === 'session' ? cookieService.createSessionCookieHeader(token, new Date(expiry), options) : cookieService.createCsrfCookieHeader(token, new Date(expiry), options);
        add('cookie', id, 'direct-existing-cookie-service', { token, expiry, options }, { header });
    }
    add(
        'cookie',
        'clear-both',
        'direct-existing-cookie-service',
        { secure: true, path: '/api' },
        {
            session: cookieService.createClearSessionCookieHeader({ secure: true, path: '/api' }),
            csrf: cookieService.createClearCsrfCookieHeader({ secure: true, path: '/api' })
        }
    );
    for (const [id, header] of [
        ['cookie-absent', undefined],
        ['cookie-empty', ''],
        ['cookie-array', ['other=a', 'poms_session=a%2Bb; poms_csrf=c%20d']],
        ['cookie-duplicate-first', 'poms_session=first; poms_session=second'],
        ['cookie-empty-first', 'poms_session=; poms_session=second'],
        ['cookie-exact-name', 'x_poms_session=x; poms_session=x=y'],
        ['cookie-malformed-uri', 'poms_session=%E0%A4%A']
    ] as const) {
        add(
            'cookie',
            id,
            'direct-existing-cookie-service-and-nest-filter-on-error',
            { header: header ?? null },
            await resultOf(() => ({ session: cookieService.getSessionTokenFromCookieHeader(header as any), csrf: cookieService.getCsrfTokenFromCookieHeader(header as any) }))
        );
    }
    for (const [id, nodeEnv, secure] of [
        ['production-default', 'production', undefined],
        ['production-explicit-false', 'production', false],
        ['test-default', 'test', undefined]
    ] as const) {
        syntheticEnvironment.NODE_ENV = nodeEnv;
        syntheticEnvironment.AUTH_COOKIE_SECURE = secure;
        add('cookie', id, 'direct-cookie-service-with-synthetic-env-loader', { nodeEnv, secure: secure ?? null }, { header: cookieService.createSessionCookieHeader('synthetic', new Date('2026-05-13T01:15:00.000Z')) });
    }
    syntheticEnvironment.NODE_ENV = 'test';
    syntheticEnvironment.AUTH_COOKIE_SECURE = false;
}

async function sessionCases() {
    entropy(1);
    add(
        'session',
        'opaque-and-sha256',
        'direct-existing-createOpaqueToken-and-hashToken',
        { randomByteHex: '01', length: 32, text: 'synthetic-session-token' },
        { opaque: createOpaqueToken(), hash: hashToken('synthetic-session-token'), utf8Hash: hashToken('中文 + token') }
    );
    for (const [id, idle, absolute] of [
        ['create-normal', 900, 28800],
        ['create-idle-capped', 900, 30]
    ] as const) {
        const { repository, service } = sessionDoubles();
        crypto.randomBytes.mockImplementationOnce(() => Buffer.alloc(32, 1)).mockImplementationOnce(() => Buffer.alloc(32, 2));
        const output = await service.createSession(USER_ID, { ip: '192.0.2.1', userAgent: 'synthetic' }, { now: new Date(NOW), idleTimeoutSeconds: idle, absoluteTimeoutSeconds: absolute });
        expect(repository.createSession.mock.calls[0][0].tokenHash).not.toBe(output.sessionToken);
        add('session', id, 'direct-session-service; repository-and-platform-boundary-mocks', { now: NOW, idle, absolute, tokenBytes: ['01'.repeat(32), '02'.repeat(32)] }, { output, repositoryCalls: callsOf(repository) });
    }
    for (const [id, overrides, now, platformActive] of [
        ['session-missing', null, NOW, true],
        ['session-revoked', { status: 'revoked' }, NOW, true],
        ['session-marked-expired', { status: 'expired' }, NOW, true],
        ['idle-just-before', {}, '2026-05-13T01:14:59.999Z', true],
        ['idle-equal-boundary', {}, '2026-05-13T01:15:00.000Z', true],
        ['absolute-equal-boundary', { idleExpiresAt: new Date('2026-05-13T10:00:00.000Z') }, '2026-05-13T09:00:00.000Z', true],
        ['account-disabled', {}, NOW, false],
        ['timestamp-invalid', { idleExpiresAt: 'invalid-date' }, NOW, true]
    ] as const) {
        const { repository, platform, service } = sessionDoubles();
        const entity = overrides === null ? null : session(overrides);
        repository.findByTokenHash.mockResolvedValue(entity);
        if (!platformActive) platform.resolveActiveAuthUser.mockResolvedValue(null);
        if (entity) {
            repository.expireActiveSession.mockResolvedValue({ ...entity, status: 'expired', revokedAt: new Date(now), rowVersion: 2, updatedAt: new Date(now) });
            repository.revokeActiveSession.mockResolvedValue({ ...entity, status: 'revoked', revokedAt: new Date(now), revokedReason: AuthSessionRevokedReasonValue.AccountDisabled, rowVersion: 2, updatedAt: new Date(now) });
        }
        const output = await resultOf(() => service.resolveSessionToken('synthetic-session-token', {}, { now: new Date(now) }));
        add(
            'session',
            id,
            'direct-session-service; repository-and-platform-boundary-mocks; domain-errors-have-no-service-layer-HTTP-mapping',
            { snapshot: overrides, now, platformActive },
            { output, entity, repositoryCalls: callsOf(repository), platformCalls: callsOf(platform) }
        );
    }
    for (const [id, at, touched] of [
        ['touch-before-throttle', '2026-05-13T01:00:59.999Z', false],
        ['touch-due-with-raw-timestamps', '2026-05-13T01:01:00.000Z', true],
        ['touch-lost-concurrent', '2026-05-13T01:01:00.000Z', false]
    ] as const) {
        const { repository, service } = sessionDoubles();
        const entity = session();
        repository.findByTokenHash.mockResolvedValue(entity);
        if (touched) repository.touchLastSeenIfDue.mockResolvedValue({ lastSeenAt: at, lastIp: '192.0.2.2', idleExpiresAt: '2026-05-13T01:16:00.000Z', rowVersion: 2, updatedAt: at });
        const output = await service.resolveSessionToken('synthetic-session-token', { ip: '192.0.2.2' }, { now: new Date(at) });
        add('session', id, 'direct-session-service; configured-repository-snapshot-is-not-a-concurrency-proof', { now: at, touchedSnapshot: touched }, { output, repositoryCalls: callsOf(repository) });
    }
    const csrf = sessionDoubles().service;
    for (const [id, stored, supplied] of [
        ['csrf-hash-match', hashToken('synthetic-csrf-token'), 'synthetic-csrf-token'],
        ['csrf-hash-mismatch', hashToken('synthetic-csrf-token'), 'wrong'],
        ['csrf-hash-null', null, 'synthetic-csrf-token']
    ] as const) {
        add('session', id, 'direct-existing-session-csrf-hash-verification', { stored, supplied }, { valid: csrf.verifyCsrfToken(session({ csrfTokenHash: stored }) as never, supplied) });
    }
    entropy(3);
    add('session', 'anonymous-csrf', 'direct-session-service-with-synthetic-env-loader', { now: NOW, randomBytes: '03'.repeat(32) }, csrf.createAnonymousCsrfToken({ now: new Date(NOW) }));
    for (const [id, snapshot] of [
        ['rotate-success', session({ csrfTokenHash: hashToken(Buffer.alloc(32, 4).toString('base64url')), rowVersion: 2 })],
        ['rotate-reread-missing', null],
        ['rotate-reread-revoked', session({ status: 'revoked' })],
        ['rotate-reread-expired', session({ idleExpiresAt: NOW })],
        ['rotate-reread-still-active', session()]
    ] as const) {
        const { repository, service } = sessionDoubles();
        repository.findByTokenHash.mockResolvedValue(session());
        repository.rotateCsrfTokenForActiveSession.mockResolvedValue(id === 'rotate-success' ? snapshot : null);
        repository.findWriteSnapshotById.mockResolvedValue(snapshot);
        entropy(4);
        const output = await resultOf(() => service.refreshCsrfToken('synthetic-session-token', {}, { now: new Date(NOW) }));
        add('session', id, 'direct-session-service; configured-repository-boundary-race-results', { now: NOW, snapshot, csrfBytes: '04'.repeat(32) }, { output, repositoryCalls: callsOf(repository) });
    }
    for (const [id, entity, revoked] of [
        ['logout-missing', null, false],
        ['logout-inactive', session({ status: 'revoked' }), false],
        ['logout-success', session(), true],
        ['logout-lost-update', session(), false]
    ] as const) {
        const { repository, service } = sessionDoubles();
        repository.findByTokenHash.mockResolvedValue(entity);
        repository.revokeActiveSession.mockResolvedValue(revoked ? session({ status: 'revoked', revokedReason: 'logout', revokedAt: new Date(NOW), rowVersion: 2 }) : null);
        add('session', id, 'direct-session-service; repository-boundary-mock', { entity, revoked }, { revoked: await service.revokeSessionToken('synthetic-session-token', undefined, { now: new Date(NOW) }), repositoryCalls: callsOf(repository) });
    }
    // Invoke the real repository to preserve SQL and parameter order, without executing SQL.
    const execute = jest.fn().mockResolvedValue([]);
    const repository = new AuthSessionRepository({ getEntityManager: () => ({ getConnection: () => ({ execute }) }) } as never);
    await repository.touchLastSeenIfDue({ sessionId: SESSION_ID, now: new Date(NOW), ip: null, idleTimeoutSeconds: 900, lastSeenThrottleSeconds: 60 });
    await repository.rotateCsrfTokenForActiveSession({ sessionId: SESSION_ID, csrfTokenHash: hashToken('synthetic-csrf-token'), now: new Date(NOW) });
    add(
        'session',
        'repository-sql-call-contract',
        'direct-existing-repository; execute-is-recording-stub; SQL-not-executed',
        { sessionId: SESSION_ID, now: NOW },
        { calls: execute.mock.calls.map(([sql, parameters]) => ({ sql: sql.replaceAll('\r\n', '\n'), parameters })) }
    );
}

async function guardCases() {
    for (const [id, decorators, cookie, failure] of [
        ['public-no-cookie', [Public()], undefined, null],
        ['protected-no-cookie', [Authenticated()], undefined, null],
        ['protected-valid', [Authenticated()], 'poms_session=synthetic-session-token', null],
        ...Object.values(AuthSessionErrorCodeValue).map((code) => [`guard-${code}`, [Authenticated()], 'poms_session=synthetic-session-token', code])
    ] as any[]) {
        const audit = auditDouble();
        const resolved = { resolveSessionToken: jest.fn() };
        if (failure) resolved.resolveSessionToken.mockRejectedValue(new AuthSessionAuthenticationError(failure));
        else resolved.resolveSessionToken.mockResolvedValue({ session: session(), user: currentUser });
        const req = request({ headers: { cookie } });
        const guard = new SessionAuthGuard(reflector, resolved as never, cookieService, audit as never);
        add(
            'guards',
            id,
            'direct-session-auth-guard-and-real-decorators; resolver-audit-boundary-mocks',
            { cookie: cookie ?? null, failure },
            { output: await resultOf(() => guard.canActivate(context(req, decorators))), request: req, resolverCalls: callsOf(resolved), auditCalls: callsOf(audit) }
        );
    }
    const actualSessionService = sessionDoubles().service;
    const csrfRows = [
        ['csrf-get-safe', 'GET', false, {}, false],
        ['csrf-options-safe', 'OPTIONS', false, {}, false],
        ['csrf-head-safe', 'HEAD', false, {}, false],
        ['csrf-public-post-match', 'POST', true, { 'X-CSRF-TOKEN': ' synthetic-csrf-token ', cookie: 'poms_csrf=synthetic-csrf-token' }, false],
        ['csrf-protected-match', 'POST', false, { 'x-csrf-token': ['synthetic-csrf-token', 'ignored'], cookie: 'poms_csrf=synthetic-csrf-token' }, true],
        ['csrf-missing-header', 'POST', true, { cookie: 'poms_csrf=synthetic-csrf-token' }, false],
        ['csrf-blank-header', 'POST', true, { 'x-csrf-token': ' ', cookie: 'poms_csrf=synthetic-csrf-token' }, false],
        ['csrf-missing-cookie', 'DELETE', true, { 'x-csrf-token': 'synthetic-csrf-token' }, false],
        ['csrf-double-submit-mismatch', 'PATCH', true, { 'x-csrf-token': 'a', cookie: 'poms_csrf=b' }, false],
        ['csrf-session-unresolved', 'PUT', false, { 'x-csrf-token': 'synthetic-csrf-token', cookie: 'poms_csrf=synthetic-csrf-token' }, false],
        ['csrf-session-hash-mismatch', 'POST', false, { 'x-csrf-token': 'wrong', cookie: 'poms_csrf=wrong' }, true]
    ];
    for (const [id, method, isPublic, headers, resolved] of csrfRows) {
        const audit = auditDouble();
        const req = request({ method, headers, ...(resolved ? { authSession: session(), user: currentUser } : {}) });
        const guard = new AuthCsrfGuard(reflector, actualSessionService, cookieService, audit as never);
        add(
            'guards',
            id as string,
            'direct-CSRF-guard-cookie-parser-session-hash-and-decorators; audit-mock',
            { method, isPublic, headers, resolved },
            { output: await resultOf(() => guard.canActivate(context(req, isPublic ? [Public()] : [Authenticated()]))), auditCalls: callsOf(audit) }
        );
    }
    const permissionRows = [
        ['permission-default-deny', [], [], [], []],
        ['permission-empty-requirement-deny', [HasPermissions()], [], [], []],
        ['permission-authenticated', [Authenticated()], [], [], []],
        ['permission-public', [Public()], [], [], []],
        ['permission-all-pass', [HasPermissions('project:read', 'project:write')], ['project:read', 'project:write'], [], []],
        ['permission-all-fail', [HasPermissions('project:read', 'project:write')], ['project:read'], [], []],
        ['permission-any-pass', [HasAnyPermissions('lead:write', 'project:write')], ['project:write'], [], []],
        ['permission-any-fail', [HasAnyPermissions('lead:write', 'project:write')], ['project:read'], [], []],
        ['permission-all-any-pass', [HasPermissions('project:read'), HasAnyPermissions('lead:write', 'project:write')], ['project:read', 'project:write'], [], []],
        ['permission-all-any-fail-all', [HasPermissions('project:read'), HasAnyPermissions('lead:write', 'project:write')], ['project:write'], [], []],
        ['permission-all-any-fail-any', [HasPermissions('project:read'), HasAnyPermissions('lead:write', 'project:write')], ['project:read'], [], []],
        ['permission-class-inherited', [], ['project:read'], [HasPermissions('project:read')], []],
        ['permission-handler-overrides-class', [HasPermissions('project:read')], ['project:read'], [HasPermissions('project:write')], []]
    ];
    for (const [id, decorators, permissions, classDecorators] of permissionRows as any[]) {
        const audit = auditDouble();
        const req = request({ user: { ...currentUser, permissions } });
        const ctx = context(req, decorators, classDecorators);
        const guard = new PermissionsGuard(reflector, audit as never);
        add(
            'guards',
            id,
            'direct-permissions-guard-real-reflector-and-decorators; audit-mock; standalone-guard-is-not-authentication-proof',
            {
                permissions,
                handlerMetadata: Reflect.getMetadataKeys(ctx.getHandler()).map((key) => [key, Reflect.getMetadata(key, ctx.getHandler())]),
                classMetadata: Reflect.getMetadataKeys(ctx.getClass()).map((key) => [key, Reflect.getMetadata(key, ctx.getClass())])
            },
            { output: await resultOf(() => guard.canActivate(ctx)), auditCalls: callsOf(audit) }
        );
    }
}

async function cipherCases() {
    const service = new SecretCipherService();
    const options = { envKeys: ['R0F_SYNTHETIC_KEY_A', 'R0F_SYNTHETIC_KEY_B'], defaultValue: 'public-r0f-fallback-key' };
    process.env['R0F_SYNTHETIC_KEY_A'] = 'public-r0f-primary-key';
    process.env['R0F_SYNTHETIC_KEY_B'] = 'public-r0f-secondary-key';
    const vectors: string[] = [];
    for (const [id, plaintext, byte] of [
        ['v1-ascii', 'synthetic secret', 5],
        ['v1-utf8', '固定中文🔒\nsecond line', 6],
        ['v1-empty', '', 7]
    ] as const) {
        entropy(byte);
        const encrypted = service.encrypt(plaintext, options);
        vectors.push(encrypted);
        add(
            'cipher-v1',
            id,
            'direct-existing-SecretCipherService; only-randomBytes-is-fixed; public-test-key-material',
            { plaintext, keySource: 'public-r0f-primary-key', ivHex: Buffer.alloc(12, byte).toString('hex'), options },
            { encrypted, decrypt: await resultOf(() => service.decrypt(encrypted, options)) }
        );
    }
    for (const [id, envA, envB] of [
        ['key-primary-priority', 'public-r0f-primary-key', 'public-r0f-secondary-key'],
        ['key-empty-falls-through', '', 'public-r0f-secondary-key'],
        ['key-default-fallback', undefined, undefined]
    ] as const) {
        if (envA === undefined) delete process.env['R0F_SYNTHETIC_KEY_A'];
        else process.env['R0F_SYNTHETIC_KEY_A'] = envA;
        if (envB === undefined) delete process.env['R0F_SYNTHETIC_KEY_B'];
        else process.env['R0F_SYNTHETIC_KEY_B'] = envB;
        entropy(8);
        const encrypted = service.encrypt('priority-test', options);
        add(
            'cipher-v1',
            id,
            'direct-existing-key-source-order-and-cipher; synthetic-env-only',
            { envA: envA ?? null, envB: envB ?? null, options, ivHex: '08'.repeat(12), plaintext: 'priority-test' },
            { encrypted, decrypted: service.decrypt(encrypted, options) }
        );
    }
    process.env['R0F_SYNTHETIC_KEY_A'] = 'public-r0f-primary-key';
    for (const [id, ciphertext, override] of [
        ['v1-trailing-field-ignored', `${vectors[0]}:ignored`, {}],
        ['v1-invalid-version', vectors[0].replace('v1:', 'v2:'), {}],
        [
            'v1-bad-tag',
            (() => {
                const parts = vectors[0].split(':');
                parts[2] = Buffer.alloc(16, 0).toString('base64');
                return parts.join(':');
            })(),
            {}
        ],
        ['v1-bad-iv', 'v1:!:!:!', {}],
        ['v1-malformed', 'not-ciphertext', {}],
        ['v1-custom-error', 'v2:a:b:c', { unreadableMessage: 'Synthetic secret is not readable.' }]
    ] as const) {
        add('cipher-v1', id, 'direct-existing-decrypt-and-Nest-filter', { ciphertext, options: { ...options, ...override } }, await resultOf(() => service.decrypt(ciphertext, { ...options, ...override })));
    }
    process.env['R0F_SYNTHETIC_KEY_A'] = 'public-r0f-wrong-key';
    add('cipher-v1', 'v1-wrong-key', 'direct-existing-decrypt-and-Nest-filter', { ciphertext: vectors[0], wrongKey: 'public-r0f-wrong-key', options }, await resultOf(() => service.decrypt(vectors[0], options)));
    delete process.env['R0F_SYNTHETIC_KEY_A'];
    delete process.env['R0F_SYNTHETIC_KEY_B'];
}

function controllerDoubles() {
    const audit = auditDouble();
    const { repository, platform, service } = sessionDoubles();
    const profile = {
        id: USER_ID,
        username: currentUser.username,
        displayName: 'R0F 合成身份',
        roles: [],
        permissions: currentUser.permissions,
        email: null,
        avatarUrl: null,
        isActive: true,
        lastLoginAt: null,
        emailVerified: false,
        phoneVerified: false,
        phone: null,
        orgUnits: []
    };
    const platformController = {
        ...platform,
        verifyCredentials: jest.fn().mockResolvedValue({ userId: USER_ID, username: currentUser.username, permissions: currentUser.permissions }),
        getSanitizedUserProfile: jest.fn().mockResolvedValue(profile)
    };
    const controller = new AuthController(platformController as never, audit as never, {} as never, service, cookieService);
    return { audit, repository, service, platform: platformController, controller, response: { setHeader: jest.fn() } };
}

async function controllerCases() {
    const absent = controllerDoubles();
    add(
        'controller',
        'public-session-no-cookie',
        'direct-existing-auth-controller-and-cookie-service; no-session-repository-call',
        { headers: {} },
        { output: await absent.controller.getCurrentAuthSession({ headers: {} }, absent.response), headers: absent.response.setHeader.mock.calls, repositoryCalls: callsOf(absent.repository) }
    );
    const anonymous = controllerDoubles();
    entropy(9);
    add(
        'controller',
        'public-anonymous-csrf',
        'direct-existing-auth-controller-session-service-cookie; repository-platform-audit-boundary-mocks',
        { now: NOW, randomBytes: '09'.repeat(32) },
        { output: await anonymous.controller.getCsrfToken(request(), anonymous.response), headers: anonymous.response.setHeader.mock.calls, repositoryCalls: callsOf(anonymous.repository) }
    );
    for (const code of Object.values(AuthSessionErrorCodeValue)) {
        const d = controllerDoubles();
        jest.spyOn(d.service, 'resolveSessionToken').mockRejectedValue(new AuthSessionAuthenticationError(code));
        add(
            'controller',
            `controller-${code}`,
            'direct-existing-controller-cookie-clearing-and-Nest-filter; synthetic-service-error',
            { cookie: 'poms_session=synthetic', code },
            { output: await resultOf(() => d.controller.getCurrentAuthSession({ headers: { cookie: 'poms_session=synthetic' } }, d.response)), headers: d.response.setHeader.mock.calls }
        );
    }
    const login = controllerDoubles();
    entropy(10);
    const output = await login.controller.createPasswordAuthSession({ username: currentUser.username, password: 'public-synthetic-password' }, request({ method: 'POST' }), login.response);
    expect(output.expiresAt).toBe('2026-05-13T01:15:00.000Z');
    expect(login.response.setHeader.mock.calls[0][1][0]).toContain('Expires=Wed, 13 May 2026 09:00:00 GMT');
    add(
        'controller',
        'password-session-success',
        'direct-existing-controller-session-cookie-services; credential-profile-persistence-audit-boundary-mocks',
        { now: NOW, randomByte: '0a', credentialResult: 'configured-active-user' },
        { output, headers: login.response.setHeader.mock.calls, repositoryCalls: callsOf(login.repository), platformCalls: callsOf(login.platform) }
    );
    const fail = controllerDoubles();
    fail.platform.verifyCredentials.mockResolvedValue(null);
    add(
        'controller',
        'invalid-credentials',
        'direct-existing-controller-and-Nest-filter; credential-result-boundary-mock',
        { username: currentUser.username, password: 'public-wrong-password' },
        {
            output: await resultOf(() => fail.controller.createPasswordAuthSession({ username: currentUser.username, password: 'public-wrong-password' }, request({ method: 'POST' }), fail.response)),
            auditCalls: callsOf(fail.audit),
            headers: fail.response.setHeader.mock.calls
        }
    );
    const logout = controllerDoubles();
    logout.repository.findByTokenHash.mockResolvedValue(session());
    logout.repository.revokeActiveSession.mockResolvedValue(session({ status: 'revoked', revokedReason: 'logout', revokedAt: new Date(NOW), rowVersion: 2 }));
    add(
        'controller',
        'logout-cookies-and-result',
        'direct-existing-controller-session-cookie-services; repository-boundary-mock; guards-tested-separately',
        { cookie: 'poms_session=synthetic-session-token' },
        { output: await logout.controller.logoutCurrentAuthSession({}, { headers: { cookie: 'poms_session=synthetic-session-token' } }, logout.response), headers: logout.response.setHeader.mock.calls, repositoryCalls: callsOf(logout.repository) }
    );
}

async function responseCases() {
    const pipe = new ZodValidationPipe();
    for (const [id, dto, value] of [
        ['login-valid-strips-extra', CreatePasswordAuthSessionRequestDto, { username: 'synthetic', password: 'public', extra: 'stripped' }],
        ['login-missing-password', CreatePasswordAuthSessionRequestDto, { username: 'synthetic' }],
        ['login-empty-both', CreatePasswordAuthSessionRequestDto, { username: '', password: '' }],
        ['logout-empty-valid', LogoutAuthSessionRequestDto, {}],
        ['logout-strict-extra', LogoutAuthSessionRequestDto, { extra: true }],
        ['pipe-non-zod-pass-through', Object, { extra: true, omitted: undefined, nullable: null }]
    ] as const) {
        add('response', id, 'direct-existing-global-ZodValidationPipe-real-DTO-schema-and-Nest-filter', { dto: dto.name, value }, await resultOf(() => pipe.transform(value, { type: 'body', metatype: dto })));
    }
    const interceptor = new ZodSerializerInterceptor(reflector);
    for (const [id, controller, handler] of [
        ['auth-current-session-runtime-passthrough', AuthController, AuthController.prototype.getCurrentAuthSession],
        ['health-runtime-passthrough', HealthController, HealthController.prototype.getLiveness]
    ] as const) {
        const raw = { marker: 'extra-field-is-currently-preserved', nullable: null, absent: undefined };
        const ctx = { getHandler: () => handler, getClass: () => controller } as unknown as ExecutionContext;
        expect(reflector.getAllAndOverride(ZodSerializerDtoOptions, [handler, controller])).toBeUndefined();
        const output = await lastValueFrom(interceptor.intercept(ctx, { handle: () => of(raw) }));
        expect(output).toBe(raw);
        add('response', id, 'direct-existing-interceptor-with-actual-controller-metadata; not-Swagger-DTO-filtering', { raw }, { responseSchemaMetadata: null, sameReference: output === raw, output });
    }
    for (const [id, raw] of [
        ['vendor-synthetic-schema-strip', { authenticated: false, status: null, user: null, permissions: [], expiresAt: null, csrf: { cookieName: 'poms_csrf', headerName: 'X-CSRF-Token' }, extra: 'removed' }],
        ['vendor-synthetic-schema-failure', { authenticated: false }]
    ] as const) {
        const ctx = context({}, [ZodSerializerDto(CurrentAuthSessionViewDto)]);
        add(
            'response',
            id,
            'synthetic-vendor-context; actual-interceptor-and-existing-DTO; no-current-endpoint-has-this-metadata',
            { dto: CurrentAuthSessionViewDto.name, raw },
            await resultOf(() => lastValueFrom(interceptor.intercept(ctx, { handle: () => of(raw) })))
        );
    }
    const stream = new StreamableFile(Buffer.from('synthetic'));
    const streamCtx = context({}, [ZodSerializerDto(CurrentAuthSessionViewDto)]);
    add('response', 'vendor-synthetic-stream-bypass', 'synthetic-vendor-context; actual-interceptor', { stream: 'synthetic' }, { sameReference: (await lastValueFrom(interceptor.intercept(streamCtx, { handle: () => of(stream) }))) === stream });
    for (const [id, error] of [
        ['nest-string-bad-request', new BadRequestException('synthetic bad input')],
        ['nest-string-forbidden', new ForbiddenException('synthetic forbidden')],
        ['nest-unknown-error', new Error('synthetic internal details')],
        ['nest-http-error-shape', { statusCode: 409, message: 'synthetic conflict' }]
    ] as const) {
        add('response', id, 'direct-installed-Nest12-BaseExceptionFilter; capture-adapter-only', { kind: id }, exceptionView(error));
    }
}

async function healthCases() {
    for (const [id, replies, connectError] of [
        ['health-live', [], null],
        ['health-ready', [{ ok: true }], null],
        ['health-connect-retry-ready', [{ ok: false, reason: 'Connection not established' }, { ok: true }], null],
        ['health-not-ready', [{ ok: false, reason: 'Synthetic DB unavailable' }], null],
        [
            'health-retry-still-fails',
            [
                { ok: false, reason: 'Connection not established' },
                { ok: false, reason: 'Synthetic retry failure' }
            ],
            null
        ],
        ['health-connect-throws', [{ ok: false, reason: 'Connection not established' }], new Error('Synthetic connect failure')],
        ['health-check-throws-error', [new Error('Synthetic check failure')], null],
        ['health-check-throws-unknown', ['synthetic failure'], null]
    ] as const) {
        const checkConnection = jest.fn();
        for (const reply of replies) {
            if (reply instanceof Error || typeof reply === 'string') checkConnection.mockRejectedValueOnce(reply);
            else checkConnection.mockResolvedValueOnce(reply);
        }
        const connect = connectError ? jest.fn().mockRejectedValue(connectError) : jest.fn().mockResolvedValue(undefined);
        const service = new HealthService({ checkConnection, connect } as never);
        const controller = new HealthController(service);
        const response = { status: jest.fn() };
        const output = id === 'health-live' ? controller.getLiveness() : await controller.getReadiness(response);
        if (id === 'health-live') expect(checkConnection).not.toHaveBeenCalled();
        add(
            'health',
            id,
            'direct-existing-health-service-controller; fake-ORM-never-opens-a-connection; frozen-time-uptime',
            { replies: replies.map((reply) => (reply instanceof Error ? { error: reply.message } : reply)), connectError: connectError?.message ?? null },
            { output, statusCalls: response.status.mock.calls, ormCalls: { checkConnection: checkConnection.mock.calls, connect: connect.mock.calls }, effectiveStatusFromGetDefaultAndController: response.status.mock.calls[0]?.[0] ?? 200 }
        );
    }
}

test('records deterministic existing implementation goldens without environment files, sockets, listeners or databases', async () => {
    const hermetic = (fs as any).__R0F_HERMETIC__;
    expect(hermetic).toBeDefined();
    hermetic.selfTest();
    jest.useFakeTimers({ now: new Date(NOW) });
    const uptime = jest.spyOn(process, 'uptime').mockReturnValue(123.987);
    try {
        await cookieCases();
        await sessionCases();
        await guardCases();
        await cipherCases();
        await controllerCases();
        await responseCases();
        await healthCases();
        expect(loaderEvidence.calls).toBeGreaterThan(0);
        expect(hermetic.evidence.protectedReadAttempts).toBe(0);
        expect(hermetic.evidence.networkAttempts).toBe(0);
        expect(hermetic.evidence.processAttempts).toBe(0);
        const output = process.env['R0F_AUTH_OUTPUT'];
        expect(output).toBeTruthy();
        writeFileSync(
            output as string,
            JSON.stringify({
                deterministicInputs: { now: NOW, timezone: 'UTC', uptimeSecondsRaw: 123.987, entropy: 'case-specific public fixed byte arrays; only randomBytes is mocked', csrfAndCipherKeys: 'synthetic-only; never production material' },
                hermetic: { ...hermetic.evidence, envLoader: loaderEvidence },
                cases
            })
        );
    } finally {
        uptime.mockRestore();
        jest.useRealTimers();
    }
}, 60000);
