import fs from 'node:fs';
import assert from 'node:assert/strict';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms';
let t=fs.readFileSync(R+'/tools/rust-r4ghi/recover-owned-pg285.mjs','utf8');
for(const [a,b] of [
 ["root/recovery285'","root/recovery28502'"],
 ["['podman','container','inspect',provision.container,'--format',format]","['/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node','/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/inspect-owned-pg285.mjs','container']"],
 ["['podman','volume','inspect',provision.volume,'--format',volumeFormat]","['/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node','/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/inspect-owned-pg285.mjs','volume']"]
]){assert(t.includes(a));t=t.split(a).join(b);}
fs.writeFileSync(R+'/tools/rust-r4ghi/recover-owned-pg28502.mjs',t,{flag:'wx'});
console.log(JSON.stringify({newEdition:true,firstFailurePreserved:true,containerStartSent:false}));
