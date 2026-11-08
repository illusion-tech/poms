// Root-only optional race of two ordinary public commands. The only control SQL
// is a real owned Project row lock plus ROLLBACK. No participant DML/constraints.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { sha, keyOf, uuid, exactPath } from './pure.mjs';
import { readRows } from './snapshot.mjs';
import { exactRawTouch } from './fault-sweep.mjs';
import { blockedByControl } from './creator-proofs.mjs';
const create = 'CommissionController_createRoleAssignment', freeze = 'CommissionRoleAssignmentController_freezeRoleAssignment';
const failure = error => ({ name: error.name, code: error.code ?? null, message: error.message });
const waiting = row => row?.state === 'active' && row.wait_event_type === 'Lock';
export function revisionRequest23(original, assignmentId, rowVersion) {
  assert.equal(original.inputVersion, 'server-derived-v1'); assert.equal(original.expectedCurrentAssignmentId, null); assert.equal(original.expectedCurrentRowVersion, null);
  assert(Array.isArray(original.participants) && original.participants.length > 0); uuid(assignmentId); assert(Number.isInteger(rowVersion) && rowVersion > 0);
  return { inputVersion: original.inputVersion, expectedCurrentAssignmentId: assignmentId, expectedCurrentRowVersion: rowVersion, participants: structuredClone(original.participants) };
}
export function freezeWaiter23(graph, controlPid, appUser) {
  const values = graph.filter(row => row.usename === appUser && waiting(row) && blockedByControl(row.pid, graph, controlPid));
  assert.equal(values.length, 1, 'One actual freeze waiter must be observed before sending revision'); return values[0];
}
export function secondWaiter23(graph, controlPid, freezePid, appUser) {
  const values = graph.filter(row => row.usename === appUser && row.pid !== freezePid && waiting(row) && blockedByControl(row.pid, graph, controlPid) && blockedByControl(row.pid, graph, freezePid));
  assert.equal(values.length, 1, 'Peer public command must really queue behind freeze'); return values[0];
}
export function assertPublicOutcome23(winner, peer) {
  assert.equal(winner.operationId, freeze); assert.equal(winner.status, 200); assert.equal(winner.expectedStatus, 200); assert.equal(winner.responseComplete, true); assert.equal(winner.transportFailure, false);
  assert(peer && peer.operationId === create); assert.equal(peer.status, 409); assert.equal(peer.responseComplete, true); assert.equal(peer.transportFailure, false);
  const error = peer.body?.data ?? peer.body; assert.equal(error.code, 'commission_frozen_change_requires_dispute');
}
export function exactSessionTouches23(authBefore, authAfter, winnerSessionId, peerSessionId, actorId) {
  assert.equal(authAfter.length, authBefore.length); const peerTouches = [];
  for (const row of authAfter) {
    const old = authBefore.find(item => item.key[0] === row.key[0]); assert(old); if (old.sha256 === row.sha256 && old.xmin === row.xmin) continue;
    assert([winnerSessionId, peerSessionId].includes(row.key[0])); assert(exactRawTouch(old, row, row.key[0], actorId), 'Only the exact raw session touch may accompany these ordinary commands');
    if (row.key[0] === peerSessionId) peerTouches.push({ old, row });
  }
  return peerTouches;
}
async function peerRequest23(ctx, api, peerKey, projectId, body, before) {
  const operation = api.operations.get(create); assert.equal(operation.method, 'POST'); assert.equal(api.success(create), 200);
  const actor = ctx.state.actors[peerKey], label = ctx.next('ui-role-public-peer23'), requestId = `${ctx.state.prefix}-${label}-${randomUUID().slice(0, 8)}`;
  const url = new URL(ctx.api + exactPath(operation.template, { projectId })), payload = Buffer.from(JSON.stringify(body)); assert.equal(url.origin, ctx.api);
  const headers = { Origin: ctx.origin, 'Content-Type': 'application/json', 'Content-Length': payload.length, 'Accept-Encoding': 'identity', 'X-Request-Id': requestId,
    Cookie: Object.entries(actor.cookies).map(([key, value]) => `${key}=${value}`).join('; '), 'X-CSRF-Token': decodeURIComponent(actor.cookies.poms_csrf) };
  const request = ctx.artifact(`${label}-request.json`, { operationId: create, requestId, actorKey: peerKey, actorId: actor.id, projectId, url: url.href, headers, before: before.manifest });
  const requestBody = ctx.artifact(`${label}-request-body.bin`, payload); let response = null, transportError = null; const chunks = [];
  try {
    response = await new Promise((resolve, reject) => {
      const outgoing = http.request(url, { method: 'POST', headers, timeout: 45000 }, incoming => {
        incoming.on('data', bytes => chunks.push(Buffer.from(bytes))); incoming.once('aborted', () => reject(new Error('Peer public response aborted'))); incoming.once('error', reject);
        incoming.once('end', () => resolve({ status: incoming.statusCode, complete: incoming.complete, headers: incoming.headers }));
      }); outgoing.once('error', reject); outgoing.once('timeout', () => outgoing.destroy(new Error('Peer public response deadline'))); outgoing.end(payload);
    });
  } catch (error) { transportError = failure(error); }
  const bytes = Buffer.concat(chunks), responseBody = ctx.artifact(`${label}-response-body.bin`, bytes); let parsed = null; try { parsed = JSON.parse(bytes); } catch { /* Preserve raw bytes; never infer a result. */ }
  const responseHeaders = ctx.artifact(`${label}-response-headers.json`, { status: response?.status ?? null, headers: response?.headers ?? {} });
  const attempt = { operationId: create, requestId, actorKey: peerKey, actorId: actor.id, pathParams: { projectId }, requestValue: body, body: parsed,
    status: response?.status ?? null, expectedStatus: 409, responseComplete: response?.complete === true, transportFailure: Boolean(transportError), transportError, originals: { request, requestBody, responseBody, responseHeaders } };
  const original = ctx.artifact(`${label}-whole-attempt.json`, attempt); ctx.persist(); return { ...attempt, original };
}
export async function beginPublicRoleRace23(ctx, api, { scene, action, before, freezeInput, requestId, successfulCreate, boundActorKeys }) {
  assert.equal(process.platform, 'linux'); assert.equal(JSON.parse(fs.readFileSync(`${ctx.priv}/driver.lock`)).pid, process.pid);
  assert(!ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleaned && !ctx.state.cleanupPlan);
  const config = action.publicRevisedDraftRace; assert(config && config.expectedVerdict === 'freeze200-peer-revised409');
  const peerKey = config.actorKey, actorKey = action.actorKey, actor = ctx.state.actors[actorKey], peer = ctx.state.actors[peerKey];
  assert(boundActorKeys.includes(actorKey) && boundActorKeys.includes(peerKey)); assert.notEqual(peerKey, actorKey); assert.equal(peer.id, actor.id); assert.equal(peer.roleId, actor.roleId); assert.equal(peer.orgId, actor.orgId); assert.deepEqual([...peer.permissions].sort(), [...actor.permissions].sort());
  assert(peer.cookies.poms_session && actor.cookies.poms_session); assert.notEqual(peer.cookies.poms_session, actor.cookies.poms_session, 'Two actual active owner sessions are required');
  const projectId = uuid(scene.projectId), assignmentId = uuid(successfulCreate.attempt.body.id); assert.equal(successfulCreate.attempt.operationId, create); assert.equal(successfulCreate.attempt.status, 200); assert.equal(successfulCreate.attempt.responseComplete, true); assert.equal(successfulCreate.attempt.transportFailure, false);
  assert.equal(successfulCreate.attempt.actorId, actor.id); assert.equal(successfulCreate.attempt.pathParams.projectId, projectId);
  const rows = (snapshot, table) => readRows(snapshot.databases[ctx.database].tables[table]);
  const ownedRow = (table, id) => { const row = rows(before, table).find(item => item.key[0] === id), owned = ctx.state.owned[keyOf(ctx.database, table, [id])]; assert(row && owned && !owned.deleted && owned.latestSha256 === row.sha256 && owned.latestXmin === row.xmin); return row; };
  const projectBefore = ownedRow('project', projectId), assignmentBefore = ownedRow('commission_role_assignment', assignmentId), draft = JSON.parse(assignmentBefore.raw);
  assert.equal(draft.project_id, projectId); assert.equal(draft.status, 'draft'); assert.equal(draft.is_current, true); assert.equal(draft.row_version, freezeInput.expectedVersion);
  const sessionId = candidate => { const token = sha(decodeURIComponent(candidate.cookies.poms_session)), matches = rows(before, 'auth_session').filter(row => { const value = JSON.parse(row.raw); return value.user_id === candidate.id && value.token_hash === token && value.status === 'active'; }); assert.equal(matches.length, 1); ownedRow('auth_session', matches[0].key[0]); return matches[0].key[0]; };
  const winnerSessionId = sessionId(actor), peerSessionId = sessionId(peer); assert.notEqual(winnerSessionId, peerSessionId);
  const body = revisionRequest23(successfulCreate.attempt.requestValue, assignmentId, draft.row_version);
  ctx.state.consumerChecks ??= {}; ctx.state.consumerChecks.publicRoleRace23 ??= {}; const store = ctx.state.consumerChecks.publicRoleRace23; assert(!store[assignmentId], 'Reconcile an existing attempt; no blind replay');
  const record = store[assignmentId] = { phase: 'control-starting', projectId, assignmentId, requestId, actorKey, peerKey, winnerSessionId, peerSessionId, originalUICreate: successfulCreate.originals, before: before.manifest, peerBodySHA256: sha(JSON.stringify(body)), controlBusinessDML: false, stoppedSQLWindowTaskResumed: false }; ctx.persist();
  let control, peerTask = null, responseReceived = false;
  const observed = { controlPid: null, freezePid: null, peerPid: null, firstWaiter: null, secondWaiter: null, controlRollback: false, controlClosed: false, schedulingFailure: null, peer: null };
  const release = async () => { if (!control) return; try { await control.query('ROLLBACK'); observed.controlRollback = true; } catch (error) { observed.schedulingFailure ??= failure(error); } try { await control.end(); observed.controlClosed = true; } catch (error) { observed.schedulingFailure ??= failure(error); } control = null; };
  try {
    control = await ctx.client(); await control.query('BEGIN'); observed.controlPid = (await control.query('SELECT pg_backend_pid()::int pid')).rows[0].pid;
    const locked = (await control.query('SELECT row_to_json(p)::text raw,p.xmin::text xmin FROM poms.project p WHERE id=$1::uuid FOR UPDATE', [projectId])).rows;
    assert.equal(locked.length, 1); assert.equal(sha(locked[0].raw), projectBefore.sha256); assert.equal(locked[0].xmin, projectBefore.xmin);
  } catch (error) { observed.schedulingFailure = failure(error); await release(); record.phase = 'failed-before-UI-forward'; record.failure = ctx.artifact(`${ctx.next('role-public23-before-forward')}.json`, observed); ctx.state.blockedObservation = record.failure; ctx.persist(); throw error; }
  const graph = async () => ctx.db(async client => (await client.query('SELECT pid::int,usename,state,wait_event_type,pg_blocking_pids(pid) AS blocked_by FROM pg_stat_activity WHERE datname=current_database() ORDER BY pid')).rows);
  const wait = async (select, label) => { const deadline = Date.now() + 3000; while (!responseReceived && Date.now() < deadline) { const value = await graph(); try { return { graph: value, row: select(value) }; } catch { /* Only the exact actual wait graph can pass. */ } await delay(50); } throw new Error(`Actual public ${label} wait order not observed`); };
  const settled = (async () => {
    try {
      const first = await wait(value => freezeWaiter23(value, observed.controlPid, ctx.apps[1]), 'freeze-first'); observed.freezePid = first.row.pid; observed.firstWaiter = ctx.artifact(`${ctx.next('role-public23-first')}.json`, first);
      peerTask = peerRequest23(ctx, api, peerKey, projectId, body, before).then(value => ({ value }), error => ({ error: failure(error) }));
      const second = await wait(value => secondWaiter23(value, observed.controlPid, observed.freezePid, ctx.apps[1]), 'peer-second'); observed.peerPid = second.row.pid; observed.secondWaiter = ctx.artifact(`${ctx.next('role-public23-second')}.json`, second);
    } catch (error) { observed.schedulingFailure = failure(error); }
    finally { await release(); if (peerTask) { const result = await peerTask; if (result.error) observed.schedulingFailure ??= result.error; else observed.peer = result.value; } }
    record.phase = 'both-public-requests-settled-awaiting-ledger'; record.observation = ctx.artifact(`${ctx.next('role-public23-observation')}.json`, observed); ctx.persist(); return observed;
  })().catch(async error => { observed.schedulingFailure ??= failure(error); await release(); return observed; });
  return {
    async settleBeforeCapture() { responseReceived = true; return settled; },
    async verifyAfterLedger({ attempt, originals, ledger, after }) {
      const value = await settled;
      try {
        assert.equal(value.schedulingFailure, null); assert(value.firstWaiter && value.secondWaiter); assert.equal(value.controlRollback, true); assert.equal(value.controlClosed, true); assertPublicOutcome23(attempt, value.peer);
        assert.equal(attempt.requestId, requestId); assert.equal(attempt.pathParams.id, assignmentId);
        const peerTouches = exactSessionTouches23(rows(before, 'auth_session'), rows(after, 'auth_session'), winnerSessionId, peerSessionId, actor.id);
        for (const table of ['audit_log', 'security_event']) assert(!rows(after, table).some(row => JSON.parse(row.raw).request_id === value.peer.requestId), 'Failed revised-create left audit/security business effects');
        assert.deepEqual(rows(after, 'commission_role_assignment_participant'), rows(before, 'commission_role_assignment_participant'));
        const beforeIds = new Set(rows(before, 'commission_role_assignment').map(row => row.key[0])); assert(rows(after, 'commission_role_assignment').every(row => beforeIds.has(row.key[0])), 'Peer rejection must not leave a new draft');
        const parent = rows(after, 'commission_role_assignment').find(row => row.key[0] === assignmentId), cell = JSON.parse(parent.raw); assert.equal(cell.status, 'frozen'); assert.equal(cell.is_current, true); assert.equal(cell.row_version, draft.row_version + 1);
        const payload = rows(after, 'commission_role_assignment_freeze_payload').find(row => row.key[0] === assignmentId); assert(payload); const fixed = JSON.parse(payload.raw), resultBody = attempt.body?.data ?? attempt.body;
        assert.equal(fixed.project_id, projectId); assert.equal(fixed.source_payload_hash, resultBody.sourcePayloadHash); assert.equal(fixed.freeze_summary_snapshot_id, resultBody.summarySnapshotId); assert.equal(payload.xmin, parent.xmin);
        const audits = rows(after, 'audit_log').filter(row => { const value = JSON.parse(row.raw); return value.request_id === requestId && value.event_type === freeze; }); assert.equal(audits.length, 1); assert.equal(audits[0].xmin, parent.xmin); assert.equal(JSON.parse(audits[0].raw).operator_id, actor.id);
        const projectAfter = rows(after, 'project').find(row => row.key[0] === projectId); assert.equal(projectAfter.sha256, projectBefore.sha256); assert.equal(projectAfter.xmin, projectBefore.xmin);
        // The common winner ledger is immutable. Append a more precise peer
        // attribution only for actually observed, strictly matched raw touches.
        const attributed = [];
        for (const touch of peerTouches) {
          const own = ctx.state.owned[keyOf(ctx.database, 'auth_session', touch.row.key)]; assert.equal(own.latestSha256, touch.row.sha256); assert.equal(own.latestXmin, touch.row.xmin);
          ctx.own(ctx.database, 'auth_session', touch.row, { kind: 'exact-peer-raw-auth-touch-during-public-role-race23', requestId: value.peer.requestId, operationId: create, status: 409,
            beforeSha256: touch.old.sha256, beforeXmin: touch.old.xmin, beforeSnapshot: before.manifest, afterSnapshot: after.manifest, priorCombinedWinnerLedger: ledger, peerOriginal: value.peer.original });
          attributed.push({ id: touch.row.key[0], beforeSHA256: touch.old.sha256, afterSHA256: touch.row.sha256, beforeXmin: touch.old.xmin, afterXmin: touch.row.xmin, actualPeerRequestId: value.peer.requestId });
        }
        record.phase = 'verified'; record.proof = ctx.artifact(`${ctx.next('role-public23-proof')}.json`, { kind: 'actual-UI-freeze200-vs-ordinary-peer-revised-create409', projectId, assignmentId, observation: record.observation,
          UIOriginals: originals, winnerLedger: ledger, peerOriginal: value.peer.original, before: before.manifest, after: after.manifest, exactPeerRawAuthTouchAttributions: attributed,
          actualWinnerSharedXmin: parent.xmin, peerBusinessBirths: 0, participantDML: false, constraintsProbe: false, controlCommit: false, originalUIFreezePreserved: true, G3Certified: false, G4Certified: false }); ctx.persist(); return record.proof;
      } catch (error) { record.phase = 'proof-failed-after-complete-common-observation'; record.failure = ctx.artifact(`${ctx.next('role-public23-partial')}.json`, { observation: record.observation ?? null, observed: value, before: before.manifest, after: after.manifest, originals, ledger, message: error.message, preserveAnyCommittedWinner: true, noAutomaticReplay: true }); ctx.state.blockedObservation = record.failure; ctx.persist(); throw error; }
    },
  };
}
