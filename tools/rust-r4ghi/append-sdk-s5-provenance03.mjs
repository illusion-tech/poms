import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='tools/openapi/checkpoints/r4ghi-s5';
const sources=[
 ...['receipt02.json','stdout-original.bin','stderr-original.bin','full-spec-after-original.bin'].map(f=>'tmp/rust-r4ghi/root/openapi09/'+f),
 ...['spec-validate04','api-tsc03','api-lint03'].flatMap(d=>['receipt.json','stdout.log','stderr.log'].map(f=>'tmp/rust-r4ghi/root/'+d+'/'+f)),
 ...['sdkA-review03.json','sdkA-review03.md','sdkA-checks03.json','sdkA-manifest02-review04.json','sdkA-manifest02-review04.md','lint03-evidence04.json'].map(f=>'tools/rust-r4ghi/independent/review05/'+f),
 'tools/rust-r4ghi/prepare-sdk-s5-input01.mjs','tools/rust-r4ghi/amend-sdk-s5-input02.mjs'
];
const entries=[];
for(const source of sources){const bytes=fs.readFileSync(source),snapshot='provenance/'+source+'.bin';fs.mkdirSync(path.dirname(root+'/'+snapshot),{recursive:true});fs.writeFileSync(root+'/'+snapshot,bytes,{flag:'wx'});entries.push({source,snapshot,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
fs.writeFileSync(root+'/provenance-manifest03.json',JSON.stringify({kind:'append-only-S5-input-evidence',capturedAt:new Date().toISOString(),effectiveManifest:'input-manifest02.json',entries,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({archived:entries.length,effectiveManifest:'input-manifest02.json',productG3:false}));
