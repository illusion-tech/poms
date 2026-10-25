import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { Script } from 'node:vm';
import { ROOT, SHARED_PATH, SPEC_PATH, SOURCE_HEAD, MANIFEST_PATH, RUST_PATH, TEST_PATH, analyzeShared, artifacts, assertSourceGuard, buildManifest, checkArtifacts, main, normalizeText, rustIdentifier, rustString, sha256 } from './export-shared.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const shared = normalizeText(readFileSync(resolve(ROOT, SHARED_PATH), 'utf8'));
const spec = JSON.parse(readFileSync(resolve(ROOT, SPEC_PATH), 'utf8'));
const manifest = buildManifest();
const outputs = artifacts(manifest);
const analyze = (text) => analyzeShared(text, spec);
const declaration = (name) => manifest.declarations.find((item) => item.name === name);

test('every source declaration, R0 snapshot, z.enum occurrence and permission has an explicit mapping', () => {
    assert.deepEqual(manifest.coverage.r0SnapshotKinds, { 'enum-definitions': 92, 'string-array': 201, 'wire-value-object': 162 });
    assert.equal(manifest.coverage.sharedTopLevelVariables, 1302);
    assert.equal(manifest.declarations.length, 665);
    assert.equal(manifest.schemaDeclarations.length, 636);
    assert.equal(manifest.excludedDeclarations.length, 1);
    assert.equal(manifest.declarations.length + manifest.schemaDeclarations.length + manifest.excludedDeclarations.length, 1302);
    assert.equal(manifest.enumOccurrences.length, 224);
    assert.equal(manifest.enumOccurrences.filter((item) => item.topLevel).length, 171);
    assert.equal(manifest.enumOccurrences.filter((item) => !item.topLevel).length, 53);
    assert.equal(manifest.enums.length, 205);
    assert.equal(
        manifest.enums.reduce((sum, item) => sum + item.values.length, 0),
        778
    );
    assert.equal(manifest.coverage.permissionKeys, 37);
    assert.equal(new Set(manifest.enums.map((item) => item.name)).size, 205);
    for (const occurrence of manifest.enumOccurrences) {
        const family = manifest.enums.find((item) => item.name === occurrence.family);
        assert.ok(family, occurrence.id);
        assert.deepEqual(family.values, occurrence.values);
        assert.ok(family.occurrenceIds.includes(occurrence.id));
        assert.ok(occurrence.path && occurrence.line > 0 && occurrence.column > 0 && occurrence.expression);
    }
    for (const item of manifest.declarations) assert.equal(item.valueSha256, sha256(JSON.stringify(item.value)));
    for (const item of manifest.declarations.filter((item) => item.r0Kind))
        assert.ok(
            item.rustMappings.some((mapping) => mapping.wireRelation === 'exact-values-and-order'),
            `${item.name}: complete Rust mapping`
        );
    for (const item of manifest.declarations.filter((item) => item.helper && ['label-map', 'severity-map', 'options', 'hint-map'].includes(item.kind))) assert.ok(item.rustMappings.length, `${item.name}: metadata Rust mapping`);
    assert.deepEqual(manifest.r0Witness, { path: 'docs/design/rust-r0-api-operations.json', constantsCompared: 455, enumOccurrencesCompared: 224, result: 'exact-payload-and-order' });
});

test('actual original TS helpers and Zod options are the independent execution oracle', () => {
    assert.deepEqual(manifest.originalTsExecution, { dataDeclarationsCompared: 665, enumArgumentsCompared: 224, actualTopLevelZodEnumsCompared: 171, importAllowlist: ['zod'] });
    assert.equal(manifest.helpers.filter((item) => item.role === 'enum-helper').length, 9);
    assert.equal(manifest.coverage.helperDerivedMetadata, 206);
    for (const item of manifest.declarations.filter((item) => item.helper && ['label-map', 'severity-map', 'options', 'hint-map'].includes(item.kind))) {
        assert.ok(item.dependencies.length, `${item.name}: helper input provenance`);
        assert.ok(manifest.helpers.some((helper) => helper.name === item.helper));
    }
    assert.deepEqual(Object.keys(declaration('PermissionsMeta').value), declaration('PERMISSION_KEYS').value);
    assert.deepEqual(Object.keys(declaration('SENSITIVE_FIELD_PACKAGE_REQUIRED_PERMISSIONS').value), declaration('SENSITIVE_FIELD_PACKAGE_KEYS').value);
    assert.equal(declaration('IDENTITY_PROVIDER_SCOPE_MAX_LENGTH').kind, 'schema-scalar-limit');
    assert.equal(declaration('IDENTITY_PROVIDER_SCOPE_MAX_ITEMS').kind, 'schema-scalar-limit');
});

test('161 published enum schemas keep exact OpenAPI order; unpublished and nested enums remain included', () => {
    const published = manifest.enumOccurrences.filter((item) => item.openApiValues);
    assert.equal(published.length, 161);
    assert.equal(manifest.enumOccurrences.filter((item) => item.topLevel && !item.openApiValues).length, 10);
    for (const item of published) assert.deepEqual(item.values, spec.components.schemas[item.schemaId].enum);
    const nested = manifest.enumOccurrences.filter((item) => !item.topLevel);
    assert.equal(nested.length, 53);
    const subset = nested.find((item) => item.owner === 'UpdateCustomerRequestSchema');
    assert.equal(subset.family, 'UpdateCustomerRequestStatus');
    assert.deepEqual(subset.values, ['active', 'inactive']);
    assert.deepEqual(manifest.enums.find((item) => item.name === 'CustomerStatus').values, ['active', 'inactive', 'merged']);
    assert.notEqual(manifest.enums.find((item) => item.name === 'ActiveInactiveStatus').sourceSymbol, manifest.enums.find((item) => item.name === 'CustomerContactStatus').sourceSymbol);
    assert.ok(manifest.enums.find((item) => item.name === 'CommissionLifecycleSnapshotStatus').aliases.includes('CommissionDepartureExceptionDecisionStatus'));
});

test('backend auth constants are executed from original literal declarations without importing services', () => {
    for (const path of new Set(manifest.backendAuthDeclarations.map((item) => item.path))) {
        const source = normalizeText(readFileSync(resolve(ROOT, path), 'utf8'));
        const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
        const expected = manifest.backendAuthDeclarations.filter((item) => item.path === path);
        const names = expected.map((item) => item.name);
        const statements = sf.statements.filter((statement) => ts.isVariableStatement(statement) && statement.declarationList.declarations.some((item) => ts.isIdentifier(item.name) && names.includes(item.name.text)));
        const compiled = ts.transpileModule(statements.map((item) => item.getText(sf)).join('\n'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
        const exports = {};
        new Script(compiled, { filename: path }).runInNewContext(
            {
                exports,
                require() {
                    throw new Error('Backend imports are forbidden');
                }
            },
            { timeout: 1000 }
        );
        for (const item of expected) assert.deepEqual(JSON.parse(JSON.stringify(exports[item.name])), item.value);
    }
    assert.equal(manifest.backendAuthDeclarations.find((item) => item.name === 'AuthSessionRevokedReasonValue').value.AccountDisabled, 'account-disabled');
    assert.equal(manifest.backendAuthDeclarations.find((item) => item.name === 'AuthSessionErrorCodeValue').value.AccountDisabled, 'account_disabled');
});

test('unknown candidates, helpers, statements and enum forms fail closed instead of being skipped', () => {
    const cases = [
        ['\nexport const UNKNOWN_CANDIDATE = unknownHelper(PERMISSION_KEYS);', /Unsupported data helper unknownHelper/],
        ['\nexport const UNKNOWN_CANDIDATE = { newMetadata: true };', /Unclassified data candidate/],
        ["\nexport const UNMAPPED_VALUES = ['new-value'] as const;", /Unused string-array candidate/],
        ['\nexport const UnknownSchema = unknownHelper(PERMISSION_KEYS);', /Unsupported schema helper/],
        ['\nexport const UnknownSchema = z.nativeEnum(SystemSettingKeyValue);', /Unsupported schema helper/],
        ['\nexport const UnknownSchema = z.enum(MISSING_ENUM_VALUES);', /Unknown data identifier/],
        ['\nexport function unknownEnumHelper(input: string[]) { return input; }', /Unsupported or changed helper/],
        ['\nconsole.log(PERMISSION_KEYS);', /Unsupported top-level statement/],
        ['\nlet UNKNOWN_CANDIDATE = 1;', /Only const/],
        ['\nexport const UnknownSchema = PERMISSION_KEYS;', /Unknown schema candidate/],
        ['\nexport const CYCLE_A = CYCLE_B; export const CYCLE_B = CYCLE_A;', /Cyclic data dependency/],
        ["\nexport const UNKNOWN_CANDIDATE = { ['computed']: 'value' };", /Unsupported object property/]
    ];
    for (const [addition, error] of cases) assert.throws(() => analyze(shared + addition), error);
});

test('changed helper bodies, duplicate names/keys/values and Rust naming collisions are rejected', () => {
    assert.throws(() => analyze(shared.replace('return definitions;', 'return [...definitions];')), /Unsupported or changed helper/);
    assert.throws(() => analyze(shared + "\nexport const PERMISSION_KEYS = ['duplicate'];"), /Duplicate declaration/);
    assert.throws(() => analyze(shared + '\nexport type PermissionKey = string;'), /Duplicate type alias/);
    assert.throws(() => analyze(shared.replace("'platform:roles:manage',", "'platform:users:manage',")), /Duplicate wire value/);
    assert.throws(() => analyze(shared.replace("'platform:roles:manage': {", "'platform:users:manage': {")), /Duplicate object key/);
    assert.throws(() => analyze(shared + "\nexport const COLLIDING_VALUES = ['a-b', 'a_b'] as const; export type Colliding = (typeof COLLIDING_VALUES)[number]; export const CollidingSchema = z.enum(COLLIDING_VALUES);"), /Rust variant collision/);
    assert.throws(() => rustIdentifier('self'), /reserved Rust identifier/);
    assert.throws(() => analyze(shared.replace('satisfies Record<string, SensitiveFieldPackageKey>', '')), /Snapshot has no source-proven Rust family mapping/);
    assert.throws(() => rustIdentifier('123'), /Unsupported/);
    assert.throws(() => rustString('\ud800'), /Unpaired surrogate/);
    assert.equal(rustString('a\n\r\t"\\\0😀'), '"a\\n\\r\\t\\"\\\\\\u{0}😀"');
});

test('source, R0 witness and OpenAPI tampering cannot refresh the baseline silently', () => {
    const r0Path = manifest.r0Witness.path;
    const altered = JSON.parse(readFileSync(resolve(ROOT, r0Path), 'utf8'));
    altered.sharedSsot.constants[0].value.push('tampered');
    assert.throws(() => buildManifest({ guard: false, sourceTexts: { [r0Path]: JSON.stringify(altered) } }), /R0 455 snapshot witness differs/);
    const openapi = structuredClone(spec);
    openapi.components.schemas.CustomerStatus.enum.reverse();
    assert.throws(() => analyzeShared(shared, openapi), /OpenAPI enum values\/order differ/);
    assert.throws(() => buildManifest({ guard: false, sourceTexts: { [SHARED_PATH]: shared + "\nexport const NEW_STATUS_VALUES = ['new'];" } }), /Unused string-array candidate/);
});

function temporaryRoot(t, prefix) {
    const root = mkdtempSync(resolve(tmpdir(), prefix));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
}

test('check is read-only and rejects reverse edits to every generated artifact; CRLF checkout is supported', (t) => {
    const root = temporaryRoot(t, 'poms-r1b-output-test-');
    for (const [path, text] of outputs) {
        mkdirSync(dirname(resolve(root, path)), { recursive: true });
        writeFileSync(resolve(root, path), text.replace(/\n/g, '\r\n'));
    }
    assert.doesNotThrow(() => checkArtifacts(outputs, root));
    for (const path of [MANIFEST_PATH, RUST_PATH, TEST_PATH]) {
        const expected = outputs.get(path);
        writeFileSync(resolve(root, path), `${expected}tampered\n`);
        assert.throws(() => checkArtifacts(outputs, root), new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.equal(readFileSync(resolve(root, path), 'utf8'), `${expected}tampered\n`);
        writeFileSync(resolve(root, path), expected);
    }
    assert.doesNotThrow(() => checkArtifacts(outputs, root));
});

test('Git source guard rejects tracked/untracked input changes and --write cannot bypass it', (t) => {
    const root = temporaryRoot(t, 'poms-r1b-guard-test-');
    const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init', '--quiet']);
    git(['config', 'core.autocrlf', 'false']);
    const common = git(['rev-parse', '--git-common-dir'], ROOT).trim();
    const objects = resolve(ROOT, common, 'objects').replaceAll('\\', '/');
    mkdirSync(resolve(root, '.git/objects/info'), { recursive: true });
    writeFileSync(resolve(root, '.git/objects/info/alternates'), `${objects}\n`);
    git(['read-tree', SOURCE_HEAD]);
    for (const item of manifest.authority.sourceInputs) {
        mkdirSync(dirname(resolve(root, item.path)), { recursive: true });
        writeFileSync(resolve(root, item.path), git(['show', `${SOURCE_HEAD}:${item.path}`], ROOT));
    }
    assert.doesNotThrow(() => assertSourceGuard(root));
    mkdirSync(resolve(root, 'docs'), { recursive: true });
    writeFileSync(resolve(root, 'docs/r1b-unrelated-note.md'), 'Outside input scope.\n');
    assert.doesNotThrow(() => assertSourceGuard(root));
    const original = readFileSync(resolve(root, SHARED_PATH), 'utf8');
    writeFileSync(resolve(root, SHARED_PATH), `${original}\n// tracked source drift\n`);
    assert.throws(() => assertSourceGuard(root), /source inputs differ/);
    assert.throws(() => main(['--write'], root), /source inputs differ/);
    writeFileSync(resolve(root, SHARED_PATH), original);
    writeFileSync(resolve(root, SHARED_PATH), `${original}\n// staged source drift\n`);
    git(['add', '--', SHARED_PATH]);
    writeFileSync(resolve(root, SHARED_PATH), original);
    assert.equal(git(['diff', '--name-only', SOURCE_HEAD, '--', SHARED_PATH]).trim(), '');
    assert.ok(git(['diff', '--cached', '--name-only', SOURCE_HEAD, '--', SHARED_PATH]).includes(SHARED_PATH));
    assert.throws(() => assertSourceGuard(root), /source inputs differ/);
    assert.throws(() => main(['--write'], root), /source inputs differ/);
    assert.throws(() => main(['--check'], root), /source inputs differ/);
    git(['read-tree', SOURCE_HEAD]);
    assert.doesNotThrow(() => assertSourceGuard(root));
    writeFileSync(resolve(root, 'libs/shared/contracts/src/unreviewed.ts'), 'export const NEW = true;\n');
    assert.throws(() => assertSourceGuard(root), /unreviewed\.ts/);
});

test('normalization changes only physical CRLF, never escaped CR/LF, BOM, bare CR or Unicode', () => {
    assert.equal(normalizeText('\ufeff中\r\na\rb\\r\\n'), '\ufeff中\na\rb\\r\\n');
    const crlf = buildManifest({ guard: false, sourceTexts: { [SHARED_PATH]: shared.replace(/\n/g, '\r\n') } });
    assert.deepEqual(crlf, manifest);
    assert.doesNotThrow(() => checkArtifacts(outputs));
});
