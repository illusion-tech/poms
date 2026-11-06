import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const priv = '/home/wangzishi/.local/share/poms-r4ghi/private/userfix/userfix115/run01';
const pub = `${win}/tmp/rust-r4ghi/userfix/userfix115/run01`;
const output = `${win}/tools/rust-r4ghi/independent/userfix-final`;
const db = 'poms_r4ghi_rust';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = file => { assert(file.startsWith(`${priv}/`)); assert.equal(fs.realpathSync(file), file); return fs.readFileSync(file); };
const load = name => JSON.parse(bytes(`${priv}/${name}`).toString('utf8'));
const publicJson = name => JSON.parse(fs.readFileSync(`${pub}/${name}`, 'utf8'));
const state = load('state.json');
const rowCache = new Map();
const rows = (snapshot, database, table) => {
  const pin = snapshot.databases[database].tables[table];
  if (!rowCache.has(pin.file)) {
    const b = bytes(pin.file); assert.equal(sha(b), pin.rawBytesSha256);
    const data = b.toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    data.forEach(row => assert.equal(sha(row.raw), row.sha256));
    rowCache.set(pin.file, data);
  }
  return rowCache.get(pin.file);
};
const differences = (before, after) => {
  const result = [];
  for (const database of Object.keys(before.databases)) for (const table of Object.keys(before.databases[database].tables)) {
    const a = new Map(rows(before, database, table).map(row => [JSON.stringify(row.key), row]));
    const b = new Map(rows(after, database, table).map(row => [JSON.stringify(row.key), row]));
    const added = [...b].filter(([key]) => !a.has(key)).map(([, row]) => row);
    const missing = [...a].filter(([key]) => !b.has(key)).map(([, row]) => row);
    const changed = [...b].filter(([key, row]) => a.has(key) && row.raw !== a.get(key).raw).map(([key, row]) => ({ before: a.get(key), after: row }));
    if (added.length || missing.length || changed.length) result.push({ database, table, added, missing, changed });
  }
  return result;
};
const httpReceipts = fs.readdirSync(pub).filter(name => /^\d+-http-http\.json$/.test(name)).map(name => publicJson(name));
const byRequest = new Map(httpReceipts.map(receipt => [receipt.requestId, receipt]));
const http = requestId => {
  const receipt = byRequest.get(requestId); assert(receipt?.responseComplete && !receipt.transportFailure);
  const config = JSON.parse(bytes(receipt.configuredRequestHeaders.file).toString('utf8'));
  const requestBytes = bytes(receipt.requestBody.file), responseBytes = bytes(receipt.responseBody.file);
  const stem = receipt.configuredRequestHeaders.file.slice(0, -'-request-config.json'.length);
  const headers = JSON.parse(bytes(`${stem}-response-headers.json`).toString('utf8'));
  assert.equal(headers.statusCode, receipt.status); assert.equal(config.requestId, requestId);
  assert.equal(config.headers['X-Request-Id'], requestId);
  return { receipt, config, requestBytes, responseBytes, body: requestBytes.length ? JSON.parse(requestBytes.toString('utf8')) : null, response: responseBytes.length ? JSON.parse(responseBytes.toString('utf8')) : null };
};
const finalBeforeCleanup = load('snapshot-00129-cleanup-plan01-cleanup-current.json');
const verifyCreated = attempt => {
  const userRows = rows(finalBeforeCleanup, db, 'platform_user').filter(row => JSON.parse(row.raw).username === attempt.body.username);
  assert.equal(userRows.length, 1);
  const user = JSON.parse(userRows[0].raw), id = user.id;
  assert.equal(attempt.response.id, id); assert.notEqual(id, '00000000-0000-0000-0000-000000000000');
  assert.equal(user.row_version, 1); assert.equal(attempt.response.rowVersion, 1);
  const expectedRoles = attempt.body.initialRoleIds.map(id => id.toLowerCase()).sort();
  const roleRows = rows(finalBeforeCleanup, db, 'user_role_assignment').map(row => JSON.parse(row.raw)).filter(row => row.user_id === id);
  assert.deepEqual(roleRows.map(row => row.role_id).sort(), expectedRoles); assert(roleRows.every(row => row.status === 'active'));
  const orgRows = rows(finalBeforeCleanup, db, 'user_org_membership').map(row => JSON.parse(row.raw)).filter(row => row.user_id === id);
  const expectedOrg = attempt.body.primaryOrgUnitId?.toLowerCase() ?? null;
  assert.equal(user.primary_org_unit_id, expectedOrg); assert.equal(attempt.response.primaryOrgUnitId, expectedOrg);
  assert.deepEqual(orgRows.map(row => ({ org: row.org_unit_id, type: row.membership_type, status: row.status })), expectedOrg ? [{ org: expectedOrg, type: 'primary', status: 'active' }] : []);
  assert.equal(rows(finalBeforeCleanup, db, 'local_credential').filter(row => JSON.parse(row.raw).user_id === id).length, 0);
  const audits = rows(finalBeforeCleanup, db, 'audit_log').map(row => JSON.parse(row.raw)).filter(row => row.event_type === 'platform.user.created' && row.target_id === id);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].after_snapshot.username, attempt.body.username);
  assert.equal(audits[0].after_snapshot.primaryOrgUnitId, expectedOrg);
  assert.deepEqual(audits[0].after_snapshot.initialRoleIds.slice().sort(), expectedRoles);
  return { associationCount: roleRows.length + orgRows.length, exactCreateAudit: true, noCredential: true };
};
const smoke = publicJson('00062-smoke-results.json'); assert.equal(smoke.caseCount, 19);
let successfulShapes = 0, denials = 0, detailConsumers = 0;
for (const test of smoke.results) {
  if (test.requestId) {
    const attempt = http(test.requestId); assert.equal(attempt.receipt.status, test.status);
    if (test.status === 201) {
      verifyCreated(attempt); successfulShapes++;
      const detail = httpReceipts.find(receipt => receipt.operationId === 'PlatformController_getUser' && JSON.parse(bytes(receipt.configuredRequestHeaders.file).toString('utf8')).url.endsWith(`/${attempt.response.id}`));
      assert(detail); const view = http(detail.requestId); assert.equal(view.receipt.status, 200);
      assert.equal(view.response.id, attempt.response.id);
      assert.equal(view.response.primaryOrgUnitId, attempt.body.primaryOrgUnitId?.toLowerCase() ?? null);
      const expectedNames = attempt.body.initialRoleIds.map(id => id.toLowerCase() === state.fixtures.roleA ? '#115 roleA' : '#115 roleB').sort();
      assert.deepEqual(view.response.roleNames.slice().sort(), expectedNames);
      assert.deepEqual(view.response.orgUnits.map(row => ({ id: row.id, type: row.membershipType })), attempt.body.primaryOrgUnitId ? [{ id: attempt.body.primaryOrgUnitId.toLowerCase(), type: 'primary' }] : []);
      detailConsumers++;
    } else {
      assert.equal(rows(finalBeforeCleanup, db, 'platform_user').filter(row => JSON.parse(row.raw).username === attempt.body.username).length, 0);
      assert.equal(rows(finalBeforeCleanup, db, 'audit_log').filter(row => JSON.parse(row.raw).after_snapshot?.username === attempt.body.username).length, 0); denials++;
    }
  } else {
    const pair = test.requestIds.map(http); assert.deepEqual(pair.map(attempt => attempt.receipt.status).sort((a, b) => a - b), [201, 409]);
    assert(pair[0].requestBytes.equals(pair[1].requestBytes)); verifyCreated(pair.find(attempt => attempt.receipt.status === 201));
  }
}
const faultResults = [];
for (const [label, count, pending] of [['00063-faults01', 9, false], ['00093-pending01', 2, true]]) for (let n = 1; n <= count; n++) {
  const stem = `${label}-${n}`, proof = load(`${stem}-FI-proof.json`), before = load(`snapshot-${stem}-failure-before.json`), after = load(`snapshot-${stem}-failure-after.json`);
  assert.equal(BigInt(proof.afterHits.hit) - BigInt(proof.beforeHits.hit), 1n);
  const failed = http(proof.failedRequestId), retry = http(proof.retryRequestId);
  assert.equal(failed.receipt.status, 500); assert.equal(retry.receipt.status, 201); assert(failed.requestBytes.equals(retry.requestBytes)); verifyCreated(retry);
  const delta = differences(before, after);
  let rawTouchCount = 0;
  for (const change of delta) {
    assert.equal(change.database, db); assert.equal(change.table, 'auth_session');
    assert.equal(change.added.length + change.missing.length, 0); assert.equal(change.changed.length, 1);
    for (const pair of change.changed) {
      assert.deepEqual(pair.after.key, [proof.sessionBefore.id]);
      const a = JSON.parse(pair.before.raw), b = JSON.parse(pair.after.raw);
      assert.equal(b.row_version, a.row_version + 1); assert(Date.parse(b.last_seen_at) > Date.parse(a.last_seen_at));
      const allowed = new Set(['last_seen_at', 'last_ip', 'idle_expires_at', 'row_version', 'updated_at']);
      assert(Object.keys(a).filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key])).every(key => allowed.has(key)));
      assert.equal(pair.before.raw, proof.sessionBefore.raw); assert.equal(pair.after.raw, proof.sessionAfter.raw); rawTouchCount++;
    }
  }
  if (pending) { assert.equal(rawTouchCount, 1); assert.equal(BigInt(proof.afterHits.raw) - BigInt(proof.beforeHits.raw), 1n); assert.equal(BigInt(proof.sessionAfter.version), BigInt(proof.sessionBefore.version) + 1n); }
  faultResults.push({ stage: pending ? 'pending' : 'faults', case: n, target: proof.target, sqlstate: proof.code, constraint: proof.constraint, actualFailureStatus: failed.receipt.status, actualRetryStatus: retry.receipt.status, hookHitCount: 1, businessAndManagedWritesRolledBack: true, separatePriorRawTouchCount: rawTouchCount });
}
const races = publicJson('00107-races01-races-results.json'); assert.equal(races.results.length, 4);
const raceResults = races.results.map((test, index) => {
  const stem = `00107-races01-race-${index + 1}`;
  const first = load(`${stem}-first-actual-lock-wait.json`).match, second = load(`${stem}-second-actual-lock-wait.json`).match;
  assert.equal(first.wait_event_type, 'Lock'); assert.equal(first.wait_event, 'advisory');
  assert.equal(second.wait_event_type, 'Lock'); assert.notEqual(second.wait_event, 'advisory');
  assert(JSON.parse(second.blockers).includes(Number(first.pid)));
  const create = http(test.createRequestId), deactivate = http(test.deactivateRequestId);
  assert.equal(create.receipt.status, test.order === 'create-first' ? 201 : 409); assert.equal(deactivate.receipt.status, 200);
  assert.equal(deactivate.config.method, 'POST'); assert(deactivate.receipt.operationId.includes('deactivate'));
  if (create.receipt.status === 201) verifyCreated(create);
  else assert.equal(rows(finalBeforeCleanup, db, 'platform_user').filter(row => JSON.parse(row.raw).username === create.body.username).length, 0);
  return { kind: test.kind, order: test.order, actualCreateStatus: create.receipt.status, actualDeactivateStatus: deactivate.receipt.status, actualDirectBlockerObserved: true };
});
const baseline = load('snapshot-baseline-00003-baseline-retry.json'), plan = load('00129-cleanup-plan01-cleanup-plan.json');
assert.equal(sha(bytes(`${priv}/00129-cleanup-plan01-cleanup-plan.json`)), '69c50b931b2dd3f0a3f959b7e186710087356d52653cc476bdfc41e82bc6a3ee');
assert.equal(plan.deleteRows.length, 121); assert.equal(plan.restoreRows.length, 0); assert.deepEqual(plan.blockers, []);
const baselineDelta = differences(baseline, finalBeforeCleanup);
assert(baselineDelta.every(change => change.database === db && change.changed.length === 0 && change.missing.length === 0));
const actualAdded = baselineDelta.flatMap(change => change.added.map(row => JSON.stringify([change.database, change.table, row.key, row.sha256]))).sort();
assert.deepEqual(actualAdded, plan.deleteRows.map(row => JSON.stringify([row.database, row.table, row.key, row.sha256])).sort());
let fkEdges = 0;
for (let n = 0; n < plan.deleteRows.length; n++) {
  const row = plan.deleteRows[n], object = JSON.parse(row.raw), ownership = state.owned[JSON.stringify([row.database, row.table, row.key])];
  assert(ownership); assert.equal(ownership.latestSha256, row.sha256); assert.equal(sha(row.raw), row.sha256);
  if (row.table === 'auth_session') {
    const actor = Object.values(state.actors).find(actor => actor.id === object.user_id && actor.cookies?.poms_session && sha(decodeURIComponent(actor.cookies.poms_session)) === object.token_hash);
    assert(actor); const login = http(actor.loginRequestId); assert.equal(login.receipt.operationId, 'AuthController_createPasswordAuthSession'); assert.equal(login.receipt.status, 200);
  }
  for (const fk of finalBeforeCleanup.databases[db].meta.foreignKeys.filter(fk => fk.child === row.table)) {
    if (fk.childColumns.some(column => row.cells[column] === null)) continue;
    const parent = plan.deleteRows.findIndex(candidate => candidate.table === fk.parent && fk.parentColumns.every((column, i) => candidate.cells[column] === row.cells[fk.childColumns[i]]));
    if (parent >= 0) { assert(n < parent); fkEdges++; }
  }
}
const noops = [];
for (const n of [1, 2]) {
  const name = `snapshot-00130-cleanup-apply01-postcommit-noop-${n}.json`, after = load(name);
  assert.deepEqual(differences(baseline, after), []);
  for (const database of Object.keys(baseline.databases)) assert.deepEqual(after.databases[database].meta, baseline.databases[database].meta);
  noops.push({ file: `${priv}/${name}`, rawBytesSha256: sha(bytes(`${priv}/${name}`)), all240TablesAndOriginalRowsMatch: true, normativeCatalogACLTriggersFunctionsSequencesMatch: true });
}
const helperChecks = ['00012-smoke02', '00063-faults01', '00093-pending01', '00107-races01', '00130-cleanup-apply01'].map(label => {
  const intent = load(`${label}-intent.json`);
  const productMatches = intent.sourcePins.every(pin => sha(fs.readFileSync(`${win}/${pin.file}`)) === pin.sha256);
  const helperMismatches = intent.helperPins.filter(pin => sha(fs.readFileSync(`${win}/${pin.file}`)) !== pin.sha256).map(pin => pin.file);
  assert(productMatches); assert.deepEqual(helperMismatches, []);
  return { label, productPins: intent.sourcePins.length, helperPins: intent.helperPins.length, productMatches, helperMismatches };
});
const result = { kind: 'independent-userfix-raw-acceptance-recomputation', capturedAt: new Date().toISOString(), smoke: { cases: smoke.caseCount, successfulShapes, deniedShapes: denials, actualDetailConsumers: detailConsumers, sameUsernameOne201One409SameBody: true }, faultResults, raceResults, cleanupPlan: { rawBytesSha256: '69c50b931b2dd3f0a3f959b7e186710087356d52653cc476bdfc41e82bc6a3ee', exactAddedRows: 121, restoreRows: 0, noUnownedOrOriginalRowChanges: true, actualRowFKEdges: fkEdges, sessionLoginCookieHashesBoundWithoutPublishingValues: true }, noops, helperChecks, originalToolFailuresRetained: fs.existsSync(`${priv}/00002-baseline-partial.json`) && fs.existsSync(`${priv}/00004-smoke01-partial.json`), rawAuthenticationTouchRollbackClaimed: false, businessOrSecretPayloadPublished: false, databaseConnectionsOpened: 0, productModified: false, finalG3Signed: false };
fs.writeFileSync(`${output}/acceptance-recomputed01.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ smoke: result.smoke, faultCases: faultResults.length, managedPendingCases: faultResults.filter(item => item.stage === 'pending').length, referenceLockRaces: raceResults.length, cleanup: result.cleanupPlan, noops: noops.length, helperChecks, originalToolFailuresRetained: result.originalToolFailuresRetained })}\n`);
