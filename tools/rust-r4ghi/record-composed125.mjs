import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', source = root + '/tmp/rust-r4ghi/root/composed118', relative = 'tools/rust-r4ghi/evidence/composed118';
const sha = b => createHash('sha256').update(b).digest('hex'), summary = JSON.parse(fs.readFileSync(source + '/receipt.json'));
assert(summary.results.length === 4 && summary.results.every(r => r.exitCode === 0 && r.sourceStable));
const names = ['receipt.json', ...['fmt', 'clippy', 'test', 'build'].flatMap(mode => [mode + '-receipt.json', mode + '-stdout.log', mode + '-stderr.log'])];
fs.mkdirSync(root + '/' + relative, { recursive: true });
const files = names.map(name => { const b = fs.readFileSync(source + '/' + name); fs.writeFileSync(root + '/' + relative + '/' + name, b, { flag: 'wx' }); return { file: name, bytes: b.length, rawBytesSha256: sha(b) }; });
const manifest = Buffer.from(JSON.stringify({ kind: 'immutable-executed-unapplied-composition106-static-evidence125', files, compilationScope: 'full-Rust-crate-in-isolated-materialization', productInputsApplied: false,
  migratedDatabase: false, actualRuntimeStillSource12: true, tests: { passed: 535, failed: 0, ignored: 54, suites: 26 }, G3Certified: false, G4Certified: false }, null, 2) + '\n');
fs.writeFileSync(root + '/' + relative + '/manifest125.json', manifest, { flag: 'wx' });
const document = { kind: 'published-source-pinned-unapplied-composition106-validation125', actualStaticChecks: summary.results, evidence: { file: relative + '/manifest125.json', rawBytesSha256: sha(manifest) },
  tests: { passed: 535, failed: 0, ignored: 54, suites: 26 }, activeRuntimeChanged: false, M98Applied: false, Source13RuntimeValidated: false, formalRustDelivered: 240, newBatchCertified: 0, G3Certified: false, G4Certified: false };
fs.writeFileSync(root + '/docs/design/rust-r4ghi/composed125-static.json', JSON.stringify(document, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ archivedFiles: files.length, bytes: files.reduce((n, f) => n + f.bytes, 0), manifestRawSHA256: sha(manifest), fullRustTestsPassed: 535, runtimeChanged: false }));
