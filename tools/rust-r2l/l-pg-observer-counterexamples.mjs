// SOURCE-only companion to C's first-DDL review. Root alone executes this in
// the new L namespace. Reference: old K counterexample SOURCE, not its evidence.
// Synthetic auth rows exercise the observer, never a business/API success.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { observedTables, observerStatements, installPgCreateObserver, reconcilePgCreateObserver, classifyObserverCatalog } from './l-pg-create-observer.mjs';
import { assertCreationProof, digest, rowIdentity, uuid } from './fixture-core.mjs';
import { whereIdentity } from './fixture-references.mjs';
import { databaseFor, marker, verifyConnection } from './fixture-guard.mjs';

const OBSERVER_SOURCE = 'tools/rust-r2l/l-pg-create-observer.mjs';
const OBSERVER_SHA256 = 'e2d059eb2611027615802078d53cd2dbcd425867aaa5e0cf78eb8c533402e19d';
const OWNER = 'poms_r0e_owner', APP = 'poms_r2l_app', CONTROL = 'r2l_control';
const OWNER_APPLICATION = 'poms-r2l-pg-create-observer-owner';
const PRIVATE_ROOT = '/home/wangzishi/.local/share/poms-r2l/private';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const copy = (value) => JSON.parse(JSON.stringify(value));
const ident = (value) => { assert(/^[a-z_][a-z0-9_]{0,62}$/.test(value)); return '"' + value + '"'; };

export const counterexamplePlan = Object.freeze({
    generatedTables: [...observedTables],
    transactions: ['outer-commit','outer-rollback','savepoint-release-outer-commit','savepoint-rollback-outer-commit','savepoint-release-outer-rollback'],
    scopeRejections: ['wrong-actor','wrong-project','wrong-target','missing-intent','overlapping-intent','before-existing-id','duplicate-primary-key-rollback'],
    ownedRejectedCandidates: ['missing-approval-parent','different-target-parent','different-outer-parent'],
    drift: ['function-definition','function-security','trigger-enable','function-acl','unknown-control-object','oid-recreated-inside-rollback'],
    acknowledgments: ['install-mid-transaction-failure','restore-mid-transaction-failure','install-after-real-commit-caller-ack-loss','restore-after-real-commit-caller-ack-loss'],
    snapshots: 'RuntimePending: positive FSS/Rule certification belongs to the original Native commission workflow, not synthetic business rows.',
    duplicateEventBranch: 'Explicit Root opt-in only: independent direct INSERT/DELETE/INSERT COMMIT evidence; ordinary PK 23505 rollback is a separate boundary.',
    publicEvidence: 'Hashes/counts only; raw events, identities, token hashes and failure details stay in the new private receipt.',
});

function privateText(file) {
    const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
    return fs.readFileSync(file, 'utf8');
}
function writePrivate(file, value, first = false) {
    const target = first ? file : file + '.' + randomUUID() + '.tmp';
    const fd = fs.openSync(target, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    if (!first) fs.renameSync(target, file);
    const dir = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
}
function journalFor(handle) { return JSON.parse(privateText(handle.journalFile)); }
function registered(f, handle) {
    const receipt = handle.receipt();
    return f.j.authorities.some((authority) => authority.id === receipt.id)
        ? Promise.resolve(receipt.id) : f.registerPgObserver(receipt);
}
function publicSummary(privateReport, file) {
    return {
        kind: privateReport.kind, result: privateReport.result, backend: privateReport.backend,
        observerSourceSha256: privateReport.observerSource.sha256,
        cases: privateReport.cases.map(({ name, result, counts = {}, evidence }) => ({ name, result, counts, evidenceSha256: sha(JSON.stringify(evidence ?? null)) })),
        casesPassed: privateReport.cases.filter((entry) => entry.result === 'pass').length,
        snapshotRuntime: counterexamplePlan.snapshots,
        duplicateEventBranch: privateReport.duplicateEventBranch,
        nativeShadow: privateReport.nativeShadowStatus,
        full107CatalogBeforeSha256: privateReport.full107Before ? sha(JSON.stringify(privateReport.full107Before)) : null,
        full107CatalogAfterSha256: privateReport.full107After ? sha(JSON.stringify(privateReport.full107After)) : null,
        cleanupCounts: privateReport.cleanup?.map(({ deleted }) => deleted) ?? [],
        doubleZero: privateReport.doubleZero === true,
        privateReceiptFile: file, privateReceiptSha256: sha(privateText(file)),
        simulatedCallerAckLossIsRealNetworkFailure: false,
    };
}

// The callback runs the actual original submitReview with its strict SDK
// subscriber. Return {authority,creates,sql}; creates are original SDK proofs.
// The fixture already has its fresh actors/project/draft contract and readonly
// seed-principal snapshot. Return an unregistered authority receipt, the creates
// for this context, and actual SQL witness rows carrying that same context.
// readFull107Catalog returns Root's deterministic metadata snapshot and closes
// any transaction it starts. It must not add observation timestamps to equality.
// SDK identity is checked through the independently committed row keyed by its
// actual SDK afterCreate ID, not falsely described as an SDK field snapshot.
export async function observerCounterexamples({ fixture: f, projectId, contractId, nativeShadow, readFull107Catalog, runDuplicateEventBranch = false }) {
    assert.equal(process.platform, 'linux');
    assert(f?.client?.query && f.j?.state === 'prepared' && f.runId === f.j.runId);
    assert.equal(f.j.namespace, 'poms-r2l'); assert.equal(f.j.marker, marker);
    const database = databaseFor(f.backend), runId = uuid(f.runId); projectId = uuid(projectId); contractId = uuid(contractId);
    assert.equal(path.resolve(f.store.file), `${PRIVATE_ROOT}/l-runs/${f.backend}-${runId}.json`);
    assert.equal(sha(fs.readFileSync(OBSERVER_SOURCE)), OBSERVER_SHA256, 'Review a new observer SOURCE epoch before execution');
    assert(typeof nativeShadow === 'function', 'Actual original Native submit/SDK shadow callback is required');
    assert(typeof readFull107Catalog === 'function', 'Root owns the full 107-table catalog before/after witness');
    assert(f.j.objects.some((item) => item.table === 'project' && item.id === projectId));
    assert(f.j.objects.some((item) => item.table === 'contract' && item.id === contractId));
    assert.equal(typeof runDuplicateEventBranch, 'boolean');
    const directory = `${PRIVATE_ROOT}/pg-observer-counterexamples`;
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { mode: 0o700 });
    { const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0); }
    const file = path.join(directory, `${f.backend}-${runId}-${randomUUID()}.json`);
    const report = { formatVersion: 1, kind: 'actual-L-scoped-PG-observer-counterexamples-not-business-acceptance', result: 'in-progress', backend: f.backend, runId, database, marker,
        observerSource: { file: OBSERVER_SOURCE, sha256: OBSERVER_SHA256 }, startedAt: new Date().toISOString(), cases: [], cleanup: [],
        duplicateEventBranch: 'RuntimePending: ordinary PK duplicate rollback is measured separately; no unapproved fixture bypass.', nativeShadowStatus: 'Pending' };
    writePrivate(file, report, true);
    const save = () => writePrivate(file, report);
    const record = (name, evidence, counts = {}) => { report.cases.push({ name, result: 'pass', counts, evidence: copy(evidence) }); save(); };
    const require = createRequire(import.meta.url), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const owner = new Client({ host: '127.0.0.1', port: 19432, database, user: OWNER, password: privateText(`${PRIVATE_ROOT}/owner-password`),
        connectionTimeoutMillis: 5000, query_timeout: 15000, application_name: 'poms-r2l-counterexample-owner' });
    const canonicalClients = new Set(); let handle = null, appTransaction = false;
    const baseActors = [f.actors.admin]; let caseIndex = 12000, nativeApproval = null, secondaryProject, sameProjectContract, otherProjectContract;
    const define = (name, extra = {}) => f.defineCase('pgce.' + name, { actors: baseActors, projects: [projectId], ...extra });
    const open = async (name, selectors, extra) => {
        const scope = define(name, extra), intents = [];
        for (const [table, selector] of selectors) intents.push(await f.intent(table, selector, { caseId: scope.caseId }));
        const context = { caseId: scope.caseId, index: caseIndex++, op: 'l.observer-counterexample' };
        await handle.beginCase(context); return { scope, context, intents };
    };
    const begin = async () => { assert(!appTransaction); await f.client.query('BEGIN'); appTransaction = true; };
    const rollback = async () => { if (appTransaction) { await f.client.query('ROLLBACK'); appTransaction = false; } };
    const commit = async () => { assert(appTransaction); await f.client.query('COMMIT'); appTransaction = false; };
    const row = (name, user = f.actors.admin) => ({ id: randomUUID(), user_id: user, token_hash: sha(runId + ':' + name + ':' + randomUUID()), csrf_token_hash: sha(randomUUID()),
        status: 'active', idle_expires_at: new Date(Date.now() + 600000).toISOString(), absolute_expires_at: new Date(Date.now() + 3600000).toISOString(),
        last_seen_at: new Date().toISOString(), created_ip: '127.0.0.1', last_ip: '127.0.0.1', created_user_agent: 'R2L observer synthetic probe' });
    async function insert(table, values) {
        assert(['auth_session','approval_record','todo_item'].includes(table));
        const columns = Object.keys(values); assert(columns.every((column) => /^[a-z_]+$/.test(column)));
        const result = await f.client.query(`INSERT INTO poms.${ident(table)} (${columns.map(ident).join(',')}) VALUES (${columns.map((_, index) => '$' + (index + 1)).join(',')}) RETURNING to_jsonb(${ident(table)}) AS row,xmin::text AS xmin`, Object.values(values));
        assert.equal(result.rows.length, 1); return result.rows[0];
    }
    async function adopt(rows, caseId) {
        if (rows.length) f.recordCommittedCreates(rows);
        await f.resolveNoCreates(caseId); const adopted = await f.adoptIntents(); return adopted;
    }
    async function expectPending() {
        await assert.rejects(() => handle.drainCase(), (error) => error.code === 'R2L_OBSERVER_PENDING');
    }
    async function withQueryFault(point, action) {
        const previous = Client.prototype.query, evidence = { point, hit: 0, realCommitCompleted: false, simulatedCallerAckLoss: point === 'after-real-commit', realNetworkFault: false };
        const wrapper = function (...args) {
            const own = this.connectionParameters?.application_name === OWNER_APPLICATION && this.connectionParameters?.database === database;
            if (!own) return previous.apply(this,args); // Preserve unrelated callback/EventEmitter APIs.
            if (own) canonicalClients.add(this);
            const text = typeof args[0] === 'string' ? args[0] : args[0]?.text ?? '';
            if (own && evidence.hit === 0 && ((point === 'before-create-function' && /^CREATE FUNCTION /i.test(text)) || (point === 'before-drop-function' && /^DROP FUNCTION /i.test(text)))) {
                evidence.hit++; const error = new Error('Controlled observer transaction-stage failure'); error.code = 'R2L_CONTROLLED_STAGE_FAILURE'; throw error;
            }
            const result = previous.apply(this, args); assert(result && typeof result.then === 'function', 'Canonical observer query must use its original Promise API');
            return result.then((value) => {
            if (point === 'after-real-commit' && evidence.hit === 0 && /^COMMIT\s*$/i.test(text)) {
                evidence.hit++; evidence.realCommitCompleted = true;
                const error = new Error('Simulated caller ACK loss after the actual COMMIT returned'); error.code = 'R2L_SIMULATED_CALLER_ACK_LOSS'; throw error;
            }
            return value;
            });
        };
        Client.prototype.query = wrapper;
        try { return { result: await action(), evidence }; }
        catch (error) { error.controlledFault = evidence; throw error; }
        finally { assert.equal(Client.prototype.query, wrapper, 'PG hook changed concurrently'); Client.prototype.query = previous; }
    }
    async function install() { return (await withQueryFault('observe-only', () => installPgCreateObserver(f))).result; }
    async function reconcile(selection) { return (await withQueryFault('observe-only', () => reconcilePgCreateObserver(f,selection))).result; }
    const observerFiles = () => new Set(fs.readdirSync(`${PRIVATE_ROOT}/pg-create-observers`).filter((name) => new RegExp(`^${f.backend}-${runId}-[0-9a-f-]{36}\\.json$`).test(name)));
    async function failedInstall(point) {
        const before = fs.existsSync(`${PRIVATE_ROOT}/pg-create-observers`) ? observerFiles() : new Set(); let failure;
        try { await withQueryFault(point, () => installPgCreateObserver(f)); assert.fail('Controlled install fault did not fire'); } catch (error) { failure = error; }
        assert.equal(failure.controlledFault?.hit, 1);
        const created = [...observerFiles()].filter((name) => !before.has(name)); assert.equal(created.length, 1, 'Actual attempted observer journal is ambiguous');
        const attemptedFile = `${PRIVATE_ROOT}/pg-create-observers/${created[0]}`, prior = privateText(attemptedFile);
        const reconciled = await reconcile(attemptedFile);
        assert.equal(privateText(attemptedFile), prior, 'Original failed-attempt bytes changed');
        return { failure: { code: failure.code, controlledFault: failure.controlledFault }, attemptedFile, attemptedSha256: sha(prior), reconciled };
    }
    async function deleteDirectOwned(table, id) {
        const object = f.j.objects.find((item) => item.table === table && item.id === uuid(id));
        assert(object?.creationProof?.kind === 'direct-committed-insert', 'Rejected candidate is not ownership');
        assert(object.creationProof.beforeAbsent && (object.creationProof.commitAcknowledged || object.creationProof.recoveredByXminAndXactStatus));
        const observed = await owner.query(`SELECT to_jsonb(t) AS row,xmin::text AS xmin FROM poms.${ident(table)} t WHERE id=$1::uuid`, [id]);
        assert.equal(observed.rows.length, 1); assert.equal(digest(rowIdentity(table, observed.rows[0].row)), digest(object.identity));
        const condition = whereIdentity(table, object.identity);
        const evidence = { kind: 'counterexample-exact-delete-of-independent-direct-owned-row', table, id, creationProof: copy(object.creationProof), before: observed.rows[0], commitAcknowledged: false };
        report.negativeDeletes ??= []; report.negativeDeletes.push(evidence); save();
        await begin();
        try {
            const result = await f.client.query(`DELETE FROM poms.${ident(table)} WHERE ${condition.sql} AND xmin::text=$${condition.args.length + 1} RETURNING id::text AS id`, [...condition.args, observed.rows[0].xmin]);
            assert.equal(result.rowCount, 1); evidence.returnedIds = result.rows; save(); await commit(); evidence.commitAcknowledged = true;
            assert.equal((await owner.query(`SELECT id FROM poms.${ident(table)} WHERE id=$1::uuid`, [id])).rows.length, 0); save(); return evidence;
        } catch (error) { await rollback(); throw error; }
    }
    async function deleteReturnedInsideTransaction(table, returned) {
        assert(appTransaction); const identity = rowIdentity(table, returned.row), condition = whereIdentity(table, identity);
        const result = await f.client.query(`DELETE FROM poms.${ident(table)} WHERE ${condition.sql} AND xmin::text=$${condition.args.length + 1} RETURNING id::text AS id`, [...condition.args, returned.xmin]);
        assert.equal(result.rowCount, 1); return { identity, xmin: returned.xmin, returnedIds: result.rows };
    }
    async function rejectAndDeleteOwned(name, c, directRows, expected) {
        await assert.rejects(() => handle.drainCase(), expected);
        const deletions = [];
        for (const [table, direct] of directRows) deletions.push(await deleteDirectOwned(table, direct.id));
        const discard = await handle.discardRejectedCase(); await f.resolveNoCreates(c.scope.caseId);
        assert.equal(discard.creationCertificatesIssued, 0); record(name, { directRows, deletions, discard }, { rejectedCertificates: 1, exactOwnedDeletes: deletions.length, issuedCertificates: 0 });
    }
    async function prepareSecondaryFacts() {
        // Prepared synthetic counterexample facts only; no business-number
        // producer/counter and no original seed business row is modified.
        const prep = define('secondary-prepared'), originalProject = (await owner.query('SELECT to_jsonb(t) AS row FROM poms.project t WHERE id=$1::uuid', [projectId])).rows[0].row;
        const freshProjectId = await f.planProject(prep.caseId), projectValues = { ...originalProject, id: freshProjectId, project_no: 'L-CE-P-' + runId, project_name: 'Observer secondary prepared project' };
        for (const field of ['row_version','created_at','updated_at']) delete projectValues[field];
        secondaryProject = await f.insert('project', projectValues, { caseId: prep.caseId });
        const contractValues = (await owner.query('SELECT to_jsonb(t) AS row FROM poms.contract t WHERE id=$1::uuid', [contractId])).rows[0].row;
        const createContract = async (id, project, suffix, caseId) => {
            const input = { ...contractValues, id, project_id: project, contract_no: 'L-CE-C-' + runId + suffix };
            for (const field of ['row_version','created_at','updated_at']) delete input[field];
            return f.insert('contract', input, { caseId });
        };
        sameProjectContract = await createContract(randomUUID(), projectId, '-a', prep.caseId);
        const second = define('secondary-contract', { projects: [projectId,secondaryProject.id] });
        otherProjectContract = await createContract(randomUUID(), secondaryProject.id, '-b', second.caseId);
        report.secondaryPrepared = { projectId: secondaryProject.id, sameProjectContractId: sameProjectContract.id, otherProjectContractId: otherProjectContract.id, preparedNotNativeGenerated: true }; save();
    }
    try {
        await owner.connect(); await verifyConnection(owner, database, true); await verifyConnection(f.client, database, false);
        report.full107Before = await readFull107Catalog(owner); save();
        handle = await install(); await registered(f, handle);
        await prepareSecondaryFacts();

        for (const mode of counterexamplePlan.transactions) {
            const values = row(mode), scope = await open(mode, [['auth_session', { user_id: values.user_id, token_hash: values.token_hash }]]);
            await begin(); let returned;
            try {
                if (mode.startsWith('savepoint-')) await f.client.query('SAVEPOINT l_observer_probe');
                returned = await insert('auth_session', values);
                if (mode === 'savepoint-rollback-outer-commit') await f.client.query('ROLLBACK TO SAVEPOINT l_observer_probe');
                if (mode.startsWith('savepoint-')) await f.client.query('RELEASE SAVEPOINT l_observer_probe');
                await expectPending();
                if (mode.endsWith('outer-rollback') || mode === 'outer-rollback') await rollback(); else await commit();
            } catch (error) { await rollback(); throw error; }
            const proofs = await handle.drainCase(), committed = ['outer-commit','savepoint-release-outer-commit'].includes(mode);
            assert.equal(proofs.length, committed ? 1 : 0); if (committed) assert.equal(proofs[0].id, values.id);
            await adopt(proofs, scope.scope.caseId);
            assert.equal((await owner.query('SELECT id FROM poms.auth_session WHERE id=$1::uuid', [values.id])).rows.length, committed ? 1 : 0);
            record(mode, { returned, proofs, pendingCertificateRejected: true }, { proofs: proofs.length });
        }

        {
            const values = row('insert-update'), scope = await open('insert-update', [['auth_session', { user_id: values.user_id, token_hash: values.token_hash }]]);
            const direct = { kind: 'independent-direct-commit-equivalent-before-pg-certificate', beforePkAbsent: false, outerCommitAcknowledged: false };
            assert.equal((await owner.query('SELECT id FROM poms.auth_session WHERE id=$1::uuid',[values.id])).rows.length,0);direct.beforePkAbsent=true;
            report.insertUpdateDirect = direct;save();await begin();direct.topXid8=(await f.client.query('SELECT pg_current_xact_id()::text AS xid')).rows[0].xid;
            const inserted = await insert('auth_session', values);direct.returned=inserted;save();await commit();direct.outerCommitAcknowledged=true;
            const beforeUpdate=(await owner.query('SELECT to_jsonb(t) AS row,xmin::text AS xmin FROM poms.auth_session t WHERE id=$1::uuid',[values.id])).rows;
            assert.equal(beforeUpdate.length,1);assert.equal(beforeUpdate[0].xmin,inserted.xmin);assert.equal(digest(rowIdentity('auth_session',beforeUpdate[0].row)),digest(rowIdentity('auth_session',inserted.row)));
            direct.independentBeforeUpdate=beforeUpdate[0];direct.outerStatus=(await owner.query('SELECT pg_xact_status($1::xid8) AS status',[direct.topXid8])).rows[0].status;assert.equal(direct.outerStatus,'committed');save();
            const condition=whereIdentity('auth_session',rowIdentity('auth_session',inserted.row));
            const updateResult=await f.client.query(`UPDATE poms.auth_session SET last_ip='127.0.0.2' WHERE ${condition.sql} AND xmin::text=$${condition.args.length+1} RETURNING xmin::text AS xmin`,[...condition.args,inserted.xmin]);
            assert.equal(updateResult.rows.length,1);const updated=updateResult.rows[0];direct.updateReturned=updated;direct.updateCommitAcknowledged=true;save();
            assert.notEqual(inserted.xmin, updated.xmin);
            const proofs = await handle.drainCase(); assert.equal(proofs.length, 1);
            assert.equal(proofs[0].proof.eventXmin, inserted.xmin); assert.equal(proofs[0].proof.sourceXminAtDrain, updated.xmin);
            await adopt(proofs, scope.scope.caseId);
            const object = f.j.objects.find((item) => item.table === 'auth_session' && item.id === values.id);
            record('insert-update-xmin-separated', { inserted, updated, proofs, postcondition: object.postcondition }, { distinctInsertAndDrainXmin: 1 });
        }

        // Negative SQL is rolled back. This proves rollback/no-certificate,
        // not the later committed candidate-parent validation branch.
        for (const mode of counterexamplePlan.scopeRejections) {
            const values = row(mode, mode === 'wrong-actor' ? f.actors.viewer : f.actors.admin);
            const selectors = mode === 'missing-intent' ? [] : [['auth_session', { user_id: f.actors.admin }]];
            if (mode === 'overlapping-intent') selectors.push(['auth_session', { user_id: f.actors.admin, token_hash: values.token_hash }]);
            const c = await open(mode, selectors);
            let pgError = null;
            await begin();
            try {
                if (['wrong-project','wrong-target'].includes(mode)) {
                    await insert('todo_item', { id: values.id, source_type: 'approval-record', source_id: contractId, todo_type: 'approval', business_domain: 'contract-finance',
                        target_object_type: 'contract', target_object_id: mode === 'wrong-target' ? otherProjectContract.id : contractId,
                        project_id: mode === 'wrong-project' ? secondaryProject.id : projectId, title: 'Observer negative probe', assignee_user_id: f.actors.admin, status: 'open', priority: 'normal' });
                } else if (mode === 'before-existing-id') {
                    const existing = f.j.objects.find((item) => item.table === 'auth_session'); assert(existing); values.id = existing.id;
                    await insert('auth_session', values);
                } else { await insert('auth_session', values); if (mode === 'duplicate-primary-key-rollback') await insert('auth_session', values); }
            } catch (error) { pgError = { code: error.code, message: error.message }; }
            finally { await rollback(); }
            if (['before-existing-id','duplicate-primary-key-rollback'].includes(mode)) assert.equal(pgError?.code, '23505'); else assert.equal(pgError, null);
            const proofs = await handle.drainCase(); assert.equal(proofs.length, 0); await adopt([], c.scope.caseId);
            record(mode + '-rollback', { pgError, noCertificatesAfterActualRollback: true, admissionFilterAloneCertified: false }, { proofs: 0 });
        }

        {
            const c = await open('native-sdk-shadow', [['approval_record', { project_id: projectId }], ['todo_item', { project_id: projectId }]], { borrowedActors: ['00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000014'] });
            const original = await nativeShadow({ fixture: f, projectId, contractId, scope: c.scope, context: { runId, ...c.context, op: 'l.producer' }, intents: c.intents });
            assert(original?.authority && Array.isArray(original.creates) && Array.isArray(original.sql));
            const nativeAuthorityId = f.registerNativeAuthority(original.authority);
            const pg = await handle.drainCase();
            const selected = original.creates.filter((item) => ['approval_record','todo_item'].includes(item.table));
            assert.deepEqual(selected.map((item) => item.table + ':' + item.id).sort(), pg.map((item) => item.table + ':' + item.id).sort());
            const identities = [];
            for (const item of selected) {
                const intent = c.intents.find((entry) => entry.table === item.table); assert(intent);
                assertCreationProof(f.j, { ...item, authorityId: nativeAuthorityId, intentId: intent.id }, intent);
                const actual = await owner.query(`SELECT to_jsonb(t) AS row FROM poms.${ident(item.table)} t WHERE id=$1::uuid`, [item.id]); assert.equal(actual.rows.length, 1);
                const identity = rowIdentity(item.table, actual.rows[0].row), fromPg = pg.find((entry) => entry.table === item.table && entry.id === item.id);
                assert.equal(digest(identity), digest(fromPg.identity)); identities.push({ table: item.table, id: item.id, identity });
                if (item.table === 'approval_record') nativeApproval = actual.rows[0].row;
            }
            const inserts = original.sql.filter((entry) => entry.context?.runId === runId && entry.context?.caseId === c.scope.caseId && entry.phase === 'start' && entry.command === 'INSERT').flatMap((entry) => entry.relations);
            assert(inserts.indexOf('todo_item') >= 0 && inserts.indexOf('todo_item') < inserts.indexOf('approval_record'), 'This actual Native submit must witness Todo before Approval');
            await adopt(pg, c.scope.caseId); report.nativeShadowStatus = 'actual-original-submit-SDK-IDs-and-committed-immutable-identity-aligned-with-PG';
            record('native-sdk-pg-todo-before-approval', { original, pg, identities, sdkIdentitySource: 'independent committed owner row keyed by actual SDK afterCreate ID, not an SDK field snapshot' }, { sdkRows: selected.length, pgRows: pg.length });
        }

        // A transient INSERT and exact DELETE in one acknowledged transaction
        // leaves no uncertified row. Any incorrectly admitted AFTER event would
        // survive the COMMIT and make drain fail instead of returning zero.
        for (const mode of ['wrong-actor','wrong-project','wrong-target','missing-intent','overlapping-intent']) {
            const values = row('committed-filter-' + mode, mode === 'wrong-actor' ? f.actors.viewer : f.actors.admin);
            const todo = ['wrong-project','wrong-target'].includes(mode), table = todo ? 'todo_item' : 'auth_session';
            const selectors = mode === 'missing-intent' ? [] : [[table, todo ? { project_id: projectId } : { user_id: f.actors.admin }]];
            if (mode === 'overlapping-intent') selectors.push(['auth_session', { user_id: f.actors.admin, token_hash: values.token_hash }]);
            const c = await open('committed-filter-' + mode, selectors);
            const input = todo ? { id: values.id, source_type: 'approval-record', source_id: nativeApproval.id, todo_type: 'approval', business_domain: 'contract-finance',
                target_object_type: 'contract', target_object_id: mode === 'wrong-target' ? otherProjectContract.id : contractId,
                project_id: mode === 'wrong-project' ? secondaryProject.id : projectId, title: 'Observer transient admission-negative', assignee_user_id: f.actors.admin, status: 'open', priority: 'normal' } : values;
            assert.equal((await owner.query(`SELECT id FROM poms.${ident(table)} WHERE id=$1::uuid`, [input.id])).rows.length, 0);
            await begin(); let returned, deletion, transaction;
            try {
                transaction = (await f.client.query('SELECT pg_current_xact_id()::text AS xid')).rows[0].xid;
                returned = await insert(table, input); deletion = await deleteReturnedInsideTransaction(table, returned); await commit();
            } catch (error) { await rollback(); throw error; }
            const proofs = await handle.drainCase(); assert.equal(proofs.length, 0); await adopt([], c.scope.caseId);
            assert.equal((await owner.query(`SELECT id FROM poms.${ident(table)} WHERE id=$1::uuid`, [input.id])).rows.length, 0);
            record('actual-committed-filter-' + mode, { transaction, beforePkAbsent: true, returned, deletion, outerCommitAcknowledged: true, proofs, noSurvivingBusinessRow: true,
                admissionFilterAloneCertified: false, multipleIntentOrScopeConditionsMayReject: true }, { proofs: 0, transientRowsDeletedBeforeCommit: 1 });
        }

        // These rows are independently direct-COMMIT owned BEFORE asking the
        // PG observer to certify them. A rejected candidate never grants DELETE.
        {
            const c = await open('owned-missing-parent', [['todo_item', { project_id: projectId, source_id: contractId }]]);
            const values = { id: randomUUID(), source_type: 'approval-record', source_id: contractId, todo_type: 'approval', business_domain: 'contract-finance',
                target_object_type: 'contract', target_object_id: contractId, project_id: projectId, title: 'Owned observer parent-negative probe', assignee_user_id: f.actors.admin,
                status: 'open', priority: 'normal' };
            const direct = await f.insert('todo_item', values, { caseId: c.scope.caseId });
            await rejectAndDeleteOwned('actual-committed-owned-candidate-parent-rejected', c, [['todo_item',direct]], /Unknown committed approval parent/);
        }

        {
            const todoValues = (target, project) => ({ id: randomUUID(), source_type: 'approval-record', source_id: nativeApproval.id, todo_type: 'approval', business_domain: 'contract-finance',
                target_object_type: 'contract', target_object_id: target, project_id: project, title: 'Owned observer mismatched-parent probe', assignee_user_id: f.actors.admin, status: 'open', priority: 'normal' });
            for (const [name, target, project] of [['target',sameProjectContract.id,projectId], ['project',otherProjectContract.id,secondaryProject.id]]) {
                const c = await open('owned-parent-wrong-' + name, [['todo_item', { project_id: project, source_id: nativeApproval.id }]], { projects: [projectId,secondaryProject.id] });
                const direct = await f.insert('todo_item', todoValues(target,project), { caseId: c.scope.caseId });
                await rejectAndDeleteOwned('actual-owned-parent-wrong-' + name, c, [['todo_item',direct]], /Expected values to be strictly equal/);
            }
        }

        {
            const c = await open('owned-different-outer-parent', [['approval_record', { project_id: projectId }], ['todo_item', { project_id: projectId }]], { borrowedActors: ['00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000014'] });
            const input = { ...nativeApproval, id: randomUUID() }; for (const field of ['row_version','created_at','updated_at']) delete input[field];
            const directApproval = await f.insert('approval_record', input, { caseId: c.scope.caseId });
            const directTodo = await f.insert('todo_item', { id: randomUUID(), source_type: 'approval-record', source_id: directApproval.id, todo_type: 'approval', business_domain: 'contract-finance',
                target_object_type: 'contract', target_object_id: contractId, project_id: projectId, title: 'Owned different-outer parent probe', assignee_user_id: f.actors.admin, status: 'open', priority: 'normal' }, { caseId: c.scope.caseId });
            await rejectAndDeleteOwned('actual-owned-parent-different-outer', c, [['todo_item',directTodo],['approval_record',directApproval]], /New approval parent belongs to another outer transaction/);
        }

        if (runDuplicateEventBranch) {
            const c = await open('duplicate-insert-event', [['todo_item', { project_id: projectId, source_id: nativeApproval.id }]]);
            const values = { id: randomUUID(), source_type: 'approval-record', source_id: nativeApproval.id, todo_type: 'approval', business_domain: 'contract-finance',
                target_object_type: 'contract', target_object_id: contractId, project_id: projectId, title: 'Synthetic duplicate-event direct equivalent probe', assignee_user_id: f.actors.admin, status: 'open', priority: 'normal' };
            const proof = { kind: 'Root-opt-in-independent-direct-commit-equivalent', table: 'todo_item', id: values.id, beforePkAbsent: false, outerCommitAcknowledged: false, createdRows: [], syntheticCounterexampleNotNativeProducer: true };
            assert.equal((await owner.query('SELECT id FROM poms.todo_item WHERE id=$1::uuid', [values.id])).rows.length, 0); proof.beforePkAbsent = true;
            report.directEquivalent ??= []; report.directEquivalent.push(proof); save(); await begin();
            try {
                proof.topXid8 = (await f.client.query('SELECT pg_current_xact_id()::text AS xid')).rows[0].xid;
                const first = await insert('todo_item', values); proof.createdRows.push(first); save();
                proof.intermediateExactDelete = await deleteReturnedInsideTransaction('todo_item', first); save();
                const second = await insert('todo_item', values); proof.createdRows.push(second);
                assert.equal((await f.client.query('SELECT pg_current_xact_id()::text AS xid')).rows[0].xid, proof.topXid8);
                assert.equal(first.xmin, String(BigInt(proof.topXid8) % 4294967296n)); assert.equal(second.xmin, first.xmin); save();
                await commit(); proof.outerCommitAcknowledged = true;
            } catch (error) { await rollback(); throw error; }
            const current = (await owner.query('SELECT to_jsonb(t) AS row,xmin::text AS xmin FROM poms.todo_item t WHERE id=$1::uuid', [values.id])).rows;
            assert.equal(current.length, 1); assert.equal(digest(rowIdentity('todo_item',current[0].row)), digest(rowIdentity('todo_item',proof.createdRows[1].row)));
            assert.equal(current[0].xmin, proof.createdRows[1].xmin); assert.equal((await owner.query('SELECT pg_xact_status($1::xid8) AS status', [proof.topXid8])).rows[0].status, 'committed');
            proof.independentFinal = current[0]; proof.independentOuterStatus = 'committed'; save();
            await assert.rejects(() => handle.drainCase(), /Ambiguous repeated INSERT of one ID/);
            // This authority is the separate actual direct RETURNING/ACK proof,
            // not the PG candidate or an old certificate for a reused row.
            assert(proof.beforePkAbsent && proof.outerCommitAcknowledged && proof.independentOuterStatus === 'committed');
            await begin(); proof.finalExactDelete = await deleteReturnedInsideTransaction('todo_item',current[0]); await commit(); proof.finalDeleteCommitAcknowledged = true; save();
            assert.equal((await owner.query('SELECT id FROM poms.todo_item WHERE id=$1::uuid',[values.id])).rows.length,0);
            const discard = await handle.discardRejectedCase(); await f.resolveNoCreates(c.scope.caseId);
            report.duplicateEventBranch = 'actual-duplicate-event-rejected-with-independent-direct-equivalent-proof-and-zero-certificate-discard';
            record('actual-duplicate-insert-event-rejected', { proof, discard }, { originalInserts: 2, actualDuplicateEventRejections: 1, certificatesIssued: 0 });
        }

        const installed = journalFor(handle), sql = observerStatements({ observerId: installed.observerId, runId, database });
        assert.deepEqual(await readObserverFootprint(owner), installed.installedCatalog);
        for (const [name, alter, undo] of [
            ['function-definition', `ALTER FUNCTION ${sql.fn}() SET search_path=pg_catalog,public`, `ALTER FUNCTION ${sql.fn}() SET search_path=pg_catalog`],
            ['function-security', `ALTER FUNCTION ${sql.fn}() SECURITY INVOKER`, `ALTER FUNCTION ${sql.fn}() SECURITY DEFINER`],
            ['trigger-enable', `ALTER TABLE poms.auth_session DISABLE TRIGGER ${ident(sql.names.trigger)}`, `ALTER TABLE poms.auth_session ENABLE TRIGGER ${ident(sql.names.trigger)}`],
            ['function-acl', `REVOKE EXECUTE ON FUNCTION ${sql.fn}() FROM ${ident(APP)}`, `GRANT EXECUTE ON FUNCTION ${sql.fn}() TO ${ident(APP)}`],
        ]) {
            await owner.query(alter); const changed = await readObserverFootprint(owner);
            assert.throws(() => classifyObserverCatalog(changed, installed));
            try { await assert.rejects(() => reconcile(handle.journalFile), /differs from both exact saved states/); }
            finally { await owner.query(undo); }
            assert.deepEqual(await readObserverFootprint(owner), installed.installedCatalog);
            record('actual-committed-drift-' + name, { changed, originalFootprint: installed.installedCatalog, exactSameOidRestored: true }, { driftRejected: 1 });
        }
        {
            const name = 'l_ce_' + randomUUID().replaceAll('-','').slice(0,20), qualified = ident(CONTROL) + '.' + ident(name);
            assert.equal((await owner.query('SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2',[CONTROL,name])).rows.length,0);
            await owner.query(`CREATE TABLE ${qualified}(probe integer)`);
            const created = (await owner.query('SELECT c.oid::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2',[CONTROL,name])).rows; assert.equal(created.length,1);
            const changed = await readObserverFootprint(owner);
            try { await assert.rejects(() => reconcile(handle.journalFile), /differs from both exact saved states/); }
            finally {
                assert.deepEqual((await owner.query('SELECT c.oid::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2',[CONTROL,name])).rows,created);
                assert.equal((await owner.query(`SELECT count(*)::integer AS count FROM ${qualified}`)).rows[0].count,0);
                await owner.query(`DROP TABLE ${qualified}`);
            }
            assert.deepEqual(await readObserverFootprint(owner),installed.installedCatalog);
            record('actual-unknown-control-object-refused', { beforeAbsent: true, createdOid: created[0].oid, changed, exactOwnedObjectRemovedWithoutCascade: true }, { driftRejected: 1 });
        }
        {
            await owner.query('BEGIN'); let changed;
            try {
                for (const statement of sql.drop.slice(0,observedTables.length + 1)) await owner.query(statement);
                await owner.query(sql.functionSql);
                for (const statement of sql.create.filter((statement) => /^(?:REVOKE ALL ON FUNCTION|GRANT EXECUTE ON FUNCTION|CREATE TRIGGER)/.test(statement))) await owner.query(statement);
                changed = await readObserverFootprint(owner); assert.throws(() => classifyObserverCatalog(changed,installed));
                assert.notEqual(changed.functions[0].oid,installed.installedCatalog.functions[0].oid);
            } finally { await owner.query('ROLLBACK'); }
            assert.deepEqual(await readObserverFootprint(owner),installed.installedCatalog);
            record('actual-oid-recreation-inside-rollback-refused', { changed, committedDrift: false, actualOwnerDdlRolledBack: true, originalOidsRestoredByRollback: true }, { classifierRejections: 1 });
        }
        for (const [name, statement] of [
            ['control-read',`SELECT * FROM ${sql.events}`], ['control-update',`UPDATE ${sql.context} SET op='foreign'`],
            ['control-delete',`DELETE FROM ${sql.events}`], ['function-alter',`ALTER FUNCTION ${sql.fn}() SECURITY INVOKER`],
        ]) {
            await assert.rejects(() => f.client.query(statement), (error) => error.code === '42501');
            record('actual-app-acl-' + name + '-rejected', { sqlState:'42501' }, { permissionRejections: 1 });
        }
        report.initialRestore = await handle.restore(); handle = null; save();

        for (const point of ['before-create-function','after-real-commit']) {
            const failed = await failedInstall(point);
            if (point === 'after-real-commit') {
                assert.equal(failed.failure.controlledFault.realCommitCompleted,true); assert.equal(failed.reconciled.result,'exact-installed-handle-reopened');
                handle = failed.reconciled.handle; await registered(f,handle); failed.restored = await handle.restore(); handle = null;
            } else assert.equal(failed.reconciled.result,'exact-original-footprint-present');
            record(point === 'after-real-commit' ? 'install-simulated-caller-ack-loss-reconciled' : 'install-mid-transaction-rollback-reconciled', failed, { controlledFaults: 1 });
        }
        for (const point of ['before-drop-function','after-real-commit']) {
            handle = await install(); await registered(f,handle); const attemptedFile=handle.journalFile; let failure;
            try { await withQueryFault(point,()=>handle.restore()); assert.fail('Controlled restore fault did not fire'); } catch (error) { failure=error; }
            assert.equal(failure.controlledFault?.hit,1); const prior=privateText(attemptedFile);
            const reconciled=await reconcile(attemptedFile); assert.equal(privateText(attemptedFile),prior);
            if(point==='before-drop-function'){assert.equal(reconciled.result,'exact-installed-handle-reopened');handle=reconciled.handle;await handle.restore();}
            else{assert.equal(failure.controlledFault.realCommitCompleted,true);assert.equal(reconciled.result,'exact-original-footprint-present');}
            handle=null;
            record(point==='after-real-commit'?'restore-simulated-caller-ack-loss-reconciled':'restore-mid-transaction-rollback-reconciled',{attemptedFile,attemptedSha256:sha(prior),failure:{code:failure.code,controlledFault:failure.controlledFault},reconciled},{controlledFaults:1});
        }
        report.full107After=await readFull107Catalog(owner); assert.deepEqual(report.full107After,report.full107Before);
        for(let index=0;index<2;index++)report.cleanup.push(await f.cleanup());
        assert.equal(report.cleanup[1].deleted,0);report.doubleZero=true;report.result='pass';report.finishedAt=new Date().toISOString();save();
        return publicSummary(report,file);
    } catch (error) {
        try { await rollback(); } catch { report.appRollbackUnknown = true; }
        report.result = 'partial'; report.failure = { code: error.code ?? null, name: error.name, message: error.message, stack: error.stack }; save();
        const safe = new Error('PG observer counterexamples stopped; inspect the private receipt. No business acceptance or complete cleanup is certified.');
        safe.code = 'R2L_OBSERVER_COUNTEREXAMPLES_PARTIAL'; safe.privateReceiptFile = file; safe.privateReceiptSha256 = sha(privateText(file)); throw safe;
    } finally {
        // Closing an owned observer connection preserves its control objects and
        // private case for explicit reconciliation; it does not guess restoration.
        for (const client of canonicalClients) try { await client.end(); } catch { /* Original result remains private. */ }
        try { await owner.end(); } catch { /* Preserve the original partial boundary. */ }
    }
}

// Mechanically copied complete readonly catalog function from the reviewed
// observer SOURCE 71802e17; no old receipt or private state is reused.
async function readObserverFootprint(owner) {
  const relations = await owner.query(`WITH targets AS (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relname=ANY($1::text[])), scoped AS (
    SELECT oid FROM targets UNION SELECT indexrelid FROM pg_index WHERE indrelid IN (SELECT oid FROM targets)
    UNION SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r2l_control')
    SELECT n.nspname,c.relname,c.oid::text,c.relkind::text,pg_get_userbyid(c.relowner) AS owner,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity,c.relpersistence,c.relreplident,c.reloptions,c.reltoastrelid::text,
      i.indrelid::text AS index_of_oid,i.indisprimary,i.indisunique,i.indisvalid,i.indisready,i.indexprs::text,i.indpred::text,
      CASE WHEN i.indexrelid IS NOT NULL THEN ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ordinal) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum ORDER BY k.ordinal) END AS index_columns,
      CASE WHEN i.indexrelid IS NOT NULL THEN pg_get_indexdef(c.oid) END AS index_definition
    FROM scoped s JOIN pg_class c ON c.oid=s.oid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_index i ON i.indexrelid=c.oid ORDER BY n.nspname,c.relname`, [observedTables]);
  const schema = await owner.query("SELECT oid::text,nspname,pg_get_userbyid(nspowner) AS owner,nspacl::text FROM pg_namespace WHERE nspname='r2l_control'");
  const triggers = await owner.query("SELECT t.oid::text,t.tgname,c.relname,t.tgfoid::text,t.tgenabled,t.tgisinternal,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relname=ANY($1::text[]) ORDER BY c.relname,t.tgname", [observedTables]);
  const functions = await owner.query("SELECT p.oid::text,p.proname,pg_get_userbyid(p.proowner) AS owner,p.proacl::text,p.prosecdef,p.proconfig,p.prosrc,p.proargtypes::text,p.prorettype::regtype::text AS return_type,l.lanname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='r2l_control' ORDER BY p.proname,p.oid");
  const columns = await owner.query("SELECT n.nspname,c.relname,a.attnum,a.attname,a.atttypid::text,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) AS default_expression FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='r2l_control' OR n.nspname='poms' AND c.relname=ANY($1::text[]) ORDER BY n.nspname,c.relname,a.attnum", [observedTables]);
  const constraints = await owner.query("SELECT con.oid::text,n.nspname,c.relname,con.conname,con.contype,con.convalidated,con.condeferrable,con.condeferred,pg_get_constraintdef(con.oid,true) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r2l_control' OR n.nspname='poms' AND c.relname=ANY($1::text[]) ORDER BY n.nspname,c.relname,con.conname", [observedTables]);
  return { schema: schema.rows, relations: relations.rows, triggers: triggers.rows, functions: functions.rows, columns: columns.rows, constraints: constraints.rows };
}
if (process.argv.includes('--check') && path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    assert.equal(counterexamplePlan.generatedTables.length, 7);
    assert.equal(sha(fs.readFileSync(OBSERVER_SOURCE)), OBSERVER_SHA256);
    assert(counterexamplePlan.transactions.includes('savepoint-release-outer-commit'));
    assert.equal(counterexamplePlan.acknowledgments.length, 4);
    console.log(JSON.stringify({ kind: 'pure-L-observer-counterexample-plan-check', result: 'source-plan-only', PostgreSQLExecuted: false, DDLExecuted: false, runtimeComplete: false }));
}
