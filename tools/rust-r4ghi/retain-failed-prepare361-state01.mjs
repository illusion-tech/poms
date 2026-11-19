// Preserve actual failed prepare1899 privately; no reset, replay or cleanup.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,assertOperatorHost121,json,pin,read,sha,stateFiles,directory121,writeWx} from './runtime-recovery121/root/facts121.mjs';
Error.prepareStackTrace=(_e,s)=>s.map(v=>({file:v.getFileName(),function:v.getFunctionName(),line:v.getLineNumber(),column:v.getColumnNumber()}));
async function main(){
  assertOperatorHost121();assert.equal(process.platform,'linux');const nonce='1899fb63-42e3-4bd5-94d2-f1fbd8c57d57',D=C.private+'/business/g2-business15/main01';
  const current=pin(D+'/state.json');assert.equal(current.bytes,14666792);assert.equal(current.rawBytesSha256,'e0d9ae5799c2c0adaccd98a0b5463915073089d596b7fe768666b9e6e3276a38');
  const partial=pin(D+'/tax118-invocation-'+nonce+'/partial.json');assert.equal(partial.bytes,1399);assert.equal(partial.rawBytesSha256,'475056ab1ad4cd83c48b02babdf6de3b3efff8a3565cbf1267be54915fe743ce');
  const before=pin(C.private+'/runtime121-native-entry-snapshots361/337610a0-0a68-4445-862b-1b108cc47ce9/entry-state.json');assert.equal(before.rawBytesSha256,'76ad68ccf87565192f6089294ede52ab77d977f423a364c9d1b1ebb5d3d3263d');
  for(const file of ['/proc/187779',D+'/driver.lock']){try{fs.lstatSync(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}throw Error('Owned process or driver remains; reconcile before preservation');}
  const state=json(current),j=state.consumerChecks.taxInvocation121.invocations[nonce];assert.equal(j.phase,'closed-failed');assert.equal(j.result,null);assert.equal(j.families.length,0);assert.equal(j.httpAttempts.length,3);assert.equal(state.sequence,39);
  assert.equal(state.consumerChecks.taxInvocation121.invocations['82321806-8586-4210-b5cd-ef16311f63ce'].phase,'failed-preserve');
  const output=C.private+'/runtime121-prepare361-failed01/'+nonce;directory121(output,{exclusive:true});
  const stateCopy=writeWx(output,'after-state.json',read(current)),ownership=pin(D+'/ownership.jsonl'),ownershipCopy=writeWx(output,'after-ownership.jsonl',read(ownership));
  const partialCopy=writeWx(output,'partial-original.json',read(partial)),intent=pin(D+'/tax118-invocation-'+nonce+'/intent.json'),intentCopy=writeWx(output,'intent-original.json',read(intent));
  const bookends=[];for(const[name,p]of [['entry',j.entryGuard],['exit',j.exitGuard],['closed',j.closedJournal]])bookends.push({name,original:p,copy:writeWx(output,name+'-original.json',read(p))});
  assert(read(current).equals(read(stateCopy)));assert(read(ownership).equals(read(ownershipCopy)));
  const old=json(before),changed=[];for(const key of [...new Set([...Object.keys(old),...Object.keys(state)])].sort()){const a=JSON.stringify(old[key]),b=JSON.stringify(state[key]);if(a!==b)changed.push({key,beforeType:typeof old[key],afterType:typeof state[key],beforeBytes:a?.length??0,afterBytes:b?.length??0,beforeSHA256:a===undefined?null:sha(a),afterSHA256:b===undefined?null:sha(b)});}
  const books=Object.fromEntries(['state13','state14','ownership15'].map(k=>[k,pin(stateFiles[k])])),oldFailure=pin(D+'/000026-tax118-failed-bookend.json');assert.equal(oldFailure.rawBytesSha256,'a15d1ff2af218bf66de9bd2691238cc57240391af42bd698352e8087c93dec60');
  const receipt=writeWx(output,'retention.json',{kind:'Root-failed-real-prepare361-private-state-retained',recordedAt:new Date().toISOString(),nonce,current,stateCopy,ownership,ownershipCopy,partial,partialCopy,intent,intentCopy,bookends,beforeEntry:before,changedTopLevelMetadata:changed,books,oldFailure,phase:j.phase,sequence:39,result:null,FIStarted:false,normalTaxOrMainSent:false,domainPOSTObserved:false,ownedPIDStillPresent:false,driverLockPresent:false,stateValuesEmitted:false,canonicalStateWritten:false,modeReplayed:false,acceptedFreshPreparation:false,businessG3:false,businessG4:false});
  console.log(JSON.stringify({stateCopy,ownershipCopy,receipt,changedTopLevelKeys:changed.map(x=>x.key),books,stateValuesEmitted:false,modeReplayed:false}));
}
main().catch(e=>{console.error(JSON.stringify({kind:'Root-failed-prepare361-retention-stopped',name:e.name,code:e.code??null,frames:e.stack,valuesPublished:false,canonicalStateWritten:false}));process.exitCode=1;});
