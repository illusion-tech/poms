import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { OwnedFixture } from './owned-fixture.mjs';
assert.equal(process.platform, 'linux'); assert.equal(process.argv.length, 2);
const output = 'tmp/rust-r2gh/reference-guard-witness01.json'; assert(!existsSync(output));
const sha = value => createHash('sha256').update(value).digest('hex');
const report = { formatVersion: 1, finding: 'C-G3-02', result: 'pending', copies: [], startedAt: new Date().toISOString(), boundary: 'New owned rows only. Probe audit rows are durably recorded separately and intentionally excluded from the cleanup ownership allowlist. Refusal is observed before any mutation, then each exact synthetic probe row is removed and verified.' };
try {
    for (const backend of ['nest', 'rust']) {
        const runId = randomUUID(), fixture = await OwnedFixture.connect(backend, runId), db = fixture.client;
        const copy = { backend, runId, cases: [], cleanup: [] }; report.copies.push(copy);
        const rawQuery = db.query.bind(db);
        try {
            const context = await fixture.prepare();
            fixture.j.referenceProbes = [];
            for (const kind of ['unregistered-audit-target-id', 'unregistered-audit-json-compact-uppercase-id']) {
                const probe = { id: randomUUID(), kind, phase: 'planned', targetId: kind === 'unregistered-audit-target-id' ? context.providerId : 'synthetic-unrelated-target', metadata: kind === 'unregistered-audit-target-id' ? null : { externalReference: context.providerId.replaceAll('-', '').toUpperCase() } };
                fixture.j.referenceProbes.push(probe); fixture.save();
                try {
                    const inserted = await rawQuery("insert into poms.audit_log(id,event_type,target_type,target_id,operator_id,request_id,result,reason,metadata) values($1,'r2gh.guard-negative-probe','UnregisteredGHReference',$2,null,null,'success','Controlled local reference guard probe',$3::jsonb) returning to_jsonb(audit_log)::text snapshot", [probe.id, probe.targetId, probe.metadata === null ? null : JSON.stringify(probe.metadata)]);
                    assert.equal(inserted.rowCount, 1); probe.snapshot = inserted.rows[0].snapshot; probe.phase = 'injected'; fixture.save();
                    const before = await fixture.facts(), attemptedMutations = [];
                    db.query = (...args) => {
                        const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
                        if (/^\s*(?:delete|update|insert)\b/i.test(text ?? '')) { attemptedMutations.push(text.split(/\s+/).slice(0, 3).join(' ')); throw new Error('A mutation was attempted before reference refusal'); }
                        return rawQuery(...args);
                    };
                    let rejection;
                    try { await fixture.cleanup(); } catch (error) { rejection = error; }
                    finally { db.query = rawQuery; }
                    assert.equal(rejection?.code, 'complete_reference_foreign_row');
                    assert.equal(attemptedMutations.length, 0);
                    assert.equal(fixture.j.state, 'prepared');
                    const after = await fixture.facts(); assert.equal(sha(JSON.stringify(after)), sha(JSON.stringify(before)), 'Reference rejection must preserve every owned domain row');
                    assert.equal((await rawQuery('select count(*)::int n from poms.identity_provider_config where id=$1', [context.providerId])).rows[0].n, 1);
                    copy.cases.push({ kind, result: 'pass', rejectionCode: rejection.code, deleteInsertUpdateAttempts: 0, ownedFactsUnchanged: true, providerStillExists: true, probeRowId: probe.id, probeRowSha256: sha(probe.snapshot), probeNotAddedToOwnedObjects: !fixture.j.objects.some(item => item.id === probe.id) });
                } finally {
                    db.query = rawQuery;
                    if (probe.phase === 'injected') {
                        const removed = await rawQuery('delete from poms.audit_log t where id=$1 and to_jsonb(t)::text=$2', [probe.id, probe.snapshot]); assert.equal(removed.rowCount, 1, 'Only the exact independently recorded synthetic probe row may be removed');
                        assert.equal((await rawQuery('select count(*)::int n from poms.audit_log where id=$1', [probe.id])).rows[0].n, 0);
                    }
                    probe.phase = 'removed'; fixture.save();
                }
            }
        } finally {
            db.query = rawQuery;
            try {
                for (let pass = 0; pass < 2; pass++) {
                    const result = await fixture.cleanup(); copy.cleanup.push({ pass, matched: result.matched, changed: result.changed, zero: result.zero });
                    if (pass === 1) assert.deepEqual([result.matched, result.changed, result.zero], [0, 0, true]);
                }
            } finally { await fixture.close(); }
        }
    }
    report.result = 'pass';
} catch (error) { report.result = 'fail'; report.error = { name: error.name, code: error.code, assertion: error.name === 'AssertionError' ? error.message : undefined }; process.exitCode = 1; }
finally { report.finishedAt = new Date().toISOString(); writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify({ result: report.result, copies: report.copies.map(row => ({ backend: row.backend, cases: row.cases.length, cleanup: row.cleanup })), output }));
