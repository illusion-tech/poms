# R2M source-bound audit storage identity

This source candidate requires C's exact source review and a Root admission
before actual use. It changes no product, ordinary case request ID, security
event ID, ownership table, borrowed row, or deletion authority. Only the two
original E setting header cells and B's named original platform-null audit
profiles are eligible. Current M1/M2 requests execute on their target backend
with actual `op: 'm.http'`; no producer operation alias is admitted.

Allocate the globally unique index first. Use the original B source projector
and retain its descriptor. For generated org/role/user targets, establish the
ordinary exact immutable parent intent before the admission. An existing target
must already have real typed owned-row proof in base or this source case.

```js
const context = { runId, caseId, index, op: "m.http" };
const admission = fixture.admitAuditIdentity({
    sourceKind: "platform-null", // or 'E-setting'
    descriptor, // exact protected B source projection, never response/query ID
    request, // original platform request; omit for E-setting
    context,
}, rootApproval);
await fixture.intentWithRequestIdentity("audit_log", admission.auditSelector, {
    caseId,
    index,
    admissionId: admission.id,
    expectedMax: 1,
});
await pg.beginCase(context);
// Actual original HTTP request and true SDK/PG capture, drain, certify and adopt.
```

`rootApproval` has kind `Root-R2M-source-bound-audit-identity-admission`,
`rootApproved: true`, exact `namespace`, `marker`, `runId`, `backend`,
`database`, `sourceCapId`, explicit `allowedSourceKinds`, and
`sourceReview: {file, rawBytesSha256}`. C's public review must have
`result: 'SourceReady'` and `reviewedSources` binding the actual admission
helper plus both B projectors. E additionally binds
`settingLeaseAdmissionSha256` to the already admitted unique environment lease.
The fixed namespace and marker remain `poms-r2m` and
`1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5`.

The admission reprojects all fields from the protected original source bytes.
Platform null is limited to the named handler, source case/step, event, target
type, owned admin and typed target. Generated targets require their own actual
committed create in the same case/index/op and independent visibility before
audit adoption. An admission, matching response ID, or queried row never
supplies the creation proof. Each of the two E cells is admitted once per run.
The PG context records the ordinary ownership request ID separately from the
exact audit storage ID; null and empty string remain distinct.

For the two E setting PATCH receipts, `recordBaselineSettingAfter` keeps the
actual wire request ID in `requestId`, with these additional explicit fields:

```js
{
    auditIdentityAdmissionId: admission.id,
    index: context.index,
    sourceStepId: descriptor.stepId,
    ownershipRequestId: scope.requestId,
    requestId: descriptor.actualRequestId,
    actualRequestId: descriptor.actualRequestId,
    actualCorrelationId: descriptor.actualCorrelationId,
    requestBodySha256: sha256(JSON.stringify(actualRequest.body))
}
```

All original receipt fields remain required. Ordinary setting requests retain
the original canonical request-ID check. The singleton remains migration-owned,
with the exact same final drain/CAS/full-row restore and no deletion. Because
this source epoch changes the helper bytes, Root's new singleton admission must
bind the new C review of `fixture-setting-baseline.mjs`; the prior helper review
cannot admit this new file hash.

Old actual epochs, profile hashes, journals and failures remain immutable. The
new helper and the two source projectors enter only the next complete source
capsule/profile. No query-based recovery or retroactive adoption is added.
