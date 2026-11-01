// One new-R2M migration singleton. It is never run-owned and is never deleted.
// Root's precise admission + C source review must exist before any live use.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { digest } from './fixture-core.mjs';
import {validateSettingAuditRequestReceipt} from './fixture-audit-identity.mjs';
import { databaseFor, marker, root, sourceHead, validateSource } from './fixture-guard.mjs';

export const baselineSettingKey = 'attachment.max-upload-size-mb';
export const baselineSettingCase = 'm2-ui2.attachment-max-upload-size';
const fields = ['key', 'value_type', 'value_json', 'row_version', 'created_at', 'updated_at', 'updated_by'];
const toolFile = 'tools/rust-r2m-continuation01/fixture-setting-baseline.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = [
    'apps/poms-api/src/migrations/Migration20260526100000_ex67a_system_setting.ts',
    'apps/poms-api/src/app/features/system-setting/system-setting.registry.ts',
    'apps/poms-api/src/app/features/system-setting/system-setting.service.ts'
];
const select = 'select to_jsonb(t) as row,t.xmin::text as xmin from poms.system_setting t where key=$1';

function publicAdmissionFile(reference, extension) {
    assert(reference && typeof reference.file === 'string' && /^[0-9a-f]{64}$/.test(reference.rawBytesSha256));
    assert(/^(?:docs\/design\/rust-r2m(?:[/-][a-z0-9_.-]+)*|tmp\/rust-r2m-continuation01\/[a-z0-9_.-]+)$/.test(reference.file));
    assert(reference.file.endsWith(extension) && !reference.file.split('/').includes('..') && !reference.file.includes('/private/'));
    const file = pathToFileURL(path.resolve(root, reference.file));
    const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink());
    const bytes = fs.readFileSync(file); assert.equal(hash(bytes), reference.rawBytesSha256);
    return bytes.toString('utf8');
}
function verifyAdmission(fixture, admission, caseId) {
    assert.equal(caseId, baselineSettingCase, 'Only the frozen M2/UI2 singleton lease case is admitted');
    assert.equal(admission?.kind, 'R2M-environment-baseline-setting-precise-admission');
    for (const [key, expected] of Object.entries({ namespace: 'poms-r2m', marker, sourceHead, database: databaseFor(fixture.backend), backend: fixture.backend, runId: fixture.runId, caseId, key: baselineSettingKey })) assert.equal(admission[key], expected);
    assert.equal(admission.rootApproved, true);
    publicAdmissionFile(admission.correctiveCheckpoint, '.md');
    const review = JSON.parse(publicAdmissionFile(admission.sourceReview, '.json'));
    assert(/^(?:SourceReady|Pass)/.test(review.result ?? ''));
    const exactToolHash = hash(fs.readFileSync(new URL('./fixture-setting-baseline.mjs', import.meta.url)));
    assert(review.reviewedSources?.some(item => item.file === toolFile && item.rawBytesSha256 === exactToolHash), 'C source review must bind this exact singleton tool');
    return { admissionSha256: digest(admission), admission: structuredClone(admission), currentToolRawBytesSha256: exactToolHash };
}
function fullRow(row) {
    assert(row && digest(Object.keys(row).sort()) === digest([...fields].sort()), 'Exact singleton full-row columns required');
    assert.equal(row.key, baselineSettingKey); assert.equal(row.value_type, 'integer');
    assert(Number.isInteger(row.value_json) && row.value_json >= 1 && row.value_json <= 500 && Number.isInteger(row.row_version) && row.row_version >= 1);
    assert(Number.isFinite(Date.parse(row.created_at)) && Number.isFinite(Date.parse(row.updated_at)));
    return row;
}
export function validateBaselineRestoreCandidate(lease, actual) {
    assert.equal(lease?.key, baselineSettingKey); fullRow(lease.before); fullRow(lease.expectedAfter); fullRow(actual);
    assert.equal(digest(lease.before), lease.beforeSha256); assert.equal(digest(lease.expectedAfter), lease.expectedAfterSha256);
    assert.equal(digest(actual), lease.expectedAfterSha256, 'Unrecorded singleton change: preserve it and refuse restore');
    return true;
}
export async function admitBaselineSetting(fixture, admission, { caseId }) {
    assert(!fixture.j.writerDrain && !fixture.j.baselineSettingLease && !(fixture.j.keyed?.objects ?? []).length);
    const scope = fixture.scope(caseId); assert(scope.actors.length > 0);
    const approved = verifyAdmission(fixture, admission, caseId); validateSource();
    const sources = sourceFiles.map(file => { const bytes = fs.readFileSync(new URL('../../' + file, import.meta.url)); return { file, rawBytesSha256: hash(bytes), normalizedLfSha256: hash(bytes.toString('utf8').replace(/\r\n/g, '\n')) }; });
    const lock = await fixture.client.query('select pg_try_advisory_lock(hashtext($1),hashtext($2)) as acquired', ['poms-r2m-singleton-setting', databaseFor(fixture.backend) + ':' + baselineSettingKey]);
    assert.equal(lock.rows[0]?.acquired, true, 'Another singleton lease is active');
    try {
        const result = await fixture.client.query(select, [baselineSettingKey]); assert.equal(result.rows.length, 1);
        const before = fullRow(result.rows[0].row);
        assert.equal(before.value_json, 50); assert.equal(before.row_version, 1); assert.equal(before.updated_by, null);
        assert.equal(before.created_at, before.updated_at);
        const pid = await fixture.client.query('select pg_backend_pid()::text as pid');
        fixture.j.baselineSettingLease = { namespace: 'poms-r2m', key: baselineSettingKey, caseId, ...approved, sourceBinding: sources, state: 'admitted',
            originalFixtureBackendPid: pid.rows[0].pid, before: structuredClone(before), beforeSha256: digest(before),
            expectedAfter: structuredClone(before), expectedAfterSha256: digest(before), observations: [], owned: false, deletionPermitted: false };
        fixture.save(); return { state: 'admitted-migration-singleton-not-owned', beforeSha256: digest(before), key: baselineSettingKey };
    } catch (error) {
        await fixture.client.query('select pg_advisory_unlock(hashtext($1),hashtext($2))', ['poms-r2m-singleton-setting', databaseFor(fixture.backend) + ':' + baselineSettingKey]); throw error;
    }
}
export async function recordBaselineSettingAfter(fixture, requestReceipt) {
    const lease = fixture.j.baselineSettingLease; assert(lease && ['admitted', 'observing'].includes(lease.state) && !fixture.j.writerDrain);
    const scope = fixture.scope(lease.caseId);
    for (const [key, expected] of Object.entries({ namespace: 'poms-r2m', marker, runId: fixture.runId, backend: fixture.backend, caseId: lease.caseId })) assert.equal(requestReceipt[key], expected);
    validateSettingAuditRequestReceipt(fixture.j,requestReceipt,scope);
    assert(['GET', 'PATCH'].includes(requestReceipt.method)); assert.equal(requestReceipt.path, '/api/platform/system-settings/' + baselineSettingKey);
    assert.equal(requestReceipt.completed, true); assert(Number.isInteger(requestReceipt.status));
    for (const key of ['requestSha256', 'responseSha256']) assert(/^[0-9a-f]{64}$/.test(requestReceipt[key]));
    const result = await fixture.client.query(select, [baselineSettingKey]); assert.equal(result.rows.length, 1);
    const actual = fullRow(result.rows[0].row); assert.equal(actual.created_at, lease.before.created_at);
    if (requestReceipt.method === 'GET' || requestReceipt.status !== 200) assert.equal(digest(actual), lease.expectedAfterSha256, 'Read/rejected request changed singleton');
    else {
        assert(scope.actors.includes(actual.updated_by), 'Setting write is not from the owned case actor');
        assert([lease.expectedAfter.row_version, lease.expectedAfter.row_version + 1].includes(actual.row_version));
    }
    lease.observations.push({ request: structuredClone(requestReceipt), fullRow: structuredClone(actual), fullRowSha256: digest(actual), observedXmin: result.rows[0].xmin });
    lease.expectedAfter = structuredClone(actual); lease.expectedAfterSha256 = digest(actual); lease.state = 'observing'; fixture.save();
    return { state: 'actual-full-row-recorded-not-owned', fullRowSha256: digest(actual), rowVersion: actual.row_version };
}
export async function restoreBaselineSetting(fixture) {
    fixture.assertDrained(); const lease = fixture.j.baselineSettingLease;
    assert(lease && ['admitted', 'observing'].includes(lease.state));
    await fixture.client.query('begin'); let restore;
    try {
        const result = await fixture.client.query(select + ' for update', [baselineSettingKey]); assert.equal(result.rows.length, 1);
        validateBaselineRestoreCandidate(lease, result.rows[0].row);
        const transaction = (await fixture.client.query('select pg_current_xact_id()::text as xid')).rows[0].xid;
        restore = { state: 'prepared', transaction, expectedXmin: String(BigInt(transaction) % 4294967296n), beforeRestoreSha256: lease.expectedAfterSha256, targetSha256: lease.beforeSha256 };
        lease.restore = restore; fixture.save();
        const original = lease.before;
        const updated = await fixture.client.query('update poms.system_setting set value_type=$2,value_json=$3::jsonb,row_version=$4,created_at=$5::timestamptz,updated_at=$6::timestamptz,updated_by=$7::uuid where key=$1 and to_jsonb(system_setting)=$8::jsonb and xmin::text=$9 returning to_jsonb(system_setting) as row,xmin::text as xmin',
            [baselineSettingKey, original.value_type, JSON.stringify(original.value_json), original.row_version, original.created_at, original.updated_at, original.updated_by, JSON.stringify(lease.expectedAfter), result.rows[0].xmin]);
        assert.equal(updated.rowCount, 1); assert.equal(digest(updated.rows[0].row), lease.beforeSha256); assert.equal(updated.rows[0].xmin, restore.expectedXmin);
        restore.state = 'commit-attempted'; fixture.save(); await fixture.client.query('commit'); restore.state = 'committed'; restore.commitAcknowledged = true; fixture.save();
    } catch (error) {
        try { await fixture.client.query('rollback'); } catch { if (restore) restore.rollbackUnconfirmed = true; }
        if (restore) { restore.state = ['commit-attempted', 'committed'].includes(restore.state) || restore.rollbackUnconfirmed ? 'outcome-unknown' : 'rolled-back'; fixture.save(); } throw error;
    }
    const { databaseClient } = await import('./database-client.mjs');
    const independent = await databaseClient(fixture.backend);
    try {
        await independent.query('begin read only');
        const pid = (await independent.query('select pg_backend_pid()::text as pid')).rows[0].pid;
        assert.notEqual(pid, lease.originalFixtureBackendPid, 'Restore proof requires another validated connection');
        const current = await independent.query(select, [baselineSettingKey]); assert.equal(current.rows.length, 1);
        assert.equal(digest(current.rows[0].row), lease.beforeSha256); assert.equal(current.rows[0].xmin, restore.expectedXmin);
        const status = await independent.query('select pg_xact_status($1::xid8) as status', [String(restore.transaction)]); assert.equal(status.rows[0].status, 'committed');
        restore.independentFullRowEquality = true; restore.independentBackendPid = pid; restore.committedStatus = 'committed';
        await independent.query('rollback'); lease.state = 'restored'; fixture.save();
    } finally { await independent.end(); }
    const unlocked = await fixture.client.query('select pg_advisory_unlock(hashtext($1),hashtext($2)) as released', ['poms-r2m-singleton-setting', databaseFor(fixture.backend) + ':' + baselineSettingKey]);
    assert.equal(unlocked.rows[0]?.released, true, 'Singleton lease lock not released');
    return { state: 'baseline-restored-not-deleted', fullRowSha256: lease.beforeSha256, independentFullRowEquality: true, owned: false };
}
export async function assertBaselineSettingRestored(fixture) {
    const lease = fixture.j.baselineSettingLease; if (!lease) return;
    assert.equal(lease.state, 'restored', 'Restore singleton before cleaning its owned actor references');
    assert(lease.restore?.commitAcknowledged && lease.restore.independentFullRowEquality && lease.restore.committedStatus === 'committed');
    const current = await fixture.client.query(select, [baselineSettingKey]); assert.equal(current.rows.length, 1); assert.equal(digest(current.rows[0].row), lease.beforeSha256);
}
