// Fixed c01 private retention for the outer owned-command error only.
import fs from 'node:fs';
import {posix as path} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const ROOT='/home/wangzishi/projects/poms-rust-r2m',PRIVATE='/home/wangzishi/.local/share/poms-r2m-continuation01/private';
const fields=['dev','ino','nlink','mode','size','mtimeMs','ctimeMs'];
const regular=stat=>assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&(stat.mode&0o777)===0o600);

export function retainWindowsUiOwnerFailure({backend,tag,runId,error}){
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),ROOT);
    assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,24}$/.test(tag??''));
    assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(runId??''));
    assert.equal(typeof fs.constants.O_NOFOLLOW,'number');
    const file=PRIVATE+'/ui-windows-owner-'+backend+'-'+tag+'-'+runId+'-failure.json',parents=[];
    let current='';for(const part of path.dirname(file).split('/').filter(Boolean)){
        current+='/'+part;const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink());
        if(current===PRIVATE||current.startsWith(PRIVATE+'/'))assert.equal(stat.mode&0o777,0o700);
        parents.push({file:current,dev:stat.dev,ino:stat.ino,mode:stat.mode});
    }
    assert.equal(fs.realpathSync(PRIVATE),PRIVATE);
    const value=error!==null&&(typeof error==='object'||typeof error==='function')?error:null;
    const raw=Buffer.from(JSON.stringify({kind:'actual-Windows-UI-outer-owner-original-failure',backend,tag,runId,
        error:{name:typeof value?.name==='string'?value.name:typeof error,message:typeof value?.message==='string'?value.message:String(error),
            stack:typeof value?.stack==='string'?value.stack:null,code:['string','number','boolean'].includes(typeof value?.code)?value.code:null,
            ownPropertyNames:value?Object.getOwnPropertyNames(value):[]}})+'\n');
    const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
    try{
        const opened=fs.fstatSync(fd);regular(opened);assert.equal(opened.size,0);
        fs.writeFileSync(fd,raw);fs.fsyncSync(fd);
        const after=fs.fstatSync(fd),leaf=fs.lstatSync(file);regular(after);regular(leaf);
        for(const key of['dev','ino','nlink','mode'])assert.equal(opened[key],after[key]);
        for(const key of fields)assert.equal(after[key],leaf[key]);assert.equal(after.size,raw.length);
        for(const before of parents){const afterParent=fs.lstatSync(before.file);assert(afterParent.isDirectory()&&!afterParent.isSymbolicLink());for(const key of['dev','ino','mode'])assert.equal(before[key],afterParent[key]);}
    }finally{fs.closeSync(fd)}
    return{file,bytes:raw.length,rawBytesSha256:createHash('sha256').update(raw).digest('hex'),private:true};
}

export function windowsUiOwnerFailureReceipt(input){
    const receipt={kind:'R2M-Windows-UI-outer-owner-failure',category:'owned-command-failed',rawErrorIncluded:false};
    try{receipt.privateEvidence=retainWindowsUiOwnerFailure(input)}catch{receipt.retentionFailed=true}
    return receipt;
}
