#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createContext, ownedFile, FIXED } from './context.mjs';
import { sha, segment, safeFailure } from './pure.mjs';
import { recoverCreatorSlot24 } from './recover-creator-slot24.mjs';

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') { console.log('Root-only metadata recovery: run-creator-slot-recovery24.mjs EXACT_PLAN_FILE ROOT_APPROVED_PLAN_SHA256; no HTTP or business SQL.'); return; }
  let ctx;
  try {
    assert.equal(process.platform, 'linux'); assert.equal(argv.length, 2);
    const [planFile, approvedPlanSHA256] = argv, bytes = ownedFile(planFile); assert.equal(sha(bytes), approvedPlanSHA256);
    const plan = JSON.parse(bytes); const epoch = segment(plan.epoch), run = segment(plan.run);
    assert(!fs.existsSync(`${FIXED.private}/business/${epoch}/${run}/driver.lock`), 'Wait for the existing Root driver; do not overwrite concurrent state');
    ctx = createContext({ epoch, run });
    const result = await recoverCreatorSlot24(ctx, { planFile, approvedPlanSHA256 }); console.log(JSON.stringify(result));
  } catch (error) {
    let original = null;
    if (ctx && !fs.existsSync(`${ctx.priv}/driver.lock`)) original = ctx.artifact(`${ctx.next('creator-recovery24-partial')}.json`, { name: error.name, message: error.message, stack: error.stack });
    console.error(JSON.stringify({ ...safeFailure(error), original, recoveryFailurePreserved: true })); process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
