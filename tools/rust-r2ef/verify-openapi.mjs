import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyDocument as verifyInherited} from '../rust-r2d/verify-openapi.mjs';
import {operationCount,reachableSchemas} from '../rust-r2d/export-users.mjs';
import {validateSource,sourceHead,root} from './fixture-guard.mjs';
export function verifyDocument(generated,original){
    validateSource();const fragments=['e-dictionary-openapi.json','e-settings-openapi.json','f-openapi.json'].map(file=>JSON.parse(readFileSync(new URL(file,import.meta.url))));
    const routes=fragments.flatMap(fragment=>Object.keys(fragment.paths)).sort();assert.equal(routes.length,8);assert.equal(new Set(routes).size,8);
    assert.equal(Object.keys(generated.paths).length,38);assert.equal(operationCount(generated.paths),47);assert.equal(generated.openapi,original.openapi);
    for(const route of routes)assert.deepEqual(generated.paths[route],original.paths[route],'Complete original E/F operation metadata '+route);
    const ownSchemas=reachableSchemas(generated,routes);for(const name of ownSchemas)assert.deepEqual(generated.components.schemas[name],original.components.schemas[name],'Complete original E/F reachable schema '+name);
    const inheritedRoutes=Object.keys(generated.paths).filter(route=>!routes.includes(route)),inheritedSchemas=reachableSchemas(generated,inheritedRoutes);
    assert.deepEqual(Object.keys(generated.components.schemas).sort(),[...new Set([...ownSchemas,...inheritedSchemas])].sort(),'No missing or unreferenced schemas');
    const previous=structuredClone(generated);previous.paths=Object.fromEntries(inheritedRoutes.map(route=>[route,generated.paths[route]]));previous.components.schemas=Object.fromEntries([...inheritedSchemas].map(name=>[name,generated.components.schemas[name]]));
    const inherited=verifyInherited(previous,original);assert.equal(inherited.operations,37);validateSource();
    return {formatVersion:1,result:'pass',sourceHead,paths:38,operations:47,ownPaths:8,ownOperations:10,ownReachableSchemas:ownSchemas.size,inheritedOperations:37,inherited,fullOriginalChanged:false,runtimeBehaviorClaim:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    assert.equal(process.argv.length,3);const bytes=readFileSync(process.argv[2]),original=JSON.parse(readFileSync(path.join(root,'libs/shared/api-spec/openapi.json')));console.log(JSON.stringify({...verifyDocument(JSON.parse(bytes),original),generatedSha256:createHash('sha256').update(bytes).digest('hex')}));
}
