// Real generated enum values + real canonical parsing, synthetic request fixtures.
// No HTTP/client service, actor authorization or database acceptance is exercised.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const installed=createRequire('E:/projects/poms/package.json'),ts=installed('typescript'),root='E:/projects/worktrees/poms-r3hijk-next28/poms',own=__dirname;
const helperFile=path.join(own,'proposed/apps/poms-admin/src/app/features/project/project-governance-client-values.ts');
const enumFiles=new Map(),modelDir=path.join(root,'libs/shared/api-client/model');
for(const file of fs.readdirSync(modelDir).filter(n=>n.endsWith('.ts'))){const full=path.join(modelDir,file),source=fs.readFileSync(full,'utf8'),ast=ts.createSourceFile(full,source,ts.ScriptTarget.Latest,true);for(const node of ast.statements)if(ts.isEnumDeclaration(node))enumFiles.set(node.name.text,full);}
const enumNamespace={},cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const source=fs.readFileSync(file,'utf8'),js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;function req(n){if(n==='@poms/shared-api-client')return enumNamespace;if(n==='@poms/shared-contracts')return load(path.join(root,'libs/shared/contracts/src/index.ts'));if(n.startsWith('.')){const base=path.resolve(path.dirname(file),n);for(const f of [base,base+'.ts',path.join(base,'index.ts')])if(fs.existsSync(f)&&fs.statSync(f).isFile())return load(f);throw new Error(n);}return installed(n);}vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:file})(req,module,module.exports);return module.exports;}
const used=new Set([...fs.readFileSync(helperFile,'utf8').matchAll(/Api\.([A-Za-z][A-Za-z0-9_]*)/g)].map(m=>m[1]));
for(const name of used)if(enumFiles.has(name))Object.assign(enumNamespace,load(enumFiles.get(name)));
const c=load(path.join(root,'libs/shared/contracts/src/index.ts')),v=load(helperFile);
const schemas=JSON.parse(fs.readFileSync(path.resolve(own,'../../shared-g2-130/public-contracts.g2-130.schema.json'),'utf8')).components.schemas;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function sample(s){if(s.$ref)return sample(schemas[s.$ref.split('/').pop()]);if('const'in s)return s.const;if(s.enum)return s.enum[0];if(s.anyOf||s.oneOf){const b=s.anyOf||s.oneOf;return sample(b.find(x=>x.type==='null')??b[0]);}if(s.allOf?.length===1&&!s.type&&!s.properties)return sample(s.allOf[0]);if(s.type==='null')return null;if(s.type==='array')return Array.from({length:s.minItems??0},()=>sample(s.items));if(s.type==='object'||s.properties){const o={};for(const k of s.required??[])o[k]=sample(s.properties[k]);return o;}if(s.type==='boolean')return false;if(s.type==='integer'||s.type==='number')return s.minimum??0;if(s.type==='string'){if(s.format==='uuid')return id(1);if(s.format==='date')return'2026-11-07';if(s.format==='date-time')return'2026-11-07T00:00:00Z';if(s.pattern?.includes('{64}'))return'a'.repeat(64);if(s.pattern?.includes('[0-9]{2}'))return'0.00';return'x'.repeat(s.minLength??1);}throw new Error('Unsupported fixture');}
let cases=0;function check(action){action();cases++;}
const wire=o=>JSON.parse(JSON.stringify(o));
function verify(name,fn,patch={}){const input=c[name+'Schema'].parse({...sample(schemas[name]),...patch});const output=fn(input);check(()=>assert.deepEqual(wire(c[name+'Schema'].parse(output)),wire(input)));return{input,output};}
verify('ActivateOperatingBaselinePackageRequest',v.activate);
verify('CreateProjectOperatingSnapshotRequest',v.snapshot,{snapshotMode:'realtime',periodKey:null});
verify('CreatePeriodClosingSnapshotRequest',v.period,{periodKey:'2026-10'});
verify('CreateOperatingRestatementRequest',v.restatement,{scope:'live',periodEndSnapshotRef:null});
verify('ReviewOperatingSignalEvaluationRequest',v.signalReview);
verify('ReviewCommissionGateBindingRequest',v.gateReview);
verify('ConfirmReceiptRecordRequest',v.receipt);
verify('StartProjectExecutionRequest',v.execution);
verify('StartProjectAcceptanceRequest',v.acceptanceAdmission);
verify('CreateAcceptanceRecordRequest',v.acceptance,{acceptanceResult:'accepted'});
verify('CreateProjectCompletionRecordRequest',v.completion,{completionResult:'completed'});
verify('CreateProjectArchiveRecordRequest',v.archive);
verify('ReplaceProjectArchiveRecordRequest',v.replaceArchive);
verify('VoidProjectArchiveRecordRequest',v.voidArchive);
verify('CloseProjectCompletionConditionRequest',v.closeCondition);
verify('CreateCommissionRoleAssignmentRequest',v.createRole,{participants:[{userId:id(23),roleType:'execution-owner',weight:1,responsibilitySummary:'模拟职责',zeroWeightReason:null}]});
verify('FreezeCommissionRoleAssignmentRequest',v.freezeRole);
const cost={...sample(schemas.CostDecisionInput),target:{kind:'ProjectActualCostRecord',id:id(20),expectedVersion:2,payloadHash:'a'.repeat(64)},decision:'include',recognitionRole:'direct-source',reasonCode:'actual-payment'};
const snapshot=verify('CreateProjectOperatingSnapshotRequest',v.snapshot,{snapshotMode:'realtime',periodKey:null,costDecisions:[cost]});
check(()=>assert.equal('effectiveContractTotal'in snapshot.output,false));
check(()=>assert.equal('includedCostTotal'in snapshot.output,false));
const source={kind:'source',sourceType:'project-stage-record',sourceId:id(21),sourceVersion:2,businessDate:'2026-11-07',reason:'引用真实来源的模拟单元输入'};
const manual={kind:'manual',businessDate:'2026-11-07',reason:'模拟质性说明',evidenceSummary:'模拟附件记录',attachmentIds:[id(22)]};
const stage=sample(schemas.StageReclassificationCorrection);stage.request={...stage.request,attributionEvidence:source};
const tax=sample(schemas.TaxTreatmentReplacementCorrection);tax.request={...tax.request,taxImpactAmount:'0.00',currency:'HKD',sourceReferences:[source,manual]};
verify('CreateOperatingRestatementRequest',v.restatement,{scope:'live',periodEndSnapshotRef:null,stageCorrections:[stage],taxCorrections:[tax],affectedTargets:[{...sample(schemas.AffectedRestatementTarget),costDecisions:[cost]}]});
const review={policyVersion:'r4h-operating-v1',issueCodes:['qualitative-materiality-unassessed'],riskDecision:'attention',evidenceRefs:[{kind:'Attachment',id:id(22),rowVersion:2,payloadHash:'c'.repeat(64)}],rationale:'模拟质性复核输入，不是实际业务认证'};
verify('ReviewOperatingSignalEvaluationRequest',v.signalReview,{manualMaterialityReview:review});
for(const [name,members]of Object.entries(enumNamespace))if(used.has(name)&&Object.values(members).every(x=>typeof x==='string'))for(const member of Object.values(members))check(()=>assert.equal(v.generatedEnum(member,members),member));
check(()=>assert.throws(()=>v.generatedEnum('invented-decision',enumNamespace.CostDecisionInputDecisionEnum),/枚举/));
const role={...sample(schemas.CreateCommissionRoleAssignmentRequest),participants:[{userId:id(23),roleType:'execution-owner',weight:1,responsibilitySummary:'模拟职责'}]};
check(()=>assert.equal(c.CreateCommissionRoleAssignmentRequestSchema.safeParse(v.createRole(c.CreateCommissionRoleAssignmentRequestSchema.parse(role))).success,true));
check(()=>assert.throws(()=>v.createRole({...role,participants:[{...role.participants[0],weight:0}]})));
const helperAst=ts.createSourceFile(helperFile,fs.readFileSync(helperFile,'utf8'),ts.ScriptTarget.Latest,true);let casts=0,any=0;function visit(node){if(ts.isAsExpression(node)||ts.isTypeAssertionExpression(node))casts++;if(node.kind===ts.SyntaxKind.AnyKeyword)any++;ts.forEachChild(node,visit);}visit(helperAst);check(()=>assert.equal(casts,0));check(()=>assert.equal(any,0));
const result={status:'passed-S5-real-enum-and-canonical-request-unit-only',cases,helperSHA256:createHash('sha256').update(fs.readFileSync(helperFile)).digest('hex'),enumFileSHA256:Object.fromEntries([...new Set([...used].filter(n=>enumFiles.has(n)).map(n=>enumFiles.get(n)))].map(file=>[path.relative(root,file).replaceAll('\\','/'),createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),syntheticFixtures:true,noHTTP:true,noDB:true,noGeneratedSchemaWeakening:true};
fs.writeFileSync(path.join(own,'client-values-unit03.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,cases}));
