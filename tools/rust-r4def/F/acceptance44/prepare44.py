import hashlib
import json
import pathlib
import sys

folder = pathlib.Path(__file__).resolve().parent
root = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
spec_path = root / 'libs/shared/api-spec/openapi.json'
spec = json.loads(spec_path.read_text('utf-8'))
op_path = root / 'docs/design/rust-r4def/joint-g1-06/operation-map06.json'
operations = [o for o in json.loads(op_path.read_text('utf-8'))['operations'] if o['group'] in ['E', 'F'] or o['operationId'] == 'ProjectHandoverController_getProjectHandoverDetailByProject']
for route, methods in spec['paths'].items():
    for method, definition in methods.items():
        if isinstance(definition, dict) and definition.get('operationId') in ['ContractFinanceController_createPayable', 'ContractFinanceController_getPayable']:
            operations.append({'group': 'C-support', 'operationId': definition['operationId'], 'method': method.upper(), 'path': route, 'successStatus': 201 if method.upper() == 'POST' else 200})
names = [
    'ConfirmAccountingTaxTreatmentRequest','ReplaceAccountingTaxTreatmentRequest','ReclassifyCostStageAttributionRequest',
    'ConfirmCostStageAttributionRequest','ConfirmSharedCostAllocationBasisRequest','ReplaceSharedCostAllocationResultRequest',
    'R4FSourceEvidence','R4FManualAssessmentEvidence','R4FGovernanceEvidence','R4FSharedCostAllocationShareItem',
    'AccountingTaxDeductibilityStatus','StageAttributionMode',
    'AccountingTaxTreatmentSnapshotSummary','SharedCostAllocationBasisSummary','SharedCostAllocationResultSummary',
    'CostStageAttributionSnapshotSummary','ConfirmCostStageAttributionResult','ReclassifyCostStageAttributionResult',
    'ConfirmAccountingTaxTreatmentResult','ReplaceAccountingTaxTreatmentResult',
]
selected = {n: spec['components']['schemas'][n] for n in names if n in spec['components']['schemas']}
output = {'inputs': [{'file': str(p), 'rawBytesSha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in [spec_path, op_path]], 'operations': operations, 'schemas': selected}
(folder / 'contract44.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
f_root = folder.parents[3]
f_delivery = json.loads((folder.parent / 'delivery25.json').read_text('utf-8'))
pins = []
current_f46 = '--f46-current' in sys.argv
if current_f46:
    gate_path = root / 'docs/design/rust-r4def/g2-allocation-freeze51.json'
    assert hashlib.sha256(gate_path.read_bytes()).hexdigest() == '76b159d40f528f9735041f286cbc5f8d22f1e686a3955ba94f635a8b5703817f'
for item in f_delivery['productFiles']:
    p = f_root / item['file']
    actual = hashlib.sha256(p.read_bytes()).hexdigest()
    if not current_f46 or p.name not in ['logic.rs','service.rs']:
        assert actual == item['rawBytesSha256']
    pins.append({'group': 'F46' if current_f46 else 'F25', 'file': str(p), 'rawBytesSha256': actual, 'previousF25RawSha256': item['rawBytesSha256']})
e_root = pathlib.Path('E:/projects/worktrees/poms-r4e-cost-base/poms')
for p in sorted((e_root / 'apps/poms-api-rust/src/project_actual_cost').glob('*.rs')):
    value = hashlib.sha256(p.read_bytes()).hexdigest()
    if p.name == 'mod.rs':
        assert value == 'aaaa5126be86c421255d699bcad582131943d7f500754f0db8e55ddfc437a407'
    pins.append({'group': 'E04', 'file': str(p), 'rawBytesSha256': value})
op_map = {op['operationId']: {'method': op['method'], 'path': op['path'], 'success': op['successStatus'], 'group': op['group']} for op in operations}
(folder / 'contract44.mjs').write_text('// Static frozen contract data; importing performs no I/O.\nexport const OPERATIONS = Object.freeze(' + json.dumps(op_map, ensure_ascii=False, indent=2) + ');\nexport const SOURCE_PINS = Object.freeze(' + json.dumps(pins, ensure_ascii=False, indent=2) + ');\n', encoding='utf-8')
before_path = root / 'tmp/rust-r4def/root/api32/E41-before.json'
prior = json.loads(before_path.read_text('utf-8'))['context']
example = {key: prior[key] for key in ['project','otherProject','activeContract','expenseCategory','costCategory','actors','assessments']}
example['project'] = {'id': prior['project']['id']}
example['otherProject'] = {'id': prior['otherProject']['id']}
example['actors'] = {key: prior['actors'][key] for key in ['full','financeOnly','operatingOnly','laborOnly']}
example['tag'] = 'f44'
example['taxReason'] = 'REQUIRED: Root财务验收责任人明确填写对本次真实税额pending及抵扣判定的理由；金额事实不自动纳入经营'
example['businessDate'] = prior['assessments']['payable']['periodStart']
example['stageAssessment'] = {**prior['assessments']['payable'], 'reason': '本隔离验收责任人将本次费用、单日人工及采购承诺按指定业务日人工归属执行阶段；不推断历史区间，不认作R5执行准入', 'evidenceSummary': '实际API金额和业务日期支撑本次明确人工判断，后续以真实D确认事实作可追溯更正；Root执行前复核该责任说明'}
example['allocationPolicyDecision'] = {'id': 'selected-measurement-first', 'version': 2, 'authorityReceipt': 'docs/design/rust-r4def/g2-allocation-freeze51.json#76b159d40f528f9735041f286cbc5f8d22f1e686a3955ba94f635a8b5703817f', 'runtimeBinding': 'Root必须另核实际F46部署与SOURCE_PINS一致，静态输入不充当运行证明'}
(folder / 'public-context44.example.json').write_text(json.dumps({'source': str(before_path), 'sourceRawSha256': hashlib.sha256(before_path.read_bytes()).hexdigest(), 'context': example}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'schemas': len(selected), 'closedOperations': len(op_map), 'sourcePins': len(pins), 'FSource': 'F46-author' if current_f46 else 'F25', 'runtimeExecuted': False}))
