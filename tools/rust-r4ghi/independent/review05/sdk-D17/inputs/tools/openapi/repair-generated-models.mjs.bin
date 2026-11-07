// Repair representations that the pinned generator cannot express faithfully.
// The complete, frozen OpenAPI document remains the source for every repair.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const nullOnly = (s) => s?.nullable === true && equal(s.enum, [null]);
const booleanEnum = (s) => Array.isArray(s?.enum) && s.enum.length > 0 && s.enum.every((x) => typeof x === 'boolean');
const resolve = (ref, schemas) => {
    assert(/^#\/components\/schemas\/[^/]+$/.test(ref), 'Model repair only resolves named local schemas');
    const name = ref.slice('#/components/schemas/'.length);
    assert(Object.hasOwn(schemas, name), `Unknown model repair reference: ${name}`);
    return [name, schemas[name]];
};

// Only requirements common to every alternative are unconditional.
function unconditionalRequired(schema, schemas, visited = new Set()) {
    if (schema.$ref) {
        const [name, target] = resolve(schema.$ref, schemas);
        assert(!visited.has(name), 'Recursive required constraints need an explicit model mapping');
        return unconditionalRequired(target, schemas, new Set([...visited, name]));
    }
    const result = new Set(schema.required ?? []);
    for (const member of schema.allOf ?? []) for (const key of unconditionalRequired(member, schemas, visited)) result.add(key);
    for (const kind of ['anyOf', 'oneOf']) if (schema[kind]?.length) {
        const sets = schema[kind].map((member) => unconditionalRequired(member, schemas, visited));
        for (const key of sets[0]) if (sets.every((set) => set.has(key))) result.add(key);
    }
    return result;
}

export function repairModelText(text, document, file, modelFiles = new Map()) {
    const schemas = document.components.schemas;
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    assert.equal(ast.parseDiagnostics.length, 0, `Generator emitted unparseable TypeScript: ${file}`);
    const enums = new Map(ast.statements.filter(ts.isEnumDeclaration).map((node) => [node.name.text, node]));
    const imports = new Map();
    for (const node of ast.statements.filter(ts.isImportDeclaration)) {
        for (const item of node.importClause?.namedBindings?.elements ?? []) imports.set(item.name.text, item.propertyName?.text ?? item.name.text);
    }
    const edits = [], repairs = [], claimedEnums = new Set(), missingImports = new Map();
    const edit = (node, replacement, pointer, kind) => {
        edits.push({ start: node.getStart(ast), end: node.end, replacement });
        repairs.push({ file, pointer, kind });
    };
    for (const node of ast.statements.filter(ts.isInterfaceDeclaration)) {
        const model = node.name.text, schema = schemas[model];
        if (!schema) continue;
        // A pure union of referenced models must never become a merged record.
        const alternatives = schema.anyOf ?? schema.oneOf;
        if (alternatives && Object.keys(schema).every((key) => ['anyOf', 'oneOf', 'description', 'title'].includes(key))) {
            assert(alternatives.length > 1 && alternatives.every((part) => (Object.keys(part).length === 1 && part.$ref) || nullOnly(part)), `Unsupported model union: ${model}`);
            const names = alternatives.map((part) => part.$ref ? resolve(part.$ref, schemas)[0] : 'null');
            for (const name of names.filter((name) => name !== 'null')) {
                if (imports.has(name)) assert.equal(imports.get(name), name, `Aliased union import: ${model}/${name}`);
                else {
                    const target = modelFiles.get(name);
                    assert(target && target !== file, `Missing exact generated union target: ${model}/${name}`);
                    missingImports.set(name, './' + path.posix.basename(target, '.ts'));
                }
            }
            edit(node, `export type ${model} = ${names.join(' | ')};`, `#/components/schemas/${model}`, 'referenced-model-union');
            // The merged interface's local enum is also an incorrect artifact.
            for (const [name, enumeration] of enums) {
                assert(name.startsWith(model), `Unexpected nonlocal merged enum: ${model}/${name}`);
                assert(!claimedEnums.has(name), 'An enum may only belong to one repaired declaration');
                claimedEnums.add(name);
                edit(enumeration, '', `#/components/schemas/${model}`, 'remove-merged-union-enum');
            }
            continue;
        }
        const required = unconditionalRequired(schema, schemas);
        for (const member of node.members) {
            if (!ts.isPropertySignature(member) || !member.type) continue;
            const key = ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : undefined;
            const source = schema.properties?.[key];
            if (!source) continue;
            const pointer = `#/components/schemas/${model}/properties/${key}`;
            if (nullOnly(source) || booleanEnum(source)) {
                const refs = (ts.isUnionTypeNode(member.type) ? member.type.types : [member.type]).filter(ts.isTypeReferenceNode);
                if (booleanEnum(source) && refs.length === 0) {
                    assert.equal(member.type.kind, ts.SyntaxKind.BooleanKeyword, `Unexpected direct boolean literal representation: ${pointer}`);
                    edit(member.type, source.enum.join(' | '), pointer, 'boolean-literal');
                    continue;
                }
                assert.equal(refs.length, 1, `Expected one generator enum for exact literal property: ${pointer}`);
                const name = refs[0].typeName.getText(ast), enumeration = enums.get(name);
                assert(enumeration && !claimedEnums.has(name), `Missing or shared literal enum: ${pointer}`);
                claimedEnums.add(name);
                if (nullOnly(source)) {
                    assert.equal(enumeration.members.length, 0, `Nonempty enum for null-only source: ${pointer}`);
                    assert.equal(member.type.getText(ast).replace(/\s/g, ''), `${name}|null`, `Nullability differs from exact source: ${pointer}`);
                    edit(enumeration, `export type ${name} = null;`, pointer, 'null-only-literal');
                } else {
                    const members = enumeration.members.map((item) => {
                        assert(item.initializer && [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(item.initializer.kind), `Nonboolean generated enum: ${pointer}`);
                        return { name: item.name.getText(ast), value: item.initializer.kind === ts.SyntaxKind.TrueKeyword };
                    });
                    assert(equal(members.map((x) => x.value), source.enum), `Boolean enum values differ: ${pointer}`);
                    edit(enumeration, `export type ${name} = ${source.enum.join(' | ')};\nexport const ${name} = { ${members.map((x) => `${x.name}: ${x.value}`).join(', ')} } as const;`, pointer, 'boolean-literal');
                }
            }
            // The generator lifts a conditionally-required member to required.
            // Restore base optionality only when a composition caused the drift.
            if (schema.allOf && !required.has(key) && !member.questionToken) {
                edits.push({ start: member.name.end, end: member.name.end, replacement: '?' });
                repairs.push({ file, pointer, kind: 'conditional-member-optional' });
            }
        }
    }
    for (const [name, node] of enums) {
        assert(node.members.length > 0 || claimedEnums.has(name), `Unbound empty generated enum: ${file}/${name}`);
        assert(!node.members.some((m) => m.initializer && [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(m.initializer.kind)) || claimedEnums.has(name), `Unbound boolean generated enum: ${file}/${name}`);
    }
    edits.sort((a, b) => b.start - a.start);
    let previousStart = text.length + 1;
    for (const change of edits) {
        assert(change.end <= previousStart, 'Model repair edits overlap');
        text = text.slice(0, change.start) + change.replacement + text.slice(change.end);
        previousStart = change.start;
    }
    if (missingImports.size) text = [...missingImports].map(([name, target]) => `import { ${name} } from '${target}';`).join('\n') + '\n' + text;
    return { text, repairs };
}

export function repairGeneratedModels(directory, document) {
    const repairs = [], files = [];
    const modelFiles = new Map();
    for (const file of fs.readdirSync(path.join(directory, 'model')).filter((name) => name.endsWith('.ts')).sort()) {
        const text = fs.readFileSync(path.join(directory, 'model', file), 'utf8');
        const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        for (const node of ast.statements) if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && Object.hasOwn(document.components.schemas, node.name.text)) {
            assert(!modelFiles.has(node.name.text), `Duplicate generated model: ${node.name.text}`);
            modelFiles.set(node.name.text, `model/${file}`);
        }
    }
    for (const file of fs.readdirSync(path.join(directory, 'model')).filter((name) => name.endsWith('.ts')).sort()) {
        const relative = `model/${file}`, target = path.join(directory, relative);
        const before = fs.readFileSync(target, 'utf8');
        const result = repairModelText(before, document, relative, modelFiles);
        if (result.repairs.length) {
            fs.writeFileSync(target, result.text);
            files.push({ file: relative, beforeSha256: sha(before), afterSha256: sha(result.text) });
            repairs.push(...result.repairs);
        }
    }
    return { kind: 'canonical-schema-bound-model-repair', typescriptVersion: ts.version, repairs, files };
}
