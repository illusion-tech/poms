// Exact inherited R2D create/profile behavior. No fixture, DB or HTTP on import.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const userCompatibilitySources=Object.freeze([
    {file:'apps/poms-api/src/app/features/platform/platform.service.ts',rawBytesSha256:'b46095aedad3405cd3f5e80cb18d6d1102a7bcf1bfe8af7a28da66fc3688f0db'},
    {file:'apps/poms-api/src/app/features/platform/platform.repository.ts',rawBytesSha256:'d8c91a3fa962eaee182294c9f1510dc8b9e44806cca3194554ebee8b17e1ed34'},
    {file:'apps/poms-api/src/app/features/platform/platform-user.entity.ts',rawBytesSha256:'9a51224004ab08a42f130612c82f4a5cd523d6611bff5e57df7f4108e6e80ef0'},
    {file:'apps/poms-api/src/app/features/platform/user-role-assignment.entity.ts',rawBytesSha256:'cbbaafd90c8ce4237314f153b09cc9fbc44138a88692c6d55c75bc66eee35ca5'},
    {file:'apps/poms-api/src/app/features/platform/user-org-membership.entity.ts',rawBytesSha256:'5e70a10cd11deb07270affaaa831c7a1be7d1ffd01682b344c09f3a79d2a18de'},
    {file:'docs/design/archive/slices/rust-r2d-corrective-checkpoint.md',rawBytesSha256:'5568b21ed3e6467b367887e2cc9975673f8b55cc9b13913fa9e045e61651918e'},
    {file:'docs/design/archive/slices/rust-r2d-closeout.md',rawBytesSha256:'339fafab0c1c3813d7769fc1c99448682df56bfca206a02579f4968b1cfb149a'}
]);
export function verifyUserCompatibilitySource(reader){
    assert(reader,'Pinned original source reader required');for(const pin of userCompatibilitySources)assert.equal(sha(reader.read(pin.file)),pin.rawBytesSha256,'Original R2D create/version compatibility source changed');reader.assertUnchanged();
    return{kind:'R2M-inherited-R2D-user-compatibility-source',sources:userCompatibilitySources,productChanged:false,relationshipCreateBeforeFlushFails:true,requestExpectedVersionIgnored:true};
}
const businessTables=Object.freeze(['platform_user','local_credential','user_role_assignment','user_org_membership','org_unit','role','audit_log','security_event']);
export function observeUserRequestWrites({executionBackend,sourceCaseId,index,sdkCommittedCreates,pgCommittedCreates,sql=[],sdkEvents=[],sqlCaptureComplete}){
    assert(['nest','rust'].includes(executionBackend));const native=executionBackend==='nest',businessSql=sql.filter(row=>row.phase==='start'&&['INSERT','UPDATE','DELETE'].includes(row.command)&&row.relations?.some(table=>businessTables.includes(table))),businessCreates=sdkEvents.filter(row=>row.event==='afterCreate'&&businessTables.includes(row.table)),rollbackSql=sql.some(row=>row.command==='ROLLBACK'&&row.phase==='end'),rollbackSdk=sdkEvents.some(row=>row.event==='afterTransactionRollback');
    return{kind:'actual-request-drained-create-and-transaction-observation',complete:true,sourceCaseId,index,sdkCommittedCreates,pgCommittedCreates,nativeTransactionCaptureApplicable:native,nativeSqlCaptureComplete:native?sqlCaptureComplete===true:null,nativeBusinessSqlStarts:native?businessSql.length:null,nativeBusinessSdkCreateEvents:native?businessCreates.length:null,nativePlatformUserInsertStarts:native?businessSql.filter(row=>row.command==='INSERT'&&row.relations.includes('platform_user')).length:null,nativePlatformUserSdkAfterCreates:native?businessCreates.filter(row=>row.table==='platform_user').length:null,nativeRollbackSqlObserved:native&&rollbackSql,nativeSdkRollbackObserved:native&&rollbackSdk,nativeTransactionQueries:native?sql.filter(row=>row.phase==='end'&&['BEGIN','COMMIT','ROLLBACK','SAVEPOINT','RELEASE','ROLLBACK TO'].includes(row.command)).map(row=>({command:row.command,backendPid:row.backendPid,queryId:row.queryId,sqlSha256:row.sqlSha256})):[],nativeFailureBoundary:!native?null:businessSql.length===0&&businessCreates.length===0?'no-business-write-start-observed':rollbackSql&&rollbackSdk?'business-write-rollback-observed':'business-write-outcome-requires-review',allNativeTransactionsAbsentClaimed:false,RustRollbackStatementClaimed:false};
}
const ordered=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
function unchangedBusiness(before,after){
    for(const table of businessTables){assert(Array.isArray(before?.rows[table])&&Array.isArray(after?.rows[table]),'Complete inherited negative business table required');assert.deepEqual(ordered(after.rows[table]),ordered(before.rows[table]),'Inherited failure changed complete physical '+table+' facts')}
}
export function assertUserCompatibility(response,step,bindings,before,after){
    if(step.expect==='inherited-user-relationships-rollback'){
        assert.equal(response.status,500);assert(step.body.primaryOrgUnitId&&Array.isArray(step.body.initialRoleIds)&&step.body.initialRoleIds.length>0,'Keep the original nonempty relationship request');
        assert(!before.rows.platform_user.some(row=>row.username===step.body.username)&&!after.rows.platform_user.some(row=>row.username===step.body.username),'Failed original create must leave no user');unchangedBusiness(before,after);
        const outcome=response.actualWriteOutcome;assert(outcome?.complete===true&&outcome.sourceCaseId&&Number.isSafeInteger(outcome.index)&&outcome.sdkCommittedCreates===0&&outcome.pgCommittedCreates===0,'Actual failed-request create/commit drain must certify no committed rows');
        if(response.executionBackend==='nest'){
            assert(outcome.nativeTransactionCaptureApplicable===true&&outcome.nativeSqlCaptureComplete===true,'Complete original Native SQL capture is required for its observed failure boundary');
            if(step.expectedNativeFailureBoundary){assert.equal(outcome.nativeFailureBoundary,step.expectedNativeFailureBoundary,'This precise original request must retain its separately witnessed Native failure boundary');assert(outcome.nativePlatformUserInsertStarts>0&&outcome.nativePlatformUserSdkAfterCreates>0,'The two exact original relationship failures require both actual parent INSERT and SDK afterCreate before rollback')}
            if(outcome.nativeFailureBoundary==='no-business-write-start-observed')assert(outcome.nativeBusinessSqlStarts===0&&outcome.nativeBusinessSdkCreateEvents===0,'The no-business-write branch needs zero actual business SQL/SDK creates; auth transactions remain recorded');
            else assert(outcome.nativeFailureBoundary==='business-write-rollback-observed'&&outcome.nativeRollbackSqlObserved===true&&outcome.nativeSdkRollbackObserved===true,'A started business-write branch needs real Native SQL and SDK rollback');
        }
        else assert.equal(outcome.nativeTransactionCaptureApplicable,false,'A Native statement capture cannot stand for Rust SQL');
        return{kind:'inherited-user-create-negative-observation',completePhysicalBusinessFactsUnchanged:true,noCommittedCreates:true,nativeFailureBoundary:outcome.nativeFailureBoundary??null,nativeRollbackStatementObserved:response.executionBackend==='nest'&&outcome.nativeFailureBoundary==='business-write-rollback-observed',RustRollbackStatementClaimed:false};
    }
    if(step.expect==='inherited-user-duplicate-unchanged'){assert.equal(response.status,409);unchangedBusiness(before,after);return{kind:'inherited-user-duplicate-negative-observation',completePhysicalBusinessFactsUnchanged:true}}
    if(step.expect==='inherited-user-request-version-ignored'){
        assert.equal(response.status,200);assert.equal(step.body.expectedVersion,2147483647);const id=bindings.newUser.id,old=before.rows.platform_user.filter(row=>row.id===id),current=after.rows.platform_user.filter(row=>row.id===id);assert.equal(old.length,1);assert.equal(current.length,1);assert.notEqual(old[0].display_name,step.body.displayName);assert.equal(current[0].display_name,step.body.displayName);assert.equal(current[0].row_version,old[0].row_version+1);assert.equal(response.body.id,id);assert.equal(response.body.displayName,step.body.displayName);assert(!Object.hasOwn(response.body,'rowVersion'),'Original PlatformUserDetail does not project its physical row_version');
        const audits=after.rows.audit_log.filter(row=>row.target_id===id&&row.target_type==='PlatformUser'&&row.event_type==='platform.user.updated'&&!before.rows.audit_log.some(old=>old.id===row.id));assert.equal(audits.length,1);assert.equal(audits[0].request_id,null);return{kind:'inherited-request-version-ignored-positive-observation',actualUserUpdate:true,originalExpectedVersionPreserved:true};
    }
    return null;
}
