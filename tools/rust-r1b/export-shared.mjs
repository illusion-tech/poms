import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const zodVersion = require('zod/package.json').version;
if (process.versions.node.split('.')[0] !== '24' || ts.version !== '6.0.3' || zodVersion !== '4.6.1') {
    throw new Error(`R1B exporter requires Node 24.x, TypeScript 6.0.3 and Zod 4.6.1; found Node ${process.versions.node}, TypeScript ${ts.version}, Zod ${zodVersion}`);
}
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SOURCE_HEAD = 'ef9fd7f4871eb87167bca1ae04fae8a992ef594c';
export const SHARED_PATH = 'libs/shared/contracts/src/lib/shared-contracts.ts';
export const SPEC_PATH = 'libs/shared/api-spec/openapi.json';
export const R0_PATH = 'docs/design/rust-r0-api-operations.json';
export const GENERATOR_PATH = 'tools/rust-r1b/export-shared.mjs';
export const MANIFEST_PATH = 'tools/rust-r1b/shared-manifest.json';
export const RUST_PATH = 'apps/poms-api-rust/src/shared/generated.rs';
export const TEST_PATH = 'apps/poms-api-rust/tests/shared_generated.rs';
const ENTITY_PATH = 'apps/poms-api/src/app/core/auth/auth-session.entity.ts';
const SERVICE_PATH = 'apps/poms-api/src/app/core/auth/auth-session.service.ts';
// Review these source identities deliberately when advancing the one-way export.
// No generated wire values are used as an alternative source of truth.
export const SOURCE_SCOPE = ['.gitattributes', ':(glob)libs/shared/contracts/src/**/*.ts', SPEC_PATH, ENTITY_PATH, SERVICE_PATH, R0_PATH];
const SOURCE_PATHS = ['.gitattributes', 'libs/shared/contracts/src/index.ts', SHARED_PATH, SPEC_PATH, ENTITY_PATH, SERVICE_PATH, R0_PATH];
// Supported helper semantics are reviewed against these exact declarations, then
// independently checked by executing the original TS module with only Zod loaded.
export const HELPER_HASHES = Object.freeze({
    defineEnumDefinitions: '74f91dd0ac8ccaa5ebf310fc56f2b678ac4324a8a6119e98877f2e233977ebb9',
    defineSeverityEnumDefinitions: 'd5a1d8a71a84b660cc600f0d140ee4ca93d0bbc048bd3fad7e95ca017eff6c60',
    enumObjectValues: 'a05f6776c656b2796ebf10616e4f98db22dd8477a3fb74faa3ce6994e3d94488',
    enumDefinitionValues: 'a8646be37a711e78761b2611aceb5fee7ac12929a668cf3513323bc2caf6fc6d',
    enumDefinitionValueObject: 'bd2ae9b4b2300731764eade0e0139fe2a626afeef07417c169dee3d5cfe17a35',
    enumDefinitionLabels: 'b7152b4d630a21d37b1a3ad632dd21c05f0d288768060d7c66532fc01a9416ed',
    enumDefinitionOptions: '2e6841abebe57efb0d26c2115aecedb8273c4fa5e7432d60dacf66a59e52ca13',
    enumDefinitionSeverities: 'ceb861c29b226c4a7e70c8476969c3df9d2ead089ec553ee0fe51b4433678bf7',
    enumDefinitionHints: '1c1a18b688fa0267f8412664d37ea2ed25f68c0e639a19f64fdda37697a9d5e9'
});
const OTHER_FUNCTION_HASHES = Object.freeze({
    assertOperatingSnapshotBaselineSelection: '8e8e469ac46fb27c6f28ba7d9251c8e989a93661ad8028b9100d857d2375f456'
});
const SCHEMA_METHODS = new Set([
    'addIssue',
    'array',
    'boolean',
    'catchall',
    'date',
    'datetime',
    'default',
    'discriminatedUnion',
    'email',
    'enum',
    'extend',
    'int',
    'lazy',
    'length',
    'literal',
    'max',
    'meta',
    'min',
    'nonnegative',
    'nullable',
    'number',
    'object',
    'optional',
    'partial',
    'positive',
    'record',
    'refine',
    'regex',
    'strict',
    'string',
    'superRefine',
    'trim',
    'union',
    'unknown',
    'url',
    'uuid'
]);
const METADATA_HELPERS = new Map([
    ['enumDefinitionLabels', 'label-map'],
    ['enumDefinitionSeverities', 'severity-map'],
    ['enumDefinitionOptions', 'options'],
    ['enumDefinitionHints', 'hint-map']
]);
export const normalizeText = (text) => text.replace(/\r\n/g, '\n');
export const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const read = (root, path) => normalizeText(readFileSync(resolve(root, path), 'utf8'));
const jsonEqual = (a, b, message) => assert.equal(JSON.stringify(a), JSON.stringify(b), message);
const unique = (items, message) => {
    if (new Set(items).size !== items.length) throw new Error(message);
};
const sortedCounts = (items, key) => Object.fromEntries([...new Set(items.map(key))].sort().map((name) => [name, items.filter((item) => key(item) === name).length]));
const unwrap = (node) => {
    while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node))) node = node.expression;
    return node;
};
const unwrapType = (node) => {
    while (node && ts.isParenthesizedTypeNode(node)) node = node.type;
    return node;
};
const source = (node, sf) => {
    const start = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return { path: sf.fileName, line: start.line + 1, column: start.character + 1 };
};
const failAt = (node, sf, message) => {
    const position = source(node, sf);
    throw new Error(`${position.path}:${position.line}:${position.column}: ${message}`);
};
const visit = (node, fn) => {
    fn(node);
    ts.forEachChild(node, (child) => visit(child, fn));
};
const stringArray = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const stringRecord = (value) => record(value) && Object.values(value).length > 0 && Object.values(value).every((item) => typeof item === 'string');

export function assertSourceGuard(root = ROOT) {
    const options = { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 };
    const changed = execFileSync('git', ['diff', '--name-only', '--no-ext-diff', SOURCE_HEAD, '--', ...SOURCE_SCOPE], options).trim();
    const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--no-ext-diff', SOURCE_HEAD, '--', ...SOURCE_SCOPE], options).trim();
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...SOURCE_SCOPE], options).trim();
    if (changed || staged || untracked) throw new Error(`R1B source inputs differ from reviewed reference ${SOURCE_HEAD}; review and advance the reference deliberately.\n${[changed, staged, untracked].filter(Boolean).join('\n')}`);
}

function collect(text, path, { shared = false } = {}) {
    text = normalizeText(text);
    const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (sf.parseDiagnostics.length) throw new Error(`${path}: TypeScript syntax diagnostics: ${sf.parseDiagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, ' ')).join('; ')}`);
    const constants = new Map();
    const aliases = new Map();
    const functions = [];
    for (const statement of sf.statements) {
        if (ts.isImportDeclaration(statement) && shared && (statement.moduleSpecifier.text !== 'zod' || statement.importClause?.namedBindings?.getText(sf) !== '{ z }'))
            failAt(statement, sf, 'Unsupported shared import; the offline oracle permits only the existing named Zod import');
        if (ts.isFunctionDeclaration(statement)) {
            if (!statement.name) failAt(statement, sf, 'Anonymous top-level function is unsupported');
            if (shared) {
                const name = statement.name.text;
                const expected = HELPER_HASHES[name] ?? OTHER_FUNCTION_HASHES[name];
                const hash = sha256(statement.getText(sf));
                if (!expected || hash !== expected) failAt(statement, sf, `Unsupported or changed helper/function ${name}; review its semantics before export`);
                functions.push({ name, ...source(statement, sf), declarationSha256: hash, role: Object.hasOwn(HELPER_HASHES, name) ? 'enum-helper' : 'schema-refinement-out-of-enum-scope' });
            }
        }
        if (ts.isVariableStatement(statement)) {
            if (shared && !(statement.declarationList.flags & ts.NodeFlags.Const)) failAt(statement, sf, 'Only const top-level candidates are supported');
            for (const declaration of statement.declarationList.declarations) {
                if (!ts.isIdentifier(declaration.name)) failAt(declaration, sf, 'Destructured top-level candidates are unsupported');
                const name = declaration.name.text;
                if (constants.has(name)) failAt(declaration, sf, `Duplicate declaration ${name}`);
                if (!declaration.initializer) failAt(declaration, sf, `Missing initializer for ${name}`);
                constants.set(name, declaration);
            }
        }
        if (ts.isTypeAliasDeclaration(statement)) {
            if (aliases.has(statement.name.text)) failAt(statement, sf, `Duplicate type alias ${statement.name.text}`);
            aliases.set(statement.name.text, statement);
        }
        if (shared && !ts.isImportDeclaration(statement) && !ts.isVariableStatement(statement) && !ts.isFunctionDeclaration(statement) && !ts.isTypeAliasDeclaration(statement) && !ts.isInterfaceDeclaration(statement))
            failAt(statement, sf, `Unsupported top-level statement ${ts.SyntaxKind[statement.kind]}`);
    }
    if (shared)
        jsonEqual(
            functions
                .filter((item) => item.role === 'enum-helper')
                .map((item) => item.name)
                .sort(),
            Object.keys(HELPER_HASHES).sort(),
            'Missing supported helper declaration'
        );
    return { sf, text, constants, aliases, functions };
}

function evaluator(input) {
    const { sf, constants } = input;
    const cache = new Map();
    const evaluate = (raw, stack = []) => {
        const node = unwrap(raw);
        if (!node) throw new Error(`${sf.fileName}: Missing expression`);
        if (ts.isStringLiteralLike(node)) return node.text;
        if (ts.isNumericLiteral(node)) return Number(node.text);
        if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
        if (node.kind === ts.SyntaxKind.NullKeyword) return null;
        if (ts.isIdentifier(node)) {
            const name = node.text;
            if (!constants.has(name)) failAt(node, sf, `Unknown data identifier ${name}`);
            if (stack.includes(name)) failAt(node, sf, `Cyclic data dependency ${[...stack, name].join(' -> ')}`);
            if (!cache.has(name)) cache.set(name, evaluate(constants.get(name).initializer, [...stack, name]));
            return cache.get(name);
        }
        if (ts.isArrayLiteralExpression(node)) {
            const values = [];
            for (const element of node.elements) {
                if (ts.isSpreadElement(element)) {
                    const spread = evaluate(element.expression, stack);
                    if (!Array.isArray(spread)) failAt(element, sf, 'Array spread must resolve to an array');
                    values.push(...spread);
                } else values.push(evaluate(element, stack));
            }
            return values;
        }
        if (ts.isObjectLiteralExpression(node)) {
            const entries = [];
            for (const property of node.properties) {
                if (!ts.isPropertyAssignment(property) || (!ts.isIdentifier(property.name) && !ts.isStringLiteralLike(property.name))) failAt(property, sf, 'Unsupported object property or computed key');
                entries.push([property.name.text, evaluate(property.initializer, stack)]);
            }
            unique(
                entries.map(([key]) => key),
                `${sf.fileName}: Duplicate object key`
            );
            return Object.fromEntries(entries);
        }
        if (ts.isPropertyAccessExpression(node)) {
            const value = evaluate(node.expression, stack);
            if (!record(value) || !Object.hasOwn(value, node.name.text)) failAt(node, sf, `Unknown property ${node.name.text}`);
            return value[node.name.text];
        }
        if (ts.isCallExpression(node)) {
            const helper = node.expression.getText(sf);
            if (!Object.hasOwn(HELPER_HASHES, helper) && helper !== 'Object.values') failAt(node, sf, `Unsupported data helper ${helper}`);
            if (node.arguments.length !== 1) failAt(node, sf, `${helper} requires exactly one argument`);
            const value = evaluate(node.arguments[0], stack);
            if (helper === 'defineEnumDefinitions' || helper === 'defineSeverityEnumDefinitions') return value;
            if (helper === 'enumObjectValues' || helper === 'Object.values') {
                if (!record(value)) failAt(node, sf, `${helper} requires an object`);
                return Object.values(value);
            }
            if (!Array.isArray(value)) failAt(node, sf, `${helper} requires definitions`);
            if (helper === 'enumDefinitionValues') return value.map((item) => item.value);
            const map = (key, field) => {
                unique(
                    value.map((item) => item[key]),
                    `${helper}: Duplicate definition ${key}`
                );
                if (value.some((item) => typeof item[key] !== 'string' || typeof item[field] !== 'string')) failAt(node, sf, `${helper}: Invalid definition field`);
                return Object.fromEntries(value.map((item) => [item[key], item[field]]));
            };
            if (helper === 'enumDefinitionValueObject') return map('key', 'value');
            if (helper === 'enumDefinitionLabels') return map('value', 'label');
            if (helper === 'enumDefinitionSeverities') return map('value', 'severity');
            if (helper === 'enumDefinitionHints') return map('value', 'hint');
            if (helper === 'enumDefinitionOptions') return value.map((item) => ({ label: item.label, value: item.value }));
        }
        failAt(node, sf, `Unsupported data expression ${ts.SyntaxKind[node.kind]}`);
    };
    return evaluate;
}

function dependencies(node, input) {
    const result = new Set();
    visit(node, (item) => {
        if (ts.isIdentifier(item) && input.constants.has(item.text) && !(ts.isPropertyAccessExpression(item.parent) && item.parent.name === item) && !(ts.isPropertyAssignment(item.parent) && item.parent.name === item)) result.add(item.text);
    });
    return [...result];
}

function validateSchema(node, input) {
    visit(node, (item) => {
        if (!ts.isCallExpression(item)) return;
        if (!ts.isPropertyAccessExpression(item.expression) || !SCHEMA_METHODS.has(item.expression.name.text)) failAt(item, input.sf, `Unsupported schema helper ${item.expression.getText(input.sf)}`);
        let root = item.expression.expression;
        while (ts.isCallExpression(root) || ts.isPropertyAccessExpression(root)) root = ts.isCallExpression(root) ? root.expression : root.expression;
        if (!ts.isIdentifier(root) || (root.text !== 'z' && root.text !== 'ctx' && !input.constants.has(root.text))) failAt(item, input.sf, 'Unsupported schema helper receiver');
    });
}

function typeAliases(input) {
    const arrays = new Map();
    const schemas = new Map();
    for (const [name, declaration] of input.aliases) {
        const type = unwrapType(declaration.type);
        if (ts.isIndexedAccessTypeNode(type)) {
            const object = unwrapType(type.objectType);
            if (ts.isTypeQueryNode(object) && ts.isIdentifier(object.exprName)) {
                const symbol = object.exprName.text;
                if (arrays.has(symbol)) failAt(declaration, input.sf, `Conflicting Rust domain aliases for ${symbol}`);
                arrays.set(symbol, name);
            }
        }
        if (ts.isTypeReferenceNode(type) && type.typeName.getText(input.sf) === 'z.infer' && type.typeArguments?.length === 1) {
            const query = type.typeArguments[0];
            if (ts.isTypeQueryNode(query) && ts.isIdentifier(query.exprName)) schemas.set(query.exprName.text, name);
        }
    }
    return { arrays, schemas };
}

function occurrenceContext(node, owner, input) {
    const path = [];
    for (let parent = node.parent; parent && parent !== input.constants.get(owner); parent = parent.parent) {
        if (ts.isPropertyAssignment(parent) && (ts.isIdentifier(parent.name) || ts.isStringLiteralLike(parent.name))) path.unshift(parent.name.text);
    }
    return path;
}

export function rustIdentifier(value) {
    const name = value
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join('');
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || name === 'Self') throw new Error(`Unsupported or reserved Rust identifier derived from ${JSON.stringify(value)}`);
    return name;
}

function family(name, symbol, values, position, origin, aliases = []) {
    if (rustIdentifier(name) !== name) throw new Error(`Rust type name needs an explicit reviewed naming rule: ${name}`);
    if (!stringArray(values)) throw new Error(`${name}: Expected a nonempty string enum`);
    unique(values, `${name}: Duplicate wire value`);
    const variants = values.map((wire) => ({ name: rustIdentifier(wire), wire }));
    unique(
        variants.map((variant) => variant.name),
        `${name}: Rust variant collision`
    );
    if (values.includes('__poms_r1b_unknown__')) throw new Error(`${name}: Reserved negative test value`);
    return { name, sourceSymbol: symbol, origin, source: position, aliases, values, variants, occurrenceIds: [] };
}

function validateDefinitions(value, node, input) {
    if (!Array.isArray(value) || !value.length) failAt(node, input.sf, 'Empty or invalid definition array');
    for (const definition of value) {
        if (!record(definition) || ['key', 'value', 'label'].some((field) => typeof definition[field] !== 'string') || !Number.isFinite(definition.order)) failAt(node, input.sf, 'Invalid enum definition fields');
        if (Object.keys(definition).some((key) => !['key', 'value', 'label', 'order', 'severity', 'hint'].includes(key))) failAt(node, input.sf, 'Unknown enum definition metadata field');
        if (Object.hasOwn(definition, 'severity') && typeof definition.severity !== 'string') failAt(node, input.sf, 'Invalid severity');
        if (Object.hasOwn(definition, 'hint') && typeof definition.hint !== 'string') failAt(node, input.sf, 'Invalid hint');
    }
    unique(
        value.map((item) => item.key),
        'Duplicate enum definition key'
    );
    unique(
        value.map((item) => item.value),
        'Duplicate enum definition wire value'
    );
}

export function analyzeShared(text, spec) {
    const input = collect(text, SHARED_PATH, { shared: true });
    const evaluate = evaluator(input);
    const declarations = [];
    const schemaDeclarations = [];
    const excludedDeclarations = [];
    for (const [name, node] of input.constants) {
        const initializer = unwrap(node.initializer);
        if (name.endsWith('Schema')) {
            if (!ts.isCallExpression(initializer)) failAt(node, input.sf, `Unknown schema candidate ${name}`);
            validateSchema(initializer, input);
            schemaDeclarations.push({ name, ...source(node, input.sf), classification: 'zod-schema', enumOccurrenceIds: [] });
            continue;
        }
        if (name === 'CommissionSharedEvidencePackageShape') {
            if (!ts.isObjectLiteralExpression(initializer)) failAt(node, input.sf, 'Schema shape must remain an object');
            validateSchema(initializer, input);
            if (
                initializer.properties.some(
                    (property) => !ts.isPropertyAssignment(property) || (!ts.isCallExpression(unwrap(property.initializer)) && !(ts.isIdentifier(unwrap(property.initializer)) && unwrap(property.initializer).text.endsWith('Schema')))
                )
            )
                failAt(node, input.sf, 'Unsupported schema shape member');
            excludedDeclarations.push({ name, ...source(node, input.sf), classification: 'schema-shape-out-of-enum-scope', dependencies: dependencies(initializer, input) });
            continue;
        }
        const value = evaluate(initializer, [name]);
        const helper = ts.isCallExpression(initializer) ? initializer.expression.getText(input.sf) : null;
        let kind;
        let r0Kind = null;
        if (stringArray(value)) kind = r0Kind = 'string-array';
        else if (name.endsWith('Value') && stringRecord(value)) kind = r0Kind = 'wire-value-object';
        else if (name.endsWith('_DEFINITIONS')) {
            validateDefinitions(value, node, input);
            kind = r0Kind = 'enum-definitions';
        } else if (METADATA_HELPERS.has(helper)) {
            kind = METADATA_HELPERS.get(helper);
            if (kind === 'options' ? !Array.isArray(value) || value.some((item) => !record(item) || typeof item.label !== 'string' || typeof item.value !== 'string') : !stringRecord(value)) failAt(node, input.sf, `Invalid ${kind}`);
        } else if (name === 'PermissionsMeta' && record(value)) kind = 'permission-metadata';
        else if (name === 'SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS' && stringRecord(value)) kind = 'sensitive-package-permission-map';
        else if (['IDENTITY_PROVIDER_SCOPE_MAX_LENGTH', 'IDENTITY_PROVIDER_SCOPE_MAX_ITEMS'].includes(name) && Number.isSafeInteger(value)) kind = 'schema-scalar-limit';
        else failAt(node, input.sf, `Unclassified data candidate ${name}; no declaration may be silently ignored`);
        if (kind === 'string-array') unique(value, `${name}: Duplicate wire value`);
        declarations.push({ name, ...source(node, input.sf), kind, r0Kind, expression: node.initializer.getText(input.sf), helper, dependencies: dependencies(initializer, input), value, valueSha256: sha256(JSON.stringify(value)) });
    }
    const permissionKeys = declarations.find((item) => item.name === 'PERMISSION_KEYS')?.value;
    const permissionMeta = declarations.find((item) => item.name === 'PermissionsMeta')?.value;
    jsonEqual(Object.keys(permissionMeta ?? {}), permissionKeys, 'PermissionsMeta must cover PERMISSION_KEYS in source order');
    for (const value of Object.values(permissionMeta ?? {})) if (!record(value) || typeof value.description !== 'string' || typeof value.group !== 'string' || Object.keys(value).length !== 2) throw new Error('Unsupported PermissionMeta shape');
    const sensitive = declarations.find((item) => item.name === 'SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS')?.value;
    jsonEqual(Object.keys(sensitive ?? {}), declarations.find((item) => item.name === 'SENSITIVE_FIELD_PACKAGE_KEYS')?.value, 'Sensitive permission map must cover all packages');
    if (Object.values(sensitive ?? {}).some((value) => !permissionKeys.includes(value))) throw new Error('Unknown sensitive package permission');
    const aliases = typeAliases(input);
    const occurrences = [];
    for (const schema of schemaDeclarations) {
        const node = input.constants.get(schema.name);
        let base = unwrap(node.initializer);
        while (ts.isCallExpression(base) && ts.isPropertyAccessExpression(base.expression) && base.expression.getText(input.sf) !== 'z.enum') base = unwrap(base.expression.expression);
        let schemaId = null;
        visit(node.initializer, (item) => {
            if (ts.isCallExpression(item) && ts.isPropertyAccessExpression(item.expression) && item.expression.name.text === 'meta') {
                const argument = item.arguments[0];
                const id = argument && ts.isObjectLiteralExpression(argument) ? argument.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(input.sf) === 'id') : null;
                if (id && ts.isStringLiteralLike(id.initializer)) schemaId = id.initializer.text;
            }
        });
        visit(node.initializer, (item) => {
            if (!ts.isCallExpression(item) || item.expression.getText(input.sf) !== 'z.enum') return;
            if (item.arguments.length !== 1) failAt(item, input.sf, 'z.enum must have one supported argument');
            const argument = unwrap(item.arguments[0]);
            const values = evaluate(argument);
            if (!stringArray(values)) failAt(item, input.sf, 'z.enum must resolve to string array');
            unique(values, `${schema.name}: Duplicate z.enum wire value`);
            const position = source(item, input.sf);
            const id = `${schema.name}:${position.line}:${position.column}`;
            const topLevel = base === item;
            const openApiValues = topLevel && schemaId ? (spec.components?.schemas?.[schemaId]?.enum ?? null) : null;
            if (openApiValues) jsonEqual(values, openApiValues, `${schema.name}: OpenAPI enum values/order differ`);
            const occurrence = {
                id,
                owner: schema.name,
                schemaId,
                ...position,
                topLevel,
                expression: item.arguments[0].getText(input.sf),
                propertyPath: occurrenceContext(item, schema.name, input),
                values,
                sourceArray: ts.isIdentifier(argument) ? argument.text : null,
                family: null,
                openApiValues,
                comparison: !topLevel ? 'nested-enum-frozen-from-ts' : !openApiValues ? 'not-a-top-level-openapi-enum' : 'exact-values-and-order'
            };
            occurrences.push(occurrence);
            schema.enumOccurrenceIds.push(id);
        });
    }
    const families = [];
    for (const declaration of declarations.filter((item) => item.kind === 'string-array')) {
        const uses = occurrences.filter((item) => item.sourceArray === declaration.name);
        if (!uses.length) throw new Error(`Unused string-array candidate ${declaration.name} requires explicit review`);
        const candidates = [...new Set([aliases.arrays.get(declaration.name), ...uses.filter((item) => item.topLevel).map((item) => aliases.schemas.get(item.owner))].filter(Boolean))];
        if (!candidates.length || (!aliases.arrays.has(declaration.name) && candidates.length !== 1)) throw new Error(`${declaration.name}: Expected one unambiguous primary TS domain alias, got ${candidates.join(', ')}`);
        const result = family(candidates[0], declaration.name, declaration.value, { path: declaration.path, line: declaration.line, column: declaration.column }, 'shared-array', candidates);
        result.occurrenceIds = uses.map((item) => item.id);
        uses.forEach((item) => {
            item.family = result.name;
        });
        families.push(result);
    }
    for (const occurrence of occurrences.filter((item) => !item.sourceArray)) {
        if (!occurrence.propertyPath.length) throw new Error(`${occurrence.id}: Inline enum needs a stable property path`);
        const name = occurrence.owner.replace(/Schema$/, '') + occurrence.propertyPath.map(rustIdentifier).join('');
        const result = family(name, null, occurrence.values, { path: occurrence.path, line: occurrence.line, column: occurrence.column }, 'shared-inline-subset');
        result.occurrenceIds.push(occurrence.id);
        occurrence.family = result.name;
        families.push(result);
    }
    unique(
        families.map((item) => item.name),
        'Duplicate Rust domain name'
    );
    // A Value object may feed an array, share its definitions input, or carry a
    // TS Record constraint. Equal wire strings alone never establish identity.
    const byName = new Map(declarations.map((item) => [item.name, item]));
    const closure = (name, seen = new Set()) => {
        if (seen.has(name)) return seen;
        seen.add(name);
        for (const dependency of byName.get(name)?.dependencies ?? []) closure(dependency, seen);
        return seen;
    };
    const familyClosures = new Map(families.filter((item) => item.sourceSymbol).map((item) => [item.name, closure(item.sourceSymbol)]));
    const typeNames = new Map(families.flatMap((item) => [item.name, ...item.aliases].map((alias) => [alias, item.name])));
    for (const declaration of declarations) {
        const links = new Map();
        const ownClosure = closure(declaration.name);
        for (const [name, familyClosure] of familyClosures) {
            if (familyClosure.has(declaration.name)) links.set(name, { family: name, relation: 'source-dependency', via: declaration.name });
            else if (declaration.kind !== 'string-array') {
                const sharedDependency = [...ownClosure].find((symbol) => familyClosure.has(symbol));
                if (sharedDependency) links.set(name, { family: name, relation: 'shared-source-dependency', via: sharedDependency });
            }
        }
        visit(input.constants.get(declaration.name), (node) => {
            if (!ts.isTypeReferenceNode(node)) return;
            const typeName = node.typeName.getText(input.sf);
            const name = typeNames.get(typeName);
            if (name && !links.has(name)) links.set(name, { family: name, relation: 'typescript-type-constraint', via: typeName });
        });
        declaration.rustMappings = [...links.values()];
        if (declaration.r0Kind && !links.size) throw new Error(`${declaration.name}: Snapshot has no source-proven Rust family mapping`);
        if (['label-map', 'severity-map', 'options', 'hint-map', 'permission-metadata', 'sensitive-package-permission-map'].includes(declaration.kind) && !links.size)
            throw new Error(`${declaration.name}: Metadata has no source-proven Rust family mapping`);
        if (declaration.r0Kind) {
            const wires = declaration.kind === 'string-array' ? declaration.value : declaration.kind === 'enum-definitions' ? declaration.value.map((item) => item.value) : Object.values(declaration.value);
            for (const link of links.values()) {
                const target = families.find((item) => item.name === link.family).values;
                link.wireRelation =
                    JSON.stringify(wires) === JSON.stringify(target)
                        ? 'exact-values-and-order'
                        : target.every((wire) => wires.includes(wire))
                          ? 'family-subset-of-declaration'
                          : wires.every((wire) => target.includes(wire))
                            ? 'declaration-subset-of-family'
                            : null;
                if (!link.wireRelation) throw new Error(`${declaration.name}: Source-proven mapping has unrelated wire values`);
            }
            if (![...links.values()].some((link) => link.wireRelation === 'exact-values-and-order')) throw new Error(`${declaration.name}: No complete values/order mapping to a generated family`);
        }
    }
    if (declarations.length + schemaDeclarations.length + excludedDeclarations.length !== input.constants.size) throw new Error('Incomplete declaration classification');
    return { input, declarations, schemaDeclarations, excludedDeclarations, occurrences, families };
}

function authConstants(text, path, names) {
    const input = collect(text, path);
    const evaluate = evaluator(input);
    const aliases = typeAliases(input);
    const candidates = [...input.constants.keys()].filter((name) => /Value$/.test(name));
    jsonEqual(candidates, names, `${path}: Unreviewed backend enum candidate`);
    return names.map((name) => {
        const node = input.constants.get(name);
        if (!node) throw new Error(`${path}: Missing ${name}`);
        const value = evaluate(node.initializer, [name]);
        if (!stringRecord(value)) failAt(node, input.sf, 'Backend enum must remain a literal string object');
        const type = aliases.arrays.get(name);
        if (!type) failAt(node, input.sf, 'Missing backend type alias');
        const position = source(node, input.sf);
        return {
            declaration: {
                name,
                ...position,
                kind: 'backend-auth-wire-value-object',
                expression: node.initializer.getText(input.sf),
                value,
                valueSha256: sha256(JSON.stringify(value)),
                rustMappings: [{ family: type, relation: 'source-object-type-query', via: name, wireRelation: 'exact-values-and-order' }]
            },
            family: family(type, name, Object.values(value), position, 'backend-auth', [type])
        };
    });
}

// This is an independent oracle: it executes the source's actual helper bodies
// and Zod constructors. It does not call the static evaluator or import Nest.
export function runtimeOracle(analysis) {
    const { input, declarations, occurrences } = analysis;
    const probe = `\nexport const __r1bOracle = { data: {${declarations.map((item) => item.name).join(',')}}, enumArguments: [${occurrences.map((item) => item.expression).join(',')}], topEnums: {${occurrences
        .filter((item) => item.topLevel)
        .map((item) => `${item.owner}: ${item.owner}.options`)
        .join(',')}} };\n`;
    const compiled = ts.transpileModule(input.text + probe, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true } });
    if (compiled.diagnostics?.length) throw new Error('Original TS oracle transpilation failed');
    const exports = {};
    const script = new Script(compiled.outputText, { filename: SHARED_PATH });
    script.runInNewContext(
        {
            exports,
            require(name) {
                if (name !== 'zod') throw new Error(`Oracle import denied: ${name}`);
                return require('zod');
            }
        },
        { timeout: 5000 }
    );
    const oracle = JSON.parse(JSON.stringify(exports.__r1bOracle));
    for (const declaration of declarations) jsonEqual(declaration.value, oracle.data[declaration.name], `${declaration.name}: Static export differs from original TS execution`);
    occurrences.forEach((item, index) => jsonEqual(item.values, oracle.enumArguments[index], `${item.id}: Original enum expression differs`));
    for (const occurrence of occurrences.filter((item) => item.topLevel)) jsonEqual(occurrence.values, oracle.topEnums[occurrence.owner], `${occurrence.owner}: Actual Zod options differ`);
    return { dataDeclarationsCompared: declarations.length, enumArgumentsCompared: occurrences.length, actualTopLevelZodEnumsCompared: Object.keys(oracle.topEnums).length, importAllowlist: ['zod'] };
}

function compareR0(analysis, r0) {
    const current = analysis.declarations.filter((item) => item.r0Kind).map((item) => ({ name: item.name, path: item.path, line: item.line, kind: item.r0Kind, value: item.value, sha256: item.valueSha256 }));
    jsonEqual(current, r0.sharedSsot.constants, 'R0 455 snapshot witness differs from current SSOT');
    const occurrences = analysis.occurrences.map((item) => ({
        name: item.owner,
        schemaId: item.schemaId,
        path: item.path,
        line: item.line,
        topLevelEnum: item.topLevel,
        expression: item.expression,
        values: item.values,
        openApiValues: item.openApiValues,
        comparison: item.comparison
    }));
    jsonEqual(occurrences, r0.sharedSsot.enumSchemas, 'R0 224 z.enum witness differs from current SSOT');
    return { path: R0_PATH, constantsCompared: current.length, enumOccurrencesCompared: occurrences.length, result: 'exact-payload-and-order' };
}

export function buildManifest({ root = ROOT, sourceTexts = null, guard = true } = {}) {
    if (guard) assertSourceGuard(root);
    const texts = Object.fromEntries(SOURCE_PATHS.map((path) => [path, normalizeText(sourceTexts?.[path] ?? read(root, path))]));
    const spec = JSON.parse(texts[SPEC_PATH]);
    const analysis = analyzeShared(texts[SHARED_PATH], spec);
    const oracle = runtimeOracle(analysis);
    const r0Witness = compareR0(analysis, JSON.parse(texts[R0_PATH]));
    const backend = [...authConstants(texts[ENTITY_PATH], ENTITY_PATH, ['AuthSessionStatusValue', 'AuthSessionRevokedReasonValue']), ...authConstants(texts[SERVICE_PATH], SERVICE_PATH, ['AuthSessionErrorCodeValue'])];
    const families = [...analysis.families, ...backend.map((item) => item.family)];
    unique(
        families.flatMap((item) => [item.name, ...item.aliases.filter((alias) => alias !== item.name)]),
        'Duplicate generated Rust type or alias name across shared/backend inputs'
    );
    const manifest = {
        formatVersion: 1,
        authority: {
            sourceHead: SOURCE_HEAD,
            rule: 'TypeScript is the sole editable authority. This manifest and Rust files are one-way generated outputs; R0 is a comparison witness only.',
            textNormalization: {
                encoding: 'UTF-8',
                rule: "text.replace(/\\r\\n/g, '\\n')",
                preserves: ['BOM', 'bare CR', 'Unicode', 'decoded string values'],
                hashes: 'SHA-256 of normalized UTF-8 text; value hashes use JSON.stringify of decoded values'
            },
            sourceInputs: SOURCE_PATHS.map((path) => ({ path, normalizedUtf8Bytes: Buffer.byteLength(texts[path], 'utf8'), normalizedTextSha256: sha256(texts[path]) })),
            generator: { path: GENERATOR_PATH, normalizedTextSha256: sha256(read(root, GENERATOR_PATH)) },
            runtime: { nodeCompatibility: '24.x', typescript: ts.version, zod: zodVersion }
        },
        coverage: {
            sharedTopLevelVariables: analysis.input.constants.size,
            sharedClassifiedDataDeclarations: analysis.declarations.length,
            sharedSchemaDeclarations: analysis.schemaDeclarations.length,
            explicitSchemaShapeExclusions: analysis.excludedDeclarations.length,
            sharedDataKinds: sortedCounts(analysis.declarations, (item) => item.kind),
            r0SnapshotCount: analysis.declarations.filter((item) => item.r0Kind).length,
            r0SnapshotsWithCompleteRustMappings: analysis.declarations.filter((item) => item.r0Kind && item.rustMappings.some((mapping) => mapping.wireRelation === 'exact-values-and-order')).length,
            r0SnapshotKinds: sortedCounts(
                analysis.declarations.filter((item) => item.r0Kind),
                (item) => item.r0Kind
            ),
            helperDerivedMetadata: analysis.declarations.filter((item) => METADATA_HELPERS.has(item.helper)).length,
            permissionKeys: analysis.declarations.find((item) => item.name === 'PERMISSION_KEYS').value.length,
            zEnumOccurrences: analysis.occurrences.length,
            topLevelZEnums: analysis.occurrences.filter((item) => item.topLevel).length,
            nestedZEnums: analysis.occurrences.filter((item) => !item.topLevel).length,
            openApiVisibleTopLevelEnums: analysis.occurrences.filter((item) => item.openApiValues).length,
            unpublishedTopLevelEnums: analysis.occurrences.filter((item) => item.topLevel && !item.openApiValues).length,
            sharedEnumFamilies: analysis.families.length,
            backendAuthEnumFamilies: backend.length,
            generatedEnumFamilies: families.length,
            generatedEnumValues: families.reduce((total, item) => total + item.values.length, 0),
            completenessRule: 'Every top-level shared variable is classified; unknown statements/data expressions/helpers/candidates fail. Families retain source-symbol identity, never merge by equal values.'
        },
        helpers: analysis.input.functions,
        originalTsExecution: oracle,
        r0Witness,
        declarations: analysis.declarations,
        backendAuthDeclarations: backend.map((item) => item.declaration),
        schemaDeclarations: analysis.schemaDeclarations,
        excludedDeclarations: analysis.excludedDeclarations,
        enumOccurrences: analysis.occurrences,
        enums: families
    };
    jsonEqual(
        [manifest.coverage.sharedTopLevelVariables, manifest.coverage.sharedClassifiedDataDeclarations, manifest.coverage.r0SnapshotCount, manifest.coverage.zEnumOccurrences, manifest.coverage.generatedEnumFamilies],
        [1302, 665, 455, 224, 205],
        'Reviewed R1B coverage changed; explicitly review new candidates and update the coverage baseline'
    );
    return manifest;
}

export function rustString(text) {
    let result = '"';
    for (const character of text) {
        const code = character.codePointAt(0);
        if (code >= 0xd800 && code <= 0xdfff) throw new Error('Unpaired surrogate cannot be represented in Rust UTF-8');
        if (character === '"' || character === '\\') result += `\\${character}`;
        else if (character === '\n') result += '\\n';
        else if (character === '\r') result += '\\r';
        else if (character === '\t') result += '\\t';
        else if (code < 0x20 || code === 0x7f) result += `\\u{${code.toString(16)}}`;
        else result += character;
    }
    return `${result}"`;
}

export function renderRust(manifest) {
    const lines = [
        '// @generated by tools/rust-r1b/export-shared.mjs; edit the TypeScript SSOT.',
        '// The complete neutral manifest includes declaration/occurrence/source provenance.',
        '#[rustfmt::skip]',
        'mod generated_values {',
        '    #[derive(Debug, Clone, Copy, PartialEq, Eq)]',
        "    pub struct UnknownEnumValue { pub enum_name: &'static str }",
        '    impl std::fmt::Display for UnknownEnumValue {',
        '        fn fmt(&self, f: &mut std::fmt::Formatter<\'_>) -> std::fmt::Result { write!(f, "unsupported value for {}", self.enum_name) }',
        '    }',
        '    impl std::error::Error for UnknownEnumValue {}'
    ];
    for (const item of manifest.enums) {
        lines.push(
            '',
            `    /// Source: ${item.source.path}:${item.source.line}; ${item.sourceSymbol ?? item.origin}.`,
            '    #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize, utoipa::ToSchema)]',
            `    pub enum ${item.name} {`
        );
        for (const variant of item.variants) lines.push(`        #[serde(rename = ${rustString(variant.wire)})]`, `        ${variant.name},`);
        lines.push(
            '    }',
            `    impl ${item.name} {`,
            `        pub const ALL: &'static [Self] = &[${item.variants.map((variant) => `Self::${variant.name}`).join(', ')}];`,
            "        pub const fn as_str(self) -> &'static str {",
            '            match self {'
        );
        for (const variant of item.variants) lines.push(`                Self::${variant.name} => ${rustString(variant.wire)},`);
        lines.push(
            '            }',
            '        }',
            '    }',
            `    impl AsRef<str> for ${item.name} { fn as_ref(&self) -> &str { self.as_str() } }`,
            `    impl std::str::FromStr for ${item.name} {`,
            '        type Err = UnknownEnumValue;',
            '        fn from_str(value: &str) -> Result<Self, Self::Err> {',
            '            match value {'
        );
        for (const variant of item.variants) lines.push(`                ${rustString(variant.wire)} => Ok(Self::${variant.name}),`);
        lines.push(`                _ => Err(UnknownEnumValue { enum_name: ${rustString(item.name)} }),`, '            }', '        }', '    }');
        for (const alias of item.aliases.filter((alias) => alias !== item.name)) lines.push(`    /// TS alias proven to use the same source array as ${item.name}; no independent schema identity.`, `    pub type ${alias} = ${item.name};`);
    }
    lines.push(
        '}',
        'pub use generated_values::*;',
        '',
        '/// Generated metadata and provenance; the TypeScript source retains editing authority.',
        'pub const MANIFEST_JSON: &str = include_str!("../../../../tools/rust-r1b/shared-manifest.json");',
        '',
        'pub fn manifest() -> serde_json::Result<serde_json::Value> {',
        '    serde_json::from_str(MANIFEST_JSON)',
        '}',
        ''
    );
    return lines.join('\n');
}

export function renderRustTests(manifest) {
    const lines = [
        '// @generated by tools/rust-r1b/export-shared.mjs; compare actual Rust behavior to the neutral manifest.',
        '#[rustfmt::skip]',
        'mod generated_tests {',
        'use poms_api_rust::shared::generated::*;',
        'use serde::{Serialize, de::DeserializeOwned};',
        'use serde_json::Value;',
        'use std::{error::Error, fmt::Debug, str::FromStr};',
        '',
        'fn verify_enum<T>(manifest: &Value, name: &str, all: &[T]) -> Result<(), Box<dyn Error>>',
        'where',
        '    T: Copy + Debug + Eq + Serialize + DeserializeOwned + FromStr + AsRef<str> + utoipa::PartialSchema,',
        '    <T as FromStr>::Err: Debug,',
        '{',
        '    let definition = manifest["enums"].as_array().ok_or("missing enums")?.iter().find(|item| item["name"] == name).ok_or("missing enum definition")?;',
        '    let expected = definition["values"].as_array().ok_or("missing enum values")?;',
        '    assert_eq!(all.len(), expected.len(), "{name}: ALL cardinality");',
        '    for (index, actual) in all.iter().enumerate() {',
        '        let wire = expected[index].as_str().ok_or("non-string enum value")?;',
        '        assert_eq!(actual.as_ref(), wire, "{name}: wire order");',
        '        assert_eq!(serde_json::to_value(actual)?, expected[index], "{name}: Serde wire");',
        '        assert_eq!(serde_json::from_value::<T>(expected[index].clone())?, *actual, "{name}: Serde round trip");',
        '        assert_eq!(wire.parse::<T>().map_err(|_| "known FromStr rejected")?, *actual, "{name}: FromStr");',
        '    }',
        '    assert!("__poms_r1b_unknown__".parse::<T>().is_err(), "{name}: unknown FromStr");',
        '    assert!(serde_json::from_value::<T>(Value::String("__poms_r1b_unknown__".into())).is_err(), "{name}: unknown Serde");',
        '    for invalid in [Value::Null, Value::Bool(false), Value::from(0), serde_json::json!([]), serde_json::json!({})] {',
        '        assert!(serde_json::from_value::<T>(invalid).is_err(), "{name}: non-string Serde");',
        '    }',
        '    let schema = serde_json::to_value(T::schema())?;',
        '    assert_eq!(schema["type"], "string", "{name}: schema type");',
        '    assert_eq!(schema["enum"], definition["values"], "{name}: actual ToSchema values/order");',
        '    Ok(())',
        '}',
        '',
        '#[test]',
        '#[rustfmt::skip]',
        'fn all_generated_enums_match_manifest_and_openapi_values() -> Result<(), Box<dyn Error>> {',
        '    let manifest = manifest()?;',
        `    assert_eq!(manifest["coverage"]["generatedEnumFamilies"], ${manifest.enums.length});`
    ];
    for (const item of manifest.enums) lines.push(`    verify_enum::<${item.name}>(&manifest, ${rustString(item.name)}, ${item.name}::ALL)?;`);
    lines.push(
        '    for occurrence in manifest["enumOccurrences"].as_array().ok_or("missing occurrences")? {',
        '        let family = manifest["enums"].as_array().ok_or("missing enums")?.iter().find(|item| item["name"] == occurrence["family"]).ok_or("unmapped occurrence")?;',
        '        assert_eq!(family["values"], occurrence["values"], "every z.enum maps to actual tested Rust family");',
        '        if !occurrence["openApiValues"].is_null() { assert_eq!(family["values"], occurrence["openApiValues"], "OpenAPI-visible values/order"); }',
        '    }',
        '    Ok(())',
        '}',
        '}',
        ''
    );
    return lines.join('\n');
}

export function artifacts(manifest) {
    return new Map([
        [MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`],
        [RUST_PATH, renderRust(manifest)],
        [TEST_PATH, renderRustTests(manifest)]
    ]);
}

export function checkArtifacts(expected, root = ROOT) {
    for (const [path, text] of expected) {
        let actual;
        try {
            actual = read(root, path);
        } catch {
            throw new Error(`Missing generated artifact: ${path}; run --write explicitly`);
        }
        if (actual !== text) throw new Error(`Stale or modified generated artifact: ${path}; edit TS authority and regenerate explicitly`);
    }
}

export function main(args = process.argv.slice(2), root = ROOT) {
    if (args.length !== 1 || !['--write', '--check'].includes(args[0])) throw new Error('Usage: node tools/rust-r1b/export-shared.mjs --write|--check');
    const manifest = buildManifest({ root });
    const outputs = artifacts(manifest);
    if (args[0] === '--write')
        for (const [path, text] of outputs) {
            mkdirSync(dirname(resolve(root, path)), { recursive: true });
            writeFileSync(resolve(root, path), text, 'utf8');
        }
    else checkArtifacts(outputs, root);
    console.log(JSON.stringify({ mode: args[0], actualNodeVersion: process.versions.node, coverage: manifest.coverage, artifacts: [...outputs].map(([path, text]) => ({ path, normalizedTextSha256: sha256(text) })) }, null, 2));
    return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
