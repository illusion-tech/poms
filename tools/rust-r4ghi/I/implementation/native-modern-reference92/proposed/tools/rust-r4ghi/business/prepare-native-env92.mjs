// Root-only FS preparation. No application, SQL, HTTP or child process launch.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NATIVE92 as F, sha92 as sha, args92, segment92, normalizeNativeEnv92 } from './native-modern92-common.mjs';

async function main(argv) {
    if (argv.length === 1 && argv[0] === '--help') { console.log('Root FS only: --input PRIVATE_JSON --input-sha SHA --execute. Copies Native env changing PORT only; starts nothing.'); return; }
    assert.equal(process.platform, 'linux'); assert.equal(fileURLToPath(import.meta.url), `${F.root}/tools/rust-r4ghi/business/prepare-native-env92.mjs`);
    assert.equal(argv.at(-1), '--execute'); const a = args92(argv.slice(0, -1)); assert.deepEqual(Object.keys(a).sort(), ['--input', '--input-sha']);
    assert(a['--input'].startsWith(F.private + '/') && path.resolve(a['--input']) === a['--input']); const raw = fs.readFileSync(a['--input']); assert.equal(sha(raw), a['--input-sha']); const input = JSON.parse(raw);
    assert.equal(input.kind, 'Root-reviewed-Native92-env-copy'); segment92(input.phaseRun); segment92(input.rustEpoch); segment92(input.rustRun);
    assert(!fs.existsSync(`${F.private}/business/${input.rustEpoch}/${input.rustRun}/driver.lock`)); assert.equal(input.RustDriverFinished, true);
    assert.equal(input.sourceEnv.file, `${F.private}/native.env`); const st = fs.lstatSync(input.sourceEnv.file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1);
    const bytes = fs.readFileSync(input.sourceEnv.file); assert.equal(sha(bytes), input.sourceEnv.rawBytesSha256);
    const { FIXED } = await import(pathToFileURL(`${F.root}/tools/rust-r4ghi/business/context.mjs`).href);
    const require = createRequire('/home/wangzishi/projects/poms-rust-r4ghi/package.json'), { parse } = require('dotenv');
    const normalized = normalizeNativeEnv92(bytes, parse, FIXED), dir = `${F.private}/native-reference92/${input.phaseRun}`;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(dir), dir); assert(!fs.existsSync(`${dir}/state.json`), 'No env change inside an existing Native phase');
    const file = `${dir}/native.env`; assert(!fs.existsSync(file));
    fs.writeFileSync(`${dir}/env-copy-intent.json`, JSON.stringify({ inputSHA256: a['--input-sha'], sourceEnv: input.sourceEnv, destination: file, onlyChangedVariable: 'PORT', SQL: false, HTTP: false, processStarted: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(file, normalized, { flag: 'wx', mode: 0o600 }); assert.equal(sha(fs.readFileSync(input.sourceEnv.file)), input.sourceEnv.rawBytesSha256);
    const receipt = { kind: 'Root-private-Native-env-copy92', sourceUnchanged: input.sourceEnv, preparedEnv: { file, rawBytesSha256: sha(normalized) }, onlyChangedVariable: 'PORT', secretValuesPrinted: false, SQL: false, HTTP: false, processStarted: false };
    fs.writeFileSync(`${dir}/env-copy-receipt.json`, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ receipt: `${dir}/env-copy-receipt.json`, preparedEnv: receipt.preparedEnv }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(() => { console.error('Native env preparation failed; no fallback, secret dump or process launch.'); process.exitCode = 1; });
