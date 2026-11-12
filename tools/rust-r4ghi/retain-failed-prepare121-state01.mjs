// Private failure retention; no reset, state edit, mode replay or secret output.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,sha,stateFiles,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_e,s)=>s.map(v=>({file:v.getFileName(),function:v.getFunctionName(),line:v.getLineNumber(),column:v.getColumnNumber()}));
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');
  const nonce='82321806-8586-4210-b5cd-ef16311f63ce',D=C.private+'/business/g2-business15/main01';
  const current=pin(D+'/state.json');assert.equal(current.bytes,14645579);assert.equal(current.rawBytesSha256,'32bd6587911328886fc32e0ea40848107275fcaab889e2780098c2729097987b');
  const partial=pin(D+'/tax118-invocation-'+nonce+'/partial.json');assert.equal(partial.rawBytesSha256,'bc442c68bdf87b5bdc6a2328a0cadd6476f3c996392aaaff5e971a76a69e1045');
  const intent=pin(D+'/tax118-invocation-'+nonce+'/intent.json'),oldFailure=pin(D+'/000026-tax118-failed-bookend.json');assert.equal(oldFailure.rawBytesSha256,'a15d1ff2af218bf66de9bd2691238cc57240391af42bd698352e8087c93dec60');
  const before=pin(C.private+'/runtime121-native-entry-snapshots06/8b6d8f9b-4bf8-4080-b8d2-63a3016772e1/entry-state.json');assert.equal(before.rawBytesSha256,'952f661ec8330472f83b3e6bb309d11cb7c2faaaca52fed5782d287ac4004a53');
  for(const file of ['/proc/133214',D+'/driver.lock']){try{fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Owned process or driver control remains; no retention mutation chosen');}
  const out=C.private+'/runtime121-prepare-failed01/'+nonce;directory121(out,{exclusive:true});
  const stateCopy=writeWx(out,'after-state.json',read(current)),partialCopy=writeWx(out,'partial-original.json',read(partial)),intentCopy=writeWx(out,'intent-original.json',read(intent)),oldFailureCopy=writeWx(out,'existing-failed-bookend-original.json',read(oldFailure));
  assert(read(current).equals(read(stateCopy)));
  const a=json(before),b=json(stateCopy),changed=[];
  for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort()){const av=JSON.stringify(a[key]),bv=JSON.stringify(b[key]);if(av!==bv)changed.push({key,beforeType:typeof a[key],afterType:typeof b[key],beforeBytes:av?.length??0,afterBytes:bv?.length??0,beforeSHA256:av===undefined?null:sha(av),afterSHA256:bv===undefined?null:sha(bv)});}
  const books=Object.fromEntries(['state13','state14','ownership15'].map(key=>[key,pin(stateFiles[key])]));
  const receipt=writeWx(out,'retention.json',{kind:'Root-failed-real-prepare121-private-state-retained',recordedAt:new Date().toISOString(),nonce,current,stateCopy,partial,partialCopy,intent,intentCopy,oldFailure,oldFailureCopy,beforeEntry:before,changedTopLevelMetadata:changed,books,ownedPIDStillPresent:false,driverLockPresent:false,stateValuesEmitted:false,canonicalStateWritten:false,modeReplayed:false,acceptedFreshPreparation:false,businessG3:false,businessG4:false});
  console.log(JSON.stringify({stateCopy,receipt,changedTopLevelKeys:changed.map(v=>v.key),books,stateValuesEmitted:false,modeReplayed:false}));
}
main().catch(e=>{console.error(JSON.stringify({kind:'Root-failed-prepare121-retention-stopped',name:e.name,code:e.code??null,frames:e.stack,valuesPublished:false,canonicalStateWritten:false}));process.exitCode=1;});
