// Explicit Root-only new-M private derivation. Import and pure checks read no
// private material; no environment variables or secret bytes are returned.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{deriveRawWindowsNativeEnvironment}=require('./windows-managed-environment.cjs');
const ROOT='/home/wangzishi/.local/share/poms-r2m/private',SOURCE=ROOT+'/nest.env',TARGET=ROOT+'/windows-nest.env';
const sha=value=>createHash('sha256').update(value).digest('hex');

export function deriveWindowsNativeEnvironment(){
    assert.equal(process.platform,'linux');assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2m');assert.equal(typeof fs.constants.O_NOFOLLOW,'number');
    let current='';for(const part of ROOT.split('/').filter(Boolean)){current+='/'+part;const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink())}assert.equal(fs.lstatSync(ROOT).mode&0o077,0);
    function read(file){assert([SOURCE,TARGET].includes(file));const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&(stat.mode&0o777)===0o600);const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const before=fs.fstatSync(fd);for(const field of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(stat[field],before[field]);const raw=fs.readFileSync(fd,'utf8');for(const after of[fs.fstatSync(fd),fs.lstatSync(file)])for(const field of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(after[field],before[field]);return raw}finally{fs.closeSync(fd)}}
    const raw=read(SOURCE),derived=deriveRawWindowsNativeEnvironment(raw);let created=false;
    if(fs.existsSync(TARGET))assert.equal(read(TARGET),derived,'Existing Windows environment cannot be replaced');
    else{const fd=fs.openSync(TARGET,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,derived);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}created=true}
    assert.equal(read(SOURCE),raw);assert.equal(read(TARGET),derived);
    return{kind:'R2M-fixed-Windows-Native-environment-derivation',sourceFile:SOURCE,sourceRawBytesSha256:sha(raw),derivedFile:TARGET,derivedRawBytesSha256:sha(derived),onlyLocalObjectRootChanged:true,sourceUnchanged:true,namespace:'poms-r2m',database:'poms_r2m_nest',port:10070,created,contentsExported:false};
}
