# R2M Windows UI orchestration candidate

`windows-ui-runtime.mjs` runs a Linux coordinator for the new-M PG/fixture and
an identity-ACKed real Windows browser/UI proxy. It preserves two distinct
arrangements:

| Backend | Actual API owner | Browser/UI server |
|---|---|---|
| `nest` | B `startWindowsOriginalNative`: original0ef7 bundle on real win32 Node24.19, fixed10070, actual Windows SDK/QueryPID | real win32 driver/browser on10080 |
| `rust` | current Linux Rust owner10071, explicit original Linux Native10070 for source producers/read models | real win32 driver/browser on10080; external Rust |

The coordinator records and retains the actual runtime-owner evidence before
the Windows browser starts. Browser platform is never used to infer API
platform. The driver explicitly says it does not independently certify an API
platform; B's attested Native owner or the separately owned Rust supplies that
proof. Root executes after necessary C source review and a complete new capsule.

```sh
node tools/rust-r2m/windows-ui-runtime.mjs --check --backend nest --tag wun01 \
  --selection UI1,UI2,UI3,UI4 --cap tmp/rust-r2m/source-cap-winui01.json \
  --browser-pin tmp/rust-r2m/windows-ui-browser-pin01.json \
  --setting-admission docs/design/rust-r2m/windows-ui-setting-admission01.json
# Matching --run is Root actual. A never launches the browser/API/DB.
```

The public Windows browser pin is `{executable,rawBytesSha256}`. The default
admitted cache is this task's `tmp/rust-r2m/windows-browser-cache`. A prior pure
executable from the existing `tmp/rust-r2ef/windows-browser-cache` is admitted
only with explicit `readOnlyReusedExecutable:true` and exact current bytes;
neither old private nor old runtime state is read. Chromium gets a system-only
child environment and only `--explicitly-allowed-ports=10080`. No host policy or
existing browser/profile changes. Source pins include the full current capsule
and are checked against the actual Windows checkout before and after use.

The UI build is the same byte-pinned complete current Angular artifact. Windows
reads it through the exact **new-M** UNC build directory. The Windows-owned UI
proxy forwards actual Windows loopback10070 or external10071. It does not assume
that a Linux loopback client can reach a Windows listener. For Native setup,
`WindowsNativeUiHttpSession` keeps the real cookie jar in Root's private scope,
waits for B's actual `admitContext` ACK, then uses B's bounded real Windows HTTP
RPC. It verifies returned raw bytes/hash and uses actual Cookie/CSRF values.

The mature L bridge/PS owner is copied into new-M files; originals are unchanged.
Real Windows PID, executable/argv/hash and start/CIM identity are independently
checked before configuration/credentials. Every callback keeps this identity
admission. Concurrent callback handling permits a previous after-exchange
certificate to release a waiting next before-exchange; actual HTTP itself is
serialized by the same reviewed fixture/PG gate as Linux full UI. Every
generated ID requires real SDK/PG/outerCOMMIT/independent visibility before a
later dependent request. Native and Rust attribution stay per actual request.

All four B journeys, exact draft/prepared sources, current Native confirmation,
unique setting lease, full107 before/after facts, exact local object proof and
final writer drain/double-zero semantics are inherited from the reviewed Linux
full entry. UI1 expiry uses the actual Windows browser's current cookie **hash**
and requires it to match the exact already-owned viewer session. It never
adopts a response/query ID. Original before/action/after failures are privately
retained before generic public reporting, including bounded DOM/screenshot.

Raw driver stdout/stderr, HTTP, Cookie/credential bodies, screenshots/download
bytes, original callback failures, SDK/PG traces and facts stay in the new-M
private recorder. Public bridge diagnostics contain only hashes. Cooperative
EOF/abort/deadlines and exact registered Windows-family stop remain separate
from WSL wrapper PID. Source-only tests use in-memory streams and synthetic
metadata, never actual process queries or stops. Successful actual runs still
return `observed-comparison-pending`; neither this candidate nor its pure tests
certify a browser run, G3 or G4.
