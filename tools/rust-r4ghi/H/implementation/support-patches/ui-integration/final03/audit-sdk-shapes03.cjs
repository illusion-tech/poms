const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const ts=createRequire('E:/projects/poms/package.json')('typescript');
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',modelDir=path.join(root,'libs/shared/api-client/model');
const specFile=path.join(root,'libs/shared/api-spec/openapi.json'),spec=JSON.parse(fs.readFileSync(specFile,'utf8')).components.schemas;
const publicFile=path.resolve(__dirname,'../../shared-g2-130/public-contracts.g2-130.schema.json'),source=JSON.parse(fs.readFileSync(publicFile,'utf8')).components.schemas;
const models=new Map();
for(const file of fs.readdirSync(modelDir).filter(f=>f.endsWith('.ts'))){const full=path.join(modelDir,file),text=fs.readFileSync(full,'utf8'),ast=ts.createSourceFile(full,text,ts.ScriptTarget.Latest,true);for(const node of ast.statements)if((ts.isInterfaceDeclaration(node)||ts.isTypeAliasDeclaration(node)||ts.isEnumDeclaration(node))&&node.name)models.set(node.name.text,{full,ast,node});}
function property(model,name){if(!ts.isInterfaceDeclaration(model.node))return null;return model.node.members.find(member=>ts.isPropertySignature(member)&&member.name&&member.name.getText(model.ast).replace(/^['"]|['"]$/g,'')===name);}
function location(model,node){return {path:path.relative(root,model.full).replaceAll('\\','/'),line:model.ast.getLineAndCharacterOfPosition(node.getStart(model.ast)).line+1};}
const nullOnly=[],booleanLiteral=[],disjointAnyOf=[];
for(const [name,schema]of Object.entries(spec)){
 const model=models.get(name);if(!model)continue;
 for(const [key,value]of Object.entries(schema.properties??{})){
  const member=property(model,key);if(!member?.type)continue;
  const pointer=`#/components/schemas/${name}/properties/${key}`;
  const info={...location(model,member),schemaPointer:pointer,originalPublicPointer:source[name]?.properties?.[key]?pointer:null,originalPublicSource:source[name]?.properties?.[key]??null,generatedType:member.type.getText(model.ast),requiredInSpec:(schema.required??[]).includes(key),generatedOptional:!!member.questionToken};
  if(value.type==='object'&&value.nullable===true&&value.enum?.length===1&&value.enum[0]===null)nullOnly.push(info);
  if(value.type==='boolean'&&value.enum?.length===1)booleanLiteral.push({...info,literal:value.enum[0]});
 }
 if(Array.isArray(schema.anyOf)&&schema.anyOf.length>1&&schema.anyOf.every(branch=>typeof branch.$ref==='string')){
  const branches=schema.anyOf.map(b=>spec[b.$ref.split('/').pop()]);
  const keys=Object.keys(branches[0]?.properties??{}).filter(key=>branches.every(b=>b?.required?.includes(key)&&b.properties?.[key]?.enum?.length===1));
  for(const key of keys){const tags=branches.map(b=>b.properties[key].enum[0]);if(new Set(tags).size!==tags.length)continue;disjointAnyOf.push({...location(model,model.node),schemaPointer:`#/components/schemas/${name}/anyOf`,originalPublicPointer:source[name]?`#/components/schemas/${name}/anyOf`:null,branches:schema.anyOf.map(b=>b.$ref),discriminator:key,tags,generatedDeclaration:ts.isTypeAliasDeclaration(model.node)?model.node.type.getText(model.ast):'interface'});break;}
 }
}
const participant=models.get('CommissionParticipantInput'),member=property(participant,'zeroWeightReason');
const zero={...location(participant,member),schemaPointer:'#/components/schemas/CommissionParticipantInput/properties/zeroWeightReason',topLevelRequired:spec.CommissionParticipantInput.required,generatedOptional:!!member.questionToken,originalRequired:source.CommissionParticipantInput.required,originalConditionalPointer:'#/components/schemas/CommissionParticipantInput/allOf/0',originalConditional:source.CommissionParticipantInput.allOf[0]};
const result={status:'actual-S5-declaration-audit-not-normalized',specSHA256:createHash('sha256').update(fs.readFileSync(specFile)).digest('hex'),public130SHA256:createHash('sha256').update(fs.readFileSync(publicFile)).digest('hex'),nullOnly,booleanLiteral,disjointAnyOf,conditionalRequiredDrift:[zero],objectArrayDeclarations:[...models.keys()].filter(name=>/ObjectArray/i.test(name))};
fs.writeFileSync(path.join(__dirname,'sdk-shape-audit03.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({nullOnly:nullOnly.length,booleanLiteral:booleanLiteral.length,disjointAnyOf,conditionalRequiredDrift:[zero],objectArrayDeclarations:result.objectArrayDeclarations}));
