// Future M5 source projection only. A/Root grant a separate finite admission
// set; this module never owns, queries, creates or adopts any resource.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const prefix='apps/poms-api/src/app/',identity=prefix+'features/identity-provider/identity-provider.service.ts',org=prefix+'features/external-org-sync/external-org-sync.service.ts',audit=prefix+'core/runtime-audit/runtime-audit.service.ts';
export const externalAuditSources=Object.freeze([
    {file:identity,rawBytesSha256:'90a76597b44dd9631b62ada6cdb9ccd9eaf40ef86f3e438e92937d33abfbe7dd'},
    {file:org,rawBytesSha256:'9b5ad4a2c8f60d98e2ab09e0faa4f483ea739d5caddbaab48f5d5a41238f4e60'},
    {file:prefix+'features/identity-provider/identity-provider.controller.ts',rawBytesSha256:'c98a700e07e39ee1084e04855ae239c997a8342e6330546eca489a9748030da1'},
    {file:prefix+'features/identity-provider/external-identity.controller.ts',rawBytesSha256:'38f780e0f6475a410d062cd141e330ada2337d6963510075a10c76c29a82a0f3'},
    {file:prefix+'features/identity-provider/identity-provider-oauth-grant.controller.ts',rawBytesSha256:'05b43c65358b19fe25d17513de52cd873536c33f37dce3e9a29658774b98d159'},
    {file:prefix+'features/external-org-sync/external-org-sync.controller.ts',rawBytesSha256:'498855f69142a404cc3a0d113352ed958cf189ecf4eec5661b4092d387ca2632'},
    {file:prefix+'core/auth/auth.controller.ts',rawBytesSha256:'503ef7836a9141bf11e50ef22a07d0a26e593466d6ee4edbb9e32c40fc8f46e9'},
    {file:audit,rawBytesSha256:'0ecf6501a98490ae9ad60787edf82e87d742604df2a32e880d1af7102861fca4'}
]);
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const known=(table,id)=>{assert(uuid(id));return{kind:'already-admitted-owned-row',table,id,responseOrQueryIdPermitted:false}};
const generated=(table,selector)=>({kind:'same-case-index-actual-committed-create',table,selector,responseOrQueryIdPermitted:false});
export function externalAuditProjectionInputs(bindings){
    assert(uuid(bindings.actors?.admin)&&uuid(bindings.actors?.viewer));return{adminId:bindings.actors.admin,viewerId:bindings.actors.viewer,...(bindings.identityProvider?.id?{identityProviderId:bindings.identityProvider.id}:{}),...(bindings.externalIdentity?.id?{externalIdentityId:bindings.externalIdentity.id}:{}),...(bindings.loginTicket?.id?{loginTicketId:bindings.loginTicket.id}:{})};
}
const named=[
    {logical:'M5.1',step:'provider-create',method:'POST',path:/^\/api\/platform\/identity-providers$/,service:'createIdentityProviderConfig',helper:'recordConfigAudit',events:['identity-provider.config.created'],targetType:'IdentityProviderConfig'},
    {logical:'M5.1',step:'provider-configure',method:'PATCH',path:/^\/api\/platform\/identity-providers\/([0-9a-f-]{36})$/,service:'updateIdentityProviderConfig',helper:'recordConfigAudit',events:['identity-provider.config.updated'],targetType:'IdentityProviderConfig'},
    {logical:'M5.1',step:'bind-external',method:'POST',path:/^\/api\/platform\/users\/([0-9a-f-]{36})\/external-identities$/,service:'bindUserExternalIdentity',helper:'recordExternalIdentityAudit',events:['external-identity.bound'],targetType:'ExternalIdentity'},
    {logical:'M5.1',step:'grant-authorize',method:'GET',path:/^\/api\/platform\/identity-provider-oauth-grants\/([0-9a-f-]{36}):authorize$/,service:'authorizeCurrentAdminProviderGrant',helper:'recordConfigAudit',events:['identity-provider.oauth-grant.authorize-started'],targetType:'IdentityProviderConfig'},
    {logical:'M5.1',step:'grant-callback',method:'GET',path:/^\/api\/platform\/identity-provider-oauth-grants:callback$/,service:'handleCurrentAdminProviderGrantCallback',helper:'recordOAuthGrantAudit',events:['identity-provider.oauth-grant.updated'],targetType:'IdentityProviderOAuthGrant'},
    {logical:'M5.1',step:'authorize',method:'GET',path:/^\/api\/auth\/identity-providers\/([0-9a-f-]{36}):authorize$/,service:'authorizeExternalLogin',helper:'recordConfigAudit',events:['identity-provider.external-login.authorize-started'],targetType:'IdentityProviderConfig',anonymousOperator:true},
    {logical:'M5.1',step:'callback',method:'GET',path:/^\/api\/auth\/identity-providers:callback$/,service:'handleExternalLoginCallback',events:['identity-provider.external-login.ticket-issued'],targetType:'ExternalLoginTicket',viewerOperator:true},
    {logical:'M5.1',step:'ticket',method:'POST',path:/^\/api\/auth\/external-login-sessions$/,service:'consumeExternalLoginSession',events:['identity-provider.external-login.ticket-consumed'],targetType:'ExternalLoginTicket',viewerOperator:true},
    {logical:'M5.2',step:'source',method:'POST',path:/^\/api\/platform\/external-org-sources$/,service:'createExternalOrgSource',helper:'recordAudit',events:['external-org-source.created'],targetType:'ExternalOrgSource'},
    {logical:'M5.2',step:'activate',method:'POST',path:/^\/api\/platform\/external-org-sources\/([0-9a-f-]{36}):activate$/,service:'activateExternalOrgSource',helper:'recordAudit',events:['external-org-source.activated'],targetType:'ExternalOrgSource'},
    {logical:'M5.2',step:'preview',method:'POST',path:/^\/api\/platform\/external-org-sources\/([0-9a-f-]{36})\/org-sync-runs$/,service:'createOrgSyncRun',helper:'recordAudit',events:['org-sync-run.preview-started','org-sync-run.previewed'],targetType:'OrgSyncRun'},
    {logical:'M5.2',step:'apply',method:'POST',path:/^\/api\/platform\/org-sync-runs\/([0-9a-f-]{36}):apply$/,service:'applyOrgSyncRun',events:['org-sync-run.applied'],targetType:'OrgSyncRun'}
];
function declared(ast,name){const found=[];const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name?.getText(ast)===name)found.push(node);ts.forEachChild(node,visit)};visit(ast);assert.equal(found.length,1,'One exact original external method required');return found[0]}
function auditObjects(node){const found=[];const visit=child=>{if(ts.isCallExpression(child)&&ts.isPropertyAccessExpression(child.expression)&&child.expression.name.text==='recordAuditLog'&&ts.isObjectLiteralExpression(child.arguments[0]))found.push(child.arguments[0]);ts.forEachChild(child,visit)};visit(node);return found}
function verifySource(reader,profile){
    const texts={};for(const pin of externalAuditSources){const raw=reader.read(pin.file);assert.equal(sha(raw),pin.rawBytesSha256,'Protected original external audit source changed');texts[pin.file]=raw.toString('utf8')}
    const file=profile.logical==='M5.1'?identity:org,ast=ts.createSourceFile(file,texts[file],ts.ScriptTarget.Latest,true),method=declared(ast,profile.service),body=method.getText(ast);
    for(const event of profile.events)assert(body.includes("'"+event+"'"),'Exact source event must occur in the named method');
    const writers=profile.helper?auditObjects(declared(ast,profile.helper)):auditObjects(method);assert(writers.length>0);for(const object of writers)assert(!object.properties.some(property=>property.name?.getText(ast)==='requestId'),'This exact original audit writer must omit request metadata');
    if(profile.anonymousOperator)assert(/recordConfigAudit\([^\n]+config, null, null/.test(body),'Only original public authorize fixes its audit operator to null');
    assert(/requestId:\s*input\.requestId\s*\?\?\s*null/.test(texts[audit]));reader.assertUnchanged();return{sources:externalAuditSources.map(pin=>({...pin})),serviceFile:file,serviceMethod:profile.service,originalRequestIdSource:'omitted-input-requestId-nullish-default',expectedAuditRequestId:null};
}
export function externalBusinessAuditProfile({sourceReader,sourceCapId,context,request,inputs}){
    const pathname=request.path.split('?',1)[0],matches=named.filter(profile=>profile.logical===request.logicalCase&&profile.step===request.stepId&&profile.method===request.method&&profile.path.test(pathname));if(!matches.length)return null;assert.equal(matches.length,1);assert(context?.caseId==='m5.integration'&&uuid(context.runId)&&Number.isSafeInteger(context.index)&&context.index>=0&&context.op==='m.http','Only actual M5 HTTP contexts are projected');
    assert(inputs&&uuid(inputs.adminId)&&uuid(inputs.viewerId)&&inputs.adminId!==inputs.viewerId);const profile=matches[0],path=profile.path.exec(pathname),source=verifySource(sourceReader,profile),body=request.body??{};let parent;
    if(profile.step==='provider-create'){assert(body.tenantId.includes(context.runId.replaceAll('-',''))&&body.clientId.includes(context.runId.replaceAll('-','')));parent=generated('identity_provider_config',{tenant_id:body.tenantId,client_id:body.clientId})}
    else if(['provider-configure','grant-authorize','authorize'].includes(profile.step))parent=known('identity_provider_config',path[1]);
    else if(profile.step==='bind-external'){assert.equal(path[1],inputs.viewerId);assert(uuid(body.identityProviderConfigId)&&typeof body.subjectId==='string');parent=generated('external_identity',{identity_provider_config_id:body.identityProviderConfigId,poms_user_id:path[1],subject_id:body.subjectId})}
    else if(profile.step==='grant-callback'){assert(uuid(inputs.identityProviderId));parent=generated('identity_provider_oauth_grant',{identity_provider_config_id:inputs.identityProviderId,poms_user_id:inputs.adminId})}
    else if(profile.step==='callback'){assert(uuid(inputs.identityProviderId)&&uuid(inputs.externalIdentityId));parent=generated('external_login_ticket',{identity_provider_config_id:inputs.identityProviderId,external_identity_id:inputs.externalIdentityId,poms_user_id:inputs.viewerId})}
    else if(profile.step==='ticket'){parent=known('external_login_ticket',inputs.loginTicketId);assert(typeof body.ticket==='string'&&body.ticket.length>=32);parent.selector={ticket_hash:sha(Buffer.from(body.ticket)),poms_user_id:inputs.viewerId}}
    else if(profile.step==='source'){assert(uuid(body.providerConfigId)&&body.externalTenantId.includes(context.runId.replaceAll('-','')));parent=generated('external_org_source',{provider_config_id:body.providerConfigId,external_tenant_id:body.externalTenantId})}
    else if(profile.step==='activate')parent=known('external_org_source',path[1]);
    else if(profile.step==='preview')parent=generated('org_sync_run',{source_id:path[1]});
    else{assert.equal(profile.step,'apply');parent=known('org_sync_run',path[1])}
    const operatorId=profile.anonymousOperator?null:profile.viewerOperator?inputs.viewerId:inputs.adminId,items=profile.events.map(event=>({eventType:event,auditSelector:{event_type:event,target_type:profile.targetType,operator_id:operatorId,request_id:null,...(parent.id?{target_id:parent.id}:{})},expectedParent:structuredClone(parent),expectedMax:1}));
    return{kind:'R2M-original-external-null-audit-source-set',sourceKind:profile.logical==='M5.1'?'external-provider-null':'external-org-null',namespace:'poms-r2m',sourceCapId,runId:context.runId,caseId:context.caseId,index:context.index,op:context.op,logicalCase:request.logicalCase,stepId:request.stepId,method:request.method,path:request.path,inputs:structuredClone(inputs),...source,items,expectedMaximumCreates:items.length,anonymousOperatorPermittedOnlyForExactPublicAuthorize:profile.anonymousOperator===true,ordinaryScopeRequestIdChanged:false,securityRequestIdSource:'unchanged-actual-HTTP-request',fixtureOwnershipGranted:false};
}
