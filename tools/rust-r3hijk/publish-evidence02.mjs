// Add new public originals without changing the first publication or its map.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pin} from './source-guard.mjs';
const prefix='tmp/rust-r3hijk',formal='docs/design/rust-r3hijk/evidence',archive='docs/design/archive/slices/rust-r3hijk/evidence';
const initial=JSON.parse(fs.readFileSync('docs/design/rust-r3hijk/public-evidence-origin-map.json')),known=new Map(initial.records.map(r=>[r.originalPath,r]));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]).sort(),records=[];
for(const originalPath of walk(prefix)){
 assert(!originalPath.includes('/acceptance-rust-candidate02-21/'));const input=pin(originalPath),previous=known.get(originalPath);
 if(previous){assert.equal(input.rawBytesSha256,previous.rawBytesSha256,'Immutable public original changed '+originalPath);assert.deepEqual(pin(previous.formalPath),{file:previous.formalPath,bytes:previous.bytes,rawBytesSha256:previous.rawBytesSha256});continue;}
 const relative=originalPath.slice(prefix.length+1),formalPath=formal+'/'+relative;assert(!fs.existsSync(formalPath));fs.mkdirSync(path.dirname(formalPath),{recursive:true});fs.copyFileSync(originalPath,formalPath,fs.constants.COPYFILE_EXCL);assert.equal(pin(formalPath).rawBytesSha256,input.rawBytesSha256);
 records.push({originalPath,formalPath,archivePath:archive+'/'+relative,bytes:input.bytes,rawBytesSha256:input.rawBytesSha256});
}
fs.writeFileSync('docs/design/rust-r3hijk/public-evidence-origin-map02.json',JSON.stringify({kind:'R3HIJK-public-original-incremental-publication02',createdAt:new Date().toISOString(),priorMap:pin('docs/design/rust-r3hijk/public-evidence-origin-map.json'),priorOriginalsUnchanged:known.size,records,privateCopied:false,quarantinedOriginalCopied:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({previousOriginalsUnchanged:known.size,newOriginals:records.length,newBytes:records.reduce((n,r)=>n+r.bytes,0),privateCopied:false}));
