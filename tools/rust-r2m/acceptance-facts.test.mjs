// Pure synthetic frames only. No live journal/row/DB/private evidence is read.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectCompleteFacts,completeFactTables} from './acceptance-facts.mjs';
import {strictDifference} from './acceptance-compare.mjs';

const authority=JSON.parse(fs.readFileSync(new URL('./reference-authority.json',import.meta.url),'utf8'));
const runId='10000000-0000-4000-8000-000000000001',id='20000000-0000-4000-8000-000000000002',seedId='30000000-0000-4000-8000-000000000003';
const journal={namespace:'poms-r2m',runId,backend:'nest',database:'poms_r2m_nest',marker:'pure-marker',objects:[{table:'role',id,identity:{id},creationProof:{kind:'synthetic-pure-test'},postcondition:{independentlyVisible:true}}]};
const roleDefinition=authority.tables.find(item=>item.name==='role');
const role=(key,name)=>({...Object.fromEntries(roleDefinition.columns.map(item=>[item.name,null])),id:key,name});
function snapshot(rows=[]){return{kind:'R2M-actual-full107-private-row-snapshot',namespace:'poms-r2m',runId,backend:'nest',database:journal.database,marker:journal.marker,catalog:{synthetic:true},tables:authority.tables.map(item=>({table:item.name,rows:item.name==='role'?rows:[]}))}}

test('an unexpected write in another already-owned module is preserved in the full107 diff',()=>{
    const baseline=snapshot(),before=projectCompleteFacts({raw:snapshot([role(id,'before')]),baseline,journal,authority});
    const after=projectCompleteFacts({raw:snapshot([role(id,'unexpected cross-module write')]),baseline,journal,authority});
    assert.equal(completeFactTables(before).length,107);assert.equal(before.outsideScope.unexpectedChanges.length,0);
    // Even a caller interested only in auth cannot make this role disappear:
    // the actual complete frame contains every owned module and physical field.
    assert.equal(after.rows.role[0].name,'unexpected cross-module write');assert(strictDifference(before.rows,after.rows).some(item=>item.path.includes('role')));
});

test('unowned seed changes are reported and physical missing columns cannot be disguised',()=>{
    const baseline=snapshot([role(seedId,'seed')]),raw=snapshot([role(seedId,'changed outside'),role(id,'owned')]);
    const projected=projectCompleteFacts({raw,baseline,journal,authority});assert.deepEqual(projected.outsideScope.unexpectedChanges,[{table:'role',kind:'unexpected-complete-row-change'}]);
    const omitted=snapshot([role(id,'owned')]);delete omitted.tables.find(item=>item.table==='role').rows[0].name;
    assert.throws(()=>projectCompleteFacts({raw:omitted,baseline:snapshot(),journal,authority}));
});

test('additional scope cannot be used to hide a non-number table change',()=>{
    assert.throws(()=>projectCompleteFacts({raw:snapshot([role(seedId,'foreign')]),baseline:snapshot(),journal,authority,additionalRowIsScoped:()=>true}));
});
