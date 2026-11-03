import fs from'node:fs';import assert from'node:assert/strict';
let s=fs.readFileSync('tools/rust-r4abc/fault24.mjs','utf8').replaceAll('24','25');
const marker=" await db.query('CREATE SEQUENCE r4abc_control.hit25');";assert(s.includes(marker));
s=s.replace(marker," if(table==='auth_session'){const {rows}=await db.query('SELECT id::text FROM poms.auth_session WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[actor.actor.id]);assert.equal(rows.length,1);await db.query(\"UPDATE poms.auth_session SET last_seen_at=clock_timestamp()-interval '1 day' WHERE id=$1\",[rows[0].id]);}\n"+marker);
fs.writeFileSync('tools/rust-r4abc/fault25.mjs',s,{flag:'wx'});console.log(JSON.stringify({next:'fault25',sessionFixture:'force only the latest task-owned actor session to be due before the full before-snapshot; actual guard and PendingAuthentication persist unchanged'}));
