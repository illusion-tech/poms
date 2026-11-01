# R2M Linux managed UI owner source candidate

This first finite entry supports **UI1 only** for `backend=nest|rust`. It uses
the current original Angular build, real Linux Native/Rust owners, the exact
prepared customer/project plus seven Todo source rows, and the owned viewer.
UI2/UI3/UI4 and Windows runtime combinations remain pending work. SourceReady
does not certify an actual browser run, comparison, G3 or G4.

Root freezes these new files and the latest B UI1/viewer helper in a new source
capsule. Do not copy them onto the active M0/URI old fixture source epoch.
The capsule's `ui-build` artifact must contain the complete original build
member list, directory, bytes and aggregate hash. Root supplies a public new-M
browser pin JSON `{ "executable": "<actual absolute Linux executable>",
"rawBytesSha256": "<actual 64-hex SHA256>", "libraryPath": "<exact optional new-M colon-separated directories>", "libraryFiles": [{ "file": "<actual new-M library file>", "rawBytesSha256": "<actual resolved bytes SHA256>", "bytes": 0, "symlinkTarget": "<only for a library symlink>" }] }`; no executable is discovered or
downloaded by this entry. The worker verifies that exact regular executable.
Every extra library is byte-pinned beneath the new-M browser-libs root. The
Chromium child gets only a system environment whitelist plus that exact
`LD_LIBRARY_PATH`; Native DB/JWT values and ambient loader overrides are dropped.

```sh
node tools/rust-r2m/ui-runtime.mjs --check --backend nest --tag ui1n01 \
  --cap tmp/rust-r2m/source-cap-ui01.json \
  --browser-pin tmp/rust-r2m/ui-browser-pin-ui01.json
node tools/rust-r2m/ui-runtime.mjs --run --backend nest --tag ui1n01 \
  --cap tmp/rust-r2m/source-cap-ui01.json \
  --browser-pin tmp/rust-r2m/ui-browser-pin-ui01.json
```

`--check` only reads named public sources/build inputs. `--run` launches a precise
`runtime.cjs` owned command worker. The worker verifies its actual Linux group,
parent identity, cwd, executable, argv and exact runtime run ID before opening
new-M resources. A direct `--worker` invocation cannot establish those facts.
The outer owner stops the exact group after worker exit or deadline, including
browser descendants. It never searches for another run's browser or API PIDs.

All four UI1 steps use the real source scope `m.ui1.integration` with a unique
run-monotonic PG case index. Logical journey/step and exact start/end windows
are separate metadata. Audit/security intents use the scope request ID;
auth-session intents are limited to the proven viewer and the two login steps.
The expired step hashes the actual current browser cookie privately, selects
the exact already-certified owned session, and mutates only its expiry.

The proxy makes its fixed method/path decision before transport. Actual raw
request/response headers and byte bodies, SDK/PG creation traces, full107
physical before/after facts, ledgers and screenshots are written exclusively
under the exact new-M `private/ui-runs/<backend>-<runUUID>` directory. Public
receipts contain hashes and evidence paths. No mocked response, decoded-body
substitution, fallback or status-only comparison establishes a UI pass.

Each step waits for transport and evidence drain, then verifies Native SDK
afterCreate/outerCOMMIT and its actual PG shadow, or real Rust PG INSERT/xmin/
outer status and independent visibility. A mixed Native/Rust step with an
unattributed PG-only create is refused. No response ID establishes ownership.

Finally, every attempted browser, UI socket, Rust and Native owner gets its own
close attempt. The PG observer is restored only after writers stop and no PG
case remains active. Successful observed runs require explicit writer drain,
double-zero cleanup and exact full107 original-row restoration. Failed or
unknown cases preserve the new journal/raw evidence for controlled recovery.
The public result remains `observed-comparison-pending`; Root/C must perform
the full cross-backend comparison and acceptance separately.
