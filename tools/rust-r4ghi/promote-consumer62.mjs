import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',relative='tools/rust-r4ghi/I/implementation/business-consumer-admission62',proposal='E:/projects/worktrees/poms-r4i-lifecycle/poms/'+relative,sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(proposal+'/manifest62.json');assert.equal(sha(raw),'92a2ca0a0c7feb04a9e65f2c1bbd168b3962d42c4ba11f1be419ccd7d9aec519');const m=JSON.parse(raw);assert.equal(m.files.length,5);
for(const p of m.runtimeDependencies)assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.sha256);
for(const p of m.files){if(p.beforeSHA256===null)assert(!fs.existsSync(root+'/'+p.file));else assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.beforeSHA256);assert.equal(sha(fs.readFileSync(proposal+'/'+p.candidate)),p.afterSHA256);}
const before=root+'/tools/rust-r4ghi/checkpoints/consumer62';assert(!fs.existsSync(before));fs.mkdirSync(before,{recursive:true});
for(const p of m.files)if(p.beforeSHA256)fs.copyFileSync(root+'/'+p.file,before+'/'+path.basename(p.file)+'.before.bin',fs.constants.COPYFILE_EXCL);
const archive=root+'/'+relative;fs.mkdirSync(archive,{recursive:true});const files=new Set(fs.readdirSync(proposal,{withFileTypes:true}).filter(e=>e.isFile()&&!/\.(exe|pdb|rlib|rmeta)$/.test(e.name)).map(e=>e.name));for(const p of m.files)files.add(p.candidate);
for(const file of files){const target=archive+'/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(proposal+'/'+file,target,fs.constants.COPYFILE_EXCL);}
for(const p of m.files)fs.copyFileSync(proposal+'/'+p.candidate,root+'/'+p.file);
const node='C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe',tests=fs.readdirSync(root+'/tools/rust-r4ghi/business').filter(f=>f.endsWith('.test.mjs')).map(f=>'tools/rust-r4ghi/business/'+f),r=spawnSync(node,['--test',...tests],{cwd:root,encoding:'utf8',timeout:60000});
const out=root+'/tmp/rust-r4ghi/root/consumer62-promotion';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/stdout.log',r.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/stderr.log',r.stderr??'',{flag:'wx'});assert.equal(r.status,0);
fs.writeFileSync(root+'/docs/design/rust-r4ghi/consumer62-tool-promotion.json',JSON.stringify({kind:'Root-nonauthor-reviewed-exact-chained-consumer62-tool-promotion',manifest:{file:relative+'/manifest62.json',rawBytesSha256:sha(raw)},files:m.files,
 HIndependentReview:{manifestRawSHA256:'a4a1e32ed95eb7e4ebd1dbd5691506bb80e0bf261baf9380ee13054fb67d4b12',reviewRawSHA256:'4c576b3550c8d705a1f32adaa820e1a4525ff2b8b9ce2a6b07c453fd84eef1f4'},actualNode:'v24.19.0',pureTestsExitCode:r.status,
 actualConsumerMintExecuted:false,actualSQLOrHTTPExecuted:false,oldProducerRecordsAndEvidenceNotRewritten:true,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:5,pureTestsExitCode:r.status,actualConsumerMintExecuted:false}));
