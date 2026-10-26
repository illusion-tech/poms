import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { Script } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const zod = require('zod');
require('reflect-metadata');
const { Injectable } = require('@nestjs/common');

export const normalizeText = (text) => text.replace(/\r\n/g, '\n');
export const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const clone = (value) => JSON.parse(JSON.stringify(value));
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = ['id', 'key', 'type', 'title', 'subtitle', 'link', 'icon', 'displayOrder', 'isHidden', 'isDisabled', 'requiredPermissions', 'meta', 'children'];

function sourceFile(text, file) {
    const source = ts.createSourceFile(file, normalizeText(text), ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0, `Invalid original TypeScript: ${file}`);
    return source;
}

function execute(text, file, dependencies) {
    const compiled = ts.transpileModule(normalizeText(text), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true, emitDecoratorMetadata: false, newLine: ts.NewLineKind.LineFeed }
    }).outputText;
    const exports = {};
    const context = {
        module: { exports },
        exports,
        require(name) {
            if (!Object.hasOwn(dependencies, name)) throw new Error(`Original-source import is not reviewed: ${name}`);
            return dependencies[name];
        }
    };
    new Script(compiled, { filename: file }).runInNewContext(context, { timeout: 2000 });
    return { exports: context.module.exports, context };
}

export function executeShared(text, file = 'libs/shared/contracts/src/lib/shared-contracts.ts') {
    const source = sourceFile(text, file);
    for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement)) {
            assert.equal(statement.moduleSpecifier.text, 'zod', 'Unknown transitive shared import');
            assert.equal(statement.importClause?.namedBindings?.getText(source), '{ z }', 'Unknown shared Zod import shape');
        }
    }
    return execute(text, file, { zod }).exports;
}

function unwrap(node) {
    while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node)) node = node.expression;
    return node;
}

function requireScalarString(value) {
    for (let index = 0; index < value.length; index++) {
        const unit = value.charCodeAt(index);
        if (unit >= 0xd800 && unit <= 0xdbff) {
            const next = value.charCodeAt(++index);
            assert(next >= 0xdc00 && next <= 0xdfff, 'Navigation authority contains an unsupported lone UTF-16 surrogate');
        } else assert(!(unit >= 0xdc00 && unit <= 0xdfff), 'Navigation authority contains an unsupported lone UTF-16 surrogate');
    }
    return value;
}

export function extractTree(text, shared, file = 'apps/poms-api/src/app/features/navigation/navigation.constants.ts') {
    const source = sourceFile(text, file);
    let declaration;
    for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement)) {
            assert.equal(statement.moduleSpecifier.text, '@poms/shared-contracts', 'Unknown navigation authority import');
            const bindings = statement.importClause?.namedBindings;
            assert(bindings && ts.isNamedImports(bindings), 'Unknown navigation import shape');
            for (const element of bindings.elements) {
                assert(!element.propertyName && (element.isTypeOnly ? element.name.text === 'NavigationItem' : element.name.text === 'NavigationItemTypeValue'), 'Unknown navigation import candidate');
            }
            continue;
        }
        assert(ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.Const, 'Unknown navigation top-level candidate/helper');
        assert.equal(statement.declarationList.declarations.length, 1, 'Unknown extra navigation declaration');
        const candidate = statement.declarationList.declarations[0];
        assert(ts.isIdentifier(candidate.name) && candidate.name.text === 'NAVIGATION_TREE' && candidate.initializer, 'Unknown navigation data candidate');
        assert.equal(declaration, undefined, 'Duplicate NAVIGATION_TREE declaration');
        declaration = candidate;
    }
    assert(declaration, 'Missing NAVIGATION_TREE authority');
    function evaluate(input) {
        const node = unwrap(input);
        if (ts.isStringLiteralLike(node)) return requireScalarString(node.text);
        if (ts.isNumericLiteral(node)) {
            const number = Number(node.text);
            assert(Number.isFinite(number), 'Non-finite navigation number');
            return number;
        }
        if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return -Number(node.operand.text);
        if (node.kind === ts.SyntaxKind.NullKeyword) return null;
        if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
        if (ts.isArrayLiteralExpression(node)) return node.elements.map(evaluate);
        if (ts.isObjectLiteralExpression(node)) {
            const result = Object.create(null);
            for (const property of node.properties) {
                assert(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)), 'Unknown navigation property/helper/spread');
                const key = property.name.text;
                assert(key !== '__proto__' && !Object.hasOwn(result, key), 'Duplicate or prototype navigation property');
                result[key] = evaluate(property.initializer);
            }
            return result;
        }
        if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'NavigationItemTypeValue') {
            assert(Object.hasOwn(shared.NavigationItemTypeValue, node.name.text), 'Unknown navigation enum member');
            return shared.NavigationItemTypeValue[node.name.text];
        }
        throw new Error(`Unknown navigation expression/helper: ${ts.SyntaxKind[node.kind]} at ${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`);
    }
    const tree = clone(evaluate(declaration.initializer));
    validateTree(tree, shared);
    const original = execute(text, file, { '@poms/shared-contracts': shared }).exports.NAVIGATION_TREE;
    assert.deepEqual(tree, clone(original), 'AST tree differs from actual original module execution');
    return tree;
}

export function validateTree(tree, shared) {
    assert(Array.isArray(tree), 'Navigation tree must be an array');
    for (const item of tree) {
        assert(record(item), 'Navigation item must be an object');
        assert.deepEqual(Object.keys(item).sort(), [...fields].sort(), 'Unknown/missing navigation fields');
        assert(Number.isSafeInteger(item.displayOrder), 'Navigation order must be a safe integer');
        if (item.children !== null) validateTree(item.children, shared);
        // Parsing checks the actual original recursive Zod schema. Compare
        // before/after as well: unknown fields may not disappear via stripping.
        assert.deepEqual(clone(shared.NavigationItemSchema.parse(item)), item, 'Original navigation schema changed input');
    }
}

export function originalService(text, tree, file = 'apps/poms-api/src/app/features/navigation/navigation.service.ts') {
    const source = sourceFile(text, file);
    for (const statement of source.statements) assert(ts.isImportDeclaration(statement) || ts.isClassDeclaration(statement), 'Unknown navigation top-level helper/candidate');
    const classes = source.statements.filter(ts.isClassDeclaration);
    assert.equal(classes.length, 1, 'Unknown additional navigation class/helper');
    assert.equal(classes[0].name?.text, 'NavigationService');
    assert(classes[0].members.every(ts.isMethodDeclaration), 'Unknown navigation member/helper');
    assert.deepEqual(
        classes[0].members.filter(ts.isMethodDeclaration).map((method) => method.name.getText(source)),
        ['getNavigationForUser', 'getAllNavigationItems', 'getNavigationAuditSnapshot', '#filterTree', '#flattenTree'],
        'Unknown navigation method/helper'
    );
    const { exports, context } = execute(text, file, { 'node:crypto': { createHash }, '@nestjs/common': { Injectable }, './navigation.constants': { NAVIGATION_TREE: clone(tree) } });
    context.service = new exports.NavigationService();
    function invoke(method, args) {
        context.args = args;
        new Script(`observed = service.${method}(...args)`, { filename: `${file}:${method}` }).runInNewContext(context, { timeout: 2000 });
        return clone(context.observed);
    }
    return { filtered: (permissions) => invoke('getNavigationForUser', [permissions]), full: () => invoke('getAllNavigationItems', []), snapshot: () => invoke('getNavigationAuditSnapshot', []) };
}

export function goldenCases(serviceText, tree, shared) {
    const cases = [];
    const add = (name, data, permissions, synthetic = false, full = false) => {
        validateTree(data, shared);
        const original = originalService(serviceText, data);
        const before = JSON.stringify(data);
        const nativeBefore = original.full();
        const observed = full ? { fullTree: original.full(), snapshot: original.snapshot() } : { navigation: original.filtered(permissions) };
        assert.equal(JSON.stringify(data), before, 'Original method mutated its authority input');
        assert.deepEqual(original.full(), nativeBefore, 'Original method mutated its module authority');
        if (full) shared.NavigationSyncSummarySchema.parse(observed.snapshot);
        cases.push({ name, kind: full ? 'full-and-snapshot' : 'filtered', synthetic, tree: synthetic ? data : 'ssot', permissions, observed });
    };
    add('authority-full-tree-and-snapshot', tree, [], false, true);
    add('authority-no-permissions', tree, []);
    add('authority-all-permissions', tree, [...shared.PERMISSION_KEYS]);
    for (const permission of shared.PERMISSION_KEYS) add(`authority-single:${permission}`, tree, [permission]);
    add('authority-AND-both', tree, ['platform:org-units:manage', 'platform:org-sync:manage']);
    add('authority-shell-org', tree, ['nav:dashboard:view', 'platform:org-units:manage']);
    add('authority-shell-org-and-sync', tree, ['nav:dashboard:view', 'platform:org-units:manage', 'platform:org-sync:manage']);
    add('authority-duplicate-and-unknown-raw-permissions', tree, ['nav:projects:view', 'nav:projects:view', 'future:unrecognized']);
    const node = (key, extra = {}) => ({
        id: `id-${key}`,
        key,
        type: 'basic',
        title: key,
        subtitle: null,
        link: '/example',
        icon: null,
        displayOrder: 0,
        isHidden: false,
        isDisabled: false,
        requiredPermissions: null,
        meta: null,
        children: null,
        ...extra
    });
    const visibility = [
        node('visible'),
        node('hidden', { isHidden: true }),
        node('disabled', { isDisabled: true }),
        node('empty-group', { type: 'group', children: [] }),
        node('all-hidden-group', { type: 'group', children: [node('hidden-child', { isHidden: true })] }),
        node('all-hidden-basic', { children: [node('hidden-basic-child', { isHidden: true })] }),
        node('all-hidden-collapsable', { type: 'collapsable', children: [node('hidden-collapsable-child', { isHidden: true })] })
    ];
    add('synthetic-hidden-disabled-and-original-empty-children', visibility, [], true);
    const sorting = [node('tie-b'), node('negative', { displayOrder: -1 }), node('tie-a'), node('nested', { type: 'group', displayOrder: 1, children: [node('nested-b'), node('nested-a'), node('nested-negative', { displayOrder: -2 })] })];
    add('synthetic-stable-order-at-every-level', sorting, [], true);
    const and = [node('null-permissions'), node('empty-permissions', { requiredPermissions: [] }), node('and-node', { requiredPermissions: ['project:read', 'lead:read'] })];
    add('synthetic-AND-one-of-two', and, ['project:read', 'future:unrecognized'], true);
    add('synthetic-AND-two-of-two', and, ['project:read', 'lead:read'], true);
    add('synthetic-null-empty-meta-and-divider', [node('null'), node('empty', { children: [], meta: {} }), node('divider', { type: 'divider', title: null, link: null, meta: { public: [true, null, '中文'] } })], [], true);
    const checksum = [node('repeat', { isHidden: true, link: '' }), node('repeat', { id: 'repeat-2', link: ' ' }), node('键😀', { link: '/中文?quoted="\\\n', isDisabled: true, children: [node('child', { link: null })] })];
    add('synthetic-unfiltered-preorder-duplicates-unicode-checksum', checksum, [], true, true);
    return cases;
}

export function extractOpenApi(spec) {
    const paths = ['/api/me/navigation', '/api/platform/navigation', '/api/platform/navigation:sync'];
    const methods = ['get', 'get', 'post'];
    const selected = {};
    const components = {};
    const seen = new Set();
    function collect(value) {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            value.forEach(collect);
            return;
        }
        if (typeof value.$ref === 'string') {
            assert(value.$ref.startsWith('#/components/'), `Unreviewed nonlocal OpenAPI reference ${value.$ref}`);
            if (!seen.has(value.$ref)) {
                seen.add(value.$ref);
                const [group, encoded, ...rest] = value.$ref.slice('#/components/'.length).split('/');
                assert.equal(rest.length, 0, 'Unsupported component sub-pointer');
                const name = encoded?.replace(/~1/g, '/').replace(/~0/g, '~');
                const target = spec.components?.[group]?.[name];
                assert(target, `Missing OpenAPI reference ${value.$ref}`);
                (components[group] ??= {})[name] = clone(target);
                collect(target);
            }
        }
        Object.values(value).forEach(collect);
    }
    for (let index = 0; index < paths.length; index++) {
        const operation = spec.paths[paths[index]]?.[methods[index]];
        assert(operation, `Missing existing navigation operation ${paths[index]}`);
        selected[paths[index]] = { [methods[index]]: clone(operation) };
        collect(operation);
    }
    if (spec.components?.securitySchemes) components.securitySchemes = clone(spec.components.securitySchemes);
    const result = { openapi: spec.openapi, info: clone(spec.info), paths: selected, components };
    if (spec.security !== undefined) result.security = clone(spec.security);
    return result;
}
