// Source-contract and exact actual function-span tests with isolated doubles.
// No hold121/resumePG121/Start-Process entry is executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = process.platform === 'win32'
  ? 'E:/projects/worktrees/poms-r3hijk-next28/poms'
  : '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const folder = root + '/tools/rust-r4ghi/runtime-recovery121/root';
const hashes = {
  'facts121.mjs': '6f81a1cd71f2ced84e0cb5190e18fd5ef86d2f1a4dfad0dee42110c832748382',
  'hold-runtime121.mjs': 'b607a5dd56190b16c86d4deb03ff4ad7f9f68b8942374a15e0c8a7684ebcf8d8',
  'start-holder121.ps1': '9e1b5db26c5422133a019871188bb0e9bf0f267b455ba6d44306c6808cd51753',
  'resume-original-pg121.mjs': '1da250ed2553b767d123f2d4669af4f283c4a046267eb3c0e81b408036309d51',
};
const source = Object.fromEntries(Object.entries(hashes).map(([name, expected]) => {
  const bytes = fs.readFileSync(folder + '/' + name);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected,
    'Candidate Root source changed: ' + name);
  return [name, bytes.toString()];
}));
const f = await import(pathToFileURL(folder + '/facts121.mjs').href);
const pgModule = await import(pathToFileURL(folder + '/resume-original-pg121.mjs').href);
const nonce = '45ed984a-4c52-4668-8b51-328c45d53e41';
const digest = 'a'.repeat(64);
const p = (file, sha = digest) => ({ file, rawBytesSha256: sha });

function holderInput() {
  return {
    kind: 'Root-runtime121-A-operation-input', schemaVersion: 1,
    mode: 'holder-start', namespace: f.C.namespace, nonce,
    G1: p(f.C.G1, f.C.G1SHA), codeReview: p('/unit/code-review.json'),
    executionSources: f.names.map(name => p(f.folder + '/' + name)),
    expectedStates: Object.fromEntries(Object.keys(f.stateFiles).map(key =>
      [key, p('/unit/state-' + key + '.json', f.stateSHAs[key])])),
    runtimeLossObservation: p(f.C.loss, f.C.lossSHA),
    failedRetention: p(f.C.retention, f.C.retentionSHA),
    holder: null, pgStart: null, baseline: null,
    outputDirectory: f.C.private + '/runtime121-A/holder-start/' + nonce,
  };
}

// This invokes only the actual holderFacts span, not a task entry. Everything
// resembling /proc or private JSON below is a unit double, not actual evidence.
function holderFixture() {
  const hi = holderInput(), ip = p('/unit/holder-input.json');
  const hp = p(hi.outputDirectory + '/holder-ready.json'), rp = p('/unit/holder-review.json');
  const h = {
    kind: 'actual-runtime121-A-holder-ready', namespace: f.C.namespace,
    source: p(f.folder + '/hold-runtime121.mjs'),
    node: p(f.C.node, f.C.nodeSHA), pid: 1991, startTime: '440011',
    bootId: 'unit-boot', nonce, argv: [f.C.node, f.folder + '/hold-runtime121.mjs',
      '--input', ip.file, '--input-sha', digest, '--review', rp.file,
      '--review-sha', digest, '--execute'], input: ip, review: rp,
  };
  const review = f.reviewBody(hi, ip), calls = [];
  const proc = { boot: h.bootId, start: h.startTime, exe: f.C.node,
    cwd: f.C.root, argv: [...h.argv] };
  const dependencies = {
    assert, C: f.C, folder: f.folder, shape: f.shape, reviewBody: f.reviewBody,
    procStat: f.procStat,
    json: pin => pin.file === hp.file ? h : pin.file === ip.file ? hi
      : pin.file === rp.file ? review : assert.fail('Unexpected unit JSON'),
    read: pin => { f.pinShape(pin); calls.push(pin.file); },
    samePin: (a, b) => { f.pinShape(a); f.pinShape(b);
      assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); },
    verifySources: value => { assert.equal(value, hi); calls.push('whole-holder-sources'); },
    fs: {
      readFileSync: file => {
        if (file === '/proc/sys/kernel/random/boot_id') return proc.boot + '\n';
        if (file === '/proc/' + h.pid + '/stat') {
          const tail = Array.from({ length: 24 }, (_, i) => String(i + 100));
          tail[19] = proc.start;
          return String(h.pid) + ' (holder unit) ' + tail.join(' ');
        }
        if (file === '/proc/' + h.pid + '/cmdline')
          return Buffer.from(proc.argv.join('\0') + '\0');
        return assert.fail('Unexpected unit process read');
      },
      realpathSync: file => file.endsWith('/exe') ? proc.exe
        : file.endsWith('/cwd') ? proc.cwd : assert.fail('Unexpected unit realpath'),
    },
  };
  const keys = Object.keys(dependencies);
  const compile = functionText => vm.compileFunction('return (' + functionText + ')', keys)(
    ...keys.map(key => dependencies[key]));
  const fn = compile(f.holderFacts.toString());
  return { h, hi, hp, ip, rp, proc, review, calls, run: () => fn({ holder: hp }), runSource: text => compile(text)({ holder: hp }) };
}

test('actual holderFacts span binds boot/start/exe/cwd/whole argv and source provenance (unit doubles)', () => {
  const x = holderFixture();
  assert.equal(x.run(), x.h);
  assert(x.calls.includes(x.h.source.file));
  assert(x.calls.includes(f.C.node));
  assert(x.calls.includes('whole-holder-sources'));
});

test('actual holderFacts span rejects process identity drift and arbitrary holder arguments (unit doubles)', () => {
  const mutations = [
    x => { x.proc.boot = 'wrong-boot'; },
    x => { x.proc.start = '999'; },
    x => { x.proc.exe = '/unit/foreign-node'; },
    x => { x.proc.cwd = '/unit/foreign-root'; },
    x => { x.proc.argv.push('--dynamic-callback'); },
    x => { x.proc.argv[0] = '/unit/foreign-node'; x.h.argv[0] = x.proc.argv[0]; },
    x => { x.h.source.file = '/unit/foreign-holder.mjs'; },
    x => { x.h.node.rawBytesSha256 = 'b'.repeat(64); },
    x => { x.h.nonce = 'other'; },
    x => { x.review.APIStart = true; },
    x => { x.review.extraGrant = true; },
  ];
  for (const mutate of mutations) {
    const x = holderFixture(); mutate(x); assert.throws(() => x.run());
  }
});

function lifecycle(overrides = {}) {
  // Exact inner Promise expression; never invoke the whole hold121 export.
  const span = source['hold-runtime121.mjs'].match(
    /await (new Promise\(\(resolve,reject\)=>\{[\s\S]*?\n  \}\));/);
  assert(span && span.length === 2, 'Actual holder lifecycle span must be unique');
  const callbacks = {}, writes = [], cleared = [];
  const model = { source: Buffer.from('unit-holder-source'), boot: 'unit-boot' };
  const unitSha = b => createHash('sha256').update(b).digest('hex');
  const environment = {
    assert, Promise, Error, source: { file: '/unit/holder.mjs',
      rawBytesSha256: unitSha(model.source) }, ready: { file: '/unit/ready.json' },
    p: { outputDirectory: '/unit/output' }, Date,
    fs: { readFileSync: file => file === '/unit/holder.mjs' ? model.source
      : file === '/proc/sys/kernel/random/boot_id' ? model.boot + '\n'
        : file === '/unit/ready.json' ? JSON.stringify({ bootId: 'unit-boot' })
          : assert.fail('Unexpected unit lifecycle FS') },
    sha: unitSha,
    process: { once: (name, fn) => { callbacks[name] = fn; } },
    setInterval: (fn, delay) => { callbacks.tick = fn;
      assert.equal(delay, 30000); return 'unit-interval'; },
    clearInterval: id => cleared.push(id),
    writeWx: (dir, name, value) => { writes.push({ dir, name, value });
      if (overrides.writeFailure) throw Error('unit-write-failure');
      return { file: dir + '/' + name }; },
  };
  const promise = vm.runInNewContext(span[1], environment);
  return { promise, callbacks, writes, cleared, model };
}

test('actual inner holder loop retains explicit signal result once and signals no PG/API (unit doubles)', async () => {
  const x = lifecycle(); x.callbacks.SIGTERM(); x.callbacks.SIGINT();
  await x.promise;
  assert.equal(x.writes.length, 1);
  assert.equal(x.writes[0].name, 'holder-ended.json');
  assert.equal(x.writes[0].value.reason, 'received-SIGTERM');
  assert.equal(x.writes[0].value.automaticPGOrAPISignal, false);
  assert.deepEqual(x.cleared, ['unit-interval']);
});

test('actual inner holder loop preserves boot/source failure and rejects, no automatic restart (unit doubles)', async () => {
  for (const kind of ['source', 'boot']) {
    const x = lifecycle();
    if (kind === 'source') x.model.source = Buffer.from('changed source');
    else x.model.boot = 'changed-boot';
    x.callbacks.tick();
    await assert.rejects(x.promise);
    assert.equal(x.writes.length, 1);
    assert.equal(x.writes[0].value.reason, 'own-source-or-boot-change');
    assert.equal(x.writes[0].value.automaticPGOrAPISignal, false);
  }
  const x = lifecycle({ writeFailure: true }); x.callbacks.SIGTERM();
  await assert.rejects(x.promise, /unit-write-failure/);
});

test('actual PowerShell source fixes hidden Debian foreground argv and preserves original pipes', () => {
  const ps = source['start-holder121.ps1'];
  const argv = ps.match(/\$taskArguments=@\(([^\n]*)\)/);
  assert(argv, 'One actual argv literal');
  const tokens = [...argv[1].matchAll(/'([^']*)'|(\$[A-Za-z][A-Za-z0-9]*)/g)]
    .map(m => m[1] ?? m[2]);
  assert.deepEqual(tokens, ['-d', 'Debian', '--cd', '$taskLinuxRoot', '--exec',
    '$taskLinuxNode', '$taskHolder', '--input', '$InputFile', '--input-sha',
    '$InputSha', '--review', '$ReviewFile', '--review-sha', '$ReviewSha', '--execute']);
  assert.match(ps, /Start-Process[^\n]*-WindowStyle Hidden[^\n]*-RedirectStandardOutput \$taskStdout[^\n]*-RedirectStandardError \$taskStderr/);
  assert.match(ps, /Existing original pipes forbid replay/);
  assert.match(ps, /\[IO\.FileMode\]::CreateNew/);
  assert.match(ps, /No holder ready original; preserve live process and reconcile/);
  assert.doesNotMatch(ps, /Stop-Process|Restart-Computer|wsl[^\n]*(?:--shutdown|--terminate)|Invoke-Expression/i);
});

test('actual PG unknown-outcome catch span preserves startAttempted and forbids retry (unit doubles)', () => {
  const pg = source['resume-original-pg121.mjs'];
  const match = pg.match(/\} catch\(e\) \{\n([\s\S]*?)\n  \}\n\}/);
  assert(match, 'One actual PG outer catch span');
  const writes = [], inv = { input: p('/unit/input'), review: p('/unit/review') };
  const fn = vm.runInNewContext('(e)=>{' + match[1] + '}', {
    writeWx: (dir, name, value) => writes.push({ dir, name, value }),
    p: { outputDirectory: '/unit/output' }, inv, intent: p('/unit/intent'),
    startAttempted: true,
  });
  const error = Error('unit unknown start result');
  assert.throws(() => fn(error), caught => caught === error);
  assert.equal(writes.length, 1);
  const partial = writes[0].value;
  assert.equal(partial.kind, 'runtime121-A-PG-start-preserve');
  assert.equal(partial.startAttempted, true);
  assert.equal(partial.processMayBeRunning, true);
  assert.equal(partial.automaticStop, false);
  assert.equal(partial.blindRetryForbidden, true);
  assert.match(pg, /raw\(\['start',C\.container\]\)/);
  assert.doesNotMatch(pg, /raw\(\['(?:create|rm|stop|restart)'/);
});

test('actual readonly original-PG inspector rejects identity/mount/port differences (process double)', () => {
  function run(mutate) {
    const c = { Id: f.C.container, Image: f.C.image,
      Mounts: [{ Type: 'volume', Name: f.C.volume, Source: f.C.volumeRoot, Destination: f.C.volumeTarget, Driver: 'local', RW: true, Mode: '', Options: ['rbind','nosuid','nodev'], Propagation: 'rprivate' }],
      Config: { Env: ['PGDATA=' + f.C.volumeTarget] },
      HostConfig: { PortBindings: { '15432/tcp': [{ HostIp: '127.0.0.1', HostPort: '25434' }] } },
      State: { Status: 'exited', Running: false, Pid: 0 } };
    mutate?.(c); const calls = [];
    const deps = { assert, C: f.C, run: args => {
      calls.push(args); assert.deepEqual(args, ['inspect', f.C.container]);
      return { stdout: JSON.stringify([c]) };
    } };
    const keys = Object.keys(deps);
    const fn = vm.compileFunction('return (' + pgModule.inspectOriginalPG121.toString() + ')', keys)(
      ...keys.map(key => deps[key]));
    const result = fn(); assert.equal(calls.length, 1); return result;
  }
  assert.equal(run().running, false);
  for (const mutate of [
    c => { c.Id = 'foreign'; }, c => { c.Image = 'foreign'; },
    c => { c.Mounts = []; }, c => { c.Mounts[0].Source = '/unit/foreign-volume'; },
    c => { c.HostConfig.PortBindings['15432/tcp'][0].HostIp = '0.0.0.0'; },
    c => { c.HostConfig.PortBindings['15432/tcp'][0].HostPort = '5432'; },
  ]) assert.throws(() => run(mutate));
});

// Exact old function projections from the frozen A01 source capture.
// Unit process data only; no archived B sources or actual process are executed.
const oldHolderFacts121Projection = "function holderFacts(p) {\n  const h=json(p.holder);assert.equal(h.kind,'actual-runtime121-A-holder-ready');assert.equal(h.namespace,C.namespace);assert.equal(h.source.file,folder+'/hold-runtime121.mjs');assert.equal(h.node.file,C.node);assert.equal(h.node.rawBytesSha256,C.nodeSHA);read(h.source);read(h.node);\n  assert.equal(fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),h.bootId);const st=procStat(fs.readFileSync('/proc/'+h.pid+'/stat','utf8'));assert.equal(st.startTime,h.startTime);assert.equal(fs.realpathSync('/proc/'+h.pid+'/exe'),C.node);assert.equal(fs.realpathSync('/proc/'+h.pid+'/cwd'),C.root);\n  const cmd=fs.readFileSync('/proc/'+h.pid+'/cmdline').toString().split('\\0').filter(Boolean);assert.deepEqual(cmd,h.argv);assert.equal(cmd[0],C.node);assert.equal(cmd[1],h.source.file);assert.equal(json(h.input).nonce,h.nonce);samePin(json(h.review).approvedInput,h.input);assert.deepEqual(json(h.review),reviewBody(shape(json(h.input)),h.input));\n  const holderInput=shape(json(h.input));verifySources(holderInput);assert.equal(holderInput.mode,'holder-start');return h;\n}";
const oldInspect121Projection = "function inspectOriginalPG121() {\n  const c=JSON.parse(run(['inspect',C.container]).stdout)[0];\n  assert.equal(c.Id,C.container);assert.equal(c.Image,C.image);\n  const m=c.Mounts.find(x=>x.Name===C.volume);assert(m);assert.equal(m.Source,C.volumeRoot);\n  assert.deepEqual(c.HostConfig.PortBindings['15432/tcp'],[{HostIp:'127.0.0.1',HostPort:'25434'}]);\n  return{id:c.Id,image:c.Image,status:c.State.Status,running:c.State.Running,pid:c.State.Pid,volume:m.Name,volumeSource:m.Source,portBinding:c.HostConfig.PortBindings['15432/tcp']};\n}";

test('IR-A02 actual old holder projection accepts wrong argv/ready identity; corrected actual function rejects (OS double)', () => {
  for (const slot of [3,5,7,9]) {
    const x=holderFixture();x.h.argv[slot]='unit-wrong-slot';x.proc.argv[slot]=x.h.argv[slot];
    assert.equal(x.runSource(oldHolderFacts121Projection),x.h);
    assert.throws(()=>x.run());
  }
  const x=holderFixture();x.hp.file='/unit/foreign-holder-ready.json';
  assert.equal(x.runSource(oldHolderFacts121Projection),x.h);assert.throws(()=>x.run());
});

test('corrected holder requires actual numeric pid/start and exact source graph linkage (OS double)', () => {
  for(const mutate of [x=>{x.h.pid='1991';},x=>{x.h.startTime='invalid';x.proc.start='invalid';},x=>{x.h.source.rawBytesSha256='c'.repeat(64);}]){const x=holderFixture();mutate(x);assert.throws(()=>x.run());}
});

test('IR-A01 actual old PG projection accepts mount/env/status drift; corrected actual inspector rejects (process double)', () => {
  const base=()=>({Id:f.C.container,Image:f.C.image,Mounts:[{Type:'volume',Name:f.C.volume,Source:f.C.volumeRoot,Destination:f.C.volumeTarget,Driver:'local',RW:true,Mode:'',Options:['rbind','nosuid','nodev'],Propagation:'rprivate'}],Config:{Env:['PGDATA='+f.C.volumeTarget]},HostConfig:{PortBindings:{'15432/tcp':[{HostIp:'127.0.0.1',HostPort:'25434'}]}},State:{Status:'exited',Running:false,Pid:0}});
  const mutations=[c=>{c.Mounts[0].Destination='/unit/wrong';},c=>{c.Mounts.push({...c.Mounts[0]});},c=>{c.Mounts[0].Type='bind';},c=>{c.Mounts[0].RW=false;},c=>{c.Mounts[0].Driver='foreign';},c=>{c.Mounts[0].Options.push('extra');},c=>{c.Mounts[0].Propagation='shared';},c=>{c.Config.Env=['PGDATA=/unit/wrong'];},c=>{c.Config.Env.push('PGDATA='+f.C.volumeTarget);},c=>{c.State.Status='paused';}];
  function inspect(text,c){const deps={assert,C:f.C,run:args=>{assert.deepEqual(args,['inspect',f.C.container]);return{stdout:JSON.stringify([c])};}},keys=Object.keys(deps);return vm.compileFunction('return ('+text+')',keys)(...keys.map(k=>deps[k]))();}
  for(const mutate of mutations){const c=base();mutate(c);assert.equal(inspect(oldInspect121Projection,c).id,f.C.container);assert.throws(()=>inspect(pgModule.inspectOriginalPG121.toString(),c));}
  assert.equal(inspect(pgModule.inspectOriginalPG121.toString(),base()).status,'exited');
  const active=base();active.State={Status:'running',Running:true,Pid:123};assert.equal(inspect(pgModule.inspectOriginalPG121.toString(),active).pid,123);
  assert.match(source['resume-original-pg121.mjs'],/assert\.equal\(before\.status,'exited'\)/);
  assert.match(source['resume-original-pg121.mjs'],/assert\.equal\(after\.status,'running'\)/);
});
