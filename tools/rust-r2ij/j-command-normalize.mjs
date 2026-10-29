import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sha} from './j-command-fixtures.mjs';

const bodyTimes=new Set(['createdAt','updatedAt','uploadedAt','completedAt','abortedAt','deletedAt','linkedAt','unlinkedAt','expiresAt']);
const factTimes=new Set(['created_at','updated_at','uploaded_at','completed_at','aborted_at','deleted_at','linked_at','unlinked_at','occurred_at','generated_at','expires_at','score_updated_at']);
const fixedTimes=new Set(['2020-01-01T00:00:00+00:00','2020-01-02T00:00:00+00:00','2020-01-01T00:00:00.000Z','2020-01-02T00:00:00.000Z']);
function weakEtag(bytes){return `W/"${bytes.length.toString(16)}-${createHash('sha1').update(bytes).digest('base64').substring(0,27)}"`;}
function ordered(value){if(Array.isArray(value))return value.map(ordered);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])]));return value;}

/** Explicit identity/clock projection over immutable real observations. */
export function normalizeCommandReport(report){
    assert.equal(report.result,'pass');assert(report.cleanup1.zero&&report.cleanup2.zero);assert.equal(report.cleanup2.matched,0);assert.equal(report.cleanup2.changed,0);
    const labels=new Map();for(const row of report.bindings){assert(!labels.has(row.id));labels.set(row.id,row.label);}
    assert.equal(new Set(labels.values()).size,labels.size,'Generated identity labels must be injective');
    const substitutions=[[report.runId,'$run'],...report.bindings.map(({id,label})=>[id,'$'+label])].flatMap(([id,label])=>[[id,label],[id.toUpperCase(),label+':upper'],[id.replaceAll('-',''),label+':compact']]).sort((a,b)=>b[0].length-a[0].length);
    function text(value){for(const [from,to] of substitutions)value=value.replaceAll(from,to);return value;}
    const start=Date.parse(report.at)-2000,end=Date.parse(report.finishedAt)+2000;
    function transform(value,where,key){
        if(typeof value==='string'){
            const clock=(where.startsWith('body')&&bodyTimes.has(key))||(where.startsWith('facts.')&&factTimes.has(key));
            if(clock&&/^\d{4}-\d\d-\d\dT/.test(value)){
                const at=Date.parse(value);assert(Number.isFinite(at),'Invalid timestamp');
                // The only fixed history/business dates come from the declared
                // fixture, and remain byte-for-byte values in the comparison.
                if(fixedTimes.has(value)||at<Date.parse('2020-01-03T00:00:00Z'))return value;
                const offset=key==='expires_at'||key==='expiresAt'?3600000:0;
                assert(at>=start+offset&&at<=end+offset,`Unbounded server timestamp at ${where}`);return '$server-time';
            }
            return text(value);
        }
        if(Array.isArray(value))return value.map((item,index)=>transform(item,where+'['+index+']',key));
        if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,transform(v,where+'.'+k,k)]));
        return value;
    }
    const normalized=report.cases.map(row=>{
        const facts=transform(row.facts,'facts','');
        for(const rows of Object.values(facts))rows.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
        const result={name:row.name,method:row.method,url:text(row.url),account:row.account,status:row.status,permissions:row.permissions,facts};
        if(row.binary){
            const bytes=Buffer.from(row.bodyBase64,'base64');assert.equal(bytes.length,row.bodyLength);assert.equal(sha(bytes),row.bodySha256);
            result.contentType=row.contentType;result.contentLength=row.contentLength;result.headers={...row.binaryHeaders};
            if(row.status===200){result.bodySha256=row.bodySha256;result.bodyLength=row.bodyLength;}
            else if(row.method==='HEAD')result.bodyLength=0;
            else if(row.contentType.includes('application/json'))result.body=transform(JSON.parse(bytes.toString('utf8')),'body','');
            else result.body=text(bytes.toString('utf8'));
            if(row.status!==200&&row.binaryHeaders.etag!==null){
                const payload=row.method==='HEAD'?report.cases.find(previous=>previous.binary&&previous.method==='GET'&&previous.url===row.url&&previous.status===row.status&&previous.name.split('.').slice(0,-1).join('.')===row.name.split('.').slice(0,-1).join('.')):row;
                assert(payload,'HEAD error validator requires its actual GET witness');
                const actual=Buffer.from(payload.bodyBase64,'base64');assert.equal(row.binaryHeaders.etag,weakEtag(actual),'Native weak ETag must hash the actual error payload');
                const errorBody=payload.contentType.includes('application/json')?transform(JSON.parse(actual.toString('utf8')),'body',''):text(actual.toString('utf8'));
                // Generated UUIDs in JSON errors change bytes while preserving
                // meaning. Verify the raw validator first, then hash the exact
                // identity-projected body for a stable comparison validator.
                result.headers.etag=weakEtag(Buffer.from(typeof errorBody==='string'?errorBody:JSON.stringify(ordered(errorBody))));
            }
        }else result.body=transform(row.body,'body','');
        return result;
    });
    return {cases:normalized,fixtureSteps:report.fixtureSteps.map(({name,kind,account,before,after,keys})=>({name,kind,account,before,after,keys})),payloads:Object.fromEntries(Object.entries(report.payloads).map(([key,value])=>[key,{size:value.size,sha256:value.sha256,mimeType:value.mimeType,originalName:text(value.originalName)}]))};
}
