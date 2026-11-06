import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const workspace = process.cwd();
const captureName = process.argv[2] ?? 'g1-user-fix01';
if (!/^g1-user-fix\d+$/.test(captureName)) throw new Error('Unexpected capture directory');
const outputDirectory = path.join(workspace, 'tools/rust-r4ghi/independent', captureName);
fs.mkdirSync(outputDirectory, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => {
  const result = spawnSync('git', args, { cwd: workspace, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr.toString('utf8')}`);
  return result.stdout;
};
const gh = (...args) => {
  const result = spawnSync('gh', args, { cwd: workspace, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`gh ${args[0]} failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
};
const manifestPath = 'docs/design/rust-r4ghi/user-fix-g1-sources01.json';
const manifestBytes = fs.readFileSync(path.join(workspace, manifestPath));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const headBefore = git('rev-parse', 'HEAD').toString('utf8').trim();
const branch = git('branch', '--show-current').toString('utf8').trim();
const verify = (pin, atCommit) => {
  const bytes = atCommit
    ? git('show', `${atCommit}:${pin.file}`)
    : fs.readFileSync(path.join(workspace, pin.file));
  const actual = { bytes: bytes.length, rawBytesSha256: hash(bytes) };
  return {
    file: pin.file,
    expected: { bytes: pin.bytes, rawBytesSha256: pin.rawBytesSha256 },
    actual,
    matches: actual.bytes === pin.bytes && actual.rawBytesSha256 === pin.rawBytesSha256,
  };
};
const baseline = verify(manifest.baseline);
const sources = manifest.sources.map((pin) => ({
  file: pin.file,
  workingTree: verify(pin),
  sourceCommit: verify(pin, manifest.sourceCommit),
}));
const online = {
  issue: gh('issue', 'view', '115', '--repo', 'illusion-tech/poms', '--json', 'number,title,state,body,comments,url,labels'),
  parent: gh('api', 'repos/illusion-tech/poms/issues/115/parent', '--jq', '{number,state,html_url,title}'),
};
const headAfter = git('rev-parse', 'HEAD').toString('utf8').trim();
const result = {
  kind: 'independent-user-fix-g1-pin-verification',
  capturedAt: new Date().toISOString(),
  workspace,
  branch,
  headBefore,
  headAfter,
  sourceCommit: manifest.sourceCommit,
  manifest: { file: manifestPath, bytes: manifestBytes.length, rawBytesSha256: hash(manifestBytes) },
  sourceCount: sources.length,
  uniqueSourceCount: new Set(sources.map((entry) => entry.file)).size,
  baseline,
  sources,
  online,
  unchangedHeadDuringCapture: headBefore === headAfter,
  allSourcePinsMatchWorkingTree: sources.every((entry) => entry.workingTree.matches),
  allSourcePinsMatchSourceCommit: sources.every((entry) => entry.sourceCommit.matches),
  sourcePinsOnlyNotAcceptance: true,
  productModified: false,
  runtimeStarted: false,
};
fs.writeFileSync(path.join(outputDirectory, 'baseline-observed.md'), fs.readFileSync(path.join(workspace, manifest.baseline.file)), { flag: 'wx' });
fs.writeFileSync(path.join(outputDirectory, 'source-manifest-observed.json'), manifestBytes, { flag: 'wx' });
fs.writeFileSync(path.join(outputDirectory, 'pin-verification.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ outputDirectory, sourceCount: result.sourceCount, uniqueSourceCount: result.uniqueSourceCount, baselineMatches: baseline.matches, workingTreeMatches: result.allSourcePinsMatchWorkingTree, sourceCommitMatches: result.allSourcePinsMatchSourceCommit, unchangedHead: result.unchangedHeadDuringCapture, onlineComments: online.issue.comments.length })}\n`);
