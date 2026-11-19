// Read-only continuation. Delivered06 files remain unchanged.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const out = dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const previous = resolve(out, '../shared-enum-exporter06/registered-module-graph.candidate.mjs');
let code = readFileSync(previous, 'utf8');
code = code.replace('return { text: normalize(text), sf, statements, imports, functions, enumCalls };',
    'return { text: normalize(text), sf, statements, imports, functions, enumCalls, variables };');
code = code.replace('const compiled = ts.transpileModule(module.text + probe,',
    "const historicalNames = r0.sharedSsot.constants.map((item) => item.name).filter((name) => module.variables.has(name));\n        const historicalProbe = '\\nexport const __historicalConstantProbe = {' + historicalNames.map((name) => name + ':' + name).join(',') + '};\\n';\n        const compiled = ts.transpileModule(module.text + probe + historicalProbe,");
code = code.replace('cache.set(path, { exports, values, topOptions });',
    'const historicalConstants = JSON.parse(JSON.stringify(exports.__historicalConstantProbe));\n        cache.set(path, { exports, values, topOptions, historicalConstants });');
code = code.replace('const stageValues = entry.ProjectStageSchema?.options;',
    'const historicalConstants = CLOSED_MODULES.flatMap((path) => Object.entries(cache.get(path).historicalConstants).map(([name, value]) => ({path,name,value,valueSha256:sha(JSON.stringify(value)),declarationSha256:sha(modules.get(path).variables.get(name).getText(modules.get(path).sf))})));\n    const stageValues = entry.ProjectStageSchema?.options;');
code = code.replace('stageValues, projectSourceChecks, modules: observations,', 'stageValues, projectSourceChecks, historicalConstants, modules: observations,');
if (!code.includes('const historicalConstants = CLOSED_MODULES')) throw new Error('Frozen06 transformation failed');
const candidate = resolve(out, 'registered-module-graph07.candidate.mjs');
writeFileSync(candidate, code);
const { proposeRegistry, analyzeRegisteredGraph } = await import(pathToFileURL(candidate).href);
const registry = proposeRegistry(root);
const result = analyzeRegisteredGraph(root, registry);
const r0 = JSON.parse(readFileSync(resolve(root, 'docs/design/rust-r0-api-operations.json'), 'utf8'));
const previousBytes = readFileSync(resolve(root, 'tools/rust-r1b/shared-manifest.json'));
const previousManifest = JSON.parse(previousBytes);
const constants = r0.sharedSsot.constants.map((old, historicalIndex) => {
    const candidates = result.historicalConstants.filter((item) => item.name === old.name);
    const same = candidates.filter((item) => JSON.stringify(item.value) === JSON.stringify(old.value));
    return { historicalIndex, name:old.name, historicalPath:old.path,
        historicalRecordSha256:sha(JSON.stringify(old)),historicalValueSha256:sha(JSON.stringify(old.value)),
        disposition:!candidates.length?'missing-current-symbol-needs-review':candidates.length!==1?'ambiguous-current-symbol-needs-review':same.length===1?'current-value-unchanged':'current-value-changed-needs-explicit-replacement',
        candidates:candidates.map(({path,name,valueSha256,declarationSha256})=>({path,name,valueSha256,declarationSha256})),
    };
});
const current = result.modules.flatMap((module)=>module.enumOccurrences.map((item)=>({...item,path:module.path})));
const enums = r0.sharedSsot.enumSchemas.map((old,historicalIndex)=>{
    const oldWitness = previousManifest.enumOccurrences.filter((item)=>item.owner===old.name&&item.path===old.path&&item.topLevel===old.topLevelEnum&&item.expression===old.expression&&JSON.stringify(item.values)===JSON.stringify(old.values));
    const oldPaths=[...new Set(oldWitness.map((item)=>JSON.stringify(item.propertyPath)))];
    const nominal=current.filter((item)=>item.owner===old.name&&(oldPaths.length!==1||JSON.stringify(item.propertyPath)===oldPaths[0]));
    return {historicalIndex,owner:old.name,historicalPath:old.path,historicalRecordSha256:sha(JSON.stringify(old)),
        previousGeneratedWitnessMatches:oldWitness.length,historicalPropertyPaths:oldPaths.map((path)=>JSON.parse(path)),
        disposition:!nominal.length?'missing-or-structural-migration-needs-review':nominal.length!==1?'ambiguous-nominal-occurrence-needs-review':nominal[0].path!==old.path?'module-migration-needs-explicit-registration':JSON.stringify(nominal[0].values)!==JSON.stringify(old.values)?'wire-replacement-needs-explicit-registration':'nominal-location-and-wire-retained-recheck-full-payload',
        candidates:nominal.map(({owner,path,line,column,propertyPath,topLevel,expression,declarationSha256,valuesSha256})=>({owner,path,line,column,propertyPath,topLevel,expressionSha256:sha(expression),declarationSha256,valuesSha256})),
    };
});
const counts=(items)=>Object.fromEntries([...new Set(items.map((item)=>item.disposition))].map((key)=>[key,items.filter((item)=>item.disposition===key).length]));
const inventory={kind:'unapproved-R0-current-identity-disposition-inventory07',rootProductModified:false,gitExecuted:false,historicalR0:result.historicalR0,
    previousGeneratedManifest:{rawSha256:sha(previousBytes),sourceHead:previousManifest.authority.sourceHead,role:'comparison provenance only; never wire/editing authority'},
    currentSourceModules:result.modules.map(({path,normalizedTextSha256})=>({path,normalizedTextSha256})),
    summary:{constants:counts(constants),enums:counts(enums)},constants,enums,
    limitations:['No disposition is automatically accepted','Current values come exclusively from actual TS+Zod execution','Nominal owner/property identities govern candidates; unrelated equal-value schemas never merge','Prior generated manifest supplies historical property-path provenance only','Full buildManifest/compareR0/check/write remains incomplete until Root reviews exact registrations and fixes source reference']};
writeFileSync(resolve(out,'historical-current-inventory07.json'),JSON.stringify(inventory,null,2)+'\n');
writeFileSync(resolve(out,'runtime-observations07.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({summary:inventory.summary,previousManifest:inventory.previousGeneratedManifest,inventorySha256:sha(readFileSync(resolve(out,'historical-current-inventory07.json'))),candidateSha256:sha(readFileSync(candidate))},null,2));
