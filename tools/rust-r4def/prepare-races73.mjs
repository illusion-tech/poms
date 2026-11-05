// Root real API producers and independent session IDs; no SQL business writes.
import fs from 'node:fs';import assert from 'node:assert/strict';
import { createApiHarness } from './api-harness32.mjs';import { connect } from './db33.mjs';
import { project } from '../rust-r4abc/upstream-payloads01.mjs';
const h=createApiHarness(), c=await connect(), actors=JSON.parse(fs.readFileSync(h.priv+'/actors33.json')).actors;
const file=h.out+'/races73-context.json';assert(!fs.existsSync(file));
try {
 await h.login(actors.full);
 const input=JSON.parse(fs.readFileSync(h.priv+'/continuation48.json'));
 const payload=project({...input.context,tag:'def-races73-third',actorId:actors.full.id});
 const made=await h.request('ProjectController_create',null,payload.body,'full');assert.equal(made.status,201,made.receiptId);const third=made.body?.data??made.body;assert(third.id);
 const sessions={};
 for(const key of ['raceA73','raceB73','pending73']) {
  const before=(await c.query('SELECT id FROM poms.auth_session WHERE user_id=$1',[actors.full.id])).rows.map(r=>r.id);
  await h.login({...actors.full,key});
  const after=(await c.query('SELECT id,row_version,last_seen_at,created_at FROM poms.auth_session WHERE user_id=$1',[actors.full.id])).rows.filter(r=>!before.includes(r.id));assert.equal(after.length,1);
  sessions[key]=after[0];
 }
 assert.notEqual(sessions.raceA73.id,sessions.raceB73.id);
 const result={kind:'actual-R4DEF-two-session-and-third-project-context',thirdProject:third,thirdProjectProducer:made.receiptId,userId:actors.full.id,sessions,onlyRealAPIProducers:true,sqlBusinessWrites:0,capturedAt:new Date().toISOString()};
 fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
}finally{await c.end();}
