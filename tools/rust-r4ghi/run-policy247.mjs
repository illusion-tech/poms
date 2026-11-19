// Independent real H46 fixture; serialized Root execution, no Tax/period writes.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01',sha=v=>createHash('sha256').update(v).digest('hex');
assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert(!fs.existsSync(D+'/driver.lock'));assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
const file=D+'/policy-runtime246.json',approved='fdbb4760089dd3b9a8906dcfa9112f0cc03da3adb166cbbf20432b493e77ecba';assert.equal(sha(fs.readFileSync(file)),approved);
const out=P+'/policy247-actual';fs.mkdirSync(out,{mode:0o700});const o=fs.openSync(out+'/stdout.json','wx',0o600),e=fs.openSync(out+'/stderr.log','wx',0o600);let result;
const argv=[R+'/tools/rust-r4ghi/business/policy-boundary-run26.mjs','--bindings',file,'--approved-bindings-sha',approved,'--execute'];
try{result=spawnSync(process.execPath,argv,{cwd:R,env:process.env,stdio:['ignore',o,e],timeout:43200000});}finally{fs.closeSync(o);fs.closeSync(e);}
const pin=f=>({file:f,rawBytesSha256:sha(fs.readFileSync(f))}),command={argv,exitCode:result.status,signal:result.signal,stdout:pin(out+'/stdout.json'),stderr:pin(out+'/stderr.log'),noBlindCommandReplay:true};fs.writeFileSync(out+'/command247.json',JSON.stringify(command,null,2)+'\n',{flag:'wx',mode:0o600});
if(result.status===0)console.log(JSON.stringify({completed:true,result:JSON.parse(fs.readFileSync(out+'/stdout.json')),command:pin(out+'/command247.json')}));
else{console.error(JSON.stringify({completed:false,command:pin(out+'/command247.json'),stdout:command.stdout,stderr:command.stderr,noBlindRetry:true}));process.exitCode=1;}
