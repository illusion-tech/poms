import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {OwnedFixture} from './owned-fixture.mjs';
const input=process.argv[2];assert.equal(process.argv.length,3);const bytes=readFileSync(input),old=JSON.parse(bytes),output=input.replace(/\.json$/,'-inspection.json');assert(!existsSync(output));
const fixture=await OwnedFixture.connect('nest',old.runId),sourceId=old.cases.find(row=>row.id==='h-source-create-due').response.body.id,runId=old.cases.find(row=>row.id==='h-preview-due').response.body.id;
const candidates=old.originalCreateCandidates;
try{
    const codes=candidates.map(row=>row.candidateSnapshot.targetCode).filter(value=>typeof value==='string');
    const orgs=(await fixture.client.query('select id::text,parent_id::text,code,name,created_by::text,updated_by::text,row_version,created_at::text from poms.org_unit where code=any($1::text[]) order by code',[codes])).rows;
    const mappings=(await fixture.client.query('select id::text,external_department_id,org_unit_id::text,status,row_version from poms.external_department_mapping where source_id=$1 order by external_department_id',[sourceId])).rows;
    const diffs=(await fixture.client.query('select id::text,external_department_id,action,status,org_unit_id::text,candidate_snapshot_json,error_message,row_version from poms.org_sync_diff_item where run_id=$1 order by external_department_id',[runId])).rows;
    const result={formatVersion:1,kind:'read-only-failed-run-owned-inspection',input,inputSha256:createHash('sha256').update(bytes).digest('hex'),runId:old.runId,rootId:fixture.j.rootId,sourceId,syncRunId:runId,baseUsers:fixture.j.baseUsers,candidates,orgs,mappings,diffs,cleanupFailureReason:'Runner only planned action=create, but original action uses create-org-unit; preserve failure and inspect exact pre-apply codes before recovery. No deletion or adoption in this inspection.'};
    writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(result));
}finally{await fixture.close();}
