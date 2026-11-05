import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
OUT = pathlib.Path(__file__).resolve().parent
SQL_PATH = ROOT / 'docs/design/rust-r4def/joint-g1-06/schema06.sql'
CAT_PATH = ROOT / 'tmp/rust-r4def/root/catalog25/native-catalog.json'


def split_top(text):
    parts, start, depth, quoted, i = [], 0, 0, False, 0
    while i < len(text):
        char = text[i]
        if char == "'":
            if quoted and i + 1 < len(text) and text[i + 1] == "'":
                i += 2
                continue
            quoted = not quoted
        if not quoted:
            depth += (char == '(') - (char == ')')
            if char == ',' and depth == 0:
                parts.append(text[start:i].strip())
                start = i + 1
        i += 1
    parts.append(text[start:].strip())
    return parts


def inventory():
    sql = re.sub(r'--[^\n]*', '', SQL_PATH.read_text('utf-8-sig'))
    catalog = json.loads(CAT_PATH.read_text('utf-8-sig'))
    created = {}
    for match in re.finditer(r'CREATE TABLE poms\.(\w+)\s*\((.*?)\);', sql, re.S):
        created[match[1]] = split_top(match[2])
    alterations = {}
    for match in re.finditer(r'ALTER TABLE poms\.(\w+)\s+(.*?);', sql, re.S):
        alterations.setdefault(match[1], []).extend(split_top(match[2]))
    tables = sorted(set(created) | set(alterations))
    column_changes = []
    for table, actions in alterations.items():
        for action in actions:
            match = re.match(r'ADD COLUMN (\w+)\s+(.*)', action, re.S)
            if match:
                column_changes.append({'table': table, 'column': match[1], 'action': 'ADD COLUMN', 'sql': action})
            match = re.match(r'ALTER COLUMN (\w+)\s+(.*)', action, re.S)
            if match:
                column_changes.append({'table': table, 'column': match[1], 'action': 'ALTER COLUMN', 'sql': action})
    indexes = []
    for match in re.finditer(r'CREATE (UNIQUE )?INDEX (\w+)\s+ON poms\.(\w+)\((.*?)\)(?:\s+WHERE (.*?))?;', sql, re.S):
        indexes.append({'name': match[2], 'table': match[3], 'unique': bool(match[1]), 'columns': [c.strip() for c in match[4].split(',')], 'where': match[5]})
    named_constraints = []
    for table, actions in alterations.items():
        for action in actions:
            match = re.match(r'ADD CONSTRAINT (\w+)\s+', action)
            if match:
                named_constraints.append((table, match[1]))
    result = {
        'inputs': [{'file': str(p), 'rawBytesSha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size} for p in [SQL_PATH, CAT_PATH]],
        'newTables': created, 'alterations': alterations, 'columnChanges': column_changes, 'newIndexes': indexes,
        'namedAlterConstraints': [{'table': t, 'name': n} for t, n in named_constraints],
        'catalog': {k: [r for r in catalog[k] if r.get('table_name', r.get('tablename')) in tables] for k in ['columns', 'constraints', 'indexes']},
    }
    return result


if __name__ == '__main__':
    data = inventory()
    (OUT / 'inventory28.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'newTables': list(data['newTables']), 'alteredTables': list(data['alterations']), 'columnChanges': len(data['columnChanges']), 'indexes': len(data['newIndexes']), 'catalogIndexSample': data['catalog']['indexes'][:1]}, ensure_ascii=False))
