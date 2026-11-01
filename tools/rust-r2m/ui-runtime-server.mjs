// Source-only derivative of acceptance-ui-server.mjs. Root explicitly starts it
// after the new UI capsule freeze. Raw HTTP material is retained only in new M private.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createDispatch} from './acceptance-dispatch.mjs';
import {nativeProducerRoutes} from './scenario-input.mjs';
import {originalBrowserCacheConditions} from './ui-runtime-cache.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const MAX_BYTES=32*1024*1024;

export function verifyUiBuild({buildDirectory,buildFiles}){
    const requested=path.resolve(buildDirectory);let requestedParent=path.parse(requested).root;
    for(const part of requested.slice(requestedParent.length).split(path.sep).filter(Boolean)){requestedParent=path.join(requestedParent,part);assert(!fs.lstatSync(requestedParent).isSymbolicLink())}
    const root=fs.realpathSync(requested);assert.equal(root,requested);
    assert(fs.statSync(root).isDirectory()&&/[/\\]dist[/\\]tools[/\\]rust-r2m-ui-[A-Za-z0-9-]+[/\\]browser$/.test(root));
    let parent=path.parse(root).root;for(const part of root.slice(parent.length).split(path.sep).filter(Boolean)){parent=path.join(parent,part);assert(!fs.lstatSync(parent).isSymbolicLink())}
    assert(Array.isArray(buildFiles)&&buildFiles.length>0);const pins=new Map();
    for(const item of buildFiles){assert(typeof item.file==='string'&&!path.isAbsolute(item.file)&&!item.file.includes('\\')&&item.file.split('/').every(part=>part&&part!=='.'&&part!=='..')&&/^[0-9a-f]{64}$/.test(item.rawBytesSha256));assert(!pins.has(item.file));pins.set(item.file,item)}
    assert(pins.has('index.html'));
    const actual=[];
    function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){assert(!entry.isSymbolicLink());const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file);else{assert(entry.isFile());actual.push(path.relative(root,file).split(path.sep).join('/'))}}}
    walk(root);assert.deepEqual(actual.sort(),[...pins.keys()].sort(),'Complete exact UI build membership required');
    for(const[file,pin]of pins){const bytes=fs.readFileSync(path.join(root,...file.split('/')));assert.equal(sha(bytes),pin.rawBytesSha256);if(pin.bytes!==undefined)assert.equal(bytes.length,pin.bytes)}
    return{root,pins,manifestSha256:sha(Buffer.from(JSON.stringify(buildFiles)))};
}

export async function startManagedUiServer({backend,input,sourceCapId,buildDirectory,buildFiles,nativeReadModels=[],onBeforeExchange,onAfterExchange,retain}){
    assert(['nest','rust'].includes(backend)&&typeof sourceCapId==='string');
    for(const callback of[onBeforeExchange,onAfterExchange,retain])assert.equal(typeof callback,'function');
    for(const row of nativeReadModels)assert(row.method==='GET');
    const build=verifyUiBuild({buildDirectory,buildFiles});
    const dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:[...nativeProducerRoutes,...nativeReadModels]});
    const exchanges=[],sockets=new Set(),forwarded=new Set(),pendingEvidence=new Set(),pendingHandlers=new Set(),ownedWork=new Set(),active=new Set(),failures=[];let closePromise,lastChange=Date.now();
    const track=(promise,group)=>{ownedWork.add(promise);group?.add(promise);lastChange=Date.now();const remove=()=>{ownedWork.delete(promise);group?.delete(promise);lastChange=Date.now()};void promise.then(remove,remove);return promise};
    const originalFailure=(stage,error,row)=>{
        const failure={stage,error,exchangeIndex:row?.index??null};failures.push(failure);
        const record={sourceCapId,stage,exchangeIndex:failure.exchangeIndex,error:{name:error?.name??typeof error,message:String(error?.message??error),stack:error?.stack??null,code:error?.code??null}};
        return track(Promise.resolve().then(()=>retain({kind:'actual-browser-proxy-private-original-failure',record})).then(evidence=>{failure.privateEvidence=evidence},retentionError=>{failure.privateRetentionFailed=true;failures.push({stage:'original-failure-private-retention',error:retentionError,exchangeIndex:failure.exchangeIndex,privateRetentionFailed:true})}));
    };
    const finish=(row,request,response)=>{
        if(row.afterStarted)return;row.afterStarted=true;lastChange=Date.now();
        const promise=Promise.resolve().then(async()=>{
            const evidence=await retain({kind:'actual-browser-proxy-raw-HTTP',record:{sourceCapId,exchange:row,request,response,rawBodyEncoding:'base64',decodedOrMocked:false}});
            row.privateEvidence=evidence;await onAfterExchange({...row,request,response});
        }).catch(async error=>{row.evidenceFailed=true;await originalFailure('raw-HTTP-retention-or-after-exchange',error,row)}).finally(()=>{active.delete(row.index);lastChange=Date.now()});track(promise,pendingEvidence);
    };
    const handleRequest=async(request,response)=>{
        const rawPath=request.url??'';
        if(rawPath==='/api'||rawPath.startsWith('/api/')){
            let row,requestRecord,responseRecord;
            try{
                const method=request.method,purpose=nativeProducerRoutes.some(item=>item.method===method&&method!=='GET')?'producer':'ui-read-model';
                row={index:exchanges.length,method,path:rawPath,executionBackend:null,routeTemplate:null,sourceCapId,status:null,window:{startedAt:new Date().toISOString()}};
                exchanges.push(row);active.add(row.index);lastChange=Date.now();
                const selected=dispatch.resolve({method,path:rawPath,backend,purpose});Object.assign(row,{executionBackend:selected.executionBackend,routeTemplate:selected.routeTemplate});
                const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;assert(size<=MAX_BYTES);chunks.push(chunk)}const body=Buffer.concat(chunks);
                requestRecord={method,path:rawPath,headers:request.headers,rawHeaders:request.rawHeaders,bodyBase64:body.toString('base64'),bodyBytes:body.length,bodySha256:sha(body)};
                row.originalBrowserCacheConditions=originalBrowserCacheConditions(requestRecord);
                const context=await onBeforeExchange({...row,request:requestRecord});
                for(const key of['requestId','correlationId','userAgent'])assert(typeof context?.[key]==='string'&&!/[\r\n]/.test(context[key]));
                row.fixtureContext={caseId:context.caseId,index:context.index,requestId:context.requestId,correlationId:context.correlationId};
                const port=selected.executionBackend==='rust'?10071:10070;
                const headers={...request.headers,host:'127.0.0.1:'+port,'x-request-id':context.requestId,'x-correlation-id':context.correlationId,'user-agent':context.userAgent,'x-forwarded-for':'192.0.2.25'};
                // Exact byte payload and raw request path. No retry or Native
                // fallback after a candidate status/transport failure.
                const upstream=http.request({hostname:'127.0.0.1',port,path:rawPath,method,headers,timeout:25000},actual=>{
                    row.status=actual.statusCode;response.writeHead(actual.statusCode,actual.headers);const raw=[];let bytes=0;
                    const end=complete=>{if(row.responseFinished)return;row.responseFinished=true;const received=Buffer.concat(raw);row.transportComplete=complete;row.window.finishedAt=new Date().toISOString();responseRecord={status:actual.statusCode,headers:actual.headers,rawHeaders:actual.rawHeaders,bodyBase64:received.toString('base64'),bodyBytes:received.length,bodySha256:sha(received)};finish(row,requestRecord,responseRecord)};
                    actual.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_BYTES){upstream.destroy();response.destroy();return}raw.push(chunk)});
                    actual.on('end',()=>end(true));actual.on('aborted',()=>{end(false);response.destroy()});actual.on('error',error=>{void originalFailure('upstream-response',error,row);end(false);response.destroy()});actual.pipe(response);
                });
                forwarded.add(upstream);track(new Promise(resolve=>upstream.on('close',()=>{forwarded.delete(upstream);lastChange=Date.now();resolve()})));upstream.on('timeout',()=>upstream.destroy());
                upstream.on('error',error=>{void originalFailure('upstream-request',error,row);row.transportComplete=false;row.window.finishedAt??=new Date().toISOString();finish(row,requestRecord,responseRecord??null);if(!response.headersSent){response.writeHead(502);response.end()}else response.destroy()});
                response.on('close',()=>{if(!response.writableEnded)upstream.destroy()});upstream.end(body);
            }catch(error){await originalFailure('request-body-or-before-exchange',error,row);if(row){row.admissionFailed=true;row.transportComplete=false;row.window.finishedAt??=new Date().toISOString();finish(row,requestRecord??null,responseRecord??null)}if(!response.headersSent){response.writeHead(502);response.end()}else response.destroy()}
            return;
        }
        try{
            assert(['GET','HEAD'].includes(request.method));const decoded=decodeURIComponent(rawPath.split('?',1)[0]);assert(!/[\0\\]/.test(decoded));
            let file=path.resolve(build.root,'.'+decoded);assert(file===build.root||file.startsWith(build.root+path.sep));if(!fs.existsSync(file)||fs.lstatSync(file).isDirectory())file=path.join(build.root,'index.html');
            let current=build.root;for(const part of path.relative(build.root,file).split(path.sep)){current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink())}
            const pin=build.pins.get(path.relative(build.root,file).split(path.sep).join('/'));assert(pin&&fs.statSync(file).isFile());const bytes=fs.readFileSync(file);assert.equal(sha(bytes),pin.rawBytesSha256);
            response.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store'});response.end(request.method==='HEAD'?undefined:bytes);
        }catch{response.writeHead(404);response.end()}
    };
    const server=http.createServer((request,response)=>track(handleRequest(request,response).catch(error=>originalFailure('request-handler',error)),pendingHandlers));
    server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket))});
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(10080,'127.0.0.1',resolve)});
    async function idle(){const end=Date.now()+30000;while((active.size||forwarded.size||ownedWork.size||Date.now()-lastChange<100)&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,20));assert.equal(active.size,0);assert.equal(forwarded.size,0);assert.equal(pendingEvidence.size,0);assert.equal(pendingHandlers.size,0);assert.equal(ownedWork.size,0);if(failures.length)throw failures[0].error;assert(!exchanges.some(row=>row.evidenceFailed||row.admissionFailed||row.transportComplete!==true),'Actual UI exchange did not complete with its evidence')}
    const report={kind:'R2M-fixed-UI-dispatch-with-private-raw-HTTP',backend,sourceCapId,origin:'http://127.0.0.1:10080',buildManifestSha256:build.manifestSha256,exchanges,fakeApiResponses:false,fallbackAfterResponse:false,closed:false};
    const counts=()=>({sockets:sockets.size,forwarded:forwarded.size,handlers:pendingHandlers.size,evidence:pendingEvidence.size,ownedWork:ownedWork.size,activeExchanges:active.size});
    async function closeOwnedWork(){
        let timer;report.closeStarted=true;
        const transportClosed=new Promise((resolve,reject)=>server.close(error=>{if(error)reject(error);else{report.transportClosed=true;resolve()}}));server.closeIdleConnections();
        const settle=async()=>{await transportClosed;while(ownedWork.size)await Promise.allSettled([...ownedWork]);assert.equal(sockets.size,0);assert.equal(forwarded.size,0);assert.equal(pendingHandlers.size,0);assert.equal(pendingEvidence.size,0);assert.equal(active.size,0);report.ownedWorkSettled=true;if(failures.length)throw failures[0].error;assert(!report.closeTimedOut,'A timed-out close cannot later become a closed receipt');report.closed=true;report.pendingEvidence=0};
        const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{report.closeTimedOut=true;report.unsettledAtTimeout=counts();if(forwarded.size||sockets.size){for(const item of forwarded)item.destroy();for(const socket of sockets)socket.destroy();report.forcedOwnedSocketClose=true}const error=new Error('Owned UI proxy work did not settle within the existing close bound');error.code='R2M_UI_SERVER_WORK_UNSETTLED';reject(error)},10000)});
        try{await Promise.race([settle(),deadline])}
        catch(error){report.closed=false;report.closeIncomplete=true;if(failures.length)throw failures[0].error;throw error}
        finally{clearTimeout(timer);report.closeCounts=counts();report.failureEvidence=failures.map(item=>({stage:item.stage,exchangeIndex:item.exchangeIndex,category:'original-owned-proxy-work-failed',...(item.privateEvidence?{privateEvidence:item.privateEvidence}:{}),...(item.privateRetentionFailed?{privateRetentionFailed:true}:{})}))}
    }
    return{origin:report.origin,report,idle,close(){return closePromise??=closeOwnedWork()}};
}
