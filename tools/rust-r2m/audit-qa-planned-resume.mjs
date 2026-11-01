// Exact zero-created-resource QA retry only. No adoption/deletion of a role,
// database or data. Root explicitly archives the old manifest after metadata
// proves the actual failed plan created none of the admitted resources.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {root,linuxRoot,qaRoot,privateRoot,parentMarker,sha,publicJson,validateQaPlan,validateQaPrivateName,readNewPrivate,writeQaPrivate,ambientGuard,fixedFailure} from './audit-qa-common.mjs';
export const emptyFailedQa10Sha256='9c994ad52e19c0857fb04c09ebb77653cbbee981e3c205b06c285e88f85f24cc';
export function validateZeroCreatedQaManifest(journal,plan,expectedSha,actualSha){
    assert.equal(expectedSha,emptyFailedQa10Sha256);assert.equal(actualSha,emptyFailedQa10Sha256);assert(journal?.kind==='R2M-whole-QA-resource-creation-journal');assert(journal.planSha256===sha(fs.readFileSync(path.join(root,'tools/rust-r2m/audit-qa-admission.json'))));assert(Array.isArray(journal.resources)&&journal.resources.length===0&&Array.isArray(journal.templates)&&journal.templates.length===0);
    assert.equal(journal.state,'partial-provisioning-preserved');assert(/^r2m-[a-z0-9-]{1,40}$/.test(journal.sourceCapId??''));assert.equal(plan.resources.length,3);return true;
}
export async function archiveZeroCreatedQaManifest({expectedSha,tag}){
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),linuxRoot);ambientGuard(process.env);assert(/^[a-z0-9-]{1,24}$/.test(tag));const plan=validateQaPlan(publicJson('tools/rust-r2m/audit-qa-admission.json')),original=qaRoot+'/resources.json',raw=readNewPrivate(original),journal=JSON.parse(raw);validateZeroCreatedQaManifest(journal,plan,expectedSha,sha(raw));
    const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg'),client=new Client({host:'127.0.0.1',port:20432,database:'postgres',user:'poms_r0e_owner',password:readNewPrivate(privateRoot+'/owner-password').toString('utf8'),connectionTimeoutMillis:5000,query_timeout:15000,application_name:'poms-r2m-QA-zero-created-resume-readonly'});let connected=false;
    const evidence={kind:'R2M-QA-zero-created-manifest-archive',tag,oldManifestSha256:expectedSha,oldManifestState:journal.state,originalSourceCapId:journal.sourceCapId,resourcesCreated:0,result:'metadata-check-pending',databaseOrRoleMutations:0};
    const archive=async file=>{const bytes=readNewPrivate(file),stat=fs.lstatSync(file),name=path.basename(file).replace(/\.json$/,'')+'-before-retry-'+tag+'-'+randomUUID()+'.json';validateQaPrivateName(name);const target=qaRoot+'/'+name,fd=fs.openSync(target,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);fs.closeSync(fd);assert.equal(sha(readNewPrivate(file)),sha(bytes));const current=fs.lstatSync(file);assert(current.ino===stat.ino&&current.dev===stat.dev);fs.renameSync(file,target);assert.equal(sha(readNewPrivate(target)),sha(bytes));return{oldFile:file,file:target,bytes:bytes.length,rawBytesSha256:sha(bytes),private:true}};
    try{
        await client.connect();connected=true;assert.deepEqual((await client.query("select current_database() as db,current_user::text as actor,current_setting('server_version_num') as version,current_setting('port') as port,current_setting('poms.r0e_isolated',true) as isolated")).rows[0],{db:'postgres',actor:'poms_r0e_owner',version:'150012',port:'15432',isolated:'on'});
        for(const template of['poms_r2m_nest','poms_r2m_rust']){const owner=new Client({host:'127.0.0.1',port:20432,database:template,user:'poms_r0e_owner',password:readNewPrivate(privateRoot+'/owner-password').toString('utf8'),connectionTimeoutMillis:5000,query_timeout:15000});try{await owner.connect();assert.deepEqual((await owner.query('select database_name,instance_id::text as instance_id from r2m_control.marker')).rows,[{database_name:template,instance_id:parentMarker}])}finally{await owner.end()}}
        evidence.absence=[];for(const resource of plan.resources){const db=(await client.query('select oid from pg_database where datname=$1',[resource.database])).rows,role=(await client.query('select oid from pg_roles where rolname=$1',[resource.role])).rows;assert.equal(db.length,0);assert.equal(role.length,0);for(const file of[resource.envFile,resource.passwordFile,resource.objectRoot]){let stat;try{stat=fs.lstatSync(file)}catch(error){if(error.code!=='ENOENT')throw error}assert(!stat,'A created environment/object resource is not a zero-created retry')}evidence.absence.push({database:resource.database,role:resource.role,bothAbsent:true})}
        // The exact QA10 failure occurred before the first snapshot file. This
        // is not a general resume of a partially executed provisioning plan.
        for(const template of['poms_r2m_nest','poms_r2m_rust'])assert(!fs.existsSync(qaRoot+'/template-'+template+'-before.json'));
        evidence.archived=[];
        assert.equal(sha(readNewPrivate(original)),expectedSha);evidence.archived.push(await archive(original));evidence.result='zero-created-plan-archived-provision-may-start-fresh';writeQaPrivate('planned-resume-'+tag+'.json',evidence);return evidence;
    }catch(error){try{writeQaPrivate('planned-resume-'+tag+'-failure-'+randomUUID()+'.json',{name:error.name,message:error.message,stack:error.stack,code:error.code??null})}catch{}throw error}
    finally{if(connected)await client.end()}
}
async function cli(){const args=process.argv.slice(2);assert(args.length===5&&args[0]==='--archive-zero-created'&&args[1]==='--journal-sha'&&args[3]==='--tag');const result=await archiveZeroCreatedQaManifest({expectedSha:args[2],tag:args[4]});const file='tmp/rust-r2m/qa-planned-resume-'+result.tag+'.json';assert(!fs.existsSync(file));fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,result:result.result,resourcesCreated:0,actualQAProvisioningPerformed:false}))}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(error=>{process.exitCode=1;console.error(JSON.stringify(fixedFailure(error,'qa-planned-resume')))});
