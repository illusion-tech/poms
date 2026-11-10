import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const cases=[];
function exercise(side){
const root=side==='Root'?'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms':'/home/wangzishi/projects/poms-r4ghi-build';
const target='/home/wangzishi/.cache/poms-r4ghi-target-ROOT15/pure-review-only/'+side;
const argv=['cargo','clippy','--offline','--lib','--no-deps','--','-D','warnings'];
const directory='/pure-review-no-writes',label=side,name='clippy',steps={};let called;const written=[];
const spawnSync=(exe,args,opts)=>{called={exe,args,opts};return {status:0,stdout:Buffer.from('stub-output'),stderr:Buffer.alloc(0)}};
const put=(d,f,b)=>{written.push({d,f,bytes:b.length});return {file:f,bytes:b.length,rawBytesSha256:crypto.createHash('sha256').update(b).digest('hex')}};
          const childEnvironment = { PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', HOME: '/home/wangzishi', USER: 'wangzishi', LANG: 'C.UTF-8', CARGO_TARGET_DIR: target, CARGO_NET_OFFLINE: 'true', CARGO_HOME: '/home/wangzishi/.cache/poms-r4def-cargo-home', RUSTUP_HOME: '/home/wangzishi/.rustup', CARGO_BUILD_JOBS: '2' };
          const r = spawnSync(argv[0], argv.slice(1), { cwd: root, env: childEnvironment, encoding: null, maxBuffer: 128_000_000, windowsHide: true });
          const stdout = put(directory, label + '-' + name + '-stdout.bin', r.stdout ?? Buffer.alloc(0)), stderr = put(directory, label + '-' + name + '-stderr.bin', r.stderr ?? Buffer.alloc(0));
          steps[name] = { kind: 'actual-source15-owned-cargo-command119', command: name, argv, cwd: root, targetDirectory: target, env: childEnvironment, exitCode: r.status, stdout, stderr };

assert.strictEqual(steps[name].env,called.opts.env);
assert.deepEqual(Object.keys(steps[name].env),['PATH','HOME','USER','LANG','CARGO_TARGET_DIR','CARGO_NET_OFFLINE','CARGO_HOME','RUSTUP_HOME','CARGO_BUILD_JOBS']);
assert.equal(steps[name].env.CARGO_HOME,'/home/wangzishi/.cache/poms-r4def-cargo-home');
assert.equal(steps[name].env.RUSTUP_HOME,'/home/wangzishi/.rustup');
assert.equal(steps[name].env.CARGO_BUILD_JOBS,'2');
assert.equal(steps[name].env.CARGO_NET_OFFLINE,'true');assert.equal(steps[name].env.CARGO_TARGET_DIR,target);assert.equal(called.opts.cwd,root);assert.equal(written.length,2);
cases.push({side,exactSameEnvironmentObject:true,environment:steps[name].env,rawLogs:written.length,realSpawn:false});
}
exercise('Root');exercise('mirror');
console.log(JSON.stringify({kind:'independent-raw03-production-child-block-pure-probe',passed:true,cases,actualCargo:false,actualFSOrCacheWrites:false},null,2));
