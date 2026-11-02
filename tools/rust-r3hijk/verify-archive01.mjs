// Canonical, hash-checked entry for historical R3HIJK evidence after G4 relocation.
// This verifies original bytes; it does not relabel or re-execute historical tests.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=process.cwd(),base='docs/design/archive/slices/rust-r3hijk';
const maps=[base+'/archive-origin-map.json',base+'/public-evidence-origin-map.json'];
const sha=b=>createHash('sha256').update(b).digest('hex');
let checked=0,bytes=0;
for(const file of maps){
 const manifest=JSON.parse(fs.readFileSync(file));assert(Array.isArray(manifest.records));
 for(const record of manifest.records){
  const relative=record.archivePath||record.formalPath;assert(typeof relative==='string'&&relative.startsWith(base));
  const absolute=path.resolve(root,relative);assert(absolute.startsWith(path.resolve(root,'docs/design/archive/slices')+path.sep));
  const data=fs.readFileSync(absolute);assert.equal(data.length,record.bytes,record.originalPath);assert.equal(sha(data),record.rawBytesSha256,record.originalPath);checked++;bytes+=data.length;
 }
}
console.log(JSON.stringify({kind:'R3HIJK-canonical-archive-original-byte-verification',checked,bytes,allOriginalBytesMatch:true,historicalExecutionReclassified:false,privateRead:false}));
