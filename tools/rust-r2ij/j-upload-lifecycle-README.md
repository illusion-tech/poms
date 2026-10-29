# Actual J upload lifecycle witnesses

Reserve each backend's fixture window with Root/I before running. API owners
must already be ready. The tools neither start nor stop any owner.

```sh
node tools/rust-r2ij/j-upload-lifecycle-acceptance.mjs TAG NEST_OWNER RUST_OWNER
```

For separate actual runs while a candidate is being built, use one fresh public
UUID for both child processes, then compare immutable receipts:

```sh
POMS_R2IJ_SHARED_RUN=NEW_UUID node tools/rust-r2ij/j-upload-lifecycle-scenario.mjs nest TAG NEST_OWNER
POMS_R2IJ_SHARED_RUN=NEW_UUID node tools/rust-r2ij/j-upload-lifecycle-scenario.mjs rust TAG RUST_OWNER
POMS_R2IJ_SHARED_RUN=NEW_UUID node tools/rust-r2ij/j-upload-lifecycle-acceptance.mjs TAG NEST_OWNER RUST_OWNER reuse
```

Every output is created exclusively. A comparator-only correction can append a
new `deltaNN` suffix after `reuse`; old observations and comparison failures are
retained. Cleaned fixture UUIDs cannot be reused for another actual run.

The finite scenario has exactly 50 public operation requests plus four actual
login requests. It records full owned PG facts, audits, actual object presence,
sizes/hashes and request payload hashes after each operation. It covers:

- A real 131073-byte octet-stream PUT directly from pending, checksum learning,
  explicit stale-version conflict, completion, and all four completed terminal
  operations.
- Target creation, abort and repeat abort, plus aborted terminal operations.
- Actual JSON/form parser consumption before the raw upload handler, wrong
  proxy size, completion checksum mismatch and a later successful completion.
- Missing-object completion and failed terminal complete/target/PUT/abort.
- A real past `expires_at` fixture: GET leaves pending/version unchanged, target
  marks expired, subsequent operations observe terminal state.
- Another real actor's read/write denial and an explicit legacy `created_by=NULL`
  fixture that permits target-authorized reading.
- A valid-length nonhex declared checksum: proxy rejects actual mismatching
  bytes; an exact registered local preseed allows original completion when HEAD
  supplies no checksum. This preserves the original behavior, not a checksum fix.
- Real wrong-size HEAD failure, a no-checksum preseed that forces complete's
  read-buffer hash path, create over the actual maximum, and a captured-session
  max-size fixture observed through actual PUT. No preseed is called PUT success.
- An actual later uploaded-audit flush failure after business attachment/link
  commit, including the persisted original error message and session state.

Column faults journal the exact owned session/field/original value before the
SQL write. Restoration changes only that injected field; product status,
checksum, timestamps and row versions remain as observed. `created_by` adjusts
the exact fixture identity ledger temporarily and restores it before cleanup.

The owner helper can install only one finite `NOT VALID` check on fresh IJ
`poms.audit_log`, restricted to this owned actor, exact `attachment.uploaded`
event and exact session UUID in metadata. It uses the existing guarded synthetic
owner connection and verifies the fresh database marker. Before DROP it verifies
the exact name/OID/type/definition, then proves the original complete constraint
catalog and 107-table column/PK/FK authority restored. No older database or
permanent migration is touched. Both normal cleanup passes still run afterward.

The comparator retains HTTP bodies, every persisted field/version and actual
object bytes/SHA. It reuses the existing explicit generated-ID and bounded
server-clock policy. The audit-failure diagnostic has one narrower projection:
the exact owned check and 12-column PG tuple must match actual committed
attachment/actor/request IDs and the known PostgreSQL 64-byte metadata preview.
The rejected audit UUID must be new, absent from observed IDs and actually absent
from PG. Its PG timestamp must lie inside that actual complete request. Only
that verified UUID and timestamp are projected; all other driver text is exact,
and later cases must preserve the same raw persisted diagnostic. No arbitrary
UUID, timestamp or driver-message removal is permitted.

`lifecycle14a` is retained as a failed comparison: both actual 50-operation runs
and double cleanup passed, but SQLx Display persisted a prefix/source line while
the original PG error included primary/detail text. Its exact old tool inputs
are hash-verified under `tmp/rust-r2ij/j-upload-input-lifecycle14a/`.

Three separate route/type-order probes remain independent of the 50-operation
count:

```sh
node tools/rust-r2ij/j-upload-path-probes.mjs TAG NEST_OWNER RUST_OWNER
```

They test authenticated malformed UUID -> original PG 500, a durably planned UUID
proved absent by actual PG queries -> 404, and anonymous matched malformed percent
capture -> 400 before guard. They never claim an absent business object exists.
Full method-independent registered-layer decode coverage is Root's separate
32-request native route witness, not these three domain probes.
