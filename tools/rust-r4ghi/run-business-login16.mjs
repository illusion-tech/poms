import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createContext} from './business/context.mjs';
import {createApi} from './business/http.mjs';
const actor=process.argv[2];assert(['manager','execution','finance','person','condition','unrelated'].includes(actor));
const ctx=createContext({epoch:'g2-business08',run:'main01'}),lock=ctx.priv+'/driver.lock';
fs.writeFileSync(lock,JSON.stringify({pid:process.pid,mode:'actual-business-actor-login',actor})+'\n',{flag:'wx',mode:0o600});
try{const api=createApi(ctx);await api.login(actor);ctx.persist();console.log(JSON.stringify({actor,realAuthenticationRefreshed:true,credentialsPublished:false,productG3:false}));}
catch(error){const record=ctx.artifact(ctx.next('actor-login-failed')+'.json',{name:error.name,message:error.message,stack:error.stack});ctx.persist();console.error(JSON.stringify({status:'failed',privateOriginal:record}));process.exitCode=1;}
finally{assert.equal(JSON.parse(fs.readFileSync(lock)).pid,process.pid);fs.unlinkSync(lock);}
