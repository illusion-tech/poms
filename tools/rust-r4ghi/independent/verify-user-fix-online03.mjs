import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const workspace = process.cwd();
const output = 'tools/rust-r4ghi/independent/g1-user-fix03';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = (executable, args) => {
  const result = spawnSync(executable, args, { cwd: workspace, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${executable} ${args[0]} failed: ${result.stderr.toString('utf8')}`);
  return result.stdout;
};
const gh = (...args) => JSON.parse(run('gh', args).toString('utf8'));
const receiptFile = 'docs/design/rust-r4ghi/user-fix-online01.json';
const receiptBytes = fs.readFileSync(receiptFile);
const receipt = JSON.parse(receiptBytes.toString('utf8'));
const priorFile = 'tools/rust-r4ghi/independent/g1-user-fix02/g1-independent-review.json';
const priorBytes = fs.readFileSync(priorFile);
const prior = JSON.parse(priorBytes.toString('utf8'));
const originals = receipt.originals.map((item) => {
  const bytes = fs.readFileSync(item.stdout);
  return { file: item.stdout, expectedRawBytesSha256: item.rawBytesSha256, actualRawBytesSha256: hash(bytes), exitCode: item.exitCode, matches: hash(bytes) === item.rawBytesSha256 && item.exitCode === 0 };
});
const actualIssue = gh('issue', 'view', '115', '--repo', 'illusion-tech/poms', '--json', 'number,state,body,comments,url');
const actualComment = gh('api', 'repos/illusion-tech/poms/issues/comments/6672254788');
const actualParent = gh('api', 'repos/illusion-tech/poms/issues/115/parent', '--jq', '{number,state,html_url,title}');
const remoteCommit = gh('api', `repos/illusion-tech/poms/commits/${receipt.inputCommit}`, '--jq', '{sha,html_url}');
const frozenFiles = [
  { file: prior.baseline.file, bytes: prior.baseline.bytes, rawBytesSha256: prior.baseline.rawBytesSha256 },
  { file: prior.sourceManifest.file, bytes: prior.sourceManifest.bytes, rawBytesSha256: prior.sourceManifest.rawBytesSha256 },
].map((pin) => {
  const bytes = run('git', ['show', `${receipt.inputCommit}:${pin.file}`]);
  return { ...pin, actualBytes: bytes.length, actualRawBytesSha256: hash(bytes), matches: bytes.length === pin.bytes && hash(bytes) === pin.rawBytesSha256 };
});
const checks = {
  initialTechnicalReviewPass: prior.decision === 'Pass' && prior.issue === 115,
  sameInputCommit: receipt.inputCommit === prior.reviewedCommit && remoteCommit.sha === prior.reviewedCommit,
  sameBaseline: receipt.baseline.bytes === prior.baseline.bytes && receipt.baseline.rawBytesSha256 === prior.baseline.rawBytesSha256,
  sameManifest: receipt.sourceManifest.rawBytesSha256 === prior.sourceManifest.rawBytesSha256,
  allFrozenCommitFilesMatch: frozenFiles.every((item) => item.matches),
  allEightOriginalsMatch: originals.length === 8 && originals.every((item) => item.matches),
  actualIssueBodyMatchesReceipt: hash(Buffer.from(actualIssue.body, 'utf8')) === receipt.issueBodyReadbackSHA256,
  actualCommentBodyMatchesReceipt: hash(Buffer.from(actualComment.body, 'utf8')) === receipt.comment.bodySHA256,
  actualCommentIdentityMatches: actualComment.id === receipt.comment.id && actualComment.html_url === receipt.comment.url,
  nativeParentIs57AndOpen: actualParent.number === 57 && actualParent.state.toLowerCase() === 'open',
  actualIssueOpen: actualIssue.number === 115 && actualIssue.state.toLowerCase() === 'open',
  actualG1ChecklistChecked: actualIssue.body.includes('- [x] G1：#115'),
  actualG2ChecklistNotComplete: actualIssue.body.includes('- [ ] G2：'),
  noImplementationAcceptanceClaim: receipt.implementationAccepted === false && receipt.G3Certified === false && receipt.G4Certified === false && receipt.R4G1Certified === false,
  GHIExplicitlyPending: actualComment.body.includes('R4 #110 的 G1 仍 Pending'),
};
const result = {
  kind: 'independent-user-fix-G1-online-and-G2-entry-review',
  capturedAt: new Date().toISOString(),
  decision: Object.values(checks).every(Boolean) ? 'Pass' : 'Block',
  issue: 115,
  inputCommit: receipt.inputCommit,
  baselineTechnicalReview: { file: priorFile, rawBytesSha256: hash(priorBytes), decision: prior.decision },
  rootOnlineReceipt: { file: receiptFile, rawBytesSha256: hash(receiptBytes) },
  frozenFiles,
  originalReadbacks: originals,
  checks,
  actualIssue,
  actualComment,
  actualParent,
  remoteCommit,
  conclusion: {
    G1TechnicalPass: true,
    onlineSameSourceFreezeVerified: Object.values(checks).every(Boolean),
    limitedG2EntryPermitted: Object.values(checks).every(Boolean),
    implementationAccepted: false,
    G3Certified: false,
    G4Certified: false,
    GHI_G1Certified: false,
    R4NewOperationDeliveryCount: 0,
  },
  independentBoundary: { productEdits: false, gitMutations: false, githubMutations: false, databaseOrApiStarted: false, credentialsRead: false },
  earlierPendingSnapshotPreserved: true,
};
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'g1-entry-independent-review.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ decision: result.decision, inputCommit: result.inputCommit, checks, output })}\n`);
if (result.decision !== 'Pass') process.exitCode = 1;
