# R2M Windows UI execution inputs

This is a source and public-evidence checklist for Root. No private file,
database, browser or owner was opened while preparing it. The cache candidate,
M5 candidate and complete new matching capsule still need their stated review
dispositions. Existing Windows own8 source03 and all prior actual failures stay
immutable; cache changes only the driver and the runtime's required-member list.
No further Windows orchestration change is part of this checklist.

| Arrangement      | API owner                                                                                                                         | UI owner and data                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `--backend nest` | Real win32 Node 24.19.0, original `0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4` Native bundle, Windows 10070 | Real Windows Chromium and Windows UI proxy 10080; `poms_r2m_nest` |
| `--backend rust` | Current Linux Rust 10071; explicit original Linux Native 10070 only for the named producer/read models                            | Real Windows Chromium and Windows UI proxy 10080; `poms_r2m_rust` |

Browser platform never proves the API runtime platform. Both arrangements run
from the owned Linux coordinator at `/home/wangzishi/projects/poms-rust-r2m`.
Run the arrangements serially. Root must measure the fixed Windows-to-API
loopback transport; an unreachable port is a preserved failure and has no
fallback.

The fresh public inputs are:

1. One complete source capsule captured after the reviewed M5, B full20, cache
   and UI733 sources have been synchronized. It contains the complete current
   source union, all 30 fixture profile members, the eight original external
   audit source pins, original Native artifact, current Rust artifact, and the
   complete UI build member manifest. The current build directory remains
   `dist/tools/rust-r2m-ui-current/browser` with 551 members; actual current
   bytes must match the new capsule. Do not copy an old cap or remove a member
   to pass verification.
2. `docs/design/rust-r2m/acceptance-input.json`, bound by that capsule.
3. A new public Windows browser pin JSON with `{executable,rawBytesSha256}`. Its
   executable must be a regular file under this task's
   `tmp/rust-r2m/windows-browser-cache`. A pre-existing pure executable under
   `tmp/rust-r2ef/windows-browser-cache` is accepted only with explicit
   `readOnlyReusedExecutable:true`, exact current bytes, and the existing strict
   symlink/path checks. Linux `ui-browser-pin-fonts04.json` is not a Windows
   pin. This checklist does not invent an installed Windows executable or
   certify its presence.
4. A distinct Root-assigned fresh run UUID/tag and singleton admission for each
   arrangement. Existing joint17/joint18/UI2 admission files are historical
   inputs and must not be reused for a new run. The admission kind is
   `R2M-environment-baseline-setting-precise-admission`; it binds namespace,
   marker, sourceHead, backend, database, runId, literal case
   `m2-ui2.attachment-max-upload-size`, and key `attachment.max-upload-size-mb`.
   `rootApproved:true`, the exact formal corrective checkpoint reference, and a
   C SourceReady reference pinning the current singleton helper
   `ebfd70038ba8c3bcc48f44ffe0570655a24a5c50db2109234d659f6d4d845143` remain
   required. This admission mutates/restores the original baseline row; it never
   owns or deletes it. UI-only use does not need a new M5 audit approval.
5. Reviewed source addendum `windows-ui-shared-addendum04.json` plus final C
   cache/M5 dispositions. The addendum lists new exact own8 and shared inputs;
   any later reviewed source change requires a new additive pin record.

For a fresh Nest run, the actual owner automatically calls
`deriveWindowsNativeEnvironment()` from `windows-native-environment.mjs` before
Windows private loading. It reads only new-M `private/nest.env` and creates or
verifies the fixed new-M `private/windows-nest.env`. The sole byte change is
`POMS_ATTACHMENT_LOCAL_ROOT` from the new-M POSIX object root to
`//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r2m/objects/nest/server01`.
The source remains byte-identical; an existing unequal target is refused. It
does not change PG role/database, 20432, Native 10070, JWT or any other value.
The returned public proof has paths and hashes, never secret contents. No
separate manual private edit is needed. Windows Native loads the derived env
only after the real process identity ACK.

Root has already staged the public original Native bundle at
`tmp/rust-r2m/windows-native-bundle/0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4/main.cjs`;
`windows-native-bundle-stage01.json` records 2,958,081 bytes and that exact
hash. The owner rehashes the staged Windows bytes against the same current
capsule's Native artifact. It also checks the real Windows Node executable at
`C:\Users\ynh2\AppData\Roaming\fnm\node-versions\v24.19.0\installation\node.exe`
against `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237`. Do
not rebuild or replace the old Windows dist to satisfy this staging input.

The following are invocation templates, not executed commands or accepted runs.
Replace every bracketed public filename/tag with Root's fresh inputs. Use the
same inputs for `--check` and its subsequent `--run`; no source may change
between them.

```sh
node tools/rust-r2m/windows-ui-runtime.mjs --check --backend nest \
  --tag <fresh-nest-tag> --selection UI1,UI2,UI3,UI4 \
  --cap <new-complete-public-cap.json> \
  --input docs/design/rust-r2m/acceptance-input.json \
  --browser-pin <new-public-windows-browser-pin.json> \
  --setting-admission <fresh-nest-singleton-admission.json>

node tools/rust-r2m/windows-ui-runtime.mjs --run --backend nest \
  --tag <fresh-nest-tag> --selection UI1,UI2,UI3,UI4 \
  --cap <same-complete-public-cap.json> \
  --input docs/design/rust-r2m/acceptance-input.json \
  --browser-pin <same-public-windows-browser-pin.json> \
  --setting-admission <same-fresh-nest-singleton-admission.json>
```

Use `--backend rust` with its different fresh tag/run/admission for the second
arrangement. The coordinator derives `runId` from that admission. Root calls
`--run`, which creates the precise owned worker; `--worker` is an internal
implementation entry. A run never overwrites an earlier report or owner log.

Source equality is checked at three boundaries. The Linux coordinator's
`verifySourceCap`/`SourceReader` verifies every member against its Linux bytes
before fixture work. The Windows bridge re-reads the same complete capsule from
the fixed `/mnt/e/projects/worktrees/poms-r2ef-foundation-audit/poms` checkout,
verifying bytes/hash before process configuration. The real Windows driver then
rechecks every source pin from its actual
`E:\projects\worktrees\poms-r2ef-foundation-audit\poms` checkout; UI artifacts
are separately checked as a complete byte-pinned member set through the exact
new-M UNC build directory. Before/after source checks, real
PID/executable/argv/start-time PS identity ACK, and private stdio retention
remain mandatory. A WSL wrapper PID does not satisfy a Windows PID proof.

New successful runs must include the real about:blank CDP cache ACK before
navigation and each actual original proxy request's condition-header evidence.
The uncached comparison requires both `If-None-Match` and `If-Modified-Since`
counts to be zero. The proxy records and forwards the original headers; it never
strips them or changes a 304 into 200. Old UI1's eleven cached 304/200
differences retain their original classification. Linux font configuration is
not injected into the Windows browser child.

Public reports are `tmp/rust-r2m/ui-windows-<backend>-<tag>.json`. Raw cookie,
credential, SDK/PG/facts, failure and CDP material stays under this new-M run's
private recorder. Actual success still means `observed-comparison-pending` plus
real browser/UI/API owner closure, PG restoration, setting CAS restore, mature
double-zero and exact full107 baseline equality. Separate full HTTP/physical-row
comparison and C's G3/G4 review remain outstanding until measured.
