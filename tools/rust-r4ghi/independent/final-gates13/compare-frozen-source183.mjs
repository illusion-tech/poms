import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const workspace = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const privateRoot = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function fixed(file, hash) { const b = fs.readFileSync(file); assert.equal(sha(b), hash, file); return JSON.parse(b); }
function privateFS(file) { assert(file.startsWith('/home/wangzishi/.local/share/poms-r4ghi/private/')); return privateRoot + file.slice('/home/wangzishi/.local/share/poms-r4ghi/private/'.length); }
function approvedFS(file) {
  const repoPrefix = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/';
  if (file.startsWith(repoPrefix)) return repoFS(file.slice(repoPrefix.length));
  const userPrefix = '/home/wangzishi/';
  if (file.startsWith(userPrefix)) return '//wsl.localhost/Debian/home/wangzishi/' + file.slice(userPrefix.length);
  return repoFS(file);
}
function repoFS(file) { assert(!path.isAbsolute(file) && !file.split('/').includes('..')); const actual = path.resolve(workspace, file); assert(actual.startsWith(path.resolve(workspace) + path.sep)); return actual; }
function map(values) { const out = new Map(); for (const x of values) { assert(typeof x.file === 'string' && /^[a-f0-9]{64}$/.test(x.sha256)); assert(!out.has(x.file)); out.set(x.file, x.sha256); } return out; }
function compare(before, after) { const b = map(before), a = map(after); return { added: after.filter(x => !b.has(x.file)), modified: after.filter(x => b.has(x.file) && b.get(x.file) !== x.sha256).map(x => ({file:x.file,beforeSHA256:b.get(x.file),afterSHA256:x.sha256})), removed: before.filter(x => !a.has(x.file)), unchanged: after.filter(x => b.get(x.file) === x.sha256) }; }
const frozenState = fixed(privateRoot + 'retention/epoch12-before-source13-139/state-at-retention139.json', 'ee7371dc4fc5d388f6898fb1c6eb90bebb6404eca6c31d23599469445804a628');
const oldSource = fixed(path.join(workspace, 'docs/design/rust-r4ghi/retention/final12-source140/sources.json'), '28a8af77dcad73ee0aba28458c2cdadce4fcd8cff02cc68525f7ee52936b599c');
const zipReadback = JSON.parse(fs.readFileSync(path.join(root, 'producer-codezip-readback183.json'), 'utf8'));
assert.equal(zipReadback.all406RawMembersMatched, true); assert.equal(zipReadback.files.length, 406);
assert.deepEqual(oldSource.files, frozenState.sourcePins);
for (const item of zipReadback.files) assert.equal(map(oldSource.files).get(item.file), item.sha256);
const producerDigest = sha(JSON.stringify(frozenState.sourcePins));
assert.equal(producerDigest, '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa');
const sourceFile = privateRoot + 'source13-preparation183/sourcePins.json';
const after = fixed(sourceFile, 'd4ff63a2010b445a2a4f318c5c8fecc2685c15718b55a310c0a11205921fe76b');
assert.equal(after.length, 416); const consumerDigest = sha(JSON.stringify(after));
assert.equal(consumerDigest, '937a55affa775787d7507b94f3fc425affa9ec700c1aaabf449f564ee8d203fe');
map(after); for (const item of after) assert.equal(sha(fs.readFileSync(repoFS(item.file))), item.sha256, item.file);
const h0 = fixed(privateRoot + 'source13-preparation183/helperH0.json', 'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459');
assert.equal(h0.length, 195); map(h0); for (const item of h0) assert.equal(sha(fs.readFileSync(repoFS(item.file))), item.sha256, item.file);
const retention = fixed(privateRoot + 'retention/epoch12-before-source13-139/index.json', 'fed889a2c467945656d7c317f006b5ba2bc9780435459460863b3735dacb17b7');
const oldHelpers = retention.helperSources.map(item => { assert.equal(sha(fs.readFileSync(privateFS(item.retained.file))), item.retained.rawBytesSha256); assert.equal(item.original.sha256, item.retained.rawBytesSha256); return item.original; });
assert.equal(oldHelpers.length, 180);
const approval = fixed(path.join(workspace, 'docs/design/rust-r4ghi/source13-g2-freeze136.json'), 'f0a8cf9ce22bb032bc28ac599d6ff00946d6013e29084975a265048faa849115');
const freeze = fixed(privateRoot + 'source13-preparation183/freeze183-receipt.json', 'fc4c5111193edcad5daab7319b7153affb324916231f6efed4518ef8bcbecc7e');
assert.equal(approval.actualM98Applied, false); assert.equal(freeze.M98Executed, false); assert.equal(freeze.Source13StateMinted, false);
const supportPins = [...Object.values(approval.supportingTools), ...approval.finalHToolManifests, ...approval.independentReviews, approval.forwardMigration.runner, approval.forwardMigration.node, approval.forwardMigration.migrationTS, approval.forwardMigration.migrationSQL, ...approval.forwardMigration.inputs];
const uniqueSupportPins = supportPins.filter((pin, i) => supportPins.findIndex(other => other.file === pin.file) === i);
for (const pin of uniqueSupportPins) assert.equal(sha(fs.readFileSync(approvedFS(pin.file))), pin.rawBytesSha256, pin.file);
const changes = compare(oldSource.files, after), helperChanges = compare(oldHelpers, h0);
const result = {
  kind:'independent-actual-frozen-code-source-comparison183',
  producerEpoch:'g2-business12', consumerEpoch:'g2-business13',
  producerSourcePinsSHA256:producerDigest, consumerSourcePinsSHA256:consumerDigest,
  producerSourceCount:406, consumerSourceCount:416,
  producerFrozenState:{file:'/home/wangzishi/.local/share/poms-r4ghi/private/retention/epoch12-before-source13-139/state-at-retention139.json',rawBytesSha256:'ee7371dc4fc5d388f6898fb1c6eb90bebb6404eca6c31d23599469445804a628'},
  producerSourceManifest:{file:'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/retention/final12-source140/sources.json',rawBytesSha256:'28a8af77dcad73ee0aba28458c2cdadce4fcd8cff02cc68525f7ee52936b599c'},
  consumerSourcePins:{file:'/home/wangzishi/.local/share/poms-r4ghi/private/source13-preparation183/sourcePins.json',rawBytesSha256:'d4ff63a2010b445a2a4f318c5c8fecc2685c15718b55a310c0a11205921fe76b'},
  approval:{file:'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/source13-g2-freeze136.json',rawBytesSha256:'f0a8cf9ce22bb032bc28ac599d6ff00946d6013e29084975a265048faa849115'},
  freezeReceipt:{file:'/home/wangzishi/.local/share/poms-r4ghi/private/source13-preparation183/freeze183-receipt.json',rawBytesSha256:'fc4c5111193edcad5daab7319b7153affb324916231f6efed4518ef8bcbecc7e'},
  allProducer406ZIPMemberRawHashesVerified:true, allConsumer416CurrentFileRawHashesVerified:true,
  producerCodeZIPReadback:{file:'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/independent/final-gates13/producer-codezip-readback183.json',rawBytesSha256:sha(fs.readFileSync(path.join(root,'producer-codezip-readback183.json')))},
  approvedSupportingReviewRunnerNodeAnd98MigrationPinsVerified:uniqueSupportPins,
  files:changes,
  helpers:{beforeRetainedSourcesAndLaunchersCount:180,afterFrozenH0Count:195,oldRetainedCopiesAllHashed:true,afterAllCurrentH0FilesHashed:true,helperH0:{file:'/home/wangzishi/.local/share/poms-r4ghi/private/source13-preparation183/helperH0.json',rawBytesSha256:'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459'},comparisonUniverse:'before retained helper+launcher set versus after frozen H0; counts are not product sourceCount',removedMeans:'Absent from after H0 selection only; not filesystem deletion, cleanup, or lost historical evidence. API launcher is independently pinned by frozen approval.',files:helperChanges},
  actualRuntimeOrSchemaComparisonIncluded:false,
  schemaChange:'M98 is approved planned only at this freeze; actual after/B0/schema3 are not observed here',
  actualM98Receipt:null, actualAfterSchema:null, actualB0:null, actualSource13State:null,
  currentConsumerCertificationGranted:false, retainHistoricalLabels:true,
  G3Certified:false, G4Certified:false, newCertifiedOperations:0,
};
fs.writeFileSync(path.join(root, 'source-comparison183.json'), JSON.stringify(result, null, 2)+'\n');
process.stdout.write(JSON.stringify({sourceCounts:[406,416],digests:[producerDigest,consumerDigest],sourceChanges:{added:changes.added,modified:changes.modified,removed:changes.removed,unchangedCount:changes.unchanged.length},helperChanges:{added:helperChanges.added,modified:helperChanges.modified,removed:helperChanges.removed,unchangedCount:helperChanges.unchanged.length},runtimeAndSchemaCertified:false})+'\n');
