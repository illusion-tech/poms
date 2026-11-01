# M5 Source03 necessary review corrections

Source02 and its 22 source bytes remain preserved. This addendum changes only the three necessary review findings. The same fixed c01 joint02 three-case pair, complete 33 ordered steps, 66 before/after frames and all original wire/entity/typed-birth/crypto/TTL/outside-baseline requirements remain.

The Root-only reader checks every parent as a nonsymlink directory, with exact 0700 mode from the new c01 private root downward. The leaf and opened descriptor must each be a regular nonsymlink 0600 file with one link. Device, inode, link count, mode, size, mtime and ctime must agree before/open/after-read/final-leaf. Parent identities and modes are checked again after reading. These checks do not authorize any additional path. All private refs remain limited by the original c01 evidence path grammar.

An original failure is retained only in the fixed new c01 `execution-logs/compare-api-m5-<label>-failure.json` using exclusive creation, 0600, no-follow, fsync, descriptor/leaf identity and mode/size checks, plus parent identity checks. Retention failure is independently caught. The formal result remains `failed-required-proof-preserved`, with fixed `retentionFailed:true` and `originalDetailsInPrivate:false` if retention failed; neither the original nor retention Error message is exported publicly.

Before any owned-frame comparison, the main entry now compares both original initial 107-table baselines. Every authoritative table and physical column is required exactly once, every raw row and nested value is preserved, and original count/full-row digest is verified. Tables and rows are sorted only to make SQL row order irrelevant. This adds no seed UUID, clock, credential or version normalization. Missing/extra/changed unowned input enters the main strict differences; per-side outside-baseline checks remain separate and mandatory.

The new finite `compare-api-m5-ticket-source.mjs` bridge reads six original recipe/runtime sources from the **actual** joint02 capsule's pinned public source store. File, raw SHA, size and stored-file path must match the fixed source pins. The bridge checks the source chain: callback response saved intact; original supplier extracts that callback ticket and returns `oauth.ticket`; the actual operation binding retained in the raw case must equal the issued ticket; operation bindings are merged; both ticket recipes use that binding; materialization feeds `step.body` to `deps.request`; `perform` forwards it to the real HTTP session's original JSON serialization.

The two exact original unmaterialized recipe projections must hash to the original published step `recipeSha256` (ticket `eb902b8793a6f42ae5b5c692aacfd119c69804e5cdfe7bfd7952c51aa9f0849b`, replay `640e0e94db41247f40051cfd43bd9b114b3b663402a76fca169759338d9a7dec`). Existing actual request/index/context/whole-response/raw-case cross checks and the physical issued-to-consumed/replay effects still apply. No whole recipe runner or environment code is imported by this bridge.

The ticket receipt claims **`sourceRecipeParameterBound:true`**. The generic original request record did not capture consumer body bytes, so **`actualConsumerRequestBodyBytesVerified:false`** remains explicit. The reconstructed source parameter object is named `sourceParameters` and is never described as original wire capture. No new ticket value is synthesized, and no missing raw token response is fabricated.

Pure verification covers the initial full baseline, reader FD/leaf/mode/link changes, parent mode/type rejection, retention failure without loss of the formal result, exact source/store/recipe hashes, missing or substituted recipe proof, and a changed actual supplier ticket binding. B performs no private/env/DB/API/browser I/O. Root alone executes the existing offline command after C source review:

```text
node tools/rust-r2m/compare-api-m5.mjs --run <fresh-analysis-label>
```

This source correction does not itself certify the actual M5 comparison or change any product, fixture, API recipe, frozen earlier comparer, M4/UI scope or G3/G4 decision.
