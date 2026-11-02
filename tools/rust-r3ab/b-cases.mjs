// R3B acceptance definitions only. Root owns every execution, connection,
// fixture lease, credential, observation artifact and comparison. No SQL,
// network, browser launch, filesystem I/O, retries or swallowed failures here.
// A runCustomers(ctx) must run first and retain its three real HTTP customers.
import assert from 'node:assert/strict';

const MISSING = 'f3000000-0000-4000-8000-00000000b003';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAGES = ['assessment', 'scope-confirmation', 'commercial-closure', 'contracting', 'handover', 'execution', 'acceptance', 'completed', 'closed-lost', 'closed-terminated'];
const SUMMARY_KEYS = ['id', 'projectNo', 'projectName', 'sourceLeadId', 'customerId', 'customerName', 'customerProjectNo', 'status', 'currentStage', 'ownerOrgId', 'ownerUserId', 'plannedSignAt', 'closedAt', 'closedReason', 'rowVersion', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'].sort();

export const projectActorRequirements = Object.freeze({
  admin: ['project:read', 'project:write', 'contract:finance:sensitive:read'],
  viewer: { required: ['project:read'], absent: ['project:write', 'contract:finance:sensitive:read'] },
  other: 'active user with an active primary organization; target only',
  noorg: 'active user with primary organization null; target only',
});

async function http(ctx, label, method, route, status, options = {}) {
  const response = await ctx.step(label, method, route, options);
  assert.equal(response.status, status, `${label}: HTTP status`);
  return response;
}

async function domainError(ctx, label, method, route, status, message, options = {}) {
  const response = await http(ctx, label, method, route, status, options);
  assert.equal(response.body?.statusCode, status, `${label}: statusCode`);
  assert.equal(response.body?.message, message, `${label}: original error message`);
  return response;
}

async function invalid(ctx, label, method, route, json, key) {
  const response = await http(ctx, label, method, route, 400, { json });
  assert.equal(response.body?.message, 'Validation failed', `${label}: DTO error`);
  assert(Array.isArray(response.body?.errors), `${label}: original Zod issues`);
  assert(response.body.errors.some(issue => key === undefined ? issue.code === 'custom' && issue.path.length === 0 : issue.path[0] === key), `${label}: issue path`);
  return response;
}

function summary(body) {
  assert.deepEqual(Object.keys(body).sort(), SUMMARY_KEYS, 'exact ProjectSummary projection');
  assert.match(body.id, UUID);
  assert.match(body.projectNo, /^PRJ-\d{4}-\d{6,}$/);
  assert(Number.isInteger(body.rowVersion) && body.rowVersion > 0);
  for (const key of ['createdAt', 'updatedAt']) assert.equal(new Date(body[key]).toISOString(), body[key], `${key}: JS ISO milliseconds`);
}

async function rememberProject(ctx, logical, body) {
  summary(body);
  await ctx.remember(logical, body.id);
  // Business numbers are dynamic too. Root must normalize this explicit
  // logical mapping, never overwrite a counter or hard-code a generated no.
  await ctx.remember(`${logical}.no`, body.projectNo);
}

async function created(ctx, logical, input, options = {}) {
  const response = await http(ctx, `B.${logical}.create`, 'POST', '/api/projects', 201, { ...options, json: input });
  await rememberProject(ctx, logical, response.body);
  return response.body;
}

function noContractDetail(body) {
  assert.equal(body.sourceLeadSummary, null);
  assert.deepEqual(body.currentBidSummary, { bidProcessId: null, bidStatus: 'not_configured', resultStatus: null, tenderNo: null, bidPackageNo: null, summary: null });
  assert.deepEqual(body.currentApprovalSummary, { summarySnapshotId: null, summaryPackageKey: null, projectionLevel: null, exportPolicy: null, generatedAt: null });
  assert.deepEqual(body.currentConfirmationSummary, { confirmationRecordId: null, status: 'not_configured', requiredCount: 0, confirmedCount: 0, pendingCount: 0, confirmedAt: null });
  assert.deepEqual(body.currentContractSummary.signedAmountProjection, { fieldPackageKey: 'contract-finance', mode: 'full', value: null, displayText: '-', reasonCode: 'field-package-not-applicable' });
  assert.equal(body.currentContractSummary.activeContractCount, 0);
  assert.equal(body.summarySnapshotId, null);
  assert.equal(body.projectionLevel, null);
  assert.equal(body.exportPolicy, null);
}

async function noProjectChange(ctx, label, projectId, action) {
  const before = await ctx.row('project', projectId);
  await action();
  const after = await ctx.row('project', projectId);
  assert.deepEqual(after, before, `${label}: failed request must not persist the managed project`);
  await ctx.observe(`${label}.project-before-after`, { before, after });
}

async function reassign(ctx, label, projectId, input) {
  const response = await http(ctx, label, 'POST', `/api/projects/${projectId}:reassignOwner`, 201, { json: input });
  assert.equal(response.body.targetId, projectId);
  assert.match(response.body.projectOwnerReassignmentRecordId, UUID);
  await ctx.remember(`${label}.history`, response.body.projectOwnerReassignmentRecordId);
  return response.body;
}

/** Real A HTTP customer -> real B HTTP project; no prepared customer substitute. */
export async function runProjects(ctx) {
  const activeId = ctx.id('customer.active');
  const secondaryId = ctx.id('customer.secondary');
  const inactiveId = ctx.id('customer.inactive');
  for (const id of [activeId, secondaryId, inactiveId]) assert.match(id, UUID, 'A must produce and remember real customer ids first');
  const [active, secondary, inactive, admin, other, noorg] = await Promise.all([
    ctx.row('customer', activeId), ctx.row('customer', secondaryId), ctx.row('customer', inactiveId),
    ctx.actor('admin'), ctx.actor('other'), ctx.actor('noorg'),
  ]);
  assert.equal(active.status, 'active');
  assert.equal(secondary.status, 'active');
  assert.equal(inactive.status, 'inactive');
  assert(other.orgId, 'active primary organization required for override/no-membership coverage');
  assert.equal(noorg.orgId ?? null, null);

  const name = ctx.name('project.active');
  const customerRef = ctx.name('project.customer-ref');
  const project = await created(ctx, 'project.active', {
    projectName: ` \ufeff${name}\u3000 `,
    customerId: activeId,
    customerProjectNo: ` ${customerRef} `,
    projectNo: 'MUST-BE-STRIPPED', status: 'closed', ownerUserId: other.userId, ownerOrgId: other.orgId, sourceLeadId: MISSING, rowVersion: 99,
  });
  const id = project.id;
  assert.equal(project.projectName, name);
  assert.equal(project.customerId, activeId);
  assert.equal(project.customerName, active.display_name);
  assert.equal(project.customerProjectNo, customerRef);
  assert.equal(project.sourceLeadId, null);
  assert.equal(project.status, 'active');
  assert.equal(project.currentStage, 'assessment');
  assert.equal(project.ownerUserId, admin.userId);
  assert.equal(project.ownerOrgId, admin.orgId ?? null);
  assert.equal(project.createdBy, admin.userId);
  assert.equal(project.updatedBy, admin.userId);
  assert.equal(project.rowVersion, 1);
  assert.equal(project.plannedSignAt, null);
  const row = await ctx.row('project', id);
  assert.equal(row.project_no, project.projectNo);
  assert.equal(row.customer_id, activeId);
  assert.equal(row.customer_name, active.display_name);
  assert.equal(row.owner_user_id, admin.userId);
  await ctx.observe('B.real-A-to-B-producer-chain', { customerId: activeId, projectId: id, projectNo: project.projectNo, customerOrigin: 'A runCustomers actual HTTP', projectOrigin: 'B actual HTTP', row });

  const list = await http(ctx, 'B.list.keyword', 'GET', `/api/projects?keyword=${encodeURIComponent(name)}&customerId=${MISSING}`, 200);
  assert(Array.isArray(list.body));
  const listed = list.body.find(item => item.id === id);
  assert(listed, 'created project is in its filtered list');
  assert.equal(listed.projectName, name);
  assert.equal(listed.customerName, active.display_name);
  assert.equal(listed.latestMilestoneAt, null);
  assert(!Object.hasOwn(listed, 'allowedActions'));
  for (const [label, query] of [
    ['status-stage', `status=active&currentStage=assessment&keyword=${encodeURIComponent(name)}`],
    ['customer-reference', `keyword=${encodeURIComponent(customerRef)}`],
    ['owner', `ownerOrgId=${admin.orgId ?? MISSING}&keyword=${encodeURIComponent(name)}`],
  ]) {
    const result = await http(ctx, `B.list.${label}`, 'GET', `/api/projects?${query}`, 200);
    assert.equal(result.body.some(item => item.id === id), label !== 'owner' || admin.orgId != null);
  }
  const excluded = await http(ctx, 'B.list.nonmatching-status', 'GET', `/api/projects?status=closed&keyword=${encodeURIComponent(name)}`, 200);
  assert.deepEqual(excluded.body, []);

  for (const actor of ['admin', 'viewer']) {
    const detail = await http(ctx, `B.detail.empty.${actor}`, 'GET', `/api/projects/${id}`, 200, { actor });
    assert.equal(detail.body.id, id);
    assert.equal(detail.body.projectName, name);
    noContractDetail(detail.body);
    assert.deepEqual(detail.body.stageSummary.blockingReasons, []);
    assert(detail.body.allowedActions.includes('view-project-workspace'));
    assert.equal(detail.body.allowedActions.includes('edit-project-basic-info'), actor === 'admin');
    await ctx.observe(`B.detail.empty.${actor}.expected-security`, { requestId: detail.requestId, targetId: id, expectedSensitiveEventCount: 0, verificationOwner: 'Root audit observer' });
  }
  const lookup = await http(ctx, 'B.lookup.exact', 'GET', `/api/projects:lookup?projectNo=${encodeURIComponent(project.projectNo)}&unknown=stripped`, 200);
  summary(lookup.body);
  assert.equal(lookup.body.id, id);
  assert(!Object.hasOwn(lookup.body, 'currentContractSummary'));
  const bracket = await http(ctx, 'B.lookup.scalar-plus-bracket', 'GET', `/api/projects:lookup?projectNo=${encodeURIComponent(project.projectNo)}&projectNo[]=ignored`, 200);
  assert.equal(bracket.body.id, id);
  for (const [label, number] of [['space', ' '], ['padded', ` ${project.projectNo} `], ['unicode', '项目/é:e\u0301+ß'], ['long', 'X'.repeat(65)], ['numeric-text', '123']]) {
    await domainError(ctx, `B.lookup.${label}`, 'GET', `/api/projects:lookup?projectNo=${encodeURIComponent(number)}`, 404, `Project no ${number} not found`);
  }
  for (const [label, query] of [['missing', ''], ['empty', '?projectNo='], ['repeated', '?projectNo=A&projectNo=A'], ['bracket-only', '?projectNo[]=A']]) {
    const result = await http(ctx, `B.lookup.dto.${label}`, 'GET', `/api/projects:lookup${query}`, 400);
    assert.equal(result.body.message, 'Validation failed');
    assert(result.body.errors.some(issue => issue.path[0] === 'projectNo'));
  }
  await http(ctx, 'B.lookup.old-code-uri-removed', 'GET', `/api/projects/code/${encodeURIComponent(project.projectNo)}`, 404);
  await http(ctx, 'B.lookup.literal-colon-lookalike', 'GET', '/api/projects:lookupExtra?projectNo=A', 404);
  await http(ctx, 'B.item.nonuuid-path-remains-db-error', 'GET', '/api/projects/not-a-uuid', 500);
  await domainError(ctx, 'B.item.missing', 'GET', `/api/projects/${MISSING}`, 404, `Project ${MISSING} not found`);
  const upperGet = await http(ctx, 'B.item.uppercase-uuid', 'GET', `/api/projects/${id.toUpperCase()}`, 200);
  assert.equal(upperGet.body.id, id);
  const head = await http(ctx, 'B.item.implicit-head', 'HEAD', `/api/projects/${id}`, 200);
  assert.equal(head.body, null);
  await http(ctx, 'B.item.wrong-method', 'PUT', `/api/projects/${id}`, 404, { json: {} });
  await http(ctx, 'B.list.case-trailing-slash', 'GET', `/API/PROJECTS/?keyword=${encodeURIComponent(name)}`, 200);
  await http(ctx, 'B.item.malformed-param-before-guard', 'GET', '/api/projects/%E0%A4%A', 400, { actor: 'anonymous' });

  await http(ctx, 'B.guard.session-before-query-dto', 'GET', '/api/projects:lookup', 401, { actor: 'anonymous' });
  await http(ctx, 'B.guard.viewer-read', 'GET', `/api/projects?keyword=${encodeURIComponent(name)}`, 200, { actor: 'viewer' });
  for (const [label, method, route, json] of [
    ['create', 'POST', '/api/projects', { projectName: name, customerId: activeId }],
    ['patch', 'PATCH', `/api/projects/${id}`, { projectName: name }],
    ['reassign', 'POST', `/api/projects/${id}:reassignOwner`, { ownerUserId: other.userId, reason: 'guard probe' }],
  ]) {
    const denied = await http(ctx, `B.guard.viewer-${label}`, method, route, 403, { actor: 'viewer', json });
    assert.equal(denied.body.code, 'permission_denied');
    const csrf = await http(ctx, `B.guard.csrf-${label}`, method, route, 403, { csrf: false, json });
    assert.equal(csrf.body.code, 'csrf_failed');
  }

  for (const [label, patch, key] of [
    ['blank-name', { projectName: ' \u3000 ' }, 'projectName'],
    ['numeric-name', { projectName: 12 }, 'projectName'],
    ['array-name', { projectName: [] }, 'projectName'],
    ['too-many-codepoints', { projectName: '😀'.repeat(256) }, 'projectName'],
    ['missing-customer', { customerId: undefined }, 'customerId'],
    ['null-customer', { customerId: null }, 'customerId'],
    ['bad-customer-uuid', { customerId: 'not-a-uuid' }, 'customerId'],
    ['blank-customer-ref', { customerProjectNo: ' ' }, 'customerProjectNo'],
    ['numeric-customer-ref', { customerProjectNo: 42 }, 'customerProjectNo'],
    ['null-stage', { currentStage: null }, 'currentStage'],
    ['unknown-stage', { currentStage: 'invented-stage' }, 'currentStage'],
    ['date-only', { plannedSignAt: '2026-05-07' }, 'plannedSignAt'],
    ['offset-date', { plannedSignAt: '2026-05-07T09:10:11+00:00' }, 'plannedSignAt'],
    ['numeric-date', { plannedSignAt: 123 }, 'plannedSignAt'],
  ]) await invalid(ctx, `B.create.dto.${label}`, 'POST', '/api/projects', { projectName: ctx.name(`project.bad.${label}`), customerId: activeId, ...patch }, key);
  for (const [label, json, key] of [
    ['empty', {}, undefined], ['unknown-only', { projectNo: 'ignored', ownerUserId: other.userId, expectedVersion: 1 }, undefined],
    ['null-name', { projectName: null }, 'projectName'], ['null-customer', { customerId: null }, 'customerId'],
    ['blank-customer-ref', { customerProjectNo: '' }, 'customerProjectNo'], ['local-date', { plannedSignAt: '2026-05-07T09:10:11' }, 'plannedSignAt'],
  ]) await invalid(ctx, `B.patch.dto.${label}`, 'PATCH', `/api/projects/${id}`, json, key);
  for (const [label, json, key] of [
    ['missing-owner', { reason: 'probe' }, 'ownerUserId'], ['null-org-not-owner', { ownerUserId: null, ownerOrgId: null, reason: 'probe' }, 'ownerUserId'],
    ['empty-reason', { ownerUserId: other.userId, reason: ' ' }, 'reason'],
    ['string-version', { ownerUserId: other.userId, reason: 'probe', expectedVersion: '1' }, 'expectedVersion'],
    ['zero-version', { ownerUserId: other.userId, reason: 'probe', expectedVersion: 0 }, 'expectedVersion'],
    ['fractional-version', { ownerUserId: other.userId, reason: 'probe', expectedVersion: 1.5 }, 'expectedVersion'],
    ['null-version', { ownerUserId: other.userId, reason: 'probe', expectedVersion: null }, 'expectedVersion'],
  ]) await invalid(ctx, `B.reassign.dto.${label}`, 'POST', `/api/projects/${id}:reassignOwner`, json, key);
  for (const [label, query, key] of [['status', 'status=invented', 'status'], ['stage', 'currentStage=invented', 'currentStage'], ['owner', 'ownerOrgId=bad', 'ownerOrgId'], ['keyword', 'keyword=%20', 'keyword'], ['repeat-keyword', 'keyword=A&keyword=B', 'keyword']]) {
    const result = await http(ctx, `B.list.dto.${label}`, 'GET', `/api/projects?${query}`, 400);
    assert.equal(result.body.message, 'Validation failed');
    assert(result.body.errors.some(issue => issue.path[0] === key));
  }

  for (const [label, customerId, status, message] of [
    ['missing', MISSING, 404, `Customer ${MISSING} not found`],
    ['inactive', inactiveId, 400, `Customer ${inactiveId} is not active`],
  ]) {
    await domainError(ctx, `B.create.customer-${label}`, 'POST', '/api/projects', status, message, { json: { projectName: ctx.name(`project.customer-${label}`), customerId } });
    await noProjectChange(ctx, `B.patch.customer-${label}`, id, () => domainError(ctx, `B.patch.customer-${label}`, 'PATCH', `/api/projects/${id}`, status, message, { json: { projectName: ctx.name('project.must-not-auto-flush'), customerId } }));
  }
  await noProjectChange(ctx, 'B.reassign.missing-owner', id, () => domainError(ctx, 'B.reassign.missing-owner', 'POST', `/api/projects/${id}:reassignOwner`, 404, `Platform user ${MISSING} not found`, { json: { ownerUserId: MISSING, reason: 'missing target' } }));
  await noProjectChange(ctx, 'B.reassign.missing-org', id, () => domainError(ctx, 'B.reassign.missing-org', 'POST', `/api/projects/${id}:reassignOwner`, 404, `Org unit ${MISSING} not found`, { json: { ownerUserId: other.userId, ownerOrgId: MISSING, reason: 'missing org' } }));

  const noop = await http(ctx, 'B.patch.noop-known-plus-unknown', 'PATCH', `/api/projects/${id}`, 200, { json: { projectName: name, ownerUserId: other.userId, status: 'closed', expectedVersion: 99999 } });
  assert.equal(noop.body.rowVersion, project.rowVersion);
  assert.equal(noop.body.updatedAt, project.updatedAt);
  assert.equal(noop.body.ownerUserId, admin.userId);
  const changedName = ctx.name('project.updated');
  const changed = await http(ctx, 'B.patch.real-fields', 'PATCH', `/api/projects/${id}`, 200, { json: { projectName: ` ${changedName} `, customerProjectNo: ` ${customerRef}-updated `, plannedSignAt: '2026-05-07T09:10:11.123456789Z' } });
  summary(changed.body);
  assert.equal(changed.body.projectName, changedName);
  assert.equal(changed.body.customerProjectNo, `${customerRef}-updated`);
  assert.equal(changed.body.plannedSignAt, '2026-05-07T09:10:11.123Z');
  assert.equal(changed.body.rowVersion, noop.body.rowVersion + 1);
  const preserveDate = await http(ctx, 'B.patch.omitted-date', 'PATCH', `/api/projects/${id}`, 200, { json: { projectName: changedName } });
  assert.equal(preserveDate.body.plannedSignAt, changed.body.plannedSignAt);
  assert.equal(preserveDate.body.rowVersion, changed.body.rowVersion);
  const cleared = await http(ctx, 'B.patch.clear-nullable', 'PATCH', `/api/projects/${id}`, 200, { json: { plannedSignAt: null, customerProjectNo: null } });
  assert.equal(cleared.body.plannedSignAt, null);
  assert.equal(cleared.body.customerProjectNo, null);
  const switched = await http(ctx, 'B.patch.real-A-secondary-customer', 'PATCH', `/api/projects/${id}`, 200, { json: { customerId: secondaryId.toUpperCase() } });
  assert.equal(switched.body.customerId, secondaryId);
  assert.equal(switched.body.customerName, secondary.display_name);
  assert.equal((await ctx.row('project', id)).customer_id, secondaryId);

  for (const status of ['pending-approval', 'on-hold', 'completed', 'closed']) {
    const before = await ctx.mutate('project', id, { status });
    try {
      await domainError(ctx, `B.patch.status.${status}`, 'PATCH', `/api/projects/${id}`, 400, `Project ${id} cannot be edited in status ${status}`, { json: { projectName: ctx.name('project.status-rejected'), customerId: MISSING } });
      await domainError(ctx, `B.reassign.status.${status}`, 'POST', `/api/projects/${id}:reassignOwner`, 400, `Project ${id} cannot reassign owner in status ${status}`, { json: { ownerUserId: MISSING, reason: 'status priority' } });
    } finally { await ctx.restore('project', id, before); }
  }

  const ownership = await reassign(ctx, 'B.reassign.other-primary', id, { ownerUserId: other.userId, reason: '  changed sales owner  ', expectedVersion: switched.body.rowVersion });
  assert.equal(ownership.previousOwnerUserId, admin.userId);
  assert.equal(ownership.newOwnerUserId, other.userId);
  assert.equal(ownership.newOwnerOrgId, other.orgId);
  assert.equal(ownership.businessStatusAfter, 'active');
  await noProjectChange(ctx, 'B.reassign.same', id, () => domainError(ctx, 'B.reassign.same', 'POST', `/api/projects/${id}:reassignOwner`, 400, `Project ${id} already has the requested owner`, { json: { ownerUserId: other.userId, reason: 'same target' } }));
  await domainError(ctx, 'B.reassign.legal-stale-prior-to-user', 'POST', `/api/projects/${id}:reassignOwner`, 409, `project version 1 does not match current version ${(await ctx.row('project', id)).row_version}`, { json: { ownerUserId: MISSING, expectedVersion: 1, reason: 'stale before owner read' } });
  const none = await reassign(ctx, 'B.reassign.no-primary', id, { ownerUserId: noorg.userId, reason: 'no primary organization' });
  assert.equal(none.newOwnerOrgId, null);
  assert.equal((await ctx.row('project', id)).owner_org_id, null);
  const override = await reassign(ctx, 'B.reassign.explicit-cross-membership-org', id, { ownerUserId: noorg.userId, ownerOrgId: other.orgId, reason: 'explicit existing org without membership constraint' });
  assert.equal(override.newOwnerOrgId, other.orgId);
  const nullOrg = await reassign(ctx, 'B.reassign.explicit-null-org', id, { ownerUserId: noorg.userId, ownerOrgId: null, reason: 'explicitly clear org' });
  assert.equal(nullOrg.newOwnerOrgId, null);
  const self = await reassign(ctx, 'B.reassign.self-lower', id, { ownerUserId: admin.userId, reason: 'original managed principal' });
  assert.equal(self.newOwnerOrgId, admin.orgId ?? null);
  const selfUpper = await reassign(ctx, 'B.reassign.self-uppercase', id, { ownerUserId: admin.userId.toUpperCase(), reason: 'uppercase strict string identity' });
  assert.equal(selfUpper.newOwnerUserId, admin.userId.toUpperCase());
  assert.equal(selfUpper.newOwnerOrgId, admin.orgId ?? null);
  assert.equal((await ctx.row('project', id)).owner_user_id, admin.userId);
  const orgUpper = await reassign(ctx, 'B.reassign.org-uppercase', id, { ownerUserId: admin.userId, ownerOrgId: other.orgId.toUpperCase(), reason: 'uppercase explicit organization' });
  assert.equal(orgUpper.newOwnerOrgId, other.orgId.toUpperCase());
  assert.equal((await ctx.row('project', id)).owner_org_id, other.orgId);

  const upperCustomer = await created(ctx, 'project.uppercase-customer', { projectName: ctx.name('project.uppercase-customer'), customerId: activeId.toUpperCase() });
  assert.equal(upperCustomer.customerId, activeId);
  const loneName = `${ctx.name('project.lone-surrogate')}\ud800`;
  const lone = await created(ctx, 'project.lone-surrogate', { projectName: loneName, customerId: activeId });
  assert.equal(lone.projectName, loneName);
  assert.equal((await ctx.row('project', lone.id)).project_name, loneName.replace('\ud800', '\ufffd'));
  const astral = await created(ctx, 'project.astral-boundary', { projectName: '😀'.repeat(255), customerId: activeId });
  assert.equal(astral.projectName, '😀'.repeat(255));
  for (const currentStage of STAGES) {
    const staged = await created(ctx, `project.stage.${currentStage}`, { projectName: ctx.name(`project.stage.${currentStage}`), customerId: activeId, currentStage });
    assert.equal(staged.status, 'active');
    assert.equal(staged.currentStage, currentStage);
  }
  const patternPrefix = ctx.name('project.pattern');
  const patterned = await created(ctx, 'project.pattern', { projectName: `${patternPrefix} NeEdLeA1Z`, customerId: activeId });
  const pattern = await http(ctx, 'B.list.original-ilike-wildcards', 'GET', `/api/projects?keyword=${encodeURIComponent(`${patternPrefix} needle%_z`)}`, 200);
  assert(pattern.body.some(item => item.id === patterned.id), 'ILIKE keeps case folding and %/_ wildcard semantics');
  return { projectId: id, projectNo: project.projectNo, customerId: activeId, realProducerChain: true };
}

// Root implements these exact prepared-source fixture kinds using the original
// schema and its own marker/lease. Every kind returns at least { id }. These
// reads do not certify Contract/Lead/Bid/Approval or reference-user producers.
export const projectPreparedKinds = Object.freeze({
  'project.contract': ['projectId', 'contractNo', 'status', 'signedAmount', 'currencyCode', 'signedAt', 'currentSnapshotId', 'createdAt', 'updatedAt'],
  'project.source-lead': ['customerId', 'customerName', 'leadNo', 'leadName', 'sourceCode', 'status'],
  'project.bid': ['projectId', 'version', 'isCurrent', 'status', 'currentStage', 'resultStatus', 'processSummary', 'tenderNo', 'bidPackageNo', 'bidMode', 'decision', 'effectiveAt', 'createdAt', 'updatedAt'],
  'project.approval-snapshot': ['targetType', 'targetId', 'approvalScenarioKey', 'summaryPackageKey', 'projectionLevel', 'exportPolicy', 'businessStatusAtSnapshot', 'status', 'generatedAt', 'createdAt'],
  'project.owner-user': ['username', 'displayName', 'isActive', 'primaryOrgUnitId'],
  'project.owner-org': ['name', 'code', 'isActive', 'parentId', 'displayOrder'],
});

async function prepared(ctx, kind, logical, fields) {
  const value = await ctx.prepare(kind, fields);
  assert.match(value?.id, UUID, `${kind}: Root must return its actually inserted owned fixture id`);
  await ctx.remember(logical, value.id);
  await ctx.observe(`${logical}.source-classification`, { kind, id: value.id, source: 'Root prepared-source; no migrated producer claim' });
  return value;
}

export async function runProjectPrepared(ctx) {
  const id = ctx.id('project.active');
  const customerId = ctx.id('customer.active');
  const customer = await ctx.row('customer', customerId);
  const other = await ctx.actor('other');
  const time = day => `2026-04-${String(day).padStart(2, '0')}T10:00:00.000Z`;
  const contract = await prepared(ctx, 'project.contract', 'project.prepared.signed-contract', { projectId: id, contractNo: ctx.name('prepared.contract.signed'), status: 'active', signedAmount: '111.25', currencyCode: 'CNY', signedAt: time(3), currentSnapshotId: null, createdAt: time(1), updatedAt: time(3) });
  const draft = await prepared(ctx, 'project.contract', 'project.prepared.latest-null-signed-contract', { projectId: id, contractNo: ctx.name('prepared.contract.draft'), status: 'draft', signedAmount: '999.99', currencyCode: 'JPY', signedAt: null, currentSnapshotId: null, createdAt: time(4), updatedAt: time(4) });
  const lead = await prepared(ctx, 'project.source-lead', 'project.prepared.source-lead', { customerId, customerName: customer.display_name, leadNo: ctx.name('prepared.lead.no'), leadName: ctx.name('prepared.lead.name'), sourceCode: 'R3AB-prepared-source', status: 'converted' });
  const bid = await prepared(ctx, 'project.bid', 'project.prepared.current-bid', { projectId: id, version: 2, isCurrent: true, status: 'effective', currentStage: 'submitted', resultStatus: 'pending', processSummary: ctx.name('prepared.bid.summary'), tenderNo: ctx.name('prepared.tender.no'), bidPackageNo: ctx.name('prepared.bid.package'), bidMode: 'public-tender', decision: 'participate', effectiveAt: time(5), createdAt: time(5), updatedAt: time(5) });
  await prepared(ctx, 'project.bid', 'project.prepared.ignored-bid', { projectId: id, version: 99, isCurrent: false, status: 'superseded', currentStage: 'closed', resultStatus: 'lost', processSummary: ctx.name('prepared.bid.ignored'), tenderNo: null, bidPackageNo: null, bidMode: 'public-tender', decision: 'participate', effectiveAt: time(9), createdAt: time(9), updatedAt: time(9) });
  const snapshotFields = { targetType: 'project', targetId: id, approvalScenarioKey: 'project-detail', summaryPackageKey: 'project-detail', projectionLevel: 'project-detail', exportPolicy: 'controlled', businessStatusAtSnapshot: 'active', status: 'active', generatedAt: time(6), createdAt: time(6) };
  const snapshot = await prepared(ctx, 'project.approval-snapshot', 'project.prepared.snapshot', snapshotFields);
  await prepared(ctx, 'project.approval-snapshot', 'project.prepared.ignored-snapshot-scenario', { ...snapshotFields, approvalScenarioKey: 'R3AB-other-scenario', generatedAt: time(9), createdAt: time(9) });
  const before = await ctx.mutate('project', id, { source_lead_id: lead.id, status: 'blocked', current_stage: 'execution', closed_at: time(4) });
  try {
    const admin = await http(ctx, 'B.prepared.detail.full', 'GET', `/api/projects/${id}`, 200);
    assert.equal(admin.body.sourceLeadSummary.id, lead.id);
    assert.equal(admin.body.sourceLeadSummary.leadName, ctx.name('prepared.lead.name'));
    assert.equal(admin.body.currentBidSummary.bidProcessId, bid.id);
    assert.equal(admin.body.currentBidSummary.bidStatus, 'submitted');
    assert.equal(admin.body.currentContractSummary.activeContractCount, 1);
    assert.equal(admin.body.currentContractSummary.latestContractId, draft.id, 'original DESC puts null signedAt first; do not use latest active contract');
    assert.equal(admin.body.currentContractSummary.signedAt, null);
    assert.equal(admin.body.currentContractSummary.signedAmountProjection.mode, 'full');
    assert.equal(admin.body.currentContractSummary.signedAmountProjection.value, '999.99');
    assert.equal(admin.body.currentContractSummary.signedAmountProjection.displayText, '999.99 JPY');
    assert.equal(admin.body.currentApprovalSummary.summarySnapshotId, snapshot.id);
    assert.equal(admin.body.currentApprovalSummary.generatedAt, time(6));
    assert.equal(admin.body.summarySnapshotId, snapshot.id);
    assert.deepEqual(admin.body.stageSummary.blockingReasons, ['project-status-blocked']);
    assert(admin.body.allowedActions.includes('reassign-project-owner'));
    assert.equal(admin.body.currentConfirmationSummary.status, 'not_configured');
    const viewer = await http(ctx, 'B.prepared.detail.masked', 'GET', `/api/projects/${id}?auditProbe=original-url`, 200, { actor: 'viewer' });
    assert.deepEqual(viewer.body.currentContractSummary.signedAmountProjection, { fieldPackageKey: 'contract-finance', mode: 'masked', value: null, displayText: '敏感字段已隐藏', reasonCode: 'missing-sensitive-read-permission' });
    await ctx.observe('B.prepared.sensitive-audit.expected', { requestId: viewer.requestId, targetId: id, expectedEventType: 'sensitive_field.masked', expectedSensitiveEventCount: 1, fieldPackageKey: 'contract-finance', fieldKeys: ['field'], permissionKey: 'contract:finance:sensitive:read', originalPath: `/api/projects/${id}?auditProbe=original-url`, verificationOwner: 'Root actual audit observer; not asserted via a stand-in' });
    await ctx.observe('B.prepared.full-no-sensitive-audit.expected', { requestId: admin.requestId, targetId: id, expectedSensitiveEventCount: 0, verificationOwner: 'Root actual audit observer' });
    const project = await ctx.row('project', id);
    const list = await http(ctx, 'B.prepared.list-milestone', 'GET', `/api/projects?keyword=${encodeURIComponent(project.project_name)}`, 200);
    assert.equal(list.body.find(item => item.id === id)?.latestMilestoneAt, time(4), 'closedAt wins over the signed active contract even though detail latest is unsigned');
    const exact = await http(ctx, 'B.prepared.lookup-still-summary', 'GET', `/api/projects:lookup?projectNo=${encodeURIComponent(project.project_no)}`, 200, { actor: 'viewer' });
    summary(exact.body);
    await ctx.observe('B.prepared.lookup-no-sensitive-audit.expected', { requestId: exact.requestId, targetId: id, expectedSensitiveEventCount: 0, verificationOwner: 'Root actual audit observer' });
  } finally { await ctx.restore('project', id, before); }

  const inactiveUser = await prepared(ctx, 'project.owner-user', 'project.prepared.inactive-owner', { username: ctx.name('inactive.owner').slice(0, 60), displayName: ctx.name('inactive.owner.display'), isActive: false, primaryOrgUnitId: null });
  const inactiveOrg = await prepared(ctx, 'project.owner-org', 'project.prepared.inactive-org', { name: ctx.name('inactive.org.name'), code: ctx.name('inactive.org.code').slice(0, 60), isActive: false, parentId: null, displayOrder: 0 });
  await domainError(ctx, 'B.prepared.reassign-inactive-owner-first', 'POST', `/api/projects/${id}:reassignOwner`, 400, `Platform user ${inactiveUser.id} is not active`, { json: { ownerUserId: inactiveUser.id, ownerOrgId: MISSING, reason: 'inactive owner before missing org' } });
  await domainError(ctx, 'B.prepared.reassign-inactive-org', 'POST', `/api/projects/${id}:reassignOwner`, 400, `Org unit ${inactiveOrg.id} is not active`, { json: { ownerUserId: other.userId, ownerOrgId: inactiveOrg.id, reason: 'inactive org' } });
  const missingOwners = await ctx.mutate('project', id, { owner_user_id: MISSING, owner_org_id: MISSING, current_stage: 'closed-lost', status: 'active' });
  try {
    const detail = await http(ctx, 'B.prepared.missing-owner-and-closed-stage-actions', 'GET', `/api/projects/${id}`, 200);
    assert.equal(detail.body.ownerName, null);
    assert.equal(detail.body.ownerOrgName, null);
    assert.deepEqual(detail.body.stageSummary.blockingReasons, ['project-closed']);
    assert(!detail.body.allowedActions.includes('edit-project-basic-info'));
    assert(detail.body.allowedActions.includes('reassign-project-owner'), 'original status-only action condition is intentionally distinct from isClosed');
  } finally { await ctx.restore('project', id, missingOwners); }

  const group = ctx.name('project.prepared.sort');
  const sortProjects = [];
  for (const suffix of ['A', 'B', 'C']) sortProjects.push(await created(ctx, `project.sort.${suffix}`, { projectName: `${group} ${suffix}`, customerId }));
  const originals = [];
  try {
    for (const [index, project] of sortProjects.entries()) {
      const patch = { created_at: time(index === 0 ? 1 : index === 1 ? 2 : 4), closed_at: index === 0 ? null : time(index === 1 ? 3 : 2) };
      originals.push([project.id, await ctx.mutate('project', project.id, patch)]);
    }
    const sorted = await http(ctx, 'B.prepared.list-milestone-before-created-at', 'GET', `/api/projects?keyword=${encodeURIComponent(group)}`, 200);
    assert.deepEqual(sorted.body.map(item => item.id), [sortProjects[1].id, sortProjects[2].id, sortProjects[0].id]);
  } finally {
    for (const [projectId, original] of originals.reverse()) await ctx.restore('project', projectId, original);
  }
  return { projectId: id, preparedSourceOnly: true, signedContractId: contract.id, latestContractId: draft.id };
}

/**
 * E2E choice agreed with Root: the current ProjectList has a create dialog and
 * showCreateDialog(), but its template exposes only lead-to-project entry.
 * Do not invoke a component method, add a button or certify an unreachable UI
 * creation flow. The A HTTP -> B HTTP producer chain above certifies creation.
 * Here Root supplies an already authenticated original Angular page and its
 * real API-created project.active, and owns the four OS/backend combinations.
 * No credentials are read/stored and no out-of-scope response is stubbed.
 */
export async function projectUi(page, ctx) {
  const id = ctx.id('project.active');
  const project = await ctx.row('project', id);
  const activeId = ctx.id('customer.active');
  const targetId = project.customer_id === activeId ? ctx.id('customer.secondary') : activeId;
  const target = await ctx.row('customer', targetId);
  assert.equal(target.status, 'active');
  const optionLabel = `${target.display_name}（${target.customer_no}）`;
  const requestsOutsideB6 = [];
  const pendingOutsideB6 = new Map();
  const isOutside = url => new URL(url).pathname.startsWith(`/api/projects/${id}/`);
  const onRequest = request => {
    if (isOutside(request.url())) {
      const value = { method: request.method(), path: new URL(request.url()).pathname };
      pendingOutsideB6.set(request, value);
      requestsOutsideB6.push({ ...value, phase: 'started', classification: 'actual out-of-scope request; no B6 success claim' });
    }
  };
  const onResponse = response => {
    if (isOutside(response.url())) {
      pendingOutsideB6.delete(response.request());
      requestsOutsideB6.push({ method: response.request().method(), path: new URL(response.url()).pathname, phase: 'response', status: response.status(), classification: 'actual out-of-scope request; no B6 success claim' });
    }
  };
  const onFailed = request => {
    if (isOutside(request.url())) {
      pendingOutsideB6.delete(request);
      requestsOutsideB6.push({ method: request.method(), path: new URL(request.url()).pathname, phase: 'failed', failure: request.failure()?.errorText ?? 'request failed', classification: 'actual out-of-scope failure; not hidden or retried' });
    }
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  page.on('requestfailed', onFailed);
  try {
    const listResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/projects' && response.request().method() === 'GET');
    await page.goto(new URL('/projects', ctx.baseUrl).href, { waitUntil: 'domcontentloaded' });
    assert.equal((await listResponse).status(), 200);
    await page.getByPlaceholder('搜索项目、客户、负责人', { exact: true }).fill(project.project_name);
    const row = page.locator('tr').filter({ hasText: project.project_name }).filter({ has: page.locator('p-button[label="详情"] button') });
    await row.waitFor({ state: 'visible' });
    assert.equal(await row.count(), 1, 'the current owned project row is unique');
    const detailResponse = page.waitForResponse(response => new URL(response.url()).pathname === `/api/projects/${id}` && response.request().method() === 'GET');
    await row.locator('p-button[label="详情"] button').click();
    assert.equal((await detailResponse).status(), 200);
    await page.locator('p-button[label="编辑基本信息"] button').click();
    const dialog = page.getByRole('dialog', { name: '编辑项目基本信息', exact: true });
    await dialog.waitFor({ state: 'visible' });
    const editedName = ctx.name('project.ui.edited');
    const editedCustomerRef = ctx.name('project.ui.customer-ref');
    await dialog.locator('#editProjectName').fill(editedName);
    await dialog.locator('#editCustomerProjectNo').fill(editedCustomerRef);
    await dialog.locator('#editCustomerId').click();
    await page.getByRole('option', { name: optionLabel, exact: true }).click();
    const patchResponse = page.waitForResponse(response => new URL(response.url()).pathname === `/api/projects/${id}` && response.request().method() === 'PATCH');
    await dialog.getByRole('button', { name: '保存', exact: true }).click();
    const patched = await patchResponse;
    assert.equal(patched.status(), 200);
    const body = await patched.json();
    assert.equal(body.projectName, editedName);
    assert.equal(body.customerId, targetId);
    assert.equal(body.customerName, target.display_name);
    assert.equal(body.customerProjectNo, editedCustomerRef);
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('heading', { name: editedName, exact: true }).waitFor({ state: 'visible' });
    const after = await ctx.row('project', id);
    assert.equal(after.project_name, editedName);
    assert.equal(after.customer_id, targetId);
    assert.equal(after.customer_name, target.display_name);
    assert(after.row_version > project.row_version);
    const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/projects' && response.request().method() === 'GET');
    await page.locator('a[href="/projects"]:visible').first().click();
    assert.equal((await refreshed).status(), 200);
    await page.getByPlaceholder('搜索项目、客户、负责人', { exact: true }).fill(editedName);
    const updatedRow = page.locator('tr').filter({ hasText: editedName }).filter({ has: page.locator('p-button[label="详情"] button') });
    await updatedRow.waitFor({ state: 'visible' });
    assert((await updatedRow.textContent()).includes(target.display_name));
    await ctx.observe('B.ui.actual-list-detail-customer-edit-save', { projectId: id, customerId: targetId, projectName: editedName, actualProjectPatch: true, UIcreate: 'not exposed by unchanged original template; separately certified by actual A->B HTTP chain', after });
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
    page.off('requestfailed', onFailed);
    await ctx.observe('B.ui.actual-out-of-scope-requests', { requests: requestsOutsideB6, stillPendingAtDefinitionExit: [...pendingOutsideB6.values()], classification: 'not B6 delivery; pending remains pending for Root terminal reconciliation; no mock, proxy fallback, component.evaluate or silent bypass' });
  }
}
