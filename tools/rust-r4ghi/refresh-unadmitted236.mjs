// State-free fresh pair after232 withdrawal and235 regression, before new119.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { FIXED, guard, sourcePins, ownedFile } from './business/context.mjs';
import { capture, readRows } from './business/snapshot.mjs';
import { assertRecorded } from './business/ledger.mjs';
import { assertAdmittedContext54 } from './business/consumer-admission54.mjs';
import { sha } from './business/pure.mjs';
const R=FIXED.win,P=FIXED.private,D=P+'/business/g2-business13/main01',O=D+'/tool119-refresh236';
assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert.deepEqual(process.argv.slice(2),['--execute']);assert(!fs.existsSync(O));assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
const pin=(file,expected)=>{const raw=ownedFile(file);if(expected)assert.equal(sha(raw),expected);return{file,rawBytesSha256:sha(raw)};};const json=p=>{pin(p.file,p.rawBytesSha256);return JSON.parse(ownedFile(p.file));};
const write=(file,value)=>{const raw=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(file,raw,{flag:'wx',mode:0o600});return pin(file);};
const nonce=randomUUID(),lock=D+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,nonce,mode:'state-free-new119-fresh-pair236'})+'\n',{flag:'wx',mode:0o600});
try{
 const withdrawalPin=pin(D+'/tool119-withdraw232/withdrawal232.json','efa024c6bc27cde5bb1686b2a25091e3556696f6a8b901ebdf905fd2cff8214f'),withdrawal=json(withdrawalPin);
 const stateRaw=ownedFile(D+'/state.json');assert.equal(sha(stateRaw),withdrawal.actualNewEntry.rawBytesSha256);const state=JSON.parse(stateRaw);assert(!state.toolAdmission119&&!state.activeFault&&!state.blockedObservation&&!state.cleaned&&!state.cleanupPlan);assert.equal(state.sequence,38);
 const helperPin=pin(D+'/helper-fixture234/H1-actual234.json','51b303a3fccbae5e7fd7b0cc6a042da5bfd12f43c4a7507dfb6479e1d0be579c'),helpers=json(helperPin);
 const sourcePin=pin(P+'/source13-preparation193/sourcePins.json','e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c'),sources=json(sourcePin);assert.equal(helpers.length,198);assert.equal(sources.length,416);assert.deepEqual(sourcePins(),sources);
 const regressionPin=pin(P+'/source13-H1-helper235/receipt235.json'),regression=json(regressionPin);assert.equal(regression.exitCode,0);assert.deepEqual([regression.tests,regression.pass,regression.fail,regression.skipped],[211,211,0,0]);assert.equal(regression.helperH1SHA256,helperPin.rawBytesSha256);
 const verify=()=>{assert.deepEqual(sourcePins(),sources);for(const item of [...sources,...helpers])assert.equal(sha(ownedFile(R+'/'+item.file)),item.sha256);assert.equal(fs.readdirSync(R+'/tools/rust-r4ghi/business').filter(n=>/\.(mjs|json)$/.test(n)).length,198);};verify();
 const identity=JSON.parse(ownedFile(FIXED.stateRoot+'/identity.json')),provision=JSON.parse(ownedFile(R+'/tmp/rust-r4ghi/root/environment01/provision01.json'));assert.equal(identity.marker,state.marker);assert.equal(identity.namespace,FIXED.namespace);assert.equal(provision.marker,identity.marker);
 const ctx={...FIXED,identity,provision,state,pins:sources,helperPins:helpers,epoch:state.epoch,run:state.run,priv:D};
 assert.throws(()=>assertAdmittedContext54(ctx,{liveProcess:false,sourceFiles:true}),/Changed\/unadmitted tools require an explicit119/);
 const apiPin=pin(P+'/rust-api136-process.json','0b5817a0f32f4ad12fce36a4035c59c06d852611f65891dec349e6eccf505f6f'),api=json(apiPin);assert.deepEqual(state.apiProcess.record,api);
 const live=()=>{const stat=fs.readFileSync('/proc/'+api.pid+'/stat','utf8');assert.equal(stat.slice(stat.lastIndexOf(') ')+2).split(' ')[19],api.startTime);assert.equal(fs.realpathSync('/proc/'+api.pid+'/exe'),api.binary);const st=fs.lstatSync(api.binary);assert(st.isFile()&&!st.isSymbolicLink());assert.equal(sha(fs.readFileSync(api.binary)),api.binarySha256);};live();
 const require=createRequire(FIXED.mirror+'/package.json'),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg'),password=ownedFile(P+'/owner-password').toString();assert(/^[a-f0-9]{64}$/.test(password));
 ctx.db=async(fn,database)=>{assert(FIXED.databases.includes(database));const c=new Client({host:FIXED.host,port:FIXED.port,database,user:FIXED.owner,password,application_name:'r4ghi-unadmitted-readonly236',connectionTimeoutMillis:8000,query_timeout:45000,options:'-c default_transaction_read_only=on -c statement_timeout=45000 -c lock_timeout=10000'});await c.connect();try{assert.equal((await c.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'on');await guard(ctx,c,database);return await fn(c);}finally{await c.end();}};
 fs.mkdirSync(O,{mode:0o700});const entryState=write(O+'/entry-state-before-new119.json',stateRaw),observation={...ctx,priv:O,artifact:(name,value)=>{assert.equal(path.basename(name),name);return write(O+'/'+name,{...value,namespace:FIXED.namespace,namespaceAnnotationProducer:'state-free-new119-fresh236'});}};
 const before=await capture(observation,'new119-before236');assertRecorded(ctx,before);const after=await capture(observation,'new119-after236');assertRecorded(ctx,after);
 const oldObservation=json(pin(D+'/tool119-prewithdraw233/receipt233.json','b2817ce2186c0b8c0c9b9542508ef2dfacf18a6f3a11389273bfc621a7795799')),old=json(oldObservation.actualPreWithdrawalSnapshot),counts={};
 for(const db of FIXED.databases){for(const observed of [before,after]){assert.deepEqual(observed.databases[db].meta,old.databases[db].meta);assert.deepEqual(observed.objects[db],old.objects[db]);assert.deepEqual(Object.keys(observed.databases[db].tables),Object.keys(old.databases[db].tables));assert.equal(Object.keys(observed.databases[db].tables).length,139);for(const table of Object.keys(observed.databases[db].tables))assert.deepEqual(readRows(observed.databases[db].tables[table]),readRows(old.databases[db].tables[table]));}counts[db]=Object.values(after.databases[db].tables).reduce((n,t)=>n+t.count,0);}
 verify();live();assert.deepEqual(ownedFile(D+'/state.json'),stateRaw);
 const receipt=write(O+'/receipt236.json',{kind:'actual-state-free-fresh-pair-after-withdrawal236',withdrawal:withdrawalPin,regression:regressionPin,entryState,beforeSnapshot:before.manifest,afterSnapshot:after.manifest,priorPreWithdrawal:oldObservation.actualPreWithdrawalSnapshot,
 sourcePins:sourcePin,H1:helperPin,apiProcess:apiPin,counts,all139TablesEachRawXminMetaSequenceObjectsUnchanged:true,originalStateAndCounterUnchanged:true,ordinaryContextStillFailClosed:true,actualDefaultTransactionReadOnly:true,createContextOrPersist:false,HTTP:false,DMLOrDDL:false,new119Published:false,G3Certified:false,G4Certified:false});
 console.log(JSON.stringify({receipt,entryState,beforeSnapshot:before.manifest,afterSnapshot:after.manifest,counts,ordinaryContextStillFailClosed:true,new119Published:false,HTTPOrDML:false}));
}catch(error){if(!fs.existsSync(O))fs.mkdirSync(O,{mode:0o700});const partial=write(O+'/partial236.json',{name:error.name,message:error.message,stack:error.stack,noBlindRetry:true});console.error(JSON.stringify({completed:false,partial,noBlindRetry:true}));process.exitCode=1;}
finally{const owner=JSON.parse(ownedFile(lock));assert.equal(owner.pid,process.pid);assert.equal(owner.nonce,nonce);fs.unlinkSync(lock);}
