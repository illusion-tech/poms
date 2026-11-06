// Read-only exports: no configuration loading, listener or database connection.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const out=win+'/tmp/rust-r4ghi/root/contract01';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const binaries={previous:'/home/wangzishi/.cache/poms-r4def-target-ROOT/debug/poms-api-rust',current:'/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/poms-api-rust'};
const exports={};
for(const [key,binary] of Object.entries(binaries)){
 const result=spawnSync(binary,['--openapi'],{encoding:null,timeout:30000,maxBuffer:20000000,env:{PATH:'/usr/bin:/bin'}});
 assert.equal(result.status,0);fs.writeFileSync(out+'/'+key+'-stdout.bin',result.stdout,{flag:'wx'});fs.writeFileSync(out+'/'+key+'-stderr.bin',result.stderr,{flag:'wx'});
 const value=JSON.parse(result.stdout);exports[key]={binary,binarySHA256:sha(fs.readFileSync(binary)),rawBytesSha256:sha(result.stdout),paths:Object.keys(value.paths).length,operations:Object.values(value.paths).reduce((n,p)=>n+Object.values(p).filter(v=>v?.operationId).length,0),schemas:Object.keys(value.components.schemas).length};
}
assert.equal(exports.previous.rawBytesSha256,exports.current.rawBytesSha256,'Existing runtime contract changed');
const source=JSON.parse(fs.readFileSync(win+'/libs/shared/api-spec/openapi.json'));
const receipt={kind:'actual-user-fix-openapi-export-comparison',capturedAt:new Date().toISOString(),exports,byteIdenticalRuntimeExports:true,fullSharedSpec:{paths:Object.keys(source.paths).length,operations:Object.values(source.paths).reduce((n,p)=>n+Object.values(p).filter(v=>v?.operationId).length,0),schemas:Object.keys(source.components.schemas).length},oldBinaryUsedOnlyAsLocalContractReference:true,databaseOrServiceStarted:false};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
