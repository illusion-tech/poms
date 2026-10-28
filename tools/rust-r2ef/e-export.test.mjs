import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {artifacts,ROOT,SOURCE_HEAD} from './e-export.mjs';
test('E neutral data and complete Zod expectations regenerate from frozen original authority',()=>{
    const outputs=artifacts();for(const [file,text] of outputs)assert.equal(readFileSync(resolve(ROOT,'tools/rust-r2ef',file),'utf8'),text,file);
    const authority=JSON.parse(outputs.get('e-authority.json'));assert.equal(authority.sourceHead,SOURCE_HEAD);assert.equal(authority.dictionaryDomains.length,4);assert.equal(authority.settings.length,1);assert.equal(Object.keys(authority.businessNumbers).length,9);
    const corpus=JSON.parse(outputs.get('e-golden.json'));assert(corpus.cases.length>=276);assert.equal(new Set(corpus.cases.map(row=>row.schema)).size,4);
    for(const file of ['e-dictionary-openapi.json','e-settings-openapi.json']) {
        const spec=JSON.parse(outputs.get(file));assert.equal(Object.keys(spec.paths).length,2);assert.equal(Object.values(spec.paths).reduce((n,path)=>n+Object.keys(path).filter(method=>['get','post','patch'].includes(method)).length,0),3);
    }
});
