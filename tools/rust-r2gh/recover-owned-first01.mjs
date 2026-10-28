// Explicit bounded recovery for the preserved first01 harness planning failure.
// This is late adoption and must never be represented as pre-registered intent.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {OwnedFixture} from './owned-fixture.mjs';
const file='tmp/rust-r2gh/nest-witness-first01-inspection.json',raw=readFileSync(file),old=JSON.parse(raw),out='tmp/rust-r2gh/recovery-first01.json';assert(!existsSync(out));
assert.equal(old.runId,'65a7dff1-cbcc-426f-9f4d-ba85deb054ea');assert.equal(old.orgs.length,2);assert.equal(old.candidates.length,2);
const fixture=await OwnedFixture.connect('nest',old.runId);
const report={formatVersion:1,kind:'bounded-owned-harness-recovery',runId:old.runId,inspection:file,inspectionSha256:createHash('sha256').update(raw).digest('hex'),planningFailure:'First runner tested action=create; original action=create_org_unit. Two original-generated OrgUnit rows missed pre-registration. Existing unknown-reference guard blocked all deletion.',lateAdoption:true,decision:'Exact pre-apply candidate code/name plus actual actor, source/run, full current row and root relationship verified before adopting these two UUIDs',ids:old.orgs.map(row=>row.id),startedAt:new Date().toISOString(),cleanup:[],result:'pending'};
try{
    assert.deepEqual(fixture.j.baseUsers,old.baseUsers);assert.equal(fixture.j.rootId,old.rootId);
    assert(fixture.j.objects.some(row=>row.table==='org_sync_run'&&row.id===old.syncRunId));
    const current=(await fixture.client.query('select id::text,parent_id::text,code,name,created_by::text,updated_by::text,row_version,created_at::text from poms.org_unit where id=any($1::uuid[]) order by code',[report.ids])).rows;
    assert.deepEqual(current,old.orgs);
    for(const row of current){const candidate=old.candidates.find(item=>item.candidateSnapshot.targetCode===row.code);assert(candidate&&candidate.action==='create_org_unit');assert.equal(row.name,candidate.candidateSnapshot.targetName);assert.equal(row.created_by,fixture.j.baseUsers[0]);assert.equal(row.updated_by,fixture.j.baseUsers[0]);assert.equal(row.row_version,1);assert(row.parent_id===null||row.parent_id===old.rootId);const original=(await fixture.client.query('select run_id::text,status,action,candidate_snapshot_json from poms.org_sync_diff_item where id=$1',[candidate.id])).rows;assert.equal(original.length,1);assert.equal(original[0].run_id,old.syncRunId);assert.equal(original[0].status,'applied');assert.equal(original[0].action,'create_org_unit');assert.equal(original[0].candidate_snapshot_json.targetCode,row.code);assert.equal(original[0].candidate_snapshot_json.targetName,row.name);fixture.j.objects.push({table:'org_unit',id:row.id,origin:'first01-explicit-late-recovery',identity:{code:row.code}});}
    fixture.j.recoveries=[{at:new Date().toISOString(),inspectionSha256:report.inspectionSha256,lateAdoption:true,ids:report.ids,reason:report.planningFailure}];fixture.save();
    report.cleanup.push(await fixture.cleanup());report.cleanup.push(await fixture.cleanup());assert.equal(report.cleanup[1].zero,true);report.result='pass';
}catch(error){report.result='fail';report.failure={type:error.name,assertion:error.name==='AssertionError'?error.message:undefined};process.exitCode=1;}
finally{await fixture.close();report.finishedAt=new Date().toISOString();writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(report));}
