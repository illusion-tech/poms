// Pure definitions. Root supplies actual project/user/org receipts and fresh
// prepared UUIDs. Importing this file performs no requests or statements.
import { insertPackage, insertSnapshot, patchProject, patchOwnedUserName } from './prepared-facts.mjs';

export const stages = Object.freeze([
  'assessment','scope-confirmation','commercial-closure','contracting','handover',
  'execution','acceptance','completed','closed-lost','closed-terminated',
]);

export const permissionSets = Object.freeze({
  noPermissions:[],
  customerRead:['customer:read'], leadRead:['lead:read'], projectRead:['project:read'],
  customerWrite:['customer:write'], leadWrite:['lead:write'], projectWrite:['project:write'],
  projectReadWrite:['project:read','project:write'],
  finance:['project:read','contract:finance:manage'],
  assignment:['project:read','commission:assignments:manage'],
  payout:['project:read','commission:payouts:manage'],
  operationsPartial:['project:read','commission:calculations:manage'],
  operationsAll:['project:read','commission:rule-versions:manage','commission:calculations:manage','commission:payouts:manage','commission:adjustments:manage'],
  operationsNoRules:['project:read','commission:calculations:manage','commission:payouts:manage','commission:adjustments:manage'],
  operationsNoCalculations:['project:read','commission:rule-versions:manage','commission:payouts:manage','commission:adjustments:manage'],
  operationsNoPayouts:['project:read','commission:rule-versions:manage','commission:calculations:manage','commission:adjustments:manage'],
  operationsNoAdjustments:['project:read','commission:rule-versions:manage','commission:calculations:manage','commission:payouts:manage'],
});

export const guidanceFactIdRoles = Object.freeze([
  'gPackage','gPackageOtherScenario','gPackageOtherProjection',
  'gSnapshotSuperseded','gSnapshotVoided','gSnapshotOtherScenario','gSnapshotOtherProjection',
  'gSnapshotOtherType','gSnapshotOtherTarget','gSnapshotExact',
]);

export function projectRowFact(row, patch = {}) {
  return {
    role:'owned-project-projection-variant',id:row.id,status:row.status,stage:row.current_stage,
    closedAt:row.closed_at,closedReason:row.closed_reason,customerId:row.customer_id,customerName:row.customer_name,
    ownerUserId:row.owner_user_id,ownerOrgId:row.owner_org_id,createdAt:row.created_at,
    createdBy:row.created_by,updatedBy:row.updated_by,...patch,
  };
}

const get = (id,projectId,expect,sessionRole='projectRead') => ({
  id,method:'GET',path:`/api/projects/${projectId}/workspace-guidance`,sessionRole,
  expect:{status:200,...expect},actual:null,
  capture:['full 14-field payload','entry array and all 7 fields','basis all 4 fields','before/after owned domain rows and row versions','request-clock window'],
});

// Original create controller supports the full ProjectStage enum. These are
// real foundation producer receipts, not R4 stage-transition command evidence.
export function buildStageProducerRequests(ids) {
  return stages.map(stage=>({
    id:`D.producer.guidance-stage.${stage}`,method:'POST',path:'/api/projects',sessionRole:'admin',
    body:{customerId:ids.customerA,projectName:`D G2 ${stage} ${ids.runTag}`,currentStage:stage},
    captureIdAs:`guidanceProjects.${stage}`,expect:{status:201,currentStage:stage,statusField:'active'},actual:null,
  }));
}

export function buildGuidanceStageCases(ids) {
  return stages.map(stage=>({
    id:`K.G02.stage.${stage}`,covers:['K-G01','K-G02','K-G07','K-G08'],
    prepare:[{role:`stage-fallback-owner-null.${stage}`,table:'project',sql:'UPDATE poms.project SET owner_user_id=NULL,owner_org_id=NULL WHERE id=$1::uuid RETURNING *',params:[ids.guidanceProjects[stage]],classification:'owned-real-project-owner-read-projection-only',executionOwner:'Root',actual:null,affectedRows:1}],
    requests:[get(`K.G02.stage.${stage}`,ids.guidanceProjects[stage],{
      currentStage:stage,currentStageLabel:{assessment:'立项评估','scope-confirmation':'范围确认','commercial-closure':'商务收口',contracting:'签约中',handover:'项目移交',execution:'正式执行',acceptance:'验收确认',completed:'已完成','closed-lost':'已丢单','closed-terminated':'已终止'}[stage],
      entryCount:['assessment','scope-confirmation','commercial-closure','contracting'].includes(stage)?13:stage==='handover'?10:9,
      ownerLabel:{assessment:'销售负责人','scope-confirmation':'技术支持 / 售前','commercial-closure':'销售负责人 / 商务负责人',contracting:'商务行政 / 销售负责人',handover:'销售 / 技术支持 / 项目负责人',execution:'项目负责人 / 财务',acceptance:'项目负责人 / 财务',completed:'项目负责人 / 财务','closed-lost':'销售负责人','closed-terminated':'项目负责人'}[stage],
      absentBasisAllNull:true,noTopLevelAllowedActions:true,
      literalTextAuthority:'apps/poms-api/src/app/features/project/project-query.service.ts PROJECT_WORKSPACE_STAGE_GUIDANCE',
      disabledReasonPriority:'closed > stage > permission',
    })],restore:'Root captures and restores these two owned owner IDs after the stage read; NULL projection makes every stage-specific fallback observable without claiming a R4 write.',
  }));
}

export function buildGuidanceStatusCases(ids) {
  const base=ids.projectGuidanceRow;
  return [
    {tag:'blocked-and-closed',status:'blocked',stage:'closed-lost',closedReason:'D closed reason',headline:'已丢单存在阻断，先处理卡点。',reasonCount:2},
    {tag:'pending-and-closed',status:'pending-approval',stage:'closed-lost',closedReason:'D closed reason',headline:'已丢单正在等待审批。',reasonCount:1},
    {tag:'hold-and-closed',status:'on-hold',stage:'closed-terminated',closedReason:null,headline:'已终止已挂起。',reasonCount:1},
    {tag:'closed-status-execution',status:'closed',stage:'execution',closedReason:'D closed reason',headline:'围绕经营、回款、成本和提成条件持续推进',reasonCount:1},
    {tag:'completed-remains-open',status:'completed',stage:'completed',closedReason:null,headline:'项目主线已完成，重点看归档和结算',reasonCount:0},
  ].map(v=>({
    id:`K.G03.${v.tag}`,covers:['K-G03','K-G07','K-G08'],
    prepare:[patchProject(projectRowFact(base,{role:`K.G03.${v.tag}`,status:v.status,stage:v.stage,closedReason:v.closedReason}))],
    requests:[get(`K.G03.${v.tag}`,base.id,{headline:v.headline,blockingReasonCount:v.reasonCount,stage:v.stage,statusField:v.status})],
  }));
}

export function buildGuidancePermissionCases(ids) {
  const cases=[];
  for(const sessionRole of ['projectRead','finance','assignment','payout','operationsPartial','operationsAll','operationsNoRules','operationsNoCalculations','operationsNoPayouts','operationsNoAdjustments']){
    cases.push({id:`K.G06.execution.${sessionRole}`,covers:['AUTH-04','K-G06','K-G07','K-G08'],prepare:[],
      requests:[get(`K.G06.execution.${sessionRole}`,ids.guidanceProjects.execution,{
        financeEnabled:sessionRole==='finance',freezeEnabled:sessionRole==='assignment',
        ruleExplanationEnabled:sessionRole==='payout'||sessionRole==='operationsAll'||sessionRole==='operationsNoRules'||sessionRole==='operationsNoCalculations'||sessionRole==='operationsNoAdjustments',
        finalSettlementEnabled:false,commissionOperationsEnabled:sessionRole==='operationsAll',
        internalSomeActionObservable:'operationsPartial grants internal manage action, but entry remains false because four operation permissions are not all present',
      },sessionRole)]});
  }
  cases.push({id:'K.G06.handover-finance',covers:['K-G06','K-G07'],prepare:[],requests:[get('K.G06.handover-finance',ids.guidanceProjects.handover,{operatingOverviewEnabled:false,operatingDisabledReason:'项目进入正式执行后再查看经营总览。',commissionGateEnabled:true},'finance')]});
  cases.push({id:'K.G06.acceptance-payout',covers:['K-G06','K-G07'],prepare:[],requests:[get('K.G06.acceptance-payout',ids.guidanceProjects.acceptance,{finalSettlementEnabled:true,ruleExplanationEnabled:true},'payout')]});
  return cases;
}

export function buildGuidanceOwnerCases(ids) {
  const base=ids.projectGuidanceRow;
  return [
    {tag:'both',ownerUserId:ids.operatorUserId,ownerOrgId:ids.operatorOrgId,ownerLabel:`${ids.operatorDisplayName} / ${ids.operatorOrgName}`},
    {tag:'name-only',ownerUserId:ids.operatorUserId,ownerOrgId:null,ownerLabel:ids.operatorDisplayName},
    {tag:'org-only',ownerUserId:null,ownerOrgId:ids.operatorOrgId,ownerLabel:ids.operatorOrgName},
    {tag:'neither',ownerUserId:null,ownerOrgId:null,ownerLabel:'项目负责人 / 财务'},
    {tag:'missing-identities',ownerUserId:ids.missingUuid,ownerOrgId:ids.missingUuid,ownerLabel:'项目负责人 / 财务'},
    {tag:'empty-name-is-not-null',ownerUserId:ids.emptyUserId,ownerOrgId:ids.operatorOrgId,ownerLabel:''},
  ].map(v=>({id:`K.G04.${v.tag}`,covers:['K-G04','K-G08'],
    prepare:[...(v.tag==='empty-name-is-not-null'?[patchOwnedUserName(ids.emptyUserId,'')]:[]),patchProject(projectRowFact(base,{role:`K.G04.${v.tag}`,status:'active',stage:'execution',closedAt:null,closedReason:null,ownerUserId:v.ownerUserId,ownerOrgId:v.ownerOrgId}))],
    requests:[get(`K.G04.${v.tag}`,base.id,{ownerLabel:v.ownerLabel})],
    restore:'Root restores the dedicated empty user name and original project fields after this group; owner IDs are nullable UUID columns without user/org FK',
  }));
}

export function buildGuidanceSnapshotCases(ids) {
  const f=ids.factIds,projectId=ids.projectGuidanceRow.id;
  const at='2020-01-01T00:00:00.123456Z',newer='2025-01-01T00:00:00.999999Z';
  const packageKey=`d-g2-${ids.runTag}`;
  const pkg=(role,id,scenario,projection,status='active')=>insertPackage({role,id,scenario,projection,status,packageKey:`${packageKey}-${role}`,createdAt:at,actorId:ids.operatorUserId});
  const snapshot=(role,id,patch={})=>insertSnapshot({role,id,targetId:projectId,scenario:'project-detail',packageId:f.gPackage,packageKey:`${packageKey}-guide`,projection:'project-detail',exportPolicy:'deny',generatedAt:newer,createdAt:newer,actorId:ids.operatorUserId,...patch});
  return [
    {id:'K.G05.no-summary',covers:['K-G05','K-G08'],prepare:[],requests:[get('K.G05.no-summary',projectId,{basis:{summarySnapshotId:null,projectionLevel:null,exportPolicy:null,generatedAt:null}})],precondition:'Fresh owned project has no exact active snapshot'},
    {id:'K.G05.only-ineligible-decoys',covers:['K-G05','K-G08'],prepare:[
      pkg('guide',f.gPackage,'project-detail','project-detail','inactive'),
      pkg('scenario',f.gPackageOtherScenario,'d-g2-other-scenario','project-detail'),
      pkg('projection',f.gPackageOtherProjection,'project-detail','d-g2-other-projection'),
      snapshot('superseded-exact',f.gSnapshotSuperseded,{status:'superseded'}),
      snapshot('voided-exact',f.gSnapshotVoided,{status:'voided'}),
      snapshot('other-scenario',f.gSnapshotOtherScenario,{scenario:'d-g2-other-scenario',packageId:f.gPackageOtherScenario,packageKey:`${packageKey}-scenario`}),
      snapshot('other-projection',f.gSnapshotOtherProjection,{projection:'d-g2-other-projection',packageId:f.gPackageOtherProjection,packageKey:`${packageKey}-projection`}),
      snapshot('other-type',f.gSnapshotOtherType,{targetType:'lead',targetId:ids.leadA}),
      snapshot('other-target',f.gSnapshotOtherTarget,{targetId:ids.projectSameCustomerOther}),
    ],requests:[get('K.G05.only-ineligible-decoys',projectId,{basisAllFourNull:true})]},
    {id:'K.G05.exact-active-and-inactive-package',covers:['K-G05','K-G08'],prepare:[
      snapshot('exact-active',f.gSnapshotExact,{generatedAt:at,createdAt:at}),
    ],requests:[get('K.G05.exact-active-and-inactive-package',projectId,{basis:{summarySnapshotId:f.gSnapshotExact,projectionLevel:'project-detail',exportPolicy:'deny',generatedAt:'2020-01-01T00:00:00.123Z'},
      proof:'Exact older active snapshot remains selected despite newer wrong-selector/status rows and inactive package definition; query has no package-status/export-policy gate'})]},
  ];
}
