// Only a row lock controls scheduling. Business project/origin/history facts use HTTP.
import http from 'node:http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { data, exactPath, sha, uuid } from './pure.mjs';
import { capture, readRows } from './snapshot.mjs';
import { assertRecorded, reconcileAttempt } from './ledger.mjs';
import { assertConsumedOnce, blockedByControl, assertOwnershipRowsIsolated } from './creator-proofs.mjs';

const operationId = 'ProjectController_reassignOwner';
async function rawAttempt(ctx, api, before, projectId, body, actorKey, index) {
  const operation = api.operations.get(operationId); assert.equal(operation.method, 'POST');
  const actor = ctx.state.actors[actorKey], params = { id: uuid(projectId) }, label = ctx.next(`owner-race-${index}`);
  assert(actor.cookies.poms_session && actor.cookies.poms_csrf);
  const requestId = `${ctx.state.prefix}-${label}-${randomUUID().slice(0, 8)}`;
  const url = new URL(ctx.api + exactPath(operation.template, params)); assert.equal(url.origin, ctx.api);
  const payload = Buffer.from(JSON.stringify(body)), headers = { Origin: ctx.origin, 'X-Request-Id': requestId, 'Accept-Encoding': 'identity',
    'Content-Type': 'application/json', 'Content-Length': payload.length, Cookie: Object.entries(actor.cookies).map(([key, value]) => `${key}=${value}`).join('; '), 'X-CSRF-Token': decodeURIComponent(actor.cookies.poms_csrf) };
  const originals = { requestConfig: ctx.artifact(`${label}-request.json`, { operationId, requestId, actorKey, actorId: actor.id, method: operation.method, url: url.href, headers, pathParams: params, before: before.manifest }),
    requestBody: ctx.artifact(`${label}-body.bin`, payload) }; ctx.persist();
  const chunks = []; let result = null, failure = null;
  try {
    result = await new Promise((resolve, reject) => {
      const request = http.request(url, { method: 'POST', headers, timeout: 45000 }, response => {
        originals.responseHeaders = ctx.artifact(`${label}-response-headers.json`, { status: response.statusCode, rawHeaders: response.rawHeaders });
        for (const cookie of response.headers['set-cookie'] ?? []) { const part = cookie.split(';', 1)[0], at = part.indexOf('='); if (at < 1) continue; const key = part.slice(0, at); if (/max-age=0/i.test(cookie)) delete actor.cookies[key]; else actor.cookies[key] = part.slice(at + 1); }
        response.on('data', bytes => chunks.push(Buffer.from(bytes))); response.once('aborted', () => reject(new Error('Race response aborted'))); response.once('error', reject);
        response.once('end', () => resolve({ status: response.statusCode, complete: response.complete }));
      });
      request.once('error', reject); request.once('timeout', () => request.destroy(new Error('Race request timeout'))); request.end(payload);
    });
  } catch (error) { failure = { name: error.name, message: error.message }; originals.failure = ctx.artifact(`${label}-transport-failure.json`, failure); }
  const bytes = Buffer.concat(chunks); originals.responseBody = ctx.artifact(`${label}-response.bin`, bytes); let parsed = null;
  try { parsed = JSON.parse(bytes); } catch { /* Exact bytes remain authoritative. */ }
  const attempt = { operationId, requestId, actorKey, actorId: actor.id, pathParams: params, requestValue: body, requestBodySha256: sha(payload), body: parsed,
    status: result?.status ?? null, responseComplete: result?.complete === true, transportFailure: Boolean(failure), expectedStatus: result?.status ?? null, before: before.manifest };
  const publicFile = `${label}-http.json`; ctx.public(publicFile, { kind: 'actual-controlled-owner-CAS-HTTP-attempt', operationId, requestId, actorKey, canonicalTemplate: operation.template,
    status: attempt.status, responseComplete: attempt.responseComplete, transportFailure: attempt.transportFailure, originals, originalBytesPrivate: true, businessFixtureSQL: false }); ctx.persist();
  return { ...attempt, receiptId: `${ctx.out}/${publicFile}` };
}
export async function raceFirstAssignment(ctx, api, projectId, anchor) {
  assert.equal(process.platform, 'linux'); assert.equal(api.success(operationId), 200, 'Root safety29 canonical reassign status is200');
  assert.equal(anchor.projectId, projectId); assert.equal(anchor.projectRowVersion, 1); assert.equal(anchor.ownershipOriginRowVersion, 1); assert.equal(anchor.scopeKind, 'creator-first-assignment-only');
  const f = ctx.state.fixtures, manager = ctx.state.actors.manager;
  const actorKeys = ['creatorRaceA', 'creatorRaceB'];
  for (const key of actorKeys) {
    ctx.state.actors[key] ??= { key, id: manager.id, username: manager.username, password: manager.password, cookies: {}, permissions: [], roleId: manager.roleId, orgId: manager.orgId };
    assert.equal(ctx.state.actors[key].id, manager.id); await api.login(key);
  }
  assert.notEqual(ctx.state.actors.creatorRaceA.cookies.poms_session, ctx.state.actors.creatorRaceB.cookies.poms_session, 'Independent real sessions prevent unrelated auth-session CAS from masquerading as project CAS');
  const before = await capture(ctx, ctx.next('creator-race-before')); assertRecorded(ctx, before);
  const find = (table, id) => readRows(before.databases[ctx.database].tables[table]).find(row => row.key[0] === id);
  const project = find('project', projectId), origin = find('project_ownership_origin', projectId); assert(project && origin);
  const p = JSON.parse(project.raw), o = JSON.parse(origin.raw);
  assert.equal(p.owner_user_id, null); assert.equal(p.row_version, 1); assert.equal(p.created_by, manager.id); assert.equal(o.bootstrap_state, 'available'); assert.equal(o.initial_kind, 'org-owned');
  assert.equal(o.source_type, 'direct-create'); assert.equal(o.source_record_id, projectId); assert.equal(o.creator_user_id, manager.id);
  assert.equal(readRows(before.databases[ctx.database].tables.project_owner_reassignment_record).filter(row => JSON.parse(row.raw).project_id === projectId).length, 0);
  const targets = ['execution', 'finance'].map(key => ctx.state.actors[key].id);
  const bodies = targets.map((ownerUserId, index) => ({ ownerUserId, ownerOrgId: f.org.id, expectedVersion: 1, reason: `真实同creator两会话首派竞争${index + 1}，服务器只能消耗一次来源。` }));
  const state = f.creatorOwnership23; assert(state && !state.raceAttempt, 'Never replay a started first-assignment race');
  state.raceAttempt = { projectId, before: before.manifest, phase: 'scheduled-control-pending' }; ctx.persist();
  const control = await ctx.client(); let released = false, pending = [], observedWaiters = [], controlPid, schedulingFailure = null;
  try {
    await control.query('BEGIN'); controlPid = (await control.query('SELECT pg_backend_pid()::int AS pid')).rows[0].pid;
    assert.equal((await control.query('SELECT id FROM poms.project WHERE id=$1::uuid FOR UPDATE', [projectId])).rows.length, 1);
    state.raceAttempt.phase = 'requests-starting'; state.raceAttempt.controlPid = controlPid; ctx.persist();
    let settled = 0; pending = bodies.map((body, index) => rawAttempt(ctx, api, before, projectId, body, actorKeys[index], index + 1)
      .then(result => ({ result }), error => ({ failure: { name: error.name, message: error.message, stack: error.stack } })).finally(() => { settled += 1; }));
    for (let round = 0; round < 100; round += 1) {
      const graph = await ctx.db(async c => (await c.query('SELECT pid::int,usename,state,wait_event_type,pg_blocking_pids(pid) AS blocked_by FROM pg_stat_activity WHERE datname=current_database()')).rows);
      observedWaiters = graph.filter(row => row.usename === ctx.apps[1] && row.state === 'active' && row.wait_event_type === 'Lock' && blockedByControl(row.pid, graph, controlPid));
      if (observedWaiters.length >= 2 || settled === 2) break; await delay(100);
    }
    // ROLLBACK releases this read-only row control. It creates no business data.
    await control.query('ROLLBACK'); released = true;
  } catch (error) { schedulingFailure = { name: error.name, message: error.message, stack: error.stack }; }
  finally {
    try { if (!released) await control.query('ROLLBACK'); }
    catch (error) { schedulingFailure ??= { name: error.name, message: error.message, stack: error.stack }; }
    finally { try { await control.end(); } catch (error) { schedulingFailure ??= { name: error.name, message: error.message, stack: error.stack }; } }
  }
  // Even an observer failure must settle both real requests before the after
  // snapshot; an exception never licenses replay or an inferred rollback.
  const settled = await Promise.all(pending), attempts = settled.flatMap(item => item.result ? [item.result] : []);
  const attemptFailures = settled.flatMap(item => item.failure ? [item.failure] : []);
  const after = await capture(ctx, ctx.next('creator-race-after'));
  state.raceAttempt.phase = 'responses-observed-proof-pending'; state.raceAttempt.after = after.manifest; ctx.persist();
  const acceptable = !schedulingFailure && !attemptFailures.length && attempts.length === 2 && observedWaiters.length === 2 && attempts.every(a => a.responseComplete && !a.transportFailure) && JSON.stringify(attempts.map(a => a.status).sort()) === JSON.stringify([200, 409]);
  const observation = ctx.artifact(`${ctx.next('creator-race-observed')}.json`, { before: before.manifest, after: after.manifest, projectId, controlPid,
    actualLockWaiters: observedWaiters, actualRequests: attempts, attemptFailures, schedulingFailure, expectedStatuses: [200, 409], properControlledRace: acceptable,
    schedulingSQLOnly: true, businessProjectOriginOrHistorySQLFixture: false }, { kind: 'actual-two-session-creator-first-assignment-CAS-observation', actualLockWaiters: observedWaiters.length,
    statuses: attempts.map(a => a.status), transportComplete: attempts.every(a => a.responseComplete && !a.transportFailure), businessFixtureSQL: false });
  state.raceAttempt.observation = observation; ctx.persist();
  if (!acceptable) { ctx.state.blockedObservation = observation; ctx.persist(); throw new Error('Race incomplete/unexpected: Root reconciles exact before/after and both originals; no replay or inferred rollback'); }
  const winner = attempts.find(a => a.status === 200), loser = attempts.find(a => a.status === 409); winner.expectedStatus = 200;
  const ledger = await reconcileAttempt(ctx, before, after, winner, { responseBirths: [{ table: 'project_owner_reassignment_record', pointer: '/projectOwnerReassignmentRecordId' }],
    mutableTables: ['project', 'project_ownership_origin'], updatedAnchors: [{ table: 'project', id: projectId, requestBinding: 'path:id' }] });
  const projectAfter = readRows(after.databases[ctx.database].tables.project).find(row => row.key[0] === projectId), originAfter = readRows(after.databases[ctx.database].tables.project_ownership_origin).find(row => row.key[0] === projectId);
  const history = readRows(after.databases[ctx.database].tables.project_owner_reassignment_record).filter(row => JSON.parse(row.raw).project_id === projectId);
  const ownership = snapshot => Object.fromEntries(['project', 'project_ownership_origin', 'project_owner_reassignment_record'].map(table => [table, readRows(snapshot.databases[ctx.database].tables[table])]));
  assertOwnershipRowsIsolated(ownership(before), ownership(after), projectId);
  assertConsumedOnce(JSON.parse(originAfter.raw), history.map(row => JSON.parse(row.raw)), winner.requestValue.ownerUserId, manager.id, f.org.id);
  assert.equal(JSON.parse(projectAfter.raw).row_version, 2); assert.equal(JSON.parse(projectAfter.raw).owner_user_id, winner.requestValue.ownerUserId);
  assert.equal(history[0].key[0], data(winner).projectOwnerReassignmentRecordId);
  const audits = readRows(after.databases[ctx.database].tables.audit_log).filter(row => JSON.parse(row.raw).event_type === operationId && [winner.requestId, loser.requestId].includes(JSON.parse(row.raw).request_id));
  assert.equal(audits.length, 1); assert.equal(JSON.parse(audits[0].raw).request_id, winner.requestId);
  for (const row of [originAfter, ...history, ...audits]) assert.equal(row.xmin, projectAfter.xmin, 'Project/origin/history/necessary audit must commit in one actual winning TX');
  const proof = ctx.artifact(`${ctx.next('creator-race-verified')}.json`, { observation, ledger, projectId, winner: winner.receiptId, loser: loser.receiptId,
    actualCommonXmin: projectAfter.xmin, oneProjectVersionIncrement: true, oneOriginConsumption: true, oneReassignmentRow: true, oneWinningAudit: true,
    twoRealSessionsOneCreator: true, actualTwoWaitersBeforeRelease: true, businessFactsAllHTTP: true }, { kind: 'actual-creator-first-assignment-double-CAS-verified', statuses: [200, 409], actualWaiters: 2, successfulFirstAssignments: 1 });
  state.raceAttempt.phase = 'verified'; state.raceAttempt.proof = proof; ctx.persist(); return proof;
}
