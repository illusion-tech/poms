// Root records the required local governance checks without changing frozen inputs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pin} from './source-guard.mjs';
const [attempt]=process.argv.slice(2);assert(/^\d{2}$/.test(attempt));
const directory='tmp/rust-r3hijk/common-checks'+attempt;assert(!fs.existsSync(directory));fs.mkdirSync(directory,{recursive:true});
const commands=[['markdown-format','E:/.cargo/bin/deno.exe',['task','format:md:check']],['diff-check','git',['diff','--check']],['staged-diff-check','git',['diff','--cached','--check']]],receipts=[];
for(const [name,command,args]of commands){
 const result=spawnSync(command,args,{encoding:null,windowsHide:true,maxBuffer:16000000}),streams=[];
 for(const key of ['stdout','stderr']){const file=directory+'/'+name+'-'+key+'.bin';fs.writeFileSync(file,result[key]||Buffer.alloc(0),{flag:'wx'});streams.push(pin(file));}
 receipts.push({name,command,args,exitCode:result.status,errorName:result.error?.name||null,streams});
}
const passed=receipts.every(x=>x.exitCode===0);
fs.writeFileSync(directory+'/report01.json',JSON.stringify({kind:'R3HIJK-actual-required-local-governance-checks',createdAt:new Date().toISOString(),source:pin('tools/rust-r3hijk/common-checks01.mjs'),receipts,allChecksPassed:passed},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed,checks:receipts.map(x=>({name:x.name,exitCode:x.exitCode}))}));if(!passed)process.exitCode=1;
