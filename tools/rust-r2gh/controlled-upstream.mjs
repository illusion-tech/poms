import assert from 'node:assert/strict';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const tag=process.argv[2];assert.equal(process.argv.length,3);assert(/^[a-z0-9-]{1,35}$/.test(tag));assert.equal(process.platform,'linux');
const dir=path.resolve('tmp/rust-r2gh/upstream',tag);assert(!existsSync(dir));mkdirSync(dir,{recursive:true,mode:0o700});
const planFile=path.join(dir,'plan.json'),stopFile=path.join(dir,'stop'),startFile=path.join(dir,'start.json'),outFile=path.join(dir,'closeout.json');
writeFileSync(planFile,JSON.stringify({formatVersion:1,caseId:'idle'})+'\n',{flag:'wx',mode:0o600});
const sha=value=>createHash('sha256').update(value).digest('hex');
const source=readFileSync(import.meta.filename),report={formatVersion:1,kind:'controlled-synthetic-upstream',tag,node:process.version,pid:process.pid,boundary:'Actual Nest/Rust adapters make HTTP requests to this loopback protocol fixture; no live Feishu account or external directory accessed',sourceSha256:sha(source),startedAt:new Date().toISOString(),requests:[],result:'pending'};
const readPlan=()=>{const stat=lstatSync(planFile);assert(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0&&stat.size<256*1024);const plan=JSON.parse(readFileSync(planFile));assert.equal(plan.formatVersion,1);assert(/^[A-Za-z0-9:.-]{1,100}$/.test(plan.caseId));return plan;};
const respond=(response,status,data,headers={})=>{response.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});response.end(typeof data==='string'?data:JSON.stringify(data));};
let active=0;
const server=http.createServer(async(request,response)=>{
    active++;
    try {
        const plan=readPlan(),url=new URL(request.url,'http://127.0.0.1:5900');
        const chunks=[];let length=0;for await(const chunk of request){length+=chunk.length;assert(length<=1024*1024);chunks.push(chunk);}
        const bodyText=Buffer.concat(chunks).toString('utf8');let body={};try{body=JSON.parse(bodyText||'{}');}catch{/* invalid body fixture */}
        const entry={caseId:plan.caseId,method:request.method,path:url.pathname,query:[...url.searchParams].map(([key,value])=>[key,/code|token|state/i.test(key)?`[sha256:${sha(value)}]`:value]),bodyKeys:Object.keys(body).sort(),bodyLength:Buffer.byteLength(bodyText),authorizationPresent:Boolean(request.headers.authorization),authorizationSha256:request.headers.authorization?sha(request.headers.authorization):null,contentType:request.headers['content-type']??null,accept:request.headers.accept??null,at:new Date().toISOString()};report.requests.push(entry);
        if(plan.caseId==='idle'){respond(response,503,{code:990001,msg:'Controlled fixture has no active case'});return;}
        if(plan.mode==='timeout'){await new Promise(resolve=>setTimeout(resolve,1500));respond(response,200,{code:0,data:{}});return;}
        if(plan.mode==='error-http'){respond(response,plan.httpStatus??503,{code:99991672,msg:'synthetic controlled upstream denied',data:{sentinel:'gh-controlled-not-a-credential'}});return;}
        if(plan.mode==='error-code'){respond(response,200,{code:99991672,msg:'synthetic controlled upstream scope denied'});return;}
        if(plan.mode==='invalid-json'){respond(response,200,'{controlled invalid json');return;}
        if(url.pathname==='/redirect-loop'){response.writeHead(302,{Location:'/redirect-loop'});response.end();return;}
        if(url.pathname==='/oauth/authorize'){
            const callback=new URL(url.searchParams.get('redirect_uri'));assert(['127.0.0.1','localhost'].includes(callback.hostname));assert(['5700','5701'].includes(callback.port)||(callback.port==='5800'&&callback.pathname==='/auth/identity-providers:callback'));
            assert.equal(url.searchParams.get('client_id'),plan.appId);callback.searchParams.set('code',plan.code??'gh-synthetic-code');callback.searchParams.set('state',url.searchParams.get('state'));
            entry.authorizeStateVerifiedPresent=Boolean(url.searchParams.get('state'));entry.callbackOrigin=callback.origin;
            response.writeHead(302,{Location:callback.href});response.end();return;
        }
        const access=`gh-controlled-access-${sha(plan.appId??plan.caseId).slice(0,20)}`;
        if(url.pathname==='/tenant-token'){
            assert.equal(body.app_id,plan.appId);assert.equal(sha(body.app_secret??''),plan.secretSha256);entry.syntheticCredentialVerified=true;
            respond(response,200,plan.mode==='missing-token'?{code:0}:{code:0,tenant_access_token:access,expire:7200});return;
        }
        if(url.pathname==='/oauth/token'){
            assert.equal(body.client_id,plan.appId);assert.equal(sha(body.client_secret??''),plan.secretSha256);assert.equal(body.code,plan.code??'gh-synthetic-code');entry.syntheticCredentialVerified=true;entry.syntheticCodeVerified=true;
            respond(response,200,{code:0,data:{access_token:access,refresh_token:'gh-controlled-refresh',expires_in:7200,refresh_expires_in:86400,scope:'contact:user:search contact:contact.base:readonly contact:user.department:readonly contact:department.base:readonly contact:user.email:readonly contact:user.phone:readonly'}});return;
        }
        assert.equal(request.headers.authorization,`Bearer ${access}`);entry.syntheticAccessTokenVerified=true;
        if(url.pathname==='/oauth/user-info'){respond(response,200,{code:0,data:{open_id:plan.subject,name:'GH controlled user',union_id:'gh-union',email:'gh-user@example.test',mobile:'000-0000'}});return;}
        if(url.pathname==='/search/users'){respond(response,200,{code:0,data:{users:[{open_id:plan.subject,name:'GH controlled user'}]}});return;}
        if(url.pathname==='/contact/users/batch'){respond(response,200,{code:0,data:{items:[{open_id:plan.subject,name:'GH controlled enriched user',department_ids:['department-A'],email:'gh-user@example.test',mobile:'000-0000'}]}});return;}
        if(url.pathname==='/contact/departments/batch'){respond(response,200,{code:0,data:{items:[{open_department_id:'department-A',name:'GH controlled department'}]}});return;}
        const match=/^\/departments\/([^/]+)\/children$/.exec(url.pathname);
        if(match){
            const departmentId=decodeURIComponent(match[1]),items=(plan.tree??{})[departmentId]??[],size=Number(url.searchParams.get('page_size')),offset=Number(url.searchParams.get('page_token')??0);
            assert(Number.isSafeInteger(size)&&size>=0&&size<=50&&Number.isSafeInteger(offset)&&offset>=0);
            const page=plan.mode==='readiness-unfiltered'?[{},...(items.slice(0,2))]:items.slice(offset,offset+size);
            const more=size>0&&offset+size<items.length;
            respond(response,200,{code:0,data:{items:page,has_more:more,page_token:more?String(offset+size):''}});return;
        }
        respond(response,404,{code:990004,msg:'Controlled fixture route not found'});
    } catch(error){report.failureType=error.name;report.result='fail';respond(response,500,{code:990005,msg:'Controlled fixture assertion failed'});}
    finally {active--;}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5900,'127.0.0.1',resolve);});
writeFileSync(startFile,JSON.stringify({formatVersion:1,tag,pid:process.pid,origin:'http://127.0.0.1:5900',planFile,sourceSha256:sha(source),startedAt:report.startedAt})+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({state:'ready',tag,pid:process.pid,receipt:startFile}));
const deadline=Date.now()+3*60*60*1000;
try {while(!existsSync(stopFile)){assert(Date.now()<deadline);await new Promise(resolve=>setTimeout(resolve,500));}assert.equal(readFileSync(stopFile,'utf8').trim(),tag);if(report.result==='pending')report.result='pass';}
catch(error){report.result='fail';report.failureType=error.name;throw error;}
finally {await new Promise(resolve=>server.close(resolve));report.activeAtClose=active;report.sourceUnchanged=sha(readFileSync(import.meta.filename))===report.sourceSha256;report.stopped=true;report.finishedAt=new Date().toISOString();writeFileSync(outFile,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({tag,result:report.result,requests:report.requests.length,stopped:true}));}
