"""Tools-only capacity confirmation. Never imports/rebuilds the sealed v1.
All writes stay in this new delta directory. No SQL/network/Git/subprocess.
"""
from __future__ import annotations

import ast
import hashlib
import json
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent
V1 = OUT.parent
ROOT = V1.parents[2]
MAX_CENTS = 999_999_999_999_999_999
SOURCES = set()


def read(rel):
    SOURCES.add(rel)
    return (ROOT/rel).read_text(encoding="utf-8-sig")


def emit(name,value):
    path=OUT/name
    assert path.parent==OUT
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


def text(name,value):
    path=OUT/name
    assert path.parent==OUT
    path.write_text(value.replace("\r\n","\n"),encoding="utf-8")


def cents(value):
    sign='-' if value<0 else ''
    value=abs(value)
    return f'{sign}{value//100}.{value%100:02d}'


TABLES = {
 "operating_baseline_package":("operating-baseline-package.entity.ts",[
  "original_baseline_cost","change_package_total","current_effective_baseline_cost"]),
 "change_package_baseline":("change-package-baseline.entity.ts",["change_amount"]),
 "project_operating_snapshot":("project-operating-snapshot.entity.ts",[
  "effective_contract_total","receivable_confirmed_total","included_cost_total","original_baseline_cost",
  "current_effective_baseline_cost","gross_margin_amount","tax_impact_pending_amount"]),
 "period_closing_snapshot":("period-closing-snapshot.entity.ts",[
  "effective_contract_total","receivable_confirmed_total","included_cost_total","original_baseline_cost",
  "current_effective_baseline_cost","gross_margin_amount","tax_impact_pending_amount"]),
 "data_maturity_evaluation_result":("data-maturity-evaluation-result.entity.ts",["tax_impact_pending_amount"]),
 "operating_signal_gate_binding":("operating-signal-gate-binding.entity.ts",["tax_impact_pending_amount"])
}
SIGNED = {"change_package_total","change_amount","gross_margin_amount","execution_change_package_total"}
MIGRATIONS = sorted((ROOT/'apps/poms-api/src/migrations').glob('Migration*.ts'))
blocks=[]
for path in MIGRATIONS:
    rel=path.relative_to(ROOT).as_posix()
    raw=read(rel).split('override async down',1)[0]
    for match in re.finditer(r"this\.addSql\(\s*(?:String\.raw)?(`(?:[^`]|\\`)*`|\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')\s*,?\s*\)",raw,re.S):
        literal=match[1]
        sql=json.loads(literal) if literal.startswith('"') else ast.literal_eval(literal) if literal.startswith("'") else literal[1:-1]
        blocks.append((rel,sql))

create_defs={}
alter_type=[]
for rel,sql in blocks:
    for match in re.finditer(r'(?is)CREATE\s+TABLE\s+"?poms"?\."?([a-z_0-9]+)"?\s*\((.*?)\)\s*;',sql):
        table,body=match.groups()
        create_defs[table]=(rel,body)
    for match in re.finditer(r'(?is)ALTER\s+TABLE\s+"?poms"?\."?([a-z_0-9]+)"?\s+([^;]+);',sql):
        table,body=match.groups()
        for column,p,s in re.findall(r'(?i)ALTER\s+(?:COLUMN\s+)?"?([a-z_0-9]+)"?\s+TYPE\s+(?:numeric|decimal)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)',body):
            alter_type.append({"migration":rel,"table":table,"column":column,"precision":int(p),"scale":int(s)})

columns=[]
for table,(file,names) in TABLES.items():
    rel='apps/poms-api/src/app/features/project-cost/'+file
    raw=read(rel)
    ddl_rel,body=create_defs[table]
    ddl_raw=read(ddl_rel)
    for name in names:
        match=re.search(r'(?im)^\s*"?'+re.escape(name)+r'"?\s+(?:numeric|decimal)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)([^\n]*)',body)
        assert match, (table,name,'missing actual CREATE numeric')
        p,s=int(match[1]),int(match[2])
        history=[x for x in alter_type if x['table']==table and x['column']==name]
        if history:
            p,s=history[-1]['precision'],history[-1]['scale']
        orm_lines=[(n,line) for n,line in enumerate(raw.splitlines(),1) if f"fieldName('{name}')" in line or f'fieldName("{name}")' in line]
        assert len(orm_lines)==1,(table,name,'ORM ambiguity')
        line_no,line=orm_lines[0]
        orm=re.search(r'(\w+)\s*:\s*p\.decimal\(\)\.precision\((\d+)\)\.scale\((\d+)\)',line)
        assert orm,(table,name,'expected explicit decimal ORM')
        token=match[0].strip()
        raw_table=re.search(r'(?is)CREATE\s+TABLE\s+"?poms"?\."?'+table+r'"?\s*\((.*?)\)\s*;',ddl_raw)
        assert raw_table,(table,'missing original source block')
        raw_column=re.search(r'(?im)^\s*"?'+name+r'"?\s+(?:numeric|decimal)\s*\(\s*18\s*,\s*2\s*\)',raw_table[1])
        assert raw_column,(table,name,'raw source column missing')
        ddl_position=raw_table.start(1)+raw_column.start()+raw_column[0].index(name)
        ddl_line=ddl_raw[:ddl_position].count('\n')+1
        columns.append({"table":table,"column":name,"writer":"H" if table in {'data_maturity_evaluation_result','operating_signal_gate_binding'} else "G",
         "ddl":{"precision":p,"scale":s,"integerDigits":p-s,"migration":ddl_rel,"line":ddl_line,"excerpt":token,"laterTypeAlterations":history},
         "orm":{"path":rel,"line":line_no,"property":orm[1],"precision":int(orm[2]),"scale":int(orm[3]),"excerpt":line.strip()},
         "capacityAction":"none; keep numeric(18,2) and precision(18).scale(2)","signed":name in SIGNED,
         "V1CentsBound":{"minimum":-MAX_CENTS if name in SIGNED else 0,"maximum":MAX_CENTS},
         "otherFrozenV1Change":"H pending nullable+knowledge per sealed v1; precision unchanged" if table in {'data_maturity_evaluation_result','operating_signal_gate_binding'} else None})

v1migration_rel='tools/rust-r4ghi/joint-g1/migration.sql'
v1sql=read(v1migration_rel)
new_money=[]
for table,names in {
 'receipt_accounting_basis':['cash_gross','amount_excluding_tax','tax_amount'],
 'operating_baseline_package':['handover_baseline_cost','execution_change_package_total'],
 'operating_snapshot_cost_member':['amount_excluding_tax','tax_cost_amount','amount_including_tax']
}.items():
    table_block=re.search(r'(?s)CREATE TABLE poms\.'+table+r'\s*\((.*?)\n\);',v1sql)
    if table_block is None:
        table_block=re.search(r'(?s)ALTER TABLE poms\.'+table+r'\s+(.*?);',v1sql)
    assert table_block,(table,'V1 money block missing')
    for name in names:
        match=re.search(r'(?m)^\s*(?:ADD COLUMN )?'+name+r'\s+numeric\((\d+),(\d+)\)([^\n]*)',table_block[1])
        assert match,(table,name)
        position=table_block.start(1)+match.start()+match[0].index(name)
        new_money.append({"table":table,"column":name,"precision":int(match[1]),"scale":int(match[2]),"source":v1migration_rel,
                          "line":v1sql[:position].count('\n')+1,"capacityAction":"none","signed":name in SIGNED})

ratio=[]
for table in ['project_operating_snapshot','period_closing_snapshot']:
    file=TABLES[table][0]
    rel='apps/poms-api/src/app/features/project-cost/'+file
    raw=read(rel)
    line_no,line=next((n,line) for n,line in enumerate(raw.splitlines(),1) if "fieldName('gross_margin_rate')" in line)
    ratio.append({"table":table,"column":"gross_margin_rate","currentOrm":{"precision":9,"scale":6,"path":rel,"line":line_no,"excerpt":line.strip()},
                  "frozenV1Target":{"precision":38,"scale":6},"capacityDeltaAction":"no new change; Root still performs sealed v1 ratio ORM/DDL update","moneyCapApplies":False})

source_proofs={}
for rel in [
 'apps/poms-api-rust/src/project_actual_cost/logic.rs',
 'apps/poms-api-rust/src/project_cost_governance/logic.rs',
 'apps/poms-api/src/app/features/contract-finance/receipt-record.entity.ts',
 'apps/poms-api/src/app/features/project-cost/project-actual-cost-record.entity.ts',
 'apps/poms-api/src/app/features/project-cost/shared-cost-allocation-basis.entity.ts',
 'apps/poms-api/src/app/features/project-cost/shared-cost-allocation-result.entity.ts',
 'apps/poms-api/src/app/features/project-cost/shared-cost-allocation-source-snapshot.entity.ts',
 'apps/poms-api/src/app/features/project-cost/accounting-tax-treatment-snapshot.entity.ts',
 'apps/poms-api/src/app/features/project/project-technical-cost-package.entity.ts',
 'apps/poms-api/src/app/features/project-cost/project-cost.service.ts',
 'tools/rust-r4ghi/joint-g1/blueprint.json',
 'tools/rust-r4ghi/joint-g1/source-context.schema.json']:
    source_proofs[rel]=read(rel)
source_limits=[]
for rel,raw in source_proofs.items():
    for n,line in enumerate(raw.splitlines(),1):
        if 'pub const MONEY_MAX' in line or '.scale(4)' in line or ('.scale(2)' in line and ('receiptAmount:' in line or 'amountExcludingTax:' in line)):
            source_limits.append({"path":rel,"line":n,"excerpt":line.strip()})
all_scale4=[]
for rel,sql in blocks:
    for match in re.finditer(r'(?im)^\s*"?([a-z_0-9]+)"?\s+(?:numeric|decimal)\s*\(\s*18\s*,\s*4\s*\)',sql):
        all_scale4.append({"migration":rel,"column":match[1],"excerpt":match[0].strip()})

root_decision={"source":"Root explicitly corrected its hypothesis in this task after static findings",
 "finding":"Old formatAmount four-place formatting and EX26 quantity/unit_price numeric(18,4) were incorrectly inferred as operating storage type. No catalog evidence was supplied or fabricated.",
 "decision":"Use actual migration/ORM source: no aggregate column widening. Preserve sealed v1. V1 known source/aggregate money retains numeric(18,2) semantic range; over-capacity422 before aggregate persistence and atomic rollback. No silent rounding of historical non-cent amounts.",
 "SQLExecuted":False,"databaseQueried":False,"productChanged":False,"sealedV1Rebuilt":False}
emit('root-decision.json',root_decision)

contract={
 "version":"operating-money-v1-capacity-confirmation","precision":18,"scale":2,"integerDigits":16,
 "maximumCents":str(MAX_CENTS),"minimumSignedCents":str(-MAX_CENTS),"maximumAmount":cents(MAX_CENTS),
 "minimumSignedAmount":cents(-MAX_CENTS),"representation":"exact decimal strings / checked integer cents (i128); no f64/JS Number totals or money formatter as authority",
 "knownSourceAdmission":"Actual money may have trailing zero scale from storage/text, but converting to cents must be exact. Strip only insignificant zeros; nonzero sub-cent digits reject422, never round legacy money into a new baseline. Do not apply this money rule to legitimate quantity/unit_price/rate precision.",
 "aggregateAdmission":"Each known published monetary aggregate independently fits +/-MAX_CENTS with its field sign constraint: baseline components/deltas, contract totals, confirmed receipt totals, included/excluded cost totals, pending tax/recognized adjustment, cost variance and margin. Amounts in context JSON are not unlimited sidecars.",
 "sourceEconomicLayers":"Validate net/tax/gross and actual source sets separately; gross=net+tax exactly. Do not sum receipt+cost as a monetary precondition for a later subtraction, or reject a valid zero margin from two separately bounded maxima.",
 "overflow":{"httpStatus":422,"code":"operating_money_capacity_exceeded","safeResponseFields":["statusCode","code","field","maximumAmount"],"neverReturnUnprojectedComputedAmount":True,
             "timing":"checked sums/products/differences and full aggregate bounds before snapshot/baseline/period/H aggregate INSERT or returned certified current result. Producer changes within the same outer transaction must roll back if later capacity validation fails. Never rely on PostgreSQL22003 for a valid source.","i128Overflow":"checked arithmetic failure maps to the same typed422, never500 or wrap"},
 "nonCentHistory":{"httpStatus":422,"code":"operating_money_precision_unsupported","rule":"retain original source/history bytes; formal new V1 consumption blocked until a real separately authorized corrected source exists; no migration mass rounding/backfill"},
 "unknown":"unknown is null+knowledge+reason, not known zero; no numeric range test on null and no COALESCE to0",
 "zero":"known0.00 is permitted only with existing source/complete-scope proof; exact derived zero margin from equal known amounts is known, not missing",
 "negative":"margin/cost variance/change delta can be negative; preserve signed cents and H low-receipt/maturity policy. Nonnegative totals remain nonnegative.",
 "ratios":"Unrounded rational for classification, six-place half-away-from-zero display, existing frozen numeric(38,6) for gross_margin_rate. Zero denominator gives null/reason, not0; money MAX is not a ratio bound.",
 "persistence":"20 existing monetary targets and8 new monetary fields already numeric(18,2). No sidecar-only workaround needed; v1 actually writes legacy aggregate columns and must honor their full common capacity.",
 "rootWiring":{"common":"Root owns a single exact money type/range guard in project_operating_common; G collector/writer and H context/policy assertion validator consume the same guard. Match existing E MONEY_MAX; do not expand C/E/F ordinary amount admission.",
               "errors":"Root adds typed422 mapping and current shared error schema; G/H cannot throw database overflow as normal source rejection.",
               "beforeG1":"Append this capacity delta as input clarification to the formal baseline/manifest; do not rewrite or retrospectively claim the sealed v1 audit included it."}
}

g13=(MAX_CENTS*10000+11300//2)//11300
fixtures=[
 {"id":"maximum-single-source-no-tax","inputs":{"receiptNetCents":str(MAX_CENTS),"receiptGrossCents":str(MAX_CENTS),"taxCents":"0","includedCostNetCents":"0"},"expect":{"admission":"accept-range","marginCents":str(MAX_CENTS),"marginAmount":cents(MAX_CENTS),"ratio6":"1.000000"}},
 {"id":"maximum-gross-frozen-13percent-basis","inputs":{"grossCents":str(MAX_CENTS),"taxRate4":"1300"},"expect":{"admission":"accept-range","netCents":str(g13),"taxCents":str(MAX_CENTS-g13),"grossAmount":cents(MAX_CENTS),"netAmount":cents(g13),"taxAmount":cents(MAX_CENTS-g13)}},
 {"id":"maximum-receipt-and-cost-known-zero-margin","inputs":{"receiptNetCents":str(MAX_CENTS),"includedCostNetCents":str(MAX_CENTS)},"expect":{"admission":"accept-range","marginCents":"0","marginAmount":"0.00","marginKnowledge":"known","ratio6":"0.000000"}},
 {"id":"one-cent-receipt-maximum-cost-negative-margin","inputs":{"receiptNetCents":"1","includedCostNetCents":str(MAX_CENTS)},"expect":{"admission":"accept-range","marginCents":str(1-MAX_CENTS),"marginAmount":cents(1-MAX_CENTS),"ratio6":str(1-MAX_CENTS)+'.000000',"signal":"H policy still decides low-receipt observation/manual review; no automatic risk solely from large displayed negative ratio"}},
 {"id":"zero-denominator-known-negative-money","inputs":{"receiptNetCents":"0","includedCostNetCents":str(MAX_CENTS)},"expect":{"arithmeticAdmission":"accept-range","formalPublication":"depends on genuine receipt/scope evidence under existing eligibility; this is not a fabricated no-receipt producer","marginCents":str(-MAX_CENTS),"marginAmount":cents(-MAX_CENTS),"ratio6":None,"ratioReason":"zero-denominator"}},
 {"id":"one-cent-over-aggregate","inputs":{"sameCategorySourceCents":[str(MAX_CENTS),'1']},"expect":{"aggregateCents":str(MAX_CENTS+1),"aggregateAmount":cents(MAX_CENTS+1),"httpStatus":422,"code":"operating_money_capacity_exceeded","committedDomainAndEvidenceChanges":0}},
 {"id":"two-maxima-same-category-overflow","inputs":{"sameCategorySourceCents":[str(MAX_CENTS),str(MAX_CENTS)]},"expect":{"aggregateCents":str(2*MAX_CENTS),"httpStatus":422,"code":"operating_money_capacity_exceeded","committedDomainAndEvidenceChanges":0}},
 {"id":"historical-significant-third-decimal","inputs":{"historicalMoney":"1.2340"},"expect":{"httpStatus":422,"code":"operating_money_precision_unsupported","historicalMoneyUnchanged":"1.2340"}},
 {"id":"historical-insignificant-storage-zeros","inputs":{"historicalMoney":"1.2300"},"expect":{"admission":"accept-exact-cents","cents":"123","canonicalV1Amount":"1.23","historicalMoneyUnchanged":"1.2300"}},
 {"id":"unknown-pending-tax-is-not-zero","inputs":{"knowledge":"unknown","value":None},"expect":{"moneyCents":None,"persistedPendingAmount":None,"knowledge":"unknown","rangeDoesNotInventZero":True}}
]

audit={"kind":"joint-G1-capacity-input-delta-not-product","status":"CAPACITY-CONFIRMED-NO-COLUMN-WIDENING",
 "sealedV1Preserved":True,"G1Certified":False,"G2Authorized":False,"staticOnly":True,"liveDatabaseTypeVerified":False,
 "rootDecision":root_decision,"sourceMigrationCount":len(MIGRATIONS),"columns":columns,"existingMonetaryColumnCount":len(columns),
 "newV1MonetaryColumns":new_money,"newMonetaryColumnCount":len(new_money),"ratios":ratio,"sourceProofs":source_limits,
 "allActual18_4CreateColumns":all_scale4,"ORMCapacityChanges":[],"SQLCapacityAlterStatements":[],
 "moneyContract":contract,"fixtures":fixtures,
 "reviewObligation":"Root performs current-schema comparison in its independently authorized acceptance workflow if desired. Static source proof is not a live DB measurement. Catalog divergence would be existing-baseline-drift and require a new exact delta, never an assumed18,4 mutation.",
 "runtimeValidationStatus":"pure arithmetic fixture expectations only here; actual HTTP/transaction/DB/UI fixtures remain planned-not-run"}
emit('capacity-audit.json',audit)
emit('fixtures.json',{"kind":"capacity-exact-integer-fixtures","productionAcceptanceRun":False,"cases":fixtures})
emit('orm-targets.json',{"capacityChanges":[],"columns":[{"table":x['table'],"column":x['column'],"orm":x['orm'],"targetPrecision":18,"targetScale":2,"action":"keep"} for x in columns],"preserveAlreadyFrozenRatioTargets":ratio})
text('migration-delta.sql',"""-- CAPACITY CONFIRMATION DELTA ONLY. NOT EXECUTED.
-- Required capacity ALTER statements: NONE.
-- All20 inspected existing G/H monetary columns and8 new V1 money fields
-- already use numeric(18,2): 16 integer digits, exact cents.
-- Preserve sealed v1 migration, including its2 gross_margin_rate numeric(38,6)
-- changes and pending-tax NULL/knowledge semantics.
-- No TYPE20,4 change, no UPDATE/round/backfill, no source capacity expansion.
-- Exact aggregation bounds and typed422 rejection belong to the pre-INSERT
-- common V1 money validator; do not intentionally provoke SQLSTATE22003.
""")
sql_values=',\n'.join(f" ('{x['table']}','{x['column']}',18,2)" for x in columns)
text('capacity-verification.sql',"""-- OPTIONAL READ-ONLY CATALOG CROSS-CHECK. NOT RUN BY THIS TASK.
-- Return actual versus source-expected types; never auto-correct discrepancies.
WITH expected(table_name,column_name,expected_precision,expected_scale) AS (
 VALUES
"""+sql_values+"""
)
SELECT e.table_name,e.column_name,e.expected_precision,e.expected_scale,
       c.data_type,c.numeric_precision,c.numeric_scale,
       c.numeric_precision IS NOT DISTINCT FROM e.expected_precision
         AND c.numeric_scale IS NOT DISTINCT FROM e.expected_scale AS matches_source
FROM expected e LEFT JOIN information_schema.columns c
 ON c.table_schema='poms' AND c.table_name=e.table_name AND c.column_name=e.column_name
ORDER BY e.table_name,e.column_name;
""")
rows='\n'.join(f"| `{x['table']}.{x['column']}` | `{x['orm']['property']}` | 18,2 | 18,2 | `{x['ddl']['migration'].split('/')[-1]}:{x['ddl']['line']}` / `{x['orm']['path'].split('/')[-1]}:{x['orm']['line']}` |" for x in columns)
text('capacity-delta.md',"""# G/H 聚合金额容量确认 delta02

**结论：不需要扩列。** 逐列核对94个迁移up()及当前ORM，20个既有G/H聚合金额列均为`numeric(18,2)`/`.precision(18).scale(2)`，不存在后来变为18,4的ALTER；新V1另8个金额字段也是18,2。最大值为`9999999999999999.99`，与E既有`MONEY_MAX=999999999999999999` cents一致。仅凭旧formatAmount输出4位小数不能推断存储scale。

Root已撤回经营列18,4的假设：现有18,4实际是technical-cost line的quantity/unit_price，金额列仍18,2。未提供或伪造catalog实测。`capacity-verification.sql`只是Root可选的只读检查输入，本任务未执行。

封存v1原件完全保留，本目录为追加澄清，未通过G1、未获G2准入，未改产品、执行SQL/HTTP/Git或读取凭证。

| 表.金额列 | ORM属性 | 迁移精度 | ORM精度 | 精确出处 |
| --- | --- | --- | --- | --- |
"""+rows+"""

完整原行、后续类型ALTER追踪、28个目标、源容量和来源SHA见`capacity-audit.json`/`sources.json`。所需容量SQL ALTER为0、容量ORM改动为0。v1已冻的两个gross_margin_rate→38,6及H pending nullable+knowledge原样保留；本delta不把它们当新增容量修复。无须sidecar-only方案：真实聚合列已具备所需容量，JSON context也不得被当成无限金额容器。

## 必须进入正式G1的金额边界

- 所有新V1已知source/aggregate金额仍为精确两位、16整数位容量；字符串/checked整数cents计算，不用f64、JS Number或旧formatAmount作权威。每类总额独立有界，不把回款+成本混加成不必要的中间金额来拒绝合法零毛利。
- 已知source及聚合超过范围，或checked i128运算溢出，必须在baseline/snapshot/period/H聚合INSERT前返回`422 operating_money_capacity_exceeded`。同outerTX内已作的source/CAS/classification/summary/audit/pending-auth变更全部回滚；不能把DB22003作为合法source失败路径。错误只回字段/固定最大容量，不泄露未投影的精确合计或成员。
- `change_amount/change_package_total/execution_change_package_total/costVarianceNet/grossMarginNet`允许其定义中的负值；其他本来非负总额继续非负。每个已知金额独立满足绝对值MAX，不夹到0、不截断。
- 历史金额若有有效第三位小数，新的正式V1消费应`422 operating_money_precision_unsupported`并保留原值，不能静默round后入新baseline。`1.2300`可精确取123 cents而不改历史；`1.2340`不可。quantity/unitPrice/rate自身合法的4位精度不属于金额总额，不能因此错误拒绝已真实记录的两位估算金额。
- unknown保留null+knowledge/reason，不填0；有真实proof的0.00正常表示已知零。毛利由两个各自合法的MAX相减可以为已知0；净回款1cent、成本MAX可以得到合法负毛利`-9999999999999999.98`，不因此改动H低回款/成熟度规则。
- 毛利比例按原有理数/6位展示规则，存储仍是封存38,6。1cent/MAX负例的比例为`-999999999999999998.000000`，可存38,6；0分母返回null/reason，不造0比例。金额MAX不错误套到比例。

Root单写公共Money类型/range guard/typed422以及共享error DTO，G collector和H断言校验复用；C/E/F普通金额容量不扩大。规范及具体fixture见`capacity-audit.json.moneyContract`与`fixtures.json`。

## 检查与真实验收

`verify.py`只读验证逐列DDL/ORM、来源字节、v1保留、精确整数最大值/13%净税拆分/零与负毛利/单cent超限/有效第三位历史/未知值。它不是SQL执行或业务验收。真实HTTP/DB/UI验收还必须由Root产生最大合法source、验证各类聚合与38,6比例、超限422前后所有域状态与证据行原子不变，并保持真实资格/权限/来源链；纯算术fixture不能补造业务准入事实。
""")

preserved=[]
for path in sorted(V1.iterdir()):
    if path.is_file():
        raw=path.read_bytes()
        preserved.append({"path":path.relative_to(ROOT).as_posix(),"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()})
emit('preserved-v1.json',{"kind":"sealed-v1-no-mutation-observed-byte-pins","entries":preserved})
emit('sources.json',{"algorithm":"SHA-256 raw bytes","entries":[{"path":rel,"bytes":len((ROOT/rel).read_bytes()),"sha256":hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()} for rel in sorted(SOURCES)]})
artifacts=[]
for path in sorted(OUT.iterdir()):
    if path.is_file() and path.name!='artifacts.json':
        raw=path.read_bytes()
        artifacts.append({"path":path.name,"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()})
emit('artifacts.json',{"excludesSelf":True,"entries":artifacts})
print(json.dumps({"status":audit['status'],"existingMoneyColumns":len(columns),"newMoneyFields":len(new_money),"sourceMigrations":len(MIGRATIONS),"moneyMaximum":cents(MAX_CENTS),"capacitySQLAlters":0,"capacityORMChanges":0},ensure_ascii=False))
