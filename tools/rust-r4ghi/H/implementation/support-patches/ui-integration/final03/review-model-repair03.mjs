// Non-author read-only audit: repairModelText returns proposed strings in memory.
// Never invokes repairGeneratedModels, the synchronizer, a server or a database.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',own=path.dirname(fileURLToPath(import.meta.url));
const {repairModelText}=await import(pathToFileURL(path.join(root,'tools/openapi/repair-generated-models.mjs')).href);
const ts=createRequire('E:/projects/poms/package.json')('typescript');
const specRaw=fs.readFileSync(path.join(root,'libs/shared/api-spec/openapi.json')),document=JSON.parse(specRaw),modelFiles=new Map(),models=[];
const sha=raw=>createHash('sha256').update(raw).digest('hex');
for(const file of fs.readdirSync(path.join(root,'libs/shared/api-client/model')).filter(n=>n.endsWith('.ts')).sort()){
 const relative='model/'+file,raw=fs.readFileSync(path.join(root,'libs/shared/api-client',relative)),text=raw.toString('utf8'),ast=ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true);
 models.push({relative,raw,text});for(const node of ast.statements)if((ts.isInterfaceDeclaration(node)||ts.isTypeAliasDeclaration(node)||ts.isEnumDeclaration(node))&&Object.hasOwn(document.components.schemas,node.name.text))modelFiles.set(node.name.text,relative);
}
const changed=[],repairs=[],kinds={};
for(const model of models){const result=repairModelText(model.text,document,model.relative,modelFiles);if(result.repairs.length){changed.push({file:model.relative,beforeSHA256:sha(model.raw),proposedSHA256:sha(result.text)});repairs.push(...result.repairs);for(const item of result.repairs)kinds[item.kind]=(kinds[item.kind]??0)+1;}if(sha(fs.readFileSync(path.join(root,'libs/shared/api-client',model.relative)))!==sha(model.raw))throw new Error('SDK changed during non-author read-only audit');}
const report={status:'non-author-static-PASS-for-actual-frozen-689-source-pipeline-only',reviewer:'H',sourceSpecSHA256:sha(specRaw),helperSHA256:sha(fs.readFileSync(path.join(root,'tools/openapi/repair-generated-models.mjs'))),files:changed,kinds,repairs,findingsP1:[],findingsP2:[],notes:['Null aliases preserve existing required/optional property markers','Boolean literal type and named immutable values preserve true/false source values','Pure referenced alternatives remain actual typed unions, including CurrentAssignment|null','Conditional optionality uses base/allOf requirements and intersection across alternatives; zeroWeightReason still runtime-required at weight zero','Only fresh complete JAR output is processed once before SDK synchronization; already repaired input is intentionally not an idempotence target','Future schema compositions require independent review; this is not full TypeScript/HTTP/DB/business acceptance'],productWrites:false};
fs.writeFileSync(path.join(own,'model-repair-review03.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,kinds,changedFiles:changed.length,repairs:repairs.length,boolean:repairs.filter(r=>r.kind==='boolean-literal'),nullableUnion:repairs.filter(r=>r.kind==='referenced-model-union')}));
