// Pure Native reference boundary helpers; no runtime side effects on import.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
export const NATIVE92 = Object.freeze({ namespace: 'poms-r4ghi', root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
    stateRoot: '/home/wangzishi/.local/share/poms-r4ghi', private: '/home/wangzishi/.local/share/poms-r4ghi/private',
    database: 'poms_r4ghi_native', rustDatabase: 'poms_r4ghi_rust', api: 'http://127.0.0.1:31442', port: 31442 });
export const sha92 = value => createHash('sha256').update(value).digest('hex');
export function segment92(value) { assert(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(value)); return value; }
export function args92(argv) {
    assert.equal(argv.length % 2, 0); const result = {};
    for (let i = 0; i < argv.length; i += 2) { assert(/^--[a-z-]+$/.test(argv[i]) && typeof argv[i + 1] === 'string' && argv[i + 1] && !Object.hasOwn(result, argv[i])); result[argv[i]] = argv[i + 1]; }
    return result;
}
export function taggedCases92(inventory) {
    assert.equal(inventory.exactCaseCount, 17); assert.equal(inventory.controllerCases.length, 17);
    assert.equal(new Set(inventory.controllerCases.map(row => row.operationId)).size, 17);
    return inventory.controllerCases.map(row => {
        assert(row.methodGuard && row.method === 'POST'); assert.equal(row.expectedStatus, 422);
        const params = Object.fromEntries([...row.runtimePath.matchAll(/\{([^}]+)\}/g)].map(match => [match[1], randomUUID()]));
        return { operationId: row.operationId, method: 'POST', template: row.runtimePath, params,
            path: row.runtimePath.replace(/\{([^}]+)\}/g, (_, name) => params[name]),
            body: { inputVersion: 'server-derived-v1' }, expectedStatus: 422,
            expectedCode: 'rust_r4ghi_protocol_unsupported_by_native_reference',
            expectedMessage: `Frozen Native reference cannot execute ${row.expectedMessageReason}; use the Rust implementation.`,
            anchorQualification: 'syntactic-protocol-route-anchor-not-a-business-resource', validModernBusinessDTOClaimed: false };
    });
}
export function assertUnsupported92(attempt, test) {
    assert.equal(attempt.status, 422); assert.equal(attempt.responseComplete, true); assert.equal(attempt.transportFailure, false);
    assert.equal(attempt.body?.statusCode, 422); assert.equal(attempt.body?.code, test.expectedCode);
    assert.equal(attempt.body?.message, test.expectedMessage, 'Must be the protocol guard, not a later legacy-shape error');
}
export function normalizeNativeEnv92(bytes, parse, fixed) {
    const source = bytes.toString('utf8'), values = parse(bytes);
    for (const [key, expected] of Object.entries({ DB_HOST: fixed.host, DB_PORT: String(fixed.port), DB_DATABASE: NATIVE92.database,
        DB_USER: 'poms_r4ghi_native_app', DB_SCHEMA: 'poms' })) assert.equal(values[key], expected, `Owned Native env predicate failed for ${key}`);
    assert.equal(values.DB_CONNECT, 'true', 'Explicit Native DB_CONNECT required'); assert(values.DB_PASSWORD);
    if (values.DATABASE_URL) {
        const url = new URL(values.DATABASE_URL);
        assert(['postgres:', 'postgresql:'].includes(url.protocol)); assert.equal(url.hostname, fixed.host); assert.equal(url.port, String(fixed.port));
        assert.equal(decodeURIComponent(url.pathname.slice(1)), NATIVE92.database); assert.equal(decodeURIComponent(url.username), 'poms_r4ghi_native_app');
    }
    const lines = source.split(/(?<=\n)/), matching = lines.filter(line => /^\s*PORT\s*=/.test(line)); assert.equal(matching.length, 1, 'No duplicate or absent PORT');
    const result = Buffer.from(lines.map(line => /^\s*PORT\s*=/.test(line) ? `PORT=31442${line.endsWith('\r\n') ? '\r\n' : line.endsWith('\n') ? '\n' : ''}` : line).join(''));
    const next = parse(result); assert.equal(next.PORT, '31442');
    for (const key of new Set([...Object.keys(values), ...Object.keys(next)])) if (key !== 'PORT') assert.equal(next[key], values[key], `Unexpected env rewrite for ${key}`);
    return result;
}
export function equalRows92(before, after) {
    assert.equal(after.length, before.length); const map = new Map(before.map(row => [JSON.stringify(row.key), row])); assert.equal(map.size, before.length);
    for (const row of after) { const old = map.get(JSON.stringify(row.key)); assert(old); assert.equal(row.sha256, old.sha256); assert.equal(row.xmin, old.xmin); }
}
export function assertSnapshot92(before, after, { readRows, rawTouch, mode = 'unchanged', sessionId = null, actorId = null, tokenHash = null }) {
    assert.deepEqual(Object.keys(before.databases), Object.keys(after.databases)); assert.deepEqual(before.objects, after.objects);
    let actualSession = null;
    for (const database of Object.keys(before.databases)) {
        const b = before.databases[database], a = after.databases[database]; assert.deepEqual(b.meta, a.meta); assert.deepEqual(Object.keys(b.tables), Object.keys(a.tables));
        for (const table of Object.keys(b.tables)) {
            const old = readRows(b.tables[table]), rows = readRows(a.tables[table]);
            if (database !== NATIVE92.database || table !== 'auth_session' || mode === 'unchanged') { equalRows92(old, rows); continue; }
            if (mode === 'login') {
                assert.equal(rows.length, old.length + 1); const existing = new Set(old.map(row => row.key[0])); const added = rows.filter(row => !existing.has(row.key[0])); assert.equal(added.length, 1);
                equalRows92(old, rows.filter(row => existing.has(row.key[0]))); const value = JSON.parse(added[0].raw);
                assert.equal(value.user_id, actorId); assert.equal(value.token_hash, tokenHash); assert.equal(value.status, 'active'); actualSession = added[0];
            } else {
                assert.equal(mode, 'modern'); assert.equal(rows.length, old.length);
                const seen = new Set(); for (const row of rows) { assert(!seen.has(row.key[0])); seen.add(row.key[0]); const prior = old.find(value => value.key[0] === row.key[0]); assert(prior);
                    if (prior.sha256 === row.sha256 && prior.xmin === row.xmin) continue;
                    assert.equal(row.key[0], sessionId); assert(rawTouch(prior, row, sessionId, actorId), 'Only the new owned Native session may raw-touch'); actualSession = row;
                }
            }
        }
    }
    return actualSession;
}
