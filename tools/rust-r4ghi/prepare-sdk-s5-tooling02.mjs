import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const A=process.argv[2];assert.equal(A,'883f88fdf4fd609bb8b0725b28bda011d408d6ee');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),A);
execFileSync('git',['merge-base','--is-ancestor','4f0ad88e78622a75b88b4e3cc72aded9da67458a',A]);
const out='tools/openapi/checkpoints/r4ghi-s5-tooling';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/.gitattributes','* -text\n*.bin -diff\n',{flag:'wx'});
const sha=b=>createHash('sha256').update(b).digest('hex');
const baselineFile='tools/openapi/shared-api-client-baseline.json',toolFile='tools/openapi/shared-api-client.mjs';
const baselineBytes=fs.readFileSync(baselineFile),toolBytes=fs.readFileSync(toolFile),baseline=JSON.parse(baselineBytes);
assert.equal(baseline.sourceHead,'4f0ad88e78622a75b88b4e3cc72aded9da67458a');
fs.writeFileSync(out+'/baseline-before-original.json.bin',baselineBytes,{flag:'wx'});fs.writeFileSync(out+'/tool-before-original.mjs.bin',toolBytes,{flag:'wx'});
const spec=JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json')),methods=new Set(['get','post','put','patch','delete','head','options','trace']);
const manifest=JSON.parse(fs.readFileSync('tools/openapi/checkpoints/r4ghi-s5/input-manifest02.json'));
baseline.sourceHead=A;
for(const input of baseline.protectedSources){const tree=execFileSync('git',['show',A+':'+input.file],{encoding:null,maxBuffer:20000000}),current=fs.readFileSync(input.file);assert(tree.equals(current));const norm=Buffer.from(current.toString('utf8').replace(/\r\n/g,'\n'));input.sha256=sha(norm);assert.equal(input.sha256,manifest.inputs.find(i=>i.file===input.file).normalizedTextSHA256);}
baseline.spec.paths=Object.keys(spec.paths).sort();baseline.spec.schemas=Object.keys(spec.components.schemas).sort();baseline.spec.operations=Object.entries(spec.paths).flatMap(([p,verbs])=>Object.entries(verbs).filter(([m])=>methods.has(m)).map(([m,o])=>({method:m,path:p,operationId:o.operationId}))).sort((a,b)=>(a.path+' '+a.method).localeCompare(b.path+' '+b.method));
assert.equal(baseline.spec.paths.length,242);assert.equal(baseline.spec.operations.length,296);assert.equal(baseline.spec.schemas.length,689);assert.equal(baseline.protectedSources.length,6);
let tool=toolBytes.toString('utf8');
for(const[a,b]of[['baseline.spec.operations.length, 293','baseline.spec.operations.length, 296'],['baseline.spec.schemas.length, 626','baseline.spec.schemas.length, 689']]){assert.equal(tool.split(a).length,2);tool=tool.replace(a,b);}
fs.writeFileSync(baselineFile,JSON.stringify(baseline,null,2)+'\n');fs.writeFileSync(toolFile,tool);
fs.writeFileSync(out+'/candidate02.json',JSON.stringify({kind:'G2-exact-S5-SDK-tooling-candidate',capturedAt:new Date().toISOString(),A,permanentS4:'4f0ad88e78622a75b88b4e3cc72aded9da67458a',effectiveManifestSHA256:sha(fs.readFileSync('tools/openapi/checkpoints/r4ghi-s5/input-manifest02.json')),baseline:{file:baselineFile,beforeSHA256:sha(baselineBytes),afterSHA256:sha(fs.readFileSync(baselineFile))},tool:{file:toolFile,beforeSHA256:sha(toolBytes),afterSHA256:sha(fs.readFileSync(toolFile)),onlyChange:'two exact full inventory hard counts'},counts:{paths:242,operations:296,schemas:689},sixProtectedSourcesPreserved:true,generator:baseline.generator,handManagedMetadata:baseline.client.metadata,SDKWritten:false,productG3:false,mainAdvanced:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({A,counts:{paths:242,operations:296,schemas:689},sixGuardsPreserved:true,SDKWritten:false}));
