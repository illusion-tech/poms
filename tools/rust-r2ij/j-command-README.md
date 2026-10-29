# J command and local binary acceptance

Run with the existing Linux Node runtime from the guarded R2IJ clone. Both API
owners must already be ready, and the backend fixture windows must be reserved
with Root and the I author. The runner does not start or stop an API owner.
Do not run another `OwnedFixture` workload on either backend concurrently.

```sh
node tools/rust-r2ij/j-command-acceptance.mjs UNIQUE_TAG NEST_OWNER RUST_OWNER
```

The acceptance runner generates one public fixture run UUID and sends the same
inputs to the two actual APIs serially. The fixed guarded origins are Nest
`127.0.0.1:6700` and Rust `127.0.0.1:6701`. Existing guarded fixture helpers load
only the new R2IJ synthetic credentials internally; tokens and credentials are
never placed in reports. Every output uses exclusive creation. Use a fresh tag
and run UUID after a cleaned run; cleaned journals cannot be reset or reused.

For a deliberate split run while a candidate is being built, set the same new
public UUID in both child environments:

```sh
POMS_R2IJ_SHARED_RUN=NEW_UUID node tools/rust-r2ij/j-command-scenario.mjs nest UNIQUE_TAG NEST_OWNER
POMS_R2IJ_SHARED_RUN=NEW_UUID node tools/rust-r2ij/j-command-scenario.mjs rust UNIQUE_TAG RUST_OWNER
POMS_R2IJ_SHARED_RUN=NEW_UUID node tools/rust-r2ij/j-command-acceptance.mjs UNIQUE_TAG NEST_OWNER RUST_OWNER reuse
```

`reuse` reads existing immutable backend observations and sends no HTTP. For a
correction to comparison code only, append a new `deltaNN` suffix. The original
comparison is retained. Verify the two input hashes against the prior receipt;
never relabel an earlier failure as a pass.

The current scenario contains 58 public operation requests, plus four real login
requests, and seven owned-role permission changes:

- Six create-session, proxy PUT and complete requests upload actual PNG and TXT
  first versions, recording exact generated locations before either PUT.
- Eleven successful binary requests compare the complete original bytes, MIME,
  RFC 5987 filename, private/no-store, and all captured binary headers. They
  include preview, original-byte thumbnail, HEAD, and three ignored Range forms.
- Eight binary error requests cover unsupported TXT preview/thumbnail, a missing
  exact registered PNG object, a first-read EISDIR fault, and a non-Latin1 MIME
  header construction failure, including HEAD. The MIME fault is a durable,
  exact owned attachment-row fixture; only `mime_type` changes, and restoration
  verifies the complete original row including unchanged version and timestamps.
- The existing 33-case generator covers six real target read projections,
  metadata/no-op, final/clear/repeat, duplicate/new links, unlink, confidential
  access, a committed write and audit followed by 403, last-link removal followed
  by 403, and void/repeat. Dynamic links come only from actual response UUIDs.

The two-version history is declared pre-existing SQL fixture data with valid
real links and real local files. It is never described as successful API version
creation. The original known create-version-complete 500 is covered separately
by Root's critical acceptance.

For local faults the helper first validates the exact registered provider,
bucket, key, inode, payload hash and size, then durably journals the intent. It
removes only that file. The directory fault creates an empty directory at the
same path and checks its exact device/inode before removal. `finally` restores
original bytes with exclusive creation and checks their size/hash. Both cleanup
passes run only after every fault is restored. The full shared catalog,
reference closure and object preflight still run before any cleanup deletion.

Each HTTP observation contains actual response data and complete owned PG facts.
Comparison uses injective aliases for observed generated UUIDs and bounded known
server timestamps. Fixed fixture dates are retained. Successful binary hashes
and headers are exact. For error weak validators, the raw GET payload is checked
against its observed ETag (also for HEAD), then generated identities are replaced
and JSON keys ordered for a stable semantic comparison. Missing validators stay
missing and fail comparison. Full raw bytes and headers remain in backend
receipts regardless of projection.

The local runner does not claim late stream reset or cancellation coverage;
those belong to I's actual controlled OBS transport harness. It does not migrate
or complete R3/R4 business operations.

Preserved actual attempts:

- `command08a`: tool API mismatch before upload; actual login/history fixture
  occurred, zero command operation requests, twice-zero cleanup.
- `command08b`: both actual scenarios passed 56 requests and twice-zero cleanup;
  strict comparison failed on six binary error responses. Fifty pairs, including
  all 33 commands and their PG/audit facts, matched. The first comparator omitted
  setting `result=fail` while returning exit 1 with six differences; its original
  pending/failure receipt is preserved. `delta01` explicitly reports fail over
  the same two raw input hashes and adds verified HEAD error-validator handling.

Use `j-command-diff.mjs TAG` to print bounded field differences from a saved
comparison, including `TAG-deltaNN` for a suffixed comparison report.
