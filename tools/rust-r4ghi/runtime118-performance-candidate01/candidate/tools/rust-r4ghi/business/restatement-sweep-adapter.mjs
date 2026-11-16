import fs from 'node:fs';
import assert from 'node:assert/strict';
import { faultSweepAndRetry } from './fault-sweep.mjs';
import { prepareLiveRestatementBody } from './gh-restatement-preparation.mjs';

export async function operatingRestatementSweep(ctx, api) {
  assert(fs.existsSync(new URL('./restatement.mjs', import.meta.url)), 'Root must first review/promote18 actual late-producer driver;19 does not overwrite that frozen candidate');
  const op = 'ProjectCostController_createOperatingRestatement', f = ctx.state.fixtures;
  if (f.liveRestatement?.command) assert(f.ghRequiredWriteSweepReceipts?.[op + ':' + f.project.id], 'An existing ordinary successful restatement cannot be claimed as FI');
  const wrapped = { ...api, request: async (operationId, params = {}, body = null, actor = 'bootstrap', binding = {}) => {
    // Explicit negatives and true idempotent replays keep the original API path.
    // Only18's first fact-producing POST with response birth bindings is swept.
    if (operationId !== op || binding.expectedStatus || !binding.responseBirths?.some(r => r.table === 'operating_restatement_record')) return api.request(operationId, params, body, actor, binding);
    assert.equal(actor, 'manager');
    const preparation = await prepareLiveRestatementBody(ctx, api, body);
    const result = await faultSweepAndRetry(ctx, api, { operationId, params, body, actor, binding });
    f.ghRequiredWriteSweepReceipts ??= {}; f.ghRequiredWriteSweepReceipts[op + ':' + f.project.id] = result.receipt;
    f.liveRestatement.preEffectPreparation = preparation; ctx.persist(); return result.successful;
  } };
  const { operatingLiveRestatement } = await import('./restatement.mjs');
  const result = await operatingLiveRestatement(ctx, wrapped);
  assert(f.ghRequiredWriteSweepReceipts?.[op + ':' + f.project.id]);
  return { ...result, necessaryWritesFI: 'only-source-listed-families-with-actual-hit1-rollback-and-one-final-success', priorOrdinaryRestatementRetrospectivelyCertified: false };
}
