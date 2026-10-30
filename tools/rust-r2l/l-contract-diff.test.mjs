// Pure in-memory mutations of the two completed fresh public runs. No DB/HTTP,
// private journal, environment, Native process or old K ignored-case set.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { compareContractReports } from './l-contract-diff.mjs';
const find = (name) => {
    const paths = ['tmp/rust-r2l/' + name, 'tmp/rust-r2l/contract-diff-inputs01/' + name]; const file = paths.find((file) => fs.existsSync(file)); assert(file, 'Required actual public input missing: ' + name); return JSON.parse(fs.readFileSync(file));
};
const native = find('contract-http-nest-cnative01.json'), rust = find('contract-http-rust-crust02.json');
const slotsNative = find('contract-input-slots-nest01.json'), slotsRust = find('contract-input-slots-rust01.json');
const sha = (value) => createHash('sha256').update(value).digest('hex');
function negative(mutate, predicate) {
    const changed = structuredClone(rust), slots = structuredClone(slotsRust); mutate(changed);
    // This is a synthetic semantic negative, not an actual report/certificate.
    // Refresh only the in-memory envelope so the intended field check executes.
    slots.actualReport.canonicalSha256 = sha(JSON.stringify(changed));
    const result = compareContractReports(native, changed, { inputSlotsNest: slotsNative, inputSlotsRust: slots });
    assert.equal(result.result, 'fail'); assert(predicate(result), JSON.stringify({ failures: result.failures.slice(0, 4), differences: result.differences.slice(0, 4) }));
}
const q = (report, name) => report.requests.find((item) => item.name === name);
test('completed old-candidate inputs compare all31/67 columns with exact source-bound initial rows', () => {
    const result = compareContractReports(native, rust, { inputSlotsNest: slotsNative, inputSlotsRust: slotsRust });
    assert.equal(result.result, 'pass', JSON.stringify(result.failures)); assert.equal(result.differences.length, 0); assert.equal(result.gaps.length, 0);
    assert.equal(result.coverage.pairedRecords, 31); assert.equal(result.coverage.nonemptyRawColumns, 67); assert.equal(result.coverage.full107ProductRowEqualityClaimed, false);
    assert.equal(result.coverage.legacy54IgnoredCountedAsPassed, false); assert.equal(result.actualBinaries.rust, 'bbb9f536955bd685f7bb41ef21ec928b6db9a7facc9ef29889b06af2b83aff66');
});
test('missing source-bound project input clocks cannot become a pass', () => {
    const result = compareContractReports(native, rust); assert.notEqual(result.result, 'pass'); assert(result.gaps.some(({ reason }) => reason.includes('Project original SQL input slot')));
});
test('money mutation fails without string/number or rounding normalization', () => negative((r) => { q(r, 'decision.reject-auth-due').after.contract[0].signed_amount = 880000.01; }, (r) => r.differences.some(({ path }) => path.includes('signed_amount'))));
test('row_version mutation fails', () => negative((r) => { q(r, 'decision.reject-auth-due').after.approval_record[0].row_version++; }, (r) => r.differences.some(({ path }) => path.includes('row_version'))));
test('business status mutation fails', () => negative((r) => { q(r, 'record.detail').after.approval_record[0].current_status = 'fabricated'; }, (r) => r.differences.some(({ path }) => path.includes('current_status'))));
test('missing DTO field fails rather than comparing surviving fields only', () => negative((r) => { delete q(r, 'record.detail').response.body.currentNodeName; }, (r) => r.differences.some(({ path, rustPresent }) => path.endsWith('currentNodeName') && rustPresent === false)));
test('extra DTO field fails', () => negative((r) => { q(r, 'record.detail').response.body.invented = true; }, (r) => r.differences.some(({ path }) => path.endsWith('invented'))));
test('wrong target identity fails even when it is another known UUID slot', () => negative((r) => { q(r, 'record.detail').response.body.targetObjectId = r.projectId; }, (r) => r.differences.some(({ path }) => path.endsWith('targetObjectId'))));
test('extra raw row fails cardinality and typed create identity checks', () => negative((r) => { const copy = structuredClone(q(r, 'record.detail').after.approval_record[0]); copy.id = randomUUID(); q(r, 'record.detail').after.approval_record.push(copy); }, (r) => r.failures.some(({ reason }) => reason.includes('source/SDK mapped identity')) || r.differences.some(({ path }) => path.endsWith('length'))));
test('raw unchanged field omission fails the full catalog column set', () => negative((r) => { delete q(r, 'record.detail').before.contract[0].currency_code; }, (r) => r.failures.some(({ reason }) => reason.includes('missing/extra column'))));
test('clock sample outside exact HTTP bounds fails', () => negative((r) => { q(r, 'decision.reject-auth-due').after.approval_record[0].decided_at = '2099-01-01T08:00:00+08:00'; }, (r) => r.failures.some(({ reason }) => reason.includes('outside its exact'))));
test('timezone spelling change fails even when the instant stays identical', () => negative((r) => { const row = q(r, 'decision.reject-auth-due').after.approval_record[0], value = row.closed_at; row.closed_at = value.replace('T08:', 'T09:').replace('+08:00', '+09:00'); }, (r) => r.failures.some(({ reason }) => reason.includes('timezone spelling'))));
test('session token fingerprint changing within one logical login fails', () => negative((r) => { q(r, 'record.detail').after.auth_session[0].token_hash.sha256 = '0'.repeat(64); }, (r) => r.failures.some(({ reason }) => reason.includes('fingerprint changed'))));
test('session real user binding is not hidden by nonce mapping', () => negative((r) => { const row = q(r, 'approver.login').after.auth_session.find((row) => row.user_id === '00000000-0000-4000-8000-000000000008'); row.user_id = r.base.actors.admin; }, (r) => r.failures.some(({ reason }) => reason.includes('real login actor'))));
test('URL changes remain differences', () => negative((r) => { q(r, 'record.detail').path += '?unexpected=true'; }, (r) => r.differences.some(({ path }) => path.endsWith('path'))));
test('error body text remains a deep compared field', () => negative((r) => { q(r, 'decision.reject-closed').response.body.message = 'changed error'; }, (r) => r.differences.some(({ path }) => path.endsWith('message'))));
test('anonymous CSRF nonce reuse across distinct actual client slots fails', () => negative((r) => { q(r, 'approver.csrf').response.body.token.sha256 = q(r, 'initiator.csrf').response.body.token.sha256; }, (r) => r.failures.some(({ reason }) => reason.includes('reused CSRF nonce'))));
test('carried concurrency comment is validated against its original actual winner, not erased', () => negative((r) => {
    const record = q(r, 'decision.cas-pair').approvalRecordId, later = q(r, 'producer.submit-record-concurrency').before.approval_record.find(({ id }) => id === record); later.decision_comment = '并发真实决策 9';
}, (r) => r.failures.some(({ reason }) => reason.includes('comment/carry'))));
