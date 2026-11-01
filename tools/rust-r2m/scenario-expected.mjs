// Finite response/fact predicates. The current TS-owned schema remains input;
// these checks do not parse/replace a server DTO or grant row ownership.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value==='object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stable(item)])) : value;
const equal = (a,b) => JSON.stringify(stable(a))===JSON.stringify(stable(b));

export function schemaIssues(value, schema, spec, at='$', depth=0) {
    assert(depth<256,'Schema/body recursion bound exceeded');
    if(schema===true || !schema)return [];
    if(schema===false)return [{path:at,rule:'false-schema'}];
    if(schema.$ref){assert(schema.$ref.startsWith('#/components/schemas/'),'Only pinned local schema refs supported');const name=schema.$ref.slice(21);assert(Object.hasOwn(spec.components.schemas,name),'Missing schema ref');return schemaIssues(value,spec.components.schemas[name],spec,at,depth+1)}
    if(value===null)return schema.nullable===true || schema.type==='null' || schema.enum?.includes(null)?[]:[{path:at,rule:'null'}];
    const out=[];
    if(schema.allOf)for(const child of schema.allOf)out.push(...schemaIssues(value,child,spec,at,depth+1));
    if(schema.anyOf && !schema.anyOf.some(child=>schemaIssues(value,child,spec,at,depth+1).length===0))out.push({path:at,rule:'anyOf'});
    if(schema.oneOf && schema.oneOf.filter(child=>schemaIssues(value,child,spec,at,depth+1).length===0).length!==1)out.push({path:at,rule:'oneOf'});
    if(schema.enum && !schema.enum.some(item=>equal(item,value)))out.push({path:at,rule:'enum'});
    const type=schema.type;
    const valid=type===undefined || type==='object'&&typeof value==='object'&&!Array.isArray(value) || type==='array'&&Array.isArray(value) || type==='string'&&typeof value==='string' || type==='boolean'&&typeof value==='boolean' || type==='number'&&typeof value==='number'&&Number.isFinite(value) || type==='integer'&&typeof value==='number'&&Number.isInteger(value);
    if(!valid)return [...out,{path:at,rule:'type'}];
    if(typeof value==='string'){
        // Current Zod source string constraints use UTF16 code units. Do not
        // silently change this to codepoint/UTF8 length in the migration.
        if(schema.minLength!==undefined && value.length<schema.minLength)out.push({path:at,rule:'minLength'});
        if(schema.maxLength!==undefined && value.length>schema.maxLength)out.push({path:at,rule:'maxLength'});
        if(schema.pattern && !new RegExp(schema.pattern).test(value))out.push({path:at,rule:'pattern'});
        if(schema.format==='uuid'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))out.push({path:at,rule:'uuid'});
    }
    if(typeof value==='number'){
        if(schema.minimum!==undefined && (schema.exclusiveMinimum===true?value<=schema.minimum:value<schema.minimum))out.push({path:at,rule:'minimum'});
        if(schema.maximum!==undefined && (schema.exclusiveMaximum===true?value>=schema.maximum:value>schema.maximum))out.push({path:at,rule:'maximum'});
    }
    if(Array.isArray(value)){
        if(schema.minItems!==undefined&&value.length<schema.minItems)out.push({path:at,rule:'minItems'});
        if(schema.maxItems!==undefined&&value.length>schema.maxItems)out.push({path:at,rule:'maxItems'});
        if(schema.uniqueItems && new Set(value.map(item=>JSON.stringify(stable(item)))).size!==value.length)out.push({path:at,rule:'uniqueItems'});
        if(schema.items)for(const [index,item]of value.entries())out.push(...schemaIssues(item,schema.items,spec,at+'['+index+']',depth+1));
    }else if(value&&typeof value==='object'){
        for(const key of schema.required??[])if(!Object.hasOwn(value,key))out.push({path:at+'.'+key,rule:'required'});
        for(const [key,item]of Object.entries(value)){
            if(schema.properties&&Object.hasOwn(schema.properties,key))out.push(...schemaIssues(item,schema.properties[key],spec,at+'.'+key,depth+1));
            else if(schema.additionalProperties===false)out.push({path:at+'.'+key,rule:'additionalProperties'});
            else if(schema.additionalProperties&&typeof schema.additionalProperties==='object')out.push(...schemaIssues(item,schema.additionalProperties,spec,at+'.'+key,depth+1));
        }
    }
    return out;
}

export function responseSchema(spec, operationId, status) {
    const found=[];for(const operations of Object.values(spec.paths))for(const op of Object.values(operations))if(op?.operationId===operationId)found.push(op);
    assert.equal(found.length,1,'Exactly one original operation schema required');
    const response=found[0].responses?.[String(status)]??found[0].responses?.default;
    return {schema:response?.content?.['application/json']?.schema??null,declared:!!response,status};
}

export function assertResponse(response, step, {spec,operationId}={}) {
    assert(Number.isInteger(response?.status)&&response.status>=100&&response.status<=599,'Missing actual response status');
    assert(response.transportComplete===true,'Incomplete actual transport');
    assert(/^[0-9a-f]{64}$/.test(response.bodyBytesSha256??'')&&Number.isSafeInteger(response.bodyBytesLength)&&response.bodyBytesLength>=0,'Raw response byte identity required');
    if(step.expectedStatus!==undefined)assert.equal(response.status,step.expectedStatus,'Declared finite response status differs');
    if(step.binaryExpected)assert.equal(response.bodyBytesSha256,step.binaryExpected,'Downloaded bytes differ from source payload');
    if(spec&&operationId&&response.status>=200&&response.status<300){
        const selected=responseSchema(spec,operationId,response.status);
        // Original create201/spec200 is retained as an explicit schema-source
        // substitution, not described as a spec-declared201.
        const fallback=!selected.declared&&response.status===201?responseSchema(spec,operationId,200):selected;
        if(fallback.schema)assert.equal(schemaIssues(response.body,fallback.schema,spec).length,0,'Actual response differs from full original schema');
        return {status:response.status,schemaChecked:!!fallback.schema,schemaStatus:fallback.status,original201Spec200:!selected.declared&&fallback.declared};
    }
    return {status:response.status,schemaChecked:false};
}

export function verifyInternal(result,operation) {
    assert(result?.operation===operation&&result.complete===true&&Array.isArray(result.observations),'Complete actual named internal result required');
    if(operation==='common-shared-uow'){
        const variants=['success-commit','success-rollback','gate-rollback','gate-continue-commit'];
        assert.deepEqual(result.observations.map(item=>item.variant).sort(),variants.sort(),'All four UoW variants required');
        for(const item of result.observations)assert(item.actualOuterCommitOrRollback===true&&item.independentVisibility===true&&item.fullParentAndChildFacts===true,'UoW actual outer/visibility facts missing');
    }else if(operation==='numbers-nine-scopes'){
        assert(result.scopeCount===9&&result.utcBoundaryObserved===true&&result.concurrentUnique===true&&result.onlyBeforeAbsentScopePeriods===true,'Number scope/UTC/concurrency identity missing');
        assert(result.independentEmAndBorrowedConnectionSeparate===true,'Native independent and Rust borrowed semantics must remain separate');
    }else assert.fail('Unknown internal operation');
    return {operation,complete:true,observations:result.observations.length};
}

export function validateFactFrame(frame, tables) {
    assert(frame?.readOnly===true&&frame.complete===true&&frame.rows&&frame.columns&&frame.primaryKeys,'Complete read-only physical fact frame required');
    assert(/^[0-9a-f]{64}$/.test(frame.catalogDigest??''),'Catalog fingerprint required');
    assert(frame.outsideScope?.complete===true&&frame.outsideScope.tablesScanned===107&&Array.isArray(frame.outsideScope.unexpectedChanges)&&frame.outsideScope.unexpectedChanges.length===0,'Full107 outside-scope write comparison required');
    for(const table of tables){assert(Array.isArray(frame.rows[table])&&Array.isArray(frame.columns[table])&&Array.isArray(frame.primaryKeys[table])&&frame.primaryKeys[table].length>0,'Expected physical table omitted');const columns=[...frame.columns[table]].sort();assert.equal(new Set(columns).size,columns.length,'Duplicate physical column');const keys=new Set();for(const item of frame.rows[table]){assert.deepEqual(Object.keys(item).sort(),columns,'Incomplete physical row projection');const identity=JSON.stringify(frame.primaryKeys[table].map(key=>{assert(Object.hasOwn(item,key),'Missing physical PK');return item[key]}));assert(!keys.has(identity),'Duplicate physical row');keys.add(identity)}}
    return {tables:tables.length,rows:tables.reduce((sum,table)=>sum+frame.rows[table].length,0),catalogDigest:frame.catalogDigest};
}

export function assertSnapshotChains(frame,projectId) {
    const finals=(frame.rows.commission_final_settlement_snapshot??[]).filter(row=>row.project_id===projectId),rules=(frame.rows.commission_rule_explanation_snapshot??[]).filter(row=>row.project_id===projectId);
    const currentFinal=finals.filter(row=>row.is_current),currentRule=rules.filter(row=>row.is_current);
    assert.equal(currentFinal.length,1,'Exactly one actual current final snapshot required');assert.equal(currentRule.length,1,'Exactly one actual current rule snapshot required');
    assert.equal(currentRule[0].final_settlement_snapshot_id,currentFinal[0].id,'Dual snapshot current link differs');
    for(const rows of [finals,rules])for(const item of rows)if(item.supersedes_id!==null){const prior=rows.find(row=>row.id===item.supersedes_id);assert(prior&&prior.is_current===false&&item.version===prior.version+1,'Version/supersedes chain broken')}
    return {finalVersions:finals.length,ruleVersions:rules.length};
}

export function publicResponseIdentity(response) {
    const allowed=new Set(['content-type','content-length','content-disposition','x-request-id']);
    const headers=Object.fromEntries(Object.entries(response.headers??{}).filter(([key])=>allowed.has(key.toLowerCase())).map(([key,value])=>[key.toLowerCase(),value]));
    // Server error payload, cookies, location OAuth state and arbitrary headers
    // are never returned by this public projection.
    return {status:response.status,bodyBytesSha256:response.bodyBytesSha256,bodyBytesLength:response.bodyBytesLength,headers};
}

export const valueDigest=(value)=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
