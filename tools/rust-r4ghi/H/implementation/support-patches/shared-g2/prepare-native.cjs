// Produce AST edits only in shared-g2/proposed; product inputs remain read-only.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {createRequire}=require('node:module');
const installed=createRequire('E:/projects/poms/package.json');const ts=installed('typescript');const own=__dirname;
const plan=JSON.parse(fs.readFileSync(path.join(own,'shared-g2-plan.json'),'utf8'));const root=plan.productReadRoot;const proposed=path.join(own,'proposed');
const prior=JSON.parse(fs.readFileSync(path.join(own,'../shared-native-candidate.json'),'utf8'));const schemaNames=new Set(plan.names);
const privateTarget=plan.privateNativeTarget;const guardTarget='apps/poms-api/src/app/core/rust-r4ghi-native-protocol.guard.ts';
const operations=JSON.parse(fs.readFileSync(path.join(root,'docs/design/rust-r4ghi/operation-map01.json'),'utf8')).operations;
const modernMethods=new Set(operations.filter((operation)=>operation.method==='POST').map((operation)=>operation.operationId));modernMethods.add('ContractFinanceController_confirmReceipt');
const sourceMethods=new Set(['ProjectCostController_confirmCostStageAttribution','ProjectCostController_reclassifyCostStageAttribution','ProjectCostController_confirmAccountingTaxTreatment','ProjectCostController_replaceAccountingTaxTreatment']);
const states=new Map();const changes=[];
function nodeName(node){return node&&(ts.isIdentifier(node)||ts.isStringLiteralLike(node))?node.text:'';}
function relative(from,to){const result=path.relative(path.dirname(from),to).replaceAll('\\','/').replace(/\.ts$/,'');return result.startsWith('.')?result:`./${result}`;}
function state(file){if(states.has(file))return states.get(file);const source=fs.readFileSync(path.join(root,file),'utf8');const value={path:file,source,ast:ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),edits:[],imports:new Map()};states.set(file,value);return value;}
function need(s,module,values=[],types=[]){const entry=s.imports.get(module)??{values:new Set(),types:new Set()};values.forEach((value)=>entry.values.add(value));types.forEach((value)=>entry.types.add(value));s.imports.set(module,entry);}
function decorators(node){return ts.canHaveDecorators(node)?ts.getDecorators(node)??[]:[];}
function called(node,name){return ts.isCallExpression(node.expression)&&node.expression.expression.getText()===name;}
const controllerFiles=new Set(prior.nativeSites.filter((entry)=>entry.path.endsWith('.controller.ts')).map((entry)=>entry.path));
controllerFiles.add('apps/poms-api/src/app/features/contract-finance/contract-finance.controller.ts');controllerFiles.add('apps/poms-api/src/app/features/project-handover/project-handover.controller.ts');

for(const entry of prior.nativeSites){const s=state(entry.path);for(const statement of s.ast.statements){if(ts.isImportDeclaration(statement)&&nodeName(statement.moduleSpecifier)==='@poms/shared-contracts')s.edits.push({start:statement.moduleSpecifier.getStart(s.ast),end:statement.moduleSpecifier.end,text:JSON.stringify(relative(entry.path,privateTarget))});}changes.push({file:entry.path,kind:'private-frozen-Native-imports',frozenRawSHA256:plan.legacyRawSHA256});}

for(const file of controllerFiles){
    const s=state(file);const priv=relative(file,privateTarget);const guard=relative(file,guardTarget);
    for(const cls of s.ast.statements.filter(ts.isClassDeclaration)){
        const className=nodeName(cls.name);
        for(const method of cls.members.filter(ts.isMethodDeclaration)){
            const id=`${className}_${nodeName(method.name)}`;const details={file,operationId:id};let guarded=modernMethods.has(id)||sourceMethods.has(id);
            for(const parameter of method.parameters){
                const body=decorators(parameter).find((decorator)=>called(decorator,'Body'));
                if(!body||!parameter.type||!ts.isTypeReferenceNode(parameter.type))continue;
                const dto=parameter.type.typeName.getText(s.ast);const legacyName=dto.endsWith('Dto')?dto.slice(0,-3):'';
                if(!schemaNames.has(legacyName))continue;
                // New-only commands have no sealed Native business request.
                if(!fs.readFileSync(path.join(proposed,privateTarget),'utf8').includes(`export type ${legacyName} `))continue;
                s.edits.push({start:parameter.type.getStart(s.ast),end:parameter.type.end,text:legacyName});
                s.edits.push({start:body.getStart(s.ast),end:body.end,text:`@Body(new ZodValidationPipe(${legacyName}Schema))`});
                need(s,priv,[`${legacyName}Schema`],[legacyName]);need(s,'@poms/vendor-nestjs-zod',['ZodValidationPipe']);
                if(!decorators(method).some((decorator)=>called(decorator,'ApiBody'))){s.edits.push({start:method.getStart(s.ast),end:method.getStart(s.ast),text:`@ApiBody({ type: ${dto} })\n    `});need(s,'@nestjs/swagger',['ApiBody']);}
                guarded=true;changes.push({...details,kind:'legacy-runtime-body-modern-Swagger',runtimeType:legacyName,swaggerDto:dto});
            }
            if(guarded){s.edits.push({start:method.getStart(s.ast),end:method.getStart(s.ast),text:'@UseGuards(RustR4GhiNativeProtocolGuard)\n    '});need(s,'@nestjs/common',['UseGuards']);need(s,guard,['RustR4GhiNativeProtocolGuard']);changes.push({...details,kind:sourceMethods.has(id)?'before-pipe-tag-and-stage-ledger-rejection':'before-pipe-tag-rejection'});}
        }
    }
}

const projectFile='apps/poms-api/src/app/features/project/project.controller.ts';const project=state(projectFile);const projectGuard=relative(projectFile,guardTarget);
const projectClass=project.ast.statements.find((node)=>ts.isClassDeclaration(node)&&nodeName(node.name)==='ProjectController');if(!projectClass)throw new Error('ProjectController not found');
const newMethods=`
    @Post(':id\\\\:startExecution')
    @HasPermissions('project:write')
    @UseGuards(RustR4GhiNativeProtocolGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: StartProjectExecutionRequestDto })
    @ApiOkResponse({ type: ProjectStageTransitionResultDto })
    @ApiOperation({ operationId: 'ProjectController_startExecution', summary: '进入执行（Native参考显式不支持）' })
    startExecution(@Param('id') id: string, @Body() body: unknown): never { void id; void body; return nativeR4GhiUnsupported('startExecution'); }

    @Post(':id\\\\:startAcceptance')
    @HasPermissions('project:write')
    @UseGuards(RustR4GhiNativeProtocolGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: StartProjectAcceptanceRequestDto })
    @ApiOkResponse({ type: ProjectStageTransitionResultDto })
    @ApiOperation({ operationId: 'ProjectController_startAcceptance', summary: '进入验收（Native参考显式不支持）' })
    startAcceptance(@Param('id') id: string, @Body() body: unknown): never { void id; void body; return nativeR4GhiUnsupported('startAcceptance'); }
`;
project.edits.push({start:projectClass.end-1,end:projectClass.end-1,text:newMethods});need(project,'@nestjs/common',['UseGuards','HttpCode','HttpStatus']);need(project,'@nestjs/swagger',['ApiBody']);need(project,projectGuard,['RustR4GhiNativeProtocolGuard','nativeR4GhiUnsupported']);
need(project,'@poms/api-contracts',['StartProjectExecutionRequestDto','StartProjectAcceptanceRequestDto','ProjectStageTransitionResultDto','CloseProjectCompletionConditionRequestDto','CloseProjectCompletionConditionResultDto']);
project.edits.push({start:project.source.length,end:project.source.length,text:`
@ApiTags('project')
@ApiCookieAuth('pomsSession')
@Controller()
export class ProjectCompletionRecordController {
    @Post('project-completion-records/:completionRecordId/conditions/:id\\\\:close')
    @HasPermissions('project:write')
    @UseGuards(RustR4GhiNativeProtocolGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBody({ type: CloseProjectCompletionConditionRequestDto })
    @ApiOkResponse({ type: CloseProjectCompletionConditionResultDto })
    @ApiOperation({ operationId: 'ProjectCompletionRecordController_closeCompletionCondition', summary: '关闭本人条件（Native参考显式不支持）' })
    closeCompletionCondition(@Param('completionRecordId') parent: string, @Param('id') id: string, @Body() body: unknown): never { void parent; void id; void body; return nativeR4GhiUnsupported('closeCompletionCondition'); }
}
`});
changes.push({file:projectFile,kind:'three-new-authenticated-Native-unsupported-methods',methodNames:['startExecution','startAcceptance','closeCompletionCondition']});

const projectModule=state('apps/poms-api/src/app/features/project/project.module.ts');need(projectModule,'./project.controller',['ProjectCompletionRecordController']);
const visit=(node)=>{if(ts.isPropertyAssignment(node)&&nodeName(node.name)==='controllers'&&ts.isArrayLiteralExpression(node.initializer))projectModule.edits.push({start:node.initializer.end-1,end:node.initializer.end-1,text:', ProjectCompletionRecordController'});ts.forEachChild(node,visit);};visit(projectModule.ast);

const dto=state('libs/api/contracts/src/lib/project/project.dto.ts');const additions=['StartProjectExecutionRequest','StartProjectAcceptanceRequest','ProjectStageTransitionResult','CloseProjectCompletionConditionRequest','CloseProjectCompletionConditionResult'];need(dto,'@poms/shared-contracts',additions.map((name)=>`${name}Schema`));dto.edits.push({start:dto.source.length,end:dto.source.length,text:'\n'+additions.map((name)=>`export class ${name}Dto extends createZodDto(${name}Schema) {}`).join('\n')+'\n'});

const manifest=[];
for(const s of states.values()){
    const localNames=new Set();for(const statement of s.ast.statements){if(ts.isImportDeclaration(statement)&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings))for(const specifier of statement.importClause.namedBindings.elements)localNames.add(specifier.name.text);}
    for(const [module,wanted]of s.imports){const values=[...wanted.values].filter((name)=>!localNames.has(name));const types=[...wanted.types].filter((name)=>!localNames.has(name)&&!values.includes(name));if(!values.length&&!types.length)continue;
        const names=[...values,...types.map((name)=>`type ${name}`)];s.edits.push({start:0,end:0,text:`import { ${names.join(', ')} } from ${JSON.stringify(module)};\n`});names.forEach((name)=>localNames.add(name.replace(/^type /,'')));
    }
    s.edits.sort((a,b)=>b.start-a.start||b.end-a.end);let output=s.source;for(const edit of s.edits)output=output.slice(0,edit.start)+edit.text+output.slice(edit.end);
    const target=path.join(proposed,s.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,output);manifest.push({path:s.path,sourceSHA256:crypto.createHash('sha256').update(s.source).digest('hex'),proposedSHA256:crypto.createHash('sha256').update(output).digest('hex')});
}
const guardFile=path.join(proposed,guardTarget);fs.mkdirSync(path.dirname(guardFile),{recursive:true});fs.copyFileSync(path.join(own,'native-protocol-guard.ts'),guardFile);
manifest.push({path:guardTarget,sourceSHA256:null,proposedSHA256:crypto.createHash('sha256').update(fs.readFileSync(guardFile)).digest('hex')});manifest.push({path:privateTarget,sourceSHA256:null,proposedSHA256:plan.legacyRawSHA256});
fs.writeFileSync(path.join(own,'native-ast-plan.json'),JSON.stringify({status:'Root-Native-proposal-not-applied',legacyImportSites:prior.nativeSites.length,files:manifest,changes,retainedImplicit201:['CommissionController_createRoleAssignment','ProjectController_createProjectArchiveRecord','ProjectArchiveRecordController_replaceProjectArchiveRecord','ProjectArchiveRecordController_voidProjectArchiveRecord'],guardOrder:'existing global SessionAuthGuard, AuthCsrfGuard, PermissionsGuard then method RustR4GhiNativeProtocolGuard then global/parameter Zod pipes'},null,2)+'\n');
console.log(JSON.stringify({status:'Root-Native-proposal-not-applied',files:manifest.length,legacyImportSites:prior.nativeSites.length,changes:changes.length}));
