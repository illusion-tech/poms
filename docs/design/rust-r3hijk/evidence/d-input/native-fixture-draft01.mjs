/*
 * G1 input draft only. Pure definitions/constructors: no imports, IO, process,
 * network, DB, side effects, timers, execution loop, assertions, or self-run.
 * Root alone may consume these after selecting the authorized Native witness.
 * Constructor output is a request recipe, never a captured Native response.
 */

export const metadata = Object.freeze({
  kind: 'poms-r3hijk-d-native-fixture-draft01',
  status: 'not-run-await-joint-G1',
  base: '7f970c992291c61477eb9bd83a48cec19a769d88',
  workspace: 'E:/projects/worktrees/poms-r3hijk-next28/poms',
  runner: 'Root exclusively',
  G1Certified: false,
  productImplemented: false,
  nativeActual: null,
});

export const sourceFields = Object.freeze({
  comment: [
    'id', 'threadId', 'targetObjectType', 'targetObjectId', 'targetTitle',
    'customerId', 'leadId', 'projectId', 'discussionType', 'body',
    'relatedContactId', 'relatedContactName', 'relatedCompetitorRecordId',
    'relatedFollowUpRecordId', 'isPinned', 'isKeyConclusion', 'createdAt',
    'createdBy', 'createdByName',
  ],
  guidance: [
    'projectId', 'currentStage', 'status', 'currentStageLabel', 'statusLabel',
    'headline', 'currentFocus', 'currentGap', 'nextStep', 'ownerLabel',
    'blockingReasons', 'basisSummary', 'recommendedEntries', 'generatedAt',
  ],
  basis: ['summarySnapshotId', 'projectionLevel', 'exportPolicy', 'generatedAt'],
  entry: ['key', 'label', 'description', 'route', 'enabled', 'disabledReason', 'actionKey'],
  timeline: ['projectId', 'events', 'generatedAt'],
  event: [
    'eventKey', 'stage', 'stageLabel', 'eventType', 'occurredAt', 'actorUserId',
    'actorName', 'resultLabel', 'sourceType', 'sourceId', 'evidenceLabel',
    'isAuthoritative',
  ],
});

export const productionReceiptRequirements = Object.freeze([
  { role: 'customerA', owner: 'Root', producer: 'delivered customer API', retain: ['id', 'displayName'] },
  { role: 'customerB', owner: 'Root', producer: 'delivered customer API', retain: ['id', 'displayName'] },
  { role: 'leadA', owner: 'A', producer: 'H real Lead create/qualification/convert APIs', retain: ['id', 'customerId', 'leadName'] },
  { role: 'leadSameCustomerOther', owner: 'A', producer: 'H real Lead create API', retain: ['id', 'customerId', 'leadName'] },
  { role: 'leadOtherCustomer', owner: 'A', producer: 'H real Lead create API', retain: ['id', 'customerId', 'leadName'] },
  { role: 'projectA', owner: 'A + Root', producer: 'real H conversion result', retain: ['id', 'sourceLeadId', 'customerId', 'ownerUserId', 'ownerOrgId'] },
  { role: 'projectSameCustomerOther', owner: 'Root', producer: 'delivered project API', retain: ['id', 'customerId'] },
  { role: 'contactA', owner: 'Root', producer: 'delivered contact API', retain: ['id', 'customerId', 'name', 'status'] },
  { role: 'contactInactiveA', owner: 'Root', producer: 'delivered contact API create/update', retain: ['id', 'customerId', 'name', 'status'] },
  { role: 'contactOtherCustomer', owner: 'Root', producer: 'delivered contact API', retain: ['id', 'customerId'] },
  { role: 'competitorA', owner: 'B', producer: 'I real competitor POST', retain: ['id', 'customerId', 'leadId', 'projectId'] },
  { role: 'competitorOtherProject', owner: 'B', producer: 'I real competitor POST', retain: ['id', 'customerId', 'leadId', 'projectId'] },
  { role: 'competitorOtherLead', owner: 'B', producer: 'I real competitor POST', retain: ['id', 'customerId', 'leadId', 'projectId'] },
  { role: 'competitorOtherCustomer', owner: 'B', producer: 'I real competitor POST', retain: ['id', 'customerId', 'leadId', 'projectId'] },
  { role: 'followUpA', owner: 'Root', producer: 'delivered followup API', retain: ['id', 'customerId', 'leadId', 'projectId', 'status'] },
  { role: 'followUpVoidedA', owner: 'Root', producer: 'delivered followup API create/void', retain: ['id', 'customerId', 'leadId', 'projectId', 'status'] },
  { role: 'followUpOtherProject', owner: 'Root', producer: 'delivered followup API', retain: ['id', 'customerId', 'leadId', 'projectId'] },
  { role: 'followUpOtherLead', owner: 'Root', producer: 'delivered followup API', retain: ['id', 'customerId', 'leadId', 'projectId'] },
  { role: 'followUpOtherCustomer', owner: 'Root', producer: 'delivered followup API', retain: ['id', 'customerId', 'leadId', 'projectId'] },
]);

export const productionSequence = Object.freeze([
  { step: 'P1', requirement: 'Root creates customers/contacts/followups through delivered API and retains request/raw body/ID receipts.' },
  { step: 'P2', requirement: 'A real Lead API product; Root creates J lead comment before conversion.' },
  { step: 'P3', requirement: 'Root qualifies and converts that actual Lead through H, retaining sourceLeadId/ownership receipt.' },
  { step: 'P4', requirement: 'B real competitor API product with original four anchors, then J project comment links competitor/contact/followup.' },
  { step: 'P5', requirement: 'GET project discussions contains original Lead and new Project thread without copying or ownership mutation.' },
  { step: 'P6', requirement: 'K reads same Project guidance/timeline; these reads do not certify R4 command production.' },
]);

export const localCaseRoleRequirements = Object.freeze([
  { role: 'missingUuid', requirement: 'Root supplies a valid UUID with verified absent target/reference rows; not a malformed UUID substitute.' },
  { role: 'projectUnicode', requirement: 'Dedicated real project API product for text edge cases; preserve every immediate response and later read independently.' },
  { role: 'projectUnusedForRace', requirement: 'Dedicated real project API product with verified no discussion thread before the race definition is consumed.' },
  { role: 'projectNullCustomer', requirement: 'Explicit SQL-prepared schema-valid nullable-customer compatibility fixture; cannot count as H conversion or R4 production.' },
  { role: 'competitorOtherLead', requirement: 'Same customer, other nonnull lead and null project, so a project target demonstrates the original absent-lead constraint without a project mismatch.' },
  { role: 'competitorOtherProject', requirement: 'Same customer, other nonnull project; used to isolate the project mismatch check.' },
  { role: 'followUpOtherLead', requirement: 'Same customer, other nonnull lead and null project; used to isolate permissive customer/project scope.' },
  { role: 'followUpOtherProject', requirement: 'Same customer, other nonnull project; used to isolate the project mismatch check.' },
]);

// ids are Root's actual receipt IDs, never a synthetic producer substitute.
export function discussionBody(targetObjectType, targetObjectId, patch = {}) {
  return {
    targetObjectType,
    targetObjectId,
    discussionType: 'general',
    body: '  R3 J 讨论原语义  ',
    ...patch,
  };
}

export function getRecipe(id, operationId, path, query = {}, sessionRole = 'projectRead') {
  return { id, operationId, method: 'GET', path, query, sessionRole, nativeActual: null };
}

export function createRecipe(id, body, sessionRole = 'projectWrite') {
  return {
    id,
    operationId: 'BusinessDiscussionController_create',
    method: 'POST',
    path: '/api/business-discussions',
    sessionRole,
    csrf: 'valid-session-double-submit-by-Root',
    body,
    nativeActual: null,
  };
}

export function buildCoreRequests(ids) {
  return [
    getRecipe('J-L01-customer-empty-or-populated', 'BusinessDiscussionController_list', '/api/business-discussions', { customerId: ids.customerA }),
    createRecipe('J-C01-customer-first', discussionBody('customer', ids.customerA)),
    createRecipe('J-C01-lead-before-conversion', discussionBody('lead', ids.leadA, { discussionType: 'decision-chain', isKeyConclusion: true })),
    createRecipe('J-C01-project-after-conversion', discussionBody('project', ids.projectA, {
      discussionType: 'strategy', relatedContactId: ids.contactA,
      relatedCompetitorRecordId: ids.competitorA, relatedFollowUpRecordId: ids.followUpA,
      isPinned: true, isKeyConclusion: false,
    })),
    getRecipe('J-L03-project-sourceLead', 'BusinessDiscussionController_list', '/api/business-discussions', { projectId: ids.projectA }),
    getRecipe('J-L03-deduplicate-explicit-sourceLead', 'BusinessDiscussionController_list', '/api/business-discussions', { leadId: ids.leadA, projectId: ids.projectA }),
    getRecipe('K-G01', 'ProjectController_getWorkspaceGuidance', `/api/projects/${ids.projectA}/workspace-guidance`),
    getRecipe('K-T01', 'ProjectController_getTimeline', `/api/projects/${ids.projectA}/timeline`),
  ];
}

export function buildQueryBoundaryRequests(ids) {
  return [
    getRecipe('J-Q01-no-anchor', 'BusinessDiscussionController_list', '/api/business-discussions'),
    getRecipe('J-Q01-unknown-only', 'BusinessDiscussionController_list', '/api/business-discussions', { unknownAnchor: ids.customerA }),
    getRecipe('J-Q02-bad-uuid', 'BusinessDiscussionController_list', '/api/business-discussions', { customerId: 'not-a-uuid' }),
    getRecipe('J-Q02-empty-uuid', 'BusinessDiscussionController_list', '/api/business-discussions', { leadId: '' }),
    getRecipe('J-Q02-repeated-query', 'BusinessDiscussionController_list', '/api/business-discussions', { customerId: [ids.customerA, ids.customerA] }),
    getRecipe('J-Q02-uppercase-valid', 'BusinessDiscussionController_list', '/api/business-discussions', { customerId: ids.customerA.toUpperCase() }),
    getRecipe('J-L02-missing-customer', 'BusinessDiscussionController_list', '/api/business-discussions', { customerId: ids.missingUuid }),
    getRecipe('J-L04-same-customer-unrelated', 'BusinessDiscussionController_list', '/api/business-discussions', { customerId: ids.customerA, leadId: ids.leadSameCustomerOther, projectId: ids.projectA }),
    getRecipe('J-L04-cross-customer', 'BusinessDiscussionController_list', '/api/business-discussions', { customerId: ids.customerA, leadId: ids.leadOtherCustomer }),
    getRecipe('K-E01-guidance-malformed', 'ProjectController_getWorkspaceGuidance', '/api/projects/not-a-uuid/workspace-guidance'),
    getRecipe('K-E01-timeline-malformed', 'ProjectController_getTimeline', '/api/projects/not-a-uuid/timeline'),
    getRecipe('K-E01-guidance-missing', 'ProjectController_getWorkspaceGuidance', `/api/projects/${ids.missingUuid}/workspace-guidance`),
    getRecipe('K-E01-timeline-missing', 'ProjectController_getTimeline', `/api/projects/${ids.missingUuid}/timeline`),
  ];
}

export function buildUnicodeRequests(ids) {
  const target = (body) => discussionBody('project', ids.projectUnicode, { body });
  return [
    createRecipe('J-U01-bmp-8000', target('中'.repeat(8000))),
    createRecipe('J-U01-bmp-8001', target('中'.repeat(8001))),
    createRecipe('J-U01-emoji-4000', target('😀'.repeat(4000))),
    createRecipe('J-U01-emoji-4001', target('😀'.repeat(4001))),
    createRecipe('J-U02-js-space-trim', target('\ufeff\u00a0\u3000正文\u3000\u00a0\ufeff')),
    createRecipe('J-U02-trim-only-empty', target('\ufeff\u00a0\u3000')),
    createRecipe('J-U02-NEL-remains', target('\u0085正文\u0085')),
    createRecipe('J-U02-zero-width-remains', target('\u200b正文\u200b')),
    { ...createRecipe('J-U03-lone-high-surrogate', target('\ud800')), capture: ['raw POST response before later read', 'stored DB text by Root', 'subsequent GET raw response'] },
    { ...createRecipe('J-U03-lone-low-surrogate', target('\udfff')), capture: ['raw POST response before later read', 'stored DB text by Root', 'subsequent GET raw response'] },
    { ...createRecipe('J-U04-NUL', target('正文\u0000后续')), capture: ['raw status/body', 'separate raw SQL log', 'rollback before/after receipt'] },
    createRecipe('J-U05-json-and-combining', target('正文 "引号" \\ 路径\n第二行\te\u0301 😀')),
  ];
}

export function buildAssociationRequests(ids) {
  const project = (patch) => discussionBody('project', ids.projectA, patch);
  const lead = (patch) => discussionBody('lead', ids.leadA, patch);
  const customer = (patch) => discussionBody('customer', ids.customerA, patch);
  return [
    createRecipe('J-A01-active-contact', project({ relatedContactId: ids.contactA })),
    createRecipe('J-A01-inactive-contact', project({ relatedContactId: ids.contactInactiveA })),
    createRecipe('J-A01-other-customer-contact', project({ relatedContactId: ids.contactOtherCustomer })),
    createRecipe('J-A01-null-customer-project-permissive', discussionBody('project', ids.projectNullCustomer, { relatedContactId: ids.contactOtherCustomer })),
    createRecipe('J-A02-real-competitor-followup', project({ relatedCompetitorRecordId: ids.competitorA, relatedFollowUpRecordId: ids.followUpA })),
    createRecipe('J-A02-voided-followup', project({ relatedFollowUpRecordId: ids.followUpVoidedA })),
    createRecipe('J-A03-competitor-other-project', project({ relatedCompetitorRecordId: ids.competitorOtherProject })),
    createRecipe('J-A03-followup-other-project', project({ relatedFollowUpRecordId: ids.followUpOtherProject })),
    createRecipe('J-A03-competitor-other-lead', lead({ relatedCompetitorRecordId: ids.competitorOtherLead })),
    createRecipe('J-A03-followup-other-lead', lead({ relatedFollowUpRecordId: ids.followUpOtherLead })),
    createRecipe('J-A03-competitor-other-customer', project({ relatedCompetitorRecordId: ids.competitorOtherCustomer })),
    createRecipe('J-A03-followup-other-customer', project({ relatedFollowUpRecordId: ids.followUpOtherCustomer })),
    createRecipe('J-A03-project-ignores-other-lead', project({ relatedCompetitorRecordId: ids.competitorOtherLead })),
    createRecipe('J-A04-customer-ignores-opportunity', customer({ relatedCompetitorRecordId: ids.competitorOtherProject, relatedFollowUpRecordId: ids.followUpOtherLead })),
    createRecipe('J-A05-missing-contact-only', project({ relatedContactId: ids.missingUuid })),
    createRecipe('J-A05-missing-competitor-only', project({ relatedCompetitorRecordId: ids.missingUuid })),
    createRecipe('J-A05-missing-followup-only', project({ relatedFollowUpRecordId: ids.missingUuid })),
  ];
}

export function buildCreateBoundaryRequests(ids) {
  const base = discussionBody('project', ids.projectA);
  return [
    createRecipe('J-C02-existing-thread', { ...base, body: '已有线程第二条', isPinned: false, isKeyConclusion: true }),
    createRecipe('J-C05-bad-target-type', { ...base, targetObjectType: 'unknown' }),
    createRecipe('J-C05-bad-target-id', { ...base, targetObjectId: 'not-a-uuid' }),
    createRecipe('J-C05-bad-discussion-type', { ...base, discussionType: 'unknown' }),
    createRecipe('J-C05-body-number', { ...base, body: 1 }),
    createRecipe('J-C05-unknown-key', { ...base, unknownField: 'strip-or-ignore-by-original-DTO' }),
    createRecipe('J-C06-related-null', { ...base, relatedContactId: null, relatedCompetitorRecordId: null, relatedFollowUpRecordId: null }),
    createRecipe('J-C06-pin-null', { ...base, isPinned: null }),
    createRecipe('J-C06-pin-string', { ...base, isPinned: 'true' }),
    createRecipe('J-C06-conclusion-null', { ...base, isKeyConclusion: null }),
    createRecipe('J-C07-target-missing', { ...base, targetObjectId: ids.missingUuid }),
  ];
}

export function buildFirstThreadRace(ids) {
  return {
    id: 'J-C04',
    executionOwner: 'Root',
    status: 'definition-only',
    precondition: 'unused real project target; no existing thread',
    concurrency: 2,
    requestRecipes: [
      createRecipe('J-C04-a', discussionBody('project', ids.projectUnusedForRace, { body: '并发首次 A' })),
      createRecipe('J-C04-b', discussionBody('project', ids.projectUnusedForRace, { body: '并发首次 B' })),
    ],
    retain: ['both raw status/body receipts', 'raw SQL errors separately', 'thread/comment DB before/after', 'link integrity'],
    warning: 'No promised winner, 409, retry, or upsert behavior. Capture Native first.',
  };
}

export const guidanceStages = Object.freeze([
  'assessment', 'scope-confirmation', 'commercial-closure', 'contracting',
  'handover', 'execution', 'acceptance', 'completed', 'closed-lost', 'closed-terminated',
]);

export const guidanceStatuses = Object.freeze([
  'active', 'pending-approval', 'blocked', 'on-hold', 'completed', 'closed',
]);

export const permissionRoles = Object.freeze({
  projectRead: ['project:read'],
  projectWrite: ['project:read', 'project:write'],
  finance: ['project:read', 'contract:finance:manage'],
  assignment: ['project:read', 'commission:assignments:manage'],
  payout: ['project:read', 'commission:payouts:manage'],
  operationsPartial: ['project:read', 'commission:calculations:manage'],
  operationsAll: ['project:read', 'commission:rule-versions:manage', 'commission:calculations:manage', 'commission:payouts:manage', 'commission:adjustments:manage'],
});

// projectVariants is Root's schema-valid controlled fixture mapping. Generation
// of variant rows remains Root-only and is not real R4 command evidence.
export function buildGuidanceVariantRequests(projectVariants) {
  return projectVariants.map((variant) => ({
    ...getRecipe(`K-G-${variant.role}`, 'ProjectController_getWorkspaceGuidance', `/api/projects/${variant.id}/workspace-guidance`, {}, variant.sessionRole ?? 'projectRead'),
    sourceFixtureRole: variant.role,
    declaredStage: variant.stage,
    declaredStatus: variant.status,
    capture: ['full guidance payload', 'project/snapshot state before/after'],
    certification: 'read-projection-only',
  }));
}

export const preparedReadFixtureRequirements = Object.freeze([
  { role: 'K-guidance-snapshot', domain: 'approval_summary_snapshot', selection: 'active project-detail exact selectors', variants: ['absent', 'active match', 'inactive match', 'different scenario', 'different projection', 'tied timestamp'], retain: ['id', 'projectionLevel', 'exportPolicy', 'generatedAt', 'createdAt'] },
  { role: 'K-owner', domain: 'project+platform_user+org_unit', variants: ['both names', 'user only', 'org only', 'neither', 'missing referenced identity', 'empty display text'], retain: ['raw null versus empty string'] },
  { role: 'J-null-customer-project', domain: 'project', reason: 'schema-valid legacy nullable customer; isolate permissive original relation check', certification: 'source compatibility only; not H/I production' },
  { role: 'J-comments-time', domain: 'business_discussion_comment', variants: ['different milliseconds', 'same millisecond different microseconds', 'all ordering keys exactly equal'], retain: ['raw DB precision', 'returned ISO', 'original observed order'], certification: 'controlled ordering fixture only' },
  { role: 'K-contracts', domain: 'contract', variants: ['null signedAt', 'earliest signed non-active status', 'later active signed', 'same signedAt differing updatedAt/createdAt', 'all time keys equal'], certification: 'R4 read-projection only' },
  { role: 'K-handovers', domain: 'project_handover', variants: ['draft/null time', 'confirmed older', 'confirmed latest', 'confirmedAt tie secondary keys', 'all time keys equal'], certification: 'R4 read-projection only' },
  { role: 'K-acceptance', domain: 'acceptance_record', variants: ['confirmed accepted', 'confirmed conditional', 'confirmed rejected excluded', 'voided excluded', 'null confirmedAt excluded', 'time ties'], certification: 'R4 read-projection only' },
  { role: 'K-completion', domain: 'project_completion_record', variants: ['confirmed completed', 'confirmed conditional-completed', 'voided excluded', 'null completedAt excluded', 'time ties'], certification: 'R4 read-projection only' },
  { role: 'K-archive', domain: 'project_archive_record', variants: ['recorded', 'voided excluded', 'superseded excluded', 'latest timestamp', 'closed/completed anchor stage'], certification: 'R4 read-projection only' },
  { role: 'K-close', domain: 'project', variants: ['closedAt null', 'closedAt with reason', 'closedAt without reason', 'closedAt with empty reason', 'closedAt with nonclosed status'], certification: 'project timeline compatibility only' },
]);

export const readProjectionStateInvariant = Object.freeze({
  beforeAndAfter: ['project', 'contract', 'project_handover', 'acceptance_record', 'project_completion_record', 'project_archive_record', 'approval_summary_snapshot'],
  compare: ['business fields', 'row versions where present', 'created/updated timestamps', 'record counts'],
  excludes: 'ordinary auth/session/audit infrastructure activity handled separately by Root',
  claim: 'K query did not write domain facts; no R4 command certification',
});

export const comparisonRules = Object.freeze({
  ordered: ['guidance recommendedEntries source order', 'timeline occurredAt then eventKey', 'comments createdAt ASC subject to source equal-key boundary'],
  nullability: 'all original response fields present; distinguish null, missing, false and empty string',
  requestClock: ['generatedAt is bounded by actual receipt clock', 'createdAt server-generated but retain raw actual value', 'snapshot/fact timestamps exact after original millisecond conversion'],
  noSyntheticProduction: ['prepared Lead is not H create/convert evidence', 'prepared competitor is not I POST evidence', 'prepared lifecycle is not R4 command evidence'],
  undefinedSourceBoundaries: ['SQL rows with all original sort keys equal', 'multiple concurrent Promise.all validation failures', 'first-thread race winner'],
});
