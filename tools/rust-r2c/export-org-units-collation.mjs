import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, SOURCE_HEAD, assertSourceGuard } from './export-org-units.mjs';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const raw = (root, path) => readFileSync(resolve(root, path));
const read = (root, path) => JSON.parse(raw(root, path));
const units = (text) => Array.from({ length: text.length }, (_, index) => text.charCodeAt(index));
const fromUnits = (units) => String.fromCharCode(...units);
const fingerprint = (root, path) =>
    /\/(?:root|jamo)\.json$/.test(path)
        ? { path, rawBytesSha256: digest(raw(root, path)), hashRule: 'Opaque raw bytes' }
        : { path, normalizedUtf8Sha256: digest(raw(root, path).toString('utf8').replace(/\r\n/g, '\n')), hashRule: 'UTF8 text CRLF to LF only' };

export function buildCollationArtifacts(root = ROOT) {
    assertSourceGuard(root);
    assert.equal(process.versions.node.split('.')[0], '24');
    assert.equal(process.versions.icu, '78.3');
    assert.equal(process.versions.cldr, '48.0');
    assert.equal(new Intl.Collator().resolvedOptions().locale, 'en-US');
    const cases = read(root, 'tools/rust-r2c/org-units-collation-cases.json');
    const inherited = read(root, 'tools/rust-r2b/collation/cases.json');
    const permissionKeys = read(root, 'tools/rust-r2b/roles-authority.json').permissions.map((value) => value.key);
    assert.equal(permissionKeys.length + inherited.mixed.length, 484);
    const sampled = cases.hanRanges.flatMap(([first, last]) => Array.from({ length: cases.samplesPerRange }, (_, index) => String.fromCodePoint(first + Math.floor(((last - first) * index) / (cases.samplesPerRange - 1)))));
    const all = [...permissionKeys, ...inherited.mixed, ...cases.chinese, ...cases.mixedCodeUnits.map(fromUnits), ...cases.departments, ...sampled];
    assert.equal(all.length, 804);
    const corpus = all.filter((value) => value.isWellFormed());
    const oracles = {};
    for (const locale of ['zh-CN', 'en-US']) {
        const signs = Uint8Array.from(corpus.flatMap((left) => corpus.map((right) => Math.sign(left.localeCompare(right, locale)) + 1)));
        oracles[locale] = { options: new Intl.Collator(locale).resolvedOptions(), sorted: [...corpus].sort((left, right) => left.localeCompare(right, locale)), pairSignsSha256: digest(signs), comparisonCount: corpus.length ** 2 };
    }
    const caseInputs = [...all, ...cases.lowercaseOnlyCodeUnits.map(fromUnits)];
    const golden = {
        formatVersion: 1,
        sourceHead: SOURCE_HEAD,
        oracle: 'Actual Node24 ICU78.3 CLDR48 localeCompare(zh-CN) and default-en-US plus trim().toLocaleLowerCase(); pure finite corpus',
        provenance: { inheritedStrings: 484, totalStrings: all.length, wellFormedStrings: corpus.length, rejectedLoneSurrogateStrings: all.length - corpus.length, sampledHan: sampled.length, departmentsAndSurnames: cases.departments.length },
        corpus,
        oracles,
        casing: caseInputs.map((value) => ({ inputUnits: units(value), expectedUnits: units(value.trim().toLocaleLowerCase()) })),
        limitation: 'Tree strings are PG UTF8; unpaired-surrogate compare differences are preserved in G0 probe and are outside tree input. Casing keeps their original code units. No all-Unicode or DB/HTTP certification.'
    };
    const goldenText = JSON.stringify(golden, null, 2) + '\n';
    const source = {
        formatVersion: 1,
        sourceHead: SOURCE_HEAD,
        originalComparator: { path: 'apps/poms-api/src/app/features/platform/platform.service.ts', rule: "displayOrder -> createdAt.getTime() milliseconds -> name.localeCompare('zh-CN') -> id.localeCompare() default en-US" },
        provider: {
            revision: '38a49da495248dd1ded84cf306e4ca42e64d5bb3',
            packageVersion: '2.1.1',
            pairedRoot: 'Unchanged R2B NodeData Unihan Root/Jamo',
            tailoring: 'Same-revision Baked, explicit zh-CN and en-US',
            caseMapping: 'same-revision icu_casemap compiled_data, whole context with isolated UTF16 units retained'
        },
        files: [
            'apps/poms-api/src/app/features/platform/platform.service.ts',
            'tools/rust-r2b/roles-authority.json',
            'tools/rust-r2b/collation/cases.json',
            'tools/rust-r2b/collation/source.json',
            'tools/rust-r2b/collation/root.json',
            'tools/rust-r2b/collation/jamo.json',
            'tools/rust-r2c/export-org-units-collation.mjs',
            'tools/rust-r2c/export-org-units-collation.test.mjs',
            'tools/rust-r2c/org-units-collation-cases.json'
        ].map((path) => fingerprint(root, path)),
        golden: { path: 'tools/rust-r2c/org-units-collation-golden.json', rawBytesSha256: digest(goldenText) },
        verification: {
            sourceGuardAxes: ['working', 'index', 'untracked'],
            replay: 'node tools/rust-r2c/export-org-units-collation.mjs --check',
            finiteComparisonsPerLocale: corpus.length ** 2,
            casingCases: caseInputs.length,
            runtimeBehaviorClaim: false
        }
    };
    return new Map([
        ['tools/rust-r2c/org-units-collation-golden.json', goldenText],
        ['tools/rust-r2c/org-units-collation-source.json', JSON.stringify(source, null, 2) + '\n']
    ]);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    assert(args.length === 0 || (args.length === 1 && args[0] === '--check'), 'Usage: export-org-units-collation.mjs [--check]');
    for (const [path, text] of buildCollationArtifacts()) {
        if (args.length) assert.equal(raw(ROOT, path).toString('utf8'), text, `Organization collation artifact differs: ${path}`);
        else writeFileSync(resolve(ROOT, path), text);
    }
    console.log(JSON.stringify({ result: 'pass', mode: args.length ? 'check' : 'write', wellFormedStrings: 802, pairsPerLocale: 643204, casingCases: 817 }));
}
