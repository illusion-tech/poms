const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const installed=createRequire('E:/projects/poms/package.json');
installed('reflect-metadata');
const ts=installed('typescript');
const root='E:/projects/worktrees/poms-r3hijk-next28/poms';
const candidate=process.argv.includes('--candidate');
function physical(file){const rel=path.relative(root,file);const proposed=path.join(__dirname,'proposed',rel);return candidate&&!rel.startsWith('..')&&fs.existsSync(proposed)?proposed:file;}
const cache=new Map();
function load(file){
  file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const source=fs.readFileSync(physical(file),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,emitDecoratorMetadata:true,esModuleInterop:true}}).outputText;
  function ownRequire(name){
    if(name==='@poms/shared-contracts')return load(path.join(root,'libs/shared/contracts/src/index.ts'));
    if(name==='@poms/vendor-nestjs-zod')return load(path.join(root,'libs/vendor/nestjs-zod/src/index.ts'));
    if(name.startsWith('.')){const base=path.resolve(path.dirname(file),name);for(const f of [base,base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(f)&&fs.statSync(f).isFile())return load(f);throw new Error(name);}
    return installed(name);
  }
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:file})(ownRequire,module,module.exports);
  return module.exports;
}
const swaggerRoot=path.dirname(installed.resolve('@nestjs/swagger'));
const {SchemaObjectFactory}=installed(path.join(swaggerRoot,'services/schema-object-factory.js'));
const {ModelPropertiesAccessor}=installed(path.join(swaggerRoot,'services/model-properties-accessor.js'));
const {SwaggerTypesMapper}=installed(path.join(swaggerRoot,'services/swagger-types-mapper.js'));
const factory=new SchemaObjectFactory(new ModelPropertiesAccessor(),new SwaggerTypesMapper());
const {cleanupOpenApiDoc}=load(path.join(root,'libs/vendor/nestjs-zod/src/cleanupOpenApiDoc.ts'));
const dto=load(path.join(root,process.argv.includes('--all')?'libs/api/contracts/src/index.ts':'libs/api/contracts/src/lib/project/project.dto.ts'));
const schemas={};
const result=[];
for(const [name,type] of Object.entries(dto)){
  if(!type?.isZodDto)continue;
  const one={};factory.exploreModelSchema(type,one);
  try{
    const cleaned=cleanupOpenApiDoc({openapi:'3.0.0',paths:{},components:{schemas:one}});
    if(cleaned.components.schemas.AcceptanceRecordSummary)result.push({name,schema:cleaned.components.schemas.AcceptanceRecordSummary});
  }catch(e){result.push({name,error:e.message});}
  Object.assign(schemas,one);
}
fs.writeFileSync(path.join(__dirname,`acceptance-metadata-${candidate?'corrected':'original'}.json`),JSON.stringify(result,null,2)+'\n');
let report;
try{const cleaned=cleanupOpenApiDoc({openapi:'3.0.0',paths:{},components:{schemas}});report={status:'passed',rawSchemas:Object.keys(schemas).length,cleanedSchemas:Object.keys(cleaned.components.schemas).length};}
catch(e){report={status:'failed',message:e.message};}
if(candidate){
  assert.equal(report.status,'passed');
  assert.deepEqual(result[0].schema,result[1].schema);
  assert.equal(result[0].schema.properties.id.type,'string');
  assert.deepEqual(result[0].schema.additionalProperties,{});
  const altered=structuredClone(schemas);
  const originalList=altered.AcceptanceRecordListDto;
  const marker='x-nestjs_zod-$defs';
  originalList.properties.root[marker].AcceptanceRecordSummary.required.push('forced-conflict');
  assert.throws(()=>cleanupOpenApiDoc({openapi:'3.0.0',paths:{},components:{schemas:altered}}),/Found multiple schemas with name `AcceptanceRecordSummary`/);
  const parameterDocument=cleanupOpenApiDoc({openapi:'3.0.0',components:{schemas:{}},paths:{'/test':{get:{parameters:[{in:'query',name:'code','x-nestjs_zod-original-type':'string',schema:{allOf:[{pattern:'x'},{pattern:'y'}]}}],responses:{}}}}});
  const parameter=parameterDocument.paths['/test'].get.parameters[0];
  assert.equal(parameter.schema.type,'string');
  assert.equal('x-nestjs_zod-original-type'in parameter,false);
  const withSchemaProperty=load(path.join(root,'libs/vendor/nestjs-zod/src/dto.ts')).createZodDto(installed('zod').object({id:installed('zod').string()}).catchall(installed('zod').number()));
  const propertySchema={};factory.exploreModelSchema(withSchemaProperty,propertySchema);
  const restored=cleanupOpenApiDoc({openapi:'3.0.0',paths:{},components:{schemas:propertySchema}});
  assert.deepEqual(Object.values(restored.components.schemas)[0].additionalProperties,{type:'number'});
  report.assertions=7;
}
fs.writeFileSync(path.join(__dirname,`cleanup-${candidate?'corrected':'original'}${process.argv.includes('--all')?'-all':''}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
console.log(JSON.stringify(result.map(v=>({name:v.name,error:v.error,keys:Object.keys(v.schema??{})}))));
