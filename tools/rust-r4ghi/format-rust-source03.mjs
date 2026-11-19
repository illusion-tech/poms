import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
assert.equal(process.platform,'linux');
const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const base='apps/poms-api-rust',out=root+'/tmp/rust-r4ghi/root/rust-format03';
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
function walk(folder){return fs.readdirSync(root+'/'+folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(folder+'/'+e.name):e.isFile()&&e.name.endsWith('.rs')?[folder+'/'+e.name]:[]);}
const files=['src','tests','examples'].flatMap(dir=>walk(base+'/'+dir));
const before=new Map(files.map(file=>{const full=path.resolve(root,file);assert(full.startsWith(root+'/'+base+'/'));assert(!fs.lstatSync(full).isSymbolicLink());return[file,fs.readFileSync(full)];}));
const roots=[base+'/src/lib.rs',base+'/src/main.rs',...files.filter(f=>!f.startsWith(base+'/src/'))];
const args=['+1.99.1','--edition','2024',...roots.map(f=>root+'/'+f)];
const result=spawnSync('/home/wangzishi/.cargo/bin/rustfmt',args,{cwd:root,env:{HOME:'/home/wangzishi',PATH:'/home/wangzishi/.cargo/bin:/usr/bin:/bin',RUSTUP_HOME:'/home/wangzishi/.rustup'},encoding:null,timeout:120000,maxBuffer:8000000});
fs.writeFileSync(out+'/stdout.bin',result.stdout??Buffer.alloc(0),{flag:'wx'});fs.writeFileSync(out+'/stderr.bin',result.stderr??Buffer.alloc(0),{flag:'wx'});
const changes=[];
for(const[file,bytes]of before){const after=fs.readFileSync(root+'/'+file);if(sha(bytes)===sha(after))continue;const snapshot=out+'/before/'+file+'.bin';fs.mkdirSync(path.dirname(snapshot),{recursive:true});fs.writeFileSync(snapshot,bytes,{flag:'wx'});changes.push({file,beforeSHA256:sha(bytes),afterSHA256:sha(after),beforeSnapshot:snapshot});}
fs.writeFileSync(out+'/receipt.json',JSON.stringify({kind:'actual-fixed-toolchain-format-only-source-pass',capturedAt:new Date().toISOString(),exitCode:result.status,args,changes,semanticAcceptance:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({exitCode:result.status,files:files.length,changed:changes.length,originalsPreserved:true,semanticAcceptance:false}));
if(result.status!==0){console.log(result.stderr?.toString().slice(-2000));process.exitCode=1;}
