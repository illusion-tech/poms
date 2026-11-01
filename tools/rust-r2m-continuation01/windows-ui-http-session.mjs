// Root-held cookie jar for real Windows Native setup HTTP over its bounded
// stdio owner. No Linux-loopback assumption and no request on import.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export class WindowsNativeUiHttpSession{
    constructor({runId,userId,native,contexts}){assert(/^[0-9a-f-]{36}$/.test(runId));assert.equal(typeof native?.request,'function');assert.equal(typeof native.admitContext,'function');assert(contexts instanceof Map);this.runId=runId;this.userId=userId;this.native=native;this.contexts=contexts;this.cookies=new Map()}
    async request({executionBackend,method,path,body,headers={},csrf,requestId,correlationId,contentType}){
        assert.equal(executionBackend,'nest');assert(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method));assert(path.startsWith('/api')&&!/[\r\n\0\\#]/.test(path));
        const context=this.contexts.get(correlationId);assert(context?.runId===this.runId);await this.native.admitContext(correlationId,context);
        const outgoing={'x-forwarded-for':'192.0.2.25'};
        for(const[key,value]of Object.entries(headers)){assert(!/^(?:cookie|set-cookie|authorization|host|connection|content-length|x-request-id|x-correlation-id|user-agent)$/i.test(key));assert(typeof value==='string'&&!/[\r\n]/.test(value));outgoing[key]=value}
        if(this.cookies.size)outgoing.cookie=[...this.cookies].map(([key,value])=>key+'='+value).join('; ');
        if(!['GET','HEAD','OPTIONS'].includes(method)&&csrf!==false&&this.cookies.has('poms_csrf'))outgoing['x-csrf-token']=typeof csrf==='string'?csrf:this.cookies.get('poms_csrf');
        let bodyBase64;if(body!==undefined){const bytes=Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));bodyBase64=bytes.toString('base64');outgoing['content-type']=contentType??(Buffer.isBuffer(body)?'application/octet-stream':'application/json')}
        const response=await this.native.request({method,path,bodyBase64,headers:outgoing,requestId,correlationId,purpose:'producer'});
        assert(Buffer.isBuffer(response.bodyBytes)&&response.executionBackend==='nest'&&Number.isInteger(response.status)&&response.status>=100&&response.status<=599);assert.equal(sha(response.bodyBytes),response.bodyBytesSha256);assert.equal(response.bodyBytes.length,response.bodyBytesLength);
        for(const cookie of response.setCookie??[]){const pair=cookie.split(';',1)[0],at=pair.indexOf('=');if(at>0){const name=pair.slice(0,at),value=pair.slice(at+1);if(value)this.cookies.set(name,value);else this.cookies.delete(name)}}
        return response;
    }
}
