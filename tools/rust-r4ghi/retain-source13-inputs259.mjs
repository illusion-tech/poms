// Preserve immutable code inputs while the separate Source13 H46 driver runs.
// This is not final data retention, consumer admission, or a schema transition.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',O=P+'/source13-retained-inputs259';
const sha=v=>createHash('sha256').update(v).digest('hex');assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert(!fs.existsSync(O));
function read(f,s){const st=fs.lstatSync(f);assert(st.isFile()&&!st.isSymbolicLink());assert.equal(fs.realpathSync(f),path.resolve(f));const b=fs.readFileSync(f);if(s)assert.equal(sha(b),s,f);return b;}
const pin=(file,s)=>{const raw=read(file,s);return{file,rawBytesSha256:sha(raw)};};
const inventory=pin(P+'/source13-build180-03/Root-source-inventory-copy.json','cb1702be337bf86bcdfe6738544485256479431cd258a9f2d845d6607a020940');
const source=pin(P+'/source13-preparation193/sourcePins.json','e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c');
const helper=pin(P+'/business/g2-business13/main01/helper-fixture234/H1-actual234.json','51b303a3fccbae5e7fd7b0cc6a042da5bfd12f43c4a7507dfb6479e1d0be579c');
const compile=JSON.parse(read(inventory.file)).inputs.map(e=>{assert(e.file.startsWith(R+'/'));return{file:e.file.slice(R.length+1),sha256:e.sha256};}),sources=JSON.parse(read(source.file)),helpers=JSON.parse(read(helper.file));
assert.equal(compile.length,523);assert.equal(sources.length,416);assert.equal(helpers.length,198);
const union=new Map();for(const e of [...compile,...helpers]){assert(!path.isAbsolute(e.file)&&!e.file.split('/').includes('..'));if(union.has(e.file))assert.equal(union.get(e.file),e.sha256);union.set(e.file,e.sha256);}
for(const e of sources)assert.equal(union.get(e.file),e.sha256,'Full original source manifest must be represented');
const files=[...union].sort(([a],[b])=>a.localeCompare(b)).map(([file,sha256])=>({file,sha256}));
for(const e of files)read(R+'/'+e.file,e.sha256);fs.mkdirSync(O,{mode:0o700});fs.mkdirSync(O+'/tree',{mode:0o700});
const copied=[];for(const e of files){const raw=read(R+'/'+e.file,e.sha256),target=O+'/tree/'+e.file;fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,raw,{flag:'wx',mode:0o600});assert.equal(fs.statSync(target).nlink,1);read(target,e.sha256);copied.push({file:e.file,bytes:raw.length,sha256:e.sha256});}
for(const e of files)read(R+'/'+e.file,e.sha256);
const receipt={kind:'Root-exact-Source13-full-compile-and-H1-input-preservation259',producerEpoch:'g2-business13',run:'main01',sourceManifest:source,completeCompileInventory:inventory,helperH1:helper,sourceCount:sources.length,completeCompileCount:compile.length,helperCount:helpers.length,actualUnionCount:files.length,unionCanonicalSHA256:sha(JSON.stringify(files)),root:O+'/tree',files:copied,sourceAndHelperBytesUnchanged:true,businessStateRead:false,dataRetentionComplete:false,SQL:false,HTTP:false,oldSourcesRelabelled:false,Source14Admitted:false,G3:false,G4:false};
const file=O+'/receipt259.json';fs.writeFileSync(file,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({receipt:pin(file),compileInputs:compile.length,helpers:helpers.length,actualUnion:files.length,businessStateRead:false,finalDataRetention:false,Source14Admitted:false}));
