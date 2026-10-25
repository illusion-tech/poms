/** R1B supplemental scalar oracle: actual TS modules, native JS and locked Zod. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const baselineHead = 'ef9fd7f4871eb87167bca1ae04fae8a992ef594c';
const normalize = (text) => text.replace(/\r\n/g, '\n');
const read = (file) => normalize(fs.readFileSync(path.isAbsolute(file) ? file : path.join(root, file), 'utf8'));
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const dateFile = 'apps/poms-api/src/app/core/date/business-date.utils.ts';
const sharedFile = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const legacyFile = 'tools/rust-r0f/data-compat/golden.json';
const legacyText = read(legacyFile);
if (sha(legacyText) !== 'c8c58d1e49b848dc274b5ca6d4125bd67c3c0ec3797fac7700c4b7c2bea19329') throw new Error('Reviewed R0F scalar input drift; explicit source review required');
const sources = [dateFile, sharedFile, legacyFile, 'package.json', 'pnpm-lock.yaml', '.gitattributes'];
const changed = execFileSync('git', ['diff', '--name-only', '--no-ext-diff', baselineHead, '--', ...sources], { cwd: root, encoding: 'utf8' }).trim();
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--no-ext-diff', baselineHead, '--', ...sources], { cwd: root, encoding: 'utf8' }).trim();
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...sources], { cwd: root, encoding: 'utf8' }).trim();
if (changed || staged || untracked) throw new Error('Scalar oracle source drift from reviewed R1A baseline (working tree/index/untracked)');
process.env.TZ = 'UTC';
if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'UTC' || new Date(2026, 1, 9).toISOString() !== '2026-02-09T00:00:00.000Z') throw new Error('Oracle process must use UTC');

function actualModule(file, imports = {}) {
    const module = { exports: {} };
    const code = ts.transpileModule(read(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
    if (code.diagnostics?.some((item) => item.category === ts.DiagnosticCategory.Error)) throw new Error(`TS syntax failure ${file}`);
    vm.runInNewContext(
        code.outputText,
        {
            module,
            exports: module.exports,
            Date,
            Intl,
            RangeError,
            require: (name) => {
                if (!Object.hasOwn(imports, name)) throw new Error(`Unknown source import: ${name}`);
                return imports[name];
            }
        },
        { filename: file, timeout: 10000 }
    );
    return module.exports;
}
const dates = actualModule(dateFile);
const shared = actualModule(sharedFile, { zod: require('zod') });
const casesFile = path.join(directory, 'scalar-compat-cases.json');
const cases = JSON.parse(read(casesFile));
const bitsOf = (number) => {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, number);
    return view.getBigUint64(0).toString(16).padStart(16, '0');
};
const fromBits = (bits) => {
    const view = new DataView(new ArrayBuffer(8));
    view.setBigUint64(0, BigInt(`0x${bits}`));
    return view.getFloat64(0);
};
const observe = (action) => {
    try {
        const value = action();
        return { outcome: 'return', value };
    } catch (error) {
        return { outcome: 'throw', error: { name: error.name, message: error.message } };
    }
};
const numeric = [];
for (const seed of cases.numberSeeds) for (const delta of cases.bitDeltas) numeric.push({ id: `${seed}:bitsDelta${delta}`, bits: (BigInt(`0x${bitsOf(Number(seed))}`) + BigInt(delta)).toString(16).padStart(16, '0') });
for (const value of cases.extraNumbers) numeric.push({ id: value, bits: bitsOf(Number(value)) });
const numberResults = numeric.map((input) => {
    const value = fromBits(input.bits);
    return { ...input, string: String(value), fixed: cases.fractionDigits.map((digits) => ({ digits, result: observe(() => value.toFixed(digits)) })) };
});
const numberStringResults = cases.numberStrings.map((input) => ({ input, bits: bitsOf(Number(input)), string: String(Number(input)) }));
const dateResults = cases.dates.map((input) => {
    const value = input.kind === 'Missing' ? undefined : input.kind === 'Null' ? null : input.kind === 'Date' ? new Date(input.value) : input.value;
    return { input, hongKong: observe(() => dates.toBusinessDateOnly(value)), utc: observe(() => dates.toBusinessDateOnly(value, 'UTC')), timestamp: observe(() => (value ? (value instanceof Date ? value : new Date(value)).toISOString() : null)) };
});
const parse = (schema, value) => {
    const result = schema.safeParse(value);
    return result.success ? { success: true, data: result.data } : { success: false };
};
const uuidResults = cases.uuids.map((input) => ({ input, result: parse(shared.SanitizedUserSchema.shape.id, input) }));
const externalIdResults = cases.externalIds.map((input) => {
    const value = input.repeat ? input.repeat.repeat(input.count) : input.value;
    return { id: input.id, input: value, result: parse(shared.ExternalDepartmentMappingReplacementItemSchema.shape.externalDepartmentId, value) };
});
const wireDateResults = cases.wireDates.map((input) => ({ input, date: parse(require('zod').z.iso.date(), input), utcDatetime: parse(shared.CsrfTokenViewSchema.shape.expiresAt, input) }));
const fileHashes = sources.map((file) => ({ file, sha256: sha(read(file)) }));
const result = {
    formatVersion: 1,
    provenance: {
        baselineHead,
        normalization: "UTF8 text.replace(/\\r\\n/g, '\\n'); preserve BOM/bare CR/Unicode/decoded literals",
        processTimezone: 'UTC',
        typescript: ts.version,
        zod: require('zod/package.json').version,
        toolSha256: sha(read(fileURLToPath(import.meta.url))),
        casesSha256: sha(read(casesFile)),
        fileHashes,
        sourceManifestSha256: sha(JSON.stringify(fileHashes)),
        evidence: ['unchanged complete business-date.utils.ts', 'unchanged complete shared-contracts.ts with real locked Zod', 'native JS Number/String/toFixed/Date.toISOString'],
        databaseConnected: false
    },
    r0fCoverage: {
        candidateInputGroups: 62,
        candidateObservations: 229,
        scalarInputGroupsMapped: 54,
        scalarObservationsMapped: 221,
        timestampInputGroupsPartiallyMapped: 3,
        comparison: 'returned scalar values exactly; rejected values by scalar classification/acceptance only; service-specific Nest error names/messages/status and full Zod issues are not implemented',
        groups: {
            dateResults: 'businessDateOnly/costDate and costTimestamp; legacy input distinctions',
            contractDateResults: 'Missing/Null/empty and UTF16 slicing',
            moneyResults: 'formatting/string passthrough and scalar finite/positive classification; service-specific Nest error wrapping not implemented',
            nullableDecimalResults: 'null/undefined/string/number projection',
            schemaResults: '8 UUID/external ID cases; 2 required-nullable field cases belong to JSON adapters; 3 membership enum cases belong to generated shared contracts',
            timestampResults: 'convert the timestamp fields; full session write snapshot/precedence not implemented'
        },
        excluded: { retentionResults: '4 business due-status cases; R1B does not implement Commission state decisions', repositoryResults: '10 SQL recording cases; R1B has no persistence' }
    },
    limitations: [
        'Rust legacy timestamp parsing covers the declared ISO/date-only forms under UTC; it is not arbitrary implementation-defined Date.parse or host-local parsing.',
        'JS-valid dates outside chrono range return UnsupportedDateRange explicitly; public ISO date/UTC datetime schemas remain four-digit-year validators.',
        'JS string.slice can create an isolated UTF16 surrogate; Rust date slicing rejects that boundary instead of silently replacing it. Complete surrogate pairs are tested.',
        'No service calculation, session precedence/write snapshot, HTTP exception wrapping, database decoding, SQL, business transactions or full DTO migration is certified.'
    ],
    counts: { numberResults: numberResults.length, numberStrings: numberStringResults.length, dates: dateResults.length, uuids: uuidResults.length, externalIds: externalIdResults.length, wireDates: wireDateResults.length },
    numberResults,
    numberStringResults,
    dateResults,
    uuidResults,
    externalIdResults,
    wireDateResults
};
const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !['--write', '--check'].includes(arg))) throw new Error('Usage: scalar-compat-oracle.mjs [--check|--write]');
const output = path.join(directory, 'scalar-compat-golden.json');
const rendered = JSON.stringify(result, null, 2) + '\n';
if (args[0] === '--write') fs.writeFileSync(output, rendered);
else if (!fs.existsSync(output) || read(output) !== rendered) throw new Error('Supplemental scalar golden differs; --check does not refresh expectations');
process.stdout.write(JSON.stringify({ status: 'ok', sha256: sha(rendered), counts: result.counts, node: process.version, databaseConnected: false }) + '\n');
