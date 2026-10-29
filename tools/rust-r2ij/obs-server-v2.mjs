// Fresh-IJ loopback-only, credential/signature-validating object protocol fixture.
// No product implementation is replaced or mocked. Root owns the API processes.
import assert from 'node:assert/strict';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {existsSync,lstatSync,mkdirSync,readFileSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import * as zlib from 'node:zlib';

const ROOT='/home/wangzishi/projects/poms-rust-r2ij',PRIVATE='/home/wangzishi/.local/share/poms-r2ij/private';
process.chdir(ROOT);assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert.equal(process.versions.undici,'7.29.0');
const tag=process.argv[2];assert(process.argv.length===3&&/^[a-z0-9-]{1,30}$/.test(tag??''));
const privateDir=join(PRIVATE,'obs',tag),publicDir=resolve(ROOT,'tmp/rust-r2ij');
function directory(path){if(!existsSync(path))mkdirSync(path,{mode:0o700});const st=lstatSync(path);assert(st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0&&st.uid===process.getuid());}
directory(join(PRIVATE,'obs'));assert(!existsSync(privateDir),'OBS tag must be fresh');directory(privateDir);directory(join(privateDir,'blobs'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),hmac=(key,value)=>createHmac('sha256',key).update(value).digest();
const token=randomBytes(32).toString('hex'),sourceHash=hash(readFileSync(new URL(import.meta.url)));
const state={formatVersion:1,scope:'rust-r2ij-obs',tag,pid:process.pid,node:process.version,undici:process.versions.undici,sourceHash,token,runs:[],objects:[],events:[],startedAt:new Date().toISOString()};
const save=()=>{const tmp=join(privateDir,'state.next');writeFileSync(tmp,JSON.stringify(state)+'\n',{mode:0o600});renameSync(tmp,join(privateDir,'state.json'));};save();
writeFileSync(join(privateDir,'control.json'),JSON.stringify({scope:state.scope,tag,pid:process.pid,token,origin:'http://127.0.0.1:6900'})+'\n',{flag:'wx',mode:0o600});
const servers=[],sockets=new Set();let closing=false;
const safeRun=run=>({runId:run.runId,backend:run.backend,bucket:run.bucket,region:run.region,basePath:run.basePath,objects:state.objects.filter(o=>o.runId===run.runId).map(({blob,...o})=>o),events:state.events.filter(e=>e.runId===run.runId)});
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function check(condition,code){if(!condition){const e=new Error(code);e.publicCode=code;throw e;}}
function objectFor(run,key){return state.objects.find(o=>o.runId===run.runId&&o.bucket===run.bucket&&o.key===key);}
function plan(run,key,expected){check(typeof key==='string'&&key.startsWith(`ij-${run.runId}/`)&&!key.includes('\0'),'unowned_key');let object=objectFor(run,key);if(!object){object={runId:run.runId,backend:run.backend,bucket:run.bucket,key,blob:hash(Buffer.from(run.bucket+'\0'+key)),writes:[],present:false,rule:{},counter:0};state.objects.push(object);}if(expected){check(/^[0-9a-f]{64}$/.test(expected.sha256)&&Number.isSafeInteger(expected.size)&&expected.size>=0&&expected.size<=16*1024*1024,'bad_expected_write');object.writes.push(expected);}return object;}
function encode(value){return encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());}
function queryCanonical(params){return [...params.entries()].filter(([k])=>k!=='X-Amz-Signature').sort(([ak,av],[bk,bv])=>ak.localeCompare(bk)||av.localeCompare(bv)).map(([k,v])=>encode(k)+'='+encode(v)).join('&');}
function verify(req,url,run,bytes){
    const auth=req.headers.authorization;let ak,scope,signed,signature,amzDate,payload,query,mode;
    if(auth){const match=/^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8}\/[^/]+\/s3\/aws4_request), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth);check(match,'malformed_authorization');[,ak,scope,signed,signature]=match;amzDate=req.headers['x-amz-date'];payload=req.headers['x-amz-content-sha256'];check(payload===hash(bytes),'payload_hash_mismatch');query=url.searchParams.toString();mode='header';}
    else{check(url.searchParams.get('X-Amz-Algorithm')==='AWS4-HMAC-SHA256','missing_authorization');const credential=url.searchParams.get('X-Amz-Credential')??'',at=credential.indexOf('/');check(at>0,'bad_credential');ak=credential.slice(0,at);scope=credential.slice(at+1);signed=url.searchParams.get('X-Amz-SignedHeaders');signature=url.searchParams.get('X-Amz-Signature');amzDate=url.searchParams.get('X-Amz-Date');payload='UNSIGNED-PAYLOAD';query=queryCanonical(url.searchParams);const seconds=Number(url.searchParams.get('X-Amz-Expires'));check(Number.isInteger(seconds)&&seconds>=1&&seconds<=3600,'invalid_expiry');const m=/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(amzDate??'');check(m,'invalid_amz_date');const atMs=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);check(Date.now()>=atMs-30000&&Date.now()<=atMs+seconds*1000+1000,'expired_signature');mode='query';}
    check(ak===run.ak&&scope===`${amzDate?.slice(0,8)}/${run.region}/s3/aws4_request`,'credential_scope_mismatch');
    check(typeof signed==='string'&&signed.split(';').includes('host')&&signed===signed.split(';').toSorted().join(';'),'bad_signed_headers');
    const names=signed.split(';');check(names.every(k=>['host','x-amz-date','x-amz-content-sha256','content-type','x-amz-meta-sha256'].includes(k)),'unexpected_signed_header');
    const canonicalHeaders=names.toSorted((a,b)=>a.localeCompare(b)).map(name=>{const value=req.headers[name];check(typeof value==='string','missing_signed_header');return `${name}:${value.trim()}\n`;}).join('');
    const canonical=[req.method,url.pathname||'/',query,canonicalHeaders,signed,payload].join('\n');const keyDate=hmac('AWS4'+run.sk,amzDate.slice(0,8)),keyRegion=hmac(keyDate,run.region),keyService=hmac(keyRegion,'s3'),keySigning=hmac(keyService,'aws4_request');const expected=createHmac('sha256',keySigning).update(['AWS4-HMAC-SHA256',amzDate,scope,hash(Buffer.from(canonical))].join('\n')).digest('hex');
    check(typeof signature==='string'&&equal(signature,expected),'signature_mismatch');return {mode,canonicalRequestSha256:hash(Buffer.from(canonical)),signedHeaders:signed,scope};
}
function route(req,url){
    const host=(req.headers.host??'').split(':')[0].toLowerCase();let bucket,key;
    if(host==='ijvirtual.r2ij-obs.local'){bucket='ijvirtual';const run=state.runs.find(r=>r.bucket===bucket&&url.pathname.startsWith(r.basePath+'/'));check(run,'unknown_bucket');key=decodeURIComponent(url.pathname.slice((run.basePath+'/').length));return {run,key};}
    check(['127.0.0.1','localhost','r2ij-obs.local'].includes(host),'unknown_host');
    for(const run of state.runs){const prefix=run.basePath+'/'+encodeURIComponent(run.bucket);if(url.pathname===prefix||url.pathname===prefix+'/'){bucket=run.bucket;key=null;return {run,key};}if(url.pathname.startsWith(prefix+'/')){bucket=run.bucket;key=decodeURIComponent(url.pathname.slice(prefix.length+1));return {run,key};}}
    throw Object.assign(new Error('unknown_bucket'),{publicCode:'unknown_bucket'});
}
function encoded(object,bytes){if(object.rule.gzipPrefixHex!==undefined)return Buffer.from(object.rule.gzipPrefixHex,'hex');let result=bytes;for(const coding of (object.rule.encoding??'').split(',').map(s=>s.trim()).filter(Boolean)){if(coding==='gzip'||coding==='x-gzip'){result=zlib.gzipSync(result);if(object.rule.truncateInnerGzip)result=result.subarray(0,result.length-8);}else if(coding==='deflate')result=object.rule.rawDeflate?zlib.deflateRawSync(result):zlib.deflateSync(result);else if(coding==='br')result=zlib.brotliCompressSync(result);else if(coding==='zstd')result=zlib.zstdCompressSync(result);else if(coding==='GZIP')result=zlib.gzipSync(result);else throw new Error('unknown_fixture_encoding');}if(object.rule.truncateWire)result=result.subarray(0,Math.max(0,result.length-object.rule.truncateWire));return result;}
async function collect(req,limit){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;check(size<=limit,'body_limit');chunks.push(chunk);}return Buffer.concat(chunks);}
function json(res,status,value){const bytes=Buffer.from(JSON.stringify(value));res.writeHead(status,{'content-type':'application/json','content-length':bytes.length});res.end(bytes);}
async function control(req,res){const input=JSON.parse((await collect(req,1024*1024)).toString('utf8'));check(equal(input.token??'',token),'invalid_control_token');let value;
    if(input.action==='register'){check(/^[0-9a-f-]{36}$/.test(input.runId)&&['nest','rust','protocol'].includes(input.backend),'invalid_run');check(typeof input.bucket==='string'&&input.bucket&&!state.runs.some(r=>r.bucket===input.bucket),'bucket_not_exclusive');check(typeof input.ak==='string'&&input.ak.length>8&&typeof input.sk==='string'&&input.sk.length>16,'synthetic_credentials_required');const basePath=input.basePath??'';check(typeof basePath==='string'&&(!basePath||basePath.startsWith('/'))&&!basePath.endsWith('/')&&!basePath.includes('..'),'invalid_base_path');const run={runId:input.runId,backend:input.backend,bucket:input.bucket,ak:input.ak,sk:input.sk,region:input.region??'r2ij',basePath};state.runs.push(run);value={registered:true,runId:run.runId,bucket:run.bucket};}
    else if(input.action==='shutdown'){check(state.objects.every(o=>!o.present)&&state.events.every(e=>!e.active),'active_state_blocks_shutdown');closing=true;value={stopping:true};setTimeout(()=>{for(const server of servers)server.close();for(const socket of sockets)socket.destroy();},20);}
    else{const run=state.runs.find(r=>r.runId===input.runId&&r.bucket===input.bucket);check(run,'unknown_run');if(input.action==='plan'){const object=plan(run,input.key,input.expected);value={planned:true,key:object.key};}
        else if(input.action==='rule'){const object=objectFor(run,input.key);check(object,'unplanned_object');check(input.rule&&Object.keys(input.rule).every(k=>['encoding','gzipPrefixHex','rawDeflate','truncateInnerGzip','truncateWire','status','errorBody','closeAttempts','redirectSelf','redirectBeforeSuccess','redirectLocation','resetBeforeBody','resetAfterBytes','stallAfterBytes'].includes(k)),'invalid_rule');if(input.rule.gzipPrefixHex!==undefined)check(input.rule.encoding==='gzip'&&['61','6162','1f','1f8b'].includes(input.rule.gzipPrefixHex),'invalid_gzip_prefix_vector');object.rule=input.rule;object.counter=0;value={configured:true};}
        else if(input.action==='head'){const object=objectFor(run,input.key);check(object,'unplanned_object');value={exists:object.present,...(object.present?{sha256:object.sha256,size:object.size}:{})};}
        else if(input.action==='remove'){const object=objectFor(run,input.key);check(object,'unplanned_object');check(!state.events.some(e=>e.runId===run.runId&&e.key===object.key&&e.active),'active_stream_blocks_remove');if(object.present){check(input.expectedHash===object.sha256,'changed_object');const file=join(privateDir,'blobs',object.blob);check(hash(readFileSync(file))===object.sha256,'blob_changed');unlinkSync(file);object.present=false;value={removed:true};}else value={removed:false};}
        else if(input.action==='snapshot')value=safeRun(run);
        else throw Object.assign(new Error('unknown_control_action'),{publicCode:'unknown_control_action'});
    }save();json(res,200,value);
}
async function handle(req,res){let event;try{
    check(['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress),'non_loopback_peer');
    const url=new URL(req.url,'http://'+req.headers.host);if(url.pathname==='/__r2ij_obs_control'){check(req.method==='POST','control_method');await control(req,res);return;}
    const {run,key}=route(req,url);event={seq:state.events.length+1,at:new Date().toISOString(),runId:run.runId,bucket:run.bucket,key,method:req.method,path:url.pathname,queryKeys:[...url.searchParams.keys()],defaultHeaders:Object.fromEntries(['accept','accept-language','accept-encoding','user-agent','connection','sec-fetch-mode'].map(k=>[k,req.headers[k]??null])),active:false};state.events.push(event);
    const bytes=await collect(req,16*1024*1024);event.requestBytes=bytes.length;event.requestSha256=hash(bytes);event.signature=verify(req,url,run,bytes);event.verified=true;
    if(key===null){check(req.method==='HEAD','bucket_read_only');event.status=200;res.writeHead(200,{'content-length':'0'});res.end();save();return;}
    const object=objectFor(run,key);check(object,'unplanned_object');object.counter++;
    if(object.rule.closeAttempts&&object.counter<=object.rule.closeAttempts){event.status='connection-reset';save();req.socket.destroy();return;}
    if(object.rule.redirectSelf||object.rule.redirectLocation||object.counter<=(object.rule.redirectBeforeSuccess??0)){event.status=object.rule.status??307;const location=object.rule.redirectLocation??req.url;res.writeHead(event.status,{location,'content-length':0});res.end();save();return;}
    if(object.rule.status&&object.rule.status>=400){event.status=object.rule.status;const error=Buffer.from(object.rule.errorBody??'Controlled OBS failure');res.writeHead(event.status,{'content-type':'text/plain','content-length':error.length});res.end(error);save();return;}
    if(req.method==='PUT'){check(object.writes.some(w=>w.sha256===hash(bytes)&&w.size===bytes.length),'unplanned_write_bytes');writeFileSync(join(privateDir,'blobs',object.blob),bytes,{mode:0o600});Object.assign(object,{present:true,sha256:hash(bytes),size:bytes.length,contentType:req.headers['content-type']??null,checksum:req.headers['x-amz-meta-sha256']??null,lastModified:'Thu, 01 Jan 2026 00:00:00 GMT'});event.status=200;res.writeHead(200,{'content-length':0,etag:'"'+object.sha256+'"'});res.end();save();return;}
    if(!object.present){event.status=404;res.writeHead(404,{'content-length':0});res.end();save();return;}
    if(req.method==='DELETE'){const file=join(privateDir,'blobs',object.blob);check(hash(readFileSync(file))===object.sha256,'blob_changed');unlinkSync(file);object.present=false;event.status=204;res.writeHead(204);res.end();save();return;}
    check(['HEAD','GET'].includes(req.method),'unsupported_method');const plain=readFileSync(join(privateDir,'blobs',object.blob));check(hash(plain)===object.sha256,'blob_changed');const wire=encoded(object,plain);const headers={'content-length':String(wire.length),etag:'"'+object.sha256+'"','last-modified':object.lastModified,'content-type':object.contentType??'application/octet-stream'};if(object.checksum!==null)headers['x-amz-meta-sha256']=object.checksum;if(object.rule.encoding)headers['content-encoding']=object.rule.encoding;event.status=200;event.responseBytes=wire.length;event.responseSha256=hash(wire);res.writeHead(200,headers);
    if(req.method==='HEAD'){res.end();save();return;}
    event.active=true;event.sent=0;let timer;res.on('close',()=>{if(timer)clearTimeout(timer);event.active=false;event.closedAt=new Date().toISOString();event.aborted=!res.writableFinished;save();});
    if(object.rule.resetBeforeBody){res.flushHeaders();timer=setTimeout(()=>res.destroy(),60);}
    else if(object.rule.resetAfterBytes||object.rule.stallAfterBytes){const count=Math.min(object.rule.resetAfterBytes??object.rule.stallAfterBytes,wire.length);res.write(wire.subarray(0,count));event.sent=count;res.flushHeaders();timer=setTimeout(()=>res.destroy(),object.rule.stallAfterBytes?20000:80);}
    else{event.sent=wire.length;res.end(wire);}save();
}catch(error){if(event){event.verified=false;event.failure=error.publicCode??'fixture_rejected';event.status=403;save();}if(!res.headersSent)json(res,403,{error:error.publicCode??'fixture_rejected'});else res.destroy();}}
for(const host of ['127.0.0.1','::1']){const server=createServer(handle);server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen({host,port:6900,ipv6Only:host==='::1'},resolve);});servers.push(server);}
const receipt={scope:state.scope,tag,pid:process.pid,startedAt:state.startedAt,bindings:['127.0.0.1:6900','[::1]:6900'],sourceHash,node:process.version,undici:process.versions.undici};writeFileSync(join(publicDir,`obs-server-${tag}-start.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
await new Promise(resolve=>{let count=0;for(const server of servers)server.on('close',()=>{if(++count===servers.length)resolve();});});
check(closing,'unexpected_server_stop');writeFileSync(join(publicDir,`obs-server-${tag}-stop.json`),JSON.stringify({...receipt,stoppedAt:new Date().toISOString(),zero:state.objects.every(o=>!o.present)&&state.events.every(e=>!e.active)},null,2)+'\n',{flag:'wx'});
