// Fresh-K loopback-only HTTP peer. The product's real provider performs every I/O.
// No old private state, tenant credentials, PG client, product UUID prediction or mocks.
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as zlib from 'node:zlib';

const ROOT = '/home/wangzishi/projects/poms-rust-r2k';
const PRIVATE = '/home/wangzishi/.local/share/poms-r2k/private';
const PORT = 8900, SCOPE = 'rust-r2k-obs', CONTROL = '/__r2k_obs_control';
const MAX_BYTES = 16 * 1024 * 1024, MAX_SELECTIONS = 64;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RUN_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA = /^[0-9a-f]{64}$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();

// This is a source-only provenance record, not evidence that the new peer ran.
export const SOURCE_DELTA = Object.freeze({
    scope: SCOPE,
    sources: [
        { path: 'tools/rust-r2ij/obs-server-v2.mjs', bytes: 16759, rawSha256: 'aff28d09420ac4e68a4e2d4d32344971ae0fe21b9be6f61037de41d9c9b6b99a', lfSha256: 'aff28d09420ac4e68a4e2d4d32344971ae0fe21b9be6f61037de41d9c9b6b99a' },
        { path: 'tools/rust-r2ij/obs-client.mjs', bytes: 2138, rawSha256: '9c674313074e48af2f35d6565358b984e156ae17775418aaf3de4de17909f53f', lfSha256: '9c674313074e48af2f35d6565358b984e156ae17775418aaf3de4de17909f53f' },
    ],
    previousKVersion: { serverRawSha256: 'ef5953847119006ce8081cece2a0351a316d278944a7b1a83bd428207307c92b', clientRawSha256: '6f78f603b7fdc0f4c1d0e798bc6becb4880e316cc15e8556c24f0466173398d8' },
    retained: ['SigV4 header/presign canonicalization and real body digest checks', 'real HEAD/PUT/GET/DELETE wire handling', 'bounded retry/error/redirect/compression/stream-reset peer rules'],
    changed: ['new K roots/private/scope/control/8900/host names only', 'import-safe entry point and source-only self-test', 'unsigned loopback GET /health after both listeners are ready', 'exact generated-package intent and independent STORE-only ZIP/CRC/manifest/payload validation before PUT faults', 'every request lifetime participates in removal/shutdown admission', 'expected-hash removal, one generated UUID per intent, credential-free public projection, source-unchanged zero-state stop receipt', 'incremental generated read rule: only present validated same-run/bucket/key objects, clear or stallAfterBytes 32..64, GET/HEAD selection only, PUT/intent/rule authority unchanged'],
    notCertified: ['No actual listener, product request, cloud tenant, DB, retry or stream acceptance is certified by this provenance'],
});

function check(condition, code) { if (!condition) { const e = new Error(code); e.publicCode = code; throw e; } }
function equal(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
function exactKeys(value, names, code, optional = []) {
    check(value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype, code);
    check(Object.keys(value).every(key => names.includes(key) || optional.includes(key)) && names.every(key => Object.hasOwn(value, key)), code);
}
function canonicalDate(value, code) { check(typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, code); return Date.parse(value); }
function jsonEqual(a, b) { try { assert.deepStrictEqual(a, b); return true; } catch { return false; } }
function encode(value) { return encodeURIComponent(value).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()); }
function queryCanonical(params) { return [...params.entries()].filter(([k]) => k !== 'X-Amz-Signature').sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv)).map(([k, v]) => encode(k) + '=' + encode(v)).join('&'); }

// Mechanical original verifier: canonical form, signed-header allowlist and payload
// checks have the same statements as the source above (formatting only).
function verify(req, url, run, bytes) {
    const auth = req.headers.authorization; let ak, scope, signed, signature, amzDate, payload, query, mode;
    if (auth) { const match = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8}\/[^/]+\/s3\/aws4_request), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth); check(match, 'malformed_authorization'); [, ak, scope, signed, signature] = match; amzDate = req.headers['x-amz-date']; payload = req.headers['x-amz-content-sha256']; check(payload === hash(bytes), 'payload_hash_mismatch'); query = url.searchParams.toString(); mode = 'header'; }
    else { check(url.searchParams.get('X-Amz-Algorithm') === 'AWS4-HMAC-SHA256', 'missing_authorization'); const credential = url.searchParams.get('X-Amz-Credential') ?? '', at = credential.indexOf('/'); check(at > 0, 'bad_credential'); ak = credential.slice(0, at); scope = credential.slice(at + 1); signed = url.searchParams.get('X-Amz-SignedHeaders'); signature = url.searchParams.get('X-Amz-Signature'); amzDate = url.searchParams.get('X-Amz-Date'); payload = 'UNSIGNED-PAYLOAD'; query = queryCanonical(url.searchParams); const seconds = Number(url.searchParams.get('X-Amz-Expires')); check(Number.isInteger(seconds) && seconds >= 1 && seconds <= 3600, 'invalid_expiry'); const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(amzDate ?? ''); check(m, 'invalid_amz_date'); const atMs = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]); check(Date.now() >= atMs - 30000 && Date.now() <= atMs + seconds * 1000 + 1000, 'expired_signature'); mode = 'query'; }
    check(ak === run.ak && scope === `${amzDate?.slice(0, 8)}/${run.region}/s3/aws4_request`, 'credential_scope_mismatch');
    check(typeof signed === 'string' && signed.split(';').includes('host') && signed === signed.split(';').toSorted().join(';'), 'bad_signed_headers');
    const names = signed.split(';'); check(names.every(k => ['host', 'x-amz-date', 'x-amz-content-sha256', 'content-type', 'x-amz-meta-sha256'].includes(k)), 'unexpected_signed_header');
    const canonicalHeaders = names.toSorted((a, b) => a.localeCompare(b)).map(name => { const value = req.headers[name]; check(typeof value === 'string', 'missing_signed_header'); return `${name}:${value.trim()}\n`; }).join('');
    const canonical = [req.method, url.pathname || '/', query, canonicalHeaders, signed, payload].join('\n'); const keyDate = hmac('AWS4' + run.sk, amzDate.slice(0, 8)), keyRegion = hmac(keyDate, run.region), keyService = hmac(keyRegion, 's3'), keySigning = hmac(keyService, 'aws4_request'); const expected = createHmac('sha256', keySigning).update(['AWS4-HMAC-SHA256', amzDate, scope, hash(Buffer.from(canonical))].join('\n')).digest('hex');
    check(typeof signature === 'string' && equal(signature, expected), 'signature_mismatch'); return { mode, canonicalRequestSha256: hash(Buffer.from(canonical)), signedHeaders: signed, scope };
}

const crcTable = Array.from({ length: 256 }, (_, byte) => { let n = byte; for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc32(bytes) { let n = 0xffffffff; for (const byte of bytes) n = crcTable[(n ^ byte) & 255] ^ (n >>> 8); return (n ^ 0xffffffff) >>> 0; }

// Deliberately accepts only the original K ZIP32 STORE representation. No inflate,
// extraction, ZIP64, descriptors, comments, extras, attributes or partial archives.
export function parseStoreZip(bytes) {
    check(Buffer.isBuffer(bytes) && bytes.length >= 22 && bytes.length <= MAX_BYTES, 'zip_size');
    const end = bytes.length - 22;
    const read16 = at => { check(at >= 0 && at + 2 <= bytes.length, 'zip_bounds'); return bytes.readUInt16LE(at); };
    const read32 = at => { check(at >= 0 && at + 4 <= bytes.length, 'zip_bounds'); return bytes.readUInt32LE(at); };
    check(read32(end) === 0x06054b50 && read16(end + 4) === 0 && read16(end + 6) === 0 && read16(end + 20) === 0, 'zip_eocd');
    const count = read16(end + 8), centralSize = read32(end + 12), centralOffset = read32(end + 16);
    check(count >= 2 && count <= MAX_SELECTIONS + 1 && read16(end + 10) === count && centralOffset + centralSize === end, 'zip_directory');
    const entries = []; let offset = 0, dosTime, dosDate;
    for (let index = 0; index < count; index++) {
        check(offset + 30 <= centralOffset && read32(offset) === 0x04034b50, 'zip_local');
        check(read16(offset + 4) === 20 && read16(offset + 6) === 0x0800 && read16(offset + 8) === 0 && read16(offset + 28) === 0, 'zip_local_format');
        const time = read16(offset + 10), date = read16(offset + 12), crc = read32(offset + 14), size = read32(offset + 18), nameLength = read16(offset + 26);
        check(size === read32(offset + 22) && size <= MAX_BYTES && nameLength > 0 && nameLength <= 1024, 'zip_local_size');
        if (index === 0) { dosTime = time; dosDate = date; } else check(time === dosTime && date === dosDate, 'zip_time_inconsistent');
        const dataAt = offset + 30 + nameLength, next = dataAt + size;
        check(next <= centralOffset, 'zip_local_bounds');
        const nameBytes = bytes.subarray(offset + 30, dataAt), data = bytes.subarray(dataAt, next);
        let name; try { name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes); } catch { check(false, 'zip_name_utf8'); }
        check(name && !name.includes('\0') && !name.includes('/') && !name.includes('\\') && !entries.some(entry => entry.nameBytes.equals(nameBytes)), 'zip_entry_name');
        check(crc32(data) === crc, 'zip_crc');
        entries.push({ name, nameBytes, data, size, crc, offset, time, date, sha256: hash(data) }); offset = next;
    }
    check(offset === centralOffset, 'zip_local_trailing');
    for (const entry of entries) {
        check(offset + 46 <= end && read32(offset) === 0x02014b50, 'zip_central');
        check(read16(offset + 4) === 20 && read16(offset + 6) === 20 && read16(offset + 8) === 0x0800 && read16(offset + 10) === 0 && read16(offset + 12) === entry.time && read16(offset + 14) === entry.date, 'zip_central_format');
        check(read32(offset + 16) === entry.crc && read32(offset + 20) === entry.size && read32(offset + 24) === entry.size && read16(offset + 28) === entry.nameBytes.length && read16(offset + 30) === 0 && read16(offset + 32) === 0 && read16(offset + 34) === 0 && read16(offset + 36) === 0 && read32(offset + 38) === 0 && read32(offset + 42) === entry.offset, 'zip_central_mismatch');
        const next = offset + 46 + entry.nameBytes.length;
        check(next <= end && bytes.subarray(offset + 46, next).equals(entry.nameBytes), 'zip_central_name'); offset = next;
    }
    check(offset === end && entries[0].name === 'manifest.json', 'zip_manifest_first');
    return { entries, dosTime, dosDate };
}

function entryName(displayName, index) { const extension = displayName.includes('.') ? '' : '.bin'; return `${String(index + 1).padStart(3, '0')}-${displayName.replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 180) || 'attachment.bin'}${extension}`; }
function summaryShape(summary, selections) {
    exactKeys(summary, ['includedCount', 'excludedCount', 'includedAttachmentIds', 'excludedAttachmentIds', 'excludedReasons'], 'intent_summary');
    check(summary.includedCount === selections.length && Number.isSafeInteger(summary.excludedCount) && summary.excludedCount >= 0 && summary.excludedCount <= MAX_SELECTIONS, 'intent_summary_counts');
    check(jsonEqual(summary.includedAttachmentIds, selections.map(selection => selection.attachmentId)), 'intent_summary_included');
    check(Array.isArray(summary.excludedAttachmentIds) && summary.excludedAttachmentIds.length <= summary.excludedCount && summary.excludedAttachmentIds.every(id => UUID.test(id)) && new Set(summary.excludedAttachmentIds).size === summary.excludedAttachmentIds.length, 'intent_summary_excluded');
    check(Array.isArray(summary.excludedReasons) && summary.excludedReasons.length <= summary.excludedCount && summary.excludedReasons.every(reason => typeof reason === 'string' && reason.length <= 1000) && new Set(summary.excludedReasons).size === summary.excludedReasons.length, 'intent_summary_reasons');
}
export function validatePackageIntent(input, runId, plannedAt = new Date().toISOString()) {
    check(RUN_UUID.test(runId), 'intent_run'); canonicalDate(plannedAt, 'intent_planned_at');
    exactKeys(input, ['id', 'projectId', 'handoverId', 'selections', 'manifestSummary'], 'intent_fields', ['rule']);
    check(UUID.test(input.id) && UUID.test(input.projectId) && UUID.test(input.handoverId), 'intent_ids');
    check(Array.isArray(input.selections) && input.selections.length >= 1 && input.selections.length <= MAX_SELECTIONS, 'intent_selections');
    for (const [index, item] of input.selections.entries()) {
        exactKeys(item, ['selectionId', 'attachmentId', 'versionGroupId', 'fileName', 'sourceRefs', 'displayName', 'category', 'securityLevel', 'payloadSHA', 'size'], 'intent_selection_fields');
        check([item.selectionId, item.attachmentId, item.versionGroupId].every(id => UUID.test(id)) && SHA.test(item.payloadSHA) && Number.isSafeInteger(item.size) && item.size >= 0 && item.size <= MAX_BYTES, 'intent_selection_identity');
        check(typeof item.displayName === 'string' && item.displayName.length <= 2000 && typeof item.fileName === 'string' && item.fileName === entryName(item.displayName, index), 'intent_entry_name');
        check((item.category === null || typeof item.category === 'string') && ['normal', 'internal'].includes(item.securityLevel), 'intent_selection_labels');
        check(Array.isArray(item.sourceRefs) && item.sourceRefs.length >= 1 && item.sourceRefs.length <= MAX_SELECTIONS, 'intent_source_refs');
        for (const ref of item.sourceRefs) { exactKeys(ref, ['sourceType', 'sourceId', 'relationType', 'label'], 'intent_source_ref'); check(UUID.test(ref.sourceId) && ['project', 'lead', 'contract', 'sales-follow-up', 'project-handover'].includes(ref.sourceType) && typeof ref.relationType === 'string' && typeof ref.label === 'string', 'intent_source_ref_values'); }
    }
    check(new Set(input.selections.map(item => item.selectionId)).size === input.selections.length && new Set(input.selections.map(item => item.attachmentId)).size === input.selections.length && input.selections.reduce((n, item) => n + item.size, 0) < MAX_BYTES, 'intent_duplicate_or_size');
    summaryShape(input.manifestSummary, input.selections);
    const rule = input.rule ?? {}; exactKeys(rule, [], 'intent_rule', ['status', 'errorBody']);
    check(Object.keys(rule).length === 0 || rule.status === 503 && (rule.errorBody === undefined || typeof rule.errorBody === 'string' && Buffer.byteLength(rule.errorBody) <= 4096), 'intent_rule');
    return { ...structuredClone(input), rule: structuredClone(rule), runId, plannedAt, boundKey: null, validation: null };
}
function packageKey(intent, key) {
    check(typeof key === 'string' && !key.includes('\0'), 'generated_key');
    const prefix = `k-${intent.runId}/attachment-download-packages/`, fileName = `project-handover-${intent.handoverId}-attachments.zip`;
    check(key.startsWith(prefix) && key.endsWith('/' + fileName), 'generated_key_scope');
    const parts = key.slice(prefix.length).split('/');
    check(parts.length === 5 && /^\d{4}$/.test(parts[0]) && /^\d{2}$/.test(parts[1]) && /^\d{2}$/.test(parts[2]) && UUID.test(parts[3]) && parts[4] === fileName, 'generated_key_format');
    return { packageId: parts[3], day: parts.slice(0, 3).join('/') };
}
export function validateGeneratedPackage(bytes, key, intent, receivedAt = new Date().toISOString()) {
    const scope = packageKey(intent, key), received = canonicalDate(receivedAt, 'generated_received_at'), planned = canonicalDate(intent.plannedAt, 'generated_planned_at');
    check(intent.boundKey === null || intent.boundKey === key, 'generated_intent_already_bound');
    const parsed = parseStoreZip(bytes), entry = parsed.entries[0]; check(entry.data.length <= 1024 * 1024, 'manifest_size');
    let raw, manifest; try { raw = new TextDecoder('utf-8', { fatal: true }).decode(entry.data); manifest = JSON.parse(raw); } catch { check(false, 'manifest_json'); }
    const manifestFields = ['packageId', 'handoverId', 'projectId', 'createdAt', 'expiresAt', 'manifestSummary', 'items'];
    exactKeys(manifest, manifestFields, 'manifest_fields'); check(jsonEqual(Object.keys(manifest), manifestFields), 'manifest_field_order');
    check(raw === JSON.stringify(manifest, null, 2), 'manifest_original_json_format');
    check(manifest.packageId === scope.packageId && manifest.handoverId === intent.handoverId && manifest.projectId === intent.projectId, 'manifest_identity');
    const created = canonicalDate(manifest.createdAt, 'manifest_created_at'), expires = canonicalDate(manifest.expiresAt, 'manifest_expires_at');
    check(created >= planned && created <= received && expires - created === 86400000 && scope.day === manifest.createdAt.slice(0, 10).replaceAll('-', '/'), 'manifest_date_key_ttl');
    check(jsonEqual(manifest.manifestSummary, intent.manifestSummary) && jsonEqual(Object.keys(manifest.manifestSummary), ['includedCount', 'excludedCount', 'includedAttachmentIds', 'excludedAttachmentIds', 'excludedReasons']) && Array.isArray(manifest.items) && manifest.items.length === intent.selections.length && parsed.entries.length === intent.selections.length + 1, 'manifest_selection_count_or_summary');
    const selected = [];
    for (const [index, selection] of intent.selections.entries()) {
        const item = manifest.items[index], archive = parsed.entries[index + 1];
        const itemFields = ['selectionId', 'attachmentId', 'versionGroupId', 'displayName', 'category', 'securityLevel', 'fileName', 'sourceRefs'];
        exactKeys(item, itemFields, 'manifest_item_fields'); check(jsonEqual(Object.keys(item), itemFields), 'manifest_item_field_order');
        const expected = Object.fromEntries(Object.keys(item).map(name => [name, selection[name]]));
        check(jsonEqual(item, expected), 'manifest_item_identity_or_order');
        check(archive.nameBytes.equals(Buffer.from(selection.fileName, 'utf8')) && archive.size === selection.size && archive.sha256 === selection.payloadSHA, 'generated_payload_mismatch');
        selected.push({ selectionId: item.selectionId, attachmentId: item.attachmentId, versionGroupId: item.versionGroupId, fileName: item.fileName, payloadSHA: archive.sha256, size: archive.size });
    }
    const second = (parsed.dosTime & 31) * 2, minute = (parsed.dosTime >>> 5) & 63, hour = (parsed.dosTime >>> 11) & 31, day = parsed.dosDate & 31, month = (parsed.dosDate >>> 5) & 15, year = 1980 + (parsed.dosDate >>> 9);
    const dosAt = Date.UTC(year, month - 1, day, hour, minute, second), dos = new Date(dosAt);
    check(second <= 58 && minute <= 59 && hour <= 23 && month >= 1 && month <= 12 && day >= 1 && day <= 31 && dos.getUTCMonth() === month - 1 && dos.getUTCDate() === day && dosAt >= created - 1999 && dosAt <= received, 'zip_dos_time');
    const validation = { packageId: scope.packageId, projectId: manifest.projectId, handoverId: manifest.handoverId, createdAt: manifest.createdAt, expiresAt: manifest.expiresAt, manifestSha256: entry.sha256, archiveSha256: hash(bytes), archiveBytes: bytes.length, selected, checked: ['SigV4 is checked by caller before this parser', 'key/root/UUID/date', 'local+central+EOCD', 'STORE-only/UTF8/no-extra/no-trailer', 'all CRC32', 'exact prior manifest selections/sourceRefs', 'actual prior payload SHA256/size', '24hTTL', 'same ZIP DOS time within generation interval'] };
    if (intent.validation) check(intent.validation.archiveSha256 === validation.archiveSha256 && intent.validation.archiveBytes === validation.archiveBytes, 'generated_retry_changed_bytes');
    return validation;
}

export function validateGeneratedReadRule(rule) {
    exactKeys(rule, [], 'generated_read_rule', ['stallAfterBytes']);
    check(Object.keys(rule).length === 0 || Number.isInteger(rule.stallAfterBytes) && rule.stallAfterBytes >= 32 && rule.stallAfterBytes <= 64, 'generated_read_rule');
    return structuredClone(rule);
}
function validateGeneratedReadTarget(object, intent, runId, bucket, key) {
    check(object && object.present === true && object.runId === runId && object.bucket === bucket && object.key === key && object.generatedIntentId, 'generated_read_object_not_present');
    check(intent && intent.id === object.generatedIntentId && intent.runId === runId && intent.bucket === bucket && intent.boundKey === key && intent.validation && intent.validation.archiveSha256 === object.sha256 && intent.validation.archiveBytes === object.size, 'generated_read_object_not_validated');
}

function encoded(object, bytes) { if (object.rule.gzipPrefixHex !== undefined) return Buffer.from(object.rule.gzipPrefixHex, 'hex'); let result = bytes; for (const coding of (object.rule.encoding ?? '').split(',').map(s => s.trim()).filter(Boolean)) { if (coding === 'gzip' || coding === 'x-gzip') { result = zlib.gzipSync(result); if (object.rule.truncateInnerGzip) result = result.subarray(0, result.length - 8); } else if (coding === 'deflate') result = object.rule.rawDeflate ? zlib.deflateRawSync(result) : zlib.deflateSync(result); else if (coding === 'br') result = zlib.brotliCompressSync(result); else if (coding === 'zstd') result = zlib.zstdCompressSync(result); else if (coding === 'GZIP') result = zlib.gzipSync(result); else throw new Error('unknown_fixture_encoding'); } if (object.rule.truncateWire) result = result.subarray(0, Math.max(0, result.length - object.rule.truncateWire)); return result; }
async function collect(req, limit) { const chunks = []; let size = 0; for await (const chunk of req) { size += chunk.length; check(size <= limit, 'body_limit'); chunks.push(chunk); } return Buffer.concat(chunks); }
function json(res, status, value) { const bytes = Buffer.from(JSON.stringify(value)); res.writeHead(status, { 'content-type': 'application/json', 'content-length': bytes.length }); res.end(bytes); }

export async function startControlledObs(tag) {
    assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.equal(process.versions.undici, '7.29.0');
    assert(/^[a-z0-9-]{1,30}$/.test(tag ?? '')); process.chdir(ROOT); assert.equal(realpathSync(ROOT), ROOT);
    const privateDir = join(PRIVATE, 'obs', tag), publicDir = resolve(ROOT, 'tmp/rust-r2k');
    function directory(path, create = true) { if (!existsSync(path) && create) mkdirSync(path, { mode: 0o700 }); const st = lstatSync(path); assert(st.isDirectory() && !st.isSymbolicLink() && (st.mode & 0o077) === 0 && st.uid === process.getuid()); assert.equal(realpathSync(path), path); }
    directory(PRIVATE, false); directory(join(PRIVATE, 'obs')); assert(!existsSync(privateDir), 'OBS tag must be fresh'); directory(privateDir); directory(join(privateDir, 'blobs'));
    const publicStat = lstatSync(publicDir); assert(publicStat.isDirectory() && !publicStat.isSymbolicLink() && publicStat.uid === process.getuid());
    const token = randomBytes(32).toString('hex'), sourceHash = hash(readFileSync(new URL(import.meta.url)));
    const state = { formatVersion: 1, scope: SCOPE, tag, pid: process.pid, node: process.version, undici: process.versions.undici, sourceHash, token, runs: [], objects: [], generatedIntents: [], events: [], startedAt: new Date().toISOString() };
    const save = () => { const tmp = join(privateDir, 'state.next'); writeFileSync(tmp, JSON.stringify(state) + '\n', { mode: 0o600 }); renameSync(tmp, join(privateDir, 'state.json')); }; save();
    const controlFile = { scope: SCOPE, tag, pid: process.pid, token, origin: `http://127.0.0.1:${PORT}`, sourceHash, startedAt: state.startedAt };
    writeFileSync(join(privateDir, 'control.json'), JSON.stringify(controlFile) + '\n', { flag: 'wx', mode: 0o600 });
    const servers = [], sockets = new Set(); let closing = false, ready = false;
    const active = () => state.events.some(event => event.active);
    const publicValue = (value, run) => {
        if (typeof value === 'string') { for (const secret of [token, run.ak, run.sk]) value = value.replaceAll(secret, '[redacted]'); return value; }
        if (Array.isArray(value)) return value.map(item => publicValue(item, run));
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !['ak', 'sk', 'token', 'blob'].includes(key)).map(([key, item]) => [key, publicValue(item, run)]));
        return value;
    };
    const safeRun = run => publicValue({ runId: run.runId, backend: run.backend, bucket: run.bucket, region: run.region, basePath: run.basePath, objects: state.objects.filter(object => object.runId === run.runId), generatedIntents: state.generatedIntents.filter(intent => intent.runId === run.runId), events: state.events.filter(event => event.runId === run.runId) }, run);
    const objectFor = (run, key) => state.objects.find(object => object.runId === run.runId && object.bucket === run.bucket && object.key === key);
    function plan(run, key, expected) {
        check(typeof key === 'string' && key.startsWith(`k-${run.runId}/`) && !key.includes('\0'), 'unowned_key');
        let object = objectFor(run, key); if (!object) { object = { runId: run.runId, backend: run.backend, bucket: run.bucket, key, blob: hash(Buffer.from(run.bucket + '\0' + key)), writes: [], present: false, rule: {}, counter: 0 }; state.objects.push(object); }
        if (expected) { exactKeys(expected, ['sha256', 'size'], 'bad_expected_write'); check(SHA.test(expected.sha256) && Number.isSafeInteger(expected.size) && expected.size >= 0 && expected.size <= MAX_BYTES, 'bad_expected_write'); if (!object.writes.some(write => jsonEqual(write, expected))) object.writes.push(expected); }
        return object;
    }
    function route(req, url) {
        const host = (req.headers.host ?? '').split(':')[0].toLowerCase(); let bucket, key;
        if (host === 'kvirtual.r2k-obs.local') { bucket = 'kvirtual'; const run = state.runs.find(run => run.bucket === bucket && url.pathname.startsWith(run.basePath + '/')); check(run, 'unknown_bucket'); key = decodeURIComponent(url.pathname.slice((run.basePath + '/').length)); return { run, key }; }
        check(['127.0.0.1', 'localhost', 'r2k-obs.local'].includes(host), 'unknown_host');
        for (const run of state.runs) { const prefix = run.basePath + '/' + encodeURIComponent(run.bucket); if (url.pathname === prefix || url.pathname === prefix + '/') { bucket = run.bucket; key = null; return { run, key }; } if (url.pathname.startsWith(prefix + '/')) { bucket = run.bucket; key = decodeURIComponent(url.pathname.slice(prefix.length + 1)); return { run, key }; } }
        throw Object.assign(new Error('unknown_bucket'), { publicCode: 'unknown_bucket' });
    }
    function generatedObject(run, key, bytes, event) {
        const exact = state.generatedIntents.find(intent => intent.runId === run.runId && intent.bucket === run.bucket && intent.boundKey === key);
        const possible = exact ? [exact] : state.generatedIntents.filter(intent => intent.runId === run.runId && intent.bucket === run.bucket && intent.boundKey === null).filter(intent => { try { packageKey(intent, key); return true; } catch { return false; } });
        check(possible.length === 1, possible.length ? 'ambiguous_generated_intent' : 'unplanned_object');
        const intent = possible[0], validation = validateGeneratedPackage(bytes, key, intent);
        // Bind only after the signature and independent complete archive checks.
        check(!intent.boundKey || intent.boundKey === key, 'generated_intent_already_bound'); intent.boundKey = key; intent.validation = validation;
        const object = plan(run, key, { sha256: validation.archiveSha256, size: bytes.length });
        check(!object.generatedIntentId || object.generatedIntentId === intent.id, 'generated_object_conflict');
        object.generatedIntentId = intent.id; object.rule = intent.rule; event.generatedPackage = { intentId: intent.id, ...validation }; return object;
    }
    function validateRule(rule) {
        check(rule && Object.keys(rule).every(key => ['encoding', 'gzipPrefixHex', 'rawDeflate', 'truncateInnerGzip', 'truncateWire', 'status', 'errorBody', 'closeAttempts', 'redirectSelf', 'redirectBeforeSuccess', 'redirectLocation', 'resetBeforeBody', 'resetAfterBytes', 'stallAfterBytes'].includes(key)), 'invalid_rule');
        if (rule.gzipPrefixHex !== undefined) check(rule.encoding === 'gzip' && ['61', '6162', '1f', '1f8b'].includes(rule.gzipPrefixHex), 'invalid_gzip_prefix_vector');
    }
    async function control(req, res) {
        const input = JSON.parse((await collect(req, 1024 * 1024)).toString('utf8')); check(equal(input.token ?? '', token), 'invalid_control_token'); let value;
        if (input.action === 'register') {
            check(RUN_UUID.test(input.runId) && ['nest', 'rust', 'protocol'].includes(input.backend), 'invalid_run');
            check(typeof input.bucket === 'string' && /^[a-z0-9][a-z0-9-]{2,62}$/.test(input.bucket) && !state.runs.some(run => run.bucket === input.bucket || run.runId === input.runId), 'bucket_or_run_not_exclusive');
            check(typeof input.ak === 'string' && input.ak.length > 8 && typeof input.sk === 'string' && input.sk.length > 16, 'synthetic_credentials_required');
            const basePath = input.basePath ?? ''; check(typeof basePath === 'string' && (!basePath || basePath.startsWith('/')) && !basePath.endsWith('/') && !basePath.includes('..'), 'invalid_base_path');
            const run = { runId: input.runId, backend: input.backend, bucket: input.bucket, ak: input.ak, sk: input.sk, region: input.region ?? 'r2k', basePath }; state.runs.push(run); value = { registered: true, runId: run.runId, bucket: run.bucket };
        } else if (input.action === 'shutdown') {
            check(state.objects.every(object => !object.present) && !active(), 'active_state_blocks_shutdown'); closing = true; ready = false; value = { stopping: true, objects: 0, active: 0 };
            setTimeout(() => { for (const server of servers) server.close(); for (const socket of sockets) socket.destroy(); }, 20);
        } else {
            const run = state.runs.find(run => run.runId === input.runId && run.bucket === input.bucket); check(run, 'unknown_run');
            if (input.action === 'plan') { const object = plan(run, input.key, input.expected); value = { planned: true, key: object.key }; }
            else if (input.action === 'planGeneratedPackage') {
                check(!state.generatedIntents.some(intent => intent.id === input.intent?.id), 'intent_not_fresh');
                const intent = validatePackageIntent(input.intent, run.runId); intent.bucket = run.bucket;
                check(!state.generatedIntents.some(other => other.runId === run.runId && other.handoverId === intent.handoverId && other.boundKey === null), 'pending_intent_same_handover');
                state.generatedIntents.push(intent); value = { planned: true, intentId: intent.id, keyPrefix: `k-${run.runId}/attachment-download-packages/`, packageIdPredicted: false, atMostNewObjects: 1, plannedAt: intent.plannedAt };
            } else if (input.action === 'setGeneratedReadRule') {
                const object = objectFor(run, input.key), intent = state.generatedIntents.find(intent => intent.id === object?.generatedIntentId);
                validateGeneratedReadTarget(object, intent, run.runId, run.bucket, input.key);
                object.readRule = validateGeneratedReadRule(input.rule); value = { configured: true, scope: 'generated-object-read-only', readRule: object.readRule };
            } else if (input.action === 'rule') { const object = objectFor(run, input.key); check(object && !object.generatedIntentId, 'unplanned_or_generated_object'); validateRule(input.rule); object.rule = input.rule; object.counter = 0; value = { configured: true }; }
            else if (input.action === 'head') { const object = objectFor(run, input.key); check(object, 'unplanned_object'); value = { exists: object.present, ...(object.present ? { sha256: object.sha256, size: object.size } : {}) }; }
            else if (input.action === 'remove') {
                const object = objectFor(run, input.key); check(object, 'unplanned_object'); check(!state.events.some(event => event.runId === run.runId && event.key === object.key && event.active), 'active_stream_blocks_remove');
                if (object.present) { check(SHA.test(input.expectedHash) && input.expectedHash === object.sha256, 'changed_object'); const file = join(privateDir, 'blobs', object.blob); check(hash(readFileSync(file)) === object.sha256, 'blob_changed'); unlinkSync(file); object.present = false; value = { removed: true }; } else value = { removed: false };
            } else if (input.action === 'snapshot') value = safeRun(run);
            else throw Object.assign(new Error('unknown_control_action'), { publicCode: 'unknown_control_action' });
        }
        save(); json(res, 200, value);
    }
    async function handle(req, res) {
        let event;
        try {
            check(!closing, 'peer_closing'); check(['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress), 'non_loopback_peer');
            const url = new URL(req.url, 'http://' + req.headers.host);
            if (url.pathname === '/health') { check(req.method === 'GET' && ready, 'not_ready'); json(res, 200, { scope: SCOPE, tag, pid: process.pid, ready: true, sourceHash, startedAt: state.startedAt, node: process.version, undici: process.versions.undici, port: PORT }); return; }
            if (url.pathname === CONTROL) { check(req.method === 'POST' && ready, 'control_method_or_not_ready'); await control(req, res); return; }
            const { run, key } = route(req, url);
            event = { seq: state.events.length + 1, at: new Date().toISOString(), runId: run.runId, bucket: run.bucket, key, method: req.method, path: url.pathname, queryKeys: [...url.searchParams.keys()], defaultHeaders: Object.fromEntries(['accept', 'accept-language', 'accept-encoding', 'user-agent', 'connection', 'sec-fetch-mode'].map(name => [name, req.headers[name] ?? null])), active: true }; state.events.push(event);
            let timer; res.on('close', () => { if (timer) clearTimeout(timer); event.active = false; event.closedAt = new Date().toISOString(); event.aborted = !res.writableFinished; save(); });
            const bytes = await collect(req, MAX_BYTES); event.requestBytes = bytes.length; event.requestSha256 = hash(bytes); event.signature = verify(req, url, run, bytes); event.signatureVerified = true; event.verified = true;
            if (key === null) { check(req.method === 'HEAD', 'bucket_read_only'); event.status = 200; res.writeHead(200, { 'content-length': '0' }); res.end(); save(); return; }
            let object = objectFor(run, key);
            if (req.method === 'PUT' && (!object || object.generatedIntentId)) { check(req.headers['content-type'] === 'application/zip', 'generated_content_type'); object = generatedObject(run, key, bytes, event); }
            check(object, 'unplanned_object'); object.counter++;
            if (req.method === 'PUT') check(object.writes.some(write => write.sha256 === hash(bytes) && write.size === bytes.length), 'unplanned_write_bytes');
            if (object.rule.closeAttempts && object.counter <= object.rule.closeAttempts) { event.status = 'connection-reset'; save(); req.socket.destroy(); return; }
            if (object.rule.redirectSelf || object.rule.redirectLocation || object.counter <= (object.rule.redirectBeforeSuccess ?? 0)) { event.status = object.rule.status ?? 307; const location = object.rule.redirectLocation ?? req.url; res.writeHead(event.status, { location, 'content-length': 0 }); res.end(); save(); return; }
            if (object.rule.status && object.rule.status >= 400) { event.status = object.rule.status; const error = Buffer.from(object.rule.errorBody ?? 'Controlled OBS failure'); res.writeHead(event.status, { 'content-type': 'text/plain', 'content-length': error.length }); res.end(error); save(); return; }
            if (req.method === 'PUT') { writeFileSync(join(privateDir, 'blobs', object.blob), bytes, { mode: 0o600 }); Object.assign(object, { present: true, sha256: hash(bytes), size: bytes.length, contentType: req.headers['content-type'] ?? null, checksum: req.headers['x-amz-meta-sha256'] ?? null, lastModified: 'Thu, 01 Jan 2026 00:00:00 GMT' }); event.status = 200; res.writeHead(200, { 'content-length': 0, etag: '"' + object.sha256 + '"' }); res.end(); save(); return; }
            if (!object.present) { event.status = 404; res.writeHead(404, { 'content-length': 0 }); res.end(); save(); return; }
            if (req.method === 'DELETE') { const file = join(privateDir, 'blobs', object.blob); check(hash(readFileSync(file)) === object.sha256, 'blob_changed'); unlinkSync(file); object.present = false; event.status = 204; res.writeHead(204); res.end(); save(); return; }
            check(['HEAD', 'GET'].includes(req.method), 'unsupported_method'); const plain = readFileSync(join(privateDir, 'blobs', object.blob)); check(hash(plain) === object.sha256, 'blob_changed'); const wire = encoded(object, plain);
            const readRule = object.generatedIntentId ? object.readRule ?? {} : object.rule;
            if (object.generatedIntentId) event.generatedReadRule = structuredClone(readRule);
            const headers = { 'content-length': String(wire.length), etag: '"' + object.sha256 + '"', 'last-modified': object.lastModified, 'content-type': object.contentType ?? 'application/octet-stream' }; if (object.checksum !== null) headers['x-amz-meta-sha256'] = object.checksum; if (object.rule.encoding) headers['content-encoding'] = object.rule.encoding; event.status = 200; event.responseBytes = wire.length; event.responseSha256 = hash(wire); res.writeHead(200, headers);
            if (req.method === 'HEAD') { res.end(); save(); return; }
            event.sent = 0;
            if (readRule.resetBeforeBody) { res.flushHeaders(); timer = setTimeout(() => res.destroy(), 60); }
            else if (readRule.resetAfterBytes || readRule.stallAfterBytes) { const count = Math.min(readRule.resetAfterBytes ?? readRule.stallAfterBytes, wire.length); res.write(wire.subarray(0, count)); event.sent = count; res.flushHeaders(); event.readFaultTimerMs = readRule.stallAfterBytes ? 20000 : 80; timer = setTimeout(() => res.destroy(), event.readFaultTimerMs); }
            else { event.sent = wire.length; res.end(wire); } save();
        } catch (error) {
            if (event) { event.verified = false; event.failure = error.publicCode ?? 'fixture_rejected'; event.status = 403; save(); }
            if (!res.headersSent) json(res, 403, { error: error.publicCode ?? 'fixture_rejected' }); else res.destroy();
        }
    }
    for (const host of ['127.0.0.1', '::1']) { const server = createServer(handle); server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); }); await new Promise((resolve, reject) => { server.once('error', reject); server.listen({ host, port: PORT, ipv6Only: host === '::1' }, resolve); }); servers.push(server); }
    ready = true;
    const receipt = { scope: SCOPE, tag, pid: process.pid, startedAt: state.startedAt, bindings: [`127.0.0.1:${PORT}`, `[::1]:${PORT}`], sourceHash, node: process.version, undici: process.versions.undici, sourceDelta: SOURCE_DELTA };
    writeFileSync(join(publicDir, `k-obs-server-${tag}-start.json`), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(receipt));
    await new Promise(resolve => { let count = 0; for (const server of servers) server.on('close', () => { if (++count === servers.length) resolve(); }); });
    check(closing, 'unexpected_server_stop');
    const zero = state.objects.every(object => !object.present) && !active(), sourceUnchanged = hash(readFileSync(new URL(import.meta.url))) === sourceHash;
    const stopped = { ...receipt, stoppedAt: new Date().toISOString(), sourceUnchanged, stopped: true, zero, objectCount: state.objects.filter(object => object.present).length, activeCount: state.events.filter(event => event.active).length };
    writeFileSync(join(publicDir, `k-obs-server-${tag}-stop.json`), JSON.stringify(stopped, null, 2) + '\n', { flag: 'wx' }); check(zero && sourceUnchanged, 'unclean_stop'); return stopped;
}

function syntheticArchive(entries, at) {
    const date = new Date(at), time = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2), day = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
    const local = [], central = []; let offset = 0;
    for (const entry of entries) { const name = Buffer.from(entry.name), data = Buffer.from(entry.data), crc = crc32(data), header = Buffer.alloc(30), c = Buffer.alloc(46);
        header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(time, 10); header.writeUInt16LE(day, 12); header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26); local.push(header, name, data);
        c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(time, 12); c.writeUInt16LE(day, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42); central.push(c, name); offset += header.length + name.length + data.length; }
    const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16); return Buffer.concat([...local, cd, end]);
}
function selfTest() {
    const id = n => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`, run = id(1), at = '2026-10-30T12:00:00.000Z', received = '2026-10-30T12:00:02.000Z', payload = Buffer.from('synthetic-only K payload\n');
    const selection = { selectionId: id(5), attachmentId: id(6), versionGroupId: id(6), fileName: '001-中文😀.txt', sourceRefs: [{ sourceType: 'project', sourceId: id(3), relationType: 'attachment', label: 'synthetic source' }], displayName: '中文😀.txt', category: 'other', securityLevel: 'normal', payloadSHA: hash(payload), size: payload.length };
    const input = { id: id(2), projectId: id(3), handoverId: id(4), selections: [selection], manifestSummary: { includedCount: 1, excludedCount: 0, includedAttachmentIds: [id(6)], excludedAttachmentIds: [], excludedReasons: [] } };
    const intent = validatePackageIntent(input, run, at), key = `k-${run}/attachment-download-packages/2026/10/30/${id(7)}/project-handover-${id(4)}-attachments.zip`;
    const manifest = { packageId: id(7), handoverId: id(4), projectId: id(3), createdAt: at, expiresAt: '2026-10-31T12:00:00.000Z', manifestSummary: input.manifestSummary, items: [{ selectionId: selection.selectionId, attachmentId: selection.attachmentId, versionGroupId: selection.versionGroupId, displayName: selection.displayName, category: selection.category, securityLevel: selection.securityLevel, fileName: selection.fileName, sourceRefs: selection.sourceRefs }] };
    const archive = (m = manifest, body = payload) => syntheticArchive([{ name: 'manifest.json', data: JSON.stringify(m, null, 2) }, { name: selection.fileName, data: body }], at);
    const good = archive(); assert.equal(validateGeneratedPackage(good, key, intent, received).packageId, id(7)); let negative = 0;
    const reject = (fn, code) => { assert.throws(fn, error => error.publicCode === code); negative++; };
    const corrupt = Buffer.from(good); corrupt[30 + Buffer.byteLength('manifest.json')] ^= 1; reject(() => parseStoreZip(corrupt), 'zip_crc');
    const method = Buffer.from(good); method.writeUInt16LE(8, 8); reject(() => parseStoreZip(method), 'zip_local_format');
    const offset = Buffer.from(good); offset.writeUInt32LE(1, offset.length - 6); reject(() => parseStoreZip(offset), 'zip_directory');
    reject(() => validateGeneratedPackage(archive(manifest, Buffer.from('changed')), key, intent, received), 'generated_payload_mismatch');
    reject(() => validateGeneratedPackage(archive({ ...manifest, projectId: id(8) }), key, intent, received), 'manifest_identity');
    reject(() => validateGeneratedPackage(archive({ ...manifest, expiresAt: received }), key, intent, received), 'manifest_date_key_ttl');
    reject(() => validateGeneratedPackage(good, key.replace(id(4), id(8)), intent, received), 'generated_key_scope');
    reject(() => validateGeneratedPackage(archive({ ...manifest, items: [{ ...manifest.items[0], sourceRefs: [] }] }), key, intent, received), 'manifest_item_identity_or_order');
    const bound = { ...intent, boundKey: key, validation: validateGeneratedPackage(good, key, intent, received) }; assert.equal(validateGeneratedPackage(good, key, bound, received).archiveSha256, hash(good));
    reject(() => validateGeneratedPackage(good, key.replace(id(7), id(8)), bound, received), 'generated_intent_already_bound');
    reject(() => validatePackageIntent({ ...input, rule: { status: 200 } }, run, at), 'intent_rule');
    assert.deepEqual(validateGeneratedReadRule({}), {}); assert.deepEqual(validateGeneratedReadRule({ stallAfterBytes: 32 }), { stallAfterBytes: 32 }); assert.deepEqual(validateGeneratedReadRule({ stallAfterBytes: 64 }), { stallAfterBytes: 64 });
    reject(() => validateGeneratedReadRule({ stallAfterBytes: 31 }), 'generated_read_rule'); reject(() => validateGeneratedReadRule({ stallAfterBytes: 65 }), 'generated_read_rule'); reject(() => validateGeneratedReadRule({ stallAfterBytes: 32.5 }), 'generated_read_rule'); reject(() => validateGeneratedReadRule({ status: 503 }), 'generated_read_rule');
    const validatedIntent = { ...bound, bucket: 'synthetic-bucket' }, generated = { runId: run, bucket: validatedIntent.bucket, key, present: true, generatedIntentId: validatedIntent.id, sha256: validatedIntent.validation.archiveSha256, size: good.length, rule: { status: 503 } };
    validateGeneratedReadTarget(generated, validatedIntent, run, validatedIntent.bucket, key);
    const authorityBefore = JSON.stringify({ intent: validatedIntent, putRule: generated.rule }); generated.readRule = validateGeneratedReadRule({ stallAfterBytes: 64 }); generated.readRule = validateGeneratedReadRule({}); assert.equal(JSON.stringify({ intent: validatedIntent, putRule: generated.rule }), authorityBefore);
    reject(() => validateGeneratedReadTarget({ ...generated, present: false }, validatedIntent, run, validatedIntent.bucket, key), 'generated_read_object_not_present');
    reject(() => validateGeneratedReadTarget(generated, validatedIntent, id(8), validatedIntent.bucket, key), 'generated_read_object_not_present');
    reject(() => validateGeneratedReadTarget(generated, validatedIntent, run, 'foreign-bucket', key), 'generated_read_object_not_present');
    reject(() => validateGeneratedReadTarget(generated, validatedIntent, run, validatedIntent.bucket, key + 'foreign'), 'generated_read_object_not_present');
    reject(() => validateGeneratedReadTarget(generated, { ...validatedIntent, validation: null }, run, validatedIntent.bucket, key), 'generated_read_object_not_validated');
    reject(() => validateGeneratedReadTarget({ ...generated, sha256: '0'.repeat(64) }, validatedIntent, run, validatedIntent.bucket, key), 'generated_read_object_not_validated');
    return { kind: 'K-controlled-OBS-synthetic-parser-only', result: 'pass', positive: 7, negative, actualListen: false, actualHTTP: false, DBOrPrivateRead: false, providerOrCloudAcceptanceCertified: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (process.argv.length === 3 && process.argv[2] === '--self-test') console.log(JSON.stringify(selfTest()));
    else if (process.argv.length === 3 && process.argv[2] === '--source-delta') console.log(JSON.stringify(SOURCE_DELTA, null, 2));
    else { assert.equal(process.argv.length, 3); await startControlledObs(process.argv[2]); }
}
