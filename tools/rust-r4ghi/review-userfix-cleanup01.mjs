import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const priv='/home/wangzishi/.local/share/poms-r4ghi/private/userfix/userfix115/run01';
const file=priv+'/00129-cleanup-plan01-cleanup-plan.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(file);assert.equal(sha(bytes),'69c50b931b2dd3f0a3f959b7e186710087356d52653cc476bdfc41e82bc6a3ee');
const plan=JSON.parse(bytes),state=JSON.parse(fs.readFileSync(priv+'/state.json'));
assert.equal(plan.namespace,'poms-r4ghi');assert.equal(plan.marker,state.marker);assert.equal(plan.status,'ready-for-Root-review');assert.deepEqual(plan.blockers,[]);assert.equal(plan.restoreRows.length,0);assert.equal(plan.deleteRows.length,121);
const allowed=new Set(['platform_user','role','org_unit','auth_session','security_event','audit_log','user_role_assignment','user_org_membership']);
const ids=new Map(),seen=new Set();
for(const row of plan.deleteRows){
 assert.equal(row.database,'poms_r4ghi_rust');assert(allowed.has(row.table));assert.deepEqual(row.pk,['id']);assert.equal(sha(row.raw),row.sha256);
 const key=JSON.stringify([row.database,row.table,row.key]);assert(!seen.has(key));seen.add(key);
 const owner=state.owned[key];assert(owner&&owner.latestSha256===row.sha256);assert(owner.proof&&owner.latestProof);
 const value=JSON.parse(row.raw);assert.equal(value.id,row.key[0]);ids.set(row.table+':'+value.id,{row,value});
 if(row.table==='platform_user')assert(value.username.startsWith(state.prefix+'-'));
 if(row.table==='role')assert(value.role_key.startsWith(state.prefix+'-'));
 if(row.table==='org_unit')assert(value.code.startsWith(state.prefix+'-'));
 if(row.table==='security_event')assert(value.request_id.startsWith(state.prefix+'-'));
}
for(const {row,value} of ids.values()){
 if(row.table==='user_role_assignment'){assert(ids.has('platform_user:'+value.user_id));assert(ids.has('role:'+value.role_id));}
 if(row.table==='user_org_membership'){assert(ids.has('platform_user:'+value.user_id));assert(ids.has('org_unit:'+value.org_unit_id));}
 if(row.table==='audit_log')assert(['platform_user','role','org_unit'].some(t=>ids.has(t+':'+value.target_id)));
 if(row.table==='auth_session'){
  assert(Object.values(state.actors).some(a=>a.id===value.user_id&&a.cookies?.poms_session&&sha(decodeURIComponent(a.cookies.poms_session))===value.token_hash));
 }
}
const snapshot=JSON.parse(fs.readFileSync(plan.current.file));
const rows=plan.deleteRows;
for(let child=0;child<rows.length;child++)for(const fk of snapshot.databases.poms_r4ghi_rust.meta.foreignKeys.filter(f=>f.child===rows[child].table)){
 const cells=rows[child].cells;if(fk.childColumns.some(c=>cells[c]===null))continue;
 const parent=rows.findIndex(r=>r.table===fk.parent&&fk.parentColumns.every((p,n)=>r.cells[p]===cells[fk.childColumns[n]]));
 if(parent>=0)assert(child<parent,'Child must be removed before its actual newly-created parent');
}
assert.equal(plan.control.triggers.length,7);assert(plan.control.function.startsWith(state.prefix+'_uf_'));assert(plan.control.table.startsWith(state.prefix+'_uf_'));
const result={kind:'Root-exact-owned-userfix-cleanup-plan-review',capturedAt:new Date().toISOString(),plan:{file,rawBytesSha256:sha(bytes)},rowsReviewed:121,tables:[...allowed],restoreRows:0,unknownRows:0,allOwnershipAndCurrentHashesVerified:true,fixtureNaturalKeysAndAuditTargetsVerified:true,sessionCookieHashBindingVerified:true,rowLevelFKDeletionOrderVerified:true,controlTriggerCount:7,approvedForSingleGuardedApplyAfterActualStop:true};
fs.writeFileSync('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/cleanup-plan-review01.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
