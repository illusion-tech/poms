// Explicitly extend dynamic-time and legal-winner comparison; retain first diffs.
import fs from'node:fs';import assert from'node:assert/strict';
const from='tools/rust-r3hijk/compare-core01.mjs',to='tools/rust-r3hijk/compare-core02.mjs';let s=fs.readFileSync(from,'utf8');
const replace=(a,b)=>{assert(s.includes(a),a.slice(0,80));s=s.replaceAll(a,b)};
replace("tag='01'","tag='02'");replace("'createdAt','updatedAt'","'scoreUpdatedAt','qualifiedAt','requestedAt','approvedAt','rejectedAt','createdAt','updatedAt'");
replace("function norm(v,side,key='')",`const runtimeSets=[new Set(),new Set()];function collectTimes(v,side,key=''){if(typeof v==='string'&&runtimeTimeKeys.has(key)&&/^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z$/.test(v))runtimeSets[side].add(v);if(v&&typeof v==='object')for(const[k,x]of Object.entries(v))collectTimes(x,side,k);}collectTimes(A.events,0);collectTimes(B.events,1);
function norm(v,side,key='')`);
replace("if(runtimeTimeKeys.has(key)&&", "if((runtimeTimeKeys.has(key)||runtimeSets[side].has(v))&&");
replace("const comparisons=[];for(const p of pairs){", "const comparisons=[],racePairs=[];for(const p of pairs){if(p.label.startsWith('controlled-race.')){racePairs.push(p);continue;}");
const anchor="const result={kind:'R3HIJK-original-HTTP-body-comparison'";
assert(s.includes(anchor));s=s.replace(anchor,`const raceComparisons=[];
for(const table of['lead','lead_score_override','sales_discovery_record']){
 const group=racePairs.filter(p=>p.label.startsWith('controlled-race.'+table+'.'));assert.equal(group.length,2);
 const statuses=[group.map(p=>p.a.response.status).sort(),group.map(p=>p.b.response.status).sort()];assert.deepEqual(statuses[0],[200,500]);assert.deepEqual(statuses[1],[200,500]);
 const winners=[group.find(p=>p.a.response.status===200).a,group.find(p=>p.b.response.status===200).b],bodies=winners.map((e,side)=>{const body=norm(e.response.body,side);const actor=(side?B:A).actors.find(a=>a.label===e.actor);assert(actor);const actorId=norm(actor.userId,side);const field=table==='lead'?'leadName':table==='lead_score_override'?'approvalNote':'remark';const requestField=table==='lead_score_override'?'note':field;assert.equal(e.response.body[field],e.request[requestField]);body[field]='<winning-request-value>';const userField=table==='lead_score_override'?'approvedBy':'updatedBy';assert.equal(body[userField],actorId);body[userField]='<winning-actor>';assert.equal(body.rowVersion,2);return body;});
 const delta=changes(bodies[0],bodies[1]);if(delta.length)diffs.push({kind:'race-success-body',table,delta});
 const values=[A,B].map(report=>{if(table==='sales_discovery_record')return report.observations.find(x=>x.label==='I94.N4.two-reader-managed-CAS').value;return report.cases.find(x=>x.label.includes('W2.'+(table==='lead'?'lead-':'override-'))).value;});
 const metrics=values.map((v,side)=>{const competition=v.competition||v.race;assert.equal(competition.waitingBeforeRelease,2);const before=table==='sales_discovery_record'?v.before:table==='lead'?v.before.lead:v.initial;const after=table==='sales_discovery_record'?v.after:table==='lead'?v.after.lead:v.after.overrides.find(x=>x.id===before.id);assert.equal(after.row_version,before.row_version+1);const winner=(side?B:A).actors.find(x=>x.label===winners[side].actor);assert.equal(after[table==='lead_score_override'?'approved_by':'updated_by'],winner.userId);const counts=table==='sales_discovery_record'?v.actualAudits.map(x=>(x.rows||x).length):v.audits.map(x=>x.length);assert.deepEqual([...counts].sort(),[0,1]);if(v.stale)assert.equal(v.stale.status,409);if(table!=='sales_discovery_record')assert.equal(v.after.snapshots.length-v.before.snapshots.length,1);return{heldWaiters:2,statuses:[200,500],versionDelta:1,auditCounts:[0,1],snapshots:table==='sales_discovery_record'?null:1};});
 assert.deepEqual(metrics[0],metrics[1]);raceComparisons.push({table,HTTPEvents:2,successBodyEqual:delta.length===0,metrics:metrics[0],winnerNative:winners[0].actor,winnerRust:winners[1].actor,allRequestAndPGAssertionsPassed:true});
}
${anchor}`);
replace('bindings,conflicts,comparisons,differences:diffs','bindings,conflicts,comparisons,raceComparisons,differences:diffs');
replace("Initial literal comparison reports all winner permutations; none silently ignored","Three controlled two-reader races require2 heldwaiters,200/500,version+1,one audit and one snapshot as applicable, then compare full success bodies under validated winner request/actor substitution; original literal differences retained in comparison01");
replace("events:{native:A.events.length,rust:B.events.length,paired:pairs.length}","events:{native:A.events.length,rust:B.events.length,paired:pairs.length,exactNonRace:comparisons.length,raceHTTP:racePairs.length}");
fs.writeFileSync(to,s,{flag:'wx'});
