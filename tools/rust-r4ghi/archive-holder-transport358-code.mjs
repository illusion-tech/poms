// Preserve exact code-only author/reviewer artifacts, never private inputs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,local,pin,read} from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();const I='/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/',roots={author:I+'holder-aux358-code01/',review:I+'transport358-code-independent-review01/'},O=C.root+'/tools/rust-r4ghi/independent/holder-transport358-code01';assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});
const todo=[pin(roots.author+'seal-holder-aux358-code01.json'),pin(roots.review+'seal-review-code358.json')],seen=new Map(),copies=[];
assert.equal(todo[0].rawBytesSha256,'b52145649fc6593539ed95116e9f4190e4657e70ee78e7cecd419b79492a8df0');assert.equal(todo[1].rawBytesSha256,'9a04a12d8e7cd2503c96096bfe5e82bb1946a06150a783e9fba1938464a4d7f6');
function collect(v){if(!v||typeof v!=='object')return;if(typeof v.file==='string'&&Number.isSafeInteger(v.bytes)&&typeof v.rawBytesSha256==='string'&&Object.values(roots).some(r=>v.file.startsWith(r)))todo.push({file:v.file,bytes:v.bytes,rawBytesSha256:v.rawBytesSha256});for(const x of Object.values(v))collect(x);}
while(todo.length){const p=todo.shift();if(seen.has(p.file)){assert.deepEqual(seen.get(p.file),p);continue;}seen.set(p.file,p);const bucket=Object.keys(roots).find(k=>p.file.startsWith(roots[k]));assert(bucket);const b=read(p),f=O+'/'+bucket+'/'+p.file.slice(roots[bucket].length);fs.mkdirSync(local(path.posix.dirname(f)),{recursive:true});fs.writeFileSync(local(f),b,{flag:'wx'});const copy=pin(f);assert.equal(copy.rawBytesSha256,p.rawBytesSha256);copies.push({original:p,copy});if(p.file.endsWith('.json'))collect(JSON.parse(b));}
fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({kind:'Root-code-only-holder-transport358-raw-retention',copies,codeOnly:true,actualG2Authorized:false,anyModeExecuted:false,privateRuntimeInputsCopied:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({copies:copies.length,actualG2Authorized:false}));
