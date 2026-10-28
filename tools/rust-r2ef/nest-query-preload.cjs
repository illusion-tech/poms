'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {AsyncLocalStorage}=require('node:async_hooks');
const {createHash}=require('node:crypto');
const {installQueryCapture}=require('../rust-r2c/witness-query-core.cjs');
const {matchesUserQuery}=require('../rust-r2d/user-query-match.cjs');
function privateQuery(args) {
    const text=typeof args[0]==='string'?args[0]:args[0]?.text;
    const params=Array.isArray(args[1])?args[1]:args[0]?.values??[];
    if(typeof text!=='string')return null;
    const atoms=[];let sql='';
    for(let i=0;i<text.length;){
        const tail=text.slice(i);let m;
        if(tail.startsWith('--')){const end=text.indexOf('\n',i+2);i=end<0?text.length:end+1;sql+=' ';}
        else if(tail.startsWith('/*')){const end=text.indexOf('*/',i+2);if(end<0)return null;i=end+2;sql+=' ';}
        else if(text[i]==="'"){
            let value='',closed=false;i++;
            while(i<text.length){if(text[i]==="'"&&text[i+1]==="'"){value+="'";i+=2;}else if(text[i]==="'"){i++;closed=true;break;}else value+=text[i++];}
            if(!closed)return null;sql+='@'+atoms.length;atoms.push(value);
        } else if(text[i]==='"'){
            m=/^"([A-Za-z_][A-Za-z0-9_]*)"/.exec(tail);if(!m)return null;sql+=m[1].toLowerCase();i+=m[0].length;
        } else if((m=/^\$([1-9][0-9]*)/.exec(tail))){sql+='@'+atoms.length;atoms.push(params[Number(m[1])-1]);i+=m[0].length;}
        else {sql+=text[i].toLowerCase();i++;}
    }
    sql=sql.replace(/\s+/g,' ').trim().replace(/;$/,'');
    if(sql.includes(';'))return null;
    return {sql,atoms};
}
function matches(plan,phase,description,args) {
    if(plan.kind==='before-managed-session-update')return matchesUserQuery(plan.kind,phase,description,args,plan);
    const found=/^(before|after)-(dictionary|setting|audit|security|number)-(select|insert|update)$/.exec(plan.kind??'');
    const table={dictionary:'dictionary_item',setting:'system_setting',audit:'audit_log',security:'security_event',number:'business_number_sequence'}[found?.[2]];
    if(!found||phase!==found[1]||description.command!==found[3].toUpperCase()||description.relations.length!==1||description.relations[0]!==table)return false;
    const input=privateQuery(args);if(!input||/\b(?:join|union|intersect|except|or|not)\b/.test(input.sql))return false;
    const nonempty=value=>typeof value==='string'&&value.length>0&&value.length<=255;
    const eq=(clause,field,target)=>{const m=new RegExp('^(?:[a-z_][a-z0-9_]*\\.)?'+field+'\\s*=\\s*@([0-9]+)$').exec(clause);return Boolean(m&&nonempty(target)&&input.atoms[Number(m[1])]===target);};
    if(found[3]==='select'||found[3]==='update'){
        const where=/\bwhere (.+?)(?: order by | limit | returning |$)/.exec(input.sql)?.[1];
        if(!where)return false;
        const field=found[2]==='setting'?'key':'id',target=found[2]==='setting'?plan.targetKey:plan.targetId;
        const clauses=where.replace(/[()]/g,' ').split(/\s+and\s+/).map(s=>s.trim());
        if(found[2]==='dictionary'&&found[3]==='select'&&nonempty(plan.targetDomain)&&nonempty(plan.targetCode))return clauses.length===2&&clauses.some(s=>eq(s,'domain',plan.targetDomain))&&clauses.some(s=>eq(s,'code',plan.targetCode));
        if(!nonempty(target))return false;
        if(clauses.some(s=>!new RegExp('^(?:[a-z_][a-z0-9_]*\\.)?(?:'+field+'|row_version)\\s*=\\s*(?:@[0-9]+|[0-9]+)$').test(s)))return false;
        if(found[3]==='update'&&(clauses.length!==2||clauses.filter(s=>/^(?:[a-z_][a-z0-9_]*\.)?row_version\s*=\s*(?:@[0-9]+|[0-9]+)$/.test(s)).length!==1))return false;
        if(found[3]==='select'&&clauses.length!==1)return false;
        return clauses.filter(s=>eq(s,field,target)).length===1;
    }
    const insert=new RegExp('^insert into poms\\.'+table+'\\s*\\(([^)]+)\\) values\\s*\\((.*)').exec(input.sql);if(!insert)return false;
    let depth=1,end=-1;for(let i=0;i<insert[2].length;i++){if(insert[2][i]==='(')depth++;if(insert[2][i]===')'&&--depth===0){end=i;break;}}
    if(end<0)return false;
    const tail=insert[2].slice(end+1).trim();if(tail&&!/^(?:returning\s+[a-z_][a-z0-9_]*(?:\s*,\s*[a-z_][a-z0-9_]*)*|on conflict\s*\(scope,\s*period\)\s+do update set\s+[\s\S]+ returning\s+[\s\S]+)$/.test(tail))return false;
    const columns=insert[1].split(',').map(s=>s.trim()),values=insert[2].slice(0,end).split(',').map(s=>s.trim());
    if(columns.length!==values.length||columns.some(c=>!/^[a-z_][a-z0-9_]*$/.test(c)))return false;
    const get=field=>{const at=columns.indexOf(field);const m=at<0?null:/^@([0-9]+)(?:::jsonb?)?$/.exec(values[at]);return m?input.atoms[Number(m[1])]:undefined;};
    if(found[2]==='dictionary')return nonempty(plan.targetCode)&&nonempty(plan.targetDomain)&&get('code')===plan.targetCode&&get('domain')===plan.targetDomain;
    if(found[2]==='setting')return nonempty(plan.targetKey)&&get('key')===plan.targetKey;
    if(found[2]==='audit')return nonempty(plan.targetKey)&&nonempty(plan.targetActorId)&&get('target_id')===plan.targetKey&&get('target_type')==='SystemSetting'&&get('operator_id')===plan.targetActorId&&get('event_type')==='platform.system_setting.updated';
    if(found[2]==='security')return nonempty(plan.targetActorId)&&get('actor_id')===plan.targetActorId&&get('event_type')==='authz.route.denied';
    if(found[2]==='number')return nonempty(plan.targetScope)&&nonempty(plan.targetPeriod)&&get('scope')===plan.targetScope&&get('period')===plan.targetPeriod;
    return false;
}
function installFromEnvironment(){
    const tag=process.env.POMS_R2EF_WITNESS_TAG;if(!/^[a-z0-9-]{1,35}$/.test(tag??''))throw new Error('R2EF witness tag');
    const dir=path.resolve(__dirname,'../../tmp/rust-r2ef/witness',tag),stat=fs.lstatSync(dir);
    if(!stat.isDirectory()||stat.isSymbolicLink()||(process.platform!=='win32'&&(stat.mode&0o077)!==0))throw new Error('R2EF witness path');
    const fd=fs.openSync(path.join(dir,'sql.jsonl'),'wx',0o600),storage=new AsyncLocalStorage(),claimed=new Set();
    const readPlan=()=>{const f=path.join(dir,'plan.json');if(!fs.existsSync(f))return null;const s=fs.lstatSync(f);if(!s.isFile()||s.isSymbolicLink()||s.size>4096)throw new Error('R2EF plan');const p=JSON.parse(fs.readFileSync(f,'utf8'));if(!/^[A-Za-z0-9:.-]{1,100}$/.test(p.caseId??''))throw new Error('R2EF case');return p;};
    const {Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const original=Client.prototype.query;
    const capture=installQueryCapture(Client,{
        append(row){const local=storage.getStore();const p=readPlan();fs.writeSync(fd,JSON.stringify({...row,caseId:p?.caseId??null,workerPid:process.pid,backendPid:local?.client?.processID??null})+'\n');},
        onFailure(){fs.writeSync(2,'R2EF_SQL_CAPTURE_INCOMPLETE\n');},
        barrierFor(phase,description){const p=readPlan();if(!p?.barrierId||claimed.has(p.barrierId))return null;if(!/^[a-z0-9-]{1,80}$/.test(p.barrierId))throw new Error('R2EF barrier');const local=storage.getStore();if(!local||!matches(p,phase,description,local.args))return null;claimed.add(p.barrierId);return p;},
        async pause(p,context){fs.writeFileSync(path.join(dir,p.barrierId+'.hit.json'),JSON.stringify({caseId:p.caseId,barrierId:p.barrierId,kind:p.kind,queryId:context.queryId,workerPid:process.pid,targetMatched:true,planSha256:createHash('sha256').update(JSON.stringify(p)).digest('hex')})+'\n',{flag:'wx',mode:0o600});const end=Date.now()+15000;while(Date.now()<end){const f=path.join(dir,p.barrierId+'.release');if(fs.existsSync(f))return fs.readFileSync(f,'utf8').trim()===p.barrierId;await new Promise(r=>setTimeout(r,10));}return false;}
    });
    const captured=Client.prototype.query;Client.prototype.query=function(...args){return storage.run({client:this,args},()=>captured.apply(this,args));};
    return {isIncomplete:capture.isIncomplete,uninstall(){capture.uninstall();Client.prototype.query=original;}};
}
module.exports={privateQuery,matches,installFromEnvironment};
if(module.parent?.id==='internal/preload'||require.main===module)installFromEnvironment();
