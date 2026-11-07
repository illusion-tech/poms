import assert from 'node:assert/strict';

export function cents66(value) {
  assert(typeof value === 'string' && /^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(value));
  const result = BigInt(value.replace('.', '')); assert(result <= 999999999999999999n); return result;
}
export function money66(value) { assert(value >= 0n && value <= 999999999999999999n); return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`; }
// Independent expected-result check only; this never produces/binds money in a
// command. The source rate/currency are read from the genuine selected terms.
export function expectedCash66(grossText, originalRate) {
  const gross = cents66(grossText); assert(gross > 0n);
  assert(typeof originalRate === 'string' && /^(0\.[0-9]{4}|1\.0000)$/.test(originalRate));
  const rate = BigInt(originalRate.replace('.', '')), denominator = 10000n + rate;
  const net = (gross * 10000n + denominator / 2n) / denominator;
  return { gross: grossText, net: money66(net), tax: money66(gross - net), rate: originalRate };
}
export function directWait66(graph, waiter, blocker) {
  const row = graph.find(value => Number(value.pid) === Number(waiter));
  return row?.state === 'active' && row.wait_event_type === 'Lock' && row.blocked_by.map(Number).includes(Number(blocker));
}
export function assertFrozenReceipt66(basis, term, input, actorId) {
  const expected = expectedCash66(input.gross, term.tax_rate);
  assert.equal(input.ref.kind, 'ContractTermSnapshot');
  assert.equal(basis.producer_version, 1); assert.equal(basis.capture_mode, 'confirm'); assert.equal(basis.rounding_policy, 'gross-net-HALF_UP-cents-v1');
  assert.equal(basis.receipt_id, input.receiptId); assert.equal(basis.project_id, input.projectId); assert.equal(basis.contract_id, input.contractId);
  assert.equal(basis.term_snapshot_id, term.id); assert.equal(basis.term_snapshot_version, term.version); assert.equal(basis.term_snapshot_row_version, input.ref.expectedVersion);
  assert.equal(basis.term_payload_hash, term.payload_hash); assert.equal(basis.currency, term.currency_code); assert.equal(basis.tax_rate, expected.rate);
  assert.equal(basis.cash_gross, expected.gross); assert.equal(basis.amount_excluding_tax, expected.net); assert.equal(basis.tax_amount, expected.tax);
  assert.equal(basis.currency_source_kind, 'ContractTermSnapshot'); assert.equal(basis.currency_source_id, term.id);
  assert.equal(basis.currency_source_version, input.ref.expectedVersion); assert.equal(basis.currency_source_hash, input.ref.payloadHash); assert.equal(basis.captured_by, actorId);
  const frozen = basis.frozen_payload;
  for (const reference of [frozen.termSnapshotRef, frozen.currencyBasisRef]) { assert.equal(reference.kind, 'ContractTermSnapshot'); assert.equal(reference.id, term.id); assert.equal(reference.rowVersion, input.ref.expectedVersion); assert.equal(reference.payloadHash, input.ref.payloadHash); }
  for (const [key, value] of Object.entries({ cashGross: expected.gross, amountExcludingTax: expected.net, taxAmount: expected.tax, taxRate: expected.rate, currency: term.currency_code, termPayloadHash: term.payload_hash })) assert.equal(frozen[key], value);
  return expected;
}
