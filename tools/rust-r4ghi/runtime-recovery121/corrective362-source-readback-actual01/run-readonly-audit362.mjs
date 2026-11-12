// One separately Root-authorized actual readonly FS invocation. No Source,
// Native/Core/app, process/env/proc, service, SQL or HTTP entrypoint is imported.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const I='/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation';
const auditor={file:I+'/source362-readback-preparation01/audit-source362.mjs',bytes:21836,rawBytesSha256:'5756c205387bab05a887b06cde5c0f9efb188ca0ce3eb02eede4399da4556ba1'};
const codeReview={file:I+'/source362-auditor-independent01/review-auditor-source362-code.json',bytes:4654,rawBytesSha256:'98e632bdf3b5db0024f61c42a7e021560aec1776d1e84e8b7ea8e3a07d5e41c4'};
const codeSeal={file:I+'/source362-auditor-independent01/seal-auditor-source362-code.json',bytes:2279,rawBytesSha256:'8d104b9338c60bc2a8672cbd37a68bd226dc623e7599a96d4471444b6f7113df'};
const outerCommand={file:'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/Source362-promotion-actual01/command.json',bytes:440,rawBytesSha256:'5748e45f889c701643acf56bc41cd27e0f8f2e45437b1d2125199af415523213'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const measure=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)};};
const save=(name,value)=>{assert.equal(path.posix.basename(name),name);const file=here+'/'+name;fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return measure(file);};
const began=new Date().toISOString();
assert.equal(here,I+'/source362-actual-readback01');
assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');
const invocation=save('invocation.json',{file:'wsl.exe',argv:['--exec','/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node',here+'/run-readonly-audit362.mjs'],entrypoint:'auditSource362',outerCommand,authorizingRole:'Root separate one-time actual readonly FS grant',sourceReplay:false,NativeCoreApp:false,procEnvSQLHTTP:false});
const start=save('start.json',{began,actualReadOnlyAuditStarted:true,sourceOperationInvoked:false});
try{
 for(const p of[auditor,codeReview,codeSeal])assert.deepEqual(measure(p.file),p,'Sealed code qualification bytes');
 const module=await import(pathToFileURL(auditor.file).href);
 const facts=module.auditSource362(outerCommand);
 assert.equal(facts.kind,'runtime121-corrective362-readonly-source-readback-facts');
 const factsPin=save('facts-source362.json',facts);
 const finish=save('finish.json',{began,endedAt:new Date().toISOString(),exitCode:0,completeFunctionReturned:true,facts:factsPin,SourceOrNativeOrAppInvoked:false,RootOrPrivateWritten:false});
 const receipt=save('actual-audit-receipt.json',{kind:'actual-runtime121-source362-readonly-audit-completed',invocation,start,finish,facts:factsPin,auditor,codeReview,codeSeal,outerCommand,actualFSReadback:true,SourceReplay:false,NativeStateOrG2Granted:false,businessG3:false,businessG4:false});
 console.log(JSON.stringify({facts:factsPin,receipt,exitCode:0}));
}catch(error){
 const frames=String(error.stack??'').split('\n').filter(line=>/^\s+at /.test(line));
 const stopped=save('stopped.json',{kind:'actual-source362-readonly-audit-stopped-preserve',name:error.name,code:error.code??null,path:typeof error.path==='string'?error.path:null,frames,completeFunctionReturned:false,RootAndPrivateUnmodified:true,automaticRetry:false,repairOrSourceReplay:false});
 save('finish.json',{began,endedAt:new Date().toISOString(),exitCode:1,completeFunctionReturned:false,stopped});
 console.error(JSON.stringify({kind:'actual-source362-readonly-audit-stopped',name:error.name,code:error.code??null,frames,stopped}));process.exitCode=1;
}
