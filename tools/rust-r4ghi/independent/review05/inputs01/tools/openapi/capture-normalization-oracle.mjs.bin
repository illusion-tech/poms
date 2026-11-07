// Execute the original committed PS script, never a reimplementation.
// --write is explicit; --check only compares the committed observation.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBaseline, sha256, workspaceRoot } from './shared-api-client.mjs';

const mode = process.argv[2] ?? '--check';
assert(process.argv.length <= 3 && ['--check', '--write'].includes(mode), 'Usage: capture-normalization-oracle.mjs --check|--write');
assert.equal(process.platform, 'win32', 'The original Windows PowerShell oracle runs on Windows; portable tests consume its committed bytes');
const baseline = loadBaseline();
const source = execFileSync('git', ['show', `${baseline.legacyNormalizer.sourceHead}:${baseline.legacyNormalizer.file}`], { cwd: workspaceRoot, encoding: 'utf8', windowsHide: true }).replace(/\r\n/g, '\n');
assert.equal(sha256(source), baseline.legacyNormalizer.sha256, 'The original PS implementation differs from the reviewed source');
const utf8 = (value) => Buffer.from(value, 'utf8');
const bom = Buffer.from([0xef, 0xbb, 0xbf]);
const cases = [
    ['empty', Buffer.alloc(0)],
    ['unchanged-lf', utf8('a\n')],
    ['crlf-and-ascii-trailing', utf8('a \t\r\nb\r\n\r\n')],
    ['bare-cr', utf8('a \r\tb\r\r')],
    ['no-final-lf-ascii-spaces-retained', utf8('a \t')],
    ['only-final-line-feeds', utf8('\n\n\n')],
    ['unicode-line-separator-is-not-eof-lf', utf8('a\n\n\u2028')],
    ['unicode-paragraph-separator-is-not-eof-lf', utf8('a\n\n\u2029')],
    ['unicode-spaces-retained', utf8('a\u00a0\u2003\n')],
    ['unicode-with-ascii-trailing', utf8('中文🔒 \t\n')],
    ['binary-nul-skipped', Buffer.from([0x61, 0, 0x20, 0x0d, 0x0a])],
    ['utf8-bom-unchanged-retained', Buffer.concat([bom, utf8('a\n')])],
    ['utf8-bom-changed-removed', Buffer.concat([bom, utf8('a \r\n')])],
    ['invalid-utf8-unchanged-bytes-retained', Buffer.from([0xc3, 0x28, 0x0a])],
    ['invalid-utf8-changed-uses-decoder', Buffer.from([0xc3, 0x28, 0x20, 0x0d, 0x0a])],
    ['utf16-with-nul-skipped', Buffer.from([0xff, 0xfe, 0x2d, 0x4e, 0x0a, 0])],
    ['utf16be-no-nul-unchanged', Buffer.from([0xfe, 0xff, 0x12, 0x34, 0x56, 0x78])],
    ['ascii-blank-lines-collapse', utf8('a\t \n \t\n\n')],
    ['no-final-lf-unicode-spaces-retained', utf8('中文 \t')],
    ['double-utf8-bom-changed', Buffer.concat([bom, bom, utf8('a\r\n')])],
    ['only-utf8-bom-unchanged', bom]
];
const directory = mkdtempSync(path.join(tmpdir(), 'poms-old-ps-normalization-'));
try {
    const script = path.join(directory, 'original-normalize.ps1');
    const files = path.join(directory, 'fixtures');
    mkdirSync(files);
    writeFileSync(script, source);
    const before = new Map();
    for (const [name, bytes] of cases) {
        const file = path.join(files, `${name}.txt`);
        writeFileSync(file, bytes);
        utimesSync(file, 1514764800, 1514764800);
        before.set(name, statSync(file, { bigint: true }).mtimeNs);
    }
    const powershell = path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
    execFileSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script, '-Path', files], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const powershellVersion = execFileSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8', windowsHide: true }).trim();
    const artifact = {
        formatVersion: 1,
        provenance: {
            kind: 'actual-original-Windows-PowerShell-script',
            sourceHead: baseline.legacyNormalizer.sourceHead,
            sourceFile: baseline.legacyNormalizer.file,
            sourceSha256: sha256(source),
            captureToolSha256: sha256(readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\r\n/g, '\n')),
            platform: process.platform,
            powershellVersion
        },
        cases: cases.map(([name, bytes]) => {
            const file = path.join(files, `${name}.txt`);
            return { name, inputBase64: bytes.toString('base64'), outputBase64: readFileSync(file).toString('base64'), rewritten: before.get(name) !== statSync(file, { bigint: true }).mtimeNs };
        })
    };
    const target = path.join(workspaceRoot, 'tools/openapi/normalization-oracle.json');
    const serialized = `${JSON.stringify(artifact, null, 4)}\n`;
    if (mode === '--write') writeFileSync(target, serialized);
    else assert.equal(readFileSync(target, 'utf8').replace(/\r\n/g, '\n'), serialized, 'Original PS observations differ; --check never refreshes expected output');
    console.log(JSON.stringify({ result: 'pass', mode, cases: artifact.cases.length, powershellVersion, sourceSha256: sha256(source), artifactSha256: sha256(serialized) }));
} finally {
    assert(path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith('poms-old-ps-normalization-'));
    rmSync(directory, { recursive: true });
}
