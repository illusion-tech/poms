// Four narrowly related public/PG/audit regressions, five subject HTTP calls
// per backend including the dirty-update row's ordinary ASCII setup.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {OwnedFixture} from './owned-fixture.mjs';
const root='/home/wangzishi/projects/poms-rust-r2ij';process.chdir(root);assert.equal(process.version,'v24.19.0');
const [tag,nestTag,rustTag]=process.argv.slice(2);assert(process.argv.length===5&&[tag,nestTag,rustTag].every(v=>/^[a-z0-9-]{1,30}$/.test(v)));
const file=`tmp/rust-r2ij/obs-hydration-${tag}.json`;assert(!existsSync(file));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),units=text=>Array.from({length:text.length},(_,i)=>text.charCodeAt(i));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
const runId=randomUUID(),report={formatVersion:1,kind:'Actual paired clean AUTO hydration and unchanged dirty/disabled UTF16 boundaries; no expanded field matrix',tag,runId,at:new Date().toISOString(),result:'pending',backends:[],comparisons:[],knownExpectations:[]};
function selected(backend,ownerTag,name){if(backend!=='nest')return;const path=`tmp/rust-r2ij/witness/${ownerTag}/plan.json`,temporary=path+'.hydration-next';writeFileSync(temporary,JSON.stringify({caseId:'i.hydration.'+tag+'.'+name})+'\n',{mode:0o600});renameSync(temporary,path);}
async function facts(fixture,keyPrefix){
    const rows=(await fixture.client.query("select to_jsonb(t) as row, encode(convert_to(display_name,'UTF8'),'hex') as display_name_utf8_hex from poms.attachment_storage_provider_config t where provider_type='local' and key_prefix=$1 and created_by=$2::uuid",[keyPrefix,fixture.actor().userId])).rows;assert.equal(rows.length,1);
    const ids=rows.map(v=>v.row.id.toLowerCase().replaceAll('-',''));
    const audits=(await fixture.client.query("select to_jsonb(t) as row from poms.audit_log t where operator_id=$1::uuid and event_type in ('attachment-storage-provider.config.created','attachment-storage-provider.config.updated') and target_type='AttachmentStorageProviderConfig' and replace(lower(target_id),'-','')=any($2::text[]) order by event_type,id",[fixture.actor().userId,ids])).rows.map(v=>v.row);
    return {rows,audits,projection:{providerRows:rows.map(({row,display_name_utf8_hex})=>({displayNameUnits:units(row.display_name),displayNameUtf8Hex:display_name_utf8_hex,enabled:row.enabled,isDefault:row.is_default,status:row.status,rowVersion:row.row_version})),audits:audits.map(row=>({eventType:row.event_type,targetType:row.target_type,result:row.result,before:row.before_snapshot,after:row.after_snapshot,metadata:row.metadata}))}};
}
try{
    for(const [backend,ownerTag] of [['nest',nestTag],['rust',rustTag]]){
        const ownerFile=`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`,owner=JSON.parse(readFileSync(ownerFile));assert.equal(owner.origin,backend==='nest'?'http://127.0.0.1:6700':'http://127.0.0.1:6701');assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);process.kill(owner.pid,0);
        const item={backend,ownerTag,binarySha256:owner.binarySha256,ownerReceiptSha256:hash(readFileSync(ownerFile)),cases:[]};report.backends.push(item);let fixture;
        try{
            fixture=await OwnedFixture.open(backend,runId);selected(backend,ownerTag,'login');const session=await fixture.login(owner.origin);await fixture.assertOwnedDefault();
            async function request(name,method,url,body,keyPrefix){
                selected(backend,ownerTag,name);const bytes=Buffer.from(JSON.stringify(body)),response=await fixture.request(session,method,url,{body:bytes,contentType:'application/json'});await fixture.adoptRuntime();const state=await facts(fixture,keyPrefix);
                const entry={name,method,url,request:{body,displayNameUnits:units(body.displayName),rawBytesBase64:bytes.toString('base64'),rawBytesSha256:hash(bytes)},response:{status:response.status,body:response.body,rawBytesBase64:response.bodyBytes.toString('base64'),rawBytesSha256:hash(response.bodyBytes),contentType:response.contentType},providerRows:state.rows,auditRows:state.audits,projection:{name,httpStatus:response.status,responseDisplayNameUnits:typeof response.body?.displayName==='string'?units(response.body.displayName):null,responseError:response.status>=400?response.body:null,...state.projection}};
                item.cases.push(entry);return response;
            }
            for(const [name,displayName,enabled] of [['clean-enabled-lone','\ud800',true],['disabled-lone','\ud800',false],['clean-enabled-valid-pair','😀',true],['dirty-update-setup','Dirty baseline '+runId,true]]){
                const keyPrefix='ij-'+runId+'/'+name;await fixture.planCreation('provider',{provider_type:'local',key_prefix:keyPrefix});
                const response=await request(name,'POST','/api/platform/attachment-storage-providers',{providerType:'local',displayName,enabled,isDefault:false,keyPrefix},keyPrefix);
                if(name==='dirty-update-setup'){assert.equal(response.status,201);await request('dirty-enabled-update-lone','PATCH',`/api/platform/attachment-storage-providers/${response.body.id}`,{displayName:'\ud800',expectedVersion:response.body.rowVersion},keyPrefix);}
            }
            item.result='observed';
        }finally{selected(backend,ownerTag,'cleanup');if(fixture){item.cleanup1=await fixture.cleanup();item.cleanup2=await fixture.cleanup();assert(item.cleanup2.zero&&item.cleanup2.matched===0&&item.cleanup2.changed===0);await fixture.close();}assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);process.kill(owner.pid,0);}
    }
    const native=report.backends[0],rust=report.backends[1];assert.equal(native.cases.length,5);assert.equal(rust.cases.length,5);
    for(let i=0;i<5;i++)report.comparisons.push({name:native.cases[i].name,equal:JSON.stringify(canonical(native.cases[i].projection))===JSON.stringify(canonical(rust.cases[i].projection))});
    for(const backend of report.backends)for(const [name,status,expectedUnits,enabled,audits] of [['clean-enabled-lone',201,[65533],true,1],['disabled-lone',500,[65533],false,0],['clean-enabled-valid-pair',201,[55357,56832],true,1]]){
        const c=backend.cases.find(v=>v.name===name).projection;report.knownExpectations.push({backend:backend.backend,name,pass:c.httpStatus===status&&JSON.stringify(c.providerRows[0].displayNameUnits)===JSON.stringify(expectedUnits)&&c.providerRows[0].enabled===enabled&&c.providerRows[0].isDefault===false&&c.providerRows[0].rowVersion===1&&c.audits.length===audits});
    }
    report.result=report.comparisons.every(v=>v.equal)&&report.knownExpectations.every(v=>v.pass)?'pass':'fail';if(report.result!=='pass')process.exitCode=1;
}catch(error){report.result='tool-failure';report.failure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({tag,result:report.result,backends:report.backends.map(v=>({backend:v.backend,statuses:v.cases.map(c=>({name:c.name,status:c.response.status,audits:c.auditRows.length,pgNameUnits:c.projection.providerRows[0].displayNameUnits})),doubleCleanupZero:v.cleanup2?.zero})),comparisons:report.comparisons,knownExpectations:report.knownExpectations,failure:report.failure}));}
