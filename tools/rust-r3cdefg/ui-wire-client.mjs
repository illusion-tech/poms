// Root acceptance transport: full original bytes are retained privately per request.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export class HttpSession {
 constructor(origin,{journal,label='session'}={}) {const u=new URL(origin);assert.equal(u.hostname,'127.0.0.1');assert([12100,12110,12200].includes(Number(u.port)));assert(journal&&(journal.replaceAll('\\','/').startsWith('/home/wangzishi/.local/share/poms-r3cdefg/private/')||process.platform==='win32'&&journal.replaceAll('\\','/').startsWith(process.env.LOCALAPPDATA.replaceAll('\\','/')+'/poms-r3cdefg/private/')));this.origin=origin;this.journal=journal;fs.mkdirSync(journal,{recursive:true,mode:0o700});this.label=label;this.cookies=new Map();this.events=[];}
 async request(method,route,options={}) {
  assert(/^\/api\//i.test(route));const requestId=options.requestId||randomUUID(),headers=['Host',new URL(this.origin).host,'User-Agent','POMS-R3CDEFG synthetic acceptance','X-Request-Id',requestId];
  if(this.cookies.size&&options.cookie!==false)headers.push('Cookie',[...this.cookies].map(([k,v])=>k+'='+v).join('; '));
  if(!['GET','HEAD','OPTIONS'].includes(method)&&options.csrf!==false&&this.cookies.has('poms_csrf'))headers.push('X-CSRF-Token',this.cookies.get('poms_csrf'));
  let body;if(Object.hasOwn(options,'json')){body=Buffer.from(JSON.stringify(options.json));headers.push('Content-Type','application/json','Content-Length',String(body.length))}else if(Object.hasOwn(options,'raw')){body=Buffer.from(options.raw);headers.push('Content-Type',options.contentType||'application/json','Content-Length',String(body.length))}if(options.headers)headers.push(...options.headers);
  const filePrefix=this.journal+'/'+this.label+'-'+requestId;let outgoing,wire;
  const response=await new Promise((resolve,reject)=>{const raw=[];const req=http.request(new URL(route,this.origin),{method,headers,timeout:20000,agent:false},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('error',reject);res.on('end',()=>{try{const bytes=Buffer.concat(chunks),text=bytes.toString('utf8');wire=Buffer.concat(raw);outgoing=Buffer.concat([Buffer.from(req._header,'latin1'),body||Buffer.alloc(0)]);fs.writeFileSync(filePrefix+'-request.bin',outgoing,{flag:'wx',mode:0o600});fs.writeFileSync(filePrefix+'-response.bin',wire,{flag:'wx',mode:0o600});const contentType=String(res.headers['content-type']||'');resolve({status:res.statusCode,body:text?(contentType.includes('application/json')?JSON.parse(text):text):null,setCookie:res.headers['set-cookie']||[],headers:res.rawHeaders,entityBody:bytes});}catch(e){reject(e)}})});req.on('socket',s=>s.prependListener('data',b=>raw.push(Buffer.from(b))));req.on('timeout',()=>req.destroy(new Error('R3CDEFG HTTP timeout')));req.on('error',reject);req.end(body)});
  for(const c of response.setCookie){const pair=c.split(';')[0],i=pair.indexOf('=');if(i>0){const key=pair.slice(0,i),value=pair.slice(i+1);if(value)this.cookies.set(key,value);else this.cookies.delete(key)}}
  const rawWire={requestBytes:outgoing.length,requestSha256:sha(outgoing),responseBytes:wire.length,responseSha256:sha(wire),entityBodyBytes:response.entityBody.length,entityBodySha256:sha(response.entityBody),privatePrefix:filePrefix,originalRawRetained:true};
  const safeHeaders=[];for(let i=0;i<response.headers.length;i+=2)if(!['set-cookie'].includes(response.headers[i].toLowerCase()))safeHeaders.push(response.headers[i],response.headers[i+1]);
  const result={status:response.status,body:response.body,requestId,headers:safeHeaders,rawWire};this.events.push({requestId,method,route,status:response.status,body:route.startsWith('/api/auth/')?'private-auth-response-not-published':response.body,rawWire});return result;
 }
 async login(username,password){const csrf=await this.request('GET','/api/auth/csrf-token');assert.equal(csrf.status,200);const r=await this.request('POST','/api/auth/sessions',{json:{username,password}});assert.equal(r.status,200);assert.equal(r.body.authenticated,true);this.userId=r.body.user.id;this.accessToken=r.body.accessToken||null;return r.body}
}
