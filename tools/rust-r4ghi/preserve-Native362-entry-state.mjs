// Root-private immutable evidence copy after successful v3 publication only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_e,sites)=>sites.map(s=>({file:s.getFileName(),function:s.getFunctionName(),line:s.getLineNumber(),column:s.getColumnNumber()}));
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');const a=process.argv.slice(2);assert.equal(a.length,4);assert.deepEqual([a[0],a[2]],['--publication','--publication-sha']);
  const publication=pin(a[1]);assert.equal(publication.rawBytesSha256,a[3]);const c=json(publication),D=C.private+'/business/g2-business15/main01';
  assert.equal(c.kind,'actual-Source15-runtime121-FS-publication-complete');assert.equal(c.statePublished,true);assert.equal(c.ordinaryContextCreated,false);assert.equal(c.SQLHTTP,false);assert.equal(c.state.file,D+'/state.json');
  const plan=json(c.input);assert.equal(plan.protocolVersion,3);assert.equal(plan.stateTransfer.expectedState.rawBytesSha256,'e0d9ae5799c2c0adaccd98a0b5463915073089d596b7fe768666b9e6e3276a38');
  assert.equal(publication.file,D+'/runtime121-'+plan.nonce+'/complete.json');assert.equal(plan.outputs.registryFile,c.registry.file);assert.equal(plan.outputs.candidateFile,c.candidate.file);read(c.registry);read(c.candidate);read(plan.stateTransfer.expectedState);read(plan.stateTransfer.expectedOwnership);
  for(const q of [
    {file:C.private+'/business/g2-business13/main01/state.json',rawBytesSha256:'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'},
    {file:C.private+'/business/g2-business14/main01/state.json',rawBytesSha256:'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97'},
    {file:D+'/ownership.jsonl',rawBytesSha256:'eb4aa89f5ce253bae776101a66dd06d8cfb5fd4748d69f341dd7059eef5a3989'},
  ])read(q);
  for(const epoch of [13,14,15]){try{fs.lstatSync(C.private+'/business/g2-business'+epoch+'/main01/driver.lock');}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Existing driver entry requires reconciliation');}
  const raw=read(c.state),directory=C.private+'/runtime121-native-entry-snapshots362/'+plan.nonce;directory121(directory,{exclusive:true});
  const expectedEntryState=writeWx(directory,'entry-state.json',raw);assert.equal(expectedEntryState.rawBytesSha256,c.state.rawBytesSha256);assert(read(c.state).equals(read(expectedEntryState)));
  const original=fs.lstatSync(c.state.file,{bigint:true}),snapshot=fs.lstatSync(expectedEntryState.file,{bigint:true});assert(original.dev!==snapshot.dev||original.ino!==snapshot.ino);assert.equal(snapshot.uid,1000n);assert.equal(snapshot.mode&0o777n,0o600n);assert.equal(snapshot.nlink,1n);
  const receipt=writeWx(directory,'preservation.json',{kind:'Root-actual-corrective362-private-entry-state-preserved',recordedAt:new Date().toISOString(),publication,canonicalState:c.state,expectedEntryState,rawBytesEqual:true,physicallySeparate:true,privateStateCopyOnly:true,outputKeysVerifiedFromFrozenPlan:true,stateValuesEmitted:false,credentialsOrEnvironmentValuesEmitted:false,canonicalStateWritten:false,NativeOrContextOrSQLHTTPExecuted:false,independentPublicationReadbackPending:true,businessG3:false,businessG4:false});
  console.log(JSON.stringify({expectedEntryState,receipt,stateValuesEmitted:false,canonicalStateWritten:false}));
}
main().catch(e=>{console.error(JSON.stringify({kind:'Root-private-Native362-entry-state-preservation-stopped',name:e.name,code:e.code??null,frames:e.stack,valuesPublished:false,canonicalStateWritten:false,preserveOriginals:true}));process.exitCode=1;});
