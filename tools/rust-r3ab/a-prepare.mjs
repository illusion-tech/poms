// Preparation definitions only. No imports, driver, SQL, network, filesystem,
// environment access, transaction lifecycle, constraint bypass, or auto-run.
// Every effect is delegated to Root's registered hooks at explicit invocation.
const SOURCE_KIND = 'prepared-source';
const BASE_TIME = '2026-06-01T00:00:00.000Z';
const CATALOG_SHA256 = 'e7bd997e35b2565fc8c4faf28f23f94e2874a19be2d0d9f2eb76408fb8da748a';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ['customer-owner-reference-set', 'customer-workspace-facts'];
const PROJECT_STATUSES = ['active', 'pending-approval', 'blocked', 'on-hold', 'completed', 'closed'];
const PROJECT_STAGES = ['assessment', 'scope-confirmation', 'commercial-closure', 'contracting', 'handover', 'execution', 'acceptance', 'completed', 'closed-lost', 'closed-terminated'];
const LEAD_STATUSES = ['registered', 'qualified', 'converted', 'closed'];
const RATINGS = ['A', 'B', 'C', 'D'];
const URGENCIES = ['low', 'normal', 'high', 'critical'];
const CONTRACT_STATUSES = ['draft', 'pending-review', 'active', 'terminated', 'completed'];
const DISCUSSION_TYPES = ['intelligence-supplement', 'decision-chain', 'competition', 'strategy', 'risk', 'general'];
const FOLLOW_UP_OUTCOMES = ['progress', 'waiting-customer', 'risk-discovered', 'deferred', 'close-recommended', 'no-response', 'other'];

const INSERT_COLUMNS = Object.freeze({
  org_unit: ['id', 'name', 'code', 'description', 'parent_id', 'is_active', 'display_order', 'row_version', 'created_at', 'created_by', 'updated_at', 'updated_by'],
  platform_user: ['id', 'username', 'display_name', 'email', 'phone', 'avatar_url', 'is_active', 'primary_org_unit_id', 'last_login_at', 'row_version', 'created_at', 'created_by', 'updated_at', 'updated_by', 'email_verified', 'phone_verified'],
  project: ['id', 'project_no', 'project_name', 'customer_id', 'status', 'current_stage', 'owner_org_id', 'owner_user_id', 'planned_sign_at', 'closed_at', 'closed_reason', 'row_version', 'created_at', 'created_by', 'updated_at', 'updated_by', 'customer_name', 'source_lead_id', 'customer_project_no'],
  lead: ['id', 'lead_no', 'lead_name', 'customer_name', 'status', 'owner_org_id', 'owner_user_id', 'qualification_summary', 'qualified_at', 'qualified_by', 'closed_reason', 'closed_at', 'closed_by', 'converted_project_id', 'converted_at', 'converted_by', 'row_version', 'created_at', 'created_by', 'updated_at', 'updated_by', 'customer_id', 'demand_description', 'budget_status', 'estimated_amount', 'urgency', 'expected_decision_date', 'score', 'rating', 'score_reason', 'score_updated_at', 'source_code'],
  contract: ['id', 'project_id', 'contract_no', 'status', 'signed_amount', 'currency_code', 'current_snapshot_id', 'signed_at', 'row_version', 'created_at', 'created_by', 'updated_at', 'updated_by', 'retention_due_date', 'customer_contract_no'],
  sales_follow_up_record: ['id', 'customer_id', 'lead_id', 'project_id', 'follow_up_type', 'occurred_at', 'summary', 'detail', 'outcome', 'next_follow_up_at', 'owner_org_id', 'owner_user_id', 'row_version', 'created_at', 'created_by', 'updated_at', 'updated_by', 'status', 'supersedes_record_id', 'replaced_by_record_id', 'replacement_reason', 'voided_at', 'voided_by', 'void_reason'],
  business_discussion_thread: ['id', 'target_object_type', 'target_object_id', 'customer_id', 'lead_id', 'project_id', 'target_title', 'created_at', 'created_by'],
  business_discussion_comment: ['id', 'thread_id', 'discussion_type', 'body', 'related_contact_id', 'related_competitor_record_id', 'related_follow_up_record_id', 'is_pinned', 'is_key_conclusion', 'created_at', 'created_by']
});
for (const columns of Object.values(INSERT_COLUMNS)) Object.freeze(columns);

export const customerPreparationAuthority = Object.freeze({
  sourceKind: SOURCE_KIND,
  sourceCatalogSha256: CATALOG_SHA256,
  insertColumns: INSERT_COLUMNS,
  selectTables: Object.freeze(['customer', 'platform_user', 'org_unit', 'dictionary_item', 'business_discussion_thread']),
  rootOwnsTransactionsEvidenceAndCleanup: true,
  producerCertification: false,
  unsupported: ['dangling customer/owner/project/lead references', 'unregistered input fields or states', 'superseded follow-up replacement chains', 'pre-existing discussion target threads', 'no active legal dictionary code', 'unknown preparation kind']
});

function fail(message) {
  const error = new Error(`Unsupported customer preparation: ${message}`);
  error.code = 'UNSUPPORTED_CUSTOMER_PREPARATION';
  error.sourceKind = SOURCE_KIND;
  throw error;
}
function ensure(condition, message) { if (!condition) fail(message); }
function object(value, label) { ensure(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`); return value; }
function keys(value, allowed, label) { object(value, label); for (const key of Object.keys(value)) ensure(allowed.includes(key), `${label}.${key} is not registered`); }
function uuid(value, label) { ensure(typeof value === 'string' && UUID.test(value), `${label} must be a UUID`); return value.toLowerCase(); }
function text(value, label, max = 255) { ensure(typeof value === 'string' && [...value].length >= 1 && [...value].length <= max && !value.includes('\0'), `${label} must contain 1..${max} legal characters`); return value; }
function optionalText(value, label, max = 255) { return value === undefined || value === null ? null : text(value, label, max); }
function choice(value, allowed, label) { ensure(allowed.includes(value), `${label}=${String(value)} is outside the frozen schema states`); return value; }
function datetime(value, label, fallback = BASE_TIME) { const result = value === undefined ? fallback : value; ensure(typeof result === 'string' && /Z$/.test(result) && Number.isFinite(Date.parse(result)), `${label} must be an explicit UTC datetime`); return result; }
function optionalDatetime(value, label) { return value === undefined || value === null ? null : datetime(value, label); }
function boolean(value, label, fallback = false) { const result = value === undefined ? fallback : value; ensure(typeof result === 'boolean', `${label} must be boolean`); return result; }
function token(value) {
  // Stable synthetic labels across backends, not production business numbers.
  // The run-specific ctx.name input supplies namespace separation.
  let result = 14695981039346656037n;
  for (let index = 0; index < value.length; index += 1) result = BigInt.asUintN(64, (result ^ BigInt(value.charCodeAt(index))) * 1099511628211n);
  return result.toString(16).padStart(16, '0');
}
function fixtureNumber(ctx, kind, key) { return `PREP-R3A-${kind}-${token(text(ctx.name(`prepared-${kind}-${key}`), 'ctx.name', 512))}`; }
function newId(ctx) { return uuid(ctx.newId(), 'ctx.newId'); }
function common(actorId, createdAt, updatedAt = createdAt) { return { row_version: 1, created_at: createdAt, created_by: actorId, updated_at: updatedAt, updated_by: actorId }; }
async function exactlyOne(ctx, table, where, label) {
  ensure(customerPreparationAuthority.selectTables.includes(table), `select table ${table} is not registered`);
  const rows = await ctx.select(table, where);
  ensure(Array.isArray(rows) && rows.length === 1, `${label} requires one real persisted row; found ${Array.isArray(rows) ? rows.length : 'invalid result'}`);
  return object(rows[0], `${label} row`);
}
async function insert(ctx, table, row, logical) {
  ensure(Object.hasOwn(INSERT_COLUMNS, table), `insert table ${table} is not registered`);
  keys(row, INSERT_COLUMNS[table], `insert ${table}`);
  ensure(Object.keys(row).length === INSERT_COLUMNS[table].length, `${table} must explicitly specify the complete registered row shape`);
  const result = object(await ctx.insert(table, row), `${table} RETURNING`);
  ensure(uuid(result.id, `${table} RETURNING.id`) === row.id, `${table} RETURNING identity mismatch`);
  if (logical) ctx.remember(logical, result.id);
  return result;
}
async function actor(ctx) {
  const requested = object(ctx.actor('admin'), 'Root actor');
  const id = uuid(requested.userId, 'Root actor.userId');
  const persisted = await exactlyOne(ctx, 'platform_user', { id }, 'Root actor');
  ensure(uuid(persisted.id, 'actor row.id') === id && persisted.is_active === true, 'Root actor must be the real active synthetic user');
  return persisted;
}
async function dictionaryCode(ctx, domain, max) {
  const rows = await ctx.select('dictionary_item', { domain, status: 'active' });
  ensure(Array.isArray(rows), `${domain} dictionary read must return an array`);
  for (const row of rows) ensure(row.domain === domain && row.status === 'active' && typeof row.code === 'string', `invalid persisted ${domain} dictionary view`);
  const legal = rows.filter(row => [...row.code].length >= 1 && [...row.code].length <= max && !row.code.includes('\0'));
  legal.sort((left, right) => left.code < right.code ? -1 : left.code > right.code ? 1 : 0);
  const selected = legal.find(row => row.code === 'other') ?? legal[0];
  ensure(selected, `no active ${domain} dictionary code fits the real column length ${max}`);
  return selected.code;
}

export function canPrepare(kind) { return KINDS.includes(kind); }

export async function prepareCustomer(ctx, kind, fields) {
  ensure(canPrepare(kind), `kind ${String(kind)} is not registered`);
  object(fields, 'fields');
  if (Object.hasOwn(fields, 'sourceKind')) ensure(fields.sourceKind === SOURCE_KIND, 'sourceKind must be prepared-source');
  if (kind === 'customer-owner-reference-set') return prepareOwners(ctx, fields);
  ensure(fields.sourceKind === SOURCE_KIND, 'workspace sourceKind must explicitly be prepared-source');
  return prepareWorkspace(ctx, fields);
}

async function prepareOwners(ctx, fields) {
  keys(fields, ['label', 'sourceKind'], 'owner fields');
  const label = text(fields.label, 'owner label', 512), suffix = token(label);
  const operator = await actor(ctx), operatorId = uuid(operator.id, 'operator');
  const org = await insert(ctx, 'org_unit', {
    id: newId(ctx), name: `R3A prepared inactive org ${suffix}`, code: `PREP-R3A-ORG-${suffix}`,
    description: `${SOURCE_KIND}: inactive owner-reference control`, parent_id: null, is_active: false, display_order: 0,
    ...common(operatorId, BASE_TIME)
  }, 'customer.prepared.owner.inactive-org');
  const inactiveUser = await insert(ctx, 'platform_user', {
    id: newId(ctx), username: `r3a_prep_inactive_${suffix}`, display_name: `R3A prepared inactive ${suffix}`,
    email: null, phone: null, avatar_url: null, is_active: false, primary_org_unit_id: org.id, last_login_at: null,
    ...common(operatorId, BASE_TIME), email_verified: false, phone_verified: false
  }, 'customer.prepared.owner.inactive-user');
  const noPrimaryUser = await insert(ctx, 'platform_user', {
    id: newId(ctx), username: `r3a_prep_noorg_${suffix}`, display_name: `R3A prepared no-primary ${suffix}`,
    email: null, phone: null, avatar_url: null, is_active: true, primary_org_unit_id: null, last_login_at: null,
    ...common(operatorId, BASE_TIME), email_verified: false, phone_verified: false
  }, 'customer.prepared.owner.no-primary-user');
  ensure(org.is_active === false && inactiveUser.is_active === false && noPrimaryUser.primary_org_unit_id === null, 'owner preparation RETURNING state mismatch');
  ensure(inactiveUser.primary_org_unit_id === org.id, 'inactive owner must reference the real inserted organization');
  return {
    sourceKind: SOURCE_KIND,
    inactiveUser: { userId: inactiveUser.id, orgId: inactiveUser.primary_org_unit_id, isActive: inactiveUser.is_active },
    inactiveOrgId: org.id, inactiveOrgIsActive: org.is_active,
    noPrimaryUser: { userId: noPrimaryUser.id, orgId: noPrimaryUser.primary_org_unit_id },
    producerCertification: false
  };
}

function validatePlan(fields) {
  keys(fields, ['customerId', 'outsideCustomerId', 'ownerUserId', 'ownerOrgId', 'sourceKind', 'projects', 'leads', 'contracts', 'followUps', 'discussions'], 'workspace fields');
  const customerId = uuid(fields.customerId, 'customerId'), outsideId = uuid(fields.outsideCustomerId, 'outsideCustomerId');
  ensure(customerId !== outsideId, 'outsideCustomerId must designate a second real customer');
  const customerIds = new Set([customerId, outsideId]), seen = new Set();
  const accepted = {
    projects: ['key', 'customerId', 'projectName', 'status', 'currentStage', 'updatedAt', 'createdAt', 'plannedSignAt'],
    leads: ['key', 'customerId', 'leadName', 'status', 'rating', 'urgency', 'convertedProjectKey', 'updatedAt', 'createdAt'],
    contracts: ['key', 'customerId', 'projectKey', 'status', 'customerContractNo', 'signedAt', 'signedAmount', 'updatedAt', 'createdAt'],
    followUps: ['key', 'customerId', 'summary', 'status', 'occurredAt', 'nextFollowUpAt', 'createdAt'],
    discussions: ['key', 'customerId', 'body', 'isKeyConclusion', 'createdAt', 'targetObjectType', 'targetTitle', 'targetKey']
  };
  const result = { customerId, outsideId };
  for (const [group, allowed] of Object.entries(accepted)) {
    ensure(Array.isArray(fields[group]) && fields[group].length <= 100, `${group} must be a bounded array`);
    result[group] = fields[group].map((input, index) => {
      const label = `${group}[${index}]`; keys(input, allowed, label);
      const key = text(input.key, `${label}.key`, 80); ensure(/^[a-z][a-z0-9.-]*$/.test(key), `${label}.key uses unsupported characters`);
      ensure(!seen.has(key), `duplicate preparation key ${key}`); seen.add(key);
      const rowCustomerId = input.customerId === undefined ? customerId : uuid(input.customerId, `${label}.customerId`);
      ensure(customerIds.has(rowCustomerId), `${key} references a customer outside this registered pair`);
      const row = { ...input, key, customerId: rowCustomerId, createdAt: datetime(input.createdAt, `${key}.createdAt`) };
      if (group === 'projects') {
        text(row.projectName, `${key}.projectName`); choice(row.status ?? 'active', PROJECT_STATUSES, `${key}.status`); choice(row.currentStage ?? 'assessment', PROJECT_STAGES, `${key}.currentStage`);
        datetime(row.updatedAt, `${key}.updatedAt`, row.createdAt); optionalDatetime(row.plannedSignAt, `${key}.plannedSignAt`);
      } else if (group === 'leads') {
        text(row.leadName, `${key}.leadName`); choice(row.status ?? 'registered', LEAD_STATUSES, `${key}.status`); choice(row.rating ?? 'D', RATINGS, `${key}.rating`); choice(row.urgency ?? 'normal', URGENCIES, `${key}.urgency`); datetime(row.updatedAt, `${key}.updatedAt`, row.createdAt);
        if (row.convertedProjectKey !== undefined && row.convertedProjectKey !== null) text(row.convertedProjectKey, `${key}.convertedProjectKey`, 80);
      } else if (group === 'contracts') {
        text(row.projectKey, `${key}.projectKey`, 80); choice(row.status ?? 'draft', CONTRACT_STATUSES, `${key}.status`); optionalText(row.customerContractNo, `${key}.customerContractNo`, 128); optionalDatetime(row.signedAt, `${key}.signedAt`); datetime(row.updatedAt, `${key}.updatedAt`, row.createdAt);
        const amount = row.signedAmount ?? '0'; ensure(typeof amount === 'string' && /^\d{1,16}(?:\.\d{1,2})?$/.test(amount), `${key}.signedAmount must fit numeric(18,2)`);
      } else if (group === 'followUps') {
        text(row.summary, `${key}.summary`, 8000); choice(row.status ?? 'active', ['active', 'voided'], `${key}.status (superseded chains are unsupported)`); datetime(row.occurredAt, `${key}.occurredAt`); optionalDatetime(row.nextFollowUpAt, `${key}.nextFollowUpAt`);
      } else {
        text(row.body, `${key}.body`, 8000); choice(row.targetObjectType ?? 'customer', ['customer', 'lead', 'project'], `${key}.targetObjectType`); optionalText(row.targetTitle, `${key}.targetTitle`); boolean(row.isKeyConclusion, `${key}.isKeyConclusion`);
        if ((row.targetObjectType ?? 'customer') !== 'customer') text(row.targetKey, `${key}.targetKey`, 80);
      }
      return row;
    });
  }
  const projects = new Map(result.projects.map(item => [item.key, item])), leads = new Map(result.leads.map(item => [item.key, item]));
  const reference = (map, key, customer, label) => { ensure(map.has(key), `${label} key ${String(key)} is not an actual planned target`); ensure(map.get(key).customerId === customer, `${label} crosses customer ownership`); };
  for (const item of result.leads) if (item.convertedProjectKey !== null && item.convertedProjectKey !== undefined) reference(projects, item.convertedProjectKey, item.customerId, `${item.key}.convertedProjectKey`);
  for (const item of result.contracts) reference(projects, item.projectKey, item.customerId, `${item.key}.projectKey`);
  for (const item of result.discussions) {
    if (item.targetObjectType === 'lead') reference(leads, item.targetKey, item.customerId, `${item.key}.targetKey`);
    if (item.targetObjectType === 'project') reference(projects, item.targetKey, item.customerId, `${item.key}.targetKey`);
  }
  return result;
}

function threadCreatedAt(plan, item) {
  const type = item.targetObjectType ?? 'customer';
  const sameTarget = candidate => candidate.customerId === item.customerId && (candidate.targetObjectType ?? 'customer') === type && (type === 'customer' || candidate.targetKey === item.targetKey);
  return plan.discussions.filter(sameTarget).reduce((earliest, candidate) => Date.parse(candidate.createdAt) < Date.parse(earliest) ? candidate.createdAt : earliest, item.createdAt);
}

async function prepareWorkspace(ctx, fields) {
  // All structural/reference checks precede inserts. Root's surrounding unit of
  // work owns rollback if an actual insert, select or constraint later fails.
  const plan = validatePlan(fields), operator = await actor(ctx), operatorId = uuid(operator.id, 'operator');
  const customers = new Map();
  for (const id of [plan.customerId, plan.outsideId]) {
    const customer = await exactlyOne(ctx, 'customer', { id }, `workspace customer ${id}`);
    ensure(uuid(customer.id, 'persisted customer.id') === id, 'customer SELECT identity mismatch'); text(customer.display_name, 'persisted customer.display_name'); customers.set(id, customer);
  }
  const requestedOwner = Object.hasOwn(fields, 'ownerUserId') ? fields.ownerUserId : operatorId;
  const ownerUserId = requestedOwner === null ? null : uuid(requestedOwner, 'ownerUserId');
  if (ownerUserId !== null) await exactlyOne(ctx, 'platform_user', { id: ownerUserId }, 'workspace owner');
  const requestedOrg = Object.hasOwn(fields, 'ownerOrgId') ? fields.ownerOrgId : operator.primary_org_unit_id;
  const ownerOrgId = requestedOrg === null ? null : uuid(requestedOrg, 'ownerOrgId');
  if (ownerOrgId !== null) await exactlyOne(ctx, 'org_unit', { id: ownerOrgId }, 'workspace organization');
  const leadSource = plan.leads.length ? await dictionaryCode(ctx, 'lead-source', 64) : null;
  const followUpType = plan.followUps.length ? await dictionaryCode(ctx, 'sales-follow-up-type', 32) : null;
  const ids = Object.create(null), projects = new Map(), leads = new Map(), threads = new Map();

  for (const item of plan.projects) {
    const updatedAt = datetime(item.updatedAt, `${item.key}.updatedAt`, item.createdAt), status = item.status ?? 'active';
    const row = await insert(ctx, 'project', {
      id: newId(ctx), project_no: fixtureNumber(ctx, 'PRJ', item.key), project_name: item.projectName,
      customer_id: item.customerId, customer_name: customers.get(item.customerId).display_name, customer_project_no: null,
      source_lead_id: null, status, current_stage: item.currentStage ?? 'assessment', owner_org_id: ownerOrgId, owner_user_id: ownerUserId,
      planned_sign_at: optionalDatetime(item.plannedSignAt, `${item.key}.plannedSignAt`), closed_at: status === 'closed' ? updatedAt : null,
      closed_reason: status === 'closed' ? `${SOURCE_KIND}: closed projection control` : null,
      ...common(operatorId, item.createdAt, updatedAt)
    }, `customer.prepared.${item.key}`);
    ids[item.key] = row.id; projects.set(item.key, row);
  }
  for (const item of plan.leads) {
    const updatedAt = datetime(item.updatedAt, `${item.key}.updatedAt`, item.createdAt), status = item.status ?? 'registered', rating = item.rating ?? 'D';
    const converted = item.convertedProjectKey === undefined || item.convertedProjectKey === null ? null : projects.get(item.convertedProjectKey);
    ensure(!item.convertedProjectKey || converted, `${item.key} lacks its actual inserted converted project`);
    const qualified = status === 'qualified' || status === 'converted';
    const row = await insert(ctx, 'lead', {
      id: newId(ctx), lead_no: fixtureNumber(ctx, 'LD', item.key), lead_name: item.leadName,
      customer_id: item.customerId, customer_name: customers.get(item.customerId).display_name, source_code: leadSource,
      demand_description: `${SOURCE_KIND}: customer workspace projection control`, budget_status: 'unknown', estimated_amount: null,
      urgency: item.urgency ?? 'normal', expected_decision_date: null, score: { A: 90, B: 70, C: 50, D: 0 }[rating], rating,
      score_reason: `${SOURCE_KIND}: explicit read-model fixture; no scoring producer certification`, score_updated_at: updatedAt,
      status, owner_org_id: ownerOrgId, owner_user_id: ownerUserId,
      qualification_summary: qualified ? `${SOURCE_KIND}: qualified read control` : null, qualified_at: qualified ? item.createdAt : null, qualified_by: qualified ? operatorId : null,
      closed_reason: status === 'closed' ? `${SOURCE_KIND}: closed read control` : null, closed_at: status === 'closed' ? updatedAt : null, closed_by: status === 'closed' ? operatorId : null,
      converted_project_id: converted?.id ?? null, converted_at: converted ? updatedAt : null, converted_by: converted ? operatorId : null,
      ...common(operatorId, item.createdAt, updatedAt)
    }, `customer.prepared.${item.key}`);
    ids[item.key] = row.id; leads.set(item.key, row);
  }
  for (const item of plan.contracts) {
    const project = projects.get(item.projectKey); ensure(project, `${item.key} requires its actual inserted project`);
    const row = await insert(ctx, 'contract', {
      id: newId(ctx), project_id: project.id, contract_no: fixtureNumber(ctx, 'CT', item.key),
      status: item.status ?? 'draft', signed_amount: item.signedAmount ?? '0', currency_code: 'CNY', current_snapshot_id: null,
      signed_at: optionalDatetime(item.signedAt, `${item.key}.signedAt`), retention_due_date: null,
      customer_contract_no: optionalText(item.customerContractNo, `${item.key}.customerContractNo`, 128),
      ...common(operatorId, item.createdAt, datetime(item.updatedAt, `${item.key}.updatedAt`, item.createdAt))
    }, `customer.prepared.${item.key}`);
    ids[item.key] = row.id;
  }
  for (const item of plan.followUps) {
    const status = item.status ?? 'active', occurredAt = datetime(item.occurredAt, `${item.key}.occurredAt`);
    const row = await insert(ctx, 'sales_follow_up_record', {
      id: newId(ctx), customer_id: item.customerId, lead_id: null, project_id: null,
      follow_up_type: followUpType, status, occurred_at: occurredAt, summary: item.summary,
      detail: `${SOURCE_KIND}: customer-level follow-up read control`, outcome: choice('progress', FOLLOW_UP_OUTCOMES, 'follow-up default outcome'),
      next_follow_up_at: optionalDatetime(item.nextFollowUpAt, `${item.key}.nextFollowUpAt`), owner_org_id: ownerOrgId, owner_user_id: ownerUserId,
      supersedes_record_id: null, replaced_by_record_id: null, replacement_reason: null,
      voided_at: status === 'voided' ? occurredAt : null, voided_by: status === 'voided' ? operatorId : null, void_reason: status === 'voided' ? `${SOURCE_KIND}: voided filter control` : null,
      ...common(operatorId, item.createdAt)
    }, `customer.prepared.${item.key}`);
    ids[item.key] = row.id;
  }
  for (const item of plan.discussions) {
    const type = item.targetObjectType ?? 'customer'; let targetId, leadId = null, projectId = null, targetLogical;
    if (type === 'customer') { targetId = item.customerId; targetLogical = item.customerId === plan.customerId ? 'main' : 'outside'; }
    else if (type === 'lead') { const target = leads.get(item.targetKey); ensure(target, `${item.key} requires an actual inserted lead target`); targetId = target.id; leadId = target.id; targetLogical = item.targetKey; }
    else { const target = projects.get(item.targetKey); ensure(target, `${item.key} requires an actual inserted project target`); targetId = target.id; projectId = target.id; targetLogical = item.targetKey; }
    const threadKey = `${type}:${targetId}`; let thread = threads.get(threadKey);
    if (!thread) {
      const existing = await ctx.select('business_discussion_thread', { target_object_type: type, target_object_id: targetId });
      ensure(Array.isArray(existing) && existing.length === 0, `${item.key} target already has a thread; this recipe does not adopt unknown existing rows`);
      thread = await insert(ctx, 'business_discussion_thread', {
        id: newId(ctx), target_object_type: type, target_object_id: targetId,
        customer_id: item.customerId, lead_id: leadId, project_id: projectId,
        target_title: optionalText(item.targetTitle, `${item.key}.targetTitle`) ?? customers.get(item.customerId).display_name,
        created_at: threadCreatedAt(plan, item), created_by: operatorId
      }, `customer.prepared.thread.${type}.${targetLogical}`);
      threads.set(threadKey, thread);
    }
    ensure(thread.customer_id === item.customerId, `${item.key} thread belongs to a different customer`);
    const comment = await insert(ctx, 'business_discussion_comment', {
      id: newId(ctx), thread_id: thread.id, discussion_type: choice('general', DISCUSSION_TYPES, 'discussion default type'), body: item.body,
      related_contact_id: null, related_competitor_record_id: null, related_follow_up_record_id: null,
      is_pinned: false, is_key_conclusion: boolean(item.isKeyConclusion, `${item.key}.isKeyConclusion`),
      created_at: item.createdAt, created_by: operatorId
    }, `customer.prepared.${item.key}`);
    // Consumers identify the comment; thread IDs are separately registered.
    ids[item.key] = comment.id;
  }
  return {
    sourceKind: SOURCE_KIND, ids,
    sourceCatalogSha256: CATALOG_SHA256,
    dictionaryCodes: { leadSource, followUpType },
    producerCertification: false,
    rootOwnsTransactionsEvidenceAndCleanup: true
  };
}
