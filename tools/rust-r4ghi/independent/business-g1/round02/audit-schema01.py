"""Independent design-only schema/route probes; never connects to product or DB."""
from __future__ import annotations
import copy
import hashlib
import json
from pathlib import Path
import re
import sys
from collections import Counter
from jsonschema import Draft202012Validator, FormatChecker

input_dir = Path(sys.argv[1]).resolve()
report_path = Path(sys.argv[2]).resolve()
owned = Path('tools/rust-r4ghi/independent/business-g1/round02').resolve()
if not report_path.is_relative_to(owned):
    raise SystemExit('report must remain in reviewer-owned round02 directory')
checks = []
pins = []
def load(name):
    path = input_dir / name
    if not path.exists():
        path = input_dir / (name + '.bin')
    raw = path.read_bytes()
    pins.append({'file': str(path), 'bytes': len(raw), 'rawBytesSha256': hashlib.sha256(raw).hexdigest()})
    return json.loads(raw)
def check(name, result, observed):
    checks.append({'id': name, 'passed': bool(result), 'observed': observed})
public = load('public-contracts.schema.json')
context = load('source-context.schema.json')
blueprint = load('blueprint.json')
policy = load('policy-definition.json')
schemas = public['components']['schemas']
for name, obj in [('public', public), ('context', context), ('policy', policy)]:
    try:
        Draft202012Validator.check_schema(obj)
        check(name + '-draft202012-shape', True, 'valid schema document; extension semantics reviewed separately')
    except Exception as e:
        check(name + '-draft202012-shape', False, str(e))

def walk_refs(obj, origin, document):
    bad = []
    n = 0
    def visit(x, path):
        nonlocal n
        if isinstance(x, dict):
            if '$ref' in x:
                n += 1
                ref = x['$ref']
                if not ref.startswith('#/'):
                    bad.append({'path': path, 'ref': ref, 'reason': 'unexpected external ref'})
                else:
                    at = document
                    try:
                        for part in ref[2:].split('/'):
                            at = at[part.replace('~1', '/').replace('~0', '~')]
                    except (KeyError, TypeError):
                        bad.append({'path': path, 'ref': ref, 'reason': 'missing pointer'})
            for k, v in x.items():
                visit(v, path + '/' + k)
        elif isinstance(x, list):
            for i, v in enumerate(x):
                visit(v, path + '/' + str(i))
    visit(obj, origin)
    return n, bad
for name, obj in [('public', public), ('context', context)]:
    n, bad = walk_refs(obj, name, obj)
    check(name + '-recursive-ref-closure', not bad, {'references': n, 'missing': bad})

ops = blueprint['operationMap']
check('32-unique-operations', len(ops) == 32 and len({x['operationId'] for x in ops}) == 32 and len({x['canonical'] for x in ops}) == 32, len(ops))
groups = dict(Counter(x['group'] for x in ops))
check('group-counts', groups == {'G': 9, 'H': 8, 'I': 11, 'R5-min': 4}, groups)
new = sorted(x['canonical'] for x in ops if x['newPublicOperation'])
check('exact-three-new-routes', new == sorted(['POST /projects/{id}:startExecution', 'POST /projects/{id}:startAcceptance', 'POST /project-completion-records/{completionRecordId}/conditions/{id}:close']), new)
bad_keys, bad_pointers = [], []
for op in ops:
    wanted = set(re.findall(r'\{([^}]+)\}', op['canonical']))
    if set(op['namedResourceKeys']) != wanted:
        bad_keys.append(op['operationId'])
    for kind in ('request', 'response'):
        dto = op[kind + 'Dto']
        if dto and (dto not in schemas or op[kind + 'SchemaPointer'] != '#/components/schemas/' + dto):
            bad_pointers.append({'operation': op['operationId'], 'kind': kind, 'dto': dto})
check('exact-named-resource-keys', not bad_keys, bad_keys)
check('operation-public-dto-pointer-closure', not bad_pointers, bad_pointers)
writes = [o for o in ops if o['requestDto']]
bad_protocol = []
for o in writes:
    schema = schemas[o['requestDto']]
    if 'inputVersion' not in schema.get('required', []) or schema.get('properties', {}).get('inputVersion', {}).get('const') != 'server-derived-v1':
        bad_protocol.append(o['operationId'])
check('16-modern-batch-write-protocols', len(writes) == 16 and not bad_protocol, {'writes': len(writes), 'bad': bad_protocol})

def validator(dto):
    return Draft202012Validator({'components': public['components'], '$ref': '#/components/schemas/' + dto}, format_checker=FormatChecker())
uid = '12345678-1234-4234-8234-123456789012'
hash64 = 'a' * 64
evidence = {'attachmentLinkId': uid, 'attachmentId': uid, 'attachmentRowVersion': 1, 'checksumSha256': hash64, 'fileName': 'own-evidence.txt'}
task = {'conditionId': uid, 'conditionRowVersion': 1, 'summary': 'owned condition', 'responsibleUserId': uid, 'dueAt': '2026-11-06T00:00:00Z', 'status': 'pending', 'evidenceRefs': [evidence], 'closure': None}
parent = {'completionRecordId': uid, 'completionRowVersion': 1, 'conditionStatus': 'pending', 'ownTasks': [task]}
own_list = {'scopeKind': 'own-condition-only', 'projectId': uid, 'items': [parent]}
creator = {'scopeKind': 'creator-first-assignment-only', 'projectId': uid, 'projectNo': 'P1', 'projectRowVersion': 1, 'ownerOrgId': uid, 'ownerUserId': None, 'creatorUserId': uid, 'ownershipOriginRowVersion': 1, 'allowedActions': ['reassign-owner']}
close = {'scopeKind': 'own-condition-only', 'targetId': uid, 'completionRowVersion': 2, 'conditionId': uid, 'conditionRowVersion': 2, 'conditionStatus': 'closed', 'completionConditionStatus': 'pending', 'closureRecordId': uid, 'closedAt': '2026-11-06T00:00:00Z', 'closedBy': uid, 'sourcePayloadHash': hash64, 'closureEvidenceRefs': [evidence]}
for name, dto, sample in [('own-list', 'ProjectCompletionRecordList', own_list), ('creator', 'ProjectDetailView', creator), ('own-close', 'CloseProjectCompletionConditionResult', close)]:
    check(name + '-minimal-valid', validator(dto).is_valid(sample), list(str(e.message) for e in validator(dto).iter_errors(sample)))
    for forbidden in ('acceptanceRecordId', 'completionSummary', 'evidenceSummary', 'parentEvidenceRefs', 'createdBy', 'operatingOverview'):
        injected = {**sample, forbidden: uid}
        check(name + '-reject-' + forbidden, not validator(dto).is_valid(injected), 'strict branch rejects unregistered parent/full field')
for forbidden in ('acceptanceRecordId', 'completionSummary', 'evidenceSummary', 'parentEvidenceRefs', 'createdBy'):
    injected = copy.deepcopy(own_list)
    injected['items'][0][forbidden] = uid
    check('own-parent-reject-' + forbidden, not validator('ProjectCompletionRecordList').is_valid(injected), 'no full parent DTO fallback')
for version in (0, 2147483648):
    injected = copy.deepcopy(own_list)
    injected['items'][0]['completionRowVersion'] = version
    check('own-parent-reject-version-' + str(version), not validator('ProjectCompletionRecordList').is_valid(injected), version)
max_version = copy.deepcopy(own_list)
max_version['items'][0]['completionRowVersion'] = 2147483647
check('own-parent-accept-int4-max', validator('ProjectCompletionRecordList').is_valid(max_version), 2147483647)

amount_validator = Draft202012Validator({'$defs': context['$defs'], '$ref': '#/$defs/Amount'}, format_checker=FormatChecker())
amounts = [
    ('unknown-null', {'knowledge': 'unknown', 'value': None, 'unknownReasonCode': 'pending-unquantified', 'basisRefs': [], 'zeroProof': None}, True),
    ('unknown-cannot-zero', {'knowledge': 'unknown', 'value': '0.00', 'unknownReasonCode': 'pending-unquantified', 'basisRefs': [], 'zeroProof': None}, False),
    ('known-zero-proof', {'knowledge': 'known', 'value': '0.00', 'unknownReasonCode': None, 'basisRefs': [], 'zeroProof': 'exhaustive-classified-scope-zero'}, True),
    ('known-zero-no-proof', {'knowledge': 'known', 'value': '0.00', 'unknownReasonCode': None, 'basisRefs': [], 'zeroProof': None}, False),
]
for name, sample, wanted in amounts:
    actual = amount_validator.is_valid(sample)
    check(name, actual == wanted, {'schemaValid': actual, 'expected': wanted})

pre_blueprint = blueprint['ssot']['sourceBeforeEffect']
pre_context = context['x-preEffectInputHashWhitelist']
check('pre-effect-whitelist-single-source', pre_blueprint == pre_context and 'affectedProjects' in pre_context['fields'], {'blueprintFields': list(pre_blueprint['fields']), 'contextFields': list(pre_context['fields']), 'equal': pre_blueprint == pre_context})
result = {'kind': 'independent-design-only-schema-and-route-audit', 'qualification': 'Static schema/contract checks only. No SQL, HTTP, UI, product or G1 acceptance.', 'pins': pins, 'checks': checks, 'passed': sum(x['passed'] for x in checks), 'failed': [x for x in checks if not x['passed']], 'G1Certified': False, 'G2Authorized': False}
report_path.parent.mkdir(parents=True, exist_ok=True)
with report_path.open('x', encoding='utf8', newline='\n') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(json.dumps({'checks': len(checks), 'passed': result['passed'], 'failed': result['failed'], 'report': str(report_path)}, ensure_ascii=False, indent=2))
