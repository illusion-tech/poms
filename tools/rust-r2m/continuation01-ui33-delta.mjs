// Public source candidate only. Never writes the active derived96 tree.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {collectVariantInputs,buildContinuationVariant,reverseVariantEdits} from './continuation01-variant.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const ROOT=path.resolve(import.meta.dirname,'../..'),BASE='tools/rust-r2m/',TARGET='tools/rust-r2m-continuation01/';
export const ui33DeltaNames=Object.freeze(['acceptance-api-external-recipes.mjs','fixture-core.mjs','fixture-journal.mjs','fixture-profile.mjs','fixture-ui-package-intent.mjs','fixture.mjs','ui-runtime-full.mjs','windows-ui-runtime.mjs']);
const UI=ui33DeltaNames.filter(file=>file!=='acceptance-api-external-recipes.mjs');
export function deriveUi33ContinuationDelta({oldManifest,inputs,uiReview,enumPacket,enumReview}){
 assert(oldManifest.kind==='R2M-continuation01-finite-environment-only-source-variant'&&oldManifest.sourceFiles===96&&oldManifest.files.length===96);
 assert(inputs instanceof Map&&inputs.size===97);assert.equal(uiReview.result,'SourceReady');assert.equal(enumReview.result,'SourceReady');
 assert.deepEqual(uiReview.reviewedSources.map(row=>row.file).sort(),UI.map(name=>BASE+name).sort());
 for(const pin of uiReview.reviewedSources)assert.equal(sha(inputs.get(pin.file)),pin.rawBytesSha256);
 const enumFile=BASE+'acceptance-api-external-recipes.mjs',enumPin=enumReview.reviewedSources.find(row=>row.file===enumFile);
 assert(enumPin&&enumPin.rawBytesSha256===enumPacket.after.rawBytesSha256&&enumPacket.after.file===enumFile);
 assert.equal(sha(inputs.get(enumFile)),enumPin.rawBytesSha256);assert.equal(enumPacket.exactReplacements,1);
 const previous=new Map(oldManifest.files.map(row=>[row.file,row]));assert.equal(previous.size,96);
 for(const row of oldManifest.files){
  assert.equal(row.file,TARGET+row.originalFile.slice(BASE.length));
  assert.equal(sha(Buffer.from(row.rawBase64,'base64')),row.rawBytesSha256);assert.equal(sha(Buffer.from(row.originalRawBase64,'base64')),row.originalRawBytesSha256);
  let rolled=Buffer.from(row.rawBase64,'base64').toString('utf8');for(const stage of[...row.stages].reverse())rolled=reverseVariantEdits(rolled,stage);assert.equal(rolled,Buffer.from(row.originalRawBase64,'base64').toString('utf8'));
  const current=inputs.get(row.originalFile);assert(current);
  if(!ui33DeltaNames.includes(path.posix.basename(row.file)))assert.equal(sha(current),row.originalRawBytesSha256,'Unlisted original change cannot enter this overlay');
 }
 assert.equal(inputs.get(enumFile).toString('utf8').replace("action:'create_org_unit'","action:'create-org-unit'"),Buffer.from(previous.get(TARGET+'acceptance-api-external-recipes.mjs').originalRawBase64,'base64').toString('utf8'));
 assert.equal(enumPacket.before.rawBytesSha256,previous.get(TARGET+'acceptance-api-external-recipes.mjs').originalRawBytesSha256);
 const outputs=buildContinuationVariant(inputs),changed=[],unchanged=[];
 for(const row of outputs){
  const before=previous.get(row.file);
  if(!before||row.rawBytesSha256!==before.rawBytesSha256){assert(ui33DeltaNames.includes(path.posix.basename(row.file)),'Unlisted derived delta');changed.push({...row,before:before?{file:before.file,bytes:before.bytes,rawBytesSha256:before.rawBytesSha256,rawBase64:before.rawBase64}:null})}
  else unchanged.push({file:row.file,bytes:row.bytes,rawBytesSha256:row.rawBytesSha256});
 }
 assert.deepEqual(changed.map(row=>path.posix.basename(row.file)).sort(),[...ui33DeltaNames].sort());assert.equal(unchanged.length,89);
 assert.equal(changed.filter(row=>!row.before).length,1);assert.equal(changed.find(row=>!row.before).file,TARGET+'fixture-ui-package-intent.mjs');
 return{kind:'R2M-c01-UI33-and-Source11-finite-overlay',result:'SourceCandidate-not-installed',source10Unchanged:true,source10AllCurrentBytesEqual:false,source10OriginalOverlayExplicit:true,old96RuntimeUnchanged:true,files:changed,unchanged,afterSources:outputs.map(({file,bytes,rawBytesSha256})=>({file,bytes,rawBytesSha256})),oldCount:96,nextCount:97,installed:false,actual:false,G3:false,G4:false};
}
function fixedPublic(file,hash){assert(file.startsWith(BASE)||file.startsWith('docs/design/rust-r2m/'));let current=ROOT;for(const part of file.split('/')){current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink())}const stat=fs.lstatSync(current);assert(stat.isFile()&&stat.nlink===1&&stat.size<8*1024*1024);const raw=fs.readFileSync(current);assert.equal(sha(raw),hash);return raw}
export function writeUi33SourceCandidate(){
 assert.equal(process.cwd(),ROOT);
 const refs={old:['tools/rust-r2m/continuation01-variant-generated01.json','d0ed2195a4c64a9617acb82adfe5e25c0719408b04971eb5b04dd4efa8e7e88d'],ui:['docs/design/rust-r2m/ui-package-intent-source-review01.json','ff5017fcb59028498d4c83edeed5cb7bcd4418456e3a7b3142b5da55c35ad192'],enumPacket:['tools/rust-r2m/m5-enum-input-source11.json','40764ec79bf2f46f4451e853135c93622558fa303aab3d544d96fea4a8fb5043'],enumReview:['docs/design/rust-r2m/m5-enum-input-source-review01.json','d5139396988c42a98fb2cf68768028de022aab32f3e70aa24066fed73a9931b9'],generator:['tools/rust-r2m/continuation01-variant.mjs','3883b8a148c8aaa8715413234213c6ef7f7088c017d7cad78c7da7bdcdbd2494']};
 const read=key=>JSON.parse(fixedPublic(...refs[key]));fixedPublic(...refs.generator);
 const oldManifest=read('old'),delta=deriveUi33ContinuationDelta({oldManifest,inputs:collectVariantInputs(),uiReview:read('ui'),enumPacket:read('enumPacket'),enumReview:read('enumReview')});
 for(const before of oldManifest.files){const actual=fs.readFileSync(path.join(ROOT,before.file));assert.equal(sha(actual),before.rawBytesSha256,'Active original96 must remain exact')}
 const candidate=BASE+'continuation01-ui33-candidate01';assert(!fs.existsSync(candidate));fs.mkdirSync(candidate);
 for(const row of delta.files){const file=candidate+'/'+path.posix.basename(row.file);const raw=Buffer.from(row.rawBase64,'base64');fs.writeFileSync(file,raw,{flag:'wx'});row.candidate={file,bytes:raw.length,rawBytesSha256:sha(raw)}}
 delta.inputPins=Object.fromEntries(Object.entries(refs).map(([key,[file,rawBytesSha256]])=>[key,{file,rawBytesSha256}]));
 const file=BASE+'continuation01-ui33-generated01.json';fs.writeFileSync(file,JSON.stringify(delta,null,2)+'\n',{flag:'wx'});return{file,bytes:fs.statSync(file).size,rawBytesSha256:sha(fs.readFileSync(file)),changed:8,unchanged:89,activeRuntimeWritten:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert(process.argv.length===3&&process.argv[2]==='--candidate-only');console.log(JSON.stringify(writeUi33SourceCandidate()))}
