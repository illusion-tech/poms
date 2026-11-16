'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash,randomUUID}=require('node:crypto');
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',dir=root+'/tmp/rust-r4ghi/root/runtime118-performance-review01/run-'+randomUUID();
assert.equal(process.version,'v24.19.0');fs.mkdirSync(dir,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const identity=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)};};
const manifestPath=root+'/tools/rust-r4ghi/runtime118-performance-candidate01/execution-manifest.json',manifest=JSON.parse(fs.readFileSync(manifestPath));
for(const p of manifest.graph){assert.equal(identity(p.candidate.file).rawBytesSha256,p.candidate.rawBytesSha256);if(p.original)assert.equal(identity(root+'/'+p.relative).rawBytesSha256,p.original.rawBytesSha256);}
const program=root+'/tools/rust-r4ghi/runtime118-performance-review01/independent-cases.mjs';const start=process.hrtime.bigint(),r=spawnSync(process.execPath,[program],{cwd:root,encoding:null,timeout:60000,maxBuffer:4*1024*1024});
for(const [name,bytes]of[['stdout.bin',r.stdout??Buffer.alloc(0)],['stderr.bin',r.stderr??Buffer.alloc(0)]])fs.writeFileSync(dir+'/'+name,bytes,{flag:'wx'});
const result={kind:'non-author-runtime118-command',reviewer:'/root/performance118_independent_review01',reviewerIsAuthor:false,reviewedCommit:'72275c80e92fad30bb736af3c5e5ee5a00731739',engine:identity(process.execPath),program:identity(program),manifest:identity(manifestPath),graphVerified:manifest.graph.length,originalsVerified:manifest.graph.filter(p=>p.original).length,args:[program],cwd:root,elapsedNs:(process.hrtime.bigint()-start).toString(),exitCode:r.status,signal:r.signal,error:r.error?{name:r.error.name,code:r.error.code}:null,stdout:identity(dir+'/stdout.bin'),stderr:identity(dir+'/stderr.bin')};
fs.writeFileSync(dir+'/command.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');console.log(JSON.stringify({command:dir+'/command.json',exitCode:r.status}));process.exitCode=r.status===0?0:1;
