// New-K control client. Importing it does not read private state or perform I/O.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
const PRIVATE = '/home/wangzishi/.local/share/poms-r2k/private';
const ORIGIN = 'http://127.0.0.1:8900', SCOPE = 'rust-r2k-obs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function connectObs(tag) {
    assert.equal(process.platform, 'linux'); assert(/^[a-z0-9-]{1,30}$/.test(tag));
    const file = `${PRIVATE}/obs/${tag}/control.json`, st = lstatSync(file);
    assert(st.isFile() && !st.isSymbolicLink() && (st.mode & 0o077) === 0 && st.uid === process.getuid()); assert.equal(realpathSync(file), file);
    const control = JSON.parse(readFileSync(file)); assert.equal(control.scope, SCOPE); assert.equal(control.tag, tag); assert.equal(control.origin, ORIGIN); process.kill(control.pid, 0);
    async function call(action, body = {}) {
        const response = await fetch(ORIGIN + '/__r2k_obs_control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: control.token, action, ...body }) });
        const result = await response.json(); assert.equal(response.status, 200, 'Controlled K OBS admission rejected: ' + (result.error ?? 'unknown')); return result;
    }
    return {
        health: async () => { const response = await fetch(ORIGIN + '/health'); assert.equal(response.status, 200); const value = await response.json(); assert.equal(value.scope, SCOPE); assert.equal(value.tag, tag); assert.equal(value.pid, control.pid); assert.equal(value.sourceHash, control.sourceHash); assert.equal(value.startedAt, control.startedAt); assert.equal(value.ready, true); assert.equal(value.port, 8900); return value; },
        registerRun: (runId, backend, config) => call('register', { runId, backend, ...config }),
        planGeneratedPackage: (runId, bucket, intent) => call('planGeneratedPackage', { runId, bucket, intent }),
        planOwned: async (object, runId, bytes) => { assert.equal(object.provider, 'huawei-obs-s3'); return call('plan', { runId, bucket: object.bucket, key: object.key, ...(bytes === undefined ? {} : { expected: { sha256: hash(bytes), size: bytes.length } }) }); },
        headOwned: async (object, runId) => { assert.equal(object.provider, 'huawei-obs-s3'); return call('head', { runId, bucket: object.bucket, key: object.key }); },
        removeOwned: async (object, runId, expectedHash) => { assert.equal(object.provider, 'huawei-obs-s3'); return call('remove', { runId, bucket: object.bucket, key: object.key, expectedHash }); },
        setRule: (object, runId, rule) => call('rule', { runId, bucket: object.bucket, key: object.key, rule }),
        setGeneratedReadRule: (object, runId, rule) => { assert.equal(object.provider, 'huawei-obs-s3'); return call('setGeneratedReadRule', { runId, bucket: object.bucket, key: object.key, rule }); },
        snapshotRun: (runId, bucket) => call('snapshot', { runId, bucket }),
        assertRunZero: async (runId, bucket) => { const snapshot = await call('snapshot', { runId, bucket }); assert(snapshot.objects.every(object => !object.present) && snapshot.events.every(event => !event.active)); return { objects: 0, active: 0, zero: true }; },
        shutdown: () => call('shutdown'),
    };
}
