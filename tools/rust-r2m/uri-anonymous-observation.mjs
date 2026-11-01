// First two inherited URI observations only. No fixture creation or mutation.
import fs from'node:fs';import assert from'node:assert/strict';import http from'node:http';import{randomUUID,createHash}from'node:crypto';
import{databaseClient}from'./database-client.mjs';import{allProductRowHashes}from'./data-snapshot.mjs';import{startOriginalNative}from'./native-app.mjs';import{startActualRust}from'./rust-app.mjs';
assert.equal(process.platform,'linux');assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2m');
const backend=process.argv[2],tag=process.argv[3];assert(['nest','rust'].includes(backend)&&/^[a-z0-9-]{1,24}$/.test(tag??''));
const file=`tmp/rust-r2m/uri-anonymous-${backend}-${tag}.json`;assert(!fs.existsSync(file));const client=await databaseClient(backend),runId=randomUUID(),contexts=new Map(),record={kind:'Root-R2M-actual-two-inherited-anonymous-URI-observations',result:'pending',backend,tag,runId,requests:[],plannedCellsNotClaimedPassed:27,fixtureCreates:0,startedAt:new Date().toISOString()};let server;
const request=path=>new Promise((resolve,reject)=>{const startedAt=new Date().toISOString(),req=http.request({host:'127.0.0.1',port:backend==='nest'?10070:10071,method:'GET',path,headers:{'x-correlation-id':'m0-'+runId+'-'+record.requests.length}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{const raw=Buffer.concat(chunks);let body;try{body=JSON.parse(raw.toString('utf8'));}catch{body={nonJson:true,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')};}resolve({method:'GET',path,status:res.statusCode,contentType:res.headers['content-type'],body,rawBodySha256:createHash('sha256').update(raw).digest('hex'),startedAt,finishedAt:new Date().toISOString()});});});req.setTimeout(15000,()=>req.destroy(new Error('Owned URI request timed out')));req.once('error',reject);req.end();});
try{
 record.before=await allProductRowHashes(client);
 if(backend==='nest')server=await startOriginalNative({tag,backend,admittedContexts:contexts,onCommitted:()=>{throw new Error('Anonymous decode observation cannot adopt creates');}});
 else server=await startActualRust({tag,expectedBinarySha256:'957fcc17763aaba3fa6d4093d9251d1935fcabe500e6bbfd9c80d90ae8f8e9cd'});
 for(const path of['/api/platform/users/%FF','/api/platform/users/%']){const context={runId,caseId:'m0.uri.anonymous',index:record.requests.length,op:'m.uri'};contexts.set('m0-'+runId+'-'+record.requests.length,context);record.requests.push(await request(path));}
 record.result='observed-not-parity-pass';
}catch(error){record.result='partial-preserved';record.failure={name:error.name,detailsInPrivateOwnerLog:true};process.exitCode=1;}
finally{
 if(server){try{await server.close();record.ownerClosed=true;record.runtime=typeof server.report==='function'?server.report():server.report;}catch{record.ownerClosed=false;record.result='partial-preserved';process.exitCode=1;}}
 try{record.after=await allProductRowHashes(client);record.all107RowsUnchanged=record.before?.sha256===record.after.sha256;if(!record.all107RowsUnchanged){record.result='partial-unexplained-data-change-preserved';process.exitCode=1;}}finally{await client.end();record.clientClosed=true;}
 record.finishedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,result:record.result,statuses:record.requests.map(x=>x.status),all107RowsUnchanged:record.all107RowsUnchanged,ownerClosed:record.ownerClosed}));
}
