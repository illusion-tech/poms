"""Pure comparison of captured metadata; no DB or process/service mutation."""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[5]
HERE = pathlib.Path(__file__).resolve().parent
catalog = json.loads((ROOT / 'tools/rust-r4ghi/H/implementation/support-patches/orm-g2/sql-target-catalog.json').read_bytes())
snapshot = json.loads((HERE / 'snapshot-before-manifest-original.json.bin').read_bytes())
target = json.loads((HERE / 'offline-metadata18.json').read_bytes())
tables = {x['name']: x for x in target['targetSchema']['tables']}


def sql_type(value):
    value = value.lower().replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamptz').replace('timestamp without time zone', 'timestamp').replace('boolean', 'bool')
    value = re.sub(r'\s+', '', value)
    return {'int': 'integer', 'int4': 'integer', 'int2': 'smallint', 'int8': 'bigint'}.get(value, value)


def default(value):
    if value is None:
        return None
    return re.sub(r'::(?:character varying|varchar|text|numeric|smallint|integer|bigint|boolean)(?:\([^)]*\))?', '', value).strip()


results = {}
for database, observed in snapshot['databases'].items():
    meta = {key: [json.loads(x) if isinstance(x, str) else x for x in values] for key, values in observed['meta']['normative'].items()}
    columns = {(x['table_name'], x['attname']): x for x in meta['columns']}
    constraints = {(x['table_name'], x['conname']): x for x in meta['constraints']}
    mismatches = []
    checked_columns = checked_fks = new_checks = 0
    for table in catalog['tables'].values():
        for name, expected in table['columns'].items():
            actual = columns.get((table['name'], name))
            checked_columns += 1
            differences = []
            if actual is None:
                differences.append('missing')
            else:
                if expected.get('sqlType') and sql_type(actual['type']) != sql_type(expected['sqlType']):
                    differences.append('type')
                if 'nullable' in expected and actual['attnotnull'] == expected['nullable']:
                    differences.append('nullability')
                # Catalog ALTER TYPE entries without defaultSql do not prescribe a new default.
                if 'defaultSql' in expected and default(actual['default_expr']) != default(expected['defaultSql']):
                    differences.append('default')
            if differences:
                mismatches.append({'table': table['name'], 'column': name, 'differences': differences, 'expected': expected, 'actual': actual})
        for expected in table['foreignKeys']:
            checked_fks += 1
            actual = constraints.get((table['name'], expected['name']))
            differences = []
            if actual is None:
                differences.append('missing FK')
            else:
                definition = actual['definition']
                parsed = re.match(r'FOREIGN KEY \((.*?)\) REFERENCES (?:(\w+)\.)?(\w+)\((.*?)\)', definition)
                if not parsed:
                    differences.append('unparsed FK')
                else:
                    if [x.strip(' "') for x in parsed[1].split(',')] != expected['columns']:
                        differences.append('child column sequence')
                    if [x.strip(' "') for x in parsed[4].split(',')] != expected['targetColumns']:
                        differences.append('parent column sequence')
                    if parsed[3] != expected['targetTable']:
                        differences.append('parent table')
                    for operation, key in [('DELETE', 'deleteRule'), ('UPDATE', 'updateRule')]:
                        rule = re.search(r'ON ' + operation + r' (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)', definition)
                        if (rule[1].lower() if rule else 'no action') != expected[key]:
                            differences.append(key)
                    if ('DEFERRABLE INITIALLY DEFERRED' in definition) != expected['deferred']:
                        differences.append('deferred')
            if differences:
                mismatches.append({'table': table['name'], 'FK': expected['name'], 'differences': differences, 'expected': expected, 'actual': actual})
        if table['new']:
            for check in tables[table['name']]['checks']:
                new_checks += 1
                if (table['name'], check['name']) not in constraints:
                    mismatches.append({'table': table['name'], 'missingCheckName': check['name']})
    purpose_fields = {}
    for name in ['project_scope_context_version', 'completion_record_id', 'completion_condition_id']:
        actual = columns[('attachment_upload_session', name)]
        declared = tables['attachment_upload_session']['columns'][name]
        assert sql_type(actual['type']) == sql_type(declared['type'])
        assert actual['attnotnull'] != declared['nullable']
        assert default(actual['default_expr']) == default(declared['default'])
        purpose_fields[name] = actual
    purpose_fk = constraints[('attachment_upload_session', 'fk_jghi_upload_condition_scope')]
    assert purpose_fk['definition'] == 'FOREIGN KEY (completion_condition_id, completion_record_id, target_id) REFERENCES poms.project_completion_condition(id, completion_record_id, project_id) ON DELETE RESTRICT'
    results[database] = {'checkedColumns': checked_columns, 'checkedForeignKeys': checked_fks, 'checkedNewTableCheckNames': new_checks, 'mismatches': mismatches, 'purposeFields': purpose_fields, 'purposeFK': purpose_fk}

output = {'kind': 'pure-exact-catalog-comparison-against-captured-actual-PG15-catalog', 'catalogSHA256': hashlib.sha256((ROOT / 'tools/rust-r4ghi/H/implementation/support-patches/orm-g2/sql-target-catalog.json').read_bytes()).hexdigest(), 'results': results, 'checkExpressionEquivalenceClaimed': False, 'G3Certified': False}
(HERE / 'catalog-all-targets-check18.json').write_bytes((json.dumps(output, ensure_ascii=False, indent=2) + '\n').encode())
print(json.dumps({db: {key: value for key, value in result.items() if key not in ['purposeFields', 'purposeFK']} for db, result in results.items()}, ensure_ascii=False))
