// Foreground WSL lifetime only. Never starts/stops PG/API or mints a context.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { C, folder, loadCLI, mainGuard, opIntent, pin, procStat, sha, writeWx } from './facts121.mjs';

export async function hold121() {
  const inv=loadCLI('holder-start'), {p}=inv;
  assert.equal(process.platform,'linux');
  assert.equal(fs.realpathSync(p.outputDirectory),p.outputDirectory);
  assert.equal(fs.statSync(p.outputDirectory).uid,1000);
  fs.chmodSync(p.outputDirectory,0o700);
  const intent=opIntent(inv),st=procStat(fs.readFileSync('/proc/self/stat','utf8'));
  const source=pin(folder+'/hold-runtime121.mjs'),node=pin(C.node);
  const ready=writeWx(p.outputDirectory,'holder-ready.json',{
    kind:'actual-runtime121-A-holder-ready',namespace:C.namespace,nonce:p.nonce,
    pid:process.pid,startTime:st.startTime,bootId:fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),
    node,source,cwd:process.cwd(),argv:process.argv,input:inv.input,review:inv.review,intent,
    startedAt:new Date().toISOString(),PGStarted:false,APIStarted:false,contextCreated:false,
  });
  console.log(JSON.stringify({holderReady:ready,PGStarted:false,APIStarted:false}));
  await new Promise((resolve,reject)=>{
    let ended=false;
    const end=(reason,error=null)=>{
      if(ended)return;ended=true;clearInterval(timer);
      try{writeWx(p.outputDirectory,'holder-ended.json',{kind:'actual-runtime121-A-holder-ended',ready,reason,error,endedAt:new Date().toISOString(),automaticPGOrAPISignal:false});}
      catch(e){reject(e);return;}
      if(error)reject(Error(error));else resolve();
    };
    const timer=setInterval(()=>{
      try{assert.equal(sha(fs.readFileSync(source.file)),source.rawBytesSha256);assert.equal(fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),JSON.parse(fs.readFileSync(ready.file)).bootId);}
      catch(e){end('own-source-or-boot-change',e.message);}
    },30000);
    process.once('SIGTERM',()=>end('received-SIGTERM'));
    process.once('SIGINT',()=>end('received-SIGINT'));
  });
}
mainGuard(import.meta.url,hold121);
