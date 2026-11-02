// Pure Root-hook preparation definitions; never executed by the B author.
// Authority: actual new PG15 catalog e7bd997e35b2565fc8c4faf28f23f94e2874a19be2d0d9f2eb76408fb8da748a
// and the unchanged corresponding Native entities/migrations. These are finite
// prepared-source rows for project reads, not successful domain producers.
import assert from 'node:assert/strict';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREPARED_AT = '2026-04-01T10:00:00.000Z';
const KINDS = Object.freeze([
  'project.contract', 'project.source-lead', 'project.bid',
  'project.approval-snapshot', 'project.owner-user', 'project.owner-org',
]);

export function canPrepare(kind) {
  return KINDS.includes(kind);
}

function shape(fields, required) {
  assert(fields && typeof fields === 'object' && !Array.isArray(fields), 'prepared fields must be an object');
  assert.deepEqual(Object.keys(fields).sort(), [...required].sort(), 'finite prepared-source field set; do not invent or silently drop columns');
}

function text(value, name, max) {
  assert.equal(typeof value, 'string', `${name}: explicit text required`);
  assert(value.length > 0, `${name}: empty prepared text`);
  if (max !== undefined) assert(Array.from(value).length <= max, `${name}: exceeds original column length ${max}`);
  return value;
}

function uuid(value, name) {
  assert.equal(typeof value, 'string', `${name}: explicit UUID required`);
  assert.match(value, UUID, `${name}: UUID`);
  return value;
}

function nullableUuid(value, name) {
  return value === null ? null : uuid(value, name);
}

function timestamp(value, name) {
  assert.equal(typeof value, 'string', `${name}: explicit timestamp required`);
  assert.equal(new Date(value).toISOString(), value, `${name}: explicit UTC ISO milliseconds`);
  return value;
}

function member(value, values, name) {
  assert(values.includes(value), `${name}: not an original declared state`);
  return value;
}

function boolean(value, name) {
  assert.equal(typeof value, 'boolean', `${name}: explicit boolean required`);
  return value;
}

async function selectOne(ctx, table, id) {
  uuid(id, `${table}.id`);
  const rows = await ctx.select(table, { id });
  assert(Array.isArray(rows), `${table}: Root select must return actual rows`);
  assert.equal(rows.length, 1, `${table}: referenced actual row must already exist`);
  assert.equal(rows[0].id.toLowerCase(), id.toLowerCase());
  return rows[0];
}

async function freshId(ctx) {
  return uuid(await ctx.newId(), 'Root newId');
}

async function auditColumns(ctx, createdAt = PREPARED_AT, updatedAt = createdAt) {
  const actor = await ctx.actor('admin');
  uuid(actor.userId, 'actual preparation actor');
  // These audit/version columns exist on each of the seven exact tables used
  // below. No reflective generic default filler or product command is used.
  return {
    created_at: timestamp(createdAt, 'createdAt'), created_by: actor.userId,
    updated_at: timestamp(updatedAt, 'updatedAt'), updated_by: actor.userId, row_version: 1,
  };
}

function result(table, id, row, extra = {}) {
  assert(row && typeof row === 'object' && !Array.isArray(row), `${table}: Root insert must return the real RETURNING row`);
  assert.equal(uuid(row.id, `${table} RETURNING id`).toLowerCase(), id.toLowerCase());
  return { id: row.id, table, sourceClassification: 'prepared-source; no successful domain-producer claim', row, ...extra };
}

async function contract(ctx, fields) {
  shape(fields, ['projectId', 'contractNo', 'status', 'signedAmount', 'currencyCode', 'signedAt', 'currentSnapshotId', 'createdAt', 'updatedAt']);
  await selectOne(ctx, 'project', fields.projectId);
  // The B case explicitly reads an unversioned prepared contract. This helper
  // does not fabricate a contract_term_snapshot FK or certify R4 versioning.
  assert.equal(fields.currentSnapshotId, null, 'this finite contract fixture requires currentSnapshotId null');
  assert.equal(typeof fields.signedAmount, 'string', 'decimal input stays text');
  assert.match(fields.signedAmount, /^\d{1,16}\.\d{2}$/, 'explicit numeric(18,2) fixture amount; no Number conversion or rounding');
  const id = await freshId(ctx);
  const row = await ctx.insert('contract', {
    id, project_id: fields.projectId, contract_no: text(fields.contractNo, 'contractNo', 64),
    status: member(fields.status, ['draft', 'pending-review', 'active', 'terminated', 'completed'], 'contract.status'),
    signed_amount: fields.signedAmount, currency_code: text(fields.currencyCode, 'currencyCode', 16),
    current_snapshot_id: null, signed_at: fields.signedAt === null ? null : timestamp(fields.signedAt, 'signedAt'),
    retention_due_date: null, customer_contract_no: null,
    ...await auditColumns(ctx, fields.createdAt, fields.updatedAt),
  });
  return result('contract', id, row);
}

async function sourceLead(ctx, fields) {
  shape(fields, ['customerId', 'customerName', 'leadNo', 'leadName', 'sourceCode', 'status']);
  const customer = await selectOne(ctx, 'customer', fields.customerId);
  assert.equal(fields.customerName, customer.display_name, 'fixture customer name comes from its actual A producer');
  const actor = await ctx.actor('admin');
  const status = member(fields.status, ['registered', 'qualified', 'converted', 'closed'], 'lead.status');
  const projectId = status === 'converted' ? ctx.id('project.active') : null;
  if (projectId !== null) await selectOne(ctx, 'project', projectId);
  if (actor.orgId != null) await selectOne(ctx, 'org_unit', actor.orgId);
  const id = await freshId(ctx);
  const row = await ctx.insert('lead', {
    id, lead_no: text(fields.leadNo, 'leadNo', 64), lead_name: text(fields.leadName, 'leadName', 255),
    customer_id: fields.customerId, customer_name: text(fields.customerName, 'customerName', 255),
    // Actual catalog: source_code is required opaque varchar without an FK.
    // Its explicit supplied marker is a prepared read fact, not a Lead API.
    source_code: text(fields.sourceCode, 'sourceCode', 64), status,
    owner_org_id: actor.orgId ?? null, owner_user_id: actor.userId,
    qualification_summary: ['qualified', 'converted'].includes(status) ? 'R3AB prepared-source qualification fact' : null,
    qualified_at: ['qualified', 'converted'].includes(status) ? PREPARED_AT : null,
    qualified_by: ['qualified', 'converted'].includes(status) ? actor.userId : null,
    closed_reason: status === 'closed' ? 'R3AB prepared-source close fact' : null,
    closed_at: status === 'closed' ? PREPARED_AT : null,
    closed_by: status === 'closed' ? actor.userId : null,
    converted_project_id: projectId,
    converted_at: status === 'converted' ? PREPARED_AT : null,
    converted_by: status === 'converted' ? actor.userId : null,
    demand_description: null, budget_status: 'unknown', estimated_amount: null,
    urgency: 'normal', expected_decision_date: null, score: 0, rating: 'D',
    score_reason: '暂无有效评分事实', score_updated_at: PREPARED_AT,
    ...await auditColumns(ctx),
  });
  return result('lead', id, row);
}

async function bid(ctx, fields) {
  shape(fields, ['projectId', 'version', 'isCurrent', 'status', 'currentStage', 'resultStatus', 'processSummary', 'tenderNo', 'bidPackageNo', 'bidMode', 'decision', 'effectiveAt', 'createdAt', 'updatedAt']);
  await selectOne(ctx, 'project', fields.projectId);
  assert(Number.isInteger(fields.version) && fields.version > 0 && fields.version <= 2147483647, 'explicit positive int4 bid version');
  boolean(fields.isCurrent, 'isCurrent');
  member(fields.status, ['effective', 'superseded'], 'bid.status');
  assert.equal(fields.isCurrent, fields.status === 'effective', 'finite fixture uses coherent current/effective or historical/superseded pair');
  if (fields.isCurrent) {
    // The original entity/migration has a partial unique current-project index
    // in addition to the catalog's (project_id,version) unique constraint.
    const current = await ctx.select('project_bid_commercial_process', { project_id: fields.projectId, is_current: true });
    assert.equal(current.length, 0, 'do not bypass or silently replace an existing current bid');
  }
  const id = await freshId(ctx);
  const row = await ctx.insert('project_bid_commercial_process', {
    id, project_id: fields.projectId, version: fields.version, is_current: fields.isCurrent, supersedes_id: null, status: fields.status,
    bid_mode: member(fields.bidMode, ['public-tender', 'invitation', 'comparison', 'commercial-negotiation', 'competitive-negotiation', 'direct-commercial', 'not-required'], 'bidMode'),
    current_stage: member(fields.currentStage, ['not-started', 'preparation', 'submitted', 'negotiating', 'result-confirmed', 'closed'], 'bid.currentStage'),
    decision: member(fields.decision, ['pending', 'participate', 'no-bid', 'not-required'], 'bid.decision'),
    result_status: member(fields.resultStatus, ['pending', 'won', 'lost', 'cancelled', 'not-applicable'], 'bid.resultStatus'),
    process_summary: text(fields.processSummary, 'processSummary'), decision_summary: null, result_summary: null,
    tender_no: fields.tenderNo === null ? null : text(fields.tenderNo, 'tenderNo', 128),
    bid_package_no: fields.bidPackageNo === null ? null : text(fields.bidPackageNo, 'bidPackageNo', 128),
    owner_role: null, blocker_count: 0, effective_at: timestamp(fields.effectiveAt, 'effectiveAt'),
    ...await auditColumns(ctx, fields.createdAt, fields.updatedAt),
  });
  return result('project_bid_commercial_process', id, row);
}

async function snapshot(ctx, fields) {
  shape(fields, ['targetType', 'targetId', 'approvalScenarioKey', 'summaryPackageKey', 'projectionLevel', 'exportPolicy', 'businessStatusAtSnapshot', 'status', 'generatedAt', 'createdAt']);
  assert.equal(fields.targetType, 'project', 'this fixture kind prepares only project detail reads');
  await selectOne(ctx, 'project', fields.targetId);
  text(fields.approvalScenarioKey, 'approvalScenarioKey', 128);
  text(fields.summaryPackageKey, 'summaryPackageKey', 64);
  text(fields.projectionLevel, 'projectionLevel', 32);
  text(fields.exportPolicy, 'exportPolicy', 32);
  member(fields.businessStatusAtSnapshot, ['active', 'pending-approval', 'blocked', 'on-hold', 'completed', 'closed'], 'businessStatusAtSnapshot');
  member(fields.status, ['active', 'superseded', 'voided'], 'snapshot.status');
  if (fields.status === 'active') {
    const existing = await ctx.select('approval_summary_snapshot', { target_type: fields.targetType, target_id: fields.targetId, approval_scenario_key: fields.approvalScenarioKey, projection_level: fields.projectionLevel, status: 'active' });
    assert.equal(existing.length, 0, 'do not bypass the original partial unique active-snapshot index');
  }
  const definitions = await ctx.select('approval_summary_package_definition', { approval_scenario_key: fields.approvalScenarioKey, summary_package_key: fields.summaryPackageKey });
  assert(definitions.length <= 1, 'actual unique scenario/package definition');
  let definition;
  let packageCreated = false;
  if (definitions.length === 1) {
    definition = definitions[0];
    assert.equal(definition.projection_level, fields.projectionLevel, 'existing required package must match; never overwrite it');
    assert.equal(definition.export_policy, fields.exportPolicy, 'existing required package must match; never overwrite it');
    assert.equal(definition.status, 'active');
    uuid(definition.id, 'existing required package');
  } else {
    const packageId = await freshId(ctx);
    definition = await ctx.insert('approval_summary_package_definition', {
      id: packageId, approval_scenario_key: fields.approvalScenarioKey, summary_package_key: fields.summaryPackageKey,
      projection_level: fields.projectionLevel, export_policy: fields.exportPolicy,
      field_rule_version: 'r3ab-prepared-source-v1', status: 'active',
      ...await auditColumns(ctx, fields.createdAt),
    });
    assert.equal(definition.id.toLowerCase(), packageId.toLowerCase());
    packageCreated = true;
  }
  await ctx.remember(`project.prepared.package.${fields.approvalScenarioKey}.${fields.summaryPackageKey}`, definition.id);
  const id = await freshId(ctx);
  const row = await ctx.insert('approval_summary_snapshot', {
    id, target_type: fields.targetType, target_id: fields.targetId, approval_scenario_key: fields.approvalScenarioKey,
    summary_package_id: definition.id, summary_package_key: fields.summaryPackageKey,
    projection_level: fields.projectionLevel, export_policy: fields.exportPolicy,
    business_status_at_snapshot: fields.businessStatusAtSnapshot,
    generated_at: timestamp(fields.generatedAt, 'generatedAt'), status: fields.status, supersedes_id: null,
    ...await auditColumns(ctx, fields.createdAt),
  });
  return result('approval_summary_snapshot', id, row, { summaryPackageId: definition.id, summaryPackageCreated: packageCreated });
}

async function ownerUser(ctx, fields) {
  shape(fields, ['username', 'displayName', 'isActive', 'primaryOrgUnitId']);
  const primaryOrg = nullableUuid(fields.primaryOrgUnitId, 'primaryOrgUnitId');
  if (primaryOrg !== null) await selectOne(ctx, 'org_unit', primaryOrg);
  boolean(fields.isActive, 'isActive');
  const username = text(fields.username, 'username', 64);
  const existing = await ctx.select('platform_user', { username });
  assert.equal(existing.length, 0, 'prepared user must be new; no overwrite or retry');
  const id = await freshId(ctx);
  const row = await ctx.insert('platform_user', {
    id, username, display_name: text(fields.displayName, 'displayName', 128),
    email: null, phone: null, avatar_url: null, email_verified: false, phone_verified: false,
    is_active: fields.isActive, primary_org_unit_id: primaryOrg, last_login_at: null,
    ...await auditColumns(ctx),
  });
  // A real platform_user reference, without a fabricated credential, role,
  // session or assertion that a migrated user-create command was executed.
  return result('platform_user', id, row);
}

async function ownerOrg(ctx, fields) {
  shape(fields, ['name', 'code', 'isActive', 'parentId', 'displayOrder']);
  const parent = nullableUuid(fields.parentId, 'parentId');
  if (parent !== null) await selectOne(ctx, 'org_unit', parent);
  boolean(fields.isActive, 'isActive');
  assert(Number.isInteger(fields.displayOrder) && fields.displayOrder >= -2147483648 && fields.displayOrder <= 2147483647, 'explicit int4 displayOrder');
  const code = text(fields.code, 'code', 64);
  const existing = await ctx.select('org_unit', { code });
  assert.equal(existing.length, 0, 'prepared org must be new; no overwrite or retry');
  const id = await freshId(ctx);
  assert.notEqual(parent, id, 'original parent-not-self CHECK');
  const row = await ctx.insert('org_unit', {
    id, name: text(fields.name, 'org.name', 128), code, description: null,
    parent_id: parent, is_active: fields.isActive, display_order: fields.displayOrder,
    ...await auditColumns(ctx),
  });
  // The original sibling-name-ci index remains enabled and will reject any
  // collision at the real insert; there is no alternate-name retry.
  return result('org_unit', id, row);
}

export async function prepareProject(ctx, kind, fields) {
  assert(canPrepare(kind), `unsupported project prepared-source kind: ${String(kind)}`);
  switch (kind) {
    case 'project.contract': return contract(ctx, fields);
    case 'project.source-lead': return sourceLead(ctx, fields);
    case 'project.bid': return bid(ctx, fields);
    case 'project.approval-snapshot': return snapshot(ctx, fields);
    case 'project.owner-user': return ownerUser(ctx, fields);
    case 'project.owner-org': return ownerOrg(ctx, fields);
    default: throw new Error('unreachable finite project prepared-source kind');
  }
}
