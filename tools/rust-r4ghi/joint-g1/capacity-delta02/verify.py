"""Read-only capacity/source/fixture verifier; no SQL, Git, subprocess or writes."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import sys

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[3]
audit=json.loads((OUT/'capacity-audit.json').read_text(encoding='utf-8'))
checks=[]


def check(name,condition,detail=None):
    checks.append({'check':name,'passed':bool(condition),'detail':detail})


def money_cents(raw):
    match=re.fullmatch(r'(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?',raw)
    if not match:
        return 'precision'
    sign,whole,fraction=match.groups()
    fraction=(fraction or '').rstrip('0')
    if len(fraction)>2:
        return 'precision'
    value=int(whole)*100+int((fraction+'00')[:2])
    return -value if sign else value


def fixed(value,scale):
    sign='-' if value<0 else ''
    value=abs(value)
    return f'{sign}{value//10**scale}.{value%10**scale:0{scale}d}'


limit=10**18-1
check('exact-common-18-2-limit',str(limit)==audit['moneyContract']['maximumCents'] and fixed(limit,2)==audit['moneyContract']['maximumAmount'])
check('all20-existing-money-columns-audited',len(audit['columns'])==20 and len({(x['table'],x['column']) for x in audit['columns']})==20)
check('all-actual-DDL-and-ORM-18-2',all(x['ddl']['precision']==18 and x['ddl']['scale']==2 and x['orm']['precision']==18 and x['orm']['scale']==2 for x in audit['columns']))
check('full94-migration-history-searched',audit['sourceMigrationCount']==94)
check('no-later-type-narrowing',all(not x['ddl']['laterTypeAlterations'] for x in audit['columns']))
check('all8-new-money-fields-18-2',len(audit['newV1MonetaryColumns'])==8 and all(x['precision']==18 and x['scale']==2 for x in audit['newV1MonetaryColumns']))
check('actual18-4-only-quantity-unit-price',{x['column'] for x in audit['allActual18_4CreateColumns']}=={'quantity','unit_price'},audit['allActual18_4CreateColumns'])
check('zero-capacity-SQL-ORM-changes',audit['SQLCapacityAlterStatements']==[] and audit['ORMCapacityChanges']==[])
check('gross-margin-rate38-6-decision-preserved',len(audit['ratios'])==2 and all(x['frozenV1Target']=={'precision':38,'scale':6} for x in audit['ratios']))
check('typed422-capacity-and-precision',audit['moneyContract']['overflow']['httpStatus']==422 and audit['moneyContract']['nonCentHistory']['httpStatus']==422)
check('no-live-database-or-product-claim',audit['staticOnly'] and not audit['liveDatabaseTypeVerified'] and not audit['G1Certified'] and not audit['G2Authorized'])

for filename,base in [('sources.json',ROOT),('preserved-v1.json',ROOT),('artifacts.json',OUT)]:
    manifest=json.loads((OUT/filename).read_text(encoding='utf-8'))
    bad=[]
    for item in manifest['entries']:
        path=(base/item['path']).resolve()
        if base not in path.parents or not path.is_file():
            bad.append(item['path'])
            continue
        raw=path.read_bytes()
        if len(raw)!=item['bytes'] or hashlib.sha256(raw).hexdigest()!=item['sha256']:
            bad.append(item['path'])
    check(filename+'-exact-byte-pins',not bad,bad)

source_raw=(ROOT/'apps/poms-api-rust/src/project_actual_cost/logic.rs').read_text(encoding='utf-8-sig')
source_const=re.search(r'pub const MONEY_MAX: i128\s*=\s*([0-9_]+)',source_raw)
check('matches-current-E-source-MONEY_MAX',source_const is not None and int(source_const[1].replace('_',''))==limit)
for column in audit['columns']:
    orm=column['orm']
    ddl=column['ddl']
    check(column['table']+'.'+column['column']+'-exact-DDL-ORM-lines',
          orm['excerpt'] in (ROOT/orm['path']).read_text(encoding='utf-8-sig').splitlines()[orm['line']-1]
          and ddl['excerpt'] in (ROOT/ddl['migration']).read_text(encoding='utf-8-sig').splitlines()[ddl['line']-1])

for case in audit['fixtures']:
    inputs,expected=case['inputs'],case['expect']
    actual_ok=False
    if case['id']=='maximum-gross-frozen-13percent-basis':
        gross=int(inputs['grossCents'])
        denominator=10000+int(inputs['taxRate4'])
        quotient,remainder=divmod(gross*10000,denominator)
        net=quotient+(2*remainder>=denominator)
        tax=gross-net
        actual_ok=net==int(expected['netCents']) and tax==int(expected['taxCents']) and net+tax==gross and all(0<=x<=limit for x in [gross,net,tax])
    elif 'sameCategorySourceCents' in inputs:
        total=sum(int(x) for x in inputs['sameCategorySourceCents'])
        actual_ok=total==int(expected['aggregateCents']) and total>limit and expected['httpStatus']==422 and expected['committedDomainAndEvidenceChanges']==0
    elif 'historicalMoney' in inputs:
        parsed=money_cents(inputs['historicalMoney'])
        actual_ok=(parsed=='precision' and expected.get('httpStatus')==422) or (parsed==int(expected.get('cents','-999')) and fixed(parsed,2)==expected['canonicalV1Amount'])
        actual_ok=actual_ok and expected['historicalMoneyUnchanged']==inputs['historicalMoney']
    elif inputs.get('knowledge')=='unknown':
        actual_ok=inputs['value'] is None and expected['moneyCents'] is None and expected['persistedPendingAmount'] is None
    else:
        receipt=int(inputs['receiptNetCents'])
        cost=int(inputs['includedCostNetCents'])
        margin=receipt-cost
        actual_ok=0<=receipt<=limit and 0<=cost<=limit and abs(margin)<=limit and margin==int(expected['marginCents']) and fixed(margin,2)==expected['marginAmount']
        if receipt==0:
            actual_ok=actual_ok and expected['ratio6'] is None and expected['ratioReason']=='zero-denominator'
        else:
            sign=-1 if margin<0 else 1
            ratio_q,ratio_r=divmod(abs(margin)*10**6,receipt)
            ratio_units=sign*(ratio_q+(2*ratio_r>=receipt))
            actual_ok=actual_ok and fixed(ratio_units,6)==expected['ratio6'] and abs(ratio_units)<=10**38-1
    check('pure-exact-integer-fixture:'+case['id'],actual_ok)

no_ddl=(OUT/'migration-delta.sql').read_text(encoding='utf-8')
executable='\n'.join(line for line in no_ddl.splitlines() if not line.lstrip().startswith('--')).strip()
check('capacity-migration-delta-has-no-executable-DDL',not executable)
failed=[x for x in checks if not x['passed']]
report={'kind':'capacity-delta-read-only-verification','status':'PASS' if not failed else 'FAIL',
 'G1Certified':False,'G2Authorized':False,'SQLExecuted':False,'productRuntimeRun':False,
 'checks':checks,'errors':failed,'observed':{'existingMonetaryColumns':20,'newV1MonetaryFields':8,'sourceMigrationFiles':94,'capacitySQLAlters':0,'capacityORMChanges':0},
 'limits':'Static byte/DDL/ORM checks and independent exact integer arithmetic only. Real source-producing HTTP, transaction rollback, database, security and UI acceptance not run.'}
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if not failed else 1)
