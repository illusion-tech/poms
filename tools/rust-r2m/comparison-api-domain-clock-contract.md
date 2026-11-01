# API9/M5 domain clock comparison core

Pure source-only helper; no file/environment/private/PG/HTTP/ORM access, no ownership or cleanup permission. Root owns the main API comparator and supplies the real source capsule, journal, already verified typed births, actual complete before/after rows and writer windows. This helper does not create certificates or substitute a response/query ID for a fixture admission.

Exports:

```js
domainClockCatalog;       // exact physical timestamptz candidates, tested against107 schema
exactDomainTtls;          // upload1h/package24h/ticket2min/state10min/peer2h+24h
domainClockNestedRules;   // instructions only; no recursive JSON date rewriting
domainClockDigest(value); // canonical ASCII-key SHA256 for comparison versions
createDomainClockEvidence({journal,sourceCap,authority,birthSlots});
```

`birthSlots` is Root's explicit `{table,id,slot}` projection of its genuine typed birth registry. Each ID must already match exactly one `journal.objects` object with the original creation proof, immutable identity and independent visibility. `authority.tables[].columns` is the real full physical schema; every observed version must contain exactly those columns. Slots label comparison cells only; none is an admission or permission to delete.

Methods and concrete input shapes:

```js
e.recordBirth({table,id,row,window,origin});
// window = {startedAt,finishedAt}: actual source writer interval, never invented
// origin.sourcePin = {file,rawBytesSha256}: must match the real capsule
// origin.kind = 'actual-runtime': {operation,context,requestBody?, ...TTL/copy options}
// context = {runId,caseId,index,op}, exact original creation context when present
// origin.kind = 'commission18' or 'sevenTodo': {plan} with exact original plan.rows
// origin.kind = 'K-draft': {plan} with exact original K statements/columns/uuidRefs

e.recordMutation({table,id,beforeRow,afterRow,window,operation,context,
                  requestBody?,controlledAccessExpiresInSeconds?,
                  controlledRefreshExpiresInSeconds?,copyUploadedAtFrom?});
e.recordLiteralMutation({table,id,beforeRow,afterRow});
e.projectRow(table,row);
e.projectDtoCell({table,id,column,value,physicalRow});
e.receipt();
```

Runtime operation tags are the finite table/column relations in `operations`; there is no `At$` or date-looking-string rule. Root must choose the tag and source pin from the original actual operation, not from its response shape. The capsule pin is a source-reference binding, not proof that the method executed; Root's verified SDK/PG/source record supplies that execution proof. This module does not rerun source methods or SQL.

For generated birth, `context` must equal the original `creationProof.createContext`. For prepared birth, the full row must equal the actual promoted, before-absent direct-COMMIT capture in the journal. Commission18 and seven-Todo explicit source values are checked one by one, including temporal fields outside the runtime catalogue (for example signed_at, due_at and date-valued retention_due_date). They remain literal even if their names contain generated/created/updated.

K is deliberately handled using known original statement metadata, not guessed `params` fields: match `creationProof.sourcePlanId` to the promoted journal batch with `sourceBoundary.preparedDraftOnly`, require exactly the original K statement set, and identify the INSERT by its `uuidRefs` PK. Explicit temporal columns stay byte-for-byte physical birth literals; omitted created_at/updated_at may use the real direct-preparation window as database defaults. The original A cohort guard, complete SQL/COMMIT/captured-row proof is Root's prerequisite; this core neither parses nor relaxes that SQL admission. K logical IDs remain outside clock/ownership registration.

Every runtime value is PG `+08:00` with at most6 fractional digits and lies in its named actual source interval after its declared offset. DTO values are UTC `Z`, at most3 digits, and must equal the timestamp of a complete physical version already observed by this mapper. Root selects the actual before or after version for DTO/audit consumption; the mapper cannot infer that choice from a field name. Literal DTO dates are returned unchanged. Full rows retain every non-clock field.

All instant, window and TTL arithmetic uses exact integer microseconds. Distinct PostgreSQL fractions within one millisecond remain distinct; invalid calendar dates do not normalize through JavaScript. The current DTO method requires an exact physical instant, so a physical value with nonzero sub-millisecond digits cannot silently match a truncated DTO. A genuine source emitter that intentionally projects precision requires a separately named source rule; none is inferred here.

Specific rules:

- Rule activation can replace effective_from with now only when its proven prior value is NULL. A supplied creation `requestBody.effectiveFrom` remains an exact literal. Activation cannot move a nonnull original date.
- Payout registration with actual `requestBody.paidAt` must equal that exact request instant and stays literal, even outside the current runtime window. With no supplied paidAt, only the actual current writer clock is permitted.
- Ticket expiry and upload expiry subtract2min/1h into the actual writer interval; do not assume expiry minus ORM-created_at is exactly the TTL when the source calls two clocks. Package creation explicitly uses one now and requires expires_at-created_at=86400000ms.
- Controlled grants require Root to pass `controlledAccessExpiresInSeconds=7200` and `controlledRefreshExpiresInSeconds=86400` from the same real peer/token proof consumed by A's AES/state core. Each independent Date.now is checked separately; this module does not invent a raw token response or take arbitrary caller TTL as sufficient upstream evidence.
- `copyUploadedAtFrom={table:'attachment_upload_session',id,column:'uploaded_at',value}` is only the source upload timestamp already proven by this mapper. The actual attachment value must equal that exact source instant; the copied time is not falsely required to be newly created during completion.
- A fixture edit such as M3.5 due_at=NULL is literal, not now. `recordLiteralMutation` requires an existing committed/recovered-committed journal mutation with exact complete before/after/values and transaction/xmin equality. No arbitrary prepared-value change is admitted.

A rejected proof poisons that mapper instance; it cannot later emit a complete-looking projection after an exception is caught. Receipts describe comparison evidence only and expose `ownershipGranted:false`, `actualDatabaseHttpExecuted:false`.

Root pending integration: original named audit snapshots must use typed physical before/after versions; org failedAt must equal the observed run.finished_at; grant DTO/audit times equal the selected actual grant version; ZIP manifest times equal package row, with independent DOS/header/payload checks; read-model top-level generatedAt from explicit `new Date()` needs a separately named emitter registration. None of these nested sites is automatically normalized here. No change to `compare-api.mjs` or other shared sources is included.
