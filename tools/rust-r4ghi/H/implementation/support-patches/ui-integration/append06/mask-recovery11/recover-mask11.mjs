import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', PRIVATE = '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business08/main01';
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), keyOf = (db, table, key) => JSON.stringify([db, table, key]);
function original(ctx, item) { assert(item.file.startsWith(ctx.priv + '/')); const stat = fs.lstatSync(item.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(item.file), item.file); const bytes = fs.readFileSync(item.file); assert.equal(sha(bytes), item.sha256); return bytes; }
const jsonOriginal = (ctx, plan, name) => JSON.parse(original(ctx, plan.originals[name]));
const changedColumns = (before, after) => Object.keys(before).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).sort();

export function proveReassignment({ state, database, request, body, response, http, ledger, beforeRows, afterRows }) {
  assert.equal(request.operationId, 'ProjectController_reassignOwner'); assert.equal(request.method, 'POST'); assert.equal(request.requestId, ledger.requestId);
  assert.equal(request.headers['X-Request-Id'], ledger.requestId); const url = new URL(request.url); assert.equal(url.origin, 'http://127.0.0.1:31441');
  assert.equal(url.pathname, `/api/projects/${state.fixtures.maskProject.id}:reassignOwner`); assert.equal(url.search, '');
  assert.equal(http.status, 201); assert.equal(http.expectedStatus, 200); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
  assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []); assert.equal(ledger.operationId, request.operationId);
  assert.equal(response.targetId, state.fixtures.maskProject.id); assert.equal(response.newOwnerUserId, state.actors.person.id); assert.equal(response.newOwnerOrgId, state.actors.person.orgId);
  const project = afterRows.project.find(row => row.key[0] === response.targetId), prior = beforeRows.project.find(row => row.key[0] === response.targetId);
  const reassignment = afterRows.project_owner_reassignment_record.find(row => row.key[0] === response.projectOwnerReassignmentRecordId);
  const auditKey = ledger.recorded.filter(row => row.kind === 'birth' && row.table === 'audit_log'); assert.equal(auditKey.length, 1);
  const audit = afterRows.audit_log.find(row => JSON.stringify(row.key) === JSON.stringify(auditKey[0].key)); assert(project && prior && reassignment && audit);
  assert(!beforeRows.project_owner_reassignment_record.some(row => row.key[0] === reassignment.key[0])); assert(!beforeRows.audit_log.some(row => row.key[0] === audit.key[0]));
  const old = JSON.parse(prior.raw), next = JSON.parse(project.raw), rr = JSON.parse(reassignment.raw), ar = JSON.parse(audit.raw);
  assert.equal(old.owner_user_id, state.actors.manager.id); assert.equal(body.expectedVersion, old.row_version); assert.equal(next.row_version, old.row_version + 1);
  assert.equal(next.owner_user_id, body.ownerUserId); assert.equal(next.owner_org_id, body.ownerOrgId); assert.equal(response.previousOwnerUserId, old.owner_user_id); assert.equal(response.previousOwnerOrgId, old.owner_org_id);
  assert.equal(response.businessStatusAfter, next.status); assert.deepEqual(changedColumns(old, next), ['owner_user_id', 'row_version', 'updated_at']);
  assert.equal(rr.project_id, response.targetId); assert.equal(rr.previous_owner_user_id, old.owner_user_id); assert.equal(rr.previous_owner_org_id, old.owner_org_id);
  assert.equal(rr.new_owner_user_id, body.ownerUserId); assert.equal(rr.new_owner_org_id, body.ownerOrgId); assert.equal(rr.reason, body.reason.trim()); assert.equal(rr.reassigned_by, state.actors.manager.id);
  assert.equal(ar.event_type, request.operationId); assert.equal(ar.target_type, 'project'); assert.equal(ar.target_id, response.targetId); assert.equal(ar.request_id, ledger.requestId); assert.equal(ar.operator_id, state.actors.manager.id); assert.equal(ar.result, 'success');
  assert.equal(project.xmin, reassignment.xmin); assert.equal(project.xmin, audit.xmin);
  const cookie = Object.fromEntries(request.headers.Cookie.split(';').map(part => { const at = part.indexOf('='); return [part.slice(0, at).trim(), part.slice(at + 1)]; }));
  const session = beforeRows.auth_session.map(row => JSON.parse(row.raw)).find(row => row.token_hash === sha(Buffer.from(decodeURIComponent(cookie.poms_session)))); assert.equal(session?.user_id, state.actors.manager.id);
  for (const [table, row] of [['project', project], ['project_owner_reassignment_record', reassignment], ['audit_log', audit]]) {
    const owned = state.owned[keyOf(database, table, row.key)]; assert(owned && !owned.deleted); assert.equal(owned.latestSha256, row.sha256); assert.equal(owned.latestXmin, row.xmin);
  }
  return { projectId: response.targetId, reassignmentId: response.projectOwnerReassignmentRecordId, auditId: audit.key[0], actorId: session.user_id, requestId: ledger.requestId, sameTransactionXmin: project.xmin,
    projectBeforeVersion: old.row_version, projectAfterVersion: next.row_version, changedColumns: changedColumns(old, next), actualStatus: 201, canonicalExpectedStatus: 200, contractPassed: false,
    rows: [['project', project], ['project_owner_reassignment_record', reassignment], ['audit_log', audit]].map(([table, row]) => ({ table, key: row.key, rawSha256: row.sha256, xmin: row.xmin })) };
}

function noDrift(ctx, observed, current, readRows) {
  for (const db of ctx.databases) {
    assert.deepEqual(current.databases[db].meta, observed.databases[db].meta); assert.deepEqual(current.objects[db], observed.objects[db]);
    assert.deepEqual(Object.keys(current.databases[db].tables), Object.keys(observed.databases[db].tables));
    for (const table of Object.keys(observed.databases[db].tables)) assert.deepEqual(readRows(current.databases[db].tables[table]).map(row => [row.key, row.sha256, row.xmin]), readRows(observed.databases[db].tables[table]).map(row => [row.key, row.sha256, row.xmin]), 'Any intervening row/xmin drift blocks this exact metadata recovery');
  }
}

export async function recover(ctx, { planFile, approvedPlanSHA256 }) {
  assert.equal(process.platform, 'linux'); const planBytes = fs.readFileSync(planFile); assert.equal(sha(planBytes), approvedPlanSHA256); const plan = JSON.parse(planBytes);
  assert.equal(plan.kind, 'proposed-exact-committed-reassignment-failed-contract-metadata-recovery'); assert.equal(ctx.epoch, plan.epoch); assert.equal(ctx.run, plan.run); assert.equal(ctx.state.marker, plan.marker);
  assert(!ctx.state.blockedObservation && !ctx.state.activeFault && !ctx.state.cleanupPlan && !ctx.state.cleaned); assert(!Object.hasOwn(ctx.state.fixtures, 'maskReassignment'));
  const stateFile = `${ctx.priv}/state.json`, stateBytes = fs.readFileSync(stateFile); assert.equal(sha(stateBytes), plan.reviewStateSHA256, 'State changed after the exact plan review');
  const { capture, loadSnapshot, readRows } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/snapshot.mjs`).href), { assertRecorded } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/ledger.mjs`).href);
  const request = jsonOriginal(ctx, plan, '000658-http-request.json'), body = jsonOriginal(ctx, plan, '000658-http-request-body.bin'), response = jsonOriginal(ctx, plan, '000658-http-response-body.bin'), headers = jsonOriginal(ctx, plan, '000658-http-response-headers.json'), ledger = jsonOriginal(ctx, plan, '000659-ledger.json');
  assert.equal(headers.status, 201); assert.deepEqual(ledger.before, plan.before); assert.deepEqual(ledger.after, plan.after); jsonOriginal(ctx, plan, '000626-H-mask-fixture09-partial.json');
  const httpBytes = fs.readFileSync(plan.httpReceipt.file); assert.equal(sha(httpBytes), plan.httpReceipt.sha256); const http = JSON.parse(httpBytes);
  for (const item of Object.values(http.originals)) if (item?.file && item.rawBytesSha256) original(ctx, { file: item.file, sha256: item.rawBytesSha256 });
  assert.equal(http.requestId, ledger.requestId); assert.equal(http.operationId, request.operationId);
  const specification = JSON.parse(fs.readFileSync(`${ROOT}/libs/shared/api-spec/openapi.json`)); assert.equal(sha(fs.readFileSync(`${ROOT}/libs/shared/api-spec/openapi.json`)), plan.canonicalOpenApiSHA256);
  assert.deepEqual(Object.keys(specification.paths['/api/projects/{id}:reassignOwner'].post.responses).filter(status => /^2\d\d$/.test(status)), ['200']);
  const before = loadSnapshot(ctx, plan.before), after = loadSnapshot(ctx, plan.after), selected = snapshot => Object.fromEntries(['project', 'project_owner_reassignment_record', 'audit_log', 'auth_session'].map(table => [table, readRows(snapshot.databases[ctx.database].tables[table])]));
  const proof = proveReassignment({ state: ctx.state, database: ctx.database, request, body, response, http, ledger, beforeRows: selected(before), afterRows: selected(after) }); assert.deepEqual(proof, plan.proof);
  const current = await capture(ctx, ctx.next('mask-recovery11-current')); noDrift(ctx, after, current, readRows); assertRecorded(ctx, current);
  const beforeState = ctx.artifact(`${ctx.next('mask-recovery11-state-before')}.bin`, stateBytes);
  const receipt = ctx.artifact(`${ctx.next('mask-recovery11-proof')}.json`, { kind: 'Root-reviewed-metadata-only-actual201-reassignment-response-recovery', approvedPlanSHA256, proof, originalFailedContractHTTP: plan.httpReceipt, originalFailedPartial: plan.originals['000626-H-mask-fixture09-partial.json'], originalCompleteLedger: plan.originals['000659-ledger.json'], freshCurrent: current.manifest, stateBefore: beforeState, contractStatusRemainsFailed: true, businessRequestsSent: 0, businessDatabaseWrites: 0 }, { kind: 'metadata-only-reassignment-body-restoration-with-preserved-contract-failure', actualStatus: 201, canonicalExpectedStatus: 200, contractPassed: false, businessRequestsSent: 0, businessDatabaseWrites: 0, G3Certified: false, G4Certified: false });
  ctx.state.fixtures.maskReassignment = response;
  ctx.state.fixtures.maskReassignmentRecovery = { approvedPlanSHA256, receipt, exactActualResponseSHA256: plan.originals['000658-http-response-body.bin'].sha256 };
  ctx.state.fixtures.maskReassignmentContractFailure = { operationId: request.operationId, requestId: request.requestId, actualStatus: 201, canonicalExpectedStatus: 200, contractPassed: false, originalHTTP: plan.httpReceipt, originalPartial: plan.originals['000626-H-mask-fixture09-partial.json'], originalLedger: plan.originals['000659-ledger.json'] };
  ctx.persist(); return { kind: 'restored-exact-actual-response-metadata-only', receipt, actualStatus: 201, canonicalExpectedStatus: 200, contractPassed: false, newBusinessRequests: 0, businessDatabaseWrites: 0, G3Certified: false, G4Certified: false };
}
async function main() {
  const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--plan' && args[2] === '--approved-plan-sha' && args[4] === '--execute'); assert.equal(process.platform, 'linux'); assert(/^[a-f0-9]{64}$/.test(args[3]));
  const lock = `${PRIVATE}/driver.lock`; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'H-mask-metadata-recovery11', approvedPlanSHA256: args[3] }) + '\n', { flag: 'wx', mode: 0o600 });
  try { const { createContext } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/context.mjs`).href); const ctx = createContext({ epoch: 'g2-business08', run: 'main01' }); const result = await recover(ctx, { planFile: args[1], approvedPlanSHA256: args[3] }); console.log(JSON.stringify(result)); }
  finally { if (fs.existsSync(lock)) { const owner = JSON.parse(fs.readFileSync(lock)); if (owner.pid === process.pid) fs.unlinkSync(lock); } }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Exact metadata recovery11 stopped; no POST, business SQL or successful200 is claimed.'); process.exitCode = 1; });
