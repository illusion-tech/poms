// Synchronous Root provenance bridge. Does not authorize backend reads/writes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const bridge = () => createRequire(import.meta.url)('../../../../../business/consumer-admission54.mjs');
export function admittedPlanFixtures54(ctx, plan) {
  const receipts = [], seen = new Set();
  for (const scene of plan.cases) {
    let registryPath, record, projectId, producerReceipt;
    if (scene.kind === 'creator') { registryPath = '/fixtures/creatorOwnership23'; record = ctx.state.fixtures.creatorOwnership23; projectId = record?.uiSpareProjectId; }
    else if (scene.kind === 'execution-owner' || scene.kind === 'own-condition') { const key = scene.kind === 'execution-owner' ? 'eo' : 'own'; registryPath = `/fixtures/uiFixtureViews23/${key}`; record = ctx.state.fixtures.uiFixtureViews23?.[key]; projectId = record?.pause?.result?.projectId; }
    else if (scene.kind === 'legacy-anchor') { registryPath = '/fixtures/legacyCompatibilityFixture'; record = ctx.state.fixtures.legacyCompatibilityFixture; projectId = record?.projectId; producerReceipt = record?.receipt; }
    else continue;
    assert(record && projectId); if (seen.has(registryPath)) continue; seen.add(registryPath);
    const result = bridge().assertAdmittedFixtureSource(ctx, { registryPath, record, projectIds: [projectId], ...(producerReceipt ? { producerReceipt: { file: producerReceipt.file, rawBytesSha256: producerReceipt.rawBytesSha256 } } : {}) });
    assert(result && typeof result.then !== 'function'); assert.equal(result.consumerEpoch, ctx.epoch); assert.equal(result.registryPath, registryPath); receipts.push(result);
  }
  return receipts;
}
export function readAdmittedConsumerContext54(statePin) {
  const ctx = bridge().readAdmittedConsumerContext({ statePin }); assert(ctx && typeof ctx.then !== 'function'); return ctx;
}
