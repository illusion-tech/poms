"""Parse captured dump into statements without executing SQL."""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
text = (HERE / 'owner-dump05-command-original.bin').read_text(encoding='utf8')
text = re.sub(r'\x1b\[[0-9;]*m', '', text)
text = '\n'.join(x for x in text.splitlines() if not x.startswith('◇ '))
statements = []
quote = None
start = 0
i = 0
while i < len(text):
    ch = text[i]
    if quote:
        if ch == quote:
            if i + 1 < len(text) and text[i + 1] == quote:
                i += 2
                continue
            quote = None
    elif ch in ["'", '"']:
        quote = ch
    elif ch == ';':
        sql = text[start:i + 1].strip()
        if sql:
            statements.append(sql)
        start = i + 1
    i += 1
assert not quote
snapshot = json.loads((HERE / 'snapshot-before-manifest-original.json.bin').read_bytes())
constraints = {(x['table_name'], x['conname']): x for x in [json.loads(x) for x in snapshot['databases']['poms_r4ghi_native']['meta']['normative']['constraints']]}
pairs = []
for sql in statements:
    match = re.match(r'alter table "poms"\."([^"]+)" add constraint "([^"]+)" check \((.*)\);$', sql, re.I | re.S)
    if match:
        table, name, expression = match.groups()
        pairs.append({'table': table, 'name': name, 'target': expression, 'actual': constraints[(table, name)]})
assert len(pairs) == 30
(HERE / 'owner-all-check-pairs19.json').write_bytes((json.dumps(pairs, ensure_ascii=False, indent=2) + '\n').encode())
(HERE / 'owner-statements19.json').write_bytes((json.dumps(statements, ensure_ascii=False, indent=2) + '\n').encode())
print(json.dumps({'statementCount': len(statements), 'checkPairs': len(pairs)}))
