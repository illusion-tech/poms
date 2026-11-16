import test from 'node:test';
import assert from 'node:assert/strict';
import { boundaryReferenceBody27 } from './a05-sources26.mjs';
import { MAX26 } from './a05-values26.mjs';
test('contract-specific MAX reference matches candidate while independent project quote stays unchanged', () => {
  const payload = { baseline: context => ({ body: { amountTaxInclusive: '113000.00', amountTaxExclusive: '100000.00', taxRate: '0.1300', contractTerms: [{ amountTaxInclusive: context.contractInclusive, amountTaxExclusive: context.contractExclusive, taxRate: '0.1300' }] } }) };
  const body = boundaryReferenceBody27(payload, { contractInclusive: MAX26, contractExclusive: MAX26 }, { taxRate: '0.0000' });
  assert.equal(body.amountTaxInclusive, '113000.00'); assert.equal(body.amountTaxExclusive, '100000.00'); assert.equal(body.taxRate, '0.1300');
  assert.deepEqual(body.contractTerms[0], { amountTaxInclusive: MAX26, amountTaxExclusive: MAX26, taxRate: '0.0000' });
});
