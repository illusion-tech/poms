import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const run = promisify(execFile);
const main = '42b6fc3451eb31042bef80f995c4023eeb6c736b';
const implementation = '874e35fc0af3b6cdf6f6461725eb1343152efbea';
const s4 = '4f0ad88e78622a75b88b4e3cc72aded9da67458a';
const output = 'tools/rust-r4ghi/independent/userfix-final';
const mapFile = 'docs/design/archive/slices/rust-r2-user-create-fix115/origin-map01.json';
const planFile = 'tmp/rust-r4ghi/root/userfix-close-plan01/plan.json';
const planHash = '1d3ca1d09a62410f5329d7fd771e4438e26eedd0a838cb6638e5aa8163ac3b7f';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const pin = file => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const git = (args, input) => { const result = spawnSync('git', args, { input, maxBuffer: 128 * 1024 * 1024 }); assert.equal(result.status, 0, `Read-only Git ${args[0]} failed`); return result.stdout; };
assert.equal(pin(planFile).rawBytesSha256, planHash);
const plan = read(planFile), map = read(mapFile), g3 = read(`${output}/g3-review01.json`), fixed = read(`${output}/fixed-review01.json`);
assert.equal(plan.mainCommit, main); assert.equal(plan.onlyCloseIssue, 115); assert.equal(map.implementationCommit, implementation);
assert.equal(map.entries.length, 259); assert.equal(map.files, 259); assert.equal(map.privatePayloadFilesCopied, 0);
assert.equal(map.originalTemporaryEvidenceDeleted, false); assert.equal(map.GHIActiveLifecycleMoved, false);
assert.equal(pin(mapFile).rawBytesSha256, plan.archiveMapSHA256);
const moved = map.entries.filter(entry => entry.action === 'move-completed-lifecycle');
const copied = map.entries.filter(entry => entry.action === 'copy-public-evidence');
assert.equal(moved.length, 5); assert.equal(copied.length, 254);
assert.equal(new Set(map.entries.map(entry => entry.archive)).size, 259);
for (const ancestor of [implementation, s4]) git(['merge-base', '--is-ancestor', ancestor, main]);
assert.equal(git(['diff', '--name-only', implementation, main, '--', 'apps', 'libs']).length, 0);
const parentMain = git(['rev-parse', 'main']).toString('utf8').trim(); assert.equal(parentMain, main);
assert.equal(git(['-C', 'E:/projects/poms', 'rev-parse', 'HEAD']).toString('utf8').trim(), main);
assert.equal(git(['-C', 'E:/projects/poms', 'status', '--porcelain', '--untracked-files=no']).length, 0);
const remote = Object.fromEntries(git(['ls-remote', '--heads', 'origin', 'main', 'codex/poms-r4ghi-next25']).toString('utf8').trim().split(/\r?\n/).map(line => { const [commit, ref] = line.split(/\s+/); return [ref, commit]; }));
assert.equal(remote['refs/heads/main'], main); assert.equal(remote['refs/heads/codex/poms-r4ghi-next25'], main);
const tested = read('tmp/rust-r4ghi/root/rust-test01/receipt.json').inputs;
const expected = new Map(tested.map(item => [item.file, item]));
for (const entry of map.entries) {
  assert(entry.archive.startsWith('docs/design/archive/slices/rust-r2-user-create-fix115/'));
  assert(!entry.source.split('/').includes('private'));
  expected.set(entry.archive, { file: entry.archive, bytes: entry.bytes, rawBytesSha256: entry.rawBytesSha256 });
  const actual = pin(entry.archive); assert.equal(actual.bytes, entry.bytes); assert.equal(actual.rawBytesSha256, entry.rawBytesSha256);
  if (entry.action === 'copy-public-evidence') {
    assert(entry.source.startsWith('tmp/rust-r4ghi/')); const original = pin(entry.source);
    assert.equal(original.rawBytesSha256, entry.rawBytesSha256); assert.equal(original.bytes, entry.bytes);
  } else {
    assert.equal(fs.existsSync(entry.source), false);
    const original = git(['show', `${implementation}:${entry.source}`]); assert.equal(original.length, entry.bytes); assert.equal(sha(original), entry.rawBytesSha256);
    const absent = spawnSync('git', ['cat-file', '-e', `${main}:${entry.source}`]); assert.notEqual(absent.status, 0);
  }
}
for (const file of [`${output}/g3-review01.json`, `${output}/fixed-review01.json`, `${output}/g1-provenance-correction01.json`, `${output}/history-recovery01/original-baseline-45a614b9.md`, `${output}/history-recovery01/original-manifest-45a614b9.json`, mapFile]) expected.set(file, pin(file));
const paths = [...expected.keys()], batch = git(['cat-file', '--batch'], Buffer.from(paths.map(file => `${main}:${file}\n`).join('')));
let offset = 0;
const verified = paths.map(file => {
  const newline = batch.indexOf(10, offset), header = batch.subarray(offset, newline).toString('utf8').split(' ');
  assert.equal(header[1], 'blob'); const length = Number(header[2]), bytes = batch.subarray(newline + 1, newline + 1 + length); offset = newline + length + 2;
  const wanted = expected.get(file); assert.equal(sha(bytes), wanted.rawBytesSha256); if (wanted.bytes !== undefined) assert.equal(bytes.length, wanted.bytes);
  return { file, gitBlob: header[0], bytes: bytes.length, rawBytesSha256: sha(bytes) };
});
assert.equal(offset, batch.length);
assert.equal(g3.decision, 'Pass'); assert.equal(fixed.decision, 'Pass'); assert.equal(fixed.commit, implementation);
for (const file of ['docs/design/rust-r4ghi/user-decisions02.json', 'docs/design/rust-r4ghi/g0-dependency02.json', 'docs/design/rust-r4ghi/g0-registration01.json']) { assert(fs.existsSync(file)); git(['cat-file', '-e', `${main}:${file}`]); }
const keepOpen = [57, 101, 110, 111, 112, 113, 114, 116, 117];
assert.deepEqual(plan.keepOpen.slice().sort((a, b) => a - b), keepOpen);
assert.deepEqual(plan.updates.map(update => update.number).sort((a, b) => a - b), [57, 115]);
const userUpdate = plan.updates.find(update => update.number === 115), parentUpdate = plan.updates.find(update => update.number === 57);
assert.equal(userUpdate.state, 'closed'); assert.equal(userUpdate.state_reason, 'completed'); assert.equal(parentUpdate.state, 'open');
assert(plan.updates.every(update => typeof update.body === 'string' && typeof update.comment === 'string'));
assert(userUpdate.body.includes('UI有依据N/A') && userUpdate.body.includes('managed零行CAS竞态未另证'));
assert(userUpdate.body.includes('新增HTTP为0') && userUpdate.body.includes('实际线上读回与最终Seal另记'));
const before115 = read('tmp/rust-r4ghi/root/userfix-close-plan01/issue115-original.json');
const before57 = read('tmp/rust-r4ghi/root/userfix-close-plan01/issue57-original.json');
assert.equal(sha(Buffer.from(before115.body)), plan.before['115'].bodySHA256); assert.equal(sha(Buffer.from(before57.body)), plan.before['57'].bodySHA256);
const oldObservation = before57.body.split('\n').find(line => line.startsWith('- [ ] 既有R2补缺：'));
assert(oldObservation && parentUpdate.body.includes(oldObservation));
assert(parentUpdate.body.includes('<details><summary>#115 原始缺陷观察（历史保留）</summary>'));
const active = text => text.replace(/```[\s\S]*?```/g, '');
assert(!active(parentUpdate.body).includes(oldObservation));
assert(active(parentUpdate.body).includes('- [x] 既有R2补缺：'));
const otherChecklist = text => active(text).split('\n').filter(line => /^- \[[ x]\]/.test(line) && !line.includes('既有R2补缺：'));
assert.deepEqual(otherChecklist(before57.body), otherChecklist(parentUpdate.body));
const requested = [...keepOpen, 115];
const snapshots = await Promise.allSettled(requested.map(async number => {
  const response = await run('gh', ['api', `repos/illusion-tech/poms/issues/${number}`, '--jq', '{number,state,body,html_url,updated_at}'], { maxBuffer: 2 * 1024 * 1024 });
  const issue = JSON.parse(response.stdout); assert.equal(issue.state, 'open');
  return { number, state: issue.state, bodySHA256: sha(Buffer.from(issue.body)), url: issue.html_url, updatedAt: issue.updated_at };
}));
snapshots.forEach(result => assert.equal(result.status, 'fulfilled', 'A live issue guard could not be verified'));
const liveIssues = snapshots.map(result => result.value);
for (const number of [57, 115]) assert.equal(liveIssues.find(issue => issue.number === number).bodySHA256, plan.before[String(number)].bodySHA256, 'Concrete close plan became stale');
const parentResponse = await run('gh', ['api', 'repos/illusion-tech/poms/issues/115/parent', '--jq', '{number,state}']);
const actualParent = JSON.parse(parentResponse.stdout); assert.equal(actualParent.number, 57); assert.equal(actualParent.state, 'open');
const result = {
  kind: 'independent-userfix-main-archive-G4-technical-and-preclose-review', capturedAt: new Date().toISOString(), decision: 'Pass',
  issue: 115, mainCommit: main, implementationCommit: implementation,
  mainIntegration: { localMain: parentMain, primaryHead: main, primaryTrackedClean: true, remote, productDiffFromImplementation: [], permanentS4Ancestor: s4, all342UniqueTestedInputsByteIdentical: true },
  rawArchive: { map: pin(mapFile), entries: 259, completedLifecycleMoves: 5, publicEvidenceCopies: 254, privatePayloadCopies: 0, temporaryOriginalsDeleted: false, GHIActiveLifecycleMoved: false, movedLifecycleComparedWithImplementationBlobs: true, allArchiveCurrentFilesAndMainBlobsMatchRawHashes: true, sourceLogicalPathsPreservedByOriginMap: true },
  mainBlobVerification: { count: verified.length, blobs: verified },
  publishedCertificates: { G3: pin(`${output}/g3-review01.json`), fixed: pin(`${output}/fixed-review01.json`), historicalProvenanceAddendum: pin(`${output}/g1-provenance-correction01.json`) },
  precloseApproved: true,
  approvedPlan: { ...pin(planFile), requiredSHA256: planHash, exactMain: main, onlyCloseIssue: 115, allowedBodyUpdates: [57, 115], allowedComments: [57, 115], closeStateReason: 'completed', keepOpen, payloads: plan.updates.map(update => ({ number: update.number, state: update.state, bodySHA256: sha(Buffer.from(update.body)), commentSHA256: sha(Buffer.from(update.comment)) })) },
  actualBeforeExecution: { issues: liveIssues, nativeParent: actualParent },
  historyAndScope: { parentHistoricalObservationPreservedInTextFence: true, parentRepairCheckboxUpdatedToDone: true, otherParentChecklistLinesUnchanged: true, UI: 'N/A, not browser Pass', officialNewOperations: 0, GHIOrMinimumR5G1CertifiedByThisReview: false },
  executionConditions: ['Root alone executes the exact approved plan hash and payload.', 'Revalidate 115/57 before-body SHA and state immediately before each mutation; stale input blocks execution.', 'Close only 115; all keepOpen issues must remain open.', 'Actual body/comment/state readback and final independent G4 plus Seal/main/link verification are still required.'],
  onlineCloseExecutedByReviewer: false, actualOnlineG4FinalCertified: false, finalSealVerified: false,
  independence: { productEdits: false, gitMutations: false, githubMutations: false, databaseConnections: 0, runtimeStarted: false, writableBoundary: 'tools/rust-r4ghi/independent/userfix-final/**' },
};
fs.writeFileSync(`${output}/g4-preclose-review01.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(`${output}/g4-preclose-review01.md`, `# #115 main / 归档及关闭前独立复核\n\n**技术 Pass，precloseApproved 仅限 #115。** main、primary 与远端均为 ${main}；产品相对 874e35fc 无差异，342 个不同受测来源原字节保持一致，永久 S4 仍为祖先。259 映射逐项匹配：5 生命周期移动、254 公件复制，0 private 载荷，原临时证据保留，G/H/I active lifecycle 未移动。G3、fixed 与历史定位更正均已同 main 发布。\n\n仅批准 plan SHA-256 ${planHash} 的精确 payload：更新并关闭 #115（completed），更新/评论 #57 但保持 OPEN，其余 8 个受保护 Issue 继续 OPEN。当前 10 个 Issue 已 live 读取，#115 原生父 #57 及两个旧正文 SHA 均匹配。父项原缺陷观察以 text fence 历史保留，当前修复 checkbox 完成，其他阶段清单不变。\n\nRoot 执行前仍须复核旧正文与状态，变化则中止该计划。本证书不冒称线上已关闭、actual G4 或最终 Seal 通过；执行后另行独立读回。\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ decision: result.decision, precloseApproved: true, scopeOnlyClose: 115, main, archiveEntries: 259, verifiedMainBlobs: verified.length, protectedOpenIssuesVerified: liveIssues.length, planSHA256: planHash, output: `${output}/g4-preclose-review01.json`, rawBytesSha256: sha(fs.readFileSync(`${output}/g4-preclose-review01.json`)) })}\n`);
