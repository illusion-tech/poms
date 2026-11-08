import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url)), old = path.resolve(here, '../source13-b0-plan-b1-03'), sha = value => createHash('sha256').update(value).digest('hex'), relative = 'proposed/tools/rust-r4ghi/construct-source13-bindings.mjs';
const before = fs.readFileSync(old + '/' + relative); assert.equal(sha(before), '0b89c24251ab561a08e15983e9931bc9b2a3b433d1aa66866621d3c607471c4e'); assert(!fs.existsSync(here + '/' + relative));
const from = "clippy: ['--all-targets', '--', '-D', 'warnings']", to = "clippy: ['--lib', '--no-deps', '--', '-D', 'warnings']"; assert.equal(before.toString().split(from).length, 2);
fs.mkdirSync(path.dirname(here + '/' + relative), { recursive: true }); fs.writeFileSync(here + '/' + relative, before.toString().replace(from, to), { flag: 'wx' });
let tests = fs.readFileSync(old + '/construct13.test.mjs', 'utf8'); assert.equal(tests.split(from).length, 2); tests = tests.replace(from, to);
tests += `
test('the replaced all-targets clippy protocol and omission of no-deps reject even with exit0', () => {
  for (const suffix of [['--all-targets', '--', '-D', 'warnings'], ['--lib', '--', '-D', 'warnings']]) {
    const f = buildFixture02(); f.mirror.steps.clippy.argv = [...f.mirror.steps.clippy.argv.slice(0, 5), ...suffix]; assert.equal(f.mirror.steps.clippy.exitCode, 0);
    assert.throws(() => assertBuildFacts13(f.build, pins, actual.record, f.root, f.mirror), /Root-approved complete mirror cargo protocol/);
  }
});
`;
fs.writeFileSync(here + '/construct13.test.mjs', tests, { flag: 'wx' }); fs.copyFileSync(old + '/input-templates13.json', here + '/input-templates13.json', fs.constants.COPYFILE_EXCL);
const check = fs.readFileSync(old + '/check13.mjs', 'utf8').replaceAll('constructor03', 'constructor04').replace('# pass 12$', '# pass 13$').replace('purePass: 12', 'purePass: 13'); fs.writeFileSync(here + '/check13.mjs', check, { flag: 'wx' });
const shape = JSON.parse(fs.readFileSync(old + '/build-shapes03.json')); shape.expectedProtocolOnly.argvByCommand.clippy = [...shape.expectedProtocolOnly.argvByCommand.clippy.slice(0, 5), '--lib', '--no-deps', '--', '-D', 'warnings']; fs.writeFileSync(here + '/build-shapes04.json', JSON.stringify(shape, null, 2) + '\n', { flag: 'wx' });
process.stdout.write('Prepared constructor04 with one clippy suffix replacement only.\n');
