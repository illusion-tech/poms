// The production writer executes against a Fake process/FS only.
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),PRIVATE='/home/wangzishi/.local/share/poms-r2m-continuation01/private',ROOT='/home/wangzishi/projects/poms-rust-r2m';
function writer(change={}){
    const source=fs.readFileSync('tools/rust-r2m-continuation01/windows-ui-owner-failure.mjs','utf8').replace("import fs from 'node:fs';","const fs=require('node:fs');").replace("import {posix as path} from 'node:path';","const {posix:path}=require('node:path');").replace("import assert from 'node:assert/strict';","const assert=require('node:assert/strict');").replace("import {createHash} from 'node:crypto';","const {createHash}=require('node:crypto');").replaceAll('export function ','function ');
    let data,opens=0,closes=0,writes=0,synced=false;
    const directory={dev:1,ino:2,mode:0o40700,isDirectory:()=>true,isSymbolicLink:()=>false},file={dev:1,ino:3,nlink:1,mode:0o100600,size:0,mtimeMs:1,ctimeMs:1,isFile:()=>true,isSymbolicLink:()=>false};
    const fakeFs={constants:{O_WRONLY:1,O_CREAT:2,O_EXCL:4,O_NOFOLLOW:8},
        lstatSync(name){if(name.endsWith('.json'))return{...file,size:data?.length??0,...(change.swappedLeaf?{ino:4}:{})};return name===PRIVATE&&change.badParent?{...directory,mode:0o40755}:directory},realpathSync:name=>name,
        openSync(name,flags,mode){assert.equal(name,PRIVATE+'/ui-windows-owner-nest-pure-10000000-0000-4000-8000-000000000001-failure.json');assert.equal(flags,15);assert.equal(mode,0o600);opens++;if(change.existing)throw Object.assign(new Error('pure existing'),{code:'EEXIST'});return 7},
        fstatSync(fd){assert.equal(fd,7);return{...file,size:data?.length??0,...(change.hardlink?{nlink:2}:{})}},writeFileSync(fd,bytes){assert.equal(fd,7);writes++;data=Buffer.from(bytes)},fsyncSync(fd){assert.equal(fd,7);synced=true},closeSync(fd){assert.equal(fd,7);closes++}};
    const module={exports:{}};vm.runInNewContext(source+'\nmodule.exports={retainWindowsUiOwnerFailure,windowsUiOwnerFailureReceipt};',{require:name=>name==='node:fs'?fakeFs:require(name),module,Buffer,process:{platform:'linux',cwd:()=>ROOT}});
    return{...module.exports,state:()=>({data,opens,closes,writes,synced})};
}
const input=()=>({backend:'nest',tag:'pure',runId:'10000000-0000-4000-8000-000000000001',error:Object.assign(new Error('pure-original-private-message'),{code:'PURE_CODE',environment:{JWT_SECRET:'must-not-be-serialized'}})});
test('the actual outer owner writer retains only explicit original error fields behind a private reference',()=>{
    const f=writer(),args=input(),receipt=f.windowsUiOwnerFailureReceipt(args),state=f.state(),stored=JSON.parse(state.data);
    assert.equal(stored.error.message,args.error.message);assert.equal(stored.error.stack,args.error.stack);assert.equal(stored.error.code,args.error.code);assert(stored.error.ownPropertyNames.includes('environment'));
    assert(!state.data.toString().includes('must-not-be-serialized'));assert(!JSON.stringify(receipt).includes(args.error.message));assert.equal(receipt.rawErrorIncluded,false);assert(receipt.privateEvidence.private);
    assert.equal(state.opens,1);assert.equal(state.writes,1);assert.equal(state.closes,1);assert(state.synced);
});
test('bad private mode refuses before open; a linked file refuses before write; a swapped leaf rejects after write; retention failure keeps a fixed public result',()=>{
    for(const[change,expected]of[[{badParent:true},{opens:0,writes:0,closes:0}],[{hardlink:true},{opens:1,writes:0,closes:1}],[{swappedLeaf:true},{opens:1,writes:1,closes:1}],[{existing:true},{opens:1,writes:0,closes:0}]]){
        const f=writer(change),args=input(),receipt=f.windowsUiOwnerFailureReceipt(args),state=f.state();assert.equal(receipt.retentionFailed,true);assert(!receipt.privateEvidence);assert(!JSON.stringify(receipt).includes(args.error.message));for(const[key,value]of Object.entries(expected))assert.equal(state[key],value);
    }
});
test('the production CLI catches the actual runOwnedCommand error before its generic last-resort catch',()=>{
    const runtime=fs.readFileSync('tools/rust-r2m-continuation01/windows-ui-runtime.mjs','utf8');
    const call=runtime.indexOf('receipt=await runtime.runOwnedCommand('),retain=runtime.indexOf('windowsUiOwnerFailureReceipt({backend:options.backend',call),last=runtime.indexOf("cli().catch(");
    assert(call>0&&retain>call&&last>retain);assert(runtime.slice(call,retain).includes('catch(error)'));
});
