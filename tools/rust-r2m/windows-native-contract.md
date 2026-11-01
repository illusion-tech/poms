# R2M actual Windows Native source candidate

This entry runs the original `0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4`
Native bundle in the real Windows FNM Node24.19 executable
`3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237`.
The source candidate is not an actual Windows Native or UI acceptance result.
Root stages and executes it only after the necessary independent source review.
The existing Windows `dist/apps/poms-api/main.js` is not overwritten or used.

The sole staged bundle is
`tmp/rust-r2m/windows-native-bundle/0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4/main.cjs`.
Its hash must also be the current capsule's `native-main` artifact. The driver
hashes the exact regular staged file and refuses symlinks. Installed Windows
Node dependencies are used read-only; the actual locked MikroORM7.0.11
subscriber and transaction-event SDK sources are included in each runtime report.

Root Linux API:

```js
const native = await startWindowsOriginalNative({
  tag, runId, sourceCap, admittedContexts, onCommitted,
  retain, append, signal, totalTimeoutMs: 900000
});
await native.admitContext(correlationId, {runId, caseId, index, op: 'm.http'});
const response = await native.request({
  correlationId, requestId, method: 'POST', path: '/api/contracts/<owned-id>:submitReview',
  purpose: 'producer', headers, body
});
await native.witness.drain();
native.witness.assertComplete();
const actualSdkTrace = native.witness.snapshot();
const actualSql = native.sql;
const actualRuntime = native.report();
await native.close();
```

`metadata` is returned at actual ready. `witness.drain()` invokes the Windows
owner, waits for HTTP/SDK drain, delivers the actual original SDK committed
creates to Root's callback and atomically refreshes the cached witness/SQL/report.
The synchronous `snapshot()`, `assertComplete()` and `report()` use that cache.
Callback delivery failure blocks certification; it does not invent an SDK
certificate from a PG observation. The private stdio frame preserves the
original batch for controlled recovery.

Every HTTP exchange must first await `admitContext`. The exact run, canonical
case, index and `m.http|m.producer` operation are validated. The source request ID
is the fixture's SHA256 case identity. Root cookies and CSRF headers may travel
over this private stdio channel. Fixed-host headers cannot be overridden.
Windows performs real HTTP to `127.0.0.1:10070`; Linux loopback reachability is
not assumed. The dispatch decision precedes transport and admits only the
current115 surface plus four named UI3/4 Native producer/read-model routes.
There is no response-based fallback. Buffer bodies travel as base64 and are
decoded once; original raw response bytes/headers/window return to Root's private
retention callback. Public bridge logs contain frame/stderr hashes only.
Original stdout/stderr chunks are additionally retained as exact base64 bytes
in the new run's private evidence queue. Startup/command/final-close failure
frames carry original error name/message/stack privately, while the public
surface keeps its fixed category. Configuration or environment objects are
never dumped as error diagnostics. Close waits for both private queues.

Before any private configuration or application import, the driver publishes
its actual Windows `process.pid`, executable/hash, argv, fixed driver path/hash
and nonce. Root's separate PowerShell helper verifies PID/start ticks/CIM birth,
executable/hash and the exact driver command, then ACKs. Configuration is refused
before that ACK. The process helper is derived from A's reviewed mature helper
snapshot `7b0f0e80b143cb3583fb0b0fe2fe830b05231bcae5bd6e39654ccf4e746c6be0`;
only the fixed driver filename and corresponding error label change. Tree
enumeration/reuse guards and exact acquired-process stopping stay unchanged.

`deriveWindowsNativeEnvironment()` reads only this new M's fixed `nest.env` and
exclusively creates `windows-nest.env` under its same0700 private directory.
An existing derived file must already match exactly. Only the single
`POMS_ATTACHMENT_LOCAL_ROOT` line changes to
`//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r2m/objects/nest/server01`;
all other bytes, including database/port/credentials, remain exact. The source
file is rechecked unchanged. The Windows guard reuses the unchanged original
managed admission to validate the source's entire allowlist and values, then
verifies both derivation hashes and byte equality independently. It accepts no
other new filename or mutable private row.

Cooperative close drains actual requests/SDK, closes the original Nest app,
restores observer hooks and checks Windows10070 is released. The Windows
anchor remains until Root inspects it and sends termination. EOF/error/deadline
aborts the channel and closes the app; Root always uses the separate exact
identity helper to verify/stop the registered tree. A forced or incomplete
close remains `partial-preserved`; only an actual Native close receipt plus
owned-tree stop can permit a later fixture writer-drain decision. No process
name, recycled PID or unrelated child is a cleanup target.

Author checks: six in-memory Node protocol/environment/identity tests and
seventeen PowerShell SelfTest assertions passed. SelfTest performs zero process
queries/stops. No private environment was read, no service/listener/DB was
started, and no actual Windows Native/UI pass is claimed by this source work.
