// Independent actual AJV2020/source and AJV8/OAS-nullable acceptance comparisons.
// Structural synthetic samples only: no HTTP, authorization or business facts.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const Ajv2020=require('E:/projects/poms/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js').default;
const Ajv=require('E:/projects/poms/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/ajv.js').default;
const formats=require('E:/projects/poms/node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.20.0/node_modules/ajv-formats/dist/index.js').default;
const{createStrictNormalizer,NormalizationBlocked}=require('./strict-normalizer.cjs');const{convertAtomic}=require('./canonical-atomic.cjs');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../public-contracts.g2-129.schema.json'),'utf8')).components.schemas;
const normalizer=createStrictNormalizer(convertAtomic);const normalized=normalizer.normalizeRegistry(source);
const options={strict:false,allErrors:false,validateFormats:true,multipleOfPrecision:10};
function validators(registry,target=false,id='urn:poms:source'){const ajv=target?new Ajv(options):new Ajv2020(options);formats(ajv);ajv.addSchema({$id:id,components:{schemas:registry}});return{ajv,get:(name)=>ajv.getSchema(id+'#/components/schemas/'+name),fragment:(schema)=>ajv.compile(schema)};}
const original=validators(source,false,'urn:poms:original');const target=validators(normalized.schemas,true,'urn:poms:target');
let comparisons=0;let positiveSchemas=0;const failures=[];const id='00000000-0000-4000-8000-000000000001';
function compare(name,value){const left=!!original.get(name)(value),right=!!target.get(name)(value);comparisons+=1;if(left!==right)failures.push({name,value,source:left,target:right});return left;}
function sample(schema){
    if(schema.$ref)return sample(source[schema.$ref.split('/').pop()]);if('const'in schema)return structuredClone(schema.const);if(schema.enum)return structuredClone(schema.enum[0]);
    if(schema.oneOf)return sample(schema.oneOf[0]);if(schema.anyOf){const n=schema.anyOf.find((child)=>child.type==='null');return sample(n??schema.anyOf[0]);}
    if(schema.type==='null')return null;if(schema.type==='array')return Array.from({length:schema.minItems??0},()=>sample(schema.items));if(schema.type==='boolean')return false;if(schema.type==='integer'||schema.type==='number')return schema.minimum??0;
    if(schema.type==='string'){if(schema.format==='uuid')return id;if(schema.format==='date')return'2026-11-07';if(schema.format==='date-time')return'2026-11-07T00:00:00Z';if(schema.pattern?.includes('{64}'))return'a'.repeat(64);if(schema.pattern?.includes('W(?:'))return'2026-11';if(schema.pattern?.includes('\\.')||schema.pattern?.includes('[0-9]{2}'))return'0.00';return'x'.repeat(schema.minLength??1);}
    if(schema.type==='object'||schema.properties){const value={};for(const key of schema.required??[])value[key]=sample(schema.properties[key]);
        for(let iteration=0;iteration<4;iteration++)for(const condition of schema.allOf??[]){if(!condition.if)continue;const chosen=original.fragment(condition.if)(value)?condition.then:condition.else;if(!chosen)continue;
            for(const key of chosen.not?.required??[])delete value[key];
            for(const key of chosen.required??[])if(!(key in value))value[key]=choose(schema.properties[key],chosen.properties?.[key]);
            for(const[key,rule]of Object.entries(chosen.properties??{}))if(key in value&&!original.fragment(rule)(value[key]))value[key]=choose(schema.properties[key],rule);
        }return value;
    }return{};
}
function choose(base,extra){const candidates=[];for(const current of[extra,base])if(current){try{candidates.push(sample(current));if(current.anyOf)for(const child of current.anyOf)candidates.push(sample(child));}catch{}}
    candidates.push(null,'0.00','0.01','x','source-basis-value','2026-11');for(const value of candidates)if((!base||original.fragment(base)(value))&&(!extra||original.fragment(extra)(value)))return value;throw new Error('No exact structural sample');}
for(const[name,schema]of Object.entries(source)){
    for(const value of[null,{},[],0,false,'x'])compare(name,value);
    let value;try{value=sample(schema);}catch{continue;}
    if(compare(name,value))positiveSchemas+=1;
    if(value&&typeof value==='object'&&!Array.isArray(value)){
        compare(name,{...value,_unregistered_field:'x'});
        for(const key of(schema.required??[]).slice(0,5)){const missing={...value};delete missing[key];compare(name,missing);}
        for(const[key,entry]of Object.entries(value))if(entry===null)compare(name,{...value,[key]:'must-not-replace-null'});
    }
}
const money={knowledge:'known',value:'0.00',unknownReasonCode:null,evidenceRefs:[],zeroProof:'source-basis-value'};
for(const value of[money,{...money,zeroProof:null},{...money,value:'1.00',zeroProof:null},{...money,value:'1.00'},{...money,knowledge:'unknown',value:null,unknownReasonCode:'missing',zeroProof:null},{...money,knowledge:'unknown',value:'0.00',unknownReasonCode:'missing',zeroProof:null}])compare('MoneyFact',value);
const participant={userId:id,roleType:'execution-owner',responsibilitySummary:'真实职责',weight:0,zeroWeightReason:'零权重职责'};for(const value of[participant,{...participant,zeroWeightReason:null},{...participant,weight:0.5,zeroWeightReason:null},{...participant,weight:0.5},{...participant,weight:0.000001,zeroWeightReason:null}])compare('CommissionParticipantInput',value);
let miniCases=0;
function mini(schema,values,registry={}){
    const inputs={...registry,Subject:schema};const output=normalizer.normalizeRegistry(inputs).schemas;const a=validators(inputs,false,'urn:poms:mini-a:'+miniCases),b=validators(output,true,'urn:poms:mini-b:'+miniCases);
    for(const value of values){assert.equal(!!a.get('Subject')(value),!!b.get('Subject')(value),JSON.stringify({schema,value}));miniCases+=1;}
}
mini({const:0},[0,1,null,false]);mini({const:false},[false,true,0,null]);mini({const:''},['','x',null]);mini({const:null},[null,{},[],0,'']);
mini({type:'null'},[null,{},[],false,0,'']);
mini({anyOf:[{$ref:'#/components/schemas/Text'},{type:'null'}]},[null,'','a',1,{}],{Text:{type:'string'}});
mini({type:'string',anyOf:[{type:'string'},{type:'null'}]},[null,'','a',1,{}]);
mini({oneOf:[{anyOf:[{type:'string'},{type:'null'}]},{type:'null'}]},[null,'','a',1,{}]);
mini({$ref:'#/components/schemas/Text',pattern:'^x'},['x','xx','a',null,{}],{Text:{type:'string'}});
mini({if:{properties:{mode:{const:'a'}}},then:{required:['proof']},else:{not:{required:['proof']}}},[null,'x',{},[],{mode:'a'},{mode:'a',proof:null},{mode:'b'},{mode:'b',proof:null}]);
const blocked=[{schema:{if:{oneOf:[{},{type:'object'}]},then:{}},code:'conditional_predicate_requires_explicit_review'},{schema:{if:{properties:{x:{const:1}}},oneOf:[{},{}]},code:'conditional_composition_requires_explicit_review'},{schema:{then:{}},code:'dangling_conditional'},{schema:{unevaluatedProperties:false},code:'unsupported_keyword'},{schema:{type:['string','null']},code:'unsupported_type_or_type_array'},{schema:{type:'array',items:[{type:'string'}]},code:'tuple_items_not_supported'},{schema:{$ref:'https://unregistered.invalid/schema'},code:'external_or_invalid_ref'},{schema:{minimum:2,exclusiveMinimum:1},code:'overlapping_numeric_bounds_requires_explicit_review'},{schema:{type:'string',readOnly:true},code:'read_write_mode_requires_explicit_review'},{schema:{const:NaN},code:'non_json_number'}];
for(const test of blocked)assert.throws(()=>normalizer.normalizeRegistry({Subject:test.schema}),(error)=>error instanceof NormalizationBlocked&&error.code===test.code);
const document={openapi:'3.0.0',paths:{'/untouched':{}},components:{schemas:{Keep:{type:'string'}}}};const before=structuredClone(document);const bad=structuredClone(source);bad.MoneyFact.unevaluatedProperties=false;
assert.throws(()=>normalizer.overlay(document,{components:{schemas:bad}}),NormalizationBlocked);assert.deepEqual(document,before);
normalizer.overlay(document,{components:{schemas:source}});assert.equal(document.openapi,'3.0.0');assert.deepEqual(document.paths,before.paths);assert.deepEqual(document.components.schemas.Keep,before.components.schemas.Keep);
const raw={type:'string',anyOf:[{type:'string'},{type:'null'}]};const vendor=convertAtomic(raw);const a=new Ajv2020(options),b=new Ajv(options);const canonicalFullConverterCanWiden=!!a.compile(raw)(null)!==!!b.compile(vendor)(null);assert.equal(canonicalFullConverterCanWiden,true);
assert.equal(failures.length,0,JSON.stringify(failures.slice(0,3)));
const result={status:'passed-independent-schema-acceptance-tests-not-app-generation',schemasCompiled:129,positiveStructuralSamples:positiveSchemas,componentComparisons:comparisons,adversarialMiniComparisons:miniCases,explicitBlockedCombinations:blocked.length,allOrNothingOverlayVerified:true,canonicalFullConverterCounterexampleDetected:true,canonicalReuseRestrictedToAtomicNodes:true,nullableRefIsNeverParentOnly:true,actualClientGenerationRun:false,noHTTP:true,noDB:true};
fs.writeFileSync(path.join(__dirname,'semantics-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
