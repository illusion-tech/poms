import fs from 'node:fs';import assert from 'node:assert/strict';import {randomBytes}from'node:crypto';import{createRequire}from'node:module';
import{connect,priv,root}from'./db33.mjs';import{createApiHarness}from'./api-harness32.mjs';
const h=createApiHarness(),c=await connect(),file=priv+'/actors33.json',plan=JSON.parse(fs.readFileSync(file));
assert.equal(Object.keys(plan.actors).length,8);assert.equal(plan.borrowed.length,1);assert.equal(plan.createdCredentials.length,8);assert(!plan.actors.approver);
try{
 const require=createRequire(root+'/package.json'),bcrypt=require('bcryptjs');
 const original=JSON.parse(plan.borrowed[0].originalRow),id=original.user_id;
 const {rows:assignments}=await c.query("SELECT role_id::text FROM poms.user_role_assignment WHERE user_id=$1 AND status='active' ORDER BY role_id",[id]);assert(assignments.length);
 const password=randomBytes(24).toString('hex');
 plan.actors.approver={key:'approver',id,username:'vp_owner',password,borrowedSeedUser:true};fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n',{mode:0o600});
 await c.query('UPDATE poms.local_credential SET password_hash=$1,updated_at=now() WHERE user_id=$2',[await bcrypt.hash(password,10),id]);
 const r=await h.request('PlatformController_assignUserRoles',id,{roleIds:[...new Set([...assignments.map(v=>v.role_id),plan.roles.full.id])],reason:'R4DEF isolated acceptance approver'},'bootstrap');assert.equal(r.status,200,r.receiptId);
 await h.login(plan.actors.approver);
 fs.writeFileSync(h.out+'/actors35.json',JSON.stringify({kind:'real-platform-API-and-owned-auth-fixtures',roles:Object.fromEntries(Object.entries(plan.roles).map(([k,v])=>[k,v.id])),actors:Object.fromEntries(Object.keys(plan.actors).map(k=>[k,h.actor(k)])),actualAuthenticatedActors:9,businessAccepted:false,credentialsPublished:false},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({authenticatedActors:9,complete:true,credentialsPublished:false}));
}finally{await c.end()}
