import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createObservationController118} from '../runtime118-performance-candidate01/candidate/tools/rust-r4ghi/performance118/observation118.mjs';
import {__reviewCloseModel118} from './directory-model01/tools/rust-r4ghi/business/runtime-admission121.mjs';
import {budgetObservation118} from './directory-model01/tools/rust-r4ghi/performance118/observation118.mjs';
import {__reviewWalk118} from './directory-model01/tools/rust-r4ghi/business/context.mjs';
import {enumerateSource15} from './directory-model01/tools/rust-r4ghi/source15-admission119/build-source15.mjs';
const work='E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/runtime118-performance-review01',run=fs.realpathSync(fs.mkdtempSync(work+'/directory-'));
const folder=path.join(run,'simple');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'leaf.rs'),'// owned');
const results=[];
for(const firstTyped of [true,false]){
 const c=createObservationController118();let caught;
 try{c.run('review.directory-modes',()=>{c.directory(folder,firstTyped?{withFileTypes:true}:undefined);c.directory(folder,firstTyped?undefined:{withFileTypes:true});});}catch(e){caught=e;}
 assert(caught);results.push({id:firstTyped?'typed-then-names':'names-then-typed',requestedValidFSOperations:true,accepted:false,actual:caught.actual,expected:caught.expected,receivedName:caught.name});
}

// Controlled bridge for original Linux path grammar on Windows. Only this
// owned prefix maps to owned fixture files; actual canonical identities and
// bytes are checked by the unchanged complete module functions.
const physical=path.join(run,'source-root');fs.mkdirSync(physical);const relative='apps/poms-api-rust/src/main.rs',realFile=path.join(physical,...relative.split('/'));fs.mkdirSync(path.dirname(realFile),{recursive:true});const bytes=Buffer.from('// real owned source bytes\n');fs.writeFileSync(realFile,bytes,{flag:'wx'});
const prefix='/review-owned/source-root',expected=[{file:relative,sha256:createHash('sha256').update(bytes).digest('hex')}],methods=['lstatSync','statSync','realpathSync','readFileSync','readdirSync','existsSync','openSync'];
const originals=Object.fromEntries(methods.map(name=>[name,fs[name]])),oldJoin=path.join,oldResolve=path.resolve;
const inside=p=>typeof p==='string'&&(p===prefix||p.startsWith(prefix+'/'));
const mapped=p=>{if(!inside(p))return p;const normalized=path.posix.normalize(p);assert(inside(normalized));return oldJoin(physical,...normalized.slice(prefix.length).split('/').filter(Boolean));};
for(const name of methods){fs[name]=function(p,...args){if(name==='realpathSync'&&inside(p)){const actual=originals.realpathSync(mapped(p),...args);assert(actual===physical||actual.startsWith(physical+path.sep));return prefix+(actual===physical?'':'/'+path.relative(physical,actual).split(path.sep).join('/'));}return originals[name](mapped(p),...args);};}
path.join=function(...args){return inside(args[0])?path.posix.join(...args):oldJoin(...args);};path.resolve=function(...args){return inside(args[0])?path.posix.resolve(...args):oldResolve(...args);};
try{
 assert.deepEqual(__reviewWalk118(prefix+'/apps/poms-api-rust/src',['.rs']),[prefix+'/'+relative]);assert.deepEqual(enumerateSource15(prefix,expected),expected);
 results.push({id:'complete-functions-without-ambient-observation',passed:true,expectedSourceFiles:1,bridge:'Explicit Windows owned-files path grammar model, not real runtime input'});
 for(const order of ['walk-build','build-walk']){
  const dir=oldJoin(run,order);fs.mkdirSync(dir);let inner;
  const proof=async(root,ticket)=>budgetObservation118(root,ticket,'review.full-directory-model',()=>{try{if(order==='walk-build'){__reviewWalk118(prefix+'/apps/poms-api-rust/src',['.rs']);enumerateSource15(prefix,expected);}else{enumerateSource15(prefix,expected);__reviewWalk118(prefix+'/apps/poms-api-rust/src',['.rs']);}}catch(e){inner=e;throw e;}return{exitGuard:null,closedJournal:null,result:null};});
  const model=__reviewCloseModel118(proof,dir);let caught;try{await model.close();}catch(e){caught=e;}assert(inner&&caught);
  results.push({id:'complete-functions-'+order,validControlWithoutObservation:true,accepted:false,innerName:inner.name,innerActual:inner.actual,innerExpected:inner.expected,nativeProjectedError:Boolean(caught),nativeClosed:model.state().closed});
 }
}finally{for(const name of methods)fs[name]=originals[name];path.join=oldJoin;path.resolve=oldResolve;}
const output={kind:'independent-runtime118-directory-mode-cases',reviewer:'/root/performance118_independent_review01',reviewerIsAuthor:false,reviewedCommit:'72275c80e92fad30bb736af3c5e5ee5a00731739',actualRuntimeAuthority:false,actualTaskEffects:{SQL:0,HTTP:0,Auth:0,newSnapshots:0,probes:0,WSLStarts:0},ownedRun:run,results};const file=oldJoin(run,'results.json');fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,results}));
