// Root preserves generated executor revisions beside their immutable derivations.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pin} from './source-guard.mjs';
const root='/home/wangzishi/projects/poms-rust-r3hijk',win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';assert.equal(process.cwd(),root);
const directory='tools/rust-r3hijk',records=[];
for(const name of fs.readdirSync(directory).sort()){
 const file=directory+'/'+name;assert(fs.statSync(file).isFile());const data=fs.readFileSync(file),target=win+'/'+file;
 if(fs.existsSync(target))assert(data.equals(fs.readFileSync(target)),'Different existing executor '+file);else fs.writeFileSync(target,data,{flag:'wx'});
 records.push(pin(file));
}
fs.writeFileSync('tmp/rust-r3hijk/root/derived-tools-sync01.json',JSON.stringify({kind:'R3HIJK-executor-original-byte-union',createdAt:new Date().toISOString(),records,existingFilesUnchanged:true,privateRead:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({files:records.length,existingFilesEqual:true}));
