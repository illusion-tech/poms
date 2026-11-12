// Root-only current running-state readback. No SQL, start, stop or private write.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
assert.equal(process.platform,'linux');assert.equal(process.cwd(),R);assert.equal(process.getuid(),1000);assert.deepEqual(process.execArgv,[]);assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(fs.readFileSync(process.execPath)),'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
const raw=fs.readFileSync(R+'/tools/rust-r4ghi/runtime-recovery121/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json');assert.equal(sha(raw),'3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6');
for(const p of JSON.parse(raw).originalABI.originalA7ExecutionSources){const b=fs.readFileSync(p.file);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256);}
const f=await import(pathToFileURL(R+'/tools/rust-r4ghi/runtime-recovery121/root/facts121.mjs').href),pgPin=f.pin(f.C.private+'/runtime121-A/pg-start/e86336a1-1931-4836-a666-c0f12539d945/complete.json');assert.equal(pgPin.bytes,3273);assert.equal(pgPin.rawBytesSha256,'433430a722d7ef09d3e836d0c80f3c2d76165e7801f0f59152d32b0ec3b9296d');
const pg=f.json(pgPin),holder=f.holderFacts({holder:pg.holder});assert.equal(holder.bootId,pg.bootId);
const {inspectOriginalPG121}=await import(pathToFileURL(R+'/tools/rust-r4ghi/runtime-recovery121/root/resume-original-pg121.mjs').href);
const began=new Date().toISOString(),originalContainer=inspectOriginalPG121();assert.deepEqual(originalContainer,pg.after);assert.equal(originalContainer.running,true);assert.equal(originalContainer.pid,72989);
const d=R+'/tmp/rust-r4ghi/root/round358-original-PG-running01';fs.mkdirSync(d);
const file=d+'/observation.json',b=Buffer.from(JSON.stringify({kind:'Root-current-running-original-PG358-readonly-inspect',began,observedAt:new Date().toISOString(),originalContainer,originalPGStart:pgPin,bootId:holder.bootId,PGControl:false,APIStarted:false,SQLHTTP:false,privateWritten:false},null,2)+'\n');
fs.writeFileSync(file,b,{flag:'wx',mode:0o600});console.log(JSON.stringify({file,bytes:b.length,rawBytesSha256:sha(b)}));
