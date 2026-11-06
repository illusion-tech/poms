import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const run = promisify(execFile);
const output = 'tools/rust-r4ghi/independent/userfix-final';
const folder = 'tmp/rust-r4ghi/root/userfix-online01';
const planFile = 'tmp/rust-r4ghi/root/userfix-close-plan01/plan.json';
const receiptFile = `${folder}/receipt.json`;
const main = '42b6fc3451eb31042bef80f995c4023eeb6c736b';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const pin = file => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const plan = read(planFile), receipt = read(receiptFile), approval = read(`${output}/g4-preclose-review01.json`);
assert.equal(pin(planFile).rawBytesSha256, '1d3ca1d09a62410f5329d7fd771e4438e26eedd0a838cb6638e5aa8163ac3b7f');
assert.equal(pin(`${output}/g4-preclose-review01.json`).rawBytesSha256, 'ff21f1e621cc436ad517cb58e0f87a73d2f18a3ac8510c226eeb15c7acdd26bd');
assert(approval.precloseApproved); assert.equal(receipt.plan.rawBytesSha256, pin(planFile).rawBytesSha256);
assert.equal(receipt.mainCommit, main); assert.deepEqual(receipt.closed, [115]); assert.deepEqual(receipt.keptOpen, plan.keepOpen);
assert.equal(receipt.calls.length, 31);
const outputs = new Map();
const callChecks = receipt.calls.map(call => {
  const observed = pin(call.stdout); assert.equal(observed.rawBytesSha256, call.rawBytesSha256); assert.equal(call.exitCode, 0);
  assert.equal(fs.statSync(call.stdout.replace('-stdout.json', '-stderr.bin')).size, 0);
  outputs.set(call.label, read(call.stdout));
  return { label: call.label, method: call.method, endpoint: call.endpoint, exitCode: call.exitCode, stdout: observed };
});
const writes = receipt.calls.filter(call => call.method !== 'GET');
assert.deepEqual(writes.map(call => `${call.method} ${call.endpoint}`), [
  'PATCH repos/illusion-tech/poms/issues/115',
  'POST repos/illusion-tech/poms/issues/115/comments',
  'PATCH repos/illusion-tech/poms/issues/57',
  'POST repos/illusion-tech/poms/issues/57/comments',
]);
assert.equal(outputs.get('main-before').object.sha, main);
const expectedPayloads = [];
for (const update of plan.updates) {
  const cas = outputs.get(`cas-${update.number}`), before = plan.before[String(update.number)];
  assert.equal(cas.state, before.state); assert.equal(sha(Buffer.from(cas.body)), before.bodySHA256);
  const call = receipt.calls.find(call => call.label === `update-${update.number}`);
  const request = read(call.stdout.replace('-stdout.json', '-input.json'));
  assert.equal(request.body, update.body, 'Issue body differs from approved payload');
  if (update.number === 115) {
    assert.deepEqual(Object.keys(request).sort(), ['body', 'state', 'state_reason']);
    assert.equal(request.state, 'closed'); assert.equal(request.state_reason, 'completed');
  } else {
    // The approved parent must remain open; omitting its unchanged state is a
    // narrower write than sending state=open, with before/after guards below.
    assert.deepEqual(Object.keys(request), ['body']);
    assert.equal(cas.state, 'open');
  }
  const commentCall = receipt.calls.find(call => call.label === `comment-${update.number}`);
  assert.deepEqual(read(commentCall.stdout.replace('-stdout.json', '-input.json')), { body: update.comment });
  const actualIssue = outputs.get(`readback-${update.number}`), actualComment = outputs.get(`comment-readback-${update.number}`);
  assert.equal(actualIssue.body, update.body); assert.equal(actualIssue.state, update.state);
  if (update.number === 115) assert.equal(actualIssue.state_reason, 'completed');
  assert.equal(actualComment.body, update.comment);
  const id = receipt.comments.find(comment => comment.number === update.number); assert.equal(actualComment.id, id.id); assert.equal(actualComment.html_url, id.url);
  expectedPayloads.push({ number: update.number, state: update.state, stateReason: actualIssue.state_reason, bodySHA256: sha(Buffer.from(update.body)), commentId: actualComment.id, commentURL: actualComment.html_url, commentSHA256: sha(Buffer.from(update.comment)) });
}
for (const number of plan.keepOpen) {
  const after = outputs.get(`state-after-${number}`); assert.equal(after.state, 'open');
  if (number !== 57) assert.equal(after.body, outputs.get(`state-before-${number}`).body);
}
const tree = outputs.get('parent-tree'); assert(Array.isArray(tree)); assert(tree.some(issue => issue.number === 115 && issue.state === 'closed'));
const queries = [
  ...[115, ...plan.keepOpen].map(number => ({ key: `issue-${number}`, endpoint: `repos/illusion-tech/poms/issues/${number}`, projection: '{number,state,state_reason,body,html_url,updated_at}' })),
  ...receipt.comments.map(comment => ({ key: `comment-${comment.number}`, endpoint: `repos/illusion-tech/poms/issues/comments/${comment.id}`, projection: '{id,body,html_url,issue_url}' })),
  { key: 'parent', endpoint: 'repos/illusion-tech/poms/issues/115/parent', projection: '{number,state}' },
  { key: 'main', endpoint: 'repos/illusion-tech/poms/git/ref/heads/main', projection: '{ref,object}' },
];
const observations = await Promise.allSettled(queries.map(async query => {
  const response = await run('gh', ['api', query.endpoint, '--jq', query.projection], { maxBuffer: 2 * 1024 * 1024 });
  return { key: query.key, value: JSON.parse(response.stdout) };
}));
observations.forEach(result => assert.equal(result.status, 'fulfilled', 'Live online closure readback failed'));
const live = new Map(observations.map(result => [result.value.key, result.value.value]));
assert.equal(live.get('main').object.sha, main); assert.equal(live.get('parent').number, 57); assert.equal(live.get('parent').state, 'open');
for (const update of plan.updates) {
  assert.equal(live.get(`issue-${update.number}`).state, update.state); assert.equal(live.get(`issue-${update.number}`).body, update.body);
  assert.equal(live.get(`comment-${update.number}`).body, update.comment);
}
assert.equal(live.get('issue-115').state_reason, 'completed');
for (const number of plan.keepOpen) assert.equal(live.get(`issue-${number}`).state, 'open');
const git = (...args) => { const result = spawnSync('git', args, { encoding: 'utf8' }); assert.equal(result.status, 0); return result.stdout.trim(); };
assert.equal(git('rev-parse', 'main'), main);
assert.equal(git('diff', '--name-only', '874e35fc0af3b6cdf6f6461725eb1343152efbea', main, '--', 'apps', 'libs'), '');
const result = {
  kind: 'independent-issue115-actual-online-G4-final-review', gate: 'G4', decision: 'Pass', signedAt: new Date().toISOString(),
  issue: 115, parentIssue: 57, implementationCommit: '874e35fc0af3b6cdf6f6461725eb1343152efbea', verifiedMainBeforeSeal: main,
  G4Certified: true, actualOnlineG4Certified: true, openP0P1P2: 0,
  approvedPlan: pin(planFile), precloseReview: pin(`${output}/g4-preclose-review01.json`), actualRootReceipt: pin(receiptFile),
  actualCalls: callChecks,
  exactMutationScope: { calls: 31, writes: 4, issueBodyUpdates: [115, 57], issueComments: [115, 57], closedOnly: [115], stateReason115: 'completed', keptOpen: plan.keepOpen, exactApprovedPayloads: expectedPayloads, parentStateFieldNotWrittenAndActualStateStayedOpen: true, beforeBodyHashesAndOpenStatesRevalidatedBeforeWrites: true, unapprovedIssueMutationObserved: false },
  independentLiveReadback: { capturedAt: new Date().toISOString(), issues: [115, ...plan.keepOpen].map(number => { const value = live.get(`issue-${number}`); return { number, state: value.state, stateReason: value.state_reason, bodySHA256: sha(Buffer.from(value.body)), url: value.html_url, updatedAt: value.updated_at }; }), comments: receipt.comments.map(comment => { const value = live.get(`comment-${comment.number}`); return { number: comment.number, id: value.id, url: value.html_url, bodySHA256: sha(Buffer.from(value.body)) }; }), nativeParent57: true, mainRef: live.get('main').object.sha },
  carriedForwardAlreadyCertifiedEvidence: { G3: pin(`${output}/g3-review01.json`), fixedCommit: pin(`${output}/fixed-review01.json`), mainArchiveTechnicalReview: pin(`${output}/g4-preclose-review01.json`), productOrDatabaseTestsRerun: false, reason: 'No product delta since certified implementation; this task verifies only new publication/closure evidence.' },
  historicalBoundary: { originalDefectObservationRemainsFencedHistory: true, parentOtherStageChecklistsRemainOpen: true, UI: 'N/A, no browser pass', independentPriorRawAuthTouchMayCommit: true, ignoredAndToolFailuresRetainLabels: true, officialNewOperations: 0, GHIOrMinimumR5JointG1CertifiedByThisReview: false },
  metadataSeal: { authorized: true, scope: 'Publish the actual #115 G4 certificate, readback originals and archive/current status/link metadata only; no product or GHI implementation changes.', requiredStatus: 'independentUserFix accepted=true, G4Certified=true, stage=Done with exact certificate/main/online references; preserve GHI G1Preparing and new-operation counts.', finalSealVerified: false, finalStatusAndLinksReadbackRequired: true, noAdditionalIssueClosureAuthorized: true },
  verifierClarification: 'Initial verifier expected an unnecessary explicit parent state=open field. Actual parent PATCH only writes its approved body; unchanged open state is guarded before and after. This narrower write satisfies the approved plan and is not a product or online-scope failure.',
  independence: { gitMutations: false, githubMutations: false, productEdits: false, databaseConnections: 0, runtimeStarted: false, writableBoundary: 'tools/rust-r4ghi/independent/userfix-final/**' },
};
fs.writeFileSync(`${output}/g4-actual-review01.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(`${output}/g4-actual-review01.md`, '# #115 实际线上 G4 独立终审\n\n**Pass，G4Certified=true，仅限 #115。** 已核 Root 31 次实际请求及原字节回执，只有 4 个写请求：#115/#57 的精确正文更新和各一条评论。#115 实际 CLOSED/completed；#57 与其余 8 个受保护 Issue 实际 OPEN，原生父 #57 保留。独立 live 正文、评论、状态和 main 读回均匹配唯一批准计划。\n\n产品仍是 874e35fc 的 3 个 Rust 文件；main/归档、G3、fixed、清理与停止沿用已签原件，无须重跑产品或 DB。UI N/A、前置 raw touch、历史 ignored/工具失败和新增操作 0 的边界不变。\n\n允许 Root 发布本证书及 #115 状态/当前链接的 metadata Seal；最终 Seal/main/当前状态链接还需独立读回。本证书不批准其他 Issue 关闭，也不认证 G/H/I 或最小 R5 的联合 G1。\n', { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ decision: result.decision, G4Certified: true, closedOnly: [115], protectedOpen: plan.keepOpen.length, verifiedOriginalCalls: callChecks.length, metadataSealAuthorized: true, finalSealVerified: false, output: `${output}/g4-actual-review01.json`, rawBytesSha256: sha(fs.readFileSync(`${output}/g4-actual-review01.json`)) })}\n`);
