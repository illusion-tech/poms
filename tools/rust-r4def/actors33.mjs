// Authentication fixtures only. Business rows are produced through actual API/service commands.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createApiHarness } from './api-harness32.mjs';
import { connect, priv, root } from './db33.mjs';
const require=createRequire(root+'/package.json'), bcrypt=require('bcryptjs');
const h=createApiHarness(), c=await connect();
const planFile=priv+'/actors33.json';
let plan={tag:'r4def33',roles:{},actors:{},borrowed:[],createdCredentials:[]};
if(fs.existsSync(planFile)) {
 assert.equal(process.argv[2],'--resume-inspected-no-users');
 plan=JSON.parse(fs.readFileSync(planFile)); assert.equal(plan.tag,'r4def33');assert.equal(Object.keys(plan.actors).length,0);assert.equal(Object.keys(plan.roles).length,1);assert(plan.roles.full);
 const {rows:[r]}=await c.query("SELECT count(*)::int n FROM poms.platform_user WHERE username LIKE 'r4def33_%'");assert.equal(r.n,0,'Failed create must have rolled back');
}
const save=()=>fs.writeFileSync(planFile,JSON.stringify(plan,null,2)+'\n',{mode:0o600});save();
async function call(op,id,body,status=200){const r=await h.request(op,id,body,'bootstrap');assert.equal(r.status,status,`${op}: ${r.receiptId}`);return r.body?.data??r.body;}
try {
 await h.login({key:'bootstrap',username:'admin',password:'admin123'});
 const all=h.spec.components.schemas.AssignRolePermissionsRequest.properties.permissionKeys.items.enum;
 const base=['project:read','contract:finance:manage','platform:users:manage'];
 const profiles={full:all,financeOnly:base,operatingOnly:[...base,'operating:finance:sensitive:read'],laborOnly:[...base,'labor-cost-rate:sensitive:read'],writer:['project:read','project:write','nav:projects:view','nav:contracts:view','nav:attachments:view'],denied:[],personA:['project:read','project:write'],personB:['project:read','project:write']};
 for(const [key,permissions]of Object.entries(profiles)){
  const role=plan.roles[key]??await call('PlatformController_createRole',null,{roleKey:'r4def33-'+key,name:'R4DEF33 '+key},201);assert(role.id);plan.roles[key]=role;save();
  await call('PlatformController_assignRolePermissions',role.id,{permissionKeys:permissions});
  const username='r4def33_'+key.toLowerCase();
  const user=await call('PlatformController_createUser',null,{username,displayName:'R4DEF33 '+key,primaryOrgUnitId:null},201);assert(user.id);
  await call('PlatformController_assignUserRoles',user.id,{roleIds:[role.id],reason:'R4DEF isolated acceptance permissions'});
  const password=randomBytes(24).toString('hex'),credentialId=randomUUID();
  plan.actors[key]={key,id:user.id,username,password,permissions};save();
  const {rows}=await c.query('SELECT id FROM poms.local_credential WHERE user_id=$1',[user.id]);assert.equal(rows.length,0);
  await c.query('INSERT INTO poms.local_credential(id,user_id,password_hash) VALUES($1,$2,$3)',[credentialId,user.id,await bcrypt.hash(password,10)]);
  plan.createdCredentials.push(credentialId);save();
  const actor=await h.login(plan.actors[key]);assert.deepEqual(new Set(actor.permissions),new Set(permissions));
 }
 const {rows:[user]}=await c.query("SELECT id::text,username FROM poms.platform_user WHERE username='vp_owner' AND is_active=true");assert(user);
 const {rows:[credential]}=await c.query('SELECT to_jsonb(t)::text value FROM poms.local_credential t WHERE user_id=$1',[user.id]);assert(credential);
 const password=randomBytes(24).toString('hex');plan.borrowed.push({table:'local_credential',originalRow:credential.value});save();
 await c.query('UPDATE poms.local_credential SET password_hash=$1,updated_at=now() WHERE user_id=$2',[await bcrypt.hash(password,10),user.id]);
 const detail=await call('PlatformController_getUser',user.id,null);
 const existingRoleIds=(detail.roleAssignments??detail.roles??[]).map(r=>r.roleId??r.id).filter(Boolean);assert(existingRoleIds.length,'Actual approver role IDs missing');
 await call('PlatformController_assignUserRoles',user.id,{roleIds:[...new Set([...existingRoleIds,plan.roles.full.id])],reason:'R4DEF isolated acceptance actor provision'});
 plan.actors.approver={key:'approver',id:user.id,username:user.username,password,borrowedSeedUser:true};save();
 await h.login(plan.actors.approver);
 const publicActors=Object.fromEntries(Object.keys(plan.actors).map(k=>[k,h.actor(k)]));
 fs.writeFileSync(h.out+'/actors33.json',JSON.stringify({kind:'real-platform-API-and-auth-fixture',roles:Object.fromEntries(Object.entries(plan.roles).map(([k,v])=>[k,v.id])),actors:publicActors,credentialProvisioning:'only fresh owned user credentials and preserved borrowed approver password; no business fact SQL',businessAccepted:false},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({roles:Object.keys(plan.roles).length,authenticatedActors:Object.keys(plan.actors).length,credentialsPublished:false}));
}catch(e){fs.writeFileSync(priv+'/actors33-error.log',e.stack??String(e),{mode:0o600});console.error(JSON.stringify({phase:'actors33',errorName:e.name,message:e.message,privateErrorPreserved:true}));process.exitCode=1;}finally{await c.end();}
