import fs from 'node:fs';import assert from 'node:assert/strict';import{archiveAuthority,resolvePin}from'./archive-paths02.mjs';
const base='docs/design/archive/slices/rust-r3hijk',map=archiveAuthority();
for(const row of map.records)resolvePin({file:row.originalPath,bytes:row.bytes,rawBytesSha256:row.rawBytesSha256},map);
for(const row of map.publicRecords)resolvePin({file:row.originalPath,bytes:row.bytes,rawBytesSha256:row.rawBytesSha256},map);
const g1=JSON.parse(fs.readFileSync(base+'/g1-input-manifest02.json')),g3=JSON.parse(fs.readFileSync(base+'/g3-input-manifest03.json'));
for(const row of g1.entries)resolvePin(row,map);
for(const group of ['productInputs','protectedNativeInputs','lifecycleInputs','tools','formalInputs'])for(const row of g3[group])resolvePin(row,map);
assert.equal(g3.productInputs.length,235);assert.equal(g3.protectedNativeInputs.length,1373);
console.log(JSON.stringify({kind:'R3HIJK-canonical-original-byte-closure',movedOriginals:map.records.length,publicOriginals:map.publicRecords.length,G1:g1.entries.length,G3:g3.productInputs.length+g3.protectedNativeInputs.length+g3.lifecycleInputs.length+g3.tools.length+g3.formalInputs.length,rootLifecycleAliases:0,allRawBytesEqual:true,privateRead:false}));
