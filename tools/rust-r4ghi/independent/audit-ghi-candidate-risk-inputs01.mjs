import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const workspace = process.cwd();
const output = 'tools/rust-r4ghi/independent/ghi-risk01';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceCommit = 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee';
const config = [
  { line: 'G', audit: 'tools/rust-r4ghi/G/g1/audit01.json', note: 'tools/rust-r4ghi/G/g1/audit01.md', manifest: 'tools/rust-r4ghi/G/g1/sources01.json' },
  { line: 'H', audit: 'tools/rust-r4ghi/H/g1/h-g1-candidate01.json', note: 'tools/rust-r4ghi/H/g1/h-g1-candidate01.md', manifest: 'tools/rust-r4ghi/H/g1/source-manifest01.json' },
  { line: 'I', audit: 'tools/rust-r4ghi/I/g1/i-lifecycle-g1-audit.json', note: 'tools/rust-r4ghi/I/g1/i-lifecycle-g1-audit.md', manifest: 'tools/rust-r4ghi/I/g1/i-source-manifest.json' },
];
fs.mkdirSync(path.join(output, 'inputs'), { recursive: true });
const captured = [];
const allSourcePins = new Map();
const manifests = config.map((entry) => {
  const snapshots = {};
  for (const field of ['audit', 'note', 'manifest']) {
    const bytes = fs.readFileSync(entry[field]);
    const copy = `${entry.line}-${path.basename(entry[field])}`;
    fs.writeFileSync(path.join(output, 'inputs', copy), bytes, { flag: 'wx' });
    captured.push({ line: entry.line, role: field, file: entry[field], bytes: bytes.length, rawBytesSha256: hash(bytes), snapshot: `${output}/inputs/${copy}` });
    if (field !== 'note') snapshots[field] = JSON.parse(bytes.toString('utf8'));
  }
  const pins = snapshots.manifest.files.map((pin) => {
    const file = pin.path;
    if (/(^|[\\/])(private|credentials|\.env[^\\/]*)([\\/]|$)/i.test(file)) throw new Error(`Refuse credential/private path: ${file}`);
    const expectedHash = pin.rawSha256 ?? pin.rawBytesSha256 ?? pin.sha256;
    const bytes = fs.readFileSync(file);
    const actual = { bytes: bytes.length, rawBytesSha256: hash(bytes) };
    const matches = actual.bytes === pin.bytes && actual.rawBytesSha256 === expectedHash;
    const variants = allSourcePins.get(file) ?? [];
    variants.push({ line: entry.line, bytes: pin.bytes, rawBytesSha256: expectedHash });
    allSourcePins.set(file, variants);
    let originalCommit = null;
    if (!matches) {
      const result = spawnSync('git', ['show', `${sourceCommit}:${file}`], { cwd: workspace, maxBuffer: 8 * 1024 * 1024 });
      originalCommit = result.status === 0
        ? { bytes: result.stdout.length, rawBytesSha256: hash(result.stdout), expectedMatches: result.stdout.length === pin.bytes && hash(result.stdout) === expectedHash }
        : { exists: false };
    }
    return { file, expected: { bytes: pin.bytes, rawBytesSha256: expectedHash }, actual, matches, originalCommit };
  });
  return {
    line: entry.line,
    sourceCount: pins.length,
    uniqueSourceCount: new Set(pins.map((pin) => pin.file)).size,
    currentRawMatches: pins.filter((pin) => pin.matches).length,
    currentMismatches: pins.filter((pin) => !pin.matches),
    declaredAdmission: snapshots.audit.status ?? snapshots.audit.admission,
    operations: snapshots.audit.operations?.length ?? null,
    userDecisionIssue: snapshots.audit.userDecisionIssue ?? null,
    candidateOnly: true,
  };
});
const overlappingVariantPins = [...allSourcePins.entries()]
  .filter(([, pins]) => new Set(pins.map((pin) => `${pin.bytes}:${pin.rawBytesSha256}`)).size > 1)
  .map(([file, pins]) => ({ file, pins }));
const result = {
  kind: 'independent-GHI-candidate-risk-input-capture',
  capturedAt: new Date().toISOString(),
  purpose: 'Future G3 risk preparation only, not G1 admission or implementation acceptance',
  sourceCommit,
  candidateArtifacts: captured,
  manifests,
  unionSourceCount: allSourcePins.size,
  overlappingVariantPins,
  G1Certified: false,
  G2Authorized: false,
  G3Certified: false,
  G4Certified: false,
  productModified: false,
  runtimeStarted: false,
};
fs.writeFileSync(path.join(output, 'input-capture.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ output, manifests, unionSourceCount: result.unionSourceCount, overlappingVariantPins })}\n`);
