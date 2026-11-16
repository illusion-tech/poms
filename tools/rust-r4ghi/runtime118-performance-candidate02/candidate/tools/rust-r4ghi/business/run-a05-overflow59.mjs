#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createContext, FIXED } from './context.mjs';
import { segment, safeFailure } from './pure.mjs';

export async function main59(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') { console.log('Root only: run-a05-overflow59.mjs EPOCH RUN 200|422 (one exact reviewed public-preparation expected status); no receipt POST or local hash.'); return; }
  assert.equal(argv.length, 3); assert.equal(process.platform, 'linux'); const epoch = segment(argv[0]), run = segment(argv[1]), preparationExpectedStatus = Number(argv[2]); assert([200, 422].includes(preparationExpectedStatus));
  const lock = `${FIXED.private}/business/${epoch}/${run}/driver.lock`; assert(!fs.existsSync(lock)); const ctx = createContext({ epoch, run }); fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'a05-overflow59' }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    assert(ctx.state.baseline && !ctx.state.activeFault && !ctx.state.blockedObservation && !ctx.state.cleaned);
    for (const pin of JSON.parse(fs.readFileSync(new URL('./a05-overflow-sources59.json', import.meta.url)))) assert.equal(ctx.pins.find(source => source.file === pin.file)?.sha256, pin.sha256);
    const { createApi } = await import('./http.mjs'), { openA05View26, boundaryStep26 } = await import('./a05-view26.mjs'), { overflowBoundary26 } = await import('./a05-capture26.mjs');
    const { ctx: view, record } = openA05View26(ctx, 'max-zero'), overflow = view.state.fixtures.a05Overflow26;
    assert(overflow?.staleAttempt59?.code === 'operating_input_hash_changed' && overflow.extraCash?.basisVerified, 'First apply the reviewed exact metadata recovery; never recreate the committed receipt');
    const api = createApi(view); await api.login('manager');
    const result = await boundaryStep26(view, record, 'aggregate-overflow', () => overflowBoundary26(view, api, { preparationExpectedStatus }));
    const receipt = view.artifact(`${view.next('a05-overflow59-complete')}.json`, result); console.log(JSON.stringify({ status: 'completed', receipt, preparationExpectedStatus, G3Certified: false, G4Certified: false }));
  } catch (error) { const original = ctx.artifact(`${ctx.next('a05-overflow59-partial')}.json`, { name: error.name, message: error.message, stack: error.stack, preparationExpectedStatus }); console.error(JSON.stringify({ ...safeFailure(error), original })); process.exitCode = 1; }
  finally { assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main59();
