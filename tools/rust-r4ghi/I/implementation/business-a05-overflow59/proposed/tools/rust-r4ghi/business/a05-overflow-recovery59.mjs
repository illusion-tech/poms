#!/usr/bin/env node
// Metadata only. This module never creates a DB client or sends HTTP.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { sha } from './pure.mjs';
import { readAdmittedConsumerContext } from './consumer-admission54.mjs';
import { loadSnapshot } from './snapshot.mjs';
import { assertSweepRollback } from './fault-sweep.mjs';
import { recoverOverflowState59 } from './a05-overflow-guards59.mjs';

const serialize = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
function pin59(file) { const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(file), path.resolve(file)); return { file, rawBytesSha256: sha(fs.readFileSync(file)) }; }
function json59(pin) { assert.equal(pin59(pin.file).rawBytesSha256, pin.rawBytesSha256); return JSON.parse(fs.readFileSync(pin.file)); }
function within59(root, file) { const relative = path.relative(fs.realpathSync(root), path.resolve(file)); assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)); assert.equal(fs.realpathSync(path.dirname(file)), path.dirname(path.resolve(file))); }
function nextState59(ctx, spec) {
  assert.equal(ctx.epoch, spec.epoch); assert.equal(ctx.run, spec.run); assert(!fs.existsSync(`${ctx.priv}/driver.lock`), 'No concurrent driver may change the state');
  const overflow = ctx.state.fixtures.a05Boundaries26.views['max-zero'].fixtures.a05Overflow26;
  assert.equal(sha(JSON.stringify(overflow.input)), spec.oldInputSHA256); assert.equal(sha(JSON.stringify(overflow.extraCash)), spec.extraCashSHA256);
  assert.equal(overflow.extraCash.receipt.id, spec.extraReceiptId); assert.equal(overflow.extraCash.receipt.status, 'confirmed'); assert.equal(overflow.extraCash.receipt.receiptAmount, '0.01');
  const body = json59(spec.requestBody); assert.deepEqual(body, overflow.input.body);
  const http = json59(spec.httpReceipt); assert.equal(http.operationId, 'ProjectCostController_createProjectOperatingSnapshot'); assert.equal(http.requestId, spec.requestId);
  assert.equal(http.status, 409); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
  const error = json59(spec.responseBody); assert.equal(error.statusCode, 409); assert.equal(error.code, 'operating_input_hash_changed');
  const ledger = json59(spec.ledger); assert.equal(ledger.requestId, spec.requestId); assert.equal(ledger.operationId, 'ProjectCostController_createProjectOperatingSnapshot');
  assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.recorded, []); assert.deepEqual(ledger.blockers, []); assert.deepEqual(ledger.before, spec.before); assert.deepEqual(ledger.after, spec.after);
  assert.deepEqual(overflow.extraCash.basisVerified, spec.basisVerified); const basis = json59(spec.basisVerified); assert.equal(basis.receiptId, spec.extraReceiptId); assert.equal(basis.actual.length, 1);
  assert.equal(basis.actual[0].cash_gross, '0.01'); assert.equal(basis.actual[0].amount_excluding_tax, '0.01'); assert.equal(basis.actual[0].tax_amount, '0.00');
  const before = loadSnapshot(ctx, spec.before), after = loadSnapshot(ctx, spec.after);
  // No auth touch occurred in this exact409; require even xmin-only equality.
  const rollback = assertSweepRollback({ ...ctx, databases: Object.keys(before.databases) }, before, after, { sessionId: null }, null);
  json59(spec.originalPartial);
  const staleAttempt = { status: 409, code: error.code, requestId: spec.requestId, httpReceipt: spec.httpReceipt, originalPartial: spec.originalPartial, requestBody: spec.requestBody, responseBody: spec.responseBody, ledger: spec.ledger, before: spec.before, after: spec.after, rollback, noCommandReplay: true };
  return recoverOverflowState59(ctx.state, { epoch: spec.epoch, run: spec.run, projectId: spec.projectId, oldInput: overflow.input, extraCash: overflow.extraCash }, staleAttempt);
}

export async function main59(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') { console.log('Root metadata-only: plan STATE_FILE NEW_PLAN_FILE; apply PLAN_FILE APPROVED_RAW_SHA. No DB/HTTP.'); return; }
  assert.equal(process.platform, 'linux'); assert.equal(argv.length, 3);
  const specFile = new URL('./overflow-recovery-input59.json', import.meta.url), specBytes = fs.readFileSync(specFile), spec = JSON.parse(specBytes);
  if (argv[0] === 'plan') {
    const statePin = pin59(argv[1]), ctx = readAdmittedConsumerContext({ statePin }), next = nextState59(ctx, spec); within59(ctx.priv, argv[2]);
    const plan = { kind: 'exact-A05-overflow-stale409-metadata-recovery59', statePin, expectedAfterStateSHA256: sha(serialize(next)), specSHA256: sha(specBytes),
      allowedChanges: ['delete /fixtures/a05Boundaries26/views/max-zero/stages/aggregate-overflow phase=running', 'append actual staleAttempt59 refs and exact unchanged-proof under same overflow'],
      submittedReceiptReposted: false, oldInputOrExtraCashChanged: false, businessWrites: 0 };
    fs.writeFileSync(argv[2], serialize(plan), { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ plan: pin59(argv[2]), businessWrites: 0 })); return;
  }
  assert.equal(argv[0], 'apply'); assert.equal(pin59(argv[1]).rawBytesSha256, argv[2]); const plan = json59({ file: argv[1], rawBytesSha256: argv[2] });
  assert.equal(plan.kind, 'exact-A05-overflow-stale409-metadata-recovery59'); assert.equal(plan.specSHA256, sha(specBytes));
  const ctx = readAdmittedConsumerContext({ statePin: plan.statePin }); within59(ctx.priv, argv[1]);
  const next = nextState59(ctx, spec), bytes = serialize(next); assert.equal(sha(bytes), plan.expectedAfterStateSHA256);
  const receiptFile = `${ctx.priv}/overflow59-metadata-applied.json`; assert(!fs.existsSync(receiptFile));
  const temporary = `${plan.statePin.file}.overflow59-${randomUUID()}.tmp`; fs.writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
  assert.equal(pin59(plan.statePin.file).rawBytesSha256, plan.statePin.rawBytesSha256, 'Latest exact state changed before atomic replace'); fs.renameSync(temporary, plan.statePin.file);
  const receipt = { kind: 'exact-metadata-only-overflow59-recovery-applied', approvedPlan: { file: argv[1], rawBytesSha256: argv[2] }, before: plan.statePin, after: pin59(plan.statePin.file),
    businessWrites: 0, DBOrHTTPExecuted: false, submittedReceiptReposted: false, oldInputAndExtraCashPreserved: true, ownedOrBorrowedRebased: false, G3Certified: false, G4Certified: false };
  fs.writeFileSync(receiptFile, serialize(receipt), { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ receipt: pin59(receiptFile), businessWrites: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main59();
