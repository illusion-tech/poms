# R2M Windows UI current input addendum

This adds the reviewed finite UI4 audit input to
`windows-ui-execution-checklist.md`. The original checklist and own8/source03
remain preserved. Root still executes; no Windows process, browser, private env
or database was inspected by this addendum.

The current UI4 owners require one additional **public**, fresh-run input:

```sh
--audit-identity-admission <fresh-run-provider-audit-approval.json>
```

It uses the existing `Root-R2M-source-bound-audit-identity-admission` kind and
explicit `allowedSourceKinds` containing `attachment-provider-null`. Its runId,
backend, database and sourceCapId must match the selected owner. Its independent
review reference must pin the actual component source union, including the
current single-event helper and protected attachment projector. The fixture
still verifies the real independent review and original source projection before
each permitted Native request. A descriptor alone is never authority.

`UI1,UI2,UI3` require no new provider approval. `UI2` still needs its separate
fresh singleton admission, and both approvals must use the same run UUID when
the four journeys are selected together. UI4 uses only the two exact Native
prepared-source calls `ui4-local-provider` and `ui4-local-default` in
`m.ui4.integration` with actual `m.producer`; it does not turn arbitrary Native
producer requests into null-request-ID audit aliases.

Add the flag to each original `--check` and subsequent `--run` invocation:

```sh
node tools/rust-r2m/windows-ui-runtime.mjs --check --backend nest \
  --tag <fresh-tag> --selection UI1,UI2,UI3,UI4 \
  --cap <new-matching-cap.json> \
  --browser-pin <actual-windows-browser-pin.json> \
  --setting-admission <same-run-nest-setting-admission.json> \
  --audit-identity-admission <same-run-nest-provider-audit-approval.json>
```

The command is a template, not an executed run. Use a different fresh run and
Rust-specific approvals for `--backend rust`. All prior runtime-platform,
original Native bundle, exact env derivation, PID/argv/start/hash ACK, raw
stdio, CDP uncached input and original-header verification requirements still
apply.

The approved technical UI3 initialization now waits for the original new-page
session/navigation/Todo responses and bridge version before the unchanged Todo
locator. This adds no request, business retry or larger locator timeout. The
independent project-only `a8ae` variant is for Root's old28 Linux UI1–3 epoch;
it must not replace the final mixed source with the separately reviewed UI4
provider adapter in the matching Windows epoch.

`windows-ui-shared-addendum05.json` records current exact source members,
existing independent source dispositions and the full31 fixture set. Its B
full20 input remains labelled with its actual `full20ActualReady:false`; that
label is not changed by a Windows UI source index. Root captures a new complete
matching capsule after synchronizing all current source members and the complete
UI build. No old cap, original own8 pin or source02 caller pin stands in for the
new bytes. Actual four-arrangement acceptance and offline full HTTP/facts
comparison remain pending until measured.
