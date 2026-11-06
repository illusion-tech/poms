import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd());
assert.equal(root.replaceAll('\\', '/').toLowerCase(), 'e:/projects/worktrees/poms-r3hijk-next28/poms');
const destination = path.join(root, 'tools/rust-r4ghi/G/g1');
fs.mkdirSync(destination, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => fs.readFileSync(path.join(root, name));
const sources = [
  '.agents/skills/poms-implementation-governance/SKILL.md',
  '.agents/skills/poms-implementation-governance/references/governance-summary.md',
  'docs/design/api-route-canonical-inventory.md',
  'docs/adr/015-api-route-canonical-grammar.md',
  'docs/design/rust-r4-scope-and-dependencies.md',
  'docs/design/backend-rust-migration-plan.md',
  'docs/design/schema-ddl-design.md',
  'docs/design/table-structure-freeze-design.md',
  'docs/design/phase2-actual-cost-accumulation-stage-view.md',
  'docs/design/phase2-estimated-to-actual-cost-bridge.md',
  'docs/design/phase2-cost-source-to-project-record-mapping.md',
  'docs/design/phase2-project-unified-accounting-view-caliber.md',
  'docs/design/phase2-business-accounting-feedback-rules.md',
  'docs/design/archive/slices/ex-07a-cost-accumulation-snapshot-baseline.md',
  'docs/design/archive/slices/ex-07b-operating-restatement-rebaseline-baseline.md',
  'docs/design/archive/slices/ex-15e2a-project-cost-round1-route-baseline.md',
  'docs/design/archive/slices/ex-06d-payable-payment-tax-semantics-baseline.md',
  'libs/shared/contracts/src/lib/shared-contracts.ts',
  'libs/api/contracts/src/lib/project-cost/project-cost.dto.ts',
  'libs/shared/api-spec/openapi.json',
  'libs/shared/api-client/api/project-cost.service.ts',
  'apps/poms-api/src/app/features/project-cost/project-cost.controller.ts',
  'apps/poms-api/src/app/features/project-cost/project-cost.service.ts',
  'apps/poms-api/src/app/features/project-cost/project-cost.repository.ts',
  'apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts',
  'apps/poms-api/src/app/features/project-cost/operating-baseline-package.entity.ts',
  'apps/poms-api/src/app/features/project-cost/change-package-baseline.entity.ts',
  'apps/poms-api/src/app/features/project-cost/project-operating-snapshot.entity.ts',
  'apps/poms-api/src/app/features/project-cost/period-closing-snapshot.entity.ts',
  'apps/poms-api/src/app/features/project-cost/operating-restatement-record.entity.ts',
  'apps/poms-api/src/app/features/contract-finance/receipt-record.entity.ts',
  'apps/poms-api/src/app/features/contract-finance/invoice-record.entity.ts',
  'apps/poms-api/src/app/features/contract/contract.entity.ts',
  'apps/poms-api/src/migrations/Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts',
  'apps/poms-api/src/migrations/Migration20260414130000_ex07b_operating_restatement_record.ts',
  'apps/poms-api/src/migrations/Migration20260414131000_ex07b_operating_restatement_comments.ts',
  'apps/poms-api/src/migrations/Migration20260415090000_ex08a1_project_handover_core.ts',
  'apps/poms-api/src/migrations/Migration20260502120000_ex56d2_project_cost_operating_enum_checks.ts',
  'apps/poms-api/src/migrations/Migration20260503160000_ex58b_enum_code_value_direct_cutover.ts',
  'apps/poms-api/src/migrations/Migration20261103060000_rust_r4abc_contract_lifecycle.ts',
  'apps/poms-api/src/migrations/Migration20261104060000_rust_r4def_execution_cost.ts',
  'apps/poms-api-rust/src/contract_support/mod.rs',
  'apps/poms-api-rust/src/contract_support/http.rs',
  'apps/poms-api-rust/src/contract_support/validation.rs',
  'apps/poms-api-rust/src/project_handover/mod.rs',
  'apps/poms-api-rust/src/project_handover/model.rs',
  'apps/poms-api-rust/src/project_handover/sources.rs',
  'apps/poms-api-rust/src/project_handover/service.rs',
  'apps/poms-api-rust/src/project_handover/view.rs',
  'apps/poms-api-rust/src/project_cost_governance/mod.rs',
  'apps/poms-api-rust/src/project_cost_governance/store.rs',
  'apps/poms-api-rust/src/project_cost_governance/service.rs',
  'apps/poms-api-rust/src/project_cost_governance/evidence.rs',
  'apps/poms-api-rust/src/project_cost_governance/logic.rs',
  'apps/poms-api-rust/src/project_cost_governance/projection.rs',
  'apps/poms-api-rust/src/project_actual_cost/mod.rs',
  'apps/poms-api-rust/src/project_actual_cost/store.rs',
  'apps/poms-api-rust/src/project_actual_cost/logic.rs',
  'apps/poms-api-rust/src/contract_finance/mod.rs',
  'apps/poms-api-rust/src/contract_finance/store.rs',
  'apps/poms-api-rust/src/contract_finance/model.rs',
  'apps/poms-api-rust/src/contract_readiness/source.rs',
  'apps/poms-api-rust/src/contract_readiness/terms.rs',
  'apps/poms-api-rust/src/project_technical_cost/service.rs',
  'apps/poms-api-rust/src/project_technical_cost/store.rs',
  'apps/poms-admin/src/app/features/project/project-operating-overview.ts',
  'libs/admin/data-access/src/lib/project/project-workspace.store.ts',
  'apps/poms-api-e2e/src/support/actual-cost-api.ts',
  'apps/poms-api-e2e/src/poms-api/actual-cost-workflow.e2e-spec.ts',
];
const manifest = sources.map(source => {
  const bytes = read(source);
  return { path: source, bytes: bytes.length, sha256: hash(bytes) };
});
const sourcePin = name => manifest.find(item => item.path === name);
const specPath = 'libs/shared/api-spec/openapi.json';
const inventoryPath = 'docs/design/api-route-canonical-inventory.md';
const controllerPath = 'apps/poms-api/src/app/features/project-cost/project-cost.controller.ts';
const servicePath = 'apps/poms-api/src/app/features/project-cost/project-cost.service.ts';
const sharedPath = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const spec = JSON.parse(read(specPath));
const inventory = read(inventoryPath).toString('utf8').split(/\r?\n/);
const controller = read(controllerPath).toString('utf8').split(/\r?\n/);
const service = read(servicePath).toString('utf8').split(/\r?\n/);
const definitions = [
  ['activateOperatingBaselinePackage', 'POST', '/api/operating-baseline-packages', 162, 'ActivateOperatingBaselinePackageRequest', 'CommandResult', ['operating_baseline_package', 'change_package_baseline']],
  ['getCurrentOperatingBaselinePackage', 'GET', '/api/projects/{projectId}/operating-baseline-package', 163, null, 'OperatingBaselinePackageSummary', ['operating_baseline_package']],
  ['createProjectOperatingSnapshot', 'POST', '/api/project-operating-snapshots', 164, 'CreateProjectOperatingSnapshotRequest', 'CommandResult', ['project_operating_snapshot']],
  ['getProjectOperatingSnapshot', 'GET', '/api/project-operating-snapshots/{id}', 550, null, 'ProjectOperatingSnapshotSummary', ['project_operating_snapshot']],
  ['createPeriodClosingSnapshot', 'POST', '/api/period-closing-snapshots', 165, 'CreatePeriodClosingSnapshotRequest', 'CommandResult', ['period_closing_snapshot']],
  ['getPeriodClosingSnapshot', 'GET', '/api/period-closing-snapshots/{id}', 533, null, 'PeriodClosingSnapshotSummary', ['period_closing_snapshot']],
  ['createOperatingRestatement', 'POST', '/api/operating-restatements', 166, 'CreateOperatingRestatementRequest', 'CommandResult', ['project_operating_snapshot', 'operating_restatement_record']],
  ['listOperatingRestatements', 'GET', '/api/projects/{projectId}/operating-restatements', 556, null, 'OperatingRestatementListView', ['operating_restatement_record']],
  ['getOperatingRestatement', 'GET', '/api/operating-restatements/{id}', 532, null, 'OperatingRestatementSummary', ['operating_restatement_record']],
];
const nodeTransactions = {
  activateOperatingBaselinePackage: 'Reads project/current+checks optional version outside callback; 760-770 transaction updates old row by id only (no row_version predicate) and inserts package+changes; uq_obp_project_current is last concurrency barrier.',
  createProjectOperatingSnapshot: '797-808 reads project/rebaseline and computes from request; 831 standalone repository save; no source collection or domain lock.',
  createPeriodClosingSnapshot: '853-869 reads project/current/rebaseline outside save; 890 standalone save; uq_pcs_project_period_current is duplicate barrier; expected version is not a replacement capability.',
  createOperatingRestatement: '904-931 reads both snapshots/existing record and optional version before 977-979 transaction; old/new snapshots+record flush together; explicit SELECT FOR UPDATE/CAS not present; ORM version SQL behavior needs runtime proof.',
};
const operations = definitions.map(([name, method, url, canonicalLine, requestSchema, responseSchema, tables]) => {
  const operationId = `ProjectCostController_${name}`;
  const operation = spec.paths[url]?.[method.toLowerCase()];
  assert.equal(operation?.operationId, operationId);
  assert(inventory[canonicalLine - 1].includes(`\`${name}\``));
  const serviceLine = service.findIndex(line => line.includes(`async ${name}(`)) + 1;
  const controllerLine = controller.findIndex(line => line.includes(`async ${name}(`)) + 1;
  assert(serviceLine > 0 && controllerLine > 0);
  return {
    operationId, method, path: url, canonicalPath: url.substring(4),
    canonical: { source: inventoryPath, line: canonicalLine, row: inventory[canonicalLine - 1], status: 'aligned' },
    controller: { path: controllerPath, line: controllerLine },
    service: { path: servicePath, line: serviceLine },
    permission: ['contract:finance:manage'], session: 'pomsSession', writeCsrfRequired: method === 'POST',
    requestDto: requestSchema === null ? null : `${requestSchema}Dto`, requestSchema,
    resultSchema: responseSchema, successStatus: method === 'POST' ? 201 : 200,
    responseSchemaMissingInCurrentOpenApi: method === 'POST',
    response: method === 'POST' ? { targetType: { activateOperatingBaselinePackage: 'OperatingBaselinePackage', createProjectOperatingSnapshot: 'ProjectOperatingSnapshot', createPeriodClosingSnapshot: 'PeriodClosingSnapshot', createOperatingRestatement: 'OperatingRestatementRecord' }[name], requiredFields: ['targetId', 'targetType', 'resultStatus', 'businessStatusAfter', 'approvalRecordId', 'confirmationRecordId', 'todoItemIds'], values: { resultStatus: 'success', businessStatusAfter: 'active', approvalRecordId: null, confirmationRecordId: null, todoItemIds: [] } } : { schema: responseSchema, values: 'persisted exact historical fields; list is an array ordered handled_at DESC,created_at DESC in Node (add id tie-break in Rust)' },
    currentPersistence: { readsOrWrites: tables, access: method === 'POST' ? 'write' : 'read', nodeTransactionBoundary: nodeTransactions[name] ?? 'Repository read only; no historical recalculation in mapper; current baseline is_current=true only.' },
    proposalTransaction: method === 'POST' ? 'borrow CommonSession/Actor; lock all affected projects by UUID; collect+verify producers; guarded UPDATE WHERE row_version/status/current; persist provenance/evidence, H evaluation, audit and auth participation; one Root outer commit; errors roll back all' : 'borrow same outer session; authorize and sensitive projection/security event/auth coflush atomically; return frozen data; never rebase old amount values on current sources',
  };
});

const fragment = { schemaVersion: 1, kind: 'observed-current-nine-operation-contract-not-proposed-change', source: sourcePin(specPath), openapi: spec.openapi, paths: {}, components: { schemas: {}, securitySchemes: spec.components.securitySchemes } };
const queue = ['CommandResult'];
function refs(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) queue.push(value.$ref.slice('#/components/schemas/'.length));
  for (const child of Object.values(value)) refs(child);
}
for (const operation of operations) {
  const value = spec.paths[operation.path][operation.method.toLowerCase()];
  fragment.paths[operation.path] ??= {};
  fragment.paths[operation.path][operation.method.toLowerCase()] = value;
  refs(value);
}
while (queue.length) {
  const key = queue.shift();
  if (Object.hasOwn(fragment.components.schemas, key)) continue;
  assert(spec.components.schemas[key], `missing ${key}`);
  fragment.components.schemas[key] = spec.components.schemas[key];
  refs(spec.components.schemas[key]);
}

const findings = [
  { id: 'G01', priority: 1, drift: 'existing-baseline-drift', status: 'root-accepted-correction', evidence: [`${servicePath}:2349-2378`, 'docs/design/phase2-project-unified-accounting-view-caliber.md:191-209'], observation: 'Node computes margin from contract total; formal design computes confirmed receipts net minus included cost net, divided by confirmed receipts net; zero receipts yields null ratio.', decision: 'Root explicitly accepted formal design formula on 2026-11-06; Rust must diverge from Node test numeric assertions.' },
  { id: 'G02', priority: 1, drift: 'design-change-required', status: 'pending-user-decision-115', evidence: ['apps/poms-api/src/app/features/contract-finance/receipt-record.entity.ts', 'apps/poms-api-rust/src/contract_finance/mod.rs:273-379'], observation: 'Receipt producer has only receipt_amount/date/status, no immutable tax/currency/snapshot basis. Confirmed cash cannot be certified as net income by relabelling or current-rate guessing.', proposal: 'Freeze gross cash semantics + confirmation-time immutable net/tax basis, explicit snapshot id/version and currency; preserve legacy-unverified rows; see receiptBasis.' },
  { id: 'G03', priority: 1, drift: 'design-change-required', status: 'pending-user-decision-115', evidence: ['apps/poms-api-rust/src/project_actual_cost/mod.rs:652-658', 'apps/poms-api-rust/src/project_cost_governance/service.rs:843', 'docs/design/phase2-cost-source-to-project-record-mapping.md:412-471'], observation: 'No business producer sets included status/flag; stage producer ends at confirmed. Source-chain nodes coexist and must not all be summed. Invoice has no payable/payment relation and no net/tax split; ambiguous links cannot be inferred from amount/date/project.', proposal: 'Explicit include/exclude decisions on real source-chain basis, mandatory reasons/expected versions, default payment actual basis, invoice tax support only, procurement exception explicit. No synthetic included fixture.' },
  { id: 'G04', priority: 1, drift: 'existing-baseline-drift', status: 'proposal-awaits-root-freeze', evidence: [`${servicePath}:700-770`, `${servicePath}:796-890`, `${servicePath}:903-979`, `${sharedPath}:9438-9610`], observation: 'Four commands accept authoritative money, tax summaries, action level and baseline version from client; baseline reference UUID/changePackageId are not bound to approved business producer; restatement bypasses rebaseline/date range validation in merge.', proposal: 'Commands accept source identities/versions, explicit inclusion choices and reason; server derives all money/conclusions. Reject legacy authoritative money fields in revised strict DTO, or assertion-only fields with exact equality if Root explicitly freezes transition.' },
  { id: 'G05', priority: 1, drift: 'design-change-required', status: 'proposal-awaits-root-freeze', evidence: ['docs/design/phase2-estimated-to-actual-cost-bridge.md:74-141', 'apps/poms-api-rust/src/contract_readiness/source.rs:57-63', 'apps/poms-api-rust/src/project_handover/sources.rs:168-176', 'apps/poms-api-rust/src/project_handover/service.rs:743-758'], observation: 'Technical-cost producer is project-level; sourceFacts pins package id/version, handover records pin before/after chains. Cannot sum the same project estimate for each contract or treat contract signed amount delta as cost delta.', proposal: 'Freeze original adopted project estimate package once; preserve before/after rebaseline package lineage; derive approved execution change deltas from real cost-version transitions. Distinct conflicting project estimate packages require explicit approved selection, never first-row choice.' },
  { id: 'G06', priority: 1, drift: 'existing-baseline-drift', status: 'proposal-awaits-root-freeze', evidence: [`${servicePath}:760-770`, `${servicePath}:858-890`, `${servicePath}:904-979`, 'apps/poms-api-rust/src/contract_support/http.rs:243-340'], observation: 'Node preflight version/existence reads do not establish the Rust required transaction/lock protocol; baseline nativeUpdate omits CAS. Period and project snapshots have no shared root/source hash to prove restated history belongs to the period.', proposal: 'Single outerTX; source locks; explicit status/version CAS; stable period anchor to paired ProjectOperatingSnapshot; same-period restatement lineage and unique successor; retain original period bytes.' },
  { id: 'G07', priority: 1, drift: 'design-change-required', status: 'proposal-awaits-root-freeze', evidence: [`${sharedPath}:9452-9634`, 'apps/poms-api-rust/src/project_cost_governance/projection.rs:26-152', 'docs/design/phase2-project-unified-accounting-view-caliber.md:56-63'], observation: 'Nine G DTO outputs expose raw financial strings under finance:manage; contract is not protected by operating/labor sensitive projection. Unknown net amount cannot honestly use default zero.', proposal: 'Root freezes financial grouped projection + containsLabor intersection, amount-state/legacy certification, non-reconstructive compatibility nulls; G reuses registered projection mechanism and transactional security writes.' },
  { id: 'G08', priority: 2, drift: 'existing-baseline-drift', status: 'proposal-awaits-root-freeze', evidence: [`${specPath} four POST responses`, 'libs/shared/api-client/api/project-cost.service.ts'], observation: 'All four command 201 responses have description only; their real CommandResult is not represented by current response schema.', proposal: 'Root assigns concrete CommandResult schema to four 201 responses and regenerates full clients after DTO freeze.' },
  { id: 'G09', priority: 1, drift: 'design-change-required', status: 'proposal-awaits-root-freeze', evidence: [`${sharedPath}:9554-9560`, 'apps/poms-api/src/app/features/project-cost/period-closing-snapshot.entity.ts', 'docs/design/schema-ddl-design.md:669-677'], observation: 'periodKey is an arbitrary nonempty string and period snapshots have no business window, currency, source evidence or paired snapshot reference. A current-state aggregate cannot certify an old-period as-of result.', proposal: 'Validate month/ISO week; freeze business timezone (existing cost pipeline Hong Kong), business cutoff plus capture/knowledge cutoff; retain source membership and reconstruct effective contract/baseline versions as of cutoff; fail missing temporal provenance.' },
];

const receiptBasis = {
  status: 'pending-user-decision-115', owner: 'Root migration/shared contracts/C producer edits',
  entryPoints: ['Existing ContractFinanceController_createReceiptRecord: declare gross cash + optional explicit source snapshot; preserve actual receiptDate', 'Existing ContractFinanceController_confirmReceiptRecord: bind/validate same-contract activated term snapshot, freeze basis and confirm receipt in same outerTX'],
  proposedTable: 'receipt_accounting_basis (name pending Root)',
  minimalFields: { receipt_id: 'uuid PK/FK receipt_record.id', project_id: 'uuid, same-project composite scope', contract_id: 'uuid, same-contract scope', receipt_row_version: 'integer, confirmed version', term_snapshot_id: 'uuid same-contract FK; immutable tax source', term_snapshot_version: 'integer', currency: 'char(3), persisted from same-contract producer currency evidence', cash_amount_gross: 'numeric(18,2)>0', amount_excluding_tax: 'numeric(18,2)>=0', tax_amount: 'numeric(18,2)>=0, net+tax=gross', tax_rate: 'numeric scale 4, 0..1', policy_id: 'gross-to-net-half-up-cents-v1', producer_version: 'smallint=1 for certified new records; no legacy auto label', source_payload: 'jsonb exact amount/snapshot/currency/receipt version binding', payload_hash: 'SHA256 canonical source_payload', captured_at: 'timestamptz', captured_by: 'uuid actor' },
  source: { taxRate: 'contract_term_snapshot.tax_rate of exact activated source_preparation/readiness/approved review binding; never contract latest guessed value', currency: 'contract.currency_code validated at activation/preparation; source handover member also freezes currency_code. Verify active-contract currency immutability and bind persisted value+source hash (term snapshot has no standalone frozen currency field in audited model).' },
  calculation: 'If user freezes receiptAmount=gross: cents_net = HALF_UP(cents_gross*10000/(10000+rate_scaled4)); cents_tax=cents_gross-cents_net. Exact integers/rational arithmetic; check capacity; no float and no independent gross/net/tax rounding.',
  unresolved: ['User decision on receiptAmount gross meaning', 'Snapshot basis time: confirmation-time activated snapshot (recommended) versus actual cash-date applicable snapshot; cash before amendment confirmed after amendment must be explicitly covered', 'Rounding per receipt versus cumulative invoice/contract residual policy; proposal per-receipt exact HALF_UP plus tax residual identity', 'Legacy confirmed receipts: explicit evidence correction path under existing/new governed command; until supplied remain legacy-unverified, not zero and not current-rate reinterpreted'],
};

const inclusion = {
  status: 'pending-user-decision-115',
  formalConditions: ['Real E captured source_basis; actual source identity/version/currency/layers/date verified under same transaction locks, allowing only E/F certified semantic version transitions', 'Cost confirmed, current not replaced/voided; active F stage v1 with source-business-date evidence and stable derived stage fields', 'Recognized source chain with exactly one economic measurement role: payment-fact default; invoice tax/support; procurement promise excluded unless explicit approved exception unabsorbed by payment', 'Exclusive fact cannot simultaneously be a current shared source; shared fact consumes only F active result layer amounts and exact basis/result/source versions/hash', 'Net amount known for included net cost; unknown net cannot be filled from gross or tax, and cannot be coalesced to zero', 'No double count across source ID/replacement chain/allocation batch; tax treatment contributes only explicit approved non-deductible adjustment not already included; deductible input VAT remains excluded', 'Explicit include/exclude reason + expected source/cost/stage/allocation versions; all affected project IDs locked in sorted order; CAS row_version/status/flag; immutable per-snapshot membership'],
  options: {
    automatic: 'Do not auto-include every confirmed row. Only a separately frozen source-chain policy can nominate safe candidates; server still records exact membership and exclusion reasons. Ambiguous invoice/source chains or procurement promise require explicit decision.',
    explicitWithinExistingSnapshotCommand: 'Recommended bounded nine-route option: revised createProjectOperatingSnapshot/createPeriodClosingSnapshot accept inclusionDecisions of typed real IDs+expected versions+include/exclude reason; server chooses/certifies layers and computes amounts. CAS included flags + append inclusion membership + snapshot/H evidence/audit/auth together.',
    separateExplicitCommand: 'If domain owner requires inclusion independent of snapshot capture, Root must register a canonical cost inclusion command/DTO/UI first and revise batch count/Issue scope. G cannot add a tenth public operation silently.',
  },
  sharedImportant: 'F allocation remains a confirmed, non-included source set. Prefer record per-result inclusion rather than flip shared source cost to included when only one project share is captured; replacement of any consumed basis needs explicit restatement/delta chain across all affected projects.',
};

const interline = {
  status: 'candidate-G-H-agreement-awaits-root-freeze',
  owner: { G: 'Single producer-source collector, baseline+snapshot+period+restatement and L2 stability facts', H: 'Versioned pure L2 maturity/cost-action evaluation and same-TX DMER/OSER/stage binding producer; all query views consume snapshot context', Root: 'Shared interfaces, outer HTTP adapter, migrations, contracts, generated clients and integration' },
  G_to_H: { function: 'evaluate(session: &mut CommonSession, snapshotId: Uuid, expectedRowVersion: i32, expectedSourceHash: &str, actor: &Actor) -> Result<EvaluationRefs, Error>', atomicity: 'H reloads newly persisted G snapshot+source package using caller connection; no pool, BEGIN/COMMIT, public HTTP call or client amounts', sourcePackage: ['schemaVersion/policyVersion/projectId/snapshotId/rowVersion/sourceHash/producerVersion/currency/businessWindow/knowledgeCutoff', 'baseline package id/version/source package ids, original+handover+execution delta lineage', 'contract members: contractId/snapshotId/preparationId/approvalBindingId/amount net/currency/sourceHash', 'receipt members: id/version/accountingBasisId/sourceSnapshotId/gross/net/tax/currency/hash', 'cost members: costId/version/sourceType/id/sourceVersion/hash/stageId/version/evidenceId/hash/inclusionDecision/member amount net/tax/gross/role', 'allocation basis/result/source snapshot IDs+versions/hash+measurement layer+policy selected-measurement-first v2; no recomputation from rounded ratios', 'tax treatment IDs+versions/evidence IDs/hash/deductibility/pending amount, overlap-safe recognized adjustment', 'registered/confirmed/included/pending/unmapped/unknown-layer counts and nullable amounts, allocation pending/frozen, source chain gaps, historical restatement gaps', 'containsLabor derived transitively from all costs/allocation/tax/source/baseline evidence', 'snapshot root/periodEndSnapshotId/restatesSnapshotId/restatedSnapshotId/rebaselineRecordId and expected provenance'] },
  H_to_G: 'Pure versioned L2 rule function over canonical source package before G insert, then H persist/evaluate after G snapshot insert; Root decides shared function module to avoid cyclic producer authority.',
  provisionalL2RulesFromH: ['Contradictory/invalid provenance/currency => command failure+rollback', 'Lawful missing key facts/unknown amount layers => insufficient+review', 'Pending/unmapped/tax/allocation/restatement gap => preliminary+review', 'Complete mandatory facts+closed gaps => mature+prompt', 'Authoritative cost block can only strengthen aggregate action; no invented amount thresholds; confirmed zero vs unknown distinct'],
  futureIConsumer: 'I consumes exact same snapshot/evaluation/sourceHash lineage in outerTX for closure facts; R5 minimum/phase producer decision pending #115. No synthetic closure/execution transitions.',
};

const ddlProposals = [
  'Root-only SQL-first receipt accounting basis with scoped FKs, immutable hash and certified producer version; add confirmReceipt producer hook, matching ORM/shared DTO/OpenAPI.',
  'Root-only baseline provenance: currency, producer/schema version, original technical-cost package/version/hash, current handover basis/rebaseline refs, change source before/after package IDs+version, source payload/hash; originalBaselineCost immutable across package chain.',
  'Root-only snapshot provenance/evidence with schema version, source payload/hash, calculation/rule policy IDs, currency, actual member IDs+versions+nullable layers, containsLabor; scoped immutable FK/evidence target checks. Prefer normalized member rows where concurrency/FKs need enforcement.',
  'Root-only period->ProjectOperatingSnapshot same-project link, period start/end/business timezone/knowledge cutoff and stable historical root; project snapshot supersedes scoped FK + unique successor; restatement same-period root validation and record rebaseline FK assignment.',
  'Root-only inclusion decision/membership table with typed source-chain role, source/cost/F evidence refs+versions, include/exclude reason, currency/layers and no-double-count key; separate per-result sharing membership so a shared source is not consumed as full original and allocated amount.',
  'Preserve existing uq_obp_project_current, uq_pcs_project_period_current, uq_orr_restates_current, uq_orr_restated_current; add composite same-project identities and version/status checks; no legacy mass backfill/certification.',
  'Protect immutable money/source evidence, period original snapshots and reasons against UPDATE/DELETE beyond current/status/version metadata. Replacements append evidence with causal predecessor.',
];
const dtoProposals = [
  'Keep exact nine operationIds/methods/paths unless user explicitly approves additional inclusion/correction surface; Root owns canonical and route inventory changes.',
  'Baseline request: projectId + expectedProjectVersion/currentPackageVersion + typed approved source/rebaseline/changes IDs and versions + reason; no client originalBaselineCost/changeAmount authority.',
  'Snapshot/period request: projectId + mode/validated period/window + expected source/baseline/project versions + explicit inclusion decisions; amounts, tax/allocation/unmapped summaries, referencedBaselineVersion and action/maturity derived by server.',
  'Restatement request: projectId + period root + actual terminal source snapshot+expectedVersion + reason/summary + real changed source/inclusion decisions; remove free restatedValues authority; preserve frozen business window.',
  'Read responses: grouped operating-finance sensitive projections, labor intersection when containsLabor, sourceCertification + sourceHash + stable lineage, distinguish known zero/unknown/not-applicable; replace leaked raw financial compatibility fields with agreed nullable nulls.',
  'Four POST responses explicitly type CommandResult (or a Root-approved specialized result with snapshot/evaluation/source refs); regenerate and check full shared OpenAPI+clients, no per-line client hand edits.',
];

const validation = {
  executed: ['Static exact nine operationId/method/path and canonical row identity assertions', 'SHA256 + byte-count manifest for named complete files', 'Self-contained OpenAPI schema closure extraction and missing-ref check', 'JSON parse/required-operation invariants'],
  notRunByMandate: ['Product tests, Rust build/lint, Nest build/lint, migration-check, DB/API startup, browser/UI sessions, Git/GitHub mutations'],
  faultMatrix: ['Deny each new table INSERT/UPDATE in turn after earlier work has run; no included flags/package/current switch/snapshot/period/restatement/H records/audit/auth partial commit', 'Force H DMER/OSER/each binding insert failure after G persists snapshot; all G/H rollback', 'Force business audit, sensitive projection security event and auth participant persistence/permission revalidation failure; whole outerTX rolls back', 'Pre-commit abort versus ambiguous commit labelled honestly; no automatic retry that duplicates inclusion/restatement'],
  concurrencyMatrix: ['Two first baseline activations: one current winner; losing insert/update fully rolls back', 'Two supersedes with same expected package version: exactly one succeeds; stale returns conflict; no fork', 'Two same-project/period closing requests: exactly one immutable period+paired project snapshot+H chain', 'Two restatements of same terminal snapshot: one successor; cross-project/cross-period/nonterminal target rejected', 'Snapshot capture vs receipt confirm/source cost replace/stage reclassify/tax replace/allocation whole-batch replace/handover rebaseline: deterministic lock order and coherent before/after source package only', 'Shared allocation across project A/B concurrent captures/replacement: conserve source layers, never combine direct full original with shares, no deadlock/partial share state', 'Session revocation/permission membership change before auth coflush: rollback financial write and required evidence'],
  businessMatrix: ['Multiple contracts valid snapshots, mixed currencies, empty sources, historical superseded snapshot valid-at-period versus current source', 'Receipt gross-net at 0/4-place tax rate, 0.005 cent-boundary HALF_UP, exact huge amounts, multiple receipts residual identity, pre-amendment cash confirmed after amendment', 'Payment+procurement+invoice one economic chain measured once; expense direct chain; missing link blocks eligibility rather than date/amount heuristics', 'Labor 4-place rate/2-place quantity producer and HALF_UP cents reused; no recompute from latest rate', 'Shared selected gross/net/tax layer, residual cent winner, partial unknown layers, deductible/non-deductible/pending tax, no repeated VAT adjustment', 'Margin uses confirmed net receipts (not contract): contract 200000, confirmed net 80000, included net 120000 => -40000.00 and -0.500000; zero confirmed receipts => amount -cost and null rate', 'Period frozen then backdated real receipt/cost correction: original exact persisted payload unchanged; restatement new source hash, same period root, explicit reason and causal changes', 'Original estimate unchanged after approved handover/execution changes; project estimate repeated across two contracts counted once'],
  realUiMatrix: ['No snapshot: existing project operating workspace shows meaningful empty/setup action; read query does not create business snapshots as a side effect', 'Financial operator activates derived baseline, sees true source versions, includes/excludes actual cost candidates with reason and stale-version recovery', 'Creates realtime and valid period freeze through actual UI and existing client; sees receipt net vs gross basis, not editable accounting totals', 'Posts real upstream source correction, creates restatement in UI, opens original period and new history with reason/difference/source versions', 'H query pages all show same snapshot/sourceHash and independent final/retention result; I closure flows consume same evidence', 'Permission matrix: finance manage only, operating sensitive only, finance+operating, finance+operating+labor; raw DTO/DOM/network/tooltips/errors/audit/reason text cannot reconstruct masked salary/cost', 'Narrow and desktop viewport, loading/pending/conflict/403/empty/unverified/unknown-zero distinctions; disabling submit prevents duplicate action but server concurrency remains authoritative'],
};
const audit = {
  schemaVersion: 1, kind: 'G-line-joint-G1-input-audit-candidate', capturedAt: new Date().toISOString(),
  status: 'G1-Pending; product implementation not admitted', issue: 111, parentIssue: 110, jointAcceptanceIssue: 114, userDecisionIssue: 115,
  sourceBase: { worktree: root.replaceAll('\\', '/'), branch: 'codex/poms-r4ghi-next25', sha: 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee', verification: 'Branch/SHA/clean/main equality supplied by Root; no Git command run by G. Source bytes separately SHA256 pinned.', runtimeDelivered: 240, R4Delivered: '67/92', remainingBatch: 25 },
  agent: { task: '/root/r4g_operating', expectedModel: 'gpt-6.1-sol', expectedEffort: 'max', actualModelProof: 'not available from delegated task tool metadata', fastMode: 'unverified; no claim' },
  authorization: { allowed: 'read-only source audit; write tools/rust-r4ghi/G/g1/** only', prohibited: ['product implementation until Root G1 admission', 'Git', 'DB/API startup or SQL execution', 'apps/libs/docs/shared edits', 'private credentials'], sourcePolicy: 'business correctness + formal-source producer evidence; no Node bug equivalence and no synthetic fixture substitute for producer' },
  fullContract: { completeSpec: sourcePin(specPath), completeSharedContracts: sourcePin(sharedPath), completeDto: sourcePin('libs/api/contracts/src/lib/project-cost/project-cost.dto.ts'), fullSpecOperationCount: Object.values(spec.paths).flatMap(p => Object.values(p)).filter(v => v?.operationId).length, fullSpecSchemaCount: Object.keys(spec.components.schemas).length, extractedOperationCount: operations.length, extractedSchemaClosureCount: Object.keys(fragment.components.schemas).length, fragmentFile: 'contract01.json' },
  ssotManifest: 'sources01.json', operations, findings, receiptBasis, inclusion, interline, ddlProposals, dtoProposals,
  precision: { money: 'numeric(18,2), decimal text, i128 cents, checked capacity; true subcent stored amounts rejected rather than silently rounded', rates: 'tax/cost rate four decimal places; labor quantities two; derived margin ratio keeps existing numeric(9,6) contract pending Root explicit change', rounding: 'HALF_UP only at explicit producer calculation boundary; source amounts retain exact stored cents; signed ratios round absolute rational then restore sign', allocations: 'Reuse F selected-measurement-first version 2, largest-remainder-cents-v1, UUID-byte tie-break and bounded secondary layers; never recompute using rounded ratio or invent unknown layers' },
  pendingDecisions: [
    { id: 'G-D01', authority: 'user through Root #115', status: 'pending', subject: 'Gross receipt meaning and immutable traceable net/tax producer/correction boundary', recommendation: receiptBasis },
    { id: 'G-D02', authority: 'user through Root #115', status: 'pending', subject: 'Explicit inclusion/exclusion and reason policy, existing snapshot command versus dedicated public entry', recommendation: inclusion.options },
    { id: 'G-D03', authority: 'user through Root #115', status: 'pending', subject: 'Minimum R5 role freeze and phase transition business producers needed for actual G/H/I flow', recommendation: 'Do not spoof execution state/date or commission freeze; Root scopes real bounded producer after answer.' },
    { id: 'G-D04', authority: 'Root joint G1', status: 'pending', subject: 'Period business window/cutoff/timezone and pairing; historical source validity', recommendation: 'Month+ISO week validated in existing business Hong Kong timezone; cumulative as-of period end with actual knowledge capturedAt; original period immutable; late backdated changes explicit restatement.' },
    { id: 'G-D05', authority: 'Root joint G1/domain source owner', status: 'pending', subject: 'Project estimate selected once when multiple contracts refer different project cost packages; post-handover execution change producer', recommendation: 'Freeze unique approved source package and explicit version-transition deltas; reject conflicting source selections rather than sum or pick first.' },
    { id: 'G-D06', authority: 'Root joint G1', status: 'pending', subject: 'L2 rule/module owner, nullable unknown money and grouped sensitive outputs', recommendation: interline.owner },
  ],
  checks: validation,
  conclusion: 'Ready for independent input review only. No G1 Pass, no G2 implementation, no product acceptance, no G3/G4 claim. Root must incorporate user decisions, freeze shared resources/interfaces and assign independent worktree before G2.',
  memoryUsed: { file: 'MEMORY.md', lines: '330-354', use: 'Chinese governance artifacts, bounded child issue completion, model/evidence ownership; all current facts from checkout/Root, not historical delivery counts', rolloutId: '01a1745d-bfa3-7603-b07d-16afa227d566' },
};
const output = (name, value) => {
  const target = path.resolve(destination, name);
  assert(target.startsWith(destination + path.sep));
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', 'utf8');
};
output('sources01.json', { schemaVersion: 1, baselineSha: audit.sourceBase.sha, capturedAt: audit.capturedAt, files: manifest });
output('contract01.json', fragment);
output('audit01.json', audit);
console.log(JSON.stringify({ status: audit.status, operations: operations.length, sourceFiles: manifest.length, completeSpecOperations: audit.fullContract.fullSpecOperationCount, completeSpecSchemas: audit.fullContract.fullSpecSchemaCount, extractedSchemas: audit.fullContract.extractedSchemaClosureCount, findings: findings.length, files: ['audit01.json', 'audit01.md', 'sources01.json', 'contract01.json'] }));
