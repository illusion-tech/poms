// Exactly one start of the original stopped container and nonempty original volume.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { C, holderFacts, loadCLI, mainGuard, opIntent, verifyStates, writeWx } from './facts121.mjs';

function raw(args) {return spawnSync('/usr/bin/podman',args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});}
function run(args) {
  const r=raw(args);
  if(r.status!==0)throw Error('Original-container operation failed; preserve originals; never replace or retry');
  return r;
}
export function inspectOriginalPG121() {
  const c=JSON.parse(run(['inspect',C.container]).stdout)[0];
  assert.equal(c.Id,C.container);assert.equal(c.Image,C.image);
  const m=c.Mounts.find(x=>x.Name===C.volume);assert(m);assert.equal(m.Source,C.volumeRoot);
  assert.deepEqual(c.HostConfig.PortBindings['15432/tcp'],[{HostIp:'127.0.0.1',HostPort:'25434'}]);
  return{id:c.Id,image:c.Image,status:c.State.Status,running:c.State.Running,pid:c.State.Pid,volume:m.Name,volumeSource:m.Source,portBinding:c.HostConfig.PortBindings['15432/tcp']};
}
export async function resumePG121() {
  const inv=loadCLI('pg-start'),{p}=inv;assert.equal(process.platform,'linux');
  const holder=holderFacts(p),before=inspectOriginalPG121();assert.equal(before.running,false);assert.equal(before.pid,0);
  assert.equal(run(['unshare','/usr/bin/cat',C.volumeRoot+'/PG_VERSION']).stdout.trim(),'15');
  for(const oid of C.oids)run(['unshare','/usr/bin/test','-d',C.volumeRoot+'/base/'+oid]);
  const intent=opIntent(inv);let startAttempted=false;
  try {
    writeWx(p.outputDirectory,'before.json',{before,holder:p.holder,holderBoot:holder.bootId,PGVersion:'15',originalOIDDirectories:C.oids});
    startAttempted=true;const started=raw(['start',C.container]);
    writeWx(p.outputDirectory,'start-stdout.log',Buffer.from(started.stdout??''));writeWx(p.outputDirectory,'start-stderr.log',Buffer.from(started.stderr??''));
    writeWx(p.outputDirectory,'start-command.json',{exitCode:started.status,signal:started.signal,processError:started.error?{name:started.error.name,message:started.error.message}:null});
    assert.equal(started.status,0,'Start returned an unknown or failed outcome; preserve running state and do not retry');
    const after=inspectOriginalPG121();assert.equal(after.running,true);assert(after.pid>0);const readiness=[];
    for(const database of C.databases){const r=raw(['exec',C.container,'pg_isready','-h','127.0.0.1','-p','15432','-U','poms_r0e_owner','-d',database]);const receipt=writeWx(p.outputDirectory,'readiness-'+database+'.json',{database,exitCode:r.status,signal:r.signal,stdout:r.stdout??'',stderr:r.stderr??'',processError:r.error?{name:r.error.name,message:r.error.message}:null});readiness.push(receipt);assert.equal(r.status,0,'Original container started; preserve it and inspect readiness before any retry');}
    holderFacts(p);verifyStates(p);
    const result=writeWx(p.outputDirectory,'complete.json',{kind:'actual-runtime121-A-original-PG-resumed',mode:p.mode,input:inv.input,RootReview:inv.review,intent,before,after,readiness,holder:p.holder,bootId:holder.bootId,containerCreated:false,volumeCreated:false,migrationOrBackupRestore:false,businessDML:false,APIStarted:false,dataConservationNotYetObserved:true});
    console.log(JSON.stringify({result,APIStarted:false,dataConservationNotYetObserved:true}));
  } catch(e) {
    writeWx(p.outputDirectory,'partial.json',{kind:'runtime121-A-PG-start-preserve',input:inv.input,RootReview:inv.review,intent,startAttempted,message:e.message,processMayBeRunning:startAttempted,automaticStop:false,blindRetryForbidden:true});throw e;
  }
}
mainGuard(import.meta.url,resumePG121);
