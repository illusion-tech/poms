import assert from 'node:assert/strict';
export const MAX26 = '9999999999999999.99';
export const cases26 = Object.freeze({
  'max-zero': { contractGross: MAX26, contractNet: MAX26, taxRate: '0.0000', cashGross: MAX26, cashNet: MAX26, cashTax: '0.00', costNet: MAX26, margin: '0.00', ratio: '0.000000' },
  'cent-max': { contractGross: MAX26, contractNet: MAX26, taxRate: '0.0000', cashGross: '0.01', cashNet: '0.01', cashTax: '0.00', costNet: MAX26, margin: '-9999999999999999.98', ratio: '-999999999999999998.000000' },
  'max-tax13': { contractGross: MAX26, contractNet: '8849557522123893.80', taxRate: '0.1300', cashGross: MAX26, cashNet: '8849557522123893.80', cashTax: '1150442477876106.19', costNet: '0.01', margin: '8849557522123893.79', ratio: '1.000000' },
});
export function cents26(text) {
  assert(typeof text === 'string' && /^-?\d+\.\d{2}$/.test(text)); const negative = text.startsWith('-'), value = negative ? text.slice(1) : text;
  const [whole, fraction] = value.split('.'); const cents = BigInt(whole) * 100n + BigInt(fraction); return negative ? -cents : cents;
}
export function assertA05Metrics26(payload, scenario) {
  const metrics = payload.metrics;
  for (const [layer, value] of [['net', scenario.cashNet], ['tax', scenario.cashTax], ['gross', scenario.cashGross]]) {
    assert.equal(metrics.confirmedReceiptAmounts[layer].knowledge, 'known'); assert.equal(metrics.confirmedReceiptAmounts[layer].value, value);
  }
  assert.equal(metrics.includedCostAmounts.net.knowledge, 'known'); assert.equal(metrics.includedCostAmounts.net.value, scenario.costNet);
  assert.equal(metrics.grossMarginNet.knowledge, 'known'); assert.equal(metrics.grossMarginNet.value, scenario.margin);
  assert.equal(metrics.grossMarginRate.knowledge, 'known'); assert.equal(metrics.grossMarginRate.value, scenario.ratio);
  assert.equal(metrics.taxPendingAmount.knowledge, 'known'); assert.equal(metrics.taxPendingAmount.value, '0.00', 'Actual zero-tax expense scope proves zero; no missing taxed source is defaulted');
  assert.equal(cents26(scenario.cashGross), cents26(scenario.cashNet) + cents26(scenario.cashTax));
  assert.equal(cents26(scenario.cashNet) - cents26(scenario.costNet), cents26(scenario.margin));
  assert.equal(payload.formalEligibility.status, 'eligible'); assert.equal(payload.contracts.length, 1);
}
