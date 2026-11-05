// ROOT EXECUTION ENTRY. Author checks syntax only and never invokes this file.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { ROOT103, PRIVATE103, PUBLIC103, sha103, readPinned103, readBytesPinned103, createOutput103, environment103, guardDB103, captureDB103, stopped103, collectReceipts103, checkedSupplements103 } from './io125a.mjs';
import { buildOwnership103, diagnoseRows103 } from './ownership125a.mjs';

assert(process.argv.includes('--allowRootExecution'), 'Explicit Root execution admission is required before reads/importing db33');
assert.equal(process.platform, 'linux');
const args = Object.fromEntries(process.argv.slice(2).filter(a => a !== '--allowRootExecution').map(a => { const m = /^--([A-Za-z]+)=(.+)$/.exec(a); assert(m); return [m[1], m[2]]; }));
for (const k of Object.keys(args)) assert(['mode', 'edition', 'backend', 'input', 'inputSha', 'supplements', 'supplementsSha', 'baselineTimeZone'].includes(k));
const mode = args.mode, sides = (args.backend ?? 'both') === 'both' ? ['native', 'rust'] : [args.backend]; assert(['snapshot', 'probe-plan', 'plan', 'apply', 'verify'].includes(mode)); assert(sides.every(s => ['native', 'rust'].includes(s))); assert(/^\d+[a-z]?$/.test(args.edition ?? ''));
if (['apply', 'verify'].includes(mode)) assert(args.input && /^[0-9a-f]{64}$/.test(args.inputSha ?? ''), 'Reviewed private bundle + exact SHA required');
if (args.supplements) assert(/^[0-9a-f]{64}$/.test(args.supplementsSha ?? ''));
const out = await createOutput103(args.edition); let phase = 'admission', environment, failure, commitUnknown = false; const reports = [], actions = [];
try {
    const corePin = await readPinned103(ROOT103 + '/tools/rust-r4def/E/cleanup70/manifest70.json'); assert.equal(corePin.rawBytesSha256, 'a849a1576ae4b99dd96bafc7843eb3fb829a94e379bc8da7f4cc83b712d33c7b');
    const coreFile = ROOT103 + '/tools/rust-r4def/E/cleanup70/core70.mjs'; await readBytesPinned103(coreFile, { rawBytesSha256: 'bb8fdaeb6eeff836ea85ce28f9c4f2ded703ad21a8ad943e8df22d641bd51435' }); const core = await import(pathToFileURL(coreFile).href);
    const authority = (await readPinned103(ROOT103 + '/tools/rust-r4def/E/cleanup70/authority70.json')).value;
    const { connect } = await import(pathToFileURL(ROOT103 + '/tools/rust-r4def/db33.mjs').href); environment = await environment103(); if (args.baselineTimeZone) environment.expectedBaselineTimeZone = args.baselineTimeZone;
    const own = ROOT103 + '/tools/rust-r4def/E/cleanup-wrapper103', spec = (await readPinned103(own + '/operation-authority103.json', { rawBytesSha256: 'f170e840b33f9174e6ef2ca1c4a6ce63975fc2bc383a0ac9147e65f185e4b694' })).value, numberSpecs = (await readPinned103(own + '/number-specs103.json', { rawBytesSha256: '25d6408f1011232626ac2331f4a78db1cdc8fa356dc22286414a70d6bc487ddc' })).value.businessNumbers;
    const supplements = await checkedSupplements103(args.supplements, args.supplementsSha);
    let source = args.input ? (await readPinned103(args.input, { rawBytesSha256: args.inputSha })).value : null;
    if (source) assert(['actual-cleanup-wrapper103-private-bundle', 'actual-cleanup-wrapper125-private-bundle', 'actual-cleanup-wrapper125a-private-bundle'].includes(source.kind) && source.namespace === 'poms-r4def' && source.instanceId === environment.identity.marker);
    if (['apply', 'verify'].includes(mode)) {
        assert.equal(source.kind, 'actual-cleanup-wrapper125a-private-bundle', '125a apply/verify requires its own newly reviewed ledger/plan bundle');
        for (const pin of source.receiptPins ?? []) await readBytesPinned103(pin.file, pin);
        const indexedUI = source.UIReceipts ?? []; const stopped = await stopped103(environment, indexedUI), stopPin = await out.private('actual-process-and-port-observations', stopped);
        for (const backend of sides) {
            phase = mode + '-' + backend; const entry = source.databases[backend]; assert(entry?.plan && !entry.ownership?.unclaimed?.length && entry.ownership?.ledger?.rows && entry.plan.planHash, 'Complete reviewed owned plan required');
            const c = await connect(backend); let inTx = false, commitAttempted = false;
            try {
                await guardDB103(c, backend, environment);
                if (mode === 'verify') {
                    const observations = [];
                    for (let pass = 1; pass <= 2; pass++) { const current = await captureDB103(c, backend, environment); assert.equal(current.appConnections.length, 0); const receipt = await out.private(`${backend}-verify-noop-${pass}`, current); observations.push({ ...current, receiptId: receipt.file, executedDML: [] }); }
                    const checked = core.assertTwoNoOps70(entry.plan, observations); reports.push({ backend, mode, actualTwoNoOps: checked, DML: 0 }); continue;
                }
                assert(!entry.executionIneligible, 'A probe-only/unclaimed plan cannot be applied');
                await c.query('BEGIN'); inTx = true;
                // DML exclusion only: no DDL, no constraint deferral/disable.
                const tables = entry.plan.allTables; assert.equal(tables.length, 120); assert(tables.every(n => /^[a-z_][a-z_0-9]*$/.test(n))); await c.query('LOCK TABLE ' + [...tables].sort().map(n => 'poms."' + n + '"').join(',') + ' IN SHARE ROW EXCLUSIVE MODE');
                const current = await captureDB103(c, backend, environment, { insideTransaction: true }); assert.equal(current.appConnections.length, 0, 'Actual app connections must all be gone'); assert.equal(current.otherWriters.length, 0, 'Unknown active owner/writer must stop');
                const actualStopped = { instanceId: environment.identity.marker, allOwnedAPIsStopped: stopped.records.every(p => p.originalProcessGone), allBatchPortsReleased: stopped.ports.every(p => p.actuallyBoundAndReleased), testGatesRestored: current.guards.policies.length === 0 && current.guards.supplement.gateSchemas.length === 1, latestLedgerFrozen: core.snapshotFingerprint70(current.liveRows, current.catalog) === entry.plan.sealedLiveGraphHash, noUnknownConnectionsOrWriters: current.appConnections.length === 0 && current.otherWriters.length === 0 };
                const reseal = await out.private(backend + '-same-Tx-current-reseal', current); core.assertApplyAdmission70(entry.plan, { ...current, stopped: actualStopped, receiptId: reseal.file });
                const outputs = {}, applied = [];
                for (const op of entry.plan.operations) { const statement = core.privateStatement70(op, current.catalog, outputs), result = await c.query(statement.text, statement.values); outputs[op.id] = core.assertOperationResult70(op, result); applied.push({ id: op.id, kind: op.kind, table: op.table, primaryKey: op.primaryKey, actualRows: result.rowCount, returnedFingerprint: outputs[op.id].rowFingerprint }); }
                const inside = await captureDB103(c, backend, environment, { insideTransaction: true }), insidePin = await out.private(backend + '-inside-Tx-restored-before-commit', inside); core.assertRestored70(entry.plan, { ...inside, receiptId: insidePin.file });
                commitAttempted = true; await c.query('COMMIT'); inTx = false; commitAttempted = false; const appliedPin = await out.private(backend + '-actual-actions-commit-ACK', { applied, stopPin, reseal, insidePin });
                const observations = [];
                // Fresh connections are independent of the committed transaction.
                for (let pass = 1; pass <= 2; pass++) { const check = await connect(backend); try { const value = await captureDB103(check, backend, environment); assert.equal(value.appConnections.length, 0); const receipt = await out.private(`${backend}-postcommit-noop-${pass}`, value); observations.push({ ...value, receiptId: receipt.file, executedDML: [] }); } finally { await check.end(); } }
                reports.push({ backend, mode, actualApplied: appliedPin, actualTwoNoOps: core.assertTwoNoOps70(entry.plan, observations), deletedRows: entry.plan.expectedDeleted, restoredBorrowedOriginals: entry.plan.expectedRestored, outerCommitAcknowledged: true });
            } catch (e) { if (inTx && !commitAttempted) { await c.query('ROLLBACK'); actions.push({ backend, rollbackAcknowledged: true }); } else if (commitAttempted) { commitUnknown = true; actions.push({ backend, commitUnknown: true, replayForbidden: true }); } throw e; }
            finally { await c.end(); }
        }
    } else {
        phase = 'read-only-snapshot'; const databases = {};
        for (const backend of sides) {
            if (source?.databases?.[backend]) { databases[backend] = source.databases[backend]; continue; }
            const c = await connect(backend); try { const active = (await c.query("SELECT pid,state FROM pg_stat_activity WHERE datname=$1 AND usename IN('poms_r4def_native_app','poms_r4def_rust_app') AND state IS DISTINCT FROM 'idle'", ['poms_r4def_' + backend])).rows; assert.equal(active.length, 0, 'Read-only planning needs an observed quiet client window'); const current = await captureDB103(c, backend, environment); assert(current.appConnections.every(p => p.state === 'idle'), 'An app request was in flight during the snapshot'); const baselinePin = await readPinned103(PRIVATE103 + '/cleanup-before-' + backend + '-rows.json'); for (const s of authority.backend[backend].baselineSummary) assert.equal(sha103(JSON.stringify(baselinePin.value[s.table])), s.sha256); databases[backend] = { ...current, baselineRows: baselinePin.value, baselinePin: { ...baselinePin, value: undefined } }; } finally { await c.end(); }
        }
        const rust = databases.rust ?? source?.databases?.rust; assert(rust || sides.every(s => s === 'native'), 'Rust raw rows required for actual UI cookie-token correlation');
        const evidence = rust && mode !== 'snapshot' ? await collectReceipts103({ liveRows: rust.liveRows, spec }) : { HTTP: [], internal: [], UI: [], pins: [], fixture: { fullUserId: null, createdCredentialIds: [], createdUserIds: [], receiptIds: [] }, foundation: null };
        const bundle = { kind: 'actual-cleanup-wrapper125a-private-bundle', namespace: 'poms-r4def', instanceId: environment.identity.marker, capturedAt: new Date().toISOString(), sourceEnvironment: environment, UIReceipts: evidence.UI, receiptPins: evidence.pins, databases };
        const indexPin = await out.private('actual-normalized-producer-index', { HTTP: evidence.HTTP, internal: evidence.internal, fixture: evidence.fixture, foundation: evidence.foundation, pins: evidence.pins });
        const snapshotPin = await out.private('source-snapshots125a', bundle); actions.push({ readOnlySnapshotOriginal: snapshotPin });
        for (const backend of sides) {
            phase = 'read-only-index-plan-' + backend; const entry = databases[backend];
            if (!source) { const check = await connect(backend); try { const after = await captureDB103(check, backend, environment); assert(after.appConnections.every(p => p.state === 'idle')); assert.equal(core.snapshotFingerprint70(after.liveRows, after.catalog), core.snapshotFingerprint70(entry.liveRows, entry.catalog), 'Rows changed during the observed read-only planning window'); entry.quietWindowObserved = { secondSnapshotAt: after.capturedAt, noActiveAppQueriesObserved: true, sameWholeGraph: true, universalNoInflightCertificationClaimed: false }; } finally { await check.end(); } }
            if (mode !== 'snapshot') {
                const ownership = buildOwnership103({ backend, scope: entry.scope, baselineRows: entry.baselineRows, liveRows: entry.liveRows, catalog: entry.catalog, HTTPReceipts: evidence.HTTP, internalReceipts: evidence.internal, fixture: evidence.fixture, foundation: evidence.foundation, numberSpecs, supplements: supplements.filter(s => s.backend === backend), sealReceiptId: indexPin.file });
                entry.ownership = ownership; entry.rowCycleDiagnostic = diagnoseRows103(entry); entry.executionIneligible = mode === 'probe-plan';
                const counterIssues = ownership.counters.filter(w => !w.exactRangeCovered && w.beforeFingerprint !== w.afterFingerprint && !w.explicitRootWitness);
                if (ownership.unclaimed.length || counterIssues.length) { entry.executionIneligible = true; reports.push({ backend, claimed: ownership.counts, counterIssues, unclaimed: ownership.unclaimed, baselineDrift: ownership.baselineDrift, rowCycleDiagnostic: entry.rowCycleDiagnostic, planned: false, DMLExecuted: false }); }
                else { entry.plan = core.planDatabaseTeardown70({ ...entry, authority, ownershipLedger: ownership.ledger }); reports.push({ backend, claimed: ownership.counts, baselineDrift: ownership.baselineDrift, publicPlan: core.publicPlan70(entry.plan), rowCycleDiagnostic: entry.rowCycleDiagnostic, probeOnly: mode === 'probe-plan', DMLExecuted: false }); }
            } else reports.push({ backend, tables: Object.keys(entry.liveRows).length, rows: Object.values(entry.liveRows).reduce((n, r) => n + r.length, 0), snapshotOnly: true, DMLExecuted: false });
        }
        // A running-API probe never authorizes DML. A separate final plan captures
        // stopped/latest rows; apply also requires exact same-Tx equality.
        const privateBundle = await out.private('bundle125a', bundle); reports.push({ bundle: privateBundle, normalizedProducerIndex: indexPin, actualDMLExecuted: false });
    }
} catch (e) { const raw = await out.private('failure-original', { phase, name: e.name, message: e.message, stack: e.stack, cycleDetails: e.cycleDetails, commitUnknown }); failure = { phase, name: e.name, original: raw, commitUnknown, automaticRetryForbidden: true }; process.exitCode = 1; }
const receipt = { kind: 'Root-controlled-cleanup-wrapper125a-actual-receipt', mode, phase, reports, actions, failure, DBOrDMLExecutedBy: 'Root explicit entry only', authorExecution: false, objectsHandled: false, servicesStoppedByWrapper: false, mainDatabaseDropped: false, constraintsDisabled: false, rawRowsOrPasswordsPublished: false, G3Certified: false, G4Certified: false };
const publicReceipt = await out.public('receipt125a', receipt); console.log(JSON.stringify({ receipt: publicReceipt, mode, failed: Boolean(failure), commitUnknown, databases: reports.filter(r => r.backend).map(r => ({ backend: r.backend, unclaimed: r.unclaimed?.length, planned: r.planned ?? Boolean(r.publicPlan), deletedRows: r.deletedRows, restoredBorrowedOriginals: r.restoredBorrowedOriginals, actualNoopPasses: r.actualTwoNoOps?.length })) }));
