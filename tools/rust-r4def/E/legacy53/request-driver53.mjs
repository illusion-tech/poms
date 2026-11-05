// Request-only: Root supplies real Native/Rust HTTP and independent read-only PG.
// No SQL writes, environment access, executable import or network on import.
const clone = value => structuredClone(value);
const need = (ok, code) => { if (!ok) throw Object.assign(new Error(code), { code }); };
const uid = value => { need(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), 'actual-returned-uuid-required'); return value; };
const ver = row => { need(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0, 'actual-current-source-version-required'); return row.rowVersion; };
const principal = value => { uid(value?.id); need(Array.isArray(value.permissions) && value.permissions.includes('contract:finance:manage'), 'actual-authenticated-financial-actor-required'); return value; };
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
const exact = (a, b, code) => need(JSON.stringify(ordered(a)) === JSON.stringify(ordered(b)), code);
export const OPERATIONS53 = Object.freeze({
  ContractFinanceController_createInvoice: ['POST', '/api/projects/{id}/invoice-records', 201],
  ContractFinanceController_updateInvoice: ['PATCH', '/api/invoice-records/{id}', 200],
  ContractFinanceController_getInvoice: ['GET', '/api/invoice-records/{id}', 200],
  ProjectCostController_createProjectActualCostRecord: ['POST', '/api/projects/{id}/actual-cost-records', 201],
});
export function legacyInvoicePayload53(tag) {
  need(/^[A-Za-z0-9_-]{1,24}$/.test(tag ?? ''), 'fresh-bounded-case-tag-required');
  // Deliberately the actual old Native shape: no currencyCode/contractId.
  return { invoiceType: 'input', invoiceNumber: `R4DEF53-${tag}-OLD-NATIVE`, invoiceAmount: '106.00', invoiceDate: '2026-11-04' };
}

export function createLegacyInvoiceAcceptance53(context, { nativeRequest, rustRequest, observeInvoice } = {}) {
  const stages = ['guard-context', 'Native-old-shape-create', 'Native-formal-verified', 'independent-PG-before', 'Rust-E-rejects-unproved-currency', 'independent-PG-after'].map(name => ({ name, status: 'not-run' }));
  const receipts = [], observations = []; let current = 'not-run', invoice, before, PGReceiptBefore;
  const payload = legacyInvoicePayload53(context.tag ?? 'not-executed');
  const projectId = context.projectId;
  async function call(backend, op, id, body, expected) {
    const actor = principal(backend === 'Native' ? context.nativeActor : context.rustActor);
    const callback = backend === 'Native' ? nativeRequest : rustRequest, def = OPERATIONS53[op];
    need(typeof callback === 'function' && def, 'actual-backend-specific-HTTP-callback-required'); uid(id);
    const meta = { method: def[0], path: def[1].replace('{id}', id), query: {}, caseId: `legacy53-${current}`, stepId: `legacy53-${receipts.length + 1}`, backend };
    const record = { ...meta, operationId: op, actorId: actor.id, expectedStatus: expected ?? def[2], status: 'requested' }; receipts.push(record);
    const response = await callback(op, id, clone(body), actor, meta);
    need(typeof response?.receiptId === 'string' && response.receiptId.length > 0, 'actual-original-HTTP-receipt-required');
    Object.assign(record, { receiptId: response.receiptId, requestId: response.requestId ?? null, httpStatus: response.status, status: response.status === record.expectedStatus ? 'passed' : 'failed' });
    need(response.status === record.expectedStatus, 'unexpected-actual-HTTP-status'); return response.body;
  }
  async function proof(phase) {
    const observation = { kind: 'independent-read-only-invoice-proof', phase, invoiceId: invoice.id, status: 'not-run' }; observations.push(observation);
    if (typeof observeInvoice !== 'function') { observation.status = 'needs-evidence'; observation.reason = 'Actual HTTP summary does not prove the three persisted NULL currency columns'; return null; }
    const receipt = await observeInvoice(invoice.id, context.rustActor, { namespace: 'poms-r4def', projectId, instanceId: context.environment.instanceId, readOnly: true, phase });
    need(receipt?.receiptId && receipt.body, 'actual-read-only-PG-receipt-required');
    const data = receipt.body, identity = data.identity, row = data.invoice;
    need(identity?.namespace === 'poms-r4def' && identity.instanceId === context.environment.instanceId && identity.database === 'poms_r4def_rust' && identity.migrationCount === 94, 'same-real-new-namespace-Rust-DB94-guard');
    need(row?.id === invoice.id && row.project_id === projectId && row.contract_id === null && row.invoice_type === 'input' && row.status === 'verified' && row.exception_status === 'none', 'actual-eligible-old-protocol-input-row');
    need(row.invoice_no === payload.invoiceNumber && row.invoice_amount === '106.00' && row.invoice_date === '2026-11-04' && row.row_version === ver(invoice), 'actual-HTTP-to-PG-row-binding');
    for (const key of ['currency_code', 'currency_source', 'currency_source_snapshot_id']) need(Object.hasOwn(row, key) && row[key] === null, 'all-three-real-currency-columns-must-be-NULL');
    need(Array.isArray(data.currentMappings) && data.currentMappings.length === 0, 'no-current-project-cost-mapping-persisted');
    observation.status = 'passed'; observation.receiptId = receipt.receiptId;
    if (phase === 'before') PGReceiptBefore = receipt.receiptId;
    return data;
  }
  const jobs = {
    async 'guard-context'() {
      uid(projectId); principal(context.nativeActor); principal(context.rustActor); uid(context.environment?.instanceId);
      need(context.environment.namespace === 'poms-r4def' && context.environment.database === 'poms_r4def_rust' && context.environment.migrationCount === 94 && context.environment.nativeOrigin === 'http://127.0.0.1:31342' && context.environment.rustOrigin === 'http://127.0.0.1:31341', 'Root-actual-isolated-Native-and-Rust-same-DB94-context-required');
      need(context.environment.receiptId && context.environment.nativeBuild50ReceiptId && context.environment.nativeLoopbackLauncherReceiptId, 'actual-namespace-build-and-loopback-launcher-proofs-required');
    },
    async 'Native-old-shape-create'() {
      invoice = await call('Native', 'ContractFinanceController_createInvoice', projectId, payload);
      uid(invoice.id); ver(invoice);
      need(invoice.projectId === projectId && invoice.invoiceType === 'input' && invoice.status === 'draft', 'Native-real-old-shape-created-draft');
    },
    async 'Native-formal-verified'() {
      invoice = await call('Native', 'ContractFinanceController_updateInvoice', invoice.id, { status: 'verified', expectedVersion: ver(invoice) });
      invoice = await call('Native', 'ContractFinanceController_getInvoice', invoice.id, null);
      need(invoice.status === 'verified' && invoice.invoiceType === 'input' && invoice.exceptionStatus === 'none', 'actual-Native-verified-source-not-SQL-patched'); ver(invoice);
    },
    async 'independent-PG-before'() { before = await proof('before'); },
    async 'Rust-E-rejects-unproved-currency'() {
      const error = await call('Rust', 'ProjectCostController_createProjectActualCostRecord', projectId, { costType: 'invoice', invoiceRecordId: invoice.id, expectedSourceVersion: ver(invoice), costDescription: '真实旧Native协议发票缺不可变币种证明，不能映射为Rust实际成本' }, 422);
      need(typeof error?.message === 'string' && /currency/i.test(error.message), 'E20-422-is-currency-proof-rejection-not-another-source-error');
      need(!JSON.stringify(error).includes('106.00'), 'rejection-does-not-echo-hidden-source-money');
    },
    async 'independent-PG-after'() {
      const after = await proof('after');
      if (before && after) exact(after.invoice, before.invoice, 'Rust-rejection-did-not-correct-or-mutate-legacy-invoice');
      const actual = await call('Native', 'ContractFinanceController_getInvoice', invoice.id, null);
      need(actual.rowVersion === invoice.rowVersion && actual.status === 'verified', 'old-producer-source-remains-verified-and-unchanged');
    },
  };
  const manifest = () => ({ kind: 'E20-real-Native-old-protocol-to-Rust-rejection53', stages: clone(stages), receipts: clone(receipts), observations: clone(observations), HTTPPassed: receipts.filter(r => r.status === 'passed').length, completed: stages.every(s => s.status === 'passed') && observations.every(o => o.status === 'passed'), needsEvidence: observations.some(o => o.status === 'needs-evidence'), producerClassification: 'Actual frozen Native old invoice protocol; not a new Rust currency-less create success', initialState: 'not-run' });
  return { manifest, async runAll() { for (const s of stages) { current = s.name; if (s.status !== 'not-run') throw Error('One attempt only; reconcile actual receipts before a fresh run'); try { await jobs[s.name](); s.status = 'passed'; } catch (error) { s.status = 'failed'; s.reason = error.code ?? 'callback-or-assertion-failed'; break; } } return { ...manifest(), invoice, E21LegacyBinding: invoice && PGReceiptBefore ? { id: invoice.id, projectId, currencyProof: 'missing', receiptId: PGReceiptBefore } : null }; } };
}

// Only a request factory for a SEPARATE new probe DB93. Never send to DB94:
// the latter's numeric(18,2) can quantize a 10.123 insert, which is not legacy proof.
export function expensePrecisionProbeRequest53({ projectId, category, tag }) {
  uid(projectId); need(typeof category === 'string' && category.length > 0 && /^[A-Za-z0-9_-]{1,24}$/.test(tag ?? ''), 'actual-probe-project-category-tag-required');
  return { operationId: 'ProjectCostController_createExpenseRecord', id: projectId, method: 'POST', path: `/api/projects/${projectId}/expense-records`, body: { expenseCategory: category, expenseDescription: `R4DEF53-${tag}-真实旧API分币精度见证`, expenseDate: '2026-11-04', currency: 'CNY', amountIncludingTax: '10.123', taxAmount: null, amountExcludingTax: null, sourceType: 'manual', evidenceSummary: '仅用于独立93探针库的真实API历史超分币行；禁止SQL修改金额', attachmentCount: 0 }, requiredEnvironment: { freshProbe: true, existingMigrations: 93, existingPomsBaseTables: 113, actualExpenseColumn: 'numeric(15,4)', expectedExactPersistedText: '10.1230', currentRustDB94Forbidden: true }, status: 'not-run' };
}
