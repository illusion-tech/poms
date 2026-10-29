import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const [tag,nestOwner,rustOwner]=process.argv.slice(2);assert(process.argv.length===5&&[tag,nestOwner,rustOwner].every(x=>/^[a-z0-9-]{1,35}$/.test(x??'')));
const runId=randomUUID(),values=[];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function project(report){
    const ids=new Map([[report.runId,'$run']]);for(const actor of report.actors)ids.set(actor.userId,'$user.'+actor.account);
    const facts=report.facts;
    const single={customer:'customer',lead:'lead',project:'project',contract:'contract',sales_follow_up_record:'follow-up',project_handover:'handover',contract_term_snapshot:'term'};
    for(const [table,name] of Object.entries(single))for(const row of facts[table])ids.set(row.id,'$'+name);
    for(const row of facts.approval_summary_snapshot)ids.set(row.id,'$summary.'+row.target_type);
    for(const c of report.cases){
        if(c.body?.id&&c.name==='auto-create-enabled')ids.set(c.body.id,'$config.one');
        if(c.body?.id&&c.name==='create-disabled-conflicting')ids.set(c.body.id,'$config.disabled');
        if(c.body?.id&&c.name==='batch-default-a')ids.set(c.body.id,'$config.a');
        if(c.body?.id&&c.name==='batch-default-b')ids.set(c.body.id,'$config.b');
        if(c.body?.id&&c.name.startsWith('session-create-'))ids.set(c.body.id,'$session.'+(c.name.endsWith('missi')?'missing':'preseed'));
        if(c.body?.id&&c.name==='complete-pending-preseeded-object')ids.set(c.body.id,'$attachment');
        ids.set(c.beforeAuth.id,c.name.startsWith('batch-default-')?'$auth.left':'$auth.main');
    }
    for(const row of facts.attachment_storage_provider_config)if(!ids.has(row.id)){assert(row.key_prefix.endsWith('/unicode'));ids.set(row.id,'$config.unicode');}
    for(const row of facts.attachment_link)ids.set(row.id,'$link.'+row.target_type+'.'+row.relation_type);
    for(const row of facts.audit_log)ids.set(row.id,'$audit.'+row.event_type+'.'+ids.get(row.target_id)+'.v'+(row.after_snapshot?.rowVersion??''));
    const replacements=[...ids].flatMap(([id,name])=>[[id,name],[id.toUpperCase(),name+':upper'],[id.replaceAll('-',''),name+':compact']]).sort((a,b)=>b[0].length-a[0].length);
    const bodyTimes=new Set(['createdAt','updatedAt','uploadedAt','completedAt','abortedAt','deletedAt','credentialsUpdatedAt','linkedAt','unlinkedAt','checkedAt','expiresAt']);
    const factTimes=new Set(['created_at','updated_at','uploaded_at','completed_at','aborted_at','deleted_at','credentials_updated_at','linked_at','unlinked_at','occurred_at','generated_at','expires_at']);
    function transform(value,where,key){
        if(typeof value==='string'){
            if((where.startsWith('body')&&bodyTimes.has(key))||(where.startsWith('facts.')&&factTimes.has(key)&&!(where.startsWith('facts.sales_follow_up_record')&&key==='occurred_at'))||(where.startsWith('facts.audit_log')&&key==='credentialsUpdatedAt')){
                if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(value))return '$server-time';
            }
            if(where.startsWith('facts.lead')&&key==='score_updated_at'){const at=Date.parse(value);assert(at>=Date.parse(report.at)&&at<=Date.parse(report.cases.at(-1).finishedAt));return '$fixture-score-time';}
            for(const [from,to] of replacements)value=value.replaceAll(from,to);return value;
        }
        if(Array.isArray(value))return value.map((v,index)=>transform(v,where+'['+index+']',key));
        if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,transform(v,where+'.'+k,k)]));
        return value;
    }
    const cases=report.cases.map(c=>({name:c.name,status:c.status,body:transform(c.body,'body',''),authDelta:c.afterAuth.row_version-c.beforeAuth.row_version}));
    const projectedFacts=transform(facts,'facts','');for(const rows of Object.values(projectedFacts))rows.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    const race={statuses:report.batchRace.statuses.toSorted((a,b)=>a-b),bodies:report.batchRace.bodies.map(body=>transform(body,'body','')).toSorted((a,b)=>a.rowVersion-b.rowVersion),finalRows:report.batchRace.finalRows.map(row=>transform(row,'race','')).toSorted((a,b)=>a.id.localeCompare(b.id)),waiting:report.batchRace.waiting.length};
    assert.deepEqual(race.statuses,[200,200]);assert(race.finalRows.every(row=>row.row_version===3));assert.equal(race.waiting,2);
    return {cases,facts:projectedFacts,race};
}
const report={formatVersion:1,tag,runId,at:new Date().toISOString(),result:'pending',scope:'Strict actual Nest/Rust due-auth/AUTO/coflush/batch-window parity, two controlled blocked UPDATEs per backend',inputs:[]};
try{
    for(const [backend,owner] of [['nest',nestOwner],['rust',rustOwner]]){
        execFileSync(process.execPath,['tools/rust-r2ij/auth-scenario.mjs',backend,tag,owner],{env:{...process.env,POMS_R2IJ_SHARED_RUN:runId},stdio:['ignore','pipe','pipe'],timeout:120000});
        const file=`tmp/rust-r2ij/auth-scenario-${backend}-${tag}.json`,raw=readFileSync(file),observed=JSON.parse(raw);assert.equal(observed.result,'pass');assert.equal(observed.cleanup2.matched,0);assert.equal(observed.cleanup2.changed,0);assert(observed.cleanup2.zero);
        report.inputs.push({backend,file,sha256:sha(raw),cases:observed.cases.length,concurrentRequests:observed.batchRace.requests});values.push(project(observed));
    }
    try{assert.deepEqual(values[1],values[0]);}catch{report.difference={nest:values[0],rust:values[1]};throw new Error('Auth/UoW response or state differences');}
    report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
writeFileSync(`tmp/rust-r2ij/auth-comparison-${tag}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:report.result,inputs:report.inputs,failure:report.failure}));
