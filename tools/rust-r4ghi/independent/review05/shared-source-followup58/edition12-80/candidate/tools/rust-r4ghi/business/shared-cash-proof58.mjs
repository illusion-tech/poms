// Actual immutable catalog/context comparison. No source IDs, dates or money are minted.
import assert from 'node:assert/strict';
import {exactExpectedRef} from './correction-preparation37.mjs';

const abs = value => value < 0n ? -value : value;
export function exactCents58(value) {
  assert(typeof value === 'string' && /^-?(?:0|[1-9]\d*)\.\d{2}$/.test(value), 'Original decimal lexeme required');
  const sign = value.startsWith('-') ? -1n : 1n, text = value.replace(/^-/, '');
  return sign * BigInt(text.replace('.', ''));
}
const decimal = (value, scale) => `${value < 0n ? '-' : ''}${abs(value) / scale}.${String(abs(value) % scale).padStart(String(scale).length - 1, '0')}`;
export function exactRatio58(numerator, denominator) {
  if (denominator === 0n) return {knowledge:'unknown', value:null, reasonCode:'zero-denominator'};
  const scaled = numerator * 1_000_000n, quotient = scaled / denominator, remainder = scaled % denominator;
  const away = abs(remainder) * 2n >= abs(denominator) ? ((numerator < 0n) !== (denominator < 0n) ? -1n : 1n) : 0n;
  return {knowledge:'known', value:decimal(quotient + away, 1_000_000n), reasonCode:null};
}
const one = (rows, predicate) => { const selected = rows.filter(predicate); assert.equal(selected.length, 1); return selected[0]; };
const money = amount => { assert.equal(amount.knowledge, 'known'); return exactCents58(amount.value); };
const sameRef = (actual, expected) => assert.deepEqual(exactExpectedRef(actual), exactExpectedRef(expected));
const knownAt = (row, cutoff) => { const stamp = ['created_at','captured_at','generated_at'].map(k => row[k]).find(x => typeof x === 'string' && Number.isFinite(Date.parse(x))); return !stamp || Date.parse(stamp) <= cutoff; };
export function businessDay58(value) { assert(typeof value === 'string'); if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value; assert(Number.isFinite(Date.parse(value))); return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)); }

export function verifySharedCashValues58(context, snapshot, catalog, preparation) {
  assert.equal(context.currency, 'CNY');
  assert.equal(preparation.projectId, context.projectId);
  const cutoff = context.snapshot.sourceWindowEnd, knownCutoff = Date.parse(context.snapshot.knowledgeCutoff);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(cutoff) && Number.isFinite(knownCutoff));
  const expected = catalog.receipts.filter(r => r.project_id === context.projectId && r.status === 'confirmed' && businessDay58(r.receipt_date) <= cutoff && knownAt(r, knownCutoff));
  assert.deepEqual(context.receipts.map(r => r.receiptRef.id).sort(), expected.map(r => r.id).sort(), 'Every actually confirmed in-window receipt must be accounted for exactly once');
  const totals = {net:0n, tax:0n, gross:0n};
  for (const item of context.receipts) {
    const receipt = one(expected, r => r.id === item.receiptRef.id), source = one(preparation.sourceRows, r => r.rowKind === 'receipt' && r.sourceRef.id === receipt.id);
    sameRef(item.receiptRef, source.sourceRef); assert.equal(item.receiptRef.rowVersion, receipt.row_version);
    assert(receipt.confirmed_at); assert.equal(item.status, 'confirmed'); assert.equal(Date.parse(item.confirmedAt), Date.parse(receipt.confirmed_at)); assert.equal(item.contractId, receipt.contract_id);
    const basis = one(catalog.bases, b => b.receipt_id === receipt.id), term = one(catalog.terms, t => t.id === basis.term_snapshot_id);
    assert.equal(basis.producer_version, 1); assert.equal(basis.project_id, receipt.project_id); assert.equal(basis.contract_id, receipt.contract_id); assert.equal(basis.receipt_row_version, receipt.row_version);
    assert.equal(term.contract_id, receipt.contract_id); assert.equal(term.payload_hash, basis.term_payload_hash);
    assert.equal(item.accountingBasisRef.kind, 'ReceiptAccountingBasis'); assert.equal(item.accountingBasisRef.id, basis.id); assert.equal(item.accountingBasisRef.rowVersion, basis.row_version);
    assert.equal(item.contractTermSnapshotRef.kind, 'ContractTermSnapshot'); assert.equal(item.contractTermSnapshotRef.id, term.id); assert.equal(item.contractTermSnapshotRef.rowVersion, term.row_version);
    assert.equal(basis.currency, context.currency); assert.equal(item.amounts.currency, context.currency);
    const amounts = {net:exactCents58(basis.amount_excluding_tax), tax:exactCents58(basis.tax_amount), gross:exactCents58(basis.cash_gross)};
    assert.equal(amounts.net + amounts.tax, amounts.gross); assert.equal(exactCents58(receipt.receipt_amount), amounts.gross); assert.equal(money(item.cashGross), amounts.gross);
    assert.equal(item.cashGross.basisRefs.length, 1); sameRef(item.cashGross.basisRefs[0], item.receiptRef);
    for (const layer of ['net','tax','gross']) { assert.equal(money(item.amounts[layer]), amounts[layer]); assert.equal(item.amounts[layer].basisRefs.length, 1); sameRef(item.amounts[layer].basisRefs[0], item.accountingBasisRef); totals[layer] += amounts[layer]; }
  }
  assert.equal(context.metrics.confirmedReceiptAmounts.currency, context.currency);
  for (const layer of ['net','tax','gross']) assert.equal(money(context.metrics.confirmedReceiptAmounts[layer]), totals[layer]);
  const included = money(context.metrics.includedCostAmounts.net), margin = totals.net - included;
  assert.equal(money(context.metrics.grossMarginNet), margin);
  assert.deepEqual(context.metrics.grossMarginRate, exactRatio58(margin, totals.net));
  assert.deepEqual(context.metrics.receiptRatio, exactRatio58(totals.gross, money(context.metrics.effectiveContractAmounts.gross)));
  assert.equal(snapshot.receivable_confirmed_total, decimal(totals.net, 100n));
  assert.equal(snapshot.gross_margin_amount, decimal(margin, 100n));
  assert.equal(snapshot.gross_margin_rate, context.metrics.grossMarginRate.value);
  return {actualReceiptIds:expected.map(r=>r.id).sort(), businessCutoff:cutoff, knowledgeCutoff:context.snapshot.knowledgeCutoff, net:decimal(totals.net,100n), tax:decimal(totals.tax,100n), gross:decimal(totals.gross,100n), originalCashBasisAndTermRelations:true, exactDerivedMarginAndRatios:true};
}
