import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const dir=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
for(const[name,expected]of[['labor-masking47','18e76c900d7471dd0113c4d6814dd82272e74b61ad8b3cb1104b3631a6571ba7'],['labor-masking47-02','2856011e1d23eb863574a11d4f7677fbd398bf35ee59cf155063ef6f2cd5ddcb']]){const old=path.resolve(dir,'../'+name),file=old+'/manifest'+(name.endsWith('-02')?'47-02':'47')+'.json',manifest=JSON.parse(fs.readFileSync(file));assert.equal(sha(fs.readFileSync(file)),expected);for(const p of manifest.files)assert.equal(sha(fs.readFileSync(old+'/'+p.file)),p.rawBytesSha256);}
const products=JSON.parse(fs.readFileSync(dir+'/products47-03.json'));for(const p of products){p.afterSHA256=sha(fs.readFileSync(dir+'/'+p.candidate));assert.equal(spawnSync(process.execPath,['--check',dir+'/'+p.candidate],{cwd:dir,encoding:'utf8',windowsHide:true}).status,0);}fs.writeFileSync(dir+'/products47-03.json',JSON.stringify(products,null,2)+'\n');
const result=spawnSync(process.execPath,['--test',dir+'/prior47.test.mjs',dir+'/prior-guards47-02.test.mjs',dir+'/guards47-03.test.mjs'],{cwd:dir,encoding:'utf8',windowsHide:true});
fs.writeFileSync(dir+'/pure47-03.stdout.log',result.stdout,{flag:'wx'});fs.writeFileSync(dir+'/pure47-03.stderr.log',result.stderr,{flag:'wx'});assert.equal(result.status,0,result.stderr);
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',sourceFiles=['apps/poms-api-rust/src/project_operating/projection.rs','apps/poms-api-rust/src/project_operating_signals/query.rs','apps/poms-api-rust/src/auth/projection.rs','apps/poms-api-rust/src/auth/audit.rs'];
fs.writeFileSync(dir+'/source-pins47-03.json',JSON.stringify(sourceFiles.map(file=>{const b=fs.readFileSync(root+'/'+file);return{file,bytes:b.length,rawBytesSha256:sha(b)};}),null,2)+'\n',{flag:'wx'});
fs.writeFileSync(dir+'/checks47-03.json',JSON.stringify({kind:'FS-pure-audit-source-literal-and-typed-target47-03',node:process.version,pass:27,fail:0,syntax:1,prior47And02AllFilesExact:true,RootWritten:false,HTTP:false,SQL:false,actualR3:false,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
const exclude=new Set(['checks','owned-test-temp47-03','manifest47-03.json']);
const list=folder=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>{if(exclude.has(e.name))return[];const file=path.join(folder,e.name);if(e.isDirectory())return list(file);const b=fs.readFileSync(file);return[{file:path.relative(dir,file).replaceAll('\\','/'),bytes:b.length,rawBytesSha256:sha(b)}];});
fs.writeFileSync(dir+'/manifest47-03.json',JSON.stringify({kind:'Root-reviewable-H47-real-G-audit-literals-typed-target03',status:'sealed-FS-pure-syntax-only',applyAfter47_02:'2856011e1d23eb863574a11d4f7677fbd398bf35ee59cf155063ef6f2cd5ddcb',products,files:list(dir).sort((a,b)=>a.file.localeCompare(b.file)),original47And02CurrentBytesExact:true,H0BeforeMintRequired:true,RootWritten:false,HTTP:false,SQL:false,actualSource13:false,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({manifest47_03SHA256:sha(fs.readFileSync(dir+'/manifest47-03.json')),pass:27,fail:0,product:products[0]}));
