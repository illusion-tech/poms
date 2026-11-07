// Actual Zod/Nest-free parsing checks only; no server, HTTP, SQL or business actor proof.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const installed=createRequire('E:/projects/poms/package.json'),ts=installed('typescript'),own=__dirname;
const plan=JSON.parse(fs.readFileSync(path.join(own,'plan130.json'),'utf8')),root=plan.productReadRoot,proposed=path.join(own,'proposed'),cache=new Map();
function physical(file){const rel=path.relative(root,file),candidate=path.join(proposed,rel);return !rel.startsWith('..')&&fs.existsSync(candidate)?candidate:file;}
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const js=ts.transpileModule(fs.readFileSync(physical(file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;function req(n){if(n.startsWith('.')){const base=path.resolve(path.dirname(file),n);for(const f of [base,base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(physical(f))&&fs.statSync(physical(f)).isFile())return load(f);throw new Error(n);}return installed(n);}vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:file})(req,module,module.exports);return module.exports;}
const main=load(path.join(root,plan.canonicalTarget)),generated=load(path.join(root,plan.generatedTarget));
const schemas=JSON.parse(fs.readFileSync(path.join(own,'public-contracts.g2-130.schema.json'),'utf8')).components.schemas;
let cases=0;function check(fn){fn();cases++;}
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function sample(s){if(s.$ref)return sample(schemas[s.$ref.split('/').pop()]);if('const'in s)return s.const;if(s.enum)return s.enum[0];if(s.anyOf||s.oneOf){const branches=s.anyOf||s.oneOf;return sample(branches.find(v=>v.type==='null')??branches[0]);}if(s.allOf?.length===1&&!s.type&&!s.properties)return sample(s.allOf[0]);if(s.type==='null')return null;if(s.type==='array')return[];if(s.type==='object'||s.properties){const v={};for(const k of s.required??[])v[k]=sample(s.properties[k]);return v;}if(s.type==='boolean')return false;if(s.type==='integer'||s.type==='number')return s.minimum??0;if(s.type==='string'){if(s.format==='uuid')return id(1);if(s.format==='date')return'2026-11-07';if(s.format==='date-time')return'2026-11-07T00:00:00Z';if(s.pattern?.includes('{64}'))return'a'.repeat(64);return'x'.repeat(s.minLength??1);}throw new Error('Unsupported fixture');}
for(const name of plan.names)check(()=>assert.equal(main[name+'Schema'],generated[name+'Schema']));
const full=sample(schemas.FullProjectDetailView);
check(()=>assert.equal(main.FullProjectDetailViewSchema.safeParse(full).success,true));
check(()=>{const missing={...full};delete missing.executionAdmissionContext;assert.equal(main.FullProjectDetailViewSchema.safeParse(missing).success,false);});
check(()=>assert.equal(main.FullProjectDetailViewSchema.safeParse({...full,executionAdmissionContext:undefined}).success,false));
const context={handoverStageRecordId:id(11),handoverSummarySnapshotId:id(12),expectedRoleAssignmentVersion:7,commissionRoleAssignmentId:id(13),sourceHandoverId:id(14),sourcePayloadHash:'b'.repeat(64)};
check(()=>assert.equal(main.ExecutionAdmissionContextViewSchema.safeParse(context).success,true));
check(()=>assert.equal(main.FullProjectDetailViewSchema.safeParse({...full,executionAdmissionContext:context}).success,true));
check(()=>assert.equal(main.StartProjectExecutionRequestSchema.safeParse({...context,inputVersion:'server-derived-v1',expectedProjectVersion:5,reason:'实际执行负责人确认'}).success,true));
check(()=>assert.deepEqual(Object.keys(schemas.ExecutionAdmissionContextView.properties).sort(),Object.keys(schemas.StartProjectExecutionRequest.properties).filter(k=>!['inputVersion','expectedProjectVersion','reason'].includes(k)).sort()));
check(()=>assert.equal(main.ExecutionAdmissionContextViewSchema.safeParse({...context,weights:[1]}).success,false));
check(()=>assert.equal(main.ExecutionAdmissionContextViewSchema.safeParse({...context,sourcePayloadHash:null}).success,false));
check(()=>assert.equal(main.ExecutionAdmissionContextViewSchema.safeParse({...context,expectedRoleAssignmentVersion:0}).success,false));
check(()=>assert.equal(main.ExecutionAdmissionContextViewSchema.safeParse({...context,expectedRoleAssignmentVersion:2147483648}).success,false));
const creator=sample(schemas.CreatorFirstAssignmentAnchorView),legacy=sample(schemas.LegacyOwnerAnchorView);
check(()=>assert.equal(main.ProjectDetailViewSchema.safeParse(creator).success,true));
check(()=>assert.equal(main.ProjectDetailViewSchema.safeParse({...creator,executionAdmissionContext:context}).success,false));
check(()=>assert.equal(main.ProjectDetailViewSchema.safeParse(legacy).success,true));
check(()=>assert.equal(main.ProjectDetailViewSchema.safeParse({...legacy,executionAdmissionContext:null}).success,false));
const upload={operationType:'create-attachment',targetType:'project',targetId:id(1),originalName:'closure.pdf',mimeType:'application/pdf',sizeBytes:12,category:'acceptance',completionConditionContext:{completionRecordId:id(20),conditionId:id(21)}};
check(()=>assert.equal(main.CreateAttachmentUploadSessionRequestSchema.safeParse(upload).success,true));
check(()=>assert.equal(main.CompletionConditionAttachmentContextSchema.safeParse({...upload.completionConditionContext,projectId:id(1)}).success,false));
check(()=>assert.equal(main.CreateAttachmentUploadSessionRequestSchema.safeParse({...upload,targetType:'contract'}).success,false));
check(()=>assert.equal(main.CreateAttachmentUploadSessionRequestSchema.safeParse({...upload,baseAttachmentId:id(22)}).success,false));
check(()=>assert.equal(main.CreateAttachmentUploadSessionRequestSchema.safeParse({...upload,operationType:'create-version',baseAttachmentId:id(22)}).success,false));
check(()=>assert.equal(main.SensitiveStringFieldProjectionSchema.safeParse({fieldPackageKey:'operating-finance',mode:'masked',value:'1.00',displayText:'隐藏',reasonCode:'missing-sensitive-read-permission'}).success,false));
check(()=>assert.deepEqual([...main.PROJECT_STAGES],schemas.ProjectStage.enum));
check(()=>assert.equal(main.ProjectStageLabel['conditional-completed'],'有条件完成'));
const source=fs.readFileSync(path.join(proposed,plan.canonicalTarget),'utf8');
check(()=>assert.equal((source.match(/export const CompletionConditionAttachmentContextSchema/g)??[]).length,1));
const result={status:'passed-canonical130-parser-unit-only',cases,schemaReexports:130,requiredNullablePreserved:true,contextualR2Preserved:true,noHTTP:true,noDB:true,notActorAuthorizationAcceptance:true};fs.writeFileSync(path.join(own,'runtime130.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
