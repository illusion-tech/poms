import assert from 'node:assert/strict';
// Source04 adds a declaration record before the baseline. Ordinal alone is
// never the identity of a baseline; its actual run/backend/kind must match.
export function selectInitialFull107(records,{runId,backend}){
 const candidates=records.filter(r=>r.data?.kind==='global-before-prepare-full107');
 assert.equal(candidates.length,1,'Exactly one original full107 baseline required');
 const item=candidates[0],frame=item.data.record;
 assert(frame.runId===runId&&frame.backend===backend&&frame.namespace==='poms-r2m'&&frame.tables?.length===107);
 assert.equal(new Set(frame.tables.map(t=>t.table)).size,107);
 return item;
}
export function assertFull107TableKeys(frame,names){
 assert(Array.isArray(names)&&names.length===107&&new Set(names).size===107);
 assert(frame?.rows&&typeof frame.rows==='object'&&!Array.isArray(frame.rows));
 assert.deepEqual(Object.keys(frame.rows).sort(),[...names].sort(),'Every actual physical frame must contain exactly the frozen 107 tables');
 return true;
}
