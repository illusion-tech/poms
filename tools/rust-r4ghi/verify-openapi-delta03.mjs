import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const file='libs/shared/api-spec/openapi.json',reference='883f88fdf4fd609bb8b0725b28bda011d408d6ee';
const oldRaw=execFileSync('git',['show',reference+':'+file],{encoding:null,maxBuffer:20000000}),newRaw=fs.readFileSync(file);
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(oldRaw),'8965393af9264e0805c3174520816673a1a56920944428bb8a9321e81da74ab0');
const old=JSON.parse(oldRaw),next=JSON.parse(newRaw);
assert.deepEqual(next.components.schemas.ProjectInitialOwnership.enum,['creator','organization']);
assert.deepEqual(next.components.schemas.CreateProjectRequest.properties.initialOwnership,{$ref:'#/components/schemas/ProjectInitialOwnership'});
assert(!next.components.schemas.CreateProjectRequest.required.includes('initialOwnership'));
delete next.components.schemas.ProjectInitialOwnership;delete next.components.schemas.CreateProjectRequest.properties.initialOwnership;
assert.deepEqual(next,old,'No unrelated complete OpenAPI mutation is authorized by user8');
const proof={kind:'Root-exact-full-OpenAPI-delta03-comparison',capturedAt:new Date().toISOString(),oldReference:reference,oldSHA256:sha(oldRaw),newSHA256:sha(newRaw),
  change:['One named ProjectInitialOwnership enum schema','One optional CreateProjectRequest.initialOwnership ref'],allOtherSchemaAndPathsAndOperationsExact:true,counts:{paths:242,operations:296,schemas:690},newHTTP:0,G3Certified:false};
fs.writeFileSync('docs/design/rust-r4ghi/public-delta03-openapi-proof01.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(proof));
