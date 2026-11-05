// Request-only acceptance driver. Importing this module performs no I/O.
// Every business fact is produced by the injected real API callback. No SQL,
// fixtures, synthetic F records, included flags or operating snapshots are made.
import { createHash } from 'node:crypto';

export const FROZEN_PRODUCER_SHA256 = Object.freeze({
  'logic.rs': '96bdbc87dd031b59c6b895243241cd9b847eb9ae690766c5782183a5c0f9ba4c',
  'mod.rs': 'aaaa5126be86c421255d699bcad582131943d7f500754f0db8e55ddfc437a407',
  'store.rs': '0b39d14477e52641307d84f28c043dcf9c4309d38d0f55476e7f9806cb621eb5',
  'view.rs': '943a93380de87fbddc06650f35acfaf467db1a17abf6c25c3af162a5955b53ac',
});

// Independent, fixed arithmetic witnesses. Never call production logic to get
// expectations and never calculate an expected amount from an API response.
function deepFreeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') deepFreeze(child);
  return Object.freeze(value);
}
export const WITNESSES = deepFreeze({
  money: { net: '100.00', tax: '6.00', gross: '106.00' },
  firstPayment: { net: '20.00', tax: '1.20', gross: '21.20' },
  secondPayment: { net: '30.00', tax: '1.80', gross: '31.80' },
  finalPayment: { net: '50.00', tax: '3.00', gross: '53.00' },
  paymentBusinessDate: { instant: '2026-11-03T16:30:00.000Z', hongKongDate: '2026-11-04' },
  // 123.4567 * 1.25 = 154.320875; 17.2850 * 3.00 = 51.855000.
  multiply: { rate: '123.4567', hours: '1.25', rawProduct: '154.320875', amount: '154.32' },
  halfCent: { rate: '17.2850', hours: '3.00', rawProduct: '51.855000', amount: '51.86' },
  day: { rate: '80.1250', days: '1.50', rawProduct: '120.187500', amount: '120.19' },
  minimumCent: { rate: '0.5000', hours: '0.01', rawProduct: '0.005000', amount: '0.01' },
  zero: { rate: '0.0001', hours: '0.01', rawProduct: '0.000001', rounded: '0.00', httpStatus: 422 },
  replacement: { rate: '17.2850', hours: '4.00', rawProduct: '69.140000', amount: '69.14' },
  split: [
    { from: '2026-10-01', to: '2026-10-09', rate: '10.0000', hours: '1.00', amount: '10.00' },
    { from: '2026-10-10', to: '2026-10-20', rate: '20.0000', hours: '2.00', amount: '40.00' },
    { from: '2026-10-21', to: '2026-10-31', rate: '10.0000', hours: '3.00', amount: '30.00' },
  ],
});

const P = Object.freeze({
  manage: 'contract:finance:manage', operating: 'operating:finance:sensitive:read',
  labor: 'labor-cost-rate:sensitive:read', audit: 'platform:users:manage',
});
const E = 'ProjectCostController_';
const C = 'ContractFinanceController_';
const A = 'RuntimeAuditController_';
const definitions = [
  ['publishInternalCostRateVersion', 'POST', '/api/internal-cost-rate-versions', 201],
  ['createProjectActualCostRecord', 'POST', '/api/projects/{id}/actual-cost-records', 201],
  ['listProjectActualCostRecords', 'GET', '/api/projects/{id}/actual-cost-records', 200],
  ['getProjectActualCostRecordDetail', 'GET', '/api/project-actual-cost-records/{id}', 200],
  ['replaceLaborCostRecord', 'POST', '/api/project-actual-cost-records/{id}:replace', 201],
  ['listExpenseRecords', 'GET', '/api/projects/{id}/expense-records', 200],
  ['getExpenseRecordDetail', 'GET', '/api/expense-records/{id}', 200],
  ['createExpenseRecord', 'POST', '/api/projects/{id}/expense-records', 201],
  ['updateExpenseRecord', 'PATCH', '/api/expense-records/{id}', 200],
  ['confirmExpenseRecord', 'POST', '/api/expense-records/{id}:confirm', 200],
  ['voidExpenseRecord', 'POST', '/api/expense-records/{id}:void', 200],
  ['confirmCostStageAttribution', 'POST', '/api/project-actual-cost-records/{id}/stage-attributions', 201],
  ['getCostStageAttribution', 'GET', '/api/cost-stage-attributions/{id}', 200],
  ['listCostStageAttributions', 'GET', '/api/project-actual-cost-records/{id}/stage-attributions', 200],
  ['confirmSharedCostAllocationBasis', 'POST', '/api/shared-cost-allocation-bases', 201],
  ['getSharedCostAllocationBasis', 'GET', '/api/shared-cost-allocation-bases/{id}', 200],
  ['listSharedCostAllocationResults', 'GET', '/api/shared-cost-allocation-bases/{id}/results', 200],
  ['replaceSharedCostAllocationResult', 'POST', '/api/shared-cost-allocation-results/{id}:replace', 201],
].map(([name, method, path, success]) => [E + name, { method, path, success }]);
for (const [name, method, path, success] of [
  ['createPayable', 'POST', '/api/projects/{id}/payable-records', 201],
  ['getPayable', 'GET', '/api/payable-records/{id}', 200],
  ['updatePayable', 'PATCH', '/api/payable-records/{id}', 200],
  ['voidPayable', 'POST', '/api/payable-records/{id}:void', 200],
  ['createPayment', 'POST', '/api/projects/{id}/payment-records', 201],
  ['confirmPayment', 'POST', '/api/payment-records/{id}:confirm', 200],
  ['listPayments', 'GET', '/api/projects/{id}/payment-records', 200],
  ['createInvoice', 'POST', '/api/projects/{id}/invoice-records', 201],
  ['getInvoice', 'GET', '/api/invoice-records/{id}', 200],
  ['updateInvoice', 'PATCH', '/api/invoice-records/{id}', 200],
  ['markInvoiceException', 'POST', '/api/invoice-records/{id}:markException', 200],
]) definitions.push([C + name, { method, path, success }]);
definitions.push([A + 'listAuditLogs', { method: 'GET', path: '/api/audit-logs', success: 200 }]);
definitions.push([A + 'listSecurityEvents', { method: 'GET', path: '/api/security-events', success: 200 }]);
export const OPERATIONS = Object.freeze(Object.fromEntries(definitions));

const EXPENSE_RAW = ['amountIncludingTax', 'taxAmount', 'amountExcludingTax', 'expenseDescription', 'evidenceSummary', 'voidReason'];
const COST_RAW = ['amountExcludingTax', 'taxCostAmount', 'amountIncludingTax', 'sourceId', 'sourceRefNo', 'costDescription', 'evidenceSummary', 'taxImpactSummary', 'riskNote', 'voidReason'];
const LABOR_RAW = ['laborPersonId', 'laborRole', 'actualHours', 'actualPersonDays', 'internalCostRate', 'rateVersionId', 'laborAmount', 'workSummary'];
const INTERNAL = ['source_basis', 'sourceBasis', 'calculation_basis', 'calculationBasis', 'sourcePayload', 'sourceVersionTransition'];
const clone = value => structuredClone(value);
class CheckFailure extends Error { constructor(code) { super(code); this.code = code; } }
class MissingContext extends Error { constructor(code) { super(code); this.code = code; } }
const check = (ok, code) => { if (!ok) throw new CheckFailure(code); };
const required = (ok, code) => { if (!ok) throw new MissingContext(code); };
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const rowVersion = row => { check(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0, 'real-row-version-required'); return row.rowVersion; };
const rowId = row => { check(uuid(row?.id), 'real-response-id-required'); return row.id; };
const same = (actual, expected, code) => check(actual === expected, code);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const list = value => { check(Array.isArray(value), 'list-response-array'); return value; };
const find = (rows, id) => { const row = list(rows).find(r => r.id === id); check(row, 'expected-real-row-in-list'); return row; };
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(ordered(value))).digest('hex');
const noInternal = value => { for (const k of INTERNAL) check(!own(value, k), `no-internal-http-key:${k}`); };
function rawNull(row, keys, requiredKeys = true) {
  for (const key of keys) {
    if (requiredKeys) check(own(row, key), `raw-key-present:${key}`);
    if (own(row, key)) same(row[key], null, `raw-key-literal-null:${key}`);
  }
  noInternal(row);
}
function projection(field, packageKey, expected, hidden = false) {
  check(field && typeof field === 'object', 'projection-required');
  same(field.fieldPackageKey, packageKey, 'registered-projection-package');
  check(typeof field.displayText === 'string' && field.displayText.length > 0 && field.displayText.length <= 2000, 'projection-display-text');
  if (hidden) {
    check(['masked', 'denied'].includes(field.mode), 'sensitive-field-hidden');
    same(field.value, null, 'hidden-projection-value-null');
    same(field.reasonCode, 'missing-sensitive-read-permission', 'hidden-reason');
  } else {
    same(field.mode, 'full', 'authorized-full-projection');
    same(field.value, expected, 'fixed-witness-projection-value');
  }
}
function projectionPacket(packet, packageKey, hidden) {
  check(packet && typeof packet === 'object' && !Array.isArray(packet), 'projection-packet-object');
  for (const field of Object.values(packet)) {
    same(field?.fieldPackageKey, packageKey, 'every-field-correct-package');
    if (!hidden) same(field.mode, 'full', 'all-authorized-fields-projected');
    else if (field.mode === 'full') {
      same(field.value, null, 'unauthorized-full-only-null-not-applicable');
      same(field.reasonCode, 'field-package-not-applicable', 'unauthorized-full-only-not-applicable');
    } else {
      check(['masked', 'denied'].includes(field.mode), 'all-applicable-fields-hidden');
      same(field.value, null, 'all-hidden-fields-null');
      same(field.reasonCode, 'missing-sensitive-read-permission', 'all-hidden-fields-sensitive-reason');
    }
  }
}
function expenseView(row, expected, hidden = false) {
  rowId(row); rowVersion(row); rawNull(row, EXPENSE_RAW);
  projectionPacket(row.financialProjection, 'operating-finance', hidden);
  for (const [key, value] of Object.entries(expected)) projection(row.financialProjection?.[key], 'operating-finance', value, hidden && value !== null);
}
function costView(row, expected, { hidden = false, labor = false, status = 'registered', date } = {}) {
  rowId(row); rowVersion(row); rawNull(row, COST_RAW); rawNull(row, LABOR_RAW, false);
  rawNull(row, ['sourceStatusSummary', 'measurementBasisSummary'], false);
  same(row.recordStatus, status, 'cost-lifecycle-status');
  same(row.isIncludedInProjectCost, false, 'cost-never-automatically-included');
  same(row.currency, 'CNY', 'cost-proven-source-currency');
  same(row.includedAt, null, 'cost-includedAt-null'); same(row.includedBy, null, 'cost-includedBy-null');
  if (date) same(row.occurredOn, date, 'source-business-date');
  if (status === 'registered') {
    same(row.confirmedAt, null, 'registered-not-confirmed'); same(row.confirmedBy, null, 'registered-no-confirming-actor');
    same(row.executionStageCode, null, 'registered-no-guessed-stage'); same(row.stageLockedAt, null, 'registered-no-stage-lock');
  }
  if (status === 'confirmed') {
    check(typeof row.confirmedAt === 'string' && uuid(row.confirmedBy), 'real-confirming-actor-and-time');
    check(typeof row.stageLockedAt === 'string' && uuid(row.stageDerivedFromId), 'real-stage-lock-and-evidence');
  }
  same(row[labor ? 'financialProjection' : 'laborSensitiveProjection'], null, 'exactly-one-cost-projection-package');
  const packet = row[labor ? 'laborSensitiveProjection' : 'financialProjection'];
  projectionPacket(packet, labor ? 'labor-cost-rate' : 'operating-finance', hidden);
  for (const [key, value] of Object.entries(expected)) projection(packet?.[key], labor ? 'labor-cost-rate' : 'operating-finance', value, hidden && value !== null);
}
const layers = (net, tax, gross) => ({ amountExcludingTax: net, taxCostAmount: tax, amountIncludingTax: gross });
const witnessLayers = () => layers('100.00', '6.00', '106.00');
const laborLayers = amount => ({ ...layers(amount, '0.00', amount), laborAmount: amount });

const CASES = [
  ['E21-01', '费用创建、更新、确认、作废及六入口投影', [], ['base', 'actors.full']],
  ['E21-02', '已确认费用→实际成本，当前映射唯一且原源不可变', [], ['base', 'actors.full']],
  ['E21-03', '费用分币、税层与无silent rounding', [], ['base', 'actors.full']],
  ['E21-04', '真实付款确认→payment-fact及HK业务日', [], ['base', 'actors.full']],
  ['E21-05', '真实进项发票、显式币种/合同证明→invoice', [], ['base', 'actors.full']],
  ['E21-06', '真实采购承诺→procurement，全部先registered', [], ['base', 'actors.full']],
  ['E21-07', '四位费率、两位数量、精确HALF_UP固定见证', [], ['base', 'actors.full', 'actors.auditFull']],
  ['E21-08', '人工舍入0拒绝、精度与计算前敏感权限', ['E21-07'], ['actors.operatingOnly']],
  ['E21-09', '个人率部分覆盖/单日边界拒绝且按三段拆分', [], ['base', 'actors.full', 'actors.auditFull', 'persons.partialCoverage']],
  ['E21-10', '同person/role劳动期间当前去重，邻接不重叠', ['E21-07', 'E21-09'], []],
  ['E21-11', '替代失败整体回滚、成功新ID及旧链终态', ['E21-07'], []],
  ['E21-12', '费用/非labor/labor敏感权限交叉，raw无旁路', ['E21-02', 'E21-07'], ['actors.financeOnly', 'actors.operatingOnly', 'actors.laborOnly']],
  ['E21-13', 'C采购→E注册→C部分付款→F具证确认及原始版本proof', ['E21-06'], ['assessments.payable']],
  ['E21-14', 'C再付仍partial→F分摊、付清completed→F分摊替代及锚点递进', ['E21-13'], []],
  ['E21-15', '历史费率受控截短仍覆盖原期→F确认及rate proof', [], ['base', 'actors.full', 'actors.auditFull', 'assessments.historicalLabor']],
  ['E21-16', '费率截短不得破坏已捕获期间，CAS/头指针拒绝', [], ['base', 'actors.full', 'actors.auditFull']],
  ['E21-17', '注册后新个人率相交，F拒绝确认并保留registered', [], ['base', 'actors.full', 'actors.auditFull', 'persons.priorityChange', 'assessments.priorityChange']],
  ['E21-18', '费率显式前驱/期区/版本及发布回执不泄露rate', [], ['base', 'actors.full', 'actors.auditFull']],
  ['E21-19', '审计包标签、真实费用更新历史、读保护及安全事件', ['E21-01', 'E21-02', 'E21-07', 'E21-11'], ['actors.auditFull', 'actors.auditFinanceOnly']],
  ['E21-20', '真实历史无币种证明发票不得映射', [], ['base', 'actors.full', 'legacy.unprovedInvoice']],
  ['E21-21', '查询枚举/联合请求严格校验和跨项目源拒绝', ['E21-02', 'E21-04', 'E21-05', 'E21-06', 'E21-07'], ['otherProject.id']],
];

export function describeEAcceptanceVectors() {
  return CASES.map(([id, title, dependsOn, requirements]) => ({ id, title, dependsOn: [...dependsOn], requirements: [...requirements], status: 'not-run', httpStatus: 'not-run', observations: [] }));
}

/**
 * request(opId,id,body,actor,meta)->{status,body,receiptId,requestId?}.
 * GET body is null; meta.query is separate. The adapter unwraps HTTP envelopes.
 * observeEvidence(evidenceId,actor,meta)->{body:<real PG snake_case row>,receiptId}
 * is OPTIONAL READ-ONLY verification, independently counted from HTTP.
 */
export function createEAcceptanceSuite(context, { request, observeEvidence } = {}) {
  const cases = describeEAcceptanceVectors();
  const byId = new Map(cases.map(c => [c.id, c]));
  const state = {}; const resources = []; let active; let step = 0; let invoked = false;
  const actors = context.actors ?? {};
  const getActor = key => {
    const actor = actors[key];
    required(actor && uuid(actor.id) && Array.isArray(actor.permissions), `actors.${key}:actual-id-and-permissions`);
    return actor;
  };
  const actorHas = (key, include, exclude = []) => {
    const actor = getActor(key);
    required(include.every(p => actor.permissions.includes(p)) && exclude.every(p => !actor.permissions.includes(p)), `actors.${key}:exact-permission-matrix`);
    return actor;
  };
  const full = () => actorHas('full', [P.manage, P.operating, P.labor]);
  const auditFull = () => actorHas('auditFull', [P.audit, P.operating, P.labor]);
  const base = () => {
    required(typeof context.tag === 'string' && /^[A-Za-z0-9_-]{1,20}$/.test(context.tag), 'fresh-bounded-tag');
    required(uuid(context.project?.id), 'real-project-id');
    required(uuid(context.activeContract?.id) && context.activeContract.projectId === context.project.id && context.activeContract.status === 'active' && context.activeContract.currencyCode === 'CNY', 'real-same-project-active-CNY-contract');
    required(typeof context.expenseCategory === 'string' && context.expenseCategory.length > 0, 'real-active-expense-dictionary-code');
    required(typeof context.costCategory === 'string' && context.costCategory.length > 0, 'real-cost-category');
    full(); return context.project.id;
  };
  const project = () => context.project.id;
  const role = suffix => `R4E21-${context.tag}-${suffix}`;
  const remember = (kind, row) => { resources.push({ caseId: active.id, kind, id: rowId(row), ...(Number.isSafeInteger(row.rowVersion) ? { rowVersion: row.rowVersion } : {}) }); return row; };
  async function call(op, id = null, body = null, actorKey = 'full', expectedStatus, query = {}) {
    const definition = OPERATIONS[op]; check(definition, 'closed-operation-catalogue');
    if (id !== null) check(uuid(id), 'real-path-uuid');
    const actor = getActor(actorKey); const expected = expectedStatus ?? definition.success;
    const meta = { caseId: active.id, stepId: `${active.id}:${++step}`, method: definition.method, path: definition.path.replace('{id}', id ?? ''), query: clone(query) };
    const row = { ...meta, operationId: op, actorKey, actorId: actor.id, expectedStatus: expected, status: 'not-run' };
    active.requests.push(row);
    // No credentials or live sensitive payloads are copied into the summary.
    row.status = 'requested';
    let response;
    try { response = await request(op, id, clone(body), actor, meta); }
    catch (error) { row.status = 'failed'; throw error; }
    required(response && typeof response.receiptId === 'string' && response.receiptId.length > 0, 'real-http-receiptId-required');
    row.receiptId = response.receiptId; row.httpStatus = response.status;
    if (response.requestId) row.requestId = response.requestId;
    row.status = response.status === expected ? 'passed' : 'failed';
    same(response.status, expected, `http-status:${meta.stepId}`);
    return response.body;
  }
  const readCost = id => call(E + 'getProjectActualCostRecordDetail', id);
  const readExpense = id => call(E + 'getExpenseRecordDetail', id);
  const auditRows = (type, id, actorKey = 'auditFull') => call(A + 'listAuditLogs', null, null, actorKey, 200, { targetType: type, targetId: id, limit: 100 });
  function expenseBody(extra = {}) {
    return { contractId: context.activeContract.id, expenseCategory: context.expenseCategory, expenseDescription: `R4E21-${context.tag}-费用原始说明`, expenseDate: '2026-11-04', currency: 'CNY', amountIncludingTax: '106.00', taxAmount: '6.00', amountExcludingTax: '100.00', sourceType: 'manual', evidenceSummary: `R4E21-${context.tag}-费用真实API依据`, attachmentCount: 0, ...extra };
  }
  async function createExpense(extra = {}) {
    const body = expenseBody(extra); const row = await call(E + 'createExpenseRecord', project(), body);
    expenseView(row, { amountIncludingTax: body.amountIncludingTax, taxAmount: body.taxAmount, amountExcludingTax: body.amountExcludingTax, expenseDescription: body.expenseDescription, evidenceSummary: body.evidenceSummary });
    same(row.status, 'recorded', 'expense-initial-recorded'); return remember('ExpenseRecord', row);
  }
  async function confirmedExpense() {
    const initial = await createExpense();
    const row = await call(E + 'confirmExpenseRecord', initial.id, { expectedVersion: rowVersion(initial) });
    expenseView(row, { amountIncludingTax: '106.00', taxAmount: '6.00', amountExcludingTax: '100.00' });
    same(row.status, 'confirmed', 'expense-really-confirmed'); same(row.confirmedBy, full().id, 'real-expense-confirmer');
    check(typeof row.confirmedAt === 'string', 'real-expense-confirmedAt'); return row;
  }
  async function mapCost(kind, source, sourceField) {
    const body = { costType: kind, [sourceField]: rowId(source), expectedSourceVersion: rowVersion(source), costDescription: `R4E21-${context.tag}-${kind}真实映射`, evidenceSummary: `R4E21-${context.tag}-保留真实源链，不自动纳入` };
    const command = await call(E + 'createProjectActualCostRecord', project(), body);
    same(command.businessStatusAfter, 'registered', 'mapping-receipt-registered'); check(uuid(command.targetId), 'cost-command-real-id');
    const row = await readCost(command.targetId); remember('ProjectActualCostRecord', row);
    same(row.costType, kind, 'union-variant-retained'); return { row, body, source };
  }
  async function payable(extra = {}) {
    const row = await call(C + 'createPayable', project(), { contractId: context.activeContract.id, vendorName: `R4E21-${context.tag}-供应商`, costCategory: context.costCategory, payableDescription: '真实API登记的采购承诺，不当作已付款', currency: 'CNY', amountExcludingTax: '100.00', taxAmount: '6.00', amountIncludingTax: '106.00', expectedPaymentDate: '2026-11-04', evidenceSummary: '验收专用采购事实，由本次真实API保存', attachmentCount: 0, ...extra });
    same(row.status, 'recorded', 'real-payable-recorded'); rowVersion(row); return remember('PayableRecord', row);
  }
  async function payment(source, money, instant = WITNESSES.paymentBusinessDate.instant) {
    const row = await call(C + 'createPayment', project(), { payableRecordId: rowId(source), currency: 'CNY', amountExcludingTax: money.net, taxAmount: money.tax, amountIncludingTax: money.gross, paymentDate: instant, costCategory: context.costCategory, sourceType: 'manual' });
    same(row.status, 'recorded', 'payment-before-confirm-recorded'); return remember('PaymentRecord', row);
  }
  async function confirmPayment(row) {
    const confirmed = await call(C + 'confirmPayment', rowId(row), { expectedVersion: rowVersion(row) });
    same(confirmed.status, 'confirmed', 'payment-real-confirmation'); same(confirmed.confirmedBy, full().id, 'real-payment-confirmer'); return confirmed;
  }
  async function publish(suffix, rateValue, extra = {}) {
    auditFull();
    const body = { rateScopeType: 'role', roleCode: role(suffix), rateUnit: 'hour', rateValue, currency: 'CNY', effectiveFrom: '2026-01-01', changeReason: `R4E21-${context.tag}-真实费率发布`, ...extra };
    const response = await call(E + 'publishInternalCostRateVersion', null, body);
    same(response.targetType, 'InternalCostRateVersion', 'rate-command-target'); same(response.businessStatusAfter, 'active', 'rate-command-active');
    for (const k of ['rateValue', 'rateKey', 'rateUnit', 'personId', 'roleCode', 'currency']) check(!own(response, k), 'rate-command-no-raw-sensitive-receipt');
    check(uuid(response.targetId), 'actual-published-rate-id');
    const rows = list(await auditRows('InternalCostRateVersion', response.targetId));
    const audit = rows.find(r => r.afterSnapshot?.id === response.targetId && r.afterSnapshot?.status === 'active');
    check(audit, 'actual-rate-audit-readback');
    same(audit.afterSnapshot.rate_value, rateValue, 'real-rate-value-audit');
    const snapshot = audit.afterSnapshot;
    check(Number.isSafeInteger(snapshot.row_version) && snapshot.row_version > 0, 'real-rate-CAS-from-audit');
    const row = { id: response.targetId, rowVersion: snapshot.row_version, snapshot, body };
    remember('InternalCostRateVersion', row); return row;
  }
  function laborBody(rate, from, to, hours, extra = {}) {
    return { costType: 'labor', laborRole: rate.body.roleCode, laborPeriodType: 'month', laborPeriodStart: from, laborPeriodEnd: to, actualHours: hours, rateVersionId: rowId(rate), workSummary: `R4E21-${context.tag}-按明确区间和数量登记`, costDescription: '真实费率版本乘真实请求数量，完整保存舍入依据', attachmentIds: [], ...extra };
  }
  async function labor(rate, from, to, hours, amount, extra = {}) {
    const body = laborBody(rate, from, to, hours, extra);
    const command = await call(E + 'createProjectActualCostRecord', project(), body);
    const row = await readCost(command.targetId);
    costView(row, { ...laborLayers(amount), internalCostRate: rate.body.rateValue, rateVersionId: rate.id, ...(hours === null ? { actualPersonDays: extra.actualPersonDays } : { actualHours: hours }) }, { labor: true, date: from });
    remember('ProjectActualCostRecord', row); return { row, body, rate };
  }
  function assessment(key, from, to = from) {
    const a = context.assessments?.[key];
    required(a && typeof a.attributedStage === 'string' && a.attributedStage.trim().length > 0 && typeof a.reason === 'string' && a.reason.trim().length > 0 && typeof a.evidenceSummary === 'string' && a.evidenceSummary.trim().length > 0, `real-responsible-stage-assessment:${key}`);
    required(a.periodStart === from && a.periodEnd === to, `assessment-full-period:${key}`);
    return a;
  }
  function stageBody(cost, a, evidence) {
    return { stageAttributionMode: 'manual', attributedStage: a.attributedStage, expectedVersion: rowVersion(cost), attributionSummary: a.evidenceSummary, comment: a.reason, attributionEvidence: evidence ?? { kind: 'manual', businessDate: a.periodStart, reason: a.reason, evidenceSummary: a.evidenceSummary, attachmentIds: [] } };
  }
  async function confirmStage(cost, body, expectedLayers = witnessLayers()) {
    const command = await call(E + 'confirmCostStageAttribution', rowId(cost), body);
    check(uuid(command.evidenceId) && uuid(command.targetId), 'real-F-stage-and-evidence-ids');
    const view = await call(E + 'getCostStageAttribution', command.targetId);
    same(view.costRecordId, cost.id, 'F-attribution-real-cost'); same(view.governanceCertification, 'verified', 'F-evidence-verified');
    same(view.attributedStage, body.attributedStage, 'explicit-stage-retained');
    const p = view.evidenceProjection; check(p?.mode === 'full' && typeof p.value === 'string', 'F-safe-evidence-projection');
    const visible = JSON.parse(p.value); check(/^[0-9a-f]{64}$/.test(visible.payloadHash), 'F-public-evidence-hash');
    check(!own(visible, 'sourceVersionTransitions') && !own(visible, 'sourcePayload'), 'F-public-projection-not-internal-proof');
    const after = await readCost(cost.id);
    costView(after, expectedLayers, { labor: cost.costType === 'labor', status: 'confirmed', date: cost.occurredOn });
    same(after.stageDerivedFromId, command.targetId, 'cost-stage-references-real-F-row');
    remember('CostStageAttributionSnapshot', view); return { command, view, cost: after, visible };
  }
  // This hook never creates a fact. The real PG row is separate evidence, not
  // a hidden HTTP field, a mock, or a successful HTTP response counted twice.
  async function observeProof(evidenceId, costId, expected, previousEvidenceId = null) {
    const observation = { kind: 'read-only-PG-source-proof', evidenceId, costRecordId: costId, expected: clone(expected), status: 'not-run' };
    active.observations.push(observation);
    if (typeof observeEvidence !== 'function') { observation.status = 'needs-evidence'; observation.reason = 'observeEvidence-hook-not-provided'; return; }
    try {
      const receipt = await observeEvidence(evidenceId, auditFull(), { caseId: active.id, readOnly: true });
      required(receipt && typeof receipt.receiptId === 'string' && receipt.receiptId.length > 0, 'real-PG-receiptId-required');
      observation.receiptId = receipt.receiptId;
      const row = receipt.body; same(row?.id, evidenceId, 'PG-evidence-id-binding'); same(row.schema_version, 1, 'PG-certified-schema');
      same(row.payload_hash, hash(row.frozen_payload), 'PG-payload-hash');
      const proof = row.frozen_payload?.sourceVersionTransitions?.find(p => p.costRecordId === costId);
      check(proof, 'PG-exact-source-version-proof');
      for (const [key, value] of Object.entries(expected)) {
        if (['confirmedPaymentNetTotal', 'capturedConfirmedPaymentNetTotal', 'rateEffectiveTo'].includes(key)) continue;
        same(proof[key], value, `PG-proof:${key}`);
      }
      same(proof.sourcePayload?.row_version, proof.currentVersion, 'PG-proof-source-version-binding');
      same(proof.currentPayloadHash, hash(proof.sourcePayload), 'PG-current-source-payload-hash');
      const capturedCost = row.frozen_payload.costBefore ?? row.frozen_payload.sources?.find(s => s.cost?.id === costId)?.cost;
      check(capturedCost?.source_basis?.sourcePayload, 'PG-original-immutable-captured-source');
      same(capturedCost.source_basis.sourceRowVersion, proof.capturedVersion, 'PG-captured-source-version');
      same(proof.capturedPayloadHash, hash(capturedCost.source_basis.sourcePayload), 'PG-original-payload-hash');
      if (own(expected, 'confirmedPaymentNetTotal')) same(proof.sourcePayload.confirmed_payment_amount_excluding_tax_total, expected.confirmedPaymentNetTotal, 'PG-real-confirmed-net-aggregate');
      if (own(expected, 'capturedConfirmedPaymentNetTotal')) same(capturedCost.source_basis.sourcePayload.confirmed_payment_amount_excluding_tax_total, expected.capturedConfirmedPaymentNetTotal, 'PG-original-confirmed-net-capture');
      if (own(expected, 'rateEffectiveTo')) same(proof.sourcePayload.effective_to, expected.rateEffectiveTo, 'PG-controlled-rate-exact-cutoff');
      if (previousEvidenceId) {
        const priorReceipt = await observeEvidence(previousEvidenceId, auditFull(), { caseId: active.id, readOnly: true, role: 'previous-certified-anchor' });
        required(priorReceipt?.receiptId, 'real-previous-PG-receipt-required');
        observation.previousReceiptId = priorReceipt.receiptId;
        const prior = priorReceipt.body;
        same(prior.id, previousEvidenceId, 'PG-previous-evidence-binding'); same(prior.payload_hash, hash(prior.frozen_payload), 'PG-previous-evidence-hash');
        const anchor = prior.frozen_payload.sourceVersionTransitions?.find(p => p.costRecordId === costId);
        check(anchor, 'PG-previous-certified-source-proof');
        same(proof.previousCertifiedVersion, anchor.currentVersion, 'PG-latest-certified-version-anchor');
        same(proof.previousPayloadHash, anchor.currentPayloadHash, 'PG-latest-certified-hash-anchor');
        same(proof.capturedPayloadHash, anchor.capturedPayloadHash, 'PG-original-capture-never-rewritten');
      } else {
        same(proof.previousCertifiedVersion, proof.capturedVersion, 'PG-first-proof-uses-original-capture');
        same(proof.previousPayloadHash, proof.capturedPayloadHash, 'PG-first-proof-capture-hash');
      }
      observation.status = 'passed';
    } catch (error) {
      observation.status = error instanceof MissingContext ? 'needs-evidence' : 'failed';
      observation.reason = error.code ?? 'read-only-evidence-observation-failed';
    }
  }

  const implementations = {
    async 'E21-01'() {
      base(); const first = await createExpense();
      expenseView(await readExpense(first.id), { amountIncludingTax: '106.00', expenseDescription: expenseBody().expenseDescription });
      expenseView(find(await call(E + 'listExpenseRecords', project()), first.id), { amountIncludingTax: '106.00' });
      const updated = await call(E + 'updateExpenseRecord', first.id, { expenseDescription: `R4E21-${context.tag}-费用修订说明`, amountExcludingTax: '200.00', taxAmount: '12.00', amountIncludingTax: '212.00', expectedVersion: rowVersion(first) });
      expenseView(updated, { amountExcludingTax: '200.00', taxAmount: '12.00', amountIncludingTax: '212.00', expenseDescription: `R4E21-${context.tag}-费用修订说明` });
      await call(E + 'updateExpenseRecord', first.id, { expenseDescription: '陈旧写入不能覆盖', expectedVersion: rowVersion(first) }, 'full', 409);
      const confirmed = await call(E + 'confirmExpenseRecord', first.id, { expectedVersion: rowVersion(updated) });
      expenseView(confirmed, { amountIncludingTax: '212.00' }); same(confirmed.status, 'confirmed', 'expense-confirm-state');
      await call(E + 'updateExpenseRecord', first.id, { expenseDescription: '确认后不能直改', expectedVersion: rowVersion(confirmed) }, 'full', 422);
      const voided = await call(E + 'voidExpenseRecord', first.id, { reason: '验收专用费用已确认未映射，责任作废', comment: '保留完整更新及确认历史', expectedVersion: rowVersion(confirmed) });
      expenseView(voided, { amountIncludingTax: '212.00', voidReason: '验收专用费用已确认未映射，责任作废: 保留完整更新及确认历史' });
      same(voided.status, 'voided', 'expense-void-terminal');
      await call(E + 'confirmExpenseRecord', first.id, { expectedVersion: rowVersion(voided) }, 'full', 422);
      await call(E + 'voidExpenseRecord', first.id, { reason: '不可重复作废', expectedVersion: rowVersion(voided) }, 'full', 422);
      state.expenseHistory = { first, updated, confirmed, voided };
    },
    async 'E21-02'() {
      base(); const source = await confirmedExpense();
      const mapped = await mapCost('expense', source, 'expenseRecordId');
      costView(mapped.row, witnessLayers(), { date: '2026-11-04' });
      await call(E + 'createProjectActualCostRecord', project(), mapped.body, 'full', 409);
      await call(E + 'voidExpenseRecord', source.id, { reason: '映射存在不得作废真源', expectedVersion: rowVersion(source) }, 'full', 422);
      await call(E + 'updateExpenseRecord', source.id, { amountIncludingTax: '107.00', expectedVersion: rowVersion(source) }, 'full', 422);
      const after = await readExpense(source.id); same(after.rowVersion, source.rowVersion, 'mapped-source-unchanged');
      state.expenseMapping = mapped;
    },
    async 'E21-03'() {
      base(); const before = list(await call(E + 'listExpenseRecords', project())).map(r => r.id).sort();
      for (const gross of ['1.001', '1.200', '0.00', '-1.00', '10000000000000000.00', '1e2']) {
        await call(E + 'createExpenseRecord', project(), expenseBody({ amountIncludingTax: gross, taxAmount: null, amountExcludingTax: null }), 'full', 400);
      }
      await call(E + 'createExpenseRecord', project(), expenseBody({ taxAmount: '6.01' }), 'full', 422);
      const after = list(await call(E + 'listExpenseRecords', project())).map(r => r.id).sort();
      same(JSON.stringify(after), JSON.stringify(before), 'invalid-money-writes-no-expense-fact');
      const unknownTax = await createExpense({ amountIncludingTax: '10.00', amountExcludingTax: null, taxAmount: null });
      expenseView(unknownTax, { amountIncludingTax: '10.00', amountExcludingTax: null, taxAmount: null });
      state.unknownTaxExpense = unknownTax;
    },
    async 'E21-04'() {
      base(); const source = await payable(); const recorded = await payment(source, WITNESSES.money);
      await call(E + 'createProjectActualCostRecord', project(), { costType: 'payment-fact', paymentRecordId: recorded.id, expectedSourceVersion: rowVersion(recorded) }, 'full', 409);
      const confirmed = await confirmPayment(recorded);
      const mapped = await mapCost('payment-fact', confirmed, 'paymentRecordId');
      costView(mapped.row, witnessLayers(), { date: '2026-11-04' });
      await call(E + 'createProjectActualCostRecord', project(), mapped.body, 'full', 409);
      const actualPayment = find(await call(C + 'listPayments', project()), confirmed.id);
      same(actualPayment.contractId, context.activeContract.id, 'payment-real-contract-inherited');
      state.paymentMapping = mapped;
    },
    async 'E21-05'() {
      base();
      const created = await call(C + 'createInvoice', project(), { invoiceType: 'input', invoiceNumber: `R4E21-${context.tag}-explicit`, invoiceAmount: '106.00', invoiceDate: '2026-11-04', currencyCode: 'CNY' });
      remember('InvoiceRecord', created);
      await call(E + 'createProjectActualCostRecord', project(), { costType: 'invoice', invoiceRecordId: created.id, expectedSourceVersion: rowVersion(created) }, 'full', 409);
      const verified = await call(C + 'updateInvoice', created.id, { status: 'verified', expectedVersion: rowVersion(created) });
      const mapped = await mapCost('invoice', verified, 'invoiceRecordId');
      costView(mapped.row, layers(null, null, '106.00'), { date: '2026-11-04' });
      await call(E + 'createProjectActualCostRecord', project(), mapped.body, 'full', 409);
      const bound = await call(C + 'createInvoice', project(), { contractId: context.activeContract.id, invoiceType: 'input', invoiceNumber: `R4E21-${context.tag}-snapshot`, invoiceAmount: '10.00', invoiceDate: '2026-11-04' });
      const boundVerified = await call(C + 'updateInvoice', bound.id, { status: 'verified', expectedVersion: rowVersion(bound) });
      const derived = await mapCost('invoice', boundVerified, 'invoiceRecordId');
      costView(derived.row, layers(null, null, '10.00'), { date: '2026-11-04' });
      same(derived.row.currency, 'CNY', 'real-contract-snapshot-proves-currency');
      const output = await call(C + 'createInvoice', project(), { contractId: context.activeContract.id, invoiceType: 'output', invoiceNumber: `R4E21-${context.tag}-output`, invoiceAmount: '10.00', invoiceDate: '2026-11-04', currencyCode: 'CNY' });
      const outputVerified = await call(C + 'updateInvoice', output.id, { status: 'verified', expectedVersion: rowVersion(output) });
      await call(E + 'createProjectActualCostRecord', project(), { costType: 'invoice', invoiceRecordId: output.id, expectedSourceVersion: rowVersion(outputVerified) }, 'full', 409);
      state.invoiceMapping = mapped;
    },
    async 'E21-06'() {
      base(); const source = await payable(); const mapped = await mapCost('procurement', source, 'payableRecordId');
      costView(mapped.row, witnessLayers(), { date: '2026-11-04' });
      await call(E + 'createProjectActualCostRecord', project(), mapped.body, 'full', 409);
      await call(C + 'updatePayable', source.id, { amountExcludingTax: '101.00', expectedVersion: rowVersion(source) }, 'full', 422);
      await call(C + 'voidPayable', source.id, { reason: '存在实际成本映射不得破坏源', expectedVersion: rowVersion(source) }, 'full', 422);
      state.procurement = mapped;
    },
    async 'E21-07'() {
      base(); const rate = await publish('arithmetic', '123.4567');
      state.arithmetic = await labor(rate, '2026-10-01', '2026-10-03', '1.25', '154.32');
      const tie = await publish('halfup', '17.2850');
      state.replaceable = await labor(tie, '2026-10-01', '2026-10-03', '3.00', '51.86');
      const day = await publish('day', '80.1250', { rateUnit: 'day' });
      await labor(day, '2026-10-01', '2026-10-03', null, '120.19', { actualHours: null, actualPersonDays: '1.50' });
      const minimum = await publish('minimum', '0.5000');
      await labor(minimum, '2026-10-01', '2026-10-01', '0.01', '0.01');
      state.sameRateNextPeriod = await labor(rate, '2026-10-04', '2026-10-04', '1.25', '154.32');
      check(state.sameRateNextPeriod.row.id !== state.arithmetic.row.id, 'rateVersionId-not-unique-cost-identity');
    },
    async 'E21-08'() {
      actorHas('operatingOnly', [P.manage, P.operating], [P.labor]);
      const rate = await publish('zero', '0.0001');
      await call(E + 'createProjectActualCostRecord', project(), laborBody(rate, '2026-10-01', '2026-10-01', '0.01'), 'full', 422);
      await call(E + 'createProjectActualCostRecord', project(), laborBody(rate, '2026-10-01', '2026-10-01', '0.01'), 'operatingOnly', 403);
      await call(E + 'createProjectActualCostRecord', project(), laborBody(state.arithmetic.rate, '2026-11-01', '2026-11-01', '1.001'), 'full', 400);
      await call(E + 'createProjectActualCostRecord', project(), laborBody(state.arithmetic.rate, '2026-11-01', '2026-11-01', '1.25', { actualPersonDays: '1.00' }), 'full', 400);
      await call(E + 'publishInternalCostRateVersion', null, { ...rate.body, roleCode: role('badprecision'), rateValue: '1.00001' }, 'full', 400);
      await call(E + 'replaceLaborCostRecord', state.replaceable.row.id, { laborPeriodStart: '2026-10-01', laborPeriodEnd: '2026-10-03', actualHours: '4.00', rateVersionId: state.replaceable.rate.id, replaceReason: '无劳动敏感读不能探测替代金额', expectedSupersededRecordVersion: state.replaceable.row.rowVersion }, 'operatingOnly', 403);
    },
    async 'E21-09'() {
      base(); required(uuid(context.persons?.partialCoverage), 'actual-new-rate-person:partialCoverage');
      const person = context.persons.partialCoverage; const rate = await publish('split', '10.0000');
      const personal = await publish('unused-person-role', '20.0000', { rateScopeType: 'person', roleCode: null, personId: person, effectiveFrom: '2026-10-10', effectiveTo: '2026-10-20' });
      for (const [from, to] of [['2026-10-01', '2026-10-31'], ['2026-10-01', '2026-10-10'], ['2026-10-20', '2026-10-31'], ['2026-10-10', '2026-10-10']]) {
        await call(E + 'createProjectActualCostRecord', project(), laborBody(rate, from, to, '6.00', { laborPersonId: person }), 'full', 409);
      }
      const parts = [];
      for (const [index, fixed] of WITNESSES.split.entries()) parts.push(await labor(index === 1 ? personal : rate, fixed.from, fixed.to, fixed.hours, fixed.amount, { laborPersonId: person, laborRole: rate.body.roleCode }));
      // Explicit per-slice hours are input witnesses, never calendar prorations.
      state.partialCoverage = { person, rate, personal, parts };
    },
    async 'E21-10'() {
      const original = state.arithmetic;
      await call(E + 'createProjectActualCostRecord', project(), laborBody(original.rate, '2026-10-03', '2026-10-05', '1.25'), 'full', 409);
      const person = state.partialCoverage.person;
      await call(E + 'createProjectActualCostRecord', project(), laborBody(state.partialCoverage.personal, '2026-10-15', '2026-10-16', '1.00', { laborPersonId: person }), 'full', 409);
      const adjacent = await labor(original.rate, '2026-10-05', '2026-10-05', '1.25', '154.32');
      costView(adjacent.row, laborLayers('154.32'), { labor: true, date: '2026-10-05' });
    },
    async 'E21-11'() {
      const original = state.replaceable;
      const zero = await publish('halfup', '0.0001', { effectiveFrom: '2026-11-01', supersedesRateVersionId: original.rate.id, expectedVersion: original.rate.rowVersion });
      const fail = { laborPeriodStart: '2026-11-01', laborPeriodEnd: '2026-11-01', actualHours: '0.01', rateVersionId: zero.id, replaceReason: '同真实role后继率计算0分币不得留下已替代旧事实', expectedSupersededRecordVersion: rowVersion(original.row) };
      await call(E + 'replaceLaborCostRecord', original.row.id, fail, 'full', 422);
      const unchanged = await readCost(original.row.id); same(unchanged.recordStatus, 'registered', 'failed-replace-old-status-rolled-back'); same(unchanged.rowVersion, original.row.rowVersion, 'failed-replace-version-rolled-back');
      const body = { laborPeriodStart: '2026-10-01', laborPeriodEnd: '2026-10-03', actualHours: '4.00', rateVersionId: original.rate.id, replaceReason: '明确工时修订：3.00→4.00，保留前后计算版本', expectedSupersededRecordVersion: rowVersion(unchanged) };
      const command = await call(E + 'replaceLaborCostRecord', original.row.id, body);
      check(uuid(command.targetId) && command.targetId !== original.row.id, 'replacement-creates-new-id');
      const next = await readCost(command.targetId); costView(next, laborLayers('69.14'), { labor: true, date: '2026-10-01' });
      same(next.supersedesRecordId, original.row.id, 'replacement-real-chain');
      const old = await readCost(original.row.id); costView(old, laborLayers('51.86'), { labor: true, status: 'replaced', date: '2026-10-01' });
      check(!old.allowedActions.includes('replace'), 'old-replacement-terminal-action');
      await call(E + 'replaceLaborCostRecord', old.id, { ...body, expectedSupersededRecordVersion: rowVersion(old) }, 'full', 409);
      state.replacement = { original, next, old };
    },
    async 'E21-12'() {
      actorHas('financeOnly', [P.manage], [P.operating, P.labor]); actorHas('operatingOnly', [P.manage, P.operating], [P.labor]); actorHas('laborOnly', [P.manage, P.labor], [P.operating]);
      const expense = state.expenseMapping.source;
      for (const key of ['full', 'financeOnly', 'operatingOnly', 'laborOnly']) {
        const operating = ['full', 'operatingOnly'].includes(key); const laborAllowed = ['full', 'laborOnly'].includes(key);
        expenseView(await call(E + 'getExpenseRecordDetail', expense.id, null, key), { amountIncludingTax: '106.00', expenseDescription: expenseBody().expenseDescription }, !operating);
        expenseView(find(await call(E + 'listExpenseRecords', project(), null, key), expense.id), { amountIncludingTax: '106.00' }, !operating);
        costView(await call(E + 'getProjectActualCostRecordDetail', state.expenseMapping.row.id, null, key), witnessLayers(), { hidden: !operating, date: '2026-11-04' });
        const labor = await call(E + 'getProjectActualCostRecordDetail', state.arithmetic.row.id, null, key);
        costView(labor, { ...laborLayers('154.32'), actualHours: '1.25', internalCostRate: '123.4567', rateVersionId: state.arithmetic.rate.id }, { labor: true, hidden: !laborAllowed, date: '2026-10-01' });
        const rows = list(await call(E + 'listProjectActualCostRecords', project(), null, key));
        costView(find(rows, state.arithmetic.row.id), laborLayers('154.32'), { labor: true, hidden: !laborAllowed });
        costView(find(rows, state.expenseMapping.row.id), witnessLayers(), { hidden: !operating });
      }
      // Finance write authority is not a sensitive read grant, even on a 201.
      const body = expenseBody({ expenseDescription: `R4E21-${context.tag}-无敏感读写回执` });
      const write = await call(E + 'createExpenseRecord', project(), body, 'financeOnly');
      expenseView(write, { amountIncludingTax: '106.00', expenseDescription: body.expenseDescription }, true); remember('ExpenseRecord', write);
    },
    async 'E21-13'() {
      const a = assessment('payable', '2026-11-04'); const mapped = state.procurement;
      const first = await payment(mapped.source, WITNESSES.firstPayment); await confirmPayment(first);
      const current = await call(C + 'getPayable', mapped.source.id);
      same(current.status, 'partially-paid', 'C-real-payable-progress'); same(current.settledAmountExcludingTax, '20.00', 'C-real-payment-aggregate');
      check(current.rowVersion > mapped.source.rowVersion, 'C-real-progress-source-version-advanced');
      const before = await readCost(mapped.row.id); costView(before, witnessLayers(), { date: '2026-11-04' });
      const sourceEvidence = { kind: 'source', sourceType: 'payable-record', sourceId: current.id, sourceVersion: rowVersion(current), businessDate: '2026-11-04', reason: a.reason };
      await call(E + 'confirmCostStageAttribution', before.id, stageBody(before, a, { ...sourceEvidence, sourceVersion: rowVersion(mapped.source) }), 'full', 409);
      same((await readCost(before.id)).rowVersion, before.rowVersion, 'stale-source-F-write-rolled-back');
      const stage = await confirmStage(before, stageBody(before, a, sourceEvidence));
      await observeProof(stage.command.evidenceId, before.id, { capturedVersion: mapped.source.rowVersion, previousCertifiedVersion: mapped.source.rowVersion, currentVersion: current.rowVersion, reason: 'payable-payment-progress-only', sourceType: 'payable-record', sourceId: current.id, confirmedPaymentNetTotal: '20.00', capturedConfirmedPaymentNetTotal: '0.00' });
      state.payableStage = { current, stage, originalSource: mapped.source };
    },
    async 'E21-14'() {
      const prior = state.payableStage;
      const second = await payment(prior.current, WITNESSES.secondPayment); const secondConfirmed = await confirmPayment(second);
      const partial = await call(C + 'getPayable', prior.current.id);
      same(partial.status, 'partially-paid', 'C-still-partial-progress'); same(partial.settledAmountExcludingTax, '50.00', 'C-second-real-net-payment-total');
      check(partial.rowVersion > prior.current.rowVersion, 'C-partial-to-partial-version-advanced');
      await call(C + 'confirmPayment', second.id, { expectedVersion: rowVersion(second) }, 'full', 409);
      await call(C + 'confirmPayment', second.id, { expectedVersion: rowVersion(secondConfirmed) }, 'full', 422);
      same((await call(C + 'getPayable', prior.current.id)).rowVersion, partial.rowVersion, 'duplicate-confirm-no-payable-version-increment');
      const cost = await readCost(prior.stage.cost.id);
      const body = { basisType: 'single-source-project', allocationMethod: 'weighted', sourceCostRecordIds: [cost.id], measurementBasis: 'including-tax', expectedSourceVersions: [{ costRecordId: cost.id, expectedVersion: rowVersion(cost) }], projectShareItems: [{ projectId: project(), allocationWeight: '1.00', allocatedAmount: '106.00', allocationSummary: '同项目单源100%分摊，精确金额106.00' }], basisSummary: '后续治理读取最近已认证source版本；不改原始E basis、不自动included' };
      const basis = await call(E + 'confirmSharedCostAllocationBasis', null, body);
      check(uuid(basis.evidenceId) && uuid(basis.targetId), 'real-F-allocation-basis');
      const results = list(await call(E + 'listSharedCostAllocationResults', basis.targetId));
      same(results.length, 1, 'single-project-real-allocation');
      const allocation = JSON.parse(results[0].financialProjection.value);
      same(allocation.allocatedAmount, '106.00', 'independent-fixed-allocation-witness');
      same(allocation.amountExcludingTax, '100.00', 'allocation-net'); same(allocation.taxCostAmount, '6.00', 'allocation-tax');
      costView(await readCost(cost.id), witnessLayers(), { status: 'confirmed', date: '2026-11-04' });
      await observeProof(basis.evidenceId, cost.id, { capturedVersion: prior.originalSource.rowVersion, previousCertifiedVersion: prior.current.rowVersion, currentVersion: partial.rowVersion, reason: 'payable-payment-progress-only', sourceType: 'payable-record', sourceId: partial.id, confirmedPaymentNetTotal: '50.00', capturedConfirmedPaymentNetTotal: '0.00' }, prior.stage.command.evidenceId);
      const final = await payment(partial, WITNESSES.finalPayment); await confirmPayment(final);
      const current = await call(C + 'getPayable', prior.current.id);
      same(current.status, 'completed', 'formal-C-payable-completed'); same(current.settledAmountExcludingTax, '100.00', 'C-payable-fully-settled');
      check(current.rowVersion > partial.rowVersion, 'C-completed-real-progress-version');
      const basisView = await call(E + 'getSharedCostAllocationBasis', basis.targetId);
      const replacement = await call(E + 'replaceSharedCostAllocationResult', results[0].id, { expectedVersion: rowVersion(results[0]), expectedBasisVersion: rowVersion(basisView), projectShareItems: body.projectShareItems, replacementReason: '依据同一真实应付已付清的最新版本重新核证分摊，金额仍为106.00' });
      const newBasis = await call(E + 'getSharedCostAllocationBasis', replacement.basisId);
      same((await call(E + 'getSharedCostAllocationBasis', basis.targetId)).status, 'superseded', 'old-allocation-basis-terminal');
      await observeProof(newBasis.evidenceId, cost.id, { capturedVersion: prior.originalSource.rowVersion, previousCertifiedVersion: partial.rowVersion, currentVersion: current.rowVersion, reason: 'payable-payment-progress-only', sourceType: 'payable-record', sourceId: current.id, confirmedPaymentNetTotal: '100.00', capturedConfirmedPaymentNetTotal: '0.00' }, basis.evidenceId);
      costView(await readCost(cost.id), witnessLayers(), { status: 'confirmed', date: '2026-11-04' });
      state.progressAllocation = basis;
    },
    async 'E21-15'() {
      base(); const a = assessment('historicalLabor', '2026-10-01', '2026-10-03');
      const rate = await publish('historical', '123.4567'); const original = await labor(rate, '2026-10-01', '2026-10-03', '1.25', '154.32');
      const successor = await publish('historical', '125.0000', { effectiveFrom: '2026-11-01', supersedesRateVersionId: rate.id, expectedVersion: rowVersion(rate) });
      const current = await readCost(original.row.id);
      costView(current, { ...laborLayers('154.32'), internalCostRate: '123.4567', rateVersionId: rate.id, sourceStatusSummary: 'superseded' }, { labor: true, date: '2026-10-01' });
      const stage = await confirmStage(current, stageBody(current, a), laborLayers('154.32'));
      await observeProof(stage.command.evidenceId, current.id, { capturedVersion: rate.rowVersion, previousCertifiedVersion: rate.rowVersion, currentVersion: rate.rowVersion + 1, reason: 'rate-superseded-covered-period', sourceType: 'labor', sourceId: rate.id, rateEffectiveTo: '2026-10-31' });
      // Superseded historical authority remains usable for explicit backfill
      // inside its interval, without substituting the successor's rate.
      await labor(rate, '2026-10-04', '2026-10-04', '1.25', '154.32');
      await call(E + 'createProjectActualCostRecord', project(), laborBody(rate, '2026-11-01', '2026-11-01', '1.25'), 'full', 409);
      state.historicalRate = { original, successor, stage };
    },
    async 'E21-16'() {
      base(); const rate = await publish('cutoff', '17.2850'); const original = await labor(rate, '2026-10-01', '2026-11-05', '3.00', '51.86');
      await call(E + 'publishInternalCostRateVersion', null, { ...rate.body, rateValue: '20.0000', effectiveFrom: '2026-11-01', supersedesRateVersionId: rate.id, expectedVersion: rate.rowVersion }, 'full', 409);
      const cost = await readCost(original.row.id);
      costView(cost, { ...laborLayers('51.86'), sourceStatusSummary: 'active' }, { labor: true, date: '2026-10-01' });
      same(cost.rowVersion, original.row.rowVersion, 'invalid-rate-cutoff-no-cost-rewrite');
      const successor = await publish('cutoff', '20.0000', { effectiveFrom: '2026-11-06', supersedesRateVersionId: rate.id, expectedVersion: rate.rowVersion });
      await call(E + 'publishInternalCostRateVersion', null, { ...successor.body, rateValue: '21.0000', effectiveFrom: '2026-12-01', supersedesRateVersionId: rate.id, expectedVersion: rate.rowVersion }, 'full', 409);
      await call(E + 'publishInternalCostRateVersion', null, { ...successor.body, rateValue: '21.0000', effectiveFrom: '2026-12-01', supersedesRateVersionId: successor.id, expectedVersion: successor.rowVersion + 1 }, 'full', 409);
    },
    async 'E21-17'() {
      base(); required(uuid(context.persons?.priorityChange), 'actual-new-rate-person:priorityChange');
      const a = assessment('priorityChange', '2026-09-01', '2026-09-30');
      const rate = await publish('prioritychange', '10.0000');
      const original = await labor(rate, '2026-09-01', '2026-09-30', '3.00', '30.00', { laborPersonId: context.persons.priorityChange });
      await publish('unused-priority-person', '20.0000', { rateScopeType: 'person', personId: context.persons.priorityChange, roleCode: null, effectiveFrom: '2026-09-15', effectiveTo: '2026-09-20' });
      await call(E + 'confirmCostStageAttribution', original.row.id, stageBody(original.row, a), 'full', 409);
      const current = await readCost(original.row.id);
      costView(current, { ...laborLayers('30.00'), sourceStatusSummary: 'source-unavailable-or-unverified' }, { labor: true, date: '2026-09-01' });
      same(current.rowVersion, original.row.rowVersion, 'new-personal-priority-no-fake-confirmation');
      same(list(await call(E + 'listCostStageAttributions', current.id)).length, 0, 'rejected-F-confirm-no-stage-row');
    },
    async 'E21-18'() {
      base(); const rate = await publish('versionrules', '10.0000');
      await call(E + 'publishInternalCostRateVersion', null, { ...rate.body, rateValue: '11.0000', effectiveFrom: '2026-02-01' }, 'full', 409);
      await call(E + 'publishInternalCostRateVersion', null, { ...rate.body, rateValue: '11.0000', effectiveFrom: '2026-01-01', supersedesRateVersionId: rate.id, expectedVersion: rate.rowVersion }, 'full', 409);
      await call(E + 'publishInternalCostRateVersion', null, { ...rate.body, rateValue: '11.0000', effectiveFrom: '2026-02-01', supersedesRateVersionId: rate.id, expectedVersion: rate.rowVersion + 1 }, 'full', 409);
      const next = await publish('versionrules', '11.0000', { effectiveFrom: '2026-02-01', supersedesRateVersionId: rate.id, expectedVersion: rate.rowVersion });
      check(next.id !== rate.id, 'rate-new-version-identity');
      state.ratePublication = { rate, next };
    },
    async 'E21-19'() {
      auditFull(); actorHas('auditFinanceOnly', [P.audit], [P.operating, P.labor]);
      for (const [type, id, packageKey] of [['ExpenseRecord', state.expenseHistory.first.id, 'operating-finance'], ['ProjectActualCostRecord', state.expenseMapping.row.id, 'operating-finance'], ['ProjectActualCostRecord', state.replacement.old.id, 'labor-cost-rate'], ['InternalCostRateVersion', state.arithmetic.rate.id, 'labor-cost-rate']]) {
        const fullRows = list(await auditRows(type, id)); check(fullRows.length > 0, 'real-audit-history');
        const owned = fullRows.filter(r => r.afterSnapshot || r.beforeSnapshot);
        check(owned.length > 0, 'real-audit-history-snapshots-preserved');
        for (const row of owned) check(row.metadata?.requiredSensitivePackages?.includes(packageKey), 'audit-required-package-tag');
        const hidden = list(await auditRows(type, id, 'auditFinanceOnly'));
        for (const fullRow of owned) {
          const row = find(hidden, fullRow.id);
          for (const key of ['beforeSnapshot', 'afterSnapshot', 'reason']) same(row[key], null, `audit-sensitive-${key}-hidden`);
          const safe = row.metadata;
          if (safe !== null) {
            check(safe && typeof safe === 'object' && !Array.isArray(safe), 'audit-safe-metadata-object');
            same(safe.sensitiveRedacted, true, 'audit-metadata-redacted'); same(safe.operationId, row.eventType, 'audit-safe-operation-reference');
            check(safe.requiredSensitivePackages?.includes(packageKey), 'audit-safe-package-reference');
            check(Object.keys(safe).every(k => ['sensitiveRedacted', 'operationId', 'requiredSensitivePackages', 'schemaVersion', 'projectId', 'contractId'].includes(k)), 'audit-no-freeform-metadata-bypass');
            for (const key of ['projectId', 'contractId']) if (own(safe, key)) check(safe[key] === null || uuid(safe[key]), 'audit-safe-uuid-reference-only');
          }
        }
      }
      const history = list(await auditRows('ExpenseRecord', state.expenseHistory.first.id));
      check(history.some(r => r.beforeSnapshot?.amount_including_tax === '106.00' && r.afterSnapshot?.amount_including_tax === '212.00' && r.afterSnapshot?.expense_description === `R4E21-${context.tag}-费用修订说明`), 'real-expense-before-after-history-not-dropped');
      // Read an intentionally hidden GET, then observe its committed real
      // SecurityEvent via the existing authorized audit API.
      actorHas('financeOnly', [P.manage], [P.operating, P.labor]);
      const expense = state.expenseMapping.source;
      const hiddenRead = await call(E + 'getExpenseRecordDetail', expense.id, null, 'financeOnly');
      expenseView(hiddenRead, { amountIncludingTax: '106.00' }, true);
      const events = list(await call(A + 'listSecurityEvents', null, null, 'auditFull', 200, { actorId: actors.financeOnly.id, eventType: 'sensitive_field.masked', permissionKey: P.operating, path: `/api/expense-records/${expense.id}`, limit: 100 }));
      check(events.some(e => e.actorId === actors.financeOnly.id && e.permissionKey === P.operating && (e.details?.targetId === expense.id || e.details?.sampleTargetIds?.includes(expense.id))), 'projection-only-GET-security-event-persisted');
      for (const event of events) {
        const text = JSON.stringify(event.details);
        check(!text.includes(expenseBody().expenseDescription) && !text.includes(expenseBody().evidenceSummary), 'security-summary-no-sensitive-payload-copy');
      }
    },
    async 'E21-20'() {
      base(); const old = context.legacy?.unprovedInvoice;
      required(old && uuid(old.id) && old.projectId === project() && old.currencyProof === 'missing' && typeof old.receiptId === 'string' && old.receiptId.length > 0, 'real-preexisting-unproved-invoice-and-readonly-receipt-required');
      const current = await call(C + 'getInvoice', old.id);
      same(current.invoiceType, 'input', 'legacy-input-source'); same(current.status, 'verified', 'legacy-verified-source'); rowVersion(current);
      await call(E + 'createProjectActualCostRecord', project(), { costType: 'invoice', invoiceRecordId: current.id, expectedSourceVersion: rowVersion(current) }, 'full', 422);
      // Existence and currency absence need Root's real legacy receipt; the
      // driver never creates old rows or writes NULL with SQL.
      state.legacyInvoiceRejected = { id: old.id, sourceReceiptId: old.receiptId ?? null };
    },
    async 'E21-21'() {
      required(uuid(context.otherProject?.id) && context.otherProject.id !== project(), 'real-different-project');
      const source = state.expenseMapping.source;
      await call(E + 'createProjectActualCostRecord', context.otherProject.id, { costType: 'expense', expenseRecordId: source.id, expectedSourceVersion: rowVersion(source) }, 'full', 409);
      await call(E + 'listProjectActualCostRecords', project(), null, 'full', 400, { costType: 'invented-cost' });
      await call(E + 'createProjectActualCostRecord', project(), { costType: 'expense', expenseRecordId: source.id, amountIncludingTax: '999.00', expectedSourceVersion: rowVersion(source) }, 'full', 400);
      for (const [kind, mapping] of [['payment-fact', state.paymentMapping], ['invoice', state.invoiceMapping], ['expense', state.expenseMapping], ['procurement', state.procurement], ['labor', state.arithmetic]]) {
        const rows = list(await call(E + 'listProjectActualCostRecords', project(), null, 'full', 200, { costType: kind }));
        check(rows.every(r => r.costType === kind), 'real-cost-type-query-filter');
        check(rows.some(r => r.id === mapping.row.id), 'each-union-variant-present');
      }
    },
  };

  function summary() {
    return {
      kind: 'R4E-request-only-API-acceptance-vectors21', initialState: 'not-run',
      producerSourcePins: clone(FROZEN_PRODUCER_SHA256), cases: clone(cases), resources: clone(resources),
      counts: {
        cases: cases.length,
        passed: cases.filter(c => c.status === 'passed').length,
        failed: cases.filter(c => c.status === 'failed').length,
        needsEvidence: cases.filter(c => c.status === 'needs-evidence').length,
        notRun: cases.filter(c => c.status === 'not-run').length,
        httpRequestsPassed: cases.flatMap(c => c.requests ?? []).filter(r => r.status === 'passed').length,
        readOnlyObservationsPassed: cases.flatMap(c => c.observations).filter(o => o.status === 'passed').length,
      },
      knownIntegrationPreconditions: [
        'Use E delivery04 and Root C/F completed/progress-aggregate correction: every confirmed payment, including partial→partial, advances payable CAS; freeze confirmed_payment_amount_excluding_tax_total. No paid alias in adapter.',
        'Root C invoice producer must persist currency_code/currency_source/currency_source_snapshot_id using explicit input or the real contract snapshot→source preparation proof.',
        'Root runtime audit read protection and successful-GET pending-auth flush must be active; finance manage alone grants no sensitive read.',
      ],
      notCoveredHere: ['concurrent requests', 'fault injection / COMMIT acknowledgement ambiguity', 'DB migrations / schema preflight', 'browser / UI / generated clients', 'frozen period-end snapshot and included states without public producers', 'independent G3 / G4'],
    };
  }
  return {
    manifest: summary,
    async run({ caseIds } = {}) {
      required(typeof request === 'function', 'real-request-callback-required');
      check(!invoked, 'suite-is-single-execution-use-new-context-for-rerun'); invoked = true;
      const selected = new Set();
      function select(id) { check(byId.has(id), 'known-case-id'); if (selected.has(id)) return; for (const dep of byId.get(id).dependsOn) select(dep); selected.add(id); }
      for (const id of caseIds ?? cases.map(c => c.id)) select(id);
      for (const item of cases) {
        if (!selected.has(item.id)) continue;
        const blocked = item.dependsOn.find(id => byId.get(id).httpStatus !== 'passed');
        if (blocked) { item.reason = `dependency-http-not-passed:${blocked}`; continue; }
        active = item; item.requests = []; step = 0;
        try {
          await implementations[item.id](); item.httpStatus = 'passed';
          item.status = item.observations.some(o => o.status === 'failed') ? 'failed' : item.observations.some(o => o.status === 'needs-evidence') ? 'needs-evidence' : 'passed';
        } catch (error) {
          item.httpStatus = error instanceof MissingContext && !item.requests.length ? 'not-run' : 'failed';
          item.status = item.httpStatus === 'not-run' ? 'not-run' : 'failed'; item.reason = error.code ?? 'request-callback-or-response-failed';
        }
      }
      return summary();
    },
  };
}
