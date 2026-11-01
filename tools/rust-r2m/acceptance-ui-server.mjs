// Root calls startUiServer only after the current source/build/owner freeze.
// Importing it neither listens nor reads a private/environment file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createDispatch } from './acceptance-dispatch.mjs';
import { nativeProducerRoutes } from './scenario-input.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};

export async function startUiServer({backend,input,sourceCapId,buildDirectory,buildFiles,nativeReadModels=[],context,onBeforeExchange,onAfterExchange}) {
    assert(['nest','rust'].includes(backend)&&typeof sourceCapId==='string','Current backend/cap required');
    assert.equal(typeof onBeforeExchange,'function');assert.equal(typeof onAfterExchange,'function');
    const root=fs.realpathSync(buildDirectory);assert(fs.statSync(root).isDirectory()&&/[/\\]dist[/\\]tools[/\\]rust-r2m-ui-[A-Za-z0-9-]+[/\\]browser$/.test(root),'New R2M UI build directory required');
    assert(Array.isArray(buildFiles)&&buildFiles.length>0,'Frozen complete UI artifact file list required');
    const pins=new Map();for(const item of buildFiles){assert(!path.isAbsolute(item.file)&&!item.file.includes('..')&&/^[0-9a-f]{64}$/.test(item.rawBytesSha256),'Pinned relative build file required');assert(!pins.has(item.file));pins.set(item.file,item)}assert(pins.has('index.html'),'Pinned original index required');
    for(const row of nativeReadModels)assert(row.method==='GET','Extra UI Native allowlist is read-model GET only');
    const dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:[...nativeProducerRoutes,...nativeReadModels]});
    for(const key of ['requestId','correlationId','userAgent'])assert(typeof context?.[key]==='string'&&!/[\r\n]/.test(context[key]),'Bounded request context required');
    const exchanges=[],sockets=new Set(),forwarded=new Set(),pendingEvidence=new Set();let closed=false;
    const finishExchange=(row)=>{if(row.afterStarted)return;row.afterStarted=true;const pending=Promise.resolve().then(()=>onAfterExchange({...row})).catch(()=>{row.afterEvidenceFailed=true}).finally(()=>pendingEvidence.delete(pending));pendingEvidence.add(pending)};
    const server=http.createServer(async(request,response)=>{
        const rawPath=request.url??'';
        if(rawPath==='/api'||rawPath.startsWith('/api/')){
            let row;
            try{
                const method=request.method,pathname=rawPath.split('?',1)[0];
                const purpose=nativeProducerRoutes.some(item=>item.method===method&&method!=='GET')?'producer':'ui-read-model';
                const selected=dispatch.resolve({method,path:rawPath,backend,purpose});
                const index=exchanges.length;
                row={index,method,path:pathname,querySha256:sha(Buffer.from(rawPath.includes('?')?rawPath.slice(rawPath.indexOf('?')):'')),executionBackend:selected.executionBackend,routeTemplate:selected.routeTemplate,sourceCapId,status:null};exchanges.push(row);
                const active=await onBeforeExchange({...row});
                assert(typeof active?.correlationId==='string'&&!/[\r\n]/.test(active.correlationId),'Actual fixture exchange context required');
                const port=selected.executionBackend==='rust'?10071:10070;
                // The original raw path is passed as HTTP path; no URL parser
                // decoding and no retry to Native after candidate error/404.
                const upstream=http.request({hostname:'127.0.0.1',port,path:rawPath,method,headers:{...request.headers,host:'127.0.0.1:'+port,'x-request-id':active.requestId??context.requestId,'x-correlation-id':active.correlationId,'user-agent':context.userAgent,'x-forwarded-for':'192.0.2.25'},timeout:25000},actual=>{
                    row.status=actual.statusCode;response.writeHead(actual.statusCode,actual.headers);actual.pipe(response);
                    actual.on('end',()=>{row.transportComplete=true;finishExchange(row)});
                    actual.on('aborted',()=>{row.transportComplete=false;finishExchange(row);response.destroy()});
                });
                forwarded.add(upstream);upstream.on('close',()=>forwarded.delete(upstream));upstream.on('timeout',()=>upstream.destroy());
                upstream.on('error',()=>{row.transportComplete=false;finishExchange(row);if(!response.headersSent){response.writeHead(502);response.end()}else response.destroy()});
                request.on('aborted',()=>upstream.destroy());response.on('close',()=>{if(!response.writableEnded)upstream.destroy()});request.pipe(upstream);
            }catch{if(row){row.admissionFailed=true;row.transportComplete=false;finishExchange(row)}if(!response.headersSent){response.writeHead(502);response.end()}else response.destroy()}
            return;
        }
        try{
            assert(['GET','HEAD'].includes(request.method));
            const decoded=decodeURIComponent(rawPath.split('?',1)[0]);assert(!/[\0\\]/.test(decoded));
            let file=path.resolve(root,'.'+decoded);assert(file===root||file.startsWith(root+path.sep));
            if(!fs.existsSync(file)||fs.lstatSync(file).isDirectory())file=path.join(root,'index.html');
            let current=root;for(const part of path.relative(root,file).split(path.sep)){current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink())}
            const relative=path.relative(root,file).split(path.sep).join('/'),pin=pins.get(relative);assert(pin&&fs.statSync(file).isFile(),'Unpinned build asset refused');
            const bytes=fs.readFileSync(file);assert.equal(sha(bytes),pin.rawBytesSha256,'UI artifact bytes changed');if(pin.bytes!==undefined)assert.equal(bytes.length,pin.bytes);
            response.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store'});response.end(request.method==='HEAD'?undefined:bytes);
        }catch{response.writeHead(404);response.end()}
    });
    server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket))});
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(10080,'127.0.0.1',resolve)});
    const report={kind:'r2m-fixed-method-path-original-ui-server',backend,sourceCapId,origin:'http://127.0.0.1:10080',exchanges,fakeApiResponses:false,fallbackAfterResponse:false,closed:false};
    return {origin:report.origin,report,async close(){if(closed)return;closed=true;const pending=new Promise(resolve=>server.close(resolve));server.closeIdleConnections();const end=Date.now()+10000;while((sockets.size||forwarded.size||pendingEvidence.size)&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,25));if(sockets.size||forwarded.size){for(const item of forwarded)item.destroy();for(const socket of sockets)socket.destroy();report.ownedConnectionFallback=true}await pending;report.closedSockets=sockets.size;report.closedForwarded=forwarded.size;report.pendingEvidence=pendingEvidence.size;assert.equal(sockets.size,0);assert.equal(forwarded.size,0);assert.equal(pendingEvidence.size,0,'Root exchange evidence still active');assert(!exchanges.some(row=>row.afterEvidenceFailed),'Root exchange evidence failed');report.closed=true}};
}
