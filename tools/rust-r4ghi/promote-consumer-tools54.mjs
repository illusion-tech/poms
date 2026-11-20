import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms';
const proposal='E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/business-consumer-admission54';
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=fs.readFileSync(proposal+'/manifest54.json');
assert.equal(sha(manifestBytes),'90dca6b86e01dc7f4d17adc41268dadeecb4703ad6acb00d0305597e4fcaf6f7');
const manifest=JSON.parse(manifestBytes),out=root+'/docs/design/rust-r4ghi/consumer-admission54-tool-promotion.json';
assert(!fs.existsSync(out));assert.equal(manifest.files.length,8);
for(const p of manifest.files){
 assert(p.file.startsWith('tools/rust-r4ghi/business/')&&!p.file.includes('..'));
 const target=root+'/'+p.file,bytes=fs.readFileSync(proposal+'/'+p.candidate);
 assert.equal(sha(bytes),p.afterSHA256);
 if(p.beforeSHA256===null)assert(!fs.existsSync(target));else assert.equal(sha(fs.readFileSync(target)),p.beforeSHA256);
}
for(const p of manifest.files){fs.copyFileSync(proposal+'/'+p.candidate,root+'/'+p.file);assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.afterSHA256);}
const node='C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe';
const test=spawnSync(node,['--test','tools/rust-r4ghi/business/consumer-admission54.test.mjs'],{cwd:root,encoding:'utf8'});
const log=root+'/tmp/rust-r4ghi/root/consumer-admission54-tools';fs.mkdirSync(log,{recursive:true});
fs.writeFileSync(log+'/stdout.log',test.stdout,{flag:'wx'});fs.writeFileSync(log+'/stderr.log',test.stderr,{flag:'wx'});
assert.equal(test.status,0);
fs.writeFileSync(out,JSON.stringify({kind:'Root-reviewed-explicit-retained-consumer-tool-promotion54',manifestSHA256:sha(manifestBytes),files:manifest.files.map(p=>({file:p.file,beforeSHA256:p.beforeSHA256,afterSHA256:p.afterSHA256})),
 reason:'A new source/runtime may consume explicitly inventoried retained resources only after a full unchanged-database proof. Original producer facts and acceptance are preserved with their real source.',
 nativeBusinessWrites:0,businessHTTPRequests:0,consumerMintExecuted:false,actualNode:test.status===0?'v24.19.0':null,testsExitCode:test.status,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
let b=fs.readFileSync(root+'/tools/rust-r4ghi/build-summary-example10.mjs','utf8');
assert(b.includes("root/summary-build10"));assert(b.includes("root/rust-build06/receipt.json"));
b=b.replace('root/summary-build10','root/summary-build11').replace('root/rust-build06/receipt.json','root/rust-build08/receipt.json');
fs.writeFileSync(root+'/tools/rust-r4ghi/build-summary-example11.mjs',b,{flag:'wx'});
console.log(JSON.stringify({promoted:manifest.files.length,pureTestsExitCode:test.status,consumerMintExecuted:false,receipt:out}));
