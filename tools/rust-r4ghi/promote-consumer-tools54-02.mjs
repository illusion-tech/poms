import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',proposal='E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/business-consumer-admission54-02';
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=fs.readFileSync(proposal+'/manifest54-02b.json');
assert.equal(sha(raw),'cd9956fa54464b62b116c17f73acc8f1c93a70298c5e6232d41ba49d5e58b381');const m=JSON.parse(raw);assert.equal(m.files.length,2);
const out=root+'/docs/design/rust-r4ghi/consumer-admission54-02b-tool-promotion.json';assert(!fs.existsSync(out));
for(const p of m.files){assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.beforeSHA256);assert.equal(sha(fs.readFileSync(proposal+'/'+p.candidate)),p.afterSHA256);}
for(const p of m.files){fs.copyFileSync(proposal+'/'+p.candidate,root+'/'+p.file);assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.afterSHA256);}
const node='C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe',tests=fs.readdirSync(root+'/tools/rust-r4ghi/business').filter(f=>f.endsWith('.test.mjs')).map(f=>'tools/rust-r4ghi/business/'+f);
const r=spawnSync(node,['--test',...tests],{cwd:root,encoding:'utf8',timeout:60000}),log=root+'/tmp/rust-r4ghi/root/consumer-admission54-02b-tools';fs.mkdirSync(log,{recursive:true});
fs.writeFileSync(log+'/stdout.log',r.stdout??'',{flag:'wx'});fs.writeFileSync(log+'/stderr.log',r.stderr??'',{flag:'wx'});assert.equal(r.status,0);
fs.writeFileSync(out,JSON.stringify({kind:'Root-nonauthor-reviewed-exact-consumer54-02b-tool-repair',manifestRawSHA256:sha(raw),files:m.files,fixes:m.fixes,
 actualNode:'v24.19.0',pureTestsExitCode:r.status,testsLogRawSHA256:sha(Buffer.from(r.stdout)),consumerMintExecuted:false,businessSQLWrites:0,businessHTTPRequests:0,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:2,pureTestsExitCode:r.status,testSummary:r.stdout.split('\n').filter(l=>/^# (tests|pass|fail)/.test(l)),consumerMintExecuted:false,receipt:out}));
