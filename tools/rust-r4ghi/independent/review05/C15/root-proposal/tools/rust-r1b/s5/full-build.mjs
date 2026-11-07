// Full S5 manifest construction. No Git and no output mutation in this module.
// The entry wrapper must require Root-reviewed registration and S5 Git guard.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { analyzeRegisteredGraph, proposeRegistry, CLOSED_MODULES } from './registered-module-graph.mjs';
import { verifyStaticData } from './static-data-oracle.mjs';
import { assertSnapshotSourceAccess } from './source-access.mjs';
const sha=(value)=>createHash('sha256').update(value).digest('hex');
const norm=(value)=>value.replace(/\r\n/g,'\n');
const same=(a,b,message)=>assert.equal(JSON.stringify(a),JSON.stringify(b),message);
const strArray=(value)=>Array.isArray(value)&&value.length>0&&value.every((item)=>typeof item==='string');
const object=(value)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const strObject=(value)=>object(value)&&Object.keys(value).length>0&&Object.values(value).every((item)=>typeof item==='string');
const META_HELPERS=new Map([['enumDefinitionLabels','label-map'],['enumDefinitionSeverities','severity-map'],['enumDefinitionOptions','options'],['enumDefinitionHints','hint-map']]);
const SCHEMA_SYMBOL='CommissionSharedEvidencePackageShape';
const SHARED=CLOSED_MODULES[1];
export const IDENTITY_PATH='tools/rust-r1b/history/s3-nominal-identity.json';
export const REGISTRY_PATH='tools/rust-r1b/s5-reviewed-registry.json';
export const AUTH_PATHS=['apps/poms-api/src/app/core/auth/auth-session.entity.ts','apps/poms-api/src/app/core/auth/auth-session.service.ts'];
// Consumed A physical inputs are defined only by the sealed snapshot reader.
// B identity/registry/code use independent reviewed hashes and clean commits.
function runtime(root){const req=createRequire(resolve(root,'package.json'));return {ts:req('typescript')};}
function unwrap(ts,node){while(node&&(ts.isAsExpression(node)||ts.isSatisfiesExpression(node)||ts.isParenthesizedExpression(node)||ts.isTypeAssertionExpression(node)))node=node.expression;return node;}
function identifier(value){const result=value.split(/[^A-Za-z0-9]+/).filter(Boolean).map((part)=>part[0].toUpperCase()+part.slice(1)).join('');if(!/^[A-Z][A-Za-z0-9]*$/.test(result)||result==='Self')throw new Error('Unsupported Rust identifier: '+value);return result;}
function family(name,values,source,origin,sourceSymbol=null,aliases=[]){
    if(identifier(name)!==name||!strArray(values)||new Set(values).size!==values.length)throw new Error('Invalid nominal enum '+name);
    const variants=values.map((wire)=>({name:identifier(wire),wire}));
    if(new Set(variants.map((v)=>v.name)).size!==variants.length||values.includes('__poms_r1b_unknown__'))throw new Error('Rust variant collision/reserved wire '+name);
    return {name,sourceSymbol,origin,source,aliases:[...new Set([name,...aliases])],values,variants,occurrenceIds:[]};
}
function parseModule(ts,text,path){
    const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    const constants=new Map();const aliasArrays=new Map();const aliasSchemas=new Map();const imports=[];const exports=[];
    for(const stmt of sf.statements){
        if(ts.isImportDeclaration(stmt)&&ts.isStringLiteral(stmt.moduleSpecifier)&&ts.isNamedImports(stmt.importClause?.namedBindings)){
            for(const entry of stmt.importClause.namedBindings.elements)imports.push({name:entry.name.text,importedName:(entry.propertyName??entry.name).text,specifier:stmt.moduleSpecifier.text,declarationSha256:sha(stmt.getText(sf))});
        }
        if(ts.isExportDeclaration(stmt)&&stmt.exportClause&&ts.isNamedExports(stmt.exportClause)){
            for(const entry of stmt.exportClause.elements)exports.push({name:entry.name.text,localName:(entry.propertyName??entry.name).text,declarationSha256:sha(stmt.getText(sf))});
        }
        if(ts.isVariableStatement(stmt))for(const declaration of stmt.declarationList.declarations)if(ts.isIdentifier(declaration.name))constants.set(declaration.name.text,declaration);
        if(ts.isTypeAliasDeclaration(stmt)){
            let type=stmt.type;while(ts.isParenthesizedTypeNode(type))type=type.type;
            let arrayObject=ts.isIndexedAccessTypeNode(type)?type.objectType:null;
            while(arrayObject&&ts.isParenthesizedTypeNode(arrayObject))arrayObject=arrayObject.type;
            if(arrayObject&&ts.isTypeQueryNode(arrayObject)&&ts.isIdentifier(arrayObject.exprName)){
                const key=arrayObject.exprName.text;
                aliasArrays.set(key,[...(aliasArrays.get(key)||[]),stmt.name.text]);
            }
            if(ts.isTypeReferenceNode(type)&&type.typeName.getText(sf)==='z.infer'&&type.typeArguments?.length===1&&ts.isTypeQueryNode(type.typeArguments[0])&&ts.isIdentifier(type.typeArguments[0].exprName)){
                aliasSchemas.set(type.typeArguments[0].exprName.text,stmt.name.text);
            }
        }
    }
    return {sf,constants,aliasArrays,aliasSchemas,imports,exports};
}
function backend(root,ts,sourceAccess){
    const requests=[
        [AUTH_PATHS[0],['AuthSessionStatusValue','AuthSessionRevokedReasonValue']],
        [AUTH_PATHS[1],['AuthSessionErrorCodeValue']],
    ];
    const result=[];const declarations=[];
    for(const [path,names] of requests){
        const text=norm(sourceAccess ? sourceAccess.readText(path) : readFileSync(resolve(root,path),'utf8'));const input=parseModule(ts,text,path);
        const candidates=[...input.constants.keys()].filter((name)=>/Value$/.test(name));same(candidates,names,'Unknown backend auth enum candidate');
        for(const name of names){
            const node=input.constants.get(name);const initializer=unwrap(ts,node.initializer);
            if(!ts.isObjectLiteralExpression(initializer))throw new Error('Backend enum not literal object '+name);
            const entries=initializer.properties.map((property)=>{
                if(!ts.isPropertyAssignment(property)||(!ts.isIdentifier(property.name)&&!ts.isStringLiteral(property.name))||!ts.isStringLiteralLike(unwrap(ts,property.initializer)))throw new Error('Unknown backend enum expression '+name);
                return [property.name.text,unwrap(ts,property.initializer).text];
            });
            const value=Object.fromEntries(entries);if(!strObject(value)||Object.keys(value).length!==entries.length)throw new Error('Invalid backend enum '+name);
            const aliases=input.aliasArrays.get(name);if(!aliases||aliases.length!==1)throw new Error('Missing backend nominal alias '+name);
            const pos=input.sf.getLineAndCharacterOfPosition(node.getStart(input.sf));
            const position={path,line:pos.line+1,column:pos.character+1};
            const f=family(aliases[0],Object.values(value),position,'backend-auth',name,aliases);
            declarations.push({name,...position,kind:'backend-auth-wire-value-object',expression:node.initializer.getText(input.sf),declarationSha256:sha(node.getText(input.sf)),value,valueSha256:sha(JSON.stringify(value)),rustMappings:[{family:f.name,relation:'source-object-type-query',via:name,wireRelation:'exact-values-and-order'}]});
            result.push(f);
        }
    }
    return {families:result,declarations};
}
function classify(row){
    const value=row.value;let kind;let r0Kind=null;
    if(strArray(value))kind=r0Kind='string-array';
    else if(row.name.endsWith('Value')&&strObject(value))kind=r0Kind='wire-value-object';
    else if(row.name.endsWith('_DEFINITIONS')){
        if(!Array.isArray(value)||!value.length||value.some((item)=>!object(item)||['key','value','label'].some((key)=>typeof item[key]!=='string')||!Number.isFinite(item.order)||Object.keys(item).some((key)=>!['key','value','label','order','severity','hint'].includes(key))))throw new Error('Unknown definition shape '+row.name);
        kind=r0Kind='enum-definitions';
    }else if(META_HELPERS.has(row.helper))kind=META_HELPERS.get(row.helper);
    else if(row.name==='PermissionsMeta'&&object(value))kind='permission-metadata';
    else if(row.name==='SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS'&&strObject(value))kind='sensitive-package-permission-map';
    else if(['IDENTITY_PROVIDER_SCOPE_MAX_LENGTH','IDENTITY_PROVIDER_SCOPE_MAX_ITEMS'].includes(row.name)&&Number.isSafeInteger(value))kind='schema-scalar-limit';
    else throw new Error('Unclassified current data declaration '+row.path+':'+row.name);
    return {...row,kind,r0Kind,rustMappings:[]};
}
export function proposeIdentity(previousManifest,r0){
    const positions=previousManifest.r0Witness.provenance.enumOccurrences.positions;
    const enums=r0.sharedSsot.enumSchemas.map((record,index)=>{
        const pos=positions.find((item)=>item.historicalIndex===index);
        if(!pos)throw new Error('Missing historical enum position '+index);
        const candidates=previousManifest.enumOccurrences.filter((item)=>item.owner===record.name&&item.path===record.path&&item.line===pos.currentLine&&item.expression===record.expression&&JSON.stringify(item.values)===JSON.stringify(record.values));
        if(candidates.length!==1)throw new Error('Ambiguous immutable S3 identity '+index);
        const witness=candidates[0];
        return {historicalIndex:index,historicalRecordSha256:sha(JSON.stringify(record)),owner:witness.owner,schemaId:witness.schemaId,path:witness.path,propertyPath:witness.propertyPath,sourceArray:witness.sourceArray,topLevel:witness.topLevel,family:witness.family};
    });
    return {formatVersion:1,role:'Historical nominal/source identities only; no current wire-value authority',previousSourceHead:previousManifest.authority.sourceHead,previousManifestObjectSha256:sha(JSON.stringify(previousManifest)),historicalR0ObjectSha256:sha(JSON.stringify(r0)),
        families:previousManifest.enums.map(({name,sourceSymbol,origin,source,aliases,occurrenceIds})=>({name,sourceSymbol,origin,source,aliases,occurrenceIds})),
        historicalEnums:enums,previousInline:previousManifest.enumOccurrences.filter((item)=>item.sourceArray===null).map(({owner,schemaId,path,propertyPath,family})=>({owner,schemaId,path,propertyPath,family}))};
}
function witnessWithoutLine(item){return Object.fromEntries(Object.entries(item).filter(([key])=>key!=='line'&&key!=='column'));}
function sourceKey(item){return JSON.stringify([item.path,item.owner,item.schemaId,item.propertyPath,item.sourceArray,item.topLevel]);}
function fingerprints(root,paths,sourceAccess){return paths.map((path)=>{const text=norm(sourceAccess ? sourceAccess.readText(path) : readFileSync(resolve(root,path),'utf8'));return {path,normalizedUtf8Bytes:Buffer.byteLength(text),normalizedTextSha256:sha(text)};});}
function construct(root,moduleRegistry,identity,sourceAccess){
    const {ts}=runtime(root);const graph=analyzeRegisteredGraph(root,moduleRegistry,identity.historicalEnums.map((item)=>({historicalIndex:item.historicalIndex,owner:item.owner,propertyPath:item.propertyPath})),sourceAccess);
    const staticOracle=verifyStaticData(root,graph,sourceAccess);
    const modules=new Map(graph.modules.map((m)=>[m.path,m]));
    const inputs=new Map([...modules].map(([path])=>[path,parseModule(ts,norm(sourceAccess ? sourceAccess.readText(path) : readFileSync(resolve(root,path),'utf8')),path)]));
    const declarations=graph.modules.flatMap((m)=>m.data.map(classify));
    const schemaDeclarations=[];const excludedDeclarations=[];
    const dataKeys=new Set(declarations.map((row)=>row.path+'::'+row.name));
    for(const [path,input]of inputs)for(const [name,node]of input.constants){
        if(dataKeys.has(path+'::'+name))continue;
        const pos=input.sf.getLineAndCharacterOfPosition(node.getStart(input.sf));
        const record={name,path,line:pos.line+1,column:pos.character+1,declarationSha256:sha(node.getText(input.sf))};
        if(name.endsWith('Schema'))schemaDeclarations.push({...record,classification:'zod-schema',schemaId:modules.get(path).schemaIds[name]??null});
        else if((path===SHARED&&name===SCHEMA_SYMBOL)||(path===CLOSED_MODULES[2]&&name==='frozenSchemas'))excludedDeclarations.push({...record,classification:name==='frozenSchemas'?'registered-immutable-schema-registry':'registered-schema-shape'});
        else throw new Error('Unclassified source variable '+path+':'+name);
    }
    const topVariables=[...inputs.values()].reduce((sum,input)=>sum+input.constants.size,0);
    if(declarations.length+schemaDeclarations.length+excludedDeclarations.length!==topVariables)throw new Error('Incomplete top-level variable classification');
    const dataBySymbol=new Map(declarations.map((row)=>[row.path+'::'+row.name,row]));
    const oldArrays=new Map(identity.families.filter((f)=>f.origin==='shared-array').map((f)=>[f.source.path+'::'+f.sourceSymbol,f]));
    const families=[];const byName=new Map();const byArray=new Map();const bindings=[];
    for(const row of declarations.filter((d)=>d.kind==='string-array')){
        const key=row.path+'::'+row.name;const old=oldArrays.get(key);const currentAliases=inputs.get(row.path).aliasArrays.get(row.name)||[];
        const uses=modules.get(row.path).enumOccurrences.filter((e)=>e.sourceArray===row.name);
        const nominalCandidates=uses.filter((e)=>e.topLevel).map((e)=>inputs.get(row.path).aliasSchemas.get(e.owner)).filter(Boolean);
        const name=old?.name||currentAliases[0]||nominalCandidates[0];
        if(!name)throw new Error('Array needs explicit nominal registration '+key);
        if(byName.has(name))throw new Error('Unrelated array type collision '+name);
        const f=family(name,row.value,{path:row.path,line:row.line,column:row.column},'shared-array',row.name,[...(old?.aliases||[]),...currentAliases]);
        families.push(f);byName.set(name,f);byArray.set(key,f);
        bindings.push({kind:old?'historical-nominal-array-retained':'new-nominal-array',name,path:row.path,sourceSymbol:row.name,declarationSha256:row.declarationSha256,currentAliases,liveDirectUseCount:uses.length});
    }
    const occurrences=[];
    for(const module of graph.modules)for(const raw of module.enumOccurrences){
        const item={...raw,path:module.path,openApiValues:null,comparison:'current-ts-zod-source',family:null};
        let target=item.sourceArray?byArray.get(item.path+'::'+item.sourceArray):null;
        if(!target){
            const aliases=inputs.get(item.path).aliasSchemas;
            const oldInline=identity.previousInline.filter((old)=>old.owner===item.owner&&JSON.stringify(old.propertyPath)===JSON.stringify(item.propertyPath));
            let name=item.topLevel?(aliases.get(item.owner)||item.owner.replace(/Schema$/,'')):(oldInline.length===1?oldInline[0].family:item.owner.replace(/Schema$/,'')+item.propertyPath.map(identifier).join(''));
            if(!name)throw new Error('Missing nominal inline identity '+item.id);
            if(byName.has(name)){
                const old=byName.get(name);
                // Same declared canonical type name can replace its historical
                // array alias only through an explicit registration record.
                if(!item.topLevel||!aliases.has(item.owner)||old.origin!=='shared-array')throw new Error('Unregistered nominal collision '+name+' at '+item.id);
                same(old.values,item.values,'Canonical nominal source and retained array diverge: '+name);
                const reexporting=inputs.get(old.source.path);
                const resolveImported=(specifier)=>posix.normalize(posix.join(posix.dirname(old.source.path),specifier+(specifier.endsWith('.ts')?'':'.ts')));
                const proofs=[item.owner,name].map((symbol)=>{
                    const imported=reexporting.imports.filter((entry)=>entry.name===symbol&&entry.importedName===symbol&&resolveImported(entry.specifier)===item.path);
                    const exported=reexporting.exports.filter((entry)=>entry.name===symbol&&entry.localName===symbol);
                    if(imported.length!==1||exported.length!==1)throw new Error('Canonical nominal binding lacks exact TS import/reexport '+name+':'+symbol);
                    return {symbol,import:imported[0],export:exported[0]};
                });
                bindings.push({kind:'canonical-type-alias-reexport-binds-retained-array',name,canonicalPath:item.path,owner:item.owner,schemaId:item.schemaId,propertyPath:item.propertyPath,canonicalDeclarationSha256:item.declarationSha256,legacyArrayPath:old.source.path,legacyArraySymbol:old.sourceSymbol,importReexportProof:proofs});
                target=old;
            }else{
                target=family(name,item.values,{path:item.path,line:item.line,column:item.column},item.topLevel?'canonical-top-level-inline':'shared-inline-subset',null,item.topLevel?[aliases.get(item.owner)].filter(Boolean):[]);
                families.push(target);byName.set(name,target);
                bindings.push({kind:'current-inline-nominal',name,path:item.path,owner:item.owner,schemaId:item.schemaId,propertyPath:item.propertyPath,declarationSha256:item.declarationSha256});
            }
        }
        same(target.values,item.values,'Source-proven enum values/order mismatch '+item.id);
        item.family=target.name;target.occurrenceIds.push(item.id);occurrences.push(item);
    }
    const closure=(key,seen=new Set())=>{
        if(seen.has(key))return seen;seen.add(key);const row=dataBySymbol.get(key);
        if(row)for(const dep of row.dependencies)closure(row.path+'::'+dep,seen);
        return seen;
    };
    for(const row of declarations){
        const own=closure(row.path+'::'+row.name);
        for(const f of families.filter((f)=>f.sourceSymbol)){
            const deps=closure(f.source.path+'::'+f.sourceSymbol);
            const relation=deps.has(row.path+'::'+row.name)?'source-dependency':[...own].some((key)=>deps.has(key))?'shared-source-dependency':null;
            if(relation)row.rustMappings.push({family:f.name,relation,via:row.name});
        }
        const typedNames=new Map(families.flatMap((f)=>f.aliases.map((name)=>[name,f.name])));
        const sourceInput=inputs.get(row.path);const declaration=sourceInput.constants.get(row.name);
        const visitType=(node)=>{
            if(ts.isTypeReferenceNode(node)){
                const type=node.typeName.getText(sourceInput.sf);const name=typedNames.get(type);
                if(name&&!row.rustMappings.some((link)=>link.family===name))row.rustMappings.push({family:name,relation:'typescript-type-constraint',via:type});
            }
            ts.forEachChild(node,visitType);
        };
        visitType(declaration);
        if(row.r0Kind){
            const wires=row.kind==='string-array'?row.value:row.kind==='enum-definitions'?row.value.map((v)=>v.value):Object.values(row.value);
            for(const link of row.rustMappings){
                const values=byName.get(link.family).values;
                link.wireRelation=JSON.stringify(wires)===JSON.stringify(values)?'exact-values-and-order':values.every((v)=>wires.includes(v))?'family-subset-of-declaration':wires.every((v)=>values.includes(v))?'declaration-subset-of-family':null;
                if(!link.wireRelation)throw new Error('Unrelated source mapping '+row.name);
            }
            if(!row.rustMappings.some((x)=>x.wireRelation==='exact-values-and-order'))throw new Error('No complete source mapping '+row.name);
        }
    }
    const auth=backend(root,ts,sourceAccess);for(const f of auth.families){if(byName.has(f.name))throw new Error('Backend type collision '+f.name);families.push(f);byName.set(f.name,f);}
    const nominalOwners=new Map();
    for(const f of families)for(const name of new Set([f.name,...f.aliases])){
        if(nominalOwners.has(name)&&nominalOwners.get(name)!==f.name)throw new Error('Rust nominal namespace collision '+name);
        nominalOwners.set(name,f.name);
    }
    const emittedNames=new Set(nominalOwners.keys());
    for(const historical of identity.families)for(const name of [historical.name,...historical.aliases])if(!emittedNames.has(name))throw new Error('Historical consumer nominal name removed '+name);
    // Compare public top-level enums where OpenAPI publishes their identity.
    const spec=JSON.parse(sourceAccess ? sourceAccess.readText('libs/shared/api-spec/openapi.json') : readFileSync(resolve(root,'libs/shared/api-spec/openapi.json'),'utf8'));
    for(const item of occurrences)if(item.topLevel&&item.schemaId&&Array.isArray(spec.components?.schemas?.[item.schemaId]?.enum)){
        item.openApiValues=spec.components.schemas[item.schemaId].enum;same(item.values,item.openApiValues,'Actual public enum/OpenAPI drift '+item.schemaId);item.comparison='exact-values-and-order';
    }
    const r0=JSON.parse(sourceAccess ? sourceAccess.readText('docs/design/rust-r0-api-operations.json') : readFileSync(resolve(root,'docs/design/rust-r0-api-operations.json'),'utf8'));
    const historicalConstants=r0.sharedSsot.constants.map((old,index)=>{
        const row=declarations.find((d)=>d.path===old.path&&d.name===old.name);
        if(!row)throw new Error('Historical constant deleted without a source successor '+old.name);
        return {historicalIndex:index,name:old.name,path:old.path,historicalKind:old.kind,currentKind:row.r0Kind,historicalRecordSha256:sha(JSON.stringify(witnessWithoutLine(old))),historicalValueSha256:sha(JSON.stringify(old.value)),currentDeclarationSha256:row.declarationSha256,currentValueSha256:row.valueSha256,disposition:JSON.stringify(old.value)===JSON.stringify(row.value)?'retained-value':'explicit-value-replacement'};
    });
    const historicalEnums=identity.historicalEnums.map((old)=>{
        let candidates=occurrences.filter((item)=>item.owner===old.owner&&item.schemaId===old.schemaId&&JSON.stringify(item.propertyPath)===JSON.stringify(old.propertyPath));
        const runtimePath=graph.semanticFields.find((field)=>field.historicalIndex===old.historicalIndex);
        if(!candidates.length&&runtimePath){
            const providers=runtimePath.owners.flatMap((owner)=>owner.leaves.flatMap((leaf)=>leaf.providers||[]));
            candidates=occurrences.filter((item)=>providers.some((provider)=>provider.path===item.path&&provider.owner===item.owner&&item.topLevel));
        }
        const retained=byName.get(old.family);
        if(!retained)throw new Error('Historical nominal family deleted '+old.family);
        const runtimeWitness=runtimePath?{...runtimePath,owners:runtimePath.owners.map((owner)=>({...owner,leaves:owner.leaves.map(({values,...leaf})=>({...leaf,finiteValuesSha256:values?sha(JSON.stringify(values)):null}))}))}:null;
        const oldRecord=r0.sharedSsot.enumSchemas[old.historicalIndex];
        const replacements=candidates.map((item)=>({key:sourceKey(item),family:item.family,currentValuesSha256:item.valuesSha256,historicalValuesSha256:sha(JSON.stringify(oldRecord.values)),wireRelation:JSON.stringify(item.values)===JSON.stringify(oldRecord.values)?'same-values-and-order':'explicit-current-wire-replacement',construction:item.sourceArray===old.sourceArray?'same-source-argument-kind':'explicit-source-construction-change'}));
        return {...old,disposition:candidates.length?candidates.every((item)=>item.owner===old.owner&&item.path===old.path)?'same-owner-property-source-retained':'explicit-module-or-named-provider-migration':'explicit-structural-field-migration-or-removed-restriction',currentOccurrenceKeys:candidates.map(sourceKey),currentReplacements:replacements,currentRuntimePath:runtimeWitness,retainedFamily:retained.name,retainedFamilySource:{path:retained.source.path,symbol:retained.sourceSymbol},retainedCompatibilityValuesSha256:sha(JSON.stringify(retained.values))};
    });
    const priorNames=new Set(r0.sharedSsot.constants.map((r)=>r.name));
    const additions=declarations.filter((row)=>row.r0Kind&&!priorNames.has(row.name)).map((row)=>({name:row.name,path:row.path,kind:row.r0Kind,declarationSha256:row.declarationSha256,valueSha256:row.valueSha256}));
    const migratedKeys=new Set(historicalEnums.flatMap((item)=>item.currentOccurrenceKeys));
    const postR0EnumSources=occurrences.filter((item)=>!migratedKeys.has(sourceKey(item))).map((item)=>({disposition:'post-R0-source-addition',key:sourceKey(item),path:item.path,owner:item.owner,schemaId:item.schemaId,propertyPath:item.propertyPath,sourceArray:item.sourceArray,topLevel:item.topLevel,family:item.family,declarationSha256:item.declarationSha256,expressionSha256:sha(item.expression),valuesSha256:item.valuesSha256}));
    const registration={historicalR0:graph.historicalR0,constants:historicalConstants,enumOccurrences:historicalEnums,postR0Constants:additions,postR0EnumSources,nominalBindings:bindings,allCurrentEnumSources:occurrences.map((item)=>({key:sourceKey(item),id:item.id,owner:item.owner,schemaId:item.schemaId,path:item.path,propertyPath:item.propertyPath,sourceArray:item.sourceArray,topLevel:item.topLevel,declarationSha256:item.declarationSha256,expressionSha256:sha(item.expression),valuesSha256:item.valuesSha256,family:item.family}))};
    const manifest={
        formatVersion:2,authority:{sourceHead:null,mode:'S5-candidate-unfrozen',rule:'Current TypeScript is sole editable wire authority; old R0 and old nominal identities are comparison provenance only.',sourceInputs:sourceAccess ? sourceAccess.inputFingerprints() : fingerprints(root,['.gitattributes',...CLOSED_MODULES,'libs/shared/api-spec/openapi.json',...AUTH_PATHS,'docs/design/rust-r0-api-operations.json'],sourceAccess),runtime:{nodeCompatibility:'24.x',typescript:ts.version,zod:graph.zod},textNormalization:{rule:"text.replace(/\\r\\n/g, '\\n')"}},
        coverage:{sharedTopLevelVariables:topVariables,sharedClassifiedDataDeclarations:declarations.length,sharedSchemaDeclarations:schemaDeclarations.length,explicitSchemaShapeExclusions:excludedDeclarations.length,historicalR0SnapshotCount:455,historicalR0EnumOccurrences:224,declaredPostR0SnapshotCount:additions.length,zEnumOccurrences:occurrences.length,generatedEnumFamilies:families.length,generatedEnumValues:families.reduce((sum,f)=>sum+f.values.length,0),sharedEnumFamilies:families.length-auth.families.length,backendAuthEnumFamilies:auth.families.length,completenessRule:'All closed-module statements and enum calls pinned; semantic AST z member recognition; every current enum maps to nominal source identity, never equal-value merging.'},
        declarations,schemaDeclarations,excludedDeclarations,backendAuthDeclarations:auth.declarations,enums:families,enumOccurrences:occurrences,helpers:graph.modules.flatMap((m)=>m.functions.map((f)=>({...f,path:m.path}))),
        originalTsExecution:{...staticOracle,dataDeclarationsCompared:declarations.length,enumArgumentsCompared:occurrences.length,actualTopLevelZodEnumsCompared:graph.modules.reduce((sum,m)=>sum+m.actualTopZodEnumsCompared,0),importAllowlist:['zod',...CLOSED_MODULES],evidenceClass:'strict original static evaluator plus actual original TS/Zod closed-graph execution'},
        r0Witness:{historicalR0:graph.historicalR0,originalBytesRewritten:false,declaredS5Registrations:registration},
    };
    return {manifest,registration,graph};
}
export function proposeS5(root,previousManifest,sourceAccess=null){
    assertSnapshotSourceAccess(sourceAccess);
    sourceAccess.assertLiveMatchesSnapshots();
    const r0=JSON.parse(sourceAccess ? sourceAccess.readText('docs/design/rust-r0-api-operations.json') : readFileSync(resolve(root,'docs/design/rust-r0-api-operations.json'),'utf8'));
    const identity=proposeIdentity(previousManifest,r0);const modules=proposeRegistry(root,sourceAccess);
    const built=construct(root,modules,identity,sourceAccess);
    const registry={formatVersion:1,reviewStatus:'candidate-needs-Root-and-independent-review',sourceHead:null,sourceAccess:sourceAccess?.provenance??null,modules,identitySha256:sha(JSON.stringify(identity)),registrations:built.registration,expectedCoverage:built.manifest.coverage};
    return {identity,registry,...built};
}
export function buildS5Manifest(root,registry,identity,{candidate=false,sourceAccess=null}={}){
    if(!candidate&&(registry.reviewStatus!=='Root-reviewed-S5-registration'||!/^[0-9a-f]{40}$/.test(registry.sourceHead||'')))throw new Error('S5 requires Root-reviewed registry and fixed source head');
    assertSnapshotSourceAccess(sourceAccess);
    sourceAccess.assertLiveMatchesSnapshots();
    const before=sourceAccess.inputFingerprints();
    same(sourceAccess?.provenance??null,registry.sourceAccess,'Unreviewed S5 physical source policy');
    same(sha(JSON.stringify(identity)),registry.identitySha256,'Unreviewed historical nominal identities');
    const result=construct(root,registry.modules,identity,sourceAccess);
    same(result.registration,registry.registrations,'Unreviewed source/nominal/historical disposition change');
    same(result.manifest.coverage,registry.expectedCoverage,'Unreviewed S5 coverage change');
    sourceAccess.assertLiveMatchesSnapshots();
    same(sourceAccess.inputFingerprints(),before,'S5 consumed source changed during pure construction');
    result.manifest.authority.sourceHead=registry.sourceHead;
    result.manifest.authority.sourceAccess=sourceAccess?.provenance??null;
    result.manifest.authority.mode=candidate?'S5-proposal-no-Git-certification':'S5-reviewed-source';
    return result.manifest;
}
