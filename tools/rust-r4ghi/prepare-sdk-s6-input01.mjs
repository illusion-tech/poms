// Capture a new immutable input epoch. S4 and the complete S5 checkpoint remain intact.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),out='tools/openapi/checkpoints/r4ghi-s6',require=createRequire(import.meta.url),ts=require('typescript');
assert(!fs.existsSync(out));
const old=JSON.parse(fs.readFileSync('tools/openapi/shared-api-client-baseline.json'));
assert.equal(old.sourceHead,'883f88fdf4fd609bb8b0725b28bda011d408d6ee');
execFileSync('git',['merge-base','--is-ancestor','4f0ad88e78622a75b88b4e3cc72aded9da67458a','HEAD']);
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const conf=ts.readConfigFile('apps/poms-api/tsconfig.app.json',ts.sys.readFile);assert(!conf.error);
const options=ts.parseJsonConfigFileContent(conf.config,ts.sys,path.resolve('apps/poms-api'));assert.equal(options.errors.length,0);
const program=ts.createProgram(options.fileNames,{...options.options,noEmit:true});
const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);assert.equal(errors.length,0,'Complete current Native program must typecheck before capture');
const extras=['apps/poms-api/tsconfig.app.json','tsconfig.base.json','docs/design/rust-r4ghi/g1-online01.json','docs/design/rust-r4ghi/operation-map01.json',
 'docs/design/rust-r4ghi/g2-public-delta01.json','docs/design/rust-r4ghi/g2-public-delta02.json','docs/design/rust-r4ghi/g2-public-delta03.json',
 'docs/design/rust-r4ghi/user-decision-org-create04.json','tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json','tools/openapi/strict-jsonschema-oas30.cjs'];
const sources=program.getSourceFiles().map(f=>path.relative(root,f.fileName).replaceAll('\\','/')).filter(f=>!f.startsWith('../')&&!f.includes('/node_modules/')&&!f.startsWith('node_modules/')&&fs.statSync(f).isFile());
const protectedFiles=old.protectedSources.map(x=>x.file);assert.equal(protectedFiles.length,6);
const files=[...new Set([...protectedFiles,...extras,...sources])].sort(),sha=b=>createHash('sha256').update(b).digest('hex');
const spec=JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json')),methods=new Set(['get','post','put','patch','delete','head','options','trace']);
const operations=Object.entries(spec.paths).flatMap(([p,v])=>Object.entries(v).filter(([m])=>methods.has(m)).map(([m,o])=>({method:m.toUpperCase(),path:p,operationId:o.operationId}))).sort((a,b)=>(a.path+' '+a.method).localeCompare(b.path+' '+b.method));
assert.equal(operations.length,296);assert.equal(new Set(operations.map(o=>o.operationId)).size,296);assert.equal(Object.keys(spec.paths).length,242);assert.equal(Object.keys(spec.components.schemas).length,690);
assert.deepEqual(spec.components.schemas.ProjectInitialOwnership.enum,['creator','organization']);
assert.deepEqual(spec.components.schemas.CreateProjectRequest.properties.initialOwnership,{$ref:'#/components/schemas/ProjectInitialOwnership'});
assert(!spec.components.schemas.CreateProjectRequest.required.includes('initialOwnership'));
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/.gitattributes','* -text\n*.bin -diff\n',{flag:'wx'});
const inputs=files.map((file,index)=>{const raw=fs.readFileSync(file),snapshot='inputs/'+String(index+1).padStart(4,'0')+'.bin';fs.mkdirSync(path.dirname(out+'/'+snapshot),{recursive:true});fs.writeFileSync(out+'/'+snapshot,raw,{flag:'wx'});return{file,snapshot,bytes:raw.length,rawBytesSHA256:sha(raw),normalizedTextSHA256:sha(Buffer.from(raw.toString('utf8').replace(/\r\n/g,'\n')))};});
assert(inputs.every(p=>sha(fs.readFileSync(p.file))===p.rawBytesSHA256),'Sources moved during S6 capture');
const result={kind:'G2-complete-S6-input-not-product-G3',capturedAt:new Date().toISOString(),parentHead:head,permanentS4:'4f0ad88e78622a75b88b4e3cc72aded9da67458a',previousCompleteS5:old.sourceHead,
 S6InputCommitPending:true,protectedSources:protectedFiles,inputs,inventory:{openapi:spec.openapi,paths:Object.keys(spec.paths).sort(),operations,schemas:Object.keys(spec.components.schemas).sort()},
 generator:old.generator,handManagedMetadata:old.client.metadata,typescript:{version:ts.version,currentApiTypeErrors:0},userDecision:'docs/design/rust-r4ghi/user-decision-org-create04.json',formalRustDelivered:240,G3Certified:false,G4Certified:false};
fs.writeFileSync(out+'/input-manifest01.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directory:out,inputRecords:inputs.length,paths:242,operations:296,schemas:690,S5Unchanged:true,commitCreated:false}));
