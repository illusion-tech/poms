import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = new URL('./reconcile-tax96.mjs', import.meta.url), target = new URL('./reconcile-tax97.mjs', import.meta.url);
let code = fs.readFileSync(source, 'utf8'); const beforeSHA256 = sha(Buffer.from(code));
function replace(old, next) { assert.equal(code.split(old).length, 2, 'One exact metadata correction expected'); code = code.replace(old, next); }
replace("const ledgerBytes = fs.readFileSync(http.ledger.file); assert.equal(sha(ledgerBytes), http.ledger.rawBytesSha256);", "const ledgerFile = ctx.priv + '/006225-ledger.json', ledgerBytes = fs.readFileSync(ledgerFile), ledgerPin = { file: ledgerFile, rawBytesSha256: sha(ledgerBytes) };");
replace("const ledger = JSON.parse(ledgerBytes); assert.equal(ledger.ownershipComplete, true);", "const ledger = JSON.parse(ledgerBytes); assert.equal(ledger.requestId, http.requestId); assert.equal(ledger.operationId, http.operationId); assert.equal(ledger.ownershipComplete, true);");
replace("assert.equal(pending.bodySHA256, http.requestBodySha256);", "const requestBytes = fs.readFileSync(http.originals.requestBody.file); assert.equal(sha(requestBytes), http.originals.requestBody.rawBytesSha256); assert.equal(pending.bodySHA256, sha(requestBytes));");
replace("const before = loadSnapshot(ctx, http.before), after = loadSnapshot(ctx, http.after);", "const before = loadSnapshot(ctx, ledger.before), after = loadSnapshot(ctx, ledger.after);");
replace("ledger: http.ledger,", "ledger: ledgerPin,");
code = code.replaceAll('tax96', 'tax97').replaceAll('Reconciliation96', 'Reconciliation97').replaceAll('Snapshot96', 'Snapshot97');
fs.writeFileSync(target, code, { flag: 'wx' });
console.log(JSON.stringify({ kind: 'exact-metadata-only-97-public-HTTP-vs-private-ledger-shape-correction', sourceBeforeSHA256: beforeSHA256, newFile: target.pathname, newRawSHA256: sha(Buffer.from(code)), old96AndFailurePreserved: true, HTTPExecuted: false, SQLExecuted: false }));
