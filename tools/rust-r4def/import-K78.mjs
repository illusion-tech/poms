// Root guarded intake of the independently admitted three-file correction.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const src='E:/projects/worktrees/poms-r4f-cost-governance/poms/tools/rust-r4def/F/K56',dst='tools/rust-r4def/F/K56',sha=b=>createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(src+'/delivery56.json');assert.equal(sha(raw),'09f17e101976b12f5b741e0a9d1e110cae12e7d2a632369d4eae6d1ffd47d82b');const m=JSON.parse(raw);
assert.equal(sha(fs.readFileSync(m.authority.file)),m.authority.rawBytesSha256);assert(JSON.parse(fs.readFileSync(m.authority.file)).implementationAuthorized);
assert.equal(m.products.length,3);assert.deepEqual(m.products.map(p=>p.file).sort(),['apps/poms-api-rust/src/attachments/service.rs','apps/poms-api-rust/src/attachments/store.rs','apps/poms-api-rust/src/attachment_storage/registry.rs'].sort());
for(const p of m.products){assert.equal(sha(fs.readFileSync(p.file)),p.sourceBeforeRawBytesSha256);assert.equal(sha(fs.readFileSync(src+'/'+p.completeImportFile.file)),p.sourceAfter.rawBytesSha256);assert.equal(sha(fs.readFileSync(src+'/source-before/'+p.file+'.bin')),p.sourceBeforeRawBytesSha256);}
for(const p of m.sealedF46SixSources)assert.equal(sha(fs.readFileSync(p.file)),p.rawBytesSha256);
for(const [file,pin] of Object.entries(m.sealedEarlierPackages))assert.equal(sha(fs.readFileSync(file)),pin);
assert(!fs.existsSync(dst));const copied=[];
function copy(relative=''){for(const e of fs.readdirSync(src+'/'+relative,{withFileTypes:true})){const f=relative?relative+'/'+e.name:e.name;assert(!e.isSymbolicLink());if(e.isDirectory())copy(f);else{assert(e.isFile());const b=fs.readFileSync(src+'/'+f);fs.mkdirSync(path.dirname(dst+'/'+f),{recursive:true});fs.writeFileSync(dst+'/'+f,b,{flag:'wx'});copied.push({file:dst+'/'+f,bytes:b.length,rawBytesSha256:sha(b)});}}}copy();
for(const p of m.products){fs.writeFileSync(p.file,fs.readFileSync(src+'/'+p.completeImportFile.file));assert.equal(sha(fs.readFileSync(p.file)),p.sourceAfter.rawBytesSha256);}
const receipt={kind:'Root-guarded-K56-three-file-import78',manifestSha256:sha(raw),authority:m.authority,productFiles:m.products.map(p=>p.sourceAfter),copied,scopeKept:true,F46Unchanged:true,realRuntimeAccepted:false};fs.writeFileSync('tmp/rust-r4def/root/K78-import.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({imported:m.products.length,preservedEvidence:copied.length,manifestSha256:sha(raw)}));
