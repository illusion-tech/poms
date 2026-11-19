"""Reuse the original strict evaluator verbatim; no permissive TS evaluation."""
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
text=(ROOT/'tools/rust-r1b/export-shared.mjs').read_text()
start=text.index('export const HELPER_HASHES')
end=text.index('\nconst OTHER_FUNCTION_HASHES',start)
helpers=text[start:end].replace('export const','const',1)
start=text.index('function evaluator(input)')
end=text.index('\nfunction dependencies(',start)
evaluator=text[start:end]
prefix="""// The interpreter body below is verbatim from reviewed legacy R1B.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
let ts;
const record=(value)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const unique=(items,message)=>{if(new Set(items).size!==items.length)throw new Error(message);};
const unwrap=(node)=>{while(node&&(ts.isAsExpression(node)||ts.isSatisfiesExpression(node)||ts.isParenthesizedExpression(node)||ts.isTypeAssertionExpression(node)))node=node.expression;return node;};
const failAt=(node,sf,message)=>{const p=sf.getLineAndCharacterOfPosition(node.getStart(sf));throw new Error(sf.fileName+':'+(p.line+1)+':'+(p.character+1)+': '+message);};
"""
suffix="""
export function verifyStaticData(root, graph) {
    ts=createRequire(resolve(root,'package.json'))('typescript');
    let compared=0;
    for(const module of graph.modules) {
        const text=readFileSync(resolve(root,module.path),'utf8').replace(/\\r\\n/g,'\\n');
        const sf=ts.createSourceFile(module.path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
        const constants=new Map();
        for(const statement of sf.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name))constants.set(declaration.name.text,declaration);
        const evaluate=evaluator({sf,constants});
        for(const row of module.data) {
            const declaration=constants.get(row.name);
            if(!declaration)throw new Error('Missing registered static data '+row.name);
            const value=evaluate(declaration.initializer,[row.name]);
            assert.equal(JSON.stringify(value),JSON.stringify(row.value),'Static evaluator differs from original TS runtime '+module.path+':'+row.name);
            compared++;
        }
    }
    return {interpreter:'verbatim legacy R1B strict data evaluator',compared,unknownDataConstructs:'rejected by original evaluator'};
}
"""
(OUT/'static-data-oracle08.candidate.mjs').write_text(prefix+helpers+'\n'+evaluator+'\n'+suffix)
print('prepared original strict static evaluator')
