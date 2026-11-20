import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const relative='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/append06/mask-recovery11';
const author='E:/projects/worktrees/poms-r4h-signals/poms/'+relative;
const raw=fs.readFileSync(author+'/manifest-recovery11.json');
assert.equal(sha(raw),'d9c6ad7a5c80e32da92303de94e4d2a5addf6e919fcc7b1f1a47de581c751d41');
const manifest=JSON.parse(raw); assert.equal(manifest.files.length,6);
assert.equal(manifest.exactApprovalPlanSHA256,'665d3bc7ad666d6d2df9b222185a7f30af20962df65275cf1d554e5be0c8d86d');
assert(!fs.existsSync(relative));
for(const row of manifest.files){ assert.equal(path.basename(row.file),row.file); const bytes=fs.readFileSync(author+'/'+row.file); assert.equal(sha(bytes),row.rawBytesSha256); assert.equal(bytes.length,row.bytes); }
fs.mkdirSync(relative,{recursive:true});
for(const row of manifest.files)fs.writeFileSync(relative+'/'+row.file,fs.readFileSync(author+'/'+row.file),{flag:'wx'});
fs.writeFileSync(relative+'/manifest-recovery11.json',raw,{flag:'wx'});
console.log(JSON.stringify({copied:7,approvedPlanSHA256:manifest.exactApprovalPlanSHA256,exactMetadataOnly:true,HTTPContractStillFailed:true}));
