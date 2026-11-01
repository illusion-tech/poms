// Compare every selected physical column and whole response. Only exact,
// evidence-bound entropy/clock cells may be normalized. Never drop fields.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateFactFrame, valueDigest } from './scenario-expected.mjs';

const SHA=/^[0-9a-f]{64}$/;
const UUID=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stable(item)])):value;
const sha=value=>createHash('sha256').update(value).digest('hex');
const safeKey=key=>/^[A-Za-z0-9_-]{1,32}$/.test(key)&&!/(?:password|cookie|secret|token|environment|stderr)/i.test(key)?key:'key-sha256-'+sha(String(key)).slice(0,16);

export function strictDifference(a,b,at='$',out=[]) {
    if(Object.is(a,b))return out;
    if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
        if(Array.isArray(a)&&a.length!==b.length)out.push({path:at,kind:'array-length'});
        for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort()){
            if(!Object.hasOwn(a,key)||!Object.hasOwn(b,key))out.push({path:at+'.'+safeKey(key),kind:'presence'});
            else strictDifference(a[key],b[key],at+'.'+safeKey(key),out);
        }
    }else out.push({path:at,kind:'value-or-type'});
    return out;
}

function matches(row,identity){return Object.entries(identity).every(([key,value])=>Object.hasOwn(row,key)&&Object.is(row[key],value))}
function setCell(row,parts,replacement,expected){let target=row;for(const part of parts.slice(0,-1)){assert(target&&Object.hasOwn(target,part),'Evidence cell missing');target=target[part]}const last=parts.at(-1);assert(target&&Object.hasOwn(target,last),'Evidence cell missing');assert.equal(valueDigest(target[last]),expected,'Evidence cell value changed');target[last]=replacement}

export function createNormalizer({runId,sourceCapId,admissions=[],literals=[],inputs=[],cells=[]}) {
    assert(typeof runId==='string'&&typeof sourceCapId==='string','Run/cap binding required');
    const idToSlot=new Map(),slotToId=new Map(),textToSlot=new Map(),literal=new Set(literals.map(value=>String(value).toLowerCase()));
    for(const item of admissions){
        assert(item.runId===runId&&item.sourceCapId===sourceCapId&&item.kind==='r2m-fixture-admission'&&SHA.test(item.ledgerDigest??'')&&SHA.test(item.certificateSha256??''),'Fixture-verified actual admission required');
        assert(typeof item.table==='string'&&item.identity&&Object.keys(item.identity).length>0&&typeof item.slot==='string','Typed row identity missing');
        // Composite/non-UUID keys remain full real values. A system_setting key
        // is never coerced into an invented UUID-id identity.
        if(item.identity.id!==undefined){const id=String(item.identity.id).toLowerCase();assert(/^[0-9a-f-]{36}$/.test(id)&&!literal.has(id),'Invalid or readonly identity mapping');assert(!idToSlot.has(id)||idToSlot.get(id)===item.slot,'Non-bijective ID map');assert(!slotToId.has(item.slot)||slotToId.get(item.slot)===id,'Typed slot maps multiple IDs');idToSlot.set(id,item.slot);slotToId.set(item.slot,id)}
    }
    for(const item of inputs){assert(item.runId===runId&&item.sourceCapId===sourceCapId&&typeof item.value==='string'&&item.value.length>=8&&typeof item.slot==='string'&&item.slot.length>0,'Exact input slot evidence required');if(/^[0-9a-f-]{36}$/i.test(item.value))assert(item.value===runId&&item.slot==='run','A row UUID cannot bypass fixture admission through input slots');assert(!textToSlot.has(item.value),'Duplicate input text slot');textToSlot.set(item.value,'$input:'+item.slot)}
    const text=(value)=>{if(textToSlot.has(value))return textToSlot.get(value);let result=value;if(textToSlot.has(runId))result=result.split(runId).join('$input:run');return result.replace(UUID,id=>{const key=id.toLowerCase();if(literal.has(key))return id;assert(idToSlot.has(key),'Unregistered UUID in complete comparison');return '$id:'+idToSlot.get(key)})};
    const any=value=>typeof value==='string'?text(value):Array.isArray(value)?value.map(any):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[text(key),any(item)])):value;
    const applyCells=(frame,kind,scope)=>{
        const copy=structuredClone(frame);
        for(const item of cells.filter(cell=>cell.target===kind&&cell.stepId===scope?.stepId&&cell.phase===scope?.phase)){
            assert(item.sourceCapId===sourceCapId&&item.runId===runId&&SHA.test(item.valueSha256??'')&&typeof item.site==='string'&&Array.isArray(item.path)&&item.path.length>0,'Exact semantic cell evidence required');
            let root=copy;
            if(kind==='facts'){const rows=copy.rows[item.table];assert(Array.isArray(rows),'Semantic table absent');const found=rows.filter(row=>matches(row,item.identity));assert.equal(found.length,1,'Semantic cell requires unique actual physical row');root=found[0]}
            if(item.kind==='clock'){
                assert(typeof item.actual==='string'&&SHA.test(item.observationSha256??''),'Clock actual/observation proof missing');assert.equal(valueDigest(item.actual),item.valueSha256,'Clock value digest mismatch');
                const time=Date.parse(item.actual),start=Date.parse(item.window?.startedAt),end=Date.parse(item.window?.finishedAt);assert(Number.isFinite(time)&&Number.isFinite(start)&&Number.isFinite(end)&&start<=end&&time>=start&&time<=end,'Clock outside exact observation window');
                const zone=/(Z|[+-]\d\d:\d\d)$/.exec(item.actual)?.[1];assert(zone,'Timestamp zone missing');
                const fraction=/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/.exec(item.actual)?.[1]??'';
                setCell(root,item.path,{clock:item.site,zone,fractionDigits:fraction.length,representation:item.representation??'original-string'},item.valueSha256);
            }else if(item.kind==='opaque'){
                assert(['session-token-hash','csrf-token-hash','credential-bcrypt','provider-v1-ciphertext'].includes(item.rule),'Unknown opaque normalization contract');
                assert(item.contractReceipt?.result==='pass'&&item.contractReceipt.sourceCapId===sourceCapId&&SHA.test(item.contractReceipt.sha256??''),'Actual opaque compatibility contract receipt missing');
                setCell(root,item.path,{opaque:item.site,rule:item.rule},item.valueSha256);
            }else assert.fail('Unknown semantic normalization');
        }
        return copy;
    };
    return Object.freeze({facts(frame,tables,scope){validateFactFrame(frame,tables);const transformed=applyCells(frame,'facts',scope);const rows={};for(const table of tables){rows[table]=transformed.rows[table].map(any).sort((a,b)=>JSON.stringify(stable(a)).localeCompare(JSON.stringify(stable(b))))}return stable({catalogDigest:frame.catalogDigest,columns:Object.fromEntries(tables.map(table=>[table,[...frame.columns[table]]])),primaryKeys:Object.fromEntries(tables.map(table=>[table,[...frame.primaryKeys[table]]])),rows,outsideScope:frame.outsideScope})},response(response,scope){const transformed=applyCells(response,'response',scope);return stable(any({status:transformed.status,body:transformed.body,headers:Object.fromEntries(Object.entries(transformed.headers??{}).filter(([key])=>['content-type','content-length','content-disposition','x-request-id'].includes(key.toLowerCase())).map(([key,value])=>[key.toLowerCase(),value])),bodyBytesLength:transformed.bodyBytesLength}))}});
}

export function compareCompleteCase(native,rust,{tables,nativeEvidence,rustEvidence}) {
    assert(native.caseId===rust.caseId&&native.sourceCapId===rust.sourceCapId,'Case/source epoch mismatch');
    assert(Array.isArray(native.steps)&&Array.isArray(rust.steps)&&native.steps.length===rust.steps.length,'Complete same ordered step set required');
    const a=createNormalizer(nativeEvidence),b=createNormalizer(rustEvidence),differences=[],fingerprints=[];
    for(const[index,left]of native.steps.entries()){
        const right=rust.steps[index];assert(left.id===right.id&&left.kind===right.kind,'Ordered recipe step mismatch');
        for(const phase of ['before','after']){const scope={stepId:left.id,phase};const x=a.facts(left[phase],tables,scope),y=b.facts(right[phase],tables,scope);strictDifference(x,y,'$.'+left.id+'.'+phase,differences);fingerprints.push({step:left.id,phase,native:valueDigest(x),rust:valueDigest(y)})}
        if(left.response||right.response){assert(left.response&&right.response,'Response omitted');const scope={stepId:left.id,phase:'response'};strictDifference(a.response(left.response,scope),b.response(right.response,scope),'$.'+left.id+'.response',differences)}
    }
    return {kind:'r2m-complete-physical-facts-and-response-diff',caseId:native.caseId,sourceCapId:native.sourceCapId,result:differences.length?'fail':'pass',differences,fingerprints,rawValuesDisclosed:false,unknownFieldsDropped:false};
}

export function evidenceBytesIdentity(bytes){assert(Buffer.isBuffer(bytes));return{bytes:bytes.length,rawBytesSha256:sha(bytes)}}
