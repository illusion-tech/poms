import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SourceReader} from './acceptance-source.mjs';
import {assertUserCompatibility,observeUserRequestWrites,userCompatibilitySources,verifyUserCompatibilitySource} from './acceptance-api-user-compatibility.mjs';
const root=path.resolve(import.meta.dirname,'../..'),user='70000000-0000-4000-8000-000000000007',event='80000000-0000-4000-8000-000000000008';
const frame=()=>({rows:Object.fromEntries(['platform_user','local_credential','user_role_assignment','user_org_membership','org_unit','role','audit_log','security_event'].map(table=>[table,[]]))});
const failure={expect:'inherited-user-relationships-rollback',body:{username:'pure-only',primaryOrgUnitId:user,initialRoleIds:[user]}},outcome={complete:true,sourceCaseId:'m2.1',index:7,sdkCommittedCreates:0,pgCommittedCreates:0,nativeTransactionCaptureApplicable:true,nativeSqlCaptureComplete:true,nativeFailureBoundary:'business-write-rollback-observed',nativeRollbackSqlObserved:true,nativeSdkRollbackObserved:true};
test('the inherited create and version source closure is exact and cannot silently accept changed source bytes',()=>{
    const pins=userCompatibilitySources.map(pin=>{const raw=fs.readFileSync(path.join(root,pin.file));return{...pin,bytes:raw.length}}),reader=new SourceReader({root,pins,sourceEpoch:'pure-source-only'});assert.equal(verifyUserCompatibilitySource(reader).productChanged,false);
    assert.throws(()=>verifyUserCompatibilitySource({read(file){const raw=fs.readFileSync(path.join(root,file));return Buffer.concat([raw,Buffer.from('\n')])},assertUnchanged(){}}));
    assert(userCompatibilitySources.every(pin=>createHash('sha256').update(fs.readFileSync(path.join(root,pin.file))).digest('hex')===pin.rawBytesSha256));
});
test('a source-defined 500 needs unchanged complete business facts and real Native rollback SQL plus SDK observations',()=>{
    const before=frame(),after=frame(),response={status:500,executionBackend:'nest',actualWriteOutcome:outcome};assert.equal(assertUserCompatibility(response,failure,{},before,after).completePhysicalBusinessFactsUnchanged,true);
    for(const key of['nativeRollbackSqlObserved','nativeSdkRollbackObserved'])assert.throws(()=>assertUserCompatibility({...response,actualWriteOutcome:{...outcome,[key]:false}},failure,{},before,after));
    const dirty=structuredClone(after);dirty.rows.platform_user.push({id:user,username:'pure-only'});assert.throws(()=>assertUserCompatibility(response,failure,{},before,dirty));
    const audit=structuredClone(after);audit.rows.audit_log.push({id:event,target_id:user});assert.throws(()=>assertUserCompatibility(response,failure,{},before,audit));
});
test('Rust no-commit physical evidence never becomes a Native or Rust statement-capture claim',()=>{
    const checked=assertUserCompatibility({status:500,executionBackend:'rust',actualWriteOutcome:{...outcome,nativeTransactionCaptureApplicable:false,nativeRollbackSqlObserved:false,nativeSdkRollbackObserved:false}},failure,{},frame(),frame());assert.equal(checked.nativeRollbackStatementObserved,false);assert.equal(checked.RustRollbackStatementClaimed,false);
    assert.throws(()=>assertUserCompatibility({status:500,executionBackend:'rust',actualWriteOutcome:outcome},failure,{},frame(),frame()));
});
test('validation before business DML is a separate observed branch and does not erase an earlier auth COMMIT',()=>{
    const authSql=[{phase:'start',command:'UPDATE',relations:['auth_session']},{phase:'end',command:'COMMIT',backendPid:123,queryId:7,sqlSha256:'a'.repeat(64)}],observed=observeUserRequestWrites({executionBackend:'nest',sourceCaseId:'m2.1',index:7,sdkCommittedCreates:0,pgCommittedCreates:0,sql:authSql,sdkEvents:[{event:'afterTransactionCommit'}],sqlCaptureComplete:true});assert.equal(observed.nativeFailureBoundary,'no-business-write-start-observed');assert.equal(observed.nativeTransactionQueries[0].command,'COMMIT');assert.equal(observed.allNativeTransactionsAbsentClaimed,false);assert.equal(assertUserCompatibility({status:500,executionBackend:'nest',actualWriteOutcome:observed},failure,{},frame(),frame()).nativeRollbackStatementObserved,false);
    const business=observeUserRequestWrites({executionBackend:'nest',sourceCaseId:'m2.1',index:7,sdkCommittedCreates:0,pgCommittedCreates:0,sql:[...authSql,{phase:'start',command:'INSERT',relations:['platform_user']}],sdkEvents:[],sqlCaptureComplete:true});assert.throws(()=>assertUserCompatibility({status:500,executionBackend:'nest',actualWriteOutcome:business},failure,{},frame(),frame()));
});
test('the two precise original relationship failures refuse SQL-only or SDK-only parent creation traces',()=>{
    const sql=[{phase:'start',command:'INSERT',relations:['platform_user']},{phase:'end',command:'ROLLBACK'}],sdkEvents=[{event:'afterCreate',table:'platform_user'},{event:'afterTransactionRollback'}],step={...failure,expectedNativeFailureBoundary:'business-write-rollback-observed'},observe=(sql,sdkEvents)=>observeUserRequestWrites({executionBackend:'nest',sourceCaseId:'m2.1',index:7,sdkCommittedCreates:0,pgCommittedCreates:0,sql,sdkEvents,sqlCaptureComplete:true});
    assertUserCompatibility({status:500,executionBackend:'nest',actualWriteOutcome:observe(sql,sdkEvents)},step,{},frame(),frame());
    assert.throws(()=>assertUserCompatibility({status:500,executionBackend:'nest',actualWriteOutcome:observe(sql,[{event:'afterTransactionRollback'}])},step,{},frame(),frame()));
    assert.throws(()=>assertUserCompatibility({status:500,executionBackend:'nest',actualWriteOutcome:observe([{phase:'end',command:'ROLLBACK'}],sdkEvents)},step,{},frame(),frame()));
});
test('ignored expectedVersion requires the real physical increment and original detail projection, while duplicate failures change no business table',()=>{
    const before=frame(),after=frame();before.rows.platform_user=[{id:user,display_name:'before',row_version:3}];after.rows.platform_user=[{id:user,display_name:'not committed',row_version:4}];after.rows.audit_log=[{id:event,target_id:user,target_type:'PlatformUser',event_type:'platform.user.updated',request_id:null}];
    const step={expect:'inherited-user-request-version-ignored',body:{displayName:'not committed',expectedVersion:2147483647}},response={status:200,body:{id:user,displayName:'not committed'}};assert.equal(assertUserCompatibility(response,step,{newUser:{id:user}},before,after).actualUserUpdate,true);
    assert.throws(()=>assertUserCompatibility({...response,body:{...response.body,rowVersion:4}},step,{newUser:{id:user}},before,after));const bad=structuredClone(after);bad.rows.platform_user[0].row_version=3;assert.throws(()=>assertUserCompatibility(response,step,{newUser:{id:user}},before,bad));
    assertUserCompatibility({status:409},{expect:'inherited-user-duplicate-unchanged'},{},before,structuredClone(before));assert.throws(()=>assertUserCompatibility({status:409},{expect:'inherited-user-duplicate-unchanged'},{},before,after));
});
