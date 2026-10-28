import assert from 'node:assert/strict';
import {createHash}from'node:crypto';
import {readFileSync,writeFileSync,mkdirSync}from'node:fs';
import {createRequire}from'node:module';
import {resolve,dirname}from'node:path';
import {fileURLToPath}from'node:url';
import {Script}from'node:vm';
import {requestCorpus,SCHEMAS}from'./h-oracle.mjs';
import {sourceBehavior}from'./h-behavior.mjs';
export const ROOT=resolve(import.meta.dirname,'../..');
export const SOURCE_HEAD='126ede22bb4b379ae656ccde9cee9d82da383be4';
const require=createRequire(resolve(ROOT,'package.json')),ts=require('typescript'),zod=require('zod');
require('reflect-metadata');
export const read=path=>readFileSync(resolve(ROOT,path),'utf8').replace(/\r\n/g,'\n');
const hash=value=>createHash('sha256').update(value).digest('hex');
export function executeTs(text,file,modules,globals={}){
    const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);assert.equal(source.parseDiagnostics.length,0);
    for(const statement of source.statements)if(ts.isImportDeclaration(statement))assert(Object.hasOwn(modules,statement.moduleSpecifier.text),'Unreviewed source import '+statement.moduleSpecifier.text);
    const output=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,emitDecoratorMetadata:false}}).outputText;
    const exports={},context={exports,module:{exports},require:name=>{assert(Object.hasOwn(modules,name),'Unreviewed runtime import '+name);return modules[name];},...globals};
    new Script(output,{filename:file}).runInNewContext(context,{timeout:3000});return context.module.exports;
}
function descriptor(schema){
    const def=schema._zod.def;const value={type:def.type};
    if(def.type==='object'){value.fieldOrder=Object.keys(schema.shape);value.fields=Object.fromEntries(Object.entries(schema.shape).map(([key,item])=>[key,descriptor(item)]));}
    if(def.type==='enum')value.values=Object.values(def.entries);
    if(def.innerType)value.inner=descriptor(def.innerType);
    if(def.element)value.element=descriptor(def.element);
    if(def.keyType)value.key=descriptor(def.keyType);
    if(def.valueType)value.value=descriptor(def.valueType);
    if(def.coerce)value.coerce=true;
    if(def.format)value.format=def.format;
    if(def.pattern)value.pattern=String(def.pattern);
    if(def.checks)value.checks=def.checks.map(check=>{const d=check._zod.def;return Object.fromEntries(Object.entries(d).filter(([key,value])=>typeof value!=='function'&&key!=='when').map(([key,value])=>[key,value instanceof RegExp?String(value):value]));});
    return value;
}
export async function buildArtifacts(){
    assert.equal(ts.version,'6.0.3');assert.equal(require('zod/package.json').version,'4.6.1');
    const manifest=JSON.parse(read('tmp/rust-r2gh/h-g1-source.json'));
    const rows=manifest.files??manifest.sources;assert(Array.isArray(rows));
    // Governance documents can be updated by Root after G1; only original
    // product authority and dependency declarations are regeneration guards.
    for(const row of rows){if(!row.path.startsWith('apps/poms-api/')&&!row.path.startsWith('libs/')&&!['package.json','pnpm-lock.yaml'].includes(row.path))continue;const expected=row.normalizedUtf8Sha256;assert.equal(hash(read(row.path)),expected,'Frozen H source changed '+row.path);}
    const shared=executeTs(read('libs/shared/contracts/src/lib/shared-contracts.ts'),'shared-contracts.ts',{zod});
    const corpus=requestCorpus(shared,SOURCE_HEAD);
    const spec=JSON.parse(read('libs/shared/api-spec/openapi.json'));const paths={};const schemas={};
    const visit=value=>{if(!value||typeof value!=='object')return;if(typeof value.$ref==='string'){const key=value.$ref.slice('#/components/schemas/'.length);if(!Object.hasOwn(schemas,key)){schemas[key]=spec.components.schemas[key];visit(schemas[key]);}}Object.values(value).forEach(visit);};
    let operations=0;for(const[path,methods]of Object.entries(spec.paths))for(const[method,operation]of Object.entries(methods))if(operation?.operationId?.startsWith('ExternalOrgSyncController_')){paths[path]??={};paths[path][method]=operation;visit(operation);operations++;}assert.equal(operations,18);
    const uuid=shared.MapExternalDepartmentMappingRequestSchema.safeParse({orgUnitId:'bad',expectedVersion:1});
    const authority={formatVersion:1,sourceHead:SOURCE_HEAD,authority:'Unchanged original TS/Zod; generated input only',schemas:Object.fromEntries(SCHEMAS.map(name=>[name,descriptor(shared[name+'Schema'])])),uuidPattern:uuid.error.issues[0].pattern};
    const outputs=new Map([['h-authority.json',authority],['h-golden.json',corpus],['h-behavior.json',await sourceBehavior({read,executeTs,shared,root:ROOT})],['h-openapi.json',{openapi:spec.openapi,paths,components:{schemas,securitySchemes:spec.components.securitySchemes}}]].map(([file,value])=>[file,JSON.stringify(value,null,2)+'\n']));
    outputs.set('h-source.json',JSON.stringify({formatVersion:1,sourceHead:SOURCE_HEAD,authority:'Original shared Zod/TS/OpenAPI, not Rust',frozenInput:'tmp/rust-r2gh/h-g1-source.json',frozenInputSha256:hash(read('tmp/rust-r2gh/h-g1-source.json')),dependencies:{node:process.versions.node,typescript:ts.version,zod:require('zod/package.json').version},outputs:[...outputs].map(([path,value])=>({path,sha256:hash(value)})),evidence:{operations,schemaCases:corpus.cases.length,boundary:corpus.boundary}},null,2)+'\n');
    return outputs;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const args=process.argv.slice(2);assert(args.length===0||args.length===1&&args[0]==='--check','Usage: h-export.mjs [--check]');
    for(const[file,value]of await buildArtifacts()){const path=resolve(ROOT,'tools/rust-r2gh',file);if(args.length)assert.equal(readFileSync(path,'utf8'),value,'Stale H neutral input '+file);else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,value);}}
    console.log(JSON.stringify({result:'pass',mode:args.length?'check':'write',boundary:'Pure original source/Zod execution; no HTTP/PG/UI'}));
}
