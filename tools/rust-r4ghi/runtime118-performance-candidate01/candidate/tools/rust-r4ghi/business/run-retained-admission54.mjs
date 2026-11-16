#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { admitRetained54 } from './retained-admission54.mjs';
export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') { console.log('Root only: run-retained-admission54.mjs EXACT_REVIEWED_PLAN_JSON PLAN_RAW_SHA256; strict retained data/source/process checks, metadata fork only, no HTTP or business SQL.'); return; }
  if (argv.length !== 2) throw new Error('Exact reviewed plan and raw SHA are required');
  try { console.log(JSON.stringify(await admitRetained54({ planFile: argv[0], approvedPlanSHA256: argv[1] }))); }
  catch (error) { console.error(JSON.stringify({ kind: 'retained-consumer-admission54-failed', name: error.name, message: error.message, noProducerFactRewritten: true, pendingContextMustNotRun: true })); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
