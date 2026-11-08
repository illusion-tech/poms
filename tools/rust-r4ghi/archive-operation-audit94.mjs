import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const relative = 'tools/rust-r4ghi/I/implementation/actual-operation-coverage67';
const author = 'E:/projects/worktrees/poms-r4i-lifecycle/poms/' + relative;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(author + '/manifest67.json'); assert.equal(sha(bytes), '89205ea8a943ff7a7ae95a79bf4216d71343cebef578c86d425eb9ea0ce1c688');
const manifest = JSON.parse(bytes);
for (const pin of manifest.files) { const body = fs.readFileSync(author + '/' + pin.file); assert.equal(body.length, pin.bytes); assert.equal(sha(body), pin.rawBytesSha256); }
const clarification = fs.readFileSync(author + '/state-cut-clarification01.json'); assert.equal(sha(clarification), '0465d19320a8b270ec74be12f2419ccd7c0fd16dad85139117705da2ad398191');
for (const pin of [...manifest.files, { file: 'manifest67.json' }, { file: 'state-cut-clarification01.json' }]) {
  assert.equal(path.basename(pin.file), pin.file); const target = root + '/' + relative + '/' + pin.file;
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(author + '/' + pin.file, target, fs.constants.COPYFILE_EXCL);
}
fs.writeFileSync(root + '/docs/design/rust-r4ghi/operation-audit94-boundary.json', JSON.stringify({ kind: 'Root-archived-nonauthor-I67-limited-HTTP-corpus-audit', manifest: { file: relative + '/manifest67.json', rawBytesSha256: sha(bytes) },
  clarification: { file: relative + '/state-cut-clarification01.json', rawBytesSha256: sha(clarification) },
  successfulOperationsAcrossActualAPI133134135: 30, requiredOperations: 32, actualAPI135OperationsAtCut: 14,
  periodCreateAndGetPositiveMissing: true, oldProducerLabelsPreserved: true,
  mutableState5501HashIsObservedOnlyAndNotFrozenOriginal: true, evidenceBasis: 'pinned immutable HTTP/ledger/snapshots; Source12 full private retention still required',
  current89AndLaterResultsNotBackfilledIntoCut5501: true, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ archivedDeclaredFiles: manifest.files.length, clarificationPreserved: true, successfulOperationsAcrossVersions: 30, requiredOperations: 32, producerVersionsRelabelled: false, RootBusinessHelpersChanged: false, G3Certified: false }));
