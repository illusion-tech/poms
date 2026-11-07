"""Fail-closed parser for the 30 observed CHECK pairs, not a general SQL rewriter.

Pure evidence comparison only. Supports immutable observed function calls, explicit
primitive casts, ordinary IN/ANY and NOT IN/ALL, BETWEEN and boolean expressions.
No output is consumed by product/schema generation, and no SQL is executed.
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
TOKEN = re.compile(r"\s+|'(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|::|<>|>=|<=|[=~><(),\[\]]|\d+|[A-Za-z_][A-Za-z_0-9]*")


def boolean(op, *values):
    flattened = []
    for value in values:
        if isinstance(value, list) and value and value[0] == op:
            flattened.extend(value[1:])
        else:
            flattened.append(value)
    return [op, *flattened]


class Parser:
    def __init__(self, text, column_types):
        self.tokens = []
        position = 0
        while position < len(text):
            match = TOKEN.match(text, position)
            if not match:
                raise ValueError('Unsupported CHECK token: ' + text[position:position + 50])
            token = match[0]
            if not token.isspace():
                self.tokens.append(token)
            position = match.end()
        self.position = 0
        self.casts = []
        self.column_types = column_types

    def peek(self):
        return self.tokens[self.position].lower() if self.position < len(self.tokens) else None

    def take(self, token=None):
        if self.position >= len(self.tokens):
            raise ValueError('Unexpected end of CHECK')
        result = self.tokens[self.position]
        if token is not None and result.lower() != token:
            raise ValueError(f'Expected {token}, got {result}')
        self.position += 1
        return result

    def expression(self):
        value = self.conjunction()
        while self.peek() == 'or':
            self.take('or')
            value = boolean('or', value, self.conjunction())
        return value

    def conjunction(self):
        value = self.predicate()
        while self.peek() == 'and':
            self.take('and')
            value = boolean('and', value, self.predicate())
        return value

    def predicate(self):
        left = self.value()
        token = self.peek()
        if token in ['=', '<>', '>', '<', '>=', '<=', '~']:
            operator = self.take()
            right = self.value()
            if right[:1] == ['call'] and right[1] in ['any', 'all']:
                assert len(right[2]) == 1 and right[2][0][:1] == ['array']
                if operator == '=' and right[1] == 'any':
                    return ['in', left, right[2][0][1]]
                if operator == '<>' and right[1] == 'all':
                    return ['notin', left, right[2][0][1]]
                raise ValueError('Unsupported quantified comparison')
            return ['compare', operator, left, right]
        if token == 'is':
            self.take('is')
            negate = self.peek() == 'not'
            if negate:
                self.take('not')
            self.take('null')
            return ['isnotnull' if negate else 'isnull', left]
        if token == 'between':
            self.take('between')
            lower = self.value()
            self.take('and')
            upper = self.value()
            return boolean('and', ['compare', '>=', left, lower], ['compare', '<=', left, upper])
        if token in ['in', 'not']:
            negate = token == 'not'
            if negate:
                self.take('not')
            self.take('in')
            self.take('(')
            values = [self.value()]
            while self.peek() == ',':
                self.take(',')
                values.append(self.value())
            self.take(')')
            return ['notin' if negate else 'in', left, values]
        return left

    def value(self):
        token = self.take()
        if token == '(':
            value = self.expression()
            self.take(')')
        elif token.startswith("'"):
            value = ['string', token[1:-1].replace("''", "'")]
        elif token.isdigit():
            value = ['number', str(int(token))]
        elif token.lower() == 'array':
            self.take('[')
            values = [self.value()]
            while self.peek() == ',':
                self.take(',')
                values.append(self.value())
            self.take(']')
            value = ['array', values]
        else:
            name = token[1:-1].replace('""', '"') if token.startswith('"') else token.lower()
            if self.peek() == '(':
                if name not in ['length', 'btrim', 'jsonb_typeof', 'any', 'all']:
                    raise ValueError('Unsupported function ' + name)
                self.take('(')
                args = [self.expression()]
                while self.peek() == ',':
                    self.take(',')
                    args.append(self.expression())
                self.take(')')
                value = ['call', name, args]
            else:
                value = ['column', name]
        while self.peek() == '::':
            self.take('::')
            cast = self.take().lower()
            if cast == 'character':
                self.take('varying')
                cast = 'varchar'
            if self.peek() == '[':
                self.take('[')
                self.take(']')
                cast += '[]'
            if cast not in ['text', 'varchar', 'text[]', 'numeric']:
                raise ValueError('Unsupported primitive cast ' + cast)
            if cast == 'numeric' and value[:1] != ['number']:
                raise ValueError('Only exact numeric literals may elide numeric casts')
            if cast in ['text', 'varchar']:
                if value[:1] == ['column']:
                    physical_type = self.column_types.get(value[1], '')
                    if physical_type != 'text' and not physical_type.startswith('character varying'):
                        raise ValueError('Non-text physical column cast ' + str(value))
                elif value[:1] != ['string']:
                    raise ValueError('Unsupported scalar text cast ' + str(value))
            if cast == 'text[]' and (value[:1] != ['array'] or any(item[:1] != ['string'] for item in value[1])):
                raise ValueError('Only exact string literal arrays may elide text-array casts')
            self.casts.append(cast)
        return value

    def parse(self):
        if self.peek() == 'check':
            self.take('check')
        result = self.expression()
        if self.position != len(self.tokens):
            raise ValueError('Unconsumed CHECK tokens ' + str(self.tokens[self.position:]))
        return result


results = []
snapshot = json.loads((HERE / 'snapshot-before-manifest-original.json.bin').read_bytes())
columns = [json.loads(x) for x in snapshot['databases']['poms_r4ghi_native']['meta']['normative']['columns']]
types = {}
for column in columns:
    types.setdefault(column['table_name'], {})[column['attname']] = column['type']
for pair in json.loads((HERE / 'owner-all-check-pairs19.json').read_bytes()):
    source = Parser(pair['target'], types[pair['table']])
    physical = Parser(pair['actual']['definition'], types[pair['table']])
    expected = source.parse()
    observed = physical.parse()
    if expected != observed:
        raise ValueError('CHECK AST mismatch: ' + pair['name'] + '\n' + json.dumps([expected, observed]))
    results.append({'table': pair['table'], 'name': pair['name'], 'normalizedASTExact': True, 'primitiveCasts': sorted(set(source.casts + physical.casts)), 'AST': expected})
assert len(results) == 30
for left, right in [
    ("x=1 OR y=1 AND z=1", "(x=1 OR y=1) AND z=1"),
    ("weight_units BETWEEN 0 AND 1000000", "weight_units BETWEEN 0 AND 1000001"),
    ("current_stage IN ('completed','conditional-completed')", "current_stage IN ('completed')")
]:
    assert Parser(left, {}).parse() != Parser(right, {}).parse()
try:
    Parser("some_uuid::text='x'", {'some_uuid': 'uuid'}).parse()
except ValueError:
    pass
else:
    raise AssertionError('Unsupported non-text column cast was accepted')
report = {'kind': 'pure-restricted-AST-comparison-of-30-actual-owner-CHECK-rewrites', 'count': 30, 'allExact': True, 'rules': ['SQL AND/OR precedence and grouping retained; associative chains flattened only', 'Observed BETWEEN expands to inclusive >= AND <=; observed calls are immutable length/btrim', 'IN and =ANY of the exact same literal array, NOT IN and <>ALL of the exact same literal array retain SQL null semantics', 'Only observed primitive text/varchar/text-array casts and exact integer numeric literal casts elided; actual physical column types checked; no expression or literal dropped'], 'negativeExamples': {'precedenceChangeDetected': True, 'rangeBoundaryChangeDetected': True, 'conditionalCompletedValueRemovalDetected': True, 'unsupportedUUIDToTextCastRejected': True}, 'results': results, 'SQLExecuted': False, 'generalSQLNormalizerOrProductTool': False, 'G3Certified': False, 'G4Certified': False}
(HERE / 'owner-check-ast-proof19.json').write_bytes((json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode())
print(json.dumps({'count': len(results), 'allRestrictedASTsEqual': True, 'SQLExecuted': False}))
