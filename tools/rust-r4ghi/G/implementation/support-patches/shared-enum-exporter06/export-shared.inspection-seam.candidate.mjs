import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { analyzeRegisteredGraph } from './registered-module-graph.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const zodVersion = require('zod/package.json').version;
if (process.versions.node.split('.')[0] !== '24' || ts.version !== '6.0.3' || zodVersion !== '4.6.1') {
    throw new Error(`R1B exporter requires Node 24.x, TypeScript 6.0.3 and Zod 4.6.1; found Node ${process.versions.node}, TypeScript ${ts.version}, Zod ${zodVersion}`);
}
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SOURCE_HEAD = '4f78bd486ca2118e4700bae560cb25ff08c4b47d';
export const SHARED_PATH = 'libs/shared/contracts/src/lib/shared-contracts.ts';
export const CANONICAL_SHARED_PATH = 'libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts';
export const MODULE_REGISTRY_PATH = 'tools/rust-r1b/current-module-registry.json';
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
export const SOURCE_SCOPE = ['.gitattributes', ':(glob)libs/shared/contracts/src/**/*.ts', MODULE_REGISTRY_PATH, SPEC_PATH, ENTITY_PATH, SERVICE_PATH, R0_PATH];
const SOURCE_PATHS = ['.gitattributes', 'libs/shared/contracts/src/index.ts', SHARED_PATH, CANONICAL_SHARED_PATH, MODULE_REGISTRY_PATH, SPEC_PATH, ENTITY_PATH, SERVICE_PATH, R0_PATH];
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
    assertOperatingSnapshotBaselineSelection: '8e8e469ac46fb27c6f28ba7d9251c8e989a93661ad8028b9100d857d2375f456',
    isR4ScaledDecimal: '91181096c5c8cc938bd1e3cdc4a99bb987a2480ab551e3cf7f2510abb0c70d27'
});
// R0 is immutable historical evidence. Only CRLF normalization is permitted;
// never refresh that file to make current source look like the old inventory.
export const HISTORICAL_R0 = Object.freeze({
    normalizedTextSha256: '3d126e07d5abf2c56f41c35fc25b78a13dbe094450b470e8bb4c950ce8a2986c',
    constants: 455,
    enumOccurrences: 224
});
// Hash-only tool review metadata, not another wire-value authority. The values
// are still extracted from, and independently executed from, original TS+Zod.
export const REVIEWED_R4_ADDITIONS = Object.freeze({
    sourceHead: '4f78bd486ca2118e4700bae560cb25ff08c4b47d',
    g1Commit: '2f613c312c9e41b3ed5ac59edf5e9db63842c1cb',
    declarationAuthority: 'docs/design/rust-r4abc-first37-baseline.md + fixed reviewed S3 source',
    constants: Object.freeze([
        Object.freeze({
            name: 'CONTRACT_TERM_PREPARATION_STATUSES',
            path: SHARED_PATH,
            kind: 'string-array',
            declarationSha256: '14d75307e70625f4c0719a59a587f19b429b4e6f954b28c6bba124316073404b',
            payloadSha256: 'e48112a1b4ec063b48ffb957cf16afd84d7038902d717c57650c06164d5d6def',
            valueSha256: '2115923a4ec54e3f67b7e1a4796856995ddbb40e14262782673c27129bfbcbde'
        })
    ]),
    enumOccurrences: Object.freeze([
        Object.freeze({
            owner: 'ContractTermPreparationStatusSchema', schemaId: 'ContractTermPreparationStatus', path: SHARED_PATH,
            propertyPath: Object.freeze([]), topLevel: true, sourceArray: 'CONTRACT_TERM_PREPARATION_STATUSES',
            declarationSha256: '9a0b16650231db7f031dd670dd40db9354209d38a5c29f3d72ab49f749684049',
            payloadSha256: 'b04080246bbbe9e194863495fe129d0dfd7a307dfd533b729bb33a27e60a8dea',
            expressionSha256: '561e9005c4f602e353f8c1b85e8def43fa4866ed2708e1fac516159ca685a0dd',
            valuesSha256: '2115923a4ec54e3f67b7e1a4796856995ddbb40e14262782673c27129bfbcbde'
        }),
        Object.freeze({
            owner: 'ReadinessInitializationResultSchema', schemaId: 'ReadinessInitializationResult', path: SHARED_PATH,
            propertyPath: Object.freeze(['targetType']), topLevel: false, sourceArray: null,
            declarationSha256: '2492ab661e8aeb2b31a87fb51ed071f1f42eed552edab4106aed3aacbccf1c3a',
            payloadSha256: '27c4a02b9b9c79ef059430b1a21ed23115b7ea3795fda9827331e84f63e427ea',
            expressionSha256: '8cc7a1f66bbd76427c08b1cb3a889af05ec87b530e003ab0ef19aec7e25c8790',
            valuesSha256: 'b7f0f6eb8386f413f5fe9e21c5030e8063f04e6246b658b69c8f7e1332954b70'
        }),
        Object.freeze({
            owner: 'ReadinessInitializationResultSchema', schemaId: 'ReadinessInitializationResult', path: SHARED_PATH,
            propertyPath: Object.freeze(['resultStatus']), topLevel: false, sourceArray: null,
            declarationSha256: '2492ab661e8aeb2b31a87fb51ed071f1f42eed552edab4106aed3aacbccf1c3a',
            payloadSha256: 'b35eb795442a11bd3e8f9b07a074a58a20c7c9ef35b755b5c5d9bcfc22ea4971',
            expressionSha256: 'b51064e48459e6adf6d99eaab37fc7ba5d38870848d56ad8ca01074653530607',
            valuesSha256: '40f4c6e02050480aeb51ef5014c13d53322957455c910ef500de0d60f2134fdc'
        }),
        Object.freeze({
            owner: 'ReadinessInitializationResultSchema', schemaId: 'ReadinessInitializationResult', path: SHARED_PATH,
            propertyPath: Object.freeze(['businessStatusAfter']), topLevel: false, sourceArray: null,
            declarationSha256: '2492ab661e8aeb2b31a87fb51ed071f1f42eed552edab4106aed3aacbccf1c3a',
            payloadSha256: 'b710f5d50060dde2174ec4b087e06a327205aea9beb2ab8ee73cc185ee633dc8',
            expressionSha256: '6a558cdc1a6a7ed169954a9ceb32e0c4b4ef822f71795b9fef5e977bea246193',
            valuesSha256: '32a1f43dafb5f7e56231161fe1920c58862a0fdae05e8056b2cc1d839f15e179'
        })
    ])
});
// These exact S3 schemas contain non-enum callbacks (decimal capacity, UUID
// uniqueness and receipt identity). Unknown or changed callbacks are not
// admitted. A callback can never hide a z.enum occurrence from the inventory.
const REVIEWED_R4_REFINEMENTS = Object.freeze({
    R4PositiveMoneyStringSchema: '3cf02fe20c3dfd0c2091edb349d0e1555c0fa775f4984f06f6a252b832f1772e',
    R4NonnegativeMoneyStringSchema: 'a921d2ccfe9350b8f73aed43f8250365ac8ef33f50b1902e5742997ca3e2dd81',
    R4RatioStringSchema: '3166000098dad8d0fe6d94efcc9e5aaa7f53cc1507103c87c77fd158c29bcc13',
    CreateCommercialReleaseBaselineRequestSchema: 'e5536fb334545802f9de20be6c962537cf70f7307bf642c951222cfecbe98882',
    ReadinessInitializationResultSchema: '2492ab661e8aeb2b31a87fb51ed071f1f42eed552edab4106aed3aacbccf1c3a'
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

function validateSchema(node, input, owner) {
    const callbacks = new Set();
    const reviewed = REVIEWED_R4_REFINEMENTS[owner];
    if (reviewed) {
        const declaration = input.constants.get(owner);
        if (!declaration || sha256(declaration.getText(input.sf)) !== reviewed) failAt(node, input.sf, `Changed reviewed R4 schema refinement declaration ${owner}`);
        visit(node, (item) => {
            if (!ts.isCallExpression(item) || !ts.isPropertyAccessExpression(item.expression) || !['refine', 'superRefine'].includes(item.expression.name.text)) return;
            const callback = unwrap(item.arguments[0]);
            if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) failAt(item, input.sf, 'Unsupported reviewed refinement callback');
            visit(callback, (child) => {
                if (ts.isCallExpression(child) && child.expression.getText(input.sf) === 'z.enum') failAt(child, input.sf, 'A reviewed non-enum refinement cannot contain z.enum');
            });
            callbacks.add(callback);
        });
        if (!callbacks.size) failAt(node, input.sf, `Missing reviewed R4 refinement callback ${owner}`);
    }
    visit(node, (item) => {
        if (!ts.isCallExpression(item)) return;
        for (let parent = item; parent && parent !== node; parent = parent.parent) if (callbacks.has(parent)) return;
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
            validateSchema(initializer, input, name);
            schemaDeclarations.push({ name, ...source(node, input.sf), classification: 'zod-schema', enumOccurrenceIds: [] });
            continue;
        }
        if (name === 'CommissionSharedEvidencePackageShape') {
            if (!ts.isObjectLiteralExpression(initializer)) failAt(node, input.sf, 'Schema shape must remain an object');
            validateSchema(initializer, input, name);
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

const withoutSourceLine = (item) => Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'line'));
const constantWitness = (item) => ({ name: item.name, path: item.path, line: item.line, kind: item.r0Kind, value: item.value, sha256: item.valueSha256 });
const enumWitness = (item) => ({
    name: item.owner, schemaId: item.schemaId, path: item.path, line: item.line,
    topLevelEnum: item.topLevel, expression: item.expression, values: item.values,
    openApiValues: item.openApiValues, comparison: item.comparison
});
const enumReviewKey = (item) => JSON.stringify([item.owner, item.schemaId, item.path, item.topLevel, item.propertyPath, item.sourceArray]);

function reviewedDeclarationHash(analysis, owner) {
    const declaration = analysis.input.constants.get(owner);
    if (!declaration) throw new Error(`Missing reviewed source declaration ${owner}`);
    return sha256(declaration.getText(analysis.input.sf));
}

function compareHistoricalRecords(current, historical, count, label) {
    assert.ok(Array.isArray(historical), `${label}: Historical array is required`);
    assert.equal(historical.length, count, `${label}: Historical witness count changed`);
    assert.equal(current.length, count, `${label}: Undeclared addition or missing historical record`);
    for (let index = 0; index < count; index++) {
        // Every other field remains part of the full comparison, in original
        // declaration/occurrence order. Never sort or reduce this to wire sets.
        jsonEqual(withoutSourceLine(current[index]), withoutSourceLine(historical[index]), `${label} #${index} ${historical[index].name}: Historical payload/order drift`);
    }
}

export function compareR0(analysis, r0) {
    assert.equal(SOURCE_HEAD, REVIEWED_R4_ADDITIONS.sourceHead, 'Review metadata must advance with the fixed source reference');
    const historicalConstants = r0.sharedSsot.constants;
    const historicalEnums = r0.sharedSsot.enumSchemas;
    const historicalNames = new Set(historicalConstants.map((item) => item.name));
    unique([...historicalConstants.map((item) => item.name)], 'Duplicate name in historical R0 witness');
    const reviewedConstants = new Map(REVIEWED_R4_ADDITIONS.constants.map((item) => [item.name, item]));
    const reviewedEnums = new Map(REVIEWED_R4_ADDITIONS.enumOccurrences.map((item) => [enumReviewKey(item), item]));
    const legacyConstants = [];
    const addedConstants = [];
    const seenConstants = new Set();
    for (const item of analysis.declarations.filter((item) => item.r0Kind)) {
        if (historicalNames.has(item.name)) {
            legacyConstants.push(item);
            continue;
        }
        const reviewed = reviewedConstants.get(item.name);
        if (!reviewed) throw new Error(`Unreviewed post-R0 constant ${item.name} at ${item.path}:${item.line}`);
        if (seenConstants.has(item.name)) throw new Error(`Duplicate declared R4 constant ${item.name}`);
        seenConstants.add(item.name);
        const declarationSha256 = reviewedDeclarationHash(analysis, item.name);
        const payloadSha256 = sha256(JSON.stringify(withoutSourceLine(constantWitness(item))));
        assert.equal(declarationSha256, reviewed.declarationSha256, `${item.name}: Reviewed declaration changed`);
        assert.equal(item.valueSha256, reviewed.valueSha256, `${item.name}: Reviewed value/order changed`);
        assert.equal(payloadSha256, reviewed.payloadSha256, `${item.name}: Reviewed addition payload changed`);
        addedConstants.push({ name: item.name, path: item.path, line: item.line, column: item.column, kind: item.r0Kind, declarationSha256, valueSha256: item.valueSha256, payloadSha256 });
    }
    jsonEqual(addedConstants.map((item) => item.name), REVIEWED_R4_ADDITIONS.constants.map((item) => item.name), 'Missing or reordered declared R4 constants');
    compareHistoricalRecords(legacyConstants.map(constantWitness), historicalConstants, HISTORICAL_R0.constants, 'R0 constants');

    const legacyEnums = [];
    const addedEnums = [];
    const seenEnums = new Set();
    for (const item of analysis.occurrences) {
        const key = enumReviewKey(item);
        const reviewed = reviewedEnums.get(key);
        if (!reviewed) {
            legacyEnums.push(item);
            continue;
        }
        if (seenEnums.has(key)) throw new Error(`Duplicate declared R4 enum occurrence ${key}`);
        seenEnums.add(key);
        const declarationSha256 = reviewedDeclarationHash(analysis, item.owner);
        const payloadSha256 = sha256(JSON.stringify(withoutSourceLine(enumWitness(item))));
        const expressionSha256 = sha256(item.expression);
        const valuesSha256 = sha256(JSON.stringify(item.values));
        assert.equal(declarationSha256, reviewed.declarationSha256, `${key}: Reviewed owner declaration changed`);
        assert.equal(expressionSha256, reviewed.expressionSha256, `${key}: Reviewed enum expression changed`);
        assert.equal(valuesSha256, reviewed.valuesSha256, `${key}: Reviewed enum values/order changed`);
        assert.equal(payloadSha256, reviewed.payloadSha256, `${key}: Reviewed enum payload changed`);
        addedEnums.push({
            owner: item.owner, schemaId: item.schemaId, path: item.path, line: item.line, column: item.column,
            propertyPath: item.propertyPath, topLevel: item.topLevel, sourceArray: item.sourceArray,
            declarationSha256, expressionSha256, valuesSha256, payloadSha256
        });
    }
    jsonEqual(addedEnums.map(enumReviewKey), REVIEWED_R4_ADDITIONS.enumOccurrences.map(enumReviewKey), 'Missing or reordered declared R4 enum occurrences');
    compareHistoricalRecords(legacyEnums.map(enumWitness), historicalEnums, HISTORICAL_R0.enumOccurrences, 'R0 enum occurrences');
    const constantPositions = legacyConstants.map((item, index) => ({
        historicalIndex: index, name: item.name, path: item.path,
        historicalLine: historicalConstants[index].line, currentLine: item.line, currentColumn: item.column,
        lineChanged: historicalConstants[index].line !== item.line
    }));
    const enumPositions = legacyEnums.map((item, index) => ({
        historicalIndex: index, owner: item.owner, schemaId: item.schemaId, path: item.path,
        propertyPath: item.propertyPath, historicalLine: historicalEnums[index].line,
        currentLine: item.line, currentColumn: item.column, lineChanged: historicalEnums[index].line !== item.line
    }));
    return {
        path: R0_PATH,
        historicalNormalizedTextSha256: HISTORICAL_R0.normalizedTextSha256,
        constantsCompared: HISTORICAL_R0.constants,
        enumOccurrencesCompared: HISTORICAL_R0.enumOccurrences,
        result: 'unchanged-base-payload-and-order-with-declared-r4-additions',
        currentConstants: legacyConstants.length + addedConstants.length,
        currentEnumOccurrences: legacyEnums.length + addedEnums.length,
        provenance: {
            rule: 'Historical source line only is remapped; all base payload fields and record order are unchanged. R0 bytes are never rewritten.',
            constants: { remapped: constantPositions.filter((item) => item.lineChanged).length, positions: constantPositions },
            enumOccurrences: { remapped: enumPositions.filter((item) => item.lineChanged).length, positions: enumPositions }
        },
        declaredAdditions: { sourceHead: REVIEWED_R4_ADDITIONS.sourceHead, g1Commit: REVIEWED_R4_ADDITIONS.g1Commit, constants: addedConstants, enumOccurrences: addedEnums }
    };
}

export function buildManifest({ root = ROOT, sourceTexts = null, guard = true } = {}) {
    if (guard !== true) throw new Error('The source guard cannot be disabled');
    assertSourceGuard(root);
    if (sourceTexts !== null && !record(sourceTexts)) throw new Error('Source text overrides must be a normalization-only object');
    for (const path of Object.keys(sourceTexts ?? {})) if (!SOURCE_PATHS.includes(path)) throw new Error(`Unknown source input override ${path}`);
    const texts = Object.fromEntries(SOURCE_PATHS.map((path) => {
        const reviewed = read(root, path);
        if (sourceTexts !== null && Object.hasOwn(sourceTexts, path)) {
            if (typeof sourceTexts[path] !== 'string' || normalizeText(sourceTexts[path]) !== reviewed) throw new Error(`${path}: Only equivalent CRLF normalization overrides are permitted; edit and review the actual source deliberately`);
        }
        return [path, reviewed];
    }));
    assert.equal(sha256(texts[R0_PATH]), HISTORICAL_R0.normalizedTextSha256, 'Historical R0 original changed; do not refresh the witness');
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
            historicalR0SnapshotCount: r0Witness.constantsCompared,
            declaredPostR0SnapshotCount: r0Witness.declaredAdditions.constants.length,
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
        [1316, 666, 456, 228, 209],
        'Reviewed fixed S3 coverage changed; explicitly review new candidates and their historical witness relationship'
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

// This is an inspection seam, not a replacement of compareR0/buildManifest.
// Root must freeze the exact source reference and independently approve the
// closed registry before use; no CLI/source override disables the original gate.
export function inspectRegisteredModules({ root = ROOT } = {}) {
    assertSourceGuard(root);
    const registry = JSON.parse(read(root, MODULE_REGISTRY_PATH));
    assert.equal(registry.reviewStatus, 'Root-reviewed-module-registry', 'Module registration needs independent review');
    assert.equal(registry.sourceHead, SOURCE_HEAD, 'Module registry and reviewed Git source must match');
    return analyzeRegisteredGraph(root, registry);
}

export function main(args = process.argv.slice(2), root = ROOT) {
    if (args.length === 1 && args[0] === '--inspect-registered-modules') {
        const result = inspectRegisteredModules({ root });
        console.log(JSON.stringify(result, null, 2));
        return result;
    }
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
