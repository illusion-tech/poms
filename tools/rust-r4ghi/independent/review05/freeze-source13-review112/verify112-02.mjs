import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const root='E:/projects/worktrees/poms-r3hijk-next28/poms';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private';
const N='/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
const sha=value=>createHash('sha256').update(value).digest('hex');
const translated=file=>file.startsWith(R+'/')?root+file.slice(R.length):file.startsWith('/home/')?'//wsl.localhost/Debian'+file:file;
const realRaw=file=>fs.readFileSync(translated(file));
const source=fs.readFileSync(out+'/freeze-source13-183.original.mjs','utf8');
assert.equal(sha(source),'e2f13efc02fc6214563bd66fcd0d8ffa2ac10e1dafb2dd6ab74384cdeaa56e7f');
assert.equal(sha(fs.readFileSync(root+'/tools/rust-r4ghi/freeze-source13-183.mjs')),sha(source));
const actualPins=[];
function actualJSON(file){const raw=realRaw(file);actualPins.push({file,rawBytesSha256:sha(raw),bytes:raw.length});return JSON.parse(raw);}
const indexFile=P+'/retention/epoch12-before-source13-139/index.json';
const index=actualJSON(indexFile);
assert.equal(actualPins.at(-1).rawBytesSha256,'fed889a2c467945656d7c317f006b5ba2bc9780435459460863b3735dacb17b7');
const retained=actualJSON(index.receipt.file);assert.equal(actualPins.at(-1).rawBytesSha256,index.receipt.rawBytesSha256);
assert.equal(retained.stoppedAPI.pid,11616);assert.equal(retained.stoppedAPI.processGone,true);
const stagedFile=R+'/docs/design/rust-r4ghi/source13-staging177.json';const staged=actualJSON(stagedFile);
const depFile=R+'/docs/design/rust-r4ghi/source-dependencies181-corrective.json';const dependency=actualJSON(depFile);
assert.equal(actualPins.at(-1).rawBytesSha256,'a2fb4732be660d3668630f53f9362f91d429bb46f5c7a18acd5934b491e837c1');
const liveHelpers=fs.readdirSync(root+'/tools/rust-r4ghi/business').filter(f=>/\.(mjs|json)$/.test(f)).sort().map(f=>({file:'tools/rust-r4ghi/business/'+f,sha256:sha(fs.readFileSync(root+'/tools/rust-r4ghi/business/'+f))}));
const syntheticUninstalled=new Map([
 [R+'/tools/rust-r4ghi/business/labor-mask47.mjs',Buffer.from('// synthetic uninstalled final-H fixture\n')],
 [R+'/tools/rust-r4ghi/business/labor-mask-bindings47.json',Buffer.from(JSON.stringify({environmentBindings46:null,lineage:null,actors:null})+'\n')]
]);
for(const[file,raw]of syntheticUninstalled){const relative=file.slice(R.length+1);if(!liveHelpers.some(x=>x.file===relative))liveHelpers.push({file:relative,sha256:sha(raw)});}
liveHelpers.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
// This overlay is a synthetic protocol fixture, NOT a Root-approved final H seal.
const syntheticFinal={products:liveHelpers.filter(x=>x.file!==dependency.context.file).map(x=>({file:x.file,afterSHA256:x.sha256}))};
const body=source.replace(/^import .*;\r?\n/gm,'');
const runBody=new Function('fs','path','assert','createHash','sourcePins','ownedFile','helperGraph13','assertNullTemplate13','inventoryClosure','process','console',body);
const mandatory={migrationWrapper:R+'/tools/rust-r4ghi/run-m98-168.mjs',migrationAfterCapture:R+'/tools/rust-r4ghi/capture-m98-after164.mjs',source13Constructor:R+'/tools/rust-r4ghi/construct-source13-bindings.mjs',source13BuildRunner:R+'/tools/rust-r4ghi/build-source13-180.mjs',apiRuntimeWrapper:R+'/tools/rust-r4ghi/start-api136-182.mjs',apiRuntimeLauncher:R+'/tools/rust-r4ghi/api-runtime01.mjs',postM98FrozenNegative:R+'/tools/rust-r4ghi/probe-m98-frozen-external.mjs'};
const tools=Object.fromEntries(Object.entries(mandatory).map(([k,file])=>[k,{file,rawBytesSha256:sha(realRaw(file))}]));
for(const item of Object.values(tools))actualPins.push(item);
const testNames=[];
function execute(change={}){
  const files=new Map(syntheticUninstalled),dirs=new Set(),writes=[],events=[];
  const set=(file,value)=>{files.set(file,Buffer.isBuffer(value)?value:Buffer.from(typeof value==='string'?value:JSON.stringify(value,null,2)+'\n'));return{file,rawBytesSha256:sha(files.get(file))};};
  const finalPin=set(P+'/synthetic-review112/finalH.json',syntheticFinal);
  const input={kind:'Root-reviewed-final-Source13-freeze-input183',historicalAutomaticSelectionApproved:false,G3Certified:false,staging177:{file:stagedFile,rawBytesSha256:sha(realRaw(stagedFile))},finalHToolManifests:[finalPin],dependencyCorrection181:{file:depFile,rawBytesSha256:sha(realRaw(depFile))},independentReviews:[],supportingTools:structuredClone(tools)};
  const inputFile=P+'/synthetic-review112/input183.json';
  const test={files,dirs,writes,input,set,helpers:structuredClone(liveHelpers),external:structuredClone(dependency.externalLeaves),migrationNames:null,postHelperChanged:false,approvedHash:null};
  change.mutate?.(test);
  const inputPin=set(inputFile,input),approved=test.approvedHash??inputPin.rawBytesSha256;
  const raw=file=>files.has(file)?files.get(file):realRaw(file);
  const fakeFS={existsSync:file=>files.has(file)||dirs.has(file)||(file.startsWith(R+'/')&&fs.existsSync(translated(file))),readdirSync:file=>test.migrationNames??fs.readdirSync(translated(file)),mkdirSync:(file,options)=>{assert.equal(options.mode,0o700);assert(!files.has(file)&&!dirs.has(file));dirs.add(file);events.push('mkdir');},writeFileSync:(file,value,options)=>{assert.equal(options.flag,'wx');assert(!files.has(file));files.set(file,Buffer.from(value));writes.push(file);events.push('write:'+file);}};
  let graphCalls=0;
  const graph=()=>{graphCalls++;return test.postHelperChanged&&graphCalls>1?[...test.helpers,{file:'tools/rust-r4ghi/business/unreviewed.mjs',sha256:'0'.repeat(64)}]:structuredClone(test.helpers);};
  const pins=()=>{events.push('sourcePins-after-approval');const file='docs/design/rust-r4ghi/source13-g2-freeze136.json';assert(files.has(R+'/'+file));return[{file,sha256:sha(files.get(R+'/'+file))}];};
  const nullTemplate=value=>{for(const key of ['candidateReceipt','process','sourcePins','helperPins'])if(key in value)assert.equal(value[key],null);};
  const fakeProcess={platform:'linux',execPath:N,execArgv:[],env:{},argv:[N,R+'/tools/rust-r4ghi/freeze-source13-183.mjs','--input',inputFile,'--approved-input-sha',approved,'--execute']};
  runBody(fakeFS,path.posix,assert,createHash,pins,raw,graph,nullTemplate,()=>test.external,fakeProcess,{log:()=>{}});
  const approvalFile=R+'/docs/design/rust-r4ghi/source13-g2-freeze136.json',approval=JSON.parse(files.get(approvalFile));
  assert.equal(approval.actualM98Applied,false);assert.equal(approval.G3Certified,false);assert.equal(approval.G4Certified,false);
  assert.equal(approval.finalHelperH0.rawBytesSha256,sha(files.get(approval.finalHelperH0.file)));
  assert(!JSON.stringify(approval).includes('sourcePinsSHA256'));
  assert(!('candidateReceipt' in approval));assert(!('registry' in approval));
  assert(events.indexOf('write:'+approvalFile)<events.indexOf('sourcePins-after-approval'));
  assert.equal(writes.length,4);
  return{writes:writes.length,helperCount:test.helpers.length};
}
const good=execute();
function negative(name,mutate){assert.throws(()=>execute({mutate}),undefined,name);testNames.push(name);}
negative('wrong-approved-input-sha',t=>{t.approvedHash='0'.repeat(64);});
negative('G2-already-present',t=>{t.set(R+'/docs/design/rust-r4ghi/source13-g2-freeze136.json',{});});
negative('Source13-state-already-present',t=>{t.set(P+'/business/g2-business13/main01/state.json',{});});
negative('old-driver-lock-present',t=>{t.set(P+'/business/g2-business12/main01/driver.lock',{});});
negative('unreviewed-new-helper',t=>{t.helpers.push({file:'tools/rust-r4ghi/business/unreviewed.mjs',sha256:'0'.repeat(64)});});
negative('missing-reviewed-helper',t=>{t.helpers.pop();});
negative('wrong-context-predecessor',t=>{const d=structuredClone(dependency);d.context.beforeSHA256='0'.repeat(64);t.input.dependencyCorrection181=t.set(P+'/synthetic-review112/wrong-dep.json',d);});
negative('unregistered-external-leaf',t=>{t.external.push({file:'tools/unknown.mjs',rawBytesSha256:'0'.repeat(64)});});
negative('mutable-labor-template',t=>{const f=R+'/tools/rust-r4ghi/business/labor-mask-bindings47.json',v={environmentBindings46:null,lineage:null,actors:{}};t.set(f,v);});
negative('wrong-support-tool-byte-pin',t=>{t.input.supportingTools.source13Constructor.rawBytesSha256='0'.repeat(64);});
negative('missing-mandatory-migration-wrapper',t=>{delete t.input.supportingTools.migrationWrapper;});
negative('wrong-M98-SQL-bytes',t=>{t.set(R+'/docs/design/rust-r4ghi/g2-frozen-participant-parent-lock65.sql','wrong SQL');});
negative('migration-inventory-97',t=>{t.migrationNames=fs.readdirSync(root+'/apps/poms-api/src/migrations').filter(n=>/^Migration\d{14}.*\.ts$/.test(n)).sort().slice(0,97);});
negative('post-write-helper-graph-drift',t=>{t.postHelperChanged=true;});
negative('missing-final-H-overlay',t=>{t.input.finalHToolManifests=[];});
const report={kind:'non-author-freeze183-in-memory-FS-protocol-and-static-review112',source:{file:'tools/rust-r4ghi/freeze-source13-183.mjs',rawBytesSha256:sha(source)},positive:{whollySyntheticWrites:good.writes,syntheticHelperCount:good.helperCount,sourceArrayCapturedAfterImmutableApproval:true,approvalContainsNoFinalSourceDigestOrB0OrR3:true},negativesRejected:testNames,actualRetained139:{index:actualPins[0],receipt:actualPins[1],oldFrozenStateRawSHA256:index.frozenState.rawBytesSha256,oldSnapshotRawSHA256:index.retainedSnapshot.rawBytesSha256,baseBusinessHelpers:index.helperSources.filter(x=>x.original.file.startsWith('tools/rust-r4ghi/business/')).length},actualInputPins:actualPins,qualification:'Synthetic overlays exercise script mechanics only; Root final H03 input seal/H0/G2/source count not certified. No actual freeze CLI or output was run.',actions:{RootWrites:0,SQL:0,HTTP:0,processActions:0,cargo:0,GitWrites:0},actualSource13:null,G3Certified:false,G4Certified:false};
fs.writeFileSync(out+'/probe112.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,negatives:testNames.length,reportSHA256:sha(fs.readFileSync(out+'/probe112.json'))}));
