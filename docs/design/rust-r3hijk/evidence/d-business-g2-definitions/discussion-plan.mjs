// Pure request/coordination recipes; Root alone supplies receipts and executes.
import { discussionBody, sourceFields } from '../d-input/native-fixture-draft01.mjs';
import { patchComment, patchOwnedUserName } from './prepared-facts.mjs';

const LIST='BusinessDiscussionController_list', CREATE='BusinessDiscussionController_create';
const queryText=query=>Object.entries(query).flatMap(([key,value])=>(Array.isArray(value)?value:[value]).map(item=>`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`)).join('&');
export const getDiscussion=(id,query,expect={},sessionRole='projectRead')=>({
  id,operationId:LIST,method:'GET',path:'/api/business-discussions'+(Object.keys(query).length?'?'+queryText(query):''),sessionRole,expect:{status:200,...expect},actual:null,
});
export const createDiscussion=(id,body,expect={},sessionRole='admin')=>({
  id,operationId:CREATE,method:'POST',path:'/api/business-discussions',sessionRole,csrf:'valid-session-double-submit',body,expect:{status:201,...expect},actual:null,
});
const group=(id,covers,requests,extra={})=>({id,covers,requests,actual:null,...extra});
const missing=(kind,id)=>({status:404,message:`${kind} ${id} not found`});
const mismatched=(kind,id,anchor,target)=>({status:400,message:`${kind} ${id} does not belong to ${anchor} ${target}`});

export const transportProfiles=Object.freeze({
  'valid-session':{session:'valid current session',csrf:'valid for POST'},
  'missing-session':{sessionCookie:'omit',csrf:'do not let a stray valid session cookie survive'},
  'expired-session':{session:'Root own expired idle/absolute session fixture, raw precondition receipt retained'},
  'revoked-session':{session:'Root own persisted revoked session fixture, raw precondition receipt retained'},
  'disabled-user':{session:'valid own session attached to own is_active=false user; capture then restore own user'},
  'csrf-missing-cookie':{sessionCookie:'keep valid',csrfCookie:'omit only this cookie',csrfHeader:'correct value'},
  'csrf-missing-header':{sessionCookie:'keep valid',csrfCookie:'keep correct',csrfHeader:'omit'},
  'csrf-mismatch':{sessionCookie:'keep valid',csrfCookie:'keep correct',csrfHeader:'different nonsecret test value'},
  'bad-session-token':{sessionCookie:'invalid token',csrf:'otherwise correct; authentication failure precedes CSRF/DTO'},
  'no-csrf-cookie-or-header':{sessionCookie:'keep valid',csrfCookie:'omit',csrfHeader:'omit',method:'GET only'},
});

export function adaptRootIds(report,overrides={}) {
  const raw=report.ids??{},chain=raw.integration??{};
  return {
    runTag:report.runId,customerA:raw.customerId,leadA:chain.leadId,
    projectA:chain.projectId,contactA:chain.contactId??raw.contactId,
    competitorA:chain.competitorId,followUpA:chain.followUpId,
    leadCommentA:chain.leadCommentId,projectCommentA:chain.projectCommentId,
    operatorUserId:raw.adminUserId,operatorOrgId:raw.adminOrgId,
    otherUserId:raw.otherUserId,otherOrgId:raw.otherOrgId,...overrides,
  };
}

export const receiptContracts=Object.freeze([
  {role:'customerA/customerB/customerEmpty',producer:'POST /api/customers',mustRetain:['id','displayName','status','raw request and response'],constraint:'A and B differ; Empty has no discussion thread before its first list'},
  {role:'leadA/projectA/leadCommentA/projectCommentA',producer:'actual H create→qualify→convert and actual J comments',mustRetain:['Lead.id/customerId','Project.id/sourceLeadId/customerId','both original comment IDs and thread IDs'],constraint:'projectA.sourceLeadId === leadA.id; adaptRootIds deliberately does not substitute the unrelated foundation project'},
  {role:'leadSameCustomerOther/leadOtherCustomer/leadClosed',producer:'H actual Lead create; closed target uses actual :close when available',mustRetain:['id','customerId','status','leadName'],constraint:'first is customerA, second customerB; no prepared Lead may replace X-01 production'},
  {role:'projectSameCustomerOther/projectOtherCustomer/projectRename/projectUnusedForRace/projectOrder/projectFkFailure/projectNullCustomer',producer:'POST /api/projects',mustRetain:['id','customerId','projectName','sourceLeadId'],constraint:'dedicated targets; nullable customer is explicitly prepared after its real API creation, sourceLeadId must be null'},
  {role:'contactA/contactInactiveA/contactOtherCustomer/contactFkDisposable',producer:'POST /api/customer-contacts; inactive via actual PATCH status=inactive',mustRetain:['id','customerId','name','status','rowVersion'],constraint:'A and inactiveA belong to customerA; Other belongs to B; disposable has no other FK consumers'},
  {role:'competitorLeadOnlyOther/competitorProjectOnlyOther/competitorOtherCustomer',producer:'POST /api/competitor-intelligence-records',mustRetain:['id','customerId','leadId','projectId'],constraint:'lead-only: A/leadSameCustomerOther/null; project-only: A/null/projectSameCustomerOther; other-customer: B/leadOtherCustomer/null'},
  {role:'followUpCustomerOnly/followUpLeadOnlyOther/followUpProjectOnlyOther/followUpOtherCustomer/followUpVoidedA/followUpSupersededA',producer:'POST /api/sales-follow-up-records; actual :void or :replace for historical states',mustRetain:['id','customerId','leadId','projectId','status','rowVersion','replacement linkage'],constraint:'superseded role is the OLD ID of the replaced row; never accidentally use the returned replacement ID'},
  {role:'missingUuid',producer:'Root allocated UUID and current DB absence witness',mustRetain:['absence in every customer/lead/project/contact/competitor/followup/user lookup used'],constraint:'valid UUID, not malformed text; do not repurpose a seed ID'},
]);

export function buildAssociationProducerRequests(ids) {
  const rows=[
    ['competitorLeadOnlyOther',{customerId:ids.customerA,leadId:ids.leadSameCustomerOther}],
    ['competitorProjectOnlyOther',{customerId:ids.customerA,projectId:ids.projectSameCustomerOther}],
    ['competitorOtherCustomer',{customerId:ids.customerB,leadId:ids.leadOtherCustomer}],
  ].map(([role,anchors])=>({id:`D.producer.${role}`,method:'POST',path:'/api/competitor-intelligence-records',sessionRole:'admin',body:{...anchors,competitorName:`D G2 ${role}`},captureIdAs:role,expect:{status:201},actual:null}));
  for(const[role,anchors]of[
    ['followUpCustomerOnly',{customerId:ids.customerA,leadId:null,projectId:null}],
    ['followUpLeadOnlyOther',{customerId:ids.customerA,leadId:ids.leadSameCustomerOther,projectId:null}],
    ['followUpProjectOnlyOther',{customerId:ids.customerA,leadId:null,projectId:ids.projectSameCustomerOther}],
    ['followUpOtherCustomer',{customerId:ids.customerB,leadId:ids.leadOtherCustomer,projectId:null}],
    ['followUpForVoid',{customerId:ids.customerA,leadId:ids.leadA,projectId:null}],
    ['followUpForReplace',{customerId:ids.customerA,leadId:ids.leadA,projectId:null}],
  ])rows.push({id:`D.producer.${role}`,method:'POST',path:'/api/sales-follow-up-records',sessionRole:'admin',body:{...anchors,followUpType:ids.followUpType,occurredAt:'2026-01-02T03:04:05.000Z',summary:`D G2 ${role}`,outcome:'progress'},captureIdAs:role,captureReceiptAs:`${role}Receipt`,expect:{status:201},actual:null});
  return rows;
}

export function buildHistoricalProducerRequests(ids) {
  return [
    {id:'D.producer.inactive-contact',method:'PATCH',path:`/api/customer-contacts/${ids.contactInactiveA}`,sessionRole:'admin',body:{status:'inactive'},expect:{status:200,statusField:'inactive'},captureIdAs:'contactInactiveA',actual:null},
    {id:'D.producer.void-followup',method:'POST',path:`/api/sales-follow-up-records/${ids.followUpForVoidReceipt.id}:void`,sessionRole:'admin',body:{reason:'D G2 historical association',expectedVersion:ids.followUpForVoidReceipt.rowVersion},expect:{status:200,statusField:'voided'},captureIdAs:'followUpVoidedA',actual:null},
    {id:'D.producer.replace-followup',method:'POST',path:`/api/sales-follow-up-records/${ids.followUpForReplaceReceipt.id}:replace`,sessionRole:'admin',body:{followUpType:ids.followUpType,occurredAt:'2026-01-03T03:04:05.000Z',summary:'D G2 replacement',outcome:'progress',replacementReason:'D G2 retain old ID',expectedVersion:ids.followUpForReplaceReceipt.rowVersion},expect:{status:200},capture:'Keep original request path ID as followUpSupersededA; also retain actual replacement receipt and old-row superseded state',actual:null},
  ];
}

export function buildAnchorCases(ids) {
  const q=(id,query,expect={})=>getDiscussion(id,query,expect);
  return [
    group('J.empty-and-scope',['J-L01','J-L03','J-L05'],[
      q('J.empty.customer',{customerId:ids.customerEmpty},{exactBody:[]}),
      q('J.scope.customer-only',{customerId:ids.customerA},{forbiddenCommentIds:[ids.leadCommentA,ids.projectCommentA]}),
      q('J.scope.lead-only',{leadId:ids.leadA},{containsCommentIds:[ids.leadCommentA],forbiddenCommentIds:[ids.projectCommentA]}),
      q('J.scope.project-plus-source',{projectId:ids.projectA},{containsCommentIds:[ids.leadCommentA,ids.projectCommentA]}),
      q('J.scope.explicit-source-deduplicated',{leadId:ids.leadA,projectId:ids.projectA},{containsEachExactlyOnce:[ids.leadCommentA,ids.projectCommentA]}),
    ],{invariant:'thread/comment IDs and original lead target ownership unchanged; no copy/migrate rows'}),
    group('J.anchor-resolution-priority',['J-L02','J-C07'],[
      q('J.priority.customer-first',{customerId:ids.missingUuid,leadId:ids.missingUuid,projectId:ids.missingUuid},missing('Customer',ids.missingUuid)),
      q('J.priority.lead-before-project',{customerId:ids.customerA,leadId:ids.missingUuid,projectId:ids.missingUuid},missing('Lead',ids.missingUuid)),
      q('J.priority.project-last',{customerId:ids.customerA,leadId:ids.leadA,projectId:ids.missingUuid},missing('Project',ids.missingUuid)),
      ...[['customer','Customer'],['lead','Lead'],['project','Project']].map(([type,label])=>createDiscussion(`J.target-missing.${type}`,discussionBody(type,ids.missingUuid),missing(label,ids.missingUuid))),
    ]),
    group('J.anchor-alignment',['J-L04'],[
      q('J.same-customer-unrelated',{customerId:ids.customerA,leadId:ids.leadSameCustomerOther,projectId:ids.projectA}),
      q('J.cross-customer',{customerId:ids.customerA,leadId:ids.leadOtherCustomer},{status:400,message:'Discussion query anchors must belong to the same customer'}),
      q('J.null-project-customer-filtered',{customerId:ids.customerB,projectId:ids.projectNullCustomer}),
    ],{precondition:'projectNullCustomer prepared customer_id/customer_name null; source_lead_id null; no modified FK constraints'}),
    group('J.query-validation',['J-Q01','J-Q02'],[
      q('J.query.none',{}, {status:400,customIssue:{code:'custom',path:[],message:'At least one discussion target anchor is required'}}),
      q('J.query.unknown-only',{unknown:ids.customerA},{status:400}),
      ...['not-a-uuid','','null'].map((value,index)=>q(`J.query.invalid.${index}`,{customerId:value},{status:400,format:'uuid'})),
      q('J.query.repeated',{leadId:[ids.leadA,ids.leadA]},{status:400,expected:'string',received:'array'}),
      q('J.query.uppercase-valid',{customerId:ids.customerA.toUpperCase()}),
      q('J.query.nil-valid-absent',{customerId:'00000000-0000-0000-0000-000000000000'},missing('Customer','00000000-0000-0000-0000-000000000000')),
      q('J.query.max-valid-absent',{customerId:'ffffffff-ffff-ffff-ffff-ffffffffffff'},missing('Customer','ffffffff-ffff-ffff-ffff-ffffffffffff')),
    ],{precondition:'Root independently verifies nil/all-f absent before expecting 404; their schema acceptance is distinct from existence'}),
  ];
}

export function buildAssociationCases(ids) {
  const p=patch=>discussionBody('project',ids.projectA,patch),l=patch=>discussionBody('lead',ids.leadA,patch);
  const cases=[
    ['active-contact',p({relatedContactId:ids.contactA}),{},['J-A01']],
    ['inactive-contact',p({relatedContactId:ids.contactInactiveA}),{},['J-A01']],
    ['cross-customer-contact',p({relatedContactId:ids.contactOtherCustomer}),mismatched('CustomerContact',ids.contactOtherCustomer,'customer',ids.customerA),['J-A01','J-A05']],
    ['nullable-project-contact',discussionBody('project',ids.projectNullCustomer,{relatedContactId:ids.contactOtherCustomer}),{},['J-A01']],
    ['real-competitor-and-followup',p({relatedCompetitorRecordId:ids.competitorA,relatedFollowUpRecordId:ids.followUpA}),{},['J-A02','X-02']],
    ['voided-followup',p({relatedFollowUpRecordId:ids.followUpVoidedA}),{},['J-A02']],
    ['superseded-followup',p({relatedFollowUpRecordId:ids.followUpSupersededA}),{},['J-A02']],
    ['followup-null-both-opportunities',p({relatedFollowUpRecordId:ids.followUpCustomerOnly}),{},['J-A03']],
    ['project-ignores-other-lead',p({relatedCompetitorRecordId:ids.competitorLeadOnlyOther,relatedFollowUpRecordId:ids.followUpLeadOnlyOther}),{},['J-A03','J-A04']],
    ['lead-ignores-other-project',l({relatedCompetitorRecordId:ids.competitorProjectOnlyOther,relatedFollowUpRecordId:ids.followUpProjectOnlyOther}),{},['J-A03','J-A04']],
    ['customer-ignores-opportunities',discussionBody('customer',ids.customerA,{relatedCompetitorRecordId:ids.competitorProjectOnlyOther,relatedFollowUpRecordId:ids.followUpLeadOnlyOther}),{},['J-A04']],
  ];
  for(const[field,kind,otherProject,otherLead,otherCustomer]of[
    ['relatedCompetitorRecordId','CompetitorIntelligenceRecord',ids.competitorProjectOnlyOther,ids.competitorLeadOnlyOther,ids.competitorOtherCustomer],
    ['relatedFollowUpRecordId','SalesFollowUpRecord',ids.followUpProjectOnlyOther,ids.followUpLeadOnlyOther,ids.followUpOtherCustomer],
  ]){
    cases.push([`${field}.project-mismatch`,p({[field]:otherProject}),mismatched(kind,otherProject,'project',ids.projectA),['J-A03','J-A05']]);
    cases.push([`${field}.lead-mismatch`,l({[field]:otherLead}),mismatched(kind,otherLead,'lead',ids.leadA),['J-A03','J-A05']]);
    cases.push([`${field}.customer-mismatch`,p({[field]:otherCustomer}),mismatched(kind,otherCustomer,'customer',ids.customerA),['J-A03','J-A05']]);
    cases.push([`${field}.nullable-project-no-customer-check`,discussionBody('project',ids.projectNullCustomer,{[field]:otherCustomer}),{},['J-A03']]);
  }
  for(const[field,kind]of[['relatedContactId','CustomerContact'],['relatedCompetitorRecordId','CompetitorIntelligenceRecord'],['relatedFollowUpRecordId','SalesFollowUpRecord']]){
    cases.push([`${field}.missing-only`,p({[field]:ids.missingUuid}),missing(kind,ids.missingUuid),['J-A05']]);
  }
  return cases.map(([tag,body,expect,covers])=>group(`J.association.${tag}`,covers,[createDiscussion(`J.association.${tag}`,body,expect)],{
    compare:'All 19 comment fields; original canonical anchor snapshots; each error probe changes only one association. Simultaneous Promise.all failures have no fixed priority claim.',
  }));
}

export function buildCreateBoundaryCases(ids) {
  const base=discussionBody('project',ids.projectA);
  const requests=[];
  for(const field of ['targetObjectType','targetObjectId','discussionType','body']){
    const body={...base};delete body[field];
    requests.push(createDiscussion(`J.create.missing.${field}`,body,{status:400,issuePath:[field]}));
  }
  for(const[field,value]of[['targetObjectType','unknown'],['targetObjectId','not-a-uuid'],['discussionType','unknown'],['body',1],['body','\ufeff\u00a0\u3000']]){
    requests.push(createDiscussion(`J.create.invalid.${field}.${requests.length}`,{...base,[field]:value},{status:400,issuePath:[field]}));
  }
  requests.push(createDiscussion('J.create.all-invalid-issue-order',{targetObjectType:'unknown',targetObjectId:'bad',discussionType:'unknown',body:1},{status:400,issuePathOrder:[['targetObjectType'],['targetObjectId'],['discussionType'],['body']]}));
  requests.push(createDiscussion('J.create.unknown-stripped',{...base,unknownField:'ignored'},{forbiddenOutputKeys:['unknownField']}));
  requests.push(createDiscussion('J.create.all-related-null',{...base,relatedContactId:null,relatedCompetitorRecordId:null,relatedFollowUpRecordId:null},{allRelatedIdsNull:true}));
  for(const flag of ['isPinned','isKeyConclusion'])for(const value of [null,'true',1])requests.push(createDiscussion(`J.create.flag-type.${flag}.${String(value)}`,{...base,[flag]:value},{status:400,expected:'boolean'}));
  for(const isPinned of [false,true])for(const isKeyConclusion of [false,true])requests.push(createDiscussion(`J.create.flags.${isPinned}.${isKeyConclusion}`,{...base,isPinned,isKeyConclusion},{isPinned,isKeyConclusion}));
  for(const discussionType of ['intelligence-supplement','decision-chain','competition','strategy','risk','general'])requests.push(createDiscussion(`J.create.enum.${discussionType}`,{...base,discussionType},{discussionType}));
  for(const[type,target]of[['customer',ids.customerA],['lead',ids.leadA],['project',ids.projectA]])requests.push(createDiscussion(`J.create.target-enum.${type}`,discussionBody(type,target),{targetObjectType:type}));
  requests.push(createDiscussion('J.create.no-added-closed-lead-gate',discussionBody('lead',ids.leadClosed)));
  requests.push(createDiscussion('J.create.no-added-closed-project-stage-gate',discussionBody('project',ids.guidanceProjects['closed-lost'])));
  requests.push(createDiscussion('J.create.control-characters', {...base,body:'正文 "引号" \\ 路径\n第二行\te\u0301 😀'},{bodyExact:'正文 "引号" \\ 路径\n第二行\te\u0301 😀'}));
  return [group('J.create-boundaries',['J-C01','J-C02','J-C05','J-C06','J-C07','J-U02','J-U05'],requests,{capture:['thread reuse/count','comment counts','server UUID/time/operator','exact original validation issues','all 19 output fields']})];
}

export function buildPersistentTextCases(ids) {
  const target=(body,patch={})=>discussionBody('project',ids.projectA,{body,...patch});
  const invalid=[
    ['NUL','A\u0000B'],
    ['lone-high','\ud800'],
    ['lone-low','\udfff'],
    ['embedded-lone-high','A\ud800B'],
    ['embedded-lone-low','A\udfffB'],
  ].map(([tag,body])=>createDiscussion(`J.text.reject.${tag}`,target(body),{
    status:400,clearValidationError:true,issuePath:['body'],noDomainPersistence:true,
    threadAndCommentCountsUnchanged:true,noLossyReplacementAccepted:true,
  }));
  const valid=[
    createDiscussion('J.text.bmp8000',target('中'.repeat(8000)),{bodyExact:'中'.repeat(8000),codePointCount:8000}),
    createDiscussion('J.text.bmp8001',target('中'.repeat(8001)),{status:400,codePointLimit:8000,noDomainPersistence:true}),
    createDiscussion('J.text.emoji8000',target('😀'.repeat(8000)),{bodyExact:'😀'.repeat(8000),codePointCount:8000,UTF16Count:16000}),
    createDiscussion('J.text.emoji8001',target('😀'.repeat(8001)),{status:400,codePointLimit:8000,noDomainPersistence:true}),
    createDiscussion('J.text.trim-valid',target('\ufeff\u00a0\u3000正文\u3000\u00a0\ufeff'),{bodyExact:'正文'}),
    createDiscussion('J.text.NEL-valid',target('\u0085正文\u0085'),{bodyExact:'\u0085正文\u0085'}),
    createDiscussion('J.text.zero-width-valid',target('\u200b正文\u200b'),{bodyExact:'\u200b正文\u200b'}),
    createDiscussion('J.text.controls-and-combining-valid',target('正文 "引号" \\ 路径\n第二行\te\u0301 😀'),{bodyExact:'正文 "引号" \\ 路径\n第二行\te\u0301 😀'}),
    createDiscussion('J.text.unknown-stripped',target('有效正文😀',{unknownText:'\u0000\ud800'}),{bodyExact:'有效正文😀',forbiddenOutputKeys:['unknownText'],knownPersistentFieldsOnly:true}),
  ];
  return group('J.persistent-text.business-roundtrip',['J-U01','J-U02','J-U03','J-U04','J-U05'],[
    ...invalid,...valid,
    getDiscussion('J.text.GET-after-business-cases',{projectId:ids.projectA},{
      everyAcceptedBodyMatchesStoredTextAndImmediateResponse:true,
      rejectedBodiesCreatedNoComment:true,allOriginalCommentFieldsPresent:true,
    }),
  ],{
    policy:'Known persistent body rejects NUL/unpaired surrogate before DB writes with400; valid Unicode retains public code-point limits and exact round-trip; unknown stripped text is not validated as persistent input.',
    historicalObservation:'The old Native NUL500/lone201-and-replacement observations remain preserved and are intentionally not the current Rust oracle.',
    capture:['raw request and actual400/201 bodies','before/after owned thread/comment counts for each rejected request','accepted POST/DB/GET text with no replacement','all 19 response fields'],
  });
}

export function buildOldTitleCase(ids) {
  return group('J.old-thread-snapshot-and-live-contact',['J-C01','J-C02','J-C03','J-L06'],[
    createDiscussion('J.old-title.first',discussionBody('project',ids.projectRename,{body:'first snapshot'}),{targetTitle:ids.projectRenameOriginalName,customerId:ids.customerA}),
    {id:'J.old-title.rename-and-change-customer',method:'PATCH',path:`/api/projects/${ids.projectRename}`,sessionRole:'admin',body:{projectName:'D renamed current title',customerId:ids.customerB},expect:{status:200,projectName:'D renamed current title',customerId:ids.customerB},actual:null},
    createDiscussion('J.old-title.second',discussionBody('project',ids.projectRename,{body:'second snapshot',relatedContactId:ids.contactOtherCustomer}),{targetTitle:ids.projectRenameOriginalName,customerId:ids.customerA,sameThreadAs:'J.old-title.first',relationValidatedAgainstCurrentCustomer:ids.customerB}),
    {id:'J.old-title.contact-live-rename',method:'PATCH',path:`/api/customer-contacts/${ids.contactOtherCustomer}`,sessionRole:'admin',body:{name:'D live contact renamed'},expect:{status:200},actual:null},
    getDiscussion('J.old-title.GET',{projectId:ids.projectRename},{allThreadTitles:ids.projectRenameOriginalName,allThreadCustomerIds:ids.customerA,secondContactName:'D live contact renamed'}),
  ],{precondition:'Fresh standalone active projectRename with sourceLeadId=null/customerA; no thread; original name captured; customerB active. Changes use actual delivered APIs, not SQL.',invariant:'first comment unchanged; exactly one thread; snapshot customer remains A while new association is checked against current target B'});
}

export function buildCommentOrderCases(ids) {
  return [
    group('J.comment-order.real-producers',['J-S01','J-L06'],[0,1,2,3].map(index=>createDiscussion(`J.order.producer.${index}`,discussionBody('project',ids.projectOrder,{body:`D order ${index}`,isPinned:index===3,isKeyConclusion:index===2}),{captureCommentAs:`orderCommentIds.${index}`})),{precondition:'Root stores all four actual response IDs/thread ID before requesting the following controlled projections'}),
    group('J.comment-order.microseconds',['J-S01','J-L06'],[
      getDiscussion('J.order.microseconds',{projectId:ids.projectOrder},{bodyOrder:['D order 1','D order 0','D order 2','D order 3'],firstTwoCreatedAt:'2020-01-01T00:00:00.123Z',missingUserCommentIndex:3,createdByPreserved:ids.missingUuid,createdByName:null}),
    ],{prepare:[
      patchComment(ids.orderCommentIds?.[0],'2020-01-01T00:00:00.123900Z',ids.operatorUserId,false,false),
      patchComment(ids.orderCommentIds?.[1],'2020-01-01T00:00:00.123100Z',ids.operatorUserId,false,false),
      patchComment(ids.orderCommentIds?.[2],'2020-01-01T00:00:00.124000Z',ids.operatorUserId,false,true),
      patchComment(ids.orderCommentIds?.[3],'2020-01-01T00:00:00.125000Z',ids.missingUuid,true,false),
    ]}),
    group('J.comment-order.exact-tie',['J-S02'],[
      getDiscussion('J.order.exact-tie',{projectId:ids.projectOrder},{prefixBodies:['D order 1','D order 0'],unorderedTailBodies:['D order 2','D order 3'],noUuidTieClaim:true}),
    ],{prepare:[patchComment(ids.orderCommentIds?.[2],'2020-01-01T00:00:00.126000Z',ids.operatorUserId,false,true),patchComment(ids.orderCommentIds?.[3],'2020-01-01T00:00:00.126000Z',ids.missingUuid,true,false)]}),
    group('J.comment-live-user-name',['J-L06'],[getDiscussion('J.live-user.GET',{projectId:ids.projectOrder},{createdByDisplayNameForKnownActor:'D read-context name'})],{
      prepare:[patchOwnedUserName(ids.operatorUserId,'D read-context name')],restore:'Root restores original owned user display_name immediately after this read group; ordinary auth reads use that same stored user consistently',
    }),
  ];
}

export function buildFirstThreadConflict(ids) {
  return group('J.first-thread-conflict',['J-C04','J-C08'],[
    {...createDiscussion('J.first-thread.racer-A',discussionBody('project',ids.projectUnusedForRace,{body:'D first race A'}),{},'admin'),expect:{status:201,coordinatedRace:true}},
    {...createDiscussion('J.first-thread.racer-B',discussionBody('project',ids.projectUnusedForRace,{body:'D first race B'}),{},'other'),expect:{status:201,coordinatedRace:true}},
  ],{
    kind:'Root-controlled-concurrent-schedule-definition',precondition:'Dedicated real API target, zero thread rows, two independent valid sessions; Root has exclusive use of this cohort database',
    schedule:[
      {owner:'Root lock connection',sql:'BEGIN'},
      {owner:'Root lock connection',sql:'LOCK TABLE poms.business_discussion_thread IN SHARE MODE',reason:'Allows preflight SELECT, blocks both INSERT RowExclusive acquisitions'},
      {owner:'Root HTTP clients',action:'Dispatch the two requests concurrently and do not release the lock until both application backends are observed waiting on INSERT into business_discussion_thread'},
      {owner:'Root lock connection',sql:'COMMIT'},
    ],
    expectations:{afterObservedTwoInsertWaiters:true,statusMultiset:[201,201],sameReturnedThreadId:true,distinctReturnedCommentIds:true,bothRequestedBodiesPersisted:true,noCustom409:true,terminalThreadCount:1,terminalCommentCount:2,noOrphans:true,firstThreadSnapshotNotRewritten:true,threadCreator:'not specified'},
    invalidRunIf:'Both requests did not reach the intended INSERT wait. Keep the actual attempt as partial rather than labeling a sequential second comment a unique race.',
    capture:['before target/thread absence','two in-flight pg_stat_activity receipts','both raw201 responses and their identical threadId/distinct comment IDs','internal unique-target reuse trace without a surfaced23505 failure','thread/comment/session terminal state'],
  });
}

export function buildAssociationDeletionFault(ids) {
  return group('J.association-delete-after-lookup',['J-C08'],[
    createDiscussion('J.FK-deleted-contact',discussionBody('project',ids.projectFkFailure,{relatedContactId:ids.contactFkDisposable}),{status:500}),
  ],{
    kind:'Root-controlled-FK-failure-definition',precondition:'Fresh real target and disposable same-customer real contact; no existing thread, stakeholder or other restrict consumers',
    schedule:[
      {owner:'Root lock connection',sql:'BEGIN'},
      {owner:'Root lock connection',sql:'LOCK TABLE poms.business_discussion_thread IN SHARE MODE'},
      {owner:'Root HTTP client',action:'Dispatch request; wait until its thread INSERT is blocked, proving target/contact lookups have completed'},
      {owner:'Root control connection',sql:'DELETE FROM poms.customer_contact WHERE id=$1::uuid RETURNING id',params:[ids.contactFkDisposable],classification:'owned-fault-injection-after-real-producer-not-business-delete-command'},
      {owner:'Root lock connection',sql:'COMMIT'},
    ],expectations:{status:500,failureBody:{statusCode:500,message:'Internal server error'},terminalThreadCount:0,terminalCommentCount:0,sessionBusinessFlushRolledBack:true,SQLSTATE:'23503'},
    capture:['producer receipt','confirmed blocked INSERT','contact delete receipt','raw HTTP vs SQL separately','all affected domain/session before-after state'],
  });
}

export function buildAuthRequests(ids) {
  const routes=[
    getDiscussion('J.auth.list',{projectId:ids.projectA}),
    createDiscussion('J.auth.create',discussionBody('project',ids.projectA)),
    {id:'K.auth.guidance',method:'GET',path:`/api/projects/${ids.projectA}/workspace-guidance`},
    {id:'K.auth.timeline',method:'GET',path:`/api/projects/${ids.projectA}/timeline`},
  ];
  const requests=[];
  for(const profile of ['missing-session','expired-session','revoked-session','disabled-user','valid-session'])for(const route of routes){
    const invalid=profile!=='valid-session';
    const path=!invalid?route.path:route.id==='J.auth.list'?'/api/business-discussions?customerId=not-a-uuid':route.id==='J.auth.create'?route.path:route.path.replace(ids.projectA,'not-a-uuid');
    const body=invalid&&route.method==='POST'?{targetObjectType:'unknown',targetObjectId:'not-a-uuid',discussionType:'unknown',body:1}:route.body;
    requests.push({...route,id:`${route.id}.${profile}`,path,...(body?{body}:{}),sessionRole:'admin',transportProfile:profile,expect:profile==='valid-session'?{status:route.method==='POST'?201:200}:{exactNativeAuthError:true,guardPrecedesInvalidDtoAndDatabase:true},actual:null});
  }
  for(const permission of ['customerRead','leadRead','projectRead'])requests.push(getDiscussion(`J.auth.any-read.${permission}`,{projectId:ids.projectA},{status:200},permission));
  for(const permission of ['customerWrite','leadWrite','projectWrite'])requests.push(createDiscussion(`J.auth.any-write.${permission}`,discussionBody('project',ids.projectA),{status:201},permission));
  requests.push(getDiscussion('J.auth.no-permissions.list',{projectId:ids.projectA},{status:403,code:'permission_denied'},'noPermissions'));
  requests.push(createDiscussion('J.auth.no-permissions.create',discussionBody('project',ids.projectA),{status:403,code:'permission_denied'},'noPermissions'));
  for(const role of ['customerRead','leadRead'])for(const route of routes.slice(2))requests.push({...route,id:`${route.id}.unrelated-permission.${role}`,sessionRole:role,expect:{status:403,code:'permission_denied'},actual:null});
  for(const transportProfile of ['csrf-missing-cookie','csrf-missing-header','csrf-mismatch','bad-session-token'])requests.push({...routes[1],id:`J.auth.${transportProfile}`,transportProfile,expect:transportProfile==='bad-session-token'?{exactNativeAuthError:true}:{status:403,code:'csrf_failed'},actual:null});
  for(const route of [routes[0],...routes.slice(2)])requests.push({...route,id:`${route.id}.GET-no-CSRF`,sessionRole:'projectRead',transportProfile:'no-csrf-cookie-or-header',expect:{status:200},actual:null});
  return group('J-K.auth-and-transport',['AUTH-01','AUTH-02','AUTH-03','AUTH-04'],requests,{transportInheritance:'AUTH-05 HEAD/OPTIONS/method/trailing-slash baseline remains Root common transport evidence; unknown J query/body keys are explicitly covered above',outputFieldAuthority:sourceFields});
}

export function buildTransportRequests(ids) {
  const reads=[getDiscussion('J.transport.list',{customerId:ids.customerA}),
    {id:'K.transport.guidance',method:'GET',path:`/api/projects/${ids.projectA}/workspace-guidance`,sessionRole:'projectRead'},
    {id:'K.transport.timeline',method:'GET',path:`/api/projects/${ids.projectA}/timeline`,sessionRole:'projectRead'}];
  return group('J-K.shared-transport',['AUTH-05'],[
    ...reads.map(request=>({...request,id:`${request.id}.HEAD`,method:'HEAD',expect:{exactNativeStatusAndHeaders:true,headBodyEmpty:true},actual:null})),
    ...reads.map(request=>({...request,id:`${request.id}.OPTIONS`,method:'OPTIONS',expect:{exactNativeStatusHeadersAndBody:true},actual:null})),
    {...reads[0],id:'J.transport.unknown-method',method:'PUT',expect:{status:404,clearErrorResponse:true,nativeHTMLBodyIsNotAnAcceptanceRequirement:true},actual:null},
    {...reads[2],id:'K.transport.trailing-slash',path:reads[2].path+'/',expect:{exactNativeStatusAndBody:true},actual:null},
    getDiscussion('J.transport.unknown-query-retains-anchor',{customerId:ids.customerA,extra:'ignored'}),
  ],{mayUseExistingExactRouteCommonEvidence:true,noNewRouteOrAlias:true});
}
