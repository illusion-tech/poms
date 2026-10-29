// Fixed-image, read-only probe profile. DNS aliases are confined to the
// disposable container; the host hosts file is never changed.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
export const root='/home/wangzishi/projects/poms-rust-r2ij';
export const node='/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node';
export const binary='/home/wangzishi/.local/share/poms-r2ij/target/release/examples/attachment_storage_probe';
export const image='ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273';
const envFile='/home/wangzishi/.local/share/poms-r2ij/private/rust.env';
const modules='/home/wangzishi/projects/poms-rust-r2d/node_modules';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function container(executable,args=[],input=''){
    assert.equal(process.platform,'linux');assert([node,binary].includes(executable));
    const cli=['--cgroup-manager=cgroupfs','run','--rm','--interactive','--network=host','--userns=keep-id','--security-opt=no-new-privileges','--cap-drop=all','--add-host=r2ij-obs.local:127.0.0.1','--add-host=ijvirtual.r2ij-obs.local:127.0.0.1','--workdir',root,'--env','POMS_ENV_FILE='+envFile];
    for(const path of [root,node,binary,modules,envFile])cli.push('--volume',path+':'+path+':ro');
    cli.push('--entrypoint',executable,image,...args);
    return new Promise((resolve,reject)=>{const child=spawn('podman',cli,{stdio:['pipe','pipe','pipe']});let out='',error='';const timeout=setTimeout(()=>child.kill('SIGTERM'),20000);child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>error+=b);child.on('error',reject);child.on('close',(code,signal)=>{clearTimeout(timeout);if(code!==0)return reject(new Error('Fixed image probe failed code='+code+' signal='+signal+' stderrSha256='+hash(Buffer.from(error))));try{resolve(JSON.parse(out.trim()));}catch{reject(new Error('Fixed image output is not one JSON value'));}});child.stdin.end(input);});
}
export async function preflight(){
    const result=await container(node,['--input-type=module','-e',"import{lookup}from'node:dns/promises';console.log(JSON.stringify({node:process.version,undici:process.versions.undici,dns:await Promise.all(['r2ij-obs.local','ijvirtual.r2ij-obs.local'].map(async host=>({host,...await lookup(host,{family:4})})))}))"]);
    assert.equal(result.node,'v24.19.0');assert.equal(result.undici,'7.29.0');assert(result.dns.every(v=>v.address==='127.0.0.1'));
    return {image,...result,hostHostsFileUnchangedByDesign:true,mounts:'fixed IJ source, actual Node24.19 binary, release probe, existing locked modules, only new IJ rust.env; all read-only'};
}
