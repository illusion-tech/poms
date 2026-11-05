import hashlib
import json
import pathlib
from datetime import datetime, timezone

folder = pathlib.Path(__file__).resolve().parent
f_root = folder.parents[3]
root = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
operation_file = root / 'docs/design/rust-r4def/joint-g1-06/operation-map06.json'
operations = {op['operationId'].split('_', 1)[1]: op for op in json.loads(operation_file.read_text('utf-8'))['operations']}
cases = []


def fault(id, op, point, phase, assertions, priority='P1', pending=False, numbers=False):
    cases.append({'id': id, 'kind': 'fault', 'priority': priority, 'operation': operations[op], 'point': point,
                  'realSetup': phase, 'rollbackOracle': 'single-statement owned snapshot equality from observed trigger gate; auth baseline is post-eager-touch',
                  'retryOracle': assertions, 'retryCount': 1, 'requiresPendingAuth': pending,
                  'requiresBusinessNumberSnapshot': numbers, 'deadlineMs': 20000, 'runtimeStatus': 'planned-not-run'})


stage = 'confirmCostStageAttribution'
reclass = 'reclassifyCostStageAttribution'
basis = 'confirmSharedCostAllocationBasis'
replace = 'replaceSharedCostAllocationResult'
tax = 'confirmAccountingTaxTreatment'
tax_replace = 'replaceAccountingTaxTreatment'
mapping = 'createProjectActualCostRecord'
labor_replace = 'replaceLaborCostRecord'
stage_setup = 'Real E confirmed expense -> real mapped registered cost; actual business-date evidence; no active attribution/allocation; strict expected cost/source versions'
stage_assert = 'Exactly one new active attribution and immutable evidence, cost confirmedAt/By + version + stage lock atomically set, not included; one audit; captured basis unchanged'
for id, point, priority, pending in [
    ('F01-stage-evidence','f-evidence','P1',False), ('F02-stage-attribution','f-stage-insert','P0',False),
    ('F03-stage-cost-update','f-stage-cost-update','P0',False), ('F04-stage-audit','business-audit','P0',False),
    ('F05-stage-pending-auth','pending-auth','P0',True)]:
    fault(id, stage, point, stage_setup, stage_assert, priority, pending)
for id, point in [('F06-reclass-attribution','f-stage-insert'), ('F07-reclass-audit','business-audit')]:
    fault(id, reclass, point, 'Real prior stage confirmation, not allocated/frozen; responsible actual new evidence and strict current versions', 'Old attribution superseded, exactly one successor; cost version increments once; immutable old evidence and original confirmation remain')
allocation_setup = 'At least two real E->F confirmed costs and two real target projects; one currency/proven layer; distinct source IDs, all projects owned; selectedCostId=max sorted source UUID, selectedProjectId=max sorted target UUID'
allocation_assert = 'One new basis, full N-source set, M results, 1+M evidence rows, audit per distinct affected project; strict per-layer cent conservation and unknown layers remain null; sources and results not included; no second active occupancy'
for id, point, priority in [
    ('F08-basis-evidence','f-evidence','P1'), ('F09-basis-row','f-basis-insert','P1'),
    ('F10-basis-second-source','f-source-insert','P0'), ('F11-basis-second-result-evidence','f-result-evidence','P1'),
    ('F12-basis-second-result','f-result-insert','P0'), ('F13-basis-audit','business-audit','P0')]:
    fault(id, basis, point, allocation_setup, allocation_assert, priority)
replacement_setup = allocation_setup + '; first commit a real complete allocation, then prepare one valid full replacement with the same two target identities and changed weights/explanation, preserving anchored project and strict old result/source versions; oldBasisId from actual receipt'
replacement_assert = allocation_assert + '; old basis/all old results superseded, all old source flags false, new complete batch current, one successor per predecessor; old amounts/weights/evidence/hash unchanged'
for id, point, priority in [
    ('F14-replace-old-basis','f-old-basis-supersede','P1'), ('F15-replace-old-result','f-old-result-supersede','P1'),
    ('F16-replace-release-source','f-old-source-release','P0'), ('F17-replace-new-basis','f-basis-insert','P1'),
    ('F18-replace-new-source','f-source-insert','P0'), ('F19-replace-second-result','f-result-insert','P0'),
    ('F20-replace-final-audit','business-audit','P0')]:
    fault(id, replace, point, replacement_setup, replacement_assert, priority)
for id, op, point, pending in [
    ('F21-tax-evidence',tax,'f-evidence',False), ('F22-tax-record',tax,'f-tax-insert',False),
    ('F23-tax-replace-record',tax_replace,'f-tax-insert',False), ('F24-tax-replace-audit',tax_replace,'business-audit',False),
    ('F25-tax-replace-pending-auth',tax_replace,'pending-auth',True)]:
    fault(id, op, point, 'Actual same-project typed source or responsible finance manual assessment, proven currency/date; replacement has actual prior tax ID and strict version', 'One new immutable tax fact/evidence/audit; replacement old->new unique chain, no automatic tax double-add and no cost inclusion; all source costs unchanged', 'P0' if pending else 'P1', pending)
for id, point, pending in [('E26-map-cost-row','e-cost-insert',False), ('E27-map-audit','business-audit',False), ('E28-map-pending-auth','pending-auth',True)]:
    fault(id, mapping, point, 'Actual confirmed E expense, not currently mapped; real sourceVersion; counter scope cost-expense and actual period read only', 'One registered/not-included cost with exact captured source_basis; one audit; expense untouched; number sequence advances only once on retry and not on failed attempt', 'P0', pending, True)
for id, point in [('E29-expense-row','e-expense-insert'), ('E30-expense-audit','business-audit')]:
    fault(id, 'createExpenseRecord', point, 'Existing real owned project/contract/category; valid expense input using unique expenseDescriptionMarker', 'Exactly one recorded expense and one audit after retry, no cost mapping created', 'P1')
for id, point, pending in [('E31-labor-replace-row','e-labor-replacement-insert',False), ('E32-labor-replace-audit','business-audit',False), ('E33-labor-replace-pending-auth','pending-auth',True)]:
    fault(id, labor_replace, point, 'Real published rate -> E registered labor, not included/allocated/frozen; valid replacement rate/period/person/scope and strict cost/source versions; selectedCostId=old cost ID; cost-labor counter scope', 'Old cost replaced with one new registered successor, exact original source/calculation basis preserved; valid HALF_UP cents and no phantom labor overlap; counter and audit atomic', 'P0', pending, True)
for id, point, pending in [('F34-masked-get-security','projection-security-event',False), ('F35-masked-get-pending-auth','pending-auth',True)]:
    fault(id, 'getSharedCostAllocationBasis', point, 'Real mixed/LABOR basis; actor has route permission but lacks at least one of operating/labor sensitive grants; actual owned session', '200 masked retry with one or more actual package security events, no raw amount/ratio/weight/evidence/history/receipt bypass; no business mutation/audit; pending auth coflush if dirty', 'P0', pending)

races = []


def race(id, op_a, op_b, leader_point, setup, oracle):
    races.append({'id': id, 'kind': 'project-lock-contention', 'priority': 'P0', 'operationA': operations[op_a], 'operationB': operations[op_b],
                  'leaderPoint': leader_point, 'leaderSuccessStatus': operations[op_a]['successStatus'], 'contenderStatus': 409,
                  'realSetup': setup, 'barrier': 'A reaches unique owned-row advisory gate holding actual project lock; observe A PID; B then visibly waits behind A on actual project FOR UPDATE; release A only after PG observation',
                  'oracle': oracle, 'retry': 'Exactly one unchanged B retry: 409 again, zero new business/evidence/audit state; semantic stale/occupancy conflicts do not become success by retry', 'deadlineMs': 20000, 'runtimeStatus': 'planned-not-run'})


race('C01-one-stage-winner', stage, stage, 'f-stage-cost-update', stage_setup + '; independent real sessions, identical cost/source CAS', 'One confirmed cost and one active attribution/evidence/audit, exactly one cost version increment')
race('C02-intersecting-source-sets', basis, basis, 'f-source-insert', 'Real confirmed costs A/B/C; requestA sources[A,B], requestB sources[B,C], different exact-set scope hashes; two real targets; independent sessions', 'Only A owns current B; no basis/evidence/result/audit for B request; no intersecting-set leak despite different scope hashes')
race('C03-complete-replacement-winner', replace, replace, 'f-result-insert', replacement_setup + '; both anchor same old result/version in independent sessions', 'Exactly one whole batch successor; all old rows switch atomically; loser creates no extra source/evidence/results')
race('C04-one-source-mapping', mapping, mapping, 'e-cost-insert', 'One real confirmed expense, no mapping; both source CAS equal, independent sessions; read cost-expense number counter', 'One registered mapping, one audit, one number allocation; current source unique covers registered; no loser number gap')
race('C05-E-replace-before-F-stage', labor_replace, stage, 'e-labor-replacement-insert', 'One real registered labor cost from actual published rate; independent sessions, original strict cost version; no prior attribution or active allocation', 'E replacement commits one successor, F rejects replaced/stale old cost and creates no attribution/evidence; new cost stays registered')
race('C06-F-stage-before-E-replace', stage, labor_replace, 'f-stage-cost-update', 'Same kind of real registered labor fixture, dual sensitive grants, independent sessions and original strict cost version', 'F confirms once; E stale CAS fails without old/new labor or audit remnants; unchanged E retry remains409')
races.append({'id': 'C07-sorted-rate-families', 'kind': 'production-family-lock-chain', 'priority': 'P1', 'operationA': operations[basis], 'operationB': operations[basis],
              'realSetup': 'Disjoint real project/target sets and distinct confirmed labor cost IDs, both consuming the same >=2 actual rate/person families; prove cost UUID order opposes family order from real IDs, never assign IDs with SQL',
              'barrier': 'Controller holds last actual poms:cost-rate family key; A holds first and waits last; B visibly waits first behind A; then release controller',
              'oracle': 'Both201 with exact disjoint conserved allocations and unchanged real rate/source versions, no deadlock/cycle; no retry needed; duplicate retry conflicts covered in C01-C06', 'deadlineMs': 20000, 'runtimeStatus': 'planned-not-run'})

sources = [
    f_root / 'apps/poms-api-rust/src/project_cost_governance/service.rs',
    f_root / 'apps/poms-api-rust/src/project_cost_governance/evidence.rs',
    f_root / 'apps/poms-api-rust/src/project_cost_governance/store.rs',
    pathlib.Path('E:/projects/worktrees/poms-r4e-cost-base/poms/apps/poms-api-rust/src/project_actual_cost/mod.rs'),
    pathlib.Path('E:/projects/worktrees/poms-r4e-cost-base/poms/apps/poms-api-rust/src/project_actual_cost/store.rs'),
    root / 'apps/poms-api-rust/src/contract_support/http.rs', root / 'apps/poms-api-rust/src/auth/store.rs',
    root / 'apps/poms-api-rust/src/auth/service.rs', root / 'apps/poms-api-rust/src/auth/model.rs',
    root / 'apps/poms-api-rust/src/auth/guards.rs', root / 'apps/poms-api-rust/src/business_numbers/service.rs', operation_file,
]
pins = [{'file': str(p), 'bytes': p.stat().st_size, 'rawBytesSha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sources]
report = {'kind': 'R4EF-real-PG-fault-concurrency-candidate32', 'capturedAt': datetime.now(timezone.utc).isoformat(), 'runtimeExecutedByAuthor': False,
          'authorDatabaseConnections': 0, 'credentialsRead': False, 'inputs': pins, 'faults': cases, 'races': races,
          'noBusinessStateSqlFabrication': True, 'faultsMustRunOneAtATime': True, 'newFixturePerScenario': True,
          'authBoundary': 'eager touch is independently committed; pending-auth rollback compares post-touch snapshot at observed trigger gate',
          'commitAcknowledgementAmbiguity': 'not injected; transport/unknown COMMIT outcome blocks automatic retry and certification'}
(folder / 'matrix32.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
lines = ['# fault32 实际验收矩阵候选', '', '以下全部 planned-not-run。每个场景由真实 API 生产独立受控 fixture。完整方法 / 路由 / opId / 成功状态来自冻结 operation-map06，详见 matrix32.json。P0是建议执行优先级，未跑场景不能因其他场景通过而计为Pass。', '', '| 场景 | 优先级 | 真实 operation | 注入 / 屏障 |', '| --- | --- | --- | --- |']
for item in cases:
    lines.append(f"| {item['id']} | {item['priority']} | `{item['operation']['operationId']}` | `{item['point']}` |")
for item in races:
    lines.append(f"| {item['id']} | {item['priority']} | `{item['operationA']['operationId']}` / `{item['operationB']['operationId']}` | {item.get('leaderPoint', 'production rate family lock')} |")
(folder / 'MATRIX32.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(json.dumps({'faultCandidates': len(cases), 'controlledRaceCandidates': len(races), 'realRuns': 0, 'sourcePins': len(pins)}))
