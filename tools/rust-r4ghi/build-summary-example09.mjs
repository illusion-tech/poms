import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',root='/home/wangzishi/projects/poms-rust-r4ghi',out=win+'/tmp/rust-r4ghi/root/summary-build09';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),baseline=JSON.parse(fs.readFileSync(win+'/tmp/rust-r4ghi/root/rust-build05/receipt.json'));
assert.equal(baseline.exitCode,0);assert(baseline.sourceStable);
const file='apps/poms-api-rust/examples/r4ghi_summary_producer08.rs',inputs=[...baseline.inputs,{file,rawBytesSha256:sha(fs.readFileSync(win+'/'+file))}];
const stable=()=>inputs.every(p=>sha(fs.readFileSync(win+'/'+p.file))===p.rawBytesSha256&&sha(fs.readFileSync(root+'/'+p.file))===p.rawBytesSha256);assert(stable());
const env={HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',PATH:'/home/wangzishi/.cargo/bin:/usr/bin:/bin',CARGO_HOME:'/home/wangzishi/.cache/poms-r4def-cargo-home',RUSTUP_HOME:'/home/wangzishi/.rustup',CARGO_TARGET_DIR:'/home/wangzishi/.cache/poms-r4ghi-target-ROOT',CARGO_BUILD_JOBS:'2'};
const args=['+1.99.1','build','--manifest-path','apps/poms-api-rust/Cargo.toml','--locked','--offline','--example','r4ghi_summary_producer08'];
const stdout=fs.openSync(out+'/stdout.log','wx'),stderr=fs.openSync(out+'/stderr.log','wx');let r;
try{r=spawnSync('/home/wangzishi/.cargo/bin/cargo',args,{cwd:root,env,stdio:['ignore',stdout,stderr],timeout:300000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
const sourceStable=stable(),binary=env.CARGO_TARGET_DIR+'/debug/examples/r4ghi_summary_producer08';
fs.writeFileSync(out+'/receipt.json',JSON.stringify({kind:'actual-trusted-summary-example-build-at-current-candidate',exitCode:r.status,sourceStable,inputs,binary:r.status===0?{file:binary,sha256:sha(fs.readFileSync(binary))}:null,ambientDatabaseOptInInherited:false,businessExecuted:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({exitCode:r.status,sourceStable,businessExecuted:false,receipt:out+'/receipt.json'}));if(r.status!==0||!sourceStable)process.exitCode=1;
