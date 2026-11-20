"""SQL-first ORM proposal; writes only this candidate directory, never a DB."""
from __future__ import annotations
import hashlib
import json
import os
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[5]
ROOT_INPUTS = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
FROZEN = ROOT / 'tools/rust-r4ghi/joint-g1/effective-v2'


def j(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def split_sql(text: str, delimiter: str) -> list[str]:
    result: list[str] = []
    start = depth = index = 0
    quote = False
    dollar = None
    comment = False
    while index < len(text):
        if comment:
            if text[index] == '\n': comment = False
            index += 1
            continue
        if dollar:
            if text.startswith(dollar, index): index += len(dollar); dollar = None
            else: index += 1
            continue
        char = text[index]
        if char == "'":
            if quote and index + 1 < len(text) and text[index + 1] == "'": index += 2; continue
            quote = not quote
        if not quote:
            if text.startswith('--', index): comment = True; index += 2; continue
            if char == '$':
                matched = re.match(r'\$[A-Za-z_0-9]*\$', text[index:])
                if matched: dollar = matched[0]; index += len(dollar); continue
            if char == '(': depth += 1
            elif char == ')': depth -= 1
            elif char == delimiter and depth == 0:
                result.append(text[start:index]); start = index + 1
        index += 1
    if text[start:].strip(): result.append(text[start:])
    return result


def clean(text: str) -> str:
    # Source SQL comments contain no quoted '--'; statements are selected after
    # the dollar-aware tokenizer, so function internals never become DDL input.
    return re.sub(r'--[^\n]*', '', text).strip()


def parentheses(text: str, offset: int) -> tuple[str, int]:
    depth = 1; quote = False; index = offset + 1
    start = index
    while depth:
        if text[index] == "'":
            if quote and text[index:index+2] == "''": index += 2; continue
            quote = not quote
        if not quote:
            if text[index] == '(': depth += 1
            elif text[index] == ')': depth -= 1
        index += 1
    return text[start:index-1], index


def names(text: str) -> list[str]:
    return [part.strip().strip('"') for part in text.split(',')]


def camel(name: str) -> str:
    first, *rest = name.split('_')
    return first + ''.join(part.title() for part in rest)


def pascal(name: str) -> str:
    return ''.join(part.title() for part in name.split('_'))


ENTITY_NAMES = {
    'operating_signal_gate_binding': 'OperatingSignalToCommissionGateBinding',
    'cost_stage_attribution_snapshot': 'CostStageAttributionSnapshot',
}
ENTITY_FILES: dict[str,pathlib.Path] = {}


def entity_name(table: str) -> str:
    return ENTITY_NAMES.get(table, pascal(table))


def pg_name(name1: str, name2: str | None, label: str) -> str:
    # PostgreSQL15 makeObjectName: reduce the longer name, retaining its label.
    # Only ASCII SQL identifiers occur in this frozen input.
    overhead = len(label) + 1 + (1 if name2 is not None else 0)
    one, two = len(name1), len(name2 or '')
    while one + two > 63 - overhead:
        if one > two: one -= 1
        else: two -= 1
    return name1[:one] + ('_' + (name2 or '')[:two] if name2 is not None else '') + '_' + label


class Catalog:
    def __init__(self) -> None:
        self.tables: dict[str, dict] = {}
        self.alters: dict[str, list[dict]] = {}
        self.used_names: set[str] = set()

    def table(self, name: str) -> dict:
        return self.tables.setdefault(name, {'name':name, 'new':False, 'columns':{}, 'primaryKey':[], 'foreignKeys':[], 'uniques':[], 'checks':[], 'indexes':[], 'dropConstraints':[]})

    def generated_name(self, table: str, columns: list[str] | None, label: str) -> str:
        addition = '_'.join(columns) if columns else None
        candidate = pg_name(table, addition, label)
        suffix = 0
        while candidate in self.used_names:
            suffix += 1; candidate = pg_name(table, addition, label + str(suffix))
        self.used_names.add(candidate)
        return candidate

    def constraints(self, table: str, text: str, inline_column: str | None = None) -> None:
        t = self.table(table)
        constraint = re.match(r'CONSTRAINT\s+(\w+)\s+', text, re.I)
        explicit_name = constraint[1] if constraint else None
        body = text[constraint.end():] if constraint else text
        for check in re.finditer(r'\bCHECK\s*\(', body, re.I):
            expression, _ = parentheses(body, body.index('(', check.start()))
            # PG15 derives a column check name only when exactly one Var exists.
            without_literals = re.sub(r"'(?:''|[^'])*'", '', expression)
            columns = [col for col in t['columns'] if re.search(r'(?<![\w])' + re.escape(col) + r'(?![\w])', without_literals)]
            name = explicit_name or self.generated_name(table, columns if len(columns) == 1 else None, 'check')
            self.used_names.add(name)
            t['checks'].append({'name':name, 'expression':expression.strip(), 'nameSource':'explicit' if explicit_name else 'PG15-derived-unverified-against-live-catalog'})
        primary = re.search(r'\bPRIMARY\s+KEY\s*(\([^)]*\))?', body, re.I)
        if primary:
            t['primaryKey'] = names(primary[1][1:-1]) if primary[1] else [inline_column]
        unique = re.search(r'\bUNIQUE\s*(\([^)]*\))?', body, re.I)
        if unique:
            cols = names(unique[1][1:-1]) if unique[1] else [inline_column]
            name = explicit_name or self.generated_name(table, cols, 'key')
            self.used_names.add(name); t['uniques'].append({'name':name, 'columns':cols})
        reference = re.search(r'\bREFERENCES\s+poms\.(\w+)\s*\(([^)]+)\)', body, re.I)
        if reference:
            foreign = re.search(r'\bFOREIGN\s+KEY\s*\(([^)]+)\)', body, re.I)
            cols = names(foreign[1]) if foreign else [inline_column]
            name = explicit_name or self.generated_name(table, cols, 'fkey')
            delete = re.search(r'\bON\s+DELETE\s+(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)', body, re.I)
            update = re.search(r'\bON\s+UPDATE\s+(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)', body, re.I)
            self.used_names.add(name)
            t['foreignKeys'].append({'name':name,'columns':cols,'targetTable':reference[1],'targetColumns':names(reference[2]),'deleteRule':delete[1].lower() if delete else 'no action','updateRule':update[1].lower() if update else 'no action','deferred':bool(re.search(r'DEFERRABLE\s+INITIALLY\s+DEFERRED',body,re.I)),'notValid':bool(re.search(r'NOT\s+VALID',body,re.I)),'rawSql':text.strip()})

    def column(self, table: str, definition: str) -> dict:
        match = re.match(r'(\w+)\s+(uuid|integer|smallint|bigint|boolean|date|timestamptz|text|jsonb|varchar\(\d+\)|numeric\(\d+,\s*\d+\))', definition, re.I)
        if not match: raise ValueError(f'Unhandled column: {table}: {definition}')
        name, typ = match[1], re.sub(r'\s+', '', match[2].lower())
        nullable = not bool(re.search(r'\bNOT\s+NULL|\bPRIMARY\s+KEY', definition, re.I))
        default = re.search(r'\bDEFAULT\s+(gen_random_uuid\(\)|now\(\)|true|false|-?\d+(?:\.\d+)?|\'(?:\'\'|[^\'])*\'(?:\:\:\w+)?)', definition, re.I)
        item = {'column':name,'property':camel(name),'sqlType':typ,'nullable':nullable,'defaultSql':default[1] if default else None,'rawSql':definition.strip()}
        self.table(table)['columns'][name] = item
        self.constraints(table, definition[match.end():], name)
        return item

    def consume(self, sql: str) -> None:
        statements = [clean(stmt) for stmt in split_sql(sql, ';')]
        # First pass collects all real columns so table CHECK Var counting is exact.
        for stmt in statements:
            create = re.match(r'CREATE\s+TABLE\s+poms\.(\w+)\s*\(',stmt,re.I)
            if not create: continue
            table = create[1]; t = self.table(table); t['new'] = True
            body, _ = parentheses(stmt, stmt.index('(', create.start()))
            parts = split_sql(body, ',')
            for part in parts:
                part = part.strip()
                if not re.match(r'^(CONSTRAINT|CHECK|UNIQUE|PRIMARY|FOREIGN)\b',part,re.I):
                    # Register the name now; full property and constraints follow below.
                    name = re.match(r'\w+',part)
                    if name: t['columns'].setdefault(name[0],{})
            for part in parts:
                part = part.strip()
                if re.match(r'^(CONSTRAINT|CHECK|UNIQUE|PRIMARY|FOREIGN)\b',part,re.I): self.constraints(table,part)
                else: self.column(table,part)
        for stmt in statements:
            alter = re.match(r'ALTER\s+TABLE\s+poms\.(\w+)\s+([\s\S]+)',stmt,re.I)
            if alter:
                table, body = alter[1], alter[2]
                actions = self.alters.setdefault(table,[])
                for part in split_sql(body, ','):
                    part = part.strip()
                    add = re.match(r'ADD\s+COLUMN\s+([\s\S]+)',part,re.I)
                    if add:
                        item = self.column(table,add[1]);actions.append({'kind':'add-column','column':item['column'],'rawSql':part});continue
                    if re.match(r'ADD\s+CONSTRAINT\b',part,re.I):
                        self.constraints(table,re.sub(r'^ADD\s+','',part,flags=re.I));actions.append({'kind':'add-constraint','rawSql':part});continue
                    change = re.match(r'ALTER\s+COLUMN\s+(\w+)\s+(.+)',part,re.I)
                    if change:
                        col = self.table(table)['columns'].setdefault(change[1],{'column':change[1],'property':camel(change[1])})
                        if re.fullmatch(r'DROP\s+NOT\s+NULL',change[2],re.I): col['nullable']=True
                        elif re.match(r'TYPE\s+',change[2],re.I): col['sqlType']=re.sub(r'^TYPE\s+','',change[2],flags=re.I).replace(' ','')
                        else: raise ValueError(f'Unhandled ALTER COLUMN: {part}')
                        actions.append({'kind':'alter-column','column':change[1],'rawSql':part});continue
                    drop = re.match(r'DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?(\w+)',part,re.I)
                    if drop:
                        self.table(table)['dropConstraints'].append(drop[1]);actions.append({'kind':'drop-constraint','name':drop[1],'rawSql':part});continue
                    raise ValueError(f'Unhandled ALTER: {part}')
            index = re.match(r'CREATE\s+(UNIQUE\s+)?INDEX\s+(\w+)\s+ON\s+poms\.(\w+)\s*\(',stmt,re.I)
            if index:
                self.table(index[3])['indexes'].append({'name':index[2],'unique':bool(index[1]),'expression':stmt})


def scalar(column: dict) -> str:
    typ = column['sqlType']
    if typ.startswith('numeric'):
        precision, scale = map(int,re.findall(r'\d+',typ)); value=f'p.decimal().precision({precision}).scale({scale})'
    elif typ.startswith('varchar'):
        length=re.search(r'\d+',typ)[0];value=f'p.string().length({length})'
    else:
        value={'uuid':'p.uuid()','integer':'p.integer()','smallint':'p.smallint()','bigint':'p.bigint()','boolean':'p.boolean()','date':'p.date()','timestamptz':"p.datetime().columnType('timestamptz')",'text':'p.text()','jsonb':"p.json<unknown>().columnType('jsonb')"}[typ]
    return value


def relation(fk: dict, table: dict, scoped: bool) -> str:
    expression=f'p.manyToOne({entity_name(fk["targetTable"])}).mapToPk()'
    expression += '.joinColumns(' + ','.join(j(col) for col in fk['columns']) + ')'
    expression += '.referencedColumnNames(' + ','.join(j(col) for col in fk['targetColumns']) + ')'
    if scoped:
        expression += '.columnTypes(' + ','.join(j(table['columns'].get(col,{}).get('sqlType','uuid')) for col in fk['columns']) + ').ownColumns().hydrate(false).hidden()'
    expression += f'.foreignKeyName({j(fk["name"])}).deleteRule({j(fk["deleteRule"])}).updateRule({j(fk["updateRule"])})'
    if fk['deferred']: expression += ".deferMode('deferred')"
    return expression


def property_expression(table: dict, col: dict) -> str:
    foreign = next((fk for fk in table['foreignKeys'] if fk['columns']==[col['column']]),None)
    expression = relation(foreign,table,False) if foreign else scalar(col)
    if col['column'] in table['primaryKey']: expression += '.primary()'
    if col.get('nullable'): expression += '.nullable()'
    default=col.get('defaultSql')
    if default is not None:
        if default in ('true','false') or re.fullmatch(r'-?\d+',default): expression+=f'.default({default})'
        else: expression+=f'.defaultRaw({j(default)})'
    if not foreign: expression += f'.fieldName({j(col["column"])})'
    return ('() => ' if foreign else '') + expression


def render_entity(table: dict) -> str:
    name=entity_name(table['name']); lines=[f'export const {name}Schema = defineEntity({{',f'  class: {name}, tableName: {j(table["name"])}, schema: "poms",']
    if table['checks']: lines.append('  checks: '+j([{'name':c['name'],'expression':c['expression']} for c in table['checks']])+',')
    unique_items=[{'name':u['name'],'properties':[camel(c) for c in u['columns']]} for u in table['uniques']]+[{'name':i['name'],'expression':i['expression']} for i in table['indexes'] if i['unique']]
    if unique_items: lines.append('  uniques: '+j(unique_items)+',')
    indexes=[{'name':i['name'],'expression':i['expression']} for i in table['indexes'] if not i['unique']]
    if indexes: lines.append('  indexes: '+j(indexes)+',')
    lines.append('  properties: {')
    for col in table['columns'].values(): lines.append(f'    {col["property"]}: {property_expression(table,col)},')
    for index,fk in enumerate(fk for fk in table['foreignKeys'] if len(fk['columns'])>1):
        nullable=any(table['columns'][col].get('nullable',False) for col in fk['columns'])
        expression=relation(fk,table,True)+('.nullable()' if nullable else '')
        lines.append(f'    scopeConstraint{index+1}: () => {expression},')
    lines += ['  }','});',f'{name}Schema.setClass({name});','']
    return '\n'.join(lines)


def main() -> None:
    source_paths=[FROZEN/'migration.sql',FROZEN/'orm-delta.json',ROOT_INPUTS/'docs/design/rust-r4ghi/g2-corrective01.sql']
    inputs=[]
    (HERE/'inputs').mkdir(exist_ok=True)
    for path in source_paths:
        data=path.read_bytes();(HERE/'inputs'/(path.name+'.bin')).write_bytes(data)
        inputs.append({'path':str(path),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    catalog=Catalog();catalog.consume(source_paths[0].read_text(encoding='utf-8'));catalog.consume(source_paths[2].read_text(encoding='utf-8'))
    new=[t for t in catalog.tables.values() if t['new']]
    if len(new)!=19: raise ValueError(f'Expected19 new tables, found{len(new)}')
    for path in (ROOT/'apps/poms-api/src/app/features').rglob('*.entity.ts'):
        source=path.read_text(encoding='utf-8')
        for match in re.finditer(r'(?:export\s+)?const\s+(\w+)Schema\s*=\s*defineEntity\s*\(\s*\{[\s\S]*?\btableName\s*:\s*[\'"]([\w]+)[\'"]',source):
            ENTITY_NAMES[match[2]]=match[1];ENTITY_FILES[match[2]]=path
    target_dir=ROOT/'apps/poms-api/src/app/features/project-cost'
    external=sorted({fk['targetTable'] for table in new for fk in table['foreignKeys']} - {table['name'] for table in new})
    output='// Root review candidate. SQL remains authoritative; no DB has been accessed.\nimport { defineEntity } from "@mikro-orm/core";\n'
    imports={}
    for table in external:
        path=ENTITY_FILES.get(table)
        if path is None:raise ValueError(f'Existing relation entity not located: {table}')
        relative=os.path.relpath(path,target_dir).replace('\\','/')[:-3]
        if not relative.startswith('.'):relative='./'+relative
        imports.setdefault(relative,[]).append(entity_name(table))
    for path,classes in imports.items():output+='import {'+','.join(sorted(set(classes)))+'} from '+j(path)+';\n'
    output+='const p = defineEntity.properties;\n\n'
    for table in new:
        output+=f'export class {entity_name(table["name"])} {{\n'
        for col in table['columns'].values():
            typ=col['sqlType'];ts_type='string' if typ.startswith(('varchar','numeric')) or typ in ['uuid','text','date'] else 'Date' if typ=='timestamptz' else 'unknown' if typ=='jsonb' else 'boolean' if typ=='boolean' else 'number'
            output+=f'  declare {col["property"]}: {ts_type}'+(' | null' if col.get('nullable') else '')+';\n'
        output+='}\n'
    output+='\n'
    output+='\n'.join(render_entity(t) for t in new)
    output+='export const RUST_R4_GHI_ENTITIES = ['+','.join(entity_name(t['name']) for t in new)+'];\n'
    (HERE/'rust-r4ghi-entities.entity.ts').write_text(output,encoding='utf-8')
    for table in catalog.tables.values():
        for column in table['columns'].values():
            if 'sqlType' in column: column['proposedBuilder']=property_expression(table,column)
        for fk in table['foreignKeys']:
            fk['proposedBuilder']=relation(fk,table,len(fk['columns'])>1)
    result={'status':'Root-ORM-candidate-not-applied-not-DB-validated','inputs':inputs,'newTableCount':len(new),'tables':catalog.tables,'alters':catalog.alters,'newEntityNames':[entity_name(t['name']) for t in new],'entityNames':ENTITY_NAMES,'entityFiles':{table:path.relative_to(ROOT).as_posix() for table,path in ENTITY_FILES.items()},'targetFile':'apps/poms-api/src/app/features/project-cost/rust-r4ghi-entities.entity.ts','unverified':['PG15 inferred names for originally unnamed SQL constraints must be read back by Root from its isolated migrated candidate','Native actual entity closure/discovery and production DDL drift comparison','Triggers/NOT VALID/immutability and ordinary source protections are SQL authority; entity presence never certifies them']}
    (HERE/'sql-target-catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(j({'newTables':len(new),'newColumns':sum(len(t['columns']) for t in new),'existingTablesAffected':len([t for t in catalog.tables.values() if not t['new']]),'status':result['status']}))


if __name__=='__main__': main()
