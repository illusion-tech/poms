// The interpreter body below is verbatim from reviewed legacy R1B.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
let ts;
const record=(value)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const unique=(items,message)=>{if(new Set(items).size!==items.length)throw new Error(message);};
const unwrap=(node)=>{while(node&&(ts.isAsExpression(node)||ts.isSatisfiesExpression(node)||ts.isParenthesizedExpression(node)||ts.isTypeAssertionExpression(node)))node=node.expression;return node;};
const failAt=(node,sf,message)=>{const p=sf.getLineAndCharacterOfPosition(node.getStart(sf));throw new Error(sf.fileName+':'+(p.line+1)+':'+(p.character+1)+': '+message);};
const HELPER_HASHES = Object.freeze({
    defineEnumDefinitions: '74f91dd0ac8ccaa5ebf310fc56f2b678ac4324a8a6119e98877f2e233977ebb9',
    defineSeverityEnumDefinitions: 'd5a1d8a71a84b660cc600f0d140ee4ca93d0bbc048bd3fad7e95ca017eff6c60',
    enumObjectValues: 'a05f6776c656b2796ebf10616e4f98db22dd8477a3fb74faa3ce6994e3d94488',
    enumDefinitionValues: 'a8646be37a711e78761b2611aceb5fee7ac12929a668cf3513323bc2caf6fc6d',
    enumDefinitionValueObject: 'bd2ae9b4b2300731764eade0e0139fe2a626afeef07417c169dee3d5cfe17a35',
    enumDefinitionLabels: 'b7152b4d630a21d37b1a3ad632dd21c05f0d288768060d7c66532fc01a9416ed',
    enumDefinitionOptions: '2e6841abebe57efb0d26c2115aecedb8273c4fa5e7432d60dacf66a59e52ca13',
    enumDefinitionSeverities: 'ceb861c29b226c4a7e70c8476969c3df9d2ead089ec553ee0fe51b4433678bf7',
    enumDefinitionHints: '1c1a18b688fa0267f8412664d37ea2ed25f68c0e639a19f64fdda37697a9d5e9'
});
function evaluator(input) {
    const { sf, constants } = input;
    const cache = new Map();
    const evaluate = (raw, stack = []) => {
        const node = unwrap(raw);
        if (!node) throw new Error(`${sf.fileName}: Missing expression`);
        if (ts.isStringLiteralLike(node)) return node.text;
        if (ts.isNumericLiteral(node)) return Number(node.text);
        if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
        if (node.kind === ts.SyntaxKind.NullKeyword) return null;
        if (ts.isIdentifier(node)) {
            const name = node.text;
            if (!constants.has(name)) failAt(node, sf, `Unknown data identifier ${name}`);
            if (stack.includes(name)) failAt(node, sf, `Cyclic data dependency ${[...stack, name].join(' -> ')}`);
            if (!cache.has(name)) cache.set(name, evaluate(constants.get(name).initializer, [...stack, name]));
            return cache.get(name);
        }
        if (ts.isArrayLiteralExpression(node)) {
            const values = [];
            for (const element of node.elements) {
                if (ts.isSpreadElement(element)) {
                    const spread = evaluate(element.expression, stack);
                    if (!Array.isArray(spread)) failAt(element, sf, 'Array spread must resolve to an array');
                    values.push(...spread);
                } else values.push(evaluate(element, stack));
            }
            return values;
        }
        if (ts.isObjectLiteralExpression(node)) {
            const entries = [];
            for (const property of node.properties) {
                if (!ts.isPropertyAssignment(property) || (!ts.isIdentifier(property.name) && !ts.isStringLiteralLike(property.name))) failAt(property, sf, 'Unsupported object property or computed key');
                entries.push([property.name.text, evaluate(property.initializer, stack)]);
            }
            unique(
                entries.map(([key]) => key),
                `${sf.fileName}: Duplicate object key`
            );
            return Object.fromEntries(entries);
        }
        if (ts.isPropertyAccessExpression(node)) {
            const value = evaluate(node.expression, stack);
            if (!record(value) || !Object.hasOwn(value, node.name.text)) failAt(node, sf, `Unknown property ${node.name.text}`);
            return value[node.name.text];
        }
        if (ts.isCallExpression(node)) {
            const helper = node.expression.getText(sf);
            if (!Object.hasOwn(HELPER_HASHES, helper) && helper !== 'Object.values') failAt(node, sf, `Unsupported data helper ${helper}`);
            if (node.arguments.length !== 1) failAt(node, sf, `${helper} requires exactly one argument`);
            const value = evaluate(node.arguments[0], stack);
            if (helper === 'defineEnumDefinitions' || helper === 'defineSeverityEnumDefinitions') return value;
            if (helper === 'enumObjectValues' || helper === 'Object.values') {
                if (!record(value)) failAt(node, sf, `${helper} requires an object`);
                return Object.values(value);
            }
            if (!Array.isArray(value)) failAt(node, sf, `${helper} requires definitions`);
            if (helper === 'enumDefinitionValues') return value.map((item) => item.value);
            const map = (key, field) => {
                unique(
                    value.map((item) => item[key]),
                    `${helper}: Duplicate definition ${key}`
                );
                if (value.some((item) => typeof item[key] !== 'string' || typeof item[field] !== 'string')) failAt(node, sf, `${helper}: Invalid definition field`);
                return Object.fromEntries(value.map((item) => [item[key], item[field]]));
            };
            if (helper === 'enumDefinitionValueObject') return map('key', 'value');
            if (helper === 'enumDefinitionLabels') return map('value', 'label');
            if (helper === 'enumDefinitionSeverities') return map('value', 'severity');
            if (helper === 'enumDefinitionHints') return map('value', 'hint');
            if (helper === 'enumDefinitionOptions') return value.map((item) => ({ label: item.label, value: item.value }));
        }
        failAt(node, sf, `Unsupported data expression ${ts.SyntaxKind[node.kind]}`);
    };
    return evaluate;
}


export function verifyStaticData(root, graph) {
    ts=createRequire(resolve(root,'package.json'))('typescript');
    let compared=0;
    for(const module of graph.modules) {
        const text=readFileSync(resolve(root,module.path),'utf8').replace(/\r\n/g,'\n');
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
