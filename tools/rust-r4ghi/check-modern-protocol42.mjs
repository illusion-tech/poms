import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
import { operationMap, sha } from './business/pure.mjs';
import { loadSnapshot, difference } from './business/snapshot.mjs';

const ctx = createContext({ epoch: 'g2-business10', run: 'main01',
  'api-process-record': '/home/wangzishi/.local/share/poms-r4ghi/private/rust-api133-process.json' });
assert(!ctx.state.blockedObservation && !ctx.state.activeFault && !ctx.state.cleaned && !ctx.state.cleanupPlan);
const lock = `${ctx.priv}/driver.lock`;
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'actual-modern-protocol-negatives42' }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const api = createApi(ctx); await api.login('manager');
  const mapping = JSON.parse(fs.readFileSync(`${ctx.win}/docs/design/rust-r4ghi/operation-map01.json`));
  const definitions = mapping.operations.filter(row => row.requestProtocol?.requiredInputVersion === 'server-derived-v1');
  assert.equal(definitions.length, 16);
  definitions.push({ operationId: 'ContractFinanceController_confirmReceipt', supportingExistingOperation: true });
  const map = operationMap(api.spec);
  const attempts = fs.readdirSync(ctx.out).filter(name => /-http-http\.json$/.test(name)).sort().map(name => JSON.parse(fs.readFileSync(`${ctx.out}/${name}`)));
  const rows = [];
  for (const definition of definitions) {
    const item = map.get(definition.operationId); assert(item && item.method === 'POST');
    const previous = attempts.find(value => value.operationId === definition.operationId && value.responseComplete && value.status >= 200 && value.status < 300);
    let params = {};
    if (item.template.includes('{')) {
      assert(previous, 'A real prior operation path is required; do not invent resource UUIDs');
      const request = JSON.parse(fs.readFileSync(previous.originals.requestConfig.file));
      const keys = [];
      const pattern = item.template.split(/(\{[^}]+\})/).map(part => {
        if (part.startsWith('{')) { keys.push(part.slice(1, -1)); return '([^/]+)'; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('');
      const match = new RegExp(`^${pattern}$`).exec(new URL(request.url).pathname); assert(match);
      params = Object.fromEntries(keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
    }
    for (const test of [{ name: 'missing-protocol-tag', body: {}, status: 422 },
      { name: 'modern-tag-with-invalid-shape', body: { inputVersion: 'server-derived-v1' }, status: 400 }]) {
      const response = await api.request(definition.operationId, params, test.body, 'manager', { expectedStatus: test.status });
      const before = loadSnapshot(ctx, response.before), after = loadSnapshot(ctx, response.after);
      const changes = difference(before, after);
      assert(changes.every(change => change.database === ctx.database && ['auth_session', 'audit_log', 'security_event'].includes(change.table)),
        'A rejected modern protocol request changed business rows');
      for (const database of ctx.databases) {
        assert.deepEqual(before.databases[database].meta, after.databases[database].meta);
        assert.deepEqual(before.objects[database], after.objects[database]);
      }
      rows.push({ operationId: definition.operationId, case: test.name, actualStatus: response.status,
        receipt: response.receiptId, ledger: response.ledger, businessRowsAndXminUnchanged: true });
    }
  }
  const receipt = ctx.artifact(`${ctx.next('modern-protocol42-complete')}.json`, { kind: 'actual-Rust-sixteen-modern-write-and-supporting-C-protocol-negatives',
    rows, sourcePinsSHA256: sha(JSON.stringify(ctx.pins)), admittedPositiveBusinessBoundaryClaimed: false,
    NativeHTTPExecuted: false, moneyBoundaryClaimed: false, G3Certified: false, G4Certified: false },
  { kind: 'actual-Rust-modern-protocol-negatives-complete', batchModernOperations: 16, supportingExistingCOperations: 1, actualNegativeRequests: rows.length,
    allMissingTags422: true, allInvalidModernShapes400: true, businessWrites: 0, G3Certified: false, G4Certified: false });
  ctx.state.modernProtocol42 = receipt; ctx.persist();
  console.log(JSON.stringify({ status: 'completed', batchModernOperations: 16, supportingExistingCOperations: 1, actualNegativeRequests: rows.length, businessWrites: 0, NativeHTTPExecuted: false, G3Certified: false }));
} catch (error) {
  const original = ctx.artifact(`${ctx.next('modern-protocol42-partial')}.json`, { name: error.name, message: error.message, stack: error.stack });
  ctx.persist(); console.error(JSON.stringify({ status: 'failed-or-partial', privateOriginal: original, G3Certified: false })); process.exitCode = 1;
} finally {
  assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock);
}
