import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {OwnedFixture} from './owned-fixture.mjs';
import {setOwnedPermissions} from './fixture-permissions.mjs';
const require=createRequire(import.meta.url),{fixtureCredentials}=require('./fixture-protocol.cjs');
const chunks=[];for await(const chunk of process.stdin){chunks.push(chunk);assert(chunks.reduce((sum,item)=>sum+item.length,0)<3*1024*1024);}
const request=JSON.parse(Buffer.concat(chunks));assert(['nest','rust'].includes(request.backend)&&/^[0-9a-f-]{36}$/.test(request.runId));
assert(['prepare','plan-provider','plan-upload','adopt','facts','permissions','cleanup'].includes(request.action));
let fixture;try{
    fixture=await OwnedFixture.open(request.backend,request.runId);
    let result;
    if(request.action==='prepare')result={runId:fixture.runId,targets:await fixture.targets(),admin:fixtureCredentials(fixture.runId,'admin'),viewer:fixtureCredentials(fixture.runId,'viewer')};
    if(request.action==='plan-provider'){await fixture.assertOwnedDefault();result={intentId:await fixture.planCreation('provider',request.selectors)};}
    if(request.action==='plan-upload')result={intentId:await fixture.planSessionPayload(request.selectors,Buffer.from(request.payloadBase64,'base64'))};
    if(request.action==='adopt')result=await fixture.adoptRuntime();
    if(request.action==='facts'){await fixture.adoptRuntime();result=await fixture.facts();}
    if(request.action==='permissions')result=await setOwnedPermissions(fixture,request.keys,request.account??'admin');
    if(request.action==='cleanup'){result={first:await fixture.cleanup(),second:await fixture.cleanup()};assert(result.first.zero&&result.second.zero&&result.second.changed===0&&result.second.matched===0);}
    process.stdout.write(JSON.stringify({success:true,result})+'\n');
}catch(error){process.stderr.write(JSON.stringify({success:false,error:{name:error.name,code:error.code??null,message:error.message}})+'\n');process.exitCode=1;}
finally{if(fixture)await fixture.close();}
