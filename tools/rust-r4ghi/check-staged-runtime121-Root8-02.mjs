// Compare Git index bytes with the exact reviewed Root8, not working-tree labels.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',L='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',sha=b=>createHash('sha256').update(b).digest('hex');
const file=R+'/tools/rust-r4ghi/runtime-recovery121/root/tests/sealed-API-code03/manifest-Root8-API-code121.json',bytes=fs.readFileSync(file);assert.equal(sha(bytes),'aeb02ab6b034f96feb42c20f0cf2b42c5888b96c36f4b2a2d7b3c34a5ce4dd66');
const m=JSON.parse(bytes),entries=[];assert.equal(m.production.length,8);
for(const p of m.production){assert(p.file.startsWith('tools/rust-r4ghi/runtime-recovery121/root/'));assert(!p.file.includes('..'));const current=fs.readFileSync(R+'/'+p.file),r=spawnSync('git',['show',':'+p.file],{cwd:R,maxBuffer:4*1024*1024});assert.equal(r.status,0);assert.equal(sha(current),p.afterSHA256);assert.equal(sha(r.stdout),p.afterSHA256);entries.push({file:L+'/'+p.file,bytes:current.length,reviewedSHA256:p.afterSHA256,workingTreeSHA256:sha(current),indexSHA256:sha(r.stdout),exact:true});}
const out=R+'/tools/rust-r4ghi/runtime-recovery121/root/tests/staged-Root8-source-delivery02.json';fs.writeFileSync(out,JSON.stringify({kind:'actual-Root8-staged-raw-byte-delivery',recordedAt:new Date().toISOString(),manifest:{file:L+file.slice(R.length),bytes:bytes.length,rawBytesSha256:sha(bytes)},entries,allEightMatch:true,APIStarted:false,sourcePromotionGranted:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:L+out.slice(R.length),bytes:fs.statSync(out).size,rawBytesSha256:sha(fs.readFileSync(out)),allEightMatch:true}));
