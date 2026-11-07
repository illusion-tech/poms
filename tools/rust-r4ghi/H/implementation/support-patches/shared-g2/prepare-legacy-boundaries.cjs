// Checked reads into the frozen Native world. No casts, zero fillers, entity
// mutation or public-schema relaxation. Operates on proposed files only.
const fs=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');const crypto=require('node:crypto');
const installed=createRequire('E:/projects/poms/package.json');const ts=installed('typescript');const own=__dirname;
const plan=JSON.parse(fs.readFileSync(path.join(own,'shared-g2-plan.json'),'utf8'));const native=JSON.parse(fs.readFileSync(path.join(own,'native-ast-plan.json'),'utf8'));const root=plan.productReadRoot;const proposed=path.join(own,'proposed');
const pathFor=(file)=>{const relative=path.relative(root,file);const other=path.join(proposed,relative);return !relative.startsWith('..')&&fs.existsSync(other)?other:file;};
const config=ts.readConfigFile(path.join(root,'apps/poms-api/tsconfig.app.json'),ts.sys.readFile);const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.join(root,'apps/poms-api'));
const options={...parsed.options,noEmit:true,skipLibCheck:true,types:['node'],typeRoots:['E:/projects/poms/node_modules/@types']};const host=ts.createCompilerHost(options);const getSource=host.getSourceFile.bind(host);host.readFile=(file)=>ts.sys.readFile(pathFor(file));host.fileExists=(file)=>ts.sys.fileExists(pathFor(file));host.getSourceFile=(file,version,...rest)=>pathFor(file)!==file?ts.createSourceFile(file,host.readFile(file),version,true):getSource(file,version,...rest);host.resolveModuleNames=(names,containing)=>names.map((name)=>ts.resolveModuleName(name,containing,options,host).resolvedModule);
const program=ts.createProgram(native.files.map((file)=>path.join(root,file.path)),options,host);const checker=program.getTypeChecker();const editsByFile=new Map();const report=[];
function info(type,seen=new Set()) {if(seen.has(type))return {values:new Set(),optional:false};seen.add(type);const values=new Set();let optional=!!(type.flags&ts.TypeFlags.Undefined);if(type.flags&ts.TypeFlags.StringLiteral)values.add(type.value);for(const child of type.types??[]){const nested=info(child,seen);nested.values.forEach((value)=>values.add(value));optional||=nested.optional;}return {values,optional};}
function writing(node){const parent=node.parent;return (ts.isBinaryExpression(parent)&&parent.left===node&&parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment)||ts.isDeleteExpression(parent)||((ts.isPrefixUnaryExpression(parent)||ts.isPostfixUnaryExpression(parent))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(parent.operator));}
const selected=new Set(['commission/commission.service.ts','project-cost/project-cost.service.ts','project/project-query.service.ts','project/project.service.ts','project/project.controller.ts'].map((file)=>'apps/poms-api/src/app/features/'+file));
for(const relative of selected){const file=path.join(root,relative);const source=program.getSourceFile(file);if(!source)throw new Error(`No Native source ${relative}`);const edits=[];const schemas=new Set();
    const visit=(node)=>{
        if(ts.isPropertyAccessExpression(node)&&!writing(node)){
            const property=node.name.text;const types=info(checker.getTypeAtLocation(node));let schema;
            if(property==='currentStage'&&types.values.has('conditional-completed'))schema=`ProjectStageSchema${types.optional?'.optional()':''}`;
            if(property==='signalLevel'&&(types.values.has('normal')||types.values.has('unknown')))schema='OperatingSignalLevelSchema';
            if(property==='riskLevel'&&(types.values.has('normal')||types.values.has('unknown')))schema='OperatingRiskLevelSchema';
            if(property==='periodEndSnapshotId'&&relative.includes('project-cost.service'))schema='OperatingRestatementSummarySchema.shape.periodEndSnapshotId';
            if(property==='taxImpactPendingAmount')schema='ProjectOperatingSnapshotSummarySchema.shape.taxImpactPendingAmount';
            if(schema){edits.push({start:node.getStart(source),end:node.end,text:`parseR4GhiFrozenNativeValue(${schema}, ${node.getText(source)})`});schemas.add(schema.split('.')[0]);report.push({file:relative,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,kind:'checked-frozen-value-read',field:property,schema});return;}
        }
        ts.forEachChild(node,visit);
    };visit(source);
    if(edits.length){
        const present=new Set();for(const statement of source.statements){if(ts.isImportDeclaration(statement)&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings))statement.importClause.namedBindings.elements.forEach((specifier)=>present.add(specifier.name.text));}
        const rel=(target)=>{const value=path.relative(path.dirname(relative),target).replaceAll('\\','/').replace(/\.ts$/,'');return value.startsWith('.')?value:`./${value}`;};
        const fresh=[...schemas].filter((schema)=>!present.has(schema));if(fresh.length)edits.push({start:0,end:0,text:`import { ${fresh.join(', ')} } from ${JSON.stringify(rel(plan.privateNativeTarget))};\n`});
        if(!present.has('parseR4GhiFrozenNativeValue'))edits.push({start:0,end:0,text:`import { parseR4GhiFrozenNativeValue } from ${JSON.stringify(rel('apps/poms-api/src/app/core/rust-r4ghi-native-protocol.guard.ts'))};\n`});
        editsByFile.set(relative,{source:source.text,edits});
    }
}
// A typed constructor value supports a strict union; extending a constructor
// whose instance is a union is forbidden by TypeScript TS2509. Keep the exact
// factory/schema type and a stable Swagger constructor name instead.
const dtoRelative='libs/api/contracts/src/lib/project/project.dto.ts';const dtoPath=path.join(proposed,dtoRelative);const dtoText=fs.readFileSync(dtoPath,'utf8');const dto=ts.createSourceFile(dtoRelative,dtoText,ts.ScriptTarget.Latest,true);const unionNames=new Set(['ProjectDetailViewDto','ProjectCompletionRecordListDto','CloseProjectCompletionConditionResultDto']);const dtoEdits=[];
for(const node of dto.statements){if(ts.isClassDeclaration(node)&&node.name&&unionNames.has(node.name.text)){if(node.members.length)throw new Error('Nonempty union DTO cannot be rewritten implicitly');const base=node.heritageClauses?.find((clause)=>clause.token===ts.SyntaxKind.ExtendsKeyword)?.types[0].expression;if(!base||!ts.isCallExpression(base)||base.expression.getText(dto)!=='createZodDto')throw new Error('Unexpected union DTO factory');const name=node.name.text;dtoEdits.push({start:node.getStart(dto),end:node.end,text:`export const ${name} = ${base.getText(dto)};\nObject.defineProperty(${name}, 'name', { value: '${name}' });\nexport type ${name} = ReturnType<typeof ${name}.create>;`});report.push({file:dtoRelative,line:dto.getLineAndCharacterOfPosition(node.getStart(dto)).line+1,kind:'strict-union-constructor-value',name});}}
editsByFile.set(dtoRelative,{source:dtoText,edits:dtoEdits});
for(const [relative,entry]of editsByFile){entry.edits.sort((a,b)=>b.start-a.start||b.end-a.end);let text=entry.source;for(const edit of entry.edits)text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);fs.writeFileSync(path.join(proposed,relative),text);const record=native.files.find((file)=>file.path===relative);if(record)record.proposedSHA256=crypto.createHash('sha256').update(text).digest('hex');}
fs.writeFileSync(path.join(own,'legacy-value-boundaries.json'),JSON.stringify({status:'checked-legacy-boundary-proposal',changes:report,noEntityMutation:true,noCast:true,noNullToZero:true},null,2)+'\n');fs.writeFileSync(path.join(own,'native-ast-plan.json'),JSON.stringify(native,null,2)+'\n');console.log(JSON.stringify({checkedReadBoundaries:report.filter((entry)=>entry.kind==='checked-frozen-value-read').length,strictUnionDtos:report.filter((entry)=>entry.kind==='strict-union-constructor-value').length}));
