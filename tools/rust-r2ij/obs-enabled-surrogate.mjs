// Exactly one observed product request per backend. No expected status or
// hydration result is imposed; original response/PG/audit facts are preserved.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {OwnedFixture} from './owned-fixture.mjs';
const root='/home/wangzishi/projects/poms-rust-r2ij';process.chdir(root);
assert.equal(process.version,'v24.19.0');assert.equal(process.platform,'linux');
const [tag,nestTag,rustTag]=process.argv.slice(2);assert(process.argv.length===5&&[tag,nestTag,rustTag].every(v=>/^[a-z0-9-]{1,30}$/.test(v)));
const file=`tmp/rust-r2ij/obs-enabled-surrogate-${tag}.json`;assert(!existsSync(file));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),units=text=>Array.from({length:text.length},(_,i)=>text.charCodeAt(i));
const runId=randomUUID(),keyPrefix='ij-'+runId+'/enabled-surrogate',input={providerType:'local',displayName:'\ud800',enabled:true,isDefault:false,keyPrefix},inputBytes=Buffer.from(JSON.stringify(input));
const report={formatVersion:1,kind:'Narrow actual original/Rust enabled nondefault local CREATE lone-surrogate observation, not a source-inferred expectation',tag,runId,at:new Date().toISOString(),request:{method:'POST',path:'/api/platform/attachment-storage-providers',body:input,displayNameUnits:units(input.displayName),rawBytesBase64:inputBytes.toString('base64'),rawBytesSha256:hash(inputBytes)},result:'pending',backends:[]};
function selected(backend,ownerTag,name){if(backend!=='nest')return;const path=`tmp/rust-r2ij/witness/${ownerTag}/plan.json`,temporary=path+'.enabled-next';writeFileSync(temporary,JSON.stringify({caseId:'i.enabled-surrogate.'+tag+'.'+name})+'\n',{mode:0o600});renameSync(temporary,path);}
try{
    for(const [backend,ownerTag,priorTag] of [['nest',nestTag,'witness02'],['rust',rustTag,'api17']]){
        const ownerFile=`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`,owner=JSON.parse(readFileSync(ownerFile)),prior=JSON.parse(readFileSync(`tmp/rust-r2ij/owner-${backend}-${priorTag}-start.json`));
        assert.equal(owner.binarySha256,prior.binarySha256);assert.deepEqual(owner.sourceFiles,prior.sourceFiles);assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);process.kill(owner.pid,0);
        const item={backend,ownerTag,binarySha256:owner.binarySha256,ownerReceiptSha256:hash(readFileSync(ownerFile)),sameProductAndBinaryAsPriorAcceptedOwner:true};report.backends.push(item);let fixture;
        try{
            fixture=await OwnedFixture.open(backend,runId);selected(backend,ownerTag,'login');const session=await fixture.login(owner.origin);item.actor=fixture.actor().userId;
            await fixture.assertOwnedDefault();await fixture.planCreation('provider',{provider_type:'local',key_prefix:keyPrefix});
            selected(backend,ownerTag,'create');const response=await fixture.request(session,'POST','/api/platform/attachment-storage-providers',{body:inputBytes,contentType:'application/json'});await fixture.adoptRuntime();
            item.response={status:response.status,body:response.body,rawBytesBase64:response.bodyBytes.toString('base64'),rawBytesSha256:hash(response.bodyBytes),rawUtf8:response.bodyBytes.toString('utf8'),contentType:response.contentType,displayNameUnits:typeof response.body?.displayName==='string'?units(response.body.displayName):null};
            const rows=(await fixture.client.query("select to_jsonb(t) as row, encode(convert_to(display_name,'UTF8'),'hex') as display_name_utf8_hex from poms.attachment_storage_provider_config t where provider_type='local' and key_prefix=$1 and created_by=$2::uuid",[keyPrefix,fixture.actor().userId])).rows;assert(rows.length<=1);item.providerRows=rows;
            const ids=rows.map(v=>v.row.id.toLowerCase().replaceAll('-',''));
            item.auditRows=ids.length?(await fixture.client.query("select to_jsonb(t) as row from poms.audit_log t where operator_id=$1::uuid and event_type='attachment-storage-provider.config.created' and target_type='AttachmentStorageProviderConfig' and replace(lower(target_id),'-','')=any($2::text[]) order by id",[fixture.actor().userId,ids])).rows.map(v=>v.row):[];
            item.observation={httpStatus:response.status,responseDisplayNameUnits:item.response.displayNameUnits,responseError:response.status>=400?response.body:null,providerRows:rows.map(({row,display_name_utf8_hex})=>({displayNameUnits:units(row.display_name),displayNameUtf8Hex:display_name_utf8_hex,enabled:row.enabled,isDefault:row.is_default,status:row.status,rowVersion:row.row_version})),audits:item.auditRows.map(row=>({eventType:row.event_type,targetType:row.target_type,result:row.result,before:row.before_snapshot,after:row.after_snapshot,metadata:row.metadata}))};
            item.result='observed';
        }finally{selected(backend,ownerTag,'cleanup');if(fixture){item.cleanup1=await fixture.cleanup();item.cleanup2=await fixture.cleanup();assert(item.cleanup2.zero&&item.cleanup2.matched===0&&item.cleanup2.changed===0);await fixture.close();}assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);process.kill(owner.pid,0);}
    }
    const equal=JSON.stringify(report.backends[0].observation)===JSON.stringify(report.backends[1].observation);report.comparison={equal,scope:'HTTP status/name/error, exact PG persisted name and state, full audit snapshots/metadata; generated IDs/timestamps retained in original facts'};report.result=equal?'observed-match':'observed-difference';
}catch(error){report.result='tool-failure';report.failure={name:error.name,code:error.code??null,message:error.message};process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({tag,result:report.result,backends:report.backends.map(item=>({backend:item.backend,observation:item.observation,doubleCleanupZero:item.cleanup2?.zero})),failure:report.failure}));}
