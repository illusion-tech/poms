import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import { CONSTANTS_PATH, GOLDEN_PATH, OPENAPI_PATH, ROOT, SERVICE_PATH, SHARED_PATH, SOURCE_HEAD, SOURCE_PATH, SPEC_PATH, TREE_PATH, assertSourceGuard, buildArtifacts, checkArtifacts, main } from './export-navigation.mjs';
import { executeShared, extractOpenApi, extractTree, normalizeText, originalService, sha256 } from './export-navigation.oracle.mjs';

const read = (file) => normalizeText(readFileSync(resolve(ROOT, file), 'utf8'));
const outputs = buildArtifacts();
const source = JSON.parse(outputs.get(SOURCE_PATH));
const golden = JSON.parse(outputs.get(GOLDEN_PATH));
const tree = JSON.parse(outputs.get(TREE_PATH));
const spec = JSON.parse(read(SPEC_PATH));
const shared = executeShared(read(SHARED_PATH));

function temporary(t, prefix) {
    const root = mkdtempSync(resolve(tmpdir(), prefix));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
}

test('all thirteen fields and the complete original tree have one source, including enum references', () => {
    assert.deepEqual(extractTree(read(CONSTANTS_PATH), shared), golden.original.fullTree);
    assert.equal(source.coverage.permissions, 37);
    assert.equal(source.coverage.fieldsPerNode, 13);
    assert.equal(source.coverage.cases, 50);
    assert.equal(source.coverage.syntheticCases, 6);
    const native = originalService(read(SERVICE_PATH), tree);
    assert.deepEqual(native.full(), tree);
    assert.deepEqual(native.snapshot(), golden.original.snapshot);
    assert.equal(golden.original.snapshot.targetId, 'platform-navigation');
    assert.match(golden.original.snapshot.treeChecksum, /^[0-9a-f]{64}$/);
});

test('the actual original TS methods supply every permission and the four real browser expectations', () => {
    for (const permission of shared.PERMISSION_KEYS) assert(golden.original.cases.some((item) => item.id === `authority-single:${permission}`));
    const byId = (id) => golden.original.cases.find((item) => item.id === id);
    assert.deepEqual(byId('authority-no-permissions').expectedTree, []);
    assert.deepEqual(byId('authority-all-permissions').permissions, [...shared.PERMISSION_KEYS]);
    assert.deepEqual(byId('authority-shell-org').permissions, ['nav:dashboard:view', 'platform:org-units:manage']);
    assert.deepEqual(byId('authority-shell-org-and-sync').permissions, ['nav:dashboard:view', 'platform:org-units:manage', 'platform:org-sync:manage']);
    for (const item of golden.original.cases) assert.deepEqual(item.expectedTree, originalService(read(SERVICE_PATH), tree).filtered(item.permissions), item.id);
});

test('synthetic data executes the original hidden/disabled/null/empty/AND/stable-order branches', () => {
    for (const item of golden.cases.filter((item) => item.synthetic)) {
        const native = originalService(read(SERVICE_PATH), item.tree);
        assert.deepEqual(item.observed, item.kind === 'filtered' ? { navigation: native.filtered(item.permissions) } : { fullTree: native.full(), snapshot: native.snapshot() }, item.name);
    }
    const visibility = golden.cases.find((item) => item.name === 'synthetic-hidden-disabled-and-original-empty-children').observed.navigation;
    assert.deepEqual(
        visibility.map((item) => item.key),
        ['visible', 'disabled', 'empty-group', 'all-hidden-basic']
    );
    assert.equal(visibility[1].isDisabled, true);
    assert.deepEqual(visibility[2].children, []);
    assert.equal(visibility[3].children, null);
    const sorted = golden.cases.find((item) => item.name === 'synthetic-stable-order-at-every-level').observed.navigation;
    assert.deepEqual(
        sorted.map((item) => item.key),
        ['negative', 'tie-b', 'tie-a', 'nested']
    );
    assert.deepEqual(
        sorted[3].children.map((item) => item.key),
        ['nested-negative', 'nested-b', 'nested-a']
    );
});

test('unknown declarations, helpers, expressions, fields and duplicate object keys fail closed', () => {
    const sourceText = read(CONSTANTS_PATH);
    for (const text of [
        `${sourceText}\nexport const UNREVIEWED = [];`,
        `${sourceText}\nfunction hiddenHelper() { return []; }`,
        sourceText.replace('NAVIGATION_TREE: NavigationItem[] = [', 'NAVIGATION_TREE: NavigationItem[] = unknownHelper([').replace(/\];\s*$/, ']);'),
        sourceText.replace("key: 'overview',", "key: 'overview', key: 'duplicate',"),
        sourceText.replace("key: 'overview',", "key: 'overview', newField: true,"),
        sourceText.replace('NavigationItemTypeValue.Collapsable', 'NavigationItemTypeValue.Unreviewed'),
        sourceText.replace("id: 'nav-overview',", "...unknownSpread, id: 'nav-overview',")
    ])
        assert.throws(() => extractTree(text, shared), /Unknown|Duplicate|Invalid/);
    assert.throws(() => originalService(`${read(SERVICE_PATH)}\nfunction unknownHelper() { return []; }`, tree), /Unknown navigation top-level/);
    assert.throws(() => executeShared(`import { value } from 'node:fs';\n${read(SHARED_PATH)}`), /Unknown transitive shared import/);
});

test('the three OpenAPI operations, recursive references and effective inherited security are original metadata', () => {
    const subset = JSON.parse(outputs.get(OPENAPI_PATH));
    assert.deepEqual(Object.keys(subset.paths), ['/api/me/navigation', '/api/platform/navigation', '/api/platform/navigation:sync']);
    for (const [path, item] of Object.entries(subset.paths))
        for (const [method, operation] of Object.entries(item)) {
            assert.deepEqual(operation, spec.paths[path][method]);
            assert.deepEqual(operation.security ?? subset.security ?? [], spec.paths[path][method].security ?? spec.security ?? []);
            assert.equal(operation.requestBody, undefined, 'No new empty-body DTO');
        }
    for (const [name, schema] of Object.entries(subset.components.schemas)) assert.deepEqual(schema, spec.components.schemas[name]);
    const inherited = structuredClone(spec);
    inherited.security = [{ syntheticInherited: [] }];
    assert.deepEqual(extractOpenApi(inherited).security, inherited.security);
    const broken = structuredClone(spec);
    broken.paths['/api/me/navigation'].get.responses['200'].content['application/json'].schema = { $ref: '#/components/schemas/MISSING' };
    assert.throws(() => extractOpenApi(broken), /Missing OpenAPI reference/);
});

test('--check is read-only, accepts physical JSON CRLF and refuses reverse-tampered outputs', (t) => {
    const root = temporary(t, 'poms-r2a-artifact-');
    for (const [file, text] of outputs) {
        mkdirSync(dirname(resolve(root, file)), { recursive: true });
        writeFileSync(resolve(root, file), text.replace(/\n/g, '\r\n'));
    }
    const snapshot = () => [...outputs.keys()].map((file) => ({ file, sha: sha256(readFileSync(resolve(root, file), 'utf8')), mtime: statSync(resolve(root, file), { bigint: true }).mtimeNs }));
    const before = snapshot();
    checkArtifacts(outputs, root);
    assert.deepEqual(snapshot(), before);
    writeFileSync(resolve(root, TREE_PATH), '[]\n');
    const tampered = snapshot();
    assert.throws(() => checkArtifacts(outputs, root), /Stale or modified navigation artifact/);
    assert.deepEqual(snapshot(), tampered);
    assert.equal(normalizeText('\ufeff中\r\nx\ry\\r\\n'), '\ufeff中\nx\ry\\r\\n');
});

test('working/index cancellation and scoped untracked sources refuse both --write and --check', (t) => {
    const root = temporary(t, 'poms-r2a-guard-');
    const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init', '--quiet']);
    git(['config', 'core.autocrlf', 'false']);
    const common = git(['rev-parse', '--git-common-dir'], ROOT).trim();
    mkdirSync(resolve(root, '.git/objects/info'), { recursive: true });
    writeFileSync(resolve(root, '.git/objects/info/alternates'), `${resolve(ROOT, common, 'objects').replaceAll('\\', '/')}\n`);
    git(['read-tree', SOURCE_HEAD]);
    for (const item of source.sourceFiles) {
        mkdirSync(dirname(resolve(root, item.path)), { recursive: true });
        writeFileSync(resolve(root, item.path), git(['show', `${SOURCE_HEAD}:${item.path}`], ROOT));
    }
    assert.doesNotThrow(() => assertSourceGuard(root));
    const original = readFileSync(resolve(root, CONSTANTS_PATH), 'utf8');
    writeFileSync(resolve(root, CONSTANTS_PATH), `${original}\n// working drift\n`);
    assert.throws(() => main(['--write'], root), /source inputs differ/);
    writeFileSync(resolve(root, CONSTANTS_PATH), `${original}\n// staged drift\n`);
    git(['add', '--', CONSTANTS_PATH]);
    writeFileSync(resolve(root, CONSTANTS_PATH), original);
    assert.equal(git(['diff', '--name-only', SOURCE_HEAD, '--', CONSTANTS_PATH]).trim(), '');
    assert.notEqual(git(['diff', '--cached', '--name-only', SOURCE_HEAD, '--', CONSTANTS_PATH]).trim(), '');
    assert.throws(() => main(['--check'], root), /source inputs differ/);
    assert.throws(() => main(['--write'], root), /source inputs differ/);
    git(['read-tree', SOURCE_HEAD]);
    const extra = resolve(root, 'apps/poms-api/src/app/features/navigation/unreviewed helper.ts');
    writeFileSync(extra, 'export const UNREVIEWED = true;\n');
    assert.throws(() => main(['--check'], root), /unreviewed helper\.ts/);
    assert.throws(() => main(['--write'], root), /unreviewed helper\.ts/);
    rmSync(extra);
    mkdirSync(resolve(root, 'docs'), { recursive: true });
    writeFileSync(resolve(root, 'docs/unrelated-note.md'), 'Unrelated docs are outside the frozen product scope.\n');
    assert.doesNotThrow(() => assertSourceGuard(root));
});
