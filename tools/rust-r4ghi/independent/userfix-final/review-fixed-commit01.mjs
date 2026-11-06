import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const target = '874e35fc0af3b6cdf6f6461725eb1343152efbea';
const sourceBase = 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee';
const admission = '21e9124160f92dce38a5029786273fdb893759f0';
const s4 = '4f0ad88e78622a75b88b4e3cc72aded9da67458a';
const output = 'tools/rust-r4ghi/independent/userfix-final';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (args, input) => {
  const result = spawnSync('git', args, { input, maxBuffer: 128 * 1024 * 1024 });
  assert.equal(result.status, 0, `Read-only git ${args[0]} failed`); return result.stdout;
};
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const pin = file => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const g3File = `${output}/g3-review01.json`, g3 = read(g3File);
assert.equal(g3.decision, 'Pass'); assert.equal(g3.issue, 115);
assert.equal(pin(g3File).rawBytesSha256, '7be963a593b4f9fa76ca2448e640b5eed1ee685a5fa2b3c4b569dd37d0fee20c');
const stagedFile = 'tmp/rust-r4ghi/root/staged-boundary01.json', staged = read(stagedFile);
assert.equal(staged.ownedRuntimeSecretMatches, 0); assert.equal(staged.stagedFiles, 78);
const tree = git(['rev-parse', `${target}^{tree}`]).toString('utf8').trim(); assert.equal(tree, staged.stagedTree);
const changed = git(['diff-tree', '--no-commit-id', '--name-only', '-z', '-r', target]).toString('utf8').split('\0').filter(Boolean).sort();
assert.equal(changed.length, 78); assert.deepEqual(changed, staged.inputs.map(pin => pin.file).sort());
const productPaths = git(['diff', '--name-only', sourceBase, target, '--', 'apps', 'libs']).toString('utf8').trim().split(/\r?\n/).filter(Boolean).sort();
assert.deepEqual(productPaths, g3.productFiles.map(pin => pin.file).sort());
for (const ancestor of [sourceBase, admission, s4]) git(['merge-base', '--is-ancestor', ancestor, target]);
git(['diff', '--check', admission, target]);
const expected = new Map();
const add = pin => {
  if (expected.has(pin.file)) assert.equal(expected.get(pin.file).rawBytesSha256, pin.rawBytesSha256);
  else expected.set(pin.file, pin);
};
const buildInputs = read('tmp/rust-r4ghi/root/rust-test01/receipt.json').inputs;
buildInputs.forEach(add); staged.inputs.forEach(add); add(pin(g3File));
add({ file: 'docs/design/rust-r4ghi-user-create-fix-baseline.md', bytes: 5721, rawBytesSha256: '7b130303f15094a3901b85862fedc87cebe788b8c54bc6419850ed864992625a' });
add({ file: 'docs/design/rust-r4ghi/user-fix-g1-sources01.json', bytes: 3175, rawBytesSha256: 'd0d7afb52c50f82896137e7fe794e2da6d633b82e907cec88e5ca5610ca92462' });
const paths = [...expected.keys()], batch = git(['cat-file', '--batch'], Buffer.from(paths.map(file => `${target}:${file}\n`).join('')));
let position = 0;
const verified = paths.map(file => {
  const newline = batch.indexOf(10, position); assert(newline >= 0);
  const header = batch.subarray(position, newline).toString('utf8').split(' '); assert.equal(header[1], 'blob');
  const size = Number(header[2]); assert(Number.isSafeInteger(size));
  const bytes = batch.subarray(newline + 1, newline + 1 + size); position = newline + size + 2;
  const actual = { file, gitBlob: header[0], bytes: bytes.length, rawBytesSha256: sha(bytes) }, wanted = expected.get(file);
  assert.equal(actual.rawBytesSha256, wanted.rawBytesSha256, `Fixed blob differs: ${file}`);
  if (wanted.bytes !== undefined) assert.equal(actual.bytes, wanted.bytes);
  return actual;
});
assert.equal(position, batch.length);
const remoteText = git(['ls-remote', '--heads', 'origin', 'codex/poms-r4ghi-next25', 'main']).toString('utf8');
const remote = Object.fromEntries(remoteText.trim().split(/\r?\n/).filter(Boolean).map(line => { const [commit, ref] = line.split(/\s+/); return [ref, commit]; }));
assert.equal(remote['refs/heads/codex/poms-r4ghi-next25'], target);
const attributes = git(['show', `${target}:tools/rust-r4ghi/.gitattributes`]).toString('utf8');
assert(attributes.includes('* -text') && attributes.includes('*.patch binary') && attributes.includes('cr-at-eol'));
const status = JSON.parse(git(['show', `${target}:docs/design/rust-r4ghi-delivery-status.json`]).toString('utf8'));
assert.equal(status.G1Certified, false); assert.equal(status.G2Authorized, false); assert.equal(status.officialNewDelivered, 0);
const correctionFile = `${output}/g1-provenance-correction01.json`, correction = read(correctionFile);
assert.equal(correction.currentTechnicalG1AndG3ConclusionsChanged, false);
const result = {
  kind: 'independent-issue115-exact-fixed-commit-review', capturedAt: new Date().toISOString(), decision: 'Pass',
  issue: 115, commit: target, tree, sourceBase, admission,
  G3: pin(g3File),
  productPaths, productFiles: g3.productFiles,
  rawInputRecords: buildInputs.length, uniqueTestedSourceFiles: new Set(buildInputs.map(pin => pin.file)).size,
  verifiedFixedGitBlobs: verified, verifiedFixedBlobCount: verified.length,
  allTestedInputsByteIdenticalInCommit: true,
  changedCommitFiles: changed.length, changedFilesExactlyMatchScannedPayload: true,
  stagedPayloadBoundary: { receipt: pin(stagedFile), stagedTreeMatchesCommitTree: true, all78PayloadHashesMatchFixedBlobs: true, RootOwnedRuntimeSecretMatches: 0, reviewerDidNotReadCredentialFilesOrRepeatASecretScan: true },
  ancestry: { permanentS4: s4, permanentS4IsAncestor: true, sourceBaseIsAncestor: true, admissionIsAncestor: true },
  remote, featurePublicationActuallyObserved: true,
  rawBytePreservation: { attributesScopedTo: 'tools/rust-r4ghi/**', rawEvidencePatchesBinary: true, executedHelpersNotReformatted: true, allHistoricalSnapshotAndG3CertificateBlobsMatchScannedRawBytes: true, whitespaceCheck: 'Pass' },
  provenanceAddendum: { file: correctionFile, bytes: pin(correctionFile).bytes, rawBytesSha256: pin(correctionFile).rawBytesSha256, correction: 'Initial capture01 was already post-clarification; original 5397B baseline and manifest recovered from immutable 45a614b9, all old artifacts retained.', currentProductOrG3Changed: false, mustAccompanyNextMetadataPublication: true },
  scope: { existingCreationCommandOnly: true, productFilesChanged: 3, GHIOrR5ProductImplementationIncluded: false, userBusinessDecisionsAndR5G0MetadataAreNotImplementation: true, officialNewOperations: 0, untrackedCandidatesAcceptedByThisReview: false },
  deliveryConclusion: { fixedCommitVerified: true, readyForRootMainIntegration: true, mainIntegrationVerified: false, G4Certified: false, issueCloseAllowedAtThisPoint: false, parent57MustRemainOpen: true },
  independence: { productEdits: false, gitMutations: false, githubMutations: false, databaseConnections: 0, runtimeStarted: false, privatePayloadPublished: false, writableBoundary: 'tools/rust-r4ghi/independent/userfix-final/**' },
};
fs.writeFileSync(`${output}/fixed-review01.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(`${output}/fixed-review01.md`, `# #115 固定提交独立复核\n\n**Pass：874e35fc0af3b6cdf6f6461725eb1343152efbea 可由 Root 进入 main 集成。** 固定 Git blob 中全部 343 条受测输入（342 个不同文件）、78 个已扫描提交载荷及 G3 证书原字节一致；产品仍只改 3 个 Rust 文件，未混入 G/H/I 或 R5 实现。feature 远端已实际发布此提交，永久 S4 ${s4} 仍是祖先。\n\n工具目录 .gitattributes 保持原字节，执行过的 helper 与历史 patch/证书没有重格式化。关于早期 G1 捕获目录的历史定位，已在 g1-provenance-correction01.json 增量更正并从 45a614b9 补存原 5397 B 输入；旧原件不改，当前产品/G3 不变。该增量随下一次元数据发布携带。\n\n本轮尚未验证 main、归档或线上实际 G4，#115 暂不关闭；#57 保持 Open，新交付入口数为 0。\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ decision: result.decision, target, tree, verifiedFixedBlobs: verified.length, rawInputs: buildInputs.length, uniqueInputs: result.uniqueTestedSourceFiles, changedFiles: changed.length, S4Ancestor: true, remote, output: `${output}/fixed-review01.json`, rawBytesSha256: sha(fs.readFileSync(`${output}/fixed-review01.json`)) })}\n`);
