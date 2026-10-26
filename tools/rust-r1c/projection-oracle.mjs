import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { format } from 'prettier';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '../..');
const mode = process.argv[2] ?? '--check';
assert(process.argv.length <= 3 && ['--check', '--write'].includes(mode));
const sourceHead = '1013afef266602e7c98eb433bd0f14483be3d7fd';
const sharedFile = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const prefix = 'apps/poms-api/src/app/core/sensitive-field-projection/';
const serviceFile = `${prefix}sensitive-field-projection.service.ts`;
const policyFile = `${prefix}sensitive-field-projection.policy.ts`;
const sources = [sharedFile, serviceFile, policyFile, 'package.json', 'pnpm-lock.yaml', '.prettierrc.json'];
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const sha = (text) => createHash('sha256').update(text).digest('hex');
function packageVersion(name) {
    let directory = path.dirname(require.resolve(name));
    for (;;) {
        const manifest = path.join(directory, 'package.json');
        if (fs.existsSync(manifest)) {
            const data = JSON.parse(fs.readFileSync(manifest, 'utf8'));
            if (data.name === name) return data.version;
        }
        const parent = path.dirname(directory);
        assert.notEqual(parent, directory, `Package manifest not found: ${name}`);
        directory = parent;
    }
}
for (const args of [
    ['diff', '--name-only', sourceHead, '--', ...sources],
    ['diff', '--cached', '--name-only', sourceHead, '--', ...sources],
    ['ls-files', '--others', '--exclude-standard', '--', ...sources]
]) {
    assert.equal(execFileSync('git', args, { cwd: root, encoding: 'utf8' }), '', 'Projection source differs from freeze');
}
function load(file, imports) {
    const source = read(file);
    const module = { exports: {} };
    const transpiled = ts.transpileModule(source, { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText;
    vm.runInNewContext(
        transpiled,
        {
            module,
            exports: module.exports,
            require: (specifier) => {
                assert(Object.hasOwn(imports, specifier), `Unknown projection import: ${specifier}`);
                return imports[specifier];
            }
        },
        { filename: file, timeout: 5000 }
    );
    return module.exports;
}
const shared = load(sharedFile, { zod: require('zod') });
const policy = load(policyFile, { '@poms/shared-contracts': shared });
const { SensitiveFieldProjectionService } = load(serviceFile, {
    '@nestjs/common': require('@nestjs/common'),
    '../runtime-audit/runtime-audit.service': { RuntimeAuditService: class RuntimeAuditToken {} },
    './sensitive-field-projection.policy': policy
});
const base = {
    fieldPackageKey: 'contract-finance',
    fields: [
        { key: 'amount', rawValue: 'SYNTHETIC-PRIVATE-123.00' },
        { key: 'absent', rawValue: null }
    ],
    user: null,
    targetType: 'synthetic',
    targetId: 'r1c-projection',
    requestContext: { path: '/synthetic/projection' }
};
const cases = [
    { id: 'masked-anonymous', input: base },
    { id: 'denied-anonymous', input: { ...base, modeWhenUnauthorized: 'denied' } },
    { id: 'null-only-no-audit', input: { ...base, fields: [{ key: 'nil', rawValue: null, displayTextWhenFull: '' }] } },
    { id: 'empty-fields-no-audit', input: { ...base, fields: [] } },
    { id: 'field-text-wins-empty', input: { ...base, maskedDisplayText: 'global', fields: [{ key: 'x', rawValue: '', maskedDisplayText: '' }] } },
    {
        id: 'denied-text-precedence',
        input: {
            ...base,
            modeWhenUnauthorized: 'denied',
            deniedDisplayText: 'global',
            fields: [
                { key: 'x', rawValue: 'x', deniedDisplayText: 'field' },
                { key: 'y', rawValue: 'y' }
            ]
        }
    },
    {
        id: 'duplicate-field-count',
        input: {
            ...base,
            fields: [
                { key: 'x', rawValue: 'x' },
                { key: 'x', rawValue: 'y' }
            ]
        }
    },
    {
        id: 'prototype-key-wire-omission',
        input: {
            ...base,
            fields: [
                { key: '__proto__', rawValue: 'x' },
                { key: 'constructor', rawValue: 'y' }
            ]
        }
    },
    { id: 'request-nullish-not-empty', input: { ...base, requestContext: { path: '', method: '', requestId: '', ip: '', userAgent: '' } } }
];
for (const fieldPackageKey of shared.SENSITIVE_FIELD_PACKAGE_KEYS) {
    const required = shared.SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS[fieldPackageKey];
    for (const authorized of [false, true])
        cases.push({
            id: `${fieldPackageKey}-${authorized ? 'allowed' : 'denied'}`,
            input: {
                ...base,
                fieldPackageKey,
                fields: [
                    { key: 'empty', rawValue: '' },
                    { key: 'full', rawValue: '42.00', displayTextWhenFull: 'custom' },
                    { key: 'null', rawValue: null }
                ],
                user: { sub: 'cbb00000-0000-4000-8000-000000000001', username: 'synthetic', permissions: authorized ? ['legacy:unknown', required] : ['legacy:unknown'] }
            }
        });
}
const observations = [];
for (const sample of cases) {
    const events = [];
    const service = new SensitiveFieldProjectionService({ recordSecurityEvent: async (event) => events.push(event) });
    const output = await service.projectStringFields(sample.input);
    observations.push({ ...sample, output, events });
}
let auditFailurePropagated = false;
try {
    await new SensitiveFieldProjectionService({
        recordSecurityEvent: async () => {
            throw new Error('synthetic audit failure');
        }
    }).projectStringFields(base);
} catch (error) {
    auditFailurePropagated = error.message === 'synthetic audit failure';
}
assert(auditFailurePropagated);
const document = {
    sourceHead,
    meaning: 'Original TS projection and policy; audit is a recorded double, no HTTP or DB.',
    sourceManifest: sources.map((file) => ({ file, sha256: sha(read(file)) })),
    generatorSha256: sha(read('tools/rust-r1c/projection-oracle.mjs')),
    dependencies: { typescript: ts.version, zod: packageVersion('zod'), nest: packageVersion('@nestjs/common') },
    auditFailurePropagated,
    observations
};
const output = await format(JSON.stringify(document), { parser: 'json', tabWidth: 4, printWidth: 180 });
const destination = 'tools/rust-r1c/projection-golden.json';
if (mode === '--write') fs.writeFileSync(path.join(root, destination), output);
else assert.equal(read(destination), output, 'Projection golden differs');
console.log(JSON.stringify({ oracle: 'projection', cases: observations.length, auditFailurePropagated, sha256: sha(output) }));
