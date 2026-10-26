// Real owned HTTP sockets + historical PG15 schema, with no repository doubles.
// Default --check performs source loading/metadata checks only, without I/O.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { Module } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { hashSync } from 'bcryptjs';
import { createServices, entities, originalModules, provenance, read, root, sha } from './session-source.mjs';

const require = createRequire(import.meta.url);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const mode = process.argv[2] ?? '--check';
assert(process.argv.length <= 3 && ['--check', '--execute'].includes(mode), 'Usage: http-database.mjs --check|--execute');
const scopes = ['apps/poms-api/src', 'libs/api/contracts/src', 'libs/shared/contracts/src', 'libs/vendor/nestjs-zod/src', 'package.json', 'pnpm-lock.yaml', '.gitattributes'];
const sourceHead = '1013afef266602e7c98eb433bd0f14483be3d7fd';
for (const args of [
    ['diff', '--name-only', '--no-ext-diff', sourceHead],
    ['diff', '--cached', '--name-only', '--no-ext-diff', sourceHead],
    ['ls-files', '--others', '--exclude-standard']
])
    assert.equal(execFileSync('git', [...args, '--', ...scopes], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(), '', 'Real HTTP source differs from freeze');

const authPrefix = 'apps/poms-api/src/app/core/auth/';
const auditPrefix = 'apps/poms-api/src/app/core/runtime-audit/';
const sharedFile = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const vendorPrefix = 'libs/vendor/nestjs-zod/src/';
const apiDtos = ['libs/api/contracts/src/lib/auth/user.dto.ts', 'libs/api/contracts/src/lib/identity-provider/identity-provider.dto.ts'];
const cache = new Map(originalModules);
const manifest = new Map(provenance().sourceManifest.map((entry) => [entry.file, entry.sha256]));
const packageImports = new Set(['@nestjs/common', '@nestjs/core', '@nestjs/swagger', '@mikro-orm/core', '@mikro-orm/nestjs', 'zod', 'zod/v3', 'zod/v4/core', 'rxjs', 'deepmerge', 'node:util']);
const environment = Object.freeze({ NODE_ENV: 'test', AUTH_COOKIE_SECURE: false, AUTH_COOKIE_PATH: '/api', AUTH_SESSION_IDLE_TIMEOUT_SECONDS: 900, AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS: 28800, AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS: 60 });
class UnusedIdentityProviderToken {}
let envLoaderCalls = 0;
function load(file) {
    if (cache.has(file)) return cache.get(file);
    assert(
        file.startsWith(authPrefix) || file.startsWith(auditPrefix) || file.startsWith(vendorPrefix) || apiDtos.includes(file) || file === sharedFile || file === 'apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts',
        'Unapproved HTTP source module'
    );
    const source = read(file);
    manifest.set(file, sha(source));
    const module = { exports: {} };
    cache.set(file, module.exports);
    function resolve(specifier) {
        if (specifier === '@poms/shared-contracts') return load(sharedFile);
        if (specifier === '@poms/api-contracts') {
            const index = 'libs/api/contracts/src/index.ts';
            manifest.set(index, sha(read(index)));
            return Object.assign({}, ...apiDtos.map(load));
        }
        if (specifier === '@poms/vendor-nestjs-zod') return load(`${vendorPrefix}index.ts`);
        if (specifier.startsWith('.')) {
            const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), `${specifier}.ts`));
            if (target === 'apps/poms-api/src/config/load-env.ts')
                return {
                    loadValidatedEnv: () => {
                        envLoaderCalls += 1;
                        return { ...environment };
                    }
                };
            if (target === 'apps/poms-api/src/app/features/identity-provider/identity-provider.service.ts') return { IdentityProviderService: UnusedIdentityProviderToken };
            return load(target);
        }
        assert(packageImports.has(specifier), `Unapproved HTTP source dependency: ${specifier}`);
        return require(specifier);
    }
    const transformed = ts.transpileModule(source, {
        fileName: file,
        reportDiagnostics: true,
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            esModuleInterop: true
        }
    });
    assert(!transformed.diagnostics?.some((entry) => entry.category === ts.DiagnosticCategory.Error), 'Actual HTTP TS did not transpile');
    new vm.Script(transformed.outputText, { filename: file }).runInContext(
        vm.createContext({
            module,
            exports: module.exports,
            require: resolve,
            // The original cookie path reads process.env directly. Supply only
            // the public controlled snapshot, never the parent environment.
            process: { env: { AUTH_COOKIE_PATH: '/api', NODE_ENV: 'test' } },
            Reflect,
            Buffer,
            Date,
            Array,
            Object,
            Set,
            Map,
            Number,
            String,
            Boolean,
            Error,
            TypeError,
            RangeError,
            Symbol,
            Promise,
            RegExp,
            Math,
            JSON,
            BigInt,
            NaN,
            Infinity,
            undefined
        }),
        { timeout: 10000 }
    );
    cache.set(file, module.exports);
    return module.exports;
}
const { AuthController } = load(`${authPrefix}auth.controller.ts`);
const { AuthSessionCookieService } = load(`${authPrefix}auth-session-cookie.service.ts`);
assert(new AuthSessionCookieService().createCsrfCookieHeader('public-preflight-token', new Date(Date.now() + 1000)).includes('; Path=/api;'), 'Original cookie path must work with the synthetic process snapshot');
const { SessionAuthGuard } = load(`${authPrefix}guards/session-auth.guard.ts`);
const { AuthCsrfGuard } = load(`${authPrefix}guards/auth-csrf.guard.ts`);
const { PermissionsGuard } = load(`${authPrefix}guards/permissions.guard.ts`);
const { RuntimeAuditService } = load(`${auditPrefix}runtime-audit.service.ts`);
const { RuntimeAuditRepository } = load(`${auditPrefix}runtime-audit.repository.ts`);
const { ZodValidationPipe, ZodSerializerInterceptor } = load(`${vendorPrefix}index.ts`);
const { PlatformService } = originalModules.get('apps/poms-api/src/app/features/platform/platform.service.ts');
const { AuthSessionService } = originalModules.get(`${authPrefix}auth-session.service.ts`);
assert.equal(Reflect.getMetadata('design:paramtypes', AuthController.prototype, 'createPasswordAuthSession')[0], load(apiDtos[0]).CreatePasswordAuthSessionRequestDto, 'Original DTO runtime metadata was not emitted');
const corsOrigin = 'https://r1c-http.invalid';
const mainFile = 'apps/poms-api/src/main.ts';
const mainText = read(mainFile);
manifest.set(mainFile, sha(mainText));
const mainAst = ts.createSourceFile(mainFile, mainText, ts.ScriptTarget.Latest, true);
const corsFunctions = mainAst.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'buildCorsOptions');
assert.equal(corsFunctions.length, 1, 'Original CORS builder must exist exactly once');
const corsModule = { exports: {} };
const corsText = ts.transpileModule(`${corsFunctions[0].getText()}\nmodule.exports=buildCorsOptions;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
new vm.Script(corsText, { filename: mainFile }).runInNewContext({ module: corsModule, Error, AUTH_CSRF_HEADER_NAME: load(`${authPrefix}auth-session-cookie.service.ts`).AUTH_CSRF_HEADER_NAME }, { timeout: 5000 });
const corsOptions = corsModule.exports(corsOrigin);
const sourceManifest = [...manifest.keys()].sort().map((file) => ({ file, sha256: manifest.get(file) }));
const sourceManifestSha256 = sha(JSON.stringify(sourceManifest));
const generatorSha256 = sha(read('tools/rust-r1c/http-database.mjs'));
const ownedPorts = new Set();

if (mode === '--check') {
    console.log(JSON.stringify({ result: 'pass', mode, database: false, listener: false, sourceFiles: sourceManifest.length, sourceManifestSha256, generatorSha256, originalDtoMetadata: true }));
} else {
    await execute();
}

async function execute() {
    let phase = 'input-guard';
    let appPassword = '';
    let temporary;
    let orm;
    let nest;
    let rust;
    let latestObservation;
    let summary;
    const clients = [];
    const created = new Map();
    const runId = randomUUID();
    const fixture = { user: randomUUID(), role: randomUUID(), orgs: [randomUUID(), randomUUID(), randomUUID()], username: `r1c_http_${runId}`, requestIds: [] };
    const expectedOrgUnits = fixture.orgs.map((id, index) => ({ id, name: `R1C HTTP org ${id}`, code: id, description: null, membershipType: ['primary', 'secondary', 'future-membership'][index] }));
    const observations = [];
    const originalWriteTrace = [];
    const originalPermissionSelects = new Set();
    const originalMembershipSelects = new Set();
    const originalRoleAssignmentSelects = new Set();
    const rawPermissionOrders = [];
    const rawOrganizationOrders = [];
    const requestContexts = [];
    const assertions = [];
    function check(name, value) {
        assert(value, name);
        assertions.push(name);
    }
    const settings = (database) => ({ host: '127.0.0.1', port: 15432, database, user: 'poms_r1c_app', password: appPassword, ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 5000, application_name: 'poms-r1c-real-http-validation' });
    async function guard(client, database) {
        const {
            rows: [row]
        } = await client.query(`SELECT current_database() AS database_name,current_setting('server_version_num') AS version,
            current_setting('port') AS port,current_setting('poms.r0e_isolated',true) AS isolated,
            session_user::text AS session_name,current_user::text AS current_name,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,
            (SELECT count(*)::int FROM pg_auth_members m WHERE m.member=r.oid) AS role_memberships,
            has_schema_privilege(current_user,'poms','CREATE') AS schema_create FROM pg_roles r WHERE r.rolname=current_user`);
        assert.deepEqual(
            row,
            {
                database_name: database,
                version: '150012',
                port: '15432',
                isolated: 'on',
                session_name: 'poms_r1c_app',
                current_name: 'poms_r1c_app',
                rolsuper: false,
                rolcreatedb: false,
                rolcreaterole: false,
                rolbypassrls: false,
                rolreplication: false,
                role_memberships: 0,
                schema_create: false
            },
            'Dedicated non-admin PG15 target must be verified before product SQL'
        );
    }
    try {
        assert.equal(process.env.POMS_R1C_DATABASE_TEST, '1', 'Explicit R1C opt-in is required');
        assert(!Object.hasOwn(process.env, 'PGOPTIONS'), 'Inherited PGOPTIONS is rejected');
        assert(!Object.keys(process.env).some((key) => key.startsWith('MIKRO_ORM_')), 'Inherited ORM options are rejected');
        const match = /^postgres:\/\/poms_r1c_app:([0-9a-f]{64})@127\.0\.0\.1:15432\/poms_r1c_rust$/.exec(process.env.POMS_R1C_DATABASE_TEST_URL ?? '');
        assert(match, 'Use only the exact isolated R1C app URL');
        appPassword = match[1];
        for (const database of ['poms_r1c_nest', 'poms_r1c_rust']) {
            const client = new Client(settings(database));
            await client.connect();
            try {
                await guard(client, database);
            } catch (error) {
                await client.end();
                throw error;
            }
            clients.push(client);
            created.set(client, { user: false, role: false, orgs: [] });
        }
        phase = 'synthetic-fixture';
        const passwordHash = hashSync('public HTTP acceptance password', '$2b$04$abcdefghijklmnopqrstuu');
        for (const client of clients) {
            await client.query('INSERT INTO poms.platform_user(id,username,display_name) VALUES($1,$2,$3)', [fixture.user, fixture.username, 'R1C real HTTP 合成用户']);
            created.get(client).user = true;
            await client.query('INSERT INTO poms.local_credential(user_id,password_hash) VALUES($1,$2)', [fixture.user, passwordHash]);
            await client.query('INSERT INTO poms.role(id,role_key,name) VALUES($1,$2,$3)', [fixture.role, fixture.role, 'R1C HTTP role']);
            created.get(client).role = true;
            await client.query('INSERT INTO poms.user_role_assignment(user_id,role_id) VALUES($1,$2)', [fixture.user, fixture.role]);
            for (const permission of ['project:read', 'future:raw:permission']) await client.query('INSERT INTO poms.role_permission_assignment(role_id,permission_key) VALUES($1,$2)', [fixture.role, permission]);
            for (let index = 0; index < fixture.orgs.length; index++) {
                const org = fixture.orgs[index];
                await client.query('INSERT INTO poms.org_unit(id,name,code,is_active) VALUES($1,$2,$3,$4)', [org, `R1C HTTP org ${org}`, org, index !== 1]);
                created.get(client).orgs.push(org);
                await client.query('INSERT INTO poms.user_org_membership(user_id,org_unit_id,membership_type) VALUES($1,$2,$3)', [fixture.user, org, ['primary', 'secondary', 'future-membership'][index]]);
            }
        }
        phase = 'actual-nest-start';
        const config = settings('poms_r1c_nest');
        orm = await MikroORM.init({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            dbName: config.database,
            schema: 'poms',
            entities: Object.values(entities),
            ensureDatabase: false,
            debug: false,
            logger: () => undefined,
            driverOptions: { ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 5000, options: '-c timezone=Etc/GMT-8 -c search_path=poms,public' },
            pool: { min: 0, max: 5 },
            onQuery: (sql, parameters) => {
                if (/^\s*select\b/i.test(sql)) {
                    const safeSql = sql.replace(/'(?:''|[^'])*'/g, "'<literal>'");
                    if (/role_permission_assignment/i.test(sql)) originalPermissionSelects.add(safeSql);
                    if (/user_org_membership/i.test(sql)) originalMembershipSelects.add(safeSql);
                    if (/user_role_assignment/i.test(sql)) originalRoleAssignmentSelects.add(safeSql);
                }
                if (/\b(?:update|insert\s+into)\s+(?:"?poms"?\.)?"?(?:auth_session|security_event)"?/i.test(sql)) {
                    originalWriteTrace.push({
                        phase,
                        sql: sql.replace(/'(?:''|[^'])*'/g, "'<literal>'"),
                        parameters: parameters.map((value) =>
                            value === null || typeof value === 'number' || typeof value === 'boolean'
                                ? value
                                : value instanceof Date
                                  ? '<date>'
                                  : typeof value === 'string' && /^(?:[0-9a-f-]{36}|active|revoked|expired|logout|account-disabled)$/.test(value)
                                    ? value
                                    : '<redacted>'
                        )
                    });
                }
                return sql;
            }
        });
        const { session, platform } = createServices(orm.em);
        const audit = new RuntimeAuditService(new RuntimeAuditRepository(orm.em.getRepository(entities.AuditLog), orm.em.getRepository(entities.SecurityEvent)));
        const cookies = new AuthSessionCookieService();
        const reflector = new Reflector();
        class ControlledAuthModule {}
        Module({
            controllers: [AuthController],
            providers: [
                { provide: PlatformService, useValue: platform },
                { provide: RuntimeAuditService, useValue: audit },
                { provide: UnusedIdentityProviderToken, useValue: {} },
                { provide: AuthSessionService, useValue: session },
                { provide: AuthSessionCookieService, useValue: cookies }
            ]
        })(ControlledAuthModule);
        nest = await NestFactory.create(ControlledAuthModule, { logger: false });
        nest.use((_request, _response, next) =>
            RequestContext.create(orm.em, () => {
                requestContexts.push({ phase, emId: RequestContext.getEntityManager()?.id });
                return next();
            })
        );
        nest.setGlobalPrefix('api');
        nest.enableCors(corsOptions);
        nest.useGlobalGuards(new SessionAuthGuard(reflector, session, cookies, audit), new AuthCsrfGuard(reflector, session, cookies, audit), new PermissionsGuard(reflector, audit));
        nest.useGlobalPipes(new ZodValidationPipe());
        nest.useGlobalInterceptors(new ZodSerializerInterceptor(reflector));
        await nest.listen(0, '127.0.0.1');
        const nestPort = nest.getHttpServer().address().port;
        ownedPorts.add(nestPort);
        phase = 'actual-rust-start';
        temporary = await mkdtemp(path.join(os.tmpdir(), 'poms-r1c-real-http-'));
        const rustPort = await freePort();
        const env = {
            NODE_ENV: 'test',
            HOST: '127.0.0.1',
            PORT: String(rustPort),
            JWT_SECRET: 'public-http-acceptance-key-32-characters',
            DB_CONNECT: 'true',
            DB_HOST: '127.0.0.1',
            DB_PORT: '15432',
            DB_DATABASE: 'poms_r1c_rust',
            DB_USER: 'poms_r1c_app',
            DB_PASSWORD: appPassword,
            CORS_ORIGIN: corsOrigin,
            AUTH_COOKIE_SECURE: '',
            AUTH_COOKIE_PATH: '/api',
            AUTH_SESSION_IDLE_TIMEOUT_SECONDS: '900',
            AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS: '28800',
            AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS: '60'
        };
        for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TMP', 'TEMP', 'TMPDIR']) if (process.env[key] !== undefined) env[key] = process.env[key];
        const child = spawn('/target/release/poms-api-rust', [], { cwd: temporary, env, stdio: ['ignore', 'pipe', 'pipe'] });
        rust = { child, output: '', spawned: false };
        child.stdout.on('data', (data) => {
            rust.output += data.toString();
        });
        child.stderr.on('data', (data) => {
            rust.output += data.toString();
        });
        await once(child, 'spawn');
        rust.spawned = true;
        const deadline = Date.now() + 10000;
        while (true) {
            assert(child.exitCode === null, 'Owned Rust process exited during startup');
            const listening = rust.output.split('\n').some((line) => {
                try {
                    const record = JSON.parse(line);
                    return record.event === 'listening' && record.fields?.address === `127.0.0.1:${rustPort}`;
                } catch {
                    return false;
                }
            });
            if (listening) {
                ownedPorts.add(rustPort);
                try {
                    if ((await request(rustPort, 'GET', '/api/health/readiness')).status === 200) break;
                } catch {
                    /* Owned startup pending. */
                }
            }
            assert(Date.now() < deadline, 'Owned Rust readiness deadline');
            await delay(25);
        }
        async function exercise(label, port, client) {
            const jar = new Map();
            const results = [];
            let sequence = 0;
            let expectedPermissions = ['project:read', 'future:raw:permission'];
            async function send(id, method, route, body, options = {}) {
                phase = `${label}/${id}`;
                sequence += 1;
                const requestId = options.requestId ?? `r1c:${runId}:${sequence}`;
                fixture.requestIds.push(requestId);
                const headers = { origin: corsOrigin, 'x-request-id': requestId, 'user-agent': 'r1c-real-http-validation', 'x-forwarded-for': '192.0.2.25' };
                const selected = options.jar ?? jar;
                if (selected.size) headers.cookie = [...selected].map(([key, value]) => `${key}=${value}`).join('; ');
                if (method === 'POST') {
                    headers['content-type'] = 'application/json';
                    if (selected.has('poms_csrf')) headers['x-csrf-token'] = selected.get('poms_csrf');
                }
                Object.assign(headers, options.headers);
                const before = Date.now();
                const response = await request(port, method, route, headers, body === undefined ? undefined : JSON.stringify(body));
                const after = Date.now();
                const normalizedCookies = [];
                const expiryHeaders = [];
                for (const header of response.cookies) {
                    const [pair, ...attributes] = header.split('; ');
                    const [name, value] = pair.split('=');
                    const data = Object.fromEntries(
                        attributes.map((entry) => {
                            const equal = entry.indexOf('=');
                            return equal < 0 ? [entry, true] : [entry.slice(0, equal), entry.slice(equal + 1)];
                        })
                    );
                    assert.deepEqual(Object.keys(data).sort(), ['Expires', 'Max-Age', 'Path', 'SameSite', ...(name === 'poms_session' ? ['HttpOnly'] : [])].sort(), 'Cookie attribute set must exactly match the original service');
                    check(`${label}/${id}/cookie-attributes`, data.Path === '/api' && data.SameSite === 'Lax' && !data.Secure && (name === 'poms_session' ? data.HttpOnly === true : !data.HttpOnly));
                    if (Number(data['Max-Age']) === 0) {
                        check(`${label}/${id}/cookie-clear`, value === '' && data.Expires === 'Thu, 01 Jan 1970 00:00:00 GMT');
                        jar.delete(name);
                    } else {
                        check(`${label}/${id}/cookie-entropy`, /^[A-Za-z0-9_-]{43}$/.test(value));
                        check(`${label}/${id}/cookie-expiry`, Number(data['Max-Age']) > 0 && Number(data['Max-Age']) <= 28800 && Date.parse(data.Expires) >= before - 1000);
                        jar.set(name, value);
                    }
                    normalizedCookies.push({ name, httpOnly: data.HttpOnly === true, path: data.Path, sameSite: data.SameSite, secure: Boolean(data.Secure), clear: Number(data['Max-Age']) === 0 });
                    if (Number(data['Max-Age']) > 0) expiryHeaders.push({ name, expires: Date.parse(data.Expires), maxAge: Number(data['Max-Age']) });
                }
                const bodyValue = structuredClone(response.body);
                if (bodyValue?.permissions !== undefined) {
                    const permissions = response.body.permissions;
                    check(`${label}/${id}/permissions-raw-strings`, Array.isArray(permissions) && permissions.every((value) => typeof value === 'string'));
                    check(`${label}/${id}/permissions-first-occurrence-set`, new Set(permissions).size === permissions.length);
                    const expected = response.body.authenticated === true ? expectedPermissions : [];
                    assert.deepEqual(new Set(permissions), new Set(expected), 'Every raw permission, including unknown values, must match this fixture exactly');
                    if (response.body.authenticated === true) assert.deepEqual(response.body.user?.permissions, permissions, 'Top-level and profile permission order must agree before normalization');
                    rawPermissionOrders.push({ server: label, id, permissions: [...permissions], userPermissions: response.body.user ? [...response.body.user.permissions] : null });
                    // These two arrays derive from a source SELECT without
                    // ORDER BY. Only the checked comparison copy is canonical;
                    // product wire values stay intact.
                    bodyValue.permissions = [...permissions].sort();
                    if (bodyValue.user) bodyValue.user.permissions = [...response.body.user.permissions].sort();
                }
                if (response.body?.user) {
                    assert.deepEqual(response.body.user.roles, ['R1C HTTP role'], 'The single-assignment fixture role array remains an exact ordered comparison');
                    bodyValue.user.orgUnits = checkedOrganizationComparison(response.body.user.orgUnits, expectedOrgUnits);
                    rawOrganizationOrders.push({ server: label, id, orgUnits: structuredClone(response.body.user.orgUnits) });
                    check(`${label}/${id}/complete-raw-org-memberships`, true);
                }
                check(`${label}/${id}/credentialed-cors`, response.cors.allowOrigin === corsOrigin && response.cors.allowCredentials === 'true');
                if (bodyValue?.token !== undefined) {
                    check(`${label}/${id}/token-shape`, /^[A-Za-z0-9_-]{43}$/.test(bodyValue.token));
                    check(`${label}/${id}/token-cookie-match`, bodyValue.token === jar.get('poms_csrf'));
                    bodyValue.token = '<checked-random-csrf>';
                }
                if (bodyValue?.expiresAt !== undefined && bodyValue.expiresAt !== null) {
                    const date = Date.parse(bodyValue.expiresAt);
                    check(`${label}/${id}/expiry-ms`, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(bodyValue.expiresAt) && date >= before && date <= after + 900000);
                    bodyValue.expiresAt = '<checked-future-ms-date>';
                }
                if (route === '/api/auth/csrf-token' && response.status === 200) {
                    check(
                        `${label}/${id}/csrf-cookie-uses-response-expiry`,
                        expiryHeaders.every((entry) => entry.expires === Math.floor(Date.parse(response.body.expiresAt) / 1000) * 1000)
                    );
                    const expires = Date.parse(response.body.expiresAt);
                    check(
                        `${label}/${id}/csrf-cookie-max-age`,
                        expiryHeaders.every((entry) => entry.maxAge >= Math.max(0, Math.floor((expires - after - 1) / 1000)) && entry.maxAge <= Math.max(0, Math.floor((expires - before + 1) / 1000)))
                    );
                }
                if (jar.has('poms_session')) {
                    const {
                        rows: [stored]
                    } = await client.query('SELECT csrf_token_hash,idle_expires_at,absolute_expires_at FROM poms.auth_session WHERE token_hash=$1', [tokenHash(jar.get('poms_session'))]);
                    check(`${label}/${id}/session-only-hash-at-rest`, Boolean(stored));
                    if (response.body?.authenticated === true) check(`${label}/${id}/response-expiry-is-db-min`, Date.parse(response.body.expiresAt) === Math.min(stored.idle_expires_at.getTime(), stored.absolute_expires_at.getTime()));
                    if (route === '/api/auth/sessions' && response.status === 200) {
                        check(`${label}/${id}/login-cookies-use-absolute-expiry`, expiryHeaders.length === 2 && expiryHeaders.every((entry) => entry.expires === Math.floor(stored.absolute_expires_at.getTime() / 1000) * 1000));
                        const expires = stored.absolute_expires_at.getTime();
                        check(
                            `${label}/${id}/login-cookie-max-age`,
                            expiryHeaders.every((entry) => entry.maxAge >= Math.max(0, Math.floor((expires - after - 1) / 1000)) && entry.maxAge <= Math.max(0, Math.floor((expires - before + 1) / 1000)))
                        );
                    }
                    check(`${label}/${id}/csrf-hash-at-rest`, tokenHash(jar.get('poms_csrf')) === stored.csrf_token_hash);
                }
                check(`${label}/${id}/no-sensitive-wire-fields`, !/(?:passwordHash|password_hash|tokenHash|token_hash|csrfTokenHash|csrf_token_hash)/.test(JSON.stringify(response.body)));
                const { rows: events } = await client.query(
                    `SELECT event_type,severity,actor_id,principal,request_id,path,method,permission_key,result,ip,user_agent,details
                    FROM poms.security_event WHERE request_id=$1 ORDER BY occurred_at,id`,
                    [requestId]
                );
                const { rows: states } = await client.query(
                    `SELECT status,revoked_reason,row_version,created_ip,last_ip,created_user_agent FROM poms.auth_session
                    WHERE user_id=$1 ORDER BY created_at,id`,
                    [fixture.user]
                );
                const normalized = { id, status: response.status, body: bodyValue, contentType: response.contentType, cookies: normalizedCookies, cors: response.cors, events, states };
                latestObservation = normalized;
                results.push(normalized);
                return { ...response, normalized };
            }
            const sessionPath = '/api/auth/session',
                csrfPath = '/api/auth/csrf-token',
                loginPath = '/api/auth/sessions',
                logoutPath = '/api/auth/session:logout';
            const loginBody = { username: fixture.username, password: 'public HTTP acceptance password' };
            const preflight = await send('cors-preflight', 'OPTIONS', loginPath, undefined, { headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type,x-csrf-token' } });
            check(`${label}/preflight`, preflight.status === 204 && preflight.normalized.cors.allowMethods.includes('POST') && preflight.normalized.cors.allowHeaders.includes('x-csrf-token'));
            check(`${label}/anonymous-session`, (await send('anonymous-session', 'GET', sessionPath)).status === 200);
            check(`${label}/anonymous-csrf`, (await send('anonymous-csrf', 'GET', csrfPath)).status === 200);
            check(`${label}/bad-credentials`, (await send('bad-credentials', 'POST', loginPath, { ...loginBody, password: 'public wrong password' })).status === 401);
            check(`${label}/login`, (await send('login', 'POST', loginPath, { ...loginBody, ignored: 'strip-this' })).status === 200);
            const initialToken = jar.get('poms_session');
            const initialCsrf = jar.get('poms_csrf');
            check(`${label}/login-two-cookies`, Boolean(initialToken) && Boolean(initialCsrf));
            const first = await send('current-session', 'GET', sessionPath);
            check(`${label}/real-multi-org`, first.body.user.orgUnits.length === 3 && first.body.user.orgUnits.some((entry) => entry.membershipType === 'future-membership'));
            check(`${label}/current-permissions-initial`, first.body.permissions.includes('future:raw:permission'));
            await client.query('DELETE FROM poms.role_permission_assignment WHERE role_id=$1 AND permission_key=$2', [fixture.role, 'project:read']);
            expectedPermissions = ['future:raw:permission'];
            check(`${label}/current-permissions-fresh`, !(await send('permissions-changed', 'GET', sessionPath)).body.permissions.includes('project:read'));
            await client.query("UPDATE poms.auth_session SET last_seen_at=now()-interval '61 seconds' WHERE token_hash=$1", [tokenHash(initialToken)]);
            const touched = await send('touch-due', 'GET', sessionPath);
            check(`${label}/touch-incremented-version`, touched.normalized.states[0].row_version === 2);
            check(`${label}/csrf-rotate`, (await send('csrf-rotate', 'GET', csrfPath)).status === 200);
            const currentCsrf = jar.get('poms_csrf');
            check(`${label}/csrf-changed`, currentCsrf !== initialCsrf);
            const staleJar = new Map(jar);
            staleJar.set('poms_csrf', initialCsrf);
            // Force the successful auth phase to touch the managed session;
            // its following failed CSRF audit flush must persist dirty changes.
            await client.query("UPDATE poms.auth_session SET last_seen_at=now()-interval '61 seconds' WHERE token_hash=$1", [tokenHash(initialToken)]);
            check(`${label}/old-csrf-rejected`, (await send('old-csrf-rejected', 'POST', logoutPath, {}, { jar: staleJar })).status === 403);
            const beforeLogout = new Map(jar);
            // Success logout has no audit flush: do not infer an extra version
            // merely from touching before its second repository lookup.
            await client.query("UPDATE poms.auth_session SET last_seen_at=now()-interval '61 seconds' WHERE token_hash=$1", [tokenHash(initialToken)]);
            check(`${label}/logout-revoked`, (await send('logout', 'POST', logoutPath, {})).body.revoked === true);
            check(`${label}/post-logout-anonymous`, (await send('post-logout-anonymous', 'GET', sessionPath)).body.authenticated === false);
            check(`${label}/revoked-protected-error`, (await send('revoked-protected-error', 'POST', logoutPath, {}, { jar: beforeLogout })).body.code === 'session_revoked');
            check(`${label}/missing-session-before-csrf`, (await send('logout-no-session', 'POST', logoutPath, {}, { jar: new Map() })).body.code === 'session_missing');
            await send('csrf-for-disabled-login', 'GET', csrfPath);
            await send('login-for-disabled', 'POST', loginPath, loginBody);
            await client.query('UPDATE poms.platform_user SET is_active=false WHERE id=$1', [fixture.user]);
            const disabled = await send('account-disabled', 'GET', sessionPath);
            check(`${label}/account-disabled`, disabled.status === 401 && disabled.body.code === 'account_disabled');
            await client.query('UPDATE poms.platform_user SET is_active=true WHERE id=$1', [fixture.user]);
            jar.clear();
            await send('csrf-for-audit-failure', 'GET', csrfPath);
            await send('login-for-audit-failure', 'POST', loginPath, loginBody);
            await client.query("UPDATE poms.auth_session SET idle_expires_at=now()-interval '1 second' WHERE token_hash=$1", [tokenHash(jar.get('poms_session'))]);
            const auditFailure = await send('protected-expiry-audit-failure', 'POST', logoutPath, {}, { requestId: `r1c-fail:${runId}:${'x'.repeat(20)}` });
            check(`${label}/audit-failure-is-500`, auditFailure.status === 500);
            check(`${label}/raw-expiry-survives-audit-failure`, auditFailure.normalized.states.at(-1).row_version === 2 && auditFailure.normalized.states.at(-1).status === 'expired' && auditFailure.normalized.events.length === 0);
            jar.clear();
            await send('csrf-for-expired-login', 'GET', csrfPath);
            await send('login-for-expired', 'POST', loginPath, loginBody);
            const expiredToken = jar.get('poms_session');
            await client.query("UPDATE poms.auth_session SET idle_expires_at=now()-interval '1 second' WHERE token_hash=$1", [tokenHash(expiredToken)]);
            const expired = await send('session-expired', 'GET', sessionPath);
            check(`${label}/session-expired`, expired.status === 401 && expired.body.code === 'session_expired');
            await send('csrf-for-protected-expiry', 'GET', csrfPath);
            await send('login-for-protected-expiry', 'POST', loginPath, loginBody);
            await client.query("UPDATE poms.auth_session SET idle_expires_at=now()-interval '1 second' WHERE token_hash=$1", [tokenHash(jar.get('poms_session'))]);
            check(`${label}/expired-protected-audited`, (await send('protected-session-expired', 'POST', logoutPath, {})).body.code === 'session_expired');
            // Guard failures deliberately keep the old cookies. Start the next
            // independent login with a new anonymous jar, as a fresh browser.
            jar.clear();
            await send('csrf-for-protected-disabled', 'GET', csrfPath);
            await send('login-for-protected-disabled', 'POST', loginPath, loginBody);
            await client.query('UPDATE poms.platform_user SET is_active=false WHERE id=$1', [fixture.user]);
            check(`${label}/disabled-protected-audited`, (await send('protected-account-disabled', 'POST', logoutPath, {})).body.code === 'account_disabled');
            await client.query('UPDATE poms.platform_user SET is_active=true WHERE id=$1', [fixture.user]);
            const {
                rows: [account]
            } = await client.query('SELECT last_login_at FROM poms.platform_user WHERE id=$1', [fixture.user]);
            check(`${label}/login-does-not-update-last-login-at`, account.last_login_at === null);
            return results;
        }
        const reference = await exercise('nest', nestPort, clients[0]);
        const actual = await exercise('rust', rustPort, clients[1]);
        phase = 'cross-http-compare';
        check('actual-original-permission-select-was-observed', originalPermissionSelects.size > 0);
        check(
            'actual-original-permission-select-has-no-order-by',
            [...originalPermissionSelects].every((sql) => !/\border\s+by\b/i.test(sql))
        );
        check('actual-original-membership-select-was-observed', originalMembershipSelects.size > 0);
        check(
            'actual-original-membership-select-has-no-order-by',
            [...originalMembershipSelects].every((sql) => !/\border\s+by\b/i.test(sql))
        );
        check('actual-original-role-assignment-select-was-observed', originalRoleAssignmentSelects.size > 0);
        check(
            'actual-original-role-assignment-select-has-no-order-by',
            [...originalRoleAssignmentSelects].every((sql) => !/\border\s+by\b/i.test(sql))
        );
        assert.deepEqual(actual, reference, 'Real Nest/Rust HTTP, cookie attributes, session SQL states and security events must agree');
        observations.push(...actual);
        check('original-env-loader-was-used', envLoaderCalls > 0);
        check('rust-logs-no-database-secret', !rust.output.includes(appPassword));
        summary = {
            result: 'pass',
            kind: 'real-http-and-pg15',
            sourceHead,
            sourceManifestSha256,
            generatorSha256,
            casesPerServer: actual.length,
            assertions: assertions.length,
            routes: ['POST /api/auth/sessions', 'GET /api/auth/session', 'GET /api/auth/csrf-token', 'POST /api/auth/session:logout'],
            databases: ['poms_r1c_nest', 'poms_r1c_rust'],
            originalDtoMetadata: true,
            realMikroOrm: true,
            requestContext: true,
            originalEnvLoaderCalls: envLoaderCalls,
            permissionOrderEvidence: {
                classification: 'accepted-db-specific-difference',
                source: 'PlatformRepository.findActiveRolePermissionAssignments; PlatformService.getPermissionsForUser filter/map/Set',
                originalSelects: [...originalPermissionSelects],
                normalizationPaths: ['body.permissions', 'body.user.permissions'],
                checks: 'string array, unique first-occurrence set, exact fixture raw membership including unknown keys, top-level/profile original sequence equality',
                productOrderChanged: false,
                rawObservations: rawPermissionOrders
            },
            organizationOrderEvidence: {
                classification: 'accepted-db-specific-difference',
                source: 'PlatformRepository.findActiveUserOrgMemberships; PlatformService.#buildUserOrgUnits filter/flatMap',
                originalSelects: [...originalMembershipSelects],
                normalizationPaths: ['body.user.orgUnits'],
                checks: 'unique ids and complete exact fixture objects; primary, secondary, unknown membership and inactive organization are retained',
                expectedFixtureObjects: expectedOrgUnits,
                inactiveOrganizationId: fixture.orgs[1],
                productOrderChanged: false,
                rawObservations: rawOrganizationOrders
            },
            roleOrderEvidence: {
                classification: 'strict-single-assignment-comparison',
                source: 'PlatformRepository.findActiveUserRoleAssignments; PlatformService.#loadUserAggregationContext current.push(role.name)',
                originalSelects: [...originalRoleAssignmentSelects],
                activeFixtureAssignments: 1,
                normalized: false,
                limitation: 'No cross-database ordering assertion for multiple role assignments'
            },
            comparisonArrayPolicy: { normalizedPaths: ['body.permissions', 'body.user.permissions', 'body.user.orgUnits'], allOtherArraysComparedAsReceived: true },
            cors: { origin: corsOrigin, credentials: true, originalBuilderSha256: sha(corsFunctions[0].getText()), scope: 'Matching explicit Origin and preflight; unrelated framework fingerprint headers are excluded' },
            normalizedObservationsSha256: sha(JSON.stringify(observations))
        };
    } catch (error) {
        const redact = (text) => (appPassword ? String(text).replaceAll(appPassword, '[redacted]') : String(text));
        console.error(
            JSON.stringify({
                result: 'failed',
                phase,
                category: error?.constructor?.name ?? 'Error',
                assertion: error instanceof assert.AssertionError ? redact(error.message) : undefined,
                observation: latestObservation,
                originalWriteTrace,
                originalPermissionSelects: [...originalPermissionSelects],
                originalMembershipSelects: [...originalMembershipSelects],
                originalRoleAssignmentSelects: [...originalRoleAssignmentSelects],
                rawPermissionOrders,
                rawOrganizationOrders,
                requestContexts,
                sqlstate: typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : undefined
            })
        );
        process.exitCode = 1;
    } finally {
        let cleanupFailed = false;
        async function clean(operation) {
            try {
                await operation();
            } catch {
                cleanupFailed = true;
            }
        }
        await clean(async () => {
            if (rust?.spawned && rust.child.exitCode === null && rust.child.signalCode === null) {
                rust.child.kill('SIGTERM');
                await Promise.race([once(rust.child, 'exit'), delay(12000, undefined, { ref: false })]);
                if (rust.child.exitCode === null && rust.child.signalCode === null) {
                    rust.child.kill('SIGKILL');
                    await once(rust.child, 'exit');
                }
            }
        });
        if (nest) await clean(() => nest.close());
        if (orm) await clean(() => orm.close(true));
        for (const client of clients) {
            // All identifiers are this run's random UUIDs; no TRUNCATE/reset.
            await clean(async () => {
                await client.query('DELETE FROM poms.security_event WHERE request_id=ANY($1::varchar[])', [fixture.requestIds]);
                if (created.get(client).user) await client.query('DELETE FROM poms.platform_user WHERE id=$1', [fixture.user]);
                if (created.get(client).role) await client.query('DELETE FROM poms.role WHERE id=$1', [fixture.role]);
                if (created.get(client).orgs.length) await client.query('DELETE FROM poms.org_unit WHERE id=ANY($1::uuid[])', [created.get(client).orgs]);
                const {
                    rows: [left]
                } = await client.query(
                    `SELECT
                    (SELECT count(*)::int FROM poms.security_event WHERE request_id=ANY($1::varchar[])) AS events,
                    (SELECT count(*)::int FROM poms.auth_session WHERE user_id=$2) AS sessions,
                    (SELECT count(*)::int FROM poms.platform_user WHERE id=$2) AS users`,
                    [fixture.requestIds, fixture.user]
                );
                assert.deepEqual(left, { events: 0, sessions: 0, users: 0 }, 'Owned fixture cleanup must leave no session/user/audit row');
            });
            await clean(() => client.end());
        }
        if (temporary) await clean(() => rm(temporary, { recursive: true, force: true }));
        if (cleanupFailed) {
            console.error(JSON.stringify({ result: 'failed', phase: 'owned-cleanup', category: 'CleanupFailure' }));
            process.exitCode = 1;
        } else {
            console.log(JSON.stringify({ result: 'pass', phase: 'owned-cleanup', databases: clients.length, events: 0, sessions: 0, users: 0 }));
        }
    }
    if (summary && process.exitCode !== 1) console.log(JSON.stringify({ ...summary, ownedCleanup: true }));
}

function checkedOrganizationComparison(orgUnits, expected) {
    assert(Array.isArray(orgUnits), 'Profile organization memberships must be an array');
    assert.equal(orgUnits.length, expected.length, 'Every fixture membership must be retained, including the inactive organization');
    assert(
        orgUnits.every((entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.id === 'string'),
        'Every membership must be a full organization object with a string id'
    );
    assert.equal(new Set(orgUnits.map((entry) => entry.id)).size, orgUnits.length, 'Duplicate organization ids must fail before comparison normalization');
    for (const entry of orgUnits)
        assert.deepEqual(
            entry,
            expected.find((candidate) => candidate.id === entry.id),
            'All organization fields and raw membership values must match the fixture exactly'
        );
    return structuredClone(orgUnits).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

function tokenHash(token) {
    return createHash('sha256').update(token).digest('hex');
}
async function freePort() {
    const listener = net.createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const port = listener.address().port;
    await new Promise((resolve, reject) => listener.close((error) => (error ? reject(error) : resolve())));
    return port;
}
function request(port, method, route, headers = {}, body) {
    assert(ownedPorts.has(port) && Number.isInteger(port) && port > 0 && port < 65536, "Only this run's owned HTTP listeners may be requested");
    assert(['/api/health/readiness', '/api/auth/sessions', '/api/auth/session', '/api/auth/csrf-token', '/api/auth/session:logout'].includes(route), 'HTTP acceptance route is not in scope');
    return new Promise((resolve, reject) => {
        if (body !== undefined) headers['content-length'] = String(Buffer.byteLength(body));
        const request = http.request({ host: '127.0.0.1', port, path: route, method, headers, agent: false, timeout: 5000 }, (response) => {
            const chunks = [];
            response.on('data', (data) => chunks.push(data));
            response.on('error', reject);
            response.on('end', () => {
                try {
                    const text = Buffer.concat(chunks).toString('utf8');
                    const list = (name, transform = (value) => value) =>
                        String(response.headers[name] ?? '')
                            .split(',')
                            .map((part) => transform(part.trim()))
                            .filter(Boolean)
                            .sort();
                    resolve({
                        status: response.statusCode,
                        contentType: response.headers['content-type'] ?? null,
                        cookies: response.headers['set-cookie'] ?? [],
                        body: text ? JSON.parse(text) : null,
                        cors: {
                            allowOrigin: response.headers['access-control-allow-origin'] ?? null,
                            allowCredentials: response.headers['access-control-allow-credentials'] ?? null,
                            allowMethods: list('access-control-allow-methods', (value) => value.toUpperCase()),
                            allowHeaders: list('access-control-allow-headers', (value) => value.toLowerCase()),
                            vary: list('vary', (value) => value.toLowerCase())
                        }
                    });
                } catch {
                    reject(new Error('Controlled HTTP response was not JSON'));
                }
            });
        });
        request.on('error', reject);
        request.on('timeout', () => request.destroy(new Error('Owned HTTP request deadline')));
        request.end(body);
    });
}
