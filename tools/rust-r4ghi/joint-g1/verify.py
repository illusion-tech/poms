"""Read-only structural review. No writes, Git, network, subprocess or SQL execution.

This checks local bytes/contracts/SQL structure, never G1 or runtime acceptance.
"""
from __future__ import annotations

import ast
import collections
import hashlib
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
ERRORS = []
WARNINGS = []
CHECKS = []


def read(name):
    return json.loads((OUT/name).read_text(encoding="utf-8-sig"))


def check(name, condition, detail=None):
    CHECKS.append({"check":name,"passed":bool(condition),"detail":detail})
    if not condition:
        ERRORS.append({"check":name,"detail":detail})


def strip_comments(sql):
    # Only structural scanning; preserve SQL string literals/dollar bodies.
    return re.sub(r"--[^\n]*", "", sql)


def statements(sql):
    """Split semicolons outside strings/quoted names/dollar function bodies."""
    result=[]
    start=0
    depth=0
    quote=None
    dollar=None
    pos=0
    while pos<len(sql):
        char=sql[pos]
        if dollar:
            if sql.startswith(dollar,pos):
                pos+=len(dollar)
                dollar=None
                continue
        elif quote:
            if char==quote:
                if pos+1<len(sql) and sql[pos+1]==quote:
                    pos+=2
                    continue
                quote=None
        elif char in "'\"":
            quote=char
        elif char=='$':
            match=re.match(r"\$[a-zA-Z_0-9]*\$",sql[pos:])
            if match:
                dollar=match[0]
                pos+=len(dollar)
                continue
        elif char=='(':
            depth+=1
        elif char==')':
            depth-=1
            if depth<0:
                raise ValueError("SQL parenthesis underflow")
        elif char==';':
            result.append(sql[start:pos].strip())
            start=pos+1
        pos+=1
    if quote or dollar or depth:
        raise ValueError(f"unbalanced SQL tokens: quote={quote},dollar={dollar},depth={depth}")
    if sql[start:].strip():
        raise ValueError("unterminated final SQL statement")
    return [x for x in result if x]


def split_columns(body):
    result=[]
    start=0
    depth=0
    quote=None
    pos=0
    while pos<len(body):
        char=body[pos]
        if quote:
            if char==quote:
                if pos+1<len(body) and body[pos+1]==quote:
                    pos+=2
                    continue
                quote=None
        elif char in "'\"":
            quote=char
        elif char=='(':
            depth+=1
        elif char==')':
            depth-=1
        elif char==',' and depth==0:
            result.append(body[start:pos].strip())
            start=pos+1
        pos+=1
    result.append(body[start:].strip())
    return result


TABLE = r'"?poms"?\s*\.\s*"?([a-z_][a-z_0-9]*)"?'


def source_sql():
    result=[]
    for path in sorted((ROOT/'apps/poms-api/src/migrations').glob('Migration*.ts')):
        raw=path.read_text(encoding='utf-8-sig').split('override async down',1)[0]
        for match in re.finditer(r"this\.addSql\(\s*(?:String\.raw)?(`(?:[^`]|\\`)*`|\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')\s*,?\s*\)",raw,re.S):
            literal=match[1]
            result.append(json.loads(literal) if literal.startswith('"') else ast.literal_eval(literal) if literal.startswith("'") else literal[1:-1])
    return result


def track_schema(sql_blocks):
    tables={}
    unique=collections.defaultdict(set)
    for sql in sql_blocks:
        clean=strip_comments(sql)
        for stmt in statements(clean+';' if clean.strip() and not clean.rstrip().endswith(';') else clean):
            create=re.match(r'(?is)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?'+TABLE+r'\s*\((.*)\)$',stmt)
            if create:
                table,body=create.groups()
                columns={}
                for entry in split_columns(body):
                    col=re.match(r'^"?([a-z_][a-z_0-9]*)"?\s+(.+)$',entry,re.S|re.I)
                    if col and col[1].lower() not in {'constraint','foreign','primary','check','unique','exclude'}:
                        columns[col[1]]=col[2]
                    for kind,vec in re.findall(r'(?is)\b(UNIQUE|PRIMARY\s+KEY)\s*\(([^)]+)\)',entry):
                        unique[table].add(tuple(x.strip().strip('"') for x in vec.split(',')))
                tables[table]=columns
            alter=re.match(r'(?is)ALTER\s+TABLE\s+'+TABLE+r'\s+(.*)$',stmt)
            if alter:
                table,body=alter.groups()
                tables.setdefault(table,{})
                for entry in split_columns(body):
                    add=re.match(r'(?is)ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?([a-z_][a-z_0-9]*)"?\s+(.+)',entry)
                    if add and add[1].lower() not in {'constraint','foreign','primary','check','unique'}:
                        tables[table][add[1]]=add[2]
                    for vec in re.findall(r'(?is)\bUNIQUE\s*\(([^)]+)\)',entry):
                        unique[table].add(tuple(x.strip().strip('"') for x in vec.split(',')))
                for col in re.findall(r'(?is)DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?"?([a-z_][a-z_0-9]*)"?',body):
                    tables[table].pop(col,None)
    return tables,unique


blue=read('blueprint.json')
ops=blue['operationMap']
check('draft-is-not-gate-pass',blue['gates']['G1Passed'] is False and blue['gates']['G2Authorized'] is False)
check('exact32-count',len(ops)==32 and len({x['operationId'] for x in ops})==32)
check('disjoint-route-count',len({(x['method'],x['runtimePath']) for x in ops})==32)
groups=dict(collections.Counter(x['group'] for x in ops))
check('group-counts',groups=={'G':9,'H':8,'R5-min':4,'I':11},groups)
new={x['canonical'] for x in ops if x['newPublicOperation']}
check('exact3-new-canonical',new=={
 'POST /projects/{id}:startExecution',
 'POST /projects/{id}:startAcceptance',
 'POST /project-completion-records/{completionRecordId}/conditions/{id}:close'},sorted(new))
condition=next(x for x in ops if x['operationId']=='ProjectCompletionRecordController_closeCompletionCondition')
check('condition-keeps-two-named-UUIDs',condition['typedResourceKeys']=={'completionRecordId':'CompletionRecordId','id':'CompletionConditionId'})
check('no-supporting-double-count',all(x['countDelta']==0 and x['newHttp'] is False for x in blue['supportingExistingOperations']))
check('final-inputs-present',not blue['rootDecisionItems'],blue['rootDecisionItems'])
check('ownership-origin-real-delta',blue['IRefinements'] is not None and blue['migration']['originDDLIncluded'])
check('scope-user-decision-six',blue['scopeUserDecision'] is not None)
modern_bad=[]
inputs=blue['publicContractInputs']
for op in ops:
    if op['method']!='POST':
        continue
    name=op['requestDto']
    if op['group']=='G':
        shape=inputs['G']['$defs'][name]
    elif op['group']=='H':
        delta=next(x for x in inputs['H']['fieldDeltas'] if x['schema']==name)
        if delta.get('add',{}).get('inputVersion')!='required literal server-derived-v1':
            modern_bad.append(name)
        continue
    else:
        shape=inputs['I-R5']['schemas'][name]
    if 'inputVersion' not in shape['required'] or shape['properties']['inputVersion'].get('const')!='server-derived-v1':
        modern_bad.append(name)
confirm=inputs['G']['$defs']['ConfirmReceiptRecordRequest']
check('every-modern-write-and-C-confirm-explicit-tag',not modern_bad and 'inputVersion' in confirm['required'],modern_bad)
check('all-write-CSRF',all(op['csrf'] for op in ops if op['method']=='POST'))

for manifest_name,base in [('sources.json',ROOT),('artifacts.json',OUT)]:
    bad=[]
    for item in read(manifest_name)['entries']:
        path=(base/item['path']).resolve()
        if base not in path.parents or not path.is_file():
            bad.append(item['path']+': missing/outside root')
            continue
        raw=path.read_bytes()
        if len(raw)!=item['bytes'] or hashlib.sha256(raw).hexdigest()!=item['sha256']:
            bad.append(item['path'])
    check(manifest_name+'-raw-byte-pins',not bad,bad)

native=read('native-reference.schemas.json')
spec=json.loads((ROOT/native['source']).read_text(encoding='utf-8-sig'))
check('native-reference-exact-components',all(spec['components']['schemas'].get(k)==v for k,v in native['components']['schemas'].items()),len(native['components']['schemas']))
check('native-reference-pinned-source',hashlib.sha256((ROOT/native['source']).read_bytes()).hexdigest()==native['sourceSha256'])

effective=read('source-context.schema.json')
original=json.loads((ROOT/'tools/rust-r4ghi/H/final-g1/source-context.schema.json').read_text(encoding='utf-8-sig'))
check('H-sole-shape-authority',all(effective[k]==v for k,v in original.items() if k!='title'))
whitelist=effective['x-sourceHashFactualWhitelist']
check('source-hash-excludes-new-self-output-refs',not {'restatementRef','restatedSnapshotRef'}&set(whitelist['snapshot']) and 'outputRefCapturePolicy' in effective['x-semanticValidation']['sourceContext'])
policy=read('policy-definition.json')
policy_canonical=json.dumps(policy,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')
check('exact-active-policy-canonical-hash',hashlib.sha256(policy_canonical).hexdigest()==blue['policyIdentity']['policyHash']==effective['x-activePolicy']['policyHash'])
check('policy-all11-and-four-independent-stage-candidates',len(policy['ruleContract']['ruleRows'])==11 and all(set(row['stages'])=={'first','second','final','retention'} for row in policy['ruleContract']['ruleRows']))
try:
    from jsonschema import Draft202012Validator
    Draft202012Validator.check_schema(effective)
    check('effective-schema-draft2020-12-valid',True)
except Exception as error:
    check('effective-schema-draft2020-12-valid',False,str(error))

missing_refs=[]


def refs(value,root):
    if isinstance(value,dict):
        ref=value.get('$ref','')
        if ref.startswith('#/'):
            target=root
            try:
                for token in ref[2:].split('/'):
                    target=target[token.replace('~1','/').replace('~0','~')]
            except (KeyError,TypeError):
                missing_refs.append(ref)
        for val in value.values():
            refs(val,root)
    elif isinstance(value,list):
        for val in value:
            refs(val,root)


refs(effective,effective)
refs(native,native)
refs(inputs['G'],inputs['G'])
merged_i={'components':{'schemas':{**spec['components']['schemas'],**inputs['I-R5']['schemas']}}}
refs(inputs['I-R5'],merged_i)
check('schema-and-native-reference-closure',not missing_refs,missing_refs)

sql=(OUT/'migration.sql').read_text(encoding='utf-8')
try:
    candidate_statements=statements(strip_comments(sql))
    check('SQL-lexical-structure',True,{'statements':len(candidate_statements),'scope':'quotes/dollar bodies/parentheses/terminators only; no SQL execution or PostgreSQL semantic parser'})
except ValueError as error:
    check('SQL-lexical-structure',False,str(error))
    candidate_statements=[]
source_blocks=source_sql()
base_tables,base_unique=track_schema(source_blocks)
all_tables,_=track_schema(source_blocks+[sql])
created=re.findall(r'(?i)CREATE\s+TABLE\s+poms\.([a-z_0-9]+)',sql)
check('new-table-names-unique',len(created)==len(set(created)),created)
check('new-tables-not-existing',not (set(created)&set(base_tables)),sorted(set(created)&set(base_tables)))
check('source-migration-count',len(list((ROOT/'apps/poms-api/src/migrations').glob('Migration*.ts')))==94)
check('static120-source-table-model',len(base_tables)==120,len(base_tables))
refs_missing=[]
for table,columns in re.findall(r'(?is)REFERENCES\s+'+TABLE+r'\s*\(([^)]+)\)',sql):
    if table not in all_tables:
        refs_missing.append(table+': missing table')
    else:
        for col in (x.strip().strip('"') for x in columns.split(',')):
            if col not in all_tables[table]:
                refs_missing.append(table+'.'+col)
check('referenced-tables-and-columns-exist-statically',not refs_missing,sorted(set(refs_missing)))
duplicate_additions=[]
duplicate_unique=[]
current={k:set(v) for k,v in base_tables.items()}
for stmt in candidate_statements:
    create=re.match(r'(?is)CREATE\s+TABLE\s+poms\.([a-z_0-9]+)',stmt)
    if create:
        current[create[1]]=set(all_tables[create[1]])
    alter=re.match(r'(?is)ALTER\s+TABLE\s+poms\.([a-z_0-9]+)\s+(.*)$',stmt)
    if not alter:
        continue
    table,body=alter.groups()
    for entry in split_columns(body):
        add=re.match(r'(?is)ADD\s+COLUMN\s+([a-z_0-9]+)',entry)
        if add:
            if add[1] in current.setdefault(table,set()):
                duplicate_additions.append(table+'.'+add[1])
            current[table].add(add[1])
        for vec in re.findall(r'(?is)\bUNIQUE\s*\(([^)]+)\)',entry):
            fields=tuple(x.strip().strip('"') for x in vec.split(','))
            if fields in base_unique[table]:
                duplicate_unique.append({'table':table,'columns':fields})
check('no-readded-columns',not duplicate_additions,duplicate_additions)
check('no-duplicate-existing-composite-unique',not duplicate_unique,duplicate_unique)
check('no-history-fact-seeding',not re.search(r'(?i)INSERT\s+INTO\s+poms\.(?:project|project_stage_record|receipt_accounting_basis|project_ownership_origin|commission_role_assignment)\b',sql))
check('no-placeholder-migration-instructions','Root must add' not in sql and 'TODO' not in sql)
check('money-precision-not-widened',not re.search(r'(?i)ALTER\s+COLUMN\s+(?!gross_margin_rate\b)[a-z_0-9]+\s+TYPE\s+numeric',sql))
check('legacy-producer-default0','ADD COLUMN producer_version integer NULL' not in sql and 'producer_version IS NULL OR' not in sql)
check('origin-one-way-DB-guard',all(token in sql for token in ['jghi_ownership_origin_guard','OLD.bootstrap_state<>\'available\'','NEW.bootstrap_state<>\'consumed\'']))
check('unknown-pending-tax-is-null-with-knowledge',all(token in sql for token in ['ALTER TABLE poms.data_maturity_evaluation_result ALTER COLUMN tax_impact_pending_amount DROP NOT NULL','ALTER TABLE poms.operating_signal_gate_binding ALTER COLUMN tax_impact_pending_amount DROP NOT NULL',"tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL"]))
check('all-adopted-summary-definitions-registered',len(blue['productionSummaryDefinitions'])==6 and all("VALUES('"+row['scenario']+"','"+row['package']+"','"+row['projection']+"','"+row['export']+"','"+row['fieldRule']+"','active')" in sql for row in blue['productionSummaryDefinitions']))
check('deferred-context-binding-and-completion-checks',all(token in sql for token in ['jghi_context_identity_guard','jghi_binding_summary_guard','jghi_completion_guard','jghi_completion_fact_guard','jghi_condition_fact_guard','jghi_archive_guard']))

# Source syntax parsing is intentionally distinct from actual migration runtime.
WARNINGS.append('SQL has not been executed, parsed by PostgreSQL, or checked against a live DB. Runtime/service semantic predicates remain G2 implementation and acceptance obligations.')
report={'kind':'joint-G1-read-only-structural-verification','status':'PASS' if not ERRORS else 'FAIL',
        'G1Certified':False,'G2Authorized':False,'checks':CHECKS,'errors':ERRORS,'limitations':WARNINGS,
        'observed':{'operations':len(ops),'groups':groups,'newTables':len(created),'sourceMigrationFiles':94,'staticSourceTables':len(base_tables)}}
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if not ERRORS else 1)
