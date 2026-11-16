import http from 'node:http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { data, sha, exactPath } from './pure.mjs';
import { capture, readRows } from './snapshot.mjs';
import { assertRecorded, reconcileAttempt } from './ledger.mjs';
import { blockedByControl } from './creator-proofs.mjs';
export const closeOperation57 = 'ProjectCompletionRecordController_closeCompletionCondition';

async function attempt57(ctx, api, before, input, label) {
  const operation = api.operations.get(closeOperation57); assert.equal(operation.method, 'POST');
  const actor = ctx.state.actors[input.actor], requestId = `${ctx.state.prefix}-${label}-${randomUUID().slice(0, 8)}`;
  const url = new URL(ctx.api + exactPath(operation.template, input.params)), payload = Buffer.from(JSON.stringify(input.body)); assert.equal(url.origin, ctx.api);
  const headers = { Origin: ctx.origin, 'X-Request-Id': requestId, 'Accept-Encoding': 'identity', 'Content-Type': 'application/json', 'Content-Length': payload.length,
    Cookie: Object.entries(actor.cookies).map(([key, value]) => `${key}=${value}`).join('; '), 'X-CSRF-Token': decodeURIComponent(actor.cookies.poms_csrf) };
  const originals = { request: ctx.artifact(`${label}-request.json`, { operationId: closeOperation57, actorKey: input.actor, actorId: actor.id, requestId, url: url.href, headers, params: input.params, before: before.manifest }),
    requestBody: ctx.artifact(`${label}-body.bin`, payload) }; ctx.persist();
  const chunks = []; let response = null, failure = null;
  try {
    response = await new Promise((resolve, reject) => {
      const request = http.request(url, { method: 'POST', headers, timeout: 45000 }, result => {
        originals.responseHeaders = ctx.artifact(`${label}-response-headers.json`, { status: result.statusCode, rawHeaders: result.rawHeaders });
        for (const cookie of result.headers['set-cookie'] ?? []) { const part = cookie.split(';', 1)[0], at = part.indexOf('='); if (at > 0) actor.cookies[part.slice(0, at)] = part.slice(at + 1); }
        result.on('data', bytes => chunks.push(Buffer.from(bytes))); result.once('aborted', () => reject(new Error('race response aborted'))); result.once('error', reject);
        result.once('end', () => resolve({ status: result.statusCode, complete: result.complete }));
      }); request.once('error', reject); request.once('timeout', () => request.destroy(new Error('race timeout'))); request.end(payload);
    });
  } catch (error) { failure = { name: error.name, message: error.message }; }
  const bytes = Buffer.concat(chunks); originals.responseBody = ctx.artifact(`${label}-response.bin`, bytes); let body = null; try { body = JSON.parse(bytes); } catch { /* Exact bytes retained. */ }
  const value = { operationId: closeOperation57, requestId, actorKey: input.actor, actorId: actor.id, pathParams: input.params, requestValue: input.body, requestBodySha256: sha(payload),
    body, status: response?.status ?? null, responseComplete: response?.complete === true, transportFailure: Boolean(failure), originals, failure };
  const receiptId = `${ctx.out}/${label}-http.json`; ctx.public(`${label}-http.json`, { kind: 'actual-A07-concurrent-close-HTTP', operationId: closeOperation57, requestId,
    status: value.status, responseComplete: value.responseComplete, transportFailure: value.transportFailure, originals, originalBodyAndCredentialsPrivate: true }); ctx.persist(); return { ...value, receiptId };
}
export async function concurrentClose57(ctx, api, record, inputs, projectId, parentId) {
  assert.equal(process.platform, 'linux'); assert.equal(inputs.length, 2); assert(!record.raceAttempt, 'A started race must be reconciled, never blindly replayed');
  const before = await capture(ctx, ctx.next('a07-race-before')); assertRecorded(ctx, before);
  record.raceAttempt = { phase: 'control-pending', before: before.manifest, inputs: inputs.map(input => ({ actor: input.actor, params: input.params, bodySHA256: sha(JSON.stringify(input.body)) })) }; ctx.persist();
  const control = await ctx.client(); let released = false, pending = [], waiters = [], controlPid = null, schedulingFailure = null;
  try {
    await control.query('BEGIN'); controlPid = (await control.query('SELECT pg_backend_pid()::int AS pid')).rows[0].pid;
    assert.equal((await control.query('SELECT id FROM poms.project_completion_record WHERE id=$1::uuid AND project_id=$2::uuid FOR UPDATE', [parentId, projectId])).rows.length, 1);
    let settled = 0; pending = inputs.map(input => attempt57(ctx, api, before, input, ctx.next('a07-race-http')).then(value => ({ value }), error => ({ failure: { name: error.name, message: error.message } })).finally(() => { settled += 1; }));
    for (let i = 0; i < 100; i += 1) {
      const graph = await ctx.db(async c => (await c.query('SELECT pid::int,usename,state,wait_event_type,pg_blocking_pids(pid) AS blocked_by FROM pg_stat_activity WHERE datname=current_database()')).rows);
      waiters = graph.filter(row => row.usename === ctx.apps[1] && row.state === 'active' && row.wait_event_type === 'Lock' && blockedByControl(row.pid, graph, controlPid));
      if (waiters.length >= 2 || settled === 2) break; await delay(100);
    }
    await control.query('ROLLBACK'); released = true;
  } catch (error) { schedulingFailure = { name: error.name, message: error.message }; }
  finally { try { if (!released) await control.query('ROLLBACK'); } catch (error) { schedulingFailure ??= { name: error.name, message: error.message }; } finally { try { await control.end(); } catch (error) { schedulingFailure ??= { name: error.name, message: error.message }; } } }
  const settled = await Promise.all(pending), attempts = settled.flatMap(item => item.value ? [item.value] : []), failures = settled.flatMap(item => item.failure ? [item.failure] : []);
  const after = await capture(ctx, ctx.next('a07-race-after')); record.raceAttempt.after = after.manifest; record.raceAttempt.phase = 'responses-proof-pending'; ctx.persist();
  const success = api.success(closeOperation57), acceptable = !schedulingFailure && !failures.length && waiters.length === 2 && attempts.length === 2
    && attempts.every(attempt => attempt.responseComplete && !attempt.transportFailure) && JSON.stringify(attempts.map(attempt => attempt.status).sort()) === JSON.stringify([success, 409].sort());
  const observation = ctx.artifact(`${ctx.next('a07-race-observed')}.json`, { before: before.manifest, after: after.manifest, attempts, failures, schedulingFailure, controlPid, waiters,
    actualTwoWaitersBeforeRelease: waiters.length === 2, expectedStatuses: [success, 409], acceptable, schedulingSQLOnlyAndAlwaysRollback: true });
  record.raceAttempt.observation = observation; ctx.persist();
  if (!acceptable) { ctx.state.blockedObservation = observation; ctx.persist(); throw new Error('Actual race incomplete/unexpected; inspect both attempts and exact data, no inferred rollback or retry'); }
  const winner = attempts.find(attempt => attempt.status === success), loser = attempts.find(attempt => attempt.status === 409); winner.expectedStatus = success;
  const ledger = await reconcileAttempt(ctx, before, after, winner, { responseBirths: [{ table: 'project_completion_condition_closure', pointer: '/closureRecordId' }], mutableTables: ['project_completion_record', 'project_completion_condition'],
    updatedAnchors: [{ table: 'project_completion_record', id: parentId, requestBinding: 'path:completionRecordId' }, { table: 'project_completion_condition', id: winner.pathParams.id, requestBinding: 'path:id' }] });
  const all = (snapshot, table) => readRows(snapshot.databases[ctx.database].tables[table]), row = (snapshot, table, id) => all(snapshot, table).find(item => item.key[0] === id);
  const parentBefore = row(before, 'project_completion_record', parentId), parentAfter = row(after, 'project_completion_record', parentId);
  assert.equal(JSON.parse(parentAfter.raw).row_version, JSON.parse(parentBefore.raw).row_version + 1);
  assert.equal(JSON.parse(parentAfter.raw).completion_result, 'conditional-completed');
  const priorIds = new Set(all(before, 'project_completion_condition_closure').map(item => item.key[0]));
  const closures = all(after, 'project_completion_condition_closure').filter(item => !priorIds.has(item.key[0])); assert.equal(closures.length, 1); assert.equal(closures[0].key[0], data(winner).closureRecordId);
  const conditionBefore = row(before, 'project_completion_condition', winner.pathParams.id), conditionAfter = row(after, 'project_completion_condition', winner.pathParams.id);
  assert.equal(JSON.parse(conditionAfter.raw).row_version, JSON.parse(conditionBefore.raw).row_version + 1); assert.equal(JSON.parse(conditionAfter.raw).status, 'closed');
  if (loser.pathParams.id !== winner.pathParams.id) { const oldLoser = row(before, 'project_completion_condition', loser.pathParams.id), currentLoser = row(after, 'project_completion_condition', loser.pathParams.id); assert.equal(currentLoser.sha256, oldLoser.sha256); assert.equal(currentLoser.xmin, oldLoser.xmin); }
  const audits = all(after, 'audit_log').filter(item => { const value = JSON.parse(item.raw); return value.event_type === closeOperation57 && [winner.requestId, loser.requestId].includes(value.request_id); }); assert.equal(audits.length, 1);
  for (const actual of [conditionAfter, ...closures, ...audits]) assert.equal(actual.xmin, parentAfter.xmin);
  const proof = ctx.artifact(`${ctx.next('a07-race-proof')}.json`, { observation, ledger, projectId, parentId, winner: winner.receiptId, loser: loser.receiptId, winningConditionId: winner.pathParams.id,
    actualSharedXmin: parentAfter.xmin, oneClosureOneParentIncrementOneWinningAudit: true, actualLockWaiters: 2, businessFactsSQLFixture: false });
  record.raceAttempt.phase = 'verified'; record.raceAttempt.proof = proof; ctx.persist(); return { proof, winner, loser };
}
