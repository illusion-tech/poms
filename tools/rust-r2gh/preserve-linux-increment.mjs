import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { privateRoot, regularPrivate } from './database-client.mjs';
assert.equal(process.platform, 'linux'); assert.equal(process.argv.length, 3);
const tag = process.argv[2]; assert.equal(tag, 'g3-02');
const root = process.cwd(), folder = path.join(root, 'tmp/rust-r2gh'), state = '/home/wangzishi/.local/share/poms-r2gh';
assert.equal(root, '/home/wangzishi/projects/poms-rust-r2gh');
const sha = value => createHash('sha256').update(value).digest('hex');
const baseFile = path.join(folder, 'linux-manifest-g3-01.json'), baseBytes = readFileSync(baseFile), base = JSON.parse(baseBytes);
assert.equal(sha(baseBytes), '4166ec081de85e64d61529cc2fc9bf65dca9c36429b01681ccced4bbc3522cd3');
for (const row of base.files) { const bytes = readFileSync(path.join(folder, row.file)); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.rawBytesSha256, 'Old raw evidence must remain immutable: ' + row.file); }
function scan(directory) {
    const rows = [];
    function walk(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name), stat = lstatSync(file); assert(!stat.isSymbolicLink()); if (stat.isDirectory()) walk(file); else { assert(stat.isFile()); const relative = path.relative(directory, file).replaceAll('\\', '/'); assert(!relative.split('/').includes('..') && !/[\r\n\0]/.test(relative) && !relative.startsWith('-')); const bytes = readFileSync(file); rows.push({ file: relative, bytes: bytes.length, rawBytesSha256: sha(bytes) }); } } }
    walk(directory); return rows.sort((a, b) => a.file.localeCompare(b.file));
}
const previous = new Set([...base.files.map(row => row.file), 'linux-manifest-g3-01.json']);
const additions = scan(folder).filter(row => !previous.has(row.file) && !/^(?:ROOT|NOW)(?:[-.]|$)/.test(row.file));
const secrets = ['nest', 'rust'].flatMap(backend => [...regularPrivate(path.join(privateRoot, backend + '.env')).matchAll(/^(?:DB_PASSWORD|JWT_SECRET)=(.+)$/gm)].map(match => match[1].trim()));
secrets.push(regularPrivate('/home/wangzishi/.local/share/poms-r0e/private/owner-password'));
for (const row of additions) { const bytes = readFileSync(path.join(folder, row.file)); for (const secret of secrets) assert(!bytes.includes(Buffer.from(secret)), 'Private environment value in new public evidence: ' + row.file); }
const rustSources = scan(path.join(root, 'apps/poms-api-rust')).filter(row => /^(?:Cargo\.(?:toml|lock)|(?:src|tests|examples)\/)/.test(row.file)).map(row => ({ ...row, file: 'apps/poms-api-rust/' + row.file }));
const binary = readFileSync(path.join(state, 'target/release/poms-api-rust'));
const manifestName = 'linux-manifest-' + tag + '.json', manifestFile = path.join(folder, manifestName), archive = path.join(state, 'linux-evidence-' + tag + '.tar');
assert(!existsSync(manifestFile) && !existsSync(archive));
const report = { formatVersion: 1, kind: 'Additive Linux raw preservation after concentrated G3 correction', tag, createdAt: new Date().toISOString(), baseManifest: { file: 'linux-manifest-g3-01.json', rawBytesSha256: sha(baseBytes) }, baseFilesVerifiedUnchanged: base.files.length, files: additions, rustSources, binary: { bytes: binary.length, rawBytesSha256: sha(binary) }, secretValueScan: { checkedFiles: additions.length, matchedFiles: 0, valuesPrinted: false }, archive };
writeFileSync(manifestFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const names = [...additions.map(row => row.file), manifestName];
const result = spawnSync('/usr/bin/tar', ['--null', '-C', folder, '-T', '-', '-cf', archive], { input: Buffer.from(names.join('\0') + '\0'), timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }); assert.equal(result.status, 0);
const archiveHash = sha(readFileSync(archive)); writeFileSync(path.join(state, 'linux-evidence-' + tag + '.sha256'), archiveHash + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ result: 'pass', tag, oldFilesUnchanged: base.files.length, addedFiles: additions.length, addedBytes: additions.reduce((n, row) => n + row.bytes, 0), archive, archiveSha256: archiveHash, manifestSha256: sha(readFileSync(manifestFile)) }));
