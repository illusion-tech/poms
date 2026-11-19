// Root-only current read-only observation; no start, SQL, API or private write.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
assert.equal(process.platform,'linux');assert.equal(process.cwd(),R);
assert.equal(process.getuid(),1000);assert.deepEqual(process.execArgv,[]);
assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(fs.readFileSync(process.execPath)),'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
const policyFile=R+'/tools/rust-r4ghi/runtime-recovery121/g1A-transport358-policy01/Root-G1A-holder-transport-policy358.json';
const raw=fs.readFileSync(policyFile);assert.equal(sha(raw),'3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6');
for(const p of JSON.parse(raw).originalABI.originalA7ExecutionSources){const b=fs.readFileSync(p.file);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.rawBytesSha256);}
const {inspectOriginalPG121}=await import(pathToFileURL(R+'/tools/rust-r4ghi/runtime-recovery121/root/resume-original-pg121.mjs').href);
const began=new Date().toISOString(),originalContainer=inspectOriginalPG121();
assert.equal(originalContainer.status,'exited');assert.equal(originalContainer.running,false);assert.equal(originalContainer.pid,0);
const d=R+'/tmp/rust-r4ghi/root/round358-original-PG-current01';fs.mkdirSync(d);
const file=d+'/observation.json',b=Buffer.from(JSON.stringify({kind:'Root-current-original-PG358-readonly-inspect',began,observedAt:new Date().toISOString(),originalContainer,PGStarted:false,APIStarted:false,SQLHTTP:false,privateWritten:false},null,2)+'\n');
fs.writeFileSync(file,b,{flag:'wx',mode:0o600});console.log(JSON.stringify({file,bytes:b.length,rawBytesSha256:sha(b)}));
