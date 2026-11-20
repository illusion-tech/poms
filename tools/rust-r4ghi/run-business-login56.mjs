import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
const actors=process.argv.slice(2);assert(actors.length>0&&actors.length<=7&&new Set(actors).size===actors.length);
assert(actors.every(a=>['manager','execution','finance','person','condition','unrelated','bootstrap'].includes(a)));
const ctx=createContext({epoch:'g2-business11',run:'main01','api-process-record':'/home/wangzishi/.local/share/poms-r4ghi/private/rust-api134-process.json'});
const lock=ctx.priv+'/driver.lock';fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'actual-consumer11-login56',actors})+'\n',{flag:'wx',mode:0o600});
try{const api=createApi(ctx);for(const actor of actors){await api.login(actor);ctx.persist();console.log(JSON.stringify({actor,epoch:ctx.epoch,realAuthenticationRefreshed:true,credentialsPublished:false,G3Certified:false}));}}
catch(error){const original=ctx.artifact(ctx.next('login56-partial')+'.json',{name:error.name,message:error.message,stack:error.stack});ctx.persist();console.error(JSON.stringify({status:'failed-or-partial',privateOriginal:original}));process.exitCode=1;}
finally{assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
