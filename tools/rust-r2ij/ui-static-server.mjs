import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFileSync,lstatSync,existsSync} from 'node:fs';
const root=path.resolve('dist/tools/rust-r2ij-ui-host/browser');assert(lstatSync(root).isDirectory());
const backend=process.argv[2];assert(['nest','rust'].includes(backend)&&process.argv.length===3);
const upstream='http://127.0.0.1:'+(backend==='nest'?'6700':'6701');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((request,response)=>{
    if(request.url==='/api'||request.url.startsWith('/api/')){
        const target=new URL(request.url,upstream);assert.equal(target.origin,upstream);
        const proxy=http.request(target,{method:request.method,headers:{...request.headers,host:target.host},timeout:25000},result=>{
            response.writeHead(result.statusCode,result.headers);result.pipe(response);
            console.log(JSON.stringify({method:request.method,path:target.pathname,status:result.statusCode,upstream}));
        });
        proxy.on('timeout',()=>proxy.destroy());proxy.on('error',()=>{if(!response.headersSent){response.writeHead(502);response.end();}else response.destroy();});request.on('aborted',()=>proxy.destroy());response.on('close',()=>{if(!response.writableEnded)proxy.destroy();});request.pipe(proxy);return;
    }
    try{assert(['GET','HEAD'].includes(request.method));const url=new URL(request.url,'http://127.0.0.1:6800');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));assert(file===root||file.startsWith(root+path.sep));if(!existsSync(file)||lstatSync(file).isDirectory())file=path.join(root,'index.html');assert(lstatSync(file).isFile()&&!lstatSync(file).isSymbolicLink());const bytes=readFileSync(file);response.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store'});response.end(request.method==='HEAD'?undefined:bytes);}
    catch{response.writeHead(404);response.end();}
});
server.listen(6800,'127.0.0.1',()=>console.log('Original component fixture host ready at loopback6800'));
