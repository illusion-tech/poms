"""Extend the frozen06 pure analyzer; keep06/07 byte-for-byte historical."""
from pathlib import Path
import json
OUT=Path(__file__).resolve().parent
base=(OUT.parent/'shared-enum-exporter06/registered-module-graph.candidate.mjs').read_text()
base=base.replace('function runtime(root) {',"""function isZMethod(ts, node, method) {
    return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'z'
        && node.expression.name.text === method;
}
function runtime(root) {""")
base=base.replace("ts.isCallExpression(node) && node.expression.getText(sf) === 'z.enum'","isZMethod(ts, node, 'enum')")
base=base.replace("call.expression.getText(sf) !== 'z.lazy'","!isZMethod(ts, call, 'lazy')")
base=base.replace("base.expression.getText(sf) !== 'z.enum'","!isZMethod(ts, base, 'enum')")
base=base.replace('return { text: normalize(text), sf, statements, imports, functions, enumCalls };','return { text: normalize(text), sf, statements, imports, functions, enumCalls, variables };')
base=base.replace('const compiled = ts.transpileModule(module.text + probe,',"""const dataNames = [...module.variables.keys()].filter((name) => !name.endsWith('Schema') && name !== 'frozenSchemas' && name !== 'CommissionSharedEvidencePackageShape');
        const dataProbe = '\\nexport const __dataProbe = {' + dataNames.map((name) => name + ':' + name).join(',') + '};\\n';
        const schemaNames = [...module.variables.keys()].filter((name) => name.endsWith('Schema'));
        const metaProbe = '\\nexport const __metaProbe = {' + schemaNames.map((name) => name + ':' + name + '.meta()?.id').join(',') + '};\\n';
        const objectProbe = '\\nexport const __schemaObjects = {' + schemaNames.map((name) => name + ':' + name).join(',') + '};\\n';
        const compiled = ts.transpileModule(module.text + probe + dataProbe + metaProbe + objectProbe,""")
# Above Python string needs escaped backslash-n in JavaScript string literals.
base=base.replace("const dataProbe = '\nexport", "const dataProbe = '\\nexport").replace(" + '};\n';", " + '};\\n';")
base=base.replace("const metaProbe = '\nexport", "const metaProbe = '\\nexport")
base=base.replace("const objectProbe = '\nexport", "const objectProbe = '\\nexport")
base=base.replace('cache.set(path, { exports, values, topOptions });',"""const data = JSON.parse(JSON.stringify(exports.__dataProbe));
        const schemaIds = JSON.parse(JSON.stringify(exports.__metaProbe));
        cache.set(path, { exports, values, topOptions, data, schemaIds, schemaObjects: exports.__schemaObjects });""")
base=base.replace('functions: module.functions, declarations: module.statements.length, actualTopZodEnumsCompared:',"""functions: module.functions, data: Object.entries(result.data).map(([name,value]) => {
            const declaration=module.variables.get(name);
            const initializer=declaration.initializer;
            const expression=initializer.getText(module.sf);
            const dependencies=[];
            const walk=(node)=>{ if(ts.isIdentifier(node)&&module.variables.has(node.text)&&node!==declaration.name) dependencies.push(node.text); ts.forEachChild(node,walk); };
            walk(initializer);
            const helper=ts.isCallExpression(initializer)?initializer.expression.getText(module.sf):null;
            const position=module.sf.getLineAndCharacterOfPosition(declaration.getStart(module.sf));
            return {name,value,valueSha256:sha(JSON.stringify(value)),declarationSha256:sha(declaration.getText(module.sf)),expression,helper,dependencies:[...new Set(dependencies)],path,line:position.line+1,column:position.character+1};
        }), schemaIds: result.schemaIds, declarations: module.statements.length, actualTopZodEnumsCompared:""")
base=base.replace('...item, values: result.values[index], valuesSha256:',"...item, schemaId: result.schemaIds[item.owner] ?? null, sourceArray: module.variables.has(item.expression) ? item.expression : null, id: path + ':' + item.owner + ':' + item.line + ':' + item.column, values: result.values[index], valuesSha256:")
base=base.replace("readFileSync(resolve(root, R0_PATH), 'utf8')","readFileSync(resolve(root, R0_PATH), 'utf8')")
base=base.replace('analyzeRegisteredGraph(root, registry) {','analyzeRegisteredGraph(root, registry, semanticRequests = []) {')
insertion="""
    function schemaLeaves(schema, path, seen = new Set(), depth = 0) {
        if (!schema || depth > 96) return [{type:'unresolved'}];
        const key=schema; if(seen.has(key))return [{type:'cycle'}];
        const next=new Set(seen);next.add(key);
        const def=schema._zod?.def ?? schema._def ?? schema.def;
        if(!def)return [{type:'unresolved'}];
        const type=def.type;
        if(type==='lazy')return schemaLeaves(def.getter(),path,next,depth+1);
        if(['optional','nullable','default','prefault','readonly','catch','branded','nonoptional'].includes(type))return schemaLeaves(def.innerType??def.type,path,next,depth+1);
        if(type==='pipe')return schemaLeaves(def.in,path,next,depth+1);
        if(type==='union')return def.options.flatMap((child)=>schemaLeaves(child,path,next,depth+1));
        if(type==='intersection')return [def.left,def.right].flatMap((child)=>schemaLeaves(child,path,next,depth+1));
        if(type==='array')return schemaLeaves(def.element,path,next,depth+1);
        if(type==='record')return schemaLeaves(def.valueType,path,next,depth+1);
        if(path.length) {
            if(type!=='object')return [{type:'absent',at:type}];
            const shape=typeof def.shape==='function'?def.shape():def.shape;
            return shape?.[path[0]]?schemaLeaves(shape[path[0]],path.slice(1),next,depth+1):[{type:'absent'}];
        }
        const providers=[];
        for(const [module,result] of cache)for(const [name,object] of Object.entries(result.schemaObjects||{}))if(object===schema)providers.push({path:module,owner:name});
        return [{type,values:type==='enum'?schema.options:type==='literal'?[...(schema.values??def.values??[])]:null,providers}];
    }
    const semanticFields=semanticRequests.map((request)=>{
        const owners=[];
        for(const [path,result]of cache)if(result.schemaObjects?.[request.owner])owners.push({path,owner:request.owner,leaves:schemaLeaves(result.schemaObjects[request.owner],request.propertyPath||[])});
        return {...request,owners};
    });
"""
base=base.replace('    const stageValues = entry.ProjectStageSchema?.options;',insertion+'\n    const stageValues = entry.ProjectStageSchema?.options;')
base=base.replace('stageValues, projectSourceChecks, modules: observations,','stageValues, projectSourceChecks, semanticFields, modules: observations,')
fallback="""
    function sourceSchemaId(module,result,item) {
        if(result.schemaIds[item.owner])return result.schemaIds[item.owner];
        const ids=[];
        const visit=(node)=>{
            if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='meta') {
                const argument=node.arguments[0];
                if(argument&&ts.isObjectLiteralExpression(argument))for(const property of argument.properties)if(ts.isPropertyAssignment(property)&&property.name.text==='id'&&ts.isStringLiteralLike(property.initializer))ids.push(property.initializer.text);
            }
            ts.forEachChild(node,visit);
        };
        visit(module.variables.get(item.owner).initializer);
        const unique=[...new Set(ids)];
        if(unique.length>1)throw new Error('Ambiguous schema metadata identity '+item.owner);
        return unique[0]??null;
    }
"""
base=base.replace('    const observations = CLOSED_MODULES.map',fallback+'\n    const observations = CLOSED_MODULES.map')
base=base.replace('schemaId: result.schemaIds[item.owner] ?? null','schemaId: sourceSchemaId(module,result,item)')
(OUT/'registered-module-graph08.candidate.mjs').write_text(base)
print('prepared semantic AST graph08')
