import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assert.equal(process.platform, 'linux');
const edition=process.argv[2];assert(/^\d{2}$/.test(edition));
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const out=win+'/tmp/rust-r4ghi/root/runtime-openapi'+edition;
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const binary='/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/poms-api-rust';
const stdout=fs.openSync(out+'/stdout.json','wx'),stderr=fs.openSync(out+'/stderr.log','wx');let result;
const startedAt=new Date().toISOString();
try{result=spawnSync(binary,['--openapi'],{cwd:'/home/wangzishi/projects/poms-rust-r4ghi',env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8'},stdio:['ignore',stdout,stderr],timeout:60000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
const pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}};
const receipt={kind:'actual-built-runtime-current-canonical-openapi',startedAt,completedAt:new Date().toISOString(),exitCode:result.status,binary:pin(binary),stdout:pin(out+'/stdout.json'),stderr:pin(out+'/stderr.log'),databaseConnect:false};
if(result.status===0){const doc=JSON.parse(fs.readFileSync(out+'/stdout.json'));receipt.counts={paths:Object.keys(doc.paths).length,operations:Object.values(doc.paths).flatMap(p=>Object.keys(p).filter(m=>['get','post','put','patch','delete','head','options','trace'].includes(m))).length,schemas:Object.keys(doc.components.schemas).length};}
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
if(result.status!==0){console.log(fs.readFileSync(out+'/stderr.log','utf8').slice(-3500));process.exitCode=1;}
