import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha } from './business/pure.mjs';
import { capture, loadSnapshot, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
const ctx = createContext({ epoch: 'g2-business10', run: 'main01' });
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'reconcile-rejected-snapshot-intent47' }) + '\n', { flag: 'wx', mode: 0o600 });
const pins = {
  '001438-http-request.json': 'e365a825cb4988f0f9a44812846ed7d514803abe46e935eed4a8bf236412f414',
  '001438-http-request-body.bin': 'a13cbbb919e162f33ccd85934af27d0e5404ca388e196d2f2839562f07981fe0',
  '001438-http-response-headers.json': '453bcc80985501aead754e443a0359a9f70e416da376df661c34287351611a6a',
  '001439-ledger.json': 'bfc161c9bc11dff9d5b5f8ba03806b9ea03ae89a6a168e0e3d8038f9f56d6aa1',
};
const read = name => { const bytes = fs.readFileSync(`${ctx.priv}/${name}`); assert.equal(sha(bytes), pins[name]); return JSON.parse(bytes); };
try {
  assert(!ctx.state.blockedObservation && !ctx.state.activeFault && !ctx.state.cleanupPlan && !ctx.state.cleaned);
  const fixture = ctx.state.fixtures.efCrossProject40; assert(fixture?.pending && !fixture.rejectedSnapshotIntent47);
  const body = read('001438-http-request-body.bin'), request = read('001438-http-request.json'), ledger = read('001439-ledger.json');
  const op = 'ProjectCostController_createProjectOperatingSnapshot';
  assert.equal(request.operationId, op); assert.equal(ledger.operationId, op); assert.equal(ledger.requestId, request.requestId);
  assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []);
  assert.equal(read('001438-http-response-headers.json').status, 400);
  assert.equal(fixture.pending.operationId, op); assert.equal(fixture.pending.bodySHA256, pins['001438-http-request-body.bin']);
  assert.equal(fixture.pending.key, `snapshot:${body.projectId}`); assert(fixture.projectIds.includes(body.projectId));
  assert.equal(fixture[fixture.pending.key], undefined);
  const schema = JSON.parse(fs.readFileSync(`${ctx.win}/libs/shared/api-spec/openapi.json`)).components.schemas.CostDecisionInput;
  const invalid = body.costDecisions.map(decision => decision.reasonCode).filter(code => !schema.properties.reasonCode.enum.includes(code)).sort();
  assert.deepEqual(invalid, ['actual-shared-cost-share', 'shared-pool-no-direct-duplication']);
  const before = loadSnapshot(ctx, ledger.before), after = loadSnapshot(ctx, ledger.after), fresh = await capture(ctx, ctx.next('rejected-snapshot47-current'));
  assertRecorded(ctx, fresh);
  const identity = input => readRows(input).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
  for (const database of ctx.databases) {
    for (const table of Object.keys(after.databases[database].tables)) {
      assert.deepEqual(identity(after.databases[database].tables[table]), identity(fresh.databases[database].tables[table]));
      if (!(database === ctx.database && ['auth_session', 'audit_log', 'security_event'].includes(table))) assert.deepEqual(identity(before.databases[database].tables[table]), identity(after.databases[database].tables[table]));
    }
    assert.deepEqual(after.databases[database].meta, fresh.databases[database].meta);
    assert.deepEqual(after.objects[database], fresh.objects[database]);
  }
  const pending = structuredClone(fixture.pending);
  const receipt = ctx.artifact(`${ctx.next('rejected-snapshot47-reconciled')}.json`, { kind: 'metadata-only-reconciliation-of-contract-rejected-snapshot-intent',
    pins, pending, original400Preserved: true, actualBusinessTablesAndXminUnchangedByRejectedRequest: true, freshObservation: fresh.manifest,
    completedEAndFProducerWritesRetained: true, newSnapshotStillRequired: true, originalPublicEnumUnchanged: true,
    HTTPRequestsSent: 0, businessSQLWrites: 0, G3Certified: false, G4Certified: false },
  { kind: 'rejected-snapshot-intent-reconciled-without-business-replay', original400Preserved: true, completedEAndFProducersRetained: true, businessWrites: 0 });
  fixture.rejectedSnapshotIntent47 = receipt;
  delete fixture.pending; ctx.persist();
  console.log(JSON.stringify({ status: 'reconciled', HTTPRequestsSent: 0, businessSQLWrites: 0, original400Preserved: true, completedEAndFProducersRetained: true }));
} catch (error) {
  const original = ctx.artifact(`${ctx.next('rejected-snapshot47-failed')}.json`, { name: error.name, message: error.message, stack: error.stack });
  ctx.persist(); console.error(JSON.stringify({ status: 'failed', privateOriginal: original })); process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock);
}
