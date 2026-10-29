import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const [backend,tag,ownerTag]=process.argv.slice(2);assert(['nest','rust'].includes(backend)&&[tag,ownerTag].every(value=>/^[a-z0-9-]{1,35}$/.test(value)));
const file=`tmp/rust-r2ij/route-${backend}-${tag}.json`;assert(!existsSync(file));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),ownerFile=`tmp/rust-r2ij/owner-${backend}-${ownerTag}-start.json`,owner=JSON.parse(readFileSync(ownerFile));process.kill(owner.pid,0);assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);
const i='/api/platform/attachment-storage-providers',j='/api/attachments',u='/api/attachment-upload-sessions';
const cases=[
    ['POST',i+'/%GG:unknown'],['PUT',i+'/%GG'],['DELETE',i+'/%GG'],['POST',i+'/%GG%3AtestConnection'],
    ['GET',i+'/%GG'],['GET',i+'/%GG:testConnection'],['GET',i+'/%GG:set-default'],['HEAD',i+'/%GG:testConnection'],
    ['POST',i+'/%GG:testConnection'],['POST',i+'/%GG:set-default'],['OPTIONS',i+'/%GG'],
    ['GET',i+'/not-a-uuid'],['POST',i+'/not-a-uuid:unknown'],['GET',i.toUpperCase()+'/not-a-uuid/'],
    ['POST',i.toUpperCase()+'/%GG:unknown/'],['POST',i.toUpperCase()+'/%GG:TESTCONNECTION/'],
    ['GET',j+'/%GG'],['POST',j+'/%GG:unknown'],['PUT',j+'/%GG'],['GET',j+'/%GG/download'],
    ['POST',j+'/%GG:mark-final'],['POST',j+'/%GG%3Amark-final'],['GET',j.toUpperCase()+'/not-a-uuid/DOWNLOAD/'],
    ['GET',u+'/%GG'],['POST',u+'/%GG:unknown'],['PUT',u+'/%GG/object'],['POST',u+'/%GG:complete'],['OPTIONS',u+'/%GG'],
    ['GET',j+'/one/two/three'],['DELETE',j+'/not-a-uuid/links/%GG'],['POST',j+'/%E0%A4:unknown'],['GET',j+'/%E0%A4'],
];
const report={formatVersion:1,backend,tag,ownerTag,binarySha256:owner.binarySha256,ownerReceiptSha256:hash(readFileSync(ownerFile)),at:new Date().toISOString(),result:'pending',scope:'Unauthenticated real method/path/decode order only; no fixture/DB writes; JSON objects compared structurally and other bodies exactly',cases:[]};
try{
    for(const [method,path] of cases){
        const value=await new Promise((resolve,reject)=>{
            const request=http.request(new URL(owner.origin),{method,path,headers:{Connection:'close'},timeout:10000},response=>{const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('error',reject);response.on('end',()=>{const bytes=Buffer.concat(chunks),text=bytes.toString('utf8');let body=text;try{body=JSON.parse(text);}catch{}resolve({method,path,status:response.statusCode,contentType:response.headers['content-type']??null,body,bytes:bytes.length});});});request.on('error',reject);request.on('timeout',()=>request.destroy(new Error('Route probe timeout')));request.end();
        });report.cases.push(value);
    }
    assert.equal(report.cases.length,32);report.result='pass';
}catch(error){report.result='fail';report.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{assert.equal(hash(readFileSync(owner.binary)),owner.binarySha256);process.kill(owner.pid,0);writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({backend,result:report.result,cases:report.cases.length,failure:report.failure}));}
