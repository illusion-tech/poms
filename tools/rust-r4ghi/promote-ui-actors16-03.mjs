import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',relative='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16-03',source='E:/projects/worktrees/poms-r4h-signals/poms/'+relative,sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(source+'/manifest16-03.json');assert.equal(sha(raw),'d27c8cda56b97b177c6e5d34b92eb700221ac9978974f14b343f014979c1f773');const m=JSON.parse(raw);assert.equal(m.products.length,1);const p=m.products[0];
assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.beforeSHA256);assert.equal(sha(fs.readFileSync(source+'/'+p.candidate)),p.afterSHA256);
const before=root+'/tools/rust-r4ghi/checkpoints/ui-actors16-03/binding-input16.before.bin';fs.mkdirSync(path.dirname(before),{recursive:true});fs.copyFileSync(root+'/'+p.file,before,fs.constants.COPYFILE_EXCL);
const archive=root+'/'+relative;fs.mkdirSync(archive,{recursive:true});
for(const item of[{file:'manifest16-03.json',rawBytesSha256:sha(raw)},...m.files]){const b=fs.readFileSync(source+'/'+item.file);assert.equal(sha(b),item.rawBytesSha256);const dest=archive+'/'+item.file;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b,{flag:'wx'});}
fs.copyFileSync(source+'/'+p.candidate,root+'/'+p.file);
const node='C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe',r=spawnSync(node,['--test',archive+'/used-actor-keys16-03.test.mjs'],{cwd:root,encoding:'utf8',timeout:30000});
const out=root+'/tmp/rust-r4ghi/root/ui-actors16-03';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/stdout.log',r.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/stderr.log',r.stderr??'',{flag:'wx'});assert.equal(r.status,0);
fs.writeFileSync(root+'/docs/design/rust-r4ghi/ui-actors16-03-promotion.json',JSON.stringify({kind:'Root-nonauthor-exact-fixture-actor-proof-closure-tool-promotion',manifestRawSHA256:sha(raw),product:p,
 review:'Fixture-only explicit actorProofKeys plus actual role participant actor keys; collector and generator retain real current-auth originals; no fake cases or edited actor manifest',actualNode:'v24.19.0',pureTests:6,pureExitCode:r.status,actualHTTPOrDOMExecuted:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:1,pureTests:6,pureExitCode:r.status,actualHTTPOrDOMExecuted:false}));
