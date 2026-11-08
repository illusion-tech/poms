import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const review = JSON.parse(fs.readFileSync(path.join(root, 'impact-review62-183.json'), 'utf8'));
const repo = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/';
const user = '/home/wangzishi/';
function host(file) {
  assert(path.posix.isAbsolute(file));
  if (file.startsWith(repo)) return 'E:/projects/worktrees/poms-r3hijk-next28/poms/' + file.slice(repo.length);
  assert(file.startsWith(user)); return '//wsl.localhost/Debian/home/wangzishi/' + file.slice(user.length);
}
function pin(value) {
  assert(value && /^[a-f0-9]{64}$/.test(value.rawBytesSha256));
  const file = host(value.file), stat = fs.lstatSync(file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
  assert.equal(fs.realpathSync(file), path.resolve(file));
  assert.equal(sha(fs.readFileSync(file)), value.rawBytesSha256);
}
assert.equal(review.kind, 'approved-retained-evidence-impact-review62');
assert.equal(review.producerEpoch, 'g2-business12'); assert.equal(review.consumerEpoch, 'g2-business13');
assert.equal(review.producerSourcePinsSHA256, '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa');
assert.equal(review.consumerSourcePinsSHA256, '937a55affa775787d7507b94f3fc425affa9ec700c1aaabf449f564ee8d203fe');
assert.equal(review.retainHistoricalLabels, true); assert.equal(review.currentConsumerCertificationGranted, false);
assert(typeof review.reviewer === 'string' && review.reviewer.trim()); pin(review.sourceComparisonReceipt);
assert(Array.isArray(review.evidenceGroups) && review.evidenceGroups.length === 18);
for (const group of review.evidenceGroups) {
  assert.equal(group.producerEpoch, review.producerEpoch);
  assert.equal(group.use, 'historical-by-impact-review');
  assert.equal(group.certifiesCurrentConsumerExecution, false); pin(group.receipt);
}
for (const key of ['actualM98Receipt','actualAfterSchema','actualB0','actualSource13State']) assert.equal(review[key], null);
assert.equal(review.G3Certified, false); assert.equal(review.G4Certified, false);
const result = { kind:'independent-impact-required-format-and-mapped-pin-readback183', reviewer:review.reviewer, requiredFieldsAnd18GroupsMatchedCurrentReadContract:true, all19ReceiptPinsRawSHAFileSingleLinkNonSymlinkRealpathCheckedOnReadHost:true, invokedRootValidator:false, linuxExecutionValidatorOrSchemaAdmissionExecuted:false, currentConsumerCertificationGranted:false, actualM98Receipt:null, actualB0:null, G3Certified:false, G4Certified:false };
fs.writeFileSync(path.join(root,'impact-format-readback183.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify(result)+'\n');
