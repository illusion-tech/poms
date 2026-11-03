// Resume only this marked environment after the host WSL instance restarted.
import fs from'node:fs';import assert from'node:assert/strict';import{spawnSync,execFileSync}from'node:child_process';import{pin,sha}from'./source-guard.mjs';
const root='/home/wangzishi/projects/poms-rust-r3m',state='/home/wangzishi/.local/share/poms-r3m';assert.equal(process.cwd(),root);
const id=JSON.parse(fs.readFileSync(state+'/identity.json'));assert.equal(id.namespace,'poms-r3m');const out='tmp/rust-r3m/root/runtime-recovery01';assert(!fs.existsSync(out));fs.mkdirSync(out);
const pod=(...args)=>{const r=spawnSync('podman',['--cgroup-manager=cgroupfs',...args],{encoding:'utf8',maxBuffer:16000000});assert.equal(r.status,0);return r.stdout};
const c=JSON.parse(pod('container','inspect',id.container))[0];assert.equal(c.Config.Labels['org.poms.scope'],'rust-r3m');assert.equal(c.Config.Labels['org.poms.base'],id.base);assert(c.Mounts.some(m=>m.Name===id.volume));
const boot=fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),previous=[];
for(const backend of ['rust','nest']){const file=state+'/private/'+backend+'-final01.json',r=JSON.parse(fs.readFileSync(file));assert.notEqual(r.bootId,boot,'A reboot recovery may only replace a previous boot, never an ambiguous live process');assert(!fs.existsSync('/proc/'+r.pid+'/cmdline'));previous.push({backend,journal:pin(file),pid:r.pid,bootId:r.bootId,originalRetained:true});}
if(!c.State.Running)pod('start',id.container);
for(let i=0;i<40;i++){const r=spawnSync('podman',['--cgroup-manager=cgroupfs','exec',id.container,'pg_isready','-h','/run/postgresql','-p','15432','-U','poms_r0e_owner'],{encoding:'utf8'});if(r.status===0)break;if(i===39)throw new Error('Owned PG did not recover');await new Promise(r=>setTimeout(r,500));}
const runs=[];for(const mode of ['start-rust','start-native'])runs.push(JSON.parse(execFileSync(process.execPath,['tools/rust-r3m/runtime.mjs',mode,'final02'],{encoding:'utf8'})));
const report={kind:'R3-owned-runtime-recovery-after-WSL-reboot',previous,currentBootId:boot,containerId:c.Id,sameContainerAndVolume:true,noDatabaseRecreated:true,runs,keepalivePID:process.pid,privateOriginalsRetained:true};fs.writeFileSync(out+'/report01.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({recovered:true,runs,keepalivePID:process.pid}));
const stop=state+'/private/keepalive-stop01';assert(!fs.existsSync(stop));
while(!fs.existsSync(stop))await new Promise(r=>setTimeout(r,1000));
assert.equal(fs.readFileSync(stop,'utf8'),id.marker+'\n');console.log(JSON.stringify({ownedKeepaliveEnded:true}));
