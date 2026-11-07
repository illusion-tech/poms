// Root application proposal only. Reads current exact applied final03 sources.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const ts=createRequire('E:/projects/poms/package.json')('typescript'),root='E:/projects/worktrees/poms-r3hijk-next28/poms',own=__dirname;
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const clientRel='apps/poms-admin/src/app/features/project/project-governance-client-values.ts';
const originalClient=fs.readFileSync(path.join(root,clientRel));
const ast=ts.createSourceFile(clientRel,originalClient.toString('utf8'),ts.ScriptTarget.Latest,true),runtime=new Set(),types=new Set();
function visit(node){if(ts.isPropertyAccessExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='Api')runtime.add(node.name.text);if(ts.isQualifiedName(node)&&ts.isIdentifier(node.left)&&node.left.text==='Api')types.add(node.right.text);ts.forEachChild(node,visit);}visit(ast);
for(const name of runtime)types.delete(name);
const facadeRel='libs/admin/data-access/src/lib/project/project-governance-client.ts';
if(fs.existsSync(path.join(root,facadeRel)))throw new Error('Governance facade already exists; rebase proposal');
const facade=`// Exact SDK bridge for the project governance authoring surface.\n// No app interface is imported; the generated client remains the type authority.\nexport {\n${[...runtime].sort().map(name=>'    '+name+',').join('\n')}\n} from '@poms/shared-api-client';\nexport type {\n${[...types].sort().map(name=>'    '+name+',').join('\n')}\n} from '@poms/shared-api-client';\n`;
const edits=[];
function write(rel,output){const target=path.join(root,rel),original=fs.existsSync(target)?fs.readFileSync(target):null,dest=path.join(own,'proposed',rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,output);if(original){const saved=path.join(own,'originals',rel);fs.mkdirSync(path.dirname(saved),{recursive:true});fs.writeFileSync(saved,original);}edits.push({path:rel,originalExists:!!original,originalSHA256:original?sha(original):null,proposedSHA256:sha(Buffer.from(output))});}
write(facadeRel,facade);
const indexRel='libs/admin/data-access/src/index.ts',index=fs.readFileSync(path.join(root,indexRel),'utf8'),eol=index.includes('\r\n')?'\r\n':'\n';
if(index.includes('ProjectGovernanceClient')||index.includes('FullProjectDetailView,'))throw new Error('Expected exact existing facade baseline');
const append=["export { ContractFinanceApi, CreateProjectArchiveRecordRequestInputVersionEnum, ReplaceProjectArchiveRecordRequestInputVersionEnum, VoidProjectArchiveRecordRequestInputVersionEnum, type FullProjectDetailView } from '@poms/shared-api-client';","export * as ProjectGovernanceClient from './lib/project/project-governance-client';"].join(eol)+eol;
write(indexRel,index+(index.endsWith('\n')?'':eol)+append);
function once(text,before,after){if(text.split(before).length!==2)throw new Error('Unexpected source at '+before);return text.replace(before,after);}
write(clientRel,once(originalClient.toString('utf8'),"import * as Api from '@poms/shared-api-client';","import { ProjectGovernanceClient as Api } from '@poms/admin-data-access';"));
const gatewayRel='apps/poms-admin/src/app/features/project/project-governance-api.ts';let gateway=fs.readFileSync(path.join(root,gatewayRel),'utf8');
gateway=once(gateway,"import { AttachmentStore, type UploadAttachmentInput } from '@poms/admin-data-access';\n",'');
gateway=once(gateway,"    ActiveInactiveStatus, AttachmentRelationType, AttachmentTargetType, CommissionApi, CommissionRoleAssignmentsApi,","    AttachmentStore, type UploadAttachmentInput, ActiveInactiveStatus, AttachmentRelationType, AttachmentTargetType, CommissionApi, CommissionRoleAssignmentsApi,");
gateway=once(gateway,"} from '@poms/shared-api-client';","} from '@poms/admin-data-access';");write(gatewayRel,gateway);
const detailRel='apps/poms-admin/src/app/features/project/project-detail.ts';let detail=fs.readFileSync(path.join(root,detailRel),'utf8');
detail=once(detail,"import { CreateProjectArchiveRecordRequestInputVersionEnum, ReplaceProjectArchiveRecordRequestInputVersionEnum, VoidProjectArchiveRecordRequestInputVersionEnum, type FullProjectDetailView as ProjectDetailView } from '@poms/shared-api-client';\n",'');
detail=once(detail,'    AttachmentTargetType,','    CreateProjectArchiveRecordRequestInputVersionEnum, ReplaceProjectArchiveRecordRequestInputVersionEnum, VoidProjectArchiveRecordRequestInputVersionEnum, type FullProjectDetailView as ProjectDetailView,\n    AttachmentTargetType,');write(detailRel,detail);
const manifest={status:'Root-Nx-boundary-append05-candidate-not-applied',files:edits,facade:{runtime:[...runtime].sort(),types:[...types].sort(),namespace:'ProjectGovernanceClient',wholeSdkStarExport:false,appInterfaceImports:false},productWrites:false};
fs.writeFileSync(path.join(own,'manifest05.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({files:edits.length,runtimeEnums:runtime.size,types:types.size,manifestSHA256:sha(fs.readFileSync(path.join(own,'manifest05.json')))}));
