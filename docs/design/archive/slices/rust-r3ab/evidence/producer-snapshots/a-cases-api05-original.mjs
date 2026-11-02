import assert from 'node:assert/strict';

// Definition only. Importing this module performs no requests, preparation,
// browser work, SQL, private I/O, retries, or environment discovery.
// Root owns execution, leases, cleanup, raw evidence and cross-backend mapping.
// Number expectations use corrective 4fda3a1a, not the superseded G1 prose.

const MISSING_CUSTOMER = 'd3a30000-0000-4000-8000-fffffffffff1';
const MISSING_ALIAS = 'd3a30000-0000-4000-8000-fffffffffff2';
const MISSING_USER = 'd3a30000-0000-4000-8000-fffffffffff3';
const MISSING_ORG = 'd3a30000-0000-4000-8000-fffffffffff4';
const SUMMARY_KEYS = ['id', 'customerNo', 'displayName', 'legalName', 'shortName', 'status', 'ownerOrgId', 'ownerUserId', 'sourceChannel', 'remark', 'mergedIntoCustomerId', 'rowVersion', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'];
const ALIAS_KEYS = ['id', 'customerId', 'aliasName', 'aliasType', 'normalizedName', 'isPrimary', 'createdAt', 'createdBy'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value) { assert.equal(typeof value, 'string'); assert.match(value, uuidPattern); }
function iso(value) { assert.equal(typeof value, 'string'); assert.ok(Number.isFinite(Date.parse(value)), `Invalid datetime: ${value}`); }
function nullableText(value) { assert.ok(value === null || typeof value === 'string'); }
function nullableUuid(value) { if (value !== null) uuid(value); }
function integer(value) { assert.ok(Number.isInteger(value) && value >= 0); }
function summary(value, exact = false) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  for (const key of SUMMARY_KEYS) assert.ok(Object.hasOwn(value, key), `Missing ${key}`);
  if (exact) assert.deepEqual(Object.keys(value).sort(), [...SUMMARY_KEYS].sort());
  uuid(value.id); assert.match(value.customerNo, /^CUST-\d{4}-\d{6,}$/);
  assert.equal(typeof value.displayName, 'string'); assert.ok(['active', 'inactive', 'merged'].includes(value.status));
  for (const key of ['legalName', 'shortName', 'sourceChannel', 'remark']) nullableText(value[key]);
  for (const key of ['ownerOrgId', 'ownerUserId', 'mergedIntoCustomerId', 'createdBy', 'updatedBy']) nullableUuid(value[key]);
  assert.ok(Number.isInteger(value.rowVersion) && value.rowVersion >= 1); iso(value.createdAt); iso(value.updatedAt);
}
function alias(value) {
  assert.deepEqual(Object.keys(value).sort(), [...ALIAS_KEYS].sort());
  uuid(value.id); uuid(value.customerId); iso(value.createdAt); nullableUuid(value.createdBy);
  assert.equal(typeof value.aliasName, 'string'); assert.equal(typeof value.normalizedName, 'string'); assert.equal(typeof value.isPrimary, 'boolean');
  assert.ok(['legal-name', 'short-name', 'legacy-input', 'import-name', 'alias'].includes(value.aliasType));
}
function detail(value) {
  summary(value); nullableText(value.ownerName); nullableText(value.ownerOrgName);
  for (const key of ['leadCount', 'projectCount', 'contractCount']) integer(value[key]);
  assert.ok(Array.isArray(value.aliases)); value.aliases.forEach(alias);
  assert.equal(value.aliases.filter(item => item.isPrimary).length, 1);
  for (let index = 1; index < value.aliases.length; index += 1) {
    const before = value.aliases[index - 1], after = value.aliases[index];
    assert.ok(Number(before.isPrimary) >= Number(after.isPrimary));
    if (before.isPrimary === after.isPrimary) assert.ok(Date.parse(before.createdAt) <= Date.parse(after.createdAt));
  }
}
function workspace(value, customerId) {
  assert.equal(value.customerId, customerId); iso(value.generatedAt);
  const counts = ['leadCount', 'activeLeadCount', 'convertedLeadCount', 'projectCount', 'activeProjectCount', 'contractCount', 'recentFollowUpCount', 'recentDiscussionCount'];
  counts.forEach(key => integer(value.summary[key]));
  for (const key of ['latestFollowUpAt', 'latestDiscussionAt']) if (value.summary[key] !== null) iso(value.summary[key]);
  for (const key of ['activeLeads', 'activeProjects', 'recentContracts', 'recentFollowUps', 'recentDiscussions']) { assert.ok(Array.isArray(value[key])); assert.ok(value[key].length <= 5); }
  assert.ok(Array.isArray(value.recommendedActions) && value.recommendedActions.length <= 5);
  assert.ok(Array.isArray(value.timeline) && value.timeline.length <= 12);
  for (let index = 1; index < value.timeline.length; index += 1) assert.ok(Date.parse(value.timeline[index - 1].occurredAt) >= Date.parse(value.timeline[index].occurredAt));
  for (const contract of value.recentContracts) {
    for (const forbidden of ['signedAmount', 'signedAmountProjection', 'contractAmount', 'amount']) assert.ok(!Object.hasOwn(contract, forbidden));
  }
}
async function step(ctx, label, method, route, options, expected) {
  const response = await ctx.step(`customers.${label}`, method, route, options);
  assert.equal(response.status, expected, `${label}: expected HTTP ${expected}, received ${response.status}`);
  return response.body;
}
async function create(ctx, logical, displayName, fields = {}) {
  const value = await step(ctx, `${logical}.create`, 'POST', '/api/customers', { json: { displayName, ...fields } }, 201);
  summary(value, true); ctx.remember(logical, value.id); return value;
}
async function createAlias(ctx, logical, customerId, aliasName, fields = {}) {
  const value = await step(ctx, `${logical}.create`, 'POST', `/api/customers/${customerId}/aliases`, { json: { aliasName, ...fields } }, 201);
  alias(value); assert.equal(value.customerId, customerId); assert.equal(value.isPrimary, false); ctx.remember(logical, value.id); return value;
}
async function unchanged(ctx, label, table, id, before) {
  const after = await ctx.row(table, id); assert.deepEqual(after, before, label); await ctx.observe(`customers.${label}`, { before, after });
}

export const customerExternalChecks = Object.freeze([
  { ids: ['A07', 'A08'], requirement: 'Root SQL/counter observer and controlled alias-INSERT failure: business BEGIN precedes independent counter allocation; failed customer/primary-alias/session writes roll back business rows, while the committed number remains consumed. No first-number assumption.' },
  { ids: ['A10'], requirement: 'Root coordinates two already-read same-version customer writers; exactly one 200 and one generic 500; validate persisted winner and no lost update.' },
  { ids: ['A14', 'A15', 'A16'], requirement: 'Root observes audit and auth_session outside ctx.row: exact request header precedence and snapshots, audit INSERT -> pending session UPDATE -> alias DELETE, both failure directions roll back alias/audit atomically.' },
  { ids: ['A17'], requirement: 'Root coordinates two alias readers before deletion: 204/204, exactly two audit rows selected by target customer AND before_snapshot.aliasId, no affected-row conflict.' },
  { ids: ['A22'], requirement: 'Run B after runCustomers and consume customer.active from actual HTTP production; prepared facts never replace that integration customer.' },
  { ids: ['A23', 'A24'], requirement: 'Root executes original browser combinations, compilation/lint/tests, source/schema/generated protection and final cleanup. Definitions and Native witnesses alone are not Rust acceptance.' }
]);

export async function runCustomers(ctx) {
  const admin = ctx.actor('admin'), viewer = ctx.actor('viewer');
  uuid(admin.userId); uuid(admin.orgId); uuid(viewer.userId); if (viewer.orgId !== null) uuid(viewer.orgId);
  // These UUIDs designate absence only. They never stand in for existing owners,
  // permissions or positive business references in the isolated Root fixture.
  await ctx.observe('customers.negative-reference-ids', { MISSING_CUSTOMER, MISSING_ALIAS, MISSING_USER, MISSING_ORG });

  const activeName = ctx.name('customer-active');
  const active = await create(ctx, 'customer.active', `  ${activeName}  `, { legalName: null, shortName: null, sourceChannel: null, remark: null, customerNo: 'must-be-stripped', status: 'merged', rowVersion: 999, mergedIntoCustomerId: MISSING_CUSTOMER, unknown: { keep: false } });
  assert.equal(active.displayName, activeName); assert.equal(active.status, 'active'); assert.equal(active.rowVersion, 1);
  assert.notEqual(active.customerNo, 'must-be-stripped'); assert.equal(active.mergedIntoCustomerId, null);
  assert.equal(active.ownerUserId, admin.userId); assert.equal(active.ownerOrgId, admin.orgId);
  for (const key of ['legalName', 'shortName', 'sourceChannel', 'remark']) assert.equal(active[key], null);
  const activeId = active.id;
  const secondary = await create(ctx, 'customer.secondary', ctx.name('customer-secondary'), { ownerUserId: null });
  assert.equal(secondary.status, 'active'); assert.equal(secondary.ownerUserId, null); assert.equal(secondary.ownerOrgId, null);
  const inactive = await create(ctx, 'customer.inactive', ctx.name('customer-inactive'));
  const inactiveValue = await step(ctx, 'inactive.disable', 'PATCH', `/api/customers/${inactive.id}`, { json: { status: 'inactive' } }, 200);
  assert.equal(inactiveValue.status, 'inactive');

  const activeDetail = await step(ctx, 'active.detail', 'GET', `/api/customers/${activeId}`, {}, 200); detail(activeDetail);
  const primary = activeDetail.aliases.find(item => item.isPrimary); assert.equal(primary.aliasName, activeName); ctx.remember('customer.active.primary', primary.id);
  const initialWorkspace = await step(ctx, 'workspace.empty', 'GET', `/api/customers/${activeId}/workspace-overview`, {}, 200); workspace(initialWorkspace, activeId);
  assert.deepEqual(initialWorkspace.summary, { leadCount: 0, activeLeadCount: 0, convertedLeadCount: 0, projectCount: 0, activeProjectCount: 0, contractCount: 0, recentFollowUpCount: 0, recentDiscussionCount: 0, latestFollowUpAt: null, latestDiscussionAt: null });
  assert.deepEqual(initialWorkspace.recommendedActions.map(item => item.key), ['record-follow-up', 'capture-discussion']); assert.deepEqual(initialWorkspace.timeline, []);

  const all = await step(ctx, 'list', 'GET', '/api/customers', {}, 200); assert.ok(Array.isArray(all)); assert.ok(all.some(item => item.id === activeId));
  for (const item of all) { summary(item); for (const key of ['leadCount', 'projectCount', 'contractCount']) integer(item[key]); }
  for (let index = 1; index < all.length; index += 1) {
    const before = all[index - 1], after = all[index], time = Date.parse(before.updatedAt) - Date.parse(after.updatedAt);
    assert.ok(time >= 0); if (time === 0) assert.ok(Date.parse(before.createdAt) >= Date.parse(after.createdAt));
  }
  const filtered = await step(ctx, 'list.filter-known-and-strip-unknown', 'GET', `/api/customers?keyword=${encodeURIComponent(`  ${activeName}  `)}&status=active&ownerOrgId=${admin.orgId}&unknown=ignored`, {}, 200);
  assert.ok(filtered.some(item => item.id === activeId)); assert.ok(filtered.every(item => item.status === 'active' && item.ownerOrgId === admin.orgId));
  const inactiveList = await step(ctx, 'list.inactive', 'GET', '/api/customers?status=inactive', {}, 200); assert.ok(inactiveList.some(item => item.id === inactive.id)); assert.ok(inactiveList.every(item => item.status === 'inactive'));
  const spelled = await step(ctx, 'route.case-slash-uppercase-uuid', 'GET', `/api/CuStOmErS/${activeId.toUpperCase()}/AlIaSeS/`, {}, 200); assert.ok(spelled.some(item => item.id === primary.id));
  const heads = ['/api/customers', `/api/customers/${activeId}`, `/api/customers/${activeId}/aliases`, `/api/customers/${activeId}/workspace-overview`];
  for (const [index, route] of heads.entries()) assert.equal(await step(ctx, `head.${index}`, 'HEAD', route, {}, 200), null);
  await step(ctx, 'unsupported-method', 'PUT', `/api/customers/${activeId}`, { json: {} }, 404);

  const routes = [
    ['list', 'GET', '/api/customers', undefined], ['create', 'POST', '/api/customers', { displayName: ctx.name('denied-create') }],
    ['detail', 'GET', `/api/customers/${activeId}`, undefined], ['update', 'PATCH', `/api/customers/${activeId}`, { remark: ctx.name('denied-update') }],
    ['aliases', 'GET', `/api/customers/${activeId}/aliases`, undefined], ['alias-create', 'POST', `/api/customers/${activeId}/aliases`, { aliasName: ctx.name('denied-alias') }],
    ['workspace', 'GET', `/api/customers/${activeId}/workspace-overview`, undefined], ['alias-delete', 'DELETE', `/api/customer-aliases/${primary.id}`, undefined]
  ];
  for (const [label, method, route, json] of routes) {
    const options = json === undefined ? {} : { json };
    await step(ctx, `anonymous.${label}`, method, route, { ...options, actor: 'anonymous' }, 401);
    await step(ctx, `viewer.${label}`, method, route, { ...options, actor: 'viewer' }, method === 'GET' ? 200 : 403);
    if (method !== 'GET') await step(ctx, `csrf.${label}`, method, route, { ...options, csrf: false }, 403);
  }

  const invalidCreates = [
    ['empty', {}], ['null', null], ['array', []], ['name-number', { displayName: 17 }], ['name-empty', { displayName: ' \t\uFEFF' }],
    ['name-256-codepoints', { displayName: '😀'.repeat(256) }], ['legal-empty', { displayName: 'valid', legalName: ' ' }],
    ['short-129-codepoints', { displayName: 'valid', shortName: '😀'.repeat(129) }], ['source-65', { displayName: 'valid', sourceChannel: 'x'.repeat(65) }],
    ['remark-2001-codepoints', { displayName: 'valid', remark: '😀'.repeat(2001) }], ['user-uuid', { displayName: 'valid', ownerUserId: 'bad' }],
    ['org-uuid', { displayName: 'valid', ownerOrgId: 'bad' }], ['uuid-uppercase-max-sentinel', { displayName: 'valid', ownerOrgId: 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF' }]
  ];
  for (const [label, json] of invalidCreates) await step(ctx, `dto.create.${label}`, 'POST', '/api/customers', { json }, 400);
  const invalidUpdates = [['empty', {}], ['unknown-only', { expectedVersion: 1 }], ['name-null', { displayName: null }], ['status-null', { status: null }], ['status-merged', { status: 'merged' }], ['legal-empty', { legalName: ' ' }], ['user-uuid', { ownerUserId: 'bad' }], ['org-uuid', { ownerOrgId: 'bad' }], ['name-256-codepoints', { displayName: '😀'.repeat(256) }]];
  for (const [label, json] of invalidUpdates) await step(ctx, `dto.update.${label}`, 'PATCH', `/api/customers/${activeId}`, { json }, 400);
  const invalidAliases = [['empty', {}], ['name-null', { aliasName: null }], ['name-array', { aliasName: [] }], ['name-space', { aliasName: '\uFEFF\t ' }], ['type-null', { aliasName: 'valid', aliasType: null }], ['type-enum', { aliasName: 'valid', aliasType: 'primary' }], ['name-256-codepoints', { aliasName: '😀'.repeat(256) }]];
  for (const [label, json] of invalidAliases) await step(ctx, `dto.alias.${label}`, 'POST', `/api/customers/${activeId}/aliases`, { json }, 400);
  const invalidQueries = [['status', 'status=invalid'], ['org', 'ownerOrgId=bad'], ['empty-keyword', 'keyword=%20%20'], ['keyword-129-codepoints', `keyword=${encodeURIComponent('😀'.repeat(129))}`], ['repeated-status', 'status=active&status=inactive'], ['repeated-org', `ownerOrgId=${admin.orgId}&ownerOrgId=${admin.orgId}`], ['repeated-keyword', 'keyword=a&keyword=b']];
  for (const [label, query] of invalidQueries) await step(ctx, `dto.query.${label}`, 'GET', `/api/customers?${query}`, {}, 400);
  const boundary = await create(ctx, 'customer.unicode-boundary', '😀'.repeat(255), { legalName: '😀'.repeat(255), shortName: '😀'.repeat(128), sourceChannel: '😀'.repeat(64), remark: '😀'.repeat(2000), ownerUserId: null, ownerOrgId: null });
  assert.equal([...boundary.displayName].length, 255); assert.equal([...boundary.remark].length, 2000);
  const keywordBoundary = await step(ctx, 'dto.keyword-128-codepoints', 'GET', `/api/customers?keyword=${encodeURIComponent('😀'.repeat(128))}`, {}, 200); assert.ok(keywordBoundary.some(item => item.id === boundary.id));

  for (const [label, method, suffix, json] of [['detail', 'GET', '', undefined], ['workspace', 'GET', '/workspace-overview', undefined], ['aliases', 'GET', '/aliases', undefined], ['alias-create', 'POST', '/aliases', { aliasName: 'valid' }], ['update', 'PATCH', '', { remark: 'valid' }]]) {
    await step(ctx, `missing.${label}`, method, `/api/customers/${MISSING_CUSTOMER}${suffix}`, json === undefined ? {} : { json }, 404);
    await step(ctx, `invalid-id.${label}`, method, `/api/customers/not-a-uuid${suffix}`, json === undefined ? {} : { json }, 500);
  }
  await step(ctx, 'missing.alias-delete', 'DELETE', `/api/customer-aliases/${MISSING_ALIAS}`, {}, 404);
  await step(ctx, 'invalid-id.alias-delete-pipe', 'DELETE', '/api/customer-aliases/not-a-uuid', {}, 400);
  await step(ctx, 'missing.create-user', 'POST', '/api/customers', { json: { displayName: ctx.name('missing-user'), ownerUserId: MISSING_USER } }, 404);
  await step(ctx, 'missing.create-org', 'POST', '/api/customers', { json: { displayName: ctx.name('missing-org'), ownerOrgId: MISSING_ORG } }, 404);

  const ownerCustomer = await create(ctx, 'customer.owner-cases', ctx.name('customer-owner-cases'));
  const ownerId = ownerCustomer.id;
  const beforeUpperUser = await ctx.row('customer', ownerId);
  const upperUser = await step(ctx, 'owner.uppercase-user-canonical-noop', 'PATCH', `/api/customers/${ownerId}`, { json: { ownerUserId: admin.userId.toUpperCase() } }, 200);
  assert.equal(upperUser.ownerUserId, admin.userId); assert.equal(upperUser.rowVersion, beforeUpperUser.row_version); await unchanged(ctx, 'owner.uppercase-user-db-noop', 'customer', ownerId, beforeUpperUser);
  assert.equal(typeof upperUser.ownerOrgName, 'string');
  const upperOrg = admin.orgId.toUpperCase(); assert.notEqual(upperOrg, admin.orgId, 'Root actor org must contain letters to exercise UUID spelling');
  const orgCase = await step(ctx, 'owner.uppercase-org-response-vs-db', 'PATCH', `/api/customers/${ownerId}`, { json: { ownerOrgId: upperOrg } }, 200);
  const orgCaseRow = await ctx.row('customer', ownerId); assert.equal(orgCase.ownerOrgId, upperOrg); assert.equal(orgCase.ownerOrgName, null); assert.equal(orgCaseRow.owner_org_id, admin.orgId); assert.equal(orgCase.rowVersion, beforeUpperUser.row_version + 1); await ctx.observe('customers.owner.uppercase-org-db', orgCaseRow);
  const orgReload = await step(ctx, 'owner.uppercase-org-get-reload', 'GET', `/api/customers/${ownerId}`, {}, 200);
  assert.equal(orgReload.ownerOrgId, admin.orgId); assert.equal(orgReload.ownerOrgName, upperUser.ownerOrgName); assert.equal(orgReload.rowVersion, orgCase.rowVersion);
  let value = await step(ctx, 'owner.viewer-default-primary', 'PATCH', `/api/customers/${ownerId}`, { json: { ownerUserId: viewer.userId } }, 200);
  assert.equal(value.ownerUserId, viewer.userId); assert.equal(value.ownerOrgId, viewer.orgId ?? admin.orgId);
  value = await step(ctx, 'owner.explicit-org-null', 'PATCH', `/api/customers/${ownerId}`, { json: { ownerOrgId: null } }, 200); assert.equal(value.ownerUserId, viewer.userId); assert.equal(value.ownerOrgId, null);
  value = await step(ctx, 'owner.user-null-explicit-org', 'PATCH', `/api/customers/${ownerId}`, { json: { ownerUserId: null, ownerOrgId: admin.orgId } }, 200); assert.equal(value.ownerUserId, null); assert.equal(value.ownerOrgId, admin.orgId);
  value = await step(ctx, 'owner.user-null-retain-old-org', 'PATCH', `/api/customers/${ownerId}`, { json: { ownerUserId: null } }, 200); assert.equal(value.ownerUserId, null); assert.equal(value.ownerOrgId, admin.orgId);
  value = await step(ctx, 'owner.user-and-unrelated-org-allowed', 'PATCH', `/api/customers/${ownerId}`, { json: { ownerUserId: viewer.userId, ownerOrgId: admin.orgId } }, 200); assert.equal(value.ownerUserId, viewer.userId); assert.equal(value.ownerOrgId, admin.orgId);
  const ownerBeforeFailure = await ctx.row('customer', ownerId);
  await step(ctx, 'owner.name-before-missing-user-no-flush', 'PATCH', `/api/customers/${ownerId}`, { json: { displayName: ctx.name('not-persisted-user-failure'), ownerUserId: MISSING_USER } }, 404); await unchanged(ctx, 'owner.user-failure-no-customer-write', 'customer', ownerId, ownerBeforeFailure);
  await step(ctx, 'owner.name-before-missing-org-no-flush', 'PATCH', `/api/customers/${ownerId}`, { json: { displayName: ctx.name('not-persisted-org-failure'), ownerOrgId: MISSING_ORG } }, 404); await unchanged(ctx, 'owner.org-failure-no-customer-write', 'customer', ownerId, ownerBeforeFailure);
  const noopBefore = await ctx.row('customer', activeId);
  const noop = await step(ctx, 'update.noop-unknown-version-stripped', 'PATCH', `/api/customers/${activeId}`, { json: { displayName: activeName, expectedVersion: -999, rowVersion: 999, unknown: true } }, 200);
  assert.equal(noop.rowVersion, noopBefore.row_version); await unchanged(ctx, 'update.noop-db-unchanged', 'customer', activeId, noopBefore);
  const renamed = await step(ctx, 'update.rename-null-text', 'PATCH', `/api/customers/${ownerId}`, { json: { displayName: ctx.name('customer-owner-renamed'), legalName: null, shortName: null, sourceChannel: null, remark: null } }, 200); detail(renamed);
  assert.equal(renamed.aliases.find(item => item.isPrimary).aliasName, ownerCustomer.displayName);

  const beforeAliasWrites = await ctx.row('customer', activeId);
  const normalizationPrefix = ctx.name('alias-normalization');
  const normalized = await createAlias(ctx, 'customer.alias.normalized', activeId, `  ${normalizationPrefix}\t ΟΣ \n İ\u00A0`, { isPrimary: true, normalizedName: 'must-be-stripped' });
  assert.equal(normalized.aliasType, 'alias'); assert.equal(normalized.normalizedName, `${normalizationPrefix.toLocaleLowerCase()} ος i\u0307`);
  await step(ctx, 'alias.duplicate-normalized-type', 'POST', `/api/customers/${activeId}/aliases`, { json: { aliasName: normalized.normalizedName } }, 500);
  for (const type of ['legal-name', 'short-name', 'legacy-input', 'import-name']) await createAlias(ctx, `customer.alias.${type}`, activeId, normalized.normalizedName, { aliasType: type });
  await createAlias(ctx, 'customer.alias.other-customer', secondary.id, normalized.normalizedName);
  const aliasBoundary = await createAlias(ctx, 'customer.alias.unicode-boundary', secondary.id, '😀'.repeat(255)); assert.equal([...aliasBoundary.aliasName].length, 255);
  const aliasOnly = await createAlias(ctx, 'customer.alias.only-keyword', activeId, ctx.name('alias-not-a-customer-field'));
  const aliasKeyword = await step(ctx, 'list.does-not-search-aliases', 'GET', `/api/customers?keyword=${encodeURIComponent(aliasOnly.aliasName)}`, {}, 200); assert.ok(!aliasKeyword.some(item => item.id === activeId));
  await unchanged(ctx, 'alias-writes-do-not-touch-customer', 'customer', activeId, beforeAliasWrites);
  await step(ctx, 'alias.primary-protected', 'DELETE', `/api/customer-aliases/${primary.id}`, {}, 409);
  assert.equal(await step(ctx, 'alias.delete-204', 'DELETE', `/api/customer-aliases/${normalized.id}`, {}, 204), null);
  assert.equal(await ctx.row('customer_alias', normalized.id), null);
  await step(ctx, 'alias.repeated-delete-404', 'DELETE', `/api/customer-aliases/${normalized.id}`, {}, 404);
  const afterDeleteAliases = await step(ctx, 'alias.list-after-delete', 'GET', `/api/customers/${activeId}/aliases`, {}, 200); assert.ok(!afterDeleteAliases.some(item => item.id === normalized.id)); assert.ok(afterDeleteAliases.some(item => item.id === primary.id));
  const inactiveAlias = await createAlias(ctx, 'customer.inactive.alias', inactive.id, ctx.name('inactive-alias'));
  await step(ctx, 'inactive.alias-delete', 'DELETE', `/api/customer-aliases/${inactiveAlias.id}`, {}, 204);
  const editedInactive = await step(ctx, 'inactive.customer-edit', 'PATCH', `/api/customers/${inactive.id}`, { json: { remark: ctx.name('inactive-edit-allowed') } }, 200); assert.equal(editedInactive.status, 'inactive');

  // Native03: HTTP preserves isolated UTF-16 while pg encodes U+FFFD.
  const surrogateCustomer = await create(ctx, 'customer.surrogate', '\uD800', { ownerUserId: null }); assert.equal(surrogateCustomer.displayName, '\uD800');
  const surrogateRow = await ctx.row('customer', surrogateCustomer.id); assert.equal(surrogateRow.display_name, '\uFFFD'); await ctx.observe('customers.surrogate.customer-db', surrogateRow);
  const surrogateGet = await step(ctx, 'surrogate.customer-read-stored-replacement', 'GET', `/api/customers/${surrogateCustomer.id}`, {}, 200); assert.equal(surrogateGet.displayName, '\uFFFD');
  const beforeSurrogateAlias = await ctx.row('customer', activeId);
  const surrogateAlias = await createAlias(ctx, 'customer.alias.surrogate', activeId, '\uD800'); assert.equal(surrogateAlias.aliasName, '\uD800'); assert.equal(surrogateAlias.normalizedName, '\uD800');
  const surrogateAliasRow = await ctx.row('customer_alias', surrogateAlias.id); assert.equal(surrogateAliasRow.alias_name, '\uFFFD'); assert.equal(surrogateAliasRow.normalized_name, '\uFFFD'); await ctx.observe('customers.surrogate.alias-db', surrogateAliasRow);
  await unchanged(ctx, 'surrogate.alias-does-not-touch-customer', 'customer', activeId, beforeSurrogateAlias);

  const merged = await create(ctx, 'customer.merged-preparation', ctx.name('customer-merged-protection'));
  const mergedAlias = await createAlias(ctx, 'customer.merged-preparation.alias', merged.id, ctx.name('merged-nonprimary'));
  const mergedDetail = await step(ctx, 'merged.detail-before-preparation', 'GET', `/api/customers/${merged.id}`, {}, 200);
  const mergedPrimary = mergedDetail.aliases.find(item => item.isPrimary); ctx.remember('customer.merged-preparation.primary', mergedPrimary.id);
  const mergedBefore = await ctx.mutate('customer', merged.id, { status: 'merged' });
  try {
    const readMerged = await step(ctx, 'merged.read-allowed', 'GET', `/api/customers/${merged.id}`, {}, 200); assert.equal(readMerged.status, 'merged');
    await step(ctx, 'merged.update-rejected', 'PATCH', `/api/customers/${merged.id}`, { json: { remark: 'blocked' } }, 400);
    await step(ctx, 'merged.alias-create-rejected', 'POST', `/api/customers/${merged.id}/aliases`, { json: { aliasName: 'blocked' } }, 400);
    await step(ctx, 'merged.nonprimary-delete-rejected', 'DELETE', `/api/customer-aliases/${mergedAlias.id}`, {}, 409);
    const primaryConflict = await step(ctx, 'merged.primary-check-before-status', 'DELETE', `/api/customer-aliases/${mergedPrimary.id}`, {}, 409); assert.match(primaryConflict.message, /^Primary customer alias /);
  } finally { await ctx.restore('customer', merged.id, mergedBefore); }

  const wildcardPrefix = ctx.name('customer-wildcard');
  const wildcardA = await create(ctx, 'customer.wildcard.a', `${wildcardPrefix} A`), wildcardB = await create(ctx, 'customer.wildcard.b', `${wildcardPrefix} B`);
  const wildcardList = await step(ctx, 'list.ilike-underscore-percent-retained', 'GET', `/api/customers?keyword=${encodeURIComponent(`${wildcardPrefix} _%`)}`, {}, 200); assert.ok(wildcardList.some(item => item.id === wildcardA.id)); assert.ok(wildcardList.some(item => item.id === wildcardB.id));
  for (const logical of ['customer.active', 'customer.secondary']) { const final = await step(ctx, `${logical}.final-active-binding`, 'GET', `/api/customers/${ctx.id(logical)}`, {}, 200); assert.equal(final.status, 'active'); }
  await ctx.observe('customers.project-consumer-bindings', { active: ctx.id('customer.active'), secondary: ctx.id('customer.secondary'), inactive: ctx.id('customer.inactive'), creation: 'actual HTTP, not prepared-source' });
}

export const customerPreparedRequirements = Object.freeze([
  { kind: 'customer-owner-reference-set', requestFields: ['label'], responseFields: ['inactiveUser.userId', 'inactiveUser.orgId', 'inactiveUser.isActive=false', 'inactiveOrgId', 'inactiveOrgIsActive=false', 'noPrimaryUser.userId', 'noPrimaryUser.orgId=null'], control: 'Genuine Root-owned persisted platform references, not stand-ins or fabricated permission decisions. Returned flags must be actual persisted views; no credentials in the returned view.' },
  { kind: 'customer-workspace-facts', requestFields: ['customerId', 'outsideCustomerId', 'ownerUserId', 'ownerOrgId', 'sourceKind=prepared-source', 'leads[]', 'projects[]', 'contracts[]', 'followUps[]', 'discussions[]', 'optional per-item customerId overrides the default customerId'], responseFields: ['sourceKind=prepared-source', 'ids keyed by every requested key; discussion keys map to comment IDs, not thread IDs'], control: 'Root fills mandatory schema fields from current authority, resolves convertedProjectKey/projectKey references and tracks cleanup. Discussion threads use their item customerId and customer target identity. One newer outside-customer fact in each domain proves isolation. Does not certify Rust lead/contract/follow-up/discussion producers.' }
]);

export async function runCustomerPrepared(ctx) {
  assert.equal(typeof ctx.prepare, 'function', 'Root must explicitly supply registered preparation recipes');
  const admin = ctx.actor('admin');
  const refs = await ctx.prepare('customer-owner-reference-set', { label: ctx.name('customer-owner-references') });
  uuid(refs.inactiveUser.userId); nullableUuid(refs.inactiveUser.orgId); uuid(refs.inactiveOrgId); uuid(refs.noPrimaryUser.userId); assert.equal(refs.noPrimaryUser.orgId, null); assert.equal(refs.inactiveUser.isActive, false); assert.equal(refs.inactiveOrgIsActive, false);
  const inactiveOwner = await create(ctx, 'customer.prepared.inactive-owner', ctx.name('inactive-owner-allowed'), { ownerUserId: refs.inactiveUser.userId, ownerOrgId: refs.inactiveOrgId });
  assert.equal(inactiveOwner.ownerUserId, refs.inactiveUser.userId); assert.equal(inactiveOwner.ownerOrgId, refs.inactiveOrgId);
  const fallback = await create(ctx, 'customer.prepared.no-primary-fallback', ctx.name('no-primary-fallback'), { ownerOrgId: admin.orgId });
  const updated = await step(ctx, 'prepared.no-primary-user-retains-old-org', 'PATCH', `/api/customers/${fallback.id}`, { json: { ownerUserId: refs.noPrimaryUser.userId } }, 200); assert.equal(updated.ownerUserId, refs.noPrimaryUser.userId); assert.equal(updated.ownerOrgId, admin.orgId);

  const projected = await create(ctx, 'customer.prepared.workspace', ctx.name('workspace-real-multidomain-read'));
  const outside = await create(ctx, 'customer.prepared.outside', ctx.name('workspace-isolation-control'));
  const stamp = index => `2026-06-15T${String(12 - index).padStart(2, '0')}:00:00.000Z`;
  const projects = Array.from({ length: 7 }, (_, index) => ({ key: `project.${index}`, projectName: ctx.name(`workspace-project-${index}`), status: ['active', 'pending-approval', 'blocked', 'on-hold', 'active', 'pending-approval', 'completed'][index], currentStage: 'assessment', updatedAt: stamp(index), createdAt: '2026-06-01T00:00:00.000Z', plannedSignAt: index === 0 ? null : stamp(index) }));
  const leads = Array.from({ length: 8 }, (_, index) => ({ key: `lead.${index}`, leadName: ctx.name(`workspace-lead-${index}`), status: index === 7 ? 'converted' : index % 2 === 0 ? 'registered' : 'qualified', rating: index === 0 ? 'A' : 'B', urgency: index === 0 ? 'high' : 'normal', convertedProjectKey: index >= 6 ? 'project.0' : null, updatedAt: stamp(index), createdAt: '2026-06-01T00:00:00.000Z' }));
  const contracts = Array.from({ length: 7 }, (_, index) => ({ key: `contract.${index}`, projectKey: index === 6 ? 'project.6' : 'project.0', status: ['draft', 'pending-review', 'active', 'terminated', 'completed', 'active', 'active'][index], customerContractNo: index === 0 ? null : ctx.name(`customer-contract-${index}`), signedAt: index === 0 ? null : stamp(index), signedAmount: '123.45', updatedAt: stamp(index), createdAt: '2026-06-01T00:00:00.000Z' }));
  const followUps = Array.from({ length: 8 }, (_, index) => ({ key: `follow-up.${index}`, summary: ctx.name(`workspace-follow-up-${index}`), status: index === 7 ? 'voided' : 'active', occurredAt: stamp(index), nextFollowUpAt: index === 0 ? null : '2026-06-16T00:00:00.000Z', createdAt: '2026-06-01T00:00:00.000Z' }));
  const discussions = Array.from({ length: 7 }, (_, index) => ({ key: `discussion.${index}`, body: ctx.name(`workspace-discussion-${index}`), isKeyConclusion: index === 0, createdAt: stamp(index), targetObjectType: 'customer', targetTitle: projected.displayName }));
  const newer = '2026-06-16T12:00:00.000Z';
  projects.push({ ...projects[0], key: 'project.outside', customerId: outside.id, projectName: ctx.name('outside-project'), updatedAt: newer });
  leads.push({ ...leads[0], key: 'lead.outside', customerId: outside.id, leadName: ctx.name('outside-lead'), updatedAt: newer });
  contracts.push({ ...contracts[0], key: 'contract.outside', customerId: outside.id, projectKey: 'project.outside', updatedAt: newer });
  followUps.push({ ...followUps[0], key: 'follow-up.outside', customerId: outside.id, summary: ctx.name('outside-follow-up'), occurredAt: newer });
  discussions.push({ ...discussions[0], key: 'discussion.outside', customerId: outside.id, targetTitle: outside.displayName, body: ctx.name('outside-discussion'), createdAt: newer });
  const request = { customerId: projected.id, outsideCustomerId: outside.id, ownerUserId: admin.userId, ownerOrgId: admin.orgId, sourceKind: 'prepared-source', projects, leads, contracts, followUps, discussions };
  const prepared = await ctx.prepare('customer-workspace-facts', request); assert.equal(prepared.sourceKind, 'prepared-source');
  for (const item of [...projects, ...leads, ...contracts, ...followUps, ...discussions]) { uuid(prepared.ids[item.key]); ctx.remember(`customer.prepared.${item.key}`, prepared.ids[item.key]); }
  await ctx.observe('customers.prepared-source-origin', { sourceKind: prepared.sourceKind, customerId: projected.id, ids: prepared.ids });
  const beforeCustomer = await ctx.row('customer', projected.id), beforeProject = await ctx.row('project', prepared.ids['project.0']);
  const view = await step(ctx, 'prepared.workspace-all-domains', 'GET', `/api/customers/${projected.id}/workspace-overview`, {}, 200); workspace(view, projected.id);
  assert.deepEqual(view.summary, { leadCount: 8, activeLeadCount: 7, convertedLeadCount: 2, projectCount: 7, activeProjectCount: 6, contractCount: 7, recentFollowUpCount: 7, recentDiscussionCount: 7, latestFollowUpAt: stamp(0), latestDiscussionAt: stamp(0) });
  for (const [field, prefix] of [['activeLeads', 'lead'], ['activeProjects', 'project'], ['recentContracts', 'contract'], ['recentFollowUps', 'follow-up'], ['recentDiscussions', 'discussion']]) assert.deepEqual(view[field].map(item => item.id), Array.from({ length: 5 }, (_, index) => prepared.ids[`${prefix}.${index}`]));
  assert.equal(view.activeProjects[0].plannedSignAt, null); assert.equal(view.recentContracts[0].customerContractNo, null); assert.equal(view.recentContracts[0].signedAt, null); assert.equal(view.recentFollowUps[0].nextFollowUpAt, null);
  assert.deepEqual(view.recommendedActions.map(item => item.key), ['review-active-leads', 'advance-active-projects', 'review-recent-contracts', 'record-follow-up', 'capture-discussion']);
  assert.equal(view.recommendedActions[0].targetObjectId, prepared.ids['lead.0']); assert.equal(view.recommendedActions[1].targetObjectId, prepared.ids['project.0']); assert.equal(view.recommendedActions[2].targetObjectId, prepared.ids['contract.0']);
  assert.equal(view.recommendedActions[0].description, '当前有 7 条活跃线索需要推进，优先查看最近更新的线索。');
  const expectedTimeline = [0, 1].flatMap(index => ['lead', 'project', 'contract', 'follow-up', 'discussion'].map(prefix => `${prefix}:${prepared.ids[`${prefix}.${index}`]}`));
  expectedTimeline.push(`lead:${prepared.ids['lead.2']}`, `project:${prepared.ids['project.2']}`); assert.deepEqual(view.timeline.map(item => item.key), expectedTimeline);
  assert.equal(view.timeline[0].isKey, true); assert.equal(view.timeline[3].isKey, false); assert.equal(view.timeline[4].isKey, true);
  const preparedDetail = await step(ctx, 'prepared.customer-counts', 'GET', `/api/customers/${projected.id}`, {}, 200); assert.equal(preparedDetail.leadCount, 8); assert.equal(preparedDetail.projectCount, 7); assert.equal(preparedDetail.contractCount, 7);
  const viewerView = await step(ctx, 'prepared.viewer-workspace', 'GET', `/api/customers/${projected.id}/workspace-overview`, { actor: 'viewer' }, 200); workspace(viewerView, projected.id); assert.deepEqual(viewerView.summary, view.summary);
  await unchanged(ctx, 'prepared.read-does-not-touch-customer', 'customer', projected.id, beforeCustomer); await unchanged(ctx, 'prepared.read-does-not-touch-project', 'project', prepared.ids['project.0'], beforeProject);
}

// Optional original UI template. Root provides a fresh owned browser context,
// baseUrl/name/remember/observe and synthetic username/password only in memory.
// No credentials, auth response bodies or cookies are observed or written here.
export async function customerUi(page, ctx) {
  assert.equal(typeof ctx.username, 'string'); assert.equal(typeof ctx.password, 'string');
  const origin = new URL(ctx.baseUrl ?? page.url()).origin;
  await page.goto(`${origin}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('用户名', { exact: true }).fill(ctx.username); await page.getByLabel('密码', { exact: true }).fill(ctx.password);
  const login = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/sessions' && response.request().method() === 'POST');
  await page.getByRole('button', { name: '登录', exact: true }).click(); assert.equal((await login).status(), 200);
  await page.goto(`${origin}/customers`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '新建客户', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '新建客户', exact: true }), name = ctx.name('customer-ui-create');
  await dialog.locator('#customerDisplayName').fill(name); await dialog.locator('#customerLegalName').fill(ctx.name('customer-ui-legal'));
  const overview = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/workspace-overview') && response.request().method() === 'GET');
  const creation = page.waitForResponse(response => new URL(response.url()).pathname === '/api/customers' && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: '创建', exact: true }).click();
  const createResponse = await creation; assert.equal(createResponse.status(), 201); const customer = await createResponse.json(); summary(customer, true); ctx.remember('customer.ui', customer.id); await ctx.observe('customers.ui.create-response', customer);
  await page.waitForURL(url => url.pathname === `/customers/${customer.id}`);
  const overviewResponse = await overview; assert.equal(overviewResponse.status(), 200); const overviewBody = await overviewResponse.json(); workspace(overviewBody, customer.id); await ctx.observe('customers.ui.workspace-response', overviewBody);
  const aliasName = ctx.name('customer-ui-alias'); await page.getByPlaceholder('新增别名', { exact: true }).fill(aliasName);
  const addition = page.waitForResponse(response => new URL(response.url()).pathname === `/api/customers/${customer.id}/aliases` && response.request().method() === 'POST');
  await page.getByRole('button', { name: '添加', exact: true }).click(); const additionResponse = await addition; assert.equal(additionResponse.status(), 201); const added = await additionResponse.json(); alias(added); ctx.remember('customer.ui.alias', added.id); await ctx.observe('customers.ui.alias-response', added);
  const removeButton = page.getByRole('button', { name: `删除客户别名 ${aliasName}`, exact: true }); await removeButton.waitFor({ state: 'visible' });
  assert.equal(await page.getByRole('button', { name: `删除客户别名 ${name}`, exact: true }).count(), 0);
  await removeButton.click(); await page.getByText(`确定删除客户别名“${aliasName}”吗？删除后不再用于客户名称匹配，操作不可撤销。`, { exact: true }).waitFor({ state: 'visible' });
  const deletion = page.waitForResponse(response => new URL(response.url()).pathname === `/api/customer-aliases/${added.id}` && response.request().method() === 'DELETE');
  await page.getByRole('button', { name: '删除', exact: true }).click(); const deleted = await deletion; assert.equal(deleted.status(), 204); assert.equal(await deleted.text(), ''); await removeButton.waitFor({ state: 'detached' });
  await ctx.observe('customers.ui.alias-deletion', { aliasId: added.id, status: deleted.status(), responseText: '' });
  await page.getByRole('button', { name: '编辑客户', exact: true }).click(); const editDialog = page.getByRole('dialog', { name: '编辑客户', exact: true }), editedName = ctx.name('customer-ui-edited'); await editDialog.locator('#customerDisplayName').fill(editedName);
  const saving = page.waitForResponse(response => new URL(response.url()).pathname === `/api/customers/${customer.id}` && response.request().method() === 'PATCH');
  await editDialog.getByRole('button', { name: '保存', exact: true }).click(); const saved = await saving; assert.equal(saved.status(), 200); const savedBody = await saved.json(); assert.equal(savedBody.displayName, editedName); assert.equal(savedBody.aliases.find(item => item.isPrimary).aliasName, name); assert.ok(savedBody.aliases.every(item => item.id !== added.id)); await ctx.observe('customers.ui.edit-response', savedBody);
  const listing = page.waitForResponse(response => new URL(response.url()).pathname === '/api/customers' && response.request().method() === 'GET');
  await page.getByRole('button', { name: '返回客户列表', exact: true }).click(); const listed = await listing; assert.equal(listed.status(), 200); const listBody = await listed.json(); assert.ok(listBody.some(item => item.id === customer.id && item.displayName === editedName)); await ctx.observe('customers.ui.list-after-edit', listBody);
  await page.getByPlaceholder('搜索客户、编号、主责', { exact: true }).fill(editedName); await page.getByRole('button', { name: editedName, exact: true }).waitFor({ state: 'visible' });
}
