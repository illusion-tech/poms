// Root real execution of independently prepared request/barrier/PG assertions.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{createApiHarness}from'./api-harness32.mjs';import{connect}from'./db33.mjs';
import{runRootRaces62}from'../../tmp/rust-r4def/independent/races62/root-runner62.mjs';
const h=createApiHarness(),sha=b=>createHash('sha256').update(b).digest('hex'),d='tmp/rust-r4def/independent/races62/';
for(const [f,s]of Object.entries({'candidate62-manifest03.json':'a7e987a502f4ec1c9244e83d0750c1e30a40f2a0b5c155381daad85c38291ac5','root-runner62.mjs':'770e2fbc3bd451516c2202bd44c7275ecea37ea286b0fc537b11308708745fee','root-adapter62.mjs':'4ed4473dbdbea357e8d76e74bb667adf6277afcbb24b66e16e3d0fd3b9802d5f'}))assert.equal(sha(fs.readFileSync(h.win+'/'+d+f)),s);
const base=JSON.parse(fs.readFileSync(h.out+'/F60-before.json')).context,extra=JSON.parse(fs.readFileSync(h.out+'/races73-context.json'));
const c=await connect(), actors=JSON.parse(fs.readFileSync(h.priv+'/actors33.json')).actors, sessions={};
try {for(const key of ['raceA85','raceB85']){const before=(await c.query('SELECT id FROM poms.auth_session WHERE user_id=$1',[actors.full.id])).rows.map(r=>r.id);await h.login({...actors.full,key});const after=(await c.query('SELECT id,row_version,last_seen_at FROM poms.auth_session WHERE user_id=$1',[actors.full.id])).rows.filter(r=>!before.includes(r.id));assert.equal(after.length,1);sessions[key]=after[0];}}finally{await c.end();}
fs.writeFileSync(h.out+'/races85-sessions.json',JSON.stringify({userId:actors.full.id,sessions,capturedAt:new Date().toISOString(),onlyActualAPILogin:true},null,2)+'\n',{flag:'wx'});
const context={...base,thirdProject:extra.thirdProject,tag:'r85',raceActors:{A:h.actor('raceA85'),B:h.actor('raceB85')},sessionProof:{receiptId:'tmp/rust-r4def/root/api32/races85-sessions.json',userId:actors.full.id,A:sessions.raceA85.id,B:sessions.raceB85.id}};
const r=await runRootRaces62({allowRootExecution:true,context,warmup:true,namespace:{database:'poms_r4def_rust',applicationRole:'poms_r4def_rust_app',isolatedOwned:true},harness:h});
console.log(JSON.stringify({out:r.out,allSelectedCasesPassed:r.allSelectedCasesPassed,cases:r.result.cases.map(c=>({id:c.id,status:c.status,reason:c.reason})),counts:r.result.counts}));if(!r.allSelectedCasesPassed)process.exitCode=1;
