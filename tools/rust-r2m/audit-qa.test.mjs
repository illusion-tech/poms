// Public admission/data only. No private, PG, child API or browser execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateQaPlan,ambientGuard,normalizedRows,digest} from './audit-qa-common.mjs';
import {validateQaApproval} from './audit-qa-provision.mjs';
const original=()=>JSON.parse(fs.readFileSync('tools/rust-r2m/audit-qa-admission.json'));
test('QA exact three names and low roles cannot alias protected M databases or old environments',()=>{
    assert.equal(validateQaPlan(original()).resources.length,3);
    for(const change of[plan=>plan.resources[0].database='poms_r2m_nest',plan=>plan.resources[0].template='poms_r2l_nest',plan=>plan.resources[1].role='poms_r2m_app',plan=>plan.resources[2].marker=plan.parentMarker,plan=>plan.resources[0].envFile='/home/wangzishi/.local/share/poms-r2l/private/nest.env',plan=>plan.rolePolicy.createDB=true]){const plan=original();change(plan);assert.throws(()=>validateQaPlan(plan))}
});
test('root declaration without exact seed proof and necessary isolation review is refused',()=>{
    assert.throws(()=>validateQaApproval({kind:'Root-R2M-QA-clone-execution-admission',rootAuthorized:true},original(),'a'.repeat(64)));
    for(const env of[{pgpassword:'secret'},{Db_Password:'secret'},{Node_Options:'--inspect'},{POMS_ENV_FILE:'/old/private/nest.env'}])assert.throws(()=>ambientGuard(env));ambientGuard({PATH:'/bin'});
});
test('full107 seed fingerprint is order independent and changes for any complete-row value',()=>{
    const rows=Array.from({length:107},(_,index)=>({table:'t'+String(index).padStart(3,'0'),rows:[{id:1,value:'same',version:1}]}));const reversed=[...rows].reverse();assert.equal(digest(normalizedRows(rows)),digest(normalizedRows(reversed)));const changed=structuredClone(rows);changed[106].rows[0].version=2;assert.notEqual(digest(normalizedRows(rows)),digest(normalizedRows(changed)));assert.throws(()=>normalizedRows(rows.slice(1)));
});
