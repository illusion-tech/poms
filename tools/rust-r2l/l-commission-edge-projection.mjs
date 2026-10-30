// Executes only the selected original pure settlement/date/enum declarations.
// No service, ORM entity, seeder, network, environment or database is loaded.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { sha256 } from './l-commission-edge-plan.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const paths={
    enums:'libs/shared/contracts/src/lib/shared-contracts.ts',
    chain:'apps/poms-api/src/app/features/commission/commission-settlement-write-chain.ts',
    date:'apps/poms-api/src/app/core/date/business-date.utils.ts',
    approval:'apps/poms-api/src/app/features/approval/approval.service.ts',
    receipt:'apps/poms-api/src/app/features/contract-finance/receipt-record.entity.ts',
};
function read(file) {
    const raw=fs.readFileSync(new URL('../../'+file,import.meta.url)),text=raw.toString('utf8');
    const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0);
    return {file,text,ast,rawBytesSha256:sha256(raw),normalizedLfSha256:sha256(text.replace(/\r\n/g,'\n'))};
}
function descendants(node,fn) { const result=[];const visit=n=>{if(fn(n))result.push(n);ts.forEachChild(n,visit);};visit(node);return result; }
function select(source,names) {
    const symbols=new Map();
    for(const node of source.ast.statements) {
        if(ts.isFunctionDeclaration(node)&&node.name)symbols.set(node.name.text,{node,kind:'function'});
        if(ts.isVariableStatement(node))for(const item of node.declarationList.declarations)if(ts.isIdentifier(item.name))symbols.set(item.name.text,{node:item,kind:'constant'});
    }
    const selected=new Set(),pending=[...names];
    while(pending.length){const name=pending.shift();if(selected.has(name))continue;const item=symbols.get(name);assert(item,'Missing original declaration '+name);selected.add(name);
        for(const id of descendants(item.node,ts.isIdentifier))if(id.text!==name&&symbols.has(id.text))pending.push(id.text);
    }
    return [...selected].map(name=>({name,...symbols.get(name)})).sort((a,b)=>a.node.pos-b.node.pos).map(({name,node,kind})=>({
        name,file:source.file,firstLine:source.ast.getLineAndCharacterOfPosition(node.getStart(source.ast)).line+1,
        originalTextSha256:sha256(node.getText(source.ast)),code:kind==='constant'?'const '+node.getText(source.ast)+';':node.getText(source.ast).replace(/^export\s+/,''),
    }));
}
let cached;
export function originalEdgeProjection() {
    if(cached)return cached;assert.equal(ts.version,'6.0.3');
    const source=Object.fromEntries(Object.entries(paths).map(([key,file])=>[key,read(file)]));
    const enumNames=[...new Set(descendants(source.chain.ast,n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='@poms/shared-contracts').flatMap(n=>n.importClause.namedBindings.elements.filter(x=>!x.isTypeOnly).map(x=>x.name.text)))];
    const enums=select(source.enums,enumNames);
    const date=select(source.date,['toBusinessDateString','toBusinessDateOnly']);
    const chain=select(source.chain,['buildPendingFinalRuleExplanation','buildRetentionSettlementDraft','evaluateRetentionDueDate','DEFAULT_RETENTION_REQUIREMENT_SUMMARY']);
    const records=[...enums,...date,...chain],program=records.map(x=>x.code).join('\n')+'\n({buildPendingFinalRuleExplanation,buildRetentionSettlementDraft,evaluateRetentionDueDate,toBusinessDateString,DEFAULT_RETENTION_REQUIREMENT_SUMMARY})';
    const compiled=ts.transpileModule(program,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
    const errors=(compiled.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error);assert.equal(errors.length,0,errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,'\n')).join('\n'));
    const functions=new vm.Script(compiled.outputText,{filename:'original-commission-edge-pure-projection.js'}).runInContext(vm.createContext({Date,Intl},{codeGeneration:{strings:false,wasm:false}}),{timeout:1000});
    // Exact original decimal declaration, not a generic number/string coercion.
    const receipt=source.receipt.text;
    assert(receipt.includes("receiptAmount: p.decimal().precision(18).scale(2).fieldName('receipt_amount')"));
    cached={...functions,sourceRecords:records.map(({code,...item})=>item),compiledSha256:sha256(compiled.outputText),
        files:Object.values(source).map(({file,rawBytesSha256,normalizedLfSha256})=>({file,rawBytesSha256,normalizedLfSha256})),
        receiptAmountString(value){assert(typeof value==='number'&&Number.isSafeInteger(value*100),'Recorded numeric amount cannot be reconstructed exactly at declared scale2');return value.toFixed(2);},
        boundary:'Original pure source evaluation only; no new ORM/PG hydration or service runtime execution claimed',
    };return cached;
}
