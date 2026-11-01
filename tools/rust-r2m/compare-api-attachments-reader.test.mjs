// Execute the actual production prefix-read/descriptor functions with Fake FS.
// No real private file, descriptor, directory, DB, HTTP or process is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const file='tools/rust-r2m/compare-api-attachments-reader.mjs',tree=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),functions=new Map();
function visit(node){if(ts.isFunctionDeclaration(node)&&['parents','withRead','recordKind'].includes(node.name?.text))functions.set(node.name.text,node.getText(tree));ts.forEachChild(node,visit)}visit(tree);assert.equal(functions.size,3);
const ROOT='/public/source',PRIVATE='/new/c01/private',target=PRIVATE+'/run/00001.json',payload=Buffer.from('{"kind":"controlled-fixture-record","record":{"notActual":true}}');
function model(fault={}){
    let reads=0,opens=0,closes=0,stats=0;
    const stat=(extra={})=>({isFile:()=>true,isDirectory:()=>false,isSymbolicLink:()=>false,nlink:1,mode:0o100600,dev:1,ino:2,size:payload.length,mtimeMs:3,ctimeMs:4,...extra});
    const fake={constants:{O_RDONLY:0,O_NOFOLLOW:131072},lstatSync(file){if(file===target)return stat({...(fault.fileSymlink?{isSymbolicLink:()=>true}:{}),...(fault.hardlink?{nlink:2}:{}),...(fault.looseMode?{mode:0o100644}:{}),...(fault.leafReplaced&&reads?{ino:99}:{})});assert(file==='/'||target.startsWith(file+'/'));return{isDirectory:()=>true,isSymbolicLink:()=>!!fault.parentSymlink&&file===PRIVATE,mode:0o40700}},openSync(file,flags){assert.equal(file,target);assert(flags&131072);opens++;return 11},fstatSync(fd){assert.equal(fd,11);stats++;return stat({...(fault.fdMismatch?{ino:98}:{}),...(fault.fdHardlink?{nlink:2}:{}),...(fault.fdLooseMode?{mode:0o100644}:{}),...(fault.afterModified&&stats>1?{mtimeMs:100}:{})})},readSync(fd,buffer,offset,length,position){assert.equal(fd,11);assert.equal(length,160);assert.equal(position,0);reads++;payload.copy(buffer,offset);return payload.length},closeSync(fd){assert.equal(fd,11);closes++}};
    const code=['parents','withRead','recordKind'].map(name=>functions.get(name)).join('\n'),read=new Function('fs','path','assert','ROOT','PRIVATE','Buffer',code+';return recordKind;')(fake,path.posix,assert,ROOT,PRIVATE,Buffer);
    return{read,counts:()=>({reads,opens,closes})};
}
test('the actual production recordKind reads only160 bytes on one validated FD and closes it',()=>{const m=model();assert.equal(m.read(target),'controlled-fixture-record');assert.deepEqual(m.counts(),{reads:1,opens:1,closes:1})});
test('every symlink/hardlink/loose-mode/FD-identity or foreign-private target rejects before the first prefix byte',()=>{
    for(const fault of[{fileSymlink:true},{hardlink:true},{looseMode:true},{parentSymlink:true},{fdMismatch:true},{fdHardlink:true},{fdLooseMode:true}]){const m=model(fault);assert.throws(()=>m.read(target));assert.equal(m.counts().reads,0);assert.equal(m.counts().closes,m.counts().opens)}
    const m=model();assert.throws(()=>m.read('/old/r2m/private/00001.json'));assert.deepEqual(m.counts(),{reads:0,opens:0,closes:0});
});
test('post-prefix descriptor changes and leaf replacement fail rather than authorizing a changed kind',()=>{for(const fault of[{afterModified:true},{leafReplaced:true}]){const m=model(fault);assert.throws(()=>m.read(target));assert.deepEqual(m.counts(),{reads:1,opens:1,closes:1})}});
