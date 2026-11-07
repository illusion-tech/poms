import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',author='E:/projects/worktrees/poms-r4i-lifecycle/poms',sha=b=>createHash('sha256').update(b).digest('hex');
const proposals=[['business-lifecycle-races57','manifest57.json','231dbc5117bd75c39d976a14798bc8d4a3106ca6b6d966363eb4ae2d0fbf19b9'],
 ['business-lifecycle-races57-02','manifest57-02.json','737b1f76d2965cc9527af031b1d7b8f696fd88c6c87f2995f04565f8b0d4b88f'],
 ['business-frozen-reparent58','manifest58.json','671310e3645e36bc321fd5b53790aabb46c2d188a4b9c39c7e0c7b333f93d206']];
const receipts=[];
for(const [name,manifest,expected]of proposals){const relative='tools/rust-r4ghi/I/implementation/'+name,source=author+'/'+relative,bytes=fs.readFileSync(source+'/'+manifest);assert.equal(sha(bytes),expected);const m=JSON.parse(bytes);
 for(const pin of [...(m.runtimeSources??m.sourcePins??[]),...(m.runtimeHelperDependencies??[])])assert.equal(sha(fs.readFileSync(root+'/'+pin.file)),pin.sha256,'Source73 exact input changed: '+pin.file);
 for(const p of m.files){assert(p.file.startsWith('tools/rust-r4ghi/business/')&&!p.file.includes('..'));assert.equal(sha(fs.readFileSync(source+'/'+p.candidate)),p.afterSHA256);if(p.beforeSHA256===null)assert(!fs.existsSync(root+'/'+p.file));else assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.beforeSHA256);}
 const archive=root+'/'+relative;fs.mkdirSync(archive,{recursive:true});const archived=new Set(fs.readdirSync(source,{withFileTypes:true}).filter(e=>e.isFile()&&!/\.(exe|pdb|rlib|rmeta)$/.test(e.name)).map(e=>e.name));for(const p of m.files)archived.add(p.candidate);
 for(const file of archived){const target=archive+'/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source+'/'+file,target,fs.constants.COPYFILE_EXCL);}
 for(const p of m.files)fs.copyFileSync(source+'/'+p.candidate,root+'/'+p.file);
 receipts.push({manifest:relative+'/'+manifest,rawBytesSha256:expected,files:m.files});
}
const node='C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe',tests=fs.readdirSync(root+'/tools/rust-r4ghi/business').filter(f=>f.endsWith('.test.mjs')).map(f=>'tools/rust-r4ghi/business/'+f),r=spawnSync(node,['--test',...tests],{cwd:root,encoding:'utf8',timeout:60000});
const out=root+'/tmp/rust-r4ghi/root/i-acceptance73-promotion';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/stdout.log',r.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/stderr.log',r.stderr??'',{flag:'wx'});assert.equal(r.status,0);
fs.writeFileSync(root+'/docs/design/rust-r4ghi/i-acceptance73-promotion.json',JSON.stringify({kind:'Root-nonauthor-combined-I57-and-02-plus-I58-tools-promotion',receipts,actualNode:'v24.19.0',pureTestsExitCode:r.status,
 HIndependentReview:'H independent-review-i57-59 review01 and review57-02; original57 alone remains rejected',futureContextOrFaultDispatcherSourceDeltaRequiresExplicitRefreeze:true,actualHTTPOrSQLExecuted:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({newFiles:12,changedAfterSealed57:1,pureTestsExitCode:r.status,actualHTTPOrSQLExecuted:false}));
