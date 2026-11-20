#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createContext, guard, FIXED } from './context.mjs';
import { capture } from './snapshot.mjs';
import { segment, safeFailure } from './pure.mjs';

export const HELP = `business/driver.mjs preflight|baseline|run|report|cycle-sandbox|disarm-fi|plan-cleanup|apply-cleanup|noop
  --epoch NEW_BUSINESS_EPOCH --run RUN [--phase UNIQUE_PHASE]
  [--stage platform|project-sources|summary|contract-prepare|contract-finish|receipt|handover|roles-and-execution|roles-and-execution-sweep|actual-costs|operating|operating-sweep|operating-restatement-sweep|lifecycle|lifecycle-sweep|creator-ownership|legacy-compatibility|ui-eo-spare|ui-own-spare|metadata-patch-sweep]
  [--provision-receipt ORIGINAL_NAMESPACE_PROVISION_JSON]
  [--api-process-record PRIVATE_ACTUAL_PROCESS_JSON]
  [--approved-plan-sha SHA --api-stopped-receipt PRIVATE_ACTUAL_STOP_JSON]
  [--cycle-sandbox-receipt PRIVATE_ACTUAL_SANDBOX_JSON --cycle-sandbox-sha SHA]
Only Root runs real SQL/HTTP in owned Debian WSL. --help/import do no I/O.
Implemented stages and their run state are documented in business/README.md.`;
export async function main(argv = process.argv.slice(2)) {
  const [mode, ...args] = argv;
  if (!mode || mode === '--help') { console.log(HELP); return; }
  assert(['preflight', 'baseline', 'run', 'report', 'cycle-sandbox', 'disarm-fi', 'plan-cleanup', 'apply-cleanup', 'noop'].includes(mode));
  const options = {};
  for (let n = 0; n < args.length; n += 2) { assert(/^--[a-z-]+$/.test(args[n]) && args[n + 1]); const key = args[n].slice(2); assert(!Object.hasOwn(options, key)); options[key] = args[n + 1]; }
  assert(Object.keys(options).every(k => ['epoch', 'run', 'phase', 'stage', 'provision-receipt', 'api-process-record', 'approved-plan-sha', 'api-stopped-receipt', 'planned-date', 'cycle-sandbox-receipt', 'cycle-sandbox-sha'].includes(k)));
  let ctx, lock, label;
  try {
    ctx = createContext(options); lock = `${ctx.priv}/driver.lock`;
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode, at: new Date().toISOString() }) + '\n', { flag: 'wx', mode: 0o600 });
    label = ctx.next(segment(options.phase ?? mode)); ctx.persist();
    ctx.artifact(`${label}-intent.json`, { mode, label, epoch: ctx.epoch, run: ctx.run, sourcePins: ctx.pins, helperPins: ctx.helperPins, acceptanceClaim: false });
    let result;
    if (mode === 'preflight') {
      const databases = [];
      for (const name of ctx.databases) databases.push(await ctx.db(async c => {
        const identity = await guard(ctx, c, name), tables = (await c.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relkind='r'")).rows[0].n;
        assert.equal(tables, ctx.tables); return { ...identity, tables };
      }, name));
      result = { kind: 'actual-read-only-business-preflight', databases, sourcePins: ctx.pins, noBusinessRequestsSent: true };
    } else if (mode === 'baseline') {
      assert(!ctx.state.baseline && !ctx.state.cleaned, 'Never overwrite original baseline');
      const snapshot = await capture(ctx, `baseline-${label}`); ctx.state.baseline = snapshot.manifest; ctx.persist();
      result = { kind: 'immutable-business-baseline', snapshot: snapshot.manifest, tablesPerDatabase: ctx.tables, noHTTPRequestsSent: true };
    } else if (mode === 'report') {
      const { operationReport } = await import('./report.mjs'); result = operationReport(ctx);
    } else if (mode === 'cycle-sandbox') {
      const { runCycleSandbox } = await import('./cycle-sandbox.mjs'); result = await runCycleSandbox(ctx, label);
    } else if (mode === 'disarm-fi') {
      const { removeFault } = await import('./faults.mjs'); result = await removeFault(ctx);
    } else if (mode === 'run') {
      assert(ctx.state.baseline && !ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.blockedObservation);
      const { createApi } = await import('./http.mjs'); const api = createApi(ctx);
      if (options.stage === 'platform') { const { runPlatform } = await import('./platform.mjs'); result = await runPlatform(ctx, api); }
      else { const { runBusinessStage } = await import('./upstream.mjs'); result = await runBusinessStage(ctx, api, options.stage); }
    } else {
      assert(ctx.state.baseline); const { cleanupMode } = await import('./cleanup.mjs'); result = await cleanupMode(ctx, mode, label);
    }
    ctx.artifact(`${label}-complete.json`, result, { kind: 'business-driver-mode-complete', mode, stage: options.stage ?? null, epoch: ctx.epoch, run: ctx.run,
      status: 'completed', G3Certified: false, G4Certified: false, validationClaim: mode === 'run' ? 'only exact stage assertions and actual originals' : 'no product acceptance claim' });
    console.log(JSON.stringify({ mode, label, stage: options.stage ?? null, status: 'completed', publicDirectory: ctx.out, secretsPublished: false, G3Certified: false, G4Certified: false }));
  } catch (error) {
    let privateFailure = null;
    if (ctx && label) { try { privateFailure = ctx.artifact(`${label}-partial.json`, { name: error.name, message: error.message, stack: error.stack, mode }, { kind: 'business-driver-failed-or-partial', mode, stage: options.stage ?? null, originalsPreserved: true, G3Certified: false, G4Certified: false }); } catch { /* Preserve all earlier originals. */ } }
    else if (process.platform === 'linux') {
      try {
        const epoch = segment(options.epoch), run = segment(options.run); assert.equal(fs.realpathSync(FIXED.private), FIXED.private);
        const folder = `${FIXED.private}/business/${epoch}/${run}`; fs.mkdirSync(folder, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(folder), folder);
        const file = `${folder}/setup-failure-${randomUUID()}.json`; fs.writeFileSync(file, JSON.stringify({ name: error.name, message: error.message, stack: error.stack, mode }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        privateFailure = { file };
      } catch { /* If private boundaries cannot be proved, do not publish raw errors. */ }
    }
    console.error(JSON.stringify({ ...safeFailure(error), privateOriginalPreserved: Boolean(privateFailure), privateFailure, mode, label, followup: 'Root inspects this new business private original; no later stage is certified.' })); process.exitCode = 1;
  } finally {
    if (ctx && lock && fs.existsSync(lock)) { try { const owner = JSON.parse(fs.readFileSync(lock)); if (owner.pid === process.pid) fs.unlinkSync(lock); } catch { /* Unknown lock stays for Root reconciliation. */ } }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
