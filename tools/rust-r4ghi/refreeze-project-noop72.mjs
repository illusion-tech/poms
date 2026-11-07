import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),m=JSON.parse(fs.readFileSync('tools/rust-r4ghi/I/implementation/support-patches/project-metadata-noop61/manifest61.json'));
const expected=new Map(m.files.map(p=>[p.file,p.afterSHA256])),out='tools/rust-r4ghi/checkpoints/project-noop72';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const unchanged=['tools/rust-r4ghi/business/required-write-sources17.json','tools/rust-r4ghi/business/required-write-sources19.json'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
const changes=[];
for(const file of ['tools/rust-r4ghi/business/ownership-sources23.json','tools/rust-r4ghi/business/required-write-sources25.json']){
 const before=fs.readFileSync(file),pins=JSON.parse(before),delta=[];
 const after=pins.map(p=>{const actual=sha(fs.readFileSync(p.file));if(actual===p.sha256)return p;assert.equal(actual,expected.get(p.file),'Only the exact two61 Rust changes are allowed');delta.push({file:p.file,before:p.sha256,after:actual});return{...p,sha256:actual};});
 assert.equal(delta.length,2);fs.writeFileSync(out+'/'+file.split('/').at(-1)+'.before.bin',before,{flag:'wx'});const bytes=Buffer.from(JSON.stringify(after,null,2)+'\n');fs.writeFileSync(file,bytes);
 changes.push({file,beforeSHA256:sha(before),afterSHA256:sha(bytes),delta});
}
for(const pin of unchanged)assert.equal(sha(fs.readFileSync(pin.file)),pin.sha256);
fs.writeFileSync('docs/design/rust-r4ghi/project-noop72-source-refreeze.json',JSON.stringify({kind:'Root-explicit-noop61-ownership-and-metadata-source-refreeze',changes,unchanged,
 oldAPI134EvidenceRewritten:false,oldFixtureBirthSourceLabelsRewritten:false,newAPI135HTTPExecuted:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({refrozen:2,changedLeavesPerManifest:2,source17and19Unchanged:true,HTTPExecuted:false}));
