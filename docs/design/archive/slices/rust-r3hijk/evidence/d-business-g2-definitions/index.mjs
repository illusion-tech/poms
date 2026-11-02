/* Direct import entry for Root. This package contains pure definitions only.
 * D did not execute/import/syntax-check any module, SQL, HTTP or product command. */
import * as discussion from './discussion-plan.mjs';
import * as guidance from './guidance-plan.mjs';
import * as timeline from './timeline-plan.mjs';
import { cleanup, schemaBoundaries } from './prepared-facts.mjs';

export * from './discussion-plan.mjs';
export * from './guidance-plan.mjs';
export * from './timeline-plan.mjs';
export * from './prepared-facts.mjs';

export const metadata=Object.freeze({
  kind:'R3HIJK-D-business-G2-remaining-JK-definition-only',
  author:'D',executionOwner:'Root',candidateSuppliedByRoot:'fcf07817',
  supersedesExpectationsFrom:'tmp/rust-r3hijk/d-g2-definitions',
  previousDirectoryRetainedByteForByte:true,
  policySources:[
    'docs/design/rust-r3hijk-business-semantics-corrective-checkpoint01.md',
    'docs/design/rust-r3hijk/business-read-model-clarifications01.json',
  ],
  expectationTarget:'Corrected Rust business acceptance; Native is historical observation and lawful fixture provenance, not a defect oracle',
  originalMatrix:'tmp/rust-r3hijk/d-input/acceptance-matrix02.json',
  originalPureFixture:'tmp/rust-r3hijk/d-input/native-fixture-draft01.mjs',
  authorRuntimeExecutions:0,productFilesChanged:false,frozen01or02Changed:false,
  actual:null,G3Certified:false,G4Certified:false,
  priorActualBoundary:'Historical counts and receipts certify only their original source/artifact. Root reports Native JK fixture preparation resumed through13. This package ran nothing, does not certify that preparation, and does not imply any Rust case passed for fcf07817.',
});

export const preparedFactIdRoles=Object.freeze([...guidance.guidanceFactIdRoles,...timeline.timelineFactIdRoles]);

export const requiredReceiptRoles=Object.freeze([
  'runTag','customerA','customerB','customerEmpty','leadA','leadSameCustomerOther','leadOtherCustomer','leadClosed',
  'projectA','projectSameCustomerOther','projectRename','projectRenameOriginalName','projectUnusedForRace','projectOrder','projectFkFailure','projectNullCustomer',
  'contactA','contactInactiveA','contactOtherCustomer','contactFkDisposable',
  'competitorA','competitorLeadOnlyOther','competitorProjectOnlyOther','competitorOtherCustomer',
  'followUpA','followUpCustomerOnly','followUpLeadOnlyOther','followUpProjectOnlyOther','followUpOtherCustomer','followUpVoidedA','followUpSupersededA',
  'operatorUserId','operatorOrgId','operatorDisplayName','operatorOrgName','otherUserId','emptyUserId','missingUuid',
]);

export function missingBindings(ids) {
  const missing=requiredReceiptRoles.filter(role=>typeof ids[role]!=='string'||ids[role].length===0);
  for(const stage of guidance.stages)if(typeof ids.guidanceProjects?.[stage]!=='string')missing.push(`guidanceProjects.${stage}`);
  for(const role of preparedFactIdRoles)if(typeof ids.factIds?.[role]!=='string')missing.push(`factIds.${role}`);
  for(const row of ['projectGuidanceRow','projectTimelineRow'])for(const field of ['id','status','current_stage','created_at','customer_id','customer_name','owner_user_id','owner_org_id','created_by','updated_by','closed_at','closed_reason']){
    if(!Object.prototype.hasOwnProperty.call(ids[row]??{},field))missing.push(`${row}.${field}`);
  }
  for(let index=0;index<4;index++)if(typeof ids.orderCommentIds?.[index]!=='string')missing.push(`orderCommentIds.${index}`);
  return missing;
}

export function buildMissingProjectCases(ids) {
  return {
    id:'K.E01.path-format-and-absence',covers:['K-E01'],prepare:[],actual:null,
    requests:[
      ...['workspace-guidance','timeline'].map(tail=>({
        id:`K.E01.invalid-path.${tail}`,method:'GET',path:`/api/projects/not-a-uuid/${tail}`,sessionRole:'projectRead',
        expect:{status:400,clearValidationError:true,noDomainWrites:true},actual:null,
      })),
      ...['workspace-guidance','timeline'].flatMap(tail=>[ids.missingUuid,ids.missingUuid.toUpperCase()].map((id,index)=>({
      id:`K.E01.absent.${tail}.${index}`,method:'GET',path:`/api/projects/${id}/${tail}`,sessionRole:'projectRead',
      expect:{status:404,message:`Project ${id} not found`,rawInputSpellingPreserved:true},actual:null,
    }))),
    ],
    historicalObservation:'Old Native/old Rust malformed-path500 receipts remain historical. The approved current Rust rule is malformed UUID400 and well-formed absent UUID404.',
  };
}

// Full entry assumes all producer/row/ID bindings are ready. Until then import
// and call the individual producer or case factories in the README sequence.
export function buildRemainingPlan(ids) {
  const missing=missingBindings(ids);
  if(missing.length)return{metadata,ready:false,missingBindings:missing,groups:[],actual:null};
  return {
    metadata,ready:true,missingBindings:[],
    groups:[
      discussion.buildAuthRequests(ids),discussion.buildTransportRequests(ids),
      ...discussion.buildAnchorCases(ids),...discussion.buildAssociationCases(ids),
      ...discussion.buildCreateBoundaryCases(ids),discussion.buildPersistentTextCases(ids),discussion.buildOldTitleCase(ids),
      ...discussion.buildCommentOrderCases(ids).slice(1),
      discussion.buildFirstThreadConflict(ids),discussion.buildAssociationDeletionFault(ids),
      ...guidance.buildGuidanceStageCases(ids),...guidance.buildGuidanceStatusCases(ids),
      ...guidance.buildGuidancePermissionCases(ids),...guidance.buildGuidanceOwnerCases(ids),
      ...guidance.buildGuidanceSnapshotCases(ids),buildMissingProjectCases(ids),
      ...timeline.buildTimelineCases(ids),...timeline.buildTimelineTieCases(ids),...timeline.buildTimelineAlternativeCases(ids),
    ],
    cleanup,schemaBoundaries,
    executionRule:'Root executes the current Rust business expectations, preserves stateful phase order and owned restores, and handles concurrency/fault schedules explicitly. Record actual receipts only after execution; classify intentional Native differences under the two policy sources instead of copying Node defects.',
  };
}
