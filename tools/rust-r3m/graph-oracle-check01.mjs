// Root actually closes C-G2-ORACLE-01 using explicit missing/empty negative cases.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { requireGraph, assertGraphUnchanged } from './graph-assertions01.mjs';
import { pin } from './source-guard.mjs';
const requirements = { tables: ['lead', 'lead_score_override', 'lead_score_snapshot', 'audit_log'], rows: [{ table: 'lead', id: 'owned-lead' }, { table: 'lead_score_override', id: 'owned-override' }] };
const valid = { lead: [{ id: 'owned-lead', row_version: 1 }], lead_score_override: [{ id: 'owned-override', status: 'pending' }], lead_score_snapshot: [], audit_log: [] };
const cases = [];
for (const [name, before, after] of [
  ['missing-both', undefined, undefined], ['empty-both', {}, {}], ['missing-table', { ...valid, lead_score_snapshot: undefined }, valid],
  ['missing-lead-row', { ...valid, lead: [] }, valid], ['missing-override-row', valid, { ...valid, lead_score_override: [] }],
  ['duplicate-target', valid, { ...valid, lead: [valid.lead[0], valid.lead[0]] }], ['real-write-is-not-rollback', valid, { ...valid, lead: [{ id: 'owned-lead', row_version: 2 }] }],
]) { assert.throws(() => assertGraphUnchanged(before, after, requirements)); cases.push({ name, rejected: true }); }
assert(requireGraph(valid, requirements)); assert(assertGraphUnchanged(valid, structuredClone(valid), requirements)); cases.push({ name: 'complete-real-shape-identical-graphs', passed: true });
const out = 'tmp/rust-r3m/graph-oracle-check01.json';
fs.writeFileSync(out, JSON.stringify({ kind: 'R3-actual-rollback-oracle-negative-check', closes: 'C-G2-ORACLE-01-evidence-guard', completed: true, cases, requirements, sources: ['tools/rust-r3m/graph-assertions01.mjs', 'tools/rust-r3m/graph-oracle-check01.mjs'].map(pin), realBusinessTransactionAcceptance: false, G3Certified: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ completed: true, cases: cases.length, missingOrEmptyCapturesCannotPass: true }));
