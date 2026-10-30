// Pure synthetic negative vectors. Formal saved-ledger shapes here are NOT
// creation certificates or runtime observations; no private file/DB is read.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeUowEvidence, retainedProofStatus, buildUowPublicEvidence, UOW_EXPECTED_TABLES, uowPhysicalColumns,
    expectedUowCloseouts, publicUowEvidenceFailure, compiledUowChain, compiledUowPins } from './l-shared-uow-export.mjs';
import { compareUowExports, materializedNumericLexeme } from './l-shared-uow-compare.mjs';
import { sharedUowMeasurementContract } from './l-shared-uow-measurements.mjs';
const id = n => 'e0000000-0000-4000-8000-' + String(n).padStart(12, '0');
const names = ['parent-loaded', 'parent-second-Todo-dirty', 'after-original-service-child', 'after-outer-action-held-bindings', 'after-cached-reread', 'after-clear-reread-with-held-bindings'];
function vector(backend, offset) {
    const runId = id(offset + 1), todo = id(offset + 2), project = id(offset + 3), actor = id(offset + 4);
    const context = { runId, caseId: 'contract.submit.reject', index: 1, op: 'l.producer' };
    const proof = { kind: 'mikro-orm-afterCreate-outer-commit', sdkVersion: '7.0.11', createContext: context,
        outerTransaction: 'outer', outerCommitEventSeq: 3 };
    const object = { table: 'todo_item', id: todo, caseId: context.caseId, identity: { project_id: project },
        creationProof: proof, postcondition: { independentlyVisible: true } };
    const direct = (table, value, identity) => ({ table, id: value, caseId: 'base', identity,
        creationProof: { kind: 'direct-committed-insert', beforeAbsent: true, commitAcknowledged: true, transaction: '101', xmin: '101' },
        postcondition: { independentlyVisible: true } });
    const item = { table: object.table, id: todo, intentId: 'intent', authorityId: 'authority', proof };
    const journal = { runId, backend, namespace: 'poms-r2l', marker: 'synthetic-marker', sourceHead: 'synthetic-source',
        state: 'cleaned', objects: [object, direct('project', project, {}), direct('platform_user', actor, {})],
        base: { accounts: [{ account: 'admin', userId: actor }] }, borrowed: { definitions: [] },
        intents: [{ id: 'intent', table: object.table, caseId: context.caseId, beforeObserved: true, beforeIds: [] }],
        committedCreates: [item], authorities: [{ id: 'authority', kind: proof.kind, trace: { complete: true,
            diagnostics: [], openTransactions: [], pendingStartCount: 0, committed: [item],
            events: [{ event: 'afterTransactionStart', transaction: 'outer', parent: null, savepointName: null },
                { event: 'afterTransactionCommit', transaction: 'outer', seq: 3 }] } }] };
    const beforeRow = { ...Object.fromEntries(uowPhysicalColumns('todo_item').map(name => [name, null])), id: todo, summary: 'before', row_version: 1 };
    const afterRow = { ...beforeRow, summary: 'after', row_version: 2 };
    const facts = row => Object.fromEntries(UOW_EXPECTED_TABLES.map(table => [table, table === 'todo_item' ? [row] : []]));
    const typed = value => ({ kind: typeof value, value });
    const snapshot = (row, managed = true) => ({ table: 'todo_item', id: todo, managed, queued: false,
        properties: { id: typed(todo), summary: typed(row.summary), rowVersion: typed(row.row_version) },
        original: { id: typed(todo), summary: typed(row.summary), rowVersion: typed(row.row_version) }, originalOwnKeys: ['id', 'rowVersion', 'summary'] });
    const stages = names.map((name, index) => ({ name, at: '2026-10-30T06:00:0' + index + '.000Z',
        managed: index === 5 ? [] : [snapshot(index < 2 ? beforeRow : afterRow)],
        held: { approval: null, todoA: null, todoB: snapshot(index < 2 ? beforeRow : afterRow, index !== 5), payout: null, returnedSnapshot: null } }));
    const observation = { result: 'observed', outerActualAction: 'commit', stages, cachedReread: { todoB: snapshot(afterRow) },
        afterClearReread: { todoB: snapshot(afterRow) }, serviceResult: null, serviceError: null };
    const schema = [{ tableName: 'todo_item', schema: 'poms', properties: [
        { name: 'id', fieldNames: ['id'], nullable: false }, { name: 'summary', fieldNames: ['summary'], nullable: true },
        { name: 'rowVersion', fieldNames: ['row_version'], nullable: false }] }];
    const driver = { backend, runId, marker: 'synthetic-marker', sourceHead: 'synthetic-source',
        tag: 'synthetic', result: 'edges-observed', doubleZero: true, resourceCloseout: expectedUowCloseouts(backend).map(name => ({ name, result: 'pass' })),
        nativeFinal: { witness: structuredClone(journal.authorities[0].trace), pgCaptureComplete: true },
        cleanup: [3, 0].map(deleted => ({ state: 'cleaned', deleted,
            firstZero: { objects: 0, logicalReferences: 0, tablesScanned: 107 },
            secondZero: { objects: 0, logicalReferences: 0, tablesScanned: 107 } })),
        nativeMetadata: schema, sql: [], startedAt: '2026-10-30T05:59:00.000Z' };
    const owner = { context: { runId }, result: 'edges-observed', options: { backend, variant: 'success-commit', outer: 'commit', childSuccess: true,
        continueAfterServiceError: false, expectedAction: 'commit' }, selection: { dirtyTodo: beforeRow, dirtyTodoLogicalRole: 'contract.submit.reject', dirtyTodoCertificate: object },
        initialFacts: facts(beforeRow), currentPairBefore: {} };
    const capture = { context: { runId, op: 'l.internal-uow' }, executionBackend: backend === 'nest' ? 'native' : 'rust',
        measurementContract: sharedUowMeasurementContract, state: 'observed-and-ownership-certified',
        before: facts(beforeRow), after: facts(afterRow), observation, sqlStart: 0, sqlEnd: 0 };
    return { driver, owner, capture, journal };
}
const pair = () => [buildUowPublicEvidence(vector('nest', 10)), buildUowPublicEvidence(vector('rust', 30))];
test('all nested secret/hash/raw keys remain present only as descriptors', () => {
    const value = sanitizeUowEvidence({ password_hash: 'private-hash', nested: { tokenHash: { kind: 'string', value: 'private-token-hash' } },
        bytesBase64: 'opaque-private-raw', harmless: 'kept' });
    const text = JSON.stringify(value);
    for (const secret of ['private-hash', 'private-token-hash', 'opaque-private-raw']) assert(!text.includes(secret));
    assert(value.password_hash.withheld && value.nested.tokenHash.withheld && value.bytesBase64.withheld);
    assert.equal(value.harmless, 'kept');
});
test('unacknowledged direct proof and missing SDK ledger link cannot map owned rows', () => {
    const v = vector('nest', 1), row = v.journal.objects[0];
    assert(retainedProofStatus(row, v.journal).eligible);
    assert.equal(retainedProofStatus(row, { ...v.journal, committedCreates: [] }).eligible, false);
    assert.equal(retainedProofStatus({ ...v.journal.objects[1], creationProof: { kind: 'direct-committed-insert', beforeAbsent: true } }, v.journal).eligible, false);
});
test('equivalent typed fresh identities pair without literal UUID equality', () => {
    const [a, b] = pair(), result = compareUowExports(a, b);
    assert.equal(result.differences.length, 0);
    assert(result.checkedScalars > 20);
    assert(result.gaps.some(gap => gap.kind === 'actual-Rust-example-SQL-is-not-captured'));
    assert.equal(result.G3Certified, false);
});
test('row_version is strict in business rows and parent snapshots', () => {
    const [a, b] = pair(); b.after.todo_item[0].row_version++;
    b.observation.stages[2].held.todoB.properties.rowVersion.value++;
    const result = compareUowExports(a, b);
    assert(result.differences.some(diff => diff.path.endsWith('/row_version')));
    assert(result.differences.some(diff => diff.path.includes('/rowVersion/value')));
});
test('unknown property/observation field and an unpaired managed row produce gaps', () => {
    const [a, b] = pair(); b.observation.unreviewed = 1;
    b.observation.stages[2].held.todoB.properties.unknown = { kind: 'number', value: 1 };
    b.observation.stages[1].managed.push({ ...b.observation.stages[1].managed[0], id: id(999) });
    const result = compareUowExports(a, b);
    assert(result.gaps.some(gap => gap.kind === 'unknown-observation-field'));
    assert(result.gaps.some(gap => gap.kind === 'unpaired-data-field'));
    assert(result.gaps.some(gap => gap.kind === 'unpaired-managed-metadata-row'));
});
test('helper reference values are explicit Native-only and remain retained', () => {
    const [a, b] = pair(); a.observation.stages[5].held.todoB.helperHasEm = true;
    const result = compareUowExports(a, b);
    assert(result.classifications.some(row => row.kind === '519a-explicit-native-only-helper-measure' && row.native === true));
    assert.equal(a.observation.stages[5].held.todoB.helperHasEm, true);
});
test('legacy random UUID TodoB selection remains a scope gap', () => {
    const [a, b] = pair(); delete a.selection.dirtyTodoLogicalRole;
    assert(compareUowExports(a, b).gaps.some(gap => gap.kind === 'legacy-or-unknown-TodoB-selection-epoch'));
});
test('clear does not conceal a held binding still managed or queued', () => {
    const [a, b] = pair(); b.observation.stages[5].held.todoB.queued = true;
    const result = compareUowExports(a, b);
    assert(result.gaps.some(gap => gap.kind === 'old-held-binding-not-detached-after-explicit-clear'));
    assert(result.differences.some(diff => diff.path.endsWith('/queued')));
});
test('each different clock value must fit its own actual source window', () => {
    const [a, b] = pair();
    for (const source of [a, b]) source.schema[0].properties.push({ name: 'updatedAt', fieldNames: ['updated_at'], nullable: false, sqlType: 'timestamptz' });
    a.before.todo_item[0].updated_at = '2026-10-30T05:59:10.000Z'; b.before.todo_item[0].updated_at = '2026-10-30T05:59:20.000Z';
    a.after.todo_item[0].updated_at = '2026-10-30T06:00:01.100Z'; b.after.todo_item[0].updated_at = '2026-10-30T06:00:01.200Z';
    const good = compareUowExports(a, b);
    assert.equal(good.differences.length, 0); assert(good.clocks.length >= 2);
    b.after.todo_item[0].updated_at = '2099-01-01T00:00:00.000Z';
    const bad = compareUowExports(a, b);
    assert(bad.gaps.some(gap => gap.kind === 'unpaired-source-clock-window'));
    assert(bad.differences.some(diff => diff.path.endsWith('/updated_at')));
});
test('business due date and string/number representations never get a blanket tolerance', () => {
    const [a, b] = pair();
    for (const source of [a, b]) source.schema[0].properties.push({ name: 'dueAt', fieldNames: ['due_at'], nullable: true, sqlType: 'timestamptz' });
    a.after.todo_item[0].due_at = '2026-10-30T06:00:01.100Z'; b.after.todo_item[0].due_at = '2026-10-30T06:00:01.200Z';
    a.after.todo_item[0].summary = '2400.00'; b.after.todo_item[0].summary = 2400;
    const result = compareUowExports(a, b);
    assert(result.differences.some(diff => diff.path.endsWith('/due_at')));
    assert(result.differences.some(diff => diff.path.endsWith('/summary')));
});
test('materialized numeric spelling survives JSON-number precision and scale loss', () => {
    const raw = '{"amount": 99999999999999999.00, "summary": "\\"amount\\": 2"}';
    assert.equal(materializedNumericLexeme(raw, 'amount'), '99999999999999999.00');
    assert.notEqual(materializedNumericLexeme('{"amount":0.00}', 'amount'), materializedNumericLexeme('{"amount":0e0}', 'amount'));
    assert.equal(materializedNumericLexeme('{"amount":1,"nested":{"amount":2}}', 'amount'), null);
});
test('empty/missing/duplicate/wrong driver closeout cannot pass saved admission', () => {
    for (const mutation of [
        driver => { driver.resourceCloseout = []; },
        driver => { driver.resourceCloseout.pop(); },
        driver => { driver.resourceCloseout[0].name = driver.resourceCloseout[1].name; },
        driver => { driver.resourceCloseout[0].result = 'fail'; },
        driver => { driver.cleanup = []; },
    ]) {
        const value = vector('nest', 10); mutation(value.driver);
        const actual = buildUowPublicEvidence(value);
        assert.equal(actual.result, 'exported-with-gaps');
        assert(actual.gaps.some(gap => gap.kind === 'incomplete-driver-cleanup-or-closeout'));
    }
});
test('global witness must be complete and explicitly zero for every pending/error state', () => {
    for (const mutation of [
        value => { value.driver.nativeFinal.witness.complete = false; },
        value => { value.driver.nativeFinal.witness.diagnostics.push({ synthetic: true }); },
        value => { value.driver.nativeFinal.witness.openTransactions.push('open'); },
        value => { value.driver.nativeFinal.witness.pendingStartCount = 1; },
        value => { value.driver.nativeFinal.pgCaptureComplete = false; },
        value => { delete value.driver.nativeFinal.witness.diagnostics; },
        value => { value.driver.nativeFinal.witness.committed = []; },
    ]) {
        const value = vector('nest', 10); mutation(value);
        assert(buildUowPublicEvidence(value).gaps.some(gap => ['incomplete-global-SDK-or-Native-PG-capture', 'global-SDK-trace-missing-retained-admitted-proof'].includes(gap.kind)));
    }
});
test('each retained SDK authority rejects complete=true with nonzero diagnostics/open/pending', () => {
    for (const mutation of [
        trace => trace.diagnostics.push({ synthetic: true }),
        trace => trace.openTransactions.push('open'),
        trace => { trace.pendingStartCount = 1; },
    ]) {
        const value = vector('nest', 10); mutation(value.journal.authorities[0].trace);
        assert.equal(retainedProofStatus(value.journal.objects[0], value.journal).eligible, false);
        assert(buildUowPublicEvidence(value).gaps.some(gap => gap.kind === 'incomplete-original-SDK-authority-trace'));
    }
});
test('remaining35 table writes and missing40-table/column data are independent coverage gaps', () => {
    const [a, b] = pair();
    const row = { ...Object.fromEntries(uowPhysicalColumns('project').map(name => [name, null])), id: id(900), project_name: 'before', row_version: 1 };
    a.before.project = [structuredClone(row)]; a.after.project = [{ ...row, project_name: 'changed', row_version: 2 }];
    const result = compareUowExports(a, b);
    assert(result.gaps.some(gap => gap.kind === 'independent-local-40-table-coverage-gap'
        && gap.detail.kind === 'unexpected-write-outside-five-table-caller-set'));
    delete b.before.role; delete b.after.todo_item[0].row_version;
    const missing = compareUowExports(a, b);
    assert(missing.gaps.some(gap => gap.detail?.kind === 'incomplete-or-unknown-40-table-set'));
    assert(missing.gaps.some(gap => gap.detail?.kind === 'incomplete-or-unknown-physical-column-set'));
});
test('public error channel never expands a private parser/assertion payload', () => {
    const error = Object.assign(new Error('PRIVATE-PASSWORD-HASH'), { actual: { tokenHash: 'PRIVATE-TOKEN' }, expected: 'PRIVATE-EXPECTED' });
    const text = JSON.stringify(publicUowEvidenceFailure(error, 'saved-evidence-export-cli'));
    for (const value of ['PRIVATE-PASSWORD-HASH', 'PRIVATE-TOKEN', 'PRIVATE-EXPECTED']) assert(!text.includes(value));
    assert.equal(publicUowEvidenceFailure(error, 'saved-evidence-export-cli').rawErrorPublished, false);
    error.name = 'PRIVATE-NAME'; assert.equal(publicUowEvidenceFailure(error, 'saved-evidence-compare-cli').errorName, 'EvidenceError');
});
test('final08 compiled chain rejects a historical07 store or example masquerade', () => {
    const pin = compiledUowPins.candidate08, file = 'tmp/rust-r2l/rust-candidate08-binary-source.json';
    const store = { file: 'apps/poms-api-rust/src/approval_common/store.rs', bytes: pin.storeBytes, rawBytesSha256: pin.storeSha };
    const probe = { file: 'tools/rust-r2l/l-shared-uow-probe.rs', bytes: 23156, rawBytesSha256: '128037a435951fb12bf8a3295875650f1917f10afa0f361ffb927480ca67af4c' };
    // Formal inventory vector only: actual file IO additionally requires the
    // exact real f9c79 metadata bytes and captured snapshot SHA, not this vector.
    const files = [store, probe, ...Array.from({ length: 167 }, (_, index) => ({ file: 'synthetic/' + index, bytes: 1, rawBytesSha256: '0'.repeat(64) }))];
    const binding = { file, rawBytesSha256: pin.mainMeta, expectedBinarySha256: pin.mainSha, sourceFiles: 169 };
    const main = { result: 'pass-build-source-binding-not-runtime', binary: { file: '/home/wangzishi/.local/share/poms-r2l/target/release/poms-api-rust',
        bytes: pin.mainBytes, rawBytesSha256: pin.mainSha }, files };
    assert.equal(compiledUowChain({ binding, main }).epoch, 'candidate08');
    const bad = structuredClone(main); bad.files[0].rawBytesSha256 = compiledUowPins.candidate07.storeSha;
    assert.throws(() => compiledUowChain({ binding, main: bad }));
    assert.throws(() => compiledUowChain({ binding: { ...binding, rawBytesSha256: compiledUowPins.candidate07.mainMeta }, main }));
});
