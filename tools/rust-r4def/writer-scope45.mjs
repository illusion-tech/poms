import fs from'node:fs';import assert from'node:assert/strict';import{createApiHarness}from'./api-harness32.mjs';
const h=createApiHarness(),file=h.priv+'/actors33.json',plan=JSON.parse(fs.readFileSync(file));await h.login(plan.actors.full);
const before=plan.actors.writer.permissions,after=[...new Set([...before,'contract:finance:sensitive:read'])];assert(!after.includes('contract:finance:manage'));
const r=await h.request('PlatformController_assignRolePermissions',plan.roles.writer.id,{permissionKeys:after},'full');assert.equal(r.status,200,r.receiptId);
plan.actors.writer.permissions=after;fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n',{mode:0o600});const actual=await h.login(plan.actors.writer);assert.deepEqual(new Set(actual.permissions),new Set(after));
fs.writeFileSync(h.out+'/writer-scope45.json',JSON.stringify({kind:'owned-UI-actor-role-fixture-delta',before,after,hasProjectWrite:true,hasFinanceManage:false,hasContractSensitiveRead:true,receiptId:r.receiptId},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({writerProjectWrite:true,writerFinanceManage:false,explicitContractSensitiveRead:true}));
