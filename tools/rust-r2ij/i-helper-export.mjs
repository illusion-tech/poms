// Finite private URL/signing and state helpers only: no fetch, server or DB.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import * as crypto from 'node:crypto';
const require = createRequire(import.meta.url), ts = require('typescript');
const root = resolve(import.meta.dirname, '../..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const now = 1800000000000;
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
const shared = { AttachmentStorageProviderConnectionTestStatusValue: { Success: 'success', Failed: 'failed' }, AttachmentStorageProviderTypeValue: { Local: 'local', HuaweiObsS3: 'huawei-obs-s3' }, AttachmentStorageProviderConfigStatusValue: { Draft: 'draft', Active: 'active', Disabled: 'disabled', Misconfigured: 'misconfigured' } };
const common = require('@nestjs/common');
const stub = class {};
function execute(path, dependencies) {
    const exports = {}, source = ts.transpileModule(read(path), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText;
    const context = { exports, module: { exports }, require(name) { assert(Object.hasOwn(dependencies, name), name); return dependencies[name]; }, Date: FixedDate, URL, URLSearchParams, Buffer, Error };
    new Script(source).runInNewContext(context, { timeout: 5000 }); return context.module.exports;
}
const provider = execute('apps/poms-api/src/app/features/attachment/huawei-obs-s3-attachment-object-storage.provider.ts', { '@nestjs/common': common, 'node:crypto': crypto, 'node:stream': require('node:stream'), 'node:timers/promises': require('node:timers/promises'), '@poms/shared-contracts': shared });
const obs = new provider.HuaweiObsS3AttachmentObjectStorageProvider();
const config = { id: '95000000-0000-4000-8000-000000000001', providerType: 'huawei-obs-s3', displayName: 'Synthetic', status: 'active', enabled: true, endpoint: 'https://obs.example.invalid:9443/base/?existing=two+words&Z=1&a=2', region: 'synthetic-region', bucket: 'synthetic-bucket', keyPrefix: null, forcePathStyle: true, accessKeyId: 'SYNTHETIC_AK', secretAccessKey: 'SYNTHETIC_SK' };
const transport = [];
for (const forcePathStyle of [false, true]) for (const key of ['attachments/需求 +!.pdf', '/a//b/%2F/%25', 'a/../b', '', '😀/文件.txt']) {
    const cfg = { ...config, forcePathStyle };
    const expiresAt = new Date(now + 5000000);
    const expected = await obs.createPresignedPutTarget(cfg, { storageProvider: 'huawei-obs-s3', storageBucket: cfg.bucket, storageKey: key }, { contentType: ' application/pdf ', checksumSha256: 'A'.repeat(64), expiresAt });
    transport.push({ config: cfg, key, now, expiresAt: expiresAt.toISOString(), contentType: ' application/pdf ', checksumSha256: 'A'.repeat(64), expected, objectUrl: obs.buildObjectUrl(cfg, key).toString() });
}
const serviceModule = execute('apps/poms-api/src/app/features/attachment/attachment-storage-provider.service.ts', { '@nestjs/common': common, '@poms/shared-contracts': shared, '../../core/runtime-audit/runtime-audit.service': { RuntimeAuditService: stub }, '../../core/secret/secret-cipher.service': { SecretCipherService: stub }, './attachment-storage-provider-config.entity': { AttachmentStorageProviderConfig: stub }, './attachment-storage-provider-registry.service': { AttachmentStorageProviderRegistry: stub }, './attachment-storage-provider.repository': { AttachmentStorageProviderRepository: stub }, './attachment-storage-provider-secret.constants': { ATTACHMENT_STORAGE_SECRET_CIPHER_OPTIONS: {} } });
const service = new serviceModule.AttachmentStorageProviderService(null, null, null, null);
const states = [];
const snake = value => Object.fromEntries(Object.entries(value).map(([key, v]) => [key.replace(/[A-Z]/g, c => '_' + c.toLowerCase()), v]));
for (const providerType of ['local', 'huawei-obs-s3']) for (const status of ['draft', 'active', 'disabled', 'misconfigured']) for (const enabled of [false, true]) for (const isDefault of [false, true]) for (const complete of [false, true]) {
    const row = { id: config.id, providerType, displayName: 'Synthetic', status, enabled, isDefault, endpoint: complete ? config.endpoint : null, region: complete ? config.region : null, bucket: complete ? config.bucket : null, keyPrefix: null, forcePathStyle: false, encryptedAccessKeyId: complete ? 'synthetic-ciphertext' : null, encryptedSecretAccessKey: complete ? 'synthetic-ciphertext' : null, credentialsUpdatedAt: null, rowVersion: 1, createdAt: new Date(now), createdBy: null, updatedAt: new Date(now), updatedBy: null };
    const input = snake(row); service.normalizeStatus(row); states.push({ input, expected: snake(row), missing: service.missingOperationalFields(row) });
}
const output = JSON.stringify({ sourceHead: '61d6df1e971e7e785382dc85c75273e584ee2545', kind: 'Original unchanged private state/URL/SigV4 helpers; fixed clock/synthetic values; no network/storage/DB', now, transport, states }, null, 2) + '\n';
const path = resolve(root, 'tools/rust-r2ij/i-helper-golden.json');
if (process.argv.includes('--check')) assert.equal(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'), output); else writeFileSync(path, output);
console.log(JSON.stringify({ check: process.argv.includes('--check'), transport: transport.length, states: states.length, execution: 'finite private helper only' }));
