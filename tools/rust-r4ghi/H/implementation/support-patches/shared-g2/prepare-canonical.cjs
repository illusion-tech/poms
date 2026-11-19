const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {createRequire}=require('node:module');
const installed=createRequire('E:/projects/poms/package.json');const ts=installed('typescript');
const own=__dirname;const plan=JSON.parse(fs.readFileSync(path.join(own,'shared-g2-plan.json'),'utf8'));const root=plan.productReadRoot;
const relative='libs/shared/contracts/src/lib/shared-contracts.ts';const source=fs.readFileSync(path.join(root,relative),'utf8');const ast=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true);
const publicNames=new Set(plan.names);const schemaNames=new Set(plan.names.map((name)=>`${name}Schema`));const edits=[];const removed=[];
const retiredLegacyOnlyHelpers=new Set(['OperatingSnapshotAmountInputSchema','OperatingRestatementOverrideSchema','assertOperatingSnapshotBaselineSelection']);
for(const node of ast.statements){
    if(ts.isFunctionDeclaration(node)&&node.name&&retiredLegacyOnlyHelpers.has(node.name.text)){if(node.modifiers?.some((modifier)=>modifier.kind===ts.SyntaxKind.ExportKeyword))throw new Error('A public helper cannot be retired implicitly');edits.push({start:node.getFullStart(),end:node.end,text:''});removed.push(node.name.text);}
    if(ts.isTypeAliasDeclaration(node)&&publicNames.has(node.name.text)){edits.push({start:node.getFullStart(),end:node.end,text:''});removed.push(node.name.text);}
    if(ts.isVariableStatement(node)){
        const declarations=node.declarationList.declarations;const selected=declarations.filter((declaration)=>ts.isIdentifier(declaration.name)&&(schemaNames.has(declaration.name.text)||retiredLegacyOnlyHelpers.has(declaration.name.text)));
        if(selected.length){if(declarations.length!==1)throw new Error('Mixed variable statement requires an explicit edit');edits.push({start:node.getFullStart(),end:node.end,text:''});removed.push(selected[0].name.text);}
        for(const declaration of declarations){
            if(!ts.isIdentifier(declaration.name)||!declaration.initializer)continue;
            const key=declaration.name.text;let expression=declaration.initializer;
            if(!['PROJECT_STAGE_DEFINITIONS','OPERATING_RISK_LEVEL_DEFINITIONS','OPERATING_SIGNAL_LEVEL_DEFINITIONS'].includes(key))continue;
            while(ts.isAsExpression(expression))expression=expression.expression;
            if(!ts.isCallExpression(expression))throw new Error(`Definition framework not recognized: ${key}`);
            let array=expression.arguments[0];while(ts.isAsExpression(array))array=array.expression;
            if(!ts.isArrayLiteralExpression(array))throw new Error('Expected exact definition array');
            if(key==='PROJECT_STAGE_DEFINITIONS')edits.push({start:array.end-1,end:array.end-1,text:'\n    { key: "ConditionalCompleted", value: "conditional-completed", label: "有条件完成", severity: "warn", order: 85 },\n'});
            else edits.push({start:array.getStart(ast)+1,end:array.getStart(ast)+1,text:'\n    { key: "Normal", value: "normal", label: "正常", severity: "success", order: 0 },\n    { key: "Unknown", value: "unknown", label: "未知", severity: "secondary", order: 5 },'});
        }
    }
}
const imports=[...plan.names.map((name)=>`${name}Schema`),...plan.names.map((name)=>`type ${name}`)];
const header=`import { ${imports.join(', ')} } from './rust-r4ghi-contracts.generated';\nexport { ${plan.names.map((name)=>`${name}Schema`).join(', ')} };\nexport type { ${plan.names.join(', ')} };\n`;
edits.push({start:0,end:0,text:header});edits.sort((a,b)=>b.start-a.start||b.end-a.end);
let output=source;for(const edit of edits)output=output.slice(0,edit.start)+edit.text+output.slice(edit.end);
const target=path.join(own,'proposed',relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,output);
fs.writeFileSync(path.join(own,'canonical-ast-plan.json'),JSON.stringify({status:'candidate-not-applied',sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),target:relative,removed,importsAndLocalReexports:plan.names.length,changedDefinitionFamilies:['PROJECT_STAGE_DEFINITIONS','OPERATING_SIGNAL_LEVEL_DEFINITIONS','OPERATING_RISK_LEVEL_DEFINITIONS']},null,2)+'\n');
console.log(JSON.stringify({removedDeclarations:removed.length,modernSchemas:plan.names.length,status:'canonical-AST-proposal-not-applied'}));
