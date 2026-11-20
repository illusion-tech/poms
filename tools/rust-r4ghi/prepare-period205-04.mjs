// Test-only successor: give earlier shape guards valid inputs before the target
// rejection is asserted. The already independently probed03 runtime is exact.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), pack = R + '/tools/rust-r4ghi/period205-04';
const sha = value => createHash('sha256').update(value).digest('hex'), raw = fs.readFileSync(R + '/tools/rust-r4ghi/period205-03/manifest205-03.json');
assert.equal(sha(raw), '0e83850f5920a56cb5d656546c7183b1c78839ff33bb844633c809b9ea151dce');
const old = JSON.parse(raw), changes = [];
const write = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' }); return { file: path.relative(R, file).split(path.sep).join('/'), rawBytesSha256: sha(bytes) }; };
const replace = (text, a, b) => { assert.equal(text.split(a).length, 2); return text.replace(a, b); };
for (const change of old.changes) {
  let bytes = fs.readFileSync(R + '/' + change.after.file); assert.equal(sha(bytes), change.after.rawBytesSha256);
  if (change.file.endsWith('/gh-write-inventory.test.mjs')) {
    let text = bytes.toString();
    text = replace(text, "  const f = fixture(); f.base(); const s = f.scope({ projectId: project, expectedVersion: 1, periodKey: '2026-10', costDecisions: [f.input] });", "  const f = fixture(); f.base(); const s = f.scope({ inputVersion: 'server-derived-v1', projectId: project, expectedVersion: 1, expectedProjectVersion: 1, expectedInputHash: 'a'.repeat(64), assertions: null, baselinePackageRef: { kind: 'OperatingBaselinePackage', id: baseline, expectedVersion: 1, payloadHash: 'b'.repeat(64) }, periodKey: '2026-10', expectedPeriodSnapshotRef: null, costDecisions: [f.input] });");
    text = replace(text, "  assert.throws(() => f.derive(ghWriteOperations[2], s), /already classified/);", "  assert.throws(() => f.derive(ghWriteOperations[2], s), /already classified/);\n  assert.throws(() => f.derive(ghWriteOperations[2], { ...s, body: { ...s.body, costDecisions: [] } }), /actual period preparation HTTP receipt is mandatory/);");
    bytes = Buffer.from(text);
  }
  changes.push({ ...change, after: write(pack + '/proposed/' + change.file, bytes) });
}
const manifest = { ...old, kind: 'proposed-Source13-preclassified-period-FI-tool-correction205-04', supersedesProposal: { file: 'tools/rust-r4ghi/period205-03/manifest205-03.json', rawBytesSha256: sha(raw) },
  originalFailedRegressionKept: 'tools/rust-r4ghi/independent/review05/period205-review119/regression119-03.stdout.log', changes,
  runtimeMatches20503: true, testOnlyCorrection: 'valid earlier input shape then separately assert nonempty decisions and missing actual prep receipt rejection',
  RootApplied: false, H1Admitted: false, databaseOrHTTPExecuted: false, formalG3Certified: false, G4Certified: false };
console.log(JSON.stringify({ proposal: write(pack + '/manifest205-04.json', JSON.stringify(manifest, null, 2) + '\n'), helperChanges: changes.length, runtimeUnchangedFrom20503: true, RootApplied: false }));
