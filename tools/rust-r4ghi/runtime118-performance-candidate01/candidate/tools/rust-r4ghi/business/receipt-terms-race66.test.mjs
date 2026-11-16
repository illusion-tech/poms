import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedCash66, cents66, directWait66, assertFrozenReceipt66 } from './receipt-terms-proof66.mjs';

test('expected checks use actual four-place rate and exact cents including half-up and MAX', () => {
  assert.deepEqual(expectedCash66('113.00', '0.1300'), { gross: '113.00', net: '100.00', tax: '13.00', rate: '0.1300' });
  assert.deepEqual(expectedCash66('0.03', '1.0000'), { gross: '0.03', net: '0.02', tax: '0.01', rate: '1.0000' });
  assert.deepEqual(expectedCash66('9999999999999999.99', '0.1300'), { gross: '9999999999999999.99', net: '8849557522123893.80', tax: '1150442477876106.19', rate: '0.1300' });
  for (const bad of [1.23, '-1.00', '1.2300', '10000000000000000.00']) assert.throws(() => cents66(bad));
  assert.throws(() => expectedCash66('1.00', '0.13')); assert.throws(() => expectedCash66('0.00', '0.1300'));
});
test('a guessed timeout or wait only on the scheduling barrier is not original-term contention evidence', () => {
  const graph = [{ pid: 1, state: 'active', wait_event_type: 'Lock', blocked_by: [9] }, { pid: 2, state: 'active', wait_event_type: 'Lock', blocked_by: [1] }];
  assert(directWait66(graph, 1, 9)); assert(directWait66(graph, 2, 1)); assert(!directWait66(graph, 2, 9));
  assert(!directWait66([{ ...graph[1], state: 'idle' }], 2, 1));
});
function frame() {
  const term = { id: 'term', version: 2, payload_hash: 'approved-inner', currency_code: 'CNY', tax_rate: '0.1300' }, ref = { kind: 'ContractTermSnapshot', id: 'term', expectedVersion: 3, payloadHash: 'actual-source-ref' }, input = { ref, gross: '113.00', receiptId: 'receipt', projectId: 'project', contractId: 'contract' };
  const sourceRef = { kind: ref.kind, id: ref.id, rowVersion: ref.expectedVersion, payloadHash: ref.payloadHash }, basis = { producer_version: 1, capture_mode: 'confirm', rounding_policy: 'gross-net-HALF_UP-cents-v1', receipt_id: input.receiptId, project_id: input.projectId, contract_id: input.contractId,
    term_snapshot_id: term.id, term_snapshot_version: term.version, term_snapshot_row_version: ref.expectedVersion, term_payload_hash: term.payload_hash, currency: term.currency_code, tax_rate: term.tax_rate, cash_gross: '113.00', amount_excluding_tax: '100.00', tax_amount: '13.00',
    currency_source_kind: ref.kind, currency_source_id: ref.id, currency_source_version: ref.expectedVersion, currency_source_hash: ref.payloadHash, captured_by: 'actor', frozen_payload: { termSnapshotRef: sourceRef, currencyBasisRef: sourceRef, cashGross: '113.00', amountExcludingTax: '100.00', taxAmount: '13.00', taxRate: term.tax_rate, currency: term.currency_code, termPayloadHash: term.payload_hash } };
  return { term, input, basis };
}
test('actual stored basis must preserve original exact refs/currency/rate/net/tax rather than the control statement', () => {
  const { term, input, basis } = frame(); assertFrozenReceipt66(basis, term, input, 'actor');
  for (const [key, value] of [['currency', 'USD'], ['tax_rate', '0.0000'], ['term_snapshot_row_version', 4], ['amount_excluding_tax', '113.00']]) assert.throws(() => assertFrozenReceipt66({ ...basis, [key]: value }, term, input, 'actor'));
  const wrong = structuredClone(basis); wrong.frozen_payload.currencyBasisRef.payloadHash = 'different'; assert.throws(() => assertFrozenReceipt66(wrong, term, input, 'actor'));
});
