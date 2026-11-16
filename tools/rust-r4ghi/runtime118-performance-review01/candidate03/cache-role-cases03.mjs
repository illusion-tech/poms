import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createObservationController118,createPhaseMetrics118} from './model01/tools/rust-r4ghi/performance118/observation118.mjs';
const work='E:/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/runtime118-performance-review01',run=fs.realpathSync(fs.mkdtempSync(work+'/candidate03-cache-role-')),results=[];
const sha=b=>createHash('sha256').update(b).digest('hex'),file=(name,value)=>{const bytes=Buffer.from(value),p=path.join(run,name);fs.writeFileSync(p,bytes,{flag:'wx'});return{file:p,bytes:bytes.length,rawBytesSha256:sha(bytes)};};
function check(id,body){try{results.push({id,passed:true,details:body()??null});}catch(e){results.push({id,passed:false,error:{name:e.name,message:e.message}});}}
function directory(name,entry){const dir=path.join(run,name);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,entry),'x',{flag:'wx'});return dir;}

check('F06-exact-independent-cold-warm-directory-now-equivalent',()=>{
 const c=createObservationController118({maxCacheBytes:32}),values=[];for(let i=0;i<3;i++){const p=file('prior-'+i+'.json','{"n":0}');c.run('prior-scope',()=>values.push(c.json(p)));}
 const name='abcdefghijklmnopqrstuvwxyz',dir=directory('warm-directory',name);let warm,cold;c.run('warm',()=>{warm=c.directory(dir);});const fresh=createObservationController118({maxCacheBytes:32});fresh.run('cold',()=>{cold=fresh.directory(dir);});assert.deepEqual(warm,[name]);assert.deepEqual(warm,cold);assert(values.every(v=>Object.isFrozen(v)&&v.n===0));return{capacity:32,priorDecodedCharge:21,newNameBytes:26,coldPassed:true,warmPassed:true,returnedDecodedValuesPreserved:true};
});
check('raw-eviction-retains-original-return-and-forces-reread',()=>{
 const p=file('raw.txt','x'.repeat(31)),m=createPhaseMetrics118(),c=createObservationController118({metrics:m,maxCacheBytes:32}),dir=directory('raw-directory','abcdefghijklmnopqrstuvwxyz');let before;
 c.run('raw-room',()=>{before=c.read(p);assert.equal(before.length,31);assert.equal(c.directory(dir).length,1);assert.equal(c.read(p).toString(),'x'.repeat(31));assert.equal(before.toString(),'x'.repeat(31));});assert.equal(m.snapshot().totals.contentReads,3);return{reads:3,bufferReturnedBeforeEvictionStillValid:true,retainedSHASeal:true};
});
check('evicted-buffer-content-change-refused-on-next-read',()=>{
 const p=file('changed.txt','x'.repeat(31)),c=createObservationController118({maxCacheBytes:32}),dir=directory('changed-directory','abcdefghijklmnopqrstuvwxyz');assert.throws(()=>c.run('evicted-sha',()=>{c.read(p);c.directory(dir);fs.writeFileSync(p.file,'y'.repeat(31));c.read(p);}),/SHA|bookend|changed/);return{changedOriginalRejected:true};
});
check('evicted-buffer-dependency-survives-until-final-seal',()=>{
 const p=file('deleted.txt','x'.repeat(31)),c=createObservationController118({maxCacheBytes:32}),dir=directory('deleted-directory','abcdefghijklmnopqrstuvwxyz');assert.throws(()=>c.run('evicted-dependency',()=>{c.read(p);c.directory(dir);fs.renameSync(p.file,p.file+'.preserved');}),/ENOENT|changed|bookend/);return{descriptorNotEvicted:true,missingOriginalRejectedAtSeal:true};
});
check('mandatory-name-limits-remain-hard',()=>{
 const long=directory('single-name-limit','abcdefghijklmnopq'),a=createObservationController118({maxCacheBytes:16});assert.throws(()=>a.run('single-limit',()=>a.directory(long)),/Directory name byte limit/);
 const first=directory('aggregate-a','abcdefghijklmnopqrst'),second=directory('aggregate-b','abcdefghijklmnopqrst'),b=createObservationController118({maxCacheBytes:32});assert.throws(()=>b.run('aggregate-limit',()=>{b.directory(first);b.directory(second);}),/Combined directory cache byte limit/);return{singleNameOverLimitRefused:true,nonEvictableAggregateRefused:true};
});
check('F07-identical-roles-retained-once-current-still-fresh',()=>{
 const p=file('roles.txt','fixed'),s=fs.lstatSync(p.file,{bigint:true}),c=createObservationController118({maxEntries:1,maxCacheBytes:64});const originalSet=Map.prototype.set;let retained=0;
 Map.prototype.set=function(key,value){if(typeof key==='string'&&key.startsWith('{"singleLink":')&&value&&Object.isFrozen(value)&&Object.hasOwn(value,'singleLink'))retained++;return originalSet.call(this,key,value);};let currentFD=0;
 try{c.run('roles',()=>{for(let i=0;i<1000;i++)c.verify(p);assert.equal(retained,1);c.verify(p,{uid:s.uid,ino:s.ino});c.verify(p,{ino:s.ino.toString(),uid:s.uid.toString()});assert.equal(retained,2);const oldOpen=fs.openSync;fs.openSync=function(...args){currentFD++;return oldOpen.apply(this,args);};try{for(let i=0;i<5;i++)c.verify(p,{uid:s.uid,ino:s.ino,freshIdentity:true});}finally{fs.openSync=oldOpen;}assert.equal(currentFD,5);assert.equal(retained,2);assert.throws(()=>c.verify(p,{ino:'0'}),/Role/);assert.equal(retained,2);},{staticPins:[p]});}finally{Map.prototype.set=originalSet;}
 return{sameRoleReaders:1000,sameRoleRecords:1,withStricterRoleRecords:retained,currentReads:5,currentFDOpens:currentFD};
});
check('all-distinct-checked-role-combinations-preserved',()=>{
 const p=file('all-roles.txt','fixed'),s=fs.lstatSync(p.file,{bigint:true}),keys=['dev','ino','nlink','uid','gid','mode'],c=createObservationController118();const originalSet=Map.prototype.set;let retained=0;
 Map.prototype.set=function(key,value){if(typeof key==='string'&&key.startsWith('{"singleLink":')&&value&&Object.isFrozen(value)&&Object.hasOwn(value,'singleLink'))retained++;return originalSet.call(this,key,value);};
 try{c.run('all-roles',()=>{for(const singleLink of [true,false])for(let mask=0;mask<64;mask++){const policy={singleLink};for(let bit=0;bit<6;bit++)if(mask&(1<<bit))policy[keys[bit]]=s[keys[bit]].toString();c.verify(p,policy);}assert.equal(retained,128);for(const singleLink of [true,false])for(let mask=0;mask<64;mask++){const policy={singleLink};for(let bit=5;bit>=0;bit--)if(mask&(1<<bit))policy[keys[bit]]=s[keys[bit]];c.verify(p,policy);}assert.equal(retained,128);},{staticPins:[p]});}finally{Map.prototype.set=originalSet;}return{distinctConstraintCombinations:128,equivalentReverseOrderExtraRecords:0};
});
check('permissive-role-does-not-hide-new-strict-role',()=>{
 const p=file('linked.txt','fixed');fs.linkSync(p.file,p.file+'.link');const c=createObservationController118();c.run('nlink-roles',()=>{c.verify(p,{singleLink:false,nlink:2});assert.throws(()=>c.verify(p,{singleLink:true}),/Single-link/);},{staticPins:[p]});return{nlink2AcceptedOnlyForPermissiveRole:true,strictRoleRejected:true};
});

const output={kind:'independent-candidate03-cache-role-cases',schemaVersion:1,reviewer:'/root/performance118_independent_review01',reviewerIsAuthor:false,reviewInputSHA256:'1d803d4d2cbeb6ffb02b2b69a8a4107a82a8776d45dd34ddce7f7c1fe53307f7',ownedRun:run,allPassed:results.every(r=>r.passed),actualTaskEffects:{SQL:0,HTTP:0,Auth:0,newSnapshots:0,probes:0,WSLStarts:0},results};const target=path.join(run,'results.json');fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:target,allPassed:output.allPassed,results}));if(!output.allPassed)process.exitCode=1;
