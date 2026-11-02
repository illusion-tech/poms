// Pure minimal legal lifecycle projection data. These statements never certify
// R4 commands, approval transitions, completion or archive production.
import {
  preparedLabel,patchProject,insertPackage,insertSnapshot,insertContract,
  insertTermSnapshot,insertHandover,insertAcceptance,insertCompletion,insertArchive,
} from './prepared-facts.mjs';
import { projectRowFact } from './guidance-plan.mjs';

export const timelineFactIdRoles=Object.freeze([
  'tPackageContract','tPackageHandover','tSnapshotContract','tSnapshotHandover','tTerm',
  'cUnsigned','cLater','cOlderUpdated','cOlderCreated','cWinner','cLowerMicro',
  'hDraft','hVoided','hSuperseded','hNull','hOlder','hOlderUpdated','hOlderCreated','hWinner',
  'aOlder','aOlderCreated','aWinner','aRejected','aVoided',
  'mOlder','mOlderCreated','mWinner','mNonconfirmedLegacy',
  'rSuperseded','rVoided','rRecorded','cTie','hTie','aTie','mTie',
]);

const get=(id,projectId,expect={})=>({
  id,method:'GET',path:`/api/projects/${projectId}/timeline`,sessionRole:'projectRead',expect:{status:200,...expect},actual:null,
  capture:['all 12 event fields and source/evidence IDs','projectId/events/generatedAt top-level','raw precise SQL facts and selected candidates','before/after all domain rows and versions','request clock'],
});
const update=(role,table,sql,params)=>({role,table,sql,params,classification:preparedLabel,executionOwner:'Root',actual:null,affectedRows:1});

function rows(ids) {
  const f=ids.factIds,p=ids.projectTimelineRow.id,actor=ids.operatorUserId,other=ids.otherUserId;
  const base='2020-01-01T00:00:00.000000Z',key=`D-${ids.runTag}`;
  const contract=(role,patch)=>({role,id:f[role],projectId:p,contractNo:`${key}-${role}`,status:'draft',signedAt:'2020-01-02T00:00:00.123900Z',createdAt:base,updatedAt:'2020-01-04T00:00:00.000000Z',createdBy:actor,updatedBy:other,...patch});
  const handover=(role,patch)=>({role,id:f[role],projectId:p,contractSummarySnapshotId:f.tSnapshotContract,termSnapshotId:f.tTerm,summarySnapshotId:f.tSnapshotHandover,status:'confirmed',confirmedAt:'2020-02-01T00:00:00.111900Z',actorId:actor,createdAt:'2020-02-03T00:00:00.000000Z',updatedAt:'2020-02-04T00:00:00.000000Z',...patch});
  const acceptance=(role,patch)=>({role,id:f[role],projectId:p,type:'final-acceptance',result:'conditional',status:'confirmed',confirmedAt:'2020-03-01T00:00:00.123900Z',actorId:null,evidence:`D evidence ${role}`,createdAt:'2020-03-02T00:00:00.000000Z',...patch});
  const completion=(role,patch)=>({role,id:f[role],projectId:p,acceptanceId:f.aWinner,result:'conditional-completed',status:'confirmed',completedAt:'2020-03-01T00:00:00.123100Z',actorId:ids.missingUuid,evidence:`D evidence ${role}`,createdAt:'2020-03-03T00:00:00.000000Z',...patch});
  const archive=(role,patch)=>({role,id:f[role],projectId:p,stage:'closed-terminated',sourceType:'project',sourceId:p,status:'recorded',archivedAt:'2020-04-01T00:00:00.000000Z',actorId:other,summary:`D summary ${role}`,evidence:`D evidence ${role}`,createdAt:'2020-04-02T00:00:00.000000Z',...patch});
  return {
    contracts:[
      contract('cUnsigned',{status:'active',signedAt:null,updatedAt:'2029-01-01T00:00:00Z'}),
      contract('cLater',{status:'active',signedAt:'2020-01-03T00:00:00Z'}),
      contract('cOlderUpdated',{status:'terminated',updatedAt:'2020-01-03T00:00:00Z'}),
      contract('cOlderCreated',{status:'terminated',createdAt:'2020-01-01T00:00:00.001000Z'}),
      contract('cWinner',{status:'completed',createdAt:'2020-01-01T00:00:00.002000Z'}),
      contract('cLowerMicro',{status:'active',signedAt:'2020-01-02T00:00:00.123100Z',updatedAt:'2029-01-01T00:00:00Z'}),
    ],
    handovers:[
      handover('hDraft',{status:'draft',confirmedAt:'2029-01-01T00:00:00Z'}),
      handover('hVoided',{status:'voided',confirmedAt:'2029-01-02T00:00:00Z'}),
      handover('hSuperseded',{status:'superseded',confirmedAt:'2029-01-03T00:00:00Z'}),
      handover('hNull',{confirmedAt:null}),
      handover('hOlder',{confirmedAt:'2020-02-01T00:00:00.111100Z'}),
      handover('hOlderUpdated',{updatedAt:'2020-02-03T00:00:00Z'}),
      handover('hOlderCreated',{createdAt:'2020-02-02T00:00:00Z'}),
      handover('hWinner',{}),
    ],
    acceptances:[
      acceptance('aOlder',{type:'stage-outcome',result:'accepted',confirmedAt:'2020-03-01T00:00:00.123100Z'}),
      acceptance('aOlderCreated',{type:'stage-acceptance',result:'accepted',createdAt:'2020-03-01T00:00:00Z'}),
      acceptance('aWinner',{}),
      acceptance('aRejected',{result:'rejected',confirmedAt:'2029-01-01T00:00:00Z'}),
      acceptance('aVoided',{status:'voided',result:'accepted',confirmedAt:'2029-01-02T00:00:00Z'}),
    ],
    completions:[
      completion('mOlder',{result:'completed',completedAt:'2020-03-01T00:00:00.123000Z'}),
      completion('mOlderCreated',{result:'completed',createdAt:'2020-03-02T00:00:00Z'}),
      completion('mWinner',{}),
      completion('mNonconfirmedLegacy',{status:'voided',result:'completed',completedAt:'2029-01-01T00:00:00Z'}),
    ],
    archives:[
      archive('rSuperseded',{status:'superseded',archivedAt:'2029-01-01T00:00:00Z'}),
      archive('rVoided',{status:'voided',archivedAt:'2029-01-02T00:00:00Z'}),
      archive('rRecorded',{}),
    ],
  };
}

export function buildTimelineCases(ids) {
  const f=ids.factIds,p=ids.projectTimelineRow.id,data=rows(ids),at='2020-01-01T00:00:00.000000Z';
  const packageKey=`d-g2-${ids.runTag}`;
  const packages=[
    insertPackage({role:'timeline-contract-package',id:f.tPackageContract,scenario:'contract-handover',packageKey:`${packageKey}-contract`,projection:'contract-handover',createdAt:at}),
    insertPackage({role:'timeline-handover-package',id:f.tPackageHandover,scenario:'project-handover',packageKey:`${packageKey}-handover`,projection:'project-handover',createdAt:at}),
  ];
  const snapshots=[
    insertSnapshot({role:'timeline-contract-summary',id:f.tSnapshotContract,targetId:p,scenario:'contract-handover',packageId:f.tPackageContract,packageKey:`${packageKey}-contract`,projection:'contract-handover',exportPolicy:'deny',generatedAt:at,createdAt:at}),
    insertSnapshot({role:'timeline-handover-summary',id:f.tSnapshotHandover,targetId:p,scenario:'project-handover',packageId:f.tPackageHandover,packageKey:`${packageKey}-handover`,projection:'project-handover',exportPolicy:'allow',generatedAt:at,createdAt:at}),
  ];
  return [
    {id:'K.T01.no-inferred-stages',covers:['K-T01','K-T10'],prepare:[],requests:[get('K.T01.no-inferred-stages',ids.guidanceProjects.completed,{eventCount:1,eventKeys:['project-created'],createdEventStage:'assessment',currentStageDoesNotSynthesizeFacts:true})],precondition:'Fresh real API project created with currentStage=completed; zero contract/handover/acceptance/completion/archive facts'},
    {id:'K.T02-T08.full-legal-facts',covers:['K-T01','K-T02','K-T03','K-T04','K-T05','K-T06','K-T07','K-T08','K-T10'],
      precondition:'Dedicated real projectTimelineRow initially has no facts; all prepared UUIDs owned, all package/contract number keys new',
      prepare:[
        patchProject(projectRowFact(ids.projectTimelineRow,{role:'timeline-fixed-project-clock-and-nonclosed-close',status:'active',stage:'execution',createdAt:at,createdBy:ids.operatorUserId,updatedBy:ids.operatorUserId,closedAt:'2020-01-04T00:00:00Z',closedReason:''})),
        ...packages,...snapshots,...data.contracts.map(insertContract),
        insertTermSnapshot({role:'timeline-handover-term-FK',id:f.tTerm,contractId:f.cLater,createdAt:at,status:'active'}),
        ...data.handovers.map(insertHandover),...data.acceptances.map(insertAcceptance),...data.completions.map(insertCompletion),...data.archives.map(insertArchive),
      ],
      requests:[get('K.T02-T08.full-legal-facts',p,{
        eventCount:7,
        eventKeys:['project-created',`contract-signed:${f.cLowerMicro}`,'project-closed',`project-handover-confirmed:${f.hWinner}`,`project-completed:${f.mWinner}`,`acceptance-confirmed:${f.aWinner}`,`project-archived:${f.rRecorded}`],
        facts:{
          contract:{id:f.cLowerMicro,reason:'all statuses considered; null excluded; earliest complete stored signed_at; only identical instants retain repo updated DESC / created DESC order'},
          handover:{id:f.hWinner,reason:'confirmed nonnull only; full confirmed_at DESC,updated_at DESC,created_at DESC'},
          acceptance:{id:f.aWinner,resultLabel:'最终验收有条件通过',actorUserId:null,actorName:null},
          completion:{id:f.mWinner,resultLabel:'项目有条件完成',actorUserId:ids.missingUuid,actorName:null},
          archive:{id:f.rRecorded,stage:'closed-terminated',resultLabel:'项目归档：D summary rRecorded',evidenceLabel:'D evidence rRecorded'},
          close:{stage:'execution',statusMayBeActive:true,resultLabel:'项目关闭',evidenceLabel:''},
        },
        acceptanceAndCompletionSameWireMillisecond:'2020-03-01T00:00:00.123Z',tieSort:'completed_at .123100 precedes confirmed_at .123900 despite identical displayed milliseconds; eventKey orders only completely equal stored instants',
        everyEventFieldCount:12,noUuidAsMissingActorName:true,allAuthoritative:true,
      })],
      classification:preparedLabel,
      caution:'mNonconfirmedLegacy is DB-legal varchar compatibility input only; no source completion command is claimed to produce voided status. NOT NULL times are never bypassed.',
    },
  ];
}

export function buildTimelineTieCases(ids) {
  const f=ids.factIds,p=ids.projectTimelineRow.id,data=rows(ids);
  return [
    ['contract','cLowerMicro','cTie','contract',insertContract,data.contracts.find(row=>row.role==='cLowerMicro')],
    ['handover','hWinner','hTie','project_handover',insertHandover,data.handovers.find(row=>row.role==='hWinner')],
    ['acceptance','aWinner','aTie','acceptance_record',insertAcceptance,data.acceptances.find(row=>row.role==='aWinner')],
    ['completion','mWinner','mTie','project_completion_record',insertCompletion,data.completions.find(row=>row.role==='mWinner')],
  ].map(([tag,winner,tie,table,constructor,row])=>({
    id:`K.T09.equal-all-keys.${tag}`,covers:['K-T09','K-T10'],
    prepare:[constructor({...row,id:f[tie],role:tie,...(tag==='contract'?{contractNo:`D-${ids.runTag}-${tie}`}:{})})],
    requests:[get(`K.T09.equal-all-keys.${tag}`,p,{selectedSourceIdMemberOf:[f[winner],f[tie]],undefinedOriginalTie:true,retainedCompleteCandidateSet:true,noFixedUuidTie:true})],
    cleanupAfter:[{role:`remove-${tie}-before-next-case`,table,sql:`DELETE FROM poms.${table} WHERE id=$1::uuid RETURNING id`,params:[f[tie]],classification:preparedLabel,affectedRows:1}],
    precondition:'Execute before alternative label patches, or copy the actual current winner fields exactly. Delete each tie row after its single read so later deterministic cases recover their one selected row.',
  }));
}

export function buildTimelineAlternativeCases(ids) {
  const f=ids.factIds,p=ids.projectTimelineRow.id;
  const cases=[];
  for(const[type,typeLabel]of[['stage-outcome','阶段成果确认'],['stage-acceptance','阶段验收'],['final-acceptance','最终验收']])for(const[result,resultLabel]of[['accepted','已通过'],['conditional','有条件通过']]){
    cases.push({id:`K.T04.label.${type}.${result}`,covers:['K-T04','K-T10'],prepare:[update('acceptance-label-variant','acceptance_record','UPDATE poms.acceptance_record SET acceptance_type=$2,acceptance_result=$3 WHERE id=$1::uuid RETURNING *',[f.aWinner,type,result])],requests:[get(`K.T04.label.${type}.${result}`,p,{sourceId:f.aWinner,resultLabel:typeLabel+resultLabel})]});
  }
  cases.push({id:'K.T02.contract-createdBy-fallback',covers:['K-T02'],prepare:[update('contract-actor-fallback','contract','UPDATE poms.contract SET updated_by=NULL WHERE id=$1::uuid RETURNING *',[f.cLowerMicro])],requests:[get('K.T02.contract-createdBy-fallback',p,{contractSourceId:f.cLowerMicro,contractActorUserId:ids.operatorUserId})]});
  cases.push({id:'K.T05.completed-label',covers:['K-T05'],prepare:[update('completion-result-variant','project_completion_record','UPDATE poms.project_completion_record SET completion_result=$2 WHERE id=$1::uuid RETURNING *',[f.mWinner,'completed'])],requests:[get('K.T05.completed-label',p,{sourceId:f.mWinner,resultLabel:'项目已完成'})]});
  for(const stage of ['completed','closed-lost'])cases.push({id:`K.T06.anchor.${stage}`,covers:['K-T06'],prepare:[update('archive-anchor-variant','project_archive_record','UPDATE poms.project_archive_record SET archive_anchor_stage=$2,archive_anchor_source_type=$3,archive_anchor_source_id=$4::uuid WHERE id=$1::uuid RETURNING *',[f.rRecorded,stage,stage==='completed'?'project-completion-record':'project',stage==='completed'?f.mWinner:p])],requests:[get(`K.T06.anchor.${stage}`,p,{archiveSourceId:f.rRecorded,archiveStage:stage})]});
  for(const[tag,closedAt,closedReason,resultLabel,evidenceLabel]of[
    ['null-reason','2020-01-04T00:00:00Z',null,'项目关闭','项目关闭'],
    ['empty-reason','2020-01-04T00:00:00Z','','项目关闭',''],
    ['nonempty-reason','2020-01-04T00:00:00Z','D explicit close','项目关闭：D explicit close','D explicit close'],
    ['no-close-time',null,'D reason without time',null,null],
  ])cases.push({id:`K.T07.${tag}`,covers:['K-T07','K-T10'],prepare:[update('project-close-read-variant','project','UPDATE poms.project SET status=$2,current_stage=$3,closed_at=$4::timestamptz,closed_reason=$5 WHERE id=$1::uuid RETURNING *',[p,'active','execution',closedAt,closedReason])],requests:[get(`K.T07.${tag}`,p,{closeEventPresent:closedAt!==null,resultLabel,evidenceLabel,statusDoesNotGateClose:true})]});
  return cases;
}

export const timelineReadInvariant=Object.freeze({
  compareEachGETIndividually:true,
  domainTables:['project','contract','contract_term_snapshot','project_handover','acceptance_record','project_completion_record','project_archive_record','approval_summary_snapshot','approval_summary_package_definition'],
  beforeAndAfter:['all owned rows including precise datetime text','all row_version values','all created_at/updated_at fields','counts','source IDs/FKs'],
  generatedAt:'bounded by actual request receipts; do not normalize away the field',
  preparedMutationBoundary:'Capture before after preparation and immediately before GET; compare after GET before executing next variant mutation',
  certification:'query projection only; no R4 write, state machine, approval, archive or stage acceptance claim',
});
