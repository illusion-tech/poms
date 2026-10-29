import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function uiFixture(request){
    assert(['win32','linux'].includes(process.platform));const win=process.platform==='win32';
    const root=fileURLToPath(new URL('../../',import.meta.url));
    const executable=win?'wsl.exe':process.execPath;
    const args=win?['--distribution','Debian','--user','wangzishi','--cd','/home/wangzishi/projects/poms-rust-r2ij','--','bash','-lc','exec node tools/rust-r2ij/ui-fixture-cli.mjs']:[path.resolve(root,'tools/rust-r2ij/ui-fixture-cli.mjs')];
    return new Promise((resolve,reject)=>{
        const child=spawn(executable,args,{cwd:root,env:process.env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';
        const timer=setTimeout(()=>{child.kill();reject(new Error('UI owned fixture deadline'));},60000);
        child.on('error',()=>{clearTimeout(timer);reject(new Error('UI owned fixture failed to start'));});child.stdout.on('data',chunk=>{out+=chunk;assert(out.length<16*1024*1024);});child.stderr.on('data',chunk=>{err+=chunk;assert(err.length<16384);});
        child.on('close',code=>{clearTimeout(timer);if(code!==0)return reject(new Error('UI guarded fixture rejected: '+err.slice(0,300)));try{const result=JSON.parse(out);assert(result.success);resolve(result.result);}catch{reject(new Error('UI fixture invalid response'));}});child.stdin.end(JSON.stringify(request));
    });
}
