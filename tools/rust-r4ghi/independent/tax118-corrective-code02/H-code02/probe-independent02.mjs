// Independent actual-source spans and immutable retained files. No task entry.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const D=path.dirname(fileURLToPath(import.meta.url)), T=D+'/isolated-tree02', R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const local=f=>f.replace(/^E:\//,'/mnt/e/');
const pin=f=>{const b=fs.readFileSync(f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)}};
function read(p){const f=local(p.file),s=fs.lstatSync(f);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);const b=fs.readFileSync(f);assert.equal(sha(b),p.rawBytesSha256);if(p.bytes!==undefined)assert.equal(b.length,p.bytes);return b;}
const mp={file:R+'/tools/rust-r4ghi/tax15-invocation118/tests/sealed-code02/manifest118-code02.json',bytes:20973,rawBytesSha256:'e798873c3abf8adac3d1b29104aee13725b5ac2b0ab8ae01190e88eb30bcd548'},m=JSON.parse(read(mp));
const require=createRequire(pathToFileURL(T+'/package.json')),ts=require('typescript');
const proof=R+'/tools/rust-r4ghi/tax15-invocation118/invocation-proof.mjs',retained=R+'/tools/rust-r4ghi/tax15-invocation118/retained-tax-proof.mjs';
function parse(f){const text=fs.readFileSync(f,'utf8');return{text,ast:ts.createSourceFile(f,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)}}
function fn(f,name){const{text,ast}=parse(f),n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(n,name);return text.slice(n.getStart(ast),n.end).replace(/^export\s+/,'')}
const lib=await import(pathToFileURL(T+'/tools/rust-r4ghi/tax15-invocation118/retained-tax-proof.mjs'));
const map=JSON.parse(read(m.sourceMap)),mapResults=[];
for(const item of map.files){for(const[k,p]of[['priorFunctions',item.before],['currentFunctions',item.after]]){
 const b=read(p),text=b.toString('utf8'),ast=ts.createSourceFile(p.file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),nodes=[];
 const visit=n=>{if(ts.isFunctionDeclaration(n)||ts.isFunctionExpression(n)||ts.isArrowFunction(n)||ts.isMethodDeclaration(n)||ts.isGetAccessor(n)||ts.isSetAccessor(n)||ts.isConstructorDeclaration(n)){const a=Buffer.byteLength(text.slice(0,n.getStart(ast))),z=Buffer.byteLength(text.slice(0,n.end));nodes.push({kind:ts.SyntaxKind[n.kind],name:n.name?.getText(ast)??null,startByte:a,endByte:z,rawBytesSha256:sha(b.subarray(a,z)),complete:true})}ts.forEachChild(n,visit)};visit(ast);
 const declared=item[k]??item[k==='currentFunctions'?'functions':k];assert(declared,JSON.stringify(Object.keys(item)));const normative=a=>a.map(({name,...row})=>row);assert.deepEqual(normative(nodes),normative(declared));mapResults.push({file:item.file,version:k,count:nodes.length,allByteRangesKindsAndHashesExact:true,nameLabelsNonNormative:true});
}}
const oldRet=m.production.find(x=>x.file.endsWith('/retained-tax-proof.mjs')),oldFacts=m.production.find(x=>x.file.endsWith('/tax15-facts.mjs'));
assert.equal(read(oldRet.candidate).toString().replace('import { sha, uuid }','import { uuid }'),read(oldRet.beforeCode01).toString());
const newFacts=read(oldFacts.candidate).toString(),beforeFacts=read(oldFacts.beforeCode01).toString();
assert.equal(newFacts.replace(/    TAX13_OPERATION,\r?\n/,''),beforeFacts);
assert.equal(fn(local(oldRet.candidate.file),'checkpointTax14'),fn(local(oldRet.beforeCode01.file),'checkpointTax14'));
assert.equal(fn(local(oldFacts.candidate.file),'deriveTax15FixtureDetails'),fn(local(oldFacts.beforeCode01.file),'deriveTax15FixtureDetails'));
// Real retained Source12 checkpoint; the private function is evaluated, not the native entry.
const templateFile=R+'/tools/rust-r4ghi/business/tax14-bindings258.json',template=JSON.parse(fs.readFileSync(templateFile));
const oldState=JSON.parse(read(template.legacy.originalProducerState12)),tax=oldState.fixtures.sharedSourceFollowup58.tax;
const operation=JSON.parse(read(tax.expense.original)).operationId;
const checkpoint=vm.runInNewContext('('+fn(retained,'checkpointTax14')+')',{JSON,assert,read118:lib.read118,fs,sha});
const actual=checkpoint({},tax.expense,operation);
assert.equal(actual.httpPin.rawBytesSha256,sha(fs.readFileSync(actual.httpPin.file)));
const oldCheckpoint=vm.runInNewContext('('+fn(local(oldRet.beforeCode01.file),'checkpointTax14')+')',{JSON,assert,read118:lib.read118,fs});
assert.throws(()=>oldCheckpoint({},tax.expense,operation),/sha is not defined/);
const temp=fs.mkdtempSync(D+'/isolated-tree02/tmp/independent-open02-');
function failureModel(missingIntent){const root=temp+'/'+(missingIntent?'missing':'present'),priv=root+'/business/g2-business15/main01',nonce='12345678-1234-4123-8123-123456789012',dir=priv+'/tax118-invocation-'+nonce;fs.mkdirSync(dir,{recursive:true});
 const put=(n,s)=>{const f=root+'/'+n;fs.writeFileSync(f,s,{flag:'wx'});return pin(f)};
 fs.writeFileSync(priv+'/state.json','{"untouched":true}');const input=put('input.json','{}'),review=put('review.json','{}'),runtime=put('runtime.json','{}');const sources=Array.from({length:8},(_,i)=>put('source'+i+'.mjs','export const a'+i+'=1;'));
 const p={nonce,mode:'prepare-only',runtimeBindings:runtime,executionSources:sources,codeAdmission15:put('reg.json','{}'),candidate:put('B1.json','{}')};
 if(!missingIntent)fs.writeFileSync(dir+'/intent.json',JSON.stringify({input,exactReview:review,pid:process.pid,nonce}));
 const primary=Error('original-primary');let nativeExits=0,externalSourceReads=0;const native={assertRuntimeBinding15(){nativeExits++}};
 const call=vm.runInNewContext('('+fn(proof,'closeFailedOpen118')+')',{fs,assert,process,Buffer,F118:{...lib.F118,private:root},json118:lib.json118,samePin118:lib.samePin118,sha118:lib.sha118,read118(p){if(sources.some(s=>s.file===p.file))externalSourceReads++;return lib.read118(p)}});
 let secondary=null;try{call({state:{}},native,{},p,input,review,primary)}catch(e){secondary=e.message;primary.bookendError??=e.message;primary.openFailure??={phase:'open-failed-exit-error-preserve',actualConstructorReturned:true,capabilityReturned:false,exitError:e.message};primary.openFailure.exitEvidenceError??=e.message}
 assert.equal(nativeExits,1);assert.equal(primary.message,'original-primary');if(missingIntent){assert.equal(externalSourceReads,0);assert(secondary);assert(primary.bookendError&&primary.openFailure.exitEvidenceError)}else{assert.equal(externalSourceReads,8);assert.equal(secondary,null)}
 return {missingIntent,nativeExitAttempts:nativeExits,externalSourceReads,openFailure:primary.openFailure,bookendError:primary.bookendError??null,secondaryError:secondary,interpretation:missingIntent?'Secondary intent failure is explicitly retained; result/completion absent and caller throws. Eight-source recheck cannot be claimed in this secondary failure path.':'All eight external sources checked after native exit.'};
}
const model=[failureModel(false),failureModel(true)];
const out={kind:'non-author-code02-independent-actual-span-and-immutable-FS-probes',manifest:mp,functionMap:mapResults,actualRetainedCheckpoint:{legacyState:template.legacy.originalProducerState12,checkpoint:tax.expense.original,operationId:operation,http:actual.httpPin,newCheckpointPass:true,oldCheckpointExactReferenceError:true},rawReverse:{retainedImportOnly:true,factsImportOnly:true,checkpointFunctionUnchanged:true,fullDetailsFunctionUnchanged:true},secondaryJournalModel:model,boundary:'Actual immutable Source12 files and real library read118; private helper spans evaluated with an explicit native-call counter, never an actual context/API or native mode.',actualModeOrCtx:false,RootOrPrivateWrite:false};
fs.writeFileSync(D+'/probe-independent02.json',JSON.stringify(out,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({actualCheckpoint:'PASS',functionSpans:mapResults,secondaryJournalModel:model.map(x=>({missingIntent:x.missingIntent,exit:x.nativeExitAttempts,eightSources:x.externalSourceReads,phase:x.openFailure.phase,secondaryError:Boolean(x.secondaryError)}))}));
