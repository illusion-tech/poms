import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {OwnedFixture} from './owned-fixture.mjs';
const input='tmp/rust-r2gh/nest-edge-edge01.json',raw=readFileSync(input),old=JSON.parse(raw),out='tmp/rust-r2gh/recovery-edge01.json';assert(!existsSync(out));
const ids=['g-bind-create-due','g-bind-reactivate-due'].map(id=>old.cases.find(row=>row.id===id).response.body.id);assert.equal(new Set(ids).size,2);
const fixture=await OwnedFixture.connect('nest',old.runId),report={formatVersion:1,kind:'bounded-owned-intent-count-recovery',runId:old.runId,input,inputSha256:createHash('sha256').update(raw).digest('hex'),originalFailure:'Pre-registered binding lifecycle intent allowed max1, but bind after unbind creates a new historical row. Cleanup blocked before deleting.',lateMaximumCorrection:true,ids,result:'pending',cleanup:[],startedAt:new Date().toISOString()};
try{
    const intent=fixture.j.intents.find(row=>row.key==='binding');assert.equal(intent.max,1);assert.equal(intent.table,'external_identity');
    const rows=await fixture.rows(intent.table,intent.selector);assert.equal(rows.length,2);assert.deepEqual(rows.map(row=>row.id).sort(),ids.toSorted());
    const statuses=rows.map(row=>JSON.parse(row.snapshot).status).sort();assert.deepEqual(statuses,['active','revoked']);
    intent.max=2;fixture.j.recoveries=[{lateMaximumCorrection:true,previousMax:1,currentMax:2,exactObservedResponseIds:ids,inputSha256:report.inputSha256,at:new Date().toISOString()}];fixture.save();
    report.cleanup.push(await fixture.cleanup());report.cleanup.push(await fixture.cleanup());assert.equal(report.cleanup[1].zero,true);report.result='pass';
}catch(error){report.result='fail';report.error={type:error.name,assertion:error.name==='AssertionError'?error.message:undefined};process.exitCode=1;}
finally{await fixture.close();report.finishedAt=new Date().toISOString();writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(report));}
