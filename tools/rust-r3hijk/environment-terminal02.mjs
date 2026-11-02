// Root stops only its new labelled QA container; volumes, credentials and originals remain.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import net from 'node:net';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pin} from './source-guard.mjs';
const state='/home/wangzishi/.local/share/poms-r3hijk',priv=state+'/private',identity=JSON.parse(fs.readFileSync(state+'/identity.json'));
assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r3hijk');assert.equal(identity.namespace,'poms-r3hijk');assert.equal(identity.container,'poms-r3hijk-pg15');assert.equal(identity.volume,'poms-r3hijk-pg15-data');
const out='tmp/rust-r3hijk/environment-terminal02.json';assert(!fs.existsSync(out));
function pod(args){const result=spawnSync('podman',['--cgroup-manager=cgroupfs',...args],{encoding:null,maxBuffer:160000000});assert.equal(result.status,0,'Owned podman operation failed');return result;}
const inspect=()=>JSON.parse(pod(['container','inspect',identity.container]).stdout)[0];
const before=inspect();assert.equal(before.Config.Labels['org.poms.scope'],'rust-r3hijk');assert.equal(before.Config.Labels['org.poms.base'],identity.base);assert(before.Mounts.some(x=>x.Name===identity.volume));assert(before.State.Running);
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const db=new Client({host:'127.0.0.1',port:22433,database:'poms_r3hijk_rust',user:'poms_r0e_owner',password:fs.readFileSync(priv+'/owner-password','utf8'),application_name:'poms-r3hijk-final-environment-terminal'});await db.connect();let logging;
try{
 assert.equal((await db.query('select instance_id::text marker from r3hijk_control.marker')).rows[0].marker,identity.marker);
 assert.equal((await db.query("select count(*)::int n from pg_stat_activity where usename='poms_r3hijk_app'")).rows[0].n,0,'All owned applications must release their connections');
 await db.query('alter system reset log_statement');await db.query('alter system reset log_line_prefix');await db.query('select pg_reload_conf()');
 for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,40));if((await db.query('show log_statement')).rows[0].log_statement==='none')break;}
 logging=(await db.query("select name,setting,source from pg_settings where name in ('log_statement','log_line_prefix') order by name")).rows;assert.equal(logging.find(x=>x.name==='log_statement').setting,'none');
}finally{await db.end();}
const logs=pod(['logs',identity.container]);const originalStreams=[];
for(const stream of ['stdout','stderr']){const file=priv+'/postgres-terminal02-original-'+stream+'.bin';fs.writeFileSync(file,logs[stream],{flag:'wx',mode:0o600});originalStreams.push(pin(file));}
pod(['stop','--time','20',identity.container]);const after=inspect();assert.equal(after.Id,before.Id);assert.equal(after.State.Running,false);pod(['volume','exists',identity.volume]);
async function free(port){return await new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});}
const ports=[];for(const port of [12400,12410,12500,12600,22433]){let available=false;for(let i=0;i<60;i++){available=await free(port);if(available)break;await new Promise(r=>setTimeout(r,100));}assert(available,'Owned port remains bound '+port);ports.push({port,free:true});}
const runtimeStates=[];
for(const file of fs.readdirSync(priv).filter(x=>/^(nest|rust)-[a-z0-9-]+\.json$/.test(x))){const runtime=JSON.parse(fs.readFileSync(priv+'/'+file));if(runtime.kind!=='R3HIJK-owned-Linux-runtime')continue;assert.equal(runtime.cwd,'/home/wangzishi/projects/poms-rust-r3hijk');let running=false;try{const stat=fs.readFileSync('/proc/'+runtime.pid+'/stat','utf8').split(') ')[1];running=stat.split(' ')[19]===runtime.startTime&&!stat.startsWith('Z');}catch{}assert(!running,'Owned runtime remains alive '+file);runtimeStates.push({file,pid:runtime.pid,stopped:true,artifactSha256:runtime.artifactSha256});}
const report={kind:'R3HIJK-new-owned-environment-terminal',createdAt:new Date().toISOString(),marker:identity.marker,container:identity.container,containerId:before.Id,ownedLabelsVerified:true,PG15Stopped:true,containerAndVolumeRetained:true,volume:identity.volume,newPrivateAndOriginalLogsRetained:true,loggingRestored:logging,originalSQLStreams:originalStreams,runtimeStates,ports,oldPG17OrPriorPrivateTouched:false,credentialsPublished:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({ownedPG15Stopped:true,volumeAndPrivateRetained:true,runtimesStopped:runtimeStates.length,ports:ports.map(x=>x.port),SQLLoggingRestored:'none'}));
