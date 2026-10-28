import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { parse as parseSimpleQuery } from 'node:querystring';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { requestCorpus } from './f-oracle.mjs';

export const ROOT = resolve(import.meta.dirname, '../..');
export const SOURCE_HEAD = '7a343c543fe0031d7d6b42c1f7e18a7e861c72b7';
export const SOURCES = [
    'libs/shared/contracts/src/lib/shared-contracts.ts', 'libs/shared/api-spec/openapi.json',
    'libs/api/contracts/src/lib/runtime-audit/runtime-audit.dto.ts',
    ...['runtime-audit.controller.ts', 'runtime-audit.service.ts', 'runtime-audit.repository.ts', 'runtime-audit-request.utils.ts', 'audit-log.entity.ts', 'security-event.entity.ts'].map(file => 'apps/poms-api/src/app/core/runtime-audit/' + file),
    'apps/poms-api/src/migrations/Migration20260328120000_init_runtime_audit_and_security_event.ts',
    'libs/vendor/nestjs-zod/src/exception.ts', 'libs/vendor/nestjs-zod/src/pipe.ts', 'libs/vendor/nestjs-zod/src/serializer.ts'
];
const hash = text => createHash('sha256').update(text).digest('hex');
const normalized = text => text.replace(/\r\n/g, '\n');
const read = (root, path) => normalized(readFileSync(resolve(root, path), 'utf8'));

export function dependencies(root = ROOT) {
    const dependencyRoot = process.env.POMS_R2EF_DEPENDENCY_ROOT ?? root;
    const require = createRequire(resolve(dependencyRoot, 'package.json'));
    const ts = require('typescript');
    const zod = require('zod');
    assert.equal(ts.version, '6.0.3');
    assert.equal(require('zod/package.json').version, '4.6.1');
    assert.equal(process.versions.node.split('.')[0], '24');
    require('reflect-metadata');
    return { require, ts, zod };
}

export function executeTs(text, file, modules, ts) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0, 'Original TypeScript syntax');
    for (const statement of source.statements) if (ts.isImportDeclaration(statement)) assert(Object.hasOwn(modules, statement.moduleSpecifier.text), `Unreviewed source import ${statement.moduleSpecifier.text}`);
    const compiled = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true, emitDecoratorMetadata: false } }).outputText;
    const exports = {};
    const context = { exports, module: { exports }, require: name => {
        assert(Object.hasOwn(modules, name), `Unreviewed runtime import ${name}`);
        return modules[name];
    } };
    new Script(compiled, { filename: file }).runInNewContext(context, { timeout: 3000 });
    return context.module.exports;
}

export function openapiSubset(spec) {
    const paths = {};
    const components = { schemas: {}, securitySchemes: spec.components.securitySchemes };
    const visit = value => {
        if (!value || typeof value !== 'object') return;
        if (typeof value.$ref === 'string') {
            assert(value.$ref.startsWith('#/components/schemas/'));
            const key = value.$ref.slice('#/components/schemas/'.length);
            if (!Object.hasOwn(components.schemas, key)) {
                assert(Object.hasOwn(spec.components.schemas, key));
                components.schemas[key] = spec.components.schemas[key];
                visit(components.schemas[key]);
            }
        }
        Object.values(value).forEach(visit);
    };
    for (const [path, method] of [['/api/audit-logs', 'get'], ['/api/audit-logs/targets/{targetType}/{targetId}', 'get'], ['/api/security-events', 'get'], ['/api/security-events:recordRouteDenied', 'post']]) {
        assert(spec.paths[path]?.[method], `Missing original operation ${path}`);
        paths[path] = { [method]: spec.paths[path][method] };
        visit(paths[path]);
    }
    components.schemas = Object.fromEntries(Object.entries(components.schemas).sort(([a], [b]) => a.localeCompare(b, 'en')));
    return { openapi: spec.openapi, paths, components };
}

async function originalBehavior(root, RuntimeAuditService, ts) {
    const numberJson = [
        '{"large":9007199254740993,"overflow":1e999,"negativeZero":-0}',
        '[0,1.0,1e20,1e21,1e-7,1e-6,9007199254740995]',
        '{"publicSentinel":{"tokenLikeKey":"non-sensitive-kept"},"__proto__":{"kept":true}}',
        'null', 'true', '"scalar snapshot"'
    ].map(inputRaw => ({ inputRaw, expectedRaw: JSON.stringify(JSON.parse(inputRaw)) }));
    const auditRow = {
        id: 'a0000000-0000-4000-8000-000000000001', eventType: 'r2ef.fixture.audit', targetType: 'lead', targetId: 'opaque-AbC',
        operatorId: null, requestId: 'fixture-request', result: 'success', reason: null,
        beforeSnapshot: null, afterSnapshot: JSON.parse(numberJson[0].inputRaw), metadata: { publicSentinel: ['kept', null, { nested: true }] },
        occurredAt: new Date('2026-10-28T01:02:03.123Z'), unprojectedEntityField: 'non-sensitive-must-not-leak'
    };
    const securityRow = {
        id: 'a0000000-0000-4000-8000-000000000002', eventType: 'r2ef.fixture.security', severity: 'warning', actorId: null,
        principal: 'fixture', requestId: null, path: '/fixture', method: 'GET', permissionKey: null, result: 'blocked', ip: null,
        userAgent: null, details: JSON.parse(numberJson[2].inputRaw), occurredAt: new Date('2026-10-28T01:02:03.123Z'), unprojectedEntityField: true
    };
    const calls = [];
    const repository = {
        findAuditLogs: async (where, limit) => { calls.push({ method: 'findAuditLogs', where, limit }); return [auditRow]; },
        findSecurityEvents: async (where, limit) => { calls.push({ method: 'findSecurityEvents', where, limit }); return [securityRow]; }
    };
    const service = new RuntimeAuditService(repository);
    const queries = [];
    for (const [method, query] of [
        ['listAuditLogs', {}],
        ['listAuditLogs', { from: '2026-10-29T00:00:00.123456Z', to: '2026-10-28T00:00:00Z', targetId: ' id ', operatorId: 'A0000000-0000-4000-8000-000000000001', eventType: 'evt', targetType: 'type', result: 'success', limit: 100 }],
        ['listSecurityEvents', {}],
        ['listSecurityEvents', { from: '2026-10-28T00:00:00Z', to: '2026-10-29T00:00:00Z', actorId: 'a0000000-0000-4000-8000-000000000001', eventType: 'evt', principal: ' p ', path: ' /p ', permissionKey: 'not-an-enum-filter', result: 'blocked', limit: 1 }]
    ]) {
        const output = await service[method](query);
        queries.push({ method, query, repository: calls.pop(), output });
    }
    const utilsFile = 'apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts';
    const utils = executeTs(read(root, utilsFile), utilsFile, {}, ts);
    const requestContexts = [
        { headers: {}, ip: '192.0.2.9' },
        { headers: { 'x-request-id': '', 'x-correlation-id': 'fallback', 'x-forwarded-for': ' 192.0.2.1 , 198.51.100.1', 'user-agent': 'fixture-UA' }, ip: '192.0.2.9' },
        { headers: { 'x-correlation-id': 'correlation-only', 'x-forwarded-for': '', 'user-agent': '' }, ip: '192.0.2.9' },
        { headers: { 'x-request-id': ['first', 'second'], 'x-forwarded-for': [' 192.0.2.2 ', '198.51.100.2'], 'user-agent': ['first-agent', 'second-agent'] } }
    ].map(input => ({ input, observed: { requestId: utils.getRequestId(input), ip: utils.getRequestIp(input), userAgent: utils.getRequestUserAgent(input) }, boundary: 'Original utility direct execution; array headers are synthetic rather than real Node wire headers' }));
    const simpleQueryParserCases = [
        '', 'eventType=a+b&eventType=c%2Bd&limit[]=2&targetId=%FF&__proto__=x',
        'limit=1&&eventType=x', 'eventType&=unknown', 'targetId=%E0%A4%A', 'targetId=%ED%A0%80',
        'eventType=%u0061&targetId=a=b', 'limit=1&limit=1',
        '&'.repeat(1000) + 'limit=1', Array.from({ length: 1001 }, (_, index) => 'x' + index + '=' + index).join('&')
    ].map(rawQuery => ({ rawQuery, expectedRaw: JSON.stringify(parseSimpleQuery(rawQuery)) }));
    return { formatVersion: 1, sourceHead: SOURCE_HEAD, boundary: 'Original service/request-utils and Node simple-query/JSON direct execution with in-memory repository; not SQL or Nest HTTP evidence', numberJson, queries, requestContexts, simpleQueryParserCases };
}

export async function buildArtifacts(root = ROOT) {
    execFileSync('git', ['diff', '--quiet', SOURCE_HEAD, '--', ...SOURCES], { cwd: root, windowsHide: true });
    assert.equal(execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', ...SOURCES], { cwd: root, encoding: 'utf8', windowsHide: true }), '');
    const { require, ts, zod } = dependencies(root);
    const sharedFile = SOURCES[0];
    const shared = executeTs(read(root, sharedFile), sharedFile, { zod }, ts);
    assert.equal(shared.PERMISSION_KEYS.length, 37);
    const serviceFile = 'apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts';
    const { RuntimeAuditService } = executeTs(read(root, serviceFile), serviceFile, { '@nestjs/common': require('@nestjs/common'), '@poms/shared-contracts': shared, '@mikro-orm/core': {}, './audit-log.entity': {}, './security-event.entity': {}, './runtime-audit.repository': { RuntimeAuditRepository: class {} } }, ts);
    const targetReadPermissions = {};
    for (const target of shared.ENTITY_AUDIT_TARGET_TYPES) {
        targetReadPermissions[target] = [];
        for (const permission of shared.PERMISSION_KEYS) {
            const service = new RuntimeAuditService({ findAuditLogs: async () => [] });
            try {
                await service.listEntityAuditLogs(target, 'opaque-id', {}, { sub: '00000000-0000-4000-8000-000000000001', username: 'fixture', permissions: [permission] });
                targetReadPermissions[target].push(permission);
            } catch (error) { assert.equal(error.getStatus?.(), 403); }
        }
        assert(targetReadPermissions[target].length > 0);
    }
    const corpus = requestCorpus(shared, SOURCE_HEAD);
    const invalidDate = shared.AuditLogListQuerySchema.safeParse({ from: 'bad' });
    const invalidUuid = shared.AuditLogListQuerySchema.safeParse({ operatorId: 'bad' });
    assert(!invalidDate.success && !invalidUuid.success);
    const authority = { formatVersion: 1, sourceHead: SOURCE_HEAD, permissionKeys: [...shared.PERMISSION_KEYS], entityTargetTypes: [...shared.ENTITY_AUDIT_TARGET_TYPES], targetReadPermissions, datetimePattern: invalidDate.error.issues[0].pattern, uuidPattern: invalidUuid.error.issues[0].pattern, schemaKeys: Object.fromEntries(corpus.schemas.map(schema => [schema, Object.keys(shared[schema + 'Schema'].shape)])) };
    const outputs = new Map([
        ['tools/rust-r2ef/f-authority.json', authority],
        ['tools/rust-r2ef/f-golden.json', corpus],
        ['tools/rust-r2ef/f-behavior.json', await originalBehavior(root, RuntimeAuditService, ts)],
        ['tools/rust-r2ef/f-openapi.json', openapiSubset(JSON.parse(read(root, SOURCES[1])))]
    ].map(([path, value]) => [path, JSON.stringify(value, null, 2) + '\n']));
    const source = { formatVersion: 1, sourceHead: SOURCE_HEAD, rule: 'Original TS/shared 37 permissions/full OpenAPI are the sole editable authority; generated inputs only', sources: SOURCES.map(path => ({ path, normalizedUtf8Sha256: hash(read(root, path)) })), dependencies: { node: '24.x', typescript: ts.version, zod: require('zod/package.json').version }, outputs: [...outputs].map(([path, value]) => ({ path, normalizedUtf8Sha256: hash(value) })), evidence: { operations: 4, schemaCases: corpus.cases.length, targetPermissionProbes: shared.ENTITY_AUDIT_TARGET_TYPES.length * shared.PERMISSION_KEYS.length, boundary: 'Pure original source/schema execution; no Nest HTTP, SQL, database or UI claim' } };
    outputs.set('tools/rust-r2ef/f-source.json', JSON.stringify(source, null, 2) + '\n');
    return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    assert(args.length === 0 || args.length === 1 && args[0] === '--check', 'Usage: f-export.mjs [--check]');
    const outputs = await buildArtifacts();
    for (const [path, content] of outputs) {
        if (args.length) assert.equal(readFileSync(resolve(ROOT, path), 'utf8'), content, `Generated F input differs ${path}`);
        else { mkdirSync(dirname(resolve(ROOT, path)), { recursive: true }); writeFileSync(resolve(ROOT, path), content); }
    }
    console.log(JSON.stringify({ result: 'pass', mode: args.length ? 'check' : 'write', operations: 4, node: process.versions.node }));
}
