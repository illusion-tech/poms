import {createHash}from'node:crypto';
import {createRequire}from'node:module';
import {resolve}from'node:path';
const NOW='2026-10-28T01:02:03.123Z';
class FixedDate extends Date{constructor(...args){super(...(args.length?args:[NOW]));}static now(){return Date.parse(NOW);}}
const plain=value=>JSON.parse(JSON.stringify(value));
export async function sourceBehavior({read,executeTs,shared,root}){
    const require=createRequire(resolve(root,'package.json'));const nest=require('@nestjs/common');
    const dummy=class{};
    const adapterFile='apps/poms-api/src/app/features/external-org-sync/external-org-directory.adapter.ts';
    const adapterTypes=executeTs(read(adapterFile),adapterFile,{'@poms/shared-contracts':shared,'../identity-provider/identity-provider-config.entity':{},'./external-org-source.entity':{}});
    const env={};
    const directoryFile='apps/poms-api/src/app/features/external-org-sync/feishu-external-org-directory.adapter.ts';
    const requests=[];const axios={post:async(url,body,options)=>{requests.push({method:'POST',url,bodyKeys:Object.keys(body),appIdMatches:body.app_id==='synthetic-app',appSecretMatches:body.app_secret==='synthetic-secret',timeout:options.timeout});return{data:{code:0,tenant_access_token:'synthetic-token'}};},get:async(url,options)=>{requests.push({method:'GET',url,params:options.params,bearerMatches:options.headers.Authorization==='Bearer synthetic-token',timeout:options.timeout});return{data:{code:0,data:{items:[{},null,{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}],has_more:true,page_token:'unused-next'}}};}};
    const {FeishuExternalOrgDirectoryAdapter}=executeTs(read(directoryFile),directoryFile,{'@nestjs/common':nest,'@poms/shared-contracts':shared,'axios':axios,'./external-org-directory.adapter':adapterTypes},{process:{env}});
    const directory=new FeishuExternalOrgDirectoryAdapter();
    const directorySnapshots=[];
    for(const raw of [null,[],{},'x',{open_department_id:' a ',name:' Name ',order:'0x10'},{department_id:'d',department_name:'部门',status:{is_deleted:'true'}},{id:'i',name:'N',parent_id:' ',parent_open_department_id:'parent',order:false,department_order:'1.5'},{open_department_id:12,department_id:'fallback',name:'x',status:{deleted:1}},{id:'d',name:'n',order:'Infinity',department_order:' 2 ',status:{is_deleted:'TRUE',deleted:'false'}}])directorySnapshots.push({raw,expected:plain(directory.toDepartmentSnapshot(raw,'fallback-parent'))});
    const pages=[];for(const raw of [{},{code:0,data:{items:[]}},{code:'0',items:[]},{code:'bad',data:null},[],{code:'40011',msg:'page size'},{code:999,msg:'permission denied'},{code:999,msg:'invalid access token'},{code:999,msg:'unknown issue'}]){try{pages.push({raw,result:plain(directory.unwrapFeishuPayload(raw,'request failed',true))});}catch(error){pages.push({raw,error:plain({message:error.message,providerCode:error.providerCode,httpStatus:error.httpStatus,providerMessage:error.providerMessage,nextActions:error.nextActions})});}}
    const pageSizes=[];for(const value of [undefined,'',' ','-1','0','0.5','1.9','50','51','0x10','Infinity','bad']){if(value===undefined)delete env.FEISHU_ORG_DEPARTMENT_PAGE_SIZE;else env.FEISHU_ORG_DEPARTMENT_PAGE_SIZE=value;pageSizes.push({value:value??null,result:directory.pageSize()});}
    env.FEISHU_OPEN_API_BASE_URL='http://127.0.0.1:5900';
    const readAccess={rootDepartmentId:' a/b 部门 ',rawItemCount:5,expected:await directory.testDepartmentReadAccess({providerConfig:{clientId:'synthetic-app'},clientSecret:'synthetic-secret',rootDepartmentId:' a/b 部门 '}),requests:plain(requests),boundary:'Original adapter with synthetic axios dependency only; no network request'};
    const serviceFile='apps/poms-api/src/app/features/external-org-sync/external-org-sync.service.ts';
    const modules={'node:crypto':{createHash},'@nestjs/common':nest,'@poms/shared-contracts':shared,'../../core/runtime-audit/runtime-audit.service':{RuntimeAuditService:dummy},'../../core/secret/secret-cipher.service':{SecretCipherService:dummy},'../identity-provider/identity-provider-config.entity':{IdentityProviderConfig:dummy},'../identity-provider/identity-provider-secret.constants':{IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS:{}},'../platform/org-unit.entity':{OrgUnit:dummy},'./external-department-mapping.entity':{ExternalDepartmentMapping:dummy},'./external-org-directory.adapter':adapterTypes,'./external-org-directory-adapter.registry':{ExternalOrgDirectoryAdapterRegistry:dummy},'./external-org-source.entity':{ExternalOrgSource:dummy},'./external-org-sync.repository':{ExternalOrgSyncRepository:dummy},'./org-sync-diff-item.entity':{OrgSyncDiffItem:dummy},'./org-sync-run.entity':{OrgSyncRun:dummy}};
    const {ExternalOrgSyncService}=executeTs(read(serviceFile),serviceFile,modules,{Date:FixedDate,Error});
    const id=n=>'a0000000-0000-4000-8000-'+String(n).padStart(12,'0');
    const meta=n=>({id:id(n),rowVersion:1,createdAt:new Date(NOW),updatedAt:new Date(NOW),createdBy:null,updatedBy:null});
    const source={...meta(1),provider:'feishu',externalTenantId:null,displayName:'source',status:'active',providerConfigId:id(2),authoritativeOrgUnitId:id(3),externalRootDepartmentId:null,syncScopes:[]};
    const run={...meta(4),sourceId:id(1),status:'previewing',startedAt:new Date(NOW),finishedAt:null,requestSnapshot:{},resultSummary:{},errorSummary:null};
    const org=(n,name,parentId=null,isActive=true)=>({...meta(n),name,code:'C'+n,description:null,parentId,isActive,displayOrder:2});
    const mapping=(n,ext,orgUnitId=null,status='mapped')=>({...meta(n),sourceId:source.id,externalDepartmentId:ext,externalDepartmentName:ext,externalParentDepartmentId:'0',orgUnitId,status,externalSnapshot:{},lastSeenAt:null});
    const department=(ext,name=ext,parent='0',isActive=true,displayOrder=null)=>({externalDepartmentId:ext,externalDepartmentName:name,externalParentDepartmentId:parent,isActive,displayOrder,raw:{publicSentinel:'kept'}});
    const scenarios=[
        {name:'parent-child-create',departments:[department('parent'),department('child','child','parent')],mappings:[],orgUnits:[org(3,'root')]},
        {name:'child-before-parent',departments:[department('child','child','parent'),department('parent')],mappings:[],orgUnits:[org(3,'root')]},
        {name:'rename-before-move',departments:[department('x','new','0',true,7)],mappings:[mapping(10,'x',id(11))],orgUnits:[org(3,'root'),org(11,'old')]},
        {name:'move-only',departments:[department('x','x','0',true,7)],mappings:[mapping(10,'x',id(11))],orgUnits:[org(3,'root'),org(11,'x')]},
        {name:'empty-missing-disable',departments:[],mappings:[mapping(10,'x',id(11))],orgUnits:[org(3,'root'),org(11,'x')]},
        {name:'inactive-disable',departments:[department('x','x','0',false)],mappings:[mapping(10,'x',id(11))],orgUnits:[org(3,'root'),org(11,'x')]},
        {name:'ignored-seen',departments:[department('x')],mappings:[mapping(10,'x',null,'ignored')],orgUnits:[org(3,'root')]},
        {name:'missing-parent',departments:[department('x','x','missing')],mappings:[],orgUnits:[org(3,'root')]},
        {name:'mapped-target-inactive',departments:[department('x')],mappings:[mapping(10,'x',id(11))],orgUnits:[org(3,'root'),org(11,'x',null,false)]},
        {name:'duplicate-external-id-preserved',departments:[department('x','one'),department('x','two')],mappings:[],orgUnits:[org(3,'root')]},
        {name:'duplicate-managed-mapping-update-then-move',departments:[department('x','new','0',true,7),department('x','old','0',true,7)],mappings:[mapping(10,'x',id(11))],orgUnits:[org(3,'root'),org(11,'old')]}
    ];
    const preview=[];for(const scenario of scenarios){let next=100;const input=plain(scenario);const repo={findMappingsBySourceId:async()=>scenario.mappings,findAllOrgUnits:async()=>scenario.orgUnits,createMapping:value=>({...meta(next++),...value}),createDiffItem:value=>({...meta(next++),...value})};const service=new ExternalOrgSyncService(repo,{}, {},{});const result=await service.buildPreviewDiff(source,run,scenario.departments,null);preview.push({input,expected:plain(result)});}
    const service=new ExternalOrgSyncService({}, {},{},{});const codes=['simple','中文','a b/c','--','A'.repeat(100)].map(externalDepartmentId=>({externalDepartmentId,expected:service.buildExternalOrgUnitCode(source,externalDepartmentId)}));
    const diagnostics=[' tenant_access_token = public-fixture ', 'Bearer public-fixture, text', 'CLIENT_SECRET:"public-fixture" tail', 'not_secret=public-kept', 'x'.repeat(1002),'😀'.repeat(501)].map(message=>({message,redacted:service.redactDiagnosticSecrets(message),normalized:service.normalizeRunDiagnosticText(message)}));
    const diff=(n,ext,action='create_org_unit',candidate={})=>({...meta(n),runId:run.id,externalDepartmentId:ext,action,status:'pending',orgUnitId:null,beforeSnapshot:null,candidateSnapshot:{externalDepartmentId:ext,...candidate},errorMessage:null,appliedAt:null});
    const selection=[];for(const action of shared.ORG_SYNC_DIFF_ACTIONS)for(const status of shared.ORG_SYNC_DIFF_ITEM_STATUSES)for(const mode of ['implicit-empty','approved','unknown-approved','skip-wins']){const item={...diff(201,'x',action),status};const approved=mode==='implicit-empty'?[]:mode==='unknown-approved'?[id(999)]:[item.id];const skipped=mode==='skip-wins'?[item.id]:[];selection.push({item,approved,skipped,expected:!service.shouldSkipDiffItemForApply(item,new Set(skipped),new Set(approved),approved.length>0)});}
    const orders=[];for(const [name,items]of[
        ['parent-before-child',[diff(201,'child','create_org_unit',{targetParentExternalDepartmentId:'parent'}),diff(202,'parent'),diff(203,'rename','update_org_unit'),diff(204,'disabled','disable_org_unit')]],
        ['duplicate-create',[diff(201,'x'),diff(202,'x')]],
        ['cycle',[diff(201,'a','create_org_unit',{targetParentExternalDepartmentId:'b'}),diff(202,'b','create_org_unit',{targetParentExternalDepartmentId:'a'})]]
    ]){try{orders.push({name,items,selected:items.map(item=>item.id),expected:service.sortDiffItemsForApply(items,items).map(item=>item.id)});}catch(error){orders.push({name,items,selected:items.map(item=>item.id),error:{status:error.getStatus(),message:error.message}});}}
    const dependencies=[];for(const [name,items,mappings]of[
        ['missing',[diff(201,'child','create_org_unit',{targetParentExternalDepartmentId:'parent'})],[]],
        ['created',[diff(201,'child','create_org_unit',{targetParentExternalDepartmentId:'parent'}),diff(202,'parent')],[]],
        ['ignored-binding-still-counts',[diff(201,'child','move_org_unit',{targetParentExternalDepartmentId:'parent'})],[mapping(210,'parent',id(211),'ignored')]]
    ]){try{service.assertApplyParentDependencies(items,mappings);dependencies.push({name,items,mappings,expected:true});}catch(error){dependencies.push({name,items,mappings,error:{status:error.getStatus(),message:error.message}});}}
    const createCandidate=(external,targetName,targetCode,parentId=null,parentExternal=null)=>({externalDepartmentId:external,externalParentDepartmentId:parentExternal??'0',externalDepartmentName:targetName,targetName,targetCode,targetParentOrgUnitId:parentId,targetParentExternalDepartmentId:parentExternal,displayOrder:0,externalSnapshot:{publicSentinel:'kept'}});
    const createItems=[diff(220,'parent','create_org_unit',createCandidate('parent','Parent','PARENT',source.authoritativeOrgUnitId)),diff(221,'child','create_org_unit',createCandidate('child','Child','CHILD',null,'parent'))];
    const createMappings=[mapping(230,'parent',null,'unmapped'),mapping(231,'child',null,'unmapped')];
    const createOrgs=[];const created=new Map();const entities=[];
    const unassignedService=new ExternalOrgSyncService({createOrgUnit:value=>({...value,rowVersion:1})},{},{},{});
    for(const item of createItems)await unassignedService.applyDiffItem({source,item,mappings:createMappings,orgUnits:createOrgs,createdOrgUnitIdsByExternalDepartmentId:created,operatorId:null,entitiesToSave:entities});
    const unassignedPk={items:createItems.map(item=>service.toDiffItemSummary(item)),orgUnits:plain(createOrgs),mappings:createMappings.map(item=>service.toMappingSummary(item)),createdEntries:plain([...created]),boundary:'Original per-item source with repository.createOrgUnit returning an unassigned ID. This is a pure logic oracle; Root separately owns actual Nest/PG generated-PK evidence.'};
    return{formatVersion:1,sourceHead:'126ede22bb4b379ae656ccde9cee9d82da383be4',boundary:'Original service and Feishu adapter direct execution with synthetic dependencies; no HTTP, SQL, transaction, database or vendor claim',source,run,directorySnapshots,pages,pageSizes,readAccess,preview,codes,diagnostics,selection,orders,dependencies,unassignedPk};
}
