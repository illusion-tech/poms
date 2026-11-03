import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { Script } from 'node:vm';
import { ROOT, SHARED_PATH, SPEC_PATH, SOURCE_HEAD, R0_PATH, HISTORICAL_R0, REVIEWED_R4_ADDITIONS, MANIFEST_PATH, RUST_PATH, TEST_PATH, analyzeShared, artifacts, assertSourceGuard, buildManifest, checkArtifacts, compareR0, main, normalizeText, rustIdentifier, rustString, sha256 } from './export-shared.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const shared = normalizeText(readFileSync(resolve(ROOT, SHARED_PATH), 'utf8'));
const spec = JSON.parse(readFileSync(resolve(ROOT, SPEC_PATH), 'utf8'));
const manifest = buildManifest();
const outputs = artifacts(manifest);
const analyze = (text) => analyzeShared(text, spec);
const declaration = (name) => manifest.declarations.find((item) => item.name === name);
const historicalR0 = JSON.parse(readFileSync(resolve(ROOT, R0_PATH), 'utf8'));

test('every source declaration, R0 snapshot, z.enum occurrence and permission has an explicit mapping', () => {
    assert.deepEqual(manifest.coverage.r0SnapshotKinds, { 'enum-definitions': 92, 'string-array': 202, 'wire-value-object': 162 });
    assert.equal(manifest.coverage.sharedTopLevelVariables, 1316);
    assert.equal(manifest.declarations.length, 666);
    assert.equal(manifest.schemaDeclarations.length, 649);
    assert.equal(manifest.excludedDeclarations.length, 1);
    assert.equal(manifest.declarations.length + manifest.schemaDeclarations.length + manifest.excludedDeclarations.length, 1316);
    assert.equal(manifest.enumOccurrences.length, 228);
    assert.equal(manifest.enumOccurrences.filter((item) => item.topLevel).length, 172);
    assert.equal(manifest.enumOccurrences.filter((item) => !item.topLevel).length, 56);
    assert.equal(manifest.enums.length, 209);
    assert.equal(
        manifest.enums.reduce((sum, item) => sum + item.values.length, 0),
        787
    );
    assert.equal(manifest.coverage.permissionKeys, 37);
    assert.equal(new Set(manifest.enums.map((item) => item.name)).size, 209);
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
    assert.equal(manifest.r0Witness.path, R0_PATH);
    assert.equal(manifest.r0Witness.constantsCompared, 455);
    assert.equal(manifest.r0Witness.enumOccurrencesCompared, 224);
    assert.equal(manifest.r0Witness.result, 'unchanged-base-payload-and-order-with-declared-r4-additions');
    assert.equal(manifest.r0Witness.currentConstants, 456);
    assert.equal(manifest.r0Witness.currentEnumOccurrences, 228);
    assert.equal(manifest.r0Witness.declaredAdditions.constants.length, 1);
    assert.equal(manifest.r0Witness.declaredAdditions.enumOccurrences.length, 4);
    assert.equal(manifest.r0Witness.provenance.constants.positions.length, 455);
    assert.equal(manifest.r0Witness.provenance.enumOccurrences.positions.length, 224);
    assert.equal(manifest.coverage.historicalR0SnapshotCount, 455);
    assert.equal(manifest.coverage.declaredPostR0SnapshotCount, 1);
});

test('actual original TS helpers and Zod options are the independent execution oracle', () => {
    assert.deepEqual(manifest.originalTsExecution, { dataDeclarationsCompared: 666, enumArgumentsCompared: 228, actualTopLevelZodEnumsCompared: 172, importAllowlist: ['zod'] });
    assert.equal(manifest.helpers.filter((item) => item.role === 'enum-helper').length, 9);
    assert.equal(manifest.helpers.find((item) => item.name === 'isR4ScaledDecimal').role, 'schema-refinement-out-of-enum-scope');
    assert.equal(manifest.helpers.find((item) => item.name === 'isR4ScaledDecimal').declarationSha256, '91181096c5c8cc938bd1e3cdc4a99bb987a2480ab551e3cf7f2510abb0c70d27');
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

test('162 published enum schemas keep exact OpenAPI order; unpublished and nested enums remain included', () => {
    const published = manifest.enumOccurrences.filter((item) => item.openApiValues);
    assert.equal(published.length, 162);
    assert.equal(manifest.enumOccurrences.filter((item) => item.topLevel && !item.openApiValues).length, 10);
    for (const item of published) assert.deepEqual(item.values, spec.components.schemas[item.schemaId].enum);
    const nested = manifest.enumOccurrences.filter((item) => !item.topLevel);
    assert.equal(nested.length, 56);
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
    assert.throws(() => compareR0(analyze(shared), altered), /Historical payload\/order drift/);
    assert.throws(() => buildManifest({ sourceTexts: { [r0Path]: JSON.stringify(altered) } }), /Only equivalent CRLF normalization/);
    const openapi = structuredClone(spec);
    openapi.components.schemas.CustomerStatus.enum.reverse();
    assert.throws(() => analyzeShared(shared, openapi), /OpenAPI enum values\/order differ/);
    assert.throws(() => analyze(shared + "\nexport const NEW_STATUS_VALUES = ['new'];"), /Unused string-array candidate/);
    assert.throws(() => buildManifest({ guard: false }), /source guard cannot be disabled/);
    assert.throws(() => buildManifest({ sourceTexts: { [SHARED_PATH]: shared + '\n// unreviewed override\n' } }), /Only equivalent CRLF normalization/);
    assert.throws(() => buildManifest({ sourceTexts: { 'ignored-unreviewed.ts': shared } }), /Unknown source input override/);
});

test('historical payload/order stays exact while actual current line provenance can move', () => {
    const original = analyze(shared);
    const shifted = analyze('\n\n\n' + shared);
    const normal = compareR0(original, historicalR0);
    const remapped = compareR0(shifted, historicalR0);
    assert.equal(remapped.constantsCompared, 455);
    assert.equal(remapped.enumOccurrencesCompared, 224);
    for (const group of ['constants', 'enumOccurrences']) {
        const a = normal.provenance[group].positions;
        const b = remapped.provenance[group].positions;
        assert.equal(a.length, b.length);
        for (let i = 0; i < a.length; i++) {
            assert.equal(b[i].historicalLine, a[i].historicalLine);
            assert.equal(b[i].currentLine, a[i].currentLine + 3);
        }
    }
    assert.equal(sha256(normalizeText(readFileSync(resolve(ROOT, R0_PATH), 'utf8'))), HISTORICAL_R0.normalizedTextSha256);
});

test('old 455/224 records cannot be deleted, changed or reordered to accommodate additions', () => {
    const mutate = (change) => {
        const analysis = analyze(shared);
        change(analysis);
        assert.throws(() => compareR0(analysis, historicalR0), /Historical payload\/order drift|missing historical record/);
    };
    const legacy = (item) => item.r0Kind && !REVIEWED_R4_ADDITIONS.constants.some((reviewed) => reviewed.name === item.name);
    mutate((analysis) => { analysis.declarations = analysis.declarations.filter((item) => item.name !== 'PERMISSION_KEYS'); });
    mutate((analysis) => {
        const indexes = analysis.declarations.map((item, index) => legacy(item) ? index : -1).filter((index) => index >= 0);
        [analysis.declarations[indexes[0]], analysis.declarations[indexes[1]]] = [analysis.declarations[indexes[1]], analysis.declarations[indexes[0]]];
    });
    mutate((analysis) => { analysis.declarations.find((item) => item.name === 'PERMISSION_KEYS').valueSha256 = '0'.repeat(64); });
    mutate((analysis) => { analysis.occurrences.shift(); });
    mutate((analysis) => { [analysis.occurrences[0], analysis.occurrences[1]] = [analysis.occurrences[1], analysis.occurrences[0]]; });
    mutate((analysis) => { analysis.occurrences[0].expression = 'unreviewed-expression'; });
    mutate((analysis) => { analysis.occurrences[0].values = ['unreviewed-wire']; });
});

test('post-R0 additions are exact reviewed declarations and owner/schema/field occurrences', () => {
    const witness = compareR0(analyze(shared), historicalR0);
    assert.equal(witness.declaredAdditions.sourceHead, SOURCE_HEAD);
    assert.deepEqual(witness.declaredAdditions.constants.map((item) => item.name), ['CONTRACT_TERM_PREPARATION_STATUSES']);
    assert.deepEqual(witness.declaredAdditions.enumOccurrences.map((item) => [item.owner, item.schemaId, item.propertyPath, item.topLevel]), [
        ['ContractTermPreparationStatusSchema', 'ContractTermPreparationStatus', [], true],
        ['ReadinessInitializationResultSchema', 'ReadinessInitializationResult', ['targetType'], false],
        ['ReadinessInitializationResultSchema', 'ReadinessInitializationResult', ['resultStatus'], false],
        ['ReadinessInitializationResultSchema', 'ReadinessInitializationResult', ['businessStatusAfter'], false]
    ]);
    const extra = analyze(shared + "\nexport const UNREVIEWED_ENUM_VALUES = ['unreviewed'] as const; export type UnreviewedEnum = (typeof UNREVIEWED_ENUM_VALUES)[number]; export const UnreviewedEnumSchema = z.enum(UNREVIEWED_ENUM_VALUES);");
    assert.throws(() => compareR0(extra, historicalR0), /Unreviewed post-R0 constant/);
    const inline = analyze(shared + "\nexport const UnreviewedInlineSchema = z.object({ phase: z.enum(['unreviewed']) }).meta({ id: 'UnreviewedInline' });");
    assert.throws(() => compareR0(inline, historicalR0), /Undeclared addition or missing historical record/);
    const changed = analyze(shared);
    changed.declarations.find((item) => item.name === 'CONTRACT_TERM_PREPARATION_STATUSES').valueSha256 = '0'.repeat(64);
    assert.throws(() => compareR0(changed, historicalR0), /Reviewed value\/order changed/);
    const changedDeclaration = analyze(shared.replace("CONTRACT_TERM_PREPARATION_STATUSES = ['prepared'", "CONTRACT_TERM_PREPARATION_STATUSES = [ 'prepared'"));
    assert.throws(() => compareR0(changedDeclaration, historicalR0), /Reviewed declaration changed/);
    const missingConstant = analyze(shared);
    missingConstant.declarations = missingConstant.declarations.filter((item) => item.name !== 'CONTRACT_TERM_PREPARATION_STATUSES');
    assert.throws(() => compareR0(missingConstant, historicalR0), /Missing or reordered declared R4 constants/);
    const duplicateConstant = analyze(shared);
    duplicateConstant.declarations.push(duplicateConstant.declarations.find((item) => item.name === 'CONTRACT_TERM_PREPARATION_STATUSES'));
    assert.throws(() => compareR0(duplicateConstant, historicalR0), /Duplicate declared R4 constant/);
    const changedValues = analyze(shared);
    const changedOccurrence = changedValues.occurrences.find((item) => item.owner === 'ReadinessInitializationResultSchema');
    changedOccurrence.values = [...changedOccurrence.values].reverse();
    assert.throws(() => compareR0(changedValues, historicalR0), /Reviewed enum values\/order changed/);
    const missing = analyze(shared);
    missing.occurrences = missing.occurrences.filter((item) => !(item.owner === 'ReadinessInitializationResultSchema' && item.propertyPath[0] === 'targetType'));
    assert.throws(() => compareR0(missing, historicalR0), /Missing or reordered declared R4 enum occurrences/);
    const duplicate = analyze(shared);
    duplicate.occurrences.push(duplicate.occurrences.find((item) => item.owner === 'ContractTermPreparationStatusSchema'));
    assert.throws(() => compareR0(duplicate, historicalR0), /Duplicate declared R4 enum occurrence/);
    const wrongField = analyze(shared);
    wrongField.occurrences.find((item) => item.owner === 'ReadinessInitializationResultSchema').propertyPath = ['unreviewedField'];
    assert.throws(() => compareR0(wrongField, historicalR0), /Missing or reordered declared R4 enum occurrences/);
});

test('reviewed non-enum refinements do not open helper or callback language generally', () => {
    assert.throws(() => analyze(shared.replace('return scaled <= maximum && (allowZero || scaled > 0n);', 'return true;')), /Unsupported or changed helper\/function isR4ScaledDecimal/);
    assert.throws(() => analyze(shared.replace('isR4ScaledDecimal(value, 2, 999999999999999999n, false)', 'isR4ScaledDecimal(value, 2, 999999999999999999n, true)')), /Changed reviewed R4 schema refinement declaration/);
    assert.throws(() => analyze(shared.replace('new Set(terms.map((term) => term.contractId.toLowerCase()))', 'new Set(terms.map((term) => term.contractId))')), /Changed reviewed R4 schema refinement declaration/);
    assert.throws(() => analyze(shared + '\nexport const UnknownRefinementSchema = z.string().refine((value) => unknownRefinement(value));'), /Unsupported schema helper unknownRefinement/);
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
    const crlf = buildManifest({ sourceTexts: { [SHARED_PATH]: shared.replace(/\n/g, '\r\n') } });
    assert.deepEqual(crlf, manifest);
    assert.doesNotThrow(() => checkArtifacts(outputs));
});
