import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { capture, loadSnapshot } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
import { assertSameRetained54 } from './business/retained-admission54.mjs';
import { sha } from './business/pure.mjs';
assert.equal(process.platform, 'linux');
const dir = '/home/wangzishi/.local/share/poms-r4ghi/private/environment-recovery147', stateFile = '/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/state.json';
const original = fs.readFileSync(stateFile); assert.equal(sha(original), '8e297fdb95b88442ebded8c37c44863b73838798b2fe0dbd9f798e4a5064c605');
assert(!fs.existsSync('/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/driver.lock'));
const rootCtx = createContext({ epoch: 'g2-business12', run: 'main01' }); assert(!rootCtx.state.activeFault && !rootCtx.state.blockedObservation);
const receiptFile = rootCtx.win + '/tmp/rust-r4ghi/root/ui-runtime14/expense18-source12-02/receipt18-04.json', receiptBytes = fs.readFileSync(receiptFile); assert.equal(sha(receiptBytes), 'e5af97c68eb02c554dce90f18ae75306f7a5c3ecedfc19522324467e1342b882');
const receipt = JSON.parse(receiptBytes); assert(receipt.cases.every(c => c.status === 'passed')); const last = receipt.observerReceipts.at(-1).ledger, ledger = JSON.parse(fs.readFileSync(last.file)); assert.equal(sha(fs.readFileSync(last.file)), last.rawBytesSha256); assert.equal(ledger.ownershipComplete, true);
const expected = loadSnapshot(rootCtx, ledger.after); assert.equal(ledger.after.rawBytesSha256, '9205a910aa03686a0f70973f8b4c606b001e54a49b055d80abdd10d07ddaa9df');
const out = dir + '/data-verification148'; fs.mkdirSync(out, { mode: 0o700 });
const artifact = (name, value) => { const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = out + '/' + name; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const observer = { ...rootCtx, priv: out, artifact, public: () => {} };
try {
  const first = await capture(observer, 'environment148-fresh1'); assertSameRetained54(expected, first, rootCtx.databases); assertRecorded(rootCtx, first);
  const second = await capture(observer, 'environment148-fresh2'); assertSameRetained54(first, second, rootCtx.databases); assertRecorded(rootCtx, second);
  assert.deepEqual(fs.readFileSync(stateFile), original, 'Verification must not advance or rebind the old context');
  const proof = artifact('proof148.json', { kind: 'actual-original-volume-PG-restart-data-conservation148', oldExpensePassedReceipt: { file: receiptFile, rawBytesSha256: sha(receiptBytes) }, oldFinalLedger: last, oldFinalSnapshot: ledger.after,
    fresh1: first.manifest, fresh2: second.manifest, allNativeAndRustRowsRawXminCatalogSequencesObjectsEqual: true, originalContextRawSHA256: sha(original), oldContextWrittenOrAPIRebound: false,
    APIStarted: false, databaseRestoreExecuted: false, DMLExecuted: false, G3Certified: false });
  console.log(JSON.stringify({ status: 'same-original-data-verified', proof, tables: rootCtx.tables, databaseCount: 2, rows: Object.fromEntries(rootCtx.databases.map(db => [db, Object.values(second.databases[db].tables).reduce((n, t) => n + t.count, 0)])), APIStarted: false }));
} catch (error) { const failure = artifact('partial148.json', { name: error.name, stack: error.stack, privateEvidenceRetained: true }); console.error(JSON.stringify({ status: 'verification-failed-no-replay', failure, privateDetailsPublished: false })); process.exitCode = 1; }
