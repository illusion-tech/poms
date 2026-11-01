// Pure public-source field map for executing the real draft constructor in
// --check. This is never represented as actual running Native ORM metadata.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {ownershipIdentities,projectParentEdges} from './fixture-policy.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
export const m3InputCompatibilitySources=Object.freeze([
    {file:'apps/poms-api/src/app/features/commission/commission.service.ts',rawBytesSha256:'fc850544456ccafb506bc658c70d4053ace2edb361e646ec500cadb079feac67'},
    {file:'apps/poms-api/src/app/features/commission/commission.controller.ts',rawBytesSha256:'88264a4fb5c6671806c1f7d251fd01b2729391ce099c902345ad76e1c2d1c36f'},
    {file:'apps/poms-api/src/app/features/approval/approval.service.ts',rawBytesSha256:'d64a8d8cefadc282a1a69933ad428e077e0eb2b3cc83853b81288136999a557d'},
    {file:'libs/shared/contracts/src/lib/shared-contracts.ts',rawBytesSha256:'fbf31addc344ce395fe917141c208fce27e84270850c4df4cd842279ffa67097'}
]);
export function verifyM3InputCompatibilitySource(sourceReader){
    const texts=m3InputCompatibilitySources.map(pin=>{const raw=sourceReader.read(pin.file);assert.equal(createHash('sha256').update(raw).digest('hex'),pin.rawBytesSha256,'Protected original M3 service/DTO source changed');return raw.toString('utf8')});
    const ast=ts.createSourceFile(m3InputCompatibilitySources[0].file,texts[0],ts.ScriptTarget.Latest,true),methods=[];const visit=node=>{if(ts.isMethodDeclaration(node)&&['createRoleAssignment','createCalculation','createPayout','executeAdjustment'].includes(node.name?.getText(ast)))methods.push(node);ts.forEachChild(node,visit)};visit(ast);assert.equal(methods.length,4);for(const method of methods){assert(!method.getText(ast).includes('recordAudit'),'These original fixed producer/consumer methods create no audit row');if(method.name.getText(ast)==='executeAdjustment')continue;const creations=[];const create=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&((node.expression.name.text==='create'&&['CommissionRoleAssignment','CommissionCalculation'].includes(node.arguments[0]?.getText(ast)))||node.expression.name.text==='createPayout'))for(const value of node.arguments)if(ts.isObjectLiteralExpression(value))creations.push(value);ts.forEachChild(node,create)};create(method);assert.equal(creations.length,1);assert(!creations[0].properties.some(p=>p.name?.getText(ast)==='createdBy'),'Original commission creation must retain its NULL creator');}
    assert(texts[2].includes("if (adjustment.status !== 'draft')")&&texts[2].includes('cannot submit approval in status ${adjustment.status}'));assert(!/@(?:Patch|Put)\([^)]*commission-adjustments/.test(texts[1]),'An original adjustment revise route would change the compatibility boundary');assert(texts[1].includes("@Post('commission-adjustments/:id\\\\:execute')"));sourceReader.assertUnchanged();return{kind:'original-M3-input-compatibility-source-checked',roleAssignmentCreator:null,rejectedAdjustmentResubmitStatus:400,publicAdjustmentReviseRoute:false,executeOriginalNativeOnly:true,sources:m3InputCompatibilitySources};
}
export const draftEntitySources=Object.freeze([
    ['customer','apps/poms-api/src/app/features/customer/customer.entity.ts'],
    ['project','apps/poms-api/src/app/features/project/project.entity.ts'],
    ['contract','apps/poms-api/src/app/features/contract/contract.entity.ts']
].map(([table,file])=>Object.freeze({table,file})));

export function originalDraftSourceMetadata(sourceReader){
    assert.equal(ts.version,'6.0.3');const metadata=[];
    for(const{table,file}of draftEntitySources){
        const ast=ts.createSourceFile(file,sourceReader.text(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0);const found=[];
        const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(ast)==='defineEntity'){assert(ts.isObjectLiteralExpression(node.arguments[0]));const name=node.arguments[0].properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(ast)==='tableName');if(name&&ts.isStringLiteral(name.initializer)&&name.initializer.text===table)found.push(node.arguments[0]);}ts.forEachChild(node,visit)};visit(ast);assert.equal(found.length,1);
        const fields=new Map(found[0].properties.map(p=>{assert(ts.isPropertyAssignment(p));return[p.name.getText(ast),p.initializer]}));
        for(const[key,expected]of[['tableName',table],['schema','poms']])assert(ts.isStringLiteral(fields.get(key))&&fields.get(key).text===expected);
        const properties=fields.get('properties');assert(ts.isObjectLiteralExpression(properties));const mapped=properties.properties.map(property=>{assert(ts.isPropertyAssignment(property)&&ts.isIdentifier(property.name));const names=[];const search=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='fieldName'){assert.equal(node.arguments.length,1);assert(ts.isStringLiteral(node.arguments[0]));names.push(node.arguments[0].text);}ts.forEachChild(node,search)};search(property.initializer);assert(names.length<=1);return{name:property.name.text,fieldNames:[names[0]??property.name.text]}});
        assert.equal(new Set(mapped.map(p=>p.name)).size,mapped.length);metadata.push({tableName:table,schema:'poms',properties:mapped});
    }
    return{metadata,kind:'original-entity-source-field-map-not-running-ORM-metadata',sourceFiles:draftEntitySources.map(x=>x.file),NativeMetadataCertified:false,ORMInitialized:false};
}

export function assertSourceIntentProjectParents(step){
    for(const intent of step.intents??[]){const identity=ownershipIdentities[intent.table];assert(identity);if(identity.includes('project_id'))assert(typeof intent.selector.project_id==='string'&&/^[0-9a-f-]{36}$/i.test(intent.selector.project_id),'Actual immutable intent requires its explicit source project parent: '+intent.table);for(const[column]of projectParentEdges[intent.table]??[])assert(typeof intent.selector[column]==='string'&&/^[0-9a-f-]{36}$/i.test(intent.selector[column]),'Actual immutable intent requires its typed source parent: '+intent.table+'.'+column);}
}
