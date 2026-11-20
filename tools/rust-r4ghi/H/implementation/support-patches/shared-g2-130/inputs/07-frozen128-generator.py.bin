"""Prepare reviewable Root-only TS/Zod and Native-reference artifacts.

This tool writes ONLY inside this support-patches directory. It does not edit
shared/contracts, controllers, DTOs, Git, or the frozen source files.
"""
from __future__ import annotations
import hashlib
import json
import pathlib
import re
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
FROZEN = ROOT / 'tools/rust-r4ghi/joint-g1/effective-v2'
BASE = '9e010077e3010ff09447e9d77cb1bf1f7adbf68d'
SHARED = 'libs/shared/contracts/src/lib/shared-contracts.ts'


def js(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def refs(schema: object) -> set[str]:
    found: set[str] = set()
    if isinstance(schema, dict):
        if '$ref' in schema:
            prefix = '#/components/schemas/'
            ref = schema['$ref']
            if not isinstance(ref, str) or not ref.startswith(prefix):
                raise ValueError(f'Unregistered external reference: {ref}')
            found.add(ref[len(prefix):])
        for child in schema.values():
            found.update(refs(child))
    elif isinstance(schema, list):
        for child in schema:
            found.update(refs(child))
    return found


def emit(schema: dict) -> str:
    if '$ref' in schema:
        return schema['$ref'].rsplit('/', 1)[-1] + 'Schema'
    if 'const' in schema:
        return 'z.null()' if schema['const'] is None else f'z.literal({js(schema["const"])})'
    if 'enum' in schema:
        values = schema['enum']
        if all(isinstance(value, str) for value in values):
            return f'z.enum({js(values)})'
        return 'z.union([' + ','.join(emit({'const': value}) for value in values) + '])'
    for union in ('oneOf', 'anyOf'):
        if union in schema:
            return 'z.union([' + ','.join(emit(child) for child in schema[union]) + '])'
    kind = schema.get('type')
    if kind is None and 'allOf' in schema:
        children = schema['allOf']
        expression = emit(children[0])
        for child in children[1:]:
            expression += f'.and({emit(child)})'
        return expression
    if kind == 'null':
        return 'z.null()'
    if kind == 'string':
        expression = 'z.string()'
        if schema.get('x-trim'):
            expression += '.trim()'
        for key, method in (('minLength', 'min'), ('maxLength', 'max')):
            if key in schema:
                expression += f'.{method}({schema[key]})'
        if schema.get('format') == 'uuid':
            expression += '.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)'
        elif schema.get('format') == 'date':
            expression += '.date()'
        elif schema.get('format') == 'date-time':
            expression += '.datetime({offset:true})'
        elif schema.get('format') not in (None,):
            raise ValueError(f'Unhandled string format: {schema["format"]}')
        if 'pattern' in schema:
            expression += f'.regex(new RegExp({js(schema["pattern"])}))'
        return expression
    if kind in ('integer', 'number'):
        expression = 'z.number()' + ('.int()' if kind == 'integer' else '')
        for key, method in (('minimum', 'min'), ('maximum', 'max'), ('multipleOf', 'multipleOf')):
            if key in schema:
                expression += f'.{method}({js(schema[key])})'
        return expression
    if kind == 'boolean':
        return 'z.boolean()'
    if kind == 'array':
        expression = f'z.array({emit(schema["items"])})'
        for key, method in (('minItems', 'min'), ('maxItems', 'max')):
            if key in schema:
                expression += f'.{method}({schema[key]})'
        return expression
    if kind == 'object' or 'properties' in schema:
        required = set(schema.get('required', []))
        properties = []
        for name, child in schema.get('properties', {}).items():
            expression = emit(child)
            if name not in required:
                expression += '.optional()'
            properties.append(f'{js(name)}:{expression}')
        expression = 'z.object({' + ','.join(properties) + '})'
        extra = schema.get('additionalProperties', True)
        if extra is False:
            expression += '.strict()'
        elif isinstance(extra, dict):
            expression += f'.catchall({emit(extra)})'
        else:
            expression += '.passthrough()'
        return expression
    raise ValueError(f'Unhandled schema shape: {schema}')


# Conditions, not, and exact-oneOf remain strict schema assertions after Zod's
# inferred structural parser. This interpreter accepts unknown and narrows it;
# it never uses any, a cast, or a permissive fallback on a schema construct.
VALIDATOR = r'''
type FrozenSchema = { readonly [key: string]: unknown };
function object(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function record(value: unknown): FrozenSchema { if (!object(value)) throw new Error('Invalid frozen schema'); return value; }
function branch(value: unknown): FrozenSchema[] { if (!Array.isArray(value)) throw new Error('Invalid frozen branches'); return value.map(record); }
function conforms(schema: FrozenSchema, value: unknown): boolean {
    const ref = schema['$ref'];
    if (typeof ref === 'string') {
        const key = ref.replace('#/components/schemas/', '');
        return conforms(record(frozenSchemas[key]), value);
    }
    if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema['const'])) return false;
    if (Array.isArray(schema['enum']) && !schema['enum'].some((candidate) => JSON.stringify(candidate) === JSON.stringify(value))) return false;
    if (schema['allOf'] && !branch(schema['allOf']).every((child) => conforms(child, value))) return false;
    if (schema['anyOf'] && !branch(schema['anyOf']).some((child) => conforms(child, value))) return false;
    if (schema['oneOf'] && branch(schema['oneOf']).filter((child) => conforms(child, value)).length !== 1) return false;
    if (schema['not'] && conforms(record(schema['not']), value)) return false;
    if (schema['if']) {
        const selected = conforms(record(schema['if']), value) ? schema['then'] : schema['else'];
        if (selected && !conforms(record(selected), value)) return false;
    }
    const type = schema['type'];
    if (type === 'null' && value !== null) return false;
    if (type === 'object' && !object(value)) return false;
    if (type === 'array' && !Array.isArray(value)) return false;
    if (type === 'string' && typeof value !== 'string') return false;
    if (type === 'boolean' && typeof value !== 'boolean') return false;
    if ((type === 'number' || type === 'integer') && (typeof value !== 'number' || !Number.isFinite(value) || (type === 'integer' && !Number.isInteger(value)))) return false;
    if (object(value)) {
        const properties = schema['properties'] ? record(schema['properties']) : {};
        if (Array.isArray(schema['required']) && schema['required'].some((key) => typeof key !== 'string' || !(key in value))) return false;
        for (const [key, child] of Object.entries(properties)) if (key in value && !conforms(record(child), value[key])) return false;
        if (schema['additionalProperties'] === false && Object.keys(value).some((key) => !(key in properties))) return false;
    }
    if (Array.isArray(value)) {
        if (typeof schema['minItems'] === 'number' && value.length < schema['minItems']) return false;
        if (typeof schema['maxItems'] === 'number' && value.length > schema['maxItems']) return false;
        if (schema['items'] && value.some((child) => !conforms(record(schema['items']), child))) return false;
    }
    if (typeof value === 'string') {
        if (typeof schema['minLength'] === 'number' && [...value].length < schema['minLength']) return false;
        if (typeof schema['maxLength'] === 'number' && [...value].length > schema['maxLength']) return false;
        if (typeof schema['pattern'] === 'string' && !new RegExp(schema['pattern']).test(value)) return false;
    }
    if (typeof value === 'number') {
        if (typeof schema['minimum'] === 'number' && value < schema['minimum']) return false;
        if (typeof schema['maximum'] === 'number' && value > schema['maximum']) return false;
    }
    return true;
}
function validateFrozen(name: string, value: unknown, context: z.RefinementCtx): void {
    if (!conforms(record(frozenSchemas[name]), value)) context.addIssue({ code: 'custom', message: `Frozen ${name} conditional/union assertion failed` });
}
'''


def main() -> None:
    contract_bytes = (FROZEN / 'public-contracts.schema.json').read_bytes()
    contracts = json.loads(contract_bytes)['components']['schemas']
    if len(contracts) != 128:
        raise ValueError('Expected exactly the frozen 128 public schemas')
    pending = set(contracts)
    ordered: list[str] = []
    while pending:
        ready = sorted(name for name in pending if refs(contracts[name]) <= set(ordered))
        if not ready:
            raise ValueError(f'Unresolved/cyclic schema dependencies: {sorted(pending)}')
        ordered.extend(ready)
        pending.difference_update(ready)
    lines = ['// Root application candidate; generated from the exact effective-v2 128-schema source.', 'import { z } from "zod";', f'const frozenSchemas: Readonly<Record<string, unknown>> = {js(contracts)};', VALIDATOR]
    for name in ordered:
        lines.append(f'export const {name}Schema = {emit(contracts[name])}.superRefine((value, context) => validateFrozen({js(name)}, value, context)).meta({{id:{js(name)}}});')
        lines.append(f'export type {name} = z.infer<typeof {name}Schema>;')
    generated = ('\n'.join(lines) + '\n').encode()
    (HERE / 'rust-r4ghi-contracts.generated.ts').write_bytes(generated)
    legacy = subprocess.run(['git', 'show', f'{BASE}:{SHARED}'], cwd=ROOT, check=True, stdout=subprocess.PIPE).stdout
    (HERE / 'candidate9e-shared-contracts.ts').write_bytes(legacy)
    modern_names = set(contracts) | {name + 'Schema' for name in contracts}
    sites = []
    for path in sorted((ROOT / 'apps/poms-api/src/app/features').rglob('*.ts')):
        if path.name.endswith('.spec.ts') or not re.search(r'(service|controller|query|write-chain)\.ts$', path.name):
            continue
        source = path.read_text(encoding='utf-8')
        imported = []
        for match in re.finditer(r'import\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+[\'"]@poms/shared-contracts[\'"]', source):
            imported.extend(sorted(set(re.findall(r'\b[A-Za-z][A-Za-z0-9_]*\b', match.group(1))) & modern_names))
        if imported:
            sites.append({'path':path.relative_to(ROOT).as_posix(),'legacyImports':sorted(set(imported)),'instruction':'Root rewrites this existing Native reference import to the frozen legacy alias; do not change entity/schema authority or client exports.'})
    artifact = {'status':'Root-review-candidate-not-applied','base':BASE,'schemaCount':len(contracts),'schemaRawSHA256':hashlib.sha256(contract_bytes).hexdigest(),'legacySourcePath':SHARED,'legacyRawSHA256':hashlib.sha256(legacy).hexdigest(),'generatedSHA256':hashlib.sha256(generated).hexdigest(),'topologicalOrder':ordered,'nativeSites':sites,'notValidated':['Root canonical shared integration','Native/admin/shared lint/build/tests','128-schema OpenAPI round trip','Native modern422/auth/legacy201 and Rust200 actual HTTP']}
    (HERE / 'shared-native-candidate.json').write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'schemas':len(contracts),'nativeSites':len(sites),'generatedBytes':len(generated),'legacyBytes':len(legacy),'status':artifact['status']}))


if __name__ == '__main__':
    main()
