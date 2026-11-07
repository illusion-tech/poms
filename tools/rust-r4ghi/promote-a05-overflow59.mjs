import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',relative='tools/rust-r4ghi/I/implementation/business-a05-overflow59',proposal='E:/projects/worktrees/poms-r4i-lifecycle/poms/'+relative;
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=fs.readFileSync(proposal+'/manifest59.json');assert.equal(sha(raw),'0537ef5681e026973d87e8dfc6f205de3b7247feeff24bc09f9e37c652dec96a');const m=JSON.parse(raw);assert.equal(m.files.length,7);
for(const p of [...m.productSources,...m.runtimeDependencies])assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.sha256);
for(const p of m.files){const target=root+'/'+p.file;if(p.beforeSHA256===null)assert(!fs.existsSync(target));else assert.equal(sha(fs.readFileSync(target)),p.beforeSHA256);assert.equal(sha(fs.readFileSync(proposal+'/'+p.candidate)),p.afterSHA256);}
const before=root+'/tools/rust-r4ghi/checkpoints/a05-overflow59/a05-capture26.before.bin';fs.mkdirSync(path.dirname(before),{recursive:true});fs.copyFileSync(root+'/'+m.files[0].file,before,fs.constants.COPYFILE_EXCL);
for(const p of m.files)fs.copyFileSync(proposal+'/'+p.candidate,root+'/'+p.file);
const archive=root+'/'+relative;fs.mkdirSync(archive,{recursive:true});const files=new Set(fs.readdirSync(proposal,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name));for(const p of m.files)files.add(p.candidate);
for(const file of files){const dest=archive+'/'+file;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(proposal+'/'+file,dest,fs.constants.COPYFILE_EXCL);}
const node='C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe',tests=fs.readdirSync(root+'/tools/rust-r4ghi/business').filter(f=>f.endsWith('.test.mjs')).map(f=>'tools/rust-r4ghi/business/'+f);
const r=spawnSync(node,['--test',...tests],{cwd:root,encoding:'utf8',timeout:60000}),out=root+'/tmp/rust-r4ghi/root/a05-overflow59-promotion';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/stdout.log',r.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/stderr.log',r.stderr??'',{flag:'wx'});assert.equal(r.status,0);
fs.writeFileSync(root+'/docs/design/rust-r4ghi/a05-overflow59-tool-promotion.json',JSON.stringify({kind:'Root-nonauthor-reviewed-a05-overflow59-tool-promotion',manifest:{file:relative+'/manifest59.json',rawBytesSha256:sha(raw)},files:m.files,original93HelpersRetainedAtCommit:'c4192c4842f40ec1d4667d7189863f7093f37975',original409Preserved:true,actualNode:'v24.19.0',pureTestsExitCode:r.status,businessHTTPOrSQLExecuted:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:7,pureTestsExitCode:r.status,actualRecoveryExecuted:false,actualHTTPExecuted:false}));
