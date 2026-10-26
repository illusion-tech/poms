import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = 'tools/rust-r2b/collation/';
const producer = 'tools/rust-r2b/collation-export/';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const raw = (path) => readFileSync(resolve(root, path));
const fingerprint = (path) => ({ path, bytes: raw(path).length, rawBytesSha256: digest(raw(path)) });
const inputs = [
    ['source/collation/unihan/root_standard_data.toml', '1c9ab1a374a795c67eab06f916579e48ee9bab05873443f8e8936385ab7704cd'],
    ['source/collation/unihan/root_standard_jamo.toml', '661f741f62b2cb2da5ee60372406fd8ef322b0cc0c0e0bb67a90b6c6d29bf647']
];
const outputs = [
    ['root.json', '44a4fc9d480363f9cd2b344dc26bb6dae6146a036e69c89134b53ba91d3197bc'],
    ['jamo.json', '47e37d476f6963232d9436bca366142cf0000861df7e19506b443d064116e72c']
];
const args = new Set(process.argv.slice(2));
assert(
    [...args].every((arg) => ['--check', '--replay'].includes(arg)),
    'Usage: export-roles-collation.mjs [--check] [--replay]'
);
for (const [path, expected] of inputs) assert.equal(digest(raw(directory + path)), expected, `Unreviewed official source ${path}`);
if (args.has('--replay')) execFileSync('cargo', ['+1.99.1', 'run', '--locked', '--offline', '--manifest-path', resolve(root, producer, 'Cargo.toml'), '--', '--check'], { cwd: root, stdio: 'inherit', windowsHide: true });
// These payloads intentionally never enter JSON.parse or a JSON formatter.
for (const [path, expected] of outputs) assert.equal(digest(raw(directory + path)), expected, `Opaque payload differs ${path}`);
assert.equal(process.versions.node.split('.')[0], '24');
assert.equal(process.versions.icu, '78.3');
assert.equal(process.versions.cldr, '48.0');
const synthetic = JSON.parse(raw(directory + 'cases.json'));
const authority = JSON.parse(raw('tools/rust-r2b/roles-authority.json'));
const corpus = { keys: authority.permissions.map((entry) => entry.key), mixed: synthetic.mixed };
const all = [...corpus.keys, ...corpus.mixed];
const signs = Uint8Array.from(all.flatMap((left) => all.map((right) => Math.sign(left.localeCompare(right, 'en-US')) + 1)));
const golden = {
    formatVersion: 1,
    oracle: 'Actual Node24 ICU78.3 CLDR48 String.localeCompare with frozen explicit en-US; finite pure corpus',
    options: new Intl.Collator('en-US').resolvedOptions(),
    inputs: corpus,
    expected: Object.fromEntries(Object.entries(corpus).map(([key, values]) => [key, [...values].sort((left, right) => left.localeCompare(right, 'en-US'))])),
    pairSignsSha256: digest(signs),
    comparisonCount: all.length ** 2
};
const goldenText = `${JSON.stringify(golden, null, 2)}\n`;
if (args.has('--check')) assert.equal(raw(directory + 'golden.json').toString('utf8'), goldenText, 'Original Node collation oracle differs');
else writeFileSync(resolve(root, directory + 'golden.json'), goldenText);
const metadata = {
    formatVersion: 1,
    source: {
        git: 'https://github.com/unicode-org/icu4x.git',
        revision: '38a49da495248dd1ded84cf306e4ca42e64d5bb3',
        packageVersion: '2.1.1',
        cldr: '48.0.0',
        icuexport: 'release-78.1rc',
        han: 'unihan',
        archiveUrl: 'https://github.com/unicode-org/icu/releases/download/release-78.1rc/icu4x-icuexportdata-78.1rc.zip',
        archiveSha256: '486751335ea00fb12cb3b4d52ddefd3df9b61ff81e1546ba506d3c41cec45a54'
    },
    producer: {
        rust: '1.99.1',
        operation: 'SourceDataProvider::new_custom().with_icuexport(verified local directory).with_collation_root_han(Unihan)',
        request: 'DataRequest::default()',
        serialization: 'serde_json::to_vec(typed payload.get()); opaque bytes',
        files: ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'src/main.rs'].map((path) => fingerprint(producer + path))
    },
    inputs: inputs.map(([path]) => fingerprint(directory + path)),
    outputs: outputs.map(([path]) => fingerprint(directory + path)),
    golden: { cases: fingerprint(directory + 'cases.json'), originalNodeOracle: fingerprint(directory + 'golden.json'), knownKeys: corpus.keys.length, strings: all.length, comparisonCount: all.length ** 2 },
    generator: fingerprint('tools/rust-r2b/export-roles-collation.mjs'),
    runtime: {
        locale: 'en-US',
        replacedMarkers: ['CollationRootV1', 'CollationJamoV1'],
        otherMarkers: 'Seven original same-revision Baked markers',
        behavior: 'Typed safe serde parsing, errors fail without fallback; stable sort preserves equivalent-key assignment order'
    },
    verification: { replay: 'node tools/rust-r2b/export-roles-collation.mjs --check --replay', checkDoesNotImplyReplay: true, scope: 'Pure fixed-source/data check; not Nest HTTP, database or all-Unicode certification' }
};
const path = directory + 'source.json';
const expected = `${JSON.stringify(metadata, null, 2)}\n`;
if (args.has('--check')) assert.equal(raw(path).toString('utf8'), expected, 'Collation source manifest differs');
else writeFileSync(resolve(root, path), expected);
console.log(JSON.stringify({ result: 'pass', opaquePayloads: 2, replayed: args.has('--replay') }));
