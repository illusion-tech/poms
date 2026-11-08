// Root-only, exact04 omitted-Origin ownership recovery. Never sends HTTP or
// writes business PG. Only one existing owned Origin metadata entry is advanced.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { sha, keyOf, exactPath, operationMap } from './pure.mjs'; import { readPin54 } from './consumer-admission54.mjs'; import { loadSnapshot, readRows, capture, difference } from './snapshot.mjs';
import { assertOriginBefore28, assertOriginCommit28 } from './ui-creator-origin28.mjs';
const base = '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/', pid = '3d4ed663-b861-46cf-90e5-824c94648a86';
const failed = Object.freeze({ file: base + '006368-ledger.json', rawBytesSha256: '6474c401c5fd2f86c5646eca07fe95668d4051d4eda0a93c6572530e91d76b76' });
const request = Object.freeze({ file: base + '006367-ui10-http-browser-request.json', rawBytesSha256: 'd055c1b8d8906db654daad23e0ad7cec1829146208ab23fca6f7f41ffbed1a99' });
const response = Object.freeze({ file: base + '006367-ui10-http-browser-response.json', rawBytesSha256: 'f4e5fec75c16dec1fa1fcc567d40eb946659be70cfeaf82d93089e9ccec2e2e3' });
const op = 'ProjectController_reassignOwner', requestId = 'bg383435b83c-006367-ui10-http-6382710b';
function one(ctx, snapshot, table, id) { const rows = readRows(snapshot.databases[ctx.database].tables[table]).filter(row => row.key[0] === id); assert.equal(rows.length, 1); return rows[0]; }
function actual28(ctx) {
  const ledger = JSON.parse(readPin54(failed)), observer = JSON.parse(readPin54(response)); assert.equal(ledger.requestId, requestId); assert.equal(ledger.operationId, op);
  assert.deepEqual(ledger.blockers, [{ kind: 'owned-mutation-not-in-command-allowlist', table: 'project_ownership_origin', key: [pid] }]); assert.equal(ledger.ownershipComplete, false);
  const intentBytes = fs.readFileSync(request.file); assert.equal(sha(intentBytes), request.rawBytesSha256); const intent = JSON.parse(intentBytes), body = JSON.parse(Buffer.from(intent.bodyBase64, 'base64'));
  const attempt = observer.attempt; assert.equal(attempt.requestId, requestId); assert.equal(attempt.operationId, op); assert.equal(attempt.status, 200); assert.equal(attempt.expectedStatus, 200); assert(attempt.responseComplete && !attempt.transportFailure);
  assert.equal(intent.requestId, requestId); assert.equal(intent.operationId, op); assert.equal(intent.pathParams.id, pid); assert.deepEqual(body, attempt.requestValue);
  const value = attempt.body.data ?? attempt.body; assert.equal(value.targetId, pid); assert.equal(value.newOwnerUserId, body.ownerUserId); assert.equal(value.newOwnerOrgId, body.ownerOrgId);
  const rawFile = '/home/wangzishi/.local/share/poms-r4ghi/private/ui/runtime14/dom14-source12-04/http/http-0010.json', rawBytes = fs.readFileSync(rawFile), raw = JSON.parse(rawBytes);
  const spec = JSON.parse(fs.readFileSync(ctx.win + '/libs/shared/api-spec/openapi.json')), canonical = operationMap(spec).get(op); assert.equal(raw.request.method, 'POST'); assert.equal(raw.request.path, exactPath(canonical.template, { id: pid })); assert.equal(raw.request.headers['x-request-id'], requestId);
  assert.equal(raw.response.status, 200); assert.equal(raw.response.complete, true); assert.equal(raw.failure, null); assert.equal(raw.response.bodyBase64, observer.bodyBase64); assert.equal(raw.request.bodyBase64, intent.bodyBase64);
  const before = loadSnapshot(ctx, ledger.before), after = loadSnapshot(ctx, ledger.after), originBefore = one(ctx, before, 'project_ownership_origin', pid), origin = one(ctx, after, 'project_ownership_origin', pid), projectBefore = one(ctx, before, 'project', pid), project = one(ctx, after, 'project', pid), record = one(ctx, after, 'project_owner_reassignment_record', value.projectOwnerReassignmentRecordId);
  const audits = readRows(after.databases[ctx.database].tables.audit_log).filter(row => JSON.parse(row.raw).request_id === requestId); assert.equal(audits.length, 1);
  const oldProject = JSON.parse(projectBefore.raw), oldOrigin = JSON.parse(originBefore.raw);
  assertOriginBefore28(oldOrigin, { projectId: pid, creatorId: attempt.actorId, orgId: oldProject.owner_org_id, expectedOriginVersion: oldOrigin.row_version });
  const commit = assertOriginCommit28({ beforeOrigin: originBefore, origin, project, record, audit: audits[0], requestId, actorId: attempt.actorId, projectId: pid, targetOwnerId: body.ownerUserId, targetOrgId: body.ownerOrgId, expectedProjectVersion: body.expectedVersion });
  const diff = difference(before, after); assert(diff.every(change => change.database === ctx.database && change.added.length + change.changed.length + change.missing.length > 0));
  assert.deepEqual(diff.map(change => change.table).sort(), ['audit_log', 'project', 'project_owner_reassignment_record', 'project_ownership_origin']);
  assert.equal(readRows(after.databases[ctx.database].tables.project_owner_reassignment_record).filter(row => JSON.parse(row.raw).project_id === pid).length, 1);
  assert.deepEqual(ledger.recorded.map(row => row.table).sort(), ['audit_log', 'project', 'project_owner_reassignment_record']);
  return { ledger, intent, body, attempt, before, after, originBefore, origin, project, record, audit: audits[0], commit, raw: { file: rawFile, rawBytesSha256: sha(rawBytes) } };
}
function sourceBases28(ctx) { const pins = [...ctx.pins]; for (const name of fs.readdirSync(ctx.win + '/tools/rust-r4ghi/business').filter(file => /\.(mjs|json)$/.test(file)).sort()) { const file = 'tools/rust-r4ghi/business/' + name; pins.push({ file, sha256: sha(fs.readFileSync(ctx.win + '/' + file)) }); }
  for (const name of ['write-policy14.mjs', 'fixture-receipts14.mjs', 'linux14.mjs']) { const file = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/' + name; pins.push({ file, sha256: sha(fs.readFileSync(ctx.win + '/' + file)) }); }
  return pins;
}
function verifyPlan28(ctx, plan) { assert.equal(plan.kind, 'Root-reviewed-metadata-only-04-targeted-Origin-recovery28'); assert.equal(plan.projectId, pid); assert.deepEqual(plan.failed, failed); assert.deepEqual(plan.response, response); assert.equal(plan.sourcePinsSHA256, sha(JSON.stringify(ctx.pins))); assert.deepEqual(plan.sourceBases, sourceBases28(ctx)); assert.equal(plan.epoch, ctx.epoch); assert.equal(plan.run, ctx.run); assert.equal(plan.businessWrites, 0); }
export function prepareOriginRecovery28(ctx) {
  assert.equal(process.platform, 'linux'); assert(!ctx.state.activeFault && !ctx.state.cleaned && !ctx.state.cleanupPlan); assert.equal(ctx.state.blockedObservation?.file, failed.file); assert.equal(ctx.state.blockedObservation.rawBytesSha256, failed.rawBytesSha256);
  const a = actual28(ctx), owner = ctx.state.owned[keyOf(ctx.database, 'project_ownership_origin', [pid])]; assert(owner && !owner.deleted); assert.equal(owner.latestSha256, a.originBefore.sha256); assert.equal(owner.latestXmin, a.originBefore.xmin);
  for (const [table, row] of [['project', a.project], ['project_owner_reassignment_record', a.record], ['audit_log', a.audit]]) { const own = ctx.state.owned[keyOf(ctx.database, table, row.key)]; assert(own && own.latestSha256 === row.sha256 && own.latestXmin === row.xmin && own.latestProof.requestId === requestId); }
  const plan = { kind: 'Root-reviewed-metadata-only-04-targeted-Origin-recovery28', projectId: pid, epoch: ctx.epoch, run: ctx.run, failed, request, response, rawUpstream: a.raw,
    sourcePinsSHA256: sha(JSON.stringify(ctx.pins)), sourceBases: sourceBases28(ctx), before: a.ledger.before, after: a.ledger.after, oldOriginSHA256: a.originBefore.sha256, actualOriginSHA256: a.origin.sha256, actualOriginXmin: a.origin.xmin,
    businessWrites: 0, advanceOnlyOwnedTable: 'project_ownership_origin', neverReownProjectAuditOrRecord: true, old04Passed: false, freshReadOnlyCurrentSnapshotRequired: true, G3Certified: false, G4Certified: false };
  return ctx.artifact(ctx.next('creator28-exact-recovery-plan') + '.json', plan, { kind: 'metadata-only-Origin-recovery-plan-for-Root-review', noBusinessWrite: true });
}
export async function executeOriginRecovery28(ctx, planPin) {
  assert.equal(process.platform, 'linux'); const plan = JSON.parse(readPin54(planPin)); verifyPlan28(ctx, plan); assert.equal(JSON.parse(fs.readFileSync(ctx.priv + '/driver.lock')).pid, process.pid);
  assert(!ctx.state.activeFault && !ctx.state.cleaned && !ctx.state.cleanupPlan); const a = actual28(ctx); assert.deepEqual(a.raw, plan.rawUpstream); assert.equal(a.originBefore.sha256, plan.oldOriginSHA256); assert.equal(a.origin.sha256, plan.actualOriginSHA256); assert.equal(a.origin.xmin, plan.actualOriginXmin);
  ctx.state.consumerChecks ??= {}; ctx.state.consumerChecks.creatorAssignmentRecovery28 ??= {}; const map = ctx.state.consumerChecks.creatorAssignmentRecovery28, old = map[pid];
  if (old?.phase === 'verified') { assert.equal(old.plan.rawBytesSha256, planPin.rawBytesSha256); return old.receipt; }
  assert.equal(ctx.state.blockedObservation?.file, failed.file); assert.equal(ctx.state.blockedObservation.rawBytesSha256, failed.rawBytesSha256);
  const current = await capture(ctx, ctx.next('creator28-current-readonly')); assert.deepEqual(difference(a.after, current), [], 'Any actual row/xmin drift needs a new exact reconciliation');
  for (const database of ctx.databases) { assert.deepEqual(a.after.databases[database].meta, current.databases[database].meta); assert.deepEqual(a.after.objects[database], current.objects[database]); for (const table of Object.keys(a.after.databases[database].tables)) assert.deepEqual(readRows(a.after.databases[database].tables[table]), readRows(current.databases[database].tables[table]), 'Every actual row and xmin must remain the committed04 observation'); }
  const owner = ctx.state.owned[keyOf(ctx.database, 'project_ownership_origin', [pid])]; assert(owner && !owner.deleted);
  for (const [table, row] of [['project', a.project], ['project_owner_reassignment_record', a.record], ['audit_log', a.audit]]) { const own = ctx.state.owned[keyOf(ctx.database, table, row.key)]; assert(own && own.latestSha256 === row.sha256 && own.latestXmin === row.xmin && own.latestProof.requestId === requestId); }
  const record = map[pid] ??= { phase: 'intent', committed: true, projectId: pid, plan: planPin, originalFailedLedger: failed, actualResponse: response, original04Passed: false }; ctx.persist();
  if (owner.latestSha256 === a.originBefore.sha256 && owner.latestXmin === a.originBefore.xmin) ctx.own(ctx.database, 'project_ownership_origin', a.origin, { kind: 'HTTP-UI-actual-committed-Origin-CAS-targeted-metadata-recovery28', transport: a.ledger.transport, requestId, operationId: op, status: 200, responseComplete: true,
    beforeSha256: a.originBefore.sha256, beforeXmin: a.originBefore.xmin, beforeSnapshot: a.ledger.before, afterSnapshot: a.ledger.after, originalFailedLedger: failed, actualResponse: response, rawUpstream: a.raw, plan: planPin, allowedColumns: a.commit.columns, oldLedgerRewritten: false, businessMutation: false });
  else { assert.equal(owner.latestSha256, a.origin.sha256); assert.equal(owner.latestXmin, a.origin.xmin); assert.equal(owner.latestProof.kind, 'HTTP-UI-actual-committed-Origin-CAS-targeted-metadata-recovery28'); assert.equal(owner.latestProof.plan.rawBytesSha256, planPin.rawBytesSha256); }
  verifyPlan28(ctx, plan); assert.equal(sha(readPin54(planPin)), planPin.rawBytesSha256);
  const receipt = ctx.artifact(ctx.next('creator28-origin-metadata-recovered') + '.json', { kind: 'actual04-targeted-Origin-owned-metadata-reconciled', projectId: pid, originalFailedLedger: failed, actualResponse: response, rawUpstream: a.raw, currentSnapshot: current.manifest, commit: a.commit,
    recoveredOnly: [{ table: 'project_ownership_origin', key: [pid], beforeSHA256: a.originBefore.sha256, afterSHA256: a.origin.sha256, actualXmin: a.origin.xmin }], previousRecordedRowsReowned: 0,
    oldLedgerRewritten: false, noBusinessHTTPOrPGWrite: true, oldCreatorSparePermanentlyConsumed: true, original04Passed: false, UIReadbackStillRequired: true, G3Certified: false, G4Certified: false });
  record.phase = 'verified'; record.receipt = receipt; delete ctx.state.blockedObservation; ctx.persist(); return receipt;
}
async function main() { assert.equal(process.platform, 'linux'); const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--plan' && args[2] === '--approved-plan-sha' && args[4] === '--execute'); const pin = { file: args[1], rawBytesSha256: args[3] }, plan = JSON.parse(readPin54(pin));
  assert.equal(plan.projectId, pid); assert.equal(plan.epoch, 'g2-business12'); assert.equal(plan.run, 'main01'); const lock = '/home/wangzishi/.local/share/poms-r4ghi/private/business/' + plan.epoch + '/' + plan.run + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, kind: 'exact-metadata-only-Origin28' }), { flag: 'wx', mode: 0o600 });
  try { const { createContext } = await import('./context.mjs'); const ctx = createContext({ epoch: plan.epoch, run: plan.run }); const result = await executeOriginRecovery28(ctx, pin); console.log(JSON.stringify({ kind: 'Origin-only-metadata-recovery-complete', result, original04Passed: false })); }
  finally { if (fs.existsSync(lock) && JSON.parse(fs.readFileSync(lock)).pid === process.pid) fs.unlinkSync(lock); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Exact Origin28 metadata recovery stopped; inspect private originals. No replay or inferred UI pass.'); process.exitCode = 1; });
