// G1-A candidate tests: real pure exports and I-owned temporary FS only.
// Never call loadCLI/verifyStates/opIntent against the actual private namespace.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.platform === 'win32'
  ? 'E:/projects/worktrees/poms-r3hijk-next28/poms'
  : '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const sourceFile = root + '/tools/rust-r4ghi/runtime-recovery121/root/facts121.mjs';
const source = fs.readFileSync(sourceFile);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(source), '25749d1a59c7193654e56a772d64285c4bf855ca8e90c22d2e2b9d5d3561cd42',
  'Candidate source changed: bind the actual new Root revision explicitly');
const facts = await import(pathToFileURL(sourceFile).href);
const { C, folder, inputKeys, names, stateFiles, stateSHAs, shape, pinShape, reviewBody, procStat } = facts;
const nonce = '45ed984a-4c52-4668-8b51-328c45d53e41';
const digest = 'a'.repeat(64);
const p = (file, rawBytesSha256 = digest) => ({ file, rawBytesSha256 });
const clone = value => structuredClone(value);

function input(mode = 'holder-start') {
  return {
    kind: 'Root-runtime121-A-operation-input', schemaVersion: 1, mode,
    namespace: C.namespace, nonce,
    G1: p(C.G1, C.G1SHA), codeReview: p('/unit/code-review.json'),
    executionSources: names.map(name => p(folder + '/' + name)),
    expectedStates: Object.fromEntries(Object.keys(stateFiles).map(key =>
      [key, p('/unit/retained-' + key + '.json', stateSHAs[key])])),
    runtimeLossObservation: p(C.loss, C.lossSHA),
    failedRetention: p(C.retention, C.retentionSHA),
    holder: mode === 'holder-start' ? null : p('/unit/holder-ready.json'),
    pgStart: mode === 'pg-observe' ? p('/unit/pg-start.json') : null,
    baseline: mode === 'pg-observe' ? p(C.baseline, C.baselineSHA) : null,
    outputDirectory: C.private + '/runtime121-A/' + mode + '/' + nonce,
  };
}

// Project the actual function, not an implementation mirror. All process/FS
// dependencies here are explicit unit doubles; no current task data are read.
function projected(fn, dependencies) {
  const keys = Object.keys(dependencies);
  return vm.compileFunction('return (' + fn.toString() + ')', keys)(
    ...keys.map(key => dependencies[key]));
}

test('actual pure input accepts exactly the frozen 15 keys and three mode/null matrices', () => {
  for (const mode of ['holder-start', 'pg-start', 'pg-observe']) {
    const value = input(mode);
    assert.equal(Object.keys(value).length, 15);
    assert.equal(shape(value), value);
    assert.deepEqual(Object.keys(value).sort(), [...inputKeys].sort());
    const required = mode === 'holder-start' ? [] : mode === 'pg-start'
      ? ['holder'] : ['holder', 'pgStart', 'baseline'];
    for (const key of ['holder', 'pgStart', 'baseline']) {
      const wrong = clone(value);
      wrong[key] = required.includes(key) ? null : p('/unit/unsanctioned.json');
      assert.throws(() => shape(wrong), mode + ' ' + key);
    }
  }
});

test('actual pure input rejects extra/missing keys, unknown mode, changed kind/version/namespace', () => {
  const mutations = [
    x => { x.extra = true; }, x => { delete x.codeReview; },
    x => { x.mode = 'api-start'; }, x => { x.kind = 'other'; },
    x => { x.schemaVersion = 2; }, x => { x.namespace = 'other'; },
  ];
  for (const mutate of mutations) {
    const value = input(); mutate(value); assert.throws(() => shape(value));
  }
});

test('actual input rejects nonce and all output path substitution/traversal', () => {
  for (const bad of ['', 'fixed', nonce.toUpperCase(), nonce.replace('-4668-', '-5668-')]) {
    const value = input(); value.nonce = bad; assert.throws(() => shape(value));
  }
  for (const bad of [
    '/tmp/elsewhere', C.private + '/runtime121-A/holder-start/' + nonce + '/child',
    C.private + '/runtime121-A/pg-start/' + nonce,
    C.private + '/runtime121-A/holder-start/../' + nonce,
  ]) {
    const value = input(); value.outputDirectory = bad; assert.throws(() => shape(value));
  }
});

test('actual input rejects wrong fixed source/loss/retention/baseline anchors', () => {
  for (const key of ['G1', 'runtimeLossObservation', 'failedRetention']) {
    for (const field of ['file', 'rawBytesSha256']) {
      const value = input();
      value[key][field] = field === 'file' ? '/unit/replaced.json' : 'f'.repeat(64);
      assert.throws(() => shape(value), key + ':' + field);
    }
  }
  for (const field of ['file', 'rawBytesSha256']) {
    const value = input('pg-observe');
    value.baseline[field] = field === 'file' ? '/unit/other.json' : 'f'.repeat(64);
    assert.throws(() => shape(value));
  }
});

test('actual input requires complete exact seven source filenames and all four state pins', () => {
  const mutations = [
    x => { x.executionSources.pop(); },
    x => { x.executionSources.push(p(folder + '/extra.mjs')); },
    x => { x.executionSources[0] = clone(x.executionSources[1]); },
    x => { x.executionSources[0].file = '/unit/' + names[0]; },
    x => { x.executionSources[0].file = folder + '/../' + names[0]; },
    x => { x.expectedStates.extra = p('/unit/extra.json'); },
    x => { delete x.expectedStates.state15; },
    x => { x.expectedStates.ownership15.rawBytesSha256 = 'b'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const value = input(); mutate(value); assert.throws(() => shape(value));
  }
});

test('actual pin shape rejects noncanonical paths, extra keys and invalid optional bytes', () => {
  assert.equal(pinShape(p('/unit/file.json')).file, '/unit/file.json');
  for (const bad of ['relative.json', 'E:/unit.json', '/unit/../else', '/unit/./file',
    '/unit//file', '/unit/file?callback=x', '/unit/file;exec', '/unit/with space']) {
    assert.throws(() => pinShape(p(bad)), bad);
  }
  for (const value of [
    { ...p('/unit/file'), injected: true },
    { ...p('/unit/file'), bytes: -1 },
    { ...p('/unit/file'), bytes: 1.1 },
    { ...p('/unit/file'), rawBytesSha256: 'ABC' },
  ]) assert.throws(() => pinShape(value));
});

test('actual pure review body is the complete frozen 12-key object, not a permission subset', () => {
  for (const mode of ['holder-start', 'pg-start', 'pg-observe']) {
    const value = input(mode), ip = p('/unit/input-' + mode + '.json');
    const review = reviewBody(value, ip);
    assert.deepEqual(Object.keys(review).sort(), [
      'kind', 'approvedInput', 'G1', 'codeReview', 'mode', 'nonce',
      'actualG2Authorized', 'processControl', 'readonlyPG', 'APIStart',
      'businessDML', 'createReplaceRestoreMigrate',
    ].sort());
    assert.equal(review.actualG2Authorized, true);
    assert.equal(review.processControl, mode !== 'pg-observe');
    assert.equal(review.readonlyPG, mode === 'pg-observe');
    for (const key of ['APIStart', 'businessDML', 'createReplaceRestoreMigrate'])
      assert.equal(review[key], false);
  }
});

test('actual loadCLI source rejects any whole-review mutation before state/source operations (unit doubles)', () => {
  const value = input(), ip = p('/unit/input.json'), rp = p('/unit/review.json');
  const valid = reviewBody(value, ip);
  function run(review, args = ['--input', ip.file, '--input-sha', digest,
    '--review', rp.file, '--review-sha', digest, '--execute']) {
    const calls = [];
    const fn = projected(facts.loadCLI, {
      assert, process: { argv: [], execArgv: [], env: {}, platform: 'unit' },
      pin: file => file === ip.file ? ip : rp,
      json: q => q.file === ip.file ? value : review, shape, reviewBody, assertOperatorHost121: () => {}, assertOperatorHost121: () => {},
      verifySources: () => calls.push('sources'),
      verifyStates: () => calls.push('states'),
    });
    const result = fn('holder-start', args);
    assert.deepEqual(calls, ['sources', 'states']);
    return result;
  }
  assert.equal(run(valid).p.mode, 'holder-start');
  for (const key of Object.keys(valid)) {
    const changed = clone(valid);
    if (key === 'kind') changed[key] = 'other';
    else if (typeof changed[key] === 'boolean') changed[key] = !changed[key];
    else if (typeof changed[key] === 'string') changed[key] += '-changed';
    else changed[key] = p('/unit/other.json');
    assert.throws(() => run(changed), key);
  }
  assert.throws(() => run({ ...valid, extra: true }));
  const missing = clone(valid); delete missing.businessDML;
  assert.throws(() => run(missing));
  assert.throws(() => run(valid, ['--input', ip.file]));
});

test('actual verifySources source checks source review and actual leaf reads (unit doubles)', () => {
  const value = input(), reads = [];
  const codeReview = {
    kind: 'non-author-runtime121-A-code-review',
    verdict: 'code-ready-for-exact-runtime121-A-input-review',
    reviewerIsAuthor: false, executionSources: value.executionSources,
  };
  const g1 = { kind: 'Root-frozen-runtime-recovery121-G1A',
    actualG2Authorized: false, codeImplementationGranted: true };
  const fn = projected(facts.verifySources, {
    assert,
    json: q => q.file === value.G1.file ? g1 : q.file === value.codeReview.file
      ? codeReview : { kind: 'unit-runtime-loss' },
    read: q => { reads.push(q.file); assert(q.rawBytesSha256 === digest, 'Unit leaf drift'); },
  });
  fn(value);
  assert.deepEqual(reads, value.executionSources.map(q => q.file));
  codeReview.reviewerIsAuthor = true; assert.throws(() => fn(value));
  codeReview.reviewerIsAuthor = false;
  codeReview.executionSources = [...value.executionSources].reverse();
  assert.throws(() => fn(value));
  codeReview.executionSources = value.executionSources;
  const drift = clone(value); drift.executionSources[2].rawBytesSha256 = 'b'.repeat(64);
  assert.throws(() => fn(drift));
});

test('actual CLI source rejects extra Node loaders/options, wrong flags/mode/hash before effects (unit doubles)', () => {
  const value = input(), ip = p('/unit/input.json'), rp = p('/unit/review.json');
  const args = ['--input', ip.file, '--input-sha', digest,
    '--review', rp.file, '--review-sha', digest, '--execute'];
  function make(proc) {
    return projected(facts.loadCLI, {
      assert, process: { argv: [], execArgv: [], env: {}, platform: 'unit', ...proc },
      pin: file => file === ip.file ? ip : rp,
      json: q => q.file === ip.file ? value : reviewBody(value, ip),
      shape, reviewBody, assertOperatorHost121: () => {}, verifySources: () => {}, verifyStates: () => {},
    });
  }
  for (const proc of [
    { execArgv: ['--import', '/unit/foreign.mjs'] },
    { env: { NODE_OPTIONS: '--loader /unit/foreign' } },
    { env: { NODE_PATH: '/unit/foreign' } },
  ]) assert.throws(() => make(proc)('holder-start', args));
  const wrongFlag = [...args]; wrongFlag[8] = '--force';
  assert.throws(() => make({})('holder-start', wrongFlag));
  const wrongHash = [...args]; wrongHash[3] = 'f'.repeat(64);
  assert.throws(() => make({})('holder-start', wrongHash));
  assert.throws(() => make({})('pg-start', args));
});

test('actual verifyStates span rejects state byte drift, any driver lock and wrong retained-copy map (FS doubles)', () => {
  const value = input(), keyByFile = new Map(Object.entries(stateFiles).map(([key, file]) => [file, key]));
  function run(options = {}) {
    const buffers = Object.fromEntries(Object.keys(stateFiles).map(key => [key, Buffer.from('unit-' + key)]));
    const map = {
      originalsUnmodified: true,
      mappings: [{ original: { rawBytesSha256: stateSHAs.state15 },
        privateRetainedCopy: { file: value.expectedStates.state15.file } }],
    };
    if (options.badMap) map.mappings[0].privateRetainedCopy.file = '/unit/wrong-retained-copy';
    const fn = projected(facts.verifyStates, {
      assert, stateFiles, stateSHAs, C,
      read: pin => buffers[Object.keys(value.expectedStates).find(k => value.expectedStates[k].file === pin.file)],
      json: () => map, local: file => file,
      fs: {
        readFileSync: file => file === stateFiles[options.drift] ? Buffer.from('changed bytes')
          : buffers[keyByFile.get(file)],
        existsSync: file => Boolean(options.lock && file.includes('/g2-business' + options.lock + '/')),
      },
    });
    return fn(value);
  }
  run();
  for (const drift of Object.keys(stateFiles)) assert.throws(() => run({ drift }));
  for (const lock of [13, 14, 15]) assert.throws(() => run({ lock }));
  assert.throws(() => run({ badMap: true }));
});

test('actual /proc parser preserves comm spaces/parentheses and reads kernel start field', () => {
  const tail = Array.from({ length: 24 }, (_, i) => String(i + 100));
  tail[19] = '440011';
  assert.deepEqual(procStat('1991 (holder ) with ( spaces) ' + tail.join(' ')),
    { pid: 1991, startTime: '440011' });
  for (const value of ['', '1991 bad', '1991 (short) R 1 2'])
    assert.throws(() => procStat(value));
});

test('actual read/writeWx/samePin operate only on fresh I-owned regular fixture files', () => {
  const dir = fs.mkdtempSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '.facts121-fixtures-'));
  const linux = process.platform === 'win32'
    ? '/mnt/' + dir[0].toLowerCase() + '/' + dir.slice(3).replaceAll('\\', '/')
    : dir;
  const first = facts.writeWx(linux, 'original.bin', Buffer.from('actual unit bytes\n'));
  assert.equal(facts.read(first).toString(), 'actual unit bytes\n');
  facts.samePin(first, { file: first.file, rawBytesSha256: first.rawBytesSha256 });
  assert.throws(() => facts.samePin(first, { ...first, bytes: first.bytes + 1 }));
  assert.throws(() => facts.read({ ...first, rawBytesSha256: 'c'.repeat(64) }));
  assert.throws(() => facts.writeWx(linux, 'original.bin', Buffer.from('overwrite')));
  assert.equal(fs.readFileSync(dir + '/original.bin').toString(), 'actual unit bytes\n');
  assert.throws(() => facts.writeWx(linux, '../escape.bin', Buffer.from('escape')));
  fs.linkSync(dir + '/original.bin', dir + '/hardlink.bin');
  assert.throws(() => facts.read(first));
  // Fixtures stay under this test's directory as evidence; no recursive cleanup.
});

test('actual read span rejects symlink/nonregular/realpath aliases before content (explicit FS double)', () => {
  const bytes = Buffer.from('unit source');
  function run(kind) {
    let readCount = 0;
    const file = '/unit/source.bin';
    const fn = projected(facts.read, {
      assert, pinShape, local: x => x, path, sha: hash,
      fs: {
        lstatSync: () => ({
          isFile: () => kind !== 'directory',
          isSymbolicLink: () => kind === 'symlink', nlink: kind === 'hardlink' ? 2 : 1,
        }),
        realpathSync: () => path.resolve(kind === 'alias' ? '/unit/other.bin' : file),
        readFileSync: () => { readCount++; return bytes; },
      },
    });
    const result = fn({ file, rawBytesSha256: hash(bytes), bytes: bytes.length });
    return { result, readCount };
  }
  assert.equal(run('regular').readCount, 1);
  for (const kind of ['directory', 'symlink', 'hardlink', 'alias'])
    assert.throws(() => run(kind), kind);
});

test('actual new operator-host span validates fixed cwd/hash/uid and rejects Node injection (OS doubles)', () => {
  const bytes = Buffer.from('unit executable');
  function run(change = {}) {
    const platform = change.platform ?? 'linux';
    const environment = {
      assert, C: { ...C, nodeSHA: hash(bytes), nodeWinSHA: hash(bytes) }, sha: hash,
      process: {
        platform, execArgv: change.execArgv ?? [], env: change.env ?? {},
        execPath: '/unit/executable',
        cwd: () => change.cwd ?? (platform === 'linux' ? C.root : C.winRoot.replaceAll('/', '\\')),
        getuid: () => change.uid ?? 1000,
      },
      fs: { readFileSync: file => {
        assert.equal(file, '/unit/executable');
        return change.bytes ?? bytes;
      } },
    };
    return projected(facts.assertOperatorHost121, environment)();
  }
  run(); run({ platform: 'win32' });
  for (const change of [
    { platform: 'darwin' }, { cwd: '/unit/foreign' }, { uid: 0 },
    { bytes: Buffer.from('changed executable') }, { execArgv: ['--import', 'foreign'] },
    { env: { NODE_OPTIONS: '--loader foreign' } }, { env: { NODE_PATH: 'foreign' } },
  ]) assert.throws(() => run(change));
});

test('actual directory guard rejects redirect/nonowner/reused nonce before work (explicit FS double)', () => {
  function run(options = {}) {
    const dir = options.dir ?? C.private + '/runtime121-A/unit/nonce', made = [];
    const deps = {
      assert, C, path, local: x => x, process: { platform: 'linux' },
      fs: {
        lstatSync: file => ({
          isDirectory: () => !options.notDirectory,
          isSymbolicLink: () => options.symlink === file,
          uid: options.uid ?? 1000,
        }),
        realpathSync: file => path.resolve(options.alias === file ? '/unit/foreign' : file),
        existsSync: file => options.existingLeaf ? true : file !== dir,
        mkdirSync: (file, mode) => { assert.deepEqual(mode, { mode: 0o700 }); made.push(file); },
      },
    };
    const result = projected(facts.directory121, deps)(dir, { exclusive: true });
    assert.equal(result, dir);
    assert.deepEqual(made, [dir]);
  }
  run();
  for (const options of [
    { dir: '/tmp/elsewhere' }, { dir: C.private + '/runtime121-A/../escaped' },
    { symlink: C.private }, { alias: C.private }, { uid: 0 },
    { existingLeaf: true }, { notDirectory: true },
  ]) assert.throws(() => run(options));
});

test('actual dispatcher prewrite source requires complete review body/hash/path (unit dependencies)', async () => {
  const dispatchFile = root + '/tools/rust-r4ghi/runtime-recovery121/root/dispatch121.mjs';
  const text = fs.readFileSync(dispatchFile, 'utf8');
  assert.equal(hash(text), 'd59f9ed7095e66fca1ae9ea0b08c79e8d050fbaad7912c934451e3be46430ed5');
  const begin = text.indexOf('  const p=shape(json(q.input));');
  const end = text.indexOf("  if(p.mode==='holder-start')", begin);
  assert(begin > 0 && end > begin);
  const span = text.slice(begin, end);
  function run(mutate) {
    const value = input('pg-start'), ip = p('/unit/input.json');
    const body = reviewBody(value, ip), raw = Buffer.from(JSON.stringify(body, null, 2) + '\n');
    const q = { input: ip, mode: value.mode, expectedRootReviewBody: body,
      expectedRootReview: { file: '/unit/Root-review.json', bytes: raw.length, rawBytesSha256: hash(raw) } };
    mutate?.(q);
    const deps = { assert, Buffer, q, shape, json: () => value, reviewBody, sha: hash,
      local: x => x, fs: { existsSync: () => false }, verifySources: () => {}, verifyStates: () => {} };
    const keys = Object.keys(deps);
    vm.compileFunction(span, keys)(...keys.map(key => deps[key]));
  }
  run();
  for (const key of Object.keys(reviewBody(input('pg-start'), p('/unit/input.json'))))
    assert.throws(() => run(q => { q.expectedRootReviewBody[key] = null; }), key);
  assert.throws(() => run(q => { q.expectedRootReviewBody.extra = true; }));
  assert.throws(() => run(q => { q.expectedRootReview.bytes++; }));
  assert.throws(() => run(q => { q.expectedRootReview.file = '/unit/other-review.json'; }));
  assert.throws(() => run(q => { q.expectedRootReview.rawBytesSha256 = 'f'.repeat(64); }));
});
