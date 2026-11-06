import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const output = 'tools/rust-r4ghi/independent/userfix-final';
const originalCommit = '45a614b9ae87e9cb6e59fe0ab8a5a06bb0e628b1';
const fixedCommit = '874e35fc0af3b6cdf6f6461725eb1343152efbea';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = (commit, file) => { const result = spawnSync('git', ['show', `${commit}:${file}`], { maxBuffer: 8 * 1024 * 1024 }); assert.equal(result.status, 0); return result.stdout; };
const baseline = gitBlob(originalCommit, 'docs/design/rust-r4ghi-user-create-fix-baseline.md');
const manifest = gitBlob(originalCommit, 'docs/design/rust-r4ghi/user-fix-g1-sources01.json');
assert.equal(baseline.length, 5397); assert.equal(sha(baseline), 'bfda5463c4b6ced81efe43b9c82d9a880ecc3d7158ad0f4f9b93ae62b77d406a');
const old = JSON.parse(manifest.toString('utf8'));
assert.equal(old.baseline.rawBytesSha256, sha(baseline)); assert.equal(old.sources.length, 14);
const captured = JSON.parse(gitBlob(fixedCommit, 'tools/rust-r4ghi/independent/g1-user-fix01/pin-verification.json').toString('utf8'));
assert.equal(captured.headBefore, '21e9124160f92dce38a5029786273fdb893759f0');
assert.equal(captured.baseline.actual.bytes, 5721);
const corrected = JSON.parse(gitBlob(fixedCommit, 'tools/rust-r4ghi/independent/g1-user-fix02/source-manifest-observed.json').toString('utf8'));
assert.deepEqual(old.sources, corrected.sources);
fs.mkdirSync(`${output}/history-recovery01`, { recursive: true });
fs.writeFileSync(`${output}/history-recovery01/original-baseline-45a614b9.md`, baseline, { flag: 'wx' });
fs.writeFileSync(`${output}/history-recovery01/original-manifest-45a614b9.json`, manifest, { flag: 'wx' });
const result = {
  kind: 'append-only-independent-G1-history-provenance-correction', capturedAt: new Date().toISOString(),
  relatedFixedCommit: fixedCommit,
  correction: 'The earlier g1-user-fix02 review incorrectly described g1-user-fix01 as preservation of the pre-correction baseline. That first byte capture actually already ran on 21e9124 after the W01 clarification. Both capture01 and capture02 contain the corrected 5721-byte baseline. This addendum corrects only that historical location statement; prior artifacts are retained unchanged.',
  originalPreCorrectionInput: {
    commit: originalCommit,
    baseline: { source: 'docs/design/rust-r4ghi-user-create-fix-baseline.md', recovered: `${output}/history-recovery01/original-baseline-45a614b9.md`, bytes: baseline.length, rawBytesSha256: sha(baseline) },
    manifest: { source: 'docs/design/rust-r4ghi/user-fix-g1-sources01.json', recovered: `${output}/history-recovery01/original-manifest-45a614b9.json`, bytes: manifest.length, rawBytesSha256: sha(manifest) },
    previouslyRetainedInImmutableGitObject: true,
  },
  capture01ActualProvenance: { capturedAt: captured.capturedAt, headBefore: captured.headBefore, headAfter: captured.headAfter, baselineBytes: captured.baseline.actual.bytes, baselineRawBytesSha256: captured.baseline.actual.rawBytesSha256 },
  all14SourcePinsUnchangedAcrossClarification: true,
  affectedEarlierStatements: ['tools/rust-r4ghi/independent/g1-user-fix02/g1-independent-review.json: pinEvidence.initialReviewInputPreservedAt', 'tools/rust-r4ghi/independent/g1-user-fix02/g1-independent-review.md: paragraph describing pre-correction input preservation'],
  currentTechnicalG1AndG3ConclusionsChanged: false,
  priorArtifactsRewritten: false, productChanged: false, additionalRuntimeAcceptanceRequired: false,
};
fs.writeFileSync(`${output}/g1-provenance-correction01.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(`${output}/g1-provenance-correction01.md`, '# G1 历史来源定位增量更正\n\n此前 review02 将 g1-user-fix01 描述为“修正前输入保全”不准确：该次实际捕获已在 21e9124，基线为修正后的 5721 B。旧捕获和报告不改写；本增量更正该历史定位。\n\n原 5397 B 基线及对应清单一直存在于 45a614b9 不可变 Git 对象。本次已按原字节补存至 history-recovery01/，基线 SHA-256 为 bfda5463c4b6ced81efe43b9c82d9a880ecc3d7158ad0f4f9b93ae62b77d406a。14 原产品来源在澄清前后完全相同。当前技术 G1、受测产品与 G3 结论不变，无须重跑运行验收。\n', { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ correctedHistoricalLocation: true, originalBaselineBytes: baseline.length, originalManifestHash: sha(manifest), productChanged: false })}\n`);
