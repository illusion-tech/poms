import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha } from './pure.mjs';
import { rawSelected } from './context.mjs';
import { loadSnapshot, readRows } from './snapshot.mjs';

// Explicitly scoped to the one Root-observed partial attempt. This is not a
// generic ownership adopter, retry or row mutation tool.
export async function reconcileObservedRoleA(ctx, label) {
  assert.equal(ctx.epoch, 'userfix115'); assert.equal(ctx.run, 'run01'); assert.equal(ctx.state.prefix, 'uf1222fe274c');
  const requestId = 'uf1222fe274c-00008-http-a4317413', stem = '00008-http';
  const configBytes = fs.readFileSync(`${ctx.priv}/${stem}-request-config.json`), config = JSON.parse(configBytes);
  const responseBytes = fs.readFileSync(`${ctx.priv}/${stem}-response-body.bin`), response = JSON.parse(responseBytes);
  const headers = JSON.parse(fs.readFileSync(`${ctx.priv}/${stem}-response-headers.json`));
  const publicReceipt = JSON.parse(fs.readFileSync(`${ctx.out}/${stem}-http.json`));
  assert.equal(config.requestId, requestId); assert.equal(publicReceipt.requestId, requestId);
  assert.equal(config.operationId, 'PlatformController_createRole'); assert.equal(config.url, ctx.api + '/api/platform/roles'); assert.equal(config.method, 'POST');
  assert.deepEqual(config.beforeLocator, []); assert.equal(headers.statusCode, 201); assert.equal(publicReceipt.status, 201); assert.equal(publicReceipt.responseComplete, true);
  assert.equal(publicReceipt.configuredRequestHeaders.rawBytesSha256, sha(configBytes)); assert.equal(publicReceipt.responseBody.rawBytesSha256, sha(responseBytes));
  assert.equal(config.selector.table, 'role'); assert.equal(config.selector.column, 'role_key'); assert.equal(config.selector.value, `${ctx.state.prefix}-roleA`);
  assert.equal(response.roleKey, config.selector.value); assert.equal(response.name, '#115 roleA'); assert(/^[0-9a-f-]{36}$/i.test(response.id));
  assert(!ctx.state.fixtures.roleA, 'Do not overwrite an existing fixture pointer');
  const baseline = loadSnapshot(ctx, 'baseline').databases[ctx.database];
  assert(!readRows(baseline.tables.role).some(r => r.key[0] === response.id || JSON.parse(r.raw).role_key === config.selector.value));
  const proof = { kind: 'HTTP-role', requestId, operationId: config.operationId, actualHttpStatus: 201, actualResponseComplete: true, exactOriginalResponseId: response.id, originalResponseSha256: sha(responseBytes), originalRequestSha256: sha(configBytes), beforeLocator: [], reconciledAfterToolStatusAssertionFailure: true, locator: { column: 'role_key', value: config.selector.value } };
  await ctx.db(async c => {
    const rows = await rawSelected(c, 'role', 't.id=$1::uuid AND t.role_key=$2', [response.id, config.selector.value]); assert.equal(rows.length, 1);
    const row = JSON.parse(rows[0].raw); assert.equal(row.name, '#115 roleA'); assert.equal(row.is_active, true);
    const audits = await rawSelected(c, 'audit_log', "t.target_id=$1 AND t.event_type='platform.role.created'", [response.id]); assert.equal(audits.length, 1);
    assert.equal(JSON.parse(audits[0].raw).operator_id, ctx.state.actors.admin.id);
    assert(!readRows(baseline.tables.audit_log).some(r => r.key[0] === audits[0].key[0]));
    ctx.artifact(`${label}-roleA-reconcile-proof.json`, { proof, role: rows[0], audit: audits[0], baselineLabel: ctx.state.baselineLabel }, { kind: 'explicit-observed-201-roleA-reconciliation', requestId, originalActualHttpStatus: 201, roleId: response.id, newHTTPRequestsSent: 0, databaseMutations: 0, priorPartialPreserved: true });
    ctx.own(ctx.database, 'role', rows[0], proof);
    ctx.own(ctx.database, 'audit_log', audits[0], { ...proof, kind: 'HTTP-target-audit', targetId: response.id, event: 'platform.role.created' });
  });
  ctx.state.fixtures.roleA = response.id; ctx.persist();
  return { stage: 'reconcile-roleA', requestId, roleId: response.id, originalActualStatus: 201, databaseMutations: 0, HTTPRequestsSent: 0, oldFailureSuperseded: false };
}
