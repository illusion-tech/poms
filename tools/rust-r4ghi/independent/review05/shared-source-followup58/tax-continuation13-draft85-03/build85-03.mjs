// Proposal-only materialization. Every write stays inside this directory.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';
import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const out=path.dirname(fileURLToPath(import.meta.url)),parent=path.dirname(out),sha=b=>createHash('sha256').update(b).digest('hex');
const predecessor={
 'tools/rust-r4ghi/business/tax13-provenance.mjs':parent+'/tax-continuation13-draft85-02/candidate/tools/rust-r4ghi/business/tax13-provenance.mjs',
 'tools/rust-r4ghi/run-tax-continuation13.mjs':parent+'/tax-continuation13-draft85/candidate/tools/rust-r4ghi/run-tax-continuation13.mjs',
 'tools/rust-r4ghi/business/tax13.test.mjs':parent+'/tax-continuation13-draft85-02/candidate/tools/rust-r4ghi/business/tax13.test.mjs'};
const products=[];
function save(file,before,after){const p=out+'/candidate/'+file;fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,after,{flag:'wx'});const old=out+'/before85-02/'+file;fs.mkdirSync(path.dirname(old),{recursive:true});fs.writeFileSync(old,before,{flag:'wx'});products.push({target:file,before: 'before85-02/'+file,beforeSHA256:sha(before),candidate:'candidate/'+file,afterSHA256:sha(after),bytes:Buffer.byteLength(after)});}
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,a.slice(0,80));return s.replace(a,()=>b);};
const file='tools/rust-r4ghi/business/tax13-provenance.mjs',before=fs.readFileSync(predecessor[file]);let s=before.toString();
const extra=`
// This WeakMap records only an explicit CLI-approved private original; it never
// grants business authority. The existing registry/source/process checks follow.
const approvedRuntimeBindings13=new WeakMap();
function containedTax13(root,file){const rel=path.relative(fs.realpathSync(root),fs.realpathSync(file));assert(rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel),'Runtime binding must resolve inside this exact consumer private directory');}
export function loadApprovedTax13Bindings({file,rawBytesSha256},expectedPrivateDirectory){
 const source={file,rawBytesSha256};pin(source);assert(path.isAbsolute(expectedPrivateDirectory));containedTax13(expectedPrivateDirectory,file);const bytes=readPin54(source),manifest=JSON.parse(bytes);assertBoundTax13(manifest);
 const approved=Object.freeze({...source,bytes:bytes.length});approvedRuntimeBindings13.set(manifest,approved);return{manifest,pin:approved};
}
export function assertApprovedTax13Bindings(ctx,manifest){
 const source=approvedRuntimeBindings13.get(manifest);assert(source,'Only an explicitly hash-approved private runtime binding is executable; never use the business template or an approval boolean');containedTax13(ctx.priv,source.file);const bytes=readPin54(source);assert.equal(bytes.length,source.bytes);assert.deepEqual(JSON.parse(bytes),manifest,'Approved runtime binding bytes/object changed');return source;
}
export function assertUnboundTax13Template(template){
 assert.equal(template.schemaVersion,1);assert.equal(template.kind,'Source13-retained-tax-continuation85');assert.equal(template.current.epoch,'g2-business13');assert.equal(template.current.run,'main01');
 for(const[key,value]of Object.entries(template.current))if(!['epoch','run'].includes(key))assert.equal(value,null,'Business binding JSON stays an immutable all-null template');
 assert(Object.values(template.current).some(v=>v===null));
}
export function assertCompleteTax13HelperGraph(ctx,manifest,registry){
 const c=manifest.current;assert.equal(ctx.helperPins.length,c.helperCount);assert(ctx.helperPins.some(p=>p.file===TAX13_BINDINGS),'The immutable business template belongs to the complete code graph');
 const expected=c.helperSources.filter(p=>p.file.startsWith('tools/rust-r4ghi/business/')).map(p=>p.file).sort();assert.deepEqual(ctx.helperPins.map(p=>p.file).sort(),expected,'No helper or template may be omitted; the runtime input is outside this graph');
 assert.deepEqual(JSON.parse(readPin54(registry.consumer.helperPins)),ctx.helperPins,'Runtime helpers must equal the actual graph admitted by schema3; no post-mint silent refreeze');
}
`;
s=once(s,"export const TAX13_BINDINGS='tools/rust-r4ghi/business/tax13-bindings.json';", "export const TAX13_BINDINGS='tools/rust-r4ghi/business/tax13-bindings.json'; // Unexecutable immutable template only.\n"+extra);
const start=s.indexOf('export function verifyTax13Sources(ctx,manifest){'),end=s.indexOf('export function producerRootIdentity13',start);assert(start>=0&&end>start);
s=s.slice(0,start)+`export function verifyTax13Sources(ctx,manifest){
 assertBoundTax13(manifest);const approved=assertApprovedTax13Bindings(ctx,manifest),c=manifest.current;assert.equal(ctx.epoch,c.epoch);assert.equal(ctx.run,c.run);assert.equal(ctx.migrations,c.migrations);assert.equal(ctx.tables,139);assert.deepEqual(ctx.pins,c.sourcePins);assert.equal(ctx.pins.length,c.sourceCount);assert.equal(ctx.state.apiProcess?.record?.binarySha256,c.binarySHA256);
 const templateBytes=fs.readFileSync(ctx.win+'/'+TAX13_BINDINGS);assertUnboundTax13Template(JSON.parse(templateBytes));assert.equal(ctx.helperPins.find(p=>p.file===TAX13_BINDINGS)?.sha256,sha(templateBytes));
 for(const p of [...c.sourcePins,...c.helperSources])assert.equal(sha(fs.readFileSync(ctx.win+'/'+p.file)),p.sha256,'Changed registered Source13 input: '+p.file);
 const registry=assertAdmittedContext54(ctx,{liveProcess:true,sourceFiles:true});assertCompleteTax13HelperGraph(ctx,manifest,registry);assert.deepEqual(ctx.state.consumerAdmission54.registry,c.registry);assert.deepEqual(registry.retentionIndex,c.retentionIndex);assert.deepEqual(registry.producerState,c.retainedProducerState);assert.deepEqual(registry.consumer.apiProcess,c.apiProcess);assertActualCandidateTax13(ctx,c,JSON.parse(readPin54(c.candidate)));
 assert.equal(sha(JSON.stringify(pointer54(ctx.state,manifest.legacy.registryPath))),c.producerProjectionSHA256,'A current consumer must not edit its old producer record');
 return {bindingSHA256:approved.rawBytesSha256,runtimeBindings:approved,sourcePinsSHA256:c.sourcePinsSHA256,registry:c.registry,retentionIndex:c.retentionIndex,retainedProducerState:c.retainedProducerState,binarySHA256:c.binarySHA256};
}
`+s.slice(end);
s=once(s,"const identity={sourcePinsSHA256:manifest.current.sourcePinsSHA256,registry:manifest.current.registry", "const identity={runtimeBindings:assertApprovedTax13Bindings(ctx,manifest),sourcePinsSHA256:manifest.current.sourcePinsSHA256,registry:manifest.current.registry");
save(file,before,s);
const entry='tools/rust-r4ghi/run-tax-continuation13.mjs',entryBefore=fs.readFileSync(predecessor[entry]);s=entryBefore.toString();
s=once(s,'{assertBoundTax13,readRetainedTax13,TAX13_BINDINGS}', '{loadApprovedTax13Bindings,readRetainedTax13}');
s=once(s,"const modes=['inspect','finish-main','prepare-tax','fi-tax','commit-tax','disarm-fi'];", `const modes=['inspect','finish-main','prepare-tax','fi-tax','commit-tax','disarm-fi'];
export function parseTax13Options(rest){const names={'--phase':'phase','--bindings':'bindingsFile','--approved-bindings-sha':'approvedBindingsSHA256'},options={};assert.equal(rest.length%2,0);for(let i=0;i<rest.length;i+=2){const key=names[rest[i]];assert(key&&rest[i+1]);assert(!Object.hasOwn(options,key),'Duplicate option');options[key]=rest[i+1];}assert(/^[A-Za-z0-9_-]{1,48}$/.test(options.phase??''));assert(typeof options.bindingsFile==='string'&&options.bindingsFile.length>0);assert(/^[a-f0-9]{64}$/.test(options.approvedBindingsSHA256??''));return options;}`);
s=once(s,' --phase UNIQUE_PHASE; Source13 actual inputs', ' --phase UNIQUE_PHASE --bindings ABS_PRIVATE_JSON --approved-bindings-sha RAW_SHA; Source13 actual inputs');
s=once(s,"assert(modes.includes(mode));const options={};for(let i=0;i<rest.length;i+=2){assert.equal(rest[i],'--phase');assert(rest[i+1]);assert(!options.phase);options.phase=rest[i+1];}assert(/^[A-Za-z0-9_-]{1,48}$/.test(options.phase??''));", 'assert(modes.includes(mode));const options=parseTax13Options(rest);');
s=once(s,"const bytes=fs.readFileSync(FIXED.win+'/'+TAX13_BINDINGS),manifest=JSON.parse(bytes);assertBoundTax13(manifest);let ctx,lock,label;", "const loaded=loadApprovedTax13Bindings({file:options.bindingsFile,rawBytesSha256:options.approvedBindingsSHA256},FIXED.private+'/business/g2-business13/main01'),manifest=loaded.manifest;let ctx,lock,label;");
s=once(s,"{mode,currentSource:manifest.current,legacySource:manifest.legacy,reconciliation:legacy.reconciliation", "{mode,approvedRuntimeBindings:loaded.pin,currentSource:manifest.current,legacySource:manifest.legacy,reconciliation:legacy.reconciliation");
save(entry,entryBefore,s);
const test='tools/rust-r4ghi/business/tax13.test.mjs',testBefore=fs.readFileSync(predecessor[test]);s=testBefore.toString();
s=once(s,"import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';", "import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';");
s=once(s,'verifyTax13Sources,assertActualCandidateTax13}', 'verifyTax13Sources,assertActualCandidateTax13,loadApprovedTax13Bindings,assertApprovedTax13Bindings,assertUnboundTax13Template,assertCompleteTax13HelperGraph,tax13Record}');
s+="\n"+fs.readFileSync(out+'/private-binding-tests85-03.mjs','utf8');save(test,testBefore,s);
fs.writeFileSync(out+'/products85-03.json',JSON.stringify(products,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({products:products.length,RootWritten:false,SQL:0,HTTP:0}));
