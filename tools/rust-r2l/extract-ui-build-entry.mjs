// Late extraction from an ORIGINAL retained build output. Never edits a prior
// runtime snapshot or claims this copy existed at its earlier capture time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const GENERATOR = '/home/wangzishi/projects/poms-rust-r2l-generator';
const ROOT = '/home/wangzishi/projects/poms-rust-r2l';
assert.equal(process.cwd(), GENERATOR);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const reportFile = 'tmp/rust-r2l/l-ui-build-ui02.json', reportBytes = fs.readFileSync(reportFile);
assert.equal(sha(reportBytes), '27b9e82479874bd5b4d2d29d357d5c6cbe707d653712dcb330c69090455d8d3c');
const build = JSON.parse(reportBytes); assert.equal(build.result, 'pass'); assert.equal(build.inputsUnchanged, true);
const input = build.inputs.find(row => row.file === 'tools/rust-r2l/l-ui-main.ts');
assert(input); assert.equal(input.sha256, '0f59febb1349612b6f7ce0e1c9188bcbbdd9c0963a17bc65e6936353540f27a5');
const output = ROOT + '/tmp/rust-r2l/ui02-entry-source-supplement01'; assert(!fs.existsSync(output));
const matches = [];
for (const step of build.steps) for (const row of step.outputs ?? []) {
    if (!row.file.endsWith('.map')) continue;
    const raw = fs.readFileSync(row.file);
    if (!raw.includes(Buffer.from('l-ui-main.ts'))) continue;
    assert.equal(raw.length, row.bytes); assert.equal(sha(raw), row.sha256);
    const map = JSON.parse(raw);
    for (let index = 0; index < map.sources.length; index++) {
        if (!map.sources[index].endsWith('/tools/rust-r2l/l-ui-main.ts') && map.sources[index] !== 'tools/rust-r2l/l-ui-main.ts') continue;
        assert.equal(typeof map.sourcesContent[index], 'string'); const source = Buffer.from(map.sourcesContent[index]);
        assert.equal(source.length, input.bytes); assert.equal(sha(source), input.sha256);
        matches.push({ map: row, raw, source, originalSourceName: map.sources[index], sourceIndex: index });
    }
}
assert.equal(matches.length, 1, 'Require one unambiguous original source-map entry');
fs.mkdirSync(output, { mode: 0o700 }); const match = matches[0];
const sourceFile = output + '/l-ui-main.ts', mapFile = output + '/' + path.basename(match.map.file);
fs.writeFileSync(sourceFile, match.source, { flag: 'wx', mode: 0o600 }); fs.writeFileSync(mapFile, match.raw, { flag: 'wx', mode: 0o600 });
const receipt = { formatVersion: 1, kind: 'late-source-extraction-from-original-UI02-build-output', result: 'pass-original-artifact-source-binding', extractedAt: new Date().toISOString(),
    buildReport: { file: GENERATOR + '/' + reportFile, bytes: reportBytes.length, rawBytesSha256: sha(reportBytes) },
    originalBuildInput: input, originalMap: { ...match.map, absolutePath: GENERATOR + '/' + match.map.file, copiedTo: mapFile },
    embeddedEntry: { sourceIndex: match.sourceIndex, originalSourceName: match.originalSourceName, copiedTo: sourceFile, bytes: match.source.length, rawBytesSha256: sha(match.source) },
    runtimeInputBackfilled: false, originalBuildOutputsModified: false, newBuildOrBrowserRunClaimed: false,
    boundary: 'The retained original UI02 development map is bound by the original build report. Its exact entry bytes match the input shared by the production build. This supplemental copy is made now; it was not present in the earlier runtime snapshots.' };
fs.writeFileSync(output + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ result: receipt.result, output, sourceBytes: match.source.length, mapBytes: match.raw.length, sourceRawBytesSha256: sha(match.source) }));
