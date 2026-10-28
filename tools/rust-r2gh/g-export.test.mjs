import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { artifacts, ROOT } from './g-export.mjs';

test('neutral G artifacts are deterministic unchanged-source exports with exactly sixteen original operations',()=>{
    const outputs=artifacts();
    for(const [file,text] of outputs) assert.equal(readFileSync(resolve(ROOT,'tools/rust-r2gh',file),'utf8'),text,'Stale '+file);
    const spec=JSON.parse(outputs.get('g-openapi.json'));
    const operations=Object.entries(spec.paths).flatMap(([path,methods])=>Object.entries(methods).map(([method,operation])=>({path,method,operationId:operation.operationId})));
    assert.equal(operations.length,16);
    assert.equal(new Set(operations.map(op=>op.operationId)).size,16);
    const original=JSON.parse(readFileSync(resolve(ROOT,'libs/shared/api-spec/openapi.json'),'utf8'));
    for(const op of operations) assert.deepEqual(spec.paths[op.path][op.method],original.paths[op.path][op.method]);
    for(const [name,schema] of Object.entries(spec.components.schemas)) assert.deepEqual(schema,original.components.schemas[name]);
});

test('original state oracle exposes Buffer aliases, repeatable states, purpose separation and raw number boundary',()=>{
    const state=JSON.parse(readFileSync(resolve(ROOT,'tools/rust-r2gh/g-state-golden.json'),'utf8'));
    for(const method of ['verifyOAuthState','verifyExternalLoginState']) {
        const find=name=>state.cases.find(row=>row.method===method&&row.name===name).expected;
        for(const name of ['valid','padding','standard-alphabet','signature-whitespace','signature-invalid-ignored','no-nonce','id-empty','exp-infinity']) assert.equal(find(name).success,true,method+':'+name);
        for(const name of ['purpose-other','exp-equal','exp-past','exp-string','bad-signature']) assert.equal(find(name).success,false,method+':'+name);
        assert.equal(find('null').response.name,'TypeError');
    }
});
