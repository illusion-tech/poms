#!/usr/bin/env node
// Import/--help never connects. Only the explicit Root-run mode enters I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext, guard } from './context.mjs';
import { capture } from './snapshot.mjs';
import { safeSummary, requireSafeSegment } from './pure.mjs';

const [mode, ...args] = process.argv.slice(2);
if (!mode || mode === '--help') {
  console.log('driver.mjs preflight|baseline|run|plan-cleanup|apply-cleanup|noop --epoch E --run R [--stage smoke|faults|pending|races] [--phase unique-attempt] [--approved-plan-sha SHA --api-stopped-receipt PRIVATE_FILE]');
  process.exit(0);
}
assert(['preflight', 'baseline', 'run', 'plan-cleanup', 'apply-cleanup', 'noop'].includes(mode));
const options = {};
for (let n = 0; n < args.length; n += 2) { assert(/^--[a-z-]+$/.test(args[n]) && args[n + 1]); assert(!Object.hasOwn(options, args[n].slice(2))); options[args[n].slice(2)] = args[n + 1]; }
assert(Object.keys(options).every(k => ['epoch', 'run', 'stage', 'phase', 'approved-plan-sha', 'api-stopped-receipt', 'throttle-seconds'].includes(k)));
let ctx, lock, label;
try {
  ctx = createContext(options);
  lock = `${ctx.priv}/driver.lock`;
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode, at: new Date().toISOString() }) + '\n', { flag: 'wx', mode: 0o600 });
  label = ctx.next(requireSafeSegment(options.phase ?? mode)); ctx.persist();
  ctx.artifact(`${label}-intent.json`, { mode, label, epoch: ctx.epoch, run: ctx.run, sourcePins: ctx.pins, helperPins: ctx.helperPins });
  let result;
  if (mode === 'preflight') {
    const databases = [];
    for (const name of ctx.databases) databases.push(await ctx.db(async c => ({ ...await guard(c, name, ctx.identity), tables: (await c.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND c.relkind='r'")).rows[0].n }), name));
    assert(databases.every(d => d.tables === 120));
    result = { kind: 'read-only-new-namespace-preflight', databases, sourcePins: ctx.pins };
  } else if (mode === 'baseline') {
    assert(!ctx.state.baseline, 'Never overwrite original baseline');
    assert(!ctx.state.cleaned, 'Run is already cleaned');
    const baselineLabel = `baseline-${label}`;
    const snapshot = await capture(ctx, baselineLabel);
    ctx.state.baseline = snapshot.manifest; ctx.state.baselineLabel = baselineLabel; ctx.persist();
    result = { kind: 'immutable-baseline', snapshot: snapshot.manifest, databaseCount: 2, tablesPerDatabase: 120, noBusinessRequestsSent: true };
  } else if (mode === 'run') {
    assert(ctx.state.baseline && !ctx.state.cleaned && !ctx.state.cleanupPlan, 'Baseline required; no new writes after cleanup planning');
    const { runStage } = await import('./scenarios.mjs');
    result = await runStage(ctx, options.stage ?? 'smoke', label);
  } else {
    assert(ctx.state.baseline);
    const { cleanupMode } = await import('./cleanup.mjs');
    result = await cleanupMode(ctx, mode, label);
  }
  ctx.artifact(`${label}-complete.json`, result, { kind: 'userfix-driver-complete', mode, epoch: ctx.epoch, run: ctx.run, status: 'completed', validationClaim: mode === 'run' ? 'only explicit completed stage assertions' : 'no product acceptance claim' });
  console.log(JSON.stringify({ mode, label, status: 'completed', publicDirectory: ctx.out, secretsPublished: false }));
} catch (error) {
  if (ctx && label) {
    try { ctx.artifact(`${label}-partial.json`, { name: error.name, message: error.message, stack: error.stack, mode }, { kind: 'userfix-driver-partial', mode, epoch: ctx.epoch, run: ctx.run, status: 'failed-or-partial', originalsPreserved: true }); } catch { /* Never replace earlier original failure evidence. */ }
  }
  console.error(JSON.stringify({ ...safeSummary(error), mode, label, followup: 'Inspect new-namespace private failure original; no later stage is certified by this process.' }));
  process.exitCode = 1;
} finally {
  if (ctx && lock && fs.existsSync(lock)) {
    try { const owner = JSON.parse(fs.readFileSync(lock)); if (owner.pid === process.pid) fs.unlinkSync(lock); } catch { /* Leave unknown lock for Root reconciliation. */ }
  }
}
