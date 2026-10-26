// Original TS/installed bcryptjs are the oracles. Only synthetic key/entropy inputs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { format } from 'prettier';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const bcrypt = require('bcryptjs');
const nest = require('@nestjs/common');
const mode = process.argv[2] ?? '--check';
assert((process.argv.length <= 3 && ['--write', '--check'].includes(mode)) || (process.argv.length === 4 && mode === '--verify-rust'), 'Usage: crypto-oracle.mjs [--write|--check|--verify-rust <public-test-log>]');
assert.equal(process.versions.node.split('.')[0], '24', 'Frozen Node 24 oracle');
assert.equal(ts.version, '6.0.3');
const sourceHead = '1013afef266602e7c98eb433bd0f14483be3d7fd';
const cipherFile = 'apps/poms-api/src/app/core/secret/secret-cipher.service.ts';
const sessionFile = 'apps/poms-api/src/app/core/auth/auth-session.service.ts';
const platformFile = 'apps/poms-api/src/app/features/platform/platform.service.ts';
const witnessFile = 'tools/rust-r0f-auth-compat/fixtures/auth-compat.v1.json';
const sourceFiles = [cipherFile, sessionFile, platformFile, witnessFile, 'package.json', 'pnpm-lock.yaml', '.gitattributes', '.prettierrc.json'].sort();
const lf = (text) => text.replace(/\r\n/g, '\n');
const read = (file) => lf(fs.readFileSync(path.isAbsolute(file) ? file : path.join(root, file), 'utf8'));
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
for (const flags of [[], ['--cached']]) assert.equal(git(['diff', ...flags, '--name-only', '--no-ext-diff', sourceHead, '--', ...sourceFiles]), '', 'Frozen crypto source changed');
assert.equal(git(['ls-files', '--others', '--exclude-standard', '--', ...sourceFiles]), '', 'Untracked crypto source');
git(['merge-base', '--is-ancestor', sourceHead, 'HEAD']);
let bcryptRoot = path.dirname(require.resolve('bcryptjs'));
for (;;) {
    const candidate = path.join(bcryptRoot, 'package.json');
    if (fs.existsSync(candidate) && JSON.parse(read(candidate)).name === 'bcryptjs') break;
    const parent = path.dirname(bcryptRoot);
    assert.notEqual(parent, bcryptRoot, 'bcryptjs package identity unavailable');
    bcryptRoot = parent;
}
const bcryptPackage = JSON.parse(read(path.join(bcryptRoot, 'package.json')));
assert.equal(bcryptPackage.version, '3.0.3');
const nestVersion = JSON.parse(read(path.join(path.dirname(require.resolve('@nestjs/common')), 'package.json'))).version;
const prettierVersion = JSON.parse(read(require.resolve('prettier/package.json'))).version;
assert.equal(nestVersion, '12.0.1');
assert.equal(prettierVersion, '3.8.5');
const source = Object.fromEntries(sourceFiles.map((file) => [file, read(file)]));
const casesPath = path.join(directory, 'crypto-cases.json');
const cases = JSON.parse(read(casesPath));
const units = (text) => Array.from({ length: text.length }, (_, at) => text.charCodeAt(at));
const string = (input) => input.map((unit) => String.fromCharCode(unit)).join('');
const text = (item) => (item.units ? string(item.units) : (item.text ?? item.repeat.repeat(item.count) + (item.suffixUnits ? string(item.suffixUnits) : (item.suffix ?? ''))));
let entropy = Buffer.alloc(12, 5);
let entropyCalls = 0;
const syntheticEnv = {};
const cryptoDouble = {
    ...crypto,
    randomBytes(length) {
        entropyCalls++;
        assert.equal(length, entropy.length, 'Unexpected entropy length');
        return Buffer.from(entropy);
    }
};
const importNames = [];
function evaluate(code, file, extras = {}) {
    const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } });
    assert.equal(compiled.diagnostics?.length ?? 0, 0);
    const exports = {};
    new vm.Script(compiled.outputText, { filename: file }).runInNewContext(
        {
            exports,
            Buffer,
            process: Object.freeze({ env: syntheticEnv }),
            ...extras,
            require(name) {
                importNames.push(name);
                if (name === 'node:crypto') return cryptoDouble;
                if (name === '@nestjs/common') return nest;
                throw new Error(`Oracle import denied: ${name}`);
            }
        },
        { timeout: 5000 }
    );
    return exports;
}
const CipherService = evaluate(source[cipherFile], cipherFile).SecretCipherService;
const service = new CipherService();
if (mode === '--verify-rust') {
    const logPath = path.resolve(process.argv[3]);
    assert(!/(?:^|[\\/])(?:\.env(?:\.[^\\/]*)?|private)(?:[\\/]|$)/i.test(logPath), 'Protected path is not a public crypto test log');
    const payload = read(logPath)
        .split('\n')
        .find((line) => line.startsWith('R1C_CRYPTO_OUTPUT='));
    assert(payload, 'Missing original Rust test output');
    const records = JSON.parse(payload.slice('R1C_CRYPTO_OUTPUT='.length));
    assert.equal(records.length, cases.plaintexts.length);
    const names = new Set();
    for (const record of records) {
        const input = cases.plaintexts.find((item) => item.name === record.name);
        assert(input && !names.has(record.name), 'Unknown or duplicate public vector');
        names.add(record.name);
        assert.deepEqual(record.keyUnits, units(cases.keySource));
        assert.deepEqual(record.plaintextUnits, units(text(input)));
        for (const key of Object.keys(syntheticEnv)) delete syntheticEnv[key];
        syntheticEnv.R1C_SYNTHETIC_KEY = cases.keySource;
        const opt = { envKeys: ['R1C_SYNTHETIC_KEY'] };
        if (record.plaintextUnits.length === 0) assert.throws(() => service.decrypt(record.ciphertext, opt), nest.BadRequestException);
        else assert.equal(service.decrypt(record.ciphertext, opt), Buffer.from(text(input), 'utf8').toString('utf8'));
        const parts = record.ciphertext.split(':');
        assert.equal(Buffer.from(parts[1], 'base64').length, 12);
        assert.equal(Buffer.from(parts[2], 'base64').length, 16);
    }
    console.log(JSON.stringify({ status: 'ok', mode, actualOriginalTsDecryptions: records.length, node: process.version, openssl: process.versions.openssl, noFixtureWrite: true }));
    process.exit(0);
}
const sessionAst = ts.createSourceFile(sessionFile, source[sessionFile], ts.ScriptTarget.Latest, true);
const originalFunctions = ['createOpaqueToken', 'hashToken'].map((name) => {
    const node = sessionAst.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert(node, `Original ${name} missing`);
    return { name, text: node.getText(sessionAst), line: sessionAst.getLineAndCharacterOfPosition(node.getStart(sessionAst)).line + 1 };
});
const helpers = evaluate(`import { createHash, randomBytes } from 'node:crypto';\n${originalFunctions.map((item) => item.text).join('\n')}`, sessionFile);
const options = { envKeys: ['R1C_SYNTHETIC_KEY'], defaultValue: 'public-r1c-fallback' };
syntheticEnv.R1C_SYNTHETIC_KEY = cases.keySource;
const result = async (fn) => {
    try {
        return { value: await fn() };
    } catch (error) {
        return { error: { name: error.constructor.name, ...(error.getStatus ? { status: error.getStatus() } : {}), message: error.message } };
    }
};
const bcryptResults = [];
for (const item of cases.passwords) {
    const password = text(item);
    const hash = bcrypt.hashSync(password, cases.bcryptSalt);
    const candidates = [
        ['self', password],
        ['wrong', 'public-wrong-password'],
        ['suffix', password + 'X']
    ];
    if (item.candidateSuffix !== undefined) candidates.push(['boundary-neighbor', item.repeat.repeat(item.count) + item.candidateSuffix]);
    if (item.candidateUnits) candidates.push(['boundary-neighbor', item.repeat.repeat(item.count) + string(item.candidateUnits)]);
    if (item.name === 'embedded-nul') candidates.push(['nul-not-terminator', 'ab']);
    if (item.name === 'nfc') candidates.push(['normalization', 'e\u0301']);
    if (item.name.endsWith('surrogate')) candidates.push(['replacement-not-equivalent', '\ufffd']);
    for (const [suffix, candidate] of candidates) bcryptResults.push({ name: `${item.name}/${suffix}`, passwordUnits: units(candidate), hash, rawVerify: true, expected: await result(() => bcrypt.compare(candidate, hash)) });
}
const hash = bcrypt.hashSync('public', cases.bcryptSalt);
for (const cost of [4, 5, 10]) {
    const salt = `$2b$${String(cost).padStart(2, '0')}$abcdefghijklmnopqrstuu`;
    for (const prefix of ['2a', '2b', '2y']) {
        const encoded = bcrypt.hashSync('public\0🔒', salt.replace('2b', prefix));
        bcryptResults.push({ name: `prefix-${prefix}-cost-${cost}`, passwordUnits: units('public\0🔒'), hash: encoded, rawVerify: true, expected: await result(() => bcrypt.compare('public\0🔒', encoded)) });
    }
}
const malformedHashes = [
    ['empty', ''],
    ['short', hash.slice(0, 59)],
    ['long', hash + 'x'],
    ['bad-prefix', '!' + hash.slice(1)],
    ['2x', '$2x$' + hash.slice(4)],
    ['cost03', hash.slice(0, 4) + '03' + hash.slice(6)],
    ['cost32', hash.slice(0, 4) + '32' + hash.slice(6)],
    ['costNaN', hash.slice(0, 4) + 'xx' + hash.slice(6)],
    ['round-separator-less', hash.slice(0, 6) + '!' + hash.slice(7)],
    ['round-separator-greater', hash.slice(0, 6) + '%' + hash.slice(7)],
    ['bad-digest', hash.slice(0, 29) + '!'.repeat(31)],
    ['noncanonical-salt', hash.slice(0, 28) + 'v' + hash.slice(29)],
    ['legacy', '$2$' + hash.slice(4) + 'x']
];
for (let at = 0; at < 22; at++) malformedHashes.push([`bad-salt-${at}`, hash.slice(0, 7 + at) + '!' + hash.slice(8 + at)]);
for (const [name, encoded] of malformedHashes) bcryptResults.push({ name, passwordUnits: units('public'), hash: encoded, rawVerify: false, expected: await result(() => bcrypt.compare('public', encoded)) });
const encryptions = [];
for (const [at, item] of cases.plaintexts.entries()) {
    entropy = Buffer.alloc(12, at + 5);
    const plaintext = text(item);
    const ciphertext = service.encrypt(plaintext, options);
    encryptions.push({ name: item.name, keyUnits: units(cases.keySource), plaintextUnits: units(plaintext), ivBytes: [...entropy], ciphertext, expected: await result(() => service.decrypt(ciphertext, options)) });
}
const decryptions = [];
async function addDecrypt(name, ciphertext, key = cases.keySource, extra = {}) {
    syntheticEnv.R1C_SYNTHETIC_KEY = key;
    decryptions.push({ name, keyUnits: units(key), ciphertext, ...extra, expected: await result(() => service.decrypt(ciphertext, { ...options, ...extra.options })) });
}
const base = encryptions[0].ciphertext;
const parts = base.split(':');
for (const [name, ciphertext] of [
    ['extra-fields', base + ':ignored:still-ignored'],
    ['version', base.replace('v1:', 'v2:')],
    ['missing', 'not-ciphertext'],
    ['empty-ciphertext', parts.slice(0, 3).join(':') + ':'],
    ['empty-iv', 'v1::' + parts.slice(2).join(':')],
    ['empty-tag', 'v1:' + parts[1] + '::' + parts[3]],
    ['unpadded', parts.map((value, at) => (at ? value.replace(/=+$/g, '') : value)).join(':')],
    ['junk-whitespace', parts.map((value, at) => (at ? '!# \n' + value + '?\t' : value)).join(':')],
    ['urlsafe', parts.map((value, at) => (at ? value.replaceAll('+', '-').replaceAll('/', '_') : value)).join(':')],
    ['unicode-skipped', parts.map((value, at) => (at ? '\u0100' + value : value)).join(':')],
    ['unicode-lowbyte', parts.map((value, at) => (at ? value.replace(/[A-Za-z0-9+/=]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 256)) : value)).join(':')],
    ['unicode-lowbyte-stop', parts.map((value, at) => (at ? '😀' + value : value)).join(':')],
    ['noncanonical-tailbits', parts.map((value, at) => (at ? value.replace(/=+$/g, '') + '===' : value)).join(':')],
    ['empty-encoded-nonempty-field', encryptions.find((x) => x.name === 'empty').ciphertext + '=='],
    ['wrong-tag', [parts[0], parts[1], Buffer.alloc(16).toString('base64'), parts[3]].join(':')],
    ['wrong-ciphertext', [parts[0], parts[1], parts[2], Buffer.alloc(16).toString('base64')].join(':')]
])
    await addDecrypt(name, ciphertext);
await addDecrypt('wrong-key', base, 'public-r1c-wrong-key');
await addDecrypt('custom-error', 'v2:a:b:c', cases.keySource, { options: { unreadableMessage: 'Synthetic secret is unreadable.' } });
const key = crypto.createHash('sha256').update(cases.keySource).digest();
for (const length of cases.nonceLengths) {
    const iv = Buffer.alloc(length, 3),
        cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update('public'), cipher.final()]);
    await addDecrypt(`nonce-${length}`, `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ct.toString('base64')}`);
}
for (const length of cases.tagLengths) {
    const tag = Buffer.concat([Buffer.from(parts[2], 'base64'), Buffer.from([1])]).subarray(0, length);
    await addDecrypt(`tag-${length}`, [parts[0], parts[1], tag.toString('base64'), parts[3]].join(':'));
}
await addDecrypt('nonce-129', 'v1:' + Buffer.alloc(129).toString('base64') + ':' + parts[2] + ':' + parts[3]);
const invalid = crypto.createCipheriv('aes-256-gcm', key, Buffer.alloc(12, 7));
const invalidCt = Buffer.concat([invalid.update(Buffer.from([255, 192, 175, 0, 237, 160, 128])), invalid.final()]);
await addDecrypt('invalid-utf8', `v1:${Buffer.alloc(12, 7).toString('base64')}:${invalid.getAuthTag().toString('base64')}:${invalidCt.toString('base64')}`);
const optionResults = [];
for (const [name, env, opt] of [
    ['defaults-empty', {}, {}],
    ['primary', { POMS_SECRET_KEY: 'public-primary', JWT_SECRET: 'public-secondary' }, {}],
    ['primary-empty', { POMS_SECRET_KEY: '', JWT_SECRET: 'public-secondary' }, {}],
    ['primary-whitespace', { POMS_SECRET_KEY: ' ', JWT_SECRET: 'public-secondary' }, {}],
    ['false-is-key', { POMS_SECRET_KEY: 'false' }, {}],
    ['zero-is-key', { POMS_SECRET_KEY: '0' }, {}],
    ['custom-keys', { CUSTOM_B: 'public-custom' }, { envKeys: ['CUSTOM_A', 'CUSTOM_B'], defaultValue: 'public-fallback' }],
    ['empty-key-list', { POMS_SECRET_KEY: 'unused' }, { envKeys: [], defaultValue: 'public-explicit' }],
    ['empty-default', {}, { envKeys: [], defaultValue: '' }]
]) {
    for (const key of Object.keys(syntheticEnv)) delete syntheticEnv[key];
    Object.assign(syntheticEnv, env);
    entropy = Buffer.alloc(12, 8);
    const ciphertext = service.encrypt('priority-test', opt);
    optionResults.push({ name, env, options: opt, plaintextUnits: units('priority-test'), ivBytes: [...entropy], ciphertext, expected: await result(() => service.decrypt(ciphertext, opt)) });
}
const tokens = [];
for (const byte of [0, 1, 127, 255]) {
    entropy = Buffer.alloc(32, byte);
    tokens.push({ bytes: [...entropy], token: helpers.createOpaqueToken() });
}
const hashes = cases.tokenTexts.map((value) => ({ text: value, hash: helpers.hashToken(value) }));
const witness = JSON.parse(source[witnessFile]);
const r0Cipher = witness.cases.filter((item) => item.group === 'cipher-v1');
const refusals = {};
for (const name of ['node:fs', 'node:net', 'node:child_process']) {
    assert.throws(() => evaluate(`require(${JSON.stringify(name)})`, 'synthetic-denied.ts'), /Oracle import denied/);
    refusals[name] = true;
}
assert.throws(() => evaluate('unprovided_crypto_dependency()', 'synthetic-denied.ts'), /unprovided_crypto_dependency/);
refusals.unknownLexical = true;
const golden = {
    formatVersion: 1,
    provenance: {
        sourceHead,
        normalization: 'UTF-8 CRLF -> LF only',
        sourceManifest: sourceFiles.map((file) => ({ file, sha256: sha(source[file]) })),
        generatorSha256: sha(read(fileURLToPath(import.meta.url))),
        casesSha256: sha(read(casesPath)),
        versions: { typescript: ts.version, bcryptjs: bcryptPackage.version, nest: nestVersion, prettier: prettierVersion },
        bcryptFiles: ['package.json', 'index.js', 'umd/index.js'].map((file) => ({ file, sha256: sha(read(path.join(bcryptRoot, file))) })),
        originalFunctions: originalFunctions.map((item) => ({ name: item.name, line: item.line, sha256: sha(item.text) })),
        evidence:
            'Actual original SecretCipherService in isolated VM; actual createOpaqueToken/hashToken AST; installed bcryptjs.compare. process.env is an empty synthetic object populated only with public cases; randomBytes is the sole crypto mock. Imports permit only node:crypto and Nest common. No product env loader, fs/network/DB/app imports or environment inheritance.',
        r0CipherWitness: { cases: r0Cipher.length, sha256: sha(JSON.stringify(r0Cipher)) },
        limits: 'No account/session persistence, HTTP guard/controller/error filter or production key lifecycle is certified. Invalid hash errors are compared by classification; caller retains existing generic HTTP 500.'
    },
    bcryptResults,
    encryptions,
    decryptions,
    optionResults,
    tokens,
    hashes,
    refusals
};
const rendered = await format(JSON.stringify(golden), { ...JSON.parse(read('.prettierrc.json')), parser: 'json', endOfLine: 'lf' });
const output = path.join(directory, 'crypto-golden.json');
if (mode === '--write') fs.writeFileSync(output, rendered, 'utf8');
else assert.equal(read(output), rendered, 'Crypto golden differs; inspect inputs before explicit --write');
console.log(
    JSON.stringify({
        status: 'ok',
        mode,
        node: process.version,
        openssl: process.versions.openssl,
        sha256: sha(rendered),
        bcrypt: bcryptResults.length,
        encryptions: encryptions.length,
        decryptions: decryptions.length,
        options: optionResults.length,
        tokens: tokens.length,
        hashes: hashes.length,
        entropyCalls,
        refusals
    })
);
