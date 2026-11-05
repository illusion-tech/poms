import collections
import csv
import difflib
import hashlib
import json
import pathlib
import re
import sys
from datetime import datetime, timezone

folder = pathlib.Path(__file__).resolve().parent
manifest_path = folder / 'candidate-manifest28.json'
manifest = json.loads(manifest_path.read_text('utf-8'))
inventory = json.loads((folder / 'inventory28.json').read_text('utf-8'))
fields = json.loads((folder / 'field-matrix28.json').read_text('utf-8'))
constraints = json.loads((folder / 'constraint-matrix28.json').read_text('utf-8'))
root = pathlib.Path(manifest['rootCheckoutReadOnly'])
catalog = json.loads((root / 'tmp/rust-r4def/root/catalog25/native-catalog.json').read_text('utf-8'))


def rawsha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(name, value):
    path = folder / name
    path.write_text(value, encoding='utf-8', newline='\n')


def pin(path):
    return {'file': path.relative_to(folder).as_posix(), 'bytes': path.stat().st_size, 'rawBytesSha256': rawsha(path)}


for item in manifest['files']:
    assert rawsha(folder / item['candidate']) == item['candidateSha256']
    if item['sourceBeforeSha256']:
        assert rawsha(root / item['target']) == item['sourceBeforeSha256']
        assert rawsha(folder / 'originals' / (item['target'] + '.bin')) == item['sourceBeforeSha256']
    else:
        assert not (root / item['target']).exists()

if '--seal' not in sys.argv:
    patch = []
    for item in manifest['files']:
        before = (folder / 'originals' / (item['target'] + '.bin')).read_text('utf-8') if item['sourceBeforeSha256'] else ''
        after = (folder / item['candidate']).read_text('utf-8')
        patch.extend(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='a/' + item['target'] if before else '/dev/null', tofile='b/' + item['target']))
    write('native-orm28.patch', ''.join(patch))
    with (folder / 'field-matrix28.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(['table', 'column', 'property', 'action', 'type', 'precision', 'scale', 'length', 'nullable', 'final_default', 'candidate_file', 'builder'])
        for item in fields['mappings']:
            col = item['catalog']
            writer.writerow([item['table'], item['column'], item['property'], item['action'], col['udt_name'], col['numeric_precision'], col['numeric_scale'], col['character_maximum_length'], col['is_nullable'], col['column_default'], item['candidateFile'], item['expression']])
    sql_only = []
    for item in constraints['constraints']:
        if not item['handling'].startswith('SQL-only'):
            continue
        target_pk = next(c['definition'] for c in catalog['constraints'] if c['table_name'] == item['target'] and c['contype'] == 'p')
        reason = f"Target {item['target']} has {target_pk}; this FK references its separate UNIQUE tuple ({', '.join(item['referenced'])}). Current Native mapToPk exposes one UUID identity with independently mapped scope columns. A scalar FK would discard scope; relation joinColumns/referencedColumnNames would change that value shape or duplicate ownership of scope columns without a verified schema diff. Preserve the exact SQL tuple and all deferral/delete semantics; no global FK ignore."
        sql_only.append({
            'table': item['table_name'], 'constraintName': item['conname'],
            'columns': item['local'], 'targetTable': item['target'], 'targetColumns': item['referenced'],
            'definition': item['definition'], 'definitionSha256': hashlib.sha256(item['definition'].encode()).hexdigest(),
            'condeferrable': item['condeferrable'], 'condeferred': item['condeferred'],
            'catalogValidated': item['convalidated'], 'reason': reason,
            'proposedClassification': 'accepted-db-specific-difference only after Root verifies exact definition; pending approval, not a schema-check bypass'
        })
    write('sql-only-fks28.json', json.dumps({'kind': 'finite-proposed-SQL-owned-composite-FKs', 'count': len(sql_only), 'constraints': sql_only}, ensure_ascii=False, indent=2) + '\n')
    lines = ['# ORM28 精确 SQL 复合外键清单', '', '仅此有限清单提出数据库特有差异分类，分类由 Root 在实际 schema diff 后裁定。每项实际规则仍保留在 PostgreSQL，候选不会创建较弱的单列 FK；禁止通过忽略整个表、所有 FK 或名称前缀来放行。catalogValidated 是输入 catalog25 的观察值，不是本作者重新连接验证。', '', 'Mikro 7 的 relation API 有 joinColumns / referencedColumnNames / ownColumns；本提案不宣称 ORM 根本不支持复合 FK。当前实体以单 UUID 主键及独立 scope 字段作为 mapToPk 值，以下 FK 均引用另一组 UNIQUE 元组；未经实际 diff 证明，不把它们改成多值 relation 或重复拥有列。完整英文理由、精确原定义、deferrable/deferred 和定义 hash 见 sql-only-fks28.json。', '', '| 表 | 精确约束名 | 本地列 | 目标表 / 列 | 延迟 |', '| --- | --- | --- | --- | --- |']
    for item in sql_only:
        lines.append(f"| `{item['table']}` | `{item['constraintName']}` | `{', '.join(item['columns'])}` | `{item['targetTable']}({', '.join(item['targetColumns'])})` | `{item['condeferrable']}/{item['condeferred']}` |")
    lines += ['', '没有修改迁移检查脚本或其例外名单。Root 若无法给某项精确差异分类，schema-check 必须保持失败；本候选的静态检查不提供放行资格。', '']
    write('SQL-ONLY-FKS28.md', '\n'.join(lines))
    counts = collections.Counter('TYPE' if ' TYPE ' in item['sql'] else 'DEFAULT' if ' SET DEFAULT ' in item['sql'] else item['action'] for item in inventory['columnChanges'])
    rows = ['# ORM28 字段范围矩阵', '', f"正式 SQL 的 {len(inventory['columnChanges'])} 项列动作：{dict(counts)}。field-matrix28.json / .csv 列出 {len(fields['mappings'])} 个新增表字段及既有变更字段，包含实际 catalog 类型、精度、scale、length、nullable、最终 default、property / 文件和 builder。26 表共 515 个 catalog 列均做存在性核对；其余既有列保持输入原实现，没有宣称重新证明其全部语义。", '', '| 表 | 列动作数 | 映射重点字段数 |', '| --- | --- | --- |']
    for table in sorted(set(manifest['newTables'] + manifest['alteredTables'])):
        rows.append(f"| `{table}` | {sum(a['table'] == table for a in inventory['columnChanges'])} | {sum(a['table'] == table for a in fields['mappings'])} |")
    rows += ['', '金额只按 SQL 把 expense 三层和 actual-cost 三层 / labor_amount 改成 numeric(18,2)。rate_value / internal_cost_rate 保持 numeric(15,4)，actual_hours / actual_person_days 保持 numeric(10,2)。allocation_weight 是 numeric(18,6)，原 allocation_ratio 仍 numeric(9,6)。没有统一把所有小数改成 2 位。', '', '四个 governance_schema_version 的最终 default=1，迁移中用于历史行的初始 default=0 不是最终 ORM default。labor_scope_key 使用 generated AS (...) STORED，不能作为可写普通 text 字段；Root 实跑还应对照实际 generation_expression。', '']
    write('FIELD-MATRIX28.md', '\n'.join(rows))
    readme = '''# Native ORM 映射候选 28

本目录只包含 Root 授权的可审查提案。实际 Root Native / shared / GitHub、数据库、环境及凭据均未修改或操作；E04 / F25 业务源未改。正式输入为 schema06.sql 与 Root 已真迁移94后的 catalog25，精确输入 hash 见 candidate-manifest28.json。catalog 中有120表及532 seed 的事实由 Root 的输入提供，本作者未重新执行数据库验证。

## 可导入内容

- files/ 下20份完整 .entity.ts：7个新表文件、13份既有文件，覆盖7新表及19 ALTER表。native-orm28.patch 是相同内容的可审查补丁。
- originals/ 保存13份 Root 现有实体的原字节；candidate-manifest28.json 逐文件固定 sourceBeforeSha256 / candidateSha256。Root 导入前必须重新匹配前置 hash；新目标必须仍不存在，否则按新 Root 输入重做差异，不能强制覆盖。
- FIELD-MATRIX28.md / field-matrix28.json / .csv 列全83个列动作和168个重点字段。constraint-matrix28.json 列150个相关约束及19个新建 / 重建索引；SQL-ONLY-FKS28.md / .json 逐项列28个仅由精确SQL维持的复合范围 FK。

## 映射处理

使用当前 defineEntity.properties 风格；UUID真实关系采用 mapToPk，FK 名称 / no action / restrict / deferred 从实际 catalog 对齐，不发明SQL没有的弱单列约束。新7表主键含一个双列PK及summary_snapshot_id主键；JSONB object/array、date与timestamptz、char(64)、smallint、null及最终default按SQL和catalog映射。版本锁只在row_version，普通version/schema_version不误设为乐观锁。

旧费率 Native EXCLUDE 只含active且使用coalesce的表达式已在候选替换为catalog的active+superseded / daterange；劳动scope-period新 EXCLUDE 同样按项目既有 indexes.expression 自定义 DDL 模式声明。二者仍需Root实际SchemaGenerator diff确认，不因自定义表达式跳过数据库规则。所有partial-current/source/successor索引谓词逐名取实际catalog，四个来源current索引现在完整包含registered。

SQL中的两个不可变trigger functions、五个triggers和btree_gist extension继续由精确迁移维护；defineEntity没有相应通用元数据，不删除、不模拟。Root实际检查应保留它们的存在性与定义保护。新7实体的migration discovery可由既有entitiesTs glob发现；Native Nest的forFeature/autoLoadEntities完整运行注册由Root核对，提案不改module，也不实现Node新命令。

## 静态验证与剩余验收

static-checks28-04.json 是最终候选的真实离线检查：TypeScript6.0.3，使用CompilerHost把候选覆盖到Root路径内存中，noEmit类型/语法检查0 diagnostics；26表515列存在性、168字段精度/null、150约束和19索引谓词0静态差异，Root源与F25六源hash未变。只解析TypeScript和本地typing，不导入/运行Root配置、不加载环境/凭据、不连接DB。初次静态检查仅遇到node类型库寻址的harness问题，后通过显式Root configFilePath/currentDirectory修复，原失败static-checks28.json保留。

未运行Native整体lint/build、迁移、数据库schema-check、命令/HTTP/浏览器验收。Root须导入后执行完整Native lint/build/migration-check及独立审查；任何精确DDL差异必须逐项分类或修复，不能从此静态结果宣布schema-check Pass。没有commit/push或GitHub写入。
'''
    write('INTEGRATION28.md', readme)
    print(json.dumps({'packagedCandidates': len(manifest['files']), 'sqlOnlyFks': len(sql_only), 'ddlColumnActions': dict(counts)}, ensure_ascii=False))
else:
    output = folder / 'delivery28.json'
    assert not output.exists(), 'Preserve the previous sealed delivery'
    static = json.loads((folder / 'static-checks28-04.json').read_text('utf-8'))
    assert static['diagnosticCount'] == 0 and not static['staticMismatches']
    assert static['candidateManifestRawSha256'] == rawsha(manifest_path)
    artifacts = [pin(p) for p in sorted(folder.rglob('*')) if p.is_file() and p != output and '__pycache__' not in p.parts]
    report = {
        'kind': 'R4DEF-Native-ORM-review-candidate28', 'capturedAt': datetime.now(timezone.utc).isoformat(),
        'candidateOnly': True, 'rootActualFilesWritten': False, 'credentialsRead': False, 'environmentChanged': False,
        'inputs': manifest['inputs'], 'candidateManifest': pin(manifest_path),
        'candidateFiles': manifest['files'], 'artifacts': artifacts,
        'counts': {'newTables': 7, 'alteredTables': 19, 'fullFiles': 20, 'ddlColumnActions': 83, 'catalogColumnsPresenceChecked': 515, 'newOrChangedFieldMappings': 168, 'constraintMappings': 150, 'changedIndexPredicates': 19, 'finiteSqlOwnedCompositeFks': 28},
        'staticResult': {'typescriptNoEmit': 'passed-zero-diagnostics', 'ddlCatalogMatrix': 'passed-zero-static-mismatches', 'receipt': pin(folder / 'static-checks28-04.json'), 'RootInputAndFrozenF25Unchanged': True},
        'frozenF25DeliveryRawSha256': rawsha(folder.parent / 'delivery25.json'),
        'migrationCheck': 'not-run-must-not-be-reported-Pass',
        'rootRequired': ['precondition-hash readback before import', 'Native lint', 'Native full build', 'actual migration-check and exact diff classification', 'new entity runtime registration review', 'independent review'],
        'committed': False, 'pushed': False, 'GitHubWritten': False,
    }
    write('delivery28.json', json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'delivery': str(output), 'rawBytesSha256': rawsha(output), 'artifactPins': len(artifacts)}, ensure_ascii=False))
