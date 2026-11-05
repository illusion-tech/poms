// Root-only field-level promotion from the independently frozen schema authority.
// Does not generate a client, run a service, or execute SQL.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const ts = createRequire(import.meta.url)('typescript');
const authority = JSON.parse(fs.readFileSync('docs/design/rust-r4def/g1-gate-authority07.json', 'utf8'));
assert(authority.G1Certified && authority.G2Authorized);
const inputFile = 'docs/design/rust-r4def/joint-g1-06/schema-authority06.json';
const changes = JSON.parse(fs.readFileSync(inputFile, 'utf8')).schemas;
const full = JSON.parse(fs.readFileSync('docs/design/rust-r4def/joint-g1-06/target-full-spec06.json', 'utf8'));
const file = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const declarations = new Map();
const names = new Map();
function metaId(expr) {
    while (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) {
        if (expr.expression.name.text === 'meta' && ts.isObjectLiteralExpression(expr.arguments[0])) {
            const id = expr.arguments[0].properties.find(p => ts.isPropertyAssignment(p) && p.name.getText() === 'id');
            if (id && ts.isStringLiteralLike(id.initializer)) return id.initializer.text;
        }
        expr = expr.expression.expression;
    }
    return null;
}
for (const statement of ast.statements) if (ts.isVariableStatement(statement)) for (const decl of statement.declarationList.declarations) {
    if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
    const name = decl.name.text;
    declarations.set(name, { statement, decl });
    const id = metaId(decl.initializer) ?? (name.endsWith('Schema') ? name.slice(0, -6) : null);
    if (id && full.components.schemas[id]) names.set(id, name);
}
const additions = Object.keys(changes).filter(name => !names.has(name));
for (const name of additions) { assert(!declarations.has(name + 'Schema')); names.set(name, name + 'Schema'); }
const refs = value => {
    const output = new Set();
    function walk(v) { if (!v || typeof v !== 'object') return; if (v.$ref) { const name = v.$ref.split('/').at(-1); assert(names.has(name), `Missing public Shared declaration ${name}`); output.add(name); } Object.values(v).forEach(walk); }
    walk(value); return output;
};
const dependencies = new Map(Object.entries(changes).map(([name, delta]) => [name, refs(delta.after)]));
const json = JSON.stringify;
function expression(schema, at) {
    assert(schema && typeof schema === 'object' && !Array.isArray(schema), at);
    let result;
    const nullOnly = schema.enum?.length === 1 && schema.enum[0] === null;
    if (nullOnly) result = 'z.string().nullable().refine((value) => value === null).meta({ enum: [null] })';
    else if (schema.$ref) result = names.get(schema.$ref.split('/').at(-1));
    else if (schema.allOf) {
        assert(schema.allOf.length > 0, at); result = schema.allOf.map((v, i) => expression(v, `${at}/allOf/${i}`)).reduce((a, b) => `${a}.and(${b})`);
    } else if (schema.oneOf || schema.anyOf) {
        const variants = schema.oneOf ?? schema.anyOf;
        result = `z.union([${variants.map((v, i) => expression(v, `${at}/union/${i}`)).join(', ')}])`;
    } else if (schema.enum) {
        const values = schema.enum.filter(v => v !== null);
        assert(values.length > 0 && values.every(v => typeof v === 'string'), at);
        result = values.length === 1 ? `z.literal(${json(values[0])})` : `z.enum(${json(values)})`;
    } else if (schema.type === 'object' || schema.properties) {
        assert(schema.additionalProperties === undefined || schema.additionalProperties === false, `Dictionary requires explicit promotion: ${at}`);
        const required = new Set(schema.required ?? []);
        const props = Object.entries(schema.properties ?? {}).map(([name, value]) => `${json(name)}: ${expression(value, `${at}/${name}`)}${required.has(name) ? '' : '.optional()'}`);
        result = `z.object({${props.join(',\n')}}).strict()`;
    } else if (schema.type === 'array') {
        assert(schema.items, at); result = `z.array(${expression(schema.items, `${at}/items`)})`;
        if (schema.minItems !== undefined) result += `.min(${schema.minItems})`;
        if (schema.maxItems !== undefined) result += `.max(${schema.maxItems})`;
    } else if (schema.type === 'string') {
        result = schema.format === 'uuid' ? 'z.uuid()' : schema.format === 'date' ? 'z.iso.date()' : schema.format === 'date-time' ? (schema.pattern?.includes('[+-]') ? 'z.iso.datetime({ offset: true })' : 'z.iso.datetime()') : 'z.string()';
        if (!schema.format && !schema.pattern && (schema.minLength !== undefined || schema.maxLength !== undefined)) result += '.trim()';
        if (schema.minLength !== undefined) result += `.min(${schema.minLength})`;
        if (schema.maxLength !== undefined) result += `.max(${schema.maxLength})`;
        if (schema.pattern && !['uuid', 'date', 'date-time'].includes(schema.format)) result += `.regex(/${schema.pattern.replaceAll('/', '\\/')}/)`;
    } else if (schema.type === 'integer' || schema.type === 'number') {
        result = schema.type === 'integer' ? 'z.number().int()' : 'z.number()';
        if (schema.minimum !== undefined) result += `.${schema.exclusiveMinimum ? 'gt' : 'min'}(${schema.minimum})`;
        if (schema.maximum !== undefined) result += `.${schema.exclusiveMaximum ? 'lt' : 'max'}(${schema.maximum})`;
    } else if (schema.type === 'boolean') result = 'z.boolean()';
    else assert.fail(`Unsupported frozen schema at ${at}: ${json(schema).slice(0, 180)}`);
    assert(result, at);
    if (schema.nullable && !nullOnly) result += '.nullable()';
    if (Object.hasOwn(schema, 'default')) result += `.default(${json(schema.default)})`;
    if (schema.description) result += `.describe(${json(schema.description)})`;
    return result;
}
const anchors = new Map(additions.map(name => [name, source.length]));
function assignAnchor(name, anchor, seen = new Set()) {
    if (seen.has(name)) return; seen.add(name);
    for (const dep of dependencies.get(name) ?? []) if (anchors.has(dep)) {
        anchors.set(dep, Math.min(anchors.get(dep), anchor)); assignAnchor(dep, anchor, seen);
    }
}
for (const name of Object.keys(changes)) if (!anchors.has(name)) assignAnchor(name, declarations.get(names.get(name)).statement.getStart());
for (const [name, anchor] of anchors) for (const dep of dependencies.get(name) ?? []) {
    if (anchors.has(dep)) assert(anchors.get(dep) <= anchor, `${name} new dependency order`);
    else assert(declarations.get(names.get(dep)).statement.getStart() < anchor, `${name} requires later public schema ${dep}`);
}
const edits = [];
for (const [name, delta] of Object.entries(changes)) if (!anchors.has(name)) {
    const { decl } = declarations.get(names.get(name));
    edits.push({ start: decl.initializer.getStart(), end: decl.initializer.end, text: `${expression(delta.after, name)}.meta({ id: ${json(name)} })` });
}
const groups = new Map();
for (const [name, anchor] of anchors) { if (!groups.has(anchor)) groups.set(anchor, []); groups.get(anchor).push(name); }
for (const [anchor, group] of groups) {
    const sorted = [], seen = new Set(), active = new Set();
    function visit(name) { if (seen.has(name)) return; assert(!active.has(name), `Recursive public schema ${name}`); active.add(name); for (const dep of dependencies.get(name) ?? []) if (group.includes(dep)) visit(dep); active.delete(name); seen.add(name); sorted.push(name); }
    group.sort().forEach(visit);
    const text = '\n// R4 DEF: independently frozen public contract additions.\n' + sorted.map(name => `export const ${names.get(name)} = ${expression(changes[name].after, name)}.meta({ id: ${json(name)} });\nexport type ${name} = z.infer<typeof ${names.get(name)}>;\n`).join('\n') + '\n';
    edits.push({ start: anchor, end: anchor, text });
}
let output = source;
for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
const out = 'tmp/rust-r4def/root/contract-promotion10'; fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/shared-before-original.bin', source, { flag: 'wx' });
fs.writeFileSync(file, output);
const receipt = { kind: 'G2-frozen-schema-Shared-promotion', authority: inputFile, sourceBeforeSha256: createHash('sha256').update(source).digest('hex'), sourceAfterSha256: createHash('sha256').update(output).digest('hex'), changed: Object.keys(changes).length, additions, replacements: Object.keys(changes).length - additions.length, runtimeExecuted: false, sqlExecuted: false, next: 'Review cross-field refinements, format, export DTO/complete OpenAPI and compare declared semantics before guarded client generation' };
fs.writeFileSync(out + '/receipt10.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ changed: receipt.changed, additions: additions.length, replacements: receipt.replacements }));
