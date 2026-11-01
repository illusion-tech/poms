// Source projection only; A/Root grant a separate exact case+index admission.
// A legitimate null business-audit request_id is not a blanket scope alias.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=value=>createHash('sha256').update(value).digest('hex');
const platform='apps/poms-api/src/app/features/platform/platform.service.ts',controller='apps/poms-api/src/app/features/platform/platform.controller.ts',audit='apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts';
const pins=Object.freeze([{file:platform,rawBytesSha256:'b46095aedad3405cd3f5e80cb18d6d1102a7bcf1bfe8af7a28da66fc3688f0db'},{file:controller,rawBytesSha256:'84d2985622098536ddd1c3b4d6fadeacccb84b5b7b460cf8e23d18213afed45b'},{file:audit,rawBytesSha256:'0ecf6501a98490ae9ad60787edf82e87d742604df2a32e880d1af7102861fca4'}]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const profiles=[
    {cases:['m1.2'],steps:['replace-permissions','replace-default'],method:'PUT',path:/^\/api\/platform\/roles\/([0-9a-f-]{36})\/permissions$/,service:'assignRolePermissions',event:'platform.role.permissions.replaced',targetType:'PlatformRole',targetTable:'role'},
    {cases:['m1.3','m2.1'],steps:['memberships'],method:'PUT',path:/^\/api\/platform\/users\/([0-9a-f-]{36})\/org-memberships$/,service:'assignUserOrgMemberships',event:'platform.user.org-memberships.replaced',targetType:'PlatformUser',targetTable:'platform_user'},
    {cases:['m1.3'],steps:['disable'],method:'POST',path:/^\/api\/platform\/users\/([0-9a-f-]{36}):deactivate$/,service:'deactivateUser',event:'platform.user.deactivated',targetType:'PlatformUser',targetTable:'platform_user'},
    {cases:['m2.1'],steps:['assign-new-user-roles'],method:'PUT',path:/^\/api\/platform\/users\/([0-9a-f-]{36})\/roles$/,service:'assignUserRoles',event:'platform.user.roles.replaced',targetType:'PlatformUser',targetTable:'platform_user'},
    {cases:['m2.1'],steps:['ignored-request-version'],method:'PATCH',path:/^\/api\/platform\/users\/([0-9a-f-]{36})$/,service:'updateUser',event:'platform.user.updated',targetType:'PlatformUser',targetTable:'platform_user'},
    {cases:['m2.1'],steps:['org'],method:'POST',path:/^\/api\/platform\/org-units$/,service:'createOrgUnit',event:'platform.org-unit.created',targetType:'OrgUnit',targetTable:'org_unit',createdTargetField:'code'},
    {cases:['m2.1'],steps:['role'],method:'POST',path:/^\/api\/platform\/roles$/,service:'createRole',event:'platform.role.created',targetType:'PlatformRole',targetTable:'role',createdTargetField:'roleKey',physicalTargetField:'role_key'},
    {cases:['m2.1','m2.3'],steps:['user-original-relations-rollback','audit-user-source-original-relations-rollback','user-empty-relations','audit-user-empty-relations'],method:'POST',path:/^\/api\/platform\/users$/,service:'createUser',event:'platform.user.created',targetType:'PlatformUser',targetTable:'platform_user',createdTargetField:'username'}
];

function method(ast,name){const found=[];const walk=node=>{if(ts.isMethodDeclaration(node)&&node.name?.getText(ast)===name)found.push(node);ts.forEachChild(node,walk)};walk(ast);assert.equal(found.length,1,'One original declared method required');return found[0]}
function literalProperty(node,key,ast){const property=node.properties.find(item=>item.name?.getText(ast)===key);return property&&ts.isPropertyAssignment(property)&&ts.isStringLiteral(property.initializer)?property.initializer.text:null}
function verifyOriginalProfile(sourceReader,profile){
    const texts={};for(const pin of pins){const bytes=sourceReader.read(pin.file);assert.equal(sha(bytes),pin.rawBytesSha256,'Protected original platform/audit source changed');texts[pin.file]=bytes.toString('utf8')}
    const ast=ts.createSourceFile(platform,texts[platform],ts.ScriptTarget.Latest,true),declared=method(ast,profile.service),calls=[];
    const walk=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='recordAuditLog'&&ts.isObjectLiteralExpression(node.arguments[0]))calls.push(node.arguments[0]);ts.forEachChild(node,walk)};walk(declared);
    const matched=calls.filter(node=>literalProperty(node,'eventType',ast)===profile.event&&literalProperty(node,'targetType',ast)===profile.targetType);assert.equal(matched.length,1);assert(!matched[0].properties.some(item=>item.name?.getText(ast)==='requestId'),'Original method unexpectedly supplies request metadata');
    const ca=ts.createSourceFile(controller,texts[controller],ts.ScriptTarget.Latest,true),cm=method(ca,profile.service);assert(cm.body.getText(ca).includes('this.platformService.'+profile.service+'('));assert(cm.body.getText(ca).includes('req.user.sub'));assert(!cm.body.getText(ca).includes('getRequestId('));
    assert(/requestId:\s*input\.requestId\s*\?\?\s*null/.test(texts[audit]),'Original audit writer must preserve omitted request ID as SQL null');
    return{sources:pins.map(pin=>({...pin})),serviceMethod:profile.service,eventType:profile.event,targetType:profile.targetType,originalRequestIdSource:'omitted-input-requestId-nullish-default',expectedAuditRequestId:null,controllerPassesHttpRequestMetadata:false};
}

export function platformBusinessAuditProfile({sourceReader,sourceCapId,context,request,actorId}){
    assert(context&&uuid.test(context.runId)&&Number.isSafeInteger(context.index)&&context.index>=0&&uuid.test(actorId));
    const matches=profiles.filter(profile=>profile.cases.includes(context.caseId)&&profile.steps.includes(request.stepId)&&profile.method===request.method&&profile.path.test(request.path));if(!matches.length)return null;assert.equal(matches.length,1);const profile=matches[0],path=profile.path.exec(request.path),source=verifyOriginalProfile(sourceReader,profile),selector={event_type:profile.event,target_type:profile.targetType,operator_id:actorId,request_id:null};let expectedParent;
    if(profile.createdTargetField){const value=request.body?.[profile.createdTargetField];assert(typeof value==='string'&&value.replaceAll('-','').includes(context.runId.replaceAll('-','')),'Generated-parent immutable selector must contain this fresh run');expectedParent={kind:'same-case-index-actual-committed-create',table:profile.targetTable,selector:{[profile.physicalTargetField??profile.createdTargetField]:value},responseOrQueryIdPermitted:false};}
    else{assert(uuid.test(path[1]));selector.target_id=path[1];expectedParent={kind:'already-admitted-owned-row',table:profile.targetTable,id:path[1],responseOrQueryIdPermitted:false}}
    sourceReader.assertUnchanged();return{kind:'R2M-original-platform-null-audit-source-profile',namespace:'poms-r2m',sourceCapId,runId:context.runId,caseId:context.caseId,index:context.index,stepId:request.stepId,method:request.method,path:request.path,...source,auditSelector:selector,expectedParent,securityRequestIdSource:'unchanged-actual-HTTP-request',ordinaryScopeRequestIdChanged:false,fixtureOwnershipGranted:false};
}
