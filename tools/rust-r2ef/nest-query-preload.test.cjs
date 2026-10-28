'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {matches}=require('./nest-query-preload.cjs');
const {describeSql}=require('../rust-r2c/witness-query-core.cjs');
const id='12345678-1234-4234-9234-123456789abc';
function check(sql,plan,phase='before',values=[]){return matches(plan,phase,describeSql(sql),[sql,values]);}
test('witness matches exact target and complete CAS for inline and bound forms, rejecting negative predicates',()=>{
    const plan={kind:'before-dictionary-update',targetId:id};
    assert(check(`update "poms"."dictionary_item" set "name"='x' where "id"='${id}' and "row_version"=1 returning "row_version";`,plan));
    assert(check('update poms.dictionary_item set name=$1 where id=$2 and row_version=$3 returning row_version',plan,'before',['x',id,1]));
    for(const where of [`id='${id}'`,`id='${id}' or row_version=1`,`not(id='${id}') and row_version=1`,`id='different' and row_version=1`])assert.equal(check('update poms.dictionary_item set name=\'x\' where '+where,plan),false);
    assert.equal(check(`update poms.dictionary_item set name='x' where id='${id}' and row_version=1; delete from poms.dictionary_item`,plan),false);
});
test('witness requires complete declared insert identity and matches the final tuple column',()=>{
    const sql="insert into poms.dictionary_item(name,domain,code) values('x','lead-source','owned') returning id";
    assert(check(sql,{kind:'before-dictionary-insert',targetDomain:'lead-source',targetCode:'owned'}));
    assert.equal(check(sql,{kind:'before-dictionary-insert'}),false);
    assert.equal(check(sql+'; delete from poms.dictionary_item',{kind:'before-dictionary-insert',targetDomain:'lead-source',targetCode:'owned'}),false);
    const lookup="select d.* from poms.dictionary_item as d where d.domain='lead-source' and d.code='owned' limit 1";
    assert(check(lookup,{kind:'after-dictionary-select',targetDomain:'lead-source',targetCode:'owned'},'after'));
});
