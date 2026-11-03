import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root='/home/wangzishi/projects/poms-rust-r4abc', win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', priv='/home/wangzishi/.local/share/poms-r4abc/private';
assert.equal(process.platform,'linux');
const out=win+'/tmp/rust-r4abc/root/ts-checks11';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const names=JSON.parse(fs.readFileSync(win+'/tmp/rust-r4abc/root/ts-source-list11.json','utf8')).inputs;
for(const f of ['libs/shared/contracts/src/lib/shared-contracts.ts','libs/shared/api-spec/openapi.json', 'tools/openapi/shared-api-client-baseline.json','tools/openapi/shared-api-client.mjs'])if(!names.includes(f)&&fs.existsSync(win+'/'+f))names.push(f);
const inputs=names.map(file=>{const b=fs.readFileSync(win+'/'+file);fs.mkdirSync(path.dirname(root+'/'+file),{recursive:true});fs.writeFileSync(root+'/'+file,b);return{file,bytes:b.length,sha256:sha(b)}});
const env={};for(const k of ['HOME','USER','LOGNAME','LANG','LC_ALL','TMPDIR'])if(process.env[k])env[k]=process.env[k];Object.assign(env,{PATH:path.dirname(process.execPath)+':/usr/local/bin:/usr/bin:/bin',POMS_ENV_FILE:priv+'/generation-build.env',NX_DAEMON:'false',NX_ISOLATE_PLUGINS:'false',CI:'true'});
const jobs=[
 ['build',['node_modules/nx/dist/bin/nx.js','run-many','-t','build','--projects=poms-api,poms-admin','--parallel=2','--skip-nx-cache']],
 ['lint',['node_modules/nx/dist/bin/nx.js','run-many','-t','lint','--projects=poms-api,poms-admin,admin-data-access,shared-contracts,shared-api-client','--parallel=2','--skip-nx-cache']],
 ['admin-test',['node_modules/nx/dist/bin/nx.js','test','poms-admin','--runInBand','--skip-nx-cache']],
 ['api-test',['node_modules/nx/dist/bin/nx.js','test','poms-api','--runInBand','--skip-nx-cache']]
];
const commands=await Promise.all(jobs.map(async([name,args])=>{
 const stdout=out+'/'+name+'-stdout-original.bin',stderr=out+'/'+name+'-stderr-original.bin',o=fs.openSync(stdout,'wx'),e=fs.openSync(stderr,'wx'),startedAt=new Date().toISOString();
 const child=spawn(process.execPath,args,{cwd:root,env,stdio:['ignore',o,e]});fs.closeSync(o);fs.closeSync(e);
 const exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});
 const result={name,args,startedAt,completedAt:new Date().toISOString(),exitCode,stdoutSha256:sha(fs.readFileSync(stdout)),stderrSha256:sha(fs.readFileSync(stderr))};
 fs.writeFileSync(out+'/'+name+'-receipt11.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({name,exitCode}));return result;
}));
const report={kind:'R4-current-actual-TypeScript-checks',inputs,commands,allPassed:commands.every(c=>c.exitCode===0),NativeNewLifecycleConformant:false,browserAccepted:false};
fs.writeFileSync(out+'/receipt11.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});if(!report.allPassed)process.exitCode=1;
