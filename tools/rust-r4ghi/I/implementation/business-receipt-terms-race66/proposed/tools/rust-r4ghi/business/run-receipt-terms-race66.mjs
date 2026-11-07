#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createContext, FIXED, ownedFile } from './context.mjs';
import { sha, segment, uuid, safeFailure } from './pure.mjs';
import { cents66 } from './receipt-terms-proof66.mjs';

export async function main66(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') { console.log('Root defensive C race only: run-receipt-terms-race66.mjs ACTUAL_PRIVATE_PLAN_JSON APPROVED_RAW_SHA; real pending receipt/public prep, no-value-change SQL wait55P03+ROLLBACK, then genuine C200.'); return; }
  assert.equal(process.platform, 'linux'); assert.equal(argv.length, 2); assert(/^[a-f0-9]{64}$/.test(argv[1]));
  const bytes = ownedFile(argv[0]); assert.equal(sha(bytes), argv[1]); const plan = JSON.parse(bytes);
  assert.equal(plan.kind, 'receipt-original-terms-defensive-race66'); assert.equal(plan.schemaVersion, 1);
  for (const name of ['epoch', 'run', 'caseId', 'actorKey']) segment(plan[name]); for (const name of ['projectId', 'contractId', 'termSnapshotId']) uuid(plan[name]);
  assert(cents66(plan.gross) > 0n); assert(Number.isInteger(plan.lockTimeoutMs) && plan.lockTimeoutMs >= 500 && plan.lockTimeoutMs <= 3000);
  for (const key of ['expectedSourcePinsSHA256', 'reviewedHelperPinsSHA256', 'expectedBinarySHA256']) assert(/^[a-f0-9]{64}$/.test(plan[key]));
  const privateRun = `${FIXED.private}/business/${plan.epoch}/${plan.run}`, lock = `${privateRun}/driver.lock`;
  assert.equal(path.dirname(fs.realpathSync(argv[0])), privateRun); assert(fs.existsSync(`${privateRun}/state.json`));
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'receipt-terms-race66', approvedPlanSHA256: argv[1] }) + '\n', { flag: 'wx', mode: 0o600 });
  let ctx;
  try {
    ctx = createContext({ epoch: plan.epoch, run: plan.run }); assert(ctx.state.baseline && !ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleaned && !ctx.state.cleanupPlan);
    assert(Object.hasOwn(ctx.state.actors, plan.actorKey)); assert.equal(sha(JSON.stringify(ctx.pins)), plan.expectedSourcePinsSHA256); assert.equal(sha(JSON.stringify(ctx.helperPins)), plan.reviewedHelperPinsSHA256);
    assert.equal(ctx.state.apiProcess.record.binarySha256, plan.expectedBinarySHA256); assert.deepEqual({ file: ctx.state.apiProcess.file, rawBytesSha256: ctx.state.apiProcess.rawBytesSha256 }, plan.apiProcess);
    for (const pin of JSON.parse(fs.readFileSync(new URL('./receipt-terms-sources66.json', import.meta.url)))) assert.equal(ctx.pins.find(value => value.file === pin.file)?.sha256, pin.sha256);
    const { receiptTermsRace66 } = await import('./receipt-terms-race66.mjs');
    const result = await receiptTermsRace66(ctx, plan, { file: argv[0], rawBytesSha256: argv[1] }); console.log(JSON.stringify({ status: 'completed', ...result }));
  } catch (error) {
    const original = ctx ? ctx.artifact(`${ctx.next('receipt-terms66-partial')}.json`, { name: error.name, message: error.message, stack: error.stack }) : null;
    console.error(JSON.stringify({ ...safeFailure(error), original, noBusinessReplay: true })); process.exitCode = 1;
  } finally { assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main66();
