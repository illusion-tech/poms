// SOURCE-only Root-owned lifecycle around the internal Native/Rust drivers.
// No fake HTTP transport, callback domain implementation or creation authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { databaseFor, marker } from './fixture-guard.mjs';
import { digest, rowIdentity } from './fixture-core.mjs';
import { ident } from './catalog-complete.mjs';
import { sharedUowMeasurementContract } from './l-shared-uow-measurements.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const snapshots = ['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'];

export function decodeSharedUowProbeOutput(rawBytes, { runId, caseId }) {
    assert(Buffer.isBuffer(rawBytes) && rawBytes.length > 0 && rawBytes.length <= 4 * 1024 * 1024);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes), lines = text.trimEnd().split('\n');
    assert(lines.length > 0 && lines.length <= 128);
    const records = lines.map(line => JSON.parse(line));
    const identity = records.filter(record => record.kind === 'private-uow-connection'); assert.equal(identity.length, 1);
    assert.equal(identity[0].runId, runId); assert.equal(identity[0].caseId, caseId);
    const final = records.filter(record => record.kind === 'private-actual-Rust-caller-owned-positive-L-UoW'); assert.equal(final.length, 1);
    assert.equal(records.at(-1), final[0]); assert.equal(final[0].runId, runId); assert.equal(final[0].caseId, caseId);
    assert.deepEqual(final[0].connectionIdentity, identity[0].connection);
    assert.equal(final[0].ownershipAdmitted, false, 'The example trace is diagnostic, not a PG ownership authority');
    for (const record of records.filter(record => record.kind === 'private-uow-stage')) assert.equal(record.caseId, caseId);
    return { observation: final[0], byteSource: 'actual-process-stdout-jsonl', rawBytes,
        connectionEvent: identity[0], actualProcessOutputParsed: true, ownershipAdmitted: false };
}

// Root calls fixture.defineCase with the complete scope first. execute() must
// invoke runNativeSharedUow (which brands its context) or the source-bound real
// Rust example. retain() is a private durable-file callback, never public raw.
export async function captureSharedUow({ fixture: f, native, pg, context, executionBackend, projectId, actorId,
    execute, facts, retain }) {
    for (const fn of [execute, facts, retain]) assert.equal(typeof fn, 'function');
    assert(['native', 'rust'].includes(executionBackend)); assert.equal(f.j.namespace, 'poms-r2l');
    // Before intents, observer BEGIN, execute or caller BEGIN. An original SDK
    // l.internal-uow certificate is not a Rust-DB original-producer proof.
    assert.equal(f.backend, executionBackend === 'native' ? 'nest' : 'rust', 'Internal-UoW execution/fixture backend combination rejected before writes');
    assert.equal(f.j.backend, f.backend); assert.equal(f.j.marker, marker);
    assert.equal(native.report().databaseBackend, f.backend, 'The actual original Native provider must use this fixture database before preintents or a PG case');
    assert.equal(context.runId, f.runId); assert.equal(context.op, 'l.internal-uow');
    const scope = f.scope(context.caseId); assert(scope.projects.includes(projectId));
    assert([...scope.actors, ...scope.borrowedActors].includes(actorId));
    const intents = [];
    for (const table of snapshots) intents.push(await f.intent(table, { project_id: projectId, created_by: actorId }, { caseId: context.caseId }));
    await native.witness.drain(); native.witness.assertComplete();
    const cursor = native.witness.snapshot().committed.length, before = await facts(), sqlStart = native.sql.length;
    const record = { kind: 'private-real-internal-L-UoW-capture', context, executionBackend, intents, before, sqlStart,
        measurementContract: sharedUowMeasurementContract,
        state: 'prepared', httpResponseClaimed: false, creationOwnershipFromDriverOutput: false };
    await retain(record);
    await pg.beginCase(context); record.pgCaseOpenedBeforeCallerTransaction = true; await retain(record);
    try {
        const output = await execute(context, { retainStage: async ({ name, observation }) => {
            record.completedStages ??= [];
            record.completedStages.push({ name, stage: structuredClone(observation.stages.at(-1)) });
            await retain(record);
        } });
        assert(output && Buffer.isBuffer(output.rawBytes) && output.rawBytes.length > 0);
        assert(['actual-process-stdout-jsonl', 'capture-encoding-of-original-SDK-values'].includes(output.byteSource));
        record.rawOutput = { byteSource: output.byteSource, bytesBase64: output.rawBytes.toString('base64'),
            bytes: output.rawBytes.length, sha256: sha(output.rawBytes) };
        record.observation = output.observation; record.state = 'actual-output-durable-before-certification';
        await retain(record);
        assert.equal(output.byteSource, executionBackend === 'native' ? 'capture-encoding-of-original-SDK-values' : 'actual-process-stdout-jsonl');
        assert.equal(output.observation.kind, executionBackend === 'native' ? 'private-actual-original-shared-parent-UoW-observation' : 'private-actual-Rust-caller-owned-positive-L-UoW');
        if (executionBackend === 'native') assert.deepEqual(output.observation.measurementContract, sharedUowMeasurementContract);
        assert.equal(output.observation.result, 'observed', 'Retain Partial; never certify a failed internal driver');
        await native.witness.drain(); native.witness.assertComplete();
        const trace = native.witness.snapshot(), created = trace.committed.slice(cursor), pgRows = await pg.drainCase();
        record.pgRows = pgRows; record.sdkCommittedCreates = created; record.sdkTrace = trace; await retain(record);
        if (executionBackend === 'rust') assert.equal(created.length, 0, 'The controlled Rust example is not an original Native SDK create');
        for (const item of pgRows) {
            assert(snapshots.includes(item.table));
            const result = await f.client.query(`select to_jsonb(t) as row from poms.${ident(item.table)} t where id=$1::uuid`, [item.id]);
            assert.equal(result.rows.length, 1); assert.equal(digest(rowIdentity(item.table, result.rows[0].row)), digest(item.identity));
            if (executionBackend === 'native') assert(created.some(other => other.table === item.table && other.id === item.id), 'Every PG shadow must match a genuine SDK create');
        }
        for (const item of created) {
            assert(snapshots.includes(item.table), 'Unexpected created table in the bounded positive L driver');
            assert(pgRows.some(other => other.table === item.table && other.id === item.id), 'Every original created snapshot needs independent PG7 shadow');
        }
        const actual = executionBackend === 'rust' ? pgRows : created;
        const counts = Object.fromEntries(snapshots.map(table => [table, actual.filter(item => item.table === table).length]));
        assert.equal(counts[snapshots[0]], counts[snapshots[1]]); assert([0, 1].includes(counts[snapshots[0]]));
        if (output.observation.outerActualAction.startsWith('rollback')) assert.equal(actual.length, 0, 'An outer rollback is never an acknowledged create');
        let certified;
        if (executionBackend === 'native') {
            const source = 'tools/rust-r2l/k-native-write-witness.mjs';
            const authorityId = f.registerNativeAuthority({ id: randomUUID(), kind: 'mikro-orm-afterCreate-outer-commit', runId: f.runId,
                backend: f.backend, database: databaseFor(f.backend), marker, source: { file: source, sha256: sha(fs.readFileSync(source)) }, trace });
            certified = created.map(item => {
                const intent = intents.filter(candidate => candidate.table === item.table); assert.equal(intent.length, 1);
                return { ...item, authorityId, intentId: intent[0].id };
            });
        } else {
            certified = pgRows;
            for (const item of certified) {
                assert.equal(item.authorityId, pg.receipt().id); assert.equal(item.proof.kind, 'pg-after-insert-observed-outer-commit');
                assert(intents.some(intent => intent.id === item.intentId && intent.table === item.table));
            }
        }
        if (certified.length) f.recordCommittedCreates(certified);
        await f.resolveNoCreates(context.caseId); await f.adoptIntents();
        record.after = await facts(); record.sqlEnd = native.sql.length; record.snapshotCounts = counts;
        record.state = 'observed-and-ownership-certified'; await retain(record);
        return { result: 'observed', context, executionBackend, snapshotCounts: counts, before, after: record.after,
            observation: output.observation, measurementContract: sharedUowMeasurementContract, httpResponseClaimed: false,
            ownershipAuthority: executionBackend === 'rust' ? 'independent-PG7-actual-outer-commit' : 'actual-original-SDK-matched-PG7',
            RustTraceUsedAsOwnership: false, crossBackendCompared: false, G3Certified: false, G4Certified: false };
    } catch (error) {
        record.state = 'partial'; record.failure = { name: error.name, message: error.message, stack: error.stack };
        if (error.sharedUowObservation) record.observation = error.sharedUowObservation;
        await retain(record); throw error;
        // The outer Root lifecycle preserves the actual PG active case/rows on
        // failure; this wrapper never force-clears or adopts by a matching query.
    }
}
