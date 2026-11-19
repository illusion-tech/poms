// Explicit request-identity and value-shape correction;02 originals stay sealed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), pack = R + '/tools/rust-r4ghi/period205-03';
const sha = value => createHash('sha256').update(value).digest('hex'), raw = fs.readFileSync(R + '/tools/rust-r4ghi/period205-02/manifest205-02.json');
assert.equal(sha(raw), 'edd8e0ba23b0a8fd93e39797078918db08048d65f44dc4d8bcc51f52a638fd6a');
const old = JSON.parse(raw), changes = [];
const write = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' }); return { file: path.relative(R, file).split(path.sep).join('/'), rawBytesSha256: sha(bytes) }; };
const replace = (text, a, b) => { assert.equal(text.split(a).length, 2); return text.replace(a, b); };
for (const change of old.changes) {
  let bytes = fs.readFileSync(R + '/' + change.after.file); assert.equal(sha(bytes), change.after.rawBytesSha256);
  if (change.file.endsWith('/gh-write-facts.mjs')) {
    let text = bytes.toString();
    text = replace(text, '  const { body, projectId } = scope;', `  const { body, projectId } = scope;
  assert(typeof body.expectedInputHash === 'string' && /^[a-f0-9]{64}$/.test(body.expectedInputHash));
  assert(Number.isSafeInteger(body.expectedProjectVersion) && body.expectedProjectVersion > 0);
  assert(typeof body.baselinePackageRef?.payloadHash === 'string' && /^[a-f0-9]{64}$/.test(body.baselinePackageRef.payloadHash));`);
    text = replace(text, "  const request = JSON.parse(readPin54(http.originals.requestConfig)); assert.equal(readPin54(http.originals.requestBody).length, 0);", `  const request = JSON.parse(readPin54(http.originals.requestConfig)); assert.equal(readPin54(http.originals.requestBody).length, 0);
  assert(typeof ctx.state.prefix === 'string' && /^bg[a-f0-9]{10}$/.test(ctx.state.prefix));
  assert(typeof http.requestId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(http.requestId) && http.requestId.startsWith(ctx.state.prefix + '-'));
  assert.equal(request.headers?.['X-Request-Id'], http.requestId, 'The actual harness request nonce must bind both original records');`);
    text = replace(text, "  if (periodProof) assert.equal(periodProof.preparation.selectedBaselinePackageRef.id, result.baselineId);", `  if (periodProof) {
    assert.equal(periodProof.preparation.selectedBaselinePackageRef.id, result.baselineId);
    assert.equal(periodProof.preparation.projectVersion, owned('project', projectId).row_version);
  }`);
    text = replace(text, "    assert.equal(selected.producer_version, 1); assert.equal(selected.period_end_snapshot_id, null);", `    assert.equal(selected.producer_version, 1); assert.equal(selected.period_end_snapshot_id, null);
    assert.equal(periodProof.preparation.officialSnapshotRef.rowVersion, selected.row_version);`);
    bytes = Buffer.from(text);
  }
  changes.push({ ...change, after: write(pack + '/proposed/' + change.file, bytes) });
}
const manifest = { ...old, kind: 'proposed-Source13-preclassified-period-FI-tool-correction205-03', supersedesProposal: { file: 'tools/rust-r4ghi/period205-02/manifest205-02.json', rawBytesSha256: sha(raw) },
  independentCounterexampleRetained: 'tools/rust-r4ghi/independent/review05/period205-review119/negative205-02.json', changes,
  additionalGuard: ['nonempty-current-run-request-nonce-and-actual-header-equality', 'strict-input-hash-and-project-version-and-baseline-hash-shapes', 'actual-project-and-selected-snapshot-version-match'],
  RootApplied: false, H1Admitted: false, databaseOrHTTPExecuted: false, formalG3Certified: false, G4Certified: false };
console.log(JSON.stringify({ proposal: write(pack + '/manifest205-03.json', JSON.stringify(manifest, null, 2) + '\n'), helperChanges: changes.length, RootApplied: false, source416Changed: false }));
