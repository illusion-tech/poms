'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');
const {parseBatchRequest}=require('./batch-protocol.cjs');
function invokeBatchFixture(request) {
    parseBatchRequest(Buffer.from(JSON.stringify(request)));
    const root=path.resolve(__dirname,'../..');
    const env={};
    const allow=new Set(['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','HOME','USERPROFILE','HOMEDRIVE','HOMEPATH','APPDATA','LOCALAPPDATA','LANG','LC_ALL']);
    for(const [k,v] of Object.entries(process.env))if(allow.has(k.toUpperCase())&&typeof v==='string')env[k]=v;
    const win=process.platform==='win32';
    if(!win&&process.platform!=='linux')throw new Error('Unsupported fixture platform');
    const exe=win?'wsl.exe':process.execPath;
    const args=win?['--distribution','Debian','--user','wangzishi','--cd','/home/wangzishi/projects/poms-rust-r2ef','--','bash','-lc','exec node tools/rust-r2ef/batch-cli.mjs']:[path.join(__dirname,'batch-cli.mjs')];
    return new Promise((resolve,reject)=>{
        const child=spawn(exe,args,{cwd:root,env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',codeOnly='',settled=false;
        function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);if(error){child.kill();reject(error);}else resolve(value);}
        const timer=setTimeout(()=>finish(new Error('R2EF batch deadline; preserve journals')),65000);
        child.on('error',()=>finish(new Error('R2EF batch could not start')));child.stdin.on('error',()=>finish(new Error('R2EF batch input failed')));
        child.stdout.setEncoding('utf8');child.stdout.on('data',c=>{out+=c;if(out.length>16*1024*1024)finish(new Error('R2EF batch output limit'));});
        child.stderr.on('data',c=>{for(const m of c.toString().matchAll(/"code":"([a-z_]+)"/g))codeOnly=m[1];});
        child.on('close',code=>{
            if(settled)return;
            if(code!==0)return finish(new Error('R2EF batch rejected guarded operation'+(codeOnly?': '+codeOnly:'')));
            try{const value=JSON.parse(out);if(value.formatVersion!==1||['runId','backend','action'].some(k=>value[k]!==request[k])||!Number.isSafeInteger(value.matched)||!Number.isSafeInteger(value.changed)||value.matched<0||value.changed<0||typeof value.state!=='string')throw new Error();finish(null,value);}catch{finish(new Error('R2EF batch invalid response'));}
        });child.stdin.end(JSON.stringify(request));
    });
}
module.exports={invokeBatchFixture};
