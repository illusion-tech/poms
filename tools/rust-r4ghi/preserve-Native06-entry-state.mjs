// Root-private evidence preservation only. Never emits state/credential values.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,stateFiles,stateSHAs,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_error,sites)=>sites.map(s=>({file:s.getFileName(),function:s.getFunctionName(),line:s.getLineNumber(),column:s.getColumnNumber()}));
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');
  const nonce='8b6d8f9b-4bf8-4080-b8d2-63a3016772e1',D=C.private+'/business/g2-business15/main01';
  const publication=pin(D+'/runtime121-'+nonce+'/complete.json');assert.equal(publication.bytes,1522);assert.equal(publication.rawBytesSha256,'03a7a4864a819ecd10fbf1c81fb7c9df30372d97fb8ac4bffe76666f3b76d4eb');
  const c=json(publication);assert.equal(c.kind,'actual-Source15-runtime121-FS-publication-complete');assert.equal(c.statePublished,true);assert.equal(c.ordinaryContextCreated,false);assert.equal(c.SQLHTTP,false);
  assert.equal(c.state.file,D+'/state.json');assert.equal(c.state.bytes,14246666);assert.equal(c.state.rawBytesSha256,'952f661ec8330472f83b3e6bb309d11cb7c2faaaca52fed5782d287ac4004a53');
  for(const key of ['state13','state14','ownership15'])assert.equal(pin(stateFiles[key]).rawBytesSha256,stateSHAs[key]);
  const plan=json(c.input);assert.equal(plan.nonce,nonce);read(c.registry);read(c.candidate);assert.equal(plan.outputs.registryFile,c.registry.file);assert.equal(plan.outputs.candidateFile,c.candidate.file);
  assert.equal(plan.stateTransfer.expectedState.rawBytesSha256,stateSHAs.state15);read(plan.stateTransfer.expectedState);read(plan.stateTransfer.expectedOwnership);
  for(const epoch of [13,14,15]){try{fs.lstatSync(C.private+'/business/g2-business'+epoch+'/main01/driver.lock');}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Existing driver lock');}
  const raw=read(c.state),out=C.private+'/runtime121-native-entry-snapshots06/'+nonce;directory121(out,{exclusive:true});
  const expectedEntryState=writeWx(out,'entry-state.json',raw);assert.equal(expectedEntryState.rawBytesSha256,c.state.rawBytesSha256);assert(read(c.state).equals(read(expectedEntryState)));
  const sourceStat=fs.lstatSync(c.state.file,{bigint:true}),copyStat=fs.lstatSync(expectedEntryState.file,{bigint:true});assert(sourceStat.dev!==copyStat.dev||sourceStat.ino!==copyStat.ino);assert.equal(copyStat.uid,1000n);assert.equal(copyStat.mode&0o777n,0o600n);assert.equal(copyStat.nlink,1n);
  const receipt=writeWx(out,'preservation.json',{kind:'Root-actual-Native06-private-entry-state-preserved',recordedAt:new Date().toISOString(),publication,canonicalState:c.state,expectedEntryState,rawBytesEqual:true,physicallySeparate:true,privateStateCopyOnly:true,initialMetadataOutputKeyCheckStoppedBeforeCopy:true,outputKeysVerifiedFromFrozenPlan:true,stateValuesEmitted:false,credentialsOrEnvironmentValuesEmitted:false,canonicalStateWritten:false,NativeOrContextOrSQLHTTPExecuted:false,independentPublicationReadbackPending:true,businessG3:false,businessG4:false});
  console.log(JSON.stringify({expectedEntryState,receipt,stateValuesEmitted:false,canonicalStateWritten:false}));
}
main().catch(error=>{console.error(JSON.stringify({kind:'Root-private-Native06-entry-state-preservation-stopped',name:error.name,code:error.code??null,frames:error.stack,valuesPublished:false,canonicalStateWritten:false,preserveOriginals:true}));process.exitCode=1;});
