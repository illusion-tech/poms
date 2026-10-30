// Root/C only. Importing this module performs no filesystem or runtime action.
// Only new isolated fixture responses may contain raw credentials here. Request
// passwords are never retained, and this directory is outside public capsules.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { marker, databaseFor } from './fixture-guard.mjs';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const PRIVATE = '/home/wangzishi/.local/share/poms-r2l/private';
export const lookupResponseEvidencePolicy = Object.freeze({
    revision: 'Root explicit 2026-10-30 lookup-only evidence-policy revision',
    replacesEarlierTokenMemoryOnlyForResponses: true,
    scope: 'Only this batch new isolated fixture responses; never existing browser or production credentials',
    rawResponseBodyAndSetCookie: 'durable new L task-private receipt only', requestPasswords: 'memory only; persisted typed redaction, byte length and hash',
    requestCookieValues: 'hash and byte length only', readers: ['Root', 'C'], publicTmpCapsuleOrGitRawExport: false
});
export function lookupRequestEvidence(json, cookies = new Map()) {
    const redact = (value, key = '') => {
        if (value == null) return value;
        if (/(?:password|token|cookie|authorization|secret)/i.test(key)) { const text = typeof value === 'string' ? value : JSON.stringify(value); return { redacted: true, type: typeof value, bytes: Buffer.byteLength(text), sha256: sha(text) }; }
        if (Array.isArray(value)) return value.map((entry) => redact(entry));
        if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, redact(entry, name)]));
        return value;
    };
    const bytes = json === undefined ? null : Buffer.from(JSON.stringify(json));
    return { body: bytes ? { typedRedacted: redact(json), bytes: bytes.length, sha256: sha(bytes), rawRequestBodyRetained: false } : null,
        cookies: [...cookies].map(([name, value]) => ({ name, bytes: Buffer.byteLength(value), sha256: sha(value), rawValueRetained: false })) };
}
export function createLookupPrivateReceipt({ variant, backend, tag, runIds }, { filesystem = fs, platform = process.platform } = {}) {
    assert.equal(platform, 'linux'); assert(['legacy', 'current'].includes(variant) && ['nest', 'rust'].includes(backend)); assert(/^[a-z0-9-]{1,25}$/.test(tag));
    assert(Array.isArray(runIds) && runIds.length === 2 && new Set(runIds).size === 2 && runIds.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)));
    const checkDirectory = (directory, create = false) => {
        if (create && !filesystem.existsSync(directory)) filesystem.mkdirSync(directory, { mode: 0o700 });
        const stat = filesystem.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o700, 'Unsafe new task-private receipt directory');
    };
    checkDirectory(PRIVATE); const directory = PRIVATE + '/lookup-actual'; checkDirectory(directory, true);
    const file = directory + '/' + variant + '-' + backend + '-' + runIds[0] + '-' + tag + '.json'; assert(!filesystem.existsSync(file), 'Keep previous private receipt attempts');
    let lastHash = null;
    const requestPasswords = new Map();
    const diagnosticText = (value) => value instanceof Error ? JSON.stringify({ name: value.name, message: value.message }) : typeof value === 'string' ? value : JSON.stringify(value);
    const containsPassword = (value) => {
        if (value == null) return false;
        const text = diagnosticText(value);
        return [...requestPasswords.values()].flat().some((password) => text.includes(password));
    };
    const safeDiagnostic = (value) => {
        if (value == null) return value;
        if (typeof value === 'string' && containsPassword(value)) return { withheld: true, privacyClass: 'request-password-echo', bytes: Buffer.byteLength(value), sha256: sha(value) };
        if (value instanceof Error) return { name: safeDiagnostic(value.name), message: safeDiagnostic(value.message) };
        if (Array.isArray(value)) return value.map(safeDiagnostic);
        if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [containsPassword(key) ? 'withheld-key-' + sha(key) : key, safeDiagnostic(item)]));
        return value;
    };
    const raw = { formatVersion: 1, kind: 'private-new-isolated-fixture-lookup-original-evidence', variant, backend, tag, runIds: [...runIds], marker, database: databaseFor(backend), evidencePolicy: lookupResponseEvidencePolicy, requests: [], checkpoints: [], state: 'pending' };
    const verifyFile = () => { const stat = filesystem.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o600 && stat.nlink === 1, 'Unsafe private original receipt file'); assert.equal(sha(filesystem.readFileSync(file)), lastHash, 'Stale/tampered private receipt'); };
    const persist = () => {
        checkDirectory(PRIVATE); checkDirectory(directory);
        if (lastHash) verifyFile();
        const bytes = Buffer.from(JSON.stringify(raw) + '\n'); assert(bytes.length <= 128 * 1024 * 1024, 'Private evidence size bound exceeded');
        const target = lastHash ? file + '.' + randomUUID() + '.tmp' : file;
        const fd = filesystem.openSync(target, 'wx', 0o600);
        try { filesystem.writeFileSync(fd, bytes); filesystem.fsyncSync(fd); } finally { filesystem.closeSync(fd); }
        if (lastHash) filesystem.renameSync(target, file);
        const directoryFd = filesystem.openSync(path.dirname(file), 'r'); try { filesystem.fsyncSync(directoryFd); } finally { filesystem.closeSync(directoryFd); }
        lastHash = sha(bytes); verifyFile(); return { file, bytes: bytes.length, sha256: lastHash, contentsExported: false };
    };
    persist();
    const entry = (index) => { assert(Number.isInteger(index) && index >= 0 && raw.requests[index]); return raw.requests[index]; };
    return {
        pending({ fixtureRunId, name, method, path: route, startedAt, context, intents, before, requestJson, requestCookies = new Map() }) {
            assert(runIds.includes(fixtureRunId) && typeof name === 'string' && !raw.requests.some((row) => row.name === name));
            assert(typeof route === 'string' && route.startsWith('/api/'));
            const passwords = [];
            const collect = (value, key = '') => { if (/password/i.test(key) && typeof value === 'string' && value.length) passwords.push(value); else if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) collect(child, name); };
            collect(requestJson); const index = raw.requests.length; requestPasswords.set(index, passwords);
            raw.requests.push({ fixtureRunId, name, method, path: route, startedAt, context: structuredClone(context), intents: structuredClone(intents), before: structuredClone(before),
                request: lookupRequestEvidence(requestJson, requestCookies), state: 'pending-before-send', certification: { state: 'pending' } }); persist(); return index;
        },
        received(index, response, receivedAt = new Date().toISOString()) {
            const value = entry(index); assert.equal(value.state, 'pending-before-send'); assert(Buffer.isBuffer(response.bodyBytes)); assert(Array.isArray(response.setCookie) && response.setCookie.every((cookie) => typeof cookie === 'string'));
            const passwords = [...requestPasswords.values()].flat(), forbiddenEcho = passwords.some((password) => response.bodyBytes.includes(Buffer.from(password)) || response.setCookie.some((cookie) => cookie.includes(password))) || containsPassword(response.parseError);
            const parseError = forbiddenEcho && response.parseError != null ? { withheld: true, privacyClass: 'request-password-echo', bytes: Buffer.byteLength(diagnosticText(response.parseError)), sha256: sha(diagnosticText(response.parseError)) } : safeDiagnostic(response.parseError);
            value.httpReceivedAt = receivedAt; value.response = { status: response.status, contentType: response.contentType, bodyBytesBase64: forbiddenEcho ? null : response.bodyBytes.toString('base64'), bodyBytes: response.bodyBytes.length, bodySha256: sha(response.bodyBytes),
                setCookie: forbiddenEcho ? null : [...response.setCookie], parseError, rawOriginalRetained: !forbiddenEcho, ...(forbiddenEcho ? { policyWithheld: 'Response echoed request-password material; only byte length/hash retained' } : {}) };
            value.state = 'response-received-unverified'; persist();
            return { status: response.status, contentType: response.contentType, wireBodyBytes: response.bodyBytes.length, wireBodySha256: sha(response.bodyBytes), rawOriginalRetainedPrivately: !forbiddenEcho, setCookieCount: response.setCookie.length,
                credentialPrivacyClass: forbiddenEcho ? 'request-password-echo-withheld-by-policy' : response.setCookie.length || /\/auth\//.test(value.path) ? 'new-isolated-fixture-auth-response-private-original' : 'new-isolated-fixture-business-response-private-original', parseError };
        },
        certified(index, data) { const value = entry(index); assert.equal(value.state, 'response-received-unverified'); Object.assign(value, safeDiagnostic(structuredClone(data)), { state: 'certified', certification: { state: 'complete' } }); persist(); },
        failed(index, error, data = {}) { const value = entry(index); value.failure = { name: safeDiagnostic(error.name), message: safeDiagnostic(error.message) }; Object.assign(value, safeDiagnostic(structuredClone(data))); value.state = value.certification.state === 'complete' ? 'failed-after-certification' : 'failed-uncertified'; persist(); },
        checkpoint(name, data) { raw.checkpoints.push({ name: safeDiagnostic(name), at: new Date().toISOString(), data: safeDiagnostic(structuredClone(data)) }); persist(); },
        finish(state, data) { raw.state = state; raw.closeout = safeDiagnostic(structuredClone(data)); return persist(); },
        descriptor() { verifyFile(); return { file, bytes: filesystem.lstatSync(file).size, sha256: lastHash, contentsExported: false, evidencePolicy: lookupResponseEvidencePolicy }; }
    };
}
