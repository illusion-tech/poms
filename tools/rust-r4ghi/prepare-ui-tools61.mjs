import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
assert.equal(process.platform,'linux');
const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',dir='/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14',sha=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(dir,{recursive:true,mode:0o700});assert.equal(fs.realpathSync(dir),dir);
const prefix=root+'/tools/rust-r4ghi/H/implementation/support-patches/ui-integration',pin=file=>({file,rawBytesSha256:sha(fs.readFileSync(file))});
const original=pin(prefix+'/handoff16/exact-copy-plan16.json');assert.equal(original.rawBytesSha256,'62427f1c91bb30801d5308d583d7771fd5fef254bd4a8fd2e986bec1bd2315ec');
const input={schemaVersion:1,kind:'capture-actually-promoted-tool-closure54',originalCopyPlan:original,correctionManifest:pin(prefix+'/consumer54-binding/manifest-consumer54.json'),
 promotionReceipt:pin(root+'/docs/design/rust-r4ghi/h-consumer54-tool-promotion.json'),outputFile:dir+'/consumer11-promoted20-54-01.json'};
const file=dir+'/consumer11-tool-capture54-01.json';fs.writeFileSync(file,JSON.stringify(input,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({input:pin(file),output:input.outputFile}));
