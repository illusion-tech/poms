// Parser/protocol/metadata unit checks only. No HTTP, authentication, DB or
// business producer is executed. All referenced libraries are the real ones.
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');const {createRequire}=require('node:module');
const installed=createRequire('E:/projects/poms/package.json');installed('reflect-metadata');const ts=installed('typescript');const z=installed('zod');const own=__dirname;
const plan=JSON.parse(fs.readFileSync(path.join(own,'shared-g2-plan.json'),'utf8'));const root=plan.productReadRoot;const proposed=path.join(own,'proposed');const cache=new Map();
function physical(file){const relative=path.relative(root,file);const other=path.join(proposed,relative);return !relative.startsWith('..')&&fs.existsSync(other)?other:file;}
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const text=fs.readFileSync(physical(file),'utf8');const js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,emitDecoratorMetadata:true,esModuleInterop:true}}).outputText;
    const ownRequire=(name)=>{if(name==='@poms/shared-contracts')return load(path.join(root,'libs/shared/contracts/src/index.ts'));if(name==='@poms/vendor-nestjs-zod')return load(path.join(root,'libs/vendor/nestjs-zod/src/index.ts'));if(name.startsWith('.')){const base=path.resolve(path.dirname(file),name);for(const target of[base,`${base}.ts`,path.join(base,'index.ts')])if(fs.existsSync(physical(target))&&fs.statSync(physical(target)).isFile())return load(target);throw new Error(`Unresolved ${name}`);}return installed(name);};
    vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:file})(ownRequire,module,module.exports);return module.exports;
}
const canonical=load(path.join(root,'libs/shared/contracts/src/lib/shared-contracts.ts'));
const legacy=load(path.join(root,plan.privateNativeTarget));
const guard=load(path.join(root,'apps/poms-api/src/app/core/rust-r4ghi-native-protocol.guard.ts'));
const dto=load(path.join(root,'libs/api/contracts/src/lib/project/project.dto.ts'));
const source=JSON.parse(fs.readFileSync(path.join(own,'public-contracts.g2-129.schema.json'),'utf8')).components.schemas;
let cases=0;function check(action){action();cases+=1;}
const id='00000000-0000-4000-8000-000000000001';
const anchor={scopeKind:'legacy-owner-anchor-only',projectId:id,projectNo:'P-legacy',projectName:'旧责任锚点',currentStage:'assessment',rowVersion:1,ownerUserId:id,ownerOrgId:null,sourceQualification:'legacy-unverified',allowedActions:[],explanation:'仅最小旧责任锚点'};
check(()=>assert.equal(canonical.ProjectDetailViewSchema.safeParse(anchor).success,true));
check(()=>assert.equal(canonical.ProjectDetailViewSchema.safeParse({...anchor,ownerOrgId:id}).success,false));
check(()=>assert.equal(canonical.ProjectDetailViewSchema.safeParse({...anchor,financialFacts:{value:'forbidden'}}).success,false));
check(()=>assert.equal(canonical.ProjectDetailViewSchema.safeParse({...anchor,allowedActions:['reassign-owner']}).success,false));
check(()=>assert.deepEqual([...canonical.PROJECT_STAGES],source.ProjectStage.enum));
check(()=>assert.deepEqual([...canonical.OPERATING_RISK_LEVELS],source.OperatingRiskLevel.enum));
check(()=>assert.deepEqual([...canonical.OPERATING_SIGNAL_LEVELS],source.OperatingSignalLevel.enum));
check(()=>assert.equal(canonical.ProjectStageLabel['conditional-completed'],'有条件完成'));
check(()=>assert.equal(canonical.OperatingRiskLevelLabel.unknown,'未知'));
check(()=>assert.equal(canonical.OperatingRiskLevelLabel.normal,'正常'));
check(()=>assert.notEqual(canonical.OperatingRiskLevelSeverity.unknown,canonical.OperatingRiskLevelSeverity.normal));
check(()=>assert.equal(canonical.SensitiveStringFieldProjectionSchema.safeParse({fieldPackageKey:'operating-finance',mode:'masked',value:'1.00',displayText:'隐藏',reasonCode:'missing-sensitive-read-permission'}).success,false));
function minimal(schema){if(schema.$ref)return minimal(source[schema.$ref.split('/').pop()]);if('const'in schema)return schema.const;if(schema.enum)return schema.enum[0];if(schema.anyOf||schema.oneOf)return minimal((schema.anyOf||schema.oneOf)[0]);if(schema.type==='null')return null;if(schema.type==='array')return[];if(schema.type==='object'||schema.properties){const result={};for(const key of schema.required??[])result[key]=minimal(schema.properties[key]);return result;}if(schema.type==='boolean')return false;if(schema.type==='integer'||schema.type==='number')return schema.minimum??0;if(schema.type==='string'){if(schema.format==='uuid')return id;if(schema.format==='date')return'2026-11-07';if(schema.format==='date-time')return'2026-11-07T00:00:00Z';if(schema.pattern?.includes('{64}'))return'a'.repeat(64);return'x'.repeat(schema.minLength??1);}throw new Error('Unsupported structural fixture');}
const preparation=minimal(source.OperatingPreparation);
preparation.periodKey=null;
check(()=>{const parsed=canonical.OperatingPreparationSchema.safeParse(preparation);assert.equal(parsed.success,true,JSON.stringify(parsed.error?.issues));});
check(()=>{const missing={...preparation};delete missing.proposedAffectedTargets;assert.equal(canonical.OperatingPreparationSchema.safeParse(missing).success,false);});
for(const name of['ProjectDetailViewDto','ProjectCompletionRecordListDto','CloseProjectCompletionConditionResultDto']){
    check(()=>assert.equal(dto[name].name,name));
    check(()=>assert.equal(typeof dto[name]._OPENAPI_METADATA_FACTORY(),'object'));
}
check(()=>assert.equal(dto.ProjectDetailViewDto.schema,canonical.ProjectDetailViewSchema));
check(()=>assert.match(JSON.stringify(z.toJSONSchema(canonical.ProjectDetailViewSchema)),/LegacyOwnerAnchorView/));
const protocol=new guard.RustR4GhiNativeProtocolGuard();
function context(body,name='reviewOperatingSignalEvaluation'){const handler=function(){};Object.defineProperty(handler,'name',{value:name});return{switchToHttp:()=>({getRequest:()=>({body})}),getHandler:()=>handler};}
function unsupported(action){assert.throws(action,(error)=>error.getStatus?.()===422);}
check(()=>assert.equal(protocol.canActivate(context({reviewComment:'旧协议'})),true));
check(()=>unsupported(()=>protocol.canActivate(context({inputVersion:'server-derived-v1'}))));
check(()=>unsupported(()=>protocol.canActivate(context({attributionEvidence:{kind:'source',sourceType:'project-stage-record'}}))));
check(()=>unsupported(()=>protocol.canActivate(context({attributionEvidence:{kind:'source',sourceType:' project-stage-record '}}))));
check(()=>assert.equal(protocol.canActivate(context({attributionEvidence:{kind:'source',sourceType:'execution'}})),true));
for(const name of['startExecution','startAcceptance','closeCompletionCondition'])check(()=>unsupported(()=>protocol.canActivate(context({},name))));
check(()=>unsupported(()=>guard.parseR4GhiFrozenNativeValue(legacy.OperatingSignalLevelSchema,'unknown')));
check(()=>unsupported(()=>guard.parseR4GhiFrozenNativeValue(legacy.ProjectStageSchema,'conditional-completed')));
check(()=>unsupported(()=>guard.parseR4GhiFrozenNativeValue(legacy.ProjectOperatingSnapshotSummarySchema.shape.taxImpactPendingAmount,null)));
check(()=>assert.equal(guard.parseR4GhiFrozenNativeValue(legacy.ProjectOperatingSnapshotSummarySchema.shape.taxImpactPendingAmount,'0.00'),'0.00'));
const {overlayExactR4GhiPublicSchemas}=require('./overlay-exact-public-schemas.cjs');const document={openapi:'3.1.0',components:{schemas:{PreservedExisting:{type:'string'}}}};
overlayExactR4GhiPublicSchemas(document,{components:{schemas:source}});
check(()=>assert.deepEqual(document.components.schemas.ProjectDetailView,source.ProjectDetailView));
check(()=>assert.deepEqual(document.components.schemas.MoneyFact.allOf,source.MoneyFact.allOf));
check(()=>assert.deepEqual(document.components.schemas.PreservedExisting,{type:'string'}));
check(()=>assert.throws(()=>overlayExactR4GhiPublicSchemas({openapi:'3.0.0'},{components:{schemas:source}}),/OAS3.0/));
const result={status:'passed-parser-protocol-metadata-unit-only',cases,noHTTP:true,noDB:true,modernSchemas:129};fs.writeFileSync(path.join(own,'runtime-unit-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
