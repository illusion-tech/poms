import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const lock = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business10/main01/driver.lock';
assert(!fs.existsSync(lock));
const corrections = [
  { file: 'tools/rust-r4ghi/business/operating.mjs', before: 'e0f4b32fb3a04e1ddaa024c70c40e892765f2ad3308cd4314fc9ccfc9a575695',
    from: "{ responseBirths: [{ table: 'commission_gate_review_record', pointer: '/reviewRecordId' }]",
    to: "{ responseBirths: [{ table: 'commission_gate_review_record', pointer: '/gateReviewRecordId' }]" },
  { file: 'tools/rust-r4ghi/business/fault-sweep.mjs', before: '7bd3b8c29cf83a31a77f145a57679dca242838676f206f9a3815daf5a93df7f5',
    from: 'assertPeriodSweepPolicy(descriptor.operationId, descriptor.scope.body);',
    to: 'assertPeriodSweepPolicy(descriptor.operationId, descriptor.scope.body, ctx);' },
];
const out = 'tools/rust-r4ghi/root-proposals/tool-correction41';
assert(!fs.existsSync(out));
const changes = corrections.map(item => {
  const bytes = fs.readFileSync(item.file); assert.equal(sha(bytes), item.before);
  const text = bytes.toString('utf8'); assert.equal(text.split(item.from).length, 2);
  return { item, bytes, after: Buffer.from(text.replace(item.from, item.to)) };
});
fs.mkdirSync(out, { recursive: true });
for (const { item, bytes, after } of changes) {
  fs.writeFileSync(`${out}/${item.file.split('/').at(-1)}.before.bin`, bytes, { flag: 'wx' });
  fs.writeFileSync(item.file, after);
}
fs.writeFileSync('docs/design/rust-r4ghi/business-tool-correction41.json', JSON.stringify({
  kind: 'independently-reviewed-tool-only-correction-after-real-observation', classification: 'tool-noise',
  corrections: changes.map(({ item, after }) => ({ ...item, after: sha(after), original: `${out}/${item.file.split('/').at(-1)}.before.bin` })),
  review: [
    'Independent reviewer verified ReviewCommissionGateBindingResult and query.rs: targetId/bindingResultId are the binding; gateReviewRecordId is the new review record',
    'Signal review retains its separate reviewRecordId; the generic ownership verifier is unchanged',
    'Period installation receives the same real context already required by the approved decision/source guard; authority is not widened',
  ],
  originalHTTP: 'g2-business10/main01/001047-http', originalFailedLedger: 'g2-business10/main01/001048-ledger.json',
  committedBusinessCommandMustNotBeReplayed: true, sourceEpochChanged: false, businessProductCodeChanged: false,
  periodPositiveExecuted: false, metadataRecoveryExecuted: false, G3Certified: false, G4Certified: false,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ correctedToolFiles: 2, productCodeChanged: false, genericOwnershipGuardChanged: false, metadataRecoveryStillPending: true }));
