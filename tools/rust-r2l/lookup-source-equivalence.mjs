// Read-only SOURCE/binary lineage verification. It starts no API, ORM or PG and
// never consults old private files or old runtime acceptance reports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
export const LOOKUP_REVISIONS = Object.freeze({ legacy: 'ee0f4847cae292fe5cee1d1eec065b7194607683', base: '02b8956759352b2612bec5980cbe55ae77d0293f', current: '1a941e8047c6269b52ef4ae8174e5f450f1db2f6' });
export const LOOKUP_BINARIES = Object.freeze({ legacy: '9ca9eb2002b7cd9d9319d5b69bfc63a10509ecfbc744512cd6313cf74f5d7374', current: '0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4' });
export const lookupNodeScopes = Object.freeze([
    'apps/poms-api/src', 'libs/shared/contracts/src', 'libs/api/contracts/src', 'libs/vendor/nestjs-zod/src',
    'apps/poms-api/project.json', 'apps/poms-api/webpack.config.js', 'apps/poms-api/tsconfig.json', 'apps/poms-api/tsconfig.app.json',
    'package.json', 'pnpm-lock.yaml', 'tsconfig.base.json', 'nx.json', '.gitattributes',
    ...['libs/shared/contracts', 'libs/api/contracts', 'libs/vendor/nestjs-zod'].flatMap((dir) => ['project.json', 'tsconfig.json', 'tsconfig.lib.json'].map((file) => dir + '/' + file))
]);
export const approvedLookupDelta = Object.freeze([
    'apps/poms-api/src/app/features/project/project.controller.ts', 'apps/poms-api/src/app/features/contract/contract.controller.ts',
    'apps/poms-api/src/app/features/project/project.module.ts', 'apps/poms-api/src/app/features/contract/contract.module.ts',
    'libs/api/contracts/src/lib/project/project.dto.ts', 'libs/api/contracts/src/lib/contract/contract.dto.ts',
    'apps/poms-api/src/app/features/project/project.controller.spec.ts', 'apps/poms-api/src/app/features/contract/contract.controller.spec.ts',
    'apps/poms-api/src/app/features/project/lookup-route.spec.ts', 'libs/shared/contracts/src/lib/shared-contracts.ts', 'libs/shared/api-spec/openapi.json'
].sort());
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const lf = (value) => value.toString('utf8').replace(/\r\n/g, '\n');
export function lookupMappedSourcePath(source) {
    if (source.startsWith('webpack:///./src/')) return 'apps/poms-api/src/' + source.slice('webpack:///./src/'.length);
    if (source.startsWith('webpack:///../../libs/')) return 'libs/' + source.slice('webpack:///../../libs/'.length);
    return null;
}
export function emittedSourceBody(text) {
    // ts-loader removes only the terminal sourceMappingURL. No whitespace,
    // identifier, comment, import or business-code normalization is permitted.
    return lf(text).replace(/\n\/\/# sourceMappingURL=[^\r\n]+\n?$/, '\n');
}
export function verifyLookupSourceEquivalence({ root = process.cwd(), legacyRoot = 'dist/reference-s2/apps/poms-api' } = {}) {
    root = path.resolve(root); legacyRoot = path.resolve(root, legacyRoot);
    assert.equal(legacyRoot, path.join(root, 'dist/reference-s2/apps/poms-api'), 'Only the explicitly copied pure-code reference package is admitted');
    const read = (file) => { const p = path.resolve(root, file); assert(p.startsWith(root + path.sep)); assert(fs.lstatSync(p).isFile() && !fs.lstatSync(p).isSymbolicLink()); return fs.readFileSync(p); };
    const fingerprint = (file) => { const bytes = read(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes), normalizedLfSha256: sha(lf(bytes)) }; };
    const git = (args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
    const files = (revision, scopes) => git(['ls-tree', '-r', '--name-only', '-z', revision, '--', ...scopes]).toString().split('\0').filter(Boolean).sort();
    const blob = (revision, file) => git(['show', revision + ':' + file]);
    const oldFiles = files(LOOKUP_REVISIONS.legacy, lookupNodeScopes), baseFiles = files(LOOKUP_REVISIONS.base, lookupNodeScopes);
    assert.deepEqual(oldFiles, baseFiles); assert(oldFiles.length > 400);
    const equivalent = oldFiles.map((file) => { const old = blob(LOOKUP_REVISIONS.legacy, file), base = blob(LOOKUP_REVISIONS.base, file); assert.equal(sha(lf(old)), sha(lf(base)), 'Legacy Node source differs from pre-cutover base: ' + file); return { file, legacyGitRawSha256: sha(old), baseGitRawSha256: sha(base), normalizedLfSha256: sha(lf(old)) }; });
    const scopes = [...lookupNodeScopes, 'libs/shared/api-spec/openapi.json'];
    const delta = git(['diff', '--name-only', '-z', LOOKUP_REVISIONS.base, LOOKUP_REVISIONS.current, '--', ...scopes]).toString().split('\0').filter(Boolean).sort();
    assert.deepEqual(delta, approvedLookupDelta, 'S3 exceeds the reviewed eleven-input checkpoint');
    const checkpointFile = 'tmp/rust-r2l/source-input-S3.json', checkpoint = JSON.parse(read(checkpointFile));
    assert.equal(checkpoint.commit, LOOKUP_REVISIONS.current); assert.equal(checkpoint.result, 'pass');
    assert.deepEqual(checkpoint.files.map(({ file }) => file).sort(), approvedLookupDelta);
    const reviewFile = 'tmp/rust-r2l/lookup-input-s3-review01.json', reviewBytes = read(reviewFile), review = JSON.parse(reviewBytes);
    assert.equal(sha(reviewBytes), checkpoint.review.rawBytesSha256); assert.equal(review.result, 'Pass');
    assert.deepEqual(review.approvedSourceInputs.map(({ file }) => file).sort(), approvedLookupDelta.filter((file) => file !== 'libs/shared/api-spec/openapi.json'));
    const currentFiles = files(LOOKUP_REVISIONS.current, scopes);
    const current = currentFiles.map((file) => { const actual = read(file), committed = blob(LOOKUP_REVISIONS.current, file); assert.equal(sha(lf(actual)), sha(lf(committed)), 'Current Node input differs from reviewed S3: ' + file); return fingerprint(file); });
    assert.equal(git(['ls-files', '--others', '--exclude-standard', '--', ...scopes]).toString(), '', 'Unreviewed Node input files');
    for (const input of checkpoint.files) assert.equal(current.find(({ file }) => file === input.file).normalizedLfSha256, input.normalizedLfSha256);
    const lineageFile = 'tmp/rust-r2l/reference-source-s2/b-scratch-node01-native-ready.json', lineage = JSON.parse(read(lineageFile));
    assert.equal(lineage.sourceHead, LOOKUP_REVISIONS.legacy); assert.equal(lineage.result, 'build-pass-not-runtime');
    assert.equal(lineage.binary.sha256, LOOKUP_BINARIES.legacy); assert.equal(lineage.buildStep.exitCode, 0); assert.equal(lineage.databaseOrApiStarted, false);
    const historicalRegressionFile = 'tmp/rust-r2l/reference-source-s2/b-scratch-node01.json', historicalRegression = JSON.parse(read(historicalRegressionFile));
    assert.equal(historicalRegression.sourceHead, LOOKUP_REVISIONS.legacy); assert.equal(historicalRegression.sourceFilesUnchanged, true);
    assert.equal(historicalRegression.sourceBefore.manifestSha256, lineage.sourceManifestSha256); assert.equal(historicalRegression.sourceAfter.manifestSha256, lineage.sourceManifestSha256);
    const transferFile = 'tmp/rust-r2l/reference-native-source-s2.json', transfer = JSON.parse(read(transferFile));
    assert.equal(transfer.sourceCheckpoint, LOOKUP_REVISIONS.legacy); assert.equal(transfer.equivalentPreCutoverSource, LOOKUP_REVISIONS.base);
    assert.equal(transfer.oldPrivateCopied, false); assert.equal(transfer.oldRuntimeAcceptanceReused, false); assert.equal(transfer.newCompileClaimed, false);
    const binaries = Object.fromEntries(['legacy', 'current'].map((variant) => {
        const directory = variant === 'legacy' ? 'dist/reference-s2/apps/poms-api' : 'dist/apps/poms-api';
        const entries = ['main.js', 'main.js.map', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'].map((file) => fingerprint(directory + '/' + file));
        assert.equal(entries[0].rawBytesSha256, LOOKUP_BINARIES[variant]); return [variant, entries];
    }));
    assert.deepEqual(transfer.compiledArtifacts, binaries.legacy.map(({ file, bytes, rawBytesSha256 }) => ({ file, bytes, rawBytesSha256 })));
    const require = createRequire(path.join(root, 'package.json')), ts = require('typescript'); assert.equal(ts.version, '6.0.3');
    const config = ts.readConfigFile(path.join(root, 'apps/poms-api/tsconfig.app.json'), ts.sys.readFile); assert(!config.error);
    const options = ts.parseJsonConfigFileContent(config.config, ts.sys, path.join(root, 'apps/poms-api')).options;
    const mapped = {};
    for (const variant of ['legacy', 'current']) {
        const revision = LOOKUP_REVISIONS[variant], mapFile = binaries[variant][1].file, map = JSON.parse(read(mapFile));
        assert.equal(map.sources.length, map.sourcesContent.length);
        const compared = [], external = [];
        for (let index = 0; index < map.sources.length; index++) {
            const source = map.sources[index], file = lookupMappedSourcePath(source), content = map.sourcesContent[index];
            if (!file) { external.push(source); continue; }
            assert(file.endsWith('.ts') && !file.includes('..') && typeof content === 'string');
            const original = blob(revision, file).toString('utf8');
            const compiled = ts.transpileModule(original, { fileName: path.join(root, file), compilerOptions: { ...options, sourceMap: false, inlineSourceMap: false, newLine: ts.NewLineKind.LineFeed }, reportDiagnostics: true });
            assert(!(compiled.diagnostics ?? []).some((entry) => entry.category === ts.DiagnosticCategory.Error), 'Source verification emit failed: ' + file);
            assert.equal(sha(emittedSourceBody(compiled.outputText)), sha(emittedSourceBody(content)), 'Source-map emitted content differs from exact Git input: ' + file);
            compared.push({ file, gitSourceRawSha256: sha(Buffer.from(original)), embeddedEmittedJsSha256: sha(lf(content)), verificationEmittedJsSha256: sha(lf(compiled.outputText)) });
        }
        assert(compared.length > 200); mapped[variant] = { map: binaries[variant][1], compared, externalOrWebpackRuntimeEntries: external, mode: 'locked TypeScript in-memory source emit compared byte-for-byte after LF and terminal sourceMappingURL only; no new bundled binary produced' };
    }
    for (const variant of ['legacy', 'current']) for (const item of binaries[variant]) assert.equal(fingerprint(item.file).rawBytesSha256, item.rawBytesSha256);
    return { formatVersion: 1, kind: 'read-only-lookup-source-and-old-compiled-artifact-lineage', result: 'pass-source-only', revisions: LOOKUP_REVISIONS,
        legacyNodeInputsEquivalentToBase: equivalent, currentInputs: current, approvedDelta: delta, checkpoint: fingerprint(checkpointFile), binaries, sourceMaps: mapped,
        sourceReview: fingerprint(reviewFile), legacyCompileSourceReceipt: fingerprint(lineageFile), historicalSourceManifestReceipt: fingerprint(historicalRegressionFile), pureCodeTransferReceipt: fingerprint(transferFile), historicalCompileIsCurrentRuntimeEvidence: false, oldBinaryRecompiledOrRelabelled: false,
        verificationCompiler: { version: ts.version, entry: require.resolve('typescript'), package: require.resolve('typescript/package.json') }, actualDatabaseOrHttpOrNativeStarted: false };
}
