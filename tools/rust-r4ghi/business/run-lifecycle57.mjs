#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createContext, FIXED } from './context.mjs';
import { sha, segment, safeFailure } from './pure.mjs';
export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') { console.log('Root only: run-lifecycle57.mjs EPOCH RUN same-task|cross-parent|sensitive-get|prepare-two-task|different-tasks; current actual retained consumer context and source pins required. No import/help I/O.'); return; }
  assert.equal(argv.length, 3); const epoch = segment(argv[0]), run = segment(argv[1]), mode = argv[2];
  assert(['same-task', 'cross-parent', 'sensitive-get', 'prepare-two-task', 'different-tasks'].includes(mode)); assert.equal(process.platform, 'linux');
  const lock = `${FIXED.private}/business/${epoch}/${run}/driver.lock`; assert(!fs.existsSync(lock), 'Wait for Root102/lifecycle/UI driver to end');
  const ctx = createContext({ epoch, run }); fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: `lifecycle57-${mode}` }) + '\n', { flag: 'wx', mode: 0o600 });
  let label;
  try {
    assert(ctx.state.baseline && !ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleaned);
    const pins = JSON.parse(fs.readFileSync(new URL('./lifecycle-sources57.json', import.meta.url)));
    for (const pin of pins) assert.equal(ctx.pins.find(value => value.file === pin.file)?.sha256, pin.sha256, `Actual A07 source changed: ${pin.file}`);
    const { ownSameTask57, crossParent57, sensitiveGet57 } = await import('./lifecycle-cases57.mjs');
    const { prepareTwoTask57, differentTasks57 } = await import('./lifecycle-two-task57.mjs');
    label = ctx.next(`a07-${mode}`); ctx.persist(); ctx.artifact(`${label}-intent.json`, { kind: 'Root-actual-A07-mode-intent', mode, sourcePins: ctx.pins, helperPins: ctx.helperPins });
    const result = await ({ 'same-task': ownSameTask57, 'cross-parent': crossParent57, 'sensitive-get': sensitiveGet57, 'prepare-two-task': prepareTwoTask57, 'different-tasks': differentTasks57 }[mode])(ctx);
    const receipt = ctx.artifact(`${label}-complete.json`, result, { kind: 'actual-A07-mode-complete', mode, G3Certified: false, G4Certified: false }); console.log(JSON.stringify({ status: 'completed', mode, receipt, G3Certified: false, G4Certified: false }));
  } catch (error) {
    const original = ctx.artifact(`${ctx.next('a07-partial')}.json`, { name: error.name, message: error.message, stack: error.stack, mode }); console.error(JSON.stringify({ ...safeFailure(error), mode, original })); process.exitCode = 1;
  } finally { const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); fs.unlinkSync(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
