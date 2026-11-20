// Append-only author preparation, confined to this I proposal directory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url)), old = path.resolve(here, '../source13-b0-plan-b1-02'), sha = value => createHash('sha256').update(value).digest('hex');
const relative = 'proposed/tools/rust-r4ghi/construct-source13-bindings.mjs', prior = fs.readFileSync(old + '/' + relative);
assert.equal(sha(prior), '64587795d83f2d8583c73e38453668730373d2f352f8a6271fbd06ce9daa85bf');
assert(!fs.existsSync(here + '/' + relative));
const argvProtocol = name => ['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', name, '--manifest-path', '/home/wangzishi/projects/poms-rust-r4ghi/apps/poms-api-rust/Cargo.toml', ...({ fmt: ['--', '--check'], clippy: ['--all-targets', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] }[name])];
const a = "  for (const name of ['fmt', 'clippy', 'test', 'build']) { const step = pointer13(rawMirror, stepPointers[name]); assert.equal(step.kind, 'actual-owned-mirror-cargo-command'); assert.equal(step.command, name); assert.equal(step.cwd, F.mirror); assert.equal(step.exitCode, 0); assert(Array.isArray(step.argv) && step.argv.length > 1 && path.isAbsolute(step.argv[0]) && path.basename(step.argv[0]) === 'cargo'); const commandIndex = step.argv[1].startsWith('+') ? 2 : 1; assert.equal(step.argv[commandIndex], name); }";
const b = `  const cargo = '/home/wangzishi/.cargo/bin/cargo', manifest = F.mirror + '/apps/poms-api-rust/Cargo.toml';
  const suffixes = { fmt: ['--', '--check'], clippy: ['--all-targets', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] };
  for (const name of ['fmt', 'clippy', 'test', 'build']) {
    const step = pointer13(rawMirror, stepPointers[name]); assert.equal(step.kind, 'actual-owned-mirror-cargo-command'); assert.equal(step.command, name); assert.equal(step.cwd, F.mirror); assert.equal(step.exitCode, 0);
    assert.deepEqual(step.argv, [cargo, '+1.99.1', name, '--manifest-path', manifest, ...suffixes[name]], 'Only the Root-approved complete mirror cargo protocol counts as an executed check: ' + name);
  }`;
assert.equal(prior.toString().split(a).length, 2);
fs.mkdirSync(path.dirname(here + '/' + relative), { recursive: true }); fs.writeFileSync(here + '/' + relative, prior.toString().replace(a, b), { flag: 'wx' });
let tests = fs.readFileSync(old + '/construct13.test.mjs', 'utf8');
const oldFixture = "argv: ['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', name]";
assert.equal(tests.split(oldFixture).length, 2);
tests = tests.replace(oldFixture, "argv: ['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', name, '--manifest-path', F.mirror + '/apps/poms-api-rust/Cargo.toml', ...({ fmt: ['--', '--check'], clippy: ['--all-targets', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] }[name])]");
tests += `
test('exit0 help or version invocations never count as actual fmt/clippy/test/build', () => {
  for (const name of ['fmt', 'clippy', 'test', 'build']) for (const flag of ['--help', '-h', '--version', '-V']) {
    const f = buildFixture02(); f.mirror.steps[name].argv.push(flag); assert.equal(f.mirror.steps[name].exitCode, 0);
    assert.throws(() => assertBuildFacts13(f.build, pins, actual.record, f.root, f.mirror), /Root-approved complete mirror cargo protocol/);
  }
});
test('test no-run and list are rejected with exit0, including flags after the harness separator', () => {
  for (const tail of [['--no-run'], ['--list'], ['--', '--list'], ['--', '--no-run']]) {
    const f = buildFixture02(); f.mirror.steps.test.argv.push(...tail); assert.equal(f.mirror.steps.test.exitCode, 0);
    assert.throws(() => assertBuildFacts13(f.build, pins, actual.record, f.root, f.mirror), /Root-approved complete mirror cargo protocol/);
  }
});
test('only the exact reviewed executable, toolchain, manifest and complete per-step suffix are accepted', () => {
  for (const mutate of [
    x => { x.mirror.steps.build.argv[0] = '/tmp/cargo'; },
    x => { x.mirror.steps.test.argv[1] = '+1.99.0'; },
    x => { x.mirror.steps.fmt.argv[4] = F.root + '/apps/poms-api-rust/Cargo.toml'; },
    x => { x.mirror.steps.clippy.argv.splice(-3); },
    x => { x.mirror.steps.build.argv.splice(-2); },
    x => { x.mirror.steps.test.argv.push('--lib'); },
    x => { x.mirror.steps.fmt.argv.splice(-2); },
    x => { x.mirror.steps.fmt.cwd = F.root; }
  ]) { const f = buildFixture02(); mutate(f); assert.throws(() => assertBuildFacts13(f.build, pins, actual.record, f.root, f.mirror)); }
});
`;
fs.writeFileSync(here + '/construct13.test.mjs', tests, { flag: 'wx' });
const check = fs.readFileSync(old + '/check13.mjs', 'utf8').replaceAll('constructor02', 'constructor03').replace('# pass 9$', '# pass 12$').replace('purePass: 9', 'purePass: 12');
fs.writeFileSync(here + '/check13.mjs', check, { flag: 'wx' }); fs.copyFileSync(old + '/input-templates13.json', here + '/input-templates13.json', fs.constants.COPYFILE_EXCL);
const shape = JSON.parse(fs.readFileSync(old + '/build-shapes02.json'));
shape.kind = 'Source13-independent-observations-fixed-cargo-protocol-template-only';
shape.expectedProtocolOnly = { cwd: '/home/wangzishi/projects/poms-rust-r4ghi', argvByCommand: Object.fromEntries(['fmt', 'clippy', 'test', 'build'].map(name => [name, argvProtocol(name)])), executionRecordedByConstructor: false };
fs.writeFileSync(here + '/build-shapes03.json', JSON.stringify(shape, null, 2) + '\n', { flag: 'wx' });
process.stdout.write('Prepared append-only exact-protocol candidate and 12 pure tests.\n');
