# R2M finite command owner

`command-owner.cjs` is a static derivative of the complete original
`tools/e2e/runtime.cjs`. The original runtime and `runtime-worker.cjs` are
unchanged. Original PID birth identity, group-member checks and `stopOwned` are
copied byte for byte. This module exports only `runOwnedCommand` and
`stopOwned`; it exposes no listener/readiness or arbitrary managed-app launcher.

Root can switch its reviewed M API wrapper from `require('../e2e/runtime.cjs')`
to `require('./command-owner.cjs')`:

```js
await runtime.runOwnedCommand({
    executable: process.execPath,
    args: [
        "tools/rust-r2m/acceptance-api-runtime.mjs",
        "--run",
        "--backend",
        backend,
        "--mode",
        "api",
        "--tag",
        tag,
        "--cap",
        cap,
        // Existing reviewed finite selection/public admission arguments follow.
    ],
    cwd: "/home/wangzishi/projects/poms-rust-r2m",
    env: Object.fromEntries(
        ["PATH", "HOME", "LANG"].filter((key) => process.env[key] !== undefined)
            .map((key) => [key, process.env[key]]),
    ),
    logPath: "/home/wangzishi/.local/share/poms-r2m/private/execution-logs/" +
        "acceptance-" + backend + "-" + tag + ".log",
    timeoutMs: 900000,
    startupTimeoutMs: 60000,
});
```

This is an invocation example, not an executed command or approval. Root still
creates a fresh private log at the exact path with exclusive/no-follow mode600
before calling the owner. The owner verifies exact new-M cwd, non-symlink path
components, private directory modes, regular single-link log, no-follow append
and opened-inode identity. No old namespace or other log path is admitted.

Only the current Node executable and the named M API runtime entry are allowed.
The backend/tag/mode identify that log. Environment values may only be the
unchanged inherited `PATH`, `HOME` and `LANG`; DB/JWT/Node options or other keys
are not admitted. The anchor receives the original system-only environment and
starts the unchanged original worker at the explicit
`../e2e/runtime-worker.cjs`. Its default ownership run ID has the new `r2m-api-`
prefix.

The command execution deadline accepts at most900000ms, with the original
180000ms default. Startup/handshake gets a **separate** budget, default and
maximum60000ms. The command deadline starts after the original anchor/birth/IPC
handshake ordering, as in the original implementation; startup and unchanged
cleanup time are not falsely included in a900s total-wall-time claim. The
original stop grace/kill policy, PID/start identity checks and descendant
cleanup remain unchanged. No command or business operation is retried.

A timeout or nonzero exit remains failure and runs the same owned-tree cleanup.
This owner does not manufacture a business report, promote observed partial
steps to an overall pass, resume an old run, or overwrite its evidence. Root's
previous300s stop/no-final-report outcome retains its original label; a normal
complete new run uses fresh inputs and its new exact source capsule.

Pure tests execute the full copied implementation over Fake process, kernel,
filesystem, IPC and clock adapters. They cover a command beyond300s, the900s
limit, the60s startup limit, foreign handshake IDs, inherited environment/path
boundaries, birth-identity reuse and owned descendant cleanup. No actual
process, signal, HTTP/browser, SQL or private file is used by those tests.
