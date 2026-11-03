// Pure original TS oracle. Does not load Nest, initialize an ORM, or connect PG.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../..');
const cache = new Map();
const inputs = [
  'libs/shared/contracts/src/lib/shared-contracts.ts',
  'apps/poms-api/src/app/core/date/business-date.utils.ts',
  'apps/poms-api/src/app/features/commission/commission-settlement-write-chain.ts',
];
function load(relative) {
  if (cache.has(relative)) return cache.get(relative).exports;
  const module = { exports: {} };
  cache.set(relative, module);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: relative,
  }).outputText;
  const localRequire = (name) => name === '@poms/shared-contracts' ? load(inputs[0])
    : name.startsWith('.') ? load(path.posix.normalize(path.posix.join(path.posix.dirname(relative), `${name}.ts`))) : require(name);
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, Date, Intl, console }, { filename: relative });
  return module.exports;
}
const original = load(inputs[2]);
function materialize(value) {
  if (value && typeof value === 'object') {
    if (Object.hasOwn(value, '$date')) return new Date(value.$date);
    if (Object.hasOwn(value, '$number')) return Number(value.$number);
    if (Array.isArray(value)) return value.map(materialize);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, materialize(item)]));
  }
  return value;
}
const dateCases = [
  { name: 'missing-null', value: null, now: '2026-10-29T16:00:00.000Z' },
  { name: 'empty-string', value: '', now: '2026-10-29T16:00:00.000Z' },
  { name: 'hk-before-midnight', value: '2026-10-30', now: '2026-10-29T15:59:59.999Z' },
  { name: 'hk-at-midnight', value: '2026-10-30', now: '2026-10-29T16:00:00.000Z' },
  { name: 'date-converted-in-hk', value: { $date: '2026-10-29T16:00:00.000Z' }, now: '2026-10-29T16:00:00.000Z' },
  { name: 'string-is-only-sliced', value: 'not-a-date-more', now: '2026-10-29T16:00:00.000Z' },
  { name: 'surrogate-slice-boundary', value: '123456789😀x', now: '2026-10-29T16:00:00.000Z' },
  { name: 'string-not-trimmed', value: ' 2026-10-30', now: '2026-10-29T16:00:00.000Z' },
  { name: 'invalid-date', value: { $date: 'invalid' }, now: '2026-10-29T16:00:00.000Z' },
  { name: 'year-of-era', value: { $date: '0001-01-01T00:00:00.000Z' }, now: '2026-10-29T16:00:00.000Z' },
].map((input) => {
  try { return { input, expected: original.evaluateRetentionDueDate(materialize(input.value), new Date(input.now)) }; }
  catch (error) { return { input, error: { name: error.name, message: error.message } }; }
});
const base = {
  openFreezeDispute: false,
  retentionDue: { retentionDueDate: '2026-04-14', retentionDueStatus: 'due' },
  departureDecision: { decisionSummary: '允许进入质保金结算', confirmationRequirementSummary: null },
  retentionReceipt: { receiptAmount: '360.00', receiptDate: { $date: '2026-10-29T16:00:00.000Z' } },
  gateBindingAction: 'prompt', gateReviewDecision: 'allow-retention',
  gateReviewBlockingReasonCode: null, gateNextActionSummary: null,
};
const variants = [
  ['ready-default', {}], ['settled-explicit', { markAsSettled: true }],
  ['settled-before-unmet', { markAsSettled: true, openFreezeDispute: true, departureDecision: null, retentionReceipt: null, retentionDue: { retentionDueDate: null, retentionDueStatus: 'missing' } }],
  ['dispute-first', { openFreezeDispute: true, departureDecision: null, retentionReceipt: null, retentionDue: { retentionDueDate: null, retentionDueStatus: 'missing' } }],
  ['missing-due', { retentionDue: { retentionDueDate: null, retentionDueStatus: 'missing' }, departureDecision: null, retentionReceipt: null }],
  ['pending-due', { retentionDue: { retentionDueDate: '2026-10-31', retentionDueStatus: 'pending' }, departureDecision: null, retentionReceipt: null }],
  ['missing-departure', { departureDecision: null, retentionReceipt: null }],
  ['confirmation-before-receipt', { departureDecision: { decisionSummary: '待确认', confirmationRequirementSummary: '\ufeff 请确认责任承接 \u00a0' }, retentionReceipt: null }],
  ['empty-confirmation-is-ready', { departureDecision: { decisionSummary: '', confirmationRequirementSummary: '\ufeff\u00a0\u3000' } }],
  ['missing-receipt', { retentionReceipt: null }],
  ['review', { gateReviewDecision: ' REVIEW-PENDING ' }], ['block-wins-review', { gateBindingAction: 'review', gateReviewDecision: 'block-risk' }],
  ['custom-review-text', { gateReviewDecision: 'review', gateReviewBlockingReasonCode: '\ufeff custom-code ', gateNextActionSummary: ' 先补依据\u3000' }],
  ['empty-review-text-fallback', { gateReviewDecision: 'review', gateReviewBlockingReasonCode: '\ufeff ', gateNextActionSummary: '\u3000' }],
  ['nonprefix-not-blocked', { gateBindingAction: 'blockade', gateReviewDecision: 'reviewing' }],
  ['unicode-k-lowercase', { gateBindingAction: 'BLOC\u212a', gateReviewDecision: null }],
  ['receipt-string-preserved', { retentionReceipt: { receiptAmount: '000360.0', receiptDate: { $date: '2026-10-29T15:59:59.999Z' } } }],
  ...[0, -0, 1.005, 2.675, -1.005, 1e21].map((number, index) => [`receipt-number-${index}`, { retentionReceipt: { receiptAmount: number, receiptDate: { $date: '2026-10-29T16:00:00.000Z' } } }]),
  ['receipt-nan', { retentionReceipt: { receiptAmount: { $number: 'NaN' }, receiptDate: { $date: '2026-10-29T16:00:00.000Z' } } }],
];
const draftCases = variants.map(([name, patch]) => {
  const input = { ...base, ...patch };
  return { name, input, expected: original.buildRetentionSettlementDraft(materialize(input)) };
});
const result = {
  formatVersion: 1, kind: 'pure-original-settlement-ts-oracle', runtime: process.version,
  sourceHashes: inputs.map((file) => ({ file, rawSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') })),
  sourceImportsExecuted: inputs, ormPgExecuted: false, httpExecuted: false,
  pendingFinalExpected: original.buildPendingFinalRuleExplanation(), dateCases, draftCases,
};
const target = path.join(__dirname, 'settlement_original.json');
if (process.argv.includes('--check')) {
  if (JSON.stringify(JSON.parse(fs.readFileSync(target, 'utf8'))) !== JSON.stringify(result)) throw new Error('Original pure oracle fixture differs');
} else fs.writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ kind: result.kind, runtime: result.runtime, dateCases: dateCases.length, draftCases: draftCases.length, ormPgExecuted: false })}\n`);
