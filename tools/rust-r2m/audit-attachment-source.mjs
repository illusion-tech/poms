// Exact original attachment-provider audit source; no fixture authority or IO.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=x=>createHash('sha256').update(x).digest('hex');
const service='apps/poms-api/src/app/features/attachment/attachment-storage-provider.service.ts',controller='apps/poms-api/src/app/features/attachment/attachment-storage-provider.controller.ts',audit='apps/poms-api/src/app/core/runtime-audit/runtime-audit.service.ts';
export const attachmentProviderAuditSources=Object.freeze([
    {file:service,rawBytesSha256:'a0fa9e9837cd4494767f2df3624f787f154d82445eadf8759c80c89367cdc7f7'},
    {file:controller,rawBytesSha256:'41ddb87385b90964f7468508737cd8c9a3803a545929561936525762e94309af'},
    {file:audit,rawBytesSha256:'0ecf6501a98490ae9ad60787edf82e87d742604df2a32e880d1af7102861fca4'}
]);
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
const collection='/api/platform/attachment-storage-providers',item=/^\/api\/platform\/attachment-storage-providers\/([0-9a-f-]{36}):set-default$/;
const profiles=[
    {logical:'M4.1',step:'local-provider',caseId:'m4.integration',op:'m.http',create:true,provider:'local'},
    {logical:'M4.1',step:'default',caseId:'m4.integration',op:'m.http',provider:'local'},
    {logical:'M4.4',step:'obs-provider',caseId:'m4.integration',op:'m.http',create:true,provider:'huawei-obs-s3'},
    {logical:'M4.4',step:'obs-default',caseId:'m4.integration',op:'m.http',provider:'huawei-obs-s3'},
    {logical:'M4.4',step:'local-default',caseId:'m4.integration',op:'m.http',provider:'local'},
    {logical:'UI4',step:'ui4-local-provider',caseId:'m.ui4.integration',op:'m.producer',create:true,provider:'local'},
    {logical:'UI4',step:'ui4-local-default',caseId:'m.ui4.integration',op:'m.producer',provider:'local'}
];
function method(ast,name){const found=[];const walk=node=>{if(ts.isMethodDeclaration(node)&&node.name?.getText(ast)===name)found.push(node);ts.forEachChild(node,walk)};walk(ast);assert.equal(found.length,1);return found[0]}
function sourceProfile(reader,profile){
    const texts={};for(const pin of attachmentProviderAuditSources){const bytes=reader.read(pin.file);assert.equal(sha(bytes),pin.rawBytesSha256,'Protected original attachment provider/audit source changed');texts[pin.file]=bytes.toString('utf8')}
    const serviceMethod=profile.create?'createAttachmentStorageProviderConfig':'setDefaultAttachmentStorageProvider',eventType=profile.create?'attachment-storage-provider.config.created':'attachment-storage-provider.config.default-set',ast=ts.createSourceFile(service,texts[service],ts.ScriptTarget.Latest,true),calls=[];
    const walk=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='recordConfigAudit'&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text===eventType)calls.push(node);ts.forEachChild(node,walk)};walk(method(ast,serviceMethod));assert.equal(calls.length,1);assert.equal(calls[0].arguments[1].getText(ast),'config');assert.equal(calls[0].arguments[2].getText(ast),'operatorId');
    const objects=[];const helper=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='recordAuditLog'&&ts.isObjectLiteralExpression(node.arguments[0]))objects.push(node.arguments[0]);ts.forEachChild(node,helper)};helper(method(ast,'recordConfigAudit'));assert.equal(objects.length,1);const object=objects[0];assert(!object.properties.some(x=>x.name?.getText(ast)==='requestId'));const property=name=>object.properties.find(x=>x.name?.getText(ast)===name);assert.equal(property('targetType').initializer.text,'AttachmentStorageProviderConfig');assert.equal(property('targetId').initializer.getText(ast),'config.id');assert.equal(property('operatorId').initializer.getText(ast),'operatorId ?? null');
    const ca=ts.createSourceFile(controller,texts[controller],ts.ScriptTarget.Latest,true),cm=method(ca,serviceMethod).body.getText(ca);assert(cm.includes('this.storageProviderService.'+serviceMethod+'(')&&cm.includes('req.user.sub')&&!cm.includes('getRequestId('));
    assert(/requestId:\s*input\.requestId\s*\?\?\s*null/.test(texts[audit]));reader.assertUnchanged();return{sources:attachmentProviderAuditSources.map(x=>({...x})),serviceMethod,eventType,targetType:'AttachmentStorageProviderConfig',originalRequestIdSource:'omitted-input-requestId-nullish-default',controllerPassesHttpRequestMetadata:false};
}
export function attachmentProviderBusinessAuditProfile({sourceReader,sourceCapId,context,request,actorId}){
    assert(context&&uuid(context.runId)&&Number.isSafeInteger(context.index)&&context.index>=0&&uuid(actorId));
    const matches=profiles.filter(p=>p.caseId===context.caseId&&p.op===context.op&&p.logical===request.logicalCase&&p.step===request.stepId&&request.method==='POST'&&(p.create?request.path===collection:item.test(request.path)));if(!matches.length)return null;assert.equal(matches.length,1);const profile=matches[0],source=sourceProfile(sourceReader,profile),selector={event_type:source.eventType,target_type:source.targetType,operator_id:actorId,request_id:null};let expectedParent;
    if(profile.create){assert.equal(request.body?.providerType,profile.provider);assert.equal(request.body?.keyPrefix,'poms-r2m/'+context.runId,'The real source input prefix is evidence, never immutable ownership');expectedParent={kind:'same-case-index-actual-committed-create',table:'attachment_storage_provider_config',selector:{provider_type:profile.provider,created_by:actorId},responseOrQueryIdPermitted:false}}
    else{const id=item.exec(request.path)[1];assert(uuid(id));selector.target_id=id;expectedParent={kind:'already-admitted-owned-row',table:'attachment_storage_provider_config',id,selector:{provider_type:profile.provider,created_by:actorId},responseOrQueryIdPermitted:false}}
    return{kind:'R2M-original-attachment-provider-null-audit-source-profile',namespace:'poms-r2m',sourceCapId,runId:context.runId,caseId:context.caseId,index:context.index,op:context.op,logicalCase:request.logicalCase,stepId:request.stepId,method:request.method,path:request.path,...source,expectedAuditRequestId:null,auditSelector:selector,expectedParent,ordinaryScopeRequestIdChanged:false,securityRequestIdSource:'unchanged-actual-HTTP-request',fixtureOwnershipGranted:false};
}
