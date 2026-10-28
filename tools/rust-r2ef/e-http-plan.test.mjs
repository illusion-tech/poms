import test from 'node:test';
import assert from 'node:assert/strict';
import {eHttpCases,ePgGroups} from './e-http-plan.mjs';
test('E finite protocol covers six existing operations and source-specific boundary groups',()=>{
    const rows=eHttpCases({dictionaryId:'a0000000-0000-4000-8000-000000000001',missingId:'a0000000-0000-4000-8000-000000000002',createCode:'r2ef-created'});
    assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
    for(const [method,path]of [['GET','/api/dictionaries'],['POST','/api/dictionaries'],['PATCH','/api/dictionaries/a0000000-0000-4000-8000-000000000001'],['GET','/api/platform/system-settings'],['GET','/api/platform/system-settings/attachment.max-upload-size-mb'],['PATCH','/api/platform/system-settings/attachment.max-upload-size-mb']])assert(rows.some(row=>row.method===method&&row.route===path));
    assert.equal(rows.filter(row=>row.actorOnlyPermission&&row.id.includes('dictionary-any')).length,5);assert.equal(ePgGroups.length,10);
});
