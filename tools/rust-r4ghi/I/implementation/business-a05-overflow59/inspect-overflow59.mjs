import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const map = file => process.platform === 'win32' ? '//wsl.localhost/Debian' + file : file;
const base = '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business11/main01';
const pin = file => { const bytes = fs.readFileSync(map(file)); return { file, rawBytesSha256: sha(bytes) }; };
const read = file => JSON.parse(fs.readFileSync(map(file)));
const ledgerPin = pin(`${base}/003936-ledger.json`), ledger = read(ledgerPin.file);
assert.equal(ledger.requestId, 'bg383435b83c-003935-http-6965c6a2'); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.recorded, []); assert.deepEqual(ledger.blockers, []);
const snapshots = [ledger.before, ledger.after].map(value => { assert.equal(pin(value.file).rawBytesSha256, value.rawBytesSha256); return read(value.file); });
assert.deepEqual(Object.keys(snapshots[0].databases), Object.keys(snapshots[1].databases)); assert.deepEqual(snapshots[0].objects, snapshots[1].objects);
let tables = 0, rows = 0;
for (const database of Object.keys(snapshots[0].databases)) {
  const [before, after] = snapshots.map(snapshot => snapshot.databases[database]); assert.deepEqual(before.meta, after.meta);
  assert.deepEqual(Object.keys(before.tables), Object.keys(after.tables));
  for (const table of Object.keys(before.tables)) {
    const readRows = value => { const bytes = fs.readFileSync(map(value.file)); assert.equal(sha(bytes), value.rawBytesSha256); return bytes.toString('utf8').trim().split('\n').filter(Boolean).map(text => { const row = JSON.parse(text); assert.equal(sha(row.raw), row.sha256); return { key: row.key, sha256: row.sha256, xmin: row.xmin }; }); };
    const a = readRows(before.tables[table]), b = readRows(after.tables[table]); assert.deepEqual(a, b, `${database}.${table} differs in row raw SHA/xmin`); tables += 1; rows += a.length;
  }
}
const bodyFile = `${base}/003935-http-request-body.bin`, responseFile = `${base}/003935-http-response-body.bin`, headers = read(`${base}/003935-http-response-headers.json`), error = read(responseFile);
assert.equal(headers.status, 409); assert.equal(error.code, 'operating_input_hash_changed');
const result = { kind: 'FS-only-inspection-of-exact-existing-A05-stale-hash409', ledger: ledgerPin, before: ledger.before, after: ledger.after, requestBody: pin(bodyFile), responseBody: pin(responseFile),
  actualStatus: 409, actualCode: error.code, tablesCompared: tables, rowsCompared: rows, allRawRowSHAAndXminUnchanged: true, metadataSequencesAndObjectsUnchanged: true,
  businessOrAuthTouchesObserved: 0, DBOrHTTPExecutedByAuthor: false, G3Certified: false, G4Certified: false };
console.log(JSON.stringify(result, null, 2));
