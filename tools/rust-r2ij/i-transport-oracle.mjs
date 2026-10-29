// Controlled protocol probe: actual unchanged OBS provider and actual Node fetch.
// This executable is not a product endpoint. Root owns every environment/run.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ROOT = resolve(import.meta.dirname, '../..');
const MAX_LINE = 32 * 1024 * 1024;
const MAX_BODY = 16 * 1024 * 1024;
const MAX_READ = 64 * 1024 * 1024;
const sourcePath = 'apps/poms-api/src/app/features/attachment/huawei-obs-s3-attachment-object-storage.provider.ts';
const sharedPath = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFileSync(resolve(ROOT, path), 'utf8');
const units = value => Array.from({ length: value.length }, (_, i) => value.charCodeAt(i));
const allowedOps = new Set(['head', 'read', 'put', 'remove', 'presign', 'read-first-drop']);
const allowedKeys = new Set(['op', 'runId', 'location', 'config', 'bodyBase64', 'contentType', 'checksumSha256', 'expiresAt', 'includeBody']);

function execute(path, dependencies) {
    const exports = {};
    const result = ts.transpileModule(read(path), { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } });
    assert(!result.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error), 'Original source transpilation failed');
    const context = { exports, module: { exports }, require(name) { assert(Object.hasOwn(dependencies, name), 'Unexpected original import'); return dependencies[name]; }, Date, URL, URLSearchParams, Buffer, Error, encodeURIComponent, decodeURIComponent, fetch: globalThis.fetch };
    new Script(result.outputText, { filename: path }).runInNewContext(context, { timeout: 5000 });
    return context.module.exports;
}
function sourceGuard() {
    const rows = JSON.parse(read('tools/rust-r2ij/i-authority.json')).sources;
    for (const path of [sourcePath, sharedPath]) {
        const row = rows.find(row => row.path === path);
        assert(row, 'Missing frozen original source');
        const bytes = readFileSync(resolve(ROOT, path));
        assert(hash(bytes) === row.rawBytesSha256 || hash(bytes.toString('utf8').replace(/\r\n/g, '\n')) === row.normalizedUtf8Sha256, 'Original source changed');
    }
}
function loadProvider() {
    sourceGuard();
    const shared = execute(sharedPath, { zod: require('zod') });
    const original = execute(sourcePath, { '@nestjs/common': require('@nestjs/common'), '@poms/shared-contracts': shared, 'node:crypto': crypto, 'node:stream': { Readable }, 'node:timers/promises': require('node:timers/promises') });
    return new original.HuaweiObsS3AttachmentObjectStorageProvider();
}
function endpointAllowed(config, bucket) {
    const url = new URL(config.endpoint);
    if (url.username || url.password) throw new Error('Probe rejected endpoint credentials');
    if (url.origin === 'http://127.0.0.1:6900') {
        if (config.forcePathStyle !== true) throw new Error('IP fixture requires path style');
    } else if (url.origin === 'http://r2ij-obs.local:6900') {
        if (bucket !== 'ijvirtual') throw new Error('Virtual fixture requires its fixed bucket');
    } else throw new Error('Probe rejected non-fixture endpoint origin');
}
function admit(input) {
    if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !allowedKeys.has(key))) throw new Error('Probe rejected input shape');
    if (!allowedOps.has(input.op) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.runId ?? '')) throw new Error('Probe rejected operation or run ID');
    const location = input.location;
    if (!location || location.storageProvider !== 'huawei-obs-s3' || typeof location.storageBucket !== 'string' || !location.storageBucket || typeof location.storageKey !== 'string' || !location.storageKey.startsWith(`ij-${input.runId}/`)) throw new Error('Probe rejected object namespace');
    const config = input.config;
    if (!config || config.providerType !== 'huawei-obs-s3' || config.bucket !== location.storageBucket || typeof config.endpoint !== 'string' || typeof config.accessKeyId !== 'string' || typeof config.secretAccessKey !== 'string') throw new Error('Probe requires synthetic matching runtime config');
    endpointAllowed(config, location.storageBucket);
    if (input.includeBody !== undefined && typeof input.includeBody !== 'boolean') throw new Error('Probe rejected includeBody');
    for (const key of ['contentType', 'checksumSha256', 'expiresAt']) if (input[key] !== undefined && input[key] !== null && typeof input[key] !== 'string') throw new Error('Probe rejected optional text');
    if (input.op === 'put') {
        if (typeof input.bodyBase64 !== 'string') throw new Error('Probe put requires base64');
        const body = Buffer.from(input.bodyBase64, 'base64');
        if (body.length > MAX_BODY || body.toString('base64') !== input.bodyBase64) throw new Error('Probe rejected noncanonical or excessive body');
    }
    if (input.op === 'presign' && (typeof input.expiresAt !== 'string' || !Number.isFinite(Date.parse(input.expiresAt)))) throw new Error('Probe presign requires an ISO expiry');
    return input;
}
function secrets(input) { return [input?.config?.accessKeyId, input?.config?.secretAccessKey].filter(value => typeof value === 'string' && value.length > 0); }
function redact(text, secretValues) { for (const value of secretValues) text = text.split(value).join('[redacted]'); return text; }
function redactValue(value, secretValues) {
    if (typeof value === 'string') return redact(value, secretValues);
    if (Array.isArray(value)) return value.map(child => redactValue(child, secretValues));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, ['url', 'sha256', 'originalUrlSha256'].includes(key) ? child : redactValue(child, secretValues)]));
    return value;
}
function failure(op, error, input) {
    if (!allowedOps.has(op)) op = 'rejected';
    const original = typeof error?.message === 'string' ? error.message : 'Unknown probe error';
    const message = redact(original, secrets(input));
    const status = typeof error?.getStatus === 'function' ? error.getStatus() : null;
    return { success: false, op, status, error: { status, message, messageUnits: units(message), messageRedacted: message !== original, originalMessageUtf16LeSha256: hash(Buffer.from(original, 'utf16le')) } };
}
function bodyResult(body, includeBody) {
    return { bytes: body.length, sha256: hash(body), ...(includeBody && body.length <= 1024 * 1024 ? { bodyBase64: body.toString('base64') } : {}) };
}
async function run(provider, input) {
    const { op, location, config } = input;
    let result;
    if (op === 'head') result = await provider.headObject(config, location);
    else if (op === 'put') result = await provider.putObject(config, { storageKey: location.storageKey, body: Buffer.from(input.bodyBase64, 'base64'), contentType: input.contentType });
    else if (op === 'remove') {
        // Match the public I facade's original best-effort cleanup boundary.
        try { await provider.deleteObject(config, location); } catch { /* intentionally suppressed */ }
        result = { completed: true, bestEffort: true };
    } else if (op === 'presign') {
        const target = await provider.createPresignedPutTarget(config, location, { contentType: input.contentType, checksumSha256: input.checksumSha256, expiresAt: new Date(input.expiresAt) });
        const originalUrlSha256 = hash(Buffer.from(target.url, 'utf8'));
        const url = new URL(target.url);
        const before = url.searchParams.get('X-Amz-Credential');
        if (before !== null) url.searchParams.set('X-Amz-Credential', before.startsWith(config.accessKeyId + '/') ? '[redacted]' + before.slice(config.accessKeyId.length) : redact(before, [config.accessKeyId]));
        result = { ...target, url: url.toString(), originalUrlSha256, credentialRedacted: before !== url.searchParams.get('X-Amz-Credential') };
    } else {
        const stream = await provider.readObject(config, location);
        const chunks = []; let total = 0;
        const iterator = stream[Symbol.asyncIterator]();
        try {
            while (true) {
                const next = await iterator.next(); if (next.done) break;
                const chunk = next.value;
                const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                if (bytes.length === 0) continue;
                total += bytes.length;
                if (total > MAX_READ) throw new Error('Probe read limit exceeded');
                chunks.push(bytes);
                if (op === 'read-first-drop') { stream.destroy(); break; }
            }
        } finally { if (!stream.destroyed) stream.destroy(); try { await iterator.return?.(); } catch { /* cancellation cleanup does not replace the first body error */ } }
        result = { ...bodyResult(Buffer.concat(chunks), input.includeBody), ...(op === 'read-first-drop' ? { droppedAfterFirstChunk: chunks.length > 0 } : {}) };
    }
    return { success: true, op, status: null, result: redactValue(result, secrets(input)) };
}
async function main() {
    if (process.version !== 'v24.19.0' || process.versions.undici !== '7.29.0') throw new Error('Probe requires verified Node24.19.0/Undici7.29.0');
    const provider = loadProvider();
    if (process.argv.length === 3 && process.argv[2] === '--check') {
        process.stdout.write(JSON.stringify({ sourceCheck: true, node: process.version, undici: process.versions.undici, providerSourceRawSha256: hash(readFileSync(resolve(ROOT, sourcePath))), execution: 'Original source transpilation only; no provider operation/fetch/network' }) + '\n'); return;
    }
    if (process.argv.length !== 2) throw new Error('Probe accepts inputs only over stdin');
    const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of lines) {
        if (Buffer.byteLength(line, 'utf8') > MAX_LINE) throw new Error('Probe input exceeds limit');
        let input;
        try { input = JSON.parse(line); } catch { process.stdout.write(JSON.stringify(failure('rejected', new Error('Probe rejected JSON'), undefined)) + '\n'); continue; }
        try { admit(input); process.stdout.write(JSON.stringify(await run(provider, input)) + '\n'); }
        catch (error) { process.stdout.write(JSON.stringify(failure(input?.op ?? 'rejected', error, input)) + '\n'); }
    }
}
main().catch(() => { process.stderr.write('Controlled transport probe failed before admission\n'); process.exitCode = 1; });
