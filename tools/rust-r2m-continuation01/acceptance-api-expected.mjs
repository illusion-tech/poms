// Finite response/fact predicates. The current TS-owned schema remains input;
// these checks do not parse/replace a server DTO or grant row ownership.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {expectedPreparedTodos} from './scenario-input.mjs';
import {assertUserCompatibility} from './acceptance-api-user-compatibility.mjs';
import {assertHandoverArchive} from './acceptance-api-zip.mjs';
import {verifyM4VersionCompatibilitySource,assertUnpreparedVersionFailure,assertPreparedVersionPositive,assertPreparedSingleProviderDefault} from './acceptance-api-m4-source-check.mjs';

const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value==='object' ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stable(item)])) : value;
const equal = (a,b) => JSON.stringify(stable(a))===JSON.stringify(stable(b));

export function schemaIssues(value, schema, spec, at='$', depth=0) {
    assert(depth<256,'Schema/body recursion bound exceeded');
    if(schema===true || schema===null || schema===undefined || typeof schema==='object'&&Object.keys(schema).length===0)return [];
    if(schema===false)return [{path:at,rule:'false-schema'}];
    if(schema.$ref){assert(schema.$ref.startsWith('#/components/schemas/'),'Only pinned local schema refs supported');const name=schema.$ref.slice(21);assert(Object.hasOwn(spec.components.schemas,name),'Missing schema ref');if(value===null&&schema.nullable===true)return [];return schemaIssues(value,spec.components.schemas[name],spec,at,depth+1)}
    if(value===null)return schema.nullable===true || schema.type==='null' || schema.enum?.includes(null)?[]:[{path:at,rule:'null'}];
    const out=[];
    if(schema.allOf)for(const child of schema.allOf)out.push(...schemaIssues(value,child,spec,at,depth+1));
    if(schema.anyOf && !schema.anyOf.some(child=>schemaIssues(value,child,spec,at,depth+1).length===0))out.push({path:at,rule:'anyOf'});
    if(schema.oneOf && schema.oneOf.filter(child=>schemaIssues(value,child,spec,at,depth+1).length===0).length!==1)out.push({path:at,rule:'oneOf'});
    if(schema.enum && !schema.enum.some(item=>equal(item,value)))out.push({path:at,rule:'enum'});
    const type=schema.type;
    const valid=type===undefined || type==='object'&&typeof value==='object'&&!Array.isArray(value) || type==='array'&&Array.isArray(value) || type==='string'&&typeof value==='string' || type==='boolean'&&typeof value==='boolean' || type==='number'&&typeof value==='number'&&Number.isFinite(value) || type==='integer'&&typeof value==='number'&&Number.isInteger(value);
    if(!valid)return [...out,{path:at,rule:'type'}];
    if(typeof value==='string'){
        // Current Zod source string constraints use UTF16 code units. Do not
        // silently change this to codepoint/UTF8 length in the migration.
        if(schema.minLength!==undefined && value.length<schema.minLength)out.push({path:at,rule:'minLength'});
        if(schema.maxLength!==undefined && value.length>schema.maxLength)out.push({path:at,rule:'maxLength'});
        if(schema.pattern && !new RegExp(schema.pattern).test(value))out.push({path:at,rule:'pattern'});
        if(schema.format==='uuid'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))out.push({path:at,rule:'uuid'});
    }
    if(typeof value==='number'){
        if(schema.minimum!==undefined && (schema.exclusiveMinimum===true?value<=schema.minimum:value<schema.minimum))out.push({path:at,rule:'minimum'});
        if(schema.maximum!==undefined && (schema.exclusiveMaximum===true?value>=schema.maximum:value>schema.maximum))out.push({path:at,rule:'maximum'});
    }
    if(Array.isArray(value)){
        if(schema.minItems!==undefined&&value.length<schema.minItems)out.push({path:at,rule:'minItems'});
        if(schema.maxItems!==undefined&&value.length>schema.maxItems)out.push({path:at,rule:'maxItems'});
        if(schema.uniqueItems && new Set(value.map(item=>JSON.stringify(stable(item)))).size!==value.length)out.push({path:at,rule:'uniqueItems'});
        if(schema.items)for(const [index,item]of value.entries())out.push(...schemaIssues(item,schema.items,spec,at+'['+index+']',depth+1));
    }else if(value&&typeof value==='object'){
        for(const key of schema.required??[])if(!Object.hasOwn(value,key))out.push({path:at+'.'+key,rule:'required'});
        for(const [key,item]of Object.entries(value)){
            if(schema.properties&&Object.hasOwn(schema.properties,key))out.push(...schemaIssues(item,schema.properties[key],spec,at+'.'+key,depth+1));
            else if(schema.additionalProperties===false)out.push({path:at+'.'+key,rule:'additionalProperties'});
            else if(schema.additionalProperties&&typeof schema.additionalProperties==='object')out.push(...schemaIssues(item,schema.additionalProperties,spec,at+'.'+key,depth+1));
        }
    }
    return out;
}

export function responseSchema(spec, operationId, status) {
    const found=[];for(const operations of Object.values(spec.paths))for(const op of Object.values(operations))if(op?.operationId===operationId)found.push(op);
    assert.equal(found.length,1,'Exactly one original operation schema required');
    const response=found[0].responses?.[String(status)]??found[0].responses?.default;
    return {schema:response?.content?.['application/json']?.schema??null,declared:!!response,status};
}

export function assertResponse(response, step, {spec,operationId}={}) {
    assert(Number.isInteger(response?.status)&&response.status>=100&&response.status<=599,'Missing actual response status');
    assert(response.transportComplete===true,'Incomplete actual transport');
    assert(/^[0-9a-f]{64}$/.test(response.bodyBytesSha256??'')&&Number.isSafeInteger(response.bodyBytesLength)&&response.bodyBytesLength>=0,'Raw response byte identity required');
    if(step.expectedStatus!==undefined)assert.equal(response.status,step.expectedStatus,'Declared finite response status differs');
    if(step.binaryExpected)assert.equal(response.bodyBytesSha256,step.binaryExpected,'Downloaded bytes differ from source payload');
    if(spec&&operationId&&response.status>=200&&response.status<300){
        const selected=responseSchema(spec,operationId,response.status);
        // Original create201/spec200 is retained as an explicit schema-source
        // substitution, not described as a spec-declared201.
        const fallback=!selected.declared&&response.status===201?responseSchema(spec,operationId,200):selected;
        if(fallback.schema)assert.equal(schemaIssues(response.body,fallback.schema,spec).length,0,'Actual response differs from full original schema');
        return {status:response.status,schemaChecked:!!fallback.schema,schemaStatus:fallback.status,original201Spec200:!selected.declared&&fallback.declared};
    }
    return {status:response.status,schemaChecked:false};
}

export function verifyInternal(result,operation) {
    assert(result?.operation===operation&&result.complete===true&&Array.isArray(result.observations),'Complete actual named internal result required');
    if(operation==='common-shared-uow'){
        const variants=['success-commit','success-rollback','gate-rollback','gate-continue-commit'];
        assert.deepEqual(result.observations.map(item=>item.variant).sort(),variants.sort(),'All four UoW variants required');
        for(const item of result.observations)assert(item.actualOuterCommitOrRollback===true&&item.independentVisibility===true&&item.fullParentAndChildFacts===true,'UoW actual outer/visibility facts missing');
    }else if(operation==='numbers-nine-scopes'){
        assert(result.scopeCount===9&&result.utcBoundaryObserved===true&&result.concurrentUnique===true&&result.onlyBeforeAbsentScopePeriods===true,'Number scope/UTC/concurrency identity missing');
        assert(result.independentEmAndBorrowedConnectionSeparate===true,'Native independent and Rust borrowed semantics must remain separate');
    }else assert.fail('Unknown internal operation');
    return {operation,complete:true,observations:result.observations.length};
}

export function validateFactFrame(frame, tables) {
    assert(frame?.readOnly===true&&frame.complete===true&&frame.rows&&frame.columns&&frame.primaryKeys,'Complete read-only physical fact frame required');
    assert(/^[0-9a-f]{64}$/.test(frame.catalogDigest??''),'Catalog fingerprint required');
    assert(frame.outsideScope?.complete===true&&frame.outsideScope.tablesScanned===107&&Array.isArray(frame.outsideScope.unexpectedChanges)&&frame.outsideScope.unexpectedChanges.length===0,'Full107 outside-scope write comparison required');
    for(const table of tables){assert(Array.isArray(frame.rows[table])&&Array.isArray(frame.columns[table])&&Array.isArray(frame.primaryKeys[table])&&frame.primaryKeys[table].length>0,'Expected physical table omitted');const columns=[...frame.columns[table]].sort();assert.equal(new Set(columns).size,columns.length,'Duplicate physical column');const keys=new Set();for(const item of frame.rows[table]){assert.deepEqual(Object.keys(item).sort(),columns,'Incomplete physical row projection');const identity=JSON.stringify(frame.primaryKeys[table].map(key=>{assert(Object.hasOwn(item,key),'Missing physical PK');return item[key]}));assert(!keys.has(identity),'Duplicate physical row');keys.add(identity)}}
    return {tables:tables.length,rows:tables.reduce((sum,table)=>sum+frame.rows[table].length,0),catalogDigest:frame.catalogDigest};
}

export function assertSnapshotChains(frame,projectId) {
    const finals=(frame.rows.commission_final_settlement_snapshot??[]).filter(row=>row.project_id===projectId),rules=(frame.rows.commission_rule_explanation_snapshot??[]).filter(row=>row.project_id===projectId);
    const currentFinal=finals.filter(row=>row.is_current),currentRule=rules.filter(row=>row.is_current);
    assert.equal(currentFinal.length,1,'Exactly one actual current final snapshot required');assert.equal(currentRule.length,1,'Exactly one actual current rule snapshot required');
    assert.equal(currentRule[0].final_settlement_snapshot_id,currentFinal[0].id,'Dual snapshot current link differs');
    for(const rows of [finals,rules])for(const item of rows)if(item.supersedes_id!==null){const prior=rows.find(row=>row.id===item.supersedes_id);assert(prior&&prior.is_current===false&&item.version===prior.version+1,'Version/supersedes chain broken')}
    return {finalVersions:finals.length,ruleVersions:rules.length};
}

export function publicResponseIdentity(response) {
    const allowed=new Set(['content-type','content-length','content-disposition','x-request-id']);
    const headers=Object.fromEntries(Object.entries(response.headers??{}).filter(([key])=>allowed.has(key.toLowerCase())).map(([key,value])=>[key.toLowerCase(),value]));
    // Server error payload, cookies, location OAuth state and arbitrary headers
    // are never returned by this public projection.
    return {status:response.status,bodyBytesSha256:response.bodyBytesSha256,bodyBytesLength:response.bodyBytesLength,headers};
}

export const valueDigest=(value)=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');

export function assertApiSemantic(response,step,bindings,after,{sourceReader,before}={}){
    if(['inherited-unprepared-version-complete-500','owned-K-prepared-version-positive'].includes(step.expect)){
        assert(sourceReader&&before,'Exact current source and full physical before/after required');verifyM4VersionCompatibilitySource(sourceReader);
        return step.expect==='inherited-unprepared-version-complete-500'?assertUnpreparedVersionFailure(response,{bindings,before,after}):assertPreparedVersionPositive(response,{bindings,before,after});
    }
    if(step.expect==='owned-K-prepared-single-provider-default'){assert(sourceReader&&before);verifyM4VersionCompatibilitySource(sourceReader);return assertPreparedSingleProviderDefault(response,{step,bindings,before,after});}
    const userCompatibility=assertUserCompatibility(response,step,bindings,before,after);if(userCompatibility)return userCompatibility;
    if(step.expect==='owned-rejected-adjustment-resubmit-unchanged'){
        assert.equal(response.status,400);assert.equal(response.body.statusCode,400);assert.equal(response.body.error,'Bad Request');assert.equal(response.body.message,'CommissionAdjustment '+bindings.adjustment.id+' cannot submit approval in status rejected');assert.equal(before.rows.commission_adjustment.find(row=>row.id===bindings.adjustment.id)?.status,'rejected');assert.deepEqual(Object.keys(after.rows).sort(),Object.keys(before.rows).sort());assert.equal(Object.keys(after.rows).length,107);for(const table of Object.keys(after.rows))if(!['auth_session','audit_log','security_event'].includes(table))assert.deepEqual(after.rows[table],before.rows[table],'Rejected same-entity resubmission changed actual complete business facts');return{kind:'actual-original-rejected-adjustment-submission-denied',originalTargetId:bindings.adjustment.id,status:400,completeBusinessTablesUnchanged:104,sameEntityResubmissionSucceeded:false};
    }
    if(step.expect==='owned-fresh-adjustment-approved'||step.expect==='owned-fresh-adjustment-executed'){
        const original=after.rows.commission_adjustment.find(row=>row.id===bindings.adjustment.id),fresh=after.rows.commission_adjustment.find(row=>row.id===bindings.freshAdjustment.id);assert(original&&fresh&&original.id!==fresh.id&&original.status==='rejected');assert.deepEqual(original,before.rows.commission_adjustment.find(row=>row.id===original.id),'Fresh target processing changed the original rejected target');assert.equal(fresh.status,step.expect==='owned-fresh-adjustment-approved'?'approved':'executed');assert.equal(fresh.related_payout_id,bindings.firstApproved.id);assert.equal(before.rows.commission_adjustment.find(row=>row.id===fresh.id)?.status,step.expect==='owned-fresh-adjustment-approved'?'pending-approval':'approved');if(step.expect==='owned-fresh-adjustment-approved'){const approval=after.rows.approval_record.find(row=>row.id===bindings.freshAdjustmentApproval.id);assert(approval&&approval.target_object_id===fresh.id&&approval.current_status==='approved');const pending=before.rows.todo_item.filter(row=>row.source_id===approval.id&&row.target_object_id===fresh.id&&['open','processing'].includes(row.status));assert.equal(pending.length,1);assert(after.rows.todo_item.some(row=>row.id===pending[0].id&&row.status==='completed'&&row.completed_at));assert.equal(response.body.targetId,fresh.id);assert.equal(response.body.targetType,'commission-adjustment');assert.equal(response.body.resultStatus,'approved');assert.equal(response.body.businessStatusAfter,'approved');assert.equal(response.body.approvalRecordId,approval.id);}else{assert.equal(response.body.id,fresh.id);assert.equal(response.body.status,'executed');assert(fresh.executed_at);assert.equal(after.rows.commission_payout.find(row=>row.id===fresh.related_payout_id)?.status,'suspended');}return{kind:'actual-independent-fresh-adjustment-positive-chain',originalRejectedTargetId:original.id,freshTargetId:fresh.id,status:fresh.status,sameEntityResubmissionClaimed:false};
    }
    if(step.settlementSnapshotExpectation){
        const chain=assertSnapshotChains(after,bindings.project.id),finals=after.rows.commission_final_settlement_snapshot.filter(row=>row.project_id===bindings.project.id),rules=after.rows.commission_rule_explanation_snapshot.filter(row=>row.project_id===bindings.project.id),current=finals.find(row=>row.is_current),rule=rules.find(row=>row.is_current);for(const[field,value]of Object.entries(step.settlementSnapshotExpectation))assert.equal(current[field],value,'Actual original settlement state differs');assert.equal(finals.length,before.rows.commission_final_settlement_snapshot.filter(row=>row.project_id===bindings.project.id).length+1);assert.equal(rules.length,before.rows.commission_rule_explanation_snapshot.filter(row=>row.project_id===bindings.project.id).length+1);assert.equal(current.created_by,step.snapshotActorId);assert.equal(rule.created_by,step.snapshotActorId);return{kind:'actual-dual-settlement-snapshot-chain-observation',projectId:bindings.project.id,...chain,currentFinalId:current.id,currentRuleId:rule.id,statuses:step.settlementSnapshotExpectation};
    }
    if(step.expect==='owned-approval-stale-unchanged'){
        assert.equal(response.status,409);for(const table of['approval_record','todo_item','commission_adjustment','commission_payout','commission_final_settlement_snapshot','commission_rule_explanation_snapshot'])assert.deepEqual(after.rows[table],before.rows[table],'A stale approval version changed actual business facts');
    }
    if(step.expect==='owned-new-user-roles'){
        const rows=after.rows.user_role_assignment.filter(row=>row.user_id===bindings.newUser.id&&row.status==='active');assert.equal(rows.length,1);assert.equal(rows[0].role_id,bindings.newRole.id);assert.equal(response.body.id,bindings.newUser.id);assert(response.body.roles.includes(bindings.names.role),'The actual role command must return its real user/role projection');
    }
    if(step.expect==='owned-new-user-memberships'){
        const rows=after.rows.user_org_membership.filter(row=>row.user_id===bindings.newUser.id&&row.status==='active');assert.equal(rows.length,2);assert(rows.some(row=>row.org_unit_id===bindings.newOrg.id&&row.membership_type==='primary'));assert(rows.some(row=>row.org_unit_id===bindings.orgs.admin&&row.membership_type==='secondary'));assert.equal(after.rows.platform_user.find(row=>row.id===bindings.newUser.id).primary_org_unit_id,bindings.newOrg.id);assert.equal(response.body.id,bindings.newUser.id);
    }
    if(step.expect==='owned-platform-user-audit'){
        const rows=(after.rows.audit_log??[]).filter(row=>row.target_id===bindings.auditUser.id&&row.target_type==='PlatformUser'&&row.event_type==='platform.user.created');
        assert(rows.length>0,'Actual current-scope user create must have a certified physical audit');assert(Array.isArray(response.body)&&response.body.some(row=>rows.some(actual=>actual.id===row.id)&&row.targetId===bindings.auditUser.id&&row.eventType==='platform.user.created'),'Actual target-audit HTTP read must consume that owned event');
    }
    if(step.expect==='owned-pending-approval-todo'){
        const rows=(after.rows.todo_item??[]).filter(row=>row.source_type==='approval-record'&&row.source_id===step.sourceApprovalId&&row.target_object_id===step.sourceTargetId&&row.assignee_user_id===step.sourceAssigneeId&&['open','processing'].includes(row.status));assert(rows.length>0,'Actual owned pending approval must produce its open/processing Todo');
        assert(Array.isArray(response.body)&&rows.every(row=>response.body.some(dto=>dto.id===row.id&&dto.sourceId===step.sourceApprovalId&&dto.targetObjectId===step.sourceTargetId&&dto.assigneeUserId===step.sourceAssigneeId&&dto.allowedActions.includes('approve')&&dto.allowedActions.includes('reject'))),'Actual Todo HTTP projection must expose the certified approval actions');
    }
    if(step.expect==='closed-target-todo')assert(Array.isArray(response.body)&&!response.body.some(row=>row.targetObjectId===step.sourceTargetId&&['open','processing'].includes(row.status)),'Completed source approval Todo must leave the open list');
    if(step.expect==='three-prepared-nonapproval-facts'){
        assert(sourceReader,'Pinned original Todo projection required');const ids=bindings.prepared.todoInput.ids.todos,expected=expectedPreparedTodos({sourceReader,frame:after,assigneeId:bindings.actors.viewer,ownedTodoIds:ids}).dtos;assert.equal(expected.length,3);assert(Array.isArray(response.body));
        const actual=response.body.filter(row=>ids.includes(row.id)).sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(actual,expected.sort((a,b)=>a.id.localeCompare(b.id)),'All physical source fields must survive the actual original Todo projection');
    }
    if(step.expect==='owned-actual-two-version-chain'){
        const first=after.rows.attachment.filter(row=>row.id===bindings.localAttachment.id),latest=after.rows.attachment.filter(row=>row.id===bindings.localVersionAttachment.id);assert.equal(first.length,1);assert.equal(latest.length,1);assert.equal(first[0].version_group_id,first[0].id);assert.equal(latest[0].version_group_id,first[0].id);assert.equal(latest[0].previous_attachment_id,first[0].id);assert.equal(latest[0].version_no,first[0].version_no+1);assert.equal(first[0].is_latest,false);assert.equal(latest[0].is_latest,true);assert.equal(latest[0].is_final,true);assert.equal(latest[0].checksum_sha256,bindings.upload.version.sha256);assert(Array.isArray(response.body)&&response.body.length===2);for(const row of[first[0],latest[0]])assert(response.body.some(dto=>dto.id===row.id&&dto.versionGroupId===row.version_group_id&&dto.versionNo===row.version_no&&dto.isLatest===row.is_latest&&dto.isFinal===row.is_final));
    }
    if(step.expect==='owned-handover-ordinary-and-sensitive-candidates'){
        assert.equal(response.body.handoverId,bindings.handover.id);assert.equal(response.body.projectId,bindings.project.id);assert(Array.isArray(response.body.items));assert(response.body.items.some(row=>row.attachmentId===bindings.packageAttachment.id&&row.status==='included'));assert(response.body.items.some(row=>row.attachmentId===bindings.sensitiveAttachment.id&&row.status==='sensitive-excluded'));
    }
    if(step.expect==='owned-original-handover-detail'){
        assert.equal(response.body.handoverId,bindings.handover.id);assert.equal(response.body.projectId,bindings.project.id);assert.equal(response.body.handoverStatus,'draft');assert.equal(response.body.rowVersion,after.rows.project_handover.find(row=>row.id===bindings.handover.id).row_version);assert.deepEqual(response.body.blockingReasons,[]);assert.equal(response.body.participantConfirmationSummary.status,'confirmed');
    }
    if(step.expect==='owned-original-handover-confirmation'){
        const handover=after.rows.project_handover.find(row=>row.id===bindings.handover.id),freezes=after.rows.project_receipt_judgment_freeze.filter(row=>row.project_id===bindings.project.id&&row.source_id===bindings.handover.id&&row.is_current);assert(handover&&handover.status==='confirmed');assert.equal(handover.confirmed_by,bindings.actors.admin);assert.equal(freezes.length,1);assert(!before.rows.project_receipt_judgment_freeze.some(row=>row.id===freezes[0].id));assert.equal(freezes[0].receipt_judgment_mode,'milestone-receipt');assert.equal(freezes[0].created_by,bindings.actors.admin);assert.equal(response.body.targetId,handover.id);assert.equal(response.body.businessStatusAfter,'confirmed');assert.equal(response.body.receiptJudgmentFreezeId,freezes[0].id);
    }
    if(step.expect==='owned-ready-package-summary'){
        const row=after.rows.attachment_download_package.find(row=>row.id===bindings.package.id);assert(row&&row.status==='ready');assert.equal(response.body.id,row.id);assert.equal(response.body.status,'ready');assert.deepEqual(response.body.manifestSummary,row.manifest_summary);assert.equal(Date.parse(response.body.expiresAt)-Date.parse(response.body.createdAt),86400000);for(const field of['storageKey','storageProvider','storageBucket'])assert(!Object.hasOwn(response.body,field),'Package summary must not expose its storage location');
    }
    if(step.expect==='zip-manifest-crc-and-source-bytes')return assertHandoverArchive({sourceReader,response,bindings,after});
    if(step.expect==='owned-other-attachment-target-isolation'){
        assert(Array.isArray(response.body));assert(response.body.some(row=>row.id===bindings.localVersionAttachment.id));assert(!response.body.some(row=>row.id===bindings.faultAttachment.id));assert.equal(after.rows.attachment_link.find(row=>row.attachment_id===bindings.faultAttachment.id&&row.status==='active'&&row.target_type==='project').target_id,bindings.handoverProject.id);assert.equal(after.rows.attachment_link.find(row=>row.attachment_id===bindings.localVersionAttachment.id&&row.status==='active'&&row.target_type==='project').target_id,bindings.localProject.id);assert.notEqual(bindings.localProject.id,bindings.handoverProject.id);
    }
    if(step.expect==='owned-missing-local-object'){assert.equal(response.status,404);assert(after.rows.attachment.some(row=>row.id===bindings.faultAttachment.id),'A controlled missing file must not erase its certified metadata')}
    if(['owned-supplier-readiness-success','owned-supplier-readiness-timeout'].includes(step.expect)){
        assert.equal(response.status,200);assert.equal(response.body.capability,'external-org-sync');assert(Array.isArray(response.body.checks));const success=step.expect==='owned-supplier-readiness-success';assert.equal(response.body.status,success?'success':'failed');for(const key of['provider','enabled','configStatus','clientCredentials'])assert(response.body.checks.some(row=>row.key===key&&row.status==='passed'),'A local configuration failure cannot stand for an actual upstream timeout');const token=response.body.checks.find(row=>row.key==='tenantAccessToken'),department=response.body.checks.find(row=>row.key==='departmentReadAccess');assert(token&&department);if(success)assert(token.status==='passed'&&department.status==='passed');else assert(token.status==='failed'&&department.status==='skipped'||token.status==='passed'&&department.status==='failed','Real external-org readiness must expose its actual upstream failure branch');
    }
    if(step.expect==='owned-external-login-session'){
        assert.equal(response.body.user.id,bindings.actors.viewer);const ticket=after.rows.external_login_ticket.find(row=>row.id===bindings.loginTicket.id);assert(ticket&&ticket.status==='consumed'&&ticket.consumed_at!==null);assert(after.rows.auth_session.some(row=>row.user_id===bindings.actors.viewer&&row.revoked_at===null),'Real ticket consumption must create the owned viewer session');
    }
    if(step.expect==='owned-oauth-grant-success'){
        assert.equal(response.status,302);assert.equal(typeof response.headers.location,'string');const location=new URL(response.headers.location,'http://127.0.0.1:10080');assert.equal(location.origin,'http://127.0.0.1:10080');assert.equal(location.pathname,'/platform/users');assert.equal(location.searchParams.get('identityProviderGrant'),'success');assert.equal(location.searchParams.get('identityProviderConfigId'),bindings.identityProvider.id);const rows=after.rows.identity_provider_oauth_grant.filter(row=>row.identity_provider_config_id===bindings.identityProvider.id&&row.poms_user_id===bindings.actors.admin);assert.equal(rows.length,1);assert.equal(rows[0].status,'active');assert.equal(typeof rows[0].encrypted_access_token,'string');assert(rows[0].encrypted_access_token.length>0);
    }
    if(step.expect==='owned-oauth-grant-summary'){
        assert.equal(response.body.id,bindings.oauthGrantRow.id);assert.equal(response.body.identityProviderConfigId,bindings.identityProvider.id);assert.equal(response.body.pomsUserId,bindings.actors.admin);assert.equal(response.body.status,'active');assert.deepEqual(response.body.missingRequiredScopes,[]);for(const name of['accessToken','refreshToken','encryptedAccessToken','encryptedRefreshToken'])assert(!Object.hasOwn(response.body,name),'The actual grant summary must redact its secrets');
    }
    if(step.expect==='owned-ticket-replay-rejected'){assert.equal(response.status,401);const beforeSessions=before.rows.auth_session.filter(row=>row.user_id===bindings.actors.viewer).map(row=>row.id).sort(),afterSessions=after.rows.auth_session.filter(row=>row.user_id===bindings.actors.viewer).map(row=>row.id).sort();assert.deepEqual(afterSessions,beforeSessions,'Single-use ticket replay must not issue another session')}
    if(step.expect==='owned-external-org-applied'){
        assert.equal(response.body.status,'applied');assert.equal(response.body.approvedItemCount,1);assert.equal(response.body.failedItemCount,0);const candidate=bindings.syncDiff.candidateSnapshot,rows=after.rows.org_unit.filter(row=>row.code===candidate.targetCode);assert.equal(rows.length,1);assert.equal(rows[0].name,candidate.targetName);assert.equal(rows[0].created_by,bindings.actors.admin);assert.equal(rows[0].parent_id,candidate.targetParentOrgUnitId);const diff=after.rows.org_sync_diff_item.find(row=>row.id===bindings.syncDiff.id);assert(diff&&diff.status==='applied');
        // Original H assigns a database-default org UUID to mapping/diff before
        // flush. Its observed NULL/absent association is retained and compared,
        // never repaired or asserted as an invented successful association.
    }
    if(step.expect==='owned-org-sync-preview'){assert.equal(response.body.sourceId,bindings.orgSource.id);assert.equal(response.body.status,'previewed');assert.equal(response.body.totalItemCount,1);assert.equal(response.body.failedItemCount,0);assert(after.rows.org_sync_run.some(row=>row.source_id===bindings.orgSource.id&&row.status==='previewed'),'The real synthetic directory preview must persist its source-linked run')}
    if(step.expect==='owned-synced-org-in-platform-tree'){
        const nodes=[],walk=value=>{if(Array.isArray(value))for(const child of value)walk(child);else if(value&&typeof value==='object'){if(value.id===bindings.syncedOrg.id)nodes.push(value);for(const[key,child]of Object.entries(value))if(['children','items','nodes'].includes(key))walk(child)}};walk(response.body);assert.equal(nodes.length,1);assert.equal(nodes[0].code,bindings.syncedOrg.code);assert.equal(nodes[0].name,bindings.syncedOrg.name);
    }
    if(step.expect==='owned-viewer-in-platform-users')assert(Array.isArray(response.body)&&response.body.some(row=>row.id===bindings.actors.viewer),'Actual platform read must still expose the certified owned viewer');
    return null;
}
