// Separate string-PK ledger. No pre-existing canonical setting can be adopted.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { digest } from './fixture-core.mjs';
import { marker, databaseFor } from './fixture-guard.mjs';

export const settingKey = 'attachment.max-upload-size-mb';
const ledger = fixture => fixture.j.keyed ??= { intents: [], objects: [], cleanup: [] };
export async function planSettingCreate(fixture, key, { caseId }) {
    assert.equal(key, settingKey); assert(!fixture.j.writerDrain);
    const scope = fixture.scope(caseId); assert(scope.actors.length > 0);
    const j = ledger(fixture);
    assert(!j.intents.some(item => item.key === key), 'Canonical setting already has an intent');
    const result = await fixture.client.query('select to_jsonb(t) as row from poms.system_setting t where key=$1', [key]);
    assert.equal(result.rows.length, 0, 'Existing canonical setting refuses ownership');
    const intent = { id: randomUUID(), table: 'system_setting', key, caseId, beforeAbsent: true, state: 'planned' };
    j.intents.push(intent); fixture.save(); return structuredClone(intent);
}
export async function adoptSettingCreate(fixture, intentId, certificate) {
    assert(!fixture.j.writerDrain);
    const j = ledger(fixture), intent = j.intents.find(item => item.id === intentId);
    assert(intent && intent.state === 'planned' && intent.beforeAbsent);
    const authority = fixture.j.authorities.find(item => item.id === certificate.authorityId);
    const proof = certificate.proof, context = proof?.createContext;
    assert(authority && authority.kind === 'pg-after-insert-observed-outer-commit');
    assert.equal(certificate.table, 'system_setting'); assert.equal(certificate.key, intent.key);
    assert.equal(certificate.intentId, intentId); assert.equal(certificate.fixtureProfile?.sourceSetSha256, fixture.fixtureProfile.journalTag.sourceSetSha256);
    assert.equal(proof.table, 'system_setting'); assert.equal(proof.key, intent.key); assert.equal(digest(proof.insertedIdentity), digest({key:intent.key}));
    assert.equal(proof.kind, authority.kind); assert.equal(proof.database, databaseFor(fixture.backend)); assert.equal(proof.marker, marker);
    assert.equal(proof.sourceAuthority, authority.sourceAuthority); assert.equal(proof.observerId, authority.observerId); assert.equal(proof.functionOid, authority.functionOid);
    assert(context && context.runId === fixture.runId && context.caseId === intent.caseId && context.op?.startsWith('m.'));
    for (const key of ['topXid8', 'eventXid8', 'eventXmin', 'observedFullXid8']) assert(/^[0-9]+$/.test(String(proof[key])));
    assert.equal(String(BigInt(proof.eventXid8) % 4294967296n), String(proof.eventXmin));
    assert(BigInt(proof.topXid8) <= BigInt(proof.eventXid8) && BigInt(proof.eventXid8) < BigInt(proof.observedFullXid8));
    assert(BigInt(proof.observedFullXid8) - BigInt(proof.eventXid8) < 2147483648n);
    for (const key of ['outerCommitObserved', 'visibleFromIndependentOwnerConnection']) assert.equal(proof[key], true);
    for (const key of ['outerStatus', 'topXidStatus', 'eventXminStatus']) assert.equal(proof[key], 'committed');
    assert(proof.eventId !== undefined && proof.eventId !== null);
    const result = await fixture.client.query('select to_jsonb(t) as row,xmin::text as xmin from poms.system_setting t where key=$1', [intent.key]);
    assert.equal(result.rows.length, 1);
    const actual = result.rows[0]; assert.equal(actual.row.key, intent.key);
    assert(fixture.scope(intent.caseId).actors.includes(actual.row.updated_by), 'Setting writer must be the owned case actor');
    const object = { table: 'system_setting', key: intent.key, caseId: intent.caseId, creationProof: structuredClone(proof), originalCertificate: structuredClone(certificate), independentlyVisible: true, firstActualRowSha256: digest(actual.row) };
    j.objects.push(object); intent.state = 'adopted'; fixture.save(); return { key: object.key, ownedByExactCommittedCreate: true };
}
export async function assertKeyedCurrent(fixture, { lock = false } = {}) {
    const j = ledger(fixture), found = [];
    assert(j.intents.every(item => ['adopted', 'absent'].includes(item.state)), 'Unresolved canonical setting creation');
    for (const object of j.objects) {
        assert.equal(object.key, settingKey); assert(object.creationProof && object.independentlyVisible);
        const result = await fixture.client.query('select to_jsonb(t) as row from poms.system_setting t where key=$1' + (lock ? ' for update' : ''), [object.key]);
        assert(result.rows.length <= 1);
        if (result.rows.length) { assert.equal(result.rows[0].row.key, object.key); found.push(result.rows[0].row); }
    }
    return found;
}
// Caller owns transaction, full107 preflight and writer-drain check.
export async function cleanupKeyed(fixture) {
    const found = await assertKeyedCurrent(fixture, { lock: true });
    for (const row of found) {
        const result = await fixture.client.query('delete from poms.system_setting where key=$1 returning key', [row.key]);
        assert.equal(result.rowCount, 1); assert.equal(result.rows[0].key, row.key);
    }
    return { matched: found.length, changed: found.length };
}
export async function resolveNoSettingCreate(fixture, intentId) {
    const intent = ledger(fixture).intents.find(item => item.id === intentId);
    assert(intent && intent.state === 'planned');
    const result = await fixture.client.query('select key from poms.system_setting where key=$1', [intent.key]);
    assert.equal(result.rows.length, 0, 'Unknown setting row cannot be adopted or deleted');
    intent.state = 'absent'; fixture.save(); return { resolvedAbsent: true };
}
