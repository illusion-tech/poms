import hashlib
import json
import pathlib
import re
from datetime import datetime, timezone

ROOT = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
IROOT = pathlib.Path('E:/projects/worktrees/poms-r4i-lifecycle/poms')
OUT = ROOT / 'tools/rust-r4ghi/independent/review05/frozen-parent-lock-review79'
OLD = IROOT / 'tools/rust-r4ghi/I/implementation/support-patches/frozen-participant-parent-lock65'
NEW = IROOT / 'tools/rust-r4ghi/I/implementation/support-patches/frozen-participant-parent-lock65-02'
PRIVATE = pathlib.Path(r'\\wsl.localhost\Debian\home\wangzishi\.local\share\poms-r4ghi\private')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_pin(path, expected=None):
    data = path.read_bytes()
    actual = sha(data)
    if expected is not None:
        assert actual == expected, (str(path), expected, actual)
    return data, {'file': str(path).replace('\\', '/'), 'bytes': len(data), 'sha256': actual}


def one(items, predicate):
    found = [x for x in items if predicate(x)]
    assert len(found) == 1, found
    return found[0]


old_bytes, old_pin = read_pin(OLD / 'manifest65.json', 'a73a95b2b603f32b967b36a81f126b5d5438bd2eb722d4396edc3fa9e0539bff')
new_bytes, new_pin = read_pin(NEW / 'manifest65-02.json', 'bd9e27b844871a640be652022e32df21502f250e2c50c9e6053518f731a14d55')
old = json.loads(old_bytes)
new = json.loads(new_bytes)
candidate_pins = []
candidate_text = {}
for f in new['files']:
    previous = one(old['files'], lambda x: x['file'] == f['file'])
    _, previous_pin = read_pin(OLD / previous['candidate'], f['applyAfter65SHA256'])
    assert previous_pin['sha256'] == previous['afterSHA256']
    data, pin = read_pin(NEW / f['candidate'], f['afterSHA256'])
    assert f['rootBeforeSHA256'] is None
    assert not (ROOT / f['file']).exists(), f['file']
    candidate_pins.append({'target': f['file'], 'old65': previous_pin, 'candidate65_02': pin, 'rootTargetAbsent': True})
    candidate_text[pathlib.Path(f['file']).suffix] = data.decode('utf-8')

sql = candidate_text['.sql']
ts = candidate_text['.ts']
encoded_sql = re.findall(r'this\.addSql\(("(?:\\.|[^"\\])*?")\);', ts)
assert len(encoded_sql) == 1
assert json.loads(encoded_sql[0]).encode('utf-8') == sql.encode('utf-8')
assert re.findall(r'CREATE(?: OR REPLACE)? FUNCTION ([^(]+)\(', sql) == ['poms.jghi_assignment_participant_guard']
assert 'CREATE TRIGGER' not in sql and 'ALTER TABLE' not in sql and 'SECURITY DEFINER' not in sql
assert 'ORDER BY a.id\n  FOR UPDATE OF a' in sql
assert 'count(DISTINCT p.id)' in sql and 'WHERE p.id IS NOT NULL' in sql
assert sql.index("NEW.assignment_id IS DISTINCT FROM OLD.assignment_id") < sql.index("TG_OP IN ('INSERT','UPDATE')") < sql.index('IF has_frozen_parent THEN')
assert "IF TG_OP IN ('INSERT','UPDATE') AND locked_parent_count<>expected_parent_count THEN" in sql
assert "IF TG_OP='DELETE' THEN RETURN OLD; END IF;\n RETURN NEW;" in sql

base_pins = []
for b in old['sourceBases'] + old['runtimeSources']:
    _, pin = read_pin(ROOT / b['file'], b['sha256'])
    base_pins.append(pin)

completion_bytes, completion_pin = read_pin(PRIVATE / 'business/g2-business11/main01/003079-ef40-complete.json', '360ff7f813c05dae0ef2f21d2351c7c4bc9130e377428605868dc07ca67c6eac')
completion = json.loads(completion_bytes)
after = completion['finalSuccess']['after']
after_path = PRIVATE / 'business/g2-business11/main01/snapshot-003077-http-after.json'
assert after['file'].endswith('/snapshot-003077-http-after.json')
snapshot_bytes, snapshot_pin = read_pin(after_path, after['rawBytesSha256'])
snapshot = json.loads(snapshot_bytes)
catalog = {}
for db, obj in snapshot['databases'].items():
    meta = obj['meta']
    fks = meta['foreignKeys']
    participant_fk = one(fks, lambda x: x['name'] == 'commission_role_assignment_participant_assignment_id_fkey')
    project_fk = one(fks, lambda x: x['name'] == 'commission_role_assignment_project_id_foreign')
    payload_fk = one(fks, lambda x: x['name'] == 'commission_role_assignment_freeze_payload_assignment_id_fkey')
    assert participant_fk['childColumns'] == ['assignment_id'] and participant_fk['parentColumns'] == ['id'] and participant_fk['deleteRule'] == 'r'
    assert project_fk['deleteRule'] == 'c' and payload_fk['deleteRule'] == 'r'
    normative = meta['normative']
    triggers = [json.loads(x) if isinstance(x, str) else x for x in normative['triggers']]
    parent_triggers = [x for x in triggers if x['table_name'] == 'commission_role_assignment']
    assert len(parent_triggers) == 1
    assert parent_triggers[0]['tgname'] == 'jghi_assignment_total'
    assert 'AFTER INSERT OR UPDATE' in parent_triggers[0]['definition']
    payload_guard = one(triggers, lambda x: x['table_name'] == 'commission_role_assignment_freeze_payload' and x['tgname'] == 'jghi_immutable')
    participant_guard = one(triggers, lambda x: x['table_name'] == 'commission_role_assignment_participant' and x['tgname'] == 'jghi_frozen_participant')
    assert payload_guard['tgenabled'] == participant_guard['tgenabled'] == 'O'
    functions = [json.loads(x) if isinstance(x, str) else x for x in normative['functions']]
    function = one(functions, lambda x: x['proname'] == 'jghi_assignment_participant_guard')
    assert function['prosecdef'] is False and function['proconfig'] is None
    catalog[db] = {'participantAssignmentFK': participant_fk, 'assignmentProjectFK': project_fk,
                   'payloadAssignmentFK': payload_fk, 'parentNonInternalTriggers': parent_triggers,
                   'payloadImmutableTrigger': payload_guard, 'participantGuardTrigger': participant_guard,
                   'existingFunctionIdentity': {k: function[k] for k in ['oid','schema','proname','arguments','owner','acl','prosecdef','proconfig']}}

report = {
    'schemaVersion': 1,
    'review': 'IR-I65-02-independent-static-review79',
    'at': datetime.now(timezone.utc).isoformat(),
    'scope': 'Non-author static review of exact two-file forward candidate; historical frozen catalog filesystem readback only.',
    'decision': 'bounded-static-admission-for-Root-registration-and-real-checks',
    'manifest65': old_pin,
    'manifest65_02': new_pin,
    'candidates': candidate_pins,
    'sourceBases': base_pins,
    'SQLTSPayloadByteEqual': True,
    'frozenCatalogEvidence': {'completion': completion_pin, 'snapshot': snapshot_pin, 'catalog': catalog},
    'resolvedFinding': {
        'id': 'IR-I65-01',
        'kind': 'static-defensive-gap-not-experimented',
        'initial65': 'Zero matched parents could leave has_frozen_parent false without proving an actual locked parent.',
        'repair65_02': 'I/U compare locked rows with distinct nonnull OLD/NEW parent IDs; missing raises 23503. Reparent 23514 remains earlier. DELETE does not gain a missing-parent rejection.'
    },
    'conclusions': [
        'Parent UUID order is deterministic, duplicate OLD/NEW IDs lock once, and every existing parent is locked before frozen/reparent decisions.',
        'Frozen INSERT/UPDATE/DELETE reject through the existing trigger, and unconditional reparent rejection is preserved including zero-weight draft movement.',
        'NULL INSERT remains for the original NOT NULL check; NULL-changing UPDATE retains the pre-existing reparent rejection.',
        'There is no parent-to-participant CASCADE: both frozen catalogs and M95 declare participant.assignment_id RESTRICT. Draft child-first deletion remains possible; parent deletion with children was already restricted.',
        'There is no independent frozen-parent BEFORE DELETE trigger. Qualified frozen parents are protected by the immutable freeze payload plus RESTRICT references; the assignment total trigger is only AFTER INSERT/UPDATE.',
        'Public revised-create and freeze both take the project lock before assignment locks; freeze reads participants without acquiring participant row locks. No public new-lock inversion is established by the reviewed change.',
        'This is a function-body-only forward candidate. No frozen migration, table, column, trigger definition, weight policy, totals validator, or source row is changed in these files.'
    ],
    'requiredActualFollowup': [
        'Root alone decides explicit forward M98 registration and application. Keep old M95/M97 immutable.',
        'Validate candidate TS/build and migration discovery; run the exact registered forward migration against owned databases with before/after catalog, rows+xmin, sequences and objects receipts.',
        'Require same function OID/owner/ACL/security/config and all original triggers/FKs/checks, with only expected function-body and migration-log/sequence deltas; 139 tables and existing business rows unchanged.',
        'An applied migration changes catalog/source closure. Explicitly refreeze registered migration/doc inputs and tool migration count, and perform the next source/data admission; do not claim equality to old retained catalog or relabel API134 evidence as API135.',
        'Run the safe public two-session freeze versus revised-create barrier scenario with actual waiters and raw HTTP/one-winner ledger. This static review is not concurrency acceptance.'
    ],
    'checksExecuted': {'filesystemHashChecks': True, 'SQLTSPayloadComparison': True, 'frozenCatalogReadback': True,
                       'SQL': False, 'HTTP': False, 'databaseConnection': False, 'unsafeWindowReproduction': False,
                       'TSCompile': False, 'RootProductMutation': False, 'GitMutation': False},
    'G3Certified': False,
    'G4Certified': False
}
OUT.mkdir(parents=True, exist_ok=True)
path = OUT / 'review79.json'
assert not path.exists(), 'Immutable review already exists'
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'review': str(path), 'sha256': sha(path.read_bytes()), 'SQLTSPayloadByteEqual': True, 'dbCatalogs': len(catalog), 'decision': report['decision']}, ensure_ascii=False))
