// Pure ownership correlation. No files, sockets, SQL or environment access.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { normalizeCatalog70, rowFingerprint70, snapshotFingerprint70, stronglyConnected70 } from '../cleanup70/core70.mjs';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
const key = (table, pk) => table + ':' + JSON.stringify(stable(pk));
const digest = text => createHash('sha256').update(text).digest('hex');
const ms = value => value == null ? NaN : Date.parse(value);
const within = (time, receipt) => Number.isFinite(ms(time)) && ms(time) >= ms(receipt.startedAt) && ms(time) <= ms(receipt.completedAt);
const ignoreUUID = /^(createdBy|updatedBy|operatorId|actorId|uploadedBy|ownerUserId|participantId|participantUserId|userId|currentApproverUserId|executionOwnerUserId|salesOwnerUserId)$/;
function ids(value, output = new Set(), field = '') { if (ignoreUUID.test(field)) return output; if (uuid(value)) output.add(value); else if (Array.isArray(value)) for (const x of value) ids(x, output, field); else if (value && typeof value === 'object') for (const [k, x] of Object.entries(value)) ids(x, output, k); return output; }
export function sanitize103(value, field = '') { if (/password|cookie|authorization|csrf|secret|token|encrypted/i.test(field)) return '[private]'; if (Array.isArray(value)) return value.map(v => sanitize103(v)); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize103(v, k)])); return value; }
export function normalizeHTTP103(receipt, meta = {}) {
    const r = receipt, response = r.responseBody?.data ?? r.responseBody ?? null, request = r.requestBody ?? null;
    assert(meta.receiptId && typeof r.method === 'string' && typeof r.path === 'string');
    const actorId = r.actorId ?? response?.user?.id ?? meta.actorId ?? null;
    const related = ids(response); ids(request, related); for (const match of r.path.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig)) related.add(match[0]);
    return { kind: 'http', backend: 'rust', receiptId: meta.receiptId, receiptPins: meta.receiptPins ?? [], operationId: r.operationId, method: r.method.toUpperCase(), path: r.path.split('?')[0], status: r.status, requestId: r.requestId ?? null, actorId, principal: request?.username ?? meta.principal ?? null, startedAt: r.startedAt, completedAt: r.completedAt, req: sanitize103(request), res: sanitize103(response), relatedUUIDs: [...related], successfulMutation: r.status >= 200 && r.status < 300 && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(r.method.toUpperCase()), login: r.operationId === 'AuthController_createPasswordAuthSession' && r.status === 200 && response?.authenticated === true, loginUserId: response?.user?.id ?? null, source: meta.source ?? 'actual-harness' };
}
function domain(op, table) {
    if (/^CustomerController_/.test(op)) return /^customer(?:_|$)/.test(table);
    if (/^ProjectController_create$/.test(op)) return table === 'project';
    if (/TechnicalCost/.test(op)) return /^project_technical_/.test(table);
    if (/BidCommercial/.test(op)) return /^project_bid_commercial_/.test(table);
    if (/PricingMargin/.test(op)) return /^project_pricing_margin_|^approval_|^todo_item$/.test(table);
    if (/^ContractReadinessController_/.test(op)) return /^commercial_|^contract_readiness_|^contract_term_|^receivable_plan_|^contract_review_binding$|^approval_|^todo_item$/.test(table);
    if (/^ContractController_/.test(op)) return /^contract(?:_|$)|^receivable_plan_|^approval_|^todo_item$/.test(table);
    if (/^ContractFinanceController_/.test(op)) return /^(invoice_record|payable_record|payment_record|receipt_record)$/.test(table);
    if (/^ProjectCostController_/.test(op)) return /^(expense_record|internal_cost_rate_version|project_actual_cost_record|cost_governance_evidence|cost_stage_attribution_snapshot|accounting_tax_treatment_snapshot|shared_cost_allocation_)/.test(table);
    if (/^ProjectHandoverController_/.test(op)) return /^project_handover(?:_|$)|^contract_handover_|^handover_baseline_|^confirmation_|^approval_summary_|^project_receipt_judgment_freeze$|^todo_item$/.test(table);
    if (/^AttachmentHandoverController_/.test(op)) return /^attachment_download_package|^attachment_link$|^project_handover_attachment_selection$/.test(table);
    if (/^AttachmentUploadSessionController_|^AttachmentController_/.test(op)) return /^attachment(?:_|$)/.test(table) && table !== 'attachment_storage_provider_config';
    if (/^AttachmentStorageProviderController_/.test(op)) return table === 'attachment_storage_provider_config';
    if (/^PlatformController_createUser$/.test(op)) return table === 'platform_user';
    if (/^PlatformController_createRole$/.test(op)) return table === 'role';
    if (/^DictionaryController_/.test(op)) return table === 'dictionary_item';
    if (/^ApprovalController_/.test(op)) return /^approval_|^todo_item$/.test(table);
    return false;
}
const readProducer = r => r.status >= 200 && r.status < 300 && ['AttachmentHandoverController_getChecklist'].includes(r.operationId);
const created = row => row.created_at ?? row.linked_at ?? row.assigned_at ?? row.uploaded_at ?? row.generated_at ?? row.submitted_at ?? row.occurred_at;
const actorColumn = name => /^(created_by|updated_by|operator_id|actor_id|uploaded_by|generated_by|handled_by|confirmed_by|effective_by|decided_by|assigned_by|revoked_by|participant_user_id|execution_owner_user_id|owner_user_id|current_approver_user_id|initiator_user_id)$/.test(name);
const forbiddenGenericParents = new Set(['platform_user', 'role', 'org_unit', 'auth_session']);
function records(graph, catalog) { const n = normalizeCatalog70(catalog), out = []; for (const table of n.tables) for (const value of graph[table]) { const raw = typeof value === 'string' ? value : typeof value?.raw === 'string' ? value.raw : JSON.stringify(value), row = JSON.parse(raw), primaryKey = Object.fromEntries(n.primaryKeys.get(table).map(c => [c, row[c]])); out.push({ table, row, raw, primaryKey, key: key(table, primaryKey), rowFingerprint: rowFingerprint70(raw) }); } return out; }
function fkEdges(all, catalog) {
    const fks = normalizeCatalog70(catalog).foreignKeys, edges = [];
    for (const f of fks) { if (forbiddenGenericParents.has(f.parent) || f.columns.every(actorColumn)) continue; const parents = new Map(all.filter(r => r.table === f.parent).map(r => [JSON.stringify(f.referencedColumns.map(c => r.row[c])), r])); for (const c of all.filter(r => r.table === f.child)) { const values = f.columns.map(k => c.row[k]); if (values.some(x => x == null)) continue; const p = parents.get(JSON.stringify(values)); if (p) edges.push({ child: c, parent: p, constraint: f.name }); } }
    return edges;
}
export function diagnoseRows103({ baselineRows, liveRows, catalog }) {
    const old = new Set(records(baselineRows, catalog).map(r => r.key)), added = records(liveRows, catalog).filter(r => !old.has(r.key)), by = new Map(added.map(r => [r.key, r]));
    // Diagnostic includes every FK and all actual added rows, even unclaimed.
    // It is not an ownership declaration and never creates a hypothetical ledger.
    const n = normalizeCatalog70(catalog), edges = [];
    for (const f of n.foreignKeys) for (const child of added.filter(r => r.table === f.child)) { const values = f.columns.map(c => child.row[c]); if (values.some(x => x == null)) continue; for (const parent of added.filter(r => r.table === f.parent)) if (f.referencedColumns.every((c, i) => parent.row[c] === values[i])) edges.push({ child: child.key, parent: parent.key, constraint: f.name }); }
    return { classification: 'actual-injected-row-FK-diagnostic-not-ownership-or-DML', actualAddedPKs: added.length, SCCs: stronglyConnected70([...by.keys()], edges).filter(g => g.length > 1 || edges.some(e => e.child === g[0] && e.parent === g[0])).map(g => ({ rows: g.map(id => ({ table: by.get(id).table, primaryKey: by.get(id).primaryKey })), constraints: [...new Set(edges.filter(e => g.includes(e.child) && g.includes(e.parent)).map(e => e.constraint))].sort() })), DMLExecuted: false };
}
export function buildOwnership103({ backend, scope, baselineRows, liveRows, catalog, HTTPReceipts, internalReceipts, fixture, foundation, numberSpecs, supplements = [], sealReceiptId }) {
    const original = records(baselineRows, catalog), old = new Set(original.map(r => r.key)), all = records(liveRows, catalog), added = all.filter(r => !old.has(r.key)), by = new Map(added.map(r => [r.key, r])), claims = new Map(), sourceRecords = HTTPReceipts.filter(r => r.backend === backend);
    const sources = new Map(sourceRecords.map(r => [r.receiptId, r]));
    function claim(record, producerKind, receiptIds, reason, parents = []) { if (!record || !by.has(record.key) || claims.has(record.key)) return false; assert(receiptIds.length && receiptIds.every(x => typeof x === 'string')); claims.set(record.key, { table: record.table, primaryKey: record.primaryKey, rowFingerprint: record.rowFingerprint, beforeAbsent: true, producerKind, receiptIds: [...new Set(receiptIds)], reason, derivedFrom: parents }); return true; }
    const mutations = sourceRecords.filter(r => r.successfulMutation || readProducer(r));
    // New identities must be in the actual accepted response (not request-only IDs).
    for (const r of mutations) {
        const returned = ids(r.res);
        for (const row of added) if (domain(r.operationId, row.table) && Object.values(row.primaryKey).every(x => returned.has(x)) && within(created(row.row), r)) claim(row, 'http-command', [r.receiptId], 'accepted-response-exact-new-PK');
    }
    // Explicit CommonService committed create traces, never a public-read UUID.
    for (const p of internalReceipts ?? []) {
        const out = p.output; if (p.backend !== backend || p.kind !== 'actual-trusted-ApprovalCommonService-material-producer' || !out?.outerCommitAcknowledged || out.traceIncomplete || !out.poolClosed || p.approvalPretended || p.HTTPPretended) continue;
        const project = added.find(r => r.table === 'project' && r.row.id === out.materialReferences?.projectId); if (!project || !claims.has(project.key) || out.trustedInternalActorId !== fixture.fullUserId) continue;
        for (const item of out.createTrace ?? []) if (['approval_summary_package_definition', 'approval_summary_snapshot', 'approval_summary_field_projection'].includes(item.table) && item.proof?.kind === 'rust-insert-outer-commit' && item.proof.outerCommitEventSeq > item.proof.createEventSeq && item.proof.createContext?.op === 'r4def.summary.actual-internal-producer32') { const row = added.find(r => r.table === item.table && r.row.id === item.id); claim(row, 'internal-producer', [p.receiptId, ...claims.get(project.key).receiptIds], 'actual-outer-commit-table-ID-createTrace', [project.key]); }
    }
    // Auth fixture is the only permitted SQL-origin credential ownership carveout.
    if (backend === 'rust') for (const id of fixture.createdCredentialIds ?? []) { const row = added.find(r => r.table === 'local_credential' && r.row.id === id), user = row && added.find(r => r.table === 'platform_user' && r.row.id === row.row.user_id); if (user && claims.has(user.key) && fixture.createdUserIds.includes(user.row.id)) claim(row, 'auth-fixture', [...fixture.receiptIds, ...claims.get(user.key).receiptIds], 'actors33-exact-authorized-created-credential-ID', [user.key]); }
    // Role mappings need exact API subject + explicit requested role/permission,
    // never generic actor/user FK reachability.
    for (const r of mutations) {
        const pathIDs = [...r.path.matchAll(/[0-9a-f]{8}-[0-9a-f-]{27}/ig)].map(x => x[0]);
        if (r.operationId === 'PlatformController_assignRolePermissions') for (const row of added.filter(x => x.table === 'role_permission_assignment')) if (pathIDs.includes(row.row.role_id) && r.req?.permissionKeys?.includes(row.row.permission_key) && (created(row.row) == null || within(created(row.row), r))) claim(row, 'http-command', [r.receiptId], 'exact-role-permission-API-tuple');
        if (r.operationId === 'PlatformController_assignUserRoles') for (const row of added.filter(x => x.table === 'user_role_assignment')) if (pathIDs.includes(row.row.user_id) && r.req?.roleIds?.includes(row.row.role_id) && within(created(row.row), r)) claim(row, 'http-command', [r.receiptId], 'exact-user-role-API-tuple-and-time');
    }
    for (const row of added.filter(r => r.table === 'auth_session')) {
        const logins = sourceRecords.filter(r => r.login && r.loginUserId === row.row.user_id && within(row.row.created_at, r));
        if (logins.length) claim(row, 'managed-auth-audit-security', logins.map(r => r.receiptId), 'actual-successful-login-principal-and-created-at-window');
        else if (backend === 'rust' && foundation?.verified && row.row.user_id === fixture.fullUserId && row.row.created_user_agent === 'poms-r1d-foundation' && within(row.row.created_at, foundation)) claim(row, 'managed-auth-audit-security', foundation.receiptIds, 'real77-full-user-fixed-agent-and-exact-window');
    }
    const edges = fkEdges(all, catalog), timeless = new Set(['customer_alias', 'confirmation_participant', 'contract_review_binding', 'shared_cost_allocation_source_snapshot']);
    for (let changed = true; changed;) { changed = false;
        for (const edge of edges) { const child = edge.child, parentClaim = claims.get(edge.parent.key); if (!by.has(child.key) || claims.has(child.key) || !parentClaim) continue;
            const receipts = mutations.filter(r => domain(r.operationId, child.table) && r.relatedUUIDs.some(id => Object.values(edge.parent.primaryKey).includes(id)) && (within(created(child.row), r) || (created(child.row) == null && timeless.has(child.table) && parentClaim.receiptIds.includes(r.receiptId))));
            if (receipts.length) changed = claim(child, 'internal-producer', [...parentClaim.receiptIds, ...receipts.map(r => r.receiptId)], 'actual-business-FK-plus-related-command-window', [edge.parent.key]) || changed;
        }
    }
    // Event provenance uses actual request_id first. Null-ID UI events additionally
    // require exact target/path/method+actor and an observed HTTP window.
    for (const row of added.filter(r => ['audit_log', 'security_event'].includes(r.table))) {
        const v = row.row, actor = v.operator_id ?? v.actor_id ?? null;
        const matches = sourceRecords.filter(r => {
            if (!within(v.occurred_at, r)) return false;
            if (actor !== (r.actorId ?? null)) return false;
            if (v.request_id) return r.requestId === v.request_id;
            if (r.source !== 'actual-UI') return false;
            if (actor !== r.actorId) return false;
            return row.table === 'audit_log' ? r.successfulMutation && r.relatedUUIDs.includes(v.target_id) : v.path === r.path && String(v.method).toUpperCase() === r.method;
        });
        if (matches.length) claim(row, 'managed-auth-audit-security', matches.map(r => r.receiptId), 'actual-request-target-actor-and-time-provenance');
        else if (backend === 'rust' && foundation?.verified && within(v.occurred_at, foundation) && (v.user_agent === 'poms-r1d-foundation') && (actor === fixture.fullUserId || (actor === null && v.principal === fixture.fullUsername)) && /^r1d-api:[0-9a-f-]{36}:\d+$/.test(v.request_id ?? '')) claim(row, 'managed-auth-audit-security', foundation.receiptIds, 'actual77-fixed-agent-full-user-request-ID-window');
    }
    const counters = [];
    for (const counter of all.filter(r => r.table === 'business_number_sequence')) {
        const spec = numberSpecs[counter.row.scope]; if (!spec || spec.prefix !== counter.row.prefix || spec.padding !== counter.row.padding) continue;
        const regexp = new RegExp('^' + spec.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-' + counter.row.period + '-(\\d{' + spec.padding + ',})$'), witnesses = [];
        for (const row of added.filter(r => claims.has(r.key))) for (const [field, value] of Object.entries(row.row)) if (/_no$/.test(field) && typeof value === 'string') { const m = regexp.exec(value); if (m) witnesses.push({ generatedNo: value, sequence: Number(m[1]), entity: row.key, receiptIds: claims.get(row.key).receiptIds }); }
        const oldCounter = original.find(r => r.key === counter.key), start = oldCounter?.row.next_value ?? 1, end = counter.row.next_value, numbers = new Set(witnesses.map(x => x.sequence));
        const rangeComplete = Number.isSafeInteger(start) && Number.isSafeInteger(end) && end >= start && end - start <= 100000 && Array.from({ length: end - start }, (_, i) => start + i).every(x => numbers.has(x));
        const witness = { table: counter.table, primaryKey: counter.primaryKey, beforeFingerprint: oldCounter?.rowFingerprint ?? null, afterFingerprint: counter.rowFingerprint, beforeNextValue: oldCounter?.row.next_value ?? null, afterNextValue: end, witnesses, exactRangeCovered: rangeComplete }; counters.push(witness);
        if (by.has(counter.key) && rangeComplete && witnesses.length) claim(counter, 'internal-producer', [...new Set(witnesses.flatMap(x => x.receiptIds))], 'actual-recordNo-generation-and-exact-before-after-counter-witness');
    }
    // Explicit Root-only single-PK supplements must already have pinned originals.
    for (const supplement of supplements) {
        assert(supplement.namespace === scope.namespace && supplement.instanceId === scope.instanceId && supplement.backend === backend && supplement.verifiedByRoot === true && supplement.verificationReceiptId && supplement.reason && supplement.receiptIds?.length);
        if (supplement.kind === 'counter-witness') {
            assert.equal(supplement.table, 'business_number_sequence'); const witness = counters.find(c => key(c.table, c.primaryKey) === key(supplement.table, supplement.primaryKey)); assert(witness && witness.beforeFingerprint === supplement.counterBeforeFingerprint && witness.afterFingerprint === supplement.counterAfterFingerprint && witness.afterFingerprint === supplement.rowFingerprint, 'Counter supplement must bind exact actual before/after witness'); witness.explicitRootWitness = { verificationReceiptId: supplement.verificationReceiptId, receiptIds: supplement.receiptIds }; const row = by.get(key(supplement.table, supplement.primaryKey)); if (row) claim(row, 'internal-producer', [...supplement.receiptIds, supplement.verificationReceiptId], 'Root-verified-exact-single-PK-supplement:' + supplement.reason); continue;
        }
        const row = by.get(key(supplement.table, supplement.primaryKey)); assert(row && row.rowFingerprint === supplement.rowFingerprint, 'Supplement must name one exact new current PK/fingerprint, never a baseline/table/prefix'); claim(row, supplement.producerKind, [...supplement.receiptIds, supplement.verificationReceiptId], 'Root-verified-exact-single-PK-supplement:' + supplement.reason);
    }
    const unclaimed = added.filter(r => !claims.has(r.key)).map(r => ({ table: r.table, primaryKey: r.primaryKey, rowFingerprint: r.rowFingerprint, createdAt: created(r.row) ?? null, reason: 'No actual returned identity/authorized fixture/verified event/business-FK producer proof' }));
    const ledger = { namespace: scope.namespace, instanceId: scope.instanceId, backend, liveGraphHash: snapshotFingerprint70(liveRows, catalog), catalogHash: normalizeCatalog70(catalog).structuralHash, sealReceiptId, rows: [...claims.values()] };
    const now = new Map(all.map(r => [r.key, r])), baselineDrift = original.filter(r => !now.has(r.key) || now.get(r.key).rowFingerprint !== r.rowFingerprint).map(r => ({ table: r.table, primaryKey: r.primaryKey, kind: now.has(r.key) ? 'changed' : 'missing', beforeFingerprint: r.rowFingerprint, afterFingerprint: now.get(r.key)?.rowFingerprint ?? null, columns: now.has(r.key) ? Object.keys(r.row).filter(k => JSON.stringify(r.row[k]) !== JSON.stringify(now.get(r.key).row[k])) : [] }));
    return { ledger, unclaimed, counters, baselineDrift, counts: { actualNewPKs: added.length, claimed: claims.size, unclaimed: unclaimed.length, sourceReceipts: sourceRecords.length }, receiptSourceSetHash: digest(JSON.stringify(HTTPReceipts.map(r => [r.receiptId, r.receiptPins]).sort())), actualDMLExecuted: false };
}
