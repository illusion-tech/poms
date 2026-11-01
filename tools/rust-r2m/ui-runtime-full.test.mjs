import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {uiRuntimePlan} from './ui-runtime-full.mjs';
import {uiNativeReadModels} from './ui-runtime-sources.mjs';
const runId='10000000-0000-4000-8000-000000000001';
test('full Linux entry requires a finite explicit selection and never relabels Windows',()=>{
    const plan=uiRuntimePlan({backend:'rust',tag:'pure01',runId,selection:['UI1','UI2','UI3','UI4']});assert.deepEqual(plan.notRun,[]);assert.equal(plan.platform,'linux');assert.equal(plan.G3Certified,false);
    for(const selection of[[],['UI1','UI1'],['UI5'],undefined])assert.throws(()=>uiRuntimePlan({backend:'nest',tag:'pure01',runId,selection}));
});
test('UI3/4 explicit Native read models exist in the original current spec and exclude all current migrated routes',()=>{
    const spec=JSON.parse(fs.readFileSync('libs/shared/api-spec/openapi.json')),input=JSON.parse(fs.readFileSync('docs/design/rust-r2m/acceptance-input.json'));
    const routes=uiNativeReadModels({sourceReader:{json:()=>spec},input,selection:['UI3','UI4']});assert(routes.length>0);assert(routes.every(row=>row.method==='GET'&&spec.paths[row.path]?.get));
    assert(!routes.some(row=>input.sourceProtection.currentSurface.some(item=>item.method===row.method&&item.path===row.path)));
});
