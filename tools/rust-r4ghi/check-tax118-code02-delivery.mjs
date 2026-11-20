// Read the staged raw blobs; no normalization of the reviewed live sources.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import{createHash}from'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',manifest=JSON.parse(fs.readFileSync(R+'/tools/rust-r4ghi/tax15-invocation118/tests/sealed-code02/manifest118-code02.json'));
const sha=b=>createHash('sha256').update(b).digest('hex'),files=[];
for(const p of manifest.production){const b=fs.readFileSync(R+'/'+p.file);assert.equal(sha(b),p.afterSHA256);const g=spawnSync('git',['show',':'+p.file],{cwd:R,windowsHide:true,maxBuffer:4*1024*1024});assert.equal(g.status,0);assert.deepEqual(g.stdout,b,p.file);files.push({file:p.file,bytes:b.length,rawBytesSha256:sha(b),stagedRawSame:true});}
const o=R+'/tools/rust-r4ghi/independent/tax118-corrective-code02/staged-eight-source-readback.json';fs.writeFileSync(o,JSON.stringify({kind:'eight-reviewed-live-source-to-Git-index-raw-readback',files,newBusinessCertified:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:o,rawBytesSha256:sha(fs.readFileSync(o)),count:files.length,allSame:true}));
