from pathlib import Path
here=Path(__file__).resolve().parent
base=(here.parent/'check-facts.cjs').read_text(encoding='utf8')
base=base.replace("const cache=new Map();", """const cache=new Map();
const shared130=path.resolve(__dirname,'../../shared-g2-130/proposed');
function physical(file){const rel=path.relative(root,file),candidate=path.join(shared130,rel);return !rel.startsWith('..')&&fs.existsSync(candidate)?candidate:file;}""")
base=base.replace("fs.readFileSync(file,'utf8')", "fs.readFileSync(physical(file),'utf8')")
base=base.replace("'../shared-g2/public-contracts.g2-129.schema.json'", "'../../shared-g2-130/public-contracts.g2-130.schema.json'")
base=base[:base.index('const handover=c.ProjectHandoverDetailViewSchema')]+'''
const serverContext=c.ExecutionAdmissionContextViewSchema.parse({handoverStageRecordId:project.currentStageRecordId,handoverSummarySnapshotId:id(14),expectedRoleAssignmentVersion:4,commissionRoleAssignmentId:id(15),sourceHandoverId:id(13),sourcePayloadHash:'b'.repeat(64)});
const readyProject=c.FullProjectDetailViewSchema.parse({...project,executionAdmissionContext:serverContext});
check(()=>{const context=f.lifecycleContext(readyProject,true);assert.equal(context.executionAdmission,readyProject.executionAdmissionContext);assert.equal(context.executionAdmission.sourcePayloadHash,'b'.repeat(64));assert.equal(context.projectRowVersion,readyProject.projectRowVersion);});
check(()=>assert.equal(f.lifecycleContext({...readyProject,executionAdmissionContext:null},true).executionAdmission,null));
check(()=>assert.equal(f.lifecycleContext(readyProject,false).executionAdmission,null));
check(()=>assert.equal(f.lifecycleContext({...readyProject,currentStage:'execution'},true).executionAdmission,null));
check(()=>assert.equal(f.lifecycleContext({...readyProject,currentStageRecordId:id(99)},true).executionAdmission,null));
check(()=>{const context=f.lifecycleContext(readyProject,true);assert.equal(c.StartProjectExecutionRequestSchema.safeParse({...context.executionAdmission,inputVersion:'server-derived-v1',expectedProjectVersion:context.projectRowVersion,reason:'本人确认真实执行准入'}).success,true);});
check(()=>{const bad={...readyProject};delete bad.executionAdmissionContext;assert.equal(c.FullProjectDetailViewSchema.safeParse(bad).success,false);});
check(()=>assert.equal(c.FullProjectDetailViewSchema.safeParse({...readyProject,executionAdmissionContext:{...serverContext,weights:[1]}}).success,false));
const central=fs.readFileSync(path.join(__dirname,'proposed/apps/poms-admin/src/app/features/project/project-governance.ts'),'utf8');
check(()=>{const method=central.slice(central.indexOf('    private async loadLifecycleContext()'),central.indexOf('    refreshAfterLifecycle()'));assert.equal(method.includes('loadCurrent('),false);assert.equal(method.includes('loadHandover('),false);assert.equal(method.includes('roleApi('),false);});
const gateway=fs.readFileSync(path.join(__dirname,'proposed/apps/poms-admin/src/app/features/project/project-governance-api.ts'),'utf8');
check(()=>assert.match(gateway,/projectCompletionRecordControllerCloseCompletionCondition\\(\\{ id: conditionId, completionRecordId, closeProjectCompletionConditionRequest: body \\}\\)/));
const result={status:'passed-pure-UI-server-context-request-assembly-unit-only',cases,syntheticFixtures:true,noHTTP:true,noDB:true,noAuthorizationAcceptance:true,canonical130OverlayOnly:true};fs.writeFileSync(path.join(__dirname,'facts-unit02.json'),JSON.stringify(result,null,2)+'\\n');console.log(JSON.stringify(result));
'''
(here/'check-facts02.cjs').write_text(base,encoding='utf8',newline='\n')
