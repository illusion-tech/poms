import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHmac,createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const [tag,nestOwner,rustOwner]=process.argv.slice(2),recompare=process.argv[5]==='recompare';assert(process.argv.length===(recompare?6:5)&&[tag,nestOwner,rustOwner].every(x=>/^[a-z0-9-]{1,35}$/.test(x??'')));
const previous=recompare?JSON.parse(readFileSync(`tmp/rust-r2ij/critical-comparison-${tag}.json`)):null;
const runId=previous?.runId??randomUUID(),outcomes=[];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function headerSignatureVerified(caseResult,run){
    const message=caseResult.body.message,match=/Signature=([0-9a-f]{64})/.exec(message),scope=/Credential=a\nb\/([0-9]{8})\/r2ij\/s3\/aws4_request/.exec(message);
    assert(match&&scope,'Original invalid header retains the generated signed authorization');
    const days=new Set([caseResult.startedAt,caseResult.finishedAt].map(t=>t.slice(0,10).replaceAll('-','')));assert(days.has(scope[1]));
    const hmac=(key,text)=>createHmac('sha256',key).update(text).digest();
    const signing=hmac(hmac(hmac(hmac(Buffer.from('AWS4r2ij-synthetic-header-key'),scope[1]),'r2ij'),'s3'),'aws4_request');
    let valid=false;
    for(let ms=Math.floor(Date.parse(caseResult.startedAt)/1000)*1000-1000;ms<=Date.parse(caseResult.finishedAt)+1000;ms+=1000){
        const at=new Date(ms).toISOString().replace(/[:-]|\.[0-9]{3}/g,''),empty=sha(Buffer.alloc(0));
        const canonical=['HEAD','/b-'+run,'',`host:127.0.0.1:6900\nx-amz-content-sha256:${empty}\nx-amz-date:${at}\n`,'host;x-amz-content-sha256;x-amz-date',empty].join('\n');
        const expected=createHmac('sha256',signing).update(['AWS4-HMAC-SHA256',at,scope[1]+'/r2ij/s3/aws4_request',sha(Buffer.from(canonical))].join('\n')).digest('hex');
        if(expected===match[1])valid=true;
    }
    assert(valid,'Error-embedded signature must independently match a real bounded request clock');
}
function normalize(report){
    // Ciphertext uses random IVs. Keep each backend's fingerprint stable across
    // this no-credential-update scenario before projecting only those two
    // exact storage fields; actual header signatures independently prove use
    // of the configured synthetic AK/SK below.
    const fingerprints=new Map();
    for(const c of report.cases)for(const row of c.facts.attachment_storage_provider_config)for(const key of ['encrypted_access_key_id_sha256','encrypted_secret_access_key_sha256']){
        const value=row[key],identity=row.id+':'+key;assert(value===null||/^[0-9a-f]{64}$/.test(value));
        if(fingerprints.has(identity))assert.equal(value,fingerprints.get(identity),'No silent credential rewrite during reads/test');else fingerprints.set(identity,value);
    }
    const ids=new Map([[report.runId,'$run']]);
    for(const actor of report.actors)ids.set(actor.userId,'$user.'+actor.account);
    const facts=report.cases.at(-1).facts;
    const single={customer:'customer',lead:'lead',project:'project',contract:'contract',sales_follow_up_record:'follow-up',project_handover:'handover',contract_term_snapshot:'term'};
    for(const [table,name] of Object.entries(single))for(const row of facts[table])ids.set(row.id,'$'+name);
    for(const row of facts.approval_summary_snapshot)ids.set(row.id,'$summary.'+row.target_type);
    for(const row of facts.attachment_storage_provider_config)ids.set(row.id,'$config.'+row.key_prefix.split('/').at(-1));
    for(const row of facts.attachment_upload_session)ids.set(row.id,'$session.'+row.operation_type);
    for(const row of facts.attachment)ids.set(row.id,'$attachment.v'+row.version_no);
    for(const row of facts.attachment_link)ids.set(row.id,'$link.'+ids.get(row.attachment_id)+'.'+row.target_type+'.'+row.relation_type);
    for(const row of facts.audit_log)ids.set(row.id,'$audit.'+row.event_type+'.'+ids.get(row.target_id));
    const replacements=[...ids].flatMap(([id,name])=>[[id,name],[id.toUpperCase(),name+':upper'],[id.replaceAll('-',''),name+':compact']]).sort((a,b)=>b[0].length-a[0].length);
    function text(value){for(const [from,to] of replacements)value=value.replaceAll(from,to);return value;}
    const bodyTimes=new Set(['createdAt','updatedAt','uploadedAt','completedAt','abortedAt','deletedAt','credentialsUpdatedAt','linkedAt','unlinkedAt','checkedAt','expiresAt']);
    const dataTimes=new Set(['created_at','updated_at','uploaded_at','completed_at','aborted_at','deleted_at','credentials_updated_at','linked_at','unlinked_at','occurred_at','generated_at','expires_at']);
    function transform(value,where,key){
        if(typeof value==='string'){
            if(where.startsWith('facts.attachment_storage_provider_config')&&['encrypted_access_key_id_sha256','encrypted_secret_access_key_sha256'].includes(key))return '$stable-random-ciphertext-fingerprint';
            if(where.startsWith('facts.lead')&&key==='score_updated_at'){
                const at=Date.parse(value);assert(at>=Date.parse(report.at)&&at<=Date.parse(report.cases.at(-1).finishedAt),'Fixture-generated score timestamp interval');return '$fixture-generated-score-time';
            }
            const bodyTime=where.startsWith('body')&&bodyTimes.has(key);
            const factTime=where.startsWith('facts.')&&dataTimes.has(key)&&!(where.startsWith('facts.sales_follow_up_record')&&key==='occurred_at');
            const snapshotTime=where.startsWith('facts.audit_log')&&key==='credentialsUpdatedAt';
            if((bodyTime||factTime||snapshotTime)&&/^[+-]?[0-9]{4,6}-[0-9]{2}-[0-9]{2}T/.test(value))return '$server-time';
            return text(value);
        }
        if(Array.isArray(value))return value.map((item,index)=>transform(item,where+'['+index+']',key));
        if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,transform(v,where+'.'+k,k)]));
        return value;
    }
    return report.cases.map(c=>{
        if(c.name==='headers.test-connection')headerSignatureVerified(c,report.runId);
        if(c.name==='upload.session-create'||c.name==='version.session-create'){
            const expires=Date.parse(c.body.expiresAt);assert(expires>=Date.parse(c.startedAt)+3600000&&expires<=Date.parse(c.finishedAt)+3600000,'Session TTL request interval');
        }
        const result={name:c.name,status:c.status,body:transform(c.body,'body',''),facts:transform(c.facts,'facts','')};
        if(c.name==='headers.test-connection')result.body.message=result.body.message.replace(/Credential=a\nb\/[0-9]{8}\//,'Credential=a\nb/<scope-date>/').replace(/Signature=[0-9a-f]{64}/,'Signature=<bounded-clock-verified-signature>');
        for(const rows of Object.values(result.facts))rows.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
        return result;
    });
}
const report={formatVersion:1,tag,runId,at:new Date().toISOString(),result:'pending',scope:recompare?'Offline comparator correction over the same immutable actual HTTP/PG receipts; no requests repeated':'Strict same-input Nest/Rust HTTP+PG+local critical parity; explicit generated-ID and bounded server-clock projections only',inputs:[],projectionPolicy:'Exact generated IDs; DTO/fact server clock paths; interval-checked fixture lead score time; stable random ciphertext fingerprints with independent bounded-clock header-signature verification'};
try{
    for(const [backend,owner] of [['nest',nestOwner],['rust',rustOwner]]){
        if(!recompare)execFileSync(process.execPath,['tools/rust-r2ij/critical-scenario.mjs',backend,tag,owner],{env:{...process.env,POMS_R2IJ_SHARED_RUN:runId},stdio:['ignore','pipe','pipe'],timeout:120000});
        const file=`tmp/rust-r2ij/critical-${backend}-${tag}.json`,raw=readFileSync(file),observed=JSON.parse(raw);assert.equal(observed.result,'pass');
        if(recompare)assert.equal(sha(raw),previous.inputs.find(input=>input.backend===backend).sha256);
        assert.deepEqual(observed.observations.secondDefaultCreate,500);assert.equal(observed.observations.explicitSetDefault,200);assert.equal(observed.observations.loneSurrogateConfig,500);assert.equal(observed.observations.versionComplete,500);
        assert.equal(observed.cleanup2.changed,0);assert.equal(observed.cleanup2.matched,0);assert(observed.cleanup2.zero);
        report.inputs.push({backend,file,sha256:sha(raw),cases:observed.cases.length});outcomes.push(normalize(observed));
    }
    const differences=[];for(let i=0;i<outcomes[0].length;i++){try{assert.deepEqual(outcomes[1][i],outcomes[0][i]);}catch{differences.push({case:outcomes[0][i].name,nest:outcomes[0][i],rust:outcomes[1][i]});}}
    report.differences=differences;assert.equal(differences.length,0,'Critical response/state differences');report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
writeFileSync(`tmp/rust-r2ij/critical-comparison-${tag}${recompare?'-delta01':''}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:report.result,inputs:report.inputs,differenceCases:report.differences?.map(x=>x.case),failure:report.failure}));
