import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX26, cases26, cents26, assertA05Metrics26 } from './a05-values26.mjs';
import { boundaryRequestAPI26 } from './a05-sources26.mjs';
import { boundaryMainSHA26, openA05View26 } from './a05-view26.mjs';
import { keyOf } from './pure.mjs';

test('all A05 expectations conserve exact cents including MAX cash13% and one-cent/MAX loss', () => {
  for (const scenario of Object.values(cases26)) {
    assert.equal(cents26(scenario.cashGross), cents26(scenario.cashNet) + cents26(scenario.cashTax));
    assert.equal(cents26(scenario.cashNet) - cents26(scenario.costNet), cents26(scenario.margin));
  }
  const gross = cents26(MAX26), net = (gross * 10000n + 5650n) / 11300n;
  assert.equal(net, cents26(cases26['max-tax13'].cashNet)); assert.equal(gross + 1n, 1000000000000000000n);
  assert.equal(cents26(cases26['cent-max'].margin), -999999999999999998n);
});
test('published metric verifier rejects unknown/rounded source values and fabricated contract duplication', () => {
  const s = cases26['max-zero'], known = value => ({ knowledge: 'known', value });
  const payload = { contracts: [{}], formalEligibility: { status: 'eligible' }, metrics: { confirmedReceiptAmounts: { net: known(s.cashNet), tax: known(s.cashTax), gross: known(s.cashGross) },
    includedCostAmounts: { net: known(s.costNet) }, grossMarginNet: known(s.margin), grossMarginRate: known(s.ratio), taxPendingAmount: known('0.00') } };
  assertA05Metrics26(payload, s);
  for (const mutate of [p => { p.metrics.grossMarginNet = { knowledge: 'unknown', value: null }; }, p => { p.metrics.confirmedReceiptAmounts.net.value = '10000000000000000.00'; }, p => { p.contracts.push({}); }]) {
    const changed = structuredClone(payload); mutate(changed); assert.throws(() => assertA05Metrics26(changed, s));
  }
});
test('request adapter changes real candidate inputs only and keeps actual server responses untouched', async () => {
  const calls = [], actual = { real: 'HTTP response' }, api = { request: async (...args) => { calls.push(args); return actual; } }, wrapper = boundaryRequestAPI26(api, cases26['max-zero']);
  const body = { contractId: 'actual', candidateTerms: { amountTaxInclusive: '56500.00', amountTaxExclusive: '50000.00', taxRate: '0.1300', receivablePlanSeeds: [{ plannedAmount: '56500.00' }] } };
  const result = await wrapper.request('ContractReadinessController_createContractReadinessPackage', {}, body, 'manager', {});
  assert.equal(result, actual); assert.equal(calls[0][2].candidateTerms.amountTaxInclusive, MAX26); assert.equal(calls[0][2].candidateTerms.taxRate, '0.0000');
  assert.equal(body.candidateTerms.amountTaxInclusive, '56500.00');
});
test('A05 views persist independently and share only the actual root actors/ledger, leaving UI spares unchanged', () => {
  const id = '11111111-1111-4111-8111-111111111111', state = { fixtures: { platformComplete: true, customer: { id }, org: { id }, roles: {}, project: { id: 'main' }, uiFixtureViews23: { eo: { real: true } } }, actors: {}, owned: { [keyOf('db', 'customer', [id])]: {} } };
  const ctx = { state, database: 'db', pins: [], persist: () => {} }, before = boundaryMainSHA26(ctx), one = openA05View26(ctx, 'max-zero'), two = openA05View26(ctx, 'cent-max');
  one.ctx.state.fixtures.project = { id: 'one' }; two.ctx.state.fixtures.project = { id: 'two' }; assert.equal(boundaryMainSHA26(ctx), before);
  assert.equal(one.ctx.state.owned, state.owned); assert.equal(two.ctx.state.actors, state.actors); assert.notEqual(one.ctx.state.fixtures, two.ctx.state.fixtures);
  assert.equal(state.fixtures.uiFixtureViews23.eo.real, true); assert.throws(() => { one.ctx.state.fixtures = {}; });
});
