import { fixtureProfile } from './fixture-core.mjs';
import { validateAmbient, validateMarker, databaseFor as currentDatabaseFor } from './fixture-guard.mjs';
import { profileFromEnvironment } from './fixture-profile.mjs';
import { publicFixtureError } from './audit-error.mjs';
import { validateBaselineRestoreCandidate, baselineSettingKey } from './fixture-setting-baseline.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { loadManagedEnvironment } = require('./managed-environment.cjs');
// Pure assertions/fake clients only. No prepare, DB connection, real DML, env,
// private journal, borrowed seed query, observer installation or cleanup runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { authority, assertAllForeignKeyShape } from './catalog-complete.mjs';
import { marker, databaseFor } from './fixture-guard.mjs';
import { assertCreationProof, caseIdentity, digest, identities, normalize, rowIdentity, sameIdentity, supportedTables, unsupportedTables, SEED_ACTORS } from './fixture-core.mjs';
import { assertCaseScope, assertNotBorrowed, assertRowReferences, assertScannedRows, deletionGraph, uuidReferences, whereIdentity } from './fixture-references.mjs';
import { plannedJournal, memoryStore } from './fixture-journal.mjs';
import { Fixture } from './fixture.mjs';

const run = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', actor = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const project = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', contract = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const intentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', authorityId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const directProof = { kind: 'direct-committed-insert', beforeAbsent: true, transaction: '10', xmin: '10', commitAcknowledged: true };
function object(table, row, caseId = 'base') {
    return { table, id: row.id, caseId, identity: rowIdentity(table, row), creationProof: directProof, postcondition: { independentlyVisible: true } };
}
function fixture(query = async () => { throw new Error('Unexpected fake SQL'); }) {
    const f = new Fixture({ query }, 'nest', run, { store: memoryStore('nest', run) });
    f.j.state = 'prepared'; f.j.base = { accounts: [{ account: 'admin', userId: actor }], roles: [], orgs: [] };
    f.j.objects.push(object('platform_user', { id: actor, username: 'r2m_actor' })); f.save(); return f;
}
function native() {
    const j = plannedJournal('nest', run), context = { runId: run, caseId: 'contract', index: 1, op: 'm.native' };
    const proof = { kind: 'mikro-orm-afterCreate-outer-commit', sdkVersion: '7.0.11', createEventSeq: 2, createTransaction: 'tx1', createContext: context, releases: [], outerTransaction: 'tx1', outerBeforeCommitEventSeq: 3, outerCommitEventSeq: 4, commitContext: context };
    const item = { table: 'contract', id: contract, authorityId, intentId, proof, fixtureProfile: fixtureProfile.journalTag };
    const trace = { complete: true, diagnostics: [], openTransactions: [], pendingStartCount: 0,
        events: [{ seq: 1, event: 'afterTransactionStart', transaction: 'tx1', parent: null, savepointName: null }, { seq: 2, event: 'afterCreate', table: 'contract' }, { seq: 3, event: 'beforeTransactionCommit', transaction: 'tx1' }, { seq: 4, event: 'afterTransactionCommit', transaction: 'tx1' }],
        committed: [{ table: 'contract', id: contract, proof: structuredClone(proof) }] };
    j.authorities.push({ id: authorityId, kind: proof.kind, database: databaseFor('nest'), marker, trace, fixtureProfile: fixtureProfile.journalTag });
    return { j, item, intent: { id: intentId, table: 'contract', caseId: 'contract', beforeObserved: true, beforeIds: [] } };
}

test('R2M stage admits62 named UUID tables;45 rejected by UUID ownership', () => {
    assert.equal(supportedTables.length, 62); assert.equal(unsupportedTables.length, 45);
    for (const table of ['approval_summary_package_definition', 'poms_migrations', 'change_package_baseline', 'contract_amendment']) {
        assert(unsupportedTables.includes(table)); assert.throws(() => normalize(table, { id: project }), /unsupported_fixture_table/);
    }
});
test('mutable state, version, current and assignee are never identity', () => {
    for (const fields of Object.values(identities)) assert(!fields.some((field) => /^(status|current_status|is_current|version|row_version|assignee_user_id|current_approver_user_id)$/.test(field)));
    const row = { id: contract, project_id: project, contract_no: 'CT', created_by: actor, status: 'draft', row_version: 1 };
    assert(sameIdentity('contract', { ...row, status: 'pending-review', row_version: 7 }, rowIdentity('contract', row)));
    assert(!sameIdentity('contract', { ...row, contract_no: 'foreign' }, rowIdentity('contract', row)));
});
test('Native SDK trace is accepted without fabricated PG xid/xmin/ACK fields', () => {
    const { j, item, intent } = native(); assertCreationProof(j, item, intent);
    assert.equal(item.proof.eventXmin, undefined); assert.equal(item.proof.transaction, undefined); assert.equal(item.proof.outerCommitAcknowledged, undefined);
});
test('query result/DTO id, incomplete trace, wrong case and an existing id do not establish creation', () => {
    for (const alter of [
        (x) => { x.item.proof = { kind: 'http-response-id' }; },
        (x) => { x.j.authorities[0].trace.complete = false; },
        (x) => { x.item.proof.createContext.caseId = 'other'; },
        (x) => { x.intent.beforeIds = [contract]; },
        (x) => { x.j.authorities[0].trace.events[0].parent = 'tx0'; },
        (x) => { x.item.proof.outerCommitEventSeq = 2; }
    ]) { const data = native(); alter(data); assert.throws(() => assertCreationProof(data.j, data.item, data.intent)); }
});
test('PG proof preserves real distinct top/sub xids and rejects uncommitted/ambiguous epochs', () => {
    const data = native();
    const proof = { kind: 'pg-after-insert-observed-outer-commit', createContext: data.item.proof.createContext, database: databaseFor('nest'), marker, sourceAuthority: 'source', observerId: authorityId, functionOid: 123,
        topXid8: '100', eventXid8: '101', eventXmin: '101', observedFullXid8: '103', outerCommitObserved: true, outerStatus: 'committed', topXidStatus: 'committed', eventXminStatus: 'committed', visibleFromIndependentOwnerConnection: true, eventId: '1' };
    data.j.authorities = [{ id: authorityId, kind: proof.kind, database: proof.database, marker, sourceAuthority: 'source', observerId: authorityId, functionOid: 123, fixtureProfile: fixtureProfile.journalTag }];
    data.item.proof = proof; assertCreationProof(data.j, data.item, data.intent);
    for (const changes of [{ eventXminStatus: 'in progress' }, { topXidStatus: 'aborted' }, { eventXmin: '100' }, { observedFullXid8: '2147484000' }, { outerCommitObserved: false }]) {
        assert.throws(() => assertCreationProof(data.j, { ...data.item, proof: { ...proof, ...changes } }, data.intent));
    }
});
test('bootstrap can create a fresh project; contract rejects planned-only projects', () => {
    const f = fixture(); f.defineCase('bootstrap', { actors: [actor] });
    assertCaseScope(f.j, 'project', { id: project, created_by: actor }, f.scope('bootstrap'));
    assert.throws(() => f.defineCase('contract', { actors: [actor], projects: [project] }));
    f.j.objects.push(object('project', { id: project, project_no: 'PRJ', created_by: actor }, 'bootstrap')); f.save();
    f.defineCase('contract', { actors: [actor], projects: [project] });
    assertCaseScope(f.j, 'contract', { id: contract, project_id: project, created_by: actor }, f.scope('contract'));
});
test('fixed principals and borrowed rows never become ownership/deletion ids', () => {
    const j = plannedJournal('nest', run); for (const id of SEED_ACTORS) assert.throws(() => assertNotBorrowed(j, id));
    j.borrowed.principalSnapshot = { rows: [{ table: 'role', row: { id: authorityId } }] };
    assert.throws(() => assertNotBorrowed(j, authorityId));
});
test('case-scoped borrowed principal references require the readonly snapshot and are never ownership', () => {
    const j = plannedJournal('nest', run), scope = { borrowedActors: [SEED_ACTORS[0]], borrowedDefinitions: [] };
    assert.throws(() => assertRowReferences(j, 'auth_session', { user_id: SEED_ACTORS[0] }, scope));
    j.borrowed.principalSnapshot = { rows: [] };
    assertRowReferences(j, 'auth_session', { user_id: SEED_ACTORS[0] }, scope);
    assert.equal(j.objects.length, 0);
});
test('logical UUID scanning finds uppercase, compact and nested text/JSON forms', () => {
    const refs = uuidReferences({ text: 'prefix ' + project.toUpperCase(), nested: [{ target: contract.replaceAll('-', '') }] });
    assert.deepEqual(refs.map((entry) => entry.id).sort(), [project, contract].sort());
});
test('unknown FK shape and foreign logical references are rejected, never adopted', () => {
    assert.throws(() => assertAllForeignKeyShape([...authority.allForeignKeys, { source_table: 'foreign' }]));
    const j = plannedJournal('nest', run); assert.throws(() => assertScannedRows(j, [{ table: 'attachment', row: { id: contract, metadata: { project } } }]));
    assert.equal(j.objects.length, 0);
});
test('DELETE identity predicates bind exact PK and immutable values without mutable conditions', () => {
    const value = rowIdentity('contract', { id: contract, project_id: project, contract_no: "CT'quoted", created_by: actor });
    const condition = whereIdentity('contract', value);
    assert(condition.sql.includes('"id" is not distinct from $1')); assert(!condition.sql.includes("CT'quoted")); assert(condition.args.includes("CT'quoted"));
    assert(!/status|version/.test(condition.sql));
});
test('actual FK graph deletes referencing owned rows before parents, without cascade', () => {
    const j = plannedJournal('nest', run), role = { id: project, role_key: 'r2m_role' }, permission = { id: contract, role_id: project, permission_key: 'project:read' };
    j.objects = [object('role', role), object('role_permission_assignment', permission)];
    const graph = deletionGraph(j, new Map([['role:' + project, role], ['role_permission_assignment:' + contract, permission]]));
    assert.deepEqual(graph.leaves.map((entry) => entry.table), ['role_permission_assignment']); assert(graph.edges.some((edge) => edge.target === 'role:' + project));
});
test('resolveNoCreates requires exact independent before/after ids and never adopts rows', async () => {
    const f = fixture(async () => ({ rows: [] })); const scope = f.defineCase('read-only', { actors: [actor] });
    f.j.intents.push({ id: intentId, table: 'security_event', selector: { request_id: scope.requestId }, caseId: scope.caseId, beforeObserved: true, beforeIds: [], state: 'planned' });
    const count = f.j.objects.length; assert.deepEqual(await f.resolveNoCreates('read-only'), { resolvedWithoutAdoption: 1 });
    assert.equal(f.j.intents[0].state, 'absent'); assert.equal(f.j.objects.length, count);
    const unsafe = fixture(async () => ({ rows: [{ row: { id: contract } }] })); const other = unsafe.defineCase('read-only', { actors: [actor] });
    unsafe.j.intents.push({ id: intentId, table: 'security_event', selector: { request_id: other.requestId }, caseId: other.caseId, beforeObserved: true, beforeIds: [], state: 'planned' });
    await assert.rejects(unsafe.resolveNoCreates('read-only'), /Uncertified creation/); assert.equal(unsafe.j.intents[0].state, 'planned');
});
test('pending proof or unknown mutation outcome blocks cleanup before any fake SQL', async () => {
    let calls = 0; const f = fixture(async () => { calls++; throw new Error('No fake DML permitted'); });
    f.j.writerDrain = { namespace: 'poms-r2m', runId: run, backend: 'nest', marker, activeRequests: 0, pendingTransactions: 0, observersRestored: true, writers: [{kind:'synthetic-pure-test',identity:'mock-only',stopped:true}], sourceCapsuleSha256: '0'.repeat(64) };
    f.j.intents.push({ state: 'planned' }); await assert.rejects(f.cleanup(), /pending creation/); assert.equal(calls, 0);
    f.j.intents = []; f.j.mutations.push({ state: 'outcome-unknown' }); await assert.rejects(f.cleanup(), /mutation COMMIT/); assert.equal(calls, 0);
});
test('case request identities remain within the original request-id column width', () => {
    const a = caseIdentity(run, 'a'.repeat(80)), b = caseIdentity(run, 'b'); assert(a.requestId.length <= 64); assert.notEqual(a.requestId, b.requestId); assert.equal(digest(a), digest(caseIdentity(run, 'a'.repeat(80))));
});

test('R2M exact namespace and marker cannot read old L database evidence', () => {
    assert.equal(currentDatabaseFor('rust'), 'poms_r2m_rust');
    assert.throws(() => validateMarker([{ database: 'poms_r2m_rust', marker: '04aadee8-4ec6-4a3b-9d27-ee8d51721029' }], 'poms_r2m_rust'));
    assert.throws(() => currentDatabaseFor('r2l'));
});

test('case-insensitive ambient database/process overrides reject before environment IO', () => {
    for (const key of ['PGHOST', 'pgport', 'dB_User', 'mikro_orm', 'DATABASE_URL', 'node_options', 'JWT_SECRET']) {
        assert.throws(() => validateAmbient({ [key]: 'synthetic secret' }));
        assert.throws(() => loadManagedEnvironment({ mode: 'managed-nest', env: { POMS_ENV_FILE: '/old-private/nest.env', [key]: 'synthetic secret' } }));
    }
    assert.throws(() => loadManagedEnvironment({ mode: 'managed-nest', env: { POMS_ENV_FILE: '/old-private/nest.env' } }), /r2m_environment_path/);
});

test('legacy profile choice rejects before source collection and certificate use', () => {
    let reads = 0;
    for (const key of ['POMS_R2L_FIXTURE_PROFILE', 'POMS_R2M_FIXTURE_PROFILE']) assert.throws(() => profileFromEnvironment({ [key]: 'todo42' }, () => { reads++; return []; }));
    assert.equal(reads, 0);
    const data = native(); delete data.item.fixtureProfile; assert.throws(() => assertCreationProof(data.j, data.item, data.intent));
});

test('cleanup requires a matching drained writer receipt before any synthetic SQL', async () => {
    let calls = 0; const f = fixture(async () => { calls++; throw new Error('unexpected mock query'); });
    await assert.rejects(f.cleanup()); assert.equal(calls, 0);
    const receipt = { namespace: 'poms-r2m', marker, runId: run, backend: 'nest', activeRequests: 1, pendingTransactions: 0, observersRestored: true, writers: [{kind:'mock',identity:'mock-only',stopped:true}], sourceCapsuleSha256: '0'.repeat(64) };
    assert.throws(() => f.drain(receipt)); assert.equal(f.j.writerDrain, undefined);
    f.drain({...receipt, activeRequests:0}); assert.throws(() => f.defineCase('after-drain', {actors:[actor]})); assert.equal(calls,0);
});

test('pre-existing canonical string-PK setting refuses any new ownership', async () => {
    const f = fixture(async () => ({rows:[{row:{key:'attachment.max-upload-size-mb',value_type:'integer',value_json:50}}]}));
    f.defineCase('setting', {actors:[actor]});
    await assert.rejects(f.planSettingCreate('attachment.max-upload-size-mb', {caseId:'setting'}), /Existing canonical setting/);
    assert.equal(f.j.keyed.objects.length,0);
    await assert.rejects(f.planSettingCreate('invented-key', {caseId:'setting'}));
});

test('new canonical setting requires actual same-key INSERT/outer-COMMIT authority', async () => {
    const f = fixture(async () => ({rows:[]})); f.defineCase('setting', {actors:[actor]});
    const plan = await f.planSettingCreate('attachment.max-upload-size-mb',{caseId:'setting'});
    await assert.rejects(f.adoptSettingCreate(plan.id,{table:'system_setting',key:plan.key,intentId:plan.id,proof:{kind:'http-response-id'}}));
    assert.equal(f.j.keyed.objects.length,0); assert.equal(f.j.keyed.intents[0].state,'planned');
    await f.resolveNoSettingCreate(plan.id); assert.equal(f.j.keyed.intents[0].state,'absent');
});

test('public errors retain only fixed categories and SQLSTATE, never secret values', () => {
    const secret = 'private-test-not-a-real-secret';
    const error = new Error(secret); error.sql = secret; error.config = {password:secret}; error.code='23505';
    assert.deepEqual(publicFixtureError(error,'prepare'), {result:'failed',phase:'prepare',category:'database',sqlState:'23505'});
    assert(!JSON.stringify(publicFixtureError(Object.assign(new Error(secret),{name:'AssertionError',actual:secret,expected:secret}))).includes(secret));
});

function baselineRows() {
    const before = { key: baselineSettingKey, value_type: 'integer', value_json: 50, row_version: 1, created_at: '2026-10-31T00:00:00+08:00', updated_at: '2026-10-31T00:00:00+08:00', updated_by: null };
    const after = { ...before, value_json: 64, row_version: 2, updated_at: '2026-10-31T00:01:00+08:00', updated_by: actor };
    return { before, after, lease: { key: baselineSettingKey, before, beforeSha256: digest(before), expectedAfter: after, expectedAfterSha256: digest(after) } };
}
test('baseline restore compares every original and expected-after field, never only key/value', () => {
    const {lease, after} = baselineRows(); assert.equal(validateBaselineRestoreCandidate(lease, after), true);
    for (const patch of [{row_version:3},{updated_by:null},{updated_at:'2026-10-31T00:02:00+08:00'},{value_json:50},{extra:'unreviewed'}]) assert.throws(() => validateBaselineRestoreCandidate(lease, {...after,...patch}));
    assert.throws(() => validateBaselineRestoreCandidate({...lease,beforeSha256:'0'.repeat(64)},after));
});

test('baseline singleton is refused before cleanup SQL until exact restore is certified', async () => {
    let calls=0;const f=fixture(async()=>{calls++;throw new Error('unexpected mock SQL');});
    f.j.writerDrain={namespace:'poms-r2m',runId:run,backend:'nest',marker,activeRequests:0,pendingTransactions:0,observersRestored:true,writers:[{kind:'mock',identity:'mock-only',stopped:true}],sourceCapsuleSha256:'0'.repeat(64)};
    f.j.baselineSettingLease={...baselineRows().lease,state:'observing'};
    await assert.rejects(f.cleanup(),/Restore singleton/);assert.equal(calls,0);
});

test('a queried singleton row or wrong environment is not a precise admission', async () => {
    let calls=0;const f=fixture(async()=>{calls++;throw new Error('unexpected mock SQL');});f.defineCase('setting-lease',{actors:[actor]});
    await assert.rejects(f.admitBaselineSetting({kind:'query-row-owner'}, {caseId:'setting-lease'}));
    await assert.rejects(f.admitBaselineSetting({kind:'R2M-environment-baseline-setting-precise-admission',namespace:'poms-r2l'}, {caseId:'setting-lease'}));
    assert.equal(calls,0);assert.equal(f.j.baselineSettingLease,undefined);
});

test('cross-case attachment references require the explicit proved project closure', () => {
    const f=fixture();
    f.j.objects.push(object('project',{id:project,project_no:'P',created_by:actor},'prepared'));
    f.j.objects.push(object('contract',{id:contract,project_id:project,contract_no:'C',created_by:actor},'prepared'));
    const scope=f.defineCase('consumer',{actors:[actor],projects:[project]});
    const row={id:'99999999-9999-4999-8999-999999999999',created_by:actor,operation_type:'create-attachment',original_name:'proof.pdf',target_type:'contract',target_id:contract};
    assertCaseScope(f.j,'attachment_upload_session',row,scope);
    assert.throws(()=>assertCaseScope(f.j,'attachment_upload_session',row,{...scope,projects:[]}),/explicit proven project closure/);
    assert.throws(()=>assertRowReferences(f.j,'attachment_upload_session',{...row,target_id:'88888888-8888-4888-8888-888888888888'},scope,[{table:'attachment_upload_session',id:row.id}]),/unregistered_uuid_reference/);
});
