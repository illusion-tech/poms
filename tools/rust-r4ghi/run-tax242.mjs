// Root serialized actual continuation under final198/new119/B2, not old203.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',P='/home/wangzishi/.local/share/poms-r4ghi/private',D=P+'/business/g2-business13/main01',mode=process.argv[2],sha=v=>createHash('sha256').update(v).digest('hex');
assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert(['inspect','finish-main','prepare-tax','fi-tax','commit-tax'].includes(mode));assert.equal(process.argv.length,3);assert(!fs.existsSync(D+'/driver.lock'));assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
const binding=D+'/tax-runtime241-02.json',approved='d5262319cb962607fc1355b6433cdbba56724e46e3740f67d689c72af84235b6';assert.equal(sha(fs.readFileSync(binding)),approved);
assert.equal(sha(fs.readFileSync(R+'/tools/rust-r4ghi/run-tax-continuation13.mjs')),'f8051af205bc19ee5f4d9b97f51f6999f85d92ed0412a576023cc0d5535bc872');
const out=P+'/tax242-'+mode;fs.mkdirSync(out,{mode:0o700});const o=fs.openSync(out+'/stdout.json','wx',0o600),e=fs.openSync(out+'/stderr.log','wx',0o600);
const argv=[R+'/tools/rust-r4ghi/run-tax-continuation13.mjs',mode,'--phase','tax242-'+mode,'--bindings',binding,'--approved-bindings-sha',approved];let result;
try{result=spawnSync(process.execPath,argv,{cwd:R,env:process.env,stdio:['ignore',o,e],timeout:7200000});}finally{fs.closeSync(o);fs.closeSync(e);}
const pin=file=>({file,rawBytesSha256:sha(fs.readFileSync(file))}),record={mode,argv,exitCode:result.status,signal:result.signal,stdout:pin(out+'/stdout.json'),stderr:pin(out+'/stderr.log'),unknownCommitMustBeReconciledBeforeReplay:true};
fs.writeFileSync(out+'/command242.json',JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
if(result.status===0)console.log(JSON.stringify({completed:true,mode,result:JSON.parse(fs.readFileSync(out+'/stdout.json')),command:pin(out+'/command242.json')}));
else{console.error(JSON.stringify({completed:false,mode,command:pin(out+'/command242.json'),stdout:record.stdout,stderr:record.stderr,noBlindRetry:true,privateDetailsPublished:false}));process.exitCode=1;}
