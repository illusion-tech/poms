import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const dir='tools/rust-r4ghi/H/implementation/support-patches/shared-g2-130';
const raw=fs.readFileSync(dir+'/manifest130.json'),manifest=JSON.parse(raw);
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(manifest.schemaCount,130);assert.equal(manifest.files.length,2);
for(const item of manifest.inputClosure){assert.equal(sha(fs.readFileSync(dir+'/'+item.snapshot)),item.SHA256);assert.equal(sha(fs.readFileSync(item.source)),item.SHA256);}
const changes=manifest.files.map(item=>{assert(/^libs\/shared\/contracts\/src\/lib\/(shared-contracts|rust-r4ghi-contracts\.generated)\.ts$/.test(item.path));assert.equal(sha(fs.readFileSync(item.path)),item.originalSHA256);const bytes=fs.readFileSync(dir+'/proposed/'+item.path);assert.equal(sha(bytes),item.proposedSHA256);assert.equal(bytes.length,item.bytes);return{item,bytes};});
const out='docs/design/rust-r4ghi/shared-promotion130.json';assert(!fs.existsSync(out));for(const{item,bytes}of changes)fs.writeFileSync(item.path,bytes);
fs.writeFileSync(out,JSON.stringify({kind:'Root-exact-canonical130-promotion',capturedAt:new Date().toISOString(),manifestSHA256:sha(raw),files:manifest.files,inputClosure:manifest.inputClosure,old128And129InputsPreserved:true,fullOpenAPIGenerated:false,clientGenerated:false,G3:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:changes.length,allOriginalAndInputHashesChecked:true,publicSchemas:130}));
