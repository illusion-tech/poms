// In-memory projection keeps container credentials out of captured output.
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
assert.equal(process.platform,'linux');
const mode=process.argv[2];assert(['container','volume'].includes(mode));
const name=mode==='container'?'poms-r4ghi-pg15':'poms-r4ghi-pg15-data';
const r=spawnSync('podman',[mode,'inspect',name],{encoding:'utf8',maxBuffer:2000000,timeout:45000});
if(r.stderr)process.stderr.write(r.stderr);
assert.equal(r.status,0,'Scoped Podman inspect failed; no container details are printed');
const entries=JSON.parse(r.stdout);assert.equal(entries.length,1);const x=entries[0];
const out=mode==='container'?{id:x.Id??x.ID,name:x.Name,image:x.Image,state:x.State,mounts:x.Mounts,ports:x.NetworkSettings.Ports,entrypoint:x.Config.Entrypoint,cmd:x.Config.Cmd}:{name:x.Name,driver:x.Driver,mountpoint:x.Mountpoint,createdAt:x.CreatedAt};
console.log(JSON.stringify(out));
