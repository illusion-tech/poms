import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha, operationMap } from './pure.mjs';
import { statusBindings } from '../userfix/status.mjs';

export function operationReport(ctx) {
  const map = JSON.parse(fs.readFileSync(`${ctx.win}/docs/design/rust-r4ghi/operation-map01.json`)); assert.equal(map.operations.length, 32);
  const ops = operationMap(JSON.parse(fs.readFileSync(`${ctx.win}/libs/shared/api-spec/openapi.json`))), bound = statusBindings(ctx);
  const ledger = new Map();
  for (const name of fs.readdirSync(ctx.priv).filter(n => /^\d+-ledger\.json$/.test(n))) {
    const observation = JSON.parse(fs.readFileSync(`${ctx.priv}/${name}`)); if (observation.transport === 'HTTP' && observation.ownershipComplete === true) ledger.set(observation.requestId, { file: `${ctx.priv}/${name}`, rawBytesSha256: sha(fs.readFileSync(`${ctx.priv}/${name}`)) });
  }
  const attempts = fs.readdirSync(ctx.out).filter(n => /^\d+-http-http\.json$/.test(n)).map(name => ({ name, value: JSON.parse(fs.readFileSync(`${ctx.out}/${name}`)) }));
  const rows = map.operations.map(definition => {
    const op = ops.get(definition.operationId); assert(op && op.template === definition.runtimePath && op.method === definition.method, 'Frozen operation map and current full OpenAPI diverged');
    const statuses = Object.keys(op.op.responses).filter(s => /^2\d\d$/.test(s)); assert.equal(statuses.length, 1);
    const exactSuccess = bound[definition.operationId]?.status ?? Number(statuses[0]);
    const matching = attempts.filter(a => a.value.operationId === definition.operationId);
    const successful = matching.filter(a => a.value.status === exactSuccess && a.value.expectedStatus === exactSuccess && a.value.responseComplete && !a.value.transportFailure && ledger.has(a.value.requestId));
    return { operationId: definition.operationId, group: definition.group, method: definition.method, canonicalTemplate: definition.runtimePath, exactSuccess,
      attempts: matching.length, exactSuccessAndOwnershipObserved: successful.length, state: successful.length ? 'actual-exact-success-observed' : 'not-run-or-no-complete-success-evidence',
      receipts: successful.map(a => ({ receipt: `${ctx.out}/${a.name}`, requestId: a.value.requestId, ledger: ledger.get(a.value.requestId) })), acceptanceCertified: false };
  });
  return { kind: 'actual-HTTP-operation-evidence-inventory-only', capturedAt: new Date().toISOString(), epoch: ctx.epoch, run: ctx.run, rows,
    required: 32, exactSuccessObserved: rows.filter(r => r.exactSuccessAndOwnershipObserved > 0).length, notYetEvidenced: rows.filter(r => r.exactSuccessAndOwnershipObserved === 0).map(r => r.operationId),
    unresolvedOwnershipObservation: Boolean(ctx.state.blockedObservation), leftoverFI: Boolean(ctx.state.activeFault), cleanupCommitted: ctx.state.cleaned === true,
    pendingPolicy: ['normal-period-close-current-selection'], browserAcceptance: 'not-certified-by-this-tool', raceAcceptance: 'not-certified-by-this-tool',
    requiredWriteFIInventory: 'not-certified-by-this-tool', inheritedProducerEvidence: ctx.state.consumerAdmission54 ? { producerEpoch: ctx.state.consumerAdmission54.producerEpoch, currentConsumerEpoch: ctx.epoch, oldProducerHTTPOrFICountedAsCurrent: false, currentDirectoriesOnly: true } : null,
    G3Certified: false, G4Certified: false, officialOperationDeliveryIncrement: 0 };
}
