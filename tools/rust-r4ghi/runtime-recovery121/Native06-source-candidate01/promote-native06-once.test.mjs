// Pure signature/approval tests only. No main/mode, Native, Root/P or proc reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { F06, fixedPins06, inputKeys06, limits06, inputShape06, pinShape06,
  rootApprovalBody06, peerApproval06, cli06, errorSummary06, executionEnvironmentShape06 } from './promote-native06-once.mjs';
const pin = (file, hash = 'a'.repeat(64)) => ({ file, bytes: 1, rawBytesSha256: hash });
const nonce = '1ac2c802-9db2-498b-8fe7-c48a716ba890';
function fixture() {
  return { kind: 'Root-runtime121-single-Native-source-promotion-input', protocolVersion: 1,
    nonce, plan: structuredClone(fixedPins06.plan), NativeCodeReview: pin('/synthetic/nonactual-Native-review.json'),
    Root8CodeReview: structuredClone(fixedPins06.Root8Review), statusBookends: structuredClone(fixedPins06.bookends),
    operator: pin(F06.R + '/tools/rust-r4ghi/runtime-recovery121/promote-native06-once.mjs'),
    outputDirectory: F06.P + '/runtime121-native06-source-promotion/' + nonce,
    basePromotion: structuredClone(fixedPins06.promotion), baseReadback: structuredClone(fixedPins06.priorReadback) };
}
const inputPin = pin('/synthetic/nonactual-input.json'), approvalPin = pin('/synthetic/nonactual-Root-approval.json');
function peer(v) {
  return { kind: 'non-author-runtime121-single-Native-source-safety-review',
    verdict: 'approved-once-single-Native-FS-promotion', author: 'Root', reviewer: 'independent-test-reviewer',
    reviewerIsAuthor: false, approvedInput: inputPin, expectedRootApproval: approvalPin,
    operator: v.operator, limits: limits06 };
}
test('closed11 input signature accepts nonactual model without reading files', () => {
  const v = fixture(); assert.deepEqual(Object.keys(v).sort(), [...inputKeys06].sort()); assert.equal(inputShape06(v), v);
});
test('null future Native review blocks input', () => { const v = fixture(); v.NativeCodeReview = null; assert.throws(() => inputShape06(v)); });
test('null future operator blocks input', () => { const v = fixture(); v.operator = null; assert.throws(() => inputShape06(v)); });
test('unknown target override key is rejected', () => { const v = fixture(); v.target = '/arbitrary'; assert.throws(() => inputShape06(v)); });
test('other operator path is rejected', () => { const v = fixture(); v.operator.file += '.other'; assert.throws(() => inputShape06(v)); });
test('output outside exact new nonce is rejected', () => { const v = fixture(); v.outputDirectory += '-other'; assert.throws(() => inputShape06(v)); });
test('non-v4 nonce is rejected', () => { const v = fixture(); v.nonce = 'consumed-old33'; assert.throws(() => inputShape06(v)); });
test('old plan hash cannot silently replace fixed Native06 plan', () => { const v = fixture(); v.plan.rawBytesSha256 = '0'.repeat(64); assert.throws(() => inputShape06(v)); });
test('old Root8 code-step cannot authorize corrected starter', () => { const v = fixture(); v.Root8CodeReview.rawBytesSha256 = '0'.repeat(64); assert.throws(() => inputShape06(v)); });
test('lexical pin alias is rejected', () => assert.throws(() => pinShape06(pin('/synthetic/a/../b'))));
test('extra pin fields are rejected', () => assert.throws(() => pinShape06({ ...inputPin, allow: true })));
test('Root approval body has exactly12 keys and fixed target/hashes', () => {
  const b = rootApprovalBody06(fixture(), inputPin); assert.equal(Object.keys(b).length, 12);
  assert.equal(b.copyTarget, F06.R + '/' + F06.target); assert.equal(b.beforeSHA256, F06.before); assert.equal(b.afterSHA256, F06.after);
  assert.deepEqual(b.limits, limits06); assert(!Object.hasOwn(fixture(), 'RootApproval'));
});
test('peer model binds whole input/operator/approval', () => { const v = fixture(); peerApproval06(peer(v), v, inputPin, approvalPin); });
test('peer self-author statement is rejected', () => { const v = fixture(), p = peer(v); p.reviewerIsAuthor = true; assert.throws(() => peerApproval06(p, v, inputPin, approvalPin)); });
test('peer input mismatch is rejected', () => { const v = fixture(), p = peer(v); p.approvedInput = pin('/synthetic/other'); assert.throws(() => peerApproval06(p, v, inputPin, approvalPin)); });
test('peer wrong approval bytes are rejected', () => { const v = fixture(), p = peer(v); p.expectedRootApproval = { ...approvalPin, bytes: 2 }; assert.throws(() => peerApproval06(p, v, inputPin, approvalPin)); });
test('peer arbitrary extra effect bit cannot widen fixed limits', () => { const v = fixture(), p = peer(v); p.limits = { ...limits06, APIOrProcessControl: true }; assert.throws(() => peerApproval06(p, v, inputPin, approvalPin)); });
test('CLI requires exact six pairs plus explicit execute', () => {
  const v = ['--input', '/synthetic/i', '--input-sha', 'a'.repeat(64), '--peer-review', '/synthetic/r', '--peer-review-sha', 'b'.repeat(64), '--root-approval', '/synthetic/a', '--root-approval-sha', 'c'.repeat(64), '--execute'];
  assert.equal(Object.keys(cli06(v)).length, 6); assert.throws(() => cli06(v.slice(0, -1)));
  const bad = [...v]; bad[0] = '--target'; assert.throws(() => cli06(bad));
  const duplicate = [...v]; duplicate[2] = '--input'; assert.throws(() => cli06(duplicate));
});
test('failures never publish original assertion text or arbitrary code', () => {
  const e = Object.assign(new Error('dummy-private-state-value'), { code: 'dummy-private-code' });
  const v = errorSummary06(e); assert(!JSON.stringify(v).includes('dummy-private'));
  assert.deepEqual(errorSummary06({ name: 'AssertionError', code: 'ERR_ASSERTION', message: 'dummy-private' }), {
    message: 'Single Native promotion stopped; preserve evidence and do not retry.', name: 'AssertionError', code: 'ERR_ASSERTION',
  });
});
test('environment model accepts only fixed Node/Root/uid without optional Node flags', () => {
  const good = { platform: 'linux', nodeVersion: 'v24.19.0', execPath: fixedPins06.node.file,
    uid: 1000, cwd: F06.R, execArgv: [], NODE_OPTIONS: undefined, NODE_PATH: '' };
  executionEnvironmentShape06(good);
  for (const [k, value] of [['platform', 'win32'], ['nodeVersion', 'v24.18.0'], ['execPath', '/other/node'],
    ['uid', 0], ['cwd', '/other/root'], ['execArgv', ['--inspect']], ['NODE_OPTIONS', '--require=other'], ['NODE_PATH', '/other']]) {
    assert.throws(() => executionEnvironmentShape06({ ...good, [k]: value }));
  }
});
