// Source03 named measurement boundaries. No product state, clocks or old
// evidence is rewritten. Each classification retains both raw representations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { contractInstant } from './l-contract-diff.mjs';
const ts=createRequire(import.meta.url)('typescript');
const hash=value=>createHash('sha256').update(value).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sourceFiles={
    approval_record:'apps/poms-api/src/app/features/approval/approval-record.entity.ts',
    todo_item:'apps/poms-api/src/app/features/approval/todo-item.entity.ts',
    commission_payout:'apps/poms-api/src/app/features/commission/commission-payout.entity.ts',
    commission_final_settlement_snapshot:'apps/poms-api/src/app/features/commission/commission-final-settlement-snapshot.entity.ts',
    commission_rule_explanation_snapshot:'apps/poms-api/src/app/features/commission/commission-rule-explanation-snapshot.entity.ts',
    commission_role_assignment:'apps/poms-api/src/app/features/commission/commission-role-assignment.entity.ts',
};
export const originalSdkRepresentationMechanisms=Object.freeze({
    version:'MikroORM7 EntityComparator.isComparable excludes prop.version; UnitOfWork create installs the prepareEntity-derived change-set payload and update resets __originalEntityData through prepareEntity. Loaded/refresh normalized raw data can still contain the version. ChangeSetPersister CAS reads entity[meta.versionProperty]. Rust dirty_columns excludes Column.version and CAS reads row.data.rowVersion.',
    json:'Only CommissionRoleAssignment.participantsJson p.json metadata: UnitOfWork.normalizeEntityData/JsonType converts the comparable original to Platform.convertJsonToDatabaseValue JSON text; Rust retains typed JSON in original. Current persisted JSON and per-source no-write evidence remain required.',
    clock:'Only gate-continue-commit with caught400 before service flush: actual source performs the parent outer flush after the after-original-service-child marker. updatedAt onUpdate samples that flush, even when its millisecond equals the preceding marker.',
    lockedCoreVersion:'7.0.11',unitOfWorkSha256:'5e44680b7868d98f4b866d018e69d8efea1842c109f4dd26c839624827e012d6',
});
function nodes(root,predicate){const out=[];const visit=n=>{if(predicate(n))out.push(n);ts.forEachChild(n,visit);};visit(root);return out;}
const definitions=new Map();
export function originalRepresentationMetadata(source,table,field) {
    const file=sourceFiles[table];if(!file)return null;
    let definition=definitions.get(file);
    if(!definition){
        assert.equal(ts.version,'6.0.3');const raw=fs.readFileSync(new URL('../../'+file,import.meta.url)),text=raw.toString('utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0);
        const calls=nodes(ast,n=>ts.isCallExpression(n)&&n.expression.getText(ast)==='defineEntity'&&ts.isObjectLiteralExpression(n.arguments[0]));assert.equal(calls.length,1);const entity=calls[0].arguments[0];
        const named=name=>entity.properties.find(n=>ts.isPropertyAssignment(n)&&n.name.getText(ast)===name)?.initializer;
        assert.equal(named('tableName')?.text,table);const properties=named('properties');assert(ts.isObjectLiteralExpression(properties));const mapped=new Map();
        for(const property of properties.properties){if(!ts.isPropertyAssignment(property))continue;const calls=nodes(property.initializer,ts.isCallExpression),methods=name=>calls.filter(n=>ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text===name),name=property.name.getText(ast),physical=methods('fieldName');
            const updates=methods('onUpdate'),dateOnUpdate=updates.length===1&&ts.isArrowFunction(updates[0].arguments[0])&&ts.isNewExpression(updates[0].arguments[0].body)&&updates[0].arguments[0].body.expression.getText(ast)==='Date'&&(updates[0].arguments[0].body.arguments?.length??0)===0;
            mapped.set(name,{table,name,column:physical.length===1?physical[0].arguments[0].text:name,version:methods('version').length===1,json:methods('json').length===1,dateOnUpdate,
                file,sourceLine:ast.getLineAndCharacterOfPosition(property.getStart(ast)).line+1,sourceSha256:hash(text.replace(/\r\n/g,'\n')),propertySourceSha256:hash(property.getText(ast))});
        }
        definition=mapped;definitions.set(file,mapped);
    }
    const prop=definition.get(field);if(!prop)return null;
    const captured=source.driver?.runtimeInput?.files?.filter(row=>row.source===file)??[],sdk=source.driver?.nativeFinal?.sdk;
    const schema=source.schema?.find(row=>row.table===table)?.properties?.find(row=>row.name===field);
    if(captured.length!==1||captured[0].normalizedLfSha256!==prop.sourceSha256||!schema||!equal(schema.fieldNames,[prop.column]))return null;
    if(!sdk?.packages?.some(row=>row.name==='@mikro-orm/core'&&row.version==='7.0.11')||!sdk.files?.some(row=>row.file==='@mikro-orm/core/unit-of-work/UnitOfWork.js'&&row.rawBytesSha256===originalSdkRepresentationMechanisms.unitOfWorkSha256))return null;
    return {...prop,sqlType:schema.sqlType,metadataCaptured:true};
}
const own=(o,k)=>o!==null&&typeof o==='object'&&Object.hasOwn(o,k);
const versionNode=v=>v?.kind==='number'&&Number.isSafeInteger(v.value)&&v.value>0;
export function versionOriginalBoundary(native,rust,metadata) {
    const prop=metadata?.name;
    if(!metadata?.version||metadata.table!==native.table||rust.table!==native.table||metadata.column!=='row_version'||metadata.sqlType!=='int4'||!metadata.metadataCaptured||!native.original||!rust.original||own(native.original,prop)||!own(rust.original,prop))return null;
    const a=native.properties?.[prop],b=rust.properties?.[prop],extra=rust.original[prop];
    if(!versionNode(a)||!versionNode(b)||!equal(a,b)||!equal(b,extra))return null;
    const nkeys=Object.keys(native.original).sort(),rkeys=Object.keys(rust.original).sort();
    if(!equal(native.originalOwnKeys,nkeys)||!equal(rust.originalOwnKeys,rkeys)||!equal(nkeys,rkeys.filter(key=>key!==prop)))return null;
    return {rule:'source03-original-metadata-version-only',property:prop,metadata,
        nativeOriginalOwnKeys:native.originalOwnKeys,rustOriginalOwnKeys:rust.originalOwnKeys,rustExtraOriginalVersion:extra,nativeCurrentCas:a,rustCurrentCas:b,
        rawVersionsOrPropertiesRemoved:false,rawSnapshotsModified:false,
        comparableRustOriginal:Object.fromEntries(Object.entries(rust.original).filter(([key])=>key!==prop)),comparableRustKeys:rkeys.filter(key=>key!==prop)};
}
// A JSON tokenizer retains every numeric lexeme, array position and object
// member. Object-key order is retained as evidence; JSONB value comparison uses
// exact key sets. No JSON.parse(number), rounding, null/undefined replacement or
// generic stringify fallback is used to compare this representation boundary.
export function parseOriginalJsonLossless(text) {
    assert(typeof text==='string');let i=0;
    const white=()=>{while(/[\x20\t\r\n]/.test(text[i]??'!'))i++;};
    const string=()=>{assert.equal(text[i], '"');const start=i++;let escaped=false;for(;i<text.length;i++){const c=text[i];if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c==='"'){i++;return JSON.parse(text.slice(start,i));}}assert.fail('Unterminated JSON string');};
    const value=()=>{white();const c=text[i];if(c==='"')return{kind:'string',value:string()};
        if(c==='['){i++;white();const items=[];if(text[i]!==']')while(true){items.push(value());white();if(text[i]!==',')break;i++;}assert.equal(text[i++],']');return{kind:'array',value:items};}
        if(c==='{'){i++;white();const members=[],seen=new Set();if(text[i]!=='}')while(true){white();const key=string();assert(!seen.has(key),'Duplicate original JSON member');seen.add(key);white();assert.equal(text[i++],':');members.push({key,value:value()});white();if(text[i]!==',')break;i++;}assert.equal(text[i++],'}');return{kind:'object',members};}
        for(const[word,kind,v]of[['true','boolean',true],['false','boolean',false],['null','null',null]])if(text.startsWith(word,i)){i+=word.length;return{kind,value:v};}
        const number=/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));assert(number,'Invalid original JSON value');i+=number[0].length;return{kind:'number',lexeme:number[0]};};
    const result=value();white();assert.equal(i,text.length,'Trailing original JSON data');return result;
}
export function typedJsonLossless(node) {
    assert(node&&typeof node==='object');
    if(node.kind==='array'){assert(Array.isArray(node.value));return{kind:'array',value:node.value.map(typedJsonLossless)};}
    if(node.kind==='object'){assert(node.value&&typeof node.value==='object'&&!Array.isArray(node.value));return{kind:'object',members:Object.entries(node.value).map(([key,value])=>({key,value:typedJsonLossless(value)}))};}
    if(node.kind==='number'){assert(typeof node.value==='number'&&Number.isFinite(node.value));return{kind:'number',lexeme:JSON.stringify(node.value)};}
    if(node.kind==='null'){assert.equal(node.value,null);return{kind:'null',value:null};}
    assert(['string','boolean'].includes(node.kind)&&typeof node.value===node.kind,'Undefined/missing or coerced JSON leaf is not admitted');return{kind:node.kind,value:node.value};
}
function plainJson(value){if(value===null)return{kind:'null',value:null};if(Array.isArray(value))return{kind:'array',value:value.map(plainJson)};if(typeof value==='object')return{kind:'object',members:Object.entries(value).map(([key,value])=>({key,value:plainJson(value)}))};return typedJsonLossless({kind:typeof value,value});}
function canonicalJson(tree,alias) {
    if(tree.kind==='string')return{kind:'string',value:alias(tree.value)};
    if(tree.kind==='array')return{kind:'array',value:tree.value.map(value=>canonicalJson(value,alias))};
    if(tree.kind==='object')return{kind:'object',members:tree.members.map(({key,value})=>({key,value:canonicalJson(value,alias)})).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0)};
    return tree;
}
export function participantsOriginalBoundary(native,rust,{metadata,alias=(value)=>value,nativeFacts,rustFacts}={}) {
    if(!metadata?.metadataCaptured||!metadata.json||metadata.table!=='commission_role_assignment'||native.table!==metadata.table||rust.table!==metadata.table||metadata.name!=='participantsJson'||metadata.column!=='participants_json'||metadata.sqlType!=='jsonb')return null;
    const a=native.original?.participantsJson,b=rust.original?.participantsJson;if(a?.kind!=='string'||b?.kind!=='array'||native.properties?.participantsJson?.kind!=='array'||rust.properties?.participantsJson?.kind!=='array')return null;
    try {
        const parsed=parseOriginalJsonLossless(a.value),typed=typedJsonLossless(b),currentNative=typedJsonLossless(native.properties.participantsJson),currentRust=typedJsonLossless(rust.properties.participantsJson);
        assert.equal(parsed.kind,'array');assert(nativeFacts&&rustFacts);
        const c=(tree,side)=>canonicalJson(tree,value=>alias(value,side));
        const left=c(parsed,0),right=c(typed,1);
        if(!equal(left,right)||!equal(left,c(currentNative,0))||!equal(right,c(currentRust,1)))return null;
        for(const[facts,side,expected]of[[nativeFacts,0,left],[rustFacts,1,right]]){assert(own(facts.before,'participants_json')&&own(facts.after,'participants_json'));if(!equal(c(plainJson(facts.before.participants_json),side),expected)||!equal(c(plainJson(facts.after.participants_json),side),expected))return null;}
        return {rule:'source03-only-JsonType-participantsJson-original-representation',metadata,nativeOriginalText:a.value,rustOriginalTyped:b,nativeCurrentTyped:native.properties.participantsJson,rustCurrentTyped:rust.properties.participantsJson,
            nativeLosslessTree:parsed,rustLosslessTree:typed,pairedCanonicalJsonbValue:left,arrayOrderPreserved:true,numberLexemesPreserved:true,missingUndefinedNullNotConflated:true,objectMemberOrdersRetainedWithoutClaimingTheyAreEqual:true,perSourcePersistedJsonUnchanged:true,rawSnapshotsModified:false};
    }catch{return null;}
}
export function explicitGcOuterUpdatedAt(source,{table,id,column,value},metadata) {
    if(source.variant!=='gate-continue-commit'||source.ownerOptions?.continueAfterServiceError!==true||source.ownerOptions.outer!=='commit'||source.observation?.outerActualAction!=='commit'||source.observation.serviceError?.status!==400||!metadata?.metadataCaptured||metadata.table!==table||metadata.name!=='updatedAt'||!['timestamp','timestamptz'].includes(metadata.sqlType)||!metadata.dateOnUpdate||metadata.column!=='updated_at'||column!=='updated_at')return null;
    const selected=[['approval','approval_record'],['todoA','todo_item'],['dirtyTodo','todo_item'],['payout','commission_payout']].some(([name,t])=>t===table&&source.selection[name]?.id===id);if(!selected)return null;
    const before=source.before[table]?.find(row=>row.id===id);if(!before||typeof value!=='string'||before.updated_at===null)return null;
    const us=contractInstant(value).us,baseline=contractInstant(before.updated_at).us;if(us===baseline)return null;
    // The trace proves when this property first changed. Boundary-overlapping
    // timestamp membership alone cannot reassign an outer onUpdate to child.
    const first=source.observation.stages.find(stage=>[...(stage.managed??[]),...Object.values(stage.held??{})].some(snapshot=>snapshot?.table===table&&snapshot.id===id&&snapshot.properties?.updatedAt?.kind==='date'&&contractInstant(snapshot.properties.updatedAt.value).us===us));
    const window=source.clockWindows.outer,from=window?.from&&contractInstant(window.from).us,to=window?.to&&contractInstant(window.to).us;
    const valid=first?.name==='after-outer-action-held-bindings'&&from!==undefined&&to!==undefined&&us>=from&&us<=to&&us%1000n===0n;
    return {eligible:true,valid,window:'outer',from:window?.from,to:window?.to,actual:value,precisionAllowanceMs:0,baselineSameInstant:false,
        rule:'source03-GC-caught400-parent-outer-flush-onUpdate',firstObservedPropertyStage:first?.name??null,metadata,rawClockPreserved:true};
}
