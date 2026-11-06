// Root-owned source mirror. Copies selected workspace input; never resets an older checkout.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const root='/home/wangzishi/projects/poms-rust-r4ghi';
const namespace='poms-r4ghi';
const sha=b=>createHash('sha256').update(b).digest('hex');
const gate=JSON.parse(fs.readFileSync(win+'/docs/design/rust-r4ghi/user-fix-online01.json','utf8'));
assert(gate.G1Certified&&gate.G2Authorized&&gate.issue===115);
const listing=spawnSync('/usr/bin/git',['--git-dir=/mnt/e/projects/poms/.git/worktrees/poms3','--work-tree='+win,'ls-files','--cached','--others','--exclude-standard','-z','--','apps','libs','tools/rust-r4ghi','docs/design/rust-r4ghi*','tools/rust-r2l/l-shared-uow-probe.rs','tools/rust-r2m/shared-uow-probe.rs','tools/rust-r2m/number-probe.rs','tools/format-md-tables.ts',':(top,glob)*.json',':(top,glob)*.jsonc',':(top,glob)*.yaml',':(top,glob)*.yml',':(top,glob)*.js',':(top,glob)*.mjs',':(top,glob)*.cjs'],{encoding:'utf8',maxBuffer:32000000});
assert.equal(listing.status,0,'Selected input listing failed');
const listed=listing.stdout.split('\0').filter(Boolean);
const extra=new Set(['tools/rust-r2l/l-shared-uow-probe.rs','tools/rust-r2m/shared-uow-probe.rs','tools/rust-r2m/number-probe.rs','tools/format-md-tables.ts']);
const queue=[...listed.filter(f=>/^apps\/poms-api-rust\/(src|tests)\/.*\.rs$/.test(f)),...[...extra].filter(f=>f.endsWith('.rs'))],scanned=new Set();
for(let n=0;n<queue.length;n++){
 const file=queue[n];if(scanned.has(file))continue;scanned.add(file);
 for(const match of fs.readFileSync(win+'/'+file,'utf8').matchAll(/\binclude(?:_str|_bytes)?!\s*\(\s*"([^"]+)"\s*,?\s*\)/g)){
  const absolute=path.resolve(path.dirname(win+'/'+file),match[1]);assert(absolute.startsWith(win+'/'));
  const relative=path.relative(win,absolute);assert(fs.statSync(absolute).isFile());extra.add(relative);if(relative.endsWith('.rs'))queue.push(relative);
 }
}
const files=[...new Set([...listed,...extra])].filter(f=>/^apps\//.test(f)||/^libs\//.test(f)||/^tools\/rust-r4ghi\//.test(f)||/^docs\/design\/rust-r4ghi/.test(f)||extra.has(f)||(!f.includes('/')&&/\.(json|jsonc|yaml|yml|js|mjs|cjs)$/.test(f))).filter(f=>!/(^|\/)\.env($|\.)/.test(f)&&fs.existsSync(win+'/'+f));
const marker=root+'/.poms-r4ghi-mirror.json';
if(fs.existsSync(root)){assert(fs.existsSync(marker),'Existing directory is not owned by this mirror');const id=JSON.parse(fs.readFileSync(marker));assert.deepEqual(id,{namespace,sourceRoot:win});}
else {fs.mkdirSync(root,{recursive:true});fs.writeFileSync(marker,JSON.stringify({namespace,sourceRoot:win})+'\n',{flag:'wx'});}
const prior=root+'/.poms-r4ghi-inputs.json',previous=fs.existsSync(prior)?JSON.parse(fs.readFileSync(prior)):[];
const present=new Set(files),pins=[];
for(const f of files){assert(!f.startsWith('/')&&!f.split('/').includes('..'));const target=path.resolve(root,f);assert(target.startsWith(root+'/'));const bytes=fs.readFileSync(win+'/'+f);fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target)||sha(fs.readFileSync(target))!==sha(bytes))fs.writeFileSync(target,bytes);assert.equal(sha(fs.readFileSync(target)),sha(bytes));pins.push({file:f,bytes:bytes.length,rawBytesSha256:sha(bytes)});}
for(const old of previous){if(present.has(old.file))continue;const target=path.resolve(root,old.file);assert(target.startsWith(root+'/'));if(fs.existsSync(target)){assert.equal(sha(fs.readFileSync(target)),old.rawBytesSha256);fs.unlinkSync(target);}}
const cache=root+'/node_modules',cacheTarget='/home/wangzishi/projects/poms-rust-r4abc/node_modules';
assert(fs.statSync(cacheTarget).isDirectory());
if(fs.existsSync(cache))assert.equal(fs.realpathSync(cache),fs.realpathSync(cacheTarget));else fs.symlinkSync(cacheTarget,cache,'dir');
fs.writeFileSync(prior,JSON.stringify(pins,null,2)+'\n');
fs.writeFileSync(root+'/.poms-r4ghi-include-inputs.json',JSON.stringify(pins.filter(p=>extra.has(p.file)),null,2)+'\n');
assert(pins.every(p=>sha(fs.readFileSync(win+'/'+p.file))===p.rawBytesSha256),'Source changed during copy; resync before using the candidate');
const out=win+'/tmp/rust-r4ghi/root/sync';fs.mkdirSync(out,{recursive:true});
const receipt={kind:'owned-Linux-input-copy',capturedAt:new Date().toISOString(),namespace,sourceRoot:win,linuxRoot:root,inputs:pins,bytes:pins.reduce((n,p)=>n+p.bytes,0),allCopiedHashesMatch:true,oldSourceChanged:false};
const name=Date.now()+'.json';fs.writeFileSync(out+'/'+name,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({linuxRoot:root,files:pins.length,bytes:receipt.bytes,allHashesMatch:true}));
