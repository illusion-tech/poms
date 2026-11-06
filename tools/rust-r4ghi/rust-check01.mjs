import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const root='/home/wangzishi/projects/poms-rust-r4ghi',win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const mode=process.argv[2],edition=process.argv[3];assert(['clippy','test','build','fmt'].includes(mode)&&/^\d{2}$/.test(edition));
const out=win+'/tmp/rust-r4ghi/root/rust-'+mode+edition;assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=[];
function scan(dir){for(const e of fs.readdirSync(root+'/'+dir,{withFileTypes:true})){const file=dir+'/'+e.name;if(e.isDirectory())scan(file);else if(e.isFile()){const b=fs.readFileSync(root+'/'+file);inputs.push({file,bytes:b.length,rawBytesSha256:sha(b)});}}}
scan('apps/poms-api-rust/src');scan('apps/poms-api-rust/tests');
for(const p of JSON.parse(fs.readFileSync(root+'/.poms-r4ghi-include-inputs.json','utf8')))if(!inputs.some(x=>x.file===p.file))inputs.push(p);
for(const file of ['apps/poms-api-rust/Cargo.toml','apps/poms-api-rust/Cargo.lock','libs/shared/api-spec/openapi.json']){const b=fs.readFileSync(root+'/'+file);inputs.push({file,bytes:b.length,rawBytesSha256:sha(b)});}
assert(inputs.every(p=>sha(fs.readFileSync(win+'/'+p.file))===p.rawBytesSha256),'Mirror differs from delivery source');
const env={};for(const key of ['HOME','USER','LOGNAME','LANG','LC_ALL','TMPDIR'])if(process.env[key])env[key]=process.env[key];
Object.assign(env,{PATH:'/home/wangzishi/.cargo/bin:/usr/bin:/bin',CARGO_HOME:'/home/wangzishi/.cache/poms-r4def-cargo-home',RUSTUP_HOME:'/home/wangzishi/.rustup',CARGO_TARGET_DIR:'/home/wangzishi/.cache/poms-r4ghi-target-ROOT',CARGO_BUILD_JOBS:'2'});
const args=['+1.99.1',mode,'--manifest-path','apps/poms-api-rust/Cargo.toml'];
if(mode==='fmt')args.push('--check');else args.push('--locked','--offline');
if(mode==='clippy')args.push('--lib','--no-deps','--','-D','warnings');
if(mode==='build')args.push('--bin','poms-api-rust');
const startedAt=new Date().toISOString(),stdout=fs.openSync(out+'/stdout.log','wx'),stderr=fs.openSync(out+'/stderr.log','wx');let result;
try{result=spawnSync('/home/wangzishi/.cargo/bin/cargo',args,{cwd:root,env,stdio:['ignore',stdout,stderr],timeout:900000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
const stable=inputs.every(p=>sha(fs.readFileSync(root+'/'+p.file))===p.rawBytesSha256&&sha(fs.readFileSync(win+'/'+p.file))===p.rawBytesSha256);
const receipt={kind:'actual-R4GHI-unified-Rust-'+mode,startedAt,completedAt:new Date().toISOString(),args,exitCode:result.status,errorCode:result.error?.code??null,sourceStable:stable,inputs,target:env.CARGO_TARGET_DIR,ambientDatabaseOptInInherited:false};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({mode,exitCode:result.status,sourceStable:stable,receipt:out+'/receipt.json'}));
if(result.status!==0){console.log(fs.readFileSync(out+'/stderr.log','utf8').slice(-4500));process.exitCode=1;}
if(!stable)process.exitCode=1;
