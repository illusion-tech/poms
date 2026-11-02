// Root preserves this batch's public originals byte-for-byte; private captures stay outside Git.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pin} from './source-guard.mjs';
assert.equal(process.cwd().replaceAll('\\','/'),'E:/projects/worktrees/poms-r3hijk-next28/poms');
const source='tmp/rust-r3hijk',formal='docs/design/rust-r3hijk/evidence',archive='docs/design/archive/slices/rust-r3hijk/evidence';
assert(!fs.existsSync(formal));fs.mkdirSync(formal,{recursive:true});
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(directory+'/'+e.name):[directory+'/'+e.name]).sort();
const records=[];
for(const file of walk(source)){
 assert(!file.includes('/acceptance-rust-candidate02-21/'));
 const relative=file.slice(source.length+1),target=formal+'/'+relative;
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target,fs.constants.COPYFILE_EXCL);
 const input=pin(file),output=pin(target);assert.equal(input.rawBytesSha256,output.rawBytesSha256);assert.equal(input.bytes,output.bytes);
 records.push({originalPath:file,formalPath:target,archivePath:archive+'/'+relative,bytes:input.bytes,rawBytesSha256:input.rawBytesSha256});
}
const map={kind:'R3HIJK-public-original-evidence-location-map',createdAt:new Date().toISOString(),records,privateOriginalsCopied:false,quarantinedOriginalsCopied:false,historicalLabelsRetained:true,existingInputsRewritten:false};
fs.writeFileSync('docs/design/rust-r3hijk/public-evidence-origin-map.json',JSON.stringify(map,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:records.length,bytes:records.reduce((n,x)=>n+x.bytes,0),allOriginalBytesEqual:true,privateCopied:false}));
